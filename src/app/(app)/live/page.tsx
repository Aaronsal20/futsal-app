'use client'

import { Container, Title, Text, Box, AspectRatio, SimpleGrid, Card, Badge, Group, Stack } from '@mantine/core'

export default function LivePage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Live Matches</Title>

      <Box mb={50}>
        <AspectRatio ratio={16 / 9}>
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ" // Placeholder
            title="Live Match"
            style={{ border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </AspectRatio>
        <Group justify="space-between" mt="md">
          <Stack gap={0}>
            <Title order={2}>FC Barcelona vs Real Madrid</Title>
            <Text c="dimmed">Champions League Final</Text>
          </Stack>
          <Badge size="xl" color="red" variant="filled">LIVE</Badge>
        </Group>
      </Box>

      <Title order={2} mb="lg">Upcoming Matches</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {[1, 2, 3].map((i) => (
          <Card key={i} withBorder padding="lg" radius="md">
            <Group justify="space-between" mb="xs">
              <Badge>Tomorrow, 20:00</Badge>
              <Badge variant="outline">Group B</Badge>
            </Group>
            <Text fw={700} size="lg" mb="xs">Manchester United vs Chelsea</Text>
            <Text size="sm" c="dimmed">Old Trafford</Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  )
}
