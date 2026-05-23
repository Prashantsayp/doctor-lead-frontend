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
  Heading,
  Progress,
  Badge,
  Divider,
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
} from 'react-icons/fi'

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL

const UPLOAD_URL =
  `${API_BASE}/policy-upload`

const SAVE_URL =
  `${API_BASE}/lender-policy/create-policy`

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
    aliases: ['lendername', 'lender', 'bankname', 'bank', 'nbfc', 'institution', 'lender_name'],
  },
  {
    key: 'minCibilScore',
    label: 'Min CIBIL Score',
    placeholder: 'e.g. 750',
    type: 'number',
    required: true,
    aliases: ['mincibilscore', 'cibil', 'cibilscore', 'mincibil', 'creditscore', 'min_cibil_score', 'cibil_score'],
  },
  {
    key: 'maxFoir',
    label: 'Max FOIR (%)',
    placeholder: 'e.g. 45',
    type: 'number',
    required: true,
    prefix: '%',
    aliases: ['maxfoir', 'foir', 'foirpercent', 'max_foir', 'fixedobligationincomeratio'],
  },
  {
    key: 'minIncome',
    label: 'Min Income (₹ / month)',
    placeholder: 'e.g. 35000',
    type: 'number',
    required: true,
    prefix: '₹',
    aliases: ['minincome', 'income', 'minimumincome', 'salary', 'minsalary', 'monthlyincome', 'min_income'],
  },
  {
    key: 'minAge',
    label: 'Min Age (years)',
    placeholder: 'e.g. 21',
    type: 'number',
    required: false,
    aliases: ['minage', 'minimumage', 'agemin', 'min_age'],
  },
  {
    key: 'maxAge',
    label: 'Max Age (years)',
    placeholder: 'e.g. 60',
    type: 'number',
    required: false,
    aliases: ['maxage', 'maximumage', 'agemax', 'max_age'],
  },
  {
    key: 'maxLoanAmount',
    label: 'Max Loan Amount (₹)',
    placeholder: 'e.g. 5000000',
    type: 'number',
    required: false,
    prefix: '₹',
    aliases: ['maxloanamount', 'loanamount', 'maxloan', 'maxamount', 'max_loan_amount'],
  },
  {
    key: 'interestRate',
    label: 'Interest Rate (%)',
    placeholder: 'e.g. 10.5',
    type: 'number',
    required: false,
    prefix: '%',
    aliases: ['interestrate', 'roi', 'rate', 'interest', 'interest_rate'],
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

// key ko normalize karo taaki "Lender Name", "lender_name", "LENDERNAME" sab match ho
const norm = (s: string): string => s.toLowerCase().replace(/[\s_-]/g, '')

// value ko clean string banao
const toStr = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return ''
  return String(v).trim()
}

// backend ka kisi bhi shape ka response → flat { normKey: value } map
const flatten = (data: any): Record<string, string> => {
  const out: Record<string, string> = {}
  const walk = (obj: any) => {
    if (!obj || typeof obj !== 'object') return
    Object.entries(obj).forEach(([k, v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v) // nested object ke andar bhi dekho
      } else {
        out[norm(k)] = toStr(v)
      }
    })
  }
  walk(data)
  return out
}

// backend response ko POLICY_SCHEMA pe map karo
const mapToSchema = (data: any): { form: Record<string, string>; matched: number } => {
  const flat = flatten(data)
  const form: Record<string, string> = {}
  let matched = 0

  POLICY_SCHEMA.forEach((f) => {
    let val = ''
    // canonical key ya kisi bhi alias se dhoondo
    const candidates = [norm(f.key), ...f.aliases.map(norm)]
    for (const c of candidates) {
      if (flat[c] !== undefined && flat[c] !== '') {
        val = flat[c]
        break
      }
    }
    if (val !== '') matched++
    form[f.key] = val
  })

  return { form, matched }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadPolicyPage() {
  const toast = useToast()
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

  const isDirty = JSON.stringify(original) !== JSON.stringify(form)

  // required fields jo abhi khaali hain
  const missingRequired = POLICY_SCHEMA.filter(
    (f) => f.required && !form[f.key]?.trim()
  )

  const pickFile = (f: File | null) => {
    if (!f) return
    const ext = fileExt(f.name)
    if (!ACCEPTED.includes(ext)) {
      toast({
        title: 'Unsupported file type',
        description: `Allowed: ${ACCEPTED.join(', ')}`,
        status: 'warning',
        duration: 3500,
        isClosable: true,
      })
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
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total))
        },
      })

      // debug: backend ka actual response dekhne ke liye
      console.log('policy-upload response:', res.data)

      // backend kisi bhi shape mein bheje — extracted / data / result, sab handle
      const raw = res.data?.extracted ?? res.data?.data ?? res.data?.result ?? res.data
      const { form: mapped, matched } = mapToSchema(raw)

      setOriginal(mapped)
      setForm(mapped)
      setMatchCount(matched)
      setHasResult(true)
      onOpen()

      toast({
        title: 'Document processed',
        description: matched > 0
          ? `${matched} field${matched === 1 ? '' : 's'} auto-filled. Review in the popup.`
          : 'No fields auto-detected — please fill them manually.',
        status: matched > 0 ? 'success' : 'warning',
        duration: 3500,
        isClosable: true,
      })
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Upload failed — please try again'
      console.error(err)
      setError(msg)
      toast({
        title: 'Upload failed',
        description: msg,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const handleRevert = () => {
    setForm(original)
    toast({ title: 'Reverted to extracted values', status: 'info', duration: 2000 })
  }

  const handleSave = async () => {
    if (missingRequired.length > 0) {
      toast({
        title: 'Required fields missing',
        description: `Please fill: ${missingRequired.map((f) => f.label).join(', ')}`,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      })
      return
    }

    // numbers ko number type mein convert karo
    const payload: Record<string, unknown> = {}
    POLICY_SCHEMA.forEach((f) => {
      const v = form[f.key]?.trim() ?? ''
      if (v === '') { payload[f.key] = null; return }
      payload[f.key] = f.type === 'number' && !isNaN(Number(v)) ? Number(v) : v
    })

    try {
      setSaving(true)
      // 👇 save endpoint na ho toh yeh line hata kar console.log(payload) rakho
      await axios.post(SAVE_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
      })

      setOriginal(form)
      toast({
        title: 'Policy saved',
        description: 'Eligibility criteria saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      onClose()
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Could not save policy'
      console.error(err)
      console.log('Policy payload:', payload)
      toast({
        title: 'Save failed',
        description: msg,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box bg="#f1f5f9" minH="100vh">
      <Box pt="calc(64px + 24px)" pb={12}>
        <Container maxW="820px" px={{ base: 4, md: 6 }}>

          {/* ── Header ── */}
          <Flex align="center" gap={3} mb={1}>
            <Flex
              w="44px" h="44px" borderRadius="12px"
              bg="#2563eb" align="center" justify="center"
              boxShadow="0 4px 12px rgba(37,99,235,0.3)"
            >
              <Icon as={FiFileText} color="white" boxSize={5} />
            </Flex>
            <Box>
              <Heading fontSize="22px" fontWeight="800" color="#0f172a" letterSpacing="-0.02em">
                Upload Policy
              </Heading>
              <Text fontSize="13px" color="#64748b">
                Upload a lender policy — eligibility fields are auto-extracted
              </Text>
            </Box>
          </Flex>

          <Divider my={6} borderColor="#e2e8f0" />

          {/* ── Upload Card ── */}
          <Box
            bg="white" borderRadius="16px" border="1px solid #e2e8f0"
            boxShadow="0 1px 3px rgba(0,0,0,0.06)" p={{ base: 5, md: 7 }}
          >
            <Text fontSize="11px" fontWeight="700" color="#94a3b8"
              textTransform="uppercase" letterSpacing="0.1em" mb={4}>
              Step 1 · Choose Document
            </Text>

            {!file && (
              <Box
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                cursor="pointer"
                border="2px dashed"
                borderColor={dragOver ? '#2563eb' : '#cbd5e1'}
                bg={dragOver ? '#eff6ff' : '#f8fafc'}
                borderRadius="14px"
                py={12} px={6}
                textAlign="center"
                transition="all 0.18s ease"
                _hover={{ borderColor: '#2563eb', bg: '#eff6ff' }}
              >
                <Flex
                  w="56px" h="56px" mx="auto" mb={4}
                  borderRadius="14px" bg="#dbeafe"
                  align="center" justify="center"
                >
                  <Icon as={FiUploadCloud} color="#2563eb" boxSize={7} />
                </Flex>
                <Text fontSize="15px" fontWeight="700" color="#0f172a" mb={1}>
                  Drag & drop your file here
                </Text>
                <Text fontSize="13px" color="#64748b" mb={3}>
                  or{' '}
                  <Text as="span" color="#2563eb" fontWeight="600">
                    browse from your computer
                  </Text>
                </Text>
                <Text fontSize="11px" color="#94a3b8">
                  Supported: PDF, DOC, DOCX, PNG, JPG
                </Text>
              </Box>
            )}

            {file && (
              <Flex
                align="center" gap={3}
                bg="#f8fafc" border="1px solid #e2e8f0"
                borderRadius="12px" p={4}
              >
                <Flex
                  w="44px" h="44px" borderRadius="10px"
                  bg="#dbeafe" align="center" justify="center" flexShrink={0}
                >
                  <Icon as={FiFile} color="#2563eb" boxSize={5} />
                </Flex>
                <Box flex={1} minW={0}>
                  <Text fontSize="13px" fontWeight="700" color="#0f172a" noOfLines={1}>
                    {file.name}
                  </Text>
                  <HStack spacing={2} mt={0.5}>
                    <Text fontSize="11px" color="#64748b">{fmtSize(file.size)}</Text>
                    <Badge
                      colorScheme="blue" fontSize="9px"
                      textTransform="uppercase" borderRadius="4px"
                    >
                      {fileExt(file.name).replace('.', '')}
                    </Badge>
                  </HStack>
                </Box>
                {!loading && (
                  <Box
                    as="button"
                    onClick={resetAll}
                    aria-label="Remove file"
                    p={2} borderRadius="8px"
                    color="#94a3b8"
                    _hover={{ bg: '#fee2e2', color: '#dc2626' }}
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

            {loading && (
              <Box mt={5}>
                <Flex justify="space-between" mb={1.5}>
                  <Text fontSize="11px" color="#64748b" fontWeight="600">
                    Uploading & processing…
                  </Text>
                  <Text fontSize="11px" color="#2563eb" fontWeight="700">
                    {progress}%
                  </Text>
                </Flex>
                <Progress
                  value={progress}
                  size="sm"
                  borderRadius="full"
                  colorScheme="blue"
                  hasStripe
                  isAnimated
                />
              </Box>
            )}

            <HStack mt={6} spacing={3}>
              <Button
                onClick={handleUpload}
                isDisabled={!file || loading}
                isLoading={loading}
                loadingText="Processing"
                bg="#2563eb"
                color="white"
                fontSize="14px"
                fontWeight="700"
                px={6}
                h="44px"
                borderRadius="10px"
                leftIcon={<Icon as={FiUploadCloud} boxSize={4} />}
                _hover={{ bg: '#1d4ed8' }}
                _active={{ bg: '#1e40af' }}
              >
                Upload Policy
              </Button>
              {file && !loading && (
                <Button
                  onClick={resetAll}
                  variant="ghost"
                  fontSize="14px"
                  fontWeight="600"
                  color="#64748b"
                  h="44px"
                  borderRadius="10px"
                  leftIcon={<Icon as={FiRefreshCw} boxSize={4} />}
                  _hover={{ bg: '#f1f5f9' }}
                >
                  Reset
                </Button>
              )}
            </HStack>
          </Box>

          {/* ── Error ── */}
          {error && (
            <Flex
              mt={5} align="center" gap={3}
              bg="#fef2f2" border="1px solid #fecaca"
              borderRadius="12px" p={4}
            >
              <Icon as={FiAlertCircle} color="#dc2626" boxSize={5} flexShrink={0} />
              <Box>
                <Text fontSize="13px" fontWeight="700" color="#dc2626">
                  Something went wrong
                </Text>
                <Text fontSize="12px" color="#991b1b">{error}</Text>
              </Box>
            </Flex>
          )}

          {/* ── Summary card (modal close hone par) ── */}
          {hasResult && !isOpen && (
            <Flex
              mt={5} align="center" gap={3}
              bg="white" border="1px solid #e2e8f0"
              borderRadius="12px" p={4}
              boxShadow="0 1px 3px rgba(0,0,0,0.06)"
            >
              <Icon as={FiCheckCircle} color="#16a34a" boxSize={5} flexShrink={0} />
              <Box flex={1}>
                <Text fontSize="13px" fontWeight="700" color="#0f172a">
                  Policy fields ready
                </Text>
                <Text fontSize="11px" color="#64748b">
                  {matchCount} of {POLICY_SCHEMA.length} auto-filled
                  {missingRequired.length > 0
                    ? ` · ${missingRequired.length} required field${missingRequired.length === 1 ? '' : 's'} pending`
                    : ' · all required fields complete'}
                </Text>
              </Box>
              <Button
                onClick={onOpen}
                size="sm"
                variant="outline"
                fontSize="12px"
                borderColor="#cbd5e1"
                color="#2563eb"
                leftIcon={<Icon as={FiEye} boxSize={3.5} />}
                _hover={{ bg: '#eff6ff' }}
              >
                View / Edit
              </Button>
            </Flex>
          )}

        </Container>
      </Box>

      {/* ── Eligibility Fields Modal ── */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside" isCentered>
        <ModalOverlay bg="rgba(15,23,42,0.55)" backdropFilter="blur(2px)" />
        <ModalContent borderRadius="16px" overflow="hidden" mx={4}>

          <ModalHeader p={0}>
            <Flex
              align="center" gap={3}
              bg="#f0fdf4" borderBottom="1px solid #bbf7d0"
              px={6} py={4}
            >
              <Flex
                w="38px" h="38px" borderRadius="10px"
                bg="#dcfce7" align="center" justify="center"
              >
                <Icon as={FiCheckCircle} color="#16a34a" boxSize={5} />
              </Flex>
              <Box flex={1}>
                <Text fontSize="15px" fontWeight="800" color="#15803d">
                  Review Eligibility Criteria
                </Text>
                <Text fontSize="11px" color="#16a34a" fontWeight="500">
                  {matchCount} field{matchCount === 1 ? '' : 's'} auto-filled · verify &amp; complete
                </Text>
              </Box>
              {isDirty && (
                <Badge colorScheme="orange" borderRadius="6px" px={2} py={1} fontSize="10px">
                  UNSAVED
                </Badge>
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton top="14px" color="#15803d" />

          <ModalBody py={5} px={6} bg="#f8fafc">
            <Flex align="center" gap={2} mb={4}>
              <Icon as={FiEdit3} color="#94a3b8" boxSize={3.5} />
              <Text fontSize="11px" fontWeight="700" color="#94a3b8"
                textTransform="uppercase" letterSpacing="0.1em">
                Policy Fields
              </Text>
            </Flex>

            <VStack spacing={4} align="stretch">
              {POLICY_SCHEMA.map((f) => {
                const val = form[f.key] ?? ''
                const edited = (original[f.key] ?? '') !== val
                const autoFilled = (original[f.key] ?? '') !== ''
                const isMissing = f.required && !val.trim()
                return (
                  <Box key={f.key}>
                    <Flex justify="space-between" align="center" mb={1.5}>
                      <HStack spacing={1}>
                        <Text fontSize="11px" fontWeight="700" color="#475569"
                          textTransform="uppercase" letterSpacing="0.05em">
                          {f.label}
                        </Text>
                        {f.required && <Text fontSize="11px" color="#ef4444" fontWeight="700">*</Text>}
                      </HStack>
                      {edited ? (
                        <Text fontSize="9px" fontWeight="700" color="#d97706"
                          textTransform="uppercase">edited</Text>
                      ) : autoFilled ? (
                        <Text fontSize="9px" fontWeight="700" color="#16a34a"
                          textTransform="uppercase">auto-filled</Text>
                      ) : null}
                    </Flex>
                    <InputGroup>
                      {f.prefix && (
                        <InputLeftElement h="42px" pointerEvents="none"
                          color="#94a3b8" fontSize="13px" fontWeight="600">
                          {f.prefix}
                        </InputLeftElement>
                      )}
                      <Input
                        value={val}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        type={f.type === 'number' ? 'text' : 'text'}
                        inputMode={f.type === 'number' ? 'decimal' : 'text'}
                        pl={f.prefix ? 8 : 4}
                        fontSize="13px"
                        h="42px"
                        bg="white"
                        borderColor={
                          isMissing ? '#fca5a5' : edited ? '#fcd34d' : '#e2e8f0'
                        }
                        borderRadius="10px"
                        _placeholder={{ color: '#cbd5e1' }}
                        _hover={{ borderColor: isMissing ? '#f87171' : '#cbd5e1' }}
                        _focus={{ borderColor: '#2563eb', boxShadow: '0 0 0 1px #2563eb' }}
                      />
                    </InputGroup>
                    {isMissing && (
                      <Text fontSize="10px" color="#dc2626" mt={1}>
                        This field is required for eligibility checks
                      </Text>
                    )}
                  </Box>
                )
              })}
            </VStack>
          </ModalBody>

          <ModalFooter
            bg="white" borderTop="1px solid #e2e8f0"
            px={6} py={4} gap={3}
          >
            <Button
              onClick={handleRevert}
              isDisabled={!isDirty || saving}
              variant="ghost"
              fontSize="13px"
              fontWeight="600"
              color="#64748b"
              h="40px"
              borderRadius="9px"
              leftIcon={<Icon as={FiRefreshCw} boxSize={3.5} />}
              _hover={{ bg: '#f1f5f9' }}
            >
              Revert
            </Button>
            <Box flex={1} />
            <Button
              onClick={onClose}
              variant="outline"
              fontSize="13px"
              fontWeight="600"
              color="#64748b"
              borderColor="#cbd5e1"
              h="40px"
              borderRadius="9px"
              _hover={{ bg: '#f8fafc' }}
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              isLoading={saving}
              loadingText="Saving"
              bg="#2563eb"
              color="white"
              fontSize="13px"
              fontWeight="700"
              h="40px"
              px={5}
              borderRadius="9px"
              leftIcon={<Icon as={FiSave} boxSize={3.5} />}
              _hover={{ bg: '#1d4ed8' }}
              _active={{ bg: '#1e40af' }}
            >
              Save Policy
            </Button>
          </ModalFooter>

        </ModalContent>
      </Modal>
    </Box>
  )
}