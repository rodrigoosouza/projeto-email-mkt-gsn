import { NextRequest, NextResponse } from 'next/server';
import { deployToVercel } from '@/lib/lp-builder/deploy';
import { Brand } from '@/lib/lp-builder/types';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { empresa, html, titulo, session_id } = await req.json() as {
      empresa: Brand;
      html: string;
      titulo: string;
      session_id: string;
    };

    if (!empresa || !html || !titulo || !session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: empresa, html, titulo, session_id' },
        { status: 400 }
      );
    }

    if (!process.env.VERCEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'VERCEL_ACCESS_TOKEN nao configurada. Adicione no .env.local.' },
        { status: 500 }
      );
    }

    const result = await deployToVercel(empresa, html, titulo, session_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Deploy API error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy', details: String(error) },
      { status: 500 }
    );
  }
}
