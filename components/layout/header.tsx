'use client'

import { Box, BoxProps } from '@chakra-ui/react'
import * as React from 'react'

export interface HeaderProps extends Omit<BoxProps, 'children'> {}

/**
 * Header is intentionally invisible.
 * All navigation, user info, and logout are handled by the Sidebar.
 * Exported both as named + default to prevent any import-style mismatch.
 */
export const Header = (_props: HeaderProps) => {
  return (
    <Box
      as="header"
      position="fixed"
      top="0"
      left="0"
      right="0"
      h="0px"
      zIndex="sticky"
      pointerEvents="none"
      aria-hidden="true"
    />
  )
}

export default Header