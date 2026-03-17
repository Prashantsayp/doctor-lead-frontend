'use client'

import {
  Box,
  BoxProps,
  Container,
  Flex,
  HStack,
  Avatar,
  Text,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import * as React from 'react'
import { FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { FaUserPlus } from 'react-icons/fa'
import { MdMedicalInformation } from 'react-icons/md'
import { FiRefreshCw } from 'react-icons/fi'

import { Logo } from './logo'
import Navigation from './navigation'

export interface HeaderProps extends Omit<BoxProps, 'children'> {}

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'

const getRoleFromToken = (): AppRole | null => {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('token')
  if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null

  try {
    const decoded = jwtDecode<{ role?: AppRole }>(t)
    return decoded?.role ?? null
  } catch {
    return null
  }
}

export const Header = (props: HeaderProps) => {
  const router = useRouter()

  const [userName, setUserName] = React.useState('User')
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [role, setRole] = React.useState<AppRole | null>(null)

  // scroll effect (optional)
  const [scrolled, setScrolled] = React.useState(false)
  const { scrollY } = useScroll()
  React.useEffect(() => scrollY.on('change', (v) => setScrolled(v > 4)), [scrollY])

  React.useEffect(() => {
    const sync = () => {
      const token = localStorage.getItem('token')
      const name = localStorage.getItem('userName')

      setIsLoggedIn(Boolean(token && token !== 'null' && token !== 'undefined' && token.trim()))
      setUserName(name?.trim() ? name : 'User')
      setRole(getRoleFromToken())
    }

    sync()
    window.addEventListener('auth-change', sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener('auth-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const logout = () => {
    localStorage.clear()
    window.dispatchEvent(new Event('auth-change'))
    router.replace('/login')
  }

  const goProfile = () => router.push('/profile')

  // ✅ Permissions
  const isAdmin = role === 'ADMIN'
  const canBulkSync = role === 'ADMIN' || role === 'OPERATION'

  return (
    <Box
      as="header"
      position="fixed"
      top="0"
      left="0"
      right="0"
      h="64px" // ✅ fixed height (no weird spacing)
      zIndex="sticky"
      bg={scrolled ? 'whiteAlpha.900' : 'white'}
      borderBottom="1px solid"
      borderColor="gray.200"
      boxShadow={scrolled ? 'sm' : 'none'}
      backdropFilter={scrolled ? 'blur(6px)' : 'none'}
      {...props}
    >
      <Container maxW="container.2xl" h="full" px="8">
        <Flex h="full" align="center" justify="space-between">
          <Logo />

          <HStack spacing={6}>
            <Navigation />

            {!isLoggedIn ? (
              <Button colorScheme="blue" size="sm" onClick={() => router.push('/login')}>
                Login
              </Button>
            ) : (
              <Menu placement="bottom-end">
                <MenuButton
                  as={Button}
                  variant="ghost"
                  size="sm"
                  px={2}
                  borderRadius="xl"
                  rightIcon={<FiChevronDown />}
                >
                  <HStack spacing={2}>
                    <Avatar size="sm" name={userName} />
                    <Text fontWeight="600" maxW="160px" noOfLines={1}>
                      {userName}
                    </Text>
                  </HStack>
                </MenuButton>

                <MenuList borderRadius="xl" py={2} minW="240px">
                  {isAdmin && (
                    <>
                      <MenuItem onClick={() => router.push('/professionals')} icon={<MdMedicalInformation />}>
                        View All Professional
                      </MenuItem>

                      <MenuItem onClick={() => router.push('/users')} icon={<FaUserPlus />}>
                        Add User
                      </MenuItem>

                      <MenuDivider />
                    </>
                  )}

                  {canBulkSync && (
                    <>
                      <MenuItem onClick={() => router.push('/bulk-sync')} icon={<FiRefreshCw />}>
                        Bulk Sync
                      </MenuItem>
                      <MenuDivider />
                    </>
                  )}

                  <MenuItem onClick={goProfile} icon={<FiUser />}>
                    View Profile
                  </MenuItem>

                  <MenuItem onClick={logout} icon={<FiLogOut />} color="red.500">
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}
