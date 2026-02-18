'use client'

import { Box } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { Header } from './layout/header'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''   // ✅ fallback

  const hideHeader =
    pathname.startsWith('/login') || pathname.startsWith('/signup')

  return (
    <Box>
      {!hideHeader && <Header />}
      <Box pt={!hideHeader ? '72px' : '0'}>{children}</Box>
    </Box>
  )
}
