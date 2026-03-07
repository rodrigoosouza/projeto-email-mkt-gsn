import { createClient } from '@/lib/supabase/client'
import type { Invitation } from '@/lib/types'

export async function inviteUser(orgId: string, email: string, role: string) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nao autenticado')

  const token = crypto.randomUUID()

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      org_id: orgId,
      email,
      role,
      token,
      status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ja existe um convite pendente para este email nesta organizacao.')
    }
    throw error
  }

  return data as Invitation
}

export async function getInvitations(orgId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Invitation[]
}

export async function cancelInvitation(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function acceptInvitation(token: string, userId: string) {
  const supabase = createClient()

  // Fetch the invitation by token
  const { data: invitation, error: fetchError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (fetchError || !invitation) {
    throw new Error('Convite invalido ou nao encontrado.')
  }

  // Check if the invitation has expired
  const now = new Date()
  const expiresAt = new Date(invitation.expires_at)
  if (now > expiresAt) {
    // Mark as expired
    await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)

    throw new Error('Este convite expirou.')
  }

  // Add user to organization_members
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      org_id: invitation.org_id,
      user_id: userId,
      role: invitation.role,
    })

  if (memberError) {
    if (memberError.code === '23505') {
      // User is already a member, just mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      throw new Error('Voce ja e membro desta organizacao.')
    }
    throw memberError
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  if (updateError) throw updateError

  return invitation as Invitation
}
