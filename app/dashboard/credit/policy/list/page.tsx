'use client'

import {
  Box,
  Heading,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Switch,
  Button,
  HStack,
  Text,
  Spinner,
  Badge,
  useToast,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:3001'

export default function PolicyListPage() {
  const [policies, setPolicies] = useState<any[]>([])
  const [lenders, setLenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLender, setSelectedLender] = useState('')
  const toast = useToast()

  // 🔥 Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true)

      const [policyRes, lenderRes] = await Promise.all([
        axios.get(`${API}/lender-policy`),
        axios.get(`${API}/lender`),
      ])

      setPolicies(policyRes.data || [])
      setLenders(lenderRes.data || [])
    } catch (err) {
      toast({
        title: 'Error fetching data',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 🔥 Toggle Active
  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await axios.patch(`${API}/lender-policy/${id}`, {
        isActive: !current,
      })

      toast({
        title: 'Status updated',
        status: 'success',
      })

      fetchData()
    } catch {
      toast({
        title: 'Update failed',
        status: 'error',
      })
    }
  }

  // 🔥 Delete
  const deletePolicy = async (id: string) => {
    try {
      await axios.delete(`${API}/lender-policy/${id}`)
      toast({ title: 'Deleted', status: 'success' })
      fetchData()
    } catch {
      toast({ title: 'Delete failed', status: 'error' })
    }
  }

  // 🔥 Filter Logic
  const filtered = policies.filter((p) => {
    const lenderMatch = selectedLender
      ? p.lenderId?._id === selectedLender
      : true

    const searchMatch =
      p.lenderId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.allowedLocations?.join(',').toLowerCase().includes(search.toLowerCase())

    return lenderMatch && searchMatch
  })

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Lender Policy List
      </Heading>

      {/* 🔍 Filters */}
      <HStack mb={4} spacing={4}>
        <Input
          placeholder="Search by lender / location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          placeholder="Filter by Lender"
          value={selectedLender}
          onChange={(e) => setSelectedLender(e.target.value)}
        >
          {lenders.map((l: any) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </Select>
      </HStack>

      {/* 🔥 Table */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Text>No policies found</Text>
      ) : (
        <Table variant="simple" bg="white" borderRadius="lg">
          <Thead>
            <Tr>
              <Th>Lender</Th>
              <Th>CIBIL</Th>
              <Th>Loan Range</Th>
              <Th>Income</Th>
              <Th>FOIR</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {filtered.map((p: any) => (
              <Tr key={p._id}>
                <Td fontWeight="bold">
                  {p.lenderId?.name || 'N/A'}
                </Td>

                <Td>
                  {p.minCibil} - {p.maxCibil}
                </Td>

                <Td>
                  ₹{p.minLoanAmount} - ₹{p.maxLoanAmount}
                </Td>

                <Td>₹{p.minIncome || '-'}</Td>

                <Td>{p.maxFOIR || '-'}%</Td>

                <Td>
                  <Badge colorScheme={p.isActive ? 'green' : 'red'}>
                    {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </Td>

                <Td>
                  <HStack>
                    <Switch
                      isChecked={p.isActive}
                      onChange={() => toggleStatus(p._id, p.isActive)}
                    />

                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={() => deletePolicy(p._id)}
                    >
                      Delete
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  )
}