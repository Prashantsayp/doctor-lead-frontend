'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuList,
  Select,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react'

const MOBILE_REGEX = /^[6-9]\d{9}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const REG_REGEX = /^[A-Z0-9][A-Z0-9\/\-\s]{2,20}[A-Z0-9]$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AADHAR_REGEX = /^\d{12}$/

type MultiSelectProps = {
  label: string
  placeholder?: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  isDisabled?: boolean
}

function MultiSelect({
  label,
  placeholder = 'Select',
  options,
  value,
  onChange,
  isDisabled = false,
}: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (isDisabled) return
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt))
    else onChange([...value, opt])
  }

  const display =
    value.length === 0 ? placeholder : value.length <= 2 ? value.join(', ') : `${value.length} selected`

  return (
    <FormControl isDisabled={isDisabled}>
      <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
        {label}
      </FormLabel>

      <Menu closeOnSelect={false}>
        <MenuButton
          as={Button}
          rightIcon={
            <Box as="span" fontSize="12px">
              ▼
            </Box>
          }
          variant="outline"
          w="100%"
          justifyContent="space-between"
          fontWeight="500"
          bg="white"
          borderColor="gray.200"
          _hover={{ borderColor: 'gray.300' }}
          _active={{ bg: 'white' }}
          isDisabled={isDisabled}
        >
          <Text color={value.length ? 'gray.800' : 'gray.400'} noOfLines={1}>
            {display}
          </Text>
        </MenuButton>

        <MenuList p={2} minW="280px" maxH="260px" overflowY="auto" borderColor="gray.200">
          <Text px={2} py={1} fontSize="xs" color="gray.500">
            Choose multiple
          </Text>
          <MenuDivider />

          <Stack spacing={1} p={1}>
            {options.map((opt) => {
              const selected = value.includes(opt)
              return (
                <Box
                  key={opt}
                  px={2}
                  py={2}
                  borderRadius="md"
                  _hover={{ bg: 'gray.50' }}
                  cursor="pointer"
                  onClick={() => toggle(opt)}
                >
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight={selected ? '600' : '400'}>
                      {opt}
                    </Text>
                    <Text fontSize="sm" color={selected ? 'blue.600' : 'gray.300'}>
                      {selected ? '✓' : ''}
                    </Text>
                  </HStack>
                </Box>
              )
            })}
          </Stack>

          <MenuDivider />
          <HStack px={2} pt={2} justify="space-between">
            <Button size="sm" variant="ghost" onClick={() => onChange([])} isDisabled={isDisabled}>
              Clear
            </Button>
            <Text fontSize="xs" color="gray.500">
              {value.length} selected
            </Text>
          </HStack>
        </MenuList>
      </Menu>
    </FormControl>
  )
}

type DetectMode = 'mobile' | 'email' | 'reg'
type ProfessionType = 'DOCTOR' | 'CA' | 'LAWYER' | 'ENGINEER' | ''

type ExistsState = {
  checking: boolean
  exists: boolean
  matchedFields: string[]
  existingId?: string
  existingName?: string
  error?: string
}

type ValidationErrors = {
  profession?: string
  fullName?: string
  registrationNumber?: string
  panNumber?: string
  aadharNumber?: string
  mobileNumber?: string
  email?: string
  cityOrPinCode?: string
  yearsOfPractice?: string
}

function normalizePrefill(mode: DetectMode, qRaw: string) {
  const q = String(qRaw || '').trim()
  if (!q) return ''
  if (mode === 'reg') return q.toUpperCase().replace(/\s+/g, ' ').trim()
  if (mode === 'email') return q.toLowerCase()
  return onlyDigits(q).slice(-10)
}

function onlyDigits(s: string) {
  return String(s || '').replace(/\D/g, '')
}

function normalizeMobileInput(s: string) {
  let digits = onlyDigits(s)
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2)
  }
  return digits.slice(0, 10)
}

async function checkLeadExists(params: {
  profession?: string
  registrationNumber?: string
  panNumber?: string
  mobileNumber?: string
  aadharNumber?: string
  email?: string
}) {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_URL missing')

  const url = new URL(`${base}/doctor-lead/exists`)
  if (params.profession) url.searchParams.set('profession', params.profession)
  if (params.mobileNumber) url.searchParams.set('mobileNumber', params.mobileNumber)
  if (params.registrationNumber) url.searchParams.set('registrationNumber', params.registrationNumber)
  if (params.panNumber) url.searchParams.set('panNumber', params.panNumber)
  if (params.aadharNumber) url.searchParams.set('aadharNumber', params.aadharNumber)
  if (params.email) url.searchParams.set('email', params.email)

  const res = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Exists check failed')
  }

  return {
    exists: Boolean(data?.exists),
    matchedFields: Array.isArray(data?.matchedOn)
      ? data.matchedOn
      : Array.isArray(data?.matchedFields)
      ? data.matchedFields
      : [],
    existingId: data?.leadId || data?.existingId,
    existingName: data?.fullName || data?.existingName,
  }
}

const PROFESSION_OPTIONS = [
  { label: 'Doctor', value: 'DOCTOR' },
  { label: 'CA', value: 'CA' },
  { label: 'Lawyer', value: 'LAWYER' },
  { label: 'Engineer', value: 'ENGINEER' },
]

const PROFESSION_CONFIG: Record<
  Exclude<ProfessionType, ''>,
  {
    title: string
    qualificationOptions: string[]
    practiceOptions: string[]
    registrationLabel: string
    registrationPlaceholder: string
  }
> = {
  DOCTOR: {
    title: 'New Doctor Lead',
    qualificationOptions: ['DM', 'MD', 'MS', 'DNB', 'MDS', 'MBBS', 'BDS', 'BHMS', 'BAMS', 'Other'],
    practiceOptions: [
      'Private Clinic',
      'Hospital',
      'Govt Hospital',
      'Polyclinic',
      'Nursing Home',
      'Diagnostic Center',
      'Consultant',
      'Other',
    ],
    registrationLabel: 'Registration Number',
    registrationPlaceholder: 'MCI-12345 / UP-889900',
  },
  CA: {
    title: 'New CA Lead',
    qualificationOptions: ['CA', 'CS', 'CMA', 'B.Com', 'M.Com', 'MBA', 'Other'],
    practiceOptions: ['Individual Practice', 'CA Firm', 'Audit Firm', 'Consultant', 'In-house Finance', 'Other'],
    registrationLabel: 'Membership / Registration Number',
    registrationPlaceholder: 'ICAI Membership No.',
  },
  LAWYER: {
    title: 'New Lawyer Lead',
    qualificationOptions: ['LLB', 'LLM', 'BA LLB', 'BBA LLB', 'Other'],
    practiceOptions: ['Independent Practice', 'Law Firm', 'Corporate Legal', 'High Court', 'District Court', 'Other'],
    registrationLabel: 'Bar Council Registration Number',
    registrationPlaceholder: 'Bar Council Reg. No.',
  },
  ENGINEER: {
    title: 'New Engineer Lead',
    qualificationOptions: ['B.Tech', 'BE', 'M.Tech', 'ME', 'Diploma', 'PhD', 'Other'],
    practiceOptions: ['Private Job', 'Govt Job', 'Consultant', 'Contractor', 'Self Employed', 'Other'],
    registrationLabel: 'Employee / License / Registration Number',
    registrationPlaceholder: 'Employee ID / Registration No.',
  },
}

export default function NewDoctorLeadPage() {
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [profession, setProfession] = React.useState<ProfessionType>('DOCTOR')
  const [fullName, setFullName] = React.useState('')
  const [registrationNumber, setRegistrationNumber] = React.useState('')
  const [panNumber, setPanNumber] = React.useState('')
  const [aadharNumber, setAadharNumber] = React.useState('')
  const [mobileNumber, setMobileNumber] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [cityOrPinCode, setCityOrPinCode] = React.useState('')
  const [yearsOfPractice, setYearsOfPractice] = React.useState('')
  const [qualification, setQualification] = React.useState<string[]>([])
  const [practiceType, setPracticeType] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [errors, setErrors] = React.useState<ValidationErrors>({})

  const [existsState, setExistsState] = React.useState<ExistsState>({
    checking: false,
    exists: false,
    matchedFields: [],
  })

  const selectedConfig =
    profession && PROFESSION_CONFIG[profession]
      ? PROFESSION_CONFIG[profession]
      : {
          title: 'New Professional Lead',
          qualificationOptions: [],
          practiceOptions: [],
          registrationLabel: 'Registration Number',
          registrationPlaceholder: 'Enter registration number',
        }

  const markTouched = (field: keyof ValidationErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const validateForm = React.useCallback((): ValidationErrors => {
    const nextErrors: ValidationErrors = {}

    const name = fullName.trim()
    const reg = registrationNumber.trim().toUpperCase()
    const pan = panNumber.trim().toUpperCase()
    const aad = onlyDigits(aadharNumber.trim())
    const mob = normalizeMobileInput(mobileNumber.trim())
    const mail = email.trim().toLowerCase()
    const city = cityOrPinCode.trim()
    const yop = yearsOfPractice.trim()

    if (!profession) nextErrors.profession = 'Please select profession'
    if (!name) nextErrors.fullName = 'Full name is required'
    if (!city) nextErrors.cityOrPinCode = 'City / Pin Code is required'

    if (!mob) nextErrors.mobileNumber = 'Mobile number is required'
    else if (!MOBILE_REGEX.test(mob)) nextErrors.mobileNumber = 'Enter valid 10 digit mobile number'

    if (!mail) nextErrors.email = 'Email is required'
    else if (!EMAIL_REGEX.test(mail)) nextErrors.email = 'Enter valid email address'

    if (reg && !REG_REGEX.test(reg)) {
      nextErrors.registrationNumber = 'Enter valid registration number'
    }

    if (pan && !PAN_REGEX.test(pan)) {
      nextErrors.panNumber = 'PAN format should be ABCDE1234F'
    }

    if (aad && !AADHAR_REGEX.test(aad)) {
      nextErrors.aadharNumber = 'Aadhar must be 12 digits'
    }

    if (yop) {
      const n = Number(yop)
      if (!Number.isFinite(n) || n < 0) {
        nextErrors.yearsOfPractice = 'Years of practice must be 0 or more'
      }
    }

    return nextErrors
  }, [profession, fullName, registrationNumber, panNumber, aadharNumber, mobileNumber, email, cityOrPinCode, yearsOfPractice])

  React.useEffect(() => {
    setErrors(validateForm())
  }, [validateForm])

  React.useEffect(() => {
    if (!searchParams) return

    const mode = (searchParams.get('mode') || '') as DetectMode
    const q = searchParams.get('q') || ''
    const professionFromQuery = (searchParams.get('profession') || '').toUpperCase()

    if (professionFromQuery && ['DOCTOR', 'CA', 'LAWYER', 'ENGINEER'].includes(professionFromQuery)) {
      setProfession(professionFromQuery as ProfessionType)
    }

    if (!q) return
    if (mode !== 'mobile' && mode !== 'email' && mode !== 'reg') return

    const v = normalizePrefill(mode, q)

    if (mode === 'mobile') setMobileNumber(v)
    if (mode === 'email') setEmail(v)
    if (mode === 'reg') setRegistrationNumber(v)
  }, [searchParams])

  React.useEffect(() => {
    setQualification([])
    setPracticeType([])
    setRegistrationNumber('')
    setExistsState({ checking: false, exists: false, matchedFields: [] })
    setTouched({})
  }, [profession])

  React.useEffect(() => {
    const reg = registrationNumber.trim().toUpperCase()
    const pan = panNumber.trim().toUpperCase()
    const mob = normalizeMobileInput(mobileNumber.trim())
    const aad = onlyDigits(aadharNumber.trim())
    const mail = email.trim().toLowerCase()

    if (!profession) {
      setExistsState({ checking: false, exists: false, matchedFields: [] })
      return
    }

    if (!reg && !pan && !mob && !aad && !mail) {
      setExistsState({ checking: false, exists: false, matchedFields: [] })
      return
    }

    const canCheckMobile = mob ? MOBILE_REGEX.test(mob) : false
    const canCheckAadhar = aad ? AADHAR_REGEX.test(aad) : false
    const canCheckPan = pan ? PAN_REGEX.test(pan) : false
    const canCheckReg = reg ? REG_REGEX.test(reg) : false
    const canCheckEmail = mail ? EMAIL_REGEX.test(mail) : false

    if (!(canCheckMobile || canCheckAadhar || canCheckPan || canCheckReg || canCheckEmail)) {
      setExistsState((s) => ({ ...s, exists: false, matchedFields: [], error: undefined, checking: false }))
      return
    }

    const t = setTimeout(async () => {
      try {
        setExistsState((s) => ({ ...s, checking: true, error: undefined }))
        const result = await checkLeadExists({
          profession,
          registrationNumber: canCheckReg ? reg : undefined,
          panNumber: canCheckPan ? pan : undefined,
          mobileNumber: canCheckMobile ? mob : undefined,
          aadharNumber: canCheckAadhar ? aad : undefined,
          email: canCheckEmail ? mail : undefined,
        })
        setExistsState({ checking: false, ...result })
      } catch (e: any) {
        setExistsState({ checking: false, exists: false, matchedFields: [], error: e?.message || 'Error' })
      }
    }, 400)

    return () => clearTimeout(t)
  }, [profession, registrationNumber, panNumber, mobileNumber, aadharNumber, email])

  const resetForm = () => {
    setFullName('')
    setRegistrationNumber('')
    setPanNumber('')
    setAadharNumber('')
    setMobileNumber('')
    setEmail('')
    setCityOrPinCode('')
    setYearsOfPractice('')
    setQualification([])
    setPracticeType([])
    setTouched({})
    setErrors({})
    setExistsState({ checking: false, exists: false, matchedFields: [] })
  }

  const handleSubmit = async () => {
    const nextErrors = validateForm()
    setErrors(nextErrors)
    setTouched({
      profession: true,
      fullName: true,
      registrationNumber: true,
      panNumber: true,
      aadharNumber: true,
      mobileNumber: true,
      email: true,
      cityOrPinCode: true,
      yearsOfPractice: true,
    })

    if (Object.keys(nextErrors).length > 0) {
      toast({ title: 'Please fix highlighted fields', status: 'warning' })
      return
    }

    if (existsState.checking) {
      toast({ title: 'Please wait', description: 'Checking duplicate…', status: 'info' })
      return
    }

    if (existsState.exists) {
      toast({
        title: 'Duplicate Found',
        description: `Already exists for: ${existsState.matchedFields.join(', ')}`,
        status: 'error',
      })
      return
    }

    const payload: any = {
      profession,
      fullName: fullName.trim(),
      mobileNumber: normalizeMobileInput(mobileNumber.trim()),
      email: email.trim().toLowerCase(),
      cityOrPinCode: cityOrPinCode.trim(),
      yearsOfPractice: yearsOfPractice ? Number(yearsOfPractice) : undefined,
      qualification,
      practiceType,
    }

    const reg = registrationNumber.trim().toUpperCase()
    const pan = panNumber.trim().toUpperCase()
    const aad = onlyDigits(aadharNumber.trim())

    if (reg) payload.registrationNumber = reg
    if (pan) payload.panNumber = pan
    if (aad) payload.aadharNumber = aad

    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast({
          title: 'Create lead failed',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({ title: 'Lead created successfully', status: 'success' })
      resetForm()
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const createDisabled =
    loading ||
    existsState.checking ||
    existsState.exists ||
    Object.keys(errors).length > 0

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 6, md: 10 }}>
      <Container maxW="4xl">
        <Box
          bg="white"
          borderRadius="2xl"
          boxShadow="md"
          border="1px solid"
          borderColor="gray.100"
          p={{ base: 5, md: 8 }}
        >
          <VStack align="start" spacing={1} mb={6}>
            <Heading size="lg" color="blue.600" fontWeight="700">
              {selectedConfig.title}
            </Heading>
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize="sm" color="gray.500">
                Stage 1 - Basic Profile Capture
              </Text>

              {existsState.checking ? (
                <Badge colorScheme="yellow">Checking duplicate…</Badge>
              ) : existsState.exists ? (
                <Badge colorScheme="red">Duplicate Found</Badge>
              ) : (
                <Badge colorScheme="green">Unique Lead</Badge>
              )}
            </HStack>
          </VStack>

          {existsState.exists ? (
            <Alert status="error" borderRadius="xl" mb={5}>
              <AlertIcon />
              <Box>
                <Text fontWeight="700">
                  Lead already exists for: {existsState.matchedFields.join(', ') || 'identity fields'}
                </Text>
                {existsState.existingName ? (
                  <Text fontSize="sm" color="red.700">
                    Existing: {existsState.existingName}
                  </Text>
                ) : null}
                {existsState.existingId ? (
                  <Button
                    size="xs"
                    mt={2}
                    variant="outline"
                    onClick={() => router.push(`/profession/${existsState.existingId}`)}
                  >
                    Open existing profile
                  </Button>
                ) : null}
              </Box>
            </Alert>
          ) : existsState.error ? (
            <Alert status="warning" borderRadius="xl" mb={5}>
              <AlertIcon />
              <Text fontSize="sm">{existsState.error}</Text>
            </Alert>
          ) : null}

          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={{ base: 4, md: 6 }}>
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <FormControl isRequired isInvalid={!!(touched.profession && errors.profession)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Profession
                </FormLabel>
                <Select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value as ProfessionType)}
                  onBlur={() => markTouched('profession')}
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                >
                  {PROFESSION_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.profession}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isRequired isInvalid={!!(touched.fullName && errors.fullName)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Full Name
                </FormLabel>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => markTouched('fullName')}
                  placeholder="Enter full name"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.fullName}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <MultiSelect
                label="Qualification"
                placeholder="Select Qualification"
                options={selectedConfig.qualificationOptions}
                value={qualification}
                onChange={setQualification}
                isDisabled={loading}
              />
            </GridItem>

            <GridItem>
              <FormControl isInvalid={!!(touched.registrationNumber && errors.registrationNumber)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  {selectedConfig.registrationLabel}
                </FormLabel>
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  onBlur={() => markTouched('registrationNumber')}
                  placeholder={selectedConfig.registrationPlaceholder}
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.registrationNumber}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isInvalid={!!(touched.panNumber && errors.panNumber)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  PAN (optional)
                </FormLabel>
                <Input
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  onBlur={() => markTouched('panNumber')}
                  placeholder="ABCDE1234F"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.panNumber}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isRequired isInvalid={!!(touched.mobileNumber && errors.mobileNumber)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Mobile Number
                </FormLabel>
                <Input
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(normalizeMobileInput(e.target.value))}
                  onBlur={() => markTouched('mobileNumber')}
                  placeholder="Enter mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.mobileNumber}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isInvalid={!!(touched.aadharNumber && errors.aadharNumber)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Aadhar (optional)
                </FormLabel>
                <Input
                  value={aadharNumber}
                  onChange={(e) => setAadharNumber(onlyDigits(e.target.value).slice(0, 12))}
                  onBlur={() => markTouched('aadharNumber')}
                  placeholder="12 digit Aadhar"
                  inputMode="numeric"
                  maxLength={12}
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.aadharNumber}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isRequired isInvalid={!!(touched.email && errors.email)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Email ID
                </FormLabel>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched('email')}
                  placeholder="Enter email"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isRequired isInvalid={!!(touched.cityOrPinCode && errors.cityOrPinCode)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  City / Pin Code
                </FormLabel>
                <Input
                  value={cityOrPinCode}
                  onChange={(e) => setCityOrPinCode(e.target.value)}
                  onBlur={() => markTouched('cityOrPinCode')}
                  placeholder="Enter city or pin code"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.cityOrPinCode}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isInvalid={!!(touched.yearsOfPractice && errors.yearsOfPractice)}>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Years of Practice
                </FormLabel>
                <Input
                  value={yearsOfPractice}
                  onChange={(e) => setYearsOfPractice(onlyDigits(e.target.value))}
                  onBlur={() => markTouched('yearsOfPractice')}
                  placeholder="Enter years"
                  inputMode="numeric"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
                <FormErrorMessage>{errors.yearsOfPractice}</FormErrorMessage>
              </FormControl>
            </GridItem>

            <GridItem colSpan={{ base: 1, md: 2 }}>
              <MultiSelect
                label="Practice Type"
                placeholder="Select Practice Type"
                options={selectedConfig.practiceOptions}
                value={practiceType}
                onChange={setPracticeType}
                isDisabled={loading}
              />
            </GridItem>
          </Grid>

          <Button
            mt={6}
            w="100%"
            size="lg"
            bg="blue.600"
            color="white"
            _hover={{ bg: 'blue.700' }}
            borderRadius="xl"
            isLoading={loading}
            loadingText="Creating..."
            onClick={handleSubmit}
            isDisabled={createDisabled}
          >
            {existsState.exists
              ? 'Duplicate Found (Cannot Create)'
              : existsState.checking
              ? 'Checking...'
              : 'Create Lead'}
          </Button>
        </Box>
      </Container>
    </Box>
  )
}