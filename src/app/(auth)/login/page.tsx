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
  Anchor,
} from '@mantine/core';
import classes from '../auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className={classes.loginContainer}>
      <Paper
        shadow="md"
        radius="lg"
        withBorder
        p="xl"
        className={classes.loginCard}
      >
        <Title order={2} ta="center" mb="lg">
          Login
        </Title>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <TextInput
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            mb="sm"
          />

          <PasswordInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            mb="sm"
          />

          {error && (
            <Text c="red" size="sm" ta="center" mb="sm">
              {error}
            </Text>
          )}

          <Button
            type="submit"
            fullWidth
            color="blue"
            loading={loading}
            mb="md"
          >
            Login
          </Button>
        </form>

        <Text ta="center" size="sm">
          Don’t have an account?{' '}
          <Anchor href="/register" c="blue">
            Register now
          </Anchor>
        </Text>
      </Paper>
    </div>
  );
}
