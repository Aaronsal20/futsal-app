'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'

export async function createUser(formData: any) {
  const { email, password, firstName, lastName, role, phone, playerId } = formData

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role,
        player_id: playerId // Store in metadata as well for easy access
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // 2. Create user in public.users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        role,
        phone,
        player_id: playerId ? parseInt(playerId) : null
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
