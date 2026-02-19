'use client'

import * as React from 'react'
import { MotionBox, MotionBoxProps } from './box'

export const Float: React.FC<
  MotionBoxProps & { delay?: number; steps?: number[] }
> = (props) => {
  const { children, delay = 0.2, steps = [10, -10, 10], ...rest } = props

  return (
    <MotionBox
      // use y instead of translateY (framer standard)
      animate={{ y: steps }}
      // transition={{
      //   delay,
      //   duration: 5,
      //   ease: 'easeInOut',
      //   repeat: Infinity,
      //   repeatType: 'reverse',
      // }}
      {...rest}
    >
      {children}
    </MotionBox>
  )
}
