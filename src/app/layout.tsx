import '@mantine/core/styles.css';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';
import Providers from './providers'; // We'll create this

export const metadata: Metadata = {
  title: 'Futsal App',
  description: 'Player ratings and team generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
