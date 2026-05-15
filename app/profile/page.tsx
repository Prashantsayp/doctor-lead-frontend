'use client'

import * as React from 'react'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Skeleton,
  Stack,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  SimpleGrid,
  Select,
  Flex,
  VStack,
  Divider,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import {
  FiMail,
  FiUser,
  FiBriefcase,
  FiShield,
  FiEdit3,
  FiArrowLeft,
  FiCamera,
  FiKey,
  FiLogOut,
} from 'react-icons/fi'
import { jwtDecode } from 'jwt-decode'

/* ================= Types (UNCHANGED) ================= */

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'
type UserStatus = 'ACTIVE' | 'INACTIVE'

type MeUser = {
  _id: string
  name: string
  email: string
  designation?: string
  role: AppRole
  status: UserStatus
  createdAt?: string
}

/* ================= Design Tokens ================= */

const T = {
  bg: '#f6f7fb',
  surface: '#ffffff',
  border: '#e8eaf0',
  borderStrong: '#d1d5e0',
  text: '#111827',
  textSub: '#6b7280',
  textMuted: '#9ca3af',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  blueDark: '#1d4ed8',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  red: '#dc2626',
  redLight: '#fef2f2',
  amber: '#d97706',
  amberLight: '#fffbeb',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  radius: '14px',
  radiusSm: '10px',
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 20px rgba(0,0,0,0.08)',
}

/* ================= Role config ================= */

const ROLE_CONFIG: Record<AppRole, { bg: string; text: string; label: string; dot: string }> = {
  SUPER_ADMIN: { bg: T.redLight,    text: T.red,    label: 'Super Admin', dot: '#ef4444' },
  ADMIN:       { bg: T.purpleLight, text: T.purple, label: 'Admin',       dot: '#a855f7' },
  OPERATION:   { bg: T.blueLight,   text: T.blue,   label: 'Operation',   dot: '#3b82f6' },
  SALES:       { bg: T.greenLight,  text: T.green,  label: 'Sales',       dot: '#22c55e' },
  USER:        { bg: '#f1f5f9',     text: T.textSub, label: 'User',       dot: '#94a3b8' },
}

/* ================= Input style ================= */

const inputSx = {
  bg: T.surface,
  border: '1px solid',
  borderColor: T.border,
  borderRadius: T.radiusSm,
  fontSize: '13px',
  fontWeight: '500',
  h: '38px',
  _focus: { borderColor: T.blue, boxShadow: `0 0 0 3px ${T.blueLight}` },
  _hover: { borderColor: T.borderStrong },
  _placeholder: { color: T.textMuted },
}

/* ================= Sub-components ================= */

function RolePill({ role }: { role: AppRole }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.USER
  return (
    <Box px={2.5} py={0.5} bg={c.bg} borderRadius="full" display="inline-flex" alignItems="center" gap="5px">
      <Box w="5px" h="5px" borderRadius="full" bg={c.dot} flexShrink={0} />
      <Text fontSize="11px" fontWeight="700" color={c.text}>{c.label}</Text>
    </Box>
  )
}

function MetaRow({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <Box>
      <Text fontSize="10px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.6px" mb={0.5}>
        {label}
      </Text>
      <Skeleton isLoaded={!loading}>
        <Text fontSize="13px" fontWeight="600" color={T.text}>{value || '—'}</Text>
      </Skeleton>
    </Box>
  )
}

function SidebarActionBtn({
  icon, label, onClick, danger,
}: {
  icon: any; label: string; onClick?: () => void; danger?: boolean
}) {
  return (
    <Box
      as="button"
      display="flex"
      alignItems="center"
      gap="8px"
      w="100%"
      px={3} py={2.5}
      borderRadius={T.radiusSm}
      border="1px solid"
      borderColor={danger ? '#fecaca' : T.border}
      bg={danger ? T.redLight : T.surface}
      color={danger ? T.red : T.textSub}
      fontSize="12px"
      fontWeight="600"
      cursor="pointer"
      transition="all 0.15s"
      _hover={{
        borderColor: danger ? T.red : T.blue,
        color: danger ? T.red : T.blue,
        bg: danger ? '#fee2e2' : T.blueLight,
      }}
      onClick={onClick}
    >
      <Icon as={icon} boxSize={3.5} />
      {label}
    </Box>
  )
}

/* ================= Photo Avatar ================= */

function ProfilePhoto({
  name, loading,
}: {
  name: string; loading: boolean
}) {
  const initials = (name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Box position="relative" mx="auto" w="fit-content">
      <Skeleton isLoaded={!loading} borderRadius="full">
        <Box
          w="90px" h="90px"
          borderRadius="full"
          background="linear-gradient(135deg, #c7d2fe 0%, #ddd6fe 50%, #e0e7ff 100%)"
          display="flex" alignItems="center" justifyContent="center"
          border="3px solid white"
          boxShadow="0 0 0 3px #e0e7ff, 0 4px 16px rgba(79,70,229,0.2)"
          mx="auto"
        >
          <Text fontSize="28px" fontWeight="800" color="#4f46e5" letterSpacing="-1px">
            {initials}
          </Text>
        </Box>
      </Skeleton>
      {/* Camera overlay */}
      <Box
        position="absolute"
        bottom="2px" right="2px"
        w="24px" h="24px"
        borderRadius="full"
        bg={T.blue}
        border="2px solid white"
        display="flex" alignItems="center" justifyContent="center"
        cursor="pointer"
        boxShadow={T.shadow}
        _hover={{ bg: T.blueDark }}
        transition="all 0.15s"
      >
        <Icon as={FiCamera} boxSize={2.5} color="white" />
      </Box>
    </Box>
  )
}

/* ================= Main Page ================= */

export default function ProfilePage() {
  const toast = useToast()
  const router = useRouter()

  /* ====== ALL STATE UNCHANGED ====== */
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [me, setMe] = React.useState<MeUser | null>(null)

  const [name, setName] = React.useState('')
  const [designation, setDesignation] = React.useState('')
  const [role, setRole] = React.useState<AppRole>('USER')
  const [status, setStatus] = React.useState<UserStatus>('ACTIVE')

  const [isEditOpen, setIsEditOpen] = React.useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const myRole: AppRole | null = React.useMemo(() => {
    if (!token) return null
    try {
      const decoded = jwtDecode<{ role?: AppRole }>(token)
      return decoded?.role ?? null
    } catch {
      return null
    }
  }, [token])

  const canEditRoleStatus = myRole === 'ADMIN' || myRole === 'SUPER_ADMIN'

  const fetchMe = React.useCallback(async () => {
    if (!token) { router.replace('/login'); return }
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: data?.message || 'Please login again', status: 'error' })
        localStorage.clear()
        router.replace('/login')
        return
      }
      setMe(data)
      setName(data?.name || '')
      setDesignation(data?.designation || '')
      setRole((data?.role as AppRole) || 'USER')
      setStatus((data?.status as UserStatus) || 'ACTIVE')
      localStorage.setItem('userName', data?.name || 'User')
      window.dispatchEvent(new Event('auth-change'))
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, router, toast])

  React.useEffect(() => { fetchMe() }, [fetchMe])

  const openEdit = () => {
    if (!me) return
    setName(me?.name || '')
    setDesignation(me?.designation || '')
    setRole(me?.role || 'USER')
    setStatus(me?.status || 'ACTIVE')
    setIsEditOpen(true)
  }

  const closeEdit = () => { if (saving) return; setIsEditOpen(false) }

  const save = async () => {
    if (!token) return
    if (!name.trim()) { toast({ title: 'Name required', status: 'warning' }); return }
    setSaving(true)
    try {
      const payload: any = { name: name.trim(), designation: designation.trim() }
      if (canEditRoleStatus) { payload.role = role; payload.status = status }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast({ title: data?.message || 'Update failed', status: 'error' }); return }
      setMe(data)
      localStorage.setItem('userName', data?.name || 'User')
      window.dispatchEvent(new Event('auth-change'))
      toast({ title: 'Profile updated', status: 'success' })
      setIsEditOpen(false)
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /* ====== Derived ====== */
  const roleConf = me?.role ? ROLE_CONFIG[me.role] : ROLE_CONFIG.USER
  const isActive = me?.status === 'ACTIVE'
  const memberSince = me?.createdAt
    ? new Date(me.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  const logout = () => {
    localStorage.clear()
    window.dispatchEvent(new Event('auth-change'))
    router.replace('/login')
  }

  /* ====== RENDER ====== */

  return (
    <Box
      bg={T.bg}
      minH="100vh"
      py={6}
      fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    >
      <Container maxW="900px" px={{ base: 4, md: 6 }}>

        {/* Back */}
        <Button
          size="sm" h="34px" px={3}
          fontSize="12px" fontWeight="600"
          variant="ghost"
          borderRadius={T.radiusSm}
          color={T.textMuted}
          leftIcon={<Icon as={FiArrowLeft} boxSize={3.5} />}
          _hover={{ color: T.blue, bg: T.blueLight }}
          onClick={() => router.back()}
          mb={4}
        >
          Back
        </Button>

        {/* ── Two-column layout (like reference screenshot) ── */}
        <Flex gap={4} align="flex-start" direction={{ base: 'column', md: 'row' }}>

          {/* ──────── LEFT SIDEBAR ──────── */}
          <Box
            w={{ base: '100%', md: '240px' }}
            flexShrink={0}
          >
            {/* Profile card */}
            <Box
              bg={T.surface}
              border="1px solid"
              borderColor={T.border}
              borderRadius={T.radius}
              boxShadow={T.shadow}
              overflow="hidden"
              mb={3}
            >
              {/* Top gradient strip */}
              <Box
                h="64px"
                background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
              />

              {/* Photo + info */}
              <Box px={4} pb={5} mt="-45px">
                <ProfilePhoto name={me?.name || 'U'} loading={loading} />

                <VStack spacing={1} mt={3} textAlign="center">
                  <Skeleton isLoaded={!loading}>
                    <Text fontSize="15px" fontWeight="800" color={T.text} letterSpacing="-0.2px" lineHeight="1.2">
                      {me?.name || '—'}
                    </Text>
                  </Skeleton>
                  <Skeleton isLoaded={!loading}>
                    <Text fontSize="11px" color={T.textMuted} fontWeight="500">
                      {me?.designation?.trim() || 'No designation set'}
                    </Text>
                  </Skeleton>
                  <Skeleton isLoaded={!loading} mt={1}>
                    {me?.role && <RolePill role={me.role} />}
                  </Skeleton>
                </VStack>

                {/* Status indicator */}
                <Flex justify="center" mt={2.5}>
                  <HStack spacing={1.5}>
                    <Box w="6px" h="6px" borderRadius="full" bg={isActive ? T.green : T.textMuted} />
                    <Text fontSize="11px" fontWeight="600" color={isActive ? T.green : T.textMuted}>
                      {isActive ? 'Active Account' : 'Inactive'}
                    </Text>
                  </HStack>
                </Flex>
              </Box>

              {/* Divider + meta */}
              <Box borderTop="1px solid" borderColor={T.border} px={4} py={4}>
                <Stack spacing={3}>
                  <MetaRow label="Email" value={me?.email || '—'} loading={loading} />
                  <MetaRow label="Designation" value={me?.designation?.trim() || '—'} loading={loading} />
                  {memberSince && (
                    <MetaRow label="Member Since" value={memberSince} loading={loading} />
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Action buttons (like reference: Edit Profile / Change Password) */}
            <Box
              bg={T.surface}
              border="1px solid"
              borderColor={T.border}
              borderRadius={T.radius}
              boxShadow={T.shadow}
              p={3}
            >
              <Stack spacing={2}>
                <SidebarActionBtn
                  icon={FiEdit3}
                  label="Edit Profile"
                  onClick={openEdit}
                />
              </Stack>
            </Box>
          </Box>

          {/* ──────── RIGHT MAIN PANEL ──────── */}
          <Box flex="1" minW={0}>

            {/* Profile Details card */}
            <Box
              bg={T.surface}
              border="1px solid"
              borderColor={T.border}
              borderRadius={T.radius}
              boxShadow={T.shadow}
              overflow="hidden"
              mb={4}
            >
              <Box px={5} py={3.5} borderBottom="1px solid" borderColor={T.border} bg="#fafbff">
                <HStack justify="space-between">
                  <Text fontSize="11px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.7px">
                    Profile Details
                  </Text>
                  <Button
                    size="xs" h="26px" px={3}
                    fontSize="11px" fontWeight="600"
                    bg={T.blue} color="white"
                    borderRadius="8px"
                    leftIcon={<Icon as={FiEdit3} boxSize={3} />}
                    _hover={{ bg: T.blueDark }}
                    onClick={openEdit}
                    isDisabled={loading || !me}
                  >
                    Edit
                  </Button>
                </HStack>
              </Box>

              <Box p={5}>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                  {[
                    { label: 'Full Name', value: me?.name || '—', icon: FiUser },
                    { label: 'Email Address', value: me?.email || '—', icon: FiMail },
                    { label: 'Designation', value: me?.designation?.trim() || '—', icon: FiBriefcase },
                    { label: 'User ID', value: me?._id ? `#${me._id.slice(-6).toUpperCase()}` : '—', icon: FiShield },
                  ].map(({ label, value, icon }) => (
                    <Box
                      key={label}
                      bg="#fafbff"
                      border="1px solid"
                      borderColor={T.border}
                      borderRadius={T.radiusSm}
                      px={4} py={3}
                      _hover={{ borderColor: T.borderStrong }}
                      transition="border-color 0.15s"
                    >
                      <HStack spacing={2.5}>
                        <Box
                          w="30px" h="30px"
                          borderRadius="8px"
                          bg={T.blueLight}
                          display="flex" alignItems="center" justifyContent="center"
                          flexShrink={0}
                        >
                          <Icon as={icon} color={T.blue} boxSize={3.5} />
                        </Box>
                        <Box flex="1" minW={0}>
                          <Text fontSize="10px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.5px">
                            {label}
                          </Text>
                          <Skeleton isLoaded={!loading} mt={0.5}>
                            <Text fontSize="13px" fontWeight="700" color={T.text} noOfLines={1}>{value}</Text>
                          </Skeleton>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            </Box>

            {/* Access & Permissions card */}
            <Box
              bg={T.surface}
              border="1px solid"
              borderColor={T.border}
              borderRadius={T.radius}
              boxShadow={T.shadow}
              overflow="hidden"
            >
              <Box px={5} py={3.5} borderBottom="1px solid" borderColor={T.border} bg="#fafbff">
                <Text fontSize="11px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.7px">
                  Access & Permissions
                </Text>
              </Box>

              <Box p={5}>
                <SimpleGrid columns={2} spacing={3}>
                  {/* Role */}
                  <Box
                    bg="#fafbff"
                    border="1px solid"
                    borderColor={T.border}
                    borderRadius={T.radiusSm}
                    px={4} py={3.5}
                    position="relative"
                    overflow="hidden"
                    _before={{
                      content: '""',
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      h: '3px',
                      bg: me?.role ? ROLE_CONFIG[me.role].dot : T.textMuted,
                    }}
                  >
                    <Text fontSize="10px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.6px" mb={2}>
                      Role
                    </Text>
                    <Skeleton isLoaded={!loading}>
                      {me?.role && <RolePill role={me.role} />}
                    </Skeleton>
                  </Box>

                  {/* Status */}
                  <Box
                    bg="#fafbff"
                    border="1px solid"
                    borderColor={T.border}
                    borderRadius={T.radiusSm}
                    px={4} py={3.5}
                    position="relative"
                    overflow="hidden"
                    _before={{
                      content: '""',
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      h: '3px',
                      bg: isActive ? T.green : T.textMuted,
                    }}
                  >
                    <Text fontSize="10px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.6px" mb={2}>
                      Status
                    </Text>
                    <Skeleton isLoaded={!loading}>
                      <HStack spacing={1.5}>
                        <Box w="6px" h="6px" borderRadius="full" bg={isActive ? T.green : T.textMuted} />
                        <Text fontSize="12px" fontWeight="700" color={isActive ? T.green : T.textMuted}>
                          {me?.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Text>
                      </HStack>
                    </Skeleton>
                  </Box>

                  {/* Member since */}
                  <Box
                    bg="#fafbff"
                    border="1px solid"
                    borderColor={T.border}
                    borderRadius={T.radiusSm}
                    px={4} py={3.5}
                    gridColumn="1 / -1"
                  >
                    <Text fontSize="10px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.6px" mb={1}>
                      Account Created
                    </Text>
                    <Skeleton isLoaded={!loading}>
                      <Text fontSize="13px" fontWeight="600" color={T.textSub}>
                        {memberSince || '—'}
                      </Text>
                    </Skeleton>
                  </Box>
                </SimpleGrid>
              </Box>
            </Box>
          </Box>
        </Flex>

        {/* ── Edit Modal (ALL LOGIC UNCHANGED) ── */}
        <Modal isOpen={isEditOpen} onClose={closeEdit} size="lg" isCentered>
          <ModalOverlay bg="rgba(0,0,0,0.3)" backdropFilter="blur(4px)" />
          <ModalContent
            borderRadius="16px"
            border="1px solid"
            borderColor={T.border}
            boxShadow={T.shadowMd}
            fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
          >
            <ModalHeader
              fontSize="15px" fontWeight="800" color={T.text}
              borderBottom="1px solid" borderColor={T.border} pb={4}
            >
              Edit Profile
            </ModalHeader>
            <ModalCloseButton top={3.5} right={4} isDisabled={saving} />

            <ModalBody py={5} overflowY="auto">
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                    Full Name
                  </FormLabel>
                  <Input value={name} onChange={(e) => setName(e.target.value)} {...inputSx} size="sm" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                    Designation
                  </FormLabel>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Credit Analyst"
                    {...inputSx}
                    size="sm"
                  />
                </FormControl>

                {/* Access Controls */}
                <Box
                  p={4}
                  border="1px solid"
                  borderColor={canEditRoleStatus ? T.border : '#f1f5f9'}
                  borderRadius={T.radiusSm}
                  bg={canEditRoleStatus ? '#fafbff' : '#f8fafc'}
                  opacity={canEditRoleStatus ? 1 : 0.6}
                >
                  <HStack spacing={1.5} mb={3}>
                    <Icon as={FiShield} boxSize={3.5} color={canEditRoleStatus ? T.blue : T.textMuted} />
                    <Text fontSize="11px" fontWeight="700" color={canEditRoleStatus ? T.textSub : T.textMuted} textTransform="uppercase" letterSpacing="0.5px">
                      Access Controls
                    </Text>
                    {!canEditRoleStatus && (
                      <Box px={2} bg="#f1f5f9" borderRadius="full">
                        <Text fontSize="10px" fontWeight="600" color={T.textMuted}>Read only</Text>
                      </Box>
                    )}
                  </HStack>

                  <SimpleGrid columns={2} spacing={3}>
                    <FormControl isDisabled={!canEditRoleStatus}>
                      <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                        Role
                      </FormLabel>
                      <Select value={role} onChange={(e) => setRole(e.target.value as AppRole)} {...inputSx} size="sm">
                        <option value="USER">User</option>
                        <option value="SALES">Sales</option>
                        <option value="OPERATION">Operation</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </Select>
                    </FormControl>

                    <FormControl isDisabled={!canEditRoleStatus}>
                      <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                        Status
                      </FormLabel>
                      <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} {...inputSx} size="sm">
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <FormControl>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>
                    Email Address
                  </FormLabel>
                  <Input
                    value={me?.email || ''}
                    isReadOnly
                    {...inputSx}
                    size="sm"
                    bg="#f8fafc"
                    color={T.textMuted}
                    cursor="not-allowed"
                    _hover={{ borderColor: T.border }}
                  />
                </FormControl>
              </Stack>
            </ModalBody>

            <ModalFooter borderTop="1px solid" borderColor={T.border} pt={4}>
              <HStack w="100%" justify="space-between">
                <Button variant="ghost" fontSize="13px" fontWeight="600" borderRadius={T.radiusSm} onClick={closeEdit} isDisabled={saving}>
                  Cancel
                </Button>
                <Button
                  fontSize="13px" fontWeight="700" h="38px" px={6}
                  bg={T.blue} color="white" borderRadius={T.radiusSm}
                  _hover={{ bg: T.blueDark }}
                  onClick={save} isLoading={saving} loadingText="Saving…"
                >
                  Save Changes
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

      </Container>
    </Box>
  )
}