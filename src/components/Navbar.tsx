'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import {
  IconStars,
  IconUser,
  IconUsersGroup,
  IconTrophy,
  IconGavel,
  IconDatabase,
  IconUserPlus,
  IconLogout,
  IconChevronDown,
  IconChevronRight,
  IconCalendarEvent,
  IconSettings,
  IconMenu2,
  IconLogin,
} from '@tabler/icons-react'
import { Group, Collapse, UnstyledButton, Text, ScrollArea, ActionIcon } from '@mantine/core'
import classes from './Navbar.module.css'

const mainLinks = [
  { link: '/players/rate', label: 'Rate Players', icon: IconStars },
  { link: '/profile', label: 'My Profile', icon: IconUser },
  { link: '/teams', label: 'Team Generator', icon: IconUsersGroup },
]

const eventLinks = [
  { link: '/tournaments', label: 'Tournaments', icon: IconTrophy },
  { link: '/auction', label: 'Auction', icon: IconGavel },
]

const adminLinks = [
  { link: '/admin/players', label: 'Manage Players', icon: IconDatabase },
  // { link: '/admin/teams', label: 'Manage Teams', icon: IconUsersGroup },
  { link: '/tournaments/manage', label: 'Tournaments', icon: IconTrophy },
  { link: '/admin/users', label: 'Manage Users', icon: IconUserPlus },
]

export default function Navbar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState<any>(null)
  
  // Collapsible states
  const [linksOpened, setLinksOpened] = useState<Record<string, boolean>>({
    events: true,
    admin: false,
  })

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserRole(session.user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchUserRole(session.user.id)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId: string) => {
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setIsAdmin(userProfile?.role === 'admin')
  }

  const toggleLink = (key: string) => {
    setLinksOpened((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) router.push('/login')
  }

  const isActive = (path: string) => pathname === path

  return (
    <>
      {/* Mobile Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <ActionIcon 
          variant="filled" 
          color="blue" 
          size="lg" 
          radius="md" 
          onClick={() => setIsOpen(true)}
          style={{ display: isOpen ? 'none' : 'flex' }}
        >
          <IconMenu2 size={20} />
        </ActionIcon>
      </div>

      <nav className={`${classes.navbar} ${isOpen ? classes.open : ''}`}>
        {/* HEADER */}
        <div className={classes.header}>
          <Group justify="space-between" align="center">
            <Link href="/" className="flex items-center gap-3 no-underline text-inherit" onClick={() => setIsOpen(false)}>
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                style={{ borderRadius: '50%' }}
              />
              <Text fw={700} size="lg">Futsal App</Text>
            </Link>
            <button className={classes.menuButton} onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </Group>
        </div>

        {/* MAIN LINKS */}
        <ScrollArea className={classes.links}>
          {session && mainLinks.map((item) => (
            <Link 
              key={item.link} 
              href={item.link} 
              className={`${classes.link} ${isActive(item.link) ? classes.linkActive : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <div className={classes.linkGroup}>
                <item.icon className={classes.linkIcon} stroke={1.5} />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}

          {/* EVENTS GROUP */}
          <UnstyledButton onClick={() => toggleLink('events')} className={classes.link}>
            <div className={classes.linkGroup}>
              <IconCalendarEvent className={classes.linkIcon} stroke={1.5} />
              <span>Events</span>
            </div>
            {linksOpened.events ? (
              <IconChevronDown className={classes.chevron} stroke={1.5} />
            ) : (
              <IconChevronRight className={classes.chevron} stroke={1.5} />
            )}
          </UnstyledButton>
          <Collapse in={linksOpened.events}>
            <div className={classes.collapse}>
              {eventLinks.map((item) => (
                <Link 
                  key={item.link} 
                  href={item.link} 
                  className={`${classes.link} ${isActive(item.link) ? classes.linkActive : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={classes.linkGroup}>
                    <item.icon className={classes.linkIcon} stroke={1.5} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Collapse>

          {/* ADMIN GROUP */}
          {isAdmin && (
            <>
              <UnstyledButton onClick={() => toggleLink('admin')} className={classes.link}>
                <div className={classes.linkGroup}>
                  <IconSettings className={classes.linkIcon} stroke={1.5} />
                  <span>Admin</span>
                </div>
                {linksOpened.admin ? (
                  <IconChevronDown className={classes.chevron} stroke={1.5} />
                ) : (
                  <IconChevronRight className={classes.chevron} stroke={1.5} />
                )}
              </UnstyledButton>
              <Collapse in={linksOpened.admin}>
                <div className={classes.collapse}>
                  {adminLinks.map((item) => (
                    <Link 
                      key={item.link} 
                      href={item.link} 
                      className={`${classes.link} ${isActive(item.link) ? classes.linkActive : ''}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className={classes.linkGroup}>
                        <item.icon className={classes.linkIcon} stroke={1.5} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Collapse>
            </>
          )}
        </ScrollArea>

        {/* FOOTER */}
        <div className={classes.footer}>
          {session ? (
            <button onClick={onLogout} className={classes.logoutBtn}>
              <IconLogout size={18} stroke={1.5} />
              <span>Logout</span>
            </button>
          ) : (
            <Link href="/login" className={classes.logoutBtn} onClick={() => setIsOpen(false)}>
              <IconLogin size={18} stroke={1.5} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
