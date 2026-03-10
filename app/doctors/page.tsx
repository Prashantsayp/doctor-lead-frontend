'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  SimpleGrid,
  FormControl,
  FormLabel,
  Flex,
  Tooltip,
} from '@chakra-ui/react'
import { jwtDecode } from 'jwt-decode'
import { SearchIcon, ChevronDownIcon, DownloadIcon } from '@chakra-ui/icons'

/* ================= Types ================= */

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'
type RiskFilter = 'all' | 'low' | 'medium' | 'high'

type DoctorLeadRow = {
  _id: string
  fullName: string
  registrationNumber?: string
  mobileNumber: string
  email?: string
  cityOrPinCode?: string | number
  yearsOfPractice?: number
  qualification?: string[]
  practiceType?: string[]
  consent?: boolean
  createdAt?: string
  remarks?: string
  monthlyGrossIncome?: number
  monthlyNetIncome?: number
  otherIncomeSources?: number
  monthlyEmi?: number
  activeLoans?: number
  loanType?: string[]
  hasOverdue?: boolean
  cibilScore?: number | null
  hasProperty?: boolean
  propertyValue?: number
  medicalEquipmentValue?: number
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

const safeNumber = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const pickNumber = (...vals: any[]) => {
  for (const v of vals) {
    const n = safeNumber(v)
    if (n !== null) return n
  }
  return null
}

const normalizeItems = (data: any): DoctorLeadRow[] => {
  if (Array.isArray(data)) return data as DoctorLeadRow[]
  const candidates = [data?.items, data?.data, data?.doctors, data?.docs, data?.results, data?.payload]
  for (const c of candidates) {
    if (Array.isArray(c)) return c as DoctorLeadRow[]
  }
  if (Array.isArray(data?.data?.items)) return data.data.items as DoctorLeadRow[]
  if (Array.isArray(data?.data?.docs)) return data.data.docs as DoctorLeadRow[]
  if (Array.isArray(data?.data?.results)) return data.data.results as DoctorLeadRow[]
  return []
}

const csvEscape = (v: any) => {
  const s = String(v ?? '')
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const downloadTextFile = (filename: string, text: string, mime: string) => {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleString('en-IN')
  } catch {
    return iso
  }
}

const normalizeText = (v: any) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const matchCityOrPin = (cityOrPinValue: any, userQuery: string) => {
  const q = normalizeText(userQuery)
  if (!q) return true

  const raw = normalizeText(cityOrPinValue)
  if (!raw) return false

  if (/^\d+$/.test(q)) {
    const rawDigits = raw.replace(/\D/g, '')
    return rawDigits.includes(q)
  }

  return raw.includes(q)
}

export default function AdminDoctorsPage() {
  const router = useRouter()
  const toast = useToast()

  const [role, setRole] = React.useState<AppRole | null>(null)
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<DoctorLeadRow[]>([])
  const [err, setErr] = React.useState<string | null>(null)

  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(100)

  const [totalDoctors, setTotalDoctors] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)

  const [q, setQ] = React.useState('')
  const [debouncedQ, setDebouncedQ] = React.useState(q)

  const [city, setCity] = React.useState('')
  const [risk, setRisk] = React.useState<RiskFilter>('all')

  const [exporting, setExporting] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => {
    setRole(getRoleFromToken())
  }, [])

  React.useEffect(() => {
    if (role === null) return
    if (!isAdmin) {
      toast({
        title: 'Access denied',
        description: 'Only ADMIN / SUPER_ADMIN can view all doctors.',
        status: 'warning',
      })
      router.replace('/')
    }
  }, [role, isAdmin, router, toast])

  React.useEffect(() => {
    setPage(1)
  }, [debouncedQ, limit])

  React.useEffect(() => {
    setPage(1)
  }, [city, risk])

  const calcProfileCompletion = React.useCallback((d: DoctorLeadRow) => {
    const fields = [
      !!d.fullName,
      !!d.mobileNumber,
      !!d.email,
      !!d.registrationNumber,
      d.cityOrPinCode !== undefined && d.cityOrPinCode !== null && String(d.cityOrPinCode).trim() !== '',
      d.yearsOfPractice !== undefined && d.yearsOfPractice !== null,
      Array.isArray(d.qualification) && d.qualification.length > 0,
      Array.isArray(d.practiceType) && d.practiceType.length > 0,
      !!d.consent,
      d.monthlyNetIncome !== undefined || d.monthlyGrossIncome !== undefined,
      d.monthlyEmi !== undefined,
      d.cibilScore !== undefined && d.cibilScore !== null,
    ]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }, [])

  const getRiskBucket = React.useCallback(
    (completion: number) => (completion >= 70 ? 'Low' : completion >= 40 ? 'Medium' : 'High'),
    []
  )

  const riskColor = (bucket: 'Low' | 'Medium' | 'High') =>
    bucket === 'Low' ? 'green' : bucket === 'Medium' ? 'yellow' : 'red'

  const applyClientFilters = React.useCallback(
    (items: DoctorLeadRow[]) => {
      return items.filter((d) => {
        const cityOk = matchCityOrPin(d.cityOrPinCode, city)

        const completion = calcProfileCompletion(d)
        const bucket = getRiskBucket(completion)

        const riskOk =
          risk === 'all' ||
          (risk === 'low' && bucket === 'Low') ||
          (risk === 'medium' && bucket === 'Medium') ||
          (risk === 'high' && bucket === 'High')

        return cityOk && riskOk
      })
    },
    [city, risk, calcProfileCompletion, getRiskBucket]
  )

  const filtered = React.useMemo(() => applyClientFilters(rows), [rows, applyClientFilters])

  const fetchAll = React.useCallback(async () => {
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
      const base = process.env.NEXT_PUBLIC_API_URL
      if (!base) {
        setErr('NEXT_PUBLIC_API_URL is missing')
        setRows([])
        setTotalPages(1)
        setTotalDoctors(0)
        return
      }

      const url = new URL(`${base}/doctor-lead/get-lead`)
      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', String(limit))

      const s = debouncedQ?.trim()
      if (s) url.searchParams.set('search', s)
      else url.searchParams.delete('search')

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErr(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to fetch doctors')
        setRows([])
        setTotalPages(1)
        setTotalDoctors(0)
        return
      }

      const items = normalizeItems(data)
      setRows(items)

      const tp = pickNumber(data?.totalPages, data?.data?.totalPages, data?.pagination?.totalPages)
      const tc = pickNumber(data?.total, data?.count, data?.totalCount, data?.data?.total, data?.pagination?.total)

      setTotalPages(tp && tp > 0 ? tp : 1)
      setTotalDoctors(tc !== null ? tc : items.length)
    } catch {
      setErr('Server error')
      setRows([])
      setTotalPages(1)
      setTotalDoctors(0)
    } finally {
      setLoading(false)
    }
  }, [router, page, limit, debouncedQ])

  React.useEffect(() => {
    if (!isAdmin) return
    fetchAll()
  }, [isAdmin, fetchAll])

  const fetchAllDoctorsForExport = React.useCallback(async () => {
    const token = getToken()
    if (!token) throw new Error('Please login first')

    const base = process.env.NEXT_PUBLIC_API_URL
    if (!base) throw new Error('NEXT_PUBLIC_API_URL is missing')

    const allItems: DoctorLeadRow[] = []
    let currentPage = 1
    const exportLimit = 1000
    let pages = 1

    do {
      const url = new URL(`${base}/doctor-lead/get-lead`)
      url.searchParams.set('page', String(currentPage))
      url.searchParams.set('limit', String(exportLimit))

      const s = debouncedQ?.trim()
      if (s) url.searchParams.set('search', s)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(
          Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to fetch export data'
        )
      }

      const items = normalizeItems(data)
      allItems.push(...items)

      const tp = pickNumber(data?.totalPages, data?.data?.totalPages, data?.pagination?.totalPages)
      pages = tp && tp > 0 ? tp : 1
      currentPage += 1
    } while (currentPage <= pages)

    return applyClientFilters(allItems)
  }, [debouncedQ, applyClientFilters])

  const canPrev = page > 1
  const canNext = page < totalPages

  const exportAllCSV = async () => {
    try {
      setExporting(true)

      const data = await fetchAllDoctorsForExport()

      if (!data.length) {
        toast({
          title: 'No data found',
          description: 'There is no data to export for current filters.',
          status: 'info',
        })
        return
      }

      const header = ['Name', 'Mobile', 'Email', 'RegNo', 'CityOrPin', 'CIBIL', 'Completion%', 'Risk', 'CreatedAt', 'DoctorId']

      const lines = [
        header.join(','),
        ...data.map((d) => {
          const completion = calcProfileCompletion(d)
          const bucket = getRiskBucket(completion)

          return [
            csvEscape(d.fullName),
            csvEscape(d.mobileNumber),
            csvEscape(d.email ?? ''),
            csvEscape(d.registrationNumber ?? ''),
            csvEscape(d.cityOrPinCode ?? ''),
            csvEscape(d.cibilScore ?? ''),
            csvEscape(completion),
            csvEscape(bucket),
            csvEscape(d.createdAt ?? ''),
            csvEscape(d._id),
          ].join(',')
        }),
      ].join('\n')

      downloadTextFile('doctors_full_export.csv', lines, 'text/csv')

      toast({
        title: 'CSV exported',
        description: `${data.length} records downloaded successfully.`,
        status: 'success',
      })
    } catch (e: any) {
      toast({
        title: 'Export failed',
        description: e?.message || 'Unable to export CSV',
        status: 'error',
      })
    } finally {
      setExporting(false)
    }
  }

  const exportAllJSON = async () => {
    try {
      setExporting(true)

      const data = await fetchAllDoctorsForExport()

      if (!data.length) {
        toast({
          title: 'No data found',
          description: 'There is no data to export for current filters.',
          status: 'info',
        })
        return
      }

      const payload = {
        search: debouncedQ,
        filters: { city, risk },
        total: data.length,
        items: data,
      }

      downloadTextFile('doctors_full_export.json', JSON.stringify(payload, null, 2), 'application/json')

      toast({
        title: 'JSON exported',
        description: `${data.length} records downloaded successfully.`,
        status: 'success',
      })
    } catch (e: any) {
      toast({
        title: 'Export failed',
        description: e?.message || 'Unable to export JSON',
        status: 'error',
      })
    } finally {
      setExporting(false)
    }
  }

  const copyCurrentQueryLink = async () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', String(limit))
      if (debouncedQ.trim()) url.searchParams.set('search', debouncedQ.trim())
      if (city.trim()) url.searchParams.set('city', city.trim())
      if (risk !== 'all') url.searchParams.set('risk', risk)
      await navigator.clipboard.writeText(url.toString())
      toast({ title: 'Link copied', status: 'success' })
    } catch {
      toast({ title: 'Copy failed', status: 'error' })
    }
  }

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 5, md: 8 }}>
      <Container maxW="container.2xl">
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p={{ base: 4, md: 5 }}>
          <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
            <Box>
              <HStack spacing={3} align="center" flexWrap="wrap">
                <Box
                  w="40px"
                  h="40px"
                  borderRadius="xl"
                  bgGradient="linear(to-br, blue.600, purple.600)"
                  boxShadow="0 10px 24px rgba(99,102,241,0.22)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize="18px"
                  fontWeight="900"
                >
                  DR
                </Box>

                <Box>
                  <Heading size="md" lineHeight="1.1">
                    All Doctors
                  </Heading>
                  <HStack spacing={2} mt={1} flexWrap="wrap">
                    <Badge borderRadius="full" px={2.5} py={0.5} bg="blue.50" color="blue.700">
                      Search
                    </Badge>
                    <Badge borderRadius="full" px={2.5} py={0.5} bg="purple.50" color="purple.700">
                      Filters
                    </Badge>
                    <Badge borderRadius="full" px={2.5} py={0.5} bg="green.50" color="green.700">
                      Quick Open
                    </Badge>
                  </HStack>
                </Box>
              </HStack>
            </Box>

            <Tooltip label="Total doctor leads in system" hasArrow>
              <Badge
                borderRadius="full"
                px={5}
                py={2.5}
                color="white"
                bgGradient="linear(to-r, blue.600, purple.600)"
                boxShadow="0 10px 26px rgba(59,130,246,0.22)"
                letterSpacing="0.2px"
              >
                Total: {totalDoctors}
              </Badge>
            </Tooltip>
          </HStack>

          <Divider my={4} borderColor="gray.100" />

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} alignItems="end">
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">
                Search
              </FormLabel>
              <Box position="relative">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by Name / Mobile"
                  borderRadius="md"
                  pl="42px"
                />
                <IconButton
                  aria-label="search"
                  icon={<SearchIcon />}
                  size="sm"
                  variant="ghost"
                  position="absolute"
                  left="8px"
                  top="50%"
                  transform="translateY(-50%)"
                  pointerEvents="none"
                />
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">
                City / Pincode
              </FormLabel>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Noida / 201301"
                borderRadius="md"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">
                Risk
              </FormLabel>
              <Select value={risk} onChange={(e) => setRisk(e.target.value as RiskFilter)} borderRadius="md">
                <option value="all">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        </Box>

        <Flex mt={4} align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Menu>
            <MenuButton
              as={Button}
              leftIcon={exporting ? <Spinner size="sm" /> : <DownloadIcon />}
              rightIcon={<ChevronDownIcon />}
              colorScheme="green"
              borderRadius="md"
              isLoading={exporting}
              loadingText="Exporting"
            >
              Export
            </MenuButton>
            <MenuList>
              <MenuItem onClick={exportAllCSV}>Export full data (CSV)</MenuItem>
              <MenuItem onClick={exportAllJSON}>Export full data (JSON)</MenuItem>
              <MenuItem onClick={copyCurrentQueryLink}>Copy current filter link</MenuItem>
            </MenuList>
          </Menu>

          <HStack spacing={3}>
            <Text color="gray.600">No of records:</Text>
            <Select
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              maxW="120px"
              bg="white"
              borderColor="gray.200"
              borderRadius="md"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </HStack>
        </Flex>

        <Box mt={4} bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" overflow="hidden">
          <Box p={{ base: 4, md: 5 }}>
            {loading ? (
              <HStack py={10} justify="center">
                <Spinner />
                <Text>Loading doctors...</Text>
              </HStack>
            ) : err ? (
              <Box py={10} textAlign="center">
                <Text color="red.500" fontWeight="700">
                  {err}
                </Text>
              </Box>
            ) : filtered.length === 0 ? (
              <Box py={10} textAlign="center">
                <Text color="gray.500">No doctors found.</Text>
              </Box>
            ) : (
              <TableContainer borderRadius="md" border="1px solid" borderColor="gray.100">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Name</Th>
                      <Th>Mobile</Th>
                      <Th>Email</Th>
                      <Th>Reg No</Th>
                      <Th>City/Pincode</Th>
                      <Th>CIBIL</Th>
                      <Th>Completion</Th>
                      <Th>Risk</Th>
                      <Th>Created</Th>
                      <Th textAlign="right">Action</Th>
                    </Tr>
                  </Thead>

                  <Tbody>
                    {filtered.map((d) => {
                      const completion = calcProfileCompletion(d)
                      const bucket = getRiskBucket(completion)
                      const color = riskColor(bucket)

                      return (
                        <Tr key={d._id} _hover={{ bg: 'gray.50' }} transition="background 0.15s ease">
                          <Td fontWeight="800" color="gray.800">
                            {d.fullName || '—'}
                          </Td>
                          <Td>{d.mobileNumber || '—'}</Td>
                          <Td>{d.email || '—'}</Td>
                          <Td>{d.registrationNumber || '—'}</Td>
                          <Td>{d.cityOrPinCode ?? '—'}</Td>
                          <Td>{d.cibilScore ?? '—'}</Td>

                          <Td>
                            <Badge
                              borderRadius="full"
                              px={2.5}
                              py={0.5}
                              colorScheme={completion >= 70 ? 'green' : completion >= 40 ? 'yellow' : 'red'}
                            >
                              {completion}%
                            </Badge>
                          </Td>

                          <Td>
                            <Badge borderRadius="full" px={2.5} py={0.5} colorScheme={color}>
                              {bucket}
                            </Badge>
                          </Td>

                          <Td fontSize="xs" color="gray.600">
                            {fmtDate(d.createdAt)}
                          </Td>

                          <Td textAlign="right">
                            <Button
                              size="xs"
                              colorScheme="blue"
                              variant="outline"
                              borderRadius="full"
                              px={4}
                              onClick={() => router.push(`/doctor/${d._id}`)}
                            >
                              Open
                            </Button>
                          </Td>
                        </Tr>
                      )
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}

            {!loading && !err && filtered.length > 0 ? (
              <>
                <Divider my={5} borderColor="gray.100" />
                <HStack justify="space-between" flexWrap="wrap" gap={3}>
                  <Text fontSize="sm" color="gray.600">
                    Page <b>{page}</b> / {totalPages}
                  </Text>

                  <HStack spacing={3}>
                    <Button
                      size="sm"
                      variant="outline"
                      borderRadius="md"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      isDisabled={!canPrev}
                    >
                      Prev
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      borderRadius="md"
                      onClick={() => setPage((p) => p + 1)}
                      isDisabled={!canNext}
                    >
                      Next
                    </Button>
                  </HStack>
                </HStack>
              </>
            ) : null}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}