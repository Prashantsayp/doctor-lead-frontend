'use client'

import {
  Box,
  Text,
  Button,
  SimpleGrid,
  Badge,
  Container,
  useToast,
  Flex,
  HStack,
  VStack,
  Select,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Switch,
  Input,
  Spinner,
  Icon,
} from '@chakra-ui/react'
import { useEffect, useCallback, useState } from 'react'
import axios from 'axios'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Policy {
  _id: string
  lenderName: string
  minCibil: number
  maxCibil: number
  maxFOIR?: number
  minIncome?: number
  minLoanAmount: number
  maxLoanAmount: number
  roi?: number
  isActive: boolean
}

type ViewMode = 'grid' | 'table'
type StatusFilter = 'all' | 'active' | 'inactive'

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatINR = (value?: number) => {
  if (!value) return '–'
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

const getCardTheme = (name: string) => {
  const themes = [
    { bg: '#EFF6FF', color: '#1D4ED8', accent: '#DBEAFE' },
    { bg: '#F0FDF4', color: '#15803D', accent: '#DCFCE7' },
    { bg: '#FFF7ED', color: '#C2410C', accent: '#FFEDD5' },
    { bg: '#FAF5FF', color: '#7C3AED', accent: '#EDE9FE' },
  ]
  return themes[name.charCodeAt(0) % 4]
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3" y2="18"/>
    <line x1="21" y1="6" x2="21" y2="18"/>
  </svg>
)

const UploadLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) => (
  <Box bg="white" border="1px solid" borderColor="gray.100" p={6} rounded="2xl" shadow="sm">
    <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="0.08em">{label}</Text>
    <Text fontSize="4xl" fontWeight="800" color={accent || 'gray.900'} mt={2} lineHeight={1}>{value}</Text>
    {sub && <Text mt={3} fontSize="sm" fontWeight="500" color="gray.500">{sub}</Text>}
  </Box>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PolicyListPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const toast = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API}/lender-policy/all-policies`)
      setPolicies(res.data?.data || [])
    } catch {
      toast({ title: 'Error fetching policies', status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleStatus = async (id: string) => {
    setTogglingId(id)
    try {
      await axios.patch(`${API}/lender-policy/toggle-status/${id}`)
      toast({ title: 'Status updated', status: 'success', duration: 2500, isClosable: true, position: 'top-right' })
      await fetchData()
    } catch {
      toast({ title: 'Update failed', status: 'error', duration: 3000, isClosable: true, position: 'top-right' })
    } finally {
      setTogglingId(null)
    }
  }

  const deletePolicy = async (id: string) => {
    setDeletingId(id)
    try {
      await axios.delete(`${API}/lender-policy/${id}`)
      toast({ title: 'Policy deleted', status: 'success', duration: 2500, isClosable: true, position: 'top-right' })
      await fetchData()
    } catch {
      toast({ title: 'Delete failed', status: 'error', duration: 3000, isClosable: true, position: 'top-right' })
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = policies.filter((p) => {
    const matchSearch = p.lenderName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? p.isActive : !p.isActive
    return matchSearch && matchStatus
  })

  const activeCount = policies.filter((p) => p.isActive).length
  const inactiveCount = policies.length - activeCount
  const activePercent = policies.length > 0 ? Math.round((activeCount / policies.length) * 100) : 0

  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="1200px" px={{ base: 4, md: 6 }}>

        {/* ── Header ── */}
        <Flex justify="space-between" align="center" mb={8} direction={{ base: 'column', sm: 'row' }} gap={4}>
          <Box>
            <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color="gray.900" letterSpacing="-0.02em">
              Policy Management
            </Text>
            <Text fontSize="md" color="gray.500" mt={1}>
              Lender eligibility criteria extracted from uploaded documents
            </Text>
          </Box>
          <Button
            as="a"
            href="/dashboard/credit/policy/upload"
            bg="#2563EB"
            color="white"
            leftIcon={<UploadLinkIcon />}
            size="md"
            px={5}
            rounded="xl"
            fontWeight="700"
            shadow="sm"
            _hover={{ bg: '#1D4ED8' }}
          >
            Upload Policy
          </Button>
        </Flex>

        {/* ── Stats ── */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={8}>
          <StatCard
            label="Total Policies"
            value={policies.length}
            sub={`${activeCount} active · ${inactiveCount} inactive`}
          />
          <StatCard
            label="Active Policies"
            value={activeCount}
            sub={`${activePercent}% coverage ratio`}
            accent="#16A34A"
          />
          <StatCard
            label="Filtered Results"
            value={filtered.length}
            sub="Matching current filters"
            accent="#2563EB"
          />
        </SimpleGrid>

        {/* ── Toolbar ── */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          gap={4} mb={6}
        >
          <HStack spacing={3} flex={1}>
            <Input
              placeholder="Search by lender name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="white"
              borderColor="gray.200"
              rounded="xl"
              maxW={{ base: 'full', md: '280px' }}
              fontSize="sm"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              bg="white"
              borderColor="gray.200"
              rounded="xl"
              maxW="160px"
              fontSize="sm"
            >
              <option value="all">All Policies</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </HStack>

          <HStack bg="gray.200" p={1} rounded="xl" spacing={0}>
            <IconButton
              aria-label="Grid view"
              icon={<GridIcon />}
              size="sm"
              rounded="lg"
              variant={viewMode === 'grid' ? 'solid' : 'ghost'}
              bg={viewMode === 'grid' ? 'white' : 'transparent'}
              onClick={() => setViewMode('grid')}
            />
            <IconButton
              aria-label="Table view"
              icon={<TableIcon />}
              size="sm"
              rounded="lg"
              variant={viewMode === 'table' ? 'solid' : 'ghost'}
              bg={viewMode === 'table' ? 'white' : 'transparent'}
              onClick={() => setViewMode('table')}
            />
          </HStack>
        </Flex>

        {/* ── Content ── */}
        {loading ? (
          <Flex justify="center" align="center" py={20}>
            <VStack spacing={3}>
              <Spinner size="lg" color="blue.500" thickness="3px" />
              <Text fontSize="sm" color="gray.400" fontWeight="600">Loading policies...</Text>
            </VStack>
          </Flex>

        ) : filtered.length === 0 ? (
          <Box
            bg="white" rounded="2xl" border="1px dashed" borderColor="gray.200"
            py={16} textAlign="center"
          >
            <Flex justify="center" mb={4}><EmptyIcon /></Flex>
            <Text fontWeight="700" color="gray.500" fontSize="sm">No policies found</Text>
            <Text fontSize="xs" color="gray.400" mt={1}>
              {searchTerm ? 'Try a different search term' : 'Upload a policy document to get started'}
            </Text>
            <Button
              as="a"
              href="/dashboard/credit/policy/upload"
              mt={5}
              size="sm"
              bg="#2563EB"
              color="white"
              rounded="xl"
              fontWeight="700"
              _hover={{ bg: '#1D4ED8' }}
            >
              Upload Policy
            </Button>
          </Box>

        ) : viewMode === 'grid' ? (

          /* ── GRID VIEW ── */
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={5}>
            {filtered.map((p) => {
              const theme = getCardTheme(p.lenderName || 'A')
              const isToggling = togglingId === p._id
              const isDeleting = deletingId === p._id
              return (
                <Flex
                  key={p._id}
                  direction="column"
                  justify="space-between"
                  bg="white"
                  p={6}
                  rounded="2xl"
                  border={p.isActive ? '1px solid' : '1px dashed'}
                  borderColor={p.isActive ? 'gray.100' : 'gray.300'}
                  shadow="sm"
                  opacity={isToggling || isDeleting ? 0.5 : p.isActive ? 1 : 0.8}
                  transition="all 0.2s"
                >
                  {/* Card Header */}
                  <Flex align="center" justify="space-between" mb={5}>
                    <HStack spacing={3}>
                      <Flex
                        w={12} h={12} rounded="xl"
                        align="center" justify="center"
                        fontWeight="800" fontSize="md"
                        bg={theme.bg} color={theme.color}
                        flexShrink={0}
                      >
                        {getInitials(p.lenderName || 'NA')}
                      </Flex>
                      <VStack align="start" spacing={0.5}>
                        <Text fontWeight="700" fontSize="sm" color={p.isActive ? 'gray.900' : 'gray.400'} noOfLines={1}>
                          {p.lenderName || 'Unknown'}
                        </Text>
                        <Badge
                          colorScheme={p.isActive ? 'green' : 'red'}
                          variant="subtle"
                          rounded="md"
                          px={1.5} py={0.5}
                          fontSize="9px"
                          fontWeight="700"
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </VStack>
                    </HStack>
                  </Flex>

                  {/* Card Fields */}
                  <VStack spacing={3} mb={5} align="stretch">
                    {[
                      { label: 'CIBIL Range', value: `${p.minCibil ?? '–'} – ${p.maxCibil ?? '–'}` },
                      { label: 'Loan Range', value: `${formatINR(p.minLoanAmount)} – ${formatINR(p.maxLoanAmount)}` },
                      { label: 'Min Income', value: formatINR(p.minIncome) },
                      { label: 'Max FOIR', value: p.maxFOIR != null ? `${p.maxFOIR}%` : '–' },
                      { label: 'ROI', value: p.roi != null ? `${p.roi}%` : '–' },
                    ].map(({ label, value }) => (
                      <Flex
                        key={label}
                        justify="space-between"
                        align="center"
                        borderBottom="1px solid"
                        borderColor="gray.50"
                        pb={2}
                        _last={{ borderBottom: 'none', pb: 0 }}
                      >
                        <Text fontSize="xs" fontWeight="600" color="gray.400">{label}</Text>
                        <Text fontSize="xs" fontWeight="700" color={p.isActive ? 'gray.800' : 'gray.400'}>{value}</Text>
                      </Flex>
                    ))}
                  </VStack>

                  {/* Card Actions */}
                  <HStack spacing={2} mt={1}>
                    <Button
                      size="xs"
                      rounded="lg"
                      fontWeight="700"
                      flex={1}
                      variant={p.isActive ? 'outline' : 'solid'}
                      colorScheme={p.isActive ? 'orange' : 'green'}
                      onClick={() => toggleStatus(p._id)}
                      isLoading={isToggling}
                      loadingText="..."
                    >
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="xs"
                      rounded="lg"
                      fontWeight="700"
                      variant="outline"
                      colorScheme="red"
                      leftIcon={<TrashIcon />}
                      onClick={() => deletePolicy(p._id)}
                      isLoading={isDeleting}
                      loadingText="..."
                    >
                      Delete
                    </Button>
                  </HStack>
                </Flex>
              )
            })}
          </SimpleGrid>

        ) : (

          /* ── TABLE VIEW ── */
          <Box
            bg="white" rounded="2xl"
            border="1px solid" borderColor="gray.100"
            shadow="sm" overflow="hidden"
          >
            <Box overflowX="auto">
              <Table variant="simple" size="md">
                <Thead bg="gray.50">
                  <Tr>
                    <Th py={4} fontSize="xs">Lender</Th>
                    <Th py={4} fontSize="xs">CIBIL Range</Th>
                    <Th py={4} fontSize="xs">Loan Range</Th>
                    <Th py={4} fontSize="xs">Min Income</Th>
                    <Th py={4} fontSize="xs">Max FOIR</Th>
                    <Th py={4} fontSize="xs">ROI</Th>
                    <Th py={4} fontSize="xs">Status</Th>
                    <Th py={4} fontSize="xs" textAlign="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.map((p) => {
                    const theme = getCardTheme(p.lenderName || 'A')
                    return (
                      <Tr key={p._id} _hover={{ bg: 'gray.50' }} opacity={p.isActive ? 1 : 0.7}>
                        <Td py={4}>
                          <HStack spacing={3}>
                            <Flex
                              w={8} h={8} rounded="lg"
                              align="center" justify="center"
                              fontWeight="800" fontSize="xs"
                              bg={theme.bg} color={theme.color}
                              flexShrink={0}
                            >
                              {getInitials(p.lenderName || 'NA')}
                            </Flex>
                            <Text fontWeight="700" fontSize="sm">{p.lenderName || 'Unknown'}</Text>
                          </HStack>
                        </Td>
                        <Td py={4}><Text fontSize="sm" fontWeight="600">{p.minCibil ?? '–'} – {p.maxCibil ?? '–'}</Text></Td>
                        <Td py={4}><Text fontSize="sm" fontWeight="600">{formatINR(p.minLoanAmount)} – {formatINR(p.maxLoanAmount)}</Text></Td>
                        <Td py={4}><Text fontSize="sm" fontWeight="600">{formatINR(p.minIncome)}</Text></Td>
                        <Td py={4}><Text fontSize="sm" fontWeight="600">{p.maxFOIR != null ? `${p.maxFOIR}%` : '–'}</Text></Td>
                        <Td py={4}><Text fontSize="sm" fontWeight="600">{p.roi != null ? `${p.roi}%` : '–'}</Text></Td>
                        <Td py={4}>
                          <Badge
                            colorScheme={p.isActive ? 'green' : 'red'}
                            variant="subtle"
                            rounded="md"
                            px={2} py={0.5}
                            fontSize="xs"
                            fontWeight="700"
                          >
                            {p.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </Td>
                        <Td py={4} textAlign="right">
                          <HStack spacing={2} justify="flex-end">
                            <Button
                              size="xs"
                              rounded="lg"
                              fontWeight="700"
                              variant={p.isActive ? 'outline' : 'solid'}
                              colorScheme={p.isActive ? 'orange' : 'green'}
                              onClick={() => toggleStatus(p._id)}
                              isLoading={togglingId === p._id}
                            >
                              {p.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="xs"
                              rounded="lg"
                              fontWeight="700"
                              variant="outline"
                              colorScheme="red"
                              onClick={() => deletePolicy(p._id)}
                              isLoading={deletingId === p._id}
                            >
                              Delete
                            </Button>
                          </HStack>
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  )
}