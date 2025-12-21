'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Container, 
  Title, 
  Paper, 
  Select, 
  TextInput, 
  PasswordInput, 
  Button, 
  Group, 
  Stack,
  LoadingOverlay
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from 'next/navigation'
import { createUser } from '@/app/actions/users'

export default function CreateUserPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    playerId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user',
    phone: ''
  })

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('player')
      .select('id, first_name, last_name')
      .order('first_name')
    
    if (data) {
      setPlayers(data.map(p => ({
        value: p.id.toString(),
        label: `${p.first_name} ${p.last_name}`,
        original: p
      })))
    }
    setLoading(false)
  }

  const handlePlayerChange = (value: string | null) => {
    if (!value) return
    const player = players.find(p => p.value === value)?.original
    if (player) {
      setFormData(prev => ({
        ...prev,
        playerId: value,
        firstName: player.first_name,
        lastName: player.last_name
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const result = await createUser(formData)

      if (!result.success) throw new Error(result.error)

      notifications.show({
        title: 'Success',
        message: 'User created successfully',
        color: 'green'
      })
      
      setFormData({
        playerId: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'user',
        phone: ''
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create user',
        color: 'red'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">Create New User</Title>
      <Paper withBorder p="xl" radius="md" pos="relative">
        <LoadingOverlay visible={loading || submitting} />
        <form onSubmit={handleSubmit}>
          <Stack>
            <Select
              label="Link to Player"
              placeholder="Select a player"
              data={players}
              searchable
              value={formData.playerId}
              onChange={handlePlayerChange}
              required
            />
            
            <Group grow>
              <TextInput
                label="First Name"
                value={formData.firstName}
                readOnly
                variant="filled"
              />
              <TextInput
                label="Last Name"
                value={formData.lastName}
                readOnly
                variant="filled"
              />
            </Group>

            <TextInput
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />

            <PasswordInput
              label="Password"
              required
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />

            <Select
              label="Role"
              data={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' }
              ]}
              value={formData.role}
              onChange={val => setFormData({...formData, role: val || 'user'})}
            />

            <TextInput
              label="Phone"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />

            <Button type="submit" mt="md">Create User</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
