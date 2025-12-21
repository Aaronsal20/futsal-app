'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Stack,
  rem,
  Image
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { notifications } from '@mantine/notifications';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      notifications.show({ title: 'Error', message: 'Please fill in all fields', color: 'red' });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    } else {
      notifications.show({ title: 'Success', message: 'Logged in successfully', color: 'green' });
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left Side - Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', position: 'relative' }}>
        <Link href="/" style={{ position: 'absolute', top: '40px', left: '40px', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
          <IconArrowLeft size={18} style={{ marginRight: '8px' }} />
          Back to Home
        </Link>

        <Container size={420} w="100%">
          <Title order={1} mb="xs" style={{ fontFamily: 'Greycliff CF, sans-serif', fontWeight: 900 }}>
            Welcome back!
          </Title>
          <Text c="dimmed" size="sm" mb={30}>
            Do not have an account yet?{' '}
            <Link href="/register" style={{ textDecoration: 'none', color: 'var(--mantine-color-blue-6)', fontWeight: 500 }}>
              Create account
            </Link>
          </Text>

          <Paper withBorder shadow="md" p={30} radius="md">
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              <Stack>
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                />
                
                <Button fullWidth mt="xl" type="submit" loading={loading}>
                  Sign in
                </Button>
              </Stack>
            </form>
          </Paper>
        </Container>
      </div>

      {/* Right Side - Image/Branding */}
      <div style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, #2f9e44 0%, #2b8a3e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }} className="hidden-mobile">
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url("https://images.unsplash.com/photo-1518091043644-c1d4457512c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          mixBlendMode: 'overlay'
        }} />
        
        <Stack align="center" style={{ position: 'relative', zIndex: 1, color: 'white' }}>
          <Image src="/logo.png" w={120} h={120} fallbackSrc="https://placehold.co/120x120?text=Logo" />
          <Title order={2} style={{ fontSize: rem(32) }}>Futsal Manager</Title>
          <Text size="lg" maw={400} ta="center" style={{ opacity: 0.9 }}>
            Manage tournaments, auctions, and player stats in one place.
          </Text>
        </Stack>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
