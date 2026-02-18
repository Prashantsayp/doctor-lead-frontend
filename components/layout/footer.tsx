import React from 'react'
import {
  Box,
  BoxProps,
  Container,
  Flex,
  HStack,
  Text,
} from '@chakra-ui/react'
import { Link, LinkProps } from '@saas-ui/react'
import siteConfig from '#data/config'

export interface FooterProps extends BoxProps {}

export const Footer: React.FC<FooterProps> = (props) => {
  const { ...rest } = props

  return (
    <Box bg="white" _dark={{ bg: 'gray.900' }} {...rest}>
      <Container maxW="container.2xl" px="8" py="6">
        {/* Single row – Logo | Copyright | Socials */}
        <Flex
          align="center"
          justify="space-between"
          w="full"
          gap={4}
          flexDirection={{ base: 'column', md: 'row' }}
        >
          {/* Left: Logo */}
          <Flex
            align="center"
            w={{ base: 'full', md: 'auto' }}
            justify={{ base: 'center', md: 'flex-start' }}
          >
            <Box as={siteConfig.logo} height="22px" />
          </Flex>

          {/* Center: Copyright */}
          <Flex w={{ base: 'full', md: 'auto' }} justify="center">
            <Copyright>{siteConfig.footer.copyright}</Copyright>
          </Flex>

          {/* Right: Contact + Socials */}
          <HStack
            spacing="4"
            w={{ base: 'full', md: 'auto' }}
            justify={{ base: 'center', md: 'flex-end' }}
          >
            {siteConfig.footer?.links?.map(({ href, label }) => (
              <FooterLink
                key={href}
                href={href}
                isExternal={!String(href).startsWith('mailto:')}
              >
                {label}
              </FooterLink>
            ))}
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}

export interface CopyrightProps {
  title?: React.ReactNode
  children?: React.ReactNode
}

export const Copyright: React.FC<CopyrightProps> = ({ title, children }) => {
  const content =
    title && !children ? `© ${new Date().getFullYear()} - ${title}` : null

  return (
    <Text as="div" color="muted" fontSize="sm" textAlign="center">
      {content || children}
    </Text>
  )
}

export const FooterLink: React.FC<LinkProps> = (props) => {
  const { children, ...rest } = props

  return (
    <Link
      color="muted"
      fontSize="sm"
      textDecoration="none"
      _hover={{
        color: 'inherit',
        opacity: 0.9,
        textDecoration: 'none',
      }}
      {...rest}
    >
      {children}
    </Link>
  )
}
