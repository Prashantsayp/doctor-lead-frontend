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
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react'

/** ✅ Move regex OUTSIDE component to avoid exhaustive-deps warning */
const MOBILE_REGEX = /^[6-9]\d{9}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const REG_REGEX = /^[A-Z0-9][A-Z0-9\/\-\s]{2,20}[A-Z0-9]$/i

type MultiSelectProps = {
  label: string
  placeholder?: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}

function MultiSelect({ label, placeholder = 'Select', options, value, onChange }: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt))
    else onChange([...value, opt])
  }

  const display =
    value.length === 0 ? placeholder : value.length <= 2 ? value.join(', ') : `${value.length} selected`

  return (
    <FormControl>
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
            <Button size="sm" variant="ghost" onClick={() => onChange([])}>
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

/** ---------- Helpers ---------- */
type DetectMode = 'mobile' | 'email' | 'reg'

function normalizePrefill(mode: DetectMode, qRaw: string) {
  const q = String(qRaw || '').trim()
  if (!q) return ''
  if (mode === 'reg') return q.toUpperCase().replace(/\s+/g, ' ').trim()
  if (mode === 'email') return q.toLowerCase()
  return q
}

const onlyDigits = (s: string) => String(s || '').replace(/\D/g, '')

type ExistsState = {
  checking: boolean
  exists: boolean
  matchedFields: string[]
  existingId?: string
  existingName?: string
  error?: string
}

async function checkLeadExists(params: {
  registrationNumber?: string
  panNumber?: string
  mobileNumber?: string
  aadharNumber?: string
}) {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_URL missing')

  const url = new URL(`${base}/doctor-lead/exists`)
  if (params.mobileNumber) url.searchParams.set('mobile', params.mobileNumber)
  if (params.registrationNumber) url.searchParams.set('registrationNumber', params.registrationNumber)
  if (params.panNumber) url.searchParams.set('panNumber', params.panNumber)
  if (params.aadharNumber) url.searchParams.set('aadharNumber', params.aadharNumber)

  const res = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Exists check failed')
  }

  return {
    exists: Boolean(data?.exists),
    matchedFields: Array.isArray(data?.matchedFields) ? data.matchedFields : [],
    existingId: data?.existingId,
    existingName: data?.existingName,
  }
}

export default function NewDoctorLeadPage() {
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

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

  const [existsState, setExistsState] = React.useState<ExistsState>({
    checking: false,
    exists: false,
    matchedFields: [],
  })

  const QUAL_OPTIONS = ['DM', 'MD', 'MS', 'DNB', 'MDS', 'MBBS', 'BDS', 'BHMS', 'BAMS', 'Other']
  const PRACTICE_OPTIONS = [
    'Private Clinic',
    'Hospital',
    'Govt Hospital',
    'Polyclinic',
    'Nursing Home',
    'Diagnostic Center',
    'Consultant',
    'Other',
  ]

  React.useEffect(() => {
    if (!searchParams) return

    const mode = (searchParams.get('mode') || '') as DetectMode
    const q = searchParams.get('q') || ''

    if (!q) return
    if (mode !== 'mobile' && mode !== 'email' && mode !== 'reg') return

    const v = normalizePrefill(mode, q)

    if (mode === 'mobile') setMobileNumber(v)
    if (mode === 'email') setEmail(v)
    if (mode === 'reg') setRegistrationNumber(v)
  }, [searchParams])

  React.useEffect(() => {
    const reg = registrationNumber.trim().toUpperCase()
    const pan = panNumber.trim().toUpperCase()
    const mob = onlyDigits(mobileNumber.trim())
    const aad = onlyDigits(aadharNumber.trim())

    if (!reg && !pan && !mob && !aad) {
      setExistsState({ checking: false, exists: false, matchedFields: [] })
      return
    }

    const canCheckMobile = mob ? mob.length === 10 : false
    const canCheckAadhar = aad ? aad.length === 12 : false
    const canCheckPan = pan ? PAN_REGEX.test(pan) : false
    const canCheckReg = reg ? REG_REGEX.test(reg) : false

    if (!(canCheckMobile || canCheckAadhar || canCheckPan || canCheckReg)) {
      setExistsState((s) => ({ ...s, exists: false, matchedFields: [], error: undefined }))
      return
    }

    const t = setTimeout(async () => {
      try {
        setExistsState((s) => ({ ...s, checking: true, error: undefined }))
        const result = await checkLeadExists({
          registrationNumber: canCheckReg ? reg : undefined,
          panNumber: canCheckPan ? pan : undefined,
          mobileNumber: canCheckMobile ? mob : undefined,
          aadharNumber: canCheckAadhar ? aad : undefined,
        })
        setExistsState({ checking: false, ...result })
      } catch (e: any) {
        setExistsState({ checking: false, exists: false, matchedFields: [], error: e?.message || 'Error' })
      }
    }, 400)

    return () => clearTimeout(t)
  }, [registrationNumber, panNumber, mobileNumber, aadharNumber])

  const handleSubmit = async () => {
    const name = fullName.trim()
    const reg = registrationNumber.trim().toUpperCase()
    const pan = panNumber.trim().toUpperCase()
    const aad = onlyDigits(aadharNumber.trim())
    const mob = onlyDigits(mobileNumber.trim())
    const mail = email.trim().toLowerCase()
    const city = cityOrPinCode.trim()

    if (!name || !reg || !mob || !mail) {
      toast({ title: 'Please fill Name, Registration, Mobile & Email', status: 'warning' })
      return
    }

    if (!REG_REGEX.test(reg)) {
      toast({ title: 'Invalid Registration Number', status: 'warning' })
      return
    }
    if (!MOBILE_REGEX.test(mob)) {
      toast({ title: 'Invalid Mobile Number', description: 'Enter valid 10 digit number', status: 'warning' })
      return
    }
    if (pan && !PAN_REGEX.test(pan)) {
      toast({ title: 'Invalid PAN', description: 'Format: ABCDE1234F', status: 'warning' })
      return
    }
    if (aad && !/^\d{12}$/.test(aad)) {
      toast({ title: 'Invalid Aadhar', description: 'Aadhar must be 12 digits', status: 'warning' })
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
      fullName: name,
      registrationNumber: reg,
      mobileNumber: mob,
      email: mail,
      cityOrPinCode: city,
      yearsOfPractice: yearsOfPractice ? Number(yearsOfPractice) : undefined,
      qualification,
      practiceType,
    }

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
      setExistsState({ checking: false, exists: false, matchedFields: [] })
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const createDisabled = loading || existsState.checking || existsState.exists

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
              New Doctor Lead
            </Heading>
            <HStack spacing={2}>
              <Text fontSize="sm" color="gray.500">
                Stage 1 - Basic Profile Capture
              </Text>

              {existsState.checking ? (
                <Badge colorScheme="yellow">Checking duplicate…</Badge>
              ) : existsState.exists ? (
                <Badge colorScheme="red">Duplicate Found</Badge>
              ) : null}
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
                    onClick={() => router.push(`/doctor/${existsState.existingId}`)}
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
            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Full Name
                </FormLabel>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <MultiSelect
                label="Qualification"
                placeholder="Select Qualification"
                options={QUAL_OPTIONS}
                value={qualification}
                onChange={setQualification}
              />
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Registration Number
                </FormLabel>
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="MCI-12345 / UP-889900"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  PAN (optional)
                </FormLabel>
                <Input
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Mobile Number
                </FormLabel>
                <Input
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Enter mobile number"
                  inputMode="numeric"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Aadhar (optional)
                </FormLabel>
                <Input
                  value={aadharNumber}
                  onChange={(e) => setAadharNumber(e.target.value)}
                  placeholder="12 digit Aadhar"
                  inputMode="numeric"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Email ID
                </FormLabel>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  City / Pin Code
                </FormLabel>
                <Input
                  value={cityOrPinCode}
                  onChange={(e) => setCityOrPinCode(e.target.value)}
                  placeholder="Enter city or pin code"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  Years of Practice
                </FormLabel>
                <Input
                  value={yearsOfPractice}
                  onChange={(e) => setYearsOfPractice(e.target.value)}
                  placeholder="Enter years"
                  inputMode="numeric"
                  bg="white"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'gray.300' }}
                  focusBorderColor="blue.400"
                />
              </FormControl>
            </GridItem>

            <GridItem colSpan={{ base: 1, md: 2 }}>
              <MultiSelect
                label="Practice Type"
                placeholder="Select Practice Type"
                options={PRACTICE_OPTIONS}
                value={practiceType}
                onChange={setPracticeType}
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