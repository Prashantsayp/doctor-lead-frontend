'use client'

import React from 'react'
import { MotionBox, type MotionBoxProps } from './box'

export const FallInPlace: React.FC<MotionBoxProps & { delay?: number }> = ({
  children,
  delay = 0.2,
  ...rest
}) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // transition={{ type: 'tween', ease: 'easeOut', duration: 0.6, delay }}
      {...rest}
    >
      {children}
    </MotionBox>
  )
}
