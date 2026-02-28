'use client'

import * as React from 'react'
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { FiUpload, FiDatabase, FiSearch, FiCheckCircle } from 'react-icons/fi'

export default function BulkSyncPage() {
  const toast = useToast()

  const [file, setFile] = React.useState<File | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const pickFile = () => inputRef.current?.click()

  const validateFile = (f: File) => {
    const name = f.name.toLowerCase()
    const ok = name.endsWith('.csv') || name.endsWith('.xlsx')
    if (!ok) {
      toast({
        title: 'Invalid file type',
        description: 'Only .csv or .xlsx allowed.',
        status: 'warning',
      })
      return false
    }
    return true
  }

  const onFileSelected = (f: File | null) => {
    if (!f) return
    if (!validateFile(f)) return
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onFileSelected(dropped)
  }

  // ✅ strict CSV encoder (prevents missing columns / shifting)
  const csvCell = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }

  const downloadSampleCsv = () => {
    // ✅ mandatory: fullName, mobileNumber, cityOrPinCode
    // ✅ optional: includes panNumber + aadharNumber (NOT mandatory)
    const headers = [
      'fullName',
      'mobileNumber',
      'cityOrPinCode',

      'email',
      'registrationNumber',
      'panNumber',
      'aadharNumber',
      'yearsOfPractice',
      'qualification',
      'practiceType',
      'remarks',
      'consent',
      'monthlyGrossIncome',
      'monthlyNetIncome',
      'otherIncomeSources',
      'monthlyEmi',
      'activeLoans',
      'loanType',
      'hasOverdue',
      'hasProperty',
      'propertyValue',
      'medicalEquipmentValue',
      'cibilScore',
    ]

    const rows: (string | number | boolean | null | undefined)[][] = [
      [
        'Dr. Asha Mehta',
        '9876543210',
        'Delhi',

        'asha.mehta@example.com',
        'REG-DEL-12345',
        'ABCDE1234F', // ✅ panNumber
        '123412341234', // ✅ aadharNumber
        8,
        'MBBS|MD', // ✅ use | to avoid comma issues in CSV
        'Clinic|Hospital',
        'Interested in working capital',
        true,
        300000,
        220000,
        15000,
        25000,
        2,
        'Business Loan',
        false,
        true,
        15000000,
        300000,
        782,
      ],
    ]

    const csv = [
      headers.map(csvCell).join(','),
      ...rows.map((r) => headers.map((_, i) => csvCell(r[i])).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'doctor-lead-sample.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    toast({ title: 'Sample file downloaded', status: 'success' })
  }

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'Please select a file first', status: 'info' })
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const baseUrl = String(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
      const url = `${baseUrl}/doctor-lead/bulk-sync/upload`

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        // ✅ DO NOT set Content-Type manually for FormData
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast({
          title: 'Upload failed',
          description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      toast({
        title: 'File uploaded successfully',
        description: `Inserted: ${data?.inserted ?? 0}, Updated: ${data?.updated ?? 0}, Skipped: ${data?.skipped ?? 0}`,
        status: 'success',
      })

      setFile(null)
    } catch (e: any) {
      toast({
        title: 'Server error',
        description: e?.message || 'Something went wrong',
        status: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box minH="100vh" bg="gray.50" pt="90px" pb={{ base: 10, md: 14 }}>
      <Container maxW="container.lg">
        {/* Title */}
        <Stack spacing={2} align="center" textAlign="center" mb={{ base: 8, md: 10 }}>
          <HStack spacing={2}>
            <Icon as={FiDatabase} boxSize={7} color="blue.600" />
            <Heading fontSize={{ base: '2xl', md: '3xl' }} color="blue.700" fontWeight="800">
              Data Synchronization Engine
            </Heading>
          </HStack>
          <Text color="gray.600" maxW="2xl">
            Bulk upload doctor records to identify existing profiles and capture new leads at scale.
          </Text>
        </Stack>

        <Flex gap={6} direction={{ base: 'column', md: 'row' }} align="stretch">
          {/* Upload Card */}
          <Box
            flex="1"
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="gray.200"
            p={{ base: 6, md: 8 }}
            boxShadow="sm"
          >
            <Box
              border="2px dashed"
              borderColor={dragOver ? 'blue.400' : 'gray.200'}
              bg={dragOver ? 'blue.50' : 'transparent'}
              borderRadius="2xl"
              py={{ base: 10, md: 12 }}
              px={{ base: 5, md: 8 }}
              textAlign="center"
              transition="0.15s"
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragOver(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragOver(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragOver(false)
              }}
              onDrop={handleDrop}
            >
              <Box
                mx="auto"
                mb={4}
                w="64px"
                h="64px"
                borderRadius="full"
                bg="blue.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiUpload} boxSize={7} color="blue.600" />
              </Box>

              <Heading size="md" color="gray.800" mb={2}>
                Upload Doctor Database
              </Heading>
              <Text color="gray.500" fontSize="sm" mb={5}>
                Drag and drop your CSV/Excel file or click to browse
              </Text>

              <Input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                display="none"
                onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
              />

              <HStack justify="center" spacing={4}>
                <Button variant="outline" borderRadius="xl" onClick={downloadSampleCsv}>
                  Download Sample
                </Button>

                <Button colorScheme="blue" borderRadius="xl" onClick={pickFile}>
                  Select File
                </Button>
              </HStack>

              <Text mt={4} fontSize="xs" color="gray.500">
                Supported: .csv, .xlsx (Max 1M rows)
              </Text>

              {file ? (
                <Box mt={6} p={3} border="1px solid" borderColor="gray.200" borderRadius="xl" bg="gray.50">
                  <HStack justify="space-between">
                    <Box textAlign="left" maxW="70%">
                      <Text fontWeight="700" fontSize="sm" color="gray.700" noOfLines={1}>
                        {file.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </Text>
                    </Box>

                    <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                      Remove
                    </Button>
                  </HStack>

                  <Button
                    mt={3}
                    w="100%"
                    colorScheme="blue"
                    borderRadius="xl"
                    onClick={handleUpload}
                    isLoading={uploading}
                    loadingText="Uploading..."
                  >
                    Upload & Sync
                  </Button>
                </Box>
              ) : null}
            </Box>
          </Box>

          {/* Sync Logic Card */}
          <Box
            w={{ base: '100%', md: '320px' }}
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="gray.200"
            p={6}
            boxShadow="sm"
          >
            <Text fontWeight="800" color="gray.700" fontSize="sm" mb={4}>
              SYNC LOGIC
            </Text>

            <Stack spacing={4}>
              <HStack align="start" spacing={3}>
                <Box
                  w="34px"
                  h="34px"
                  borderRadius="lg"
                  bg="blue.50"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FiSearch} color="blue.600" />
                </Box>
                <Box>
                  <Text fontWeight="700" color="gray.800" fontSize="sm">
                    Deduplication
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Checks against Mobile, Email, and Reg No.
                  </Text>
                </Box>
              </HStack>

              <HStack align="start" spacing={3}>
                <Box
                  w="34px"
                  h="34px"
                  borderRadius="lg"
                  bg="green.50"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FiCheckCircle} color="green.600" />
                </Box>
                <Box>
                  <Text fontWeight="700" color="gray.800" fontSize="sm">
                    Conflict Resolution
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Existing records are automatically enriched with new data points.
                  </Text>
                </Box>
              </HStack>
            </Stack>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}