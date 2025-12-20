'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  TextInput,
  Select,
  Button,
  Card,
  Title,
  Text,
  Container,
  Stack,
  LoadingOverlay,
  Notification,
  Divider,
  Group,
  Box,
} from '@mantine/core';
import { IconBallFootball, IconX } from '@tabler/icons-react';

export default function AddPlayerPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [position, setPosition] = useState('goalkeeper');
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userProfile?.role !== 'admin') {
        setError('You are not authorized to add players.');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setError('First name and last name are required.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('player').insert([
      {
        first_name: firstName,
        last_name: lastName,
        avatar_url: photoUrl,
        position: position,
      },
    ]);

    setSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <Container size="sm" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingOverlay visible />
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container size="sm" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Notification color="red" icon={<IconX size={18} />} title="Access Denied">
          {error || 'You are not authorized to access this page.'}
        </Notification>
      </Container>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
      }}
    >
      <Card shadow="xl" radius="lg" p="lg" withBorder style={{ width: 480, backgroundColor: 'white' }}>
        <Group justify="center" mb="md">
          <IconBallFootball size={30} color="#228be6" />
          <Title order={2}>Add a New Player</Title>
        </Group>
        <Divider mb="lg" />

        {error && (
          <Notification color="red" icon={<IconX size={18} />} mb="md">
            {error}
          </Notification>
        )}

        <form onSubmit={handleAddPlayer}>
          <Stack gap="md">
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

            <TextInput
              label="Photo URL"
              placeholder="Enter photo URL"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.currentTarget.value)}
            />

            <Select
              label="Position"
              placeholder="Select position"
              data={[
                { value: 'goalkeeper', label: 'Goalkeeper' },
                { value: 'defender', label: 'Defender' },
                { value: 'mid', label: 'Midfielder' },
                { value: 'forward', label: 'Forward' },
              ]}
              value={position}
              onChange={(value) => setPosition(value || 'goalkeeper')}
            />

            <Button
              type="submit"
              loading={submitting}
              fullWidth
              size="md"
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              radius="md"
              leftSection={<IconBallFootball size={18} />}
            >
              Add Player
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}
