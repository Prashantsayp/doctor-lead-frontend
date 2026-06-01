'use client'

import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Container,
  Flex,
  Icon,
  Progress,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import {
  FiUploadCloud,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiFile,
  FiRefreshCw,
  FiSave,
  FiEdit3,
  FiEye,
  FiArrowRight,
} from 'react-icons/fi'
import { useRouter } from 'next/navigation'

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL
const UPLOAD_URL = `${API_BASE}/policy-upload/upload-policy`
const SAVE_URL = `${API_BASE}/lender-policy/create-policy`
const ACCEPTED = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg']

interface SchemaField {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'number'
  required: boolean
  prefix?: string
  aliases: string[]
}

const POLICY_SCHEMA: SchemaField[] = [
  {
    key: 'lenderName',
    label: 'Lender Name',
    placeholder: 'e.g. State Bank of India',
    type: 'text',
    required: true,
    aliases: ['lendername', 'lender', 'bankname', 'bank'],
  },
  {
    key: 'minCibil',
    label: 'Min CIBIL Score',
    placeholder: 'e.g. 750',
    type: 'number',
    required: true,
    aliases: ['mincibil', 'mincibilscore', 'cibil', 'creditscore'],
  },
  {
    key: 'maxCibil',
    label: 'Max CIBIL Score',
    placeholder: 'e.g. 900',
    type: 'number',
    required: true,
    aliases: ['maxcibil', 'maxcibilscore'],
  },
  {
    key: 'maxFOIR',
    label: 'Max FOIR (%)',
    placeholder: 'e.g. 45',
    type: 'number',
    required: false,
    prefix: '%',
    aliases: ['maxfoir', 'foir', 'maxfOIR'],
  },
  {
    key: 'minIncome',
    label: 'Min Income (₹ / month)',
    placeholder: 'e.g. 35000',
    type: 'number',
    required: false,
    prefix: '₹',
    aliases: ['minincome', 'income', 'salary'],
  },
  {
    key: 'minLoanAmount',
    label: 'Min Loan Amount (₹)',
    placeholder: 'e.g. 100000',
    type: 'number',
    required: true,
    prefix: '₹',
    aliases: ['minloanamount', 'minloan'],
  },
  {
    key: 'maxLoanAmount',
    label: 'Max Loan Amount (₹)',
    placeholder: 'e.g. 5000000',
    type: 'number',
    required: true,
    prefix: '₹',
    aliases: ['maxloanamount', 'maxloan'],
  },
  {
    key: 'roi',
    label: 'Interest Rate / ROI (%)',
    placeholder: 'e.g. 10.5',
    type: 'number',
    required: false,
    prefix: '%',
    aliases: ['roi', 'interestrate', 'rate', 'interest'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const fileExt = (name: string): string => {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i).toLowerCase()
}

const norm = (s: string): string => s.toLowerCase().replace(/[\s_-]/g, '')
const toStr = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return ''
  return String(v).trim()
}

const flatten = (data: any): Record<string, string> => {
  const out: Record<string, string> = {}
  const walk = (obj: any) => {
    if (!obj || typeof obj !== 'object') return
    Object.entries(obj).forEach(([k, v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v)
      else out[norm(k)] = toStr(v)
    })
  }
  walk(data)
  return out
}

const mapToSchema = (data: any): { form: Record<string, string>; matched: number } => {
  const flat = flatten(data)
  const form: Record<string, string> = {}
  let matched = 0
  POLICY_SCHEMA.forEach((f) => {
    let val = ''
    const candidates = [norm(f.key), ...f.aliases.map(norm)]
    for (const c of candidates) {
      if (flat[c] !== undefined && flat[c] !== '') { val = flat[c]; break }
    }
    if (val !== '') matched++
    form[f.key] = val
  })
  return { form, matched }
}

// ─── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({ lenderName, onViewList, onUploadAnother }: {
  lenderName: string
  onViewList: () => void
  onUploadAnother: () => void
}) {
  return (
    <Box
      position="fixed" inset={0} zIndex={9999}
      bg="rgba(15,23,42,0.7)"
      backdropFilter="blur(8px)"
      display="flex" alignItems="center" justifyContent="center"
      px={4}
    >
      <Box
        bg="white"
        borderRadius="24px"
        maxW="480px"
        w="full"
        overflow="hidden"
        boxShadow="0 32px 80px rgba(0,0,0,0.18)"
      >
        {/* Green top band */}
        <Box
          h="6px"
          bgGradient="linear(to-r, #10B981, #059669)"
        />

        <Box p={10} textAlign="center">
          {/* Animated check icon */}
          <Box
            mx="auto"
            w="80px" h="80px"
            borderRadius="50%"
            bg="#F0FDF4"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={6}
            border="2px solid #BBF7D0"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#10B981" strokeWidth="1.5" />
              <path
                d="M7.5 12.5L10.5 15.5L16.5 9"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Box>

          <Text
            fontSize="11px"
            fontWeight="700"
            color="#10B981"
            textTransform="uppercase"
            letterSpacing="0.12em"
            mb={2}
          >
            Policy Saved Successfully
          </Text>

          <Text
            fontSize="26px"
            fontWeight="800"
            color="#0F172A"
            letterSpacing="-0.03em"
            mb={2}
            lineHeight={1.2}
          >
            {lenderName || 'Lender'} Policy
          </Text>

          <Text fontSize="14px" color="#64748B" mb={8} lineHeight={1.6}>
            Eligibility criteria has been saved and is now active for loan matching decisions.
          </Text>

          {/* Stats row */}
          <Flex
            bg="#F8FAFC"
            borderRadius="14px"
            border="1px solid #E2E8F0"
            p={4}
            mb={8}
            justify="space-around"
          >
            {[
              { label: 'Fields Captured', value: String(POLICY_SCHEMA.length) },
              { label: 'Status', value: 'Active' },
              { label: 'Eligibility', value: 'Live' },
            ].map(({ label, value }) => (
              <Box key={label} textAlign="center">
                <Text fontSize="18px" fontWeight="800" color="#0F172A">{value}</Text>
                <Text fontSize="10px" fontWeight="600" color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">{label}</Text>
              </Box>
            ))}
          </Flex>

          {/* Actions */}
          <VStack spacing={3}>
            <Button
              onClick={onViewList}
              w="full"
              h="48px"
              bg="#0F172A"
              color="white"
              borderRadius="12px"
              fontWeight="700"
              fontSize="14px"
              rightIcon={<Icon as={FiArrowRight} />}
              _hover={{ bg: '#1E293B' }}
              _active={{ bg: '#020617' }}
            >
              View All Policies
            </Button>
            <Button
              onClick={onUploadAnother}
              w="full"
              h="48px"
              bg="white"
              color="#475569"
              borderRadius="12px"
              fontWeight="600"
              fontSize="14px"
              border="1px solid #E2E8F0"
              _hover={{ bg: '#F8FAFC', borderColor: '#CBD5E1' }}
            >
              Upload Another Policy
            </Button>
          </VStack>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UploadPolicyPage() {
  const toast = useToast()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [hasResult, setHasResult] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [form, setForm] = useState<Record<string, string>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [savedLenderName, setSavedLenderName] = useState('')

  const isDirty = JSON.stringify(original) !== JSON.stringify(form)
  const missingRequired = POLICY_SCHEMA.filter((f) => f.required && !form[f.key]?.trim())

  const pickFile = (f: File | null) => {
    if (!f) return
    const ext = fileExt(f.name)
    if (!ACCEPTED.includes(ext)) {
      toast({ title: 'Unsupported file type', description: `Allowed: ${ACCEPTED.join(', ')}`, status: 'warning', duration: 3500, isClosable: true })
      return
    }
    setFile(f)
    setHasResult(false)
    setForm({})
    setOriginal({})
    setError(null)
    setProgress(0)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickFile(e.dataTransfer.files?.[0] || null)
  }, [])

  const resetAll = () => {
    setFile(null)
    setHasResult(false)
    setForm({})
    setOriginal({})
    setError(null)
    setProgress(0)
    setShowSuccess(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'Select a file first', status: 'info', duration: 2500 })
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    try {
      setLoading(true)
      setError(null)
      setHasResult(false)
      setProgress(0)
      const res = await axios.post(UPLOAD_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => { if (e.total) setProgress(Math.round((e.loaded * 100) / e.total)) },
      })
      console.log('policy-upload response:', res.data)
      const raw = res.data?.extracted ?? res.data?.data ?? res.data?.result ?? res.data
      const { form: mapped, matched } = mapToSchema(raw)
      setOriginal(mapped)
      setForm(mapped)
      setMatchCount(matched)
      setHasResult(true)
      onOpen()
      toast({
        title: 'Document processed',
        description: matched > 0 ? `${matched} fields auto-filled. Review below.` : 'No fields detected — fill manually.',
        status: matched > 0 ? 'success' : 'warning',
        duration: 3500,
        isClosable: true,
      })
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message || err.message : 'Upload failed — please try again'
      setError(msg)
      toast({ title: 'Upload failed', description: msg, status: 'error', duration: 4000, isClosable: true })
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }))
  const handleRevert = () => {
    setForm(original)
    toast({ title: 'Reverted to extracted values', status: 'info', duration: 2000 })
  }

  const handleSave = async () => {
    if (missingRequired.length > 0) {
      toast({ title: 'Required fields missing', description: `Please fill: ${missingRequired.map((f) => f.label).join(', ')}`, status: 'warning', duration: 4000, isClosable: true })
      return
    }
    const payload = {
      lenderName: form.lenderName || undefined,
      minCibil: Number(form.minCibil) || undefined,
      maxCibil: Number(form.maxCibil) || undefined,
      maxFOIR: Number(form.maxFOIR) || undefined,
      minIncome: Number(form.minIncome) || undefined,
      minLoanAmount: Number(form.minLoanAmount) || undefined,
      maxLoanAmount: Number(form.maxLoanAmount) || undefined,
      roi: Number(form.roi) || undefined,
    }
    try {
      setSaving(true)
      await axios.post(SAVE_URL, payload, { headers: { 'Content-Type': 'application/json' } })
      setOriginal(form)
      setSavedLenderName(form.lenderName || '')
      onClose()
      setShowSuccess(true)
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message || err.message : 'Could not save policy'
      console.error(err)
      toast({ title: 'Save failed', description: msg, status: 'error', duration: 4000, isClosable: true })
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Success Overlay ── */}
      {showSuccess && (
        <SuccessOverlay
          lenderName={savedLenderName}
          onViewList={() => router.push('/dashboard/credit/policy/list')}
          onUploadAnother={resetAll}
        />
      )}

      <Box bg="#F8FAFC" minH="100vh">
        {/* ── Top accent bar ── */}
        <Box h="3px" bgGradient="linear(to-r, #2563EB, #7C3AED)" />

        <Box pt={10} pb={16}>
          <Container maxW="780px" px={{ base: 4, md: 6 }}>

            {/* ── Header ── */}
            <Flex align="flex-start" gap={4} mb={10}>
              <Flex
                w="52px" h="52px" borderRadius="14px"
                bg="#EFF6FF" border="1px solid #DBEAFE"
                align="center" justify="center"
                flexShrink={0}
              >
                <Icon as={FiFileText} color="#2563EB" boxSize={5} />
              </Flex>
              <Box>
                <HStack spacing={3} mb={1}>
                  <Text fontSize="24px" fontWeight="800" color="#0F172A" letterSpacing="-0.03em">
                    Upload Policy Document
                  </Text>
                  <Badge
                    bg="#EFF6FF" color="#2563EB"
                    border="1px solid #DBEAFE"
                    borderRadius="6px" px={2} py={0.5}
                    fontSize="10px" fontWeight="700"
                    textTransform="uppercase" letterSpacing="0.08em"
                  >
                    AI Extraction
                  </Badge>
                </HStack>
                <Text fontSize="14px" color="#64748B" lineHeight={1.6}>
                  Upload a lender policy document — eligibility fields are automatically extracted and mapped.
                </Text>
              </Box>
            </Flex>

            {/* ── Step indicator ── */}
            <Flex align="center" gap={0} mb={8}>
              {[
                { n: '1', label: 'Select Document' },
                { n: '2', label: 'Auto-Extract' },
                { n: '3', label: 'Review & Save' },
              ].map((step, i) => (
                <Flex key={step.n} align="center" flex={i < 2 ? 1 : 'none'}>
                  <Flex align="center" gap={2}>
                    <Flex
                      w="28px" h="28px" borderRadius="50%"
                      bg={i === 0 ? '#2563EB' : '#E2E8F0'}
                      color={i === 0 ? 'white' : '#94A3B8'}
                      align="center" justify="center"
                      fontSize="11px" fontWeight="800"
                      flexShrink={0}
                    >
                      {step.n}
                    </Flex>
                    <Text fontSize="12px" fontWeight="600" color={i === 0 ? '#0F172A' : '#94A3B8'}>
                      {step.label}
                    </Text>
                  </Flex>
                  {i < 2 && <Box flex={1} h="1px" bg="#E2E8F0" mx={3} />}
                </Flex>
              ))}
            </Flex>

            {/* ── Upload Card ── */}
            <Box
              bg="white"
              borderRadius="20px"
              border="1px solid #E2E8F0"
              boxShadow="0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)"
              overflow="hidden"
            >
              {/* Card header strip */}
              <Box px={7} py={4} borderBottom="1px solid #F1F5F9" bg="#FAFBFC">
                <HStack justify="space-between">
                  <Text fontSize="12px" fontWeight="700" color="#94A3B8" textTransform="uppercase" letterSpacing="0.1em">
                    Document Upload
                  </Text>
                  <Text fontSize="11px" color="#CBD5E1" fontWeight="500">
                    PDF · DOC · DOCX · PNG · JPG
                  </Text>
                </HStack>
              </Box>

              <Box p={{ base: 5, md: 7 }}>
                {/* Dropzone */}
                {!file && (
                  <Box
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    cursor="pointer"
                    border="1.5px dashed"
                    borderColor={dragOver ? '#2563EB' : '#CBD5E1'}
                    bg={dragOver ? '#EFF6FF' : '#FAFBFC'}
                    borderRadius="16px"
                    py={14} px={6}
                    textAlign="center"
                    transition="all 0.15s ease"
                    _hover={{ borderColor: '#2563EB', bg: '#EFF6FF' }}
                    role="button"
                    aria-label="Upload file"
                  >
                    <Flex
                      w="60px" h="60px" mx="auto" mb={4}
                      borderRadius="16px"
                      bg={dragOver ? '#DBEAFE' : '#F1F5F9'}
                      border="1px solid"
                      borderColor={dragOver ? '#BFDBFE' : '#E2E8F0'}
                      align="center" justify="center"
                      transition="all 0.15s"
                    >
                      <Icon as={FiUploadCloud} color={dragOver ? '#2563EB' : '#94A3B8'} boxSize={6} />
                    </Flex>
                    <Text fontSize="15px" fontWeight="700" color="#0F172A" mb={1}>
                      Drop your document here
                    </Text>
                    <Text fontSize="13px" color="#64748B">
                      or{' '}
                      <Text as="span" color="#2563EB" fontWeight="600" textDecoration="underline" textUnderlineOffset="2px">
                        browse files
                      </Text>
                    </Text>
                  </Box>
                )}

                {/* File selected */}
                {file && (
                  <Flex
                    align="center" gap={4}
                    bg="#F8FAFC"
                    border="1px solid #E2E8F0"
                    borderRadius="14px"
                    p={4}
                  >
                    <Flex
                      w="48px" h="48px" borderRadius="12px"
                      bg="#EFF6FF" border="1px solid #DBEAFE"
                      align="center" justify="center"
                      flexShrink={0}
                    >
                      <Icon as={FiFile} color="#2563EB" boxSize={5} />
                    </Flex>
                    <Box flex={1} minW={0}>
                      <Text fontSize="13px" fontWeight="700" color="#0F172A" noOfLines={1}>
                        {file.name}
                      </Text>
                      <HStack spacing={3} mt={1}>
                        <Text fontSize="11px" color="#94A3B8">{fmtSize(file.size)}</Text>
                        <Box w="3px" h="3px" borderRadius="full" bg="#CBD5E1" />
                        <Badge
                          bg="#F1F5F9" color="#475569"
                          borderRadius="4px" px={1.5} py={0.5}
                          fontSize="9px" fontWeight="700"
                          textTransform="uppercase"
                        >
                          {fileExt(file.name).replace('.', '')}
                        </Badge>
                      </HStack>
                    </Box>
                    {!loading && (
                      <Box
                        as="button"
                        onClick={resetAll}
                        p={2} borderRadius="8px"
                        color="#94A3B8"
                        transition="all 0.15s"
                        _hover={{ bg: '#FEE2E2', color: '#DC2626' }}
                        aria-label="Remove file"
                      >
                        <Icon as={FiX} boxSize={4} />
                      </Box>
                    )}
                  </Flex>
                )}

                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED.join(',')}
                  style={{ display: 'none' }}
                  onChange={(e) => pickFile(e.target.files?.[0] || null)}
                />

                {/* Progress */}
                {loading && (
                  <Box mt={5} bg="#F8FAFC" borderRadius="12px" border="1px solid #E2E8F0" p={4}>
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack spacing={2}>
                        <Box
                          w="6px" h="6px" borderRadius="full" bg="#2563EB"
                          sx={{ animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }}
                        />
                        <Text fontSize="12px" color="#475569" fontWeight="600">Processing document with AI…</Text>
                      </HStack>
                      <Text fontSize="12px" color="#2563EB" fontWeight="700">{progress}%</Text>
                    </Flex>
                    <Progress value={progress} size="xs" borderRadius="full" colorScheme="blue" bg="#DBEAFE" />
                  </Box>
                )}

                {/* Actions */}
                <HStack mt={6} spacing={3}>
                  <Button
                    onClick={handleUpload}
                    isDisabled={!file || loading}
                    isLoading={loading}
                    loadingText="Extracting…"
                    bg="#2563EB"
                    color="white"
                    fontSize="14px"
                    fontWeight="700"
                    px={7}
                    h="46px"
                    borderRadius="11px"
                    leftIcon={<Icon as={FiUploadCloud} boxSize={4} />}
                    _hover={{ bg: '#1D4ED8', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
                    _active={{ bg: '#1E40AF', transform: 'translateY(0)' }}
                    transition="all 0.15s"
                  >
                    Extract & Process
                  </Button>
                  {file && !loading && (
                    <Button
                      onClick={resetAll}
                      variant="ghost"
                      fontSize="13px"
                      fontWeight="600"
                      color="#64748B"
                      h="46px"
                      borderRadius="11px"
                      leftIcon={<Icon as={FiRefreshCw} boxSize={3.5} />}
                      _hover={{ bg: '#F1F5F9' }}
                    >
                      Clear
                    </Button>
                  )}
                </HStack>
              </Box>
            </Box>

            {/* ── Error ── */}
            {error && (
              <Flex
                mt={4} align="flex-start" gap={3}
                bg="#FEF2F2" border="1px solid #FECACA"
                borderRadius="14px" p={4}
              >
                <Flex
                  w="34px" h="34px" borderRadius="9px"
                  bg="#FEE2E2" align="center" justify="center"
                  flexShrink={0}
                >
                  <Icon as={FiAlertCircle} color="#DC2626" boxSize={4} />
                </Flex>
                <Box>
                  <Text fontSize="13px" fontWeight="700" color="#DC2626" mb={0.5}>
                    Processing failed
                  </Text>
                  <Text fontSize="12px" color="#991B1B">{error}</Text>
                </Box>
              </Flex>
            )}

            {/* ── Result summary banner ── */}
            {hasResult && !isOpen && !showSuccess && (
              <Flex
                mt={4} align="center" gap={4}
                bg="white"
                border="1px solid #E2E8F0"
                borderRadius="14px" p={4}
                boxShadow="0 1px 4px rgba(0,0,0,0.04)"
              >
                <Flex
                  w="38px" h="38px" borderRadius="10px"
                  bg="#F0FDF4" border="1px solid #BBF7D0"
                  align="center" justify="center"
                  flexShrink={0}
                >
                  <Icon as={FiCheckCircle} color="#16A34A" boxSize={4.5} />
                </Flex>
                <Box flex={1}>
                  <Text fontSize="13px" fontWeight="700" color="#0F172A">
                    Extraction complete
                  </Text>
                  <Text fontSize="11px" color="#64748B" mt={0.5}>
                    {matchCount} of {POLICY_SCHEMA.length} fields detected
                    {missingRequired.length > 0
                      ? ` · ${missingRequired.length} required field${missingRequired.length > 1 ? 's' : ''} need review`
                      : ' · all required fields present'}
                  </Text>
                </Box>
                <Button
                  onClick={onOpen}
                  size="sm"
                  bg="#0F172A"
                  color="white"
                  borderRadius="9px"
                  fontWeight="700"
                  fontSize="12px"
                  leftIcon={<Icon as={FiEye} boxSize={3.5} />}
                  _hover={{ bg: '#1E293B' }}
                  px={4}
                >
                  Review & Save
                </Button>
              </Flex>
            )}

          </Container>
        </Box>
      </Box>

      {/* ── Modal ── */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside" isCentered>
        <ModalOverlay bg="rgba(15,23,42,0.6)" backdropFilter="blur(4px)" />
        <ModalContent borderRadius="20px" overflow="hidden" mx={4} boxShadow="0 24px 60px rgba(0,0,0,0.2)">

          {/* Modal top accent */}
          <Box h="3px" bgGradient="linear(to-r, #10B981, #059669)" />

          <ModalHeader p={0}>
            <Flex align="center" gap={4} px={6} py={5} bg="white" borderBottom="1px solid #F1F5F9">
              <Flex
                w="40px" h="40px" borderRadius="10px"
                bg="#F0FDF4" border="1px solid #BBF7D0"
                align="center" justify="center"
                flexShrink={0}
              >
                <Icon as={FiEdit3} color="#16A34A" boxSize={4.5} />
              </Flex>
              <Box flex={1}>
                <Text fontSize="16px" fontWeight="800" color="#0F172A" letterSpacing="-0.02em">
                  Review Eligibility Criteria
                </Text>
                <Text fontSize="11px" color="#64748B" mt={0.5}>
                  {matchCount} of {POLICY_SCHEMA.length} fields auto-detected · verify and complete
                </Text>
              </Box>
              {isDirty && (
                <Badge
                  bg="#FFF7ED" color="#C2410C"
                  border="1px solid #FED7AA"
                  borderRadius="6px" px={2} py={0.5}
                  fontSize="9px" fontWeight="700"
                  textTransform="uppercase" letterSpacing="0.08em"
                >
                  Unsaved
                </Badge>
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton top="18px" right={5} color="#94A3B8" _hover={{ color: '#0F172A' }} />

          <ModalBody py={6} px={6} bg="#F8FAFC">
            <VStack spacing={3} align="stretch">
              {POLICY_SCHEMA.map((f, idx) => {
                const val = form[f.key] ?? ''
                const edited = (original[f.key] ?? '') !== val
                const autoFilled = (original[f.key] ?? '') !== ''
                const isMissing = f.required && !val.trim()

                return (
                  <Box
                    key={f.key}
                    bg="white"
                    borderRadius="12px"
                    border="1px solid"
                    borderColor={isMissing ? '#FECACA' : edited ? '#FED7AA' : '#F1F5F9'}
                    p={4}
                    transition="border-color 0.15s"
                  >
                    <Flex justify="space-between" align="center" mb={2.5}>
                      <HStack spacing={1.5}>
                        <Text
                          fontSize="10px" fontWeight="700" color="#475569"
                          textTransform="uppercase" letterSpacing="0.08em"
                        >
                          {f.label}
                        </Text>
                        {f.required && (
                          <Box w="4px" h="4px" borderRadius="full" bg="#EF4444" flexShrink={0} />
                        )}
                      </HStack>
                      {edited ? (
                        <Badge bg="#FFF7ED" color="#C2410C" borderRadius="4px" px={1.5} py={0.5} fontSize="9px" fontWeight="700">
                          Edited
                        </Badge>
                      ) : autoFilled ? (
                        <Badge bg="#F0FDF4" color="#15803D" borderRadius="4px" px={1.5} py={0.5} fontSize="9px" fontWeight="700">
                          Auto-filled
                        </Badge>
                      ) : null}
                    </Flex>

                    <InputGroup>
                      {f.prefix && (
                        <InputLeftElement h="40px" pointerEvents="none">
                          <Text fontSize="13px" fontWeight="600" color="#94A3B8">{f.prefix}</Text>
                        </InputLeftElement>
                      )}
                      <Input
                        value={val}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        inputMode={f.type === 'number' ? 'decimal' : 'text'}
                        pl={f.prefix ? 8 : 3}
                        fontSize="14px"
                        fontWeight="600"
                        h="40px"
                        bg={isMissing ? '#FFF5F5' : 'white'}
                        border="1px solid"
                        borderColor={isMissing ? '#FCA5A5' : '#E2E8F0'}
                        borderRadius="9px"
                        color="#0F172A"
                        _placeholder={{ color: '#CBD5E1', fontWeight: '400' }}
                        _hover={{ borderColor: '#94A3B8' }}
                        _focus={{ borderColor: '#2563EB', boxShadow: '0 0 0 2px rgba(37,99,235,0.12)', bg: 'white' }}
                        transition="all 0.15s"
                      />
                    </InputGroup>

                    {isMissing && (
                      <Text fontSize="10px" color="#DC2626" fontWeight="600" mt={1.5}>
                        Required for eligibility checks
                      </Text>
                    )}
                  </Box>
                )
              })}
            </VStack>
          </ModalBody>

          <ModalFooter
            bg="white"
            borderTop="1px solid #F1F5F9"
            px={6} py={4}
            gap={2}
          >
            <Button
              onClick={handleRevert}
              isDisabled={!isDirty || saving}
              variant="ghost"
              fontSize="13px"
              fontWeight="600"
              color="#64748B"
              h="40px"
              borderRadius="9px"
              leftIcon={<Icon as={FiRefreshCw} boxSize={3.5} />}
              _hover={{ bg: '#F1F5F9' }}
            >
              Revert
            </Button>
            <Box flex={1} />
            <Button
              onClick={onClose}
              variant="outline"
              fontSize="13px"
              fontWeight="600"
              color="#64748B"
              borderColor="#E2E8F0"
              h="40px"
              borderRadius="9px"
              _hover={{ bg: '#F8FAFC' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={saving}
              loadingText="Saving…"
              bg="#0F172A"
              color="white"
              fontSize="13px"
              fontWeight="700"
              h="40px"
              px={6}
              borderRadius="9px"
              leftIcon={<Icon as={FiSave} boxSize={3.5} />}
              _hover={{ bg: '#1E293B', transform: 'translateY(-1px)' }}
              _active={{ bg: '#020617', transform: 'translateY(0)' }}
              transition="all 0.15s"
            >
              Save Policy
            </Button>
          </ModalFooter>

        </ModalContent>
      </Modal>
    </>
  )
}