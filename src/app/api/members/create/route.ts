import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is authenticated and is an admin
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Nao autenticado.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, firstName, lastName, password, role, orgId } = body

    // Validate required fields
    if (!email || !password || !role || !orgId) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: email, password, role, orgId.' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Funcao invalida. Use: admin, editor ou viewer.' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      )
    }

    // Check that requesting user is admin of this org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', currentUser.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem criar membros.' },
        { status: 403 }
      )
    }

    // Use admin client to create the user
    const adminClient = createAdminClient()

    const { data: newUserData, error: createError } =
      await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName?.trim() || '',
          last_name: lastName?.trim() || '',
          full_name: [firstName?.trim(), lastName?.trim()]
            .filter(Boolean)
            .join(' '),
        },
      })

    if (createError) {
      // Handle duplicate user
      if (
        createError.message?.includes('already been registered') ||
        createError.message?.includes('already exists')
      ) {
        return NextResponse.json(
          {
            error:
              'Este email ja esta registrado. Use a funcao de convite para adicionar um usuario existente.',
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: createError.message || 'Erro ao criar usuario.' },
        { status: 500 }
      )
    }

    if (!newUserData.user) {
      return NextResponse.json(
        { error: 'Erro inesperado ao criar usuario.' },
        { status: 500 }
      )
    }

    // Add user to organization_members
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        org_id: orgId,
        user_id: newUserData.user.id,
        role,
      })

    if (memberError) {
      // If adding to org fails, we should still report it but the user was created
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'Este usuario ja e membro desta organizacao.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error: `Usuario criado mas nao foi possivel adicionar a organizacao: ${memberError.message}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserData.user.id,
        email: newUserData.user.email,
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
      },
    })
  } catch (error: any) {
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
