'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Container,
  Title,
  Stack,
  NumberInput,
  Button,
  Group,
  TextInput,
  Select,
  Loader,
  Notification,
} from '@mantine/core'

export default function TournamentFixturesSetup() {
  const { id } = useParams() as { id: string } // tournament id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [teams, setTeams] = useState<any[]>([])

  // Form fields
  const [startTime, setStartTime] = useState('')
  const [matchMinutes, setMatchMinutes] = useState(40)
  const [gapMinutes, setGapMinutes] = useState(10)
  const [defaultColor, setDefaultColor] = useState('White')

  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('tournament_id', id)
      if (error) console.error(error)
      else setTeams(data || [])
      setLoading(false)
    }
    fetchTeams()
  }, [id])

  const handleGenerateFixtures = async () => {
    if (teams.length < 2) {
      setMessage('Need at least 2 teams to generate fixtures.')
      return
    }
    if (!startTime) {
      setMessage('Please select a start time.')
      return
    }

    setSaving(true)
    const baseTime = new Date(startTime)
    const newFixtures = []
    let currentTime = new Date(baseTime)

    // Round-robin: each team plays each other once
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        newFixtures.push({
          tournament_id: id,
          team1_id: teams[i].id,
          team2_id: teams[j].id,
          scheduled_time: new Date(currentTime).toISOString(),
          match_minutes: matchMinutes,
          team1_color: defaultColor,
          team2_color: defaultColor,
          status: 'scheduled',
        })

        // Increment time for next fixture
        currentTime = new Date(currentTime.getTime() + (matchMinutes + gapMinutes) * 60000)
      }
    }

    const { error } = await supabase.from('fixtures').insert(newFixtures)
    setSaving(false)

    if (error) {
      console.error(error)
      setMessage('Error generating fixtures.')
    } else {
      setMessage(`Generated ${newFixtures.length} fixtures successfully!`)
    }
  }

  if (loading) return <Loader size="lg" style={{ marginTop: '4rem' }} />

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="md">
        Tournament Setup
      </Title>

      {message && (
        <Notification
          color={message.includes('Error') ? 'red' : 'green'}
          onClose={() => setMessage('')}
          mt="sm"
        >
          {message}
        </Notification>
      )}

      <Stack>
        <TextInput
          label="Tournament Start Time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />

        <NumberInput
          label="Match Duration (minutes)"
          value={matchMinutes}
          onChange={(val) => setMatchMinutes(typeof val === 'number' ? val : Number(val) || 0)}
          min={10}
          max={120}
        />

        <NumberInput
          label="Gap Between Matches (minutes)"
          value={gapMinutes}
          onChange={(val) => setGapMinutes(typeof val === 'number' ? val : Number(val) || 0)}
          min={5}
          max={60}
        />

        <Select
          label="Default Team Color"
          placeholder="Select color"
          data={['Red', 'Blue', 'Green', 'Yellow', 'White', 'Black']}
          value={defaultColor}
          onChange={(value) => {
            if (value !== null) setDefaultColor(value)
          }}
        />

        <Button
          color="blue"
          onClick={handleGenerateFixtures}
          loading={saving}
          mt="md"
        >
          Generate Fixtures
        </Button>
      </Stack>
    </Container>
  )
}
