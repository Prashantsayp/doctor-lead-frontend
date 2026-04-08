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
  Flex,
  Tooltip,
  Stack,
} from '@chakra-ui/react'
import { jwtDecode } from 'jwt-decode'
import { SearchIcon, ChevronDownIcon, DownloadIcon } from '@chakra-ui/icons'

/* ================= Types ================= */

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'
type RiskFilter = 'all' | 'low' | 'medium' | 'high'
type ProfessionFilter =
  | 'all'
  | 'DOCTOR'
  | 'CA'
  | 'LAWYER'
  | 'SALARIED'
  | 'BUSINESSMAN'
  | 'COMPANY_SECRETARY'
  | 'COST_ACCOUNTANT'
  | 'REALTOR'
  | 'BROKER'
  | 'CHANNEL_PARTNER'

type LoanStatus = 'NEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED'

type DoctorLeadRow = {
  _id: string
  profession?:
    | 'DOCTOR'
    | 'LAWYER'
    | 'CA'
    | 'SALARIED'
    | 'BUSINESSMAN'
    | 'COMPANY_SECRETARY'
    | 'COST_ACCOUNTANT'
    | 'REALTOR'
    | 'BROKER'
    | 'CHANNEL_PARTNER'
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
  loanStatus?: LoanStatus
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

const formatProfession = (profession?: string) => {
  if (!profession) return '—'
  const map: Record<string, string> = {
    DOCTOR: 'Doctor',
    CA: 'CA',
    LAWYER: 'Lawyer',
    SALARIED: 'Salaried',
    BUSINESSMAN: 'Businessman',
    COMPANY_SECRETARY: 'Company Secretary',
    COST_ACCOUNTANT: 'Cost Accountant',
    REALTOR: 'Realtor',
    BROKER: 'Broker',
    CHANNEL_PARTNER: 'Channel Partner',
  }
  return map[profession] || profession
}

const loanStatusColor = (status?: string) => {
  if (status === 'APPROVED') return 'green'
  if (status === 'REJECTED') return 'red'
  if (status === 'DISBURSED') return 'purple'
  return 'gray'
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
  const [profession, setProfession] = React.useState<ProfessionFilter>('all')

  const [exporting, setExporting] = React.useState(false)
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)
  

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
  }, [city, risk, profession])

  const API = process.env.NEXT_PUBLIC_API_URL

  const updateRowStatus = (id: string, loanStatus: LoanStatus) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, loanStatus } : r)))
  }

  // const handleApprove = async (id: string) => {
  //   const token = getToken()
  //   const prev = rows.find((r) => r._id === id)?.loanStatus
  //   updateRowStatus(id, 'APPROVED')
  //   setActionLoadingId(id)
  //   try {
  //     const res = await fetch(`${API}/doctor-lead/approve/${id}`, {
  //       method: 'PATCH',
  //       headers: { Authorization: `Bearer ${token}` },
  //     })
  //     if (!res.ok) throw new Error('Failed')
  //     toast({ title: 'Lead Approved', status: 'success' })
  //   } catch {
  //     if (prev !== undefined) updateRowStatus(id, prev)
  //     toast({ title: 'Approve failed', status: 'error' })
  //   } finally {
  //     setActionLoadingId(null)
  //   }
  // }

  // const handleReject = async (id: string) => {
  //   const token = getToken()
  //   const prev = rows.find((r) => r._id === id)?.loanStatus
  //   updateRowStatus(id, 'REJECTED')
  //   setActionLoadingId(id)
  //   try {
  //     const res = await fetch(`${API}/doctor-lead/reject/${id}`, {
  //       method: 'PATCH',
  //       headers: { Authorization: `Bearer ${token}` },
  //     })
  //     if (!res.ok) throw new Error('Failed')
  //     toast({ title: 'Lead Rejected', status: 'warning' })
  //   } catch {
  //     if (prev !== undefined) updateRowStatus(id, prev)
  //     toast({ title: 'Reject failed', status: 'error' })
  //   } finally {
  //     setActionLoadingId(null)
  //   }
  // }

  // const handleDisburse = async (id: string) => {
  //   const token = getToken()
  //   const prev = rows.find((r) => r._id === id)?.loanStatus
  //   updateRowStatus(id, 'DISBURSED')
  //   setActionLoadingId(id)
  //   try {
  //     const res = await fetch(`${API}/doctor-lead/disburse/${id}`, {
  //       method: 'PATCH',
  //       headers: { Authorization: `Bearer ${token}` },
  //     })
  //     if (!res.ok) throw new Error('Failed')
  //     toast({ title: 'Amount Disbursed', status: 'success' })
  //   } catch {
  //     if (prev !== undefined) updateRowStatus(id, prev)
  //     toast({ title: 'Disburse failed', status: 'error' })
  //   } finally {
  //     setActionLoadingId(null)
  //   }
  // }


  const handleStatusChange = async (id: string, status: LoanStatus) => {
  const token = getToken()
  const prev = rows.find((r) => r._id === id)?.loanStatus

  updateRowStatus(id, status)
  setActionLoadingId(id)

  try {
    const res = await fetch(`${API}/doctor-lead/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })

    if (!res.ok) throw new Error('Failed')

    toast({
      title: `Status changed to ${status}`,
      status: 'success',
    })
  } catch {
    if (prev !== undefined) updateRowStatus(id, prev)
    toast({ title: 'Status update failed', status: 'error' })
  } finally {
    setActionLoadingId(null)
  }
}

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
const canApprove = (status?: LoanStatus) => status === 'NEW'
const canReject = (status?: LoanStatus) => status === 'REJECTED'
const canDisburse = (status?: LoanStatus) => status === 'APPROVED'

  const [loanStatus, setLoanStatus] = React.useState<'all' | 'APPROVED' | 'REJECTED' | 'DISBURSED'>('all')

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

      const professionOk =
        profession === 'all' || String(d.profession || '').toUpperCase() === profession

      const statusOk =
      loanStatus === 'all' || String(d.loanStatus || 'PENDING') === loanStatus

      return cityOk && riskOk && professionOk && statusOk
    })
  },
  [city, risk, profession, loanStatus, calcProfileCompletion, getRiskBucket]
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

      if (profession !== 'all') url.searchParams.set('profession', profession)
      else url.searchParams.delete('profession')

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

      const items = normalizeItems(data).map((d: any) => ({
  ...d,
  loanStatus: d.status || 'PENDING', // IMPORTANT
}))

const filteredItems = applyClientFilters(items)

setRows(items)

      setTotalDoctors(data.total)

      const tp = pickNumber(data?.totalPages, data?.data?.totalPages, data?.pagination?.totalPages)
      setTotalPages(tp && tp > 0 ? tp : 1)
    } catch {
      setErr('Server error')
      setRows([])
      setTotalPages(1)
      setTotalDoctors(0)
    } finally {
      setLoading(false)
    }
  }, [router, page, limit, debouncedQ, profession, applyClientFilters])

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
      if (profession !== 'all') url.searchParams.set('profession', profession)

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

      const items = normalizeItems(data).map((d: any) => ({
      ...d,
      loanStatus: d.status, // IMPORTANT LINE
    }))

      const tp = pickNumber(data?.totalPages, data?.data?.totalPages, data?.pagination?.totalPages)
      pages = tp && tp > 0 ? tp : 1
      currentPage += 1
    } while (currentPage <= pages)

    return applyClientFilters(allItems)
  }, [debouncedQ, profession, applyClientFilters])

  const canPrev = page > 1
  const canNext = page < totalPages

  const exportAllCSV = async () => {
    try {
      setExporting(true)
      const data = await fetchAllDoctorsForExport()

      if (!data.length) {
        toast({ title: 'No data found', description: 'There is no data to export for current filters.', status: 'info' })
        return
      }

      const header = [
        'Profession',
        'Name',
        'Mobile',
        'City/Pin',
        'CIBIL',
        'Completion%',
        'Risk',
        'LoanStatus',
        'DoctorId',
      ]

      const lines = [
        header.join(','),
        ...data.map((d) => {
          const completion = calcProfileCompletion(d)
          const bucket = getRiskBucket(completion)
          return [
            csvEscape(d.profession ?? ''),
            csvEscape(d.fullName),
            csvEscape(d.mobileNumber),
            csvEscape(d.cityOrPinCode ?? ''),
            csvEscape(d.cibilScore ?? ''),
            csvEscape(completion),
            csvEscape(bucket),
            csvEscape(d.loanStatus ?? 'PENDING'),
            csvEscape(d._id),
          ].join(',')
        }),
      ].join('\n')

      downloadTextFile('doctors_full_export.csv', lines, 'text/csv')
      toast({ title: 'CSV exported', description: `${data.length} records downloaded successfully.`, status: 'success' })
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message || 'Unable to export CSV', status: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const exportAllJSON = async () => {
    try {
      setExporting(true)
      const data = await fetchAllDoctorsForExport()

      if (!data.length) {
        toast({ title: 'No data found', description: 'There is no data to export for current filters.', status: 'info' })
        return
      }

      const payload = {
        search: debouncedQ,
        filters: { city, risk, profession },
        total: data.length,
        items: data,
      }

      downloadTextFile('doctors_full_export.json', JSON.stringify(payload, null, 2), 'application/json')
      toast({ title: 'JSON exported', description: `${data.length} records downloaded successfully.`, status: 'success' })
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message || 'Unable to export JSON', status: 'error' })
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
      if (profession !== 'all') url.searchParams.set('profession', profession)
      await navigator.clipboard.writeText(url.toString())
      toast({ title: 'Link copied', status: 'success' })
    } catch {
      toast({ title: 'Copy failed', status: 'error' })
    }
  }

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 5, md: 1 }}>
      <Container maxW="container.2xl">
        {/* ── Header Card ── */}
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
                    All Professionals
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

            <Tooltip label="Total leads in system" hasArrow>
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

          <Divider my={2} borderColor="gray.100" />

          {/* ── Filters ── */}
          <Stack spacing={3}>
  {/* Search */}
  <Box position="relative">
    <Input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="Search by Name/Mobile"
      borderRadius="xl"
      pl="42px"
      bg="gray.50"
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

  {/* Filters Row */}
  <HStack spacing={3} flexWrap="wrap">
    <Select
      value={risk}
      onChange={(e) => setRisk(e.target.value as RiskFilter)}
      w="150px"
      borderRadius="xl"
      bg="gray.50"
    >
      <option value="all">All Risk</option>
      <option value="low">Low Risk</option>
      <option value="medium">Medium Risk</option>
      <option value="high">High Risk</option>
    </Select>

    <Select
      value={profession}
      onChange={(e) => setProfession(e.target.value as ProfessionFilter)}
      w="170px"
      borderRadius="xl"
      bg="gray.50"
    >
      <option value="all">All Profession</option>
      <option value="DOCTOR">Doctor</option>
      <option value="CA">CA</option>
      <option value="LAWYER">Lawyer</option>
      <option value="SALARIED">Salaried</option>
      <option value="BUSINESSMAN">Businessman</option>
      <option value="COMPANY_SECRETARY">Company Secretary</option>
      <option value="COST_ACCOUNTANT">Cost Accountant</option>
      <option value="REALTOR">Realtor</option>
      <option value="BROKER">Broker</option>
      <option value="CHANNEL_PARTNER">Channel Partner</option>
    </Select>

    <Select
      value={loanStatus}
      onChange={(e) => setLoanStatus(e.target.value as any)}
      w="170px"
      borderRadius="xl"
      bg="gray.50"
    >
      <option value="all">All Status</option>
      <option value="APPROVED">Approved</option>
      <option value="REJECTED">Rejected</option>
      <option value="DISBURSED">Disbursed</option>
    </Select>

    <Input
      value={city}
      onChange={(e) => setCity(e.target.value)}
      placeholder="City / Pincode"
      w="180px"
      borderRadius="xl"
      bg="gray.50"
    />
  </HStack>
</Stack>
        </Box>

        <Flex mt={4} align="center" justify="space-between" flexWrap="wrap" gap={1}>
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

          <HStack spacing={3} align="center">
            <Text color="gray.600" whiteSpace="nowrap">
              No of records:
            </Text>
            <Select
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              w="90px"
              size="sm"
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
                <Text>Loading records...</Text>
              </HStack>
            ) : err ? (
              <Box py={10} textAlign="center">
                <Text color="red.500" fontWeight="700">
                  {err}
                </Text>
              </Box>
            ) : filtered.length === 0 ? (
              <Box py={10} textAlign="center">
                <Text color="gray.500">No records found.</Text>
              </Box>
            ) : (
              <TableContainer borderRadius="md" border="1px solid" borderColor="gray.100">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Profession</Th>
                      <Th>Name</Th>
                      <Th>Mobile</Th>
                      <Th>City/Pincode</Th>
                      <Th>CIBIL</Th>
                      <Th>Completion</Th>
                      <Th>Risk</Th>
                      <Th>Loan Status</Th>
                      <Th textAlign="center">View</Th>
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
                          <Td>
                            <Badge borderRadius="full" px={2.5} py={0.5} colorScheme="purple" variant="subtle">
                              {formatProfession(d.profession)}
                            </Badge>
                          </Td>

                          <Td fontWeight="800" color="gray.800">
                            {d.fullName || '—'}
                          </Td>
                          <Td>{d.mobileNumber || '—'}</Td>
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

                          <Td>
                            <Badge
                              borderRadius="full"
                              px={2.5}
                              py={0.5}
                              colorScheme={loanStatusColor(d.loanStatus)}
                            >
                              {d.loanStatus === 'NEW' ? 'PENDING' : d.loanStatus}
                            </Badge>
                          </Td>

                          <Td textAlign="center">
                            <IconButton
                              aria-label="View"
                              icon={<Text fontSize="16px">👁</Text>}
                              size="xs"
                              variant="ghost"
                              borderRadius="full"
                              onClick={() => router.push(`/profession/${d._id}`)}
                            />
                          </Td>

                        <Td textAlign="right">
  <Menu>
    <MenuButton
      as={Button}
      size="xs"
      rightIcon={actionLoadingId === d._id ? <Spinner size="xs" /> : <ChevronDownIcon />}
      colorScheme="blue"
      variant="outline"
      borderRadius="full"
      isDisabled={actionLoadingId === d._id}
    >
      Action
    </MenuButton>

    <MenuList>
      <MenuItem color="green.600" onClick={() => handleStatusChange(d._id, 'APPROVED')}>
  ✔ Approve
</MenuItem>

<MenuItem color="red.500" onClick={() => handleStatusChange(d._id, 'REJECTED')}>
  ✖ Reject
</MenuItem>

<MenuItem color="purple.600" onClick={() => handleStatusChange(d._id, 'DISBURSED')}>
  ₹ Disburse
</MenuItem>
</MenuList>
  </Menu>
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