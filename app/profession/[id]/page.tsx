'use client'
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  HStack,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Stack,
  Switch,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  Tooltip,
  FormControl,
  FormLabel,
  useToast,
  SimpleGrid,
  Stat,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { EditIcon, CheckCircleIcon, ExternalLinkIcon, CopyIcon, DownloadIcon, ArrowUpIcon } from '@chakra-ui/icons'

/* ================= Types ================= */

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'

type DoctorLead = {
  _id: string
  fullName: string
  mobileNumber: string
  email?: string
  registrationNumber?: string
  panNumber?: string
  aadharNumber?: string
  isVerified?: boolean
  cityOrPinCode: string
  profession?: string
  yearsOfPractice?: number
  qualification?: string[]
  practiceType?: string[]
  remarks?: string
  createdAt?: string
  monthlyGrossIncome?: number
  monthlyNetIncome?: number
  otherIncomeSources?: number
  monthlyEmi?: number
  activeLoans?: number
  loanType?: string[]
  hasOverdue?: boolean
  hasProperty?: boolean
  propertyValue?: number
  medicalEquipmentValue?: number
  cibilScore?: number | null
  consent?: boolean
  leadStatus?: string
  kyc?: any
}

type RemarksItem = {
  id: string
  text: string
  createdAt: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  isDeleted?: boolean
}

type UpdateTab = 'basic' | 'income' | 'obligations' | 'assets' | 'credit'

type UpdatePayload = Partial<{
  fullName: string
  mobileNumber: string
  email: string
  registrationNumber: string
  panNumber: string
  aadharNumber: string
  cityOrPinCode: string
  yearsOfPractice: number | '' | null
  qualification: string[]
  practiceType: string[]
  monthlyGrossIncome: number | ''
  monthlyNetIncome: number | ''
  otherIncomeSources: number | ''
  monthlyEmi: number | ''
  activeLoans: number | ''
  loanType: string[]
  hasOverdue: boolean
  hasProperty: boolean
  propertyValue: number | ''
  medicalEquipmentValue: number | ''
  cibilScore: number | '' | null
  _loanTypeDraft: string
  _qualificationDraft: string
  _practiceTypeDraft: string
}>

type TokenPayload = Partial<{
  role: AppRole
  name: string
  fullName: string
  email: string
  userId: string
  _id: string
}>

/* ================= Helpers (ALL UNCHANGED) ================= */

function valueOrDash(v?: string | null) {
  const s = (v ?? '').toString().trim()
  return s ? s : '—'
}

function formatINR(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return '₹N/A'
  try { return `₹${n.toLocaleString('en-IN')}` } catch { return `₹${n}` }
}

function toNumOrZero(v: any) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toNumOrNull(v: any) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeStringArray(v: any): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x).trim()).filter(Boolean)
}

function normalizeLoanType(v: any): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  const s = String(v).trim()
  return s ? [s] : []
}

function calcProfileCompletion(d: DoctorLead) {
  const loanTypes = normalizeLoanType((d as any).loanType)
  const fields = [
    !!d.fullName, !!d.mobileNumber, !!d.email, !!d.cityOrPinCode,
    !!d.registrationNumber, !!d.panNumber, !!d.aadharNumber,
    d.yearsOfPractice !== undefined && d.yearsOfPractice !== null,
    Array.isArray(d.qualification) && d.qualification.length > 0,
    Array.isArray(d.practiceType) && d.practiceType.length > 0,
    d.monthlyNetIncome !== undefined || d.monthlyGrossIncome !== undefined,
    d.otherIncomeSources !== undefined, d.monthlyEmi !== undefined,
    d.activeLoans !== undefined, loanTypes.length > 0,
    d.hasOverdue !== undefined, d.hasProperty !== undefined,
    d.propertyValue !== undefined, d.medicalEquipmentValue !== undefined,
    d.cibilScore !== undefined,
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

function parseRemarks(raw: any): RemarksItem[] {
  const s = String(raw ?? '').trim()
  if (!s) return []
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) {
        return arr
          .map((x) => ({
            id: String(x?.id ?? cryptoId()),
            text: String(x?.text ?? '').trim(),
            createdAt: String(x?.createdAt ?? new Date().toISOString()),
            createdBy: x?.createdBy ? String(x.createdBy) : undefined,
            updatedAt: x?.updatedAt ? String(x.updatedAt) : undefined,
            updatedBy: x?.updatedBy ? String(x.updatedBy) : undefined,
            isDeleted: Boolean(x?.isDeleted),
          }))
          .filter((x) => x.text)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      }
    } catch {}
  }
  return [{ id: cryptoId(), text: s, createdAt: new Date().toISOString(), createdBy: 'Legacy' }]
}

function cryptoId() {
  const g: any = globalThis as any
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  try {
    return d.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function validateRegistrationNumber(reg?: string) {
  const s = String(reg ?? '').trim().toUpperCase()
  if (!s) return { ok: false, status: 'MISSING' as const, normalized: '' }
  const ok = /^[A-Z0-9\/-]{5,25}$/.test(s)
  if (!ok) return { ok: false, status: 'INVALID_FORMAT' as const, normalized: s }
  return { ok: true, status: 'VALID_FORMAT' as const, normalized: s }
}

function pvFromEmi(emi: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 12 / 100
  const n = Math.max(1, months)
  if (r <= 0) return emi * n
  const pow = Math.pow(1 + r, n)
  const pv = (emi * (pow - 1)) / (r * pow)
  return Number.isFinite(pv) ? pv : 0
}

/* ================= Design Tokens ================= */

const TOKEN = {
  bg: '#f6f7fb',
  surface: '#ffffff',
  border: '#e8eaf0',
  borderStrong: '#d1d5e0',
  text: '#111827',
  textSub: '#6b7280',
  textMuted: '#9ca3af',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  blueMid: '#bfdbfe',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  amber: '#d97706',
  amberLight: '#fffbeb',
  red: '#dc2626',
  redLight: '#fef2f2',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  radius: '14px',
  radiusSm: '10px',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
}

/* ================= Sub-components ================= */

function SectionCard({ children, p = 5, ...rest }: any) {
  return (
    <Box
      bg={TOKEN.surface}
      border="1px solid"
      borderColor={TOKEN.border}
      borderRadius={TOKEN.radius}
      boxShadow={TOKEN.shadow}
      p={p}
      {...rest}
    >
      {children}
    </Box>
  )
}


function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box mb={4}>
      <Text fontSize="13px" fontWeight="700" color={TOKEN.text} letterSpacing="-0.1px">{title}</Text>
      {subtitle && <Text fontSize="12px" color={TOKEN.textMuted} mt="1px">{subtitle}</Text>}
    </Box>
  )
}

function DataRow({
  label, value, valueColor, hideDivider,
}: { label: string; value: string; valueColor?: string; hideDivider?: boolean }) {
  return (
    <HStack
      px={4} py={3}
      justify="space-between"
      align="center"
      borderBottom={hideDivider ? 'none' : '1px solid'}
      borderColor={TOKEN.border}
      _hover={{ bg: '#fafbff' }}
      transition="background 0.1s"
    >
      <Text fontSize="12px" fontWeight="600" color={TOKEN.textSub} whiteSpace="nowrap">{label}</Text>
      <Text
        fontSize="13px"
        fontWeight="700"
        color={valueColor || TOKEN.text}
        textAlign="right"
        maxW="58%"
        noOfLines={1}
      >
        {value}
      </Text>
    </HStack>
  )
}

function KpiCard({ title, value, helper, badge }: {
  title: string; value: string; helper?: string; badge?: { label: string; colorScheme: string }
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    green: { bg: TOKEN.greenLight, text: TOKEN.green },
    yellow: { bg: TOKEN.amberLight, text: TOKEN.amber },
    red: { bg: TOKEN.redLight, text: TOKEN.red },
    blue: { bg: TOKEN.blueLight, text: TOKEN.blue },
  }
  const scheme = badge ? (colorMap[badge.colorScheme] || colorMap.blue) : null

  return (
    <SectionCard>
      <HStack justify="space-between" mb={3} align="start">
        <Text fontSize="11px" fontWeight="700" color={TOKEN.textMuted} textTransform="uppercase" letterSpacing="0.7px">{title}</Text>
        {badge && scheme && (
          <Box px={2.5} py={0.5} bg={scheme.bg} borderRadius="full">
            <Text fontSize="11px" fontWeight="700" color={scheme.text}>{badge.label}</Text>
          </Box>
        )}
      </HStack>
      <Text fontSize="22px" fontWeight="800" color={TOKEN.text} letterSpacing="-0.5px" lineHeight="1">{value}</Text>
      {helper && <Text fontSize="11px" color={TOKEN.textMuted} mt={1.5} lineHeight="1.4">{helper}</Text>}
    </SectionCard>
  )
}

function ProfileRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const color = v < 40 ? TOKEN.red : v < 70 ? TOKEN.amber : TOKEN.green
  const gradient = `conic-gradient(${color} ${v * 3.6}deg, ${TOKEN.border} 0deg)`
  const label = v < 40 ? 'Incomplete' : v < 70 ? 'Average' : 'Strong'
  return (
    <HStack spacing={3}>
      <Box w="56px" h="56px" borderRadius="50%" bg={gradient} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
        <Box w="42px" h="42px" borderRadius="50%" bg={TOKEN.surface} display="flex" alignItems="center" justifyContent="center">
          <Text fontSize="11px" fontWeight="800" color={color}>{v}%</Text>
        </Box>
      </Box>
      <Box>
        <Text fontSize="12px" fontWeight="700" color={TOKEN.text}>Profile</Text>
        <Text fontSize="11px" fontWeight="600" color={color}>{label}</Text>
      </Box>
    </HStack>
  )
}

function VerifiedBadge({ isVerified, fallbackLabel, fallbackColorScheme }: {
  isVerified: boolean; fallbackLabel: string; fallbackColorScheme: string
}) {
  if (isVerified) {
    return (
      <Tooltip label="Verified" hasArrow>
        <HStack spacing={1} bg={TOKEN.greenLight} px={2} py={0.5} borderRadius="full">
          <CheckCircleIcon color={TOKEN.green} boxSize={3} />
          <Text fontSize="11px" fontWeight="700" color={TOKEN.green}>Verified</Text>
        </HStack>
      </Tooltip>
    )
  }
  const colorMap: Record<string, string> = {
    green: TOKEN.green, yellow: TOKEN.amber, red: TOKEN.red, gray: TOKEN.textSub,
  }
  const bgMap: Record<string, string> = {
    green: TOKEN.greenLight, yellow: TOKEN.amberLight, red: TOKEN.redLight, gray: '#f1f5f9',
  }
  return (
    <Box px={2.5} py={0.5} bg={bgMap[fallbackColorScheme] || '#f1f5f9'} borderRadius="full">
      <Text fontSize="11px" fontWeight="700" color={colorMap[fallbackColorScheme] || TOKEN.textSub}>{fallbackLabel}</Text>
    </Box>
  )
}

function SmallTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      borderRadius={TOKEN.radiusSm}
      fontWeight="600"
      fontSize="12px"
      h="32px"
      px={3.5}
      bg={active ? TOKEN.blue : 'transparent'}
      color={active ? 'white' : TOKEN.textSub}
      _hover={{ bg: active ? '#1d4ed8' : TOKEN.blueLight, color: active ? 'white' : TOKEN.blue }}
      transition="all 0.15s"
    >
      {children}
    </Button>
  )
}

/* ================= Main Page ================= */

export default function DoctorProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const id = String(params?.id || '')

  const [loading, setLoading] = React.useState(true)
  const [doctor, setDoctor] = React.useState<DoctorLead | null>(null)

  const [role, setRole] = React.useState<AppRole | null>(null)
  const [currentUserLabel, setCurrentUserLabel] = React.useState('')

  const [remarkText, setRemarkText] = React.useState('')
  const [savingRemark, setSavingRemark] = React.useState(false)
  const [remarks, setRemarks] = React.useState<RemarksItem[]>([])
  const [editingRemarkId, setEditingRemarkId] = React.useState<string | null>(null)
  const [editRemarkText, setEditRemarkText] = React.useState('')
  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false)
  const [savingUpdate, setSavingUpdate] = React.useState(false)
  const [updateTab, setUpdateTab] = React.useState<UpdateTab>('basic')
  const [form, setForm] = React.useState<UpdatePayload>({
    loanType: [], qualification: [], practiceType: [],
    _loanTypeDraft: '', _qualificationDraft: '', _practiceTypeDraft: '',
  })

  const [uploadingDoc, setUploadingDoc] = React.useState<string | null>(null)
  const [verifyingDoc, setVerifyingDoc] = React.useState<string | null>(null)
  const canEdit = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATION'
  const canUpload = role !== null && role !== undefined
  const [bankFile, setBankFile] = React.useState<File | null>(null)
  const [bankPassword, setBankPassword] = React.useState('')
  const [cibilFile, setCibilFile] = React.useState<File | null>(null)
  const [financialData, setFinancialData] = React.useState<Record<string, any> | null>(null)

  const getToken = () => {
    if (typeof window === 'undefined') return null
    const t = localStorage.getItem('token')
    if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null
    return t
  }

  React.useEffect(() => {
    const token = getToken()
    if (!token) return
    try {
      const decoded = jwtDecode<TokenPayload>(token)
      setRole((decoded?.role as AppRole) ?? null)
      const label = String(decoded?.fullName || decoded?.name || '').trim() || String(decoded?.email || '').trim() || 'User'
      const r = String(decoded?.role || '').trim()
      setCurrentUserLabel(r ? `${label} (${r})` : label)
    } catch { setRole(null); setCurrentUserLabel('') }
  }, [])

  const fetchDoctor = React.useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const token = getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Doctor not found', description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error', status: 'error' })
        router.push(`/profession-lead/new?mode=unknown&q=${encodeURIComponent(id)}`)
        return
      }
      setDoctor(data as DoctorLead)
      setRemarks(parseRemarks((data as any)?.remarks))
    } catch { toast({ title: 'Server error', status: 'error' }) }
    finally { setLoading(false) }
  }, [id, router, toast])

  React.useEffect(() => { void fetchDoctor() }, [fetchDoctor])

  const saveRemarksArray = async (nextRemarks: RemarksItem[]) => {
    const token = getToken()
    if (!token) { toast({ title: 'Please login first', status: 'info' }); router.push('/login'); return false }
    const prevRemarks = remarks
    const prevDoctor = doctor
    setRemarks(nextRemarks)
    setDoctor((prev) => (prev ? { ...prev, remarks: JSON.stringify(nextRemarks) } : prev))
    setSavingRemark(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ remarks: JSON.stringify(nextRemarks) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRemarks(prevRemarks); setDoctor(prevDoctor)
        toast({ title: 'Failed to save comment', description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error', status: 'error' })
        return false
      }
      setDoctor(data as DoctorLead)
      setRemarks(parseRemarks((data as any)?.remarks))
      return true
    } catch { setRemarks(prevRemarks); setDoctor(prevDoctor); toast({ title: 'Server error', status: 'error' }); return false }
    finally { setSavingRemark(false) }
  }

  const addRemark = async () => {
    const text = remarkText.trim()
    if (!text) return toast({ title: 'Please enter comment', status: 'warning' })
    if (text.length > 500) return toast({ title: 'Comment too long', description: 'Max 500 characters.', status: 'warning' })
    if (!canUpload) return toast({ title: 'Please login to add comment', status: 'info' })
    const now = new Date().toISOString()
    const item: RemarksItem = { id: cryptoId(), text, createdAt: now, createdBy: currentUserLabel || undefined }
    const next = [item, ...remarks].filter((x) => !x.isDeleted)
    const ok = await saveRemarksArray(next)
    if (ok) { setRemarkText(''); toast({ title: 'Comment added', status: 'success' }) }
  }

  const startEditRemark = (it: RemarksItem) => { if (!canEdit) return; setEditingRemarkId(it.id); setEditRemarkText(it.text) }
  const cancelEditRemark = () => { setEditingRemarkId(null); setEditRemarkText('') }

  const updateRemark = async () => {
    const idToEdit = editingRemarkId
    if (!idToEdit) return
    const text = editRemarkText.trim()
    if (!text) return toast({ title: 'Please enter comment', status: 'warning' })
    if (text.length > 500) return toast({ title: 'Comment too long', description: 'Max 500 characters.', status: 'warning' })
    const now = new Date().toISOString()
    const next = remarks.map((r) => r.id !== idToEdit ? r : { ...r, text, updatedAt: now, updatedBy: currentUserLabel || r.updatedBy })
    const ok = await saveRemarksArray(next)
    if (ok) { toast({ title: 'Comment updated', status: 'success' }); cancelEditRemark() }
  }

  const deleteRemark = async (rid: string) => {
    if (!canEdit) return
    const now = new Date().toISOString()
    const next = remarks.map((r) => r.id === rid ? { ...r, isDeleted: true, updatedAt: now, updatedBy: currentUserLabel || r.updatedBy } : r)
    const ok = await saveRemarksArray(next)
    if (ok) toast({ title: 'Comment removed', status: 'success' })
  }

  const openUpdate = () => {
    if (!canEdit) return
    const d = doctor
    if (!d) return
    setUpdateTab('basic')
    setForm({
      fullName: d.fullName ?? '', mobileNumber: d.mobileNumber ?? '', email: d.email ?? '',
      registrationNumber: d.registrationNumber ?? '', panNumber: d.panNumber ?? '', aadharNumber: d.aadharNumber ?? '',
      cityOrPinCode: d.cityOrPinCode ?? '', yearsOfPractice: d.yearsOfPractice ?? null,
      qualification: Array.isArray(d.qualification) ? d.qualification : [],
      practiceType: Array.isArray(d.practiceType) ? d.practiceType : [],
      _qualificationDraft: '', _practiceTypeDraft: '',
      monthlyGrossIncome: d.monthlyGrossIncome ?? 0, monthlyNetIncome: d.monthlyNetIncome ?? 0,
      otherIncomeSources: d.otherIncomeSources ?? 0, monthlyEmi: d.monthlyEmi ?? 0,
      activeLoans: d.activeLoans ?? 0, loanType: normalizeLoanType(d.loanType), _loanTypeDraft: '',
      hasOverdue: Boolean(d.hasOverdue), hasProperty: Boolean(d.hasProperty),
      propertyValue: d.propertyValue ?? 0, medicalEquipmentValue: d.medicalEquipmentValue ?? 0,
      cibilScore: d.cibilScore ?? null,
    })
    setIsUpdateOpen(true)
  }

  const closeUpdate = () => { if (savingUpdate) return; setIsUpdateOpen(false) }

  const saveUpdate = async () => {
    if (!canEdit) return toast({ title: 'Access denied', status: 'warning' })
    const token = getToken()
    if (!token) { toast({ title: 'Please login first', status: 'info' }); router.push('/login'); return }
    const payload: any = {}
    if (form.fullName !== undefined) payload.fullName = String(form.fullName ?? '').trim()
    if (form.mobileNumber !== undefined) payload.mobileNumber = String(form.mobileNumber ?? '').trim()
    if (form.email !== undefined) payload.email = String(form.email ?? '').trim().toLowerCase()
    if (form.registrationNumber !== undefined) payload.registrationNumber = String(form.registrationNumber ?? '').trim()
    if (form.panNumber !== undefined) payload.panNumber = String(form.panNumber ?? '').trim().toUpperCase()
    if (form.aadharNumber !== undefined) payload.aadharNumber = String(form.aadharNumber ?? '').trim()
    if (form.cityOrPinCode !== undefined) payload.cityOrPinCode = String(form.cityOrPinCode ?? '').trim()
    if (form.yearsOfPractice !== undefined) payload.yearsOfPractice = toNumOrNull(form.yearsOfPractice)
    if (form.qualification !== undefined) payload.qualification = normalizeStringArray(form.qualification)
    if (form.practiceType !== undefined) payload.practiceType = normalizeStringArray(form.practiceType)
    if (form.monthlyGrossIncome !== undefined) payload.monthlyGrossIncome = toNumOrZero(form.monthlyGrossIncome)
    if (form.monthlyNetIncome !== undefined) payload.monthlyNetIncome = toNumOrZero(form.monthlyNetIncome)
    if (form.otherIncomeSources !== undefined) payload.otherIncomeSources = toNumOrZero(form.otherIncomeSources)
    if (form.monthlyEmi !== undefined) payload.monthlyEmi = toNumOrZero(form.monthlyEmi)
    if (form.activeLoans !== undefined) payload.activeLoans = toNumOrZero(form.activeLoans)
    if (form.loanType !== undefined) payload.loanType = normalizeLoanType(form.loanType)
    if (form.hasOverdue !== undefined) payload.hasOverdue = Boolean(form.hasOverdue)
    if (form.hasProperty !== undefined) payload.hasProperty = Boolean(form.hasProperty)
    if (form.propertyValue !== undefined) payload.propertyValue = toNumOrZero(form.propertyValue)
    if (form.medicalEquipmentValue !== undefined) payload.medicalEquipmentValue = toNumOrZero(form.medicalEquipmentValue)
    if (form.cibilScore === null) payload.cibilScore = null
    if (form.cibilScore !== undefined && form.cibilScore !== null) payload.cibilScore = toNumOrNull(form.cibilScore)
    setSavingUpdate(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast({ title: 'Update failed', description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error', status: 'error' }); return }
      toast({ title: 'Profile updated', status: 'success' })
      setIsUpdateOpen(false)
      await fetchDoctor()
    } catch { toast({ title: 'Server error', status: 'error' }) }
    finally { setSavingUpdate(false) }
  }

  const onShareProfile = async () => {
    if (typeof window === 'undefined') return
    const doctorId = doctor?._id || id
    const url = `${window.location.origin}/profession-lead/${doctorId}`
    const shareText = `Doctor Profile: ${doctor?.fullName || 'N/A'}\nMobile: ${doctor?.mobileNumber || 'N/A'}\nLink: ${url}`
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: 'Doctor Profile', text: shareText, url }); toast({ title: 'Shared successfully', status: 'success' }); return }
    } catch {}
    try { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', description: 'Profile link copied to clipboard', status: 'success' }) }
    catch { toast({ title: 'Copy failed', description: url, status: 'info' }) }
  }

  const copyProfileLink = async () => {
    if (typeof window === 'undefined') return
    const doctorId = doctor?._id || id
    const url = `${window.location.origin}/doctor-lead/${doctorId}`
    try { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', status: 'success' }) }
    catch { toast({ title: 'Copy failed', description: url, status: 'info' }) }
  }

  const fileInputsRef = React.useRef<Record<string, HTMLInputElement | null>>({})

  const buildFileUrl = (fileUrl?: string | null): string | null => {
    if (!fileUrl) return null
    const s = String(fileUrl).trim()
    if (!s) return null
    if (/^https?:\/\//i.test(s)) return s
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
    return `${base}/${s.replace(/^\/+/, '')}`
  }

  const uploadFile = async (docKey: string, label: string, file: File | null) => {
    if (!doctor?._id) { toast({ title: 'Lead not found', status: 'error' }); return }
    if (!file) return
    const token = localStorage.getItem('token')
    if (!token) { toast({ title: 'Please login first', status: 'info' }); return }
    const formData = new FormData()
    formData.append('file', file)
    setUploadingDoc(docKey)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/kyc/upload/${doctor._id}/${docKey}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')
      toast({ title: `${label} uploaded successfully`, status: 'success' })
      await fetchDoctor()
    } catch (err: any) { toast({ title: 'Upload failed', description: err.message, status: 'error' }) }
    finally { setUploadingDoc(null) }
  }

const uploadBankStatement = async () => {

  if (!bankFile || !doctor?._id) {
    toast({
      title: 'Select file first',
      status: 'warning',
    });
    return;
  }

  try {

    const token = localStorage.getItem('token');

    const formData = new FormData();

    formData.append('file', bankFile);
    formData.append(
      'type',
      'bankStatement',
    );

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ocr/bank-statement`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      },
    );

    const data = await res.json();

    console.log(
      'BANK PARSED RESPONSE:',
      data,
    );

    setFinancialData((prev: any) => ({
      ...prev,
      bankStatement: data,
    }));

    toast({
      title: 'Bank Statement Parsed',
      status: 'success',
    });

  } catch (err: any) {

    console.log(err);

    toast({
      title: 'Upload failed',
      description: err.message,
      status: 'error',
    });
  }
};
const uploadCibil = async () => {

  if (!cibilFile || !doctor?._id) {

    toast({
      title: 'Select file first',
      status: 'warning',
    });

    return;
  }

  try {

    const token = localStorage.getItem('token');

    const formData = new FormData();

    formData.append('file', cibilFile);

    formData.append(
      'type',
      'cibil',
    );

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ocr/bank-statement`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      },
    );

    const data = await res.json();

    console.log(
      'CIBIL PARSED RESPONSE:',
      data,
    );

    setFinancialData((prev: any) => ({
      ...prev,
      cibil: data,
    }));

    toast({
      title: 'CIBIL Parsed',
      status: 'success',
    });

  } catch (err: any) {

    console.log(err);

    toast({
      title: 'Upload failed',
      description: err.message,
      status: 'error',
    });
  }
};
const checkEligibility = async () => {

  try {

    console.log(
      'FULL FINANCIAL DATA:',
      financialData,
    );

    const token =
      localStorage.getItem('token');

    const bankData =
      financialData?.bankStatement?.data || {};

    const cibilData =
      financialData?.cibil?.data || {};

    console.log(
      'BANK DATA:',
      bankData,
    );

    console.log(
      'CIBIL DATA:',
      cibilData,
    );

    const salary = Number(
      bankData?.salary || 0,
    );

    const obligations = Number(
      cibilData?.totalObligations || 0,
    );

    const cibilScore = Number(
      cibilData?.cibilScore || 0,
    );

    // FOIR
    const foir =
      salary > 0
        ? Number(
            (
              (obligations / salary) *
              100
            ).toFixed(2),
          )
        : 0;

    // ELIGIBLE LOAN
    const eligibleLoanAmount =
      salary > 0
        ? Math.max(
            0,
            (salary * 0.6 - obligations) * 36,
          )
        : 0;

    const payload = {

      salary,

      cibilScore,

      foir,

      loanAmount:
        eligibleLoanAmount,
    };

    console.log(
      'ELIGIBILITY PAYLOAD:',
      payload,
    );

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/eligibility/check`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify(payload),
      },
    );

    const data = await res.json();

    console.log(
      'ELIGIBILITY RESPONSE:',
      data,
    );

    setFinancialData((prev: any) => ({
      ...prev,
      eligibilityResult: data,
    }));

    toast({
      title: 'Eligibility Checked',
      description:
        `${data.matchedCount} lenders matched`,
      status: 'success',
    });

  } catch (err: any) {

    console.log(err);

    toast({
      title: 'Eligibility Failed',
      description: err.message,
      status: 'error',
    });
  }
};
  const handleViewDoc = (docKey: string) => {
    const doc = kycDocuments.find((d) => d.key === docKey)
    const url = buildFileUrl(doc?.fileUrl)
    if (!url) { toast({ title: 'File not uploaded', status: 'warning' }); return }
    window.open(url, '_blank')
  }

  const handleDownloadDoc = async (docKey: string) => {
    if (!doctor?._id) { toast({ title: 'Lead not found', status: 'error' }); return }
    try {
      const token = getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/download-kyc/${doctor._id}/${docKey}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Download failed')
      if (!data.url) throw new Error('File URL not received')
      window.open(data.url, '_blank')
    } catch (err: any) { toast({ title: 'Download failed', description: err.message, status: 'error' }) }
  }

  const verifyKyc = async (docType: string) => {
    if (!doctor?._id) { toast({ title: 'Lead not found', status: 'error' }); return }
    const token = getToken()
    if (!token) { toast({ title: 'Please login first', status: 'info' }); router.push('/login'); return }
    try {
      setVerifyingDoc(docType)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/kyc/verify/${doctor._id}/${docType}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Verification failed')
      toast({ title: `${docType.toUpperCase()} verified`, status: 'success' })
      await fetchDoctor()
    } catch (err: any) { toast({ title: 'Verification failed', description: err?.message || String(err), status: 'error' }) }
    finally { setVerifyingDoc(null) }
  }

  /* ── Derived values (ALL UNCHANGED) ── */
  const regCheck = validateRegistrationNumber(doctor?.registrationNumber)
  const uiVerified = Boolean(doctor?.isVerified) && regCheck.ok
  const verifiedLabel = uiVerified ? 'Verified' : regCheck.status === 'INVALID_FORMAT' ? 'Invalid Reg No' : 'Not Verified'
  const verifiedColor = uiVerified ? 'green' : regCheck.status === 'INVALID_FORMAT' ? 'red' : 'yellow'
  const profileCompletion = doctor ? calcProfileCompletion(doctor) : 0
  const riskBucket = profileCompletion >= 60 ? 'Low' : profileCompletion >= 50 ? 'Medium' : 'High'
  const riskColor = riskBucket === 'Low' ? 'green' : riskBucket === 'Medium' ? 'yellow' : 'red'
  const FOIR = riskBucket === 'Low' ? 0.6 : riskBucket === 'Medium' ? 0.5 : 0.4
  const income = Number(doctor?.monthlyNetIncome ?? doctor?.monthlyGrossIncome ?? 0) || 0
  const existingEmi = Number(doctor?.monthlyEmi ?? 0) || 0
  const eligibleEmi = income > 0 ? Math.max(0, income * FOIR - existingEmi) : 0
  const DEFAULT_RATE = 18
  const DEFAULT_TENURE = 36
  const maxLoanAmount = eligibleEmi > 0 ? pvFromEmi(eligibleEmi, DEFAULT_RATE, DEFAULT_TENURE) : 0
  const loanTypeText = normalizeLoanType(doctor?.loanType).join(', ')
  const visibleRemarks = (remarks || []).filter((r) => !r.isDeleted)

  const kycDocuments = React.useMemo(() => ([
    { key: 'pan', label: 'PAN Card', status: (doctor as any)?.kyc?.pan?.status || 'Pending', fileUrl: (doctor as any)?.kyc?.pan?.fileUrl },
    { key: 'aadhar', label: 'Aadhaar Card', status: (doctor as any)?.kyc?.aadhar?.status || 'Pending', fileUrl: (doctor as any)?.kyc?.aadhar?.fileUrl },
    { key: 'passport', label: 'Passport', status: (doctor as any)?.kyc?.passport?.status || 'Pending', fileUrl: (doctor as any)?.kyc?.passport?.fileUrl },
    { key: 'photo', label: 'Photo', status: (doctor as any)?.kyc?.photo?.status || 'Pending', fileUrl: (doctor as any)?.kyc?.photo?.fileUrl },
  ]), [doctor])

  /* ── Input styles ── */
  const inputSx = {
    bg: TOKEN.surface, border: '1px solid', borderColor: TOKEN.border,
    borderRadius: TOKEN.radiusSm, fontSize: '13px', fontWeight: '500',
    _focus: { borderColor: TOKEN.blue, boxShadow: `0 0 0 3px ${TOKEN.blueLight}` },
    _hover: { borderColor: TOKEN.borderStrong },
  }

  /* ─────────────── RENDER ─────────────── */
  return (
    <Box bg={TOKEN.bg} minH="100vh" pt="12px" transition="all 0.2s" fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif">
      <Container maxW="7xl" py={6} px={{ base: 4, md: 6 }}>

        {/* ── HERO CARD ── */}
        <SectionCard p={{ base: 4, md: 6 }} mb={5}>
          <HStack justify="space-between" align="start" spacing={5} flexWrap="wrap" gap={4}>

            {/* Left: Avatar + Name */}
            <HStack spacing={4} align="center" flex="1" minW="240px">
              <Box position="relative" flexShrink={0}>
                <Avatar
                  size="lg"
                  name={doctor?.fullName || doctor?.profession || 'User'}
                  bg="linear-gradient(135deg, #2563eb, #7c3aed)"
                  color="white"
                  fontWeight="800"
                />
                {uiVerified && (
                  <Box position="absolute" bottom="-2px" right="-2px" bg="white" borderRadius="full" p="1px">
                    <CheckCircleIcon color={TOKEN.green} boxSize={4} />
                  </Box>
                )}
              </Box>

              <Box>
                <Skeleton isLoaded={!loading}>
                  <HStack spacing={2} align="center" flexWrap="wrap">
                    <Heading fontSize="18px" fontWeight="800" color={TOKEN.text} letterSpacing="-0.3px">
                      {doctor?.fullName || '—'}
                    </Heading>
                    <VerifiedBadge isVerified={uiVerified} fallbackLabel={verifiedLabel} fallbackColorScheme={verifiedColor} />
                    {canEdit && (
                      <Tooltip label="Edit profile" hasArrow>
                        <IconButton
                          aria-label="Edit"
                          icon={<EditIcon boxSize={3.5} />}
                          size="xs"
                          variant="ghost"
                          borderRadius={TOKEN.radiusSm}
                          color={TOKEN.textMuted}
                          _hover={{ bg: TOKEN.blueLight, color: TOKEN.blue }}
                          onClick={openUpdate}
                        />
                      </Tooltip>
                    )}
                  </HStack>
                </Skeleton>

                <Skeleton isLoaded={!loading} mt={1.5}>
                  <HStack spacing={2} flexWrap="wrap">
                    <Box px={2.5} py={0.5} bg="#f1f5f9" borderRadius="full">
                      <Text fontSize="11px" fontWeight="700" color={TOKEN.textSub}>{doctor?.profession || 'Lead'}</Text>
                    </Box>
                    <Box px={2.5} py={0.5} bg={TOKEN.blueLight} borderRadius="full">
                      <Text fontSize="11px" fontWeight="700" color={TOKEN.blue}>#{doctor?._id?.slice(-6)}</Text>
                    </Box>
                    <Box px={2.5} py={0.5} bg={TOKEN.greenLight} borderRadius="full">
                      <Text fontSize="11px" fontWeight="700" color={TOKEN.green}>{doctor?.leadStatus || 'NEW'}</Text>
                    </Box>
                  </HStack>
                </Skeleton>

                <Skeleton isLoaded={!loading} mt={1}>
                  <Text fontSize="12px" color={TOKEN.textSub}>
                    {(doctor?.qualification || []).join(', ') || '—'}{' '}
                    <Text as="span" color={TOKEN.textMuted}>•</Text>{' '}
                    {doctor?.cityOrPinCode || '—'}
                  </Text>
                </Skeleton>
              </Box>
            </HStack>

            {/* Center: Profile ring */}
            <Box display={{ base: 'none', md: 'block' }}>
              <ProfileRing value={profileCompletion} />
            </Box>

            {/* Right: Quick info + actions */}
            <HStack spacing={4} align="start" flexWrap="wrap" justify="flex-end">
              <Box textAlign="right">
                <Text fontSize="10px" fontWeight="700" color={TOKEN.textMuted} textTransform="uppercase" letterSpacing="0.5px">Mobile</Text>
                <Skeleton isLoaded={!loading}>
                  <Text fontSize="14px" fontWeight="800" color={TOKEN.text} fontFamily="mono">{doctor?.mobileNumber || '—'}</Text>
                </Skeleton>
              </Box>
              <Box textAlign="right">
                <Text fontSize="10px" fontWeight="700" color={TOKEN.textMuted} textTransform="uppercase" letterSpacing="0.5px">Reg No</Text>
                <Skeleton isLoaded={!loading}>
                  <Text fontSize="14px" fontWeight="800" color={TOKEN.text}>{doctor?.registrationNumber || 'N/A'}</Text>
                </Skeleton>
              </Box>
              <Menu placement="bottom-end">
                <Tooltip label="More options" hasArrow>
                  <MenuButton
                    as={IconButton}
                    aria-label="Share"
                    icon={<Text fontSize="18px" lineHeight="1">⋮</Text>}
                    variant="ghost"
                    size="sm"
                    borderRadius={TOKEN.radiusSm}
                    color={TOKEN.textSub}
                    _hover={{ bg: TOKEN.blueLight, color: TOKEN.blue }}
                  />
                </Tooltip>
                <MenuList borderRadius={TOKEN.radius} boxShadow={TOKEN.shadowMd} border="1px solid" borderColor={TOKEN.border} p={1.5} minW="180px">
                  <MenuItem icon={<ExternalLinkIcon />} fontSize="13px" fontWeight="500" borderRadius={TOKEN.radiusSm} _hover={{ bg: TOKEN.blueLight }} onClick={onShareProfile}>Share Profile</MenuItem>
                  <MenuItem icon={<CopyIcon />} fontSize="13px" fontWeight="500" borderRadius={TOKEN.radiusSm} _hover={{ bg: TOKEN.blueLight }} onClick={copyProfileLink}>Copy Link</MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </HStack>

          {/* KPI Strip */}
          <Box mt={5} pt={4} borderTop="1px solid" borderColor={TOKEN.border}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <KpiCard
                title="Risk Bucket"
                value={riskBucket}
                helper={`FOIR: ${Math.round(FOIR * 100)}% based on risk`}
                badge={{ label: riskBucket, colorScheme: riskColor }}
              />
              <KpiCard
                title="Eligible EMI (Est.)"
                value={income > 0 ? formatINR(Math.round(eligibleEmi)) : '₹N/A'}
                helper={income > 0 ? `Income × FOIR (${Math.round(FOIR * 100)}%) − Existing EMI` : 'Add income to compute'}
              />
              <KpiCard
                title="Max Loan Amount (Est.)"
                value={income > 0 && eligibleEmi > 0 ? formatINR(Math.round(maxLoanAmount)) : '₹N/A'}
                helper={income > 0 && eligibleEmi > 0 ? `@ ${DEFAULT_RATE}% for ${DEFAULT_TENURE} months` : 'Add income & EMI to compute'}
              />
            </SimpleGrid>
          </Box>
        </SectionCard>

        {/* ── BODY: Insights + Activity ── */}
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>

          {/* ── Left: Financial Brain (spans 2 cols) ── */}
          <Box gridColumn={{ base: 'auto', lg: 'span 2' }}>
            <SectionCard p={{ base: 4, md: 5 }}>
              <SectionHeading title="Financial Brain Insights" subtitle="Captured & matched data points" />

              <Tabs variant="unstyled" colorScheme="blue">
                <TabList
                  bg="#f6f7fb"
                  borderRadius={TOKEN.radiusSm}
                  p="4px"
                  gap={1}
                  flexWrap="wrap"
                  mb={4}
                >
                  {['Basic', 'Income', 'Obligations', 'Assets', 'Credit', 'KYC', 'Financial Docs'].map((label) => (
                    <Tab
                      key={label}
                      fontSize="12px"
                      fontWeight="600"
                      px={3}
                      py={1.5}
                      borderRadius="8px"
                      color={TOKEN.textSub}
                      _selected={{ bg: TOKEN.surface, color: TOKEN.blue, boxShadow: TOKEN.shadow }}
                      _hover={{ color: TOKEN.blue }}
                      transition="all 0.15s"
                    >
                      {label}
                    </Tab>
                  ))}
                </TabList>

                <TabPanels>
                  {/* Basic */}
                  <TabPanel px={0} pt={0}>
                    <Box border="1px solid" borderColor={TOKEN.border} borderRadius={TOKEN.radiusSm} overflow="hidden">
                      <DataRow label="Full Name" value={valueOrDash(doctor?.fullName)} />
                      <DataRow label="Mobile" value={valueOrDash(doctor?.mobileNumber)} />
                      <DataRow label="Email" value={valueOrDash(doctor?.email)} />
                      <DataRow label="City / Pin" value={valueOrDash(doctor?.cityOrPinCode)} />
                      <DataRow label="Registration No" value={valueOrDash(doctor?.registrationNumber)} />
                      <DataRow label="PAN" value={valueOrDash(doctor?.panNumber)} />
                      <DataRow label="Aadhar" value={valueOrDash(doctor?.aadharNumber)} />
                      <DataRow label="Years of Practice" value={doctor?.yearsOfPractice != null ? String(doctor.yearsOfPractice) : '—'} />
                      <DataRow label="Qualification" value={valueOrDash((doctor?.qualification || []).join(', '))} />
                      <DataRow label="Practice Type" value={valueOrDash((doctor?.practiceType || []).join(', '))} hideDivider />
                    </Box>
                  </TabPanel>

                  {/* Income */}
                  <TabPanel px={0} pt={0}>
                    <Box border="1px solid" borderColor={TOKEN.border} borderRadius={TOKEN.radiusSm} overflow="hidden">
                      <DataRow label="Monthly Gross Income" value={formatINR(doctor?.monthlyGrossIncome ?? null)} />
                      <DataRow label="Monthly Net Income" value={formatINR(doctor?.monthlyNetIncome ?? null)} />
                      <DataRow label="Other Income Sources" value={formatINR(doctor?.otherIncomeSources ?? null)} hideDivider />
                    </Box>
                  </TabPanel>

                  {/* Obligations */}
                  <TabPanel px={0} pt={0}>
                    <Box border="1px solid" borderColor={TOKEN.border} borderRadius={TOKEN.radiusSm} overflow="hidden">
                      <DataRow label="Monthly EMI" value={formatINR(doctor?.monthlyEmi ?? null)} />
                      <DataRow label="Active Loans" value={doctor?.activeLoans != null ? String(doctor.activeLoans) : '—'} />
                      <DataRow label="Loan Type(s)" value={valueOrDash(loanTypeText)} />
                      <DataRow label="Has Overdue" value={doctor?.hasOverdue ? 'Yes' : 'No'} valueColor={doctor?.hasOverdue ? TOKEN.red : TOKEN.green} hideDivider />
                    </Box>
                  </TabPanel>

                  {/* Assets */}
                  <TabPanel px={0} pt={0}>
                    <Box border="1px solid" borderColor={TOKEN.border} borderRadius={TOKEN.radiusSm} overflow="hidden">
                      <DataRow label="Has Property" value={doctor?.hasProperty ? 'Yes' : 'No'} />
                      <DataRow label="Property Value" value={formatINR(doctor?.propertyValue ?? null)} />
                      <DataRow label="Medical Equipment Value" value={formatINR(doctor?.medicalEquipmentValue ?? null)} hideDivider />
                    </Box>
                  </TabPanel>

                  {/* Credit */}
                  <TabPanel px={0} pt={0}>
                    <Box border="1px solid" borderColor={TOKEN.border} borderRadius={TOKEN.radiusSm} overflow="hidden">
                      <DataRow
                        label="CIBIL Score"
                        value={doctor?.cibilScore !== undefined && doctor?.cibilScore !== null ? String(doctor.cibilScore) : 'Pending'}
                        valueColor={doctor?.cibilScore !== undefined && doctor?.cibilScore !== null ? TOKEN.text : TOKEN.red}
                        hideDivider
                      />
                    </Box>
                  </TabPanel>

                  {/* KYC */}
                  <TabPanel px={0} pt={0}>
                    <Stack spacing={2}>
                      {kycDocuments.map((doc) => {
                        const statusColors: Record<string, { bg: string; text: string }> = {
                          Verified: { bg: TOKEN.greenLight, text: TOKEN.green },
                          Rejected: { bg: TOKEN.redLight, text: TOKEN.red },
                          Uploaded: { bg: TOKEN.blueLight, text: TOKEN.blue },
                          Pending: { bg: TOKEN.amberLight, text: TOKEN.amber },
                        }
                        const sc = statusColors[doc.status] || statusColors.Pending
                        const isUploading = uploadingDoc === doc.key
                        const fileInputId = `file-input-${doc.key}`

                        return (
                          <Box
                            key={doc.key}
                            bg={TOKEN.surface}
                            border="1px solid"
                            borderColor={TOKEN.border}
                            borderRadius={TOKEN.radiusSm}
                            px={4} py={3}
                            _hover={{ borderColor: TOKEN.borderStrong }}
                            transition="border-color 0.15s"
                          >
                            <input
                              id={fileInputId}
                              ref={(el) => { fileInputsRef.current[doc.key] = el }}
                              type="file"
                              accept="image/*,.pdf"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null
                                uploadFile(doc.key, doc.label, file)
                              }}
                            />
                            <HStack justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Text fontSize="13px" fontWeight="600" color={TOKEN.text} minW="120px">{doc.label}</Text>
                                <Box px={2.5} py={0.5} bg={sc.bg} borderRadius="full">
                                  <Text fontSize="11px" fontWeight="700" color={sc.text}>{doc.status}</Text>
                                </Box>
                              </HStack>
                              <HStack spacing={1}>
                                <Tooltip label="Upload" hasArrow>
                                  <IconButton aria-label="Upload" icon={<ArrowUpIcon boxSize={3} />} size="xs" variant="ghost" borderRadius="8px" color={TOKEN.textSub} _hover={{ bg: TOKEN.blueLight, color: TOKEN.blue }}
                                    onClick={() => { const el = fileInputsRef.current[doc.key]; if (!el) return; try { el.value = '' } catch {}; el.click() }}
                                    isDisabled={!doctor?._id || isUploading} isLoading={isUploading}
                                  />
                                </Tooltip>
                                <Tooltip label="View" hasArrow>
                                  <IconButton aria-label="View" icon={<ExternalLinkIcon boxSize={3} />} size="xs" variant="ghost" borderRadius="8px" color={TOKEN.textSub} _hover={{ bg: TOKEN.blueLight, color: TOKEN.blue }}
                                    onClick={() => handleViewDoc(doc.key)} isDisabled={!buildFileUrl(doc.fileUrl)}
                                  />
                                </Tooltip>
                                <Tooltip label="Download" hasArrow>
                                  <IconButton aria-label="Download" icon={<DownloadIcon boxSize={3} />} size="xs" variant="ghost" borderRadius="8px" color={TOKEN.textSub} _hover={{ bg: TOKEN.blueLight, color: TOKEN.blue }}
                                    onClick={() => handleDownloadDoc(doc.key)} isDisabled={!buildFileUrl(doc.fileUrl)}
                                  />
                                </Tooltip>
                                {(role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OPERATION') && (
                                  <Tooltip label="Verify" hasArrow>
                                    <IconButton aria-label="Verify" icon={<CheckCircleIcon boxSize={3} />} size="xs" borderRadius="8px"
                                      bg={TOKEN.greenLight} color={TOKEN.green} _hover={{ bg: '#bbf7d0' }}
                                      onClick={() => verifyKyc(doc.key)} isLoading={verifyingDoc === doc.key}
                                    />
                                  </Tooltip>
                                )}
                              </HStack>
                            </HStack>
                          </Box>
                        )
                      })}
                    </Stack>
                  </TabPanel>

                  {/* Financial Docs */}
        {/* Financial Docs */}
<TabPanel px={0} pt={0}>

  <Stack spacing={4}>

    {/* Eligibility Result */}
    {financialData?.eligibilityResult && (
      <Box
        border="1px solid"
        borderColor={TOKEN.border}
        borderRadius={TOKEN.radiusSm}
        p={4}
        bg={TOKEN.surface}
      >
        <Text
          fontSize="14px"
          fontWeight="700"
          color={TOKEN.text}
          mb={4}
        >
          Eligibility Result
        </Text>

        <Stack spacing={3}>

          {financialData?.eligibilityResult?.matchedLenders?.length > 0 ? (

            financialData?.eligibilityResult?.matchedLenders?.map(
              (item: any, index: number) => (

                <Box
                  key={index}
                  border="1px solid"
                  borderColor={TOKEN.border}
                  borderRadius={TOKEN.radiusSm}
                  p={3}
                  bg="#fafbff"
                >
                  <HStack justify="space-between">

                    <Box>
                      <Text
                        fontSize="13px"
                        fontWeight="700"
                        color={TOKEN.text}
                      >
                        {item.lenderName}
                      </Text>

                      <Text
                        fontSize="11px"
                        color={TOKEN.textMuted}
                      >
                        {item.lenderId}
                      </Text>
                    </Box>

                    <Box
                      px={3}
                      py={1}
                      borderRadius="full"
                      bg={
                        item.eligible
                          ? TOKEN.greenLight
                          : TOKEN.redLight
                      }
                    >
                      <Text
                        fontSize="11px"
                        fontWeight="700"
                        color={
                          item.eligible
                            ? TOKEN.green
                            : TOKEN.red
                        }
                      >
                        {item.eligible
                          ? 'Eligible'
                          : 'Rejected'}
                      </Text>
                    </Box>

                  </HStack>

                  <Box mt={2}>
                    {item.reasons?.map(
                      (reason: string, idx: number) => (
                        <Text
                          key={idx}
                          fontSize="11px"
                          color={TOKEN.textSub}
                        >
                          • {reason}
                        </Text>
                      ),
                    )}
                  </Box>
                </Box>
              ),
            )

          ) : (

            <Box
              border="1px dashed"
              borderColor={TOKEN.border}
              borderRadius={TOKEN.radiusSm}
              p={4}
              textAlign="center"
            >
              <Text
                fontSize="13px"
                color={TOKEN.red}
                fontWeight="600"
              >
                No Eligible Lenders Found
              </Text>
            </Box>

          )}

        </Stack>
      </Box>
    )}

{financialData?.eligibilityResult && (() => {
  const bankData =
    financialData?.bankStatement?.data ?? {};

  const cibilData =
    financialData?.cibil?.data ?? {};

  console.log(
    'BANK DATA FINAL:',
    bankData,
  );

  console.log(
    'CIBIL DATA FINAL:',
    cibilData,
  );

  /* =========================================
      VALUES
  ========================================= */

  const salary =
    bankData?.salary ?? null;

  const obligations =
    cibilData?.totalObligations ?? 0;

  const cibilScore =
    cibilData?.cibilScore ?? null;

  /* =========================================
      FOIR
  ========================================= */

  const foir =
    salary && salary > 0
      ? Number(
          (
            (obligations / salary) *
            100
          ).toFixed(2),
        )
      : 0;

  /* =========================================
      ELIGIBLE EMI
  ========================================= */

  const eligibleEmi =
    salary
      ? Math.max(
          0,
          salary * 0.6 - obligations,
        )
      : 0;

  /* =========================================
      LOAN CALCULATION
  ========================================= */

  const eligibleLoanAmount =
    pvFromEmi(
      eligibleEmi,
      12,
      84,
    );

  /* =========================================
      SAFETY LIMIT
  ========================================= */

  let finalLoanAmount =
    eligibleLoanAmount;

  if (
    finalLoanAmount > 50000000
  ) {

    finalLoanAmount = 0;
  }

  /* =========================================
      ELIGIBILITY
  ========================================= */

  const isEligible =
    financialData?.eligibilityResult
      ?.matchedCount > 0 &&
    salary &&
    cibilScore;

  console.log({
    salary,
    obligations,
    cibilScore,
    foir,
    eligibleLoanAmount,
    finalLoanAmount,
  });

  return (

    <Box
      border="1px solid"
      borderColor={
        isEligible
          ? '#86efac'
          : '#fecaca'
      }
      bg={
        isEligible
          ? TOKEN.greenLight
          : TOKEN.redLight
      }
      borderRadius={TOKEN.radiusSm}
      p={5}
    >

      {/* =========================================
          HEADER
      ========================================= */}

      <HStack
        justify="space-between"
        align="start"
        mb={4}
      >

        <Box>

          <Text
            fontSize="18px"
            fontWeight="800"
            color={
              isEligible
                ? TOKEN.green
                : TOKEN.red
            }
          >
            {isEligible
              ? 'Eligible'
              : 'Not Eligible'}
          </Text>

          <Text
            fontSize="12px"
            color={TOKEN.textSub}
            mt={1}
          >
            Based on uploaded bank statement
            and CIBIL report
          </Text>

        </Box>

        <Box
          px={3}
          py={1}
          borderRadius="full"
          bg={
            isEligible
              ? TOKEN.green
              : TOKEN.red
          }
        >
          <Text
            fontSize="11px"
            fontWeight="700"
            color="white"
          >
            {financialData?.eligibilityResult
              ?.matchedCount || 0}{' '}
            Lenders Matched
          </Text>
        </Box>

      </HStack>

      {/* =========================================
          SUMMARY GRID
      ========================================= */}

      <SimpleGrid
        columns={{
          base: 1,
          md: 2,
        }}
        spacing={4}
      >

        {/* SALARY */}

        <Box>

          <Text
            fontSize="11px"
            color={TOKEN.textMuted}
            fontWeight="600"
            textTransform="uppercase"
          >
            Salary
          </Text>

          <Text
            fontSize="20px"
            fontWeight="800"
            color={TOKEN.text}
          >
            {
              salary
                ? `₹${salary.toLocaleString(
                    'en-IN',
                  )}`
                : 'Not Parsed'
            }
          </Text>

        </Box>

        {/* CIBIL */}

        <Box>

          <Text
            fontSize="11px"
            color={TOKEN.textMuted}
            fontWeight="600"
            textTransform="uppercase"
          >
            CIBIL Score
          </Text>

          <Text
            fontSize="20px"
            fontWeight="800"
            color={
              cibilScore
                ? TOKEN.text
                : TOKEN.red
            }
          >
            {
              cibilScore ??
              'Not Parsed'
            }
          </Text>

        </Box>

        {/* FOIR */}

        <Box>

          <Text
            fontSize="11px"
            color={TOKEN.textMuted}
            fontWeight="600"
            textTransform="uppercase"
          >
            FOIR
          </Text>

          <Text
            fontSize="20px"
            fontWeight="800"
            color={TOKEN.text}
          >
            {
              Number.isFinite(foir)
                ? `${foir}%`
                : 'N/A'
            }
          </Text>

        </Box>

        {/* LOAN AMOUNT */}

        <Box>

          <Text
            fontSize="11px"
            color={TOKEN.textMuted}
            fontWeight="600"
            textTransform="uppercase"
          >
            Eligible Loan Amount
          </Text>

          <Text
            fontSize="20px"
            fontWeight="800"
            color={
              isEligible
                ? TOKEN.green
                : TOKEN.red
            }
          >
            {
              finalLoanAmount > 0
                ? `₹${Math.round(
                    finalLoanAmount,
                  ).toLocaleString(
                    'en-IN',
                  )}`
                : 'Invalid'
            }
          </Text>

        </Box>

      </SimpleGrid>

      {/* =========================================
          WARNINGS
      ========================================= */}

      <Stack mt={4} spacing={2}>

        {!salary && (

          <Box
            bg={TOKEN.amberLight}
            borderRadius={TOKEN.radiusSm}
            px={3}
            py={2}
          >
            <Text
              fontSize="12px"
              fontWeight="600"
              color={TOKEN.amber}
            >
              Salary not parsed from
              bank statement
            </Text>
          </Box>
        )}

        {!cibilScore && (

          <Box
            bg={TOKEN.redLight}
            borderRadius={TOKEN.radiusSm}
            px={3}
            py={2}
          >
            <Text
              fontSize="12px"
              fontWeight="600"
              color={TOKEN.red}
            >
              CIBIL score not parsed
              from report
            </Text>
          </Box>
        )}

      </Stack>

    </Box>
  );
})()}
    <SimpleGrid
      columns={{ base: 1, md: 2 }}
      spacing={4}
    >

      {/* Bank Statement */}
      <Box
        border="1px solid"
        borderColor={TOKEN.border}
        borderRadius={TOKEN.radiusSm}
        p={4}
      >

        <Text
          fontSize="13px"
          fontWeight="700"
          color={TOKEN.text}
          mb={3}
        >
          Bank Statement
        </Text>

        <Stack spacing={3}>

        <Input
  type="file"
  onChange={(e) => {

    console.log(
      'BANK FILE:',
      e.target.files,
    );

    setBankFile(
      e.target.files?.[0] || null,
    );
  }}
/>

          <Input
            size="sm"
            placeholder="PDF Password (optional)"
            value={bankPassword}
            onChange={(e) =>
              setBankPassword(e.target.value)
            }
            {...inputSx}
          />

          <Button
            size="sm"
            h="36px"
            bg={TOKEN.blue}
            color="white"
            borderRadius={TOKEN.radiusSm}
            _hover={{ bg: '#1d4ed8' }}
            onClick={uploadBankStatement}
            isDisabled={!bankFile}
          >
            Upload & Analyze
          </Button>

        </Stack>
      </Box>

      {/* CIBIL */}
      <Box
        border="1px solid"
        borderColor={TOKEN.border}
        borderRadius={TOKEN.radiusSm}
        p={4}
      >

        <Text
          fontSize="13px"
          fontWeight="700"
          color={TOKEN.text}
          mb={3}
        >
          CIBIL Report
        </Text>

        <Stack spacing={3}>

         <Input
  type="file"
  onChange={(e) => {

    console.log(
      'CIBIL FILE:',
      e.target.files,
    );

    setCibilFile(
      e.target.files?.[0] || null,
    );
  }}
/>
          <Button
            size="sm"
            h="36px"
            bg={TOKEN.green}
            color="white"
            borderRadius={TOKEN.radiusSm}
            _hover={{ bg: '#15803d' }}
            onClick={uploadCibil}
            isDisabled={!cibilFile}
          >
            Upload CIBIL
          </Button>

        </Stack>
      </Box>

    </SimpleGrid>

    <Button
      size="md"
      h="42px"
      fontSize="14px"
      fontWeight="700"
      bg={TOKEN.purple}
      color="white"
      borderRadius={TOKEN.radiusSm}
      _hover={{ bg: '#6d28d9' }}
      onClick={checkEligibility}
    >
      Check Eligibility
    </Button>

  </Stack>

</TabPanel>
                </TabPanels>
              </Tabs>
            </SectionCard>
          </Box>

          {/* ── Right: Interaction Log ── */}
          <Box>
            <SectionCard p={{ base: 4, md: 5 }} h="100%">
              <SectionHeading title="Interaction Log" subtitle="Comments with time & history" />

              {/* Comment box */}
              <Box mb={4}>
                <Textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Write a comment…"
                  rows={3}
                  fontSize="13px"
                  borderRadius={TOKEN.radiusSm}
                  border="1px solid"
                  borderColor={TOKEN.border}
                  bg="#fafbff"
                  _focus={{ borderColor: TOKEN.blue, boxShadow: `0 0 0 3px ${TOKEN.blueLight}` }}
                  resize="none"
                />
                <HStack justify="space-between" mt={2}>
                  <Text fontSize="11px" color={TOKEN.textMuted}>{remarkText.trim().length}/500</Text>
                  <Button
                    size="sm" h="32px" px={3} fontSize="12px" fontWeight="600"
                    bg={TOKEN.blue} color="white" borderRadius={TOKEN.radiusSm}
                    _hover={{ bg: '#1d4ed8' }}
                    onClick={addRemark} isLoading={savingRemark} loadingText="Saving…"
                    isDisabled={!canEdit}
                  >
                    Add Comment
                  </Button>
                </HStack>
              </Box>

              <Box borderTop="1px solid" borderColor={TOKEN.border} pt={4}>
                {loading ? (
                  <Stack spacing={3}>
                    <Skeleton height="12px" borderRadius="4px" />
                    <Skeleton height="12px" borderRadius="4px" />
                    <Skeleton height="12px" borderRadius="4px" />
                  </Stack>
                ) : visibleRemarks.length ? (
                  <Stack spacing={3}>
                    {visibleRemarks.map((it) => {
                      const isEditing = editingRemarkId === it.id
                      const by = it.createdBy || 'User'
                      const time = formatDateTime(it.updatedAt || it.createdAt)
                      const editedBy = it.updatedBy || it.createdBy

                      return (
                        <Box
                          key={it.id}
                          bg="#fafbff"
                          border="1px solid"
                          borderColor={TOKEN.border}
                          borderRadius={TOKEN.radiusSm}
                          p={3}
                          _hover={{ borderColor: TOKEN.borderStrong }}
                          transition="border-color 0.15s"
                        >
                          <HStack justify="space-between" align="start">
                            <HStack spacing={2.5} align="start" flex="1">
                              <Avatar size="xs" name={by} bg="linear-gradient(135deg, #2563eb, #7c3aed)" color="white" flexShrink={0} mt="1px" />
                              <Box flex="1">
                                <HStack spacing={2} align="center" flexWrap="wrap">
                                  <Text fontSize="12px" fontWeight="700" color={TOKEN.text}>{by}</Text>
                                  <Text fontSize="11px" color={TOKEN.textMuted}>· {time}</Text>
                                  {it.updatedAt && (
                                    <Tooltip label={editedBy ? `Edited by ${editedBy}` : 'Edited'} hasArrow>
                                      <Box px={1.5} bg={TOKEN.purpleLight} borderRadius="full">
                                        <Text fontSize="10px" fontWeight="600" color={TOKEN.purple}>edited</Text>
                                      </Box>
                                    </Tooltip>
                                  )}
                                </HStack>

                                {!isEditing ? (
                                  <Text mt={1.5} fontSize="12px" color={TOKEN.textSub} whiteSpace="pre-wrap" lineHeight="1.5">{it.text}</Text>
                                ) : (
                                  <Box mt={2}>
                                    <Textarea
                                      value={editRemarkText}
                                      onChange={(e) => setEditRemarkText(e.target.value)}
                                      rows={3} fontSize="13px"
                                      borderRadius={TOKEN.radiusSm} border="1px solid" borderColor={TOKEN.border}
                                      _focus={{ borderColor: TOKEN.blue, boxShadow: `0 0 0 3px ${TOKEN.blueLight}` }}
                                      resize="none"
                                    />
                                    <HStack justify="space-between" mt={2}>
                                      <Text fontSize="11px" color={TOKEN.textMuted}>{editRemarkText.trim().length}/500</Text>
                                      <HStack spacing={2}>
                                        <Button size="xs" variant="ghost" fontSize="12px" borderRadius="8px"
                                          onClick={cancelEditRemark} isDisabled={savingRemark}>Cancel</Button>
                                        <Button size="xs" bg={TOKEN.blue} color="white" fontSize="12px" borderRadius="8px"
                                          _hover={{ bg: '#1d4ed8' }} onClick={updateRemark}
                                          isLoading={savingRemark} loadingText="Saving…">Save</Button>
                                      </HStack>
                                    </HStack>
                                  </Box>
                                )}
                              </Box>
                            </HStack>

                            {canEdit && !isEditing && (
                              <HStack spacing={0.5} flexShrink={0}>
                                <Tooltip label="Edit" hasArrow>
                                  <IconButton aria-label="Edit" size="xs" variant="ghost" icon={<EditIcon boxSize={3} />}
                                    borderRadius="8px" color={TOKEN.textMuted} _hover={{ bg: TOKEN.blueLight, color: TOKEN.blue }}
                                    onClick={() => startEditRemark(it)} isDisabled={savingRemark}
                                  />
                                </Tooltip>
                                <Tooltip label="Delete" hasArrow>
                                  <IconButton aria-label="Delete" size="xs" variant="ghost" icon={<Text fontSize="13px">🗑️</Text>}
                                    borderRadius="8px" color={TOKEN.textMuted} _hover={{ bg: TOKEN.redLight }}
                                    onClick={() => deleteRemark(it.id)} isDisabled={savingRemark}
                                  />
                                </Tooltip>
                              </HStack>
                            )}
                          </HStack>
                        </Box>
                      )
                    })}
                  </Stack>
                ) : (
                  <Box textAlign="center" py={6}>
                    <Text fontSize="24px" mb={1.5}>💬</Text>
                    <Text fontSize="13px" color={TOKEN.textMuted} fontWeight="500">No comments yet.</Text>
                  </Box>
                )}
              </Box>
            </SectionCard>
          </Box>
        </SimpleGrid>

        {/* ── Update Modal ── */}
        {canEdit && (
          <Modal isOpen={isUpdateOpen} onClose={closeUpdate} size="xl" isCentered scrollBehavior="inside">
            <ModalOverlay bg="rgba(0,0,0,0.3)" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="16px" border="1px solid" borderColor={TOKEN.border} boxShadow={TOKEN.shadowMd}>
              <ModalHeader fontSize="15px" fontWeight="800" color={TOKEN.text} borderBottom="1px solid" borderColor={TOKEN.border} pb={4}>
                Update {doctor?.profession || 'Lead'} Profile
              </ModalHeader>
              <ModalCloseButton top={3.5} right={4} />

              <ModalBody pt={4} pb={2}>
                {/* Tab strip */}
                <HStack bg="#f6f7fb" borderRadius={TOKEN.radiusSm} p="4px" spacing={1} mb={5} flexWrap="wrap">
                  {(['basic', 'income', 'obligations', 'assets', 'credit'] as UpdateTab[]).map((t) => (
                    <SmallTab key={t} active={updateTab === t} onClick={() => setUpdateTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SmallTab>
                  ))}
                </HStack>

                {/* Form fields — identical logic, upgraded input styling */}
                {updateTab === 'basic' && (
                  <Stack spacing={4}>
                    {[
                      { label: 'Full Name', key: 'fullName' },
                      { label: 'Mobile', key: 'mobileNumber' },
                      { label: 'Email', key: 'email' },
                      { label: 'City / Pin', key: 'cityOrPinCode' },
                      { label: 'Registration Number', key: 'registrationNumber' },
                      { label: 'PAN', key: 'panNumber', upper: true },
                      { label: 'Aadhar', key: 'aadharNumber' },
                    ].map(({ label, key, upper }) => (
                      <FormControl key={key}>
                        <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>{label}</FormLabel>
                        <Input
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: upper ? e.target.value.toUpperCase() : e.target.value }))}
                          {...inputSx} size="sm" h="38px"
                        />
                      </FormControl>
                    ))}

                    <FormControl>
                      <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>Years of Practice</FormLabel>
                      <Input type="number" {...inputSx} size="sm" h="38px"
                        value={form.yearsOfPractice ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, yearsOfPractice: e.target.value === '' ? null : Number(e.target.value) }))} />
                    </FormControl>

                    {/* Qualification */}
                    <FormControl>
                      <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>Qualification</FormLabel>
                      <HStack>
                        <Input {...inputSx} size="sm" h="38px" value={form._qualificationDraft ?? ''}
                          onChange={(e) => setForm((p) => ({ ...p, _qualificationDraft: e.target.value }))}
                          placeholder="e.g., MBBS, MD" />
                        <Button size="sm" h="38px" px={4} bg={TOKEN.blue} color="white" borderRadius={TOKEN.radiusSm} fontSize="12px" fontWeight="600" _hover={{ bg: '#1d4ed8' }}
                          onClick={() => {
                            const draft = String(form._qualificationDraft ?? '').trim()
                            if (!draft) return
                            setForm((p) => ({ ...p, qualification: Array.from(new Set([...(p.qualification || []), draft])), _qualificationDraft: '' }))
                          }}>Add</Button>
                      </HStack>
                      <HStack mt={2} spacing={2} flexWrap="wrap">
                        {(form.qualification || []).length ? (form.qualification || []).map((t) => (
                          <Tag key={t} size="sm" borderRadius="full" bg={TOKEN.blueLight} color={TOKEN.blue}>
                            <TagLabel fontSize="12px">{t}</TagLabel>
                            <TagCloseButton onClick={() => setForm((p) => ({ ...p, qualification: (p.qualification || []).filter((x) => x !== t) }))} />
                          </Tag>
                        )) : <Text fontSize="12px" color={TOKEN.textMuted}>None added.</Text>}
                      </HStack>
                    </FormControl>

                    {/* Practice Type */}
                    <FormControl>
                      <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>Practice Type</FormLabel>
                      <HStack>
                        <Input {...inputSx} size="sm" h="38px" value={form._practiceTypeDraft ?? ''}
                          onChange={(e) => setForm((p) => ({ ...p, _practiceTypeDraft: e.target.value }))}
                          placeholder="e.g., Clinic, Hospital" />
                        <Button size="sm" h="38px" px={4} bg={TOKEN.blue} color="white" borderRadius={TOKEN.radiusSm} fontSize="12px" fontWeight="600" _hover={{ bg: '#1d4ed8' }}
                          onClick={() => {
                            const draft = String(form._practiceTypeDraft ?? '').trim()
                            if (!draft) return
                            setForm((p) => ({ ...p, practiceType: Array.from(new Set([...(p.practiceType || []), draft])), _practiceTypeDraft: '' }))
                          }}>Add</Button>
                      </HStack>
                      <HStack mt={2} spacing={2} flexWrap="wrap">
                        {(form.practiceType || []).length ? (form.practiceType || []).map((t) => (
                          <Tag key={t} size="sm" borderRadius="full" bg={TOKEN.blueLight} color={TOKEN.blue}>
                            <TagLabel fontSize="12px">{t}</TagLabel>
                            <TagCloseButton onClick={() => setForm((p) => ({ ...p, practiceType: (p.practiceType || []).filter((x) => x !== t) }))} />
                          </Tag>
                        )) : <Text fontSize="12px" color={TOKEN.textMuted}>None added.</Text>}
                      </HStack>
                    </FormControl>
                  </Stack>
                )}

                {updateTab === 'income' && (
                  <Stack spacing={4}>
                    {[
                      { label: 'Monthly Gross Income', key: 'monthlyGrossIncome' },
                      { label: 'Monthly Net Income', key: 'monthlyNetIncome' },
                      { label: 'Other Income Sources', key: 'otherIncomeSources' },
                    ].map(({ label, key }) => (
                      <FormControl key={key}>
                        <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>{label}</FormLabel>
                        <Input type="number" {...inputSx} size="sm" h="38px"
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value === '' ? '' : Number(e.target.value) }))} />
                      </FormControl>
                    ))}
                  </Stack>
                )}

                {updateTab === 'obligations' && (
                  <Stack spacing={4}>
                    {[
                      { label: 'Monthly EMI', key: 'monthlyEmi' },
                      { label: 'Active Loans', key: 'activeLoans' },
                    ].map(({ label, key }) => (
                      <FormControl key={key}>
                        <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>{label}</FormLabel>
                        <Input type="number" {...inputSx} size="sm" h="38px"
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value === '' ? '' : Number(e.target.value) }))} />
                      </FormControl>
                    ))}

                    <FormControl>
                      <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>Loan Type(s)</FormLabel>
                      <HStack>
                        <Input {...inputSx} size="sm" h="38px" value={form._loanTypeDraft ?? ''}
                          onChange={(e) => setForm((p) => ({ ...p, _loanTypeDraft: e.target.value }))}
                          placeholder="e.g., Home, Equipment" />
                        <Button size="sm" h="38px" px={4} bg={TOKEN.blue} color="white" borderRadius={TOKEN.radiusSm} fontSize="12px" fontWeight="600" _hover={{ bg: '#1d4ed8' }}
                          onClick={() => {
                            const draft = String(form._loanTypeDraft ?? '').trim()
                            if (!draft) return
                            setForm((p) => ({ ...p, loanType: Array.from(new Set([...(p.loanType || []), draft])), _loanTypeDraft: '' }))
                          }}>Add</Button>
                      </HStack>
                      <HStack mt={2} spacing={2} flexWrap="wrap">
                        {(form.loanType || []).length ? (form.loanType || []).map((t) => (
                          <Tag key={t} size="sm" borderRadius="full" bg={TOKEN.blueLight} color={TOKEN.blue}>
                            <TagLabel fontSize="12px">{t}</TagLabel>
                            <TagCloseButton onClick={() => setForm((p) => ({ ...p, loanType: (p.loanType || []).filter((x) => x !== t) }))} />
                          </Tag>
                        )) : <Text fontSize="12px" color={TOKEN.textMuted}>None added.</Text>}
                      </HStack>
                    </FormControl>

                    <FormControl display="flex" alignItems="center" justifyContent="space-between"
                      bg="#fafbff" border="1px solid" borderColor={TOKEN.border} borderRadius={TOKEN.radiusSm} px={4} py={3}>
                      <FormLabel mb="0" fontSize="13px" fontWeight="600" color={TOKEN.text}>Has Overdue?</FormLabel>
                      <Switch isChecked={Boolean(form.hasOverdue)} onChange={(e) => setForm((p) => ({ ...p, hasOverdue: e.target.checked }))} colorScheme="blue" />
                    </FormControl>
                  </Stack>
                )}

                {updateTab === 'assets' && (
                  <Stack spacing={4}>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between"
                      bg="#fafbff" border="1px solid" borderColor={TOKEN.border} borderRadius={TOKEN.radiusSm} px={4} py={3}>
                      <FormLabel mb="0" fontSize="13px" fontWeight="600" color={TOKEN.text}>Has Property?</FormLabel>
                      <Switch isChecked={Boolean(form.hasProperty)} onChange={(e) => setForm((p) => ({ ...p, hasProperty: e.target.checked }))} colorScheme="blue" />
                    </FormControl>
                    {[
                      { label: 'Property Value', key: 'propertyValue' },
                      { label: 'Medical Equipment Value', key: 'medicalEquipmentValue' },
                    ].map(({ label, key }) => (
                      <FormControl key={key}>
                        <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>{label}</FormLabel>
                        <Input type="number" {...inputSx} size="sm" h="38px"
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value === '' ? '' : Number(e.target.value) }))} />
                      </FormControl>
                    ))}
                  </Stack>
                )}

                {updateTab === 'credit' && (
                  <Stack spacing={4}>
                    <FormControl>
                      <FormLabel fontSize="12px" fontWeight="700" color={TOKEN.textSub} mb={1}>CIBIL Score</FormLabel>
                      <Input type="number" {...inputSx} size="sm" h="38px" placeholder="0 – 900"
                        value={form.cibilScore ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, cibilScore: e.target.value === '' ? null : Number(e.target.value) }))} />
                    </FormControl>
                  </Stack>
                )}
              </ModalBody>

              <ModalFooter borderTop="1px solid" borderColor={TOKEN.border} pt={4}>
                <HStack w="100%" justify="space-between">
                  <Button variant="ghost" fontSize="13px" fontWeight="600" borderRadius={TOKEN.radiusSm}
                    onClick={closeUpdate} isDisabled={savingUpdate}>Cancel</Button>
                  <Button fontSize="13px" fontWeight="700" h="38px" px={5} bg={TOKEN.blue} color="white"
                    borderRadius={TOKEN.radiusSm} _hover={{ bg: '#1d4ed8' }}
                    onClick={saveUpdate} isLoading={savingUpdate} loadingText="Saving…">Save & Update</Button>
                </HStack>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </Container>
    </Box>
  )
}