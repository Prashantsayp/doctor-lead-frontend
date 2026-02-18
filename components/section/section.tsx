'use client'

import * as React from 'react'
import { chakra, Container, HTMLChakraProps, StyleProps } from '@chakra-ui/react'

export interface SectionProps extends HTMLChakraProps<'section'> {
  children: React.ReactNode
  innerWidth?: StyleProps['width']
}

export const Section: React.FC<SectionProps> = (props) => {
  const { children, innerWidth = 'container.lg', ...rest } = props

  return (
    <chakra.section {...rest}>
      <Container height="full" maxW={innerWidth}>
        {children}
      </Container>
    </chakra.section>
  )
}
