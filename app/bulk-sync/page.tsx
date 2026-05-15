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
import { FiCheckCircle, FiDatabase, FiSearch, FiUpload, FiX, FiFile } from 'react-icons/fi'

/* ================= Constants (UNCHANGED) ================= */

const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx']

type LeadProfession =
  | 'DOCTOR' | 'CA' | 'LAWYER' | 'SALARIED' | 'BUSINESSMAN'
  | 'COMPANY_SECRETARY' | 'COST_ACCOUNTANT' | 'REALTOR' | 'BROKER' | 'CHANNEL_PARTNER'

const PROFESSION_OPTIONS: LeadProfession[] = [
  'DOCTOR', 'CA', 'LAWYER', 'SALARIED', 'BUSINESSMAN',
  'COMPANY_SECRETARY', 'COST_ACCOUNTANT', 'REALTOR', 'BROKER', 'CHANNEL_PARTNER',
]

const BULK_HEADERS = [
  'profession', 'fullName', 'mobileNumber', 'cityOrPinCode', 'email',
  'registrationNumber', 'panNumber', 'aadharNumber', 'yearsOfPractice',
  'qualification', 'practiceType', 'remarks', 'monthlyGrossIncome',
  'monthlyNetIncome', 'otherIncomeSources', 'monthlyEmi', 'activeLoans',
  'loanType', 'hasOverdue', 'hasProperty', 'propertyValue',
  'medicalEquipmentValue', 'cibilScore',
]

const SAMPLE_ROWS: Record<LeadProfession, Array<string | number | boolean>> = {
  DOCTOR: ['DOCTOR','Dr. Asha Mehta','9876543210','Delhi','asha.mehta@example.com','REG-DEL-12345','ABCDE1234F','123412341234',8,'MBBS|MD','Clinic|Hospital','Remarks',300000,220000,15000,25000,2,'Business Loan',false,true,15000000,300000,782],
  CA: ['CA','Amit Sharma','9876543211','Noida','amit.sharma@example.com','CA-REG-9988','PQRSX1234Z','234523452345',10,'CA','Practice','Remarks',250000,180000,20000,35000,2,'Business Loan',false,true,12000000,0,785],
  LAWYER: ['LAWYER','Rohit Verma','9876543212','Gurgaon','rohit.verma@example.com','BAR-REG-4567','LMNOP1234Q','345634563456',7,'LLB','Practice','Remarks',200000,150000,10000,22000,1,'Personal Loan',false,true,10000000,0,768],
  SALARIED: ['SALARIED','Neha Singh','9876543213','Pune','neha.singh@example.com','','ZXCVB1234N','456745674567',6,'B.Tech','Job','Remarks',180000,135000,12000,18000,1,'Loan Against Property',false,true,9000000,0,750],
  BUSINESSMAN: ['BUSINESSMAN','Raj Malhotra','9876543214','Delhi','raj@example.com','GST123','','567856785678',12,'MBA','Business','Remarks',400000,300000,50000,40000,3,'Business Loan',false,true,20000000,0,790],
  COMPANY_SECRETARY: ['COMPANY SECRETARY','Pooja Jain','9876543215','Noida','pooja@example.com','CS123','','678967896789',9,'CS','Practice','Remarks',220000,170000,20000,20000,1,'Personal Loan',false,true,8000000,0,770],
  COST_ACCOUNTANT: ['COST ACCOUNTANT','Vikas Agarwal','9876543216','Jaipur','vikas@example.com','CMA123','','789078907890',11,'CMA','Practice','Remarks',210000,160000,15000,21000,1,'Business Loan',false,true,7000000,0,765],
  REALTOR: ['REALTOR','Sameer Khan','9876543217','Dubai','sameer@example.com','RERA123','','890189018901',5,'Graduate','Broker','Remarks',300000,250000,20000,30000,2,'LAP',false,true,15000000,0,755],
  BROKER: ['BROKER','Anil Verma','9876543218','Mumbai','anil@example.com','','','901290129012',6,'Graduate','Loan Broker','Remarks',180000,150000,10000,20000,1,'Personal Loan',false,false,0,0,740],
  CHANNEL_PARTNER: ['CHANNEL PARTNER','Sunil Gupta','9876543219','Delhi','sunil@example.com','','','912391239123',4,'Graduate','DSA','Remarks',160000,140000,10000,15000,1,'Business Loan',false,false,0,0,735],
}

/* ================= Design Tokens ================= */

const T = {
  bg: '#f6f7fb',
  surface: '#ffffff',
  border: '#e8eaf0',
  text: '#111827',
  textSub: '#6b7280',
  textMuted: '#9ca3af',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  blueMid: '#bfdbfe',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  radius: '14px',
  radiusSm: '10px',
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 20px rgba(0,0,0,0.08)',
}

const professionMeta: Record<LeadProfession, { icon: string; label: string }> = {
  DOCTOR: { icon: '🩺', label: 'Doctor' },
  CA: { icon: '📊', label: 'CA' },
  LAWYER: { icon: '⚖️', label: 'Lawyer' },
  SALARIED: { icon: '💼', label: 'Salaried' },
  BUSINESSMAN: { icon: '🏢', label: 'Businessman' },
  COMPANY_SECRETARY: { icon: '📋', label: 'Company Secretary' },
  COST_ACCOUNTANT: { icon: '🧮', label: 'Cost Accountant' },
  REALTOR: { icon: '🏠', label: 'Realtor' },
  BROKER: { icon: '🤝', label: 'Broker' },
  CHANNEL_PARTNER: { icon: '🔗', label: 'Channel Partner' },
}

/* ================= Main Page ================= */

export default function BulkSyncPage() {
  const toast = useToast()
  const router = useRouter()
  const [profession, setProfession] = React.useState<LeadProfession>('DOCTOR')
  const [file, setFile] = React.useState<File | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement | null>(null)

  /* ================= Logic (ALL UNCHANGED) ================= */

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
      toast({ title: 'Invalid file type', description: 'Only .csv and .xlsx files are allowed.', status: 'warning', duration: 3000, isClosable: true })
      return false
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: 'File too large', description: `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`, status: 'warning', duration: 3000, isClosable: true })
      return false
    }
    return true
  }

  const onFileSelected = (selectedFile: File | null) => {
    if (!selectedFile) return
    if (!validateFile(selectedFile)) { resetFileInput(); return }
    setFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) onFileSelected(droppedFile)
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }

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
    toast({ title: 'Sample file downloaded', description: `${profession} sample downloaded successfully.`, status: 'success', duration: 2500, isClosable: true })
  }

  const handleUpload = async () => {
    if (!file) { toast({ title: 'Please select a file first', status: 'info', duration: 2500, isClosable: true }); return }
    const baseUrl = String(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    if (!baseUrl) { toast({ title: 'API URL missing', description: 'Set NEXT_PUBLIC_API_URL in your environment.', status: 'error', duration: 3500, isClosable: true }); return }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('profession', profession)
    setUploading(true)
    try {
      const response = await fetch(`${baseUrl}/doctor-lead/bulk-upload`, { method: 'POST', body: formData })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const errorMessage = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Upload failed.'
        toast({ title: 'Upload failed', description: errorMessage, status: 'error', duration: 4000, isClosable: true })
        return
      }
      toast({ title: 'File uploaded successfully', description: `Inserted: ${data?.inserted ?? 0}, Updated: ${data?.updated ?? 0}, Skipped: ${data?.skipped ?? 0}`, status: 'success', duration: 3500, isClosable: true })
      removeSelectedFile()
      const listPath = `/professionals?profession=${encodeURIComponent(profession)}&syncedAt=${Date.now()}`
      router.push(listPath)
      router.refresh()
    } catch (error: any) {
      toast({ title: 'Server error', description: error?.message || 'Something went wrong.', status: 'error', duration: 4000, isClosable: true })
    } finally {
      setUploading(false)
    }
  }

  React.useEffect(() => { removeSelectedFile() }, [profession])

  /* ================= Render ================= */

  const meta = professionMeta[profession]

  return (
    <Box
      bg={T.bg}
      minH="100vh"
      pt="50px"
      pb={12}
      transition="margin 0.2s"
      fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    >
      <Container maxW="container.lg">

        {/* ── Page Header ── */}
        <Box textAlign="center" mb={10}>
          <HStack spacing={3} justify="center" mb={3}>
            <Box
              w="44px" h="44px"
              borderRadius="12px"
              background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
              display="flex" alignItems="center" justifyContent="center"
              boxShadow="0 4px 14px rgba(37,99,235,0.3)"
            >
              <Icon as={FiDatabase} boxSize={5} color="white" />
            </Box>
            <Heading
              fontSize={{ base: '22px', md: '26px' }}
              fontWeight="800"
              color={T.text}
              letterSpacing="-0.5px"
            >
              Lead Sync Engine
            </Heading>
          </HStack>
          <Text fontSize="13px" color={T.textMuted} fontWeight="500" maxW="480px" mx="auto" lineHeight="1.6">
            Deduplication · CKYC Verification · Bulk Upload · Real-time Sync · Multi-Profession Support
          </Text>
        </Box>

        <Flex gap={5} direction={{ base: 'column', md: 'row' }} align="stretch">

          {/* ── Left: Upload Card ── */}
          <Box
            flex="1"
            bg={T.surface}
            borderRadius={T.radius}
            border="1px solid"
            borderColor={T.border}
            boxShadow={T.shadow}
            overflow="hidden"
          >
            {/* Card header */}
            <Box px={6} py={4} borderBottom="1px solid" borderColor={T.border} bg="#fafbff">
              <Text fontSize="12px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.7px">
                Upload Configuration
              </Text>
            </Box>

            <Box p={6}>
              <Stack spacing={6}>

                {/* Profession selector */}
                <Box>
                  <Text fontSize="11px" fontWeight="700" color={T.textSub} textTransform="uppercase" letterSpacing="0.6px" mb={2}>
                    Select Profession
                  </Text>
                  <Box position="relative">
                    <Select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value as LeadProfession)}
                      bg={T.surface}
                      border="1px solid"
                      borderColor={T.border}
                      borderRadius={T.radiusSm}
                      fontSize="13px"
                      fontWeight="600"
                      color={T.text}
                      h="40px"
                      _focus={{ borderColor: T.blue, boxShadow: `0 0 0 3px ${T.blueLight}` }}
                      _hover={{ borderColor: '#d1d5e0' }}
                      pl={10}
                    >
                      {PROFESSION_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {professionMeta[item].icon} {professionMeta[item].label}
                        </option>
                      ))}
                    </Select>
                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" pointerEvents="none" fontSize="16px">
                      {meta.icon}
                    </Box>
                  </Box>
                </Box>

                {/* Drop zone */}
                <Box
                  border="2px dashed"
                  borderColor={dragOver ? T.blue : file ? '#86efac' : T.border}
                  bg={dragOver ? T.blueLight : file ? T.greenLight : '#fafbff'}
                  borderRadius={T.radius}
                  py={10}
                  px={6}
                  textAlign="center"
                  transition="all 0.15s ease"
                  cursor="pointer"
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={!file ? pickFile : undefined}
                >
                  {/* Icon */}
                  <Box
                    mx="auto" mb={4}
                    w="56px" h="56px"
                    borderRadius="14px"
                    bg={file ? T.greenLight : T.blueLight}
                    display="flex" alignItems="center" justifyContent="center"
                    boxShadow={file ? '0 0 0 6px #bbf7d0' : '0 0 0 6px #dbeafe'}
                  >
                    <Icon
                      as={file ? FiCheckCircle : FiUpload}
                      boxSize={6}
                      color={file ? T.green : T.blue}
                    />
                  </Box>

                  <Text fontSize="15px" fontWeight="700" color={T.text} mb={1}>
                    {file ? 'File Ready to Upload' : `Upload ${meta.label} Lead Database`}
                  </Text>
                  <Text fontSize="12px" color={T.textMuted} mb={5} lineHeight="1.5">
                    {file
                      ? 'Review the file details below, then click Upload & Sync'
                      : 'Drag & drop your CSV or Excel file here, or click to browse'}
                  </Text>

                  {/* Hidden file input */}
                  <Input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    display="none"
                    onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
                  />

                  {/* Action buttons (before file selected) */}
                  {!file && (
                    <>
                      <HStack justify="center" spacing={3} flexWrap="wrap">
                        <Button
                          size="sm" h="36px" px={4}
                          fontSize="13px" fontWeight="600"
                          variant="outline"
                          borderRadius={T.radiusSm}
                          borderColor={T.border}
                          color={T.textSub}
                          bg={T.surface}
                          _hover={{ borderColor: T.blue, color: T.blue }}
                          onClick={(e) => { e.stopPropagation(); downloadSampleCsv() }}
                        >
                          ↓ Download Sample
                        </Button>
                        <Button
                          size="sm" h="36px" px={5}
                          fontSize="13px" fontWeight="600"
                          bg={T.blue} color="white"
                          borderRadius={T.radiusSm}
                          _hover={{ bg: '#1d4ed8' }}
                          onClick={(e) => { e.stopPropagation(); pickFile() }}
                        >
                          Select File
                        </Button>
                      </HStack>

                      <HStack justify="center" spacing={3} mt={4}>
                        <Box px={2.5} py={0.5} bg={T.blueLight} borderRadius="full">
                          <Text fontSize="11px" fontWeight="600" color={T.blue}>.csv</Text>
                        </Box>
                        <Box px={2.5} py={0.5} bg={T.blueLight} borderRadius="full">
                          <Text fontSize="11px" fontWeight="600" color={T.blue}>.xlsx</Text>
                        </Box>
                        <Text fontSize="11px" color={T.textMuted}>Max {MAX_FILE_SIZE_MB} MB</Text>
                      </HStack>
                      <Text mt={2} fontSize="11px" color={T.textMuted}>
                        CSV must include a <Box as="span" fontWeight="700" color={T.textSub}>profession</Box> column per latest schema
                      </Text>
                    </>
                  )}

                  {/* File selected state */}
                  {file && (
                    <Box
                      mt={2}
                      mx="auto"
                      maxW="340px"
                      bg={T.surface}
                      border="1px solid"
                      borderColor="#86efac"
                      borderRadius={T.radiusSm}
                      p={3}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HStack justify="space-between" align="center" mb={3}>
                        <HStack spacing={2.5} align="center" flex="1" minW={0}>
                          <Box
                            w="32px" h="32px" borderRadius="8px"
                            bg={T.greenLight}
                            display="flex" alignItems="center" justifyContent="center"
                            flexShrink={0}
                          >
                            <Icon as={FiFile} color={T.green} boxSize={4} />
                          </Box>
                          <Box flex="1" minW={0} textAlign="left">
                            <Text fontSize="12px" fontWeight="700" color={T.text} noOfLines={1}>{file.name}</Text>
                            <Text fontSize="11px" color={T.textMuted}>{(file.size / (1024 * 1024)).toFixed(2)} MB</Text>
                          </Box>
                        </HStack>
                        <Box
                          as="button"
                          onClick={removeSelectedFile}
                          w="24px" h="24px"
                          borderRadius="full"
                          bg="#f1f5f9"
                          display="flex" alignItems="center" justifyContent="center"
                          flexShrink={0}
                          _hover={{ bg: '#fee2e2' }}
                          transition="background 0.15s"
                        >
                          <Icon as={FiX} boxSize={3} color={T.textMuted} />
                        </Box>
                      </HStack>

                      <HStack spacing={2}>
                        <Button
                          flex="1"
                          size="sm" h="36px"
                          fontSize="12px" fontWeight="600"
                          variant="outline"
                          borderRadius={T.radiusSm}
                          borderColor={T.border}
                          color={T.textSub}
                          bg={T.surface}
                          _hover={{ borderColor: T.blue, color: T.blue }}
                          onClick={(e) => { e.stopPropagation(); downloadSampleCsv() }}
                        >
                          Sample
                        </Button>
                        <Button
                          flex="2"
                          size="sm" h="36px"
                          fontSize="12px" fontWeight="700"
                          bg={T.blue} color="white"
                          borderRadius={T.radiusSm}
                          _hover={{ bg: '#1d4ed8' }}
                          onClick={(e) => { e.stopPropagation(); handleUpload() }}
                          isLoading={uploading}
                          loadingText="Uploading…"
                        >
                          Upload & Sync
                        </Button>
                      </HStack>
                    </Box>
                  )}
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* ── Right: Sync Logic Card ── */}
          <Box
            w={{ base: '100%', md: '300px' }}
            flexShrink={0}
          >
            {/* Sync logic */}
            <Box
              bg={T.surface}
              borderRadius={T.radius}
              border="1px solid"
              borderColor={T.border}
              boxShadow={T.shadow}
              overflow="hidden"
              mb={4}
            >
              <Box px={5} py={3.5} borderBottom="1px solid" borderColor={T.border} bg="#fafbff">
                <Text fontSize="11px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.7px">
                  Sync Logic
                </Text>
              </Box>

              <Stack spacing={0} divider={<Box borderTop="1px solid" borderColor={T.border} />}>
                {[
                  {
                    icon: FiSearch,
                    iconBg: T.blueLight,
                    iconColor: T.blue,
                    title: 'Deduplication',
                    desc: 'Checks by profession + mobile number, registration number, PAN, Aadhar, and email.',
                  },
                  {
                    icon: FiCheckCircle,
                    iconBg: T.greenLight,
                    iconColor: T.green,
                    title: 'Direct DB Update',
                    desc: 'Existing records are updated directly in DB and the list page refreshes automatically on success.',
                  },
                ].map((item) => (
                  <HStack key={item.title} align="start" spacing={3} px={5} py={4}>
                    <Box
                      w="34px" h="34px" flexShrink={0}
                      borderRadius="10px"
                      bg={item.iconBg}
                      display="flex" alignItems="center" justifyContent="center"
                    >
                      <Icon as={item.icon} color={item.iconColor} boxSize={4} />
                    </Box>
                    <Box>
                      <Text fontSize="13px" fontWeight="700" color={T.text} mb={0.5}>{item.title}</Text>
                      <Text fontSize="12px" color={T.textMuted} lineHeight="1.5">{item.desc}</Text>
                    </Box>
                  </HStack>
                ))}
              </Stack>
            </Box>

            {/* Schema hint card */}
            <Box
              bg={T.surface}
              borderRadius={T.radius}
              border="1px solid"
              borderColor={T.border}
              boxShadow={T.shadow}
              overflow="hidden"
            >
              <Box px={5} py={3.5} borderBottom="1px solid" borderColor={T.border} bg="#fafbff">
                <Text fontSize="11px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.7px">
                  Required Columns
                </Text>
              </Box>
              <Box px={5} py={4}>
                <Stack spacing={1.5}>
                  {['profession', 'fullName', 'mobileNumber', 'cityOrPinCode', 'email', 'cibilScore'].map((col) => (
                    <HStack key={col} spacing={2}>
                      <Box w="6px" h="6px" borderRadius="full" bg={T.blue} flexShrink={0} />
                      <Text fontSize="12px" fontWeight="600" color={T.textSub} fontFamily="mono">{col}</Text>
                    </HStack>
                  ))}
                  <HStack spacing={2} mt={1}>
                    <Box w="6px" h="6px" borderRadius="full" bg={T.textMuted} flexShrink={0} />
                    <Text fontSize="11px" color={T.textMuted}>+ {BULK_HEADERS.length - 6} more optional columns</Text>
                  </HStack>
                </Stack>
                <Button
                  mt={4} w="100%"
                  size="sm" h="34px"
                  fontSize="12px" fontWeight="600"
                  variant="outline"
                  borderRadius={T.radiusSm}
                  borderColor={T.border}
                  color={T.textSub}
                  _hover={{ borderColor: T.blue, color: T.blue }}
                  onClick={downloadSampleCsv}
                >
                  ↓ Download {meta.label} Sample
                </Button>
              </Box>
            </Box>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}