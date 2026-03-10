import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt, sendMessage, extractHtmlFromResponse, extractMessageWithoutHtml, injectLogoIntoHtml, injectImagesIntoHtml } from '@/lib/lp-builder/claude';
import { loadBrandLogoBase64 } from '@/lib/lp-builder/brands';
import { Brand, UploadedImage, ApiMessage, ContentBlock } from '@/lib/lp-builder/types';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/supabase/org-context';

export async function POST(req: NextRequest) {
  try {
    // Auth check (optional — LP builder uses server-side ANTHROPIC_API_KEY)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { brand, messages, session_id, images, org_id } = await req.json() as {
      brand: Brand;
      messages: Array<{ role: 'user' | 'assistant'; content: string; images?: UploadedImage[] }>;
      session_id: string;
      images?: UploadedImage[];
      org_id?: string;
    };

    if (!brand || !messages || !session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: brand, messages, session_id' },
        { status: 400 }
      );
    }

    if (!['templum', 'evolutto', 'orbit'].includes(brand)) {
      return NextResponse.json(
        { error: 'Invalid brand. Must be templum, evolutto, or orbit.' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY nao configurada. Adicione no .env.local e reinicie o servidor.' },
        { status: 500 }
      );
    }

    // All session images (for HTML placeholder replacement)
    const allImages = images || [];
    const imageCount = allImages.length;

    let systemPrompt = await buildSystemPrompt(brand, imageCount);

    // Enrich with org context (briefing, ICP, persona) if org_id provided
    if (org_id) {
      const orgContext = await getOrgContext(org_id)
      if (orgContext?.summary) {
        systemPrompt += `\n\n═══════════════════════════════════════════\nCONTEXTO DA ORGANIZACAO (usar para personalizar a LP)\n═══════════════════════════════════════════\n\n${orgContext.summary}`
      }
    }

    console.log(`[Chat API] Brand: ${brand}, Messages: ${messages.length}, Images: ${imageCount}, OrgContext: ${!!org_id}, System prompt length: ${systemPrompt.length}`);

    // Build API messages with multimodal support
    const apiMessages: ApiMessage[] = messages.map((m, idx) => {
      const isLastUserMessage = idx === messages.length - 1 && m.role === 'user';
      const messageImages = m.images || [];

      // If this message has images, build multimodal content
      if (messageImages.length > 0 || (isLastUserMessage && imageCount > 0 && !messages.some(msg => msg.images && msg.images.length > 0))) {
        const imagesToSend = messageImages.length > 0 ? messageImages : (isLastUserMessage ? allImages : []);

        if (imagesToSend.length > 0 && m.role === 'user') {
          const contentBlocks: ContentBlock[] = [];

          // Add image blocks
          for (const img of imagesToSend) {
            const rawBase64 = img.data.replace(/^data:image\/\w+;base64,/, '');
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mediaType || 'image/jpeg',
                data: rawBase64,
              },
            });
          }

          // Add text with image context
          const imageListStr = imagesToSend.map(i => i.id).join(', ');
          contentBlocks.push({
            type: 'text',
            text: `[IMAGENS DISPONIVEIS: ${imageListStr}. Use {{IMAGE_N}} como src nas tags <img>.]\n\n${m.content}`,
          });

          return { role: m.role, content: contentBlocks };
        }
      }

      // Regular text message
      return { role: m.role, content: m.content };
    });

    const fullResponse = await sendMessage(systemPrompt, apiMessages);
    console.log(`[Chat API] Response length: ${fullResponse.length}`);

    let html = extractHtmlFromResponse(fullResponse);
    const message = extractMessageWithoutHtml(fullResponse);

    // Inject brand logo as base64 data URI into the HTML
    if (html) {
      const logoDataUri = await loadBrandLogoBase64(brand);
      if (logoDataUri) {
        html = injectLogoIntoHtml(html, logoDataUri, brand);
        console.log(`[Chat API] Logo injected for brand: ${brand}`);
      }

      // Inject uploaded images (replace {{IMAGE_N}} placeholders)
      if (allImages.length > 0) {
        html = injectImagesIntoHtml(html, allImages);
        console.log(`[Chat API] ${allImages.length} image(s) injected into HTML`);
      }
    }

    console.log(`[Chat API] HTML found: ${!!html}, HTML length: ${html?.length || 0}, Message: ${message?.substring(0, 100)}`);

    let status: 'briefing' | 'generated' | 'reviewing' = 'briefing';
    if (html) {
      status = 'generated';
    }

    // If response is long but no HTML found, something went wrong with extraction
    if (!html && fullResponse.length > 500) {
      console.warn(`[Chat API] WARNING: Long response (${fullResponse.length} chars) but no HTML extracted. First 300 chars:`, fullResponse.substring(0, 300));
    }

    return NextResponse.json({
      message: message || fullResponse,
      html: html || undefined,
      status,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Chat API] Error:', errMsg);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
