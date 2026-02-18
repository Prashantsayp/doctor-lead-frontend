'use client'

import * as React from 'react'
import { ChakraProps, chakra, shouldForwardProp } from '@chakra-ui/react'
import { HTMLMotionProps, isValidMotionProp, motion } from 'framer-motion'

export interface MotionBoxProps
  extends Omit<HTMLMotionProps<'div'>, 'children' | 'style'>,
    Omit<ChakraProps, 'transition' | 'color'> {
  children?: React.ReactNode
}

/**
 * Chakra + Framer Motion compatible MotionBox
 * (works properly in Next.js App Router)
 */
export const MotionBox = chakra(motion.div, {
  shouldForwardProp: (prop) =>
    isValidMotionProp(prop) || shouldForwardProp(prop),
})
