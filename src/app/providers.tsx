'use client';

import { MantineProvider, ActionIcon, Group, useMantineColorScheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import '@mantine/notifications/styles.css';

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const dark = colorScheme === 'dark';

  return (
    <Group
      justify="flex-end"
      style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}
    >
      <ActionIcon
        variant="filled"
        color={dark ? 'yellow' : 'dark'}
        onClick={() => toggleColorScheme()}
        size="lg"
        radius="xl"
      >
        {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
      </ActionIcon>
    </Group>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <ThemeToggle />
      {children}
    </MantineProvider>
  );
}
