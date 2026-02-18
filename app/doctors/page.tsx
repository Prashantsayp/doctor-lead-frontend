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
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
} from '@chakra-ui/react'
import { jwtDecode } from 'jwt-decode'

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'

type DoctorLeadRow = {
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

  remarks?: string

  monthlyGrossIncome?: number
  monthlyNetIncome?: number
  otherIncomeSources?: number

  monthlyEmi?: number
  activeLoans?: number
  loanType?: string
  hasOverdue?: boolean

  cibilScore?: number | null

  hasProperty?: boolean
  propertyValue?: number
  medicalEquipmentValue?: number
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

export default function AdminDoctorsPage() {
  const router = useRouter()
  const toast = useToast()

  const [role, setRole] = React.useState<AppRole | null>(null)
  const isAdmin = role === 'ADMIN'

  // list state
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<DoctorLeadRow[]>([])
  const [err, setErr] = React.useState<string | null>(null)

  // filters
  const [q, setQ] = React.useState('')
  const [risk, setRisk] = React.useState<'all' | 'low' | 'medium' | 'high'>('all')

  React.useEffect(() => {
    setRole(getRoleFromToken())
  }, [])

  // ✅ admin-only
  React.useEffect(() => {
    if (role === null) return
    if (!isAdmin) {
      toast({ title: 'Access denied', description: 'Only ADMIN can view all doctors.', status: 'warning' })
      router.replace('/')
    }
  }, [role, isAdmin, router, toast])

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
      // ✅ IMPORTANT: change this endpoint to your "get all doctors" API
      // Example used: /doctor-lead (GET all)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/get-lead`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErr(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to fetch doctors')
        setRows([])
        return
      }

      setRows(Array.isArray(data) ? data : data?.items ?? [])
    } catch {
      setErr('Server error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [router])

  React.useEffect(() => {
    if (!isAdmin) return
    fetchAll()
  }, [isAdmin, fetchAll])

  const calcProfileCompletion = (d: DoctorLeadRow) => {
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
    ]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }

  const getRiskBucket = (completion: number) => (completion >= 70 ? 'Low' : completion >= 40 ? 'Medium' : 'High')
  const riskColor = (bucket: 'Low' | 'Medium' | 'High') => (bucket === 'Low' ? 'green' : bucket === 'Medium' ? 'yellow' : 'red')

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase()

    return rows.filter((d) => {
      const completion = calcProfileCompletion(d)
      const bucket = getRiskBucket(completion)

      const matchesQ =
        !s ||
        d.fullName?.toLowerCase().includes(s) ||
        d.mobileNumber?.toLowerCase().includes(s) ||
        d.email?.toLowerCase().includes(s) ||
        (d.registrationNumber || '').toLowerCase().includes(s) ||
        (d.cityOrPinCode || '').toLowerCase().includes(s)

      const matchesRisk =
        risk === 'all' ||
        (risk === 'low' && bucket === 'Low') ||
        (risk === 'medium' && bucket === 'Medium') ||
        (risk === 'high' && bucket === 'High')

      return matchesQ && matchesRisk
    })
  }, [rows, q, risk])

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 6, md: 10 }}>
      <Container maxW="container.2xl">
        {/* Header */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Box>
              <Heading size="md">All Doctors (Admin)</Heading>
              <Text fontSize="sm" color="gray.600" mt={1}>
                Search + filter + open a doctor profile.
              </Text>
            </Box>

            <HStack>
              <Button variant="outline" borderRadius="xl" onClick={fetchAll} isDisabled={loading}>
                Refresh
              </Button>
            </HStack>
          </HStack>

          <Divider my={4} />

          <HStack spacing={3} flexWrap="wrap">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search: name / mobile / email / reg no / city"
              maxW="420px"
              bg="white"
            />

            <Select value={risk} onChange={(e) => setRisk(e.target.value as any)} maxW="220px" bg="white">
              <option value="all">All Risk Buckets</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>

            {!loading ? (
              <Text fontSize="sm" color="gray.600">
                Showing <b>{filtered.length}</b> / {rows.length}
              </Text>
            ) : null}
          </HStack>
        </Box>

        {/* Table */}
        <Box mt={6} bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p={{ base: 4, md: 6 }} boxShadow="sm">
          {loading ? (
            <HStack py={10} justify="center">
              <Spinner />
              <Text>Loading doctors...</Text>
            </HStack>
          ) : err ? (
            <Box py={10} textAlign="center">
              <Text color="red.500" fontWeight="700">
                {err}
              </Text>
            </Box>
          ) : filtered.length === 0 ? (
            <Box py={10} textAlign="center">
              <Text color="gray.500">No doctors found.</Text>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Mobile</Th>
                    <Th>Email</Th>
                    <Th>Reg No</Th>
                    <Th>City</Th>
                    <Th>Completion</Th>
                    <Th>Risk</Th>
                    <Th>Created</Th>
                    <Th textAlign="right">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.map((d) => {
                    const completion = calcProfileCompletion(d)
                    const bucket = getRiskBucket(completion)
                    const color = riskColor(bucket as any)

                    return (
                      <Tr key={d._id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="700">{d.fullName || '—'}</Td>
                        <Td>{d.mobileNumber || '—'}</Td>
                        <Td>{d.email || '—'}</Td>
                        <Td>{d.registrationNumber || '—'}</Td>
                        <Td>{d.cityOrPinCode || '—'}</Td>
                        <Td>
                          <Badge borderRadius="full" px={2} py={0.5} colorScheme={completion >= 70 ? 'green' : completion >= 40 ? 'yellow' : 'red'}>
                            {completion}%
                          </Badge>
                        </Td>
                        <Td>
                          <Badge borderRadius="full" px={2} py={0.5} colorScheme={color}>
                            {bucket}
                          </Badge>
                        </Td>
                        <Td fontSize="xs" color="gray.600">
                          {d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN') : '—'}
                        </Td>
                        <Td textAlign="right">
                          <Button
                            size="xs"
                            colorScheme="blue"
                            variant="outline"
                            borderRadius="lg"
                            onClick={() => router.push(`/doctor/${d._id}`)}
                          >
                            Open
                          </Button>
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  )
}
