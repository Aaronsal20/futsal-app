'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  TextInput,
  PasswordInput,
  Button,
  Select,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Anchor
} from '@mantine/core'
import { notifications } from '@mantine/notifications'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    setLoading(true)

    try {
      // Step 1: Sign up the user
      const signUpPayload = {
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            position,
            is_approved: false
          },
        },
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        ...signUpPayload 
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Step 2: Check if a player already exists or create one
        let playerId: number

        const { data: existingPlayers, error: playerCheckError } = await supabase
          .from('player')
          .select('id')
          .ilike('first_name', firstName)
          .ilike('last_name', lastName)
          .single()

        if (existingPlayers) {
          playerId = existingPlayers.id
        } else {
          const { data: newPlayer, error: insertPlayerError } = await supabase
            .from('player')
            .insert({
              first_name: firstName,
              last_name: lastName,
              position,
              avatar_url: '', // Optional: Set a default avatar URL
            })
            .select('id')
            .single()

          if (insertPlayerError) throw insertPlayerError
          playerId = newPlayer.id
        }

        // Step 3: Insert user into `users` table with player link
        const { error: insertUserError } = await supabase.from('users').insert({
          id: data.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          is_approved: false,
          player_id: playerId
        })

        if (insertUserError) throw insertUserError

        // Update user metadata with player_id
        await supabase.auth.updateUser({
          data: { player_id: playerId }
        })

        notifications.show({ title: 'Success', message: 'Registration successful! Please check your email/phone for verification.', color: 'green' })
        // Step 4: Redirect to login
        router.push('/login')
      }
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Register Card */}
      <Paper shadow="md" radius="md" p="xl" withBorder className="w-full max-w-md z-10 relative bg-white">
        <Title order={2} ta="center" mb="lg">
          📝 Register for Futsal
        </Title>

        <Stack>
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="Enter first name"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Last Name"
              placeholder="Enter last name"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
            />
          </Group>

          <TextInput
            label="📧 Email"
            placeholder="Enter your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />

          <PasswordInput
            label="🔐 Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />

          <Select
            label="⚽ Position"
            placeholder="Select position"
            data={[
              { value: 'Goalkeeper', label: 'Goalkeeper' },
              { value: 'Defender', label: 'Defender' },
              { value: 'Midfielder', label: 'Midfielder' },
              { value: 'Forward', label: 'Forward' },
            ]}
            value={position}
            onChange={setPosition}
            clearable
          />

          <Button fullWidth color="green" size="md" onClick={handleRegister} loading={loading}>
            ✅ Register
          </Button>

          <Text ta="center" size="sm" mt="md">
            Already have an account?{' '}
            <Anchor href="/login" className="text-blue-600 underline">
              Login
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </main>
  )
}
