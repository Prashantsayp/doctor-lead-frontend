'use client'

import { Box } from '@chakra-ui/react'
import React from 'react'
import Sidebar, {
  SIDEBAR_EXPANDED_W,
  SIDEBAR_COLLAPSED_W,
} from '../components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)

  const sidebarW = collapsed
    ? SIDEBAR_COLLAPSED_W
    : SIDEBAR_EXPANDED_W

  return (
    <Box display="flex">

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {/* 🔥 MAIN CONTENT (AUTO SHIFT) */}
      <Box
        ml={sidebarW}
        w="100%"
        transition="margin 0.22s"
        bg="gray.50"
        minH="100vh"
      >
        {/* Navbar space */}
        <Box pt="64px">
          {children}
        </Box>
      </Box>

    </Box>
  )
}