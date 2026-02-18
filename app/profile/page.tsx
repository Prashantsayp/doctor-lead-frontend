'use client'

import * as React from 'react'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Skeleton,
  Stack,
  Text,
  useToast,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  SimpleGrid,
  Select,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { FiMail, FiUser, FiBriefcase, FiShield, FiEdit3 } from 'react-icons/fi'
import { jwtDecode } from 'jwt-decode'

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

export default function ProfilePage() {
  const toast = useToast()
  const router = useRouter()

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
    if (!token) {
      router.replace('/login')
      return
    }

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

  React.useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const openEdit = () => {
    if (!me) return
    setName(me?.name || '')
    setDesignation(me?.designation || '')
    setRole(me?.role || 'USER')
    setStatus(me?.status || 'ACTIVE')
    setIsEditOpen(true)
  }

  const closeEdit = () => {
    if (saving) return
    setIsEditOpen(false)
  }

  const save = async () => {
    if (!token) return

    if (!name.trim()) {
      toast({ title: 'Name required', status: 'warning' })
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: name.trim(),
        designation: designation.trim(),
      }

      // ✅ only ADMIN/SUPER_ADMIN can change role/status
      if (canEditRoleStatus) {
        payload.role = role
        payload.status = status
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast({ title: data?.message || 'Update failed', status: 'error' })
        return
      }

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

  const roleColor =
    me?.role === 'SUPER_ADMIN'
      ? 'red'
      : me?.role === 'ADMIN'
      ? 'purple'
      : me?.role === 'OPERATION'
      ? 'blue'
      : me?.role === 'SALES'
      ? 'green'
      : 'gray'

  const statusColor = me?.status === 'ACTIVE' ? 'green' : 'red'

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 6, md: 10 }}>
      <Container maxW="container.md">
        <Box borderRadius="3xl" overflow="hidden" border="1px solid" borderColor="gray.200" boxShadow="sm" bg="white">
          {/* Header */}
          <Box px={{ base: 5, md: 7 }} py={{ base: 6, md: 7 }} bgGradient="linear(to-r, purple.700, blue.700)">
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
              <HStack spacing={4}>
                <Skeleton isLoaded={!loading}>
                  <Avatar
                    size="lg"
                    name={me?.name || 'User'}
                    bg="whiteAlpha.300"
                    color="white"
                    border="2px solid"
                    borderColor="whiteAlpha.500"
                  />
                </Skeleton>

                <Box color="white">
                  <Skeleton isLoaded={!loading}>
                    <Heading size="md" lineHeight="1.1">
                      {me?.name || 'My Profile'}
                    </Heading>
                  </Skeleton>

                  <Skeleton isLoaded={!loading}>
                    <Text mt={1} fontSize="sm" color="whiteAlpha.800">
                      View your details. Edit only when needed.
                    </Text>
                  </Skeleton>

                  <HStack mt={3} spacing={2} flexWrap="wrap">
                    <Skeleton isLoaded={!loading}>
                      <Badge bg="whiteAlpha.300" color="white" borderRadius="full" px={3} py={1}>
                        <HStack spacing={1}>
                          <Icon as={FiShield} />
                          <Text fontSize="xs" fontWeight="800">
                            {me?.role || '—'}
                          </Text>
                        </HStack>
                      </Badge>
                    </Skeleton>

                    <Skeleton isLoaded={!loading}>
                      <Badge bg="whiteAlpha.300" color="white" borderRadius="full" px={3} py={1}>
                        Status: <b>{me?.status || '—'}</b>
                      </Badge>
                    </Skeleton>
                  </HStack>
                </Box>
              </HStack>

              <Button
                leftIcon={<Icon as={FiEdit3} />}
                colorScheme="blackAlpha"
                variant="solid"
                borderRadius="xl"
                bg="whiteAlpha.300"
                _hover={{ bg: 'whiteAlpha.400' }}
                onClick={openEdit}
                isDisabled={loading || !me}
              >
                Edit Profile
              </Button>
            </HStack>
          </Box>

          {/* View-only body */}
          <Box px={{ base: 5, md: 7 }} py={{ base: 5, md: 6 }}>
            <HStack spacing={2} mb={4}>
              <Badge colorScheme={roleColor as any} borderRadius="full" px={3} py={1}>
                Role: {me?.role || '—'}
              </Badge>
              <Badge colorScheme={statusColor as any} borderRadius="full" px={3} py={1}>
                {me?.status || '—'}
              </Badge>
            </HStack>

            <Divider mb={5} />

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <InfoCard label="Name" value={me?.name || '—'} icon={FiUser} loading={loading} />
              <InfoCard label="Designation" value={me?.designation?.trim() ? me.designation : '—'} icon={FiBriefcase} loading={loading} />
              <InfoCard label="Email" value={me?.email || '—'} icon={FiMail} loading={loading} spanFull />
            </SimpleGrid>

            <Box mt={6}>
              <Button variant="outline" borderRadius="xl" onClick={() => router.back()}>
                Back
              </Button>
            </Box>
          </Box>
        </Box>

        {/* ✅ Edit Modal */}
   <Modal isOpen={isEditOpen} onClose={closeEdit} size="lg" isCentered>
  <ModalOverlay />
  <ModalContent borderRadius="2xl" maxH="80vh">
    <ModalHeader py={3}>Edit Profile</ModalHeader>
    <ModalCloseButton isDisabled={saving} />

    {/* Scrollable Body */}
    <ModalBody py={3} overflowY="auto">
      <Stack spacing={3}>
        <FormControl>
          <FormLabel fontSize="sm" mb={1}>
            Name
          </FormLabel>
          <Input
            size="sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            borderRadius="lg"
            bg="gray.50"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" mb={1}>
            Designation
          </FormLabel>
          <Input
            size="sm"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            borderRadius="lg"
            bg="gray.50"
          />
        </FormControl>

        {/* Compact Access Controls */}
        <Box
          p={3}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="xl"
          bg="gray.50"
          opacity={canEditRoleStatus ? 1 : 0.7}
        >
          <Text fontSize="xs" fontWeight="700" color="gray.600" mb={2}>
            Access Controls
          </Text>

          <Stack spacing={3}>
            <FormControl isDisabled={!canEditRoleStatus}>
              <FormLabel fontSize="xs" mb={1}>
                Role
              </FormLabel>
              <Select
                size="sm"
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                borderRadius="lg"
                bg="white"
              >
                <option value="USER">USER</option>
                <option value="SALES">SALES</option>
                <option value="OPERATION">OPERATION</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </Select>
            </FormControl>

            <FormControl isDisabled={!canEditRoleStatus}>
              <FormLabel fontSize="xs" mb={1}>
                Status
              </FormLabel>
              <Select
                size="sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                borderRadius="lg"
                bg="white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <FormControl>
          <FormLabel fontSize="sm" mb={1}>
            Email
          </FormLabel>
          <Input
            size="sm"
            value={me?.email || ''}
            isReadOnly
            borderRadius="lg"
            bg="gray.100"
          />
        </FormControl>
      </Stack>
    </ModalBody>

    <ModalFooter py={3}>
      <HStack w="100%" justify="space-between">
        <Button size="sm" variant="ghost" onClick={closeEdit} isDisabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          colorScheme="blue"
          onClick={save}
          isLoading={saving}
          loadingText="Saving..."
          borderRadius="lg"
          px={6}
        >
          Save
        </Button>
      </HStack>
    </ModalFooter>
  </ModalContent>
</Modal>

      </Container>
    </Box>
  )
}

function InfoCard({
  label,
  value,
  icon,
  loading,
  spanFull,
}: {
  label: string
  value: string
  icon: any
  loading: boolean
  spanFull?: boolean
}) {
  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      p={4}
      bg="white"
      boxShadow="sm"
      gridColumn={spanFull ? { base: 'auto', md: '1 / -1' } : undefined}
    >
      <HStack spacing={3}>
        <Box
          w="36px"
          h="36px"
          borderRadius="xl"
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={icon} color="gray.600" />
        </Box>

        <Box flex="1">
          <Text fontSize="xs" color="gray.500" fontWeight="700">
            {label}
          </Text>
          <Skeleton isLoaded={!loading}>
            <Text fontSize="md" fontWeight="800" color="gray.800" mt={1} noOfLines={1}>
              {value}
            </Text>
          </Skeleton>
        </Box>
      </HStack>
    </Box>
  )
}
