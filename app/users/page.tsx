'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  Divider,
  Icon,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Tooltip,
} from '@chakra-ui/react'
import { jwtDecode } from 'jwt-decode'
import { AddIcon } from '@chakra-ui/icons'
import { FiSearch, FiEdit2, FiKey, FiRefreshCcw, FiEye, FiEyeOff } from 'react-icons/fi'

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'
type UserStatus = 'ACTIVE' | 'INACTIVE'

type UserRow = {
  _id: string
  name: string
  email: string
  designation?: string
  role: AppRole
  status: UserStatus
  createdAt?: string
}

type PaginatedUsersResponse = {
  items: UserRow[]
  total: number
  page: number
  limit: number
  pages: number
}

const getToken = () => {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('token')
  if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null
  return t
}

const getRoleFromToken = (): AppRole | null => {
  const token = getToken()
  if (!token) return null
  try {
    const decoded = jwtDecode<{ role?: AppRole }>(token)
    return decoded?.role ?? null
  } catch {
    return null
  }
}

// ✅ small debounce hook (so search typing pe API spam na ho)
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function UsersPage() {
  const router = useRouter()
  const toast = useToast()

  const [role, setRole] = React.useState<AppRole | null>(null)
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  // ====== LIST STATE ======
  const [loading, setLoading] = React.useState(true)
  const [users, setUsers] = React.useState<UserRow[]>([])
  const [err, setErr] = React.useState<string | null>(null)

  // ✅ Server-side pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [pages, setPages] = React.useState(1)

  // ✅ Server-side search (q)
  const [q, setQ] = React.useState('')
  const debouncedQ = useDebouncedValue(q, 350)

  // ====== ADD MODAL STATE ======
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [savingAdd, setSavingAdd] = React.useState(false)

  // ====== EDIT MODAL STATE ======
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [selected, setSelected] = React.useState<UserRow | null>(null)

  // ====== PASSWORD MODAL STATE ======
  const [isPwdOpen, setIsPwdOpen] = React.useState(false)
  const [savingPwd, setSavingPwd] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState('')
  const [showPwd, setShowPwd] = React.useState(false)

  // ====== FORM (ADD) ======
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [designation, setDesignation] = React.useState('')
  const [userRole, setUserRole] = React.useState<AppRole>('USER')
  const [status, setStatus] = React.useState<UserStatus>('ACTIVE')

  // ====== FORM (EDIT) ======
  const [eName, setEName] = React.useState('')
  const [eEmail, setEEmail] = React.useState('')
  const [eDesignation, setEDesignation] = React.useState('')
  const [eRole, setERole] = React.useState<AppRole>('USER')
  const [eStatus, setEStatus] = React.useState<UserStatus>('ACTIVE')

  React.useEffect(() => {
    setRole(getRoleFromToken())
  }, [])

  React.useEffect(() => {
    if (role === null) return
    if (!isAdmin) {
      toast({
        title: 'Access denied',
        description: 'Only ADMIN / SUPER_ADMIN can manage users.',
        status: 'warning',
      })
      router.replace('/')
    }
  }, [role, isAdmin, router, toast])

  const resetAddForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setDesignation('')
    setUserRole('USER')
    setStatus('ACTIVE')
  }

  const openAdd = () => {
    resetAddForm()
    setIsAddOpen(true)
  }

  const closeAdd = () => {
    if (savingAdd) return
    setIsAddOpen(false)
  }

  const fetchUsers = React.useCallback(async () => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      setErr('Please login first')
      router.push('/login')
      return
    }

    setLoading(true)
    setErr(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim())

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/get-users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to fetch users'
        setErr(msg)
        setUsers([])
        setTotal(0)
        setPages(1)
        return
      }

      // ✅ expected: { items, total, page, limit, pages }
      const d = data as PaginatedUsersResponse
      setUsers(Array.isArray(d?.items) ? d.items : [])
      setTotal(typeof d?.total === 'number' ? d.total : 0)
      setPages(typeof d?.pages === 'number' ? d.pages : 1)

      // safety: server page might adjust
      if (typeof d?.page === 'number' && d.page !== page) setPage(d.page)
      if (typeof d?.limit === 'number' && d.limit !== limit) setLimit(d.limit)
    } catch {
      setErr('Server error')
      setUsers([])
      setTotal(0)
      setPages(1)
    } finally {
      setLoading(false)
    }
  }, [router, page, limit, debouncedQ])

  React.useEffect(() => {
    if (!isAdmin) return
    fetchUsers()
  }, [isAdmin, fetchUsers])

  // ✅ search change pe page reset (debounce ke pehle)
  React.useEffect(() => {
    setPage(1)
  }, [debouncedQ])

  const validateAdd = () => {
    const n = name.trim()
    const e = email.trim().toLowerCase()
    const p = password.trim()
    if (!n) return 'Name is required'
    if (!e) return 'Email is required'
    if (!/^\S+@\S+\.\S+$/.test(e)) return 'Enter a valid email'
    if (!p || p.length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const createUser = async () => {
    if (!isAdmin) return
    const msg = validateAdd()
    if (msg) return toast({ title: msg, status: 'warning' })

    const token = getToken()
    if (!token) return

    setSavingAdd(true)
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        designation: designation.trim(),
        role: userRole,
        status,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/create-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Failed to create user',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({ title: 'User created', status: 'success' })
      setIsAddOpen(false)

      // ✅ after create, go to first page and refetch
      setPage(1)
      await fetchUsers()
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSavingAdd(false)
    }
  }

  const openEdit = (u: UserRow) => {
    setSelected(u)
    setEName(u.name || '')
    setEEmail(u.email || '')
    setEDesignation(u.designation || '')
    setERole(u.role || 'USER')
    setEStatus(u.status || 'ACTIVE')
    setIsEditOpen(true)
  }

  const closeEdit = () => {
    if (savingEdit) return
    setIsEditOpen(false)
    setSelected(null)
  }

  const saveEdit = async () => {
    if (!selected) return
    const token = getToken()
    if (!token) return

    if (!eName.trim()) return toast({ title: 'Name required', status: 'warning' })
    if (!eEmail.trim()) return toast({ title: 'Email required', status: 'warning' })

    setSavingEdit(true)
    try {
      const payload = {
        name: eName.trim(),
        email: eEmail.trim().toLowerCase(),
        designation: eDesignation.trim(),
        role: eRole,
        status: eStatus,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/update-users/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Update failed',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({ title: 'User updated', status: 'success' })
      setIsEditOpen(false)
      await fetchUsers()
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSavingEdit(false)
    }
  }

  const openPassword = (u: UserRow) => {
    setSelected(u)
    setNewPassword('')
    setShowPwd(false)
    setIsPwdOpen(true)
  }

  const closePassword = () => {
    if (savingPwd) return
    setIsPwdOpen(false)
    setSelected(null)
    setNewPassword('')
    setShowPwd(false)
  }

  const savePassword = async () => {
    if (!selected) return
    const token = getToken()
    if (!token) return

    const p = newPassword.trim()
    if (!p || p.length < 6) return toast({ title: 'Password must be at least 6 characters', status: 'warning' })

    setSavingPwd(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/update-users/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: p }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Password update failed',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({ title: 'Password updated', status: 'success' })
      setIsPwdOpen(false)
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSavingPwd(false)
    }
  }

  const roleBadge = (r: AppRole) => {
    const color =
      r === 'ADMIN' ? 'purple' : r === 'SUPER_ADMIN' ? 'red' : r === 'OPERATION' ? 'blue' : r === 'SALES' ? 'green' : 'gray'
    return (
      <Badge colorScheme={color} borderRadius="full" px={2} py={0.5}>
        {r}
      </Badge>
    )
  }

  const statusBadge = (s: UserStatus) => {
    const color = s === 'ACTIVE' ? 'green' : 'gray'
    return (
      <Badge colorScheme={color} borderRadius="full" px={2} py={0.5}>
        {s}
      </Badge>
    )
  }

  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 0, md: 0 }}>
      <Container maxW="container.xl">
        {/* Premium Header */}
        <Box borderRadius="3xl" overflow="hidden" border="1px solid" borderColor="gray.200" boxShadow="sm" bg="white">
          <Box px={{ base: 5, md: 7 }} py={{ base: 6, md: 7 }} bgGradient="linear(to-r, purple.700, blue.700)" color="white">
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
              <Box>
                <Heading size="md">User Management</Heading>
                <Text fontSize="sm" color="whiteAlpha.800" mt={1}>
                  Create, edit users and manage access
                </Text>
              </Box>

              <HStack>
                <Button
                  leftIcon={<Icon as={AddIcon} />}
                  bg="whiteAlpha.300"
                  _hover={{ bg: 'whiteAlpha.400' }}
                  color="white"
                  borderRadius="xl"
                  onClick={openAdd}
                  isDisabled={!isAdmin}
                >
                  Add User
                </Button>

                <Tooltip label="Refresh list">
                  <IconButton
                    aria-label="Refresh"
                    icon={<Icon as={FiRefreshCcw} />}
                    bg="whiteAlpha.300"
                    _hover={{ bg: 'whiteAlpha.400' }}
                    color="white"
                    borderRadius="xl"
                    onClick={fetchUsers}
                    isDisabled={!isAdmin || loading}
                  />
                </Tooltip>
              </HStack>
            </HStack>
          </Box>

          <Box px={{ base: 5, md: 7 }} py={{ base: 4, md: 5 }} bg="white">
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <InputGroup maxW={{ base: '100%', md: '420px' }}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email, role..."
                  borderRadius="xl"
                  bg="gray.50"
                />
              </InputGroup>

              <Text fontSize="sm" color="gray.600">
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    Total: <b>{total}</b>
                    {total > 0 ? (
                      <>
                        {' '}
                        • Showing <b>{startIndex}</b>–<b>{endIndex}</b>
                      </>
                    ) : null}
                  </>
                )}
              </Text>
            </HStack>

            <Divider mt={4} />
          </Box>
        </Box>

        {/* List */}
        <Box mt={6} bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
          {err ? (
            <Box py={8} textAlign="center">
              <Text color="red.500" fontWeight="600">
                {err}
              </Text>
            </Box>
          ) : loading ? (
            <HStack py={8} justify="center">
              <Spinner />
              <Text color="gray.600">Loading users...</Text>
            </HStack>
          ) : users.length === 0 ? (
            <Box py={10} textAlign="center">
              <Text color="gray.500">No users found.</Text>
            </Box>
          ) : (
            <>
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Designation</Th>
                      <Th>Role</Th>
                      <Th>Status</Th>
                      <Th>Created</Th>
                      <Th textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {users.map((u) => (
                      <Tr key={u._id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="800">{u.name || '—'}</Td>
                        <Td>{u.email || '—'}</Td>
                        <Td>{u.designation?.trim() ? u.designation : '—'}</Td>
                        <Td>{roleBadge(u.role)}</Td>
                        <Td>{statusBadge(u.status)}</Td>
                        <Td fontSize="xs" color="gray.600">
                          {u.createdAt ? new Date(u.createdAt).toLocaleString('en-IN') : '—'}
                        </Td>
                        <Td textAlign="right">
                          <HStack justify="flex-end">
                            <Tooltip label="Edit user">
                              <IconButton
                                aria-label="Edit"
                                size="sm"
                                borderRadius="lg"
                                icon={<Icon as={FiEdit2} />}
                                onClick={() => openEdit(u)}
                              />
                            </Tooltip>
                            <Tooltip label="Change password">
                              <IconButton
                                aria-label="Password"
                                size="sm"
                                borderRadius="lg"
                                icon={<Icon as={FiKey} />}
                                onClick={() => openPassword(u)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              {/* ✅ Pagination Bar */}
              <HStack mt={4} justify="space-between" flexWrap="wrap" gap={3}>
                <Text fontSize="sm" color="gray.600">
                  Page <b>{page}</b> of <b>{pages}</b>
                </Text>

                <HStack>
                  <Select
                    size="sm"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1)
                    }}
                    w="140px"
                    borderRadius="xl"
                  >
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    borderRadius="xl"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    isDisabled={loading || page <= 1}
                  >
                    Prev
                  </Button>

                  <Button
                    size="sm"
                    colorScheme="blue"
                    borderRadius="xl"
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    isDisabled={loading || page >= pages}
                  >
                    Next
                  </Button>
                </HStack>
              </HStack>
            </>
          )}
        </Box>

        {/* ✅ Add User Modal */}
        <Modal isOpen={isAddOpen} onClose={closeAdd} size="lg" isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl" maxH="80vh">
            <ModalHeader py={3}>Add User</ModalHeader>
            <ModalCloseButton isDisabled={savingAdd} />
            <ModalBody py={3} overflowY="auto">
              <Stack spacing={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" mb={1}>
                    Name
                  </FormLabel>
                  <Input size="sm" value={name} onChange={(e) => setName(e.target.value)} borderRadius="xl" bg="gray.50" />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" mb={1}>
                    Email
                  </FormLabel>
                  <Input size="sm" value={email} onChange={(e) => setEmail(e.target.value)} borderRadius="xl" bg="gray.50" />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" mb={1}>
                    Password
                  </FormLabel>
                  <Input size="sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} borderRadius="xl" bg="gray.50" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Designation
                  </FormLabel>
                  <Input size="sm" value={designation} onChange={(e) => setDesignation(e.target.value)} borderRadius="xl" bg="gray.50" />
                </FormControl>

                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>
                      Role
                    </FormLabel>
                    <Select size="sm" value={userRole} onChange={(e) => setUserRole(e.target.value as AppRole)} borderRadius="xl" bg="white">
                      <option value="USER">USER</option>
                      <option value="SALES">SALES</option>
                      <option value="OPERATION">OPERATION</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>
                      Status
                    </FormLabel>
                    <Select size="sm" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} borderRadius="xl" bg="white">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </Select>
                  </FormControl>
                </HStack>
              </Stack>
            </ModalBody>
            <ModalFooter py={3}>
              <HStack w="100%" justify="space-between">
                <Button size="sm" variant="ghost" onClick={closeAdd} isDisabled={savingAdd}>
                  Cancel
                </Button>
                <Button size="sm" colorScheme="blue" onClick={createUser} isLoading={savingAdd} loadingText="Creating..." borderRadius="xl">
                  Create
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ✅ Edit User Modal */}
        <Modal isOpen={isEditOpen} onClose={closeEdit} size="lg" isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl" maxH="80vh">
            <ModalHeader py={3}>Edit User</ModalHeader>
            <ModalCloseButton isDisabled={savingEdit} />
            <ModalBody py={3} overflowY="auto">
              <Stack spacing={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" mb={1}>
                    Name
                  </FormLabel>
                  <Input size="sm" value={eName} onChange={(e) => setEName(e.target.value)} borderRadius="xl" bg="gray.50" />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" mb={1}>
                    Email
                  </FormLabel>
                  <Input size="sm" value={eEmail} onChange={(e) => setEEmail(e.target.value)} borderRadius="xl" bg="gray.50" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Designation
                  </FormLabel>
                  <Input size="sm" value={eDesignation} onChange={(e) => setEDesignation(e.target.value)} borderRadius="xl" bg="gray.50" />
                </FormControl>

                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>
                      Role
                    </FormLabel>
                    <Select size="sm" value={eRole} onChange={(e) => setERole(e.target.value as AppRole)} borderRadius="xl" bg="white">
                      <option value="USER">USER</option>
                      <option value="SALES">SALES</option>
                      <option value="OPERATION">OPERATION</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>
                      Status
                    </FormLabel>
                    <Select size="sm" value={eStatus} onChange={(e) => setEStatus(e.target.value as UserStatus)} borderRadius="xl" bg="white">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </Select>
                  </FormControl>
                </HStack>
              </Stack>
            </ModalBody>
            <ModalFooter py={3}>
              <HStack w="100%" justify="space-between">
                <Button size="sm" variant="ghost" onClick={closeEdit} isDisabled={savingEdit}>
                  Cancel
                </Button>
                <Button size="sm" colorScheme="blue" onClick={saveEdit} isLoading={savingEdit} loadingText="Saving..." borderRadius="xl">
                  Save
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ✅ Change Password Modal */}
        <Modal isOpen={isPwdOpen} onClose={closePassword} size="md" isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader py={3}>Change Password</ModalHeader>
            <ModalCloseButton isDisabled={savingPwd} />
            <ModalBody py={3}>
              <Stack spacing={3}>
                <Text fontSize="sm" color="gray.600">
                  User: <b>{selected?.name || '—'}</b> ({selected?.email || '—'})
                </Text>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" mb={1}>
                    New Password
                  </FormLabel>

                  <InputGroup>
                    <Input
                      size="sm"
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      borderRadius="xl"
                      bg="gray.50"
                      placeholder="Min 6 characters"
                      pr="42px"
                    />

                    <InputRightElement h="100%">
                      <IconButton
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                        size="sm"
                        variant="ghost"
                        borderRadius="lg"
                        icon={<Icon as={showPwd ? FiEyeOff : FiEye} />}
                        onClick={() => setShowPwd((p) => !p)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              </Stack>
            </ModalBody>
            <ModalFooter py={3}>
              <HStack w="100%" justify="space-between">
                <Button size="sm" variant="ghost" onClick={closePassword} isDisabled={savingPwd}>
                  Cancel
                </Button>
                <Button size="sm" colorScheme="blue" onClick={savePassword} isLoading={savingPwd} loadingText="Updating..." borderRadius="xl">
                  Update
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </Box>
  )
}