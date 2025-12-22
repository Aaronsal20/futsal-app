'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'

export async function createUser(formData: any) {
  const { email, password, firstName, lastName, role, phone } = formData

  try {
    // 1. Check for existing player or create new one
    let playerId: number

    const { data: existingPlayers, error: playerCheckError } = await supabaseAdmin
      .from('player')
      .select('id')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .single()

    if (existingPlayers) {
      playerId = existingPlayers.id
    } else {
      const { data: newPlayer, error: createPlayerError } = await supabaseAdmin
        .from('player')
        .insert({
          first_name: firstName,
          last_name: lastName,
          // Default values for required fields if any
        })
        .select('id')
        .single()

      if (createPlayerError) throw createPlayerError
      playerId = newPlayer.id
    }

    // 2. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email || undefined,
      phone: phone || undefined,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role,
        player_id: playerId, // Store in metadata as well for easy access
        is_approved: true
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // 3. Create user in public.users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        role,
        phone: phone || null,
        player_id: playerId,
        is_approved: true // Admin created users are auto-approved
      })

    if (dbError) {
      // Rollback auth user creation if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw dbError
    }

    return { success: true }
  } catch (error: any) {
    console.error('Create user error:', error)
    return { success: false, error: error.message }
  }
}

export async function getUsers() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        player:player_id (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Get users error:', error)
    return { success: false, error: error.message }
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Reset password error:', error)
    return { success: false, error: error.message }
  }
}

export async function approveUser(userId: string) {
  try {
    // Update public.users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ is_approved: true })
      .eq('id', userId)

    if (dbError) throw dbError

    // Update auth.users metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { is_approved: true }
    })

    if (authError) throw authError

    return { success: true }
  } catch (error: any) {
    console.error('Approve user error:', error)
    return { success: false, error: error.message }
  }
}
