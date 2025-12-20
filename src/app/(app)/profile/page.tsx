'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TextInput, Button, Avatar, FileInput, Group, Title } from '@mantine/core'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [avatar, setAvatar] = useState<File | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const updateProfile = async () => {
    if (!profile) return
    const { error } = await supabase.from('users').update({
      first_name: profile.first_name,
      last_name: profile.last_name,
    }).eq('id', profile.id)

    if (!error) alert('Profile updated!')
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <Title order={2} mb="md">My Profile</Title>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <Group justify="center" mb="md">
            <Avatar src={profile?.avatar_url} size={80} radius="xl" />
          </Group>

          <TextInput
            label="First Name"
            value={profile?.first_name || ''}
            onChange={(e) => setProfile({ ...profile, first_name: e.currentTarget.value })}
            mb="sm"
          />

          <TextInput
            label="Last Name"
            value={profile?.last_name || ''}
            onChange={(e) => setProfile({ ...profile, last_name: e.currentTarget.value })}
            mb="sm"
          />

          <FileInput
            label="Upload Avatar"
            placeholder="Choose an image"
            onChange={setAvatar}
            mb="md"
          />

          <Button fullWidth onClick={updateProfile}>Save Changes</Button>
        </>
      )}
    </main>
  )
}
