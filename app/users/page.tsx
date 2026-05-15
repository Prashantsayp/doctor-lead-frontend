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
  Icon,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Tooltip,
  Flex,
} from '@chakra-ui/react'
import { jwtDecode } from 'jwt-decode'
import { AddIcon } from '@chakra-ui/icons'
import { FiSearch, FiEdit2, FiKey, FiRefreshCcw, FiEye, FiEyeOff, FiUsers } from 'react-icons/fi'

/* ================= Types (UNCHANGED) ================= */

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

/* ================= Helpers (UNCHANGED) ================= */

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

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
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

/* ================= Role & Status config ================= */

const ROLE_CONFIG: Record<AppRole, { bg: string; text: string; label: string }> = {
  SUPER_ADMIN: { bg: T.redLight, text: T.red, label: 'Super Admin' },
  ADMIN: { bg: T.purpleLight, text: T.purple, label: 'Admin' },
  OPERATION: { bg: T.blueLight, text: T.blue, label: 'Operation' },
  SALES: { bg: T.greenLight, text: T.green, label: 'Sales' },
  USER: { bg: '#f1f5f9', text: T.textSub, label: 'User' },
}

/* ================= Sub-components ================= */

function RolePill({ role }: { role: AppRole }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.USER
  return (
    <Box px={2.5} py={0.5} bg={c.bg} borderRadius="full" display="inline-block">
      <Text fontSize="11px" fontWeight="700" color={c.text}>{c.label}</Text>
    </Box>
  )
}

function StatusDot({ status }: { status: UserStatus }) {
  const isActive = status === 'ACTIVE'
  return (
    <HStack spacing={1.5}>
      <Box w="6px" h="6px" borderRadius="full" bg={isActive ? T.green : T.textMuted} flexShrink={0} />
      <Text fontSize="12px" fontWeight="600" color={isActive ? T.green : T.textMuted}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </HStack>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Box
      w="32px" h="32px" borderRadius="9px"
      background="linear-gradient(135deg, #e0e7ff, #ede9fe)"
      display="flex" alignItems="center" justifyContent="center"
      flexShrink={0}
    >
      <Text fontSize="11px" fontWeight="800" color="#4f46e5">{initials}</Text>
    </Box>
  )
}

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

const selectSx = {
  ...inputSx,
  bg: T.surface,
}

/* ================= Main Page ================= */

export default function UsersPage() {
  const router = useRouter()
  const toast = useToast()

  const [role, setRole] = React.useState<AppRole | null>(null)
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  // ====== LIST STATE (UNCHANGED) ======
  const [loading, setLoading] = React.useState(true)
  const [users, setUsers] = React.useState<UserRow[]>([])
  const [err, setErr] = React.useState<string | null>(null)

  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [pages, setPages] = React.useState(1)

  const [q, setQ] = React.useState('')
  const debouncedQ = useDebouncedValue(q, 350)

  // ====== MODAL STATE (UNCHANGED) ======
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [savingAdd, setSavingAdd] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [selected, setSelected] = React.useState<UserRow | null>(null)
  const [isPwdOpen, setIsPwdOpen] = React.useState(false)
  const [savingPwd, setSavingPwd] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState('')
  const [showPwd, setShowPwd] = React.useState(false)

  // ====== FORM ADD (UNCHANGED) ======
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [designation, setDesignation] = React.useState('')
  const [userRole, setUserRole] = React.useState<AppRole>('USER')
  const [status, setStatus] = React.useState<UserStatus>('ACTIVE')

  // ====== FORM EDIT (UNCHANGED) ======
  const [eName, setEName] = React.useState('')
  const [eEmail, setEEmail] = React.useState('')
  const [eDesignation, setEDesignation] = React.useState('')
  const [eRole, setERole] = React.useState<AppRole>('USER')
  const [eStatus, setEStatus] = React.useState<UserStatus>('ACTIVE')

  /* ================= All logic (100% UNCHANGED) ================= */

  React.useEffect(() => { setRole(getRoleFromToken()) }, [])

  React.useEffect(() => {
    if (role === null) return
    if (!isAdmin) {
      toast({ title: 'Access denied', description: 'Only ADMIN / SUPER_ADMIN can manage users.', status: 'warning' })
      router.replace('/')
    }
  }, [role, isAdmin, router, toast])

  const resetAddForm = () => {
    setName(''); setEmail(''); setPassword(''); setDesignation(''); setUserRole('USER'); setStatus('ACTIVE')
  }

  const openAdd = () => { resetAddForm(); setIsAddOpen(true) }
  const closeAdd = () => { if (savingAdd) return; setIsAddOpen(false) }

  const fetchUsers = React.useCallback(async () => {
    const token = getToken()
    if (!token) { setLoading(false); setErr('Please login first'); router.push('/login'); return }
    setLoading(true); setErr(null)
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
        setErr(msg); setUsers([]); setTotal(0); setPages(1); return
      }
      const d = data as PaginatedUsersResponse
      setUsers(Array.isArray(d?.items) ? d.items : [])
      setTotal(typeof d?.total === 'number' ? d.total : 0)
      setPages(typeof d?.pages === 'number' ? d.pages : 1)
      if (typeof d?.page === 'number' && d.page !== page) setPage(d.page)
      if (typeof d?.limit === 'number' && d.limit !== limit) setLimit(d.limit)
    } catch { setErr('Server error'); setUsers([]); setTotal(0); setPages(1) }
    finally { setLoading(false) }
  }, [router, page, limit, debouncedQ])

  React.useEffect(() => { if (!isAdmin) return; fetchUsers() }, [isAdmin, fetchUsers])
  React.useEffect(() => { setPage(1) }, [debouncedQ])

  const validateAdd = () => {
    const n = name.trim(); const e = email.trim().toLowerCase(); const p = password.trim()
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
    const token = getToken(); if (!token) return
    setSavingAdd(true)
    try {
      const payload = { name: name.trim(), email: email.trim().toLowerCase(), password: password.trim(), designation: designation.trim(), role: userRole, status }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/create-users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast({ title: 'Failed to create user', description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error', status: 'error' }); return }
      toast({ title: 'User created', status: 'success' }); setIsAddOpen(false); setPage(1); await fetchUsers()
    } catch { toast({ title: 'Server error', status: 'error' }) }
    finally { setSavingAdd(false) }
  }

  const openEdit = (u: UserRow) => {
    setSelected(u); setEName(u.name || ''); setEEmail(u.email || ''); setEDesignation(u.designation || '')
    setERole(u.role || 'USER'); setEStatus(u.status || 'ACTIVE'); setIsEditOpen(true)
  }
  const closeEdit = () => { if (savingEdit) return; setIsEditOpen(false); setSelected(null) }

  const saveEdit = async () => {
    if (!selected) return
    const token = getToken(); if (!token) return
    if (!eName.trim()) return toast({ title: 'Name required', status: 'warning' })
    if (!eEmail.trim()) return toast({ title: 'Email required', status: 'warning' })
    setSavingEdit(true)
    try {
      const payload = { name: eName.trim(), email: eEmail.trim().toLowerCase(), designation: eDesignation.trim(), role: eRole, status: eStatus }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/update-users/${selected._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast({ title: 'Update failed', description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error', status: 'error' }); return }
      toast({ title: 'User updated', status: 'success' }); setIsEditOpen(false); await fetchUsers()
    } catch { toast({ title: 'Server error', status: 'error' }) }
    finally { setSavingEdit(false) }
  }

  const openPassword = (u: UserRow) => { setSelected(u); setNewPassword(''); setShowPwd(false); setIsPwdOpen(true) }
  const closePassword = () => { if (savingPwd) return; setIsPwdOpen(false); setSelected(null); setNewPassword(''); setShowPwd(false) }

  const savePassword = async () => {
    if (!selected) return
    const token = getToken(); if (!token) return
    const p = newPassword.trim()
    if (!p || p.length < 6) return toast({ title: 'Password must be at least 6 characters', status: 'warning' })
    setSavingPwd(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/update-users/${selected._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ password: p }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast({ title: 'Password update failed', description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error', status: 'error' }); return }
      toast({ title: 'Password updated', status: 'success' }); setIsPwdOpen(false)
    } catch { toast({ title: 'Server error', status: 'error' }) }
    finally { setSavingPwd(false) }
  }

  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  /* ================= Render ================= */

  return (
    <Box
      bg={T.bg}
      minH="100vh"
      pt="60px"
      transition="all 0.2s"
      fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    >
      <Container maxW="container.xl" pb={10}>

        {/* ── Page Header ── */}
        <Box mb={5}>
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack spacing={3}>
              <Box
                w="42px" h="42px"
                borderRadius="12px"
                background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
                display="flex" alignItems="center" justifyContent="center"
                boxShadow="0 4px 14px rgba(37,99,235,0.28)"
                flexShrink={0}
              >
                <Icon as={FiUsers} color="white" boxSize={5} />
              </Box>
              <Box>
                <Text fontSize="18px" fontWeight="800" color={T.text} letterSpacing="-0.3px" lineHeight="1.1">
                  User Management
                </Text>
                <Text fontSize="12px" color={T.textMuted} fontWeight="500" mt="2px">
                  Create, edit and manage team access
                </Text>
              </Box>
            </HStack>

            <HStack spacing={2}>
              <Tooltip label="Refresh list" hasArrow>
                <IconButton
                  aria-label="Refresh"
                  icon={<Icon as={FiRefreshCcw} boxSize={4} />}
                  size="sm" h="38px" w="38px"
                  variant="outline"
                  borderRadius={T.radiusSm}
                  borderColor={T.border}
                  color={T.textSub}
                  bg={T.surface}
                  _hover={{ borderColor: T.blue, color: T.blue }}
                  onClick={fetchUsers}
                  isDisabled={!isAdmin || loading}
                />
              </Tooltip>
              <Button
                leftIcon={<AddIcon boxSize={3} />}
                size="sm" h="38px" px={4}
                fontSize="13px" fontWeight="600"
                background="linear-gradient(135deg, #2563eb, #7c3aed)"
                color="white"
                borderRadius={T.radiusSm}
                boxShadow="0 4px 12px rgba(37,99,235,0.28)"
                _hover={{ background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)', transform: 'translateY(-1px)' }}
                transition="all 0.15s"
                onClick={openAdd}
                isDisabled={!isAdmin}
              >
                Add User
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* ── Filters + Stats bar ── */}
        <Box
          bg={T.surface}
          border="1px solid"
          borderColor={T.border}
          borderRadius={T.radius}
          boxShadow={T.shadow}
          px={5} py={4}
          mb={4}
        >
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            {/* Search */}
            <InputGroup maxW={{ base: '100%', md: '380px' }}>
              <InputLeftElement h="38px" pointerEvents="none">
                <Icon as={FiSearch} color={T.textMuted} boxSize={4} />
              </InputLeftElement>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email, role…"
                pl="38px"
                {...inputSx}
              />
            </InputGroup>

            <HStack spacing={4} align="center">
              {/* Total badge */}
              {!loading && total > 0 && (
                <Box px={3} py={1} bg={T.blueLight} borderRadius="full">
                  <Text fontSize="12px" fontWeight="700" color={T.blue}>
                    {total} users · {startIndex}–{endIndex} shown
                  </Text>
                </Box>
              )}

              {/* Rows per page */}
              <HStack spacing={2}>
                <Text fontSize="11px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.5px" whiteSpace="nowrap">
                  Rows
                </Text>
                <Select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
                  w="75px"
                  {...selectSx}
                  size="sm"
                  h="38px"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Select>
              </HStack>
            </HStack>
          </Flex>
        </Box>

        {/* ── Table Card ── */}
        <Box
          bg={T.surface}
          border="1px solid"
          borderColor={T.border}
          borderRadius={T.radius}
          boxShadow={T.shadow}
          overflow="hidden"
        >
          {err ? (
            <Box py={14} textAlign="center">
              <Text fontSize="28px" mb={2}>⚠️</Text>
              <Text color={T.red} fontWeight="700" fontSize="14px">{err}</Text>
            </Box>
          ) : loading ? (
            <HStack py={14} justify="center" spacing={3}>
              <Spinner size="sm" color={T.blue} />
              <Text fontSize="14px" color={T.textMuted} fontWeight="500">Loading users…</Text>
            </HStack>
          ) : users.length === 0 ? (
            <Box py={14} textAlign="center">
              <Text fontSize="32px" mb={2}>👥</Text>
              <Text fontSize="14px" color={T.textMuted} fontWeight="500">No users found.</Text>
            </Box>
          ) : (
            <>
              <Box overflowX="auto">
                <Table variant="unstyled" size="sm">
                  <Thead>
                    <Tr bg="#f8fafc" borderBottom="1px solid" borderColor={T.border}>
                      {['User', 'Email', 'Designation', 'Role', 'Status', 'Created', ''].map((h, i) => (
                        <Th
                          key={i}
                          fontSize="10px" fontWeight="700" color={T.textMuted}
                          letterSpacing="0.7px" textTransform="uppercase"
                          py={3} px={4}
                          textAlign={i === 6 ? 'right' : 'left'}
                          whiteSpace="nowrap"
                        >
                          {h}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {users.map((u) => (
                      <Tr
                        key={u._id}
                        borderBottom="1px solid"
                        borderColor={T.border}
                        _hover={{ bg: '#fafbff' }}
                        transition="background 0.1s"
                        _last={{ borderBottom: 'none' }}
                      >
                        {/* User */}
                        <Td px={4} py={3}>
                          <HStack spacing={2.5}>
                            <UserAvatar name={u.name} />
                            <Text fontSize="13px" fontWeight="700" color={T.text} whiteSpace="nowrap">
                              {u.name || '—'}
                            </Text>
                          </HStack>
                        </Td>

                        {/* Email */}
                        <Td px={4} py={3}>
                          <Text fontSize="12px" color={T.textSub} fontWeight="500">{u.email || '—'}</Text>
                        </Td>

                        {/* Designation */}
                        <Td px={4} py={3}>
                          <Text fontSize="12px" color={T.textMuted} fontWeight="500">
                            {u.designation?.trim() ? u.designation : '—'}
                          </Text>
                        </Td>

                        {/* Role */}
                        <Td px={4} py={3}>
                          <RolePill role={u.role} />
                        </Td>

                        {/* Status */}
                        <Td px={4} py={3}>
                          <StatusDot status={u.status} />
                        </Td>

                        {/* Created */}
                        <Td px={4} py={3}>
                          <Text fontSize="11px" color={T.textMuted} fontWeight="500" whiteSpace="nowrap">
                            {u.createdAt ? new Date(u.createdAt).toLocaleString('en-IN') : '—'}
                          </Text>
                        </Td>

                        {/* Actions */}
                        <Td px={4} py={3} textAlign="right">
                          <HStack spacing={1} justify="flex-end">
                            <Tooltip label="Edit user" hasArrow>
                              <IconButton
                                aria-label="Edit"
                                icon={<Icon as={FiEdit2} boxSize={3.5} />}
                                size="xs" h="28px" w="28px"
                                variant="ghost"
                                borderRadius="8px"
                                color={T.textMuted}
                                _hover={{ bg: T.blueLight, color: T.blue }}
                                onClick={() => openEdit(u)}
                              />
                            </Tooltip>
                            <Tooltip label="Change password" hasArrow>
                              <IconButton
                                aria-label="Password"
                                icon={<Icon as={FiKey} boxSize={3.5} />}
                                size="xs" h="28px" w="28px"
                                variant="ghost"
                                borderRadius="8px"
                                color={T.textMuted}
                                _hover={{ bg: T.amberLight, color: T.amber }}
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

              {/* Pagination footer */}
              <Box
                px={5} py={3}
                borderTop="1px solid"
                borderColor={T.border}
                bg="#fafbfc"
              >
                <HStack justify="space-between" flexWrap="wrap" gap={3}>
                  <Text fontSize="12px" color={T.textMuted} fontWeight="500">
                    Page <Text as="span" fontWeight="700" color={T.text}>{page}</Text> of {pages}
                    {total > 0 && <> &nbsp;·&nbsp; {total} total users</>}
                  </Text>

                  <HStack spacing={2}>
                    <Button
                      size="xs" h="30px" px={3}
                      fontSize="12px" fontWeight="600"
                      variant="outline"
                      borderRadius="8px"
                      borderColor={T.border}
                      color={T.textSub}
                      _hover={{ bg: T.bg }}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      isDisabled={loading || page <= 1}
                    >
                      ← Prev
                    </Button>

                    {/* Page number pills */}
                    {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2 + i, pages - 4 + i))
                      return (
                        <Button
                          key={p}
                          size="xs" h="30px" w="30px" px={0}
                          fontSize="12px" fontWeight="600"
                          borderRadius="8px"
                          variant={p === page ? 'solid' : 'ghost'}
                          bg={p === page ? T.text : 'transparent'}
                          color={p === page ? 'white' : T.textSub}
                          _hover={{ bg: p === page ? '#374151' : T.border }}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    })}

                    <Button
                      size="xs" h="30px" px={3}
                      fontSize="12px" fontWeight="600"
                      variant="outline"
                      borderRadius="8px"
                      borderColor={T.border}
                      color={T.textSub}
                      _hover={{ bg: T.bg }}
                      onClick={() => setPage((p) => Math.min(p + 1, pages))}
                      isDisabled={loading || page >= pages}
                    >
                      Next →
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            </>
          )}
        </Box>

        {/* ── Modal: Add User ── */}
        <Modal isOpen={isAddOpen} onClose={closeAdd} size="lg" isCentered>
          <ModalOverlay bg="rgba(0,0,0,0.3)" backdropFilter="blur(4px)" />
          <ModalContent borderRadius="16px" border="1px solid" borderColor={T.border} boxShadow={T.shadowMd}>
            <ModalHeader
              fontSize="15px" fontWeight="800" color={T.text}
              borderBottom="1px solid" borderColor={T.border} pb={4}
            >
              Add New User
            </ModalHeader>
            <ModalCloseButton top={3.5} right={4} isDisabled={savingAdd} />
            <ModalBody py={5} overflowY="auto">
              <Stack spacing={4}>
                {[
                  { label: 'Full Name', value: name, setter: setName, required: true },
                  { label: 'Email Address', value: email, setter: setEmail, required: true },
                ].map(({ label, value, setter, required }) => (
                  <FormControl key={label} isRequired={required}>
                    <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>{label}</FormLabel>
                    <Input value={value} onChange={(e) => setter(e.target.value)} {...inputSx} size="sm" />
                  </FormControl>
                ))}

                <FormControl isRequired>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Password</FormLabel>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} {...inputSx} size="sm" placeholder="Min 6 characters" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Designation</FormLabel>
                  <Input value={designation} onChange={(e) => setDesignation(e.target.value)} {...inputSx} size="sm" placeholder="e.g. Credit Analyst" />
                </FormControl>

                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Role</FormLabel>
                    <Select value={userRole} onChange={(e) => setUserRole(e.target.value as AppRole)} {...selectSx} size="sm">
                      <option value="USER">User</option>
                      <option value="SALES">Sales</option>
                      <option value="OPERATION">Operation</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Status</FormLabel>
                    <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} {...selectSx} size="sm">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </Select>
                  </FormControl>
                </HStack>
              </Stack>
            </ModalBody>
            <ModalFooter borderTop="1px solid" borderColor={T.border} pt={4}>
              <HStack w="100%" justify="space-between">
                <Button variant="ghost" fontSize="13px" fontWeight="600" borderRadius={T.radiusSm} onClick={closeAdd} isDisabled={savingAdd}>Cancel</Button>
                <Button
                  fontSize="13px" fontWeight="700" h="38px" px={5}
                  bg={T.blue} color="white" borderRadius={T.radiusSm}
                  _hover={{ bg: T.blueDark }}
                  onClick={createUser} isLoading={savingAdd} loadingText="Creating…"
                >
                  Create User
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ── Modal: Edit User ── */}
        <Modal isOpen={isEditOpen} onClose={closeEdit} size="lg" isCentered>
          <ModalOverlay bg="rgba(0,0,0,0.3)" backdropFilter="blur(4px)" />
          <ModalContent borderRadius="16px" border="1px solid" borderColor={T.border} boxShadow={T.shadowMd}>
            <ModalHeader
              fontSize="15px" fontWeight="800" color={T.text}
              borderBottom="1px solid" borderColor={T.border} pb={4}
            >
              Edit User
            </ModalHeader>
            <ModalCloseButton top={3.5} right={4} isDisabled={savingEdit} />
            <ModalBody py={5} overflowY="auto">
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Full Name</FormLabel>
                  <Input value={eName} onChange={(e) => setEName(e.target.value)} {...inputSx} size="sm" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Email Address</FormLabel>
                  <Input value={eEmail} onChange={(e) => setEEmail(e.target.value)} {...inputSx} size="sm" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Designation</FormLabel>
                  <Input value={eDesignation} onChange={(e) => setEDesignation(e.target.value)} {...inputSx} size="sm" />
                </FormControl>
                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Role</FormLabel>
                    <Select value={eRole} onChange={(e) => setERole(e.target.value as AppRole)} {...selectSx} size="sm">
                      <option value="USER">User</option>
                      <option value="SALES">Sales</option>
                      <option value="OPERATION">Operation</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>Status</FormLabel>
                    <Select value={eStatus} onChange={(e) => setEStatus(e.target.value as UserStatus)} {...selectSx} size="sm">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </Select>
                  </FormControl>
                </HStack>
              </Stack>
            </ModalBody>
            <ModalFooter borderTop="1px solid" borderColor={T.border} pt={4}>
              <HStack w="100%" justify="space-between">
                <Button variant="ghost" fontSize="13px" fontWeight="600" borderRadius={T.radiusSm} onClick={closeEdit} isDisabled={savingEdit}>Cancel</Button>
                <Button
                  fontSize="13px" fontWeight="700" h="38px" px={5}
                  bg={T.blue} color="white" borderRadius={T.radiusSm}
                  _hover={{ bg: T.blueDark }}
                  onClick={saveEdit} isLoading={savingEdit} loadingText="Saving…"
                >
                  Save Changes
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ── Modal: Change Password ── */}
        <Modal isOpen={isPwdOpen} onClose={closePassword} size="md" isCentered>
          <ModalOverlay bg="rgba(0,0,0,0.3)" backdropFilter="blur(4px)" />
          <ModalContent borderRadius="16px" border="1px solid" borderColor={T.border} boxShadow={T.shadowMd}>
            <ModalHeader
              fontSize="15px" fontWeight="800" color={T.text}
              borderBottom="1px solid" borderColor={T.border} pb={4}
            >
              Change Password
            </ModalHeader>
            <ModalCloseButton top={3.5} right={4} isDisabled={savingPwd} />
            <ModalBody py={5}>
              <Stack spacing={4}>
                {/* User info chip */}
                {selected && (
                  <HStack
                    spacing={3} px={4} py={3}
                    bg="#fafbff" border="1px solid" borderColor={T.border}
                    borderRadius={T.radiusSm}
                  >
                    <UserAvatar name={selected.name} />
                    <Box>
                      <Text fontSize="13px" fontWeight="700" color={T.text}>{selected.name || '—'}</Text>
                      <Text fontSize="11px" color={T.textMuted}>{selected.email || '—'}</Text>
                    </Box>
                  </HStack>
                )}

                <FormControl isRequired>
                  <FormLabel fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.5px" mb={1}>New Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      pr="42px"
                      {...inputSx}
                      size="sm"
                    />
                    <InputRightElement h="38px">
                      <IconButton
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                        size="xs" variant="ghost" borderRadius="7px"
                        color={T.textMuted} _hover={{ bg: T.blueLight, color: T.blue }}
                        icon={<Icon as={showPwd ? FiEyeOff : FiEye} boxSize={3.5} />}
                        onClick={() => setShowPwd((p) => !p)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              </Stack>
            </ModalBody>
            <ModalFooter borderTop="1px solid" borderColor={T.border} pt={4}>
              <HStack w="100%" justify="space-between">
                <Button variant="ghost" fontSize="13px" fontWeight="600" borderRadius={T.radiusSm} onClick={closePassword} isDisabled={savingPwd}>Cancel</Button>
                <Button
                  fontSize="13px" fontWeight="700" h="38px" px={5}
                  bg={T.blue} color="white" borderRadius={T.radiusSm}
                  _hover={{ bg: T.blueDark }}
                  onClick={savePassword} isLoading={savingPwd} loadingText="Updating…"
                >
                  Update Password
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

      </Container>
    </Box>
  )
}