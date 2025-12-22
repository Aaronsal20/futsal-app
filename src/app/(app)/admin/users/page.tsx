'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Container, 
  Title, 
  Paper, 
  Table, 
  Button, 
  Group, 
  Modal, 
  TextInput, 
  PasswordInput, 
  Select, 
  Stack, 
  ActionIcon, 
  Badge,
  Text,
  LoadingOverlay
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconKey, IconTrash, IconSearch, IconCheck } from '@tabler/icons-react'
import { createUser, getUsers, resetUserPassword, approveUser } from '@/app/actions/users'

export default function ManageUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Create User Modal State
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user',
    phone: ''
  })

  // Reset Password Modal State
  const [resetOpened, { open: openReset, close: closeReset }] = useDisclosure(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const result = await getUsers()
    if (result.success) {
      setUsers(result.data)
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch users',
        color: 'red'
      })
    }
    setLoading(false)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createFormData.email && !createFormData.phone) {
      notifications.show({ 
        title: 'Error', 
        message: 'Either Email or Phone is required', 
        color: 'red' 
      })
      return
    }

    setCreateLoading(true)
    try {
      const result = await createUser(createFormData)
      if (!result.success) throw new Error(result.error)

      notifications.show({ title: 'Success', message: 'User created successfully', color: 'green' })
      closeCreate()
      setCreateFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'user',
        phone: ''
      })
      fetchUsers()
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setResetLoading(true)
    try {
      const result = await resetUserPassword(selectedUser.id, newPassword)
      if (!result.success) throw new Error(result.error)

      notifications.show({ title: 'Success', message: 'Password reset successfully', color: 'green' })
      closeReset()
      setNewPassword('')
      setSelectedUser(null)
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    } finally {
      setResetLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      const result = await approveUser(userId)
      if (!result.success) throw new Error(result.error)

      notifications.show({ title: 'Success', message: 'User approved successfully', color: 'green' })
      fetchUsers()
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    }
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.phone?.includes(search) ||
    user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Manage Users</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
          Create User
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Group mb="md">
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Linked Player</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={5} align="center">Loading...</Table.Td>
              </Table.Tr>
            ) : filteredUsers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5} align="center">No users found</Table.Td>
              </Table.Tr>
            ) : (
              filteredUsers.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>{user.first_name} {user.last_name}</Table.Td>
                  <Table.Td>
                    {user.email || user.phone || <Text c="dimmed">No contact info</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.role === 'admin' ? 'red' : 'blue'}>
                      {user.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.is_approved ? 'green' : 'yellow'}>
                      {user.is_approved ? 'Active' : 'Pending'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {user.player ? (
                      <Badge variant="outline" color="green">
                        {user.player.first_name} {user.player.last_name}
                      </Badge>
                    ) : (
                      <Text c="dimmed" size="sm">Not Linked</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon 
                        variant="light" 
                        color="orange" 
                        onClick={() => {
                          setSelectedUser(user)
                          openReset()
                        }}
                        title="Reset Password"
                      >
                        <IconKey size={18} />
                      </ActionIcon>
                      {!user.is_approved && (
                        <ActionIcon 
                          variant="light" 
                          color="green" 
                          onClick={() => handleApprove(user.id)}
                          title="Approve User"
                        >
                          <IconCheck size={18} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Create User Modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Create New User" size="lg">
        <form onSubmit={handleCreateSubmit}>
          <Stack>
            <Group grow>
              <TextInput
                label="First Name"
                required
                value={createFormData.firstName}
                onChange={(e) => setCreateFormData({ ...createFormData, firstName: e.target.value })}
              />
              <TextInput
                label="Last Name"
                required
                value={createFormData.lastName}
                onChange={(e) => setCreateFormData({ ...createFormData, lastName: e.target.value })}
              />
            </Group>

            <TextInput
              label="Email"
              type="email"
              value={createFormData.email}
              onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
            />

            <PasswordInput
              label="Password"
              required
              value={createFormData.password}
              onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
            />

            <Select
              label="Role"
              data={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' }
              ]}
              value={createFormData.role}
              onChange={(val) => setCreateFormData({ ...createFormData, role: val || 'user' })}
            />

            <TextInput
              label="Phone"
              value={createFormData.phone}
              onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
            />

            <Button type="submit" loading={createLoading}>Create User</Button>
          </Stack>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal opened={resetOpened} onClose={closeReset} title={`Reset Password for ${selectedUser?.first_name}`} centered>
        <form onSubmit={handleResetPassword}>
          <Stack>
            <Text size="sm" c="dimmed">
              Enter a new password for this user.
            </Text>
            <PasswordInput
              label="New Password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeReset}>Cancel</Button>
              <Button type="submit" color="orange" loading={resetLoading}>Reset Password</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}
