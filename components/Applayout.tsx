'use client'

import { Box } from '@chakra-ui/react'
import React from 'react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box
      w="100%"
      bg="gray.50"
      minH="100vh"
    >
      <Box pt="64px">
        {children}
      </Box>
    </Box>
  )
}