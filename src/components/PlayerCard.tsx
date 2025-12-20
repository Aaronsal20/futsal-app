import { Card, Avatar, Text } from '@mantine/core';
import { RingProgress } from '@mantine/core';

interface PlayerCardProps {
  player: {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url: string;
    avgRating: number;
    position: string;
  };
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const ratingPercent = (player.avgRating / 10) * 100; // Assuming score is out of 10

  // Determine color based on rating
  const getColor = (rating: number) => {
    if (rating < 5) return 'red';
    if (rating < 8) return 'orange';
    return 'green';
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section inheritPadding py="xs">
        <Avatar src={player.avatar_url} size={80} radius="xl" mx="auto" />
        <Text ta="center" fw={500} mt="sm">
          {player.first_name} {player.last_name}
        </Text>
        <Text ta="center" fz="sm" c="dimmed">
          {player.position}
        </Text>
      </Card.Section>

      <Card.Section inheritPadding py="md" style={{ display: 'flex', justifyContent: 'center' }}>
        <RingProgress
          roundCaps
          thickness={6}
          size={100}
          sections={[{ value: ratingPercent, color: getColor(player.avgRating) }]}
          label={
            <Text ta="center" fw={700} fz="lg">
              {player.avgRating.toFixed(1)}
            </Text>
          }
        />
      </Card.Section>
    </Card>
  );
}
