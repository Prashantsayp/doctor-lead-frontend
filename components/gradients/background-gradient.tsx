'use client'

import * as React from 'react'
import { Box, useColorModeValue } from '@chakra-ui/react'

export const BackgroundGradient = ({ hideOverlay, ...props }: any) => {
  // Chakra CSS vars (works in v2/v3)
  const c1 = 'var(--chakra-colors-blue-800)'
  const c2 = 'var(--chakra-colors-purple-500)'
  const c3 = 'var(--chakra-colors-cyan-500)'
  const c4 = 'var(--chakra-colors-teal-500)'

  const fallbackBackground = `
    radial-gradient(at top left, ${c1} 30%, transparent 80%),
    radial-gradient(at bottom, ${c2} 0%, transparent 60%),
    radial-gradient(at bottom left, ${c3} 0%, transparent 50%),
    radial-gradient(at top right, ${c4}, transparent),
    radial-gradient(at bottom right, ${c1} 0%, transparent 50%)
  `

  const overlayBase = useColorModeValue('white', 'gray.900')
  const gradientOverlay = `linear-gradient(0deg, var(--chakra-colors-${overlayBase}) 60%, rgba(0, 0, 0, 0) 100%)`

  const opacity = useColorModeValue('0.30', '0.50')

  return (
    <Box
      backgroundImage={fallbackBackground}
      backgroundBlendMode="saturation"
      position="absolute"
      top="0"
      left="0"
      zIndex="0"
      opacity={opacity}
      height="100vh"
      width="100%"
      overflow="hidden"
      pointerEvents="none"
      {...props}
    >
      <Box
        backgroundImage={!hideOverlay ? gradientOverlay : undefined}
        position="absolute"
        inset={0}
        zIndex="1"
      />
    </Box>
  )
}
