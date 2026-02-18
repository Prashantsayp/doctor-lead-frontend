'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  HStack,
  Heading,
  Input,
  Stack,
  Text,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Progress,
  useToast,
} from '@chakra-ui/react'

type DoctorLead = {
  _id: string
  fullName: string
  registrationNumber?: string
  mobileNumber: string
  email: string
  cityOrPinCode?: string
  qualification?: string[]
  remarks?: string

  // financial fields (backend schema me bhi add karne honge)
  monthlyGrossIncome?: number
  monthlyNetIncome?: number
  otherIncomeSources?: number
}

export default function UpdateDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [doctor, setDoctor] = React.useState<DoctorLead | null>(null)

  const [monthlyGrossIncome, setMonthlyGrossIncome] = React.useState('')
  const [monthlyNetIncome, setMonthlyNetIncome] = React.useState('')
  const [otherIncomeSources, setOtherIncomeSources] = React.useState('')

  const getToken = () => {
    if (typeof window === 'undefined') return null
    const t = localStorage.getItem('token')
    if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null
    return t
  }

  const toNumberOrUndef = (v: string) => {
    const t = v.trim()
    if (!t) return undefined
    const n = Number(t)
    return Number.isNaN(n) ? undefined : n
  }

  // ✅ load doctor on page open
  React.useEffect(() => {
    const run = async () => {
      if (!id) return

      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast({
            title: 'Doctor not found',
            description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
            status: 'error',
          })
          router.push(`/doctor/${id}`)
          return
        }

        setDoctor(data)
        setMonthlyGrossIncome(data?.monthlyGrossIncome?.toString?.() ?? '')
        setMonthlyNetIncome(data?.monthlyNetIncome?.toString?.() ?? '')
        setOtherIncomeSources(data?.otherIncomeSources?.toString?.() ?? '')
      } catch {
        toast({ title: 'Server error', status: 'error' })
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [id, router, toast])

  // ✅ save financial fields
  const handleSave = async () => {
    const token = getToken()
    if (!token) {
      toast({ title: 'Please login first', status: 'info' })
      router.push('/login')
      return
    }

    const payload = {
      monthlyGrossIncome: toNumberOrUndef(monthlyGrossIncome),
      monthlyNetIncome: toNumberOrUndef(monthlyNetIncome),
      otherIncomeSources: toNumberOrUndef(otherIncomeSources),
    }

    setSaving(true)
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
          title: 'Save failed',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({ title: 'Profile updated', status: 'success' })
      router.push(`/doctor/${id}`)
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 6, md: 10 }}>
      <Container maxW="container.xl">
        <Button variant="ghost" size="sm" mb={4} onClick={() => router.push(`/doctor/${id}`)}>
          ← Back
        </Button>

        {/* header */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Box>
              <Heading size="md">{doctor?.fullName || (loading ? 'Loading...' : '—')}</Heading>
              <Text fontSize="sm" color="gray.600" mt={1}>
                {(doctor?.qualification || []).join(', ') || '—'} <Text as="span" color="gray.400">•</Text> {doctor?.cityOrPinCode || '—'}
              </Text>
            </Box>
            <HStack spacing={8}>
              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">Mobile</Text>
                <Text fontWeight="700">{doctor?.mobileNumber || '—'}</Text>
              </Box>
              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">Reg No</Text>
                <Text fontWeight="700">{doctor?.registrationNumber || 'N/A'}</Text>
              </Box>
            </HStack>
          </HStack>
        </Box>

        <Box
          mt={6}
          display="grid"
          gridTemplateColumns={{ base: '1fr', lg: '360px 1fr' }}
          gap={5}
          alignItems="start"
        >
          {/* progress */}
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 5 }} boxShadow="sm">
            <Heading size="sm" mb={4}>Progress</Heading>

            <Stack spacing={4}>
              <Box>
                <HStack justify="space-between">
                  <Text fontSize="sm">Personal</Text>
                  <Text fontSize="sm" color="green.600" fontWeight="700">Done</Text>
                </HStack>
                <Progress mt={2} value={100} borderRadius="full" />
              </Box>

              <Box>
                <HStack justify="space-between">
                  <Text fontSize="sm">Financials</Text>
                  <Text fontSize="sm" color="blue.600" fontWeight="700">In Progress</Text>
                </HStack>
                <Progress mt={2} value={55} borderRadius="full" />
              </Box>

              <Box>
                <HStack justify="space-between">
                  <Text fontSize="sm">Assets</Text>
                  <Text fontSize="sm" color="gray.500" fontWeight="700">Pending</Text>
                </HStack>
                <Progress mt={2} value={5} borderRadius="full" />
              </Box>
            </Stack>
          </Box>

          {/* right card */}
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
            <HStack justify="space-between" align="start" mb={3}>
              <Box>
                <Heading size="sm">Financial Profile Enrichment</Heading>
                <Text fontSize="sm" color="gray.500">
                  Update income and obligation details for better credit assessment.
                </Text>
              </Box>
              <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
                Credit &amp; Remarks
              </Badge>
            </HStack>

            <Divider borderColor="gray.100" my={4} />

            <Tabs variant="soft-rounded" colorScheme="blue">
              <TabList bg="gray.50" borderRadius="xl" p={1}>
                <Tab borderRadius="xl" fontWeight="700">Income &amp; Cash Flow</Tab>
                <Tab borderRadius="xl" fontWeight="700">Obligations</Tab>
                <Tab borderRadius="xl" fontWeight="700">Assets</Tab>
              </TabList>

              <TabPanels mt={5}>
                <TabPanel p={0}>
                  <Box display="grid" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                    <Field label="Monthly Gross Income" value={monthlyGrossIncome} onChange={setMonthlyGrossIncome} />
                    <Field label="Monthly Net Income" value={monthlyNetIncome} onChange={setMonthlyNetIncome} />
                    <Field label="Other Income Sources" value={otherIncomeSources} onChange={setOtherIncomeSources} />
                    <Box />
                  </Box>

                  <HStack justify="flex-end" pt={6}>
                    <Button
                      colorScheme="blue"
                      borderRadius="lg"
                      onClick={handleSave}
                      isLoading={saving || loading}
                      loadingText="Saving..."
                    >
                      Save &amp; Update Profile
                    </Button>
                  </HStack>
                </TabPanel>

                <TabPanel p={0}>
                  <Box py={8} textAlign="center" color="gray.400">
                    <Text fontSize="sm">Obligations form will come here.</Text>
                  </Box>
                </TabPanel>

                <TabPanel p={0}>
                  <Box py={8} textAlign="center" color="gray.400">
                    <Text fontSize="sm">Assets form will come here.</Text>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
        {label}
      </Text>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter amount"
        borderRadius="xl"
        bg="white"
        borderColor="gray.200"
        _hover={{ borderColor: 'gray.300' }}
        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 4px rgba(49,130,206,0.12)' }}
      />
    </Box>
  )
}
