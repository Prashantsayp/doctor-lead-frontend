'use client'

import { useState, useRef, useCallback } from 'react'
import axios from 'axios'

import {
  Box,
  Button,
  Text,
  VStack,
  Container,
  Flex,
  useToast,
  HStack,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputLeftAddon,
  Spinner,
} from '@chakra-ui/react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface ExtractedData {
  [key: string]: string | number | boolean | null
}

interface UploadResult {
  extracted?: ExtractedData
  [key: string]: unknown
}

interface PolicyForm {
  lenderName: string
  minCibil: string
  maxFoir: string
  minIncome: string
  maxLoanAmount: string
  minLoanAmount: string
  maxTenureMonths: string
  minTenureMonths: string
  maxAge: string
  minAge: string
  interestRateMin: string
  interestRateMax: string
  processingFee: string
  [key: string]: string
}

const EMPTY_FORM: PolicyForm = {
  lenderName: '',
  minCibil: '',
  maxFoir: '',
  roi: '',
  minIncome: '',
  maxLoanAmount: '',
  minLoanAmount: '',
  maxTenureMonths: '',
  minTenureMonths: '',
  maxAge: '',
  minAge: '',
  interestRateMin: '',
  interestRateMax: '',
  processingFee: '',
}

const FORM_FIELDS: {
  key: keyof PolicyForm
  label: string
  placeholder: string
  prefix?: string
  required?: boolean
}[] = [
  { key: 'lenderName',      label: 'Lender Name',           placeholder: 'e.g. State Bank of India', required: true },
  { key: 'minCibil',        label: 'Min CIBIL Score',        placeholder: 'e.g. 750',    required: true },
  { key: 'maxFoir',         label: 'Max FOIR (%)',           placeholder: 'e.g. 45',     prefix: '%', required: true },
  { key: 'roi',             label: 'Rate of Interest (%)',   placeholder: 'e.g. 12',     prefix: '%', required: true },
  { key: 'minIncome',       label: 'Min Income (₹ / Month)', placeholder: 'e.g. 25000',  prefix: '₹', required: true },
  { key: 'minLoanAmount',   label: 'Min Loan Amount (₹)',    placeholder: 'e.g. 50000',  prefix: '₹' },
  { key: 'maxLoanAmount',   label: 'Max Loan Amount (₹)',    placeholder: 'e.g. 5000000',prefix: '₹' },
  { key: 'minTenureMonths', label: 'Min Tenure (Months)',    placeholder: 'e.g. 12' },
  { key: 'maxTenureMonths', label: 'Max Tenure (Months)',    placeholder: 'e.g. 84' },
  { key: 'minAge',          label: 'Min Age (Years)',        placeholder: 'e.g. 21' },
  { key: 'maxAge',          label: 'Max Age (Years)',        placeholder: 'e.g. 60' },
  { key: 'interestRateMin', label: 'Interest Rate Min (%)',  placeholder: 'e.g. 8.5',    prefix: '%' },
  { key: 'interestRateMax', label: 'Interest Rate Max (%)',  placeholder: 'e.g. 18',     prefix: '%' },
  { key: 'processingFee',   label: 'Processing Fee (%)',     placeholder: 'e.g. 1.5',    prefix: '%' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Maps extracted keys (any casing/snake_case) → PolicyForm keys.
 * Returns EMPTY_FORM fields if nothing matches — modal will be blank for manual entry.
 */
const mapExtractedToForm = (extracted: ExtractedData): Partial<PolicyForm> => {
  const result: Partial<PolicyForm> = {}
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

  const aliases: Record<string, keyof PolicyForm> = {
    lender_name: 'lenderName',         lendername: 'lenderName',
    bank_name: 'lenderName',           bankname: 'lenderName',
    lenderName: 'lenderName',

    minCibil: 'minCibilScore',  minCibil: 'minCibilScore',
    cibil_score: 'minCibilScore',      cibilscore: 'minCibilScore',
    minCibil: 'minCibilScore',

    maxFOIR: 'maxFoir',               maxfoir: 'maxFoir',
    foir: 'maxFoir',                   maxFoir: 'maxFoir',

    min_income: 'minIncome',           minincome: 'minIncome',
    minimum_income: 'minIncome',       minIncome: 'minIncome',

    max_loan_amount: 'maxLoanAmount',  maxloanamount: 'maxLoanAmount',
    maximum_loan: 'maxLoanAmount',     maxLoanAmount: 'maxLoanAmount',

    min_loan_amount: 'minLoanAmount',  minloanamount: 'minLoanAmount',
    minimum_loan: 'minLoanAmount',     minLoanAmount: 'minLoanAmount',

    max_tenure: 'maxTenureMonths',     max_tenure_months: 'maxTenureMonths',
    maxtenure: 'maxTenureMonths',      maxTenureMonths: 'maxTenureMonths',

    min_tenure: 'minTenureMonths',     min_tenure_months: 'minTenureMonths',
    mintenure: 'minTenureMonths',      minTenureMonths: 'minTenureMonths',

    max_age: 'maxAge',                 maxage: 'maxAge',
    maxAge: 'maxAge',

    min_age: 'minAge',                 minage: 'minAge',
    minAge: 'minAge',

    interest_rate_min: 'interestRateMin', min_interest_rate: 'interestRateMin',
    interestRateMin: 'interestRateMin',

    interest_rate_max: 'interestRateMax', max_interest_rate: 'interestRateMax',
    interestRateMax: 'interestRateMax',

    processing_fee: 'processingFee',   processingfee: 'processingFee',
    processingFee: 'processingFee',
  }

  for (const [rawKey, rawVal] of Object.entries(extracted)) {
    const normalised = rawKey.toLowerCase().replace(/\s+/g, '_')
    const formKey = aliases[rawKey] ?? aliases[normalised]
    if (formKey) result[formKey] = str(rawVal)
  }

  return result
}

const ACCEPT_TYPES = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg'
const FILE_TYPES   = ['PDF', 'DOC', 'DOCX', 'TXT', 'PNG', 'JPG']

// ─── Design Tokens ─────────────────────────────────────────────────────────

const T = {
  bg: '#f6f7fb',        surface: '#ffffff',
  border: '#e8eaf0',    text: '#111827',
  textSub: '#6b7280',   textMuted: '#9ca3af',
  blue: '#2563eb',      blueLight: '#eff6ff',
  green: '#16a34a',     greenLight: '#f0fdf4',
  red: '#dc2626',       redLight: '#fef2f2',
  amber: '#d97706',     amberLight: '#fffbeb',
  radius: '14px',       radiusSm: '10px',
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
}

// ─── Policy Review Modal ────────────────────────────────────────────────────

interface PolicyModalProps {
  isOpen: boolean
  onClose: () => void
  form: PolicyForm
  onChange: (key: keyof PolicyForm, value: string) => void
  onSave: () => void
  onRevert: () => void
  isSaving: boolean
  autoFilledCount: number
  isManualMode: boolean   // true when extraction returned nothing
}

function PolicyReviewModal({
  isOpen, onClose, form, onChange, onSave, onRevert,
  isSaving, autoFilledCount, isManualMode,
}: PolicyModalProps) {
  const [touched, setTouched] = useState<Partial<Record<keyof PolicyForm, boolean>>>({})

  const handleBlur = (key: keyof PolicyForm) =>
    setTouched(prev => ({ ...prev, [key]: true }))

  const isError = (key: keyof PolicyForm) => {
    const field = FORM_FIELDS.find(f => f.key === key)
    return !!(field?.required && touched[key] && !form[key].trim())
  }

  // Header colours driven by mode
  const headerBg    = isManualMode ? T.amberLight : T.greenLight
  const headerIcon  = isManualMode ? '✏️' : '✅'
  const headerColor = isManualMode ? T.amber : T.green
  const headerSub   = isManualMode
    ? 'Extraction returned no data · fill in manually'
    : `${autoFilledCount} fields auto-filled · verify & complete`

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="rgba(0,0,0,0.45)" backdropFilter="blur(4px)" />
      <ModalContent
        borderRadius="20px"
        overflow="hidden"
        mx={4}
        maxH="90vh"
        boxShadow="0 24px 64px rgba(0,0,0,0.18)"
        fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      >
        {/* ── Header ── */}
        <Box px={6} py={4} borderBottom="1px solid" borderColor={T.border} bg={headerBg}>
          <Flex align="center" justify="space-between">
            <HStack spacing={3}>
              <Box
                w="40px" h="40px" borderRadius="12px"
                bg={isManualMode ? '#fef3c7' : '#dcfce7'}
                border="1px solid"
                borderColor={isManualMode ? '#fcd34d' : '#86efac'}
                display="flex" alignItems="center" justifyContent="center"
                fontSize="18px"
              >
                {headerIcon}
              </Box>
              <Box>
                <Text fontSize="15px" fontWeight="800" color={T.text} letterSpacing="-0.3px">
                  {isManualMode ? 'Enter Policy Details' : 'Review Eligibility Criteria'}
                </Text>
                <Text fontSize="12px" color={headerColor} fontWeight="500">
                  {headerSub}
                </Text>
              </Box>
            </HStack>
            <Button
              variant="ghost" size="sm" onClick={onClose}
              borderRadius="8px" color={T.textMuted} fontSize="18px" px={2}
              _hover={{ bg: T.border, color: T.text }}
            >
              ✕
            </Button>
          </Flex>
        </Box>

        {/* ── Manual mode notice banner ── */}
        {isManualMode && (
          <Box px={6} pt={4}>
            <Box
              bg={T.amberLight} border="1px solid" borderColor="#fcd34d"
              borderRadius="10px" px={4} py={3}
            >
              <HStack spacing={2}>
                <Text fontSize="14px">⚠️</Text>
                <Text fontSize="12px" fontWeight="600" color={T.amber}>
                  No data could be extracted from the document. Please fill in the policy fields manually.
                </Text>
              </HStack>
            </Box>
          </Box>
        )}

        <ModalBody px={6} py={5}>
          {/* Section label */}
          <HStack spacing={2} mb={5}>
            <Text fontSize="10px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="1px">
              ✏️ Policy Fields
            </Text>
          </HStack>

          <VStack spacing={5} align="stretch">
            {FORM_FIELDS.map((field) => {
              const val       = form[field.key]
              const autofilled = !isManualMode && !!val
              const error     = isError(field.key)

              return (
                <FormControl key={field.key} isRequired={field.required} isInvalid={error}>
                  <FormLabel
                    fontSize="11px" fontWeight="700" color={T.text}
                    textTransform="uppercase" letterSpacing="0.6px" mb={1.5}
                  >
                    {field.label}
                    {autofilled && (
                      <Box
                        as="span" ml={2} px={1.5} py={0.5}
                        bg="#dcfce7" borderRadius="4px"
                        fontSize="9px" fontWeight="700" color={T.green}
                        letterSpacing="0.3px" verticalAlign="middle"
                      >
                        AUTO
                      </Box>
                    )}
                  </FormLabel>

                  {field.prefix ? (
                    <InputGroup>
                      <InputLeftAddon
                        fontSize="13px" fontWeight="700" color={T.textSub}
                        bg="#f8fafc" h="44px"
                        border="1.5px solid"
                        borderColor={error ? T.red : autofilled ? '#86efac' : T.border}
                        borderRight="none"
                      >
                        {field.prefix}
                      </InputLeftAddon>
                      <Input
                        value={val}
                        onChange={e => onChange(field.key, e.target.value)}
                        onBlur={() => handleBlur(field.key)}
                        placeholder={field.placeholder}
                        h="44px" fontSize="13px"
                        fontWeight={val ? '600' : '400'}
                        border="1.5px solid"
                        borderColor={error ? T.red : autofilled ? '#86efac' : T.border}
                        borderRadius="0 10px 10px 0"
                        bg={autofilled ? '#f0fdf4' : T.surface}
                        _focus={{
                          borderColor: error ? T.red : T.blue,
                          boxShadow: `0 0 0 3px ${error ? 'rgba(220,38,38,0.1)' : 'rgba(37,99,235,0.12)'}`,
                          outline: 'none',
                        }}
                        _placeholder={{ color: T.textMuted, fontWeight: '400' }}
                      />
                    </InputGroup>
                  ) : (
                    <Input
                      value={val}
                      onChange={e => onChange(field.key, e.target.value)}
                      onBlur={() => handleBlur(field.key)}
                      placeholder={field.placeholder}
                      h="44px" fontSize="13px"
                      fontWeight={val ? '600' : '400'}
                      border="1.5px solid"
                      borderColor={error ? T.red : autofilled ? '#86efac' : T.border}
                      borderRadius="10px"
                      bg={autofilled ? '#f0fdf4' : T.surface}
                      _focus={{
                        borderColor: error ? T.red : T.blue,
                        boxShadow: `0 0 0 3px ${error ? 'rgba(220,38,38,0.1)' : 'rgba(37,99,235,0.12)'}`,
                        outline: 'none',
                      }}
                      _placeholder={{ color: T.textMuted, fontWeight: '400' }}
                    />
                  )}

                  {error && (
                    <FormErrorMessage fontSize="11px" color={T.red} fontWeight="500" mt={1}>
                      This field is required for eligibility checks
                    </FormErrorMessage>
                  )}
                </FormControl>
              )
            })}
          </VStack>
        </ModalBody>

        {/* ── Footer ── */}
        <Box px={6} py={4} borderTop="1px solid" borderColor={T.border} bg="#fafbff">
          <Flex justify="space-between" align="center">
            <Button
              variant="ghost" fontSize="13px" fontWeight="600"
              color={T.textMuted} leftIcon={<Text>↺</Text>}
              _hover={{ color: T.text, bg: T.border }}
              onClick={onRevert} isDisabled={isSaving}
            >
              Revert
            </Button>

            <HStack spacing={3}>
              <Button
                variant="outline" fontSize="13px" fontWeight="600"
                borderRadius="10px" borderColor={T.border} color={T.textSub}
                h="42px" px={5} _hover={{ bg: T.border }}
                onClick={onClose} isDisabled={isSaving}
              >
                Close
              </Button>

              <Button
                h="42px" px={6} fontSize="13px" fontWeight="700"
                borderRadius="10px"
                background="linear-gradient(135deg, #2563eb, #7c3aed)"
                color="white"
                boxShadow="0 4px 14px rgba(37,99,235,0.3)"
                leftIcon={isSaving ? <Spinner size="xs" color="white" /> : <Text>💾</Text>}
                _hover={{ background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)', transform: 'translateY(-1px)' }}
                transition="all 0.15s"
                onClick={onSave}
                isLoading={isSaving}
                loadingText="Saving…"
              >
                Save Policy
              </Button>
            </HStack>
          </Flex>
        </Box>
      </ModalContent>
    </Modal>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function UploadPolicyPage() {

  const [file, setFile]             = useState<File | null>(null)
  const [dragging, setDragging]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [progress, setProgress]     = useState(0)
  const inputRef                    = useRef<HTMLInputElement>(null)
  const toast                       = useToast()

  const [modalOpen, setModalOpen]             = useState(false)
  const [form, setForm]                       = useState<PolicyForm>({ ...EMPTY_FORM })
  const [originalForm, setOriginalForm]       = useState<PolicyForm>({ ...EMPTY_FORM })
  const [autoFilledCount, setAutoFilledCount] = useState(0)
  const [isManualMode, setIsManualMode]       = useState(false)
  const [isSaving, setIsSaving]               = useState(false)

  const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/lender-policy`

  // ── File handlers ──

  const applyFile = (f: File) => { setFile(f); setProgress(0) }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) applyFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) applyFile(f)
  }, [])

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  // ── Upload → extract → open modal ──

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'No file selected', status: 'warning', duration: 3000, isClosable: true, position: 'top-right' })
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      setUploading(true)
      setProgress(0)

      const res = await axios.post<UploadResult>(
        `${API_BASE}/lender-policy/create-policy`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
          },
        }
      )

      const extracted = res.data?.extracted ?? {}
      const mapped    = mapExtractedToForm(extracted)
      const count     = Object.values(mapped).filter(v => v !== '').length

      // ── KEY LOGIC ──
      // count === 0 → extraction failed / empty → manual mode
      // count  > 0 → auto-fill mode
      const manual = count === 0
      const filled = { ...EMPTY_FORM, ...mapped }

      setForm(filled)
      setOriginalForm(filled)
      setAutoFilledCount(count)
      setIsManualMode(manual)
      setModalOpen(true)

      toast({
        title: manual
          ? 'No data extracted — please fill in manually'
          : `Extraction complete — ${count} fields auto-filled`,
        status: manual ? 'warning' : 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      })

    } catch (err: any) {
      console.error(err)

      // ── Even if the upload API itself errors, open blank modal for manual entry ──
      setForm({ ...EMPTY_FORM })
      setOriginalForm({ ...EMPTY_FORM })
      setAutoFilledCount(0)
      setIsManualMode(true)
      setModalOpen(true)

      toast({
        title: 'Extraction failed — enter details manually',
        description: err?.response?.data?.message || 'The document could not be processed.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
        position: 'top-right',
      })
    } finally {
      setUploading(false)
    }
  }

  // ── Form handlers ──

  const handleFormChange = (key: keyof PolicyForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleRevert = () => setForm({ ...originalForm })

  // ── Save → POST /lender-policy/create-policy ──

  const handleSave = async () => {

  const missing = FORM_FIELDS.filter(
    f =>
      f.required &&
      !String(form[f.key] || '').trim()
  )

  if (missing.length > 0) {

    toast({
      title: `${missing.length} required field(s) missing`,
      description: missing
        .map(f => f.label)
        .join(', '),
      status: 'warning',
      duration: 4000,
      isClosable: true,
      position: 'top-right',
    })

    return
  }

  try {

    setIsSaving(true)

    const payload = {

      lenderName:
        form.lenderName,

      minCibil:
        Number(form.minCibil),

      maxCibil:
        Number(form.maxCibil),

      minLoanAmount:
        Number(form.minLoanAmount),

      maxLoanAmount:
        Number(form.maxLoanAmount),

      allowedProfessions:
        form.allowedProfessions || [],

      allowedLocations:
        form.allowedLocations || [],

      blockedLocations:
        form.blockedLocations || [],

      employmentTypes:
        form.employmentTypes || [],

      maxFOIR:
        form.maxFOIR
          ? Number(form.maxFOIR)
          : undefined,

      roi:
        form.roi
          ? Number(form.roi)
          : undefined,

      minIncome:
        form.minIncome
          ? Number(form.minIncome)
          : undefined,

      isActive: true,

      remarks:
        form.remarks,

      policyType:
        form.policyType,
    }

    console.log(
      'SAVE PAYLOAD',
      payload
    )

    await axios.post(
      `${API_BASE}/lender-policy/create-policy`,
      payload
    )

    toast({
      title:
        'Policy saved successfully!',
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    })

    setModalOpen(false)

    setFile(null)

    setForm({
      ...EMPTY_FORM,
    })

    setOriginalForm({
      ...EMPTY_FORM,
    })

    setAutoFilledCount(0)

    setIsManualMode(false)

  } catch (err: any) {

    console.error(err)

    toast({
      title: 'Save failed',

      description:
        Array.isArray(
          err?.response?.data?.message
        )
          ? err.response.data.message.join(', ')
          : err?.response?.data?.message ||
            'Something went wrong.',

      status: 'error',

      duration: 4000,

      isClosable: true,

      position: 'top-right',
    })

  } finally {

    setIsSaving(false)
  }
}

  // ── Render ──

  return (
    <Box
      ml={{ base: 0, md: '240px' }}
      bg={T.bg}
      minH="100vh"
      fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      display="flex"
      flexDirection="column"
    >
      <Box flex="1" pt="calc(64px + 28px)" pb={10}>
        <Container maxW="700px" px={{ base: 4, md: 6 }}>

          {/* ── Page Header ── */}
          <HStack spacing={3} mb={8} align="center">
            <Box
              w="42px" h="42px" borderRadius="12px"
              background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
              display="flex" alignItems="center" justifyContent="center"
              boxShadow="0 4px 14px rgba(37,99,235,0.28)" flexShrink={0}
            >
              <Text fontSize="20px" lineHeight="1">📄</Text>
            </Box>
            <Box>
              <Text fontSize="18px" fontWeight="800" color={T.text} letterSpacing="-0.3px" lineHeight="1.1">
                Upload Policy
              </Text>
              <Text fontSize="12px" color={T.textMuted} fontWeight="500" mt="2px">
                Upload a policy document to automatically extract key information
              </Text>
            </Box>
          </HStack>

          {/* ── Upload Card ── */}
          <Box
            bg={T.surface} borderRadius={T.radius}
            border="1px solid" borderColor={T.border}
            boxShadow={T.shadow} overflow="hidden" mb={5}
          >
            {/* Card header */}
            <Box px={5} py={3.5} borderBottom="1px solid" borderColor={T.border} bg="#fafbff">
              <Flex justify="space-between" align="center">
                <Text fontSize="11px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.7px">
                  Document Upload
                </Text>
                <HStack spacing={1.5}>
                  {FILE_TYPES.map((ext) => (
                    <Box key={ext} px={1.5} bg={T.blueLight} borderRadius="4px">
                      <Text fontSize="9px" fontWeight="700" color={T.blue} letterSpacing="0.3px">{ext}</Text>
                    </Box>
                  ))}
                </HStack>
              </Flex>
            </Box>

            {/* Drop zone */}
            <Box p={5}>
              <Box
                border="2px dashed"
                borderColor={dragging ? T.blue : file ? '#86efac' : T.border}
                bg={dragging ? T.blueLight : file ? T.greenLight : '#fafbff'}
                borderRadius={T.radius}
                py={file ? 5 : 12} px={6}
                textAlign="center"
                cursor={file ? 'default' : 'pointer'}
                transition="all 0.15s ease"
                _hover={!file ? { borderColor: T.blue, bg: T.blueLight } : {}}
                onClick={() => !file && inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                role={!file ? 'button' : undefined}
              >
                <input
                  ref={inputRef} type="file" accept={ACCEPT_TYPES}
                  onChange={handleFileChange} style={{ display: 'none' }}
                />

                {!file ? (
                  <VStack spacing={4}>
                    <Box
                      w="60px" h="60px" borderRadius="16px"
                      bg={dragging ? T.blue : T.blueLight}
                      display="flex" alignItems="center" justifyContent="center" mx="auto"
                      boxShadow={dragging ? '0 0 0 10px rgba(37,99,235,0.12)' : '0 0 0 10px #dbeafe'}
                      transition="all 0.15s"
                    >
                      <Text fontSize="26px" lineHeight="1">{dragging ? '📥' : '☁️'}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="15px" fontWeight="700" color={T.text} mb={1}>
                        {dragging ? 'Release to upload' : 'Drag & drop your document here'}
                      </Text>
                      <Text fontSize="13px" color={T.textMuted}>
                        or{' '}
                        <Box
                          as="span" color={T.blue} fontWeight="600"
                          cursor="pointer" _hover={{ textDecoration: 'underline' }}
                          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                        >
                          browse files
                        </Box>
                        {' '}— max 20 MB
                      </Text>
                    </Box>
                  </VStack>
                ) : (
                  <Flex align="center" gap={3} textAlign="left">
                    <Box
                      w="46px" h="46px" borderRadius="12px"
                      bg={T.greenLight} border="1px solid" borderColor="#86efac"
                      display="flex" alignItems="center" justifyContent="center"
                      fontSize="22px" flexShrink={0}
                    >
                      📄
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text fontSize="13px" fontWeight="700" color={T.text} noOfLines={1}>{file.name}</Text>
                      <HStack spacing={2} mt={1}>
                        <Box px={2} bg={T.greenLight} borderRadius="full">
                          <Text fontSize="10px" fontWeight="700" color={T.green}>Ready</Text>
                        </Box>
                        <Text fontSize="11px" color={T.textMuted}>{formatBytes(file.size)}</Text>
                      </HStack>
                    </Box>
                    <Button
                      size="xs" variant="ghost" fontSize="11px" fontWeight="600"
                      color={T.textMuted} borderRadius="8px" flexShrink={0}
                      _hover={{ bg: T.redLight, color: T.red }}
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    >
                      Remove
                    </Button>
                  </Flex>
                )}
              </Box>
            </Box>

            {/* Progress bar */}
            {uploading && (
              <Box px={5} pb={4}>
                <Flex justify="space-between" mb={1.5}>
                  <Text fontSize="11px" color={T.textMuted} fontWeight="500">Uploading &amp; extracting…</Text>
                  <Text fontSize="11px" color={T.blue} fontWeight="700">{progress}%</Text>
                </Flex>
                <Box h="5px" bg={T.border} borderRadius="full" overflow="hidden">
                  <Box
                    h="100%" w={`${progress}%`}
                    background="linear-gradient(90deg, #2563eb, #7c3aed)"
                    borderRadius="full" transition="width 0.3s ease"
                  />
                </Box>
              </Box>
            )}

            {/* Action button */}
            <Box px={5} pb={5}>
              <Button
                w="full" h="44px" fontSize="13px" fontWeight="700"
                borderRadius={T.radiusSm}
                background={file && !uploading ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : undefined}
                colorScheme={!(file && !uploading) ? 'blue' : undefined}
                color="white"
                boxShadow={file && !uploading ? '0 4px 14px rgba(37,99,235,0.3)' : undefined}
                _hover={file && !uploading
                  ? { background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)', transform: 'translateY(-1px)' }
                  : {}}
                transition="all 0.15s"
                onClick={handleUpload}
                isLoading={uploading}
                loadingText="Extracting…"
                isDisabled={!file || uploading}
              >
                Extract Policy Data
              </Button>
            </Box>
          </Box>

          {/* ── How It Works ── */}
          <SimpleGrid columns={3} spacing={3} mb={5}>
            {[
              { icon: '📤', title: 'Upload',        desc: 'Select or drag any policy document' },
              { icon: '🤖', title: 'AI Extraction',  desc: 'Key fields auto-detected instantly' },
              { icon: '📋', title: 'Review & Save',  desc: 'Verify auto-filled or enter manually' },
            ].map((step) => (
              <Box
                key={step.title}
                bg={T.surface} border="1px solid" borderColor={T.border}
                borderRadius={T.radiusSm} px={4} py={4}
                textAlign="center" boxShadow={T.shadow}
              >
                <Text fontSize="22px" mb={1.5}>{step.icon}</Text>
                <Text fontSize="12px" fontWeight="700" color={T.text}>{step.title}</Text>
                <Text fontSize="11px" color={T.textMuted} mt={0.5} lineHeight="1.4">{step.desc}</Text>
              </Box>
            ))}
          </SimpleGrid>

        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box as="footer" borderTop="1px solid" borderColor={T.border} bg={T.surface} py={4}>
        <Container maxW="700px" px={{ base: 4, md: 6 }}>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack spacing={2}>
              <Box
                w="22px" h="22px" borderRadius="6px"
                background="linear-gradient(135deg, #2563eb, #7c3aed)"
                display="flex" alignItems="center" justifyContent="center"
              >
                <Text fontSize="9px" color="white" fontWeight="800" letterSpacing="-0.3px">CE</Text>
              </Box>
              <Text fontSize="12px" fontWeight="600" color={T.textSub}>Credit Engine</Text>
              <Text fontSize="11px" color={T.textMuted}>· Policy Intelligence</Text>
            </HStack>
            <Text fontSize="11px" color={T.textMuted}>
              Documents processed securely · Not stored permanently
            </Text>
          </Flex>
        </Container>
      </Box>

      {/* ── Review / Manual Entry Modal ── */}
      <PolicyReviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        onChange={handleFormChange}
        onSave={handleSave}
        onRevert={handleRevert}
        isSaving={isSaving}
        autoFilledCount={autoFilledCount}
        isManualMode={isManualMode}
      />
    </Box>
  )
}