'use client'

import { Box, Flex } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import React from 'react'

import { Header } from './layout/header'
import {
  Sidebar,
  SIDEBAR_EXPANDED_W,
  SIDEBAR_COLLAPSED_W,
} from './layout/sidebar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ''

  const hideLayout =
    pathname.startsWith('/login') || pathname.startsWith('/signup')

  const [collapsed, setCollapsed] = React.useState(false)

  const sidebarWidth = collapsed
    ? SIDEBAR_COLLAPSED_W
    : SIDEBAR_EXPANDED_W

  return (
    <Box>
      {!hideLayout && <Header />}

      <Flex minH="100vh">
        {/* Sidebar */}
        {!hideLayout && (
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />
        )}

        {/* Main Content */}
        <Box
  pt={!hideLayout ? '60px' : '0'}
  ml={!hideLayout ? sidebarWidth : 0}
  flex="1"
  transition="margin-left 0.22s cubic-bezier(.4,0,.2,1)"
>
          {children}
        </Box>
      </Flex>
    </Box>
  )
}