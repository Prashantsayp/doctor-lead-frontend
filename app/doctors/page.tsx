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

  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<DoctorLeadRow[]>([])
  const [err, setErr] = React.useState<string | null>(null)

  // pagination
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(20)
  const [totalDoctors, setTotalDoctors] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)

  // search + risk
  const [q, setQ] = React.useState('')
  const [risk, setRisk] = React.useState<'all' | 'low' | 'medium' | 'high'>('all')

  // debounce search
  const [debouncedQ, setDebouncedQ] = React.useState(q)
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => {
    setRole(getRoleFromToken())
  }, [])

  // admin-only
  React.useEffect(() => {
    if (role === null) return
    if (!isAdmin) {
      toast({
        title: 'Access denied',
        description: 'Only ADMIN can view all doctors.',
        status: 'warning',
      })
      router.replace('/')
    }
  }, [role, isAdmin, router, toast])

  // reset page when search changes
  React.useEffect(() => {
    setPage(1)
  }, [debouncedQ])

  const fetchTotalDoctors = React.useCallback(async (token: string) => {
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/count`)
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      if (typeof data?.totalDoctors === 'number') setTotalDoctors(data.totalDoctors)
      // fallback (if only {total} return ho)
      if (typeof data?.total === 'number') setTotalDoctors(data.total)
    } catch {
      // ignore
    }
  }, [])

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
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/get-lead`)
      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', String(limit))
      if (debouncedQ?.trim()) url.searchParams.set('search', debouncedQ.trim())

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErr(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || 'Failed to fetch doctors',
        )
        setRows([])
        return
      }

      const items = Array.isArray(data) ? data : data?.items ?? []
      setRows(items)

      if (typeof data?.totalPages === 'number') setTotalPages(data.totalPages || 1)

      await fetchTotalDoctors(token)
    } catch {
      setErr('Server error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [router, page, limit, debouncedQ, fetchTotalDoctors])

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

  const getRiskBucket = (completion: number) =>
    completion >= 70 ? 'Low' : completion >= 40 ? 'Medium' : 'High'

  const riskColor = (bucket: 'Low' | 'Medium' | 'High') =>
    bucket === 'Low' ? 'green' : bucket === 'Medium' ? 'yellow' : 'red'

  // risk filter (client-side on current page)
  const filtered = React.useMemo(() => {
    return rows.filter((d) => {
      const completion = calcProfileCompletion(d)
      const bucket = getRiskBucket(completion)

      const matchesRisk =
        risk === 'all' ||
        (risk === 'low' && bucket === 'Low') ||
        (risk === 'medium' && bucket === 'Medium') ||
        (risk === 'high' && bucket === 'High')

      return matchesRisk
    })
  }, [rows, risk])

  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 6, md: 10 }}>
      <Container maxW="container.2xl">
        {/* Header */}
        <Box
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="2xl"
          p={{ base: 4, md: 6 }}
          boxShadow="sm"
        >
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Box>
              <Heading size="md">All Doctors (Admin)</Heading>
              <Text fontSize="sm" color="gray.600" mt={1}>
                Search + filter + open a doctor profile.
              </Text>
            </Box>

            {/* ✅ Total Doctors moved to right (Refresh removed) */}
            {!loading ? (
              <Badge
                borderRadius="full"
                px={4}
                py={2}
                fontSize="sm"
                colorScheme="blue"
                variant="subtle"
              >
                Total Doctors: {totalDoctors}
              </Badge>
            ) : null}
          </HStack>

          <Divider my={4} />

          <HStack spacing={3} flexWrap="wrap" align="center">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search: name / mobile / email / reg no / city"
              maxW="520px"
              bg="white"
            />

            <Select
              value={risk}
              onChange={(e) => setRisk(e.target.value as any)}
              maxW="220px"
              bg="white"
            >
              <option value="all">All Risk Buckets</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </HStack>
        </Box>

        {/* Table */}
        <Box
          mt={6}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="2xl"
          p={{ base: 4, md: 6 }}
          boxShadow="sm"
        >
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
                          <Badge
                            borderRadius="full"
                            px={2}
                            py={0.5}
                            colorScheme={
                              completion >= 70
                                ? 'green'
                                : completion >= 40
                                ? 'yellow'
                                : 'red'
                            }
                          >
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

              {/* Bottom Pagination: ONE LINE */}
              <Divider my={4} />
              <HStack justify="space-between" flexWrap="wrap" gap={3}>
                <Text fontSize="sm" color="gray.600">
                  Page <b>{page}</b> / {totalPages}
                </Text>

                <HStack spacing={3}>
                  <Select
                    value={String(limit)}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1)
                    }}
                    maxW="140px"
                    bg="white"
                    borderRadius="xl"
                  >
                    <option value="10">10 / page</option>
                    <option value="20">20 / page</option>
                    <option value="50">50 / page</option>
                    <option value="100">100 / page</option>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    borderRadius="xl"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    isDisabled={!canPrev}
                  >
                    Prev
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    borderRadius="xl"
                    onClick={() => setPage((p) => p + 1)}
                    isDisabled={!canNext}
                  >
                    Next
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