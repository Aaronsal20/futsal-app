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
  SegmentedControl,
  Stack,
  Anchor,
  PinInput,
  Center
} from '@mantine/core'
import { notifications } from '@mantine/notifications'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [otp, setOtp] = useState('')
  const router = useRouter()

  const handleVerify = async () => {
    if (otp.length !== 6) {
      notifications.show({ title: 'Error', message: 'Please enter a valid 6-digit OTP', color: 'red' })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })

      if (error) throw error

      if (data.user) {
        // Create profile immediately since we are logged in
        const metadata = data.user.user_metadata
        const { error: profileError } = await supabase.from('users').upsert({
          id: data.user.id,
          email: null,
          phone: data.user.phone,
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          is_approved: false,
          player_id: metadata.player_id
        })

        if (profileError) {
           console.error('Profile creation failed:', profileError)
        }

        notifications.show({ title: 'Success', message: 'Phone verified successfully!', color: 'green' })
        router.push('/')
      }
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setLoading(true)

    try {
      // Step 1: Check if a player already exists or create one
      let playerId: number

      const { data: existingPlayers } = await supabase
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

      // Step 2: Sign up the user with player_id in metadata
      const signUpPayload = {
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            position,
            phone: authMethod === 'phone' ? phone : undefined,
            is_approved: false,
            player_id: playerId
          },
        },
      }

      const { data, error: signUpError } = await supabase.auth.signUp(
        authMethod === 'email' 
          ? { email, ...signUpPayload } 
          : { phone, ...signUpPayload }
      )

      if (signUpError) throw signUpError

      if (data.user) {
        if (authMethod === 'phone') {
          setVerifying(true)
          setLoading(false)
          notifications.show({ title: 'Verification', message: 'OTP sent to your phone.', color: 'blue' })
          return
        }

        // We rely on the Login page's self-healing mechanism to create the profile
        // This avoids race conditions and FK violations during registration.
        
        notifications.show({ title: 'Success', message: 'Registration successful! Please check your email/phone for verification.', color: 'green' })
        // Step 4: Redirect to login
        router.push('/login')
      }
    } catch (error: any) {
      let message = error.message
      // Handle specific Supabase/Twilio configuration errors
      if (error.code === 'sms_send_failed' || message?.includes('Twilio')) {
        message = 'SMS login is currently unavailable (Configuration Error). Please register using Email instead.'
      }
      notifications.show({ title: 'Error', message, color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Register Card */}
      <Paper shadow="md" radius="md" p="xl" withBorder className="w-full max-w-md z-10 relative bg-white">
        {verifying ? (
          <Stack align="center" gap="xl">
            <Title order={2} ta="center">Verify Phone</Title>
            <Text c="dimmed" size="sm" ta="center">
              Enter the 6-digit code sent to {phone}
            </Text>
            <Center>
              <PinInput length={6} value={otp} onChange={setOtp} type="number" size="lg" />
            </Center>
            <Button fullWidth onClick={handleVerify} loading={loading}>
              Verify & Login
            </Button>
            <Anchor component="button" size="sm" onClick={() => setVerifying(false)}>
              Back to Registration
            </Anchor>
          </Stack>
        ) : (
          <>
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

              <SegmentedControl
                value={authMethod}
                onChange={(value: 'email' | 'phone') => setAuthMethod(value)}
                data={[
                  { label: 'Email', value: 'email' },
                  { label: 'Phone', value: 'phone' },
                ]}
                fullWidth
              />

              {authMethod === 'email' ? (
                <TextInput
                  label="📧 Email"
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                />
              ) : (
                <TextInput
                  label="📱 Phone Number"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                  required
                />
              )}

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
          </>
        )}
      </Paper>
    </main>
  )
}
