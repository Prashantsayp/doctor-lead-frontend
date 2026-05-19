'use client'

import * as React from 'react'
import {
  Box, Container, Flex, Grid, Heading, Text, VStack, HStack,
  Icon, Skeleton, useToast,
  Popover, PopoverTrigger, PopoverContent, PopoverBody,
} from '@chakra-ui/react'
import {
  FiUsers, FiFileText, FiCheckCircle, FiXCircle,
  FiClock, FiAlertCircle, FiPercent, FiCalendar,
  FiRefreshCw, FiChevronLeft, FiChevronRight, FiTrendingUp,
} from 'react-icons/fi'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadItem {
  _id: string; profession: string; fullName: string
  mobileNumber: string; email: string; status: string
  createdAt: string; updatedAt: string
  isFromOms: boolean; cityOrPinCode: string
}
interface LeadResponse {
  items: LeadItem[]; total: number; page: number; limit: number; totalPages: number
}
interface DashboardStats {
  total: number; pending: number; submitted: number
  approved: number; rejected: number; disbursed: number
  approvalRatio: number; avgTAT: number
}
interface MonthlyBucket { month: string; submitted: number; approved: number; rejected: number }
interface RecentLead {
  id: string; name: string; mobile: string; profession: string
  status: string; city: string; tatDays: number; createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS  = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
const PAGE_SIZE   = 200
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PERIOD_MONTHS: Record<string, number> = { '1month': 1, '3months': 3, '6months': 6, '1year': 12 }
const TAT_STAGES = [
  { stage: 'Document Collection', pct: 33, color: '#3b82f6' },
  { stage: 'Credit Assessment',   pct: 28, color: '#8b5cf6' },
  { stage: 'Lender Review',       pct: 22, color: '#22c55e' },
  { stage: 'Final Approval',      pct: 17, color: '#f59e0b' },
]
const STATUS_CFG: Record<string, { bg: string; color: string; border: string }> = {
  APPROVED:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  REJECTED:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  SUBMITTED: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  DISBURSED: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  PENDING:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('token')
  if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null
  return t
}
const authHdr = (token: string) => ({
  'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
})
const fetchAllLeads = async (token: string, months: number, base: string): Promise<LeadItem[]> => {
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months)
  const r1 = await fetch(`${base}/doctor-lead/get-lead?page=1&limit=${PAGE_SIZE}&sort=createdAt:desc`, { headers: authHdr(token) })
  if (!r1.ok) throw new Error(`API error ${r1.status}`)
  const d1: LeadResponse = await r1.json()
  let all: LeadItem[] = d1.items
  const totalPages = Math.min(d1.totalPages, Math.ceil(d1.total / PAGE_SIZE))
  if (totalPages > 1) {
    const settled = await Promise.allSettled(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetch(`${base}/doctor-lead/get-lead?page=${i + 2}&limit=${PAGE_SIZE}&sort=createdAt:desc`, { headers: authHdr(token) })
          .then((r) => r.json() as Promise<LeadResponse>),
      ),
    )
    settled.forEach((res) => { if (res.status === 'fulfilled') all = all.concat(res.value.items) })
  }
  return all.filter((l) => new Date(l.createdAt) >= cutoff)
}
const fetchLeadsByDateRange = async (token: string, from: Date, to: Date, base: string): Promise<LeadItem[]> => {
  const r1 = await fetch(`${base}/doctor-lead/get-lead?page=1&limit=${PAGE_SIZE}&sort=createdAt:desc`, { headers: authHdr(token) })
  if (!r1.ok) throw new Error(`API error ${r1.status}`)
  const d1: LeadResponse = await r1.json()
  let all: LeadItem[] = d1.items
  const totalPages = Math.min(d1.totalPages, Math.ceil(d1.total / PAGE_SIZE))
  if (totalPages > 1) {
    const settled = await Promise.allSettled(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetch(`${base}/doctor-lead/get-lead?page=${i + 2}&limit=${PAGE_SIZE}&sort=createdAt:desc`, { headers: authHdr(token) })
          .then((r) => r.json() as Promise<LeadResponse>),
      ),
    )
    settled.forEach((res) => { if (res.status === 'fulfilled') all = all.concat(res.value.items) })
  }
  const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999)
  return all.filter((l) => { const d = new Date(l.createdAt); return d >= from && d <= toEnd })
}
const tat = (l: LeadItem) =>
  Math.max(0, Math.round((new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) / 86_400_000))
const computeStats = (leads: LeadItem[]): DashboardStats => {
  const count = (s: string) => leads.filter((l) => l.status === s).length
  const total = leads.length
  const pending = count('PENDING'); const submitted = count('SUBMITTED')
  const approved = count('APPROVED'); const rejected = count('REJECTED'); const disbursed = count('DISBURSED')
  const approvalRatio = submitted > 0 ? parseFloat(((approved / submitted) * 100).toFixed(1)) : 0
  const approvedLeads = leads.filter((l) => l.status === 'APPROVED')
  const avgTAT = approvedLeads.length > 0
    ? parseFloat((approvedLeads.reduce((s, l) => s + tat(l), 0) / approvedLeads.length).toFixed(1)) : 0
  return { total, pending, submitted, approved, rejected, disbursed, approvalRatio, avgTAT }
}
const computeMonthly = (leads: LeadItem[]): MonthlyBucket[] => {
  const map: Record<string, MonthlyBucket> = {}
  leads.forEach((l) => {
    const d = new Date(l.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const lbl = `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
    if (!map[key]) map[key] = { month: lbl, submitted: 0, approved: 0, rejected: 0 }
    if (['SUBMITTED','APPROVED','REJECTED','DISBURSED'].includes(l.status)) map[key].submitted++
    if (['APPROVED','DISBURSED'].includes(l.status)) map[key].approved++
    if (l.status === 'REJECTED') map[key].rejected++
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
}
const computeRecent = (leads: LeadItem[]): RecentLead[] =>
  [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8).map((l) => ({
      id: l._id, name: l.fullName,
      mobile: l.mobileNumber.replace(/^(\d{5})(\d+)$/, '$1xxxxx'),
      profession: l.profession, status: l.status,
      city: l.cityOrPinCode || '—', tatDays: tat(l), createdAt: l.createdAt,
    }))
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

// ─── Mini Calendar ────────────────────────────────────────────────────────────

interface MiniCalProps {
  selected: Date | null; onSelect: (d: Date) => void
  highlightRange?: { from: Date | null; to: Date | null }
  minDate?: Date; maxDate?: Date
}
const MiniCal: React.FC<MiniCalProps> = ({ selected, onSelect, highlightRange, minDate, maxDate }) => {
  const [view, setView] = React.useState(() => {
    const b = selected || new Date(); return new Date(b.getFullYear(), b.getMonth(), 1)
  })
  const y = view.getFullYear(), m = view.getMonth()
  const firstDay = new Date(y, m, 1).getDay()
  const dim = new Date(y, m + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d))
  const inRange = (d: Date) =>
    !!(highlightRange?.from && highlightRange?.to && d >= highlightRange.from && d <= highlightRange.to)
  const isDisabled = (d: Date) => !!(minDate && d < minDate) || !!(maxDate && d > maxDate)
  const isSel = (d: Date) => !!(selected && d.toDateString() === selected.toDateString())
  return (
    <Box userSelect="none" minW="220px">
      <Flex align="center" justify="space-between" mb={3}>
        <Box as="button" onClick={() => setView(new Date(y, m - 1, 1))}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#64748b' }}>
          <FiChevronLeft size={13} />
        </Box>
        <Text fontSize="12px" fontWeight="700" color="#0f172a">{MONTH_NAMES[m]} {y}</Text>
        <Box as="button" onClick={() => setView(new Date(y, m + 1, 1))}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#64748b' }}>
          <FiChevronRight size={13} />
        </Box>
      </Flex>
      <Grid templateColumns="repeat(7,1fr)" gap="1px" mb={1}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <Text key={d} fontSize="9px" textAlign="center" color="#94a3b8" fontWeight="700" pb={1}>{d}</Text>
        ))}
      </Grid>
      <Grid templateColumns="repeat(7,1fr)" gap="1px">
        {cells.map((d, i) => {
          if (!d) return <Box key={i} />
          const sel = isSel(d); const rng = inRange(d); const dis = isDisabled(d)
          return (
            <Box key={i} as="button" onClick={() => !dis && onSelect(d)}
              style={{
                background: sel ? '#3b82f6' : rng ? '#dbeafe' : 'transparent',
                border: 'none', borderRadius: 6, padding: '5px 2px',
                cursor: dis ? 'not-allowed' : 'pointer',
                color: dis ? '#cbd5e1' : sel ? '#fff' : rng ? '#1d4ed8' : '#374151',
                fontSize: 11, fontWeight: sel ? 700 : 400,
              }}>
              {d.getDate()}
            </Box>
          )
        })}
      </Grid>
    </Box>
  )
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  from: Date | null; to: Date | null
  onChange: (from: Date | null, to: Date | null) => void
}
const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onChange }) => {
  const [step, setStep] = React.useState<'from' | 'to'>('from')
  const [open, setOpen] = React.useState(false)
  const handleSelect = (d: Date) => {
    if (step === 'from') { onChange(d, null); setStep('to') }
    else {
      if (from && d < from) onChange(d, from); else onChange(from, d)
      setStep('from'); setOpen(false)
    }
  }
  const label = from && to
    ? `${fmtDate(from.toISOString())} – ${fmtDate(to.toISOString())}`
    : from ? `From ${fmtDate(from.toISOString())}…` : 'Custom Range'
  const active = !!(from || to)
  return (
    <Popover isOpen={open} onClose={() => { setOpen(false); setStep('from') }} placement="bottom-end">
      <PopoverTrigger>
        <Box as="button" onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: active ? '#eff6ff' : '#ffffff',
            border: `1px solid ${active ? '#93c5fd' : '#e2e8f0'}`,
            borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
            color: active ? '#2563eb' : '#64748b', fontSize: 12, fontWeight: 500,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
          <FiCalendar size={12} />
          <span>{label}</span>
        </Box>
      </PopoverTrigger>
      <PopoverContent w="auto" bg="white" border="1px solid #e2e8f0"
        borderRadius="12px" boxShadow="0 10px 40px rgba(0,0,0,0.1)" p={4}>
        <PopoverBody p={0}>
          <Text fontSize="10px" color="#3b82f6" fontWeight="700" letterSpacing="0.08em"
            textTransform="uppercase" mb={3}>
            {step === 'from' ? '① Select Start Date' : '② Select End Date'}
          </Text>
          <MiniCal
            selected={step === 'from' ? from : to}
            onSelect={handleSelect}
            highlightRange={{ from, to }}
            maxDate={new Date()}
            minDate={step === 'to' && from ? from : undefined}
          />
          {(from || to) && (
            <Flex justify="space-between" align="center" mt={3} pt={3} borderTop="1px solid #f1f5f9">
              <Text fontSize="10px" color="#94a3b8">
                {from ? fmtDate(from.toISOString()) : '—'} → {to ? fmtDate(to.toISOString()) : '—'}
              </Text>
              <Box as="button"
                onClick={() => { onChange(null, null); setStep('from'); setOpen(false) }}
                style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Clear
              </Box>
            </Flex>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string; value: string | number; icon: React.ElementType
  accentColor: string; lightBg: string; helpText?: string; isLoading?: boolean
}
const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, accentColor, lightBg, helpText, isLoading }) => (
  <Box bg="white" borderRadius="12px" border="1px solid #f1f5f9" p={5}
    boxShadow="0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
    transition="all 0.2s" position="relative" overflow="hidden"
    _hover={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)', transform: 'translateY(-1px)' }}>
    {/* top accent bar */}
    <Box position="absolute" top={0} left={0} right={0} h="3px"
      bg={accentColor} borderRadius="12px 12px 0 0" />
    <Flex justify="space-between" align="flex-start">
      <Box flex={1}>
        <Text fontSize="10px" fontWeight="700" color="#94a3b8"
          textTransform="uppercase" letterSpacing="0.1em" mb={2}>{label}</Text>
        {isLoading
          ? <Skeleton height="26px" width="60px" borderRadius="6px" startColor="#f1f5f9" endColor="#e2e8f0" />
          : <Text fontSize="22px" fontWeight="800" color="#0f172a" lineHeight={1} letterSpacing="-0.02em">{value}</Text>
        }
        {helpText && !isLoading && (
          <Text fontSize="10px" color="#94a3b8" mt={1.5} fontWeight="500">{helpText}</Text>
        )}
      </Box>
      <Box w="38px" h="38px" borderRadius="10px" bg={lightBg}
        display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
        <Icon as={icon} color={accentColor} boxSize={4} />
      </Box>
    </Flex>
  </Box>
)

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <Box bg="white" border="1px solid #e2e8f0" borderRadius="10px"
      px={4} py={3} boxShadow="0 8px 30px rgba(0,0,0,0.1)">
      <Text fontSize="11px" color="#3b82f6" fontWeight="700" mb={2}>{label}</Text>
      {payload.map((p: any) => (
        <Flex key={p.name} align="center" gap={2} mb={1}>
          <Box w="8px" h="8px" borderRadius="2px" bg={p.color} />
          <Text fontSize="11px" color="#64748b">{p.name}:</Text>
          <Text fontSize="11px" color="#0f172a" fontWeight="700">{p.value?.toLocaleString('en-IN')}</Text>
        </Flex>
      ))}
    </Box>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box bg="white" borderRadius="14px" border="1px solid #f1f5f9"
    boxShadow="0 1px 3px rgba(0,0,0,0.05)" p={6}>{children}</Box>
)

// ─── Dashboard ────────────────────────────────────────────────────────────────

  const Dashboard: React.FC = () => {
  const toast   = useToast()
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''

  const [stats,         setStats]         = React.useState<DashboardStats | null>(null)
  const [monthly,       setMonthly]       = React.useState<MonthlyBucket[]>([])
  const [recent,        setRecent]        = React.useState<RecentLead[]>([])
  const [profBreakdown, setProfBreakdown] = React.useState<{ name: string; value: number }[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [period,        setPeriod]        = React.useState('6months')
  const [dateFrom,      setDateFrom]      = React.useState<Date | null>(null)
  const [dateTo,        setDateTo]        = React.useState<Date | null>(null)
  const [filterMode,    setFilterMode]    = React.useState<'period' | 'custom'>('period')

  const processLeads = (leads: LeadItem[]) => {
    setStats(computeStats(leads))
    setMonthly(computeMonthly(leads))
    setRecent(computeRecent(leads))
    const profMap: Record<string, number> = {}
    leads.forEach((l) => { const p = l.profession || 'UNKNOWN'; profMap[p] = (profMap[p] ?? 0) + 1 })
    setProfBreakdown(
      Object.entries(profMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value }))
    )
  }

  const load = React.useCallback(async () => {
    const token = getToken()
    setLoading(true); setError(null)
    try {
      if (!token) { setError('Not authenticated — please log in.'); return }
      if (filterMode === 'custom' && dateFrom && dateTo)
        processLeads(await fetchLeadsByDateRange(token, dateFrom, dateTo, apiBase))
      else
        processLeads(await fetchAllLeads(token, PERIOD_MONTHS[period] ?? 6, apiBase))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard'
      setError(msg); toast({ title: msg, status: 'error', duration: 4000 })
    } finally { setLoading(false) }
  }, [period, apiBase, toast, filterMode, dateFrom, dateTo])

  React.useEffect(() => { load() }, [load])

  const handleDateRangeChange = (from: Date | null, to: Date | null) => {
    setDateFrom(from); setDateTo(to)
    if (from && to) setFilterMode('custom')
    else if (!from && !to) setFilterMode('period')
  }
  const handlePeriodChange = (val: string) => {
    setPeriod(val); setFilterMode('period'); setDateFrom(null); setDateTo(null)
  }

  const statusPie = stats ? [
    { name: 'Approved',  value: stats.approved  },
    { name: 'Pending',   value: stats.pending   },
    { name: 'Rejected',  value: stats.rejected  },
    { name: 'Submitted', value: stats.submitted },
    { name: 'Disbursed', value: stats.disbursed },
  ].filter((d) => d.value > 0) : []

  const periodLabel = filterMode === 'custom' && dateFrom && dateTo
    ? `${fmtDate(dateFrom.toISOString())} – ${fmtDate(dateTo.toISOString())}`
    : ({ '1month': 'Last 1 Month', '3months': 'Last 3 Months', '6months': 'Last 6 Months', '1year': 'Last 1 Year' })[period] ?? ''

  const profColors = ['#3b82f6','#22c55e','#8b5cf6','#f59e0b','#14b8a6']

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Container maxW="1400px" py={6} px={6}>

        {/* ── Header ── */}
        <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
          <Box>
            <HStack spacing={2} mb={0.5}>
              <Box w="3px" h="22px" borderRadius="2px" bg="#3b82f6" />
              <Heading fontSize="20px" fontWeight="800" color="#0f172a" letterSpacing="-0.02em">
                Analytics Dashboard
              </Heading>
            </HStack>
            <Text color="#94a3b8" fontSize="12px" pl={5}>
              Customer Intelligence Portal · real-time insights ·{' '}
              <Text as="span" color="#3b82f6" fontWeight="600">{periodLabel}</Text>
            </Text>
          </Box>
          <HStack spacing={2} flexWrap="wrap">
            <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateRangeChange} />
            <Box as="select"
              value={filterMode === 'custom' ? '' : period}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePeriodChange(e.target.value)}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '7px 12px', cursor: 'pointer', color: '#374151',
                fontSize: 12, fontWeight: 500, outline: 'none', appearance: 'none',
                paddingRight: 28, boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}>
              <option value="1month">Last 1 Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last 1 Year</option>
            </Box>
            <Box as="button" onClick={load}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '7px 10px', cursor: 'pointer', color: '#64748b',
                display: 'flex', alignItems: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}>
              <FiRefreshCw size={13} />
            </Box>
          </HStack>
        </Flex>

        {/* ── Error ── */}
        {error && (
          <Box bg="#fef2f2" border="1px solid #fecaca" borderRadius="10px" p={4} mb={5}>
            <HStack>
              <Icon as={FiAlertCircle} color="#ef4444" />
              <Text fontSize="13px" color="#dc2626">{error}</Text>
            </HStack>
          </Box>
        )}

        {/* ── Metric Cards ── */}
        <Grid templateColumns={{ base: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }} gap={3} mb={5}>
          <MetricCard label="Total Leads"      value={stats?.total.toLocaleString('en-IN') ?? '—'}     icon={FiUsers}       accentColor="#3b82f6" lightBg="#eff6ff" helpText="In selected period"    isLoading={loading} />
          <MetricCard label="Submitted"        value={stats?.submitted.toLocaleString('en-IN') ?? '—'} icon={FiFileText}    accentColor="#8b5cf6" lightBg="#f5f3ff" helpText="Sent to lenders"       isLoading={loading} />
          <MetricCard label="Approved"         value={stats?.approved.toLocaleString('en-IN') ?? '—'}  icon={FiCheckCircle} accentColor="#22c55e" lightBg="#f0fdf4" helpText="Sanction issued"       isLoading={loading} />
          <MetricCard label="Rejected"         value={stats?.rejected.toLocaleString('en-IN') ?? '—'}  icon={FiXCircle}     accentColor="#ef4444" lightBg="#fef2f2" helpText="Declined by lender"    isLoading={loading} />
          <MetricCard label="Pending"          value={stats?.pending.toLocaleString('en-IN') ?? '—'}   icon={FiClock}       accentColor="#f59e0b" lightBg="#fffbeb" helpText="Awaiting action"        isLoading={loading} />
          <MetricCard label="Disbursed"        value={stats?.disbursed.toLocaleString('en-IN') ?? '—'} icon={FiTrendingUp}  accentColor="#14b8a6" lightBg="#f0fdfa" helpText="Loan released"         isLoading={loading} />
          <MetricCard label="Approval Ratio"   value={stats ? `${stats.approvalRatio}%` : '—'}         icon={FiPercent}     accentColor="#0ea5e9" lightBg="#f0f9ff" helpText="Approved ÷ Submitted"  isLoading={loading} />
          <MetricCard label="Avg TAT (Apprvd)" value={stats ? `${stats.avgTAT}d` : '—'}               icon={FiCalendar}    accentColor="#ec4899" lightBg="#fdf2f8" helpText="Created → Last update" isLoading={loading} />
        </Grid>

        {/* ── Charts ── */}
        <Grid templateColumns={{ base: '1fr', lg: '1.7fr 1fr' }} gap={4} mb={4}>

          {/* Area chart */}
          <Panel>
            <Flex justify="space-between" align="flex-start" mb={5}>
              <Box>
                <Text fontSize="14px" fontWeight="700" color="#0f172a" mb={0.5}>Monthly Lead Funnel</Text>
                <Text fontSize="11px" color="#94a3b8">Submitted → Approved → Rejected by month</Text>
              </Box>
              <HStack spacing={4}>
                {[['#3b82f6','Submitted'],['#22c55e','Approved'],['#ef4444','Rejected']].map(([c,l]) => (
                  <HStack key={l} spacing={1.5}>
                    <Box w="8px" h="8px" borderRadius="2px" bg={c} />
                    <Text fontSize="10px" color="#94a3b8" fontWeight="500">{l}</Text>
                  </HStack>
                ))}
              </HStack>
            </Flex>
            {loading
              ? <Skeleton height="220px" borderRadius="10px" startColor="#f1f5f9" endColor="#e2e8f0" />
              : monthly.length === 0
                ? <Flex h="220px" align="center" justify="center">
                    <Text fontSize="13px" color="#94a3b8">No data for this period</Text>
                  </Flex>
                : <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthly}>
                      <defs>
                        <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area dataKey="submitted" name="Submitted" stroke="#3b82f6" strokeWidth={2} fill="url(#gS)" dot={false} />
                      <Area dataKey="approved"  name="Approved"  stroke="#22c55e" strokeWidth={2} fill="url(#gA)" dot={false} />
                      <Area dataKey="rejected"  name="Rejected"  stroke="#ef4444" strokeWidth={2} fill="url(#gR)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
            }
          </Panel>

          {/* Donut */}
          <Panel>
            <Text fontSize="14px" fontWeight="700" color="#0f172a" mb={0.5}>Status Breakdown</Text>
            <Text fontSize="11px" color="#94a3b8" mb={4}>Live distribution</Text>
            {loading
              ? <Skeleton height="200px" borderRadius="10px" startColor="#f1f5f9" endColor="#e2e8f0" />
              : statusPie.length === 0
                ? <Flex h="200px" align="center" justify="center">
                    <Text fontSize="13px" color="#94a3b8">No data</Text>
                  </Flex>
                : <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={statusPie} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                          paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <VStack spacing={2} mt={2} align="stretch">
                      {statusPie.map((item, i) => (
                        <Flex key={item.name} justify="space-between" align="center">
                          <HStack spacing={2}>
                            <Box w="8px" h="8px" borderRadius="2px" bg={PIE_COLORS[i % PIE_COLORS.length]} />
                            <Text fontSize="11px" color="#64748b">{item.name}</Text>
                          </HStack>
                          <Text fontSize="11px" fontWeight="700" color="#374151">
                            {item.value.toLocaleString('en-IN')}
                          </Text>
                        </Flex>
                      ))}
                    </VStack>
                  </>
            }
          </Panel>
        </Grid>

        {/* ── Bottom Row ── */}
        <Grid templateColumns={{ base: '1fr', lg: '1.6fr 1fr' }} gap={4}>

          {/* Recent Leads */}
          <Panel>
            <Flex justify="space-between" align="center" mb={4}>
              <Box>
                <Text fontSize="14px" fontWeight="700" color="#0f172a" mb={0.5}>Recent Leads</Text>
                <Text fontSize="11px" color="#94a3b8">Latest 8 entries</Text>
              </Box>
              <Box px={2.5} py={1} borderRadius="6px" bg="#eff6ff" border="1px solid #bfdbfe">
                <Text fontSize="9px" fontWeight="700" color="#2563eb" letterSpacing="0.08em">LIVE</Text>
              </Box>
            </Flex>
            {loading ? (
              <VStack spacing={2}>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} height="52px" w="100%" borderRadius="10px"
                    startColor="#f8fafc" endColor="#f1f5f9" />
                ))}
              </VStack>
            ) : recent.length === 0 ? (
              <Flex h="160px" align="center" justify="center">
                <Text fontSize="13px" color="#94a3b8">No leads in this period</Text>
              </Flex>
            ) : (
              <VStack spacing={2} align="stretch">
                {recent.map((c) => {
                  const sc = STATUS_CFG[c.status] || STATUS_CFG.PENDING
                  return (
                    <Box key={c.id} bg="#f8fafc" border="1px solid #f1f5f9"
                      borderRadius="10px" px={4} py={3} cursor="pointer"
                      transition="all 0.15s"
                      _hover={{ bg: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <Flex justify="space-between" align="center">
                        <HStack spacing={3} flex={1} minW={0}>
                          <Box w="34px" h="34px" borderRadius="10px" flexShrink={0}
                            bg={sc.bg} border={`1px solid ${sc.border}`}
                            display="flex" alignItems="center" justifyContent="center">
                            <Text fontSize="13px" fontWeight="800" color={sc.color}>
                              {c.name.charAt(0).toUpperCase()}
                            </Text>
                          </Box>
                          <Box minW={0}>
                            <Text fontSize="12px" fontWeight="600" color="#0f172a" noOfLines={1}>{c.name}</Text>
                            <Text fontSize="10px" color="#94a3b8">{c.mobile} · {c.city}</Text>
                          </Box>
                        </HStack>
                        <HStack spacing={3} flexShrink={0}>
                          <Text fontSize="10px" color="#94a3b8">{c.tatDays}d TAT</Text>
                          <Text fontSize="10px" color="#94a3b8">{fmtDate(c.createdAt)}</Text>
                          <Box px={2} py={0.5} borderRadius="6px" bg={sc.bg} border={`1px solid ${sc.border}`}>
                            <Text fontSize="9px" fontWeight="700" color={sc.color}
                              textTransform="uppercase" letterSpacing="0.06em">
                              {cap(c.status)}
                            </Text>
                          </Box>
                        </HStack>
                      </Flex>
                    </Box>
                  )
                })}
              </VStack>
            )}
          </Panel>

          {/* Right column */}
          <VStack spacing={4} align="stretch">

            {/* TAT */}
            <Panel>
              <Text fontSize="14px" fontWeight="700" color="#0f172a" mb={0.5}>Avg TAT Breakdown</Text>
              <Text fontSize="11px" color="#94a3b8" mb={4}>Estimated pipeline stage split</Text>
              <HStack align="baseline" mb={5} spacing={1.5}>
                {loading
                  ? <Skeleton height="32px" width="70px" borderRadius="6px" startColor="#f1f5f9" endColor="#e2e8f0" />
                  : <>
                      <Text fontSize="32px" fontWeight="800" color="#0f172a" lineHeight={1} letterSpacing="-0.04em">
                        {stats?.avgTAT ?? '—'}
                      </Text>
                      <Text fontSize="13px" color="#94a3b8">days avg</Text>
                    </>
                }
              </HStack>
              <VStack spacing={3} align="stretch">
                {TAT_STAGES.map((item) => (
                  <Box key={item.stage}>
                    <Flex justify="space-between" mb={1.5}>
                      <Text fontSize="11px" color="#64748b">{item.stage}</Text>
                      <Text fontSize="11px" fontWeight="700" color="#374151">
                        {stats ? `${((stats.avgTAT * item.pct) / 100).toFixed(1)}d` : '—'}
                      </Text>
                    </Flex>
                    <Box h="5px" bg="#f1f5f9" borderRadius="3px" overflow="hidden">
                      <Box h="100%" borderRadius="3px" bg={item.color} w={`${item.pct}%`}
                        style={{ transition: 'width 0.6s ease' }} />
                    </Box>
                  </Box>
                ))}
              </VStack>
              <Box mt={4} pt={3} borderTop="1px solid #f1f5f9">
                <Text fontSize="10px" color="#cbd5e1">TAT = createdAt → updatedAt on approved leads</Text>
              </Box>
            </Panel>

            {/* Profession */}
            <Panel>
              <Text fontSize="14px" fontWeight="700" color="#0f172a" mb={0.5}>By Profession</Text>
              <Text fontSize="11px" color="#94a3b8" mb={4}>Top 5 in selected period</Text>
              {loading ? (
                <VStack spacing={2}>
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} height="30px" w="100%" borderRadius="6px"
                      startColor="#f8fafc" endColor="#f1f5f9" />
                  ))}
                </VStack>
              ) : profBreakdown.length === 0 ? (
                <Text fontSize="13px" color="#94a3b8">No data</Text>
              ) : (
                <VStack spacing={3} align="stretch">
                  {profBreakdown.map((p, i) => {
                    const pct = stats ? Math.round((p.value / stats.total) * 100) : 0
                    const c = profColors[i % profColors.length]
                    return (
                      <Box key={p.name}>
                        <Flex justify="space-between" mb={1.5}>
                          <Text fontSize="11px" color="#374151" fontWeight="500" textTransform="capitalize">
                            {cap(p.name)}
                          </Text>
                          <HStack spacing={1.5}>
                            <Text fontSize="11px" fontWeight="700" color="#0f172a">
                              {p.value.toLocaleString('en-IN')}
                            </Text>
                            <Text fontSize="10px" color="#94a3b8">({pct}%)</Text>
                          </HStack>
                        </Flex>
                        <Box h="5px" bg="#f1f5f9" borderRadius="3px" overflow="hidden">
                          <Box h="100%" borderRadius="3px" bg={c} w={`${pct}%`}
                            style={{ transition: 'width 0.6s ease' }} />
                        </Box>
                      </Box>
                    )
                  })}
                </VStack>
              )}
            </Panel>
          </VStack>
        </Grid>

      </Container>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f8fafc; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>
    </Box>
  )
}

export default Dashboard