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
  Progress,
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
import { EditIcon, CheckCircleIcon, ExternalLinkIcon, CopyIcon } from '@chakra-ui/icons'

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
    loanType: [],
    qualification: [],
    practiceType: [],
    _loanTypeDraft: '',
    _qualificationDraft: '',
    _practiceTypeDraft: '',
  })

  const canEdit = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATION'

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

      const label =
        String(decoded?.fullName || decoded?.name || '').trim() ||
        String(decoded?.email || '').trim() ||
        'User'

      const r = String(decoded?.role || '').trim()
      setCurrentUserLabel(r ? `${label} (${r})` : label)
    } catch {
      setRole(null)
      setCurrentUserLabel('')
    }
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
        toast({
          title: 'Doctor not found',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        router.push(`/profession-lead/new?mode=unknown&q=${encodeURIComponent(id)}`)
        return
      }

      setDoctor(data as DoctorLead)
      setRemarks(parseRemarks((data as any)?.remarks))
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  React.useEffect(() => {
    void fetchDoctor()
  }, [fetchDoctor])

  const saveRemarksArray = async (nextRemarks: RemarksItem[]) => {
    const token = getToken()
    if (!token) {
      toast({ title: 'Please login first', status: 'info' })
      router.push('/login')
      return false
    }

    const prevRemarks = remarks
    const prevDoctor = doctor

    setRemarks(nextRemarks)
    setDoctor((prev) => (prev ? { ...prev, remarks: JSON.stringify(nextRemarks) } : prev))

    setSavingRemark(true)
    try {
      const payload = { remarks: JSON.stringify(nextRemarks) }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRemarks(prevRemarks)
        setDoctor(prevDoctor)
        toast({
          title: 'Failed to save comment',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return false
      }

      setDoctor(data as DoctorLead)
      setRemarks(parseRemarks((data as any)?.remarks))
      return true
    } catch {
      setRemarks(prevRemarks)
      setDoctor(prevDoctor)
      toast({ title: 'Server error', status: 'error' })
      return false
    } finally {
      setSavingRemark(false)
    }
  }

  const addRemark = async () => {
    const text = remarkText.trim()
    if (!text) return toast({ title: 'Please enter comment', status: 'warning' })
    if (text.length > 500) return toast({ title: 'Comment too long', description: 'Max 500 characters.', status: 'warning' })
    if (!canEdit) return toast({ title: 'Access denied', status: 'warning' })

    const now = new Date().toISOString()
    const item: RemarksItem = { id: cryptoId(), text, createdAt: now, createdBy: currentUserLabel || undefined }
    const next = [item, ...remarks].filter((x) => !x.isDeleted)

    const ok = await saveRemarksArray(next)
    if (ok) {
      setRemarkText('')
      toast({ title: 'Comment added', status: 'success' })
    }
  }

  const startEditRemark = (it: RemarksItem) => {
    if (!canEdit) return
    setEditingRemarkId(it.id)
    setEditRemarkText(it.text)
  }
  const cancelEditRemark = () => {
    setEditingRemarkId(null)
    setEditRemarkText('')
  }

  const updateRemark = async () => {
    const idToEdit = editingRemarkId
    if (!idToEdit) return

    const text = editRemarkText.trim()
    if (!text) return toast({ title: 'Please enter comment', status: 'warning' })
    if (text.length > 500) return toast({ title: 'Comment too long', description: 'Max 500 characters.', status: 'warning' })

    const now = new Date().toISOString()
    const next = remarks.map((r) =>
      r.id !== idToEdit ? r : { ...r, text, updatedAt: now, updatedBy: currentUserLabel || r.updatedBy },
    )

    const ok = await saveRemarksArray(next)
    if (ok) {
      toast({ title: 'Comment updated', status: 'success' })
      cancelEditRemark()
    }
  }

  const deleteRemark = async (rid: string) => {
    if (!canEdit) return
    const now = new Date().toISOString()
    const next = remarks.map((r) =>
      r.id === rid ? { ...r, isDeleted: true, updatedAt: now, updatedBy: currentUserLabel || r.updatedBy } : r,
    )
    const ok = await saveRemarksArray(next)
    if (ok) toast({ title: 'Comment removed', status: 'success' })
  }

  const openUpdate = () => {
    if (!canEdit) return
    const d = doctor
    if (!d) return

    setUpdateTab('basic')
    setForm({
      fullName: d.fullName ?? '',
      mobileNumber: d.mobileNumber ?? '',
      email: d.email ?? '',
      registrationNumber: d.registrationNumber ?? '',
      panNumber: d.panNumber ?? '',
      aadharNumber: d.aadharNumber ?? '',
      cityOrPinCode: d.cityOrPinCode ?? '',
      yearsOfPractice: d.yearsOfPractice ?? null,
      qualification: Array.isArray(d.qualification) ? d.qualification : [],
      practiceType: Array.isArray(d.practiceType) ? d.practiceType : [],
      _qualificationDraft: '',
      _practiceTypeDraft: '',
      monthlyGrossIncome: d.monthlyGrossIncome ?? 0,
      monthlyNetIncome: d.monthlyNetIncome ?? 0,
      otherIncomeSources: d.otherIncomeSources ?? 0,
      monthlyEmi: d.monthlyEmi ?? 0,
      activeLoans: d.activeLoans ?? 0,
      loanType: normalizeLoanType(d.loanType),
      _loanTypeDraft: '',
      hasOverdue: Boolean(d.hasOverdue),
      hasProperty: Boolean(d.hasProperty),
      propertyValue: d.propertyValue ?? 0,
      medicalEquipmentValue: d.medicalEquipmentValue ?? 0,
      cibilScore: d.cibilScore ?? null,
    })

    setIsUpdateOpen(true)
  }

  const closeUpdate = () => {
    if (savingUpdate) return
    setIsUpdateOpen(false)
  }

  const saveUpdate = async () => {
    if (!canEdit) return toast({ title: 'Access denied', status: 'warning' })

    const token = getToken()
    if (!token) {
      toast({ title: 'Please login first', status: 'info' })
      router.push('/login')
      return
    }

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
      if (!res.ok) {
        toast({
          title: 'Update failed',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({ title: 'Profile updated', status: 'success' })
      setIsUpdateOpen(false)
      await fetchDoctor()
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSavingUpdate(false)
    }
  }

  const onShareProfile = async () => {
    if (typeof window === 'undefined') return

    const doctorId = doctor?._id || id
    const url = `${window.location.origin}/profession-lead/${doctorId}`
    const shareText = `Doctor Profile: ${doctor?.fullName || 'N/A'}\nMobile: ${doctor?.mobileNumber || 'N/A'}\nLink: ${url}`

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Doctor Profile', text: shareText, url })
        toast({ title: 'Shared successfully', status: 'success' })
        return
      }
    } catch {

    }

    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copied', description: 'Profile link copied to clipboard', status: 'success' })
    } catch {
      toast({ title: 'Copy failed', description: url, status: 'info' })
    }
  }

  const copyProfileLink = async () => {
    if (typeof window === 'undefined') return
    const doctorId = doctor?._id || id
    const url = `${window.location.origin}/doctor-lead/${doctorId}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copied', status: 'success' })
    } catch {
      toast({ title: 'Copy failed', description: url, status: 'info' })
    }
  }

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

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 6, md: 10 }}>
      <Container maxW="7xl">
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
          <HStack justify="space-between" align="start" spacing={6} flexWrap="wrap">
            <HStack spacing={4} align="center">
              <Avatar size="lg" name={doctor?.fullName || 'Doctor'} />
              <Box>
                <Skeleton isLoaded={!loading}>
                  <HStack spacing={2} flexWrap="wrap" align="center">
                    <Heading size="md">{doctor?.fullName || '—'}</Heading>

                    <VerifiedTickBadge isVerified={uiVerified} fallbackLabel={verifiedLabel} fallbackColorScheme={verifiedColor} />

                    {canEdit ? (
                      <Tooltip label="Edit / Update profile" hasArrow>
                        <IconButton aria-label="Edit / Update profile" icon={<EditIcon />} size="sm" variant="ghost" onClick={openUpdate} />
                      </Tooltip>
                    ) : null}
                  </HStack>
                </Skeleton>

                <Skeleton isLoaded={!loading}>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {(doctor?.qualification || []).join(', ') || '—'}{' '}
                    <Text as="span" color="gray.400">
                      •
                    </Text>{' '}
                    {doctor?.cityOrPinCode || '—'}
                  </Text>
                </Skeleton>
              </Box>
            </HStack>

            <HStack spacing={6} align="start" justify="flex-end" flexWrap="wrap">
              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">
                  Mobile
                </Text>
                <Skeleton isLoaded={!loading}>
                  <Text fontWeight="800">{doctor?.mobileNumber || '—'}</Text>
                </Skeleton>
              </Box>

              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">
                  Reg No
                </Text>
                <Skeleton isLoaded={!loading}>
                  <Text fontWeight="800">{doctor?.registrationNumber || 'N/A'}</Text>
                </Skeleton>
              </Box>

              <Menu placement="bottom-end">
                <Tooltip label="Share options" hasArrow>
                  <MenuButton
                    as={IconButton}
                    aria-label="Share"
                    icon={<Text fontSize="lg">⋮</Text>}
                    variant="ghost"
                    borderRadius="xl"
                  />
                </Tooltip>
                <MenuList borderRadius="xl" p={2}>
                  <MenuItem icon={<ExternalLinkIcon />} borderRadius="lg" onClick={onShareProfile}>
                    Share Profile
                  </MenuItem>
                  <MenuItem icon={<CopyIcon />} borderRadius="lg" onClick={copyProfileLink}>
                    Copy Link
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </HStack>

          <Divider my={5} borderColor="gray.100" />

          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 5 }}>
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
              <Box>
                <HStack spacing={2} mb={1} flexWrap="wrap">
                  <Text fontSize="sm" color="gray.600" fontWeight="800">
                    Profile Completion
                  </Text>
                  <Badge colorScheme={riskColor} borderRadius="full" px={3} py={1}>
                    {riskBucket} Risk
                  </Badge>
                </HStack>

                <Text fontSize="2xl" fontWeight="900" color="gray.800" lineHeight="1">
                  {profileCompletion}%
                </Text>

                <Text fontSize="sm" color="gray.500" mt={1}>
                  Complete profile for better eligibility & matching
                </Text>
              </Box>

              <VerifiedTickBadge isVerified={uiVerified} fallbackLabel={verifiedLabel} fallbackColorScheme={verifiedColor} />
            </HStack>

            <HStack mt={4} spacing={1}>
              {Array.from({ length: 10 }).map((_, i) => {
                const filled = Math.round((profileCompletion / 100) * 10)
                const isOn = i < filled
                return (
                  <Box
                    key={i}
                    h="10px"
                    flex="1"
                    borderRadius="full"
                    bg={isOn ? 'blue.500' : 'gray.200'}
                    opacity={isOn ? 1 : 0.7}
                  />
                )
              })}
            </HStack>

            <Progress mt={3} value={profileCompletion} borderRadius="full" size="sm" />
          </Box>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mt={6}>
          <KpiCard
            title="Risk Bucket"
            value={riskBucket}
            helper={`FOIR: ${Math.round(FOIR * 100)}% based on risk`}
            badge={{ label: riskBucket, colorScheme: riskColor }}
          />
          <KpiCard
            title="Eligible EMI (Est.)"
            value={income > 0 ? formatINR(Math.round(eligibleEmi)) : '₹N/A'}
            helper={income > 0 ? `Income × FOIR (${Math.round(FOIR * 100)}%) - Existing EMI` : 'Add income to compute'}
          />
          <KpiCard
            title="Max Loan Amount (Est.)"
            value={income > 0 && eligibleEmi > 0 ? formatINR(Math.round(maxLoanAmount)) : '₹N/A'}
            helper={income > 0 && eligibleEmi > 0 ? `@ ${DEFAULT_RATE}% for ${DEFAULT_TENURE} months` : 'Add income & EMI to compute'}
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5} mt={6}>
          <Box
            gridColumn={{ base: 'auto', lg: 'span 2' }}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="2xl"
            boxShadow="sm"
            p={{ base: 4, md: 6 }}
          >
            <HStack justify="space-between" mb={2}>
              <Box>
                <Heading size="sm">Financial Brain Insights</Heading>
                <Text fontSize="sm" color="gray.500">
                  Already captured and matched data points
                </Text>
              </Box>
              <VerifiedTickBadge isVerified={uiVerified} fallbackLabel={verifiedLabel} fallbackColorScheme={verifiedColor} />
            </HStack>

            <Divider my={4} borderColor="gray.100" />

            <Tabs variant="soft-rounded" colorScheme="blue">
              <TabList flexWrap="wrap" gap={2}>
                <Tab>Basic</Tab>
                <Tab>Income</Tab>
                <Tab>Obligations</Tab>
                <Tab>Assets</Tab>
                <Tab>Credit</Tab>
              </TabList>

              <TabPanels mt={4}>
                <TabPanel px={0}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                    <CapturedRow label="Full Name" value={valueOrDash(doctor?.fullName)} />
                    <CapturedRow label="Mobile" value={valueOrDash(doctor?.mobileNumber)} />
                    <CapturedRow label="Email" value={valueOrDash(doctor?.email)} />
                    <CapturedRow label="City / Pin" value={valueOrDash(doctor?.cityOrPinCode)} />
                    <CapturedRow label="Registration No" value={valueOrDash(doctor?.registrationNumber)} />
                    <CapturedRow label="PAN" value={valueOrDash(doctor?.panNumber)} />
                    <CapturedRow label="Aadhar" value={valueOrDash(doctor?.aadharNumber)} />
                    <CapturedRow
                      label="Years of Practice"
                      value={doctor?.yearsOfPractice != null ? String(doctor.yearsOfPractice) : '—'}
                    />
                    <CapturedRow label="Qualification" value={valueOrDash((doctor?.qualification || []).join(', '))} />
                    <CapturedRow label="Practice Type" value={valueOrDash((doctor?.practiceType || []).join(', '))} hideDivider />
                  </Box>
                </TabPanel>

                <TabPanel px={0}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                    <CapturedRow label="Monthly Gross Income" value={formatINR(doctor?.monthlyGrossIncome ?? null)} />
                    <CapturedRow label="Monthly Net Income" value={formatINR(doctor?.monthlyNetIncome ?? null)} />
                    <CapturedRow label="Other Income Sources" value={formatINR(doctor?.otherIncomeSources ?? null)} hideDivider />
                  </Box>
                </TabPanel>

                <TabPanel px={0}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                    <CapturedRow label="Monthly EMI" value={formatINR(doctor?.monthlyEmi ?? null)} />
                    <CapturedRow label="Active Loans" value={doctor?.activeLoans != null ? String(doctor.activeLoans) : '—'} />
                    <CapturedRow label="Loan Type(s)" value={valueOrDash(loanTypeText)} />
                    <CapturedRow
                      label="Has Overdue"
                      value={doctor?.hasOverdue ? 'Yes' : 'No'}
                      valueColor={doctor?.hasOverdue ? 'red.500' : 'green.600'}
                      hideDivider
                    />
                  </Box>
                </TabPanel>

                <TabPanel px={0}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                    <CapturedRow label="Has Property" value={doctor?.hasProperty ? 'Yes' : 'No'} />
                    <CapturedRow label="Property Value" value={formatINR(doctor?.propertyValue ?? null)} />
                    <CapturedRow label="Medical Equipment Value" value={formatINR(doctor?.medicalEquipmentValue ?? null)} hideDivider />
                  </Box>
                </TabPanel>

                <TabPanel px={0}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                    <CapturedRow
                      label="CIBIL Score"
                      value={doctor?.cibilScore !== undefined && doctor?.cibilScore !== null ? String(doctor.cibilScore) : 'Pending'}
                      valueColor={doctor?.cibilScore !== undefined && doctor?.cibilScore !== null ? 'gray.800' : 'red.500'}
                      hideDivider
                    />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>

          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
            <Heading size="sm">Interaction Log</Heading>
            <Text fontSize="sm" color="gray.500" mt={1}>
              Comments with time & history
            </Text>

            <Divider my={4} borderColor="gray.100" />

            <Box>
              <Textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                borderRadius="xl"
              />
              <HStack justify="space-between" mt={2}>
                <Text fontSize="xs" color="gray.500">
                  {remarkText.trim().length}/500
                </Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={addRemark}
                  isLoading={savingRemark}
                  loadingText="Saving..."
                  borderRadius="lg"
                  isDisabled={!canEdit}
                >
                  Add Comment
                </Button>
              </HStack>
            </Box>

            <Divider my={4} borderColor="gray.100" />

            {loading ? (
              <Stack spacing={3}>
                <Skeleton height="14px" />
                <Skeleton height="14px" />
                <Skeleton height="14px" />
              </Stack>
            ) : visibleRemarks.length ? (
              <Stack spacing={3}>
                {visibleRemarks.map((it) => {
                  const isEditing = editingRemarkId === it.id
                  const by = it.createdBy || 'User'
                  const time = formatDateTime(it.updatedAt || it.createdAt)
                  const editedBy = it.updatedBy || it.createdBy

                  return (
                    <Box key={it.id} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="xl" p={4}>
                      <HStack justify="space-between" align="start">
                        <HStack spacing={3} align="start">
                          <Avatar size="sm" name={by} />
                          <Box>
                            <HStack spacing={2} align="center" flexWrap="wrap">
                              <Text fontSize="sm" fontWeight="800" color="gray.800">
                                {by}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                • {time}
                              </Text>

                              {it.updatedAt ? (
                                <Tooltip label={editedBy ? `Edited by ${editedBy}` : 'Edited'} hasArrow>
                                  <Badge variant="subtle" colorScheme="purple" borderRadius="full">
                                    Edited
                                  </Badge>
                                </Tooltip>
                              ) : null}
                            </HStack>

                            {!isEditing ? (
                              <Text mt={2} fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                                {it.text}
                              </Text>
                            ) : (
                              <Box mt={2}>
                                <Textarea value={editRemarkText} onChange={(e) => setEditRemarkText(e.target.value)} rows={3} borderRadius="xl" />
                                <HStack justify="space-between" mt={2}>
                                  <Text fontSize="xs" color="gray.500">
                                    {editRemarkText.trim().length}/500
                                  </Text>
                                  <HStack>
                                    <Button size="sm" variant="ghost" onClick={cancelEditRemark} borderRadius="lg" isDisabled={savingRemark}>
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      colorScheme="blue"
                                      onClick={updateRemark}
                                      isLoading={savingRemark}
                                      loadingText="Saving..."
                                      borderRadius="lg"
                                    >
                                      Save
                                    </Button>
                                  </HStack>
                                </HStack>
                              </Box>
                            )}
                          </Box>
                        </HStack>

                        {canEdit ? (
                          <HStack spacing={1}>
                            <Tooltip label="Edit" hasArrow>
                              <IconButton
                                aria-label="Edit comment"
                                size="sm"
                                variant="ghost"
                                icon={<EditIcon />}
                                onClick={() => startEditRemark(it)}
                                isDisabled={savingRemark || isEditing}
                              />
                            </Tooltip>
                            <Tooltip label="Delete" hasArrow>
                              <IconButton
                                aria-label="Delete comment"
                                size="sm"
                                variant="ghost"
                                icon={<Text fontSize="lg">🗑️</Text>}
                                onClick={() => deleteRemark(it.id)}
                                isDisabled={savingRemark || isEditing}
                              />
                            </Tooltip>
                          </HStack>
                        ) : null}
                      </HStack>
                    </Box>
                  )
                })}
              </Stack>
            ) : (
              <Box mt={2} textAlign="center" color="gray.400">
                <Text fontSize="sm">No comments yet.</Text>
              </Box>
            )}
          </Box>
        </SimpleGrid>
      </Container>

      {canEdit ? (
        <Modal isOpen={isUpdateOpen} onClose={closeUpdate} size="xl" isCentered scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Update Doctor Lead</ModalHeader>
            <ModalCloseButton />

            <ModalBody>
              <HStack bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="xl" p="6px" spacing={2} mb={4} flexWrap="wrap">
                <SmallTab active={updateTab === 'basic'} onClick={() => setUpdateTab('basic')}>
                  Basic
                </SmallTab>
                <SmallTab active={updateTab === 'income'} onClick={() => setUpdateTab('income')}>
                  Income
                </SmallTab>
                <SmallTab active={updateTab === 'obligations'} onClick={() => setUpdateTab('obligations')}>
                  Obligations
                </SmallTab>
                <SmallTab active={updateTab === 'assets'} onClick={() => setUpdateTab('assets')}>
                  Assets
                </SmallTab>
                <SmallTab active={updateTab === 'credit'} onClick={() => setUpdateTab('credit')}>
                  Credit
                </SmallTab>
              </HStack>

              {updateTab === 'basic' ? (
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>Full Name</FormLabel>
                    <Input value={form.fullName ?? ''} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Mobile</FormLabel>
                    <Input value={form.mobileNumber ?? ''} onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input value={form.email ?? ''} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>City / Pin</FormLabel>
                    <Input value={form.cityOrPinCode ?? ''} onChange={(e) => setForm((p) => ({ ...p, cityOrPinCode: e.target.value }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Registration Number</FormLabel>
                    <Input value={form.registrationNumber ?? ''} onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>PAN</FormLabel>
                    <Input value={form.panNumber ?? ''} onChange={(e) => setForm((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Aadhar</FormLabel>
                    <Input value={form.aadharNumber ?? ''} onChange={(e) => setForm((p) => ({ ...p, aadharNumber: e.target.value }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Years of Practice</FormLabel>
                    <Input
                      type="number"
                      value={form.yearsOfPractice ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, yearsOfPractice: e.target.value === '' ? null : Number(e.target.value) }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Qualification</FormLabel>
                    <HStack>
                      <Input
                        value={form._qualificationDraft ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, _qualificationDraft: e.target.value }))}
                        placeholder="Type & Add (e.g., MBBS, MD)"
                      />
                      <Button
                        onClick={() => {
                          const draft = String(form._qualificationDraft ?? '').trim()
                          if (!draft) return
                          setForm((p) => ({
                            ...p,
                            qualification: Array.from(new Set([...(p.qualification || []), draft])),
                            _qualificationDraft: '',
                          }))
                        }}
                      >
                        Add
                      </Button>
                    </HStack>

                    <HStack mt={3} spacing={2} flexWrap="wrap">
                      {(form.qualification || []).length ? (
                        (form.qualification || []).map((t) => (
                          <Tag key={t} borderRadius="full">
                            <TagLabel>{t}</TagLabel>
                            <TagCloseButton onClick={() => setForm((p) => ({ ...p, qualification: (p.qualification || []).filter((x) => x !== t) }))} />
                          </Tag>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          No qualification added.
                        </Text>
                      )}
                    </HStack>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Practice Type</FormLabel>
                    <HStack>
                      <Input
                        value={form._practiceTypeDraft ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, _practiceTypeDraft: e.target.value }))}
                        placeholder="Type & Add (e.g., Clinic, Hospital)"
                      />
                      <Button
                        onClick={() => {
                          const draft = String(form._practiceTypeDraft ?? '').trim()
                          if (!draft) return
                          setForm((p) => ({
                            ...p,
                            practiceType: Array.from(new Set([...(p.practiceType || []), draft])),
                            _practiceTypeDraft: '',
                          }))
                        }}
                      >
                        Add
                      </Button>
                    </HStack>

                    <HStack mt={3} spacing={2} flexWrap="wrap">
                      {(form.practiceType || []).length ? (
                        (form.practiceType || []).map((t) => (
                          <Tag key={t} borderRadius="full">
                            <TagLabel>{t}</TagLabel>
                            <TagCloseButton onClick={() => setForm((p) => ({ ...p, practiceType: (p.practiceType || []).filter((x) => x !== t) }))} />
                          </Tag>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          No practice type added.
                        </Text>
                      )}
                    </HStack>
                  </FormControl>
                </Stack>
              ) : updateTab === 'income' ? (
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>Monthly Gross Income</FormLabel>
                    <Input
                      type="number"
                      value={form.monthlyGrossIncome ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, monthlyGrossIncome: e.target.value === '' ? '' : Number(e.target.value) }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Monthly Net Income</FormLabel>
                    <Input
                      type="number"
                      value={form.monthlyNetIncome ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, monthlyNetIncome: e.target.value === '' ? '' : Number(e.target.value) }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Other Income Sources</FormLabel>
                    <Input
                      type="number"
                      value={form.otherIncomeSources ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, otherIncomeSources: e.target.value === '' ? '' : Number(e.target.value) }))}
                    />
                  </FormControl>
                </Stack>
              ) : updateTab === 'obligations' ? (
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>Monthly EMI</FormLabel>
                    <Input
                      type="number"
                      value={form.monthlyEmi ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, monthlyEmi: e.target.value === '' ? '' : Number(e.target.value) }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Active Loans</FormLabel>
                    <Input
                      type="number"
                      value={form.activeLoans ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, activeLoans: e.target.value === '' ? '' : Number(e.target.value) }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Loan Type(s)</FormLabel>

                    <HStack>
                      <Input
                        value={form._loanTypeDraft ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, _loanTypeDraft: e.target.value }))}
                        placeholder="Type & click Add (e.g., Home, Equipment)"
                      />
                      <Button
                        onClick={() => {
                          const draft = String(form._loanTypeDraft ?? '').trim()
                          if (!draft) return
                          setForm((p) => ({
                            ...p,
                            loanType: Array.from(new Set([...(p.loanType || []), draft])),
                            _loanTypeDraft: '',
                          }))
                        }}
                      >
                        Add
                      </Button>
                    </HStack>

                    <HStack mt={3} spacing={2} flexWrap="wrap">
                      {(form.loanType || []).length ? (
                        (form.loanType || []).map((t) => (
                          <Tag key={t} borderRadius="full">
                            <TagLabel>{t}</TagLabel>
                            <TagCloseButton onClick={() => setForm((p) => ({ ...p, loanType: (p.loanType || []).filter((x) => x !== t) }))} />
                          </Tag>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          No loan type added.
                        </Text>
                      )}
                    </HStack>
                  </FormControl>

                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0">Has Overdue?</FormLabel>
                    <Switch isChecked={Boolean(form.hasOverdue)} onChange={(e) => setForm((p) => ({ ...p, hasOverdue: e.target.checked }))} />
                  </FormControl>
                </Stack>
              ) : updateTab === 'assets' ? (
                <Stack spacing={4}>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0">Has Property?</FormLabel>
                    <Switch isChecked={Boolean(form.hasProperty)} onChange={(e) => setForm((p) => ({ ...p, hasProperty: e.target.checked }))} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Property Value</FormLabel>
                    <Input
                      type="number"
                      value={form.propertyValue ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, propertyValue: e.target.value === '' ? '' : Number(e.target.value) }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Medical Equipment Value</FormLabel>
                    <Input
                      type="number"
                      value={form.medicalEquipmentValue ?? ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, medicalEquipmentValue: e.target.value === '' ? '' : Number(e.target.value) }))
                      }
                    />
                  </FormControl>
                </Stack>
              ) : (
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>CIBIL Score</FormLabel>
                    <Input
                      type="number"
                      value={form.cibilScore ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, cibilScore: e.target.value === '' ? null : Number(e.target.value) }))}
                      placeholder="0 - 900"
                    />
                  </FormControl>
                </Stack>
              )}
            </ModalBody>

            <ModalFooter>
              <HStack w="100%" justify="space-between">
                <Button variant="ghost" onClick={closeUpdate} isDisabled={savingUpdate}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={saveUpdate} isLoading={savingUpdate} loadingText="Saving...">
                  Save & Update
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      ) : null}
    </Box>
  )
}

function KpiCard({
  title,
  value,
  helper,
  badge,
}: {
  title: string
  value: string
  helper?: string
  badge?: { label: string; colorScheme: string }
}) {
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" boxShadow="sm" p={5}>
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" color="gray.500" fontWeight="700">
          {title}
        </Text>
        {badge ? (
          <Badge colorScheme={badge.colorScheme} borderRadius="full" px={3} py={1}>
            {badge.label}
          </Badge>
        ) : null}
      </HStack>

      <Stat>
        <StatNumber fontSize="2xl" fontWeight="900">
          {value}
        </StatNumber>
        {helper ? <StatHelpText color="gray.500">{helper}</StatHelpText> : null}
      </Stat>
    </Box>
  )
}

function SmallTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      borderRadius="lg"
      variant="solid"
      colorScheme={active ? 'blue' : 'gray'}
      bg={active ? 'blue.600' : 'transparent'}
      color={active ? 'white' : 'gray.700'}
      _hover={{ bg: active ? 'blue.700' : 'gray.100' }}
    >
      {children}
    </Button>
  )
}

function CapturedRow({
  label,
  value,
  valueColor,
  hideDivider,
}: {
  label: string
  value: string
  valueColor?: string
  hideDivider?: boolean
}) {
  return (
    <HStack
      px={5}
      py={3.5}
      borderBottom={hideDivider ? 'none' : '1px solid'}
      borderBottomColor="gray.100"
      justify="space-between"
      align="center"
    >
      <Text fontSize="sm" color="gray.600" fontWeight="600">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="900" color={valueColor || 'gray.800'} textAlign="right" maxW="60%" noOfLines={1}>
        {value}
      </Text>
    </HStack>
  )
}

const tickPop = keyframes`
  0% { transform: scale(0.6) rotate(-8deg); opacity: 0; }
  55% { transform: scale(1.08) rotate(0deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`
const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(49,130,206,0.40); }
  70% { box-shadow: 0 0 0 10px rgba(49,130,206,0); }
  100% { box-shadow: 0 0 0 0 rgba(49,130,206,0); }
`

function VerifiedTickBadge({
  isVerified,
  fallbackLabel,
  fallbackColorScheme,
}: {
  isVerified: boolean
  fallbackLabel: string
  fallbackColorScheme: string
}) {
  if (!isVerified) {
    return (
      <Badge colorScheme={fallbackColorScheme} borderRadius="full" px={3} py={1}>
        {fallbackLabel}
      </Badge>
    )
  }

  return (
    <Box
      p="1px"
      borderRadius="full"
      bgGradient="linear(to-r, blue.400, purple.400, cyan.400)"
      display="inline-flex"
      alignItems="center"
      transition="all 0.18s ease"
      _hover={{
        transform: 'translateY(-1px)',
        filter: 'brightness(1.02)',
        boxShadow: '0 10px 24px rgba(49,130,206,0.20)',
      }}
    >
      <HStack
        spacing={2}
        px={3}
        py={1}
        borderRadius="full"
        bg="white"
        border="1px solid"
        borderColor="blue.100"
        animation={`${pulseRing} 2s infinite`}
      >
        <Box animation={`${tickPop} 420ms ease-out`} display="flex" alignItems="center" justifyContent="center">
          <CheckCircleIcon color="blue.500" boxSize={4} />
        </Box>

        <Text fontSize="sm" fontWeight="800" color="blue.700" lineHeight="1">
          Verified
        </Text>
      </HStack>
    </Box>
  )
}


function valueOrDash(v?: string | null) {
  const s = (v ?? '').toString().trim()
  return s ? s : '—'
}

function formatINR(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return '₹N/A'
  try {
    return `₹${n.toLocaleString('en-IN')}`
  } catch {
    return `₹${n}`
  }
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
    !!d.fullName,
    !!d.mobileNumber,
    !!d.email,
    !!d.cityOrPinCode,
    !!d.registrationNumber,
    !!d.panNumber,
    !!d.aadharNumber,
    d.yearsOfPractice !== undefined && d.yearsOfPractice !== null,
    Array.isArray(d.qualification) && d.qualification.length > 0,
    Array.isArray(d.practiceType) && d.practiceType.length > 0,
    d.monthlyNetIncome !== undefined || d.monthlyGrossIncome !== undefined,
    d.otherIncomeSources !== undefined,
    d.monthlyEmi !== undefined,
    d.activeLoans !== undefined,
    loanTypes.length > 0,
    d.hasOverdue !== undefined,
    d.hasProperty !== undefined,
    d.propertyValue !== undefined,
    d.medicalEquipmentValue !== undefined,
    d.cibilScore !== undefined,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
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
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
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