'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TextInput,
  Select,
  Button,
  Paper,
  Title,
  Container,
  Stack,
  Notification,
  Group,
  rem,
  Text,
  ThemeIcon,
  Center,
} from '@mantine/core';
import { IconCheck, IconX, IconUserPlus, IconSoccerField } from '@tabler/icons-react';
import confetti from 'canvas-confetti';

export default function AddPlayerForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState<string | null>('goalkeeper');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    setNotification(null);

    if (!firstName.trim() || !lastName.trim()) {
      setNotification({
        type: 'error',
        message: 'First name and last name are required.',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('player').insert([
        {
          first_name: firstName,
          last_name: lastName,
          position: position,
        },
      ]);

      if (error) throw error;

      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#228be6', '#15aabf', '#40c057', '#fab005']
      });

      setNotification({
        type: 'success',
        message: 'Player added successfully!',
      });
      setFirstName('');
      setLastName('');
      setPosition('goalkeeper');
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || 'Error adding player.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <Paper 
        withBorder 
        shadow="xl" 
        p={30} 
        radius="lg" 
        style={{ 
          width: '100%',
          position: 'relative', 
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Decorative top border gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, var(--mantine-color-blue-5) 0%, var(--mantine-color-cyan-5) 100%)'
        }} />

        <Stack gap="lg">
          <Center>
            <ThemeIcon 
              size={60} 
              radius="50%" 
              variant="gradient" 
              gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
              style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
            >
              <IconUserPlus size={32} />
            </ThemeIcon>
          </Center>
          
          <div style={{ textAlign: 'center' }}>
            <Title order={2}>Add New Player</Title>
            <Text c="dimmed" size="sm" mt={5}>Enter player details to add them to the roster</Text>
          </div>

          {notification && (
            <Notification
              icon={
                notification.type === 'success' ? (
                  <IconCheck style={{ width: rem(20), height: rem(20) }} />
                ) : (
                  <IconX style={{ width: rem(20), height: rem(20) }} />
                )
              }
              color={notification.type === 'success' ? 'teal' : 'red'}
              title={notification.type === 'success' ? 'Success' : 'Error'}
              onClose={() => setNotification(null)}
              radius="md"
              withBorder
            >
              {notification.message}
            </Notification>
          )}

          <Group grow>
            <TextInput
              label="First Name"
              placeholder="e.g. Lionel"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
              variant="filled"
              radius="md"
            />
            <TextInput
              label="Last Name"
              placeholder="e.g. Messi"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              variant="filled"
              radius="md"
            />
          </Group>

          <Select
            label="Position"
            placeholder="Select position"
            data={[
              { value: 'goalkeeper', label: 'Goalkeeper 🧤' },
              { value: 'defender', label: 'Defender 🛡️' },
              { value: 'mid', label: 'Midfielder 🏃' },
              { value: 'forward', label: 'Forward ⚽' },
            ]}
            value={position}
            onChange={setPosition}
            allowDeselect={false}
            variant="filled"
            radius="md"
            leftSection={<IconSoccerField size={16} />}
          />

          <Button
            fullWidth
            mt="md"
            size="lg"
            onClick={handleSubmit}
            loading={loading}
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            radius="md"
            style={{ 
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Add Player
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
