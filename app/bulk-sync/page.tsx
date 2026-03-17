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
  Select,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { FiCheckCircle, FiDatabase, FiSearch, FiUpload } from 'react-icons/fi'

const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx']

type LeadProfession = 'DOCTOR' | 'CA' | 'LAWYER' | 'ENGINEER'

const PROFESSION_OPTIONS: LeadProfession[] = ['DOCTOR', 'CA', 'LAWYER', 'ENGINEER']

const BULK_HEADERS = [
  'profession',
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

const SAMPLE_ROWS: Record<LeadProfession, Array<string | number | boolean>> = {
  DOCTOR: [
    'DOCTOR',
    'Dr. Asha Mehta',
    '9876543210',
    'Delhi',
    'asha.mehta@example.com',
    'REG-DEL-12345',
    'ABCDE1234F',
    '123412341234',
    8,
    'MBBS|MD',
    'Clinic|Hospital',
    'Interested in working capital',
    300000,
    220000,
    15000,
    25000,
    2,
    'Business Loan|Personal Loan',
    false,
    true,
    15000000,
    300000,
    782,
  ],
  CA: [
    'CA',
    'Amit Sharma',
    '9876543211',
    'Noida',
    'amit.sharma@example.com',
    'CA-REG-9988',
    'PQRSX1234Z',
    '234523452345',
    10,
    'B.Com|CA',
    'Practice|Consultancy',
    'Interested in professional loan',
    250000,
    180000,
    20000,
    35000,
    2,
    'Business Loan',
    false,
    true,
    12000000,
    0,
    785,
  ],
  LAWYER: [
    'LAWYER',
    'Rohit Verma',
    '9876543212',
    'Gurgaon',
    'rohit.verma@example.com',
    'BAR-REG-4567',
    'LMNOP1234Q',
    '345634563456',
    7,
    'LLB|LLM',
    'Chamber|Corporate',
    'Requires working capital support',
    200000,
    150000,
    10000,
    22000,
    1,
    'Personal Loan',
    false,
    true,
    10000000,
    0,
    768,
  ],
  ENGINEER: [
    'ENGINEER',
    'Neha Singh',
    '9876543213',
    'Pune',
    'neha.singh@example.com',
    'ENG-REG-7788',
    'ZXCVB1234N',
    '456745674567',
    6,
    'B.Tech|M.Tech',
    'Service|Consulting',
    'Interested in LAP',
    180000,
    135000,
    12000,
    18000,
    1,
    'Loan Against Property',
    false,
    true,
    9000000,
    0,
    750,
  ],
}

export default function BulkSyncPage() {
  const toast = useToast()
  const router = useRouter()

  const [profession, setProfession] = React.useState<LeadProfession>('DOCTOR')
  const [file, setFile] = React.useState<File | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const pickFile = () => inputRef.current?.click()

  const resetFileInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeSelectedFile = () => {
    setFile(null)
    resetFileInput()
  }

  const isSupportedFile = (selectedFile: File) => {
    const lowerName = selectedFile.name.toLowerCase()
    return SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  }

  const validateFile = (selectedFile: File) => {
    if (!isSupportedFile(selectedFile)) {
      toast({
        title: 'Invalid file type',
        description: 'Only .csv and .xlsx files are allowed.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return false
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return false
    }

    return true
  }

  const onFileSelected = (selectedFile: File | null) => {
    if (!selectedFile) return
    if (!validateFile(selectedFile)) {
      resetFileInput()
      return
    }
    setFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) onFileSelected(droppedFile)
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const csvCell = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
  }

  const downloadSampleCsv = () => {
    const row = SAMPLE_ROWS[profession]

    const csvContent = [
      BULK_HEADERS.map(csvCell).join(','),
      BULK_HEADERS.map((_, index) => csvCell(row[index])).join(','),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `doctor-lead-sample-${profession.toLowerCase()}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    toast({
      title: 'Sample file downloaded',
      description: `${profession} sample downloaded successfully.`,
      status: 'success',
      duration: 2500,
      isClosable: true,
    })
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Please select a file first',
        status: 'info',
        duration: 2500,
        isClosable: true,
      })
      return
    }

    const baseUrl = String(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    if (!baseUrl) {
      toast({
        title: 'API URL missing',
        description: 'Set NEXT_PUBLIC_API_URL in your environment.',
        status: 'error',
        duration: 3500,
        isClosable: true,
      })
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('profession', profession)

    setUploading(true)

    try {
      const response = await fetch(`${baseUrl}/doctor-lead/bulk-sync/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'Upload failed.'

        toast({
          title: 'Upload failed',
          description: errorMessage,
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
        return
      }

      toast({
        title: 'File uploaded successfully',
        description: `Inserted: ${data?.inserted ?? 0}, Updated: ${data?.updated ?? 0}, Skipped: ${data?.skipped ?? 0}`,
        status: 'success',
        duration: 3500,
        isClosable: true,
      })

      removeSelectedFile()

      const listPath = `/professionals?profession=${encodeURIComponent(profession)}&syncedAt=${Date.now()}`
      router.push(listPath)
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Server error',
        description: error?.message || 'Something went wrong.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setUploading(false)
    }
  }

  React.useEffect(() => {
    removeSelectedFile()
  }, [profession])

  return (
    <Box minH="100vh" bg="gray.50" pt="90px" pb={{ base: 10, md: 14 }}>
      <Container maxW="container.lg">
        <Stack spacing={3} align="center" textAlign="center" mb={{ base: 8, md: 10 }}>
          <HStack spacing={2}>
            <Icon as={FiDatabase} boxSize={7} color="blue.600" />
            <Heading fontSize={{ base: '2xl', md: '3xl' }} color="blue.700" fontWeight="800">
              Lead Sync Engine
            </Heading>
          </HStack>

          <Text color="gray.600" maxW="2xl">
            Bulk upload leads across Doctor, CA, Lawyer, and Engineer profiles using the latest profession-based model.
          </Text>
        </Stack>

        <Flex gap={6} direction={{ base: 'column', md: 'row' }} align="stretch">
          <Box
            flex="1"
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="gray.200"
            p={{ base: 6, md: 8 }}
            boxShadow="sm"
          >
            <Stack spacing={5}>
              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                  Select Profession
                </Text>
                <Select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value as LeadProfession)}
                  borderRadius="xl"
                >
                  {PROFESSION_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box
                border="2px dashed"
                borderColor={dragOver ? 'blue.400' : 'gray.200'}
                bg={dragOver ? 'blue.50' : 'transparent'}
                borderRadius="2xl"
                py={{ base: 10, md: 12 }}
                px={{ base: 5, md: 8 }}
                textAlign="center"
                transition="0.15s"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
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
                  Upload {profession} Lead Database
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

                <HStack justify="center" spacing={4} flexWrap="wrap">
                  <Button variant="outline" borderRadius="xl" onClick={downloadSampleCsv}>
                    Download Sample
                  </Button>

                  <Button colorScheme="blue" borderRadius="xl" onClick={pickFile}>
                    Select File
                  </Button>
                </HStack>

                <Text mt={4} fontSize="xs" color="gray.500">
                  Supported: .csv, .xlsx (Max {MAX_FILE_SIZE_MB} MB)
                </Text>

                <Text mt={1} fontSize="xs" color="gray.400">
                  CSV should include a <b>profession</b> column as per latest schema.
                </Text>

                {file && (
                  <Box
                    mt={6}
                    p={3}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    bg="gray.50"
                  >
                    <HStack justify="space-between" align="start">
                      <Box textAlign="left" maxW="70%">
                        <Text fontWeight="700" fontSize="sm" color="gray.700" noOfLines={1}>
                          {file.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </Text>
                      </Box>

                      <Button size="sm" variant="ghost" onClick={removeSelectedFile}>
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
                )}
              </Box>
            </Stack>
          </Box>

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
                    Checks by profession + mobile number, registration number, PAN, Aadhar, and email.
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
                    Direct DB Update
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Existing records are updated directly in DB and after success the list page is refreshed automatically.
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