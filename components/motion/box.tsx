'use client'

import { Box, BoxProps } from '@chakra-ui/react'
import { HTMLMotionProps, motion } from 'framer-motion'

/**
 * Chakra + Framer Motion compatible MotionBox (Next.js App Router safe)
 * Fixes transition typing issues (delay, duration, ease, etc.)
 */
export type MotionBoxProps = BoxProps & HTMLMotionProps<'div'>

export const MotionBox = motion<BoxProps>(Box)
