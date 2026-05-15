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
  InputGroup,
  InputLeftElement,
  Avatar,
  AvatarBadge,
  Tag,
  TagLabel,
  Progress,
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

type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED'

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
  isFromOms?: boolean
  source?: 'OMS' | 'DB'
}

/* ================= Helpers ================= */

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
    COMPANY_SECRETARY: 'Co. Secretary',
    COST_ACCOUNTANT: 'Cost Accountant',
    REALTOR: 'Realtor',
    BROKER: 'Broker',
    CHANNEL_PARTNER: 'Channel Partner',
  }
  return map[profession] || profession
}

const professionIcon: Record<string, string> = {
  DOCTOR: '🩺',
  CA: '📊',
  LAWYER: '⚖️',
  SALARIED: '💼',
  BUSINESSMAN: '🏢',
  COMPANY_SECRETARY: '📋',
  COST_ACCOUNTANT: '🧮',
  REALTOR: '🏠',
  BROKER: '🤝',
  CHANNEL_PARTNER: '🔗',
}

const loanStatusConfig = (status?: string) => {
  if (status === 'APPROVED') return { color: 'green', bg: '#dcfce7', text: '#16a34a', dot: '#22c55e', label: 'Approved' }
  if (status === 'REJECTED') return { color: 'red', bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', label: 'Rejected' }
  if (status === 'DISBURSED') return { color: 'purple', bg: '#f3e8ff', text: '#9333ea', dot: '#a855f7', label: 'Disbursed' }
  return { color: 'gray', bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', label: 'Pending' }
}

/* ================= Stat Card ================= */
const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Box
    flex="1"
    minW="120px"
    bg="white"
    border="1px solid"
    borderColor="gray.100"
    borderRadius="16px"
    px={5}
    py={4}
    boxShadow="0 1px 3px rgba(0,0,0,0.04)"
    position="relative"
    overflow="hidden"
    _before={{
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: color,
      borderRadius: '16px 16px 0 0',
    }}
  >
    <Text fontSize="22px" fontWeight="800" color="gray.800" lineHeight="1">{value}</Text>
    <Text fontSize="11px" fontWeight="600" color="gray.400" mt={1} textTransform="uppercase" letterSpacing="0.8px">{label}</Text>
  </Box>
)

/* ================= Main Page ================= */
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
  const [loanStatus, setLoanStatus] = React.useState<'all' | 'APPROVED' | 'REJECTED' | 'DISBURSED'>('all')

  const [exporting, setExporting] = React.useState(false)
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => { setRole(getRoleFromToken()) }, [])

  React.useEffect(() => {
    if (role === null) return
    if (!isAdmin) {
      toast({ title: 'Access denied', description: 'Only ADMIN / SUPER_ADMIN can view all doctors.', status: 'warning' })
      router.replace('/')
    }
  }, [role, isAdmin, router, toast])

  React.useEffect(() => { setPage(1) }, [debouncedQ, limit])
  React.useEffect(() => { setPage(1) }, [city, risk, profession])

  const API = process.env.NEXT_PUBLIC_API_URL

  const updateRowStatus = (id: string, loanStatus: LoanStatus) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, loanStatus } : r)))
  }

  const handleStatusChange = async (id: string, status: LoanStatus) => {
    const token = getToken()
    const prev = rows.find((r) => r._id === id)?.loanStatus
    updateRowStatus(id, status)
    setActionLoadingId(id)
    try {
      const res = await fetch(`${API}/doctor-lead/update/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Status changed to ${status}`, status: 'success' })
    } catch {
      if (prev !== undefined) updateRowStatus(id, prev)
      toast({ title: 'Status update failed', status: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const calcProfileCompletion = React.useCallback((d: DoctorLeadRow) => {
    const fields = [
      !!d.fullName, !!d.mobileNumber, !!d.email, !!d.registrationNumber,
      d.cityOrPinCode !== undefined && d.cityOrPinCode !== null && String(d.cityOrPinCode).trim() !== '',
      d.yearsOfPractice !== undefined && d.yearsOfPractice !== null,
      Array.isArray(d.qualification) && d.qualification.length > 0,
      Array.isArray(d.practiceType) && d.practiceType.length > 0,
      !!d.consent,
      d.monthlyNetIncome !== undefined || d.monthlyGrossIncome !== undefined,
      d.monthlyEmi !== undefined,
      d.cibilScore !== undefined && d.cibilScore !== null,
    ]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [])

  const getRiskBucket = React.useCallback(
    (completion: number) => (completion >= 70 ? 'Low' : completion >= 40 ? 'Medium' : 'High'),
    []
  )

  const canApprove = (status?: LoanStatus) => status === 'PENDING'
  const canReject = (status?: LoanStatus) => status === 'PENDING'
  const canDisburse = (status?: LoanStatus) => status === 'APPROVED'

  const riskConfig = (bucket: 'Low' | 'Medium' | 'High') =>
    bucket === 'Low'
      ? { color: '#16a34a', bg: '#dcfce7', bar: 'green.400' }
      : bucket === 'Medium'
      ? { color: '#d97706', bg: '#fef9c3', bar: 'yellow.400' }
      : { color: '#dc2626', bg: '#fee2e2', bar: 'red.400' }

  const applyClientFilters = React.useCallback(
    (items: DoctorLeadRow[]) => {
      return items.filter((d) => {
        const cityOk = matchCityOrPin(d.cityOrPinCode, city)
        const completion = calcProfileCompletion(d)
        const bucket = getRiskBucket(completion)
        const riskOk = risk === 'all' || (risk === 'low' && bucket === 'Low') || (risk === 'medium' && bucket === 'Medium') || (risk === 'high' && bucket === 'High')
        const professionOk = profession === 'all' || String(d.profession || '').toUpperCase() === profession
        const statusOk = loanStatus === 'all' || String(d.loanStatus || 'PENDING') === loanStatus
        return cityOk && riskOk && professionOk && statusOk
      })
    },
    [city, risk, profession, loanStatus, calcProfileCompletion, getRiskBucket]
  )

  const filtered = React.useMemo(() => applyClientFilters(rows), [rows, applyClientFilters])

  // Quick stats
  const stats = React.useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter(d => d.loanStatus === 'APPROVED').length,
    pending: filtered.filter(d => !d.loanStatus || d.loanStatus === 'PENDING').length,
    disbursed: filtered.filter(d => d.loanStatus === 'DISBURSED').length,
  }), [filtered])

  const fetchAll = React.useCallback(async () => {
    const token = getToken()
    if (!token) { setLoading(false); setErr('Please login first'); router.push('/login'); return }
    setLoading(true); setErr(null)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL
      if (!base) { setErr('NEXT_PUBLIC_API_URL is missing'); setRows([]); setTotalPages(1); setTotalDoctors(0); return }
      const url = new URL(`${base}/doctor-lead/get-lead`)
      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', String(limit))
      const s = debouncedQ?.trim()
      if (s) url.searchParams.set('search', s)
      else url.searchParams.delete('search')
      if (profession !== 'all') url.searchParams.set('profession', profession)
      else url.searchParams.delete('profession')
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to fetch'); setRows([]); setTotalPages(1); setTotalDoctors(0); return }
      const items = normalizeItems(data).map((d: any) => ({ ...d, loanStatus: d.status, source: d.isFromOms ? 'OMS' : 'DB' }))
      setRows(items)
      setTotalDoctors(data.total)
      const tp = pickNumber(data?.totalPages, data?.data?.totalPages, data?.pagination?.totalPages)
      setTotalPages(tp && tp > 0 ? tp : 1)
    } catch { setErr('Server error'); setRows([]); setTotalPages(1); setTotalDoctors(0) }
    finally { setLoading(false) }
  }, [router, page, limit, debouncedQ, profession])

  React.useEffect(() => { if (!isAdmin) return; fetchAll() }, [isAdmin, fetchAll])

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
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed')
      const items = normalizeItems(data).map((d: any) => ({ ...d, loanStatus: d.status, source: d.isFromOms ? 'OMS' : 'DB' }))
      allItems.push(...items)
      const tp = pickNumber(data?.totalPages, data?.data?.totalPages, data?.pagination?.totalPages)
      pages = tp && tp > 0 ? tp : 1
      currentPage += 1
    } while (currentPage <= pages)
    if (allItems.length > 5000) {
      toast({ title: 'Too much data', description: 'Apply filters before export', status: 'warning' })
      setExporting(false)
      return []
    }
    return applyClientFilters(allItems)
  }, [debouncedQ, profession, applyClientFilters])

  const canPrev = page > 1
  const canNext = page < totalPages

  const exportAllCSV = async () => {
    try {
      toast({ title: 'Preparing export...', description: 'Fetching full dataset...', status: 'info' })
      setExporting(true)
      const data = await fetchAllDoctorsForExport()
      if (!data.length) { toast({ title: 'No data found', status: 'info' }); return }
      const header = ['Profession', 'Source', 'Name', 'Mobile', 'City/Pin', 'CIBIL', 'Completion%', 'Risk', 'LoanStatus', 'DoctorId']
      const lines = [header.join(','), ...data.map((d) => {
        const completion = calcProfileCompletion(d)
        const bucket = getRiskBucket(completion)
        return [csvEscape(d.profession ?? ''), csvEscape(d.source || 'DB'), csvEscape(d.fullName), csvEscape(d.mobileNumber), csvEscape(d.cityOrPinCode ?? ''), csvEscape(d.cibilScore ?? ''), csvEscape(completion), csvEscape(bucket), csvEscape(d.loanStatus ?? 'PENDING'), csvEscape(d._id)].join(',')
      })].join('\n')
      downloadTextFile('doctors_full_export.csv', lines, 'text/csv')
      toast({ title: 'CSV exported', description: `${data.length} records downloaded.`, status: 'success' })
    } catch (e: any) { toast({ title: 'Export failed', description: e?.message, status: 'error' }) }
    finally { setExporting(false) }
  }

  const exportAllJSON = async () => {
    try {
      setExporting(true)
      const data = await fetchAllDoctorsForExport()
      if (!data.length) { toast({ title: 'No data found', status: 'info' }); return }
      const payload = { search: debouncedQ, filters: { city, risk, profession }, total: data.length, items: data }
      downloadTextFile('doctors_full_export.json', JSON.stringify(payload, null, 2), 'application/json')
      toast({ title: 'JSON exported', description: `${data.length} records downloaded.`, status: 'success' })
    } catch (e: any) { toast({ title: 'Export failed', description: e?.message, status: 'error' }) }
    finally { setExporting(false) }
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
    } catch { toast({ title: 'Copy failed', status: 'error' }) }
  }

  /* ─── Styles ─── */
  const selectStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.200',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'gray.700',
    h: '38px',
    _focus: { borderColor: 'blue.400', boxShadow: '0 0 0 3px rgba(59,130,246,0.12)' },
    _hover: { borderColor: 'gray.300' },
  }

  const inputStyles = {
    bg: 'white',
    border: '1px solid',
    borderColor: 'gray.200',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'gray.700',
    h: '38px',
    _focus: { borderColor: 'blue.400', boxShadow: '0 0 0 3px rgba(59,130,246,0.12)' },
    _placeholder: { color: 'gray.400' },
    _hover: { borderColor: 'gray.300' },
  }

  return (
    <Box
      minH="100vh"
      bg="#f8fafc"
      pt="72px"
      px={{ base: 3, md: 6 }}
      pb={10}
      sx={{
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <Container maxW="100%" px="0">

        {/* ── TOP HEADER ── */}
        <Box mb={5}>
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack spacing={3} align="center">
              <Box
                w="44px" h="44px"
                borderRadius="12px"
                background="linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)"
                display="flex" alignItems="center" justifyContent="center"
                boxShadow="0 4px 14px rgba(29,78,216,0.3)"
                flexShrink={0}
              >
                <Text fontSize="16px" fontWeight="900" color="white" letterSpacing="-0.5px">PR</Text>
              </Box>
              <Box>
                <Heading
                  fontSize="20px"
                  fontWeight="800"
                  color="gray.900"
                  letterSpacing="-0.4px"
                  lineHeight="1.1"
                >
                  Professionals Pipeline
                </Heading>
                <Text fontSize="12px" color="gray.400" fontWeight="500" mt="1px">
                  Lead management &amp; credit risk overview
                </Text>
              </Box>
            </HStack>

            <HStack spacing={2}>
              <Box
                px={4} py={1.5}
                bg="linear-gradient(135deg, #1d4ed8, #7c3aed)"
                borderRadius="full"
                boxShadow="0 2px 10px rgba(29,78,216,0.25)"
              >
                <Text fontSize="13px" fontWeight="700" color="white">
                  {totalDoctors.toLocaleString()} Total Leads
                </Text>
              </Box>
            </HStack>
          </HStack>
        </Box>

        {/* ── STAT CARDS ── */}
        <HStack spacing={3} mb={5} flexWrap="wrap">
          <StatCard label="Showing" value={stats.total} color="linear-gradient(90deg,#3b82f6,#6366f1)" />
          <StatCard label="Pending" value={stats.pending} color="linear-gradient(90deg,#f59e0b,#f97316)" />
          <StatCard label="Approved" value={stats.approved} color="linear-gradient(90deg,#10b981,#059669)" />
          <StatCard label="Disbursed" value={stats.disbursed} color="linear-gradient(90deg,#8b5cf6,#7c3aed)" />
        </HStack>

        {/* ── FILTERS CARD ── */}
        <Box
          bg="white"
          border="1px solid"
          borderColor="gray.100"
          borderRadius="16px"
          p={{ base: 4, md: 5 }}
          mb={4}
          boxShadow="0 1px 4px rgba(0,0,0,0.04)"
        >
          <Stack spacing={3}>
            {/* Search */}
            <InputGroup>
              <InputLeftElement pointerEvents="none" h="38px">
                <SearchIcon color="gray.400" boxSize="14px" />
              </InputLeftElement>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or mobile number…"
                pl="38px"
                {...inputStyles}
              />
            </InputGroup>

            {/* Filter row */}
            <Flex gap={2} flexWrap="wrap" align="center">
              <Select value={risk} onChange={(e) => setRisk(e.target.value as RiskFilter)} w="140px" {...selectStyles}>
                <option value="all">All Risk</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </Select>

              <Select value={profession} onChange={(e) => setProfession(e.target.value as ProfessionFilter)} w="160px" {...selectStyles}>
                <option value="all">All Profession</option>
                <option value="DOCTOR">🩺 Doctor</option>
                <option value="CA">📊 CA</option>
                <option value="LAWYER">⚖️ Lawyer</option>
                <option value="SALARIED">💼 Salaried</option>
                <option value="BUSINESSMAN">🏢 Businessman</option>
                <option value="COMPANY_SECRETARY">📋 Co. Secretary</option>
                <option value="COST_ACCOUNTANT">🧮 Cost Accountant</option>
                <option value="REALTOR">🏠 Realtor</option>
                <option value="BROKER">🤝 Broker</option>
                <option value="CHANNEL_PARTNER">🔗 Channel Partner</option>
              </Select>

              <Select value={loanStatus} onChange={(e) => setLoanStatus(e.target.value as any)} w="150px" {...selectStyles}>
                <option value="all">All Status</option>
                <option value="APPROVED">✅ Approved</option>
                <option value="REJECTED">❌ Rejected</option>
                <option value="DISBURSED">💸 Disbursed</option>
              </Select>

              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="📍 City / Pincode"
                w="160px"
                {...inputStyles}
              />

              {/* Spacer + Export + Records */}
              <Box flex="1" />

              <HStack spacing={2}>
                <Text fontSize="12px" color="gray.400" fontWeight="600" whiteSpace="nowrap">ROWS</Text>
                <Select
                  value={String(limit)}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
                  w="75px"
                  {...selectStyles}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Select>
              </HStack>

              <Menu>
                <MenuButton
                  as={Button}
                  leftIcon={exporting ? <Spinner size="xs" /> : <DownloadIcon />}
                  rightIcon={<ChevronDownIcon />}
                  size="sm"
                  h="38px"
                  px={4}
                  fontSize="13px"
                  fontWeight="600"
                  bg="gray.900"
                  color="white"
                  borderRadius="10px"
                  _hover={{ bg: 'gray.700' }}
                  _active={{ bg: 'gray.800' }}
                  isLoading={exporting}
                  loadingText="Exporting"
                >
                  Export
                </MenuButton>
                <MenuList borderRadius="12px" boxShadow="0 8px 30px rgba(0,0,0,0.12)" border="1px solid" borderColor="gray.100" p={1.5} minW="200px">
                  <MenuItem fontSize="13px" fontWeight="500" borderRadius="8px" _hover={{ bg: 'gray.50' }} onClick={exportAllCSV}>📄 Export full data (CSV)</MenuItem>
                  <MenuItem fontSize="13px" fontWeight="500" borderRadius="8px" _hover={{ bg: 'gray.50' }} onClick={exportAllJSON}>📦 Export full data (JSON)</MenuItem>
                  <Divider my={1} />
                  <MenuItem fontSize="13px" fontWeight="500" borderRadius="8px" _hover={{ bg: 'gray.50' }} onClick={copyCurrentQueryLink}>🔗 Copy filter link</MenuItem>
                </MenuList>
              </Menu>
            </Flex>
          </Stack>
        </Box>

        {/* ── TABLE CARD ── */}
        <Box
          bg="white"
          border="1px solid"
          borderColor="gray.100"
          borderRadius="16px"
          overflow="hidden"
          boxShadow="0 1px 4px rgba(0,0,0,0.04)"
        >
          {loading ? (
            <HStack py={16} justify="center" spacing={3}>
              <Spinner size="sm" color="blue.500" />
              <Text fontSize="14px" color="gray.400" fontWeight="500">Loading records…</Text>
            </HStack>
          ) : err ? (
            <Box py={16} textAlign="center">
              <Text fontSize="28px" mb={2}>⚠️</Text>
              <Text color="red.500" fontWeight="700" fontSize="14px">{err}</Text>
            </Box>
          ) : filtered.length === 0 ? (
            <Box py={16} textAlign="center">
              <Text fontSize="32px" mb={2}>🔍</Text>
              <Text color="gray.400" fontWeight="500" fontSize="14px">No records match your filters.</Text>
            </Box>
          ) : (
            <TableContainer>
              <Table size="sm" variant="unstyled">
                <Thead>
                  <Tr bg="#f8fafc" borderBottom="1px solid" borderColor="gray.100">
                    {['Profession', 'Lead', 'Contact', 'Location', 'CIBIL', 'Profile', 'Risk', 'Status', '', ''].map((h, i) => (
                      <Th
                        key={i}
                        fontSize="10px"
                        fontWeight="700"
                        color="gray.400"
                        letterSpacing="0.8px"
                        textTransform="uppercase"
                        py={3}
                        px={4}
                        textAlign={i >= 8 ? 'center' : 'left'}
                        whiteSpace="nowrap"
                      >
                        {h}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.map((d, idx) => {
                    const completion = calcProfileCompletion(d)
                    const bucket = getRiskBucket(completion)
                    const rc = riskConfig(bucket)
                    const sc = loanStatusConfig(d.loanStatus)
                    const icon = professionIcon[d.profession || ''] || '👤'
                    const initials = (d.fullName || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

                    return (
                      <Tr
                        key={d._id}
                        borderBottom="1px solid"
                        borderColor="gray.50"
                        _hover={{ bg: '#fafbff' }}
                        transition="background 0.12s ease"
                      >
                        {/* Profession */}
                        <Td px={4} py={3}>
                          <HStack spacing={2}>
                            <Box
                              w="28px" h="28px"
                              borderRadius="8px"
                              bg="blue.50"
                              display="flex" alignItems="center" justifyContent="center"
                              fontSize="14px"
                              flexShrink={0}
                            >
                              {icon}
                            </Box>
                            <Text fontSize="12px" fontWeight="600" color="gray.600" whiteSpace="nowrap">
                              {formatProfession(d.profession)}
                            </Text>
                          </HStack>
                        </Td>

                        {/* Lead name */}
                        <Td px={4} py={3}>
                          <HStack spacing={2.5}>
                            <Box
                              w="32px" h="32px"
                              borderRadius="10px"
                              background="linear-gradient(135deg, #e0e7ff, #ede9fe)"
                              display="flex" alignItems="center" justifyContent="center"
                              flexShrink={0}
                            >
                              <Text fontSize="11px" fontWeight="800" color="#4f46e5">{initials}</Text>
                            </Box>
                            <Box>
                              <Text fontSize="13px" fontWeight="700" color="gray.800" lineHeight="1.1" noOfLines={1} maxW="160px">
                                {d.fullName || '—'}
                              </Text>
                              <HStack spacing={1} mt="2px">
                                {d.isFromOms ? (
                                  <Box px={1.5} py={0} bg="#dbeafe" borderRadius="4px">
                                    <Text fontSize="9px" fontWeight="700" color="#1d4ed8" letterSpacing="0.5px">OMS</Text>
                                  </Box>
                                ) : (
                                  <Box px={1.5} py={0} bg="#dcfce7" borderRadius="4px">
                                    <Text fontSize="9px" fontWeight="700" color="#16a34a" letterSpacing="0.5px">DB</Text>
                                  </Box>
                                )}
                              </HStack>
                            </Box>
                          </HStack>
                        </Td>

                        {/* Mobile */}
                        <Td px={4} py={3}>
                          <Text fontSize="13px" fontWeight="500" color="gray.600" fontFamily="mono">
                            {d.mobileNumber || '—'}
                          </Text>
                        </Td>

                        {/* City */}
                        <Td px={4} py={3}>
                          <Text fontSize="13px" color="gray.500" fontWeight="500">
                            {d.cityOrPinCode ? `📍 ${d.cityOrPinCode}` : '—'}
                          </Text>
                        </Td>

                        {/* CIBIL */}
                        <Td px={4} py={3}>
                          {d.cibilScore ? (
                            <Box
                              px={2.5} py={1}
                              bg={d.cibilScore >= 750 ? '#dcfce7' : d.cibilScore >= 650 ? '#fef9c3' : '#fee2e2'}
                              borderRadius="8px"
                              display="inline-block"
                            >
                              <Text
                                fontSize="12px"
                                fontWeight="800"
                                color={d.cibilScore >= 750 ? '#16a34a' : d.cibilScore >= 650 ? '#d97706' : '#dc2626'}
                                fontFamily="mono"
                              >
                                {d.cibilScore}
                              </Text>
                            </Box>
                          ) : (
                            <Text fontSize="13px" color="gray.300">—</Text>
                          )}
                        </Td>

                        {/* Profile completion */}
                        <Td px={4} py={3} minW="110px">
                          <Box>
                            <HStack justify="space-between" mb="3px">
                              <Text fontSize="11px" fontWeight="700" color="gray.600">{completion}%</Text>
                            </HStack>
                            <Box h="4px" bg="gray.100" borderRadius="full" overflow="hidden">
                              <Box
                                h="100%"
                                w={`${completion}%`}
                                bg={completion >= 70 ? '#22c55e' : completion >= 40 ? '#f59e0b' : '#ef4444'}
                                borderRadius="full"
                                transition="width 0.3s ease"
                              />
                            </Box>
                          </Box>
                        </Td>

                        {/* Risk */}
                        <Td px={4} py={3}>
                          <Box
                            px={2.5} py={1}
                            bg={rc.bg}
                            borderRadius="8px"
                            display="inline-block"
                          >
                            <Text fontSize="12px" fontWeight="700" color={rc.color}>{bucket}</Text>
                          </Box>
                        </Td>

                        {/* Loan Status */}
                        <Td px={4} py={3}>
                          <HStack spacing={1.5}>
                            <Box w="6px" h="6px" borderRadius="full" bg={sc.dot} flexShrink={0} />
                            <Box px={2.5} py={1} bg={sc.bg} borderRadius="8px">
                              <Text fontSize="12px" fontWeight="700" color={sc.text}>{sc.label}</Text>
                            </Box>
                          </HStack>
                        </Td>

                        {/* View */}
                        <Td px={3} py={3} textAlign="center">
                          <Tooltip label="View full profile" hasArrow>
                            <IconButton
                              aria-label="View"
                              icon={<Text fontSize="14px">👁</Text>}
                              size="xs"
                              variant="ghost"
                              borderRadius="8px"
                              bg="gray.50"
                              _hover={{ bg: 'blue.50' }}
                              onClick={() => {
                                if (d._id) router.push(`/profession/${d._id}`)
                                else router.push(`/profession-lead?q=${d.mobileNumber}`)
                              }}
                            />
                          </Tooltip>
                        </Td>

                        {/* Action */}
                        <Td px={3} py={3} textAlign="right">
                          <Menu>
                            <Tooltip label="Change status" hasArrow>
                              <MenuButton
                                as={IconButton}
                                icon={
                                  actionLoadingId === d._id
                                    ? <Spinner size="xs" />
                                    : <ChevronDownIcon />
                                }
                                size="xs"
                                variant="ghost"
                                borderRadius="8px"
                                bg="gray.50"
                                _hover={{ bg: 'gray.100' }}
                                _active={{ bg: 'gray.200' }}
                                isDisabled={actionLoadingId === d._id}
                              />
                            </Tooltip>
                            <MenuList
                              zIndex={9999}
                              borderRadius="12px"
                              boxShadow="0 8px 30px rgba(0,0,0,0.12)"
                              border="1px solid"
                              borderColor="gray.100"
                              p={1.5}
                              minW="160px"
                            >
                              {canApprove(d.loanStatus) && (
                                <MenuItem
                                  fontSize="13px"
                                  fontWeight="600"
                                  color="green.700"
                                  borderRadius="8px"
                                  _hover={{ bg: 'green.50' }}
                                  onClick={() => handleStatusChange(d._id, 'APPROVED')}
                                >
                                  ✅ Approve
                                </MenuItem>
                              )}
                              {canReject(d.loanStatus) && (
                                <MenuItem
                                  fontSize="13px"
                                  fontWeight="600"
                                  color="red.600"
                                  borderRadius="8px"
                                  _hover={{ bg: 'red.50' }}
                                  onClick={() => handleStatusChange(d._id, 'REJECTED')}
                                >
                                  ❌ Reject
                                </MenuItem>
                              )}
                              {canDisburse(d.loanStatus) && (
                                <MenuItem
                                  fontSize="13px"
                                  fontWeight="600"
                                  color="purple.700"
                                  borderRadius="8px"
                                  _hover={{ bg: 'purple.50' }}
                                  onClick={() => handleStatusChange(d._id, 'DISBURSED')}
                                >
                                  💸 Disburse
                                </MenuItem>
                              )}
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

          {/* ── Pagination ── */}
          {!loading && !err && filtered.length > 0 && (
            <Box
              px={5} py={3}
              borderTop="1px solid"
              borderColor="gray.50"
              bg="#fafbfc"
            >
              <HStack justify="space-between" flexWrap="wrap" gap={3}>
                <Text fontSize="12px" color="gray.400" fontWeight="500">
                  Page <Text as="span" fontWeight="700" color="gray.700">{page}</Text> of {totalPages} &nbsp;·&nbsp; {filtered.length} records shown
                </Text>
                <HStack spacing={2}>
                  <Button
                    size="xs"
                    h="30px"
                    px={3}
                    fontSize="12px"
                    fontWeight="600"
                    variant="outline"
                    borderRadius="8px"
                    borderColor="gray.200"
                    color="gray.600"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    isDisabled={!canPrev}
                  >
                    ← Prev
                  </Button>

                  {/* Page number pills */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i))
                    return (
                      <Button
                        key={p}
                        size="xs"
                        h="30px"
                        w="30px"
                        px={0}
                        fontSize="12px"
                        fontWeight="600"
                        borderRadius="8px"
                        variant={p === page ? 'solid' : 'ghost'}
                        bg={p === page ? 'gray.900' : 'transparent'}
                        color={p === page ? 'white' : 'gray.500'}
                        _hover={{ bg: p === page ? 'gray.800' : 'gray.100' }}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  })}

                  <Button
                    size="xs"
                    h="30px"
                    px={3}
                    fontSize="12px"
                    fontWeight="600"
                    variant="outline"
                    borderRadius="8px"
                    borderColor="gray.200"
                    color="gray.600"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => setPage((p) => p + 1)}
                    isDisabled={!canNext}
                  >
                    Next →
                  </Button>
                </HStack>
              </HStack>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  )
}