'use client'

import * as React from 'react'
import {
  Box,
  Flex,
  VStack,
  Text,
  Avatar,
  Icon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { useRouter, usePathname } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import {
  FiHome,
  FiUser,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi'
import { MdMedicalInformation, MdOutlinePolicy } from 'react-icons/md'
import { FaUserPlus } from 'react-icons/fa'
import { BsBank2 } from 'react-icons/bs'

import { Logo } from './logo'

// ─── Exported constants ────────────────────────────────────────────────────────
export const SIDEBAR_EXPANDED_W = '190px'
export const SIDEBAR_COLLAPSED_W = '68px'

// ─── Types ────────────────────────────────────────────────────────────────────
type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: AppRole[]
  section?: string
  dividerBefore?: boolean
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: FiHome,
    section: 'Main',
  },
  {
    label: 'All Professionals',
    href: '/professionals',
    icon: MdMedicalInformation,
    roles: ['ADMIN', 'SUPER_ADMIN'],
    section: 'Main',
  },
  {
    label: 'Add User',
    href: '/users',
    icon: FaUserPlus,
    roles: ['ADMIN', 'SUPER_ADMIN'],
    section: 'Main',
  },
  {
    label: 'Bulk Sync',
    href: '/bulk-sync',
    icon: FiRefreshCw,
    roles: ['ADMIN', 'OPERATION'],
    section: 'Operations',
    dividerBefore: true,
  },
  {
    label: 'Identify Customer',
    href: '/identify-doctor',
    icon: FiSearch,
    section: 'Operations',
  },
  {
    label: 'Lender List',
    href: '/dashboard/credit/lender',
    icon: BsBank2,
    section: 'Credit',
    dividerBefore: true,
  },
  {
    label: 'Upload Policy',
    href: '/dashboard/credit/policy/upload',
    icon: MdOutlinePolicy,
    section: 'Credit',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('token')
  if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null
  return t
}

const getRoleFromToken = (): AppRole | null => {
  const t = getToken()
  if (!t) return null
  try {
    const decoded = jwtDecode<{ role?: AppRole }>(t)
    return decoded?.role ?? null
  } catch {
    return null
  }
}

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ label: string; collapsed: boolean }> = ({ label, collapsed }) => {
  const color = useColorModeValue('gray.400', 'gray.500')
  if (collapsed) return null
  return (
    <Text
      fontSize="10px"
      fontWeight="600"
      color={color}
      textTransform="uppercase"
      letterSpacing="0.7px"
      px={3}
      pt={3}
      pb={1}
      noOfLines={1}
    >
      {label}
    </Text>
  )
}

// ─── Sidebar Component ────────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const router = useRouter()
  const pathname = usePathname()

  const [userName, setUserName] = React.useState('User')
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [role, setRole] = React.useState<AppRole | null>(null)

  const bg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.100', 'gray.700')
  const hoverBg = useColorModeValue('blue.50', 'blue.900')
  const activeBg = useColorModeValue('blue.50', 'blue.900')
  const activeColor = useColorModeValue('blue.600', 'blue.300')
  const textColor = useColorModeValue('gray.700', 'gray.200')
  const iconColor = useColorModeValue('gray.400', 'gray.500')
  const toggleBg = useColorModeValue('gray.100', 'gray.700')
  const toggleHoverBg = useColorModeValue('gray.200', 'gray.600')
  const avatarBg = useColorModeValue('blue.100', 'blue.800')
  const avatarColor = useColorModeValue('blue.600', 'blue.200')

  React.useEffect(() => {
    const sync = () => {
      const token = getToken()
      const name = localStorage.getItem('userName')
      setIsLoggedIn(Boolean(token))
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

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true
    if (!role) return false
    return item.roles.includes(role)
  })

  // Track which sections we've already rendered a label for
  const renderedSections = new Set<string>()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  return (
    <Box
  as="nav"
  position="fixed"
  top={0}
  left={0}
  bottom={0}
  w={collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W}
  bg={bg}
  borderRight="1px solid"
  borderColor={borderColor}
  zIndex={1200}
  transition="all 0.22s cubic-bezier(.4,0,.2,1)"
  overflow="hidden"
  display="flex"
  flexDirection="column"
  alignItems="stretch"
>
      {/* ── Logo + Toggle ─────────────────────────────────────── */}
      <Flex
        h="60px"
        align="center"
        px={collapsed ? 0 : 2}
        justify={collapsed ? 'center' : 'space-between'}
        borderBottom="0.5px solid"
        borderColor={borderColor}
        flexShrink={0}
      >
        {!collapsed && <Logo />}
        <Box
          as="button"
          onClick={onToggle}
          bg={toggleBg}
          borderRadius="full"
          w="26px"
          h="26px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          flexShrink={0}
          border="0.5px solid"
          borderColor={borderColor}
          _hover={{ bg: toggleHoverBg }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          transition="background 0.15s"
        >
          <Icon
            as={collapsed ? FiChevronRight : FiChevronLeft}
            boxSize={3.5}
            color={iconColor}
          />
        </Box>
      </Flex>

      {/* ── Nav Items ─────────────────────────────────────────── */}
      <VStack
        spacing={0}
        align="stretch"
        flex={1}
        overflowY="auto"
        py={2}
        px={2}
        sx={{ '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {visibleItems.map((item) => {
          const active = isActive(item.href)
          const showLabel = item.section && !renderedSections.has(item.section)
          if (item.section) renderedSections.add(item.section)

          return (
            <React.Fragment key={item.href}>
              {/* Divider */}
              {item.dividerBefore && (
                <Box
                  h="0.5px"
                  bg={borderColor}
                  mx={1}
                  my={1.5}
                />
              )}

              {/* Section label */}
              {showLabel && (
                <SectionLabel label={item.section!} collapsed={collapsed} />
              )}

              {/* Nav row */}
              <Tooltip
                label={collapsed ? item.label : ''}
                placement="right"
                hasArrow
                openDelay={200}
              >
                <Flex
                  as="button"
                  align="center"
                  gap={2.5}
                  px={collapsed ? 0 : 3}
                  py={2}
                  borderRadius="lg"
                  cursor="pointer"
                  justify="flex-start"
                  bg={active ? activeBg : 'transparent'}
                  color={active ? activeColor : textColor}
                  fontWeight={active ? '500' : '400'}
                  fontSize="13.5px"
                  w="100%"
                  transition="all 0.13s"
                  _hover={{ bg: hoverBg, color: activeColor }}
                  onClick={() => router.push(item.href)}
                  aria-label={item.label}
                  mt="1px"
                >
                  <Icon
                    as={item.icon}
                    boxSize={4}
                    color={active ? activeColor : iconColor}
                    flexShrink={0}
                    transition="color 0.13s"
                  />
                  {!collapsed && (
                    <Text noOfLines={1} flex={1} textAlign="left">
                      {item.label}
                    </Text>
                  )}
                  {active && !collapsed && (
                    <Box
                      w="5px"
                      h="5px"
                      borderRadius="full"
                      bg="blue.400"
                      flexShrink={0}
                      ml="auto"
                    />
                  )}
                </Flex>
              </Tooltip>
            </React.Fragment>
          )
        })}
      </VStack>

      {/* ── User Footer ───────────────────────────────────────── */}
      <Box
        borderTop="0.5px solid"
        borderColor={borderColor}
        px={2}
        py={2}
        flexShrink={0}
      >
        {isLoggedIn ? (
          <>
            {/* Profile row */}
            <Tooltip label={collapsed ? userName : ''} placement="right" hasArrow>
              <Flex
                as="button"
                align="center"
                gap={2.5}
                px={collapsed ? 0 : 3}
                py={2}
                borderRadius="lg"
                cursor="pointer"
                justify={collapsed ? 'center' : 'flex-start'}
                w="100%"
                transition="background 0.13s"
                _hover={{ bg: hoverBg }}
                onClick={() => router.push('/profile')}
                aria-label="View Profile"
              >
                <Avatar
                  size="xs"
                  name={userName}
                  bg={avatarBg}
                  color={avatarColor}
                  flexShrink={0}
                />
                {!collapsed && (
                  <Box flex={1} overflow="hidden" textAlign="left">
                    <Text fontSize="13px" fontWeight="500" color={textColor} noOfLines={1}>
                      {userName}
                    </Text>
                    <Text fontSize="10px" color={iconColor} textTransform="capitalize" mt="1px">
                      {role?.toLowerCase().replace('_', ' ') ?? 'user'}
                    </Text>
                  </Box>
                )}
                {!collapsed && (
                  <Icon as={FiUser} boxSize={3.5} color={iconColor} flexShrink={0} />
                )}
              </Flex>
            </Tooltip>

            {/* Logout row */}
            <Tooltip label={collapsed ? 'Logout' : ''} placement="right" hasArrow>
              <Flex
                as="button"
                align="center"
                gap={2.5}
                px={collapsed ? 0 : 3}
                py={2}
                borderRadius="lg"
                cursor="pointer"
                justify={collapsed ? 'center' : 'flex-start'}
                w="100%"
                color="red.500"
                fontSize="13.5px"
                fontWeight="400"
                transition="background 0.13s"
                _hover={{ bg: 'red.50' }}
                onClick={logout}
                aria-label="Logout"
              >
                <Icon as={FiLogOut} boxSize={4} flexShrink={0} />
                {!collapsed && <Text>Logout</Text>}
              </Flex>
            </Tooltip>
          </>
        ) : (
          <Tooltip label={collapsed ? 'Login' : ''} placement="right" hasArrow>
            <Flex
              as="button"
              align="center"
              gap={2.5}
              px={collapsed ? 0 : 3}
              py={2}
              borderRadius="lg"
              cursor="pointer"
              justify={collapsed ? 'center' : 'flex-start'}
              w="100%"
              color="blue.500"
              fontSize="13.5px"
              transition="background 0.13s"
              _hover={{ bg: hoverBg }}
              onClick={() => router.push('/login')}
              aria-label="Login"
            >
              <Icon as={FiUser} boxSize={4} flexShrink={0} />
              {!collapsed && <Text fontWeight="500">Login</Text>}
            </Flex>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}

export default Sidebar