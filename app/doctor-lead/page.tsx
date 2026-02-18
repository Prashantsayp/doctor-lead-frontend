'use client'

import * as React from 'react'
import {
  Box,
  Button,
  Checkbox,
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
} from '@chakra-ui/react';
// import SimpleNavbar from '#components/SimpleNavbar';

/** ---------- MultiSelect Dropdown (Chakra) ---------- */
type MultiSelectProps = {
  label: string
  placeholder?: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}

function MultiSelect({
  label,
  placeholder = 'Select',
  options,
  value,
  onChange,
}: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt))
    else onChange([...value, opt])
  }

  const display =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? value.join(', ')
        : `${value.length} selected`

  return (
    <FormControl>
      <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
        {label}
      </FormLabel>

      <Menu closeOnSelect={false}>
        <MenuButton
          as={Button}
          rightIcon={<Box as="span" fontSize="12px">▼</Box>} // ✅ no @chakra-ui/icons
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
            {options.map((opt) => (
              <Box
                key={opt}
                px={2}
                py={2}
                borderRadius="md"
                _hover={{ bg: 'gray.50' }}
                cursor="pointer"
                onClick={() => toggle(opt)}
              >
                <Checkbox isChecked={value.includes(opt)} pointerEvents="none">
                  <Text fontSize="sm">{opt}</Text>
                </Checkbox>
              </Box>
            ))}
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

/** ---------- Page ---------- */
export default function NewDoctorLeadPage() {
  const toast = useToast()

  const [fullName, setFullName] = React.useState('')
  const [registrationNumber, setRegistrationNumber] = React.useState('') // ✅ NEW
  const [mobileNumber, setMobileNumber] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [cityOrPinCode, setCityOrPinCode] = React.useState('')
  const [yearsOfPractice, setYearsOfPractice] = React.useState('')

  const [qualification, setQualification] = React.useState<string[]>([])
  const [practiceType, setPracticeType] = React.useState<string[]>([])

  const [consent, setConsent] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const QUAL_OPTIONS = ['MBBS', 'BDS', 'BHMS', 'BAMS', 'MD', 'MS', 'DM', 'DNB', 'MDS', 'Other']
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

  // ✅ validators (same as backend)
  const REG_REGEX = /^[A-Z]{2,5}-[0-9]{3,10}$/
  const MOBILE_REGEX = /^[6-9]\d{9}$/

  const handleSubmit = async () => {
    const name = fullName.trim()
    const reg = registrationNumber.trim().toUpperCase()
    const mob = mobileNumber.trim()
    const mail = email.trim().toLowerCase()

    if (!name || !reg || !mob || !mail) {
      toast({ title: 'Please fill Name, Registration, Mobile & Email', status: 'warning' })
      return
    }

    if (!REG_REGEX.test(reg)) {
      toast({
        title: 'Invalid Registration Number',
        description: 'Format should be like MCI-12345 / UP-889900',
        status: 'warning',
      })
      return
    }

    if (!MOBILE_REGEX.test(mob)) {
      toast({ title: 'Invalid Mobile Number', description: 'Enter valid 10 digit number', status: 'warning' })
      return
    }

    if (!consent) {
      toast({ title: 'Please give consent to proceed', status: 'warning' })
      return
    }

    const payload = {
      fullName: name,
      registrationNumber: reg, // ✅ NEW
      mobileNumber: mob,
      email: mail,
      cityOrPinCode: cityOrPinCode.trim(),
      yearsOfPractice: yearsOfPractice ? Number(yearsOfPractice) : undefined,
      qualification,
      practiceType,
      consent,
    }

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
          description: Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({ title: 'Lead created successfully', status: 'success' })

      setFullName('')
      setRegistrationNumber('') // ✅ reset
      setMobileNumber('')
      setEmail('')
      setCityOrPinCode('')
      setYearsOfPractice('')
      setQualification([])
      setPracticeType([])
      setConsent(false)
    } catch (e) {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

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
            <Text fontSize="sm" color="gray.500">
              Stage 1 - Basic Profile Capture
            </Text>
          </VStack>

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

            {/* ✅ NEW Registration Number */}
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

          <Box mt={6} p={4} border="1px solid" borderColor="gray.200" borderRadius="xl" bg="white">
            <HStack align="start" spacing={3}>
              <Checkbox mt={0.5} isChecked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <Box>
                <Text fontWeight="600" fontSize="sm" color="gray.800">
                  Consent for Bureau & Contact
                </Text>
                <Text fontSize="sm" color="gray.500">
                  I authorize F2 Fintech to fetch my CIBIL report and contact me for loan offers.
                </Text>
              </Box>
            </HStack>
          </Box>

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
          >
            Create Lead
          </Button>
        </Box>
      </Container>
    </Box>
  )
}
