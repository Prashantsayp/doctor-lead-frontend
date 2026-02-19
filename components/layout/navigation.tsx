'use client'

import * as React from 'react'
import { HStack, useDisclosure } from '@chakra-ui/react'
import { useUpdateEffect } from '@chakra-ui/react'
import { useScrollSpy } from 'hooks/use-scrollspy'
import { usePathname } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'

import { MobileNavButton } from '#components/mobile-nav'
import { MobileNavContent } from '#components/mobile-nav'
import { NavLink } from '#components/nav-link'
import siteConfig, { HeaderLink } from '#data/config'

import ThemeToggle from './theme-toggle'

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'

function getRoleFromToken(): AppRole | null {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('token')
  if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null
  try {
    const decoded = jwtDecode<{ role?: AppRole }>(t)
    return decoded?.role ?? null
  } catch {
    return null
  }
}

function canSeeBulkSync(role: AppRole | null) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATION'
}

const Navigation: React.FC = () => {
  const mobileNav = useDisclosure()
  const path = usePathname() ?? ''

  const headerLinks: HeaderLink[] = React.useMemo(() => {
    const role = getRoleFromToken()
    return siteConfig.header.links.filter((l) => {
      if (l.href === '/bulk-sync') return canSeeBulkSync(role)
      return true
    })
  }, [])

  const linksWithId = headerLinks.filter(
    (l): l is HeaderLink & { id: string } => typeof l.id === 'string' && l.id.length > 0,
  )

  const activeId = useScrollSpy(
    linksWithId.map((l) => `[id="${l.id}"]`),
    { threshold: 0.75 },
  )

  const mobileNavBtnRef = React.useRef<HTMLButtonElement | null>(null)

  useUpdateEffect(() => {
    mobileNavBtnRef.current?.focus()
  }, [mobileNav.isOpen])

  return (
    <HStack spacing="2" flexShrink={0}>
      {headerLinks.map(({ href, id, ...props }, i) => (
        <NavLink
          display={['none', null, 'block']}
          href={href || (id ? `/#${id}` : '/')}
          key={i}
          isActive={
            !!((id && activeId === id) || (href && !!path.match(new RegExp(href))))
          }
          {...props}
        >
          {String((props as any).label)}
        </NavLink>
      ))}

      <ThemeToggle />

      <MobileNavButton
        ref={mobileNavBtnRef}
        aria-label="Open Menu"
        onClick={mobileNav.onOpen}
      />

      <MobileNavContent isOpen={mobileNav.isOpen} onClose={mobileNav.onClose} />
    </HStack>
  )
}

export default Navigation
