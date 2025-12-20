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
} from '@mantine/core'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async () => {
    setError('')

    // Step 1: Sign up the user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          position,
        },
      },
    })

    if (signUpError) return setError(signUpError.message)

    if (data.user) {
      // Step 2: Insert user into `users` table
      const { error: insertUserError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName
      })

      if (insertUserError) {
        setError(insertUserError.message)
        return
      }

      // Step 3: Check if a player already exists
      const { data: existingPlayers, error: playerCheckError } = await supabase
        .from('player')
        .select('id')
        .eq('first_name', firstName)
        .eq('last_name', lastName)

      if (playerCheckError) {
        setError(playerCheckError.message)
        return
      }

      // Step 4: Create player if not found
      if (!existingPlayers || existingPlayers.length === 0) {
        const { error: insertPlayerError } = await supabase.from('player').insert({
          first_name: firstName,
          last_name: lastName,
          position,
          avatar_url: '', // Optional: Set a default avatar URL
        })

          console.log('🚀 ~ handleRegister ~ insertPlayerError:', insertPlayerError)
        if (insertPlayerError) {
          setError(insertPlayerError.message)
          return
        }
      }

      // Step 5: Redirect to login
      router.push('/login')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Register Card */}
      <Paper shadow="md" radius="md" p="xl" withBorder className="w-full max-w-md z-10 relative bg-white">
        <Title order={2} ta="center" mb="lg">
          📝 Register for Futsal
        </Title>

        <Group grow mb="md">
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
          mb="md"
        />

        <PasswordInput
          label="🔐 Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
          mb="md"
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
          mb="md"
        />

        {error && (
          <Text c="red" size="sm" ta="center" mb="sm">
            {error}
          </Text>
        )}

        <Button fullWidth color="green" size="md" onClick={handleRegister} mt="md">
          ✅ Register
        </Button>

        <Text ta="center" size="sm" mt="md">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 underline">
            Login
          </a>
        </Text>
      </Paper>
    </main>
  )
}
