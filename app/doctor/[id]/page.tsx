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
  Grid,
  GridItem,
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
} from '@chakra-ui/react'
import { EditIcon } from '@chakra-ui/icons'

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'

type DoctorLead = {
  _id: string
  fullName: string
  registrationNumber?: string
  mobileNumber: string
  email: string
  cityOrPinCode?: string
  yearsOfPractice?: number
  qualification?: string[]
  practiceType?: string[]
  consent?: boolean
  createdAt?: string

  // ✅ we will store remarks as JSON string (array of comments) for backward compatibility
  // old data: plain string
  // new data: JSON.stringify(RemarksItem[])
  remarks?: string

  monthlyGrossIncome?: number
  monthlyNetIncome?: number
  otherIncomeSources?: number

  monthlyEmi?: number
  activeLoans?: number
  loanType?: string[] | string
  hasOverdue?: boolean

  cibilScore?: number | null

  hasProperty?: boolean
  propertyValue?: number
  medicalEquipmentValue?: number
}

type RemarksItem = {
  id: string
  text: string
  createdAt: string // ISO
  createdBy?: string // name/email/role
  updatedAt?: string // ISO (optional)
  isDeleted?: boolean
}

// ✅ IMPORTANT: number fields are number | '' so UI can show blank instead of 0
type UpdatePayload = Partial<{
  monthlyGrossIncome: number | ''
  monthlyNetIncome: number | ''
  otherIncomeSources: number | ''

  monthlyEmi: number | ''
  activeLoans: number | ''
  loanType: string[]
  hasOverdue: boolean

  cibilScore: number | '' | null

  hasProperty: boolean
  propertyValue: number | ''
  medicalEquipmentValue: number | ''

  consent: boolean
  _loanTypeDraft: string
}>

// ✅ Pencil modal payload (basic/profile only)
type ProfileEditPayload = Partial<{
  fullName: string
  registrationNumber: string
  mobileNumber: string
  email: string
  cityOrPinCode: string
  yearsOfPractice: number | '' | null
  qualification: string[]
  practiceType: string[]
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

  // ✅ role (from token)
  const [role, setRole] = React.useState<AppRole | null>(null)
  const [currentUserLabel, setCurrentUserLabel] = React.useState<string>('')

  // ✅ remarks (comment style)
  const [remarkText, setRemarkText] = React.useState('')
  const [savingRemark, setSavingRemark] = React.useState(false)
  const [remarks, setRemarks] = React.useState<RemarksItem[]>([])
  const [editingRemarkId, setEditingRemarkId] = React.useState<string | null>(null)
  const [editRemarkText, setEditRemarkText] = React.useState<string>('')

  // ✅ 3 tabs inside Financial Brain Insights
  const [brainTab, setBrainTab] = React.useState<'insights' | 'captured' | 'extra'>('captured')

  // ✅ ENRICH FURTHER MODAL (financial)
  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false)
  const [savingUpdate, setSavingUpdate] = React.useState(false)
  const [updateTab, setUpdateTab] = React.useState<'income' | 'obligations' | 'assets' | 'credit'>('income')
  const [form, setForm] = React.useState<UpdatePayload>({ loanType: [], _loanTypeDraft: '' })

  // ✅ PENCIL BASIC PROFILE MODAL
  const [isProfileEditOpen, setIsProfileEditOpen] = React.useState(false)
  const [savingProfileEdit, setSavingProfileEdit] = React.useState(false)
  const [profileForm, setProfileForm] = React.useState<ProfileEditPayload>({
    qualification: [],
    practiceType: [],
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

  // ✅ read role + user once
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDoctor = React.useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const token = getToken()

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Doctor not found',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        router.push(`/doctor-lead/new?mode=unknown&q=${encodeURIComponent(id)}`)
        return
      }

      setDoctor(data)

      // ✅ parse comments from remarks field
      const parsed = parseRemarks(data?.remarks)
      setRemarks(parsed)
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      await fetchDoctor()
    })()
    return () => {
      mounted = false
    }
  }, [fetchDoctor])

  // ✅ SAVE remarks array to backend (stored in doctor.remarks as JSON string)
  const saveRemarksArray = async (nextRemarks: RemarksItem[]) => {
    const token = getToken()
    if (!token) {
      toast({ title: 'Please login first', status: 'info' })
      router.push('/login')
      return false
    }

    setSavingRemark(true)
    try {
      const payload = { remarks: JSON.stringify(nextRemarks) } // ✅ backend still uses same "remarks" key

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Failed to save remark',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return false
      }

      setDoctor(data)
      setRemarks(parseRemarks(data?.remarks))
      return true
    } catch {
      toast({ title: 'Server error', status: 'error' })
      return false
    } finally {
      setSavingRemark(false)
    }
  }

  // ✅ add new comment
  const addRemark = async () => {
    const text = remarkText.trim()
    if (!text) {
      toast({ title: 'Please enter remark', status: 'warning' })
      return
    }
    if (text.length > 500) {
      toast({ title: 'Remark too long', description: 'Max 500 characters.', status: 'warning' })
      return
    }
    if (!canEdit) {
      toast({ title: 'Access denied', status: 'warning' })
      return
    }

    const now = new Date().toISOString()
    const item: RemarksItem = {
      id: cryptoId(),
      text,
      createdAt: now,
      createdBy: currentUserLabel || undefined,
    }

    const next = [item, ...remarks].filter((x) => !x.isDeleted)
    const ok = await saveRemarksArray(next)
    if (ok) {
      setRemarkText('')
      toast({ title: 'Remark added', status: 'success' })
    }
  }

  // ✅ start edit comment
  const startEditRemark = (it: RemarksItem) => {
    if (!canEdit) return
    setEditingRemarkId(it.id)
    setEditRemarkText(it.text)
  }
  const cancelEditRemark = () => {
    setEditingRemarkId(null)
    setEditRemarkText('')
  }

  // ✅ update existing comment
  const updateRemark = async () => {
    const idToEdit = editingRemarkId
    if (!idToEdit) return

    const text = editRemarkText.trim()
    if (!text) {
      toast({ title: 'Please enter remark', status: 'warning' })
      return
    }
    if (text.length > 500) {
      toast({ title: 'Remark too long', description: 'Max 500 characters.', status: 'warning' })
      return
    }

    const now = new Date().toISOString()
    const next = remarks.map((r) => {
      if (r.id !== idToEdit) return r
      return { ...r, text, updatedAt: now }
    })

    const ok = await saveRemarksArray(next)
    if (ok) {
      toast({ title: 'Remark updated', status: 'success' })
      cancelEditRemark()
    }
  }

  // ✅ delete (soft delete)
  const deleteRemark = async (rid: string) => {
    if (!canEdit) return
    const next = remarks.map((r) => (r.id === rid ? { ...r, isDeleted: true, updatedAt: new Date().toISOString() } : r))
    const ok = await saveRemarksArray(next)
    if (ok) toast({ title: 'Remark removed', status: 'success' })
  }

  // ✅ OPEN ENRICH FURTHER MODAL (financial)
  const openUpdate = () => {
    if (!canEdit) return
    const d = doctor
    if (!d) return

    setForm({
      monthlyGrossIncome: d.monthlyGrossIncome ?? '',
      monthlyNetIncome: d.monthlyNetIncome ?? '',
      otherIncomeSources: d.otherIncomeSources ?? '',

      monthlyEmi: d.monthlyEmi ?? '',
      activeLoans: d.activeLoans ?? '',

      loanType: normalizeLoanType(d.loanType),
      _loanTypeDraft: '',

      hasOverdue: Boolean(d.hasOverdue),

      cibilScore: d.cibilScore ?? null,

      hasProperty: Boolean((d as any).hasProperty),
      propertyValue: (d as any).propertyValue ?? '',
      medicalEquipmentValue: (d as any).medicalEquipmentValue ?? '',

      consent: Boolean(d.consent),
    })

    setUpdateTab('income')
    setIsUpdateOpen(true)
  }

  const closeUpdate = () => {
    if (savingUpdate) return
    setIsUpdateOpen(false)
  }

  // ✅ SAVE ENRICH UPDATE (PATCH)
  const saveUpdate = async () => {
    if (!canEdit) {
      toast({ title: 'Access denied', description: 'You cannot update details.', status: 'warning' })
      return
    }

    const token = getToken()
    if (!token) {
      toast({ title: 'Please login first', status: 'info' })
      router.push('/login')
      return
    }

    const payload: any = {}

    if (form.consent !== undefined) payload.consent = Boolean(form.consent)
    if (form.hasOverdue !== undefined) payload.hasOverdue = Boolean(form.hasOverdue)
    if (form.hasProperty !== undefined) payload.hasProperty = Boolean(form.hasProperty)

    if (form.monthlyGrossIncome !== undefined && form.monthlyGrossIncome !== '') payload.monthlyGrossIncome = toNumOrZero(form.monthlyGrossIncome)
    if (form.monthlyNetIncome !== undefined && form.monthlyNetIncome !== '') payload.monthlyNetIncome = toNumOrZero(form.monthlyNetIncome)
    if (form.otherIncomeSources !== undefined && form.otherIncomeSources !== '') payload.otherIncomeSources = toNumOrZero(form.otherIncomeSources)

    if (form.monthlyEmi !== undefined && form.monthlyEmi !== '') payload.monthlyEmi = toNumOrZero(form.monthlyEmi)
    if (form.activeLoans !== undefined && form.activeLoans !== '') payload.activeLoans = toNumOrZero(form.activeLoans)

    if (form.propertyValue !== undefined && form.propertyValue !== '') payload.propertyValue = toNumOrZero(form.propertyValue)
    if (form.medicalEquipmentValue !== undefined && form.medicalEquipmentValue !== '') payload.medicalEquipmentValue = toNumOrZero(form.medicalEquipmentValue)

    if (form.cibilScore === null) payload.cibilScore = null
    if (form.cibilScore !== undefined && form.cibilScore !== null && form.cibilScore !== '') {
      payload.cibilScore = toNumOrNull(form.cibilScore)
    }

    if (form.loanType !== undefined) {
      payload.loanType = normalizeLoanType(form.loanType)
    }

    setSavingUpdate(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      setDoctor(data)
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSavingUpdate(false)
    }
  }

  // ✅ OPEN PENCIL BASIC PROFILE MODAL
  const openProfileEdit = () => {
    if (!canEdit) return
    const d = doctor
    if (!d) return

    setProfileForm({
      fullName: d.fullName ?? '',
      registrationNumber: d.registrationNumber ?? '',
      mobileNumber: d.mobileNumber ?? '',
      email: d.email ?? '',
      cityOrPinCode: d.cityOrPinCode ?? '',
      yearsOfPractice: d.yearsOfPractice ?? null,
      qualification: Array.isArray(d.qualification) ? d.qualification : [],
      practiceType: Array.isArray(d.practiceType) ? d.practiceType : [],
      _qualificationDraft: '',
      _practiceTypeDraft: '',
    })

    setIsProfileEditOpen(true)
  }

  const closeProfileEdit = () => {
    if (savingProfileEdit) return
    setIsProfileEditOpen(false)
  }

  // ✅ SAVE PENCIL BASIC PROFILE (PATCH)
  const saveProfileEdit = async () => {
    if (!canEdit) {
      toast({ title: 'Access denied', status: 'warning' })
      return
    }

    const token = getToken()
    if (!token) {
      toast({ title: 'Please login first', status: 'info' })
      router.push('/login')
      return
    }

    const payload: any = {
      fullName: String(profileForm.fullName ?? '').trim(),
      registrationNumber: String(profileForm.registrationNumber ?? '').trim(),
      mobileNumber: String(profileForm.mobileNumber ?? '').trim(),
      email: String(profileForm.email ?? '').trim(),
      cityOrPinCode: String(profileForm.cityOrPinCode ?? '').trim(),
      yearsOfPractice: profileForm.yearsOfPractice === '' ? null : (profileForm.yearsOfPractice ?? null),

      qualification: Array.isArray(profileForm.qualification)
        ? profileForm.qualification.map((x) => String(x).trim()).filter(Boolean)
        : [],

      practiceType: Array.isArray(profileForm.practiceType)
        ? profileForm.practiceType.map((x) => String(x).trim()).filter(Boolean)
        : [],
    }

    setSavingProfileEdit(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

      toast({ title: 'Basic profile updated', status: 'success' })
      setDoctor(data)
      setIsProfileEditOpen(false)
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSavingProfileEdit(false)
    }
  }

  const profileCompletion = doctor ? calcProfileCompletion(doctor) : 0
  const riskBucket = profileCompletion >= 70 ? 'Low' : profileCompletion >= 40 ? 'Medium' : 'High'
  const riskColor = riskBucket === 'Low' ? 'green' : riskBucket === 'Medium' ? 'yellow' : 'red'

  const loanTypeText = normalizeLoanType(doctor?.loanType).join(', ')

  const visibleRemarks = (remarks || []).filter((r) => !r.isDeleted)

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 6, md: 10 }}>
      <Container maxW="container.xl">
        {/* Top Doctor Card */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
          <HStack justify="space-between" align="start" spacing={6} flexWrap="wrap">
            <HStack spacing={4} minW="260px">
              <Avatar size="lg" name={doctor?.fullName || 'Doctor'} />
              <Box>
                <Skeleton isLoaded={!loading}>
                  <HStack spacing={2} align="center">
                    <Heading size="md">{doctor?.fullName || '—'}</Heading>

                    {canEdit ? (
                      <Tooltip label="Edit basic profile" hasArrow>
                        <IconButton aria-label="Edit basic profile" icon={<EditIcon />} size="sm" variant="ghost" onClick={openProfileEdit} />
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

            <HStack spacing={8} align="start">
              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">
                  Mobile
                </Text>
                <Skeleton isLoaded={!loading}>
                  <Text fontWeight="700">{doctor?.mobileNumber || '—'}</Text>
                </Skeleton>
              </Box>
              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">
                  Reg No
                </Text>
                <Skeleton isLoaded={!loading}>
                  <Text fontWeight="700">{doctor?.registrationNumber || 'N/A'}</Text>
                </Skeleton>
              </Box>
            </HStack>
          </HStack>
        </Box>

        {/* KPI Cards */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={5} mt={6}>
          <GridItem>
            <CardBox title="Profile Completion" right={<Text fontWeight="800" fontSize="2xl">{profileCompletion}%</Text>}>
              <Text fontSize="sm" color="gray.600">
                Credit Ready
              </Text>
              <Progress mt={3} value={profileCompletion} borderRadius="full" />

              {canEdit ? (
                <Button mt={4} w="100%" size="sm" variant="outline" borderRadius="lg" onClick={openUpdate}>
                  Enrich Further
                </Button>
              ) : null}
            </CardBox>
          </GridItem>

          <GridItem>
            <CardBox
              title="Risk Bucket"
              right={
                <Badge colorScheme={riskColor} borderRadius="full" px={3} py={1}>
                  {riskBucket}
                </Badge>
              }
            >
              <Text fontSize="sm" color="gray.600">
                Review Required
              </Text>
              <Text mt={3} fontSize="sm" color="gray.500">
                Based on captured data signals & missing fields.
              </Text>
            </CardBox>
          </GridItem>

          <GridItem>
            <CardBox title="EMI Eligibility" right={<Text fontWeight="800" fontSize="xl">₹ Calculating...</Text>}>
              <Text fontSize="sm" color="gray.600">
                Max Loan Amount
              </Text>
              <Text mt={3} fontSize="sm" color="gray.500">
                Will be computed after income/statement enrichment.
              </Text>
            </CardBox>
          </GridItem>
        </Grid>

        {/* Bottom Sections */}
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={5} mt={6}>
          {/* Financial Brain Insights */}
          <GridItem>
            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
              <HStack justify="space-between" mb={3}>
                <Box>
                  <Heading size="sm">Financial Brain Insights</Heading>
                  <Text fontSize="sm" color="gray.500">
                    Already captured and matched data points
                  </Text>
                </Box>
                <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
                  Verified Data
                </Badge>
              </HStack>

              <HStack bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="xl" p="6px" spacing={2}>
                <BrainTabButton active={brainTab === 'insights'} onClick={() => setBrainTab('insights')}>
                  Insights
                </BrainTabButton>
                <BrainTabButton active={brainTab === 'captured'} onClick={() => setBrainTab('captured')}>
                  Captured
                </BrainTabButton>
                <BrainTabButton active={brainTab === 'extra'} onClick={() => setBrainTab('extra')}>
                  Extra Details
                </BrainTabButton>
              </HStack>

              <Divider borderColor="gray.100" my={4} />

              {brainTab === 'insights' ? (
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                  <Box bg="green.50" border="1px solid" borderColor="green.100" borderRadius="xl" p={4}>
                    <Text fontWeight="800" color="green.700">
                      Captured Signals
                    </Text>
                    <Stack spacing={1.5} mt={3} fontSize="sm" color="green.800">
                      <Text>• KYC Verified via Reg No</Text>
                      <Text>• Location: {doctor?.cityOrPinCode || '—'}</Text>
                      <Text>• Practice: {doctor?.yearsOfPractice ? `${doctor.yearsOfPractice}+ Years Exp.` : '—'}</Text>
                      <Text>• Overdue: {doctor?.hasOverdue ? 'Yes' : 'No'}</Text>
                    </Stack>
                  </Box>

                  <Box bg="blue.50" border="1px solid" borderColor="blue.100" borderRadius="xl" p={4}>
                    <Text fontWeight="800" color="blue.700">
                      Product Matches
                    </Text>
                    <Stack spacing={1.5} mt={3} fontSize="sm" color="blue.800">
                      <Text>• Professional Practice Loan</Text>
                      <Text>• Medical Equipment Finance</Text>
                      <Text>• Working Capital</Text>
                    </Stack>
                  </Box>
                </Grid>
              ) : brainTab === 'captured' ? (
                <Box border="1px solid" borderColor="gray.200" borderRadius="xl" overflow="hidden" bg="white">
                  <HStack bg="gray.50" px={5} py={3} borderBottom="1px solid" borderBottomColor="gray.200">
                    <Text fontSize="sm" fontWeight="800" color="gray.700">
                      Captured
                    </Text>
                  </HStack>

                  <CapturedRow label="Qualification" value={valueOrDash((doctor?.qualification || []).join(', '))} />
                  <CapturedRow label="Monthly Income" value={formatINR(doctor?.monthlyNetIncome ?? doctor?.monthlyGrossIncome ?? null)} />
                  <CapturedRow
                    label="Yearly Income"
                    value={
                      doctor?.monthlyNetIncome
                        ? formatINR(doctor.monthlyNetIncome * 12)
                        : doctor?.monthlyGrossIncome
                        ? formatINR(doctor.monthlyGrossIncome * 12)
                        : '₹N/A'
                    }
                    valueColor={doctor?.monthlyNetIncome || doctor?.monthlyGrossIncome ? 'gray.800' : 'gray.500'}
                  />
                  <CapturedRow
                    label="CIBIL Score"
                    value={doctor?.cibilScore !== undefined && doctor?.cibilScore !== null ? String(doctor.cibilScore) : 'Pending'}
                    valueColor={doctor?.cibilScore !== undefined && doctor?.cibilScore !== null ? 'gray.800' : 'red.500'}
                  />
                  <CapturedRow label="Location" value={valueOrDash(doctor?.cityOrPinCode)} />
                  <CapturedRow label="Monthly EMI" value={formatINR(doctor?.monthlyEmi ?? null)} />
                  <CapturedRow
                    label="Active Loans"
                    value={doctor?.activeLoans !== undefined && doctor?.activeLoans !== null ? String(doctor.activeLoans) : '—'}
                    valueColor={doctor?.activeLoans !== undefined && doctor?.activeLoans !== null ? 'gray.800' : 'gray.500'}
                  />
                  <CapturedRow label="Loan Type(s)" value={valueOrDash(loanTypeText)} />
                  <CapturedRow
                    label="Overdue"
                    value={doctor?.hasOverdue ? 'Yes' : 'No'}
                    valueColor={doctor?.hasOverdue ? 'red.500' : 'green.600'}
                    hideDivider
                  />
                </Box>
              ) : (
                <Box border="1px solid" borderColor="gray.200" borderRadius="xl" p={4}>
                  <Heading size="xs" color="gray.700">
                    Income & Cash Flow
                  </Heading>
                  <Divider my={3} borderColor="gray.100" />
                  <KeyValueRow label="Monthly Gross Income" value={formatINR(doctor?.monthlyGrossIncome ?? null)} />
                  <KeyValueRow label="Monthly Net Income" value={formatINR(doctor?.monthlyNetIncome ?? null)} />
                  <KeyValueRow label="Other Income Sources" value={formatINR(doctor?.otherIncomeSources ?? null)} />

                  <Divider my={4} borderColor="gray.100" />

                  <Heading size="xs" color="gray.700">
                    Obligations
                  </Heading>
                  <Divider my={3} borderColor="gray.100" />
                  <KeyValueRow label="Monthly EMI" value={formatINR(doctor?.monthlyEmi ?? null)} />
                  <KeyValueRow label="Active Loans" value={doctor?.activeLoans !== undefined ? String(doctor.activeLoans) : '—'} />
                  <KeyValueRow label="Loan Type(s)" value={valueOrDash(loanTypeText)} />
                  <KeyValueRow label="Has Overdue" value={doctor?.hasOverdue ? 'Yes' : 'No'} />

                  <Divider my={4} borderColor="gray.100" />

                  <Heading size="xs" color="gray.700">
                    Credit
                  </Heading>
                  <Divider my={3} borderColor="gray.100" />
                  <KeyValueRow label="CIBIL Score" value={doctor?.cibilScore !== undefined && doctor?.cibilScore !== null ? String(doctor.cibilScore) : 'Pending'} />
                </Box>
              )}
            </Box>
          </GridItem>

          {/* ✅ Interaction Log (Comment style with time + multiple + edit/delete) */}
          <GridItem>
            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
              <HStack justify="space-between" mb={2}>
                <Box>
                  <Heading size="sm">Interaction Log</Heading>
                  <Text fontSize="sm" color="gray.500">
                    Comments with time & history
                  </Text>
                </Box>
              </HStack>

              <Divider borderColor="gray.100" my={4} />

              {/* Add new comment */}
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

              <Divider borderColor="gray.100" my={4} />

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
                                  <Badge variant="subtle" colorScheme="purple" borderRadius="full">
                                    Edited
                                  </Badge>
                                ) : null}
                              </HStack>

                              {!isEditing ? (
                                <Text mt={2} fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                                  {it.text}
                                </Text>
                              ) : (
                                <Box mt={2}>
                                  <Textarea
                                    value={editRemarkText}
                                    onChange={(e) => setEditRemarkText(e.target.value)}
                                    rows={3}
                                    borderRadius="xl"
                                  />
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
          </GridItem>
        </Grid>
      </Container>

      {/* ✅ ENRICH FURTHER MODAL (Financial only) */}
      {canEdit ? (
        <Modal isOpen={isUpdateOpen} onClose={closeUpdate} size="xl" isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Enrich Further</ModalHeader>
            <ModalCloseButton />

            <ModalBody>
              <HStack bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="xl" p="6px" spacing={2} mb={4}>
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

              {updateTab === 'income' ? (
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
                            <TagCloseButton
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  loanType: (p.loanType || []).filter((x) => x !== t),
                                }))
                              }
                            />
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
                      onChange={(e) => setForm((p) => ({ ...p, medicalEquipmentValue: e.target.value === '' ? '' : Number(e.target.value) }))}
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

                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0">Consent</FormLabel>
                    <Switch isChecked={Boolean(form.consent)} onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))} />
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

      {/* ✅ BASIC PROFILE MODAL */}
      {canEdit ? (
        <Modal isOpen={isProfileEditOpen} onClose={closeProfileEdit} size="xl" isCentered scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Edit Basic Profile</ModalHeader>
            <ModalCloseButton />

            <ModalBody>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Full Name</FormLabel>
                  <Input value={profileForm.fullName ?? ''} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} />
                </FormControl>

                <FormControl>
                  <FormLabel>Registration Number</FormLabel>
                  <Input value={profileForm.registrationNumber ?? ''} onChange={(e) => setProfileForm((p) => ({ ...p, registrationNumber: e.target.value }))} />
                </FormControl>

                <FormControl>
                  <FormLabel>Mobile</FormLabel>
                  <Input value={profileForm.mobileNumber ?? ''} onChange={(e) => setProfileForm((p) => ({ ...p, mobileNumber: e.target.value }))} />
                </FormControl>

                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input value={profileForm.email ?? ''} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
                </FormControl>

                <FormControl>
                  <FormLabel>City / Pin</FormLabel>
                  <Input value={profileForm.cityOrPinCode ?? ''} onChange={(e) => setProfileForm((p) => ({ ...p, cityOrPinCode: e.target.value }))} />
                </FormControl>

                <FormControl>
                  <FormLabel>Years of Practice</FormLabel>
                  <Input
                    type="number"
                    value={profileForm.yearsOfPractice ?? ''}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        yearsOfPractice: e.target.value === '' ? null : Number(e.target.value),
                      }))
                    }
                  />
                </FormControl>

                {/* Qualification tags */}
                <FormControl>
                  <FormLabel>Qualification</FormLabel>

                  <HStack>
                    <Input
                      value={profileForm._qualificationDraft ?? ''}
                      onChange={(e) => setProfileForm((p) => ({ ...p, _qualificationDraft: e.target.value }))}
                      placeholder="Type & Add (e.g., BDS, MDS)"
                    />
                    <Button
                      onClick={() => {
                        const draft = String(profileForm._qualificationDraft ?? '').trim()
                        if (!draft) return
                        setProfileForm((p) => ({
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
                    {(profileForm.qualification || []).length ? (
                      (profileForm.qualification || []).map((t) => (
                        <Tag key={t} borderRadius="full">
                          <TagLabel>{t}</TagLabel>
                          <TagCloseButton
                            onClick={() =>
                              setProfileForm((p) => ({
                                ...p,
                                qualification: (p.qualification || []).filter((x) => x !== t),
                              }))
                            }
                          />
                        </Tag>
                      ))
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        No qualification added.
                      </Text>
                    )}
                  </HStack>
                </FormControl>

                {/* PracticeType tags */}
                <FormControl>
                  <FormLabel>Practice Type</FormLabel>

                  <HStack>
                    <Input
                      value={profileForm._practiceTypeDraft ?? ''}
                      onChange={(e) => setProfileForm((p) => ({ ...p, _practiceTypeDraft: e.target.value }))}
                      placeholder="Type & Add (e.g., Clinic, Hospital)"
                    />
                    <Button
                      onClick={() => {
                        const draft = String(profileForm._practiceTypeDraft ?? '').trim()
                        if (!draft) return
                        setProfileForm((p) => ({
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
                    {(profileForm.practiceType || []).length ? (
                      (profileForm.practiceType || []).map((t) => (
                        <Tag key={t} borderRadius="full">
                          <TagLabel>{t}</TagLabel>
                          <TagCloseButton
                            onClick={() =>
                              setProfileForm((p) => ({
                                ...p,
                                practiceType: (p.practiceType || []).filter((x) => x !== t),
                              }))
                            }
                          />
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
            </ModalBody>

            <ModalFooter>
              <HStack w="100%" justify="space-between">
                <Button variant="ghost" onClick={closeProfileEdit} isDisabled={savingProfileEdit}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={saveProfileEdit} isLoading={savingProfileEdit} loadingText="Saving...">
                  Save
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      ) : null}
    </Box>
  )
}

function CardBox({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" color="gray.500">
          {title}
        </Text>
        {right}
      </HStack>
      {children}
    </Box>
  )
}

function BrainTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      borderRadius="xl"
      variant="ghost"
      bg={active ? 'white' : 'transparent'}
      border="1px solid"
      borderColor={active ? 'gray.200' : 'transparent'}
      boxShadow={active ? 'sm' : 'none'}
      fontWeight="700"
      px="4"
    >
      {children}
    </Button>
  )
}

function SmallTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      borderRadius="xl"
      variant="ghost"
      bg={active ? 'white' : 'transparent'}
      border="1px solid"
      borderColor={active ? 'gray.200' : 'transparent'}
      boxShadow={active ? 'sm' : 'none'}
      fontWeight="700"
      px="4"
      flex="1"
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
      <Text fontSize="sm" color="gray.600" fontWeight="500">
        {label}
      </Text>

      <Text fontSize="sm" fontWeight="800" color={valueColor || 'gray.800'} textAlign="right" maxW="60%" noOfLines={1}>
        {value}
      </Text>
    </HStack>
  )
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack py={2} justify="space-between">
      <Text fontSize="sm" color="gray.600">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="700" color="gray.800">
        {value}
      </Text>
    </HStack>
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

// ✅ normalize loanType (supports string or string[])
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
    !!d.registrationNumber,
    !!d.cityOrPinCode,
    d.yearsOfPractice !== undefined && d.yearsOfPractice !== null,
    Array.isArray(d.qualification) && d.qualification.length > 0,
    Array.isArray(d.practiceType) && d.practiceType.length > 0,
    !!d.consent,
    d.monthlyNetIncome !== undefined || d.monthlyGrossIncome !== undefined,
    d.monthlyEmi !== undefined,
    loanTypes.length > 0,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
}

/** ---------------- Remarks helpers (JSON in remarks string) ---------------- */

function parseRemarks(raw: any): RemarksItem[] {
  const s = String(raw ?? '').trim()
  if (!s) return []

  // ✅ new format: JSON array
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
            isDeleted: Boolean(x?.isDeleted),
          }))
          .filter((x) => x.text)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      }
    } catch {
      // fallthrough to old format
    }
  }

  // ✅ old format: single string => convert into 1 comment
  return [
    {
      id: cryptoId(),
      text: s,
      createdAt: new Date().toISOString(),
      createdBy: 'Legacy',
    },
  ]
}

function cryptoId() {
  // works in browser; fallback for older envs
  const g: any = globalThis as any
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  try {
    // India-friendly
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
