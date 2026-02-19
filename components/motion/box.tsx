'use client'

import * as React from 'react'
import { Box, type BoxProps } from '@chakra-ui/react'
import { motion, type HTMLMotionProps } from 'framer-motion'

// Create a motion-enabled div
const MotionDiv = motion.create('div')

export type MotionBoxProps = BoxProps & HTMLMotionProps<'div'>

/**
 * MotionBox: Chakra Box + Framer Motion (FM11 compatible)
 * - Chakra styles go to <Box as={MotionDiv} />
 * - Motion props (animate, initial, whileHover, transition, etc.) pass through
 */
export const MotionBox = React.forwardRef<HTMLDivElement, MotionBoxProps>(
  function MotionBox(props, ref) {
    return <Box ref={ref} as={MotionDiv} {...props} />
  }
)
