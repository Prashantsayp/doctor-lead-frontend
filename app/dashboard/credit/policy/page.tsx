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
} from '@chakra-ui/react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface ExtractedData {
  [key: string]: string | number | boolean | null
}

interface UploadResult {
  extracted: ExtractedData
  [key: string]: unknown
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const ACCEPT_TYPES = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg'
const FILE_TYPES = ['PDF', 'DOC', 'DOCX', 'TXT', 'PNG', 'JPG']

// ─── Design Tokens ─────────────────────────────────────────────────────────

const T = {
  bg: '#f6f7fb',
  surface: '#ffffff',
  border: '#e8eaf0',
  text: '#111827',
  textSub: '#6b7280',
  textMuted: '#9ca3af',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  red: '#dc2626',
  redLight: '#fef2f2',
  radius: '14px',
  radiusSm: '10px',
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FieldRow({ label, value, isLast }: { label: string; value: unknown; isLast?: boolean }) {
  const display =
    value === null || value === undefined ? '—'
    : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
    : String(value)
  const isEmpty = display === '—'

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={6}
      px={5}
      py={3}
      borderBottom={isLast ? 'none' : '1px solid'}
      borderColor={T.border}
      _hover={{ bg: '#fafbff' }}
      transition="background 0.1s"
    >
      <Text
        fontSize="12px" color={T.textSub} fontWeight="600"
        textTransform="capitalize" minW="140px" flexShrink={0} letterSpacing="0.1px"
      >
        {label.replace(/_/g, ' ')}
      </Text>
      <Text
        fontSize="13px"
        color={isEmpty ? T.textMuted : T.text}
        fontWeight={isEmpty ? '400' : '600'}
        textAlign="right"
        wordBreak="break-all"
        fontStyle={isEmpty ? 'italic' : 'normal'}
      >
        {display}
      </Text>
    </Flex>
  )
}

function StatChip({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <Box
      flex="1" bg={T.surface} border="1px solid" borderColor={T.border}
      borderRadius={T.radiusSm} px={4} py={3} textAlign="center" boxShadow={T.shadow}
      position="relative" overflow="hidden"
      _before={{ content: '""', position: 'absolute', top: 0, left: 0, right: 0, h: '3px', bg: accent, borderRadius: '14px 14px 0 0' }}
    >
      <Text fontSize="20px" fontWeight="800" color={T.text} lineHeight="1">{value}</Text>
      <Text fontSize="10px" fontWeight="600" color={T.textMuted} mt={1} textTransform="uppercase" letterSpacing="0.6px">{label}</Text>
    </Box>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function UploadPolicyPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<UploadResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  // ── File handlers (ALL UNCHANGED) ──

  const applyFile = (f: File) => { setFile(f); setResult(null); setProgress(0) }

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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  // ── Upload (ALL UNCHANGED) ──

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'No file selected', status: 'warning', duration: 3000, isClosable: true, position: 'top-right' })
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    try {
      setLoading(true)
      setProgress(0)
      const res = await axios.post<UploadResult>(
        'http://localhost:3001/policy-upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
          },
        }
      )
      setResult(res.data)
      toast({ title: 'Policy extracted successfully', status: 'success', duration: 3000, isClosable: true, position: 'top-right' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Upload failed', description: 'Something went wrong. Please try again.', status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally {
      setLoading(false)
    }
  }

  const extractedEntries = result?.extracted ? Object.entries(result.extracted) : []
  const filledCount = extractedEntries.filter(([, v]) => v !== null && v !== undefined && v !== '').length
  const emptyCount = extractedEntries.length - filledCount

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
              w="42px" h="42px"
              borderRadius="12px"
              background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
              display="flex" alignItems="center" justifyContent="center"
              boxShadow="0 4px 14px rgba(37,99,235,0.28)"
              flexShrink={0}
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
            bg={T.surface}
            borderRadius={T.radius}
            border="1px solid"
            borderColor={T.border}
            boxShadow={T.shadow}
            overflow="hidden"
            mb={5}
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
                py={file ? 5 : 12}
                px={6}
                textAlign="center"
                cursor={file ? 'default' : 'pointer'}
                transition="all 0.15s ease"
                _hover={!file ? { borderColor: T.blue, bg: T.blueLight } : {}}
                onClick={() => !file && inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                role={!file ? 'button' : undefined}
                aria-label={!file ? 'Click or drag to upload a document' : undefined}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT_TYPES}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {!file ? (
                  <VStack spacing={4}>
                    <Box
                      w="60px" h="60px"
                      borderRadius="16px"
                      bg={dragging ? T.blue : T.blueLight}
                      display="flex" alignItems="center" justifyContent="center"
                      mx="auto"
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
                      onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                      aria-label="Remove file"
                    >
                      Remove
                    </Button>
                  </Flex>
                )}
              </Box>
            </Box>

            {/* Progress bar */}
            {loading && (
              <Box px={5} pb={4}>
                <Flex justify="space-between" mb={1.5}>
                  <Text fontSize="11px" color={T.textMuted} fontWeight="500">Uploading &amp; extracting…</Text>
                  <Text fontSize="11px" color={T.blue} fontWeight="700">{progress}%</Text>
                </Flex>
                <Box h="5px" bg={T.border} borderRadius="full" overflow="hidden">
                  <Box
                    h="100%"
                    w={`${progress}%`}
                    background="linear-gradient(90deg, #2563eb, #7c3aed)"
                    borderRadius="full"
                    transition="width 0.3s ease"
                  />
                </Box>
              </Box>
            )}

            {/* Action button */}
            <Box px={5} pb={5}>
              <Button
                w="full" h="44px" fontSize="13px" fontWeight="700"
                borderRadius={T.radiusSm}
                background={file && !loading ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : undefined}
                colorScheme={!(file && !loading) ? 'blue' : undefined}
                color="white"
                boxShadow={file && !loading ? '0 4px 14px rgba(37,99,235,0.3)' : undefined}
                _hover={file && !loading
                  ? { background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)', transform: 'translateY(-1px)', boxShadow: '0 6px 18px rgba(37,99,235,0.35)' }
                  : {}}
                transition="all 0.15s"
                onClick={handleUpload}
                isLoading={loading}
                loadingText="Extracting…"
                isDisabled={!file || loading}
              >
                Extract Policy Data
              </Button>
            </Box>
          </Box>

          {/* ── How It Works (shown before result) ── */}
          {!result && (
            <SimpleGrid columns={3} spacing={3} mb={5}>
              {[
                { icon: '📤', title: 'Upload', desc: 'Select or drag any policy document' },
                { icon: '🤖', title: 'AI Extraction', desc: 'Key fields auto-detected instantly' },
                { icon: '📋', title: 'Review', desc: 'Verify & use the extracted data' },
              ].map((step) => (
                <Box
                  key={step.title}
                  bg={T.surface}
                  border="1px solid"
                  borderColor={T.border}
                  borderRadius={T.radiusSm}
                  px={4} py={4}
                  textAlign="center"
                  boxShadow={T.shadow}
                >
                  <Text fontSize="22px" mb={1.5}>{step.icon}</Text>
                  <Text fontSize="12px" fontWeight="700" color={T.text}>{step.title}</Text>
                  <Text fontSize="11px" color={T.textMuted} mt={0.5} lineHeight="1.4">{step.desc}</Text>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {/* ── Results Card ── */}
          {result && (
            <Box
              bg={T.surface}
              borderRadius={T.radius}
              border="1px solid"
              borderColor={T.border}
              boxShadow={T.shadow}
              overflow="hidden"
            >
              {/* Header */}
              <Box px={5} py={3.5} borderBottom="1px solid" borderColor={T.border} bg="#fafbff">
                <Flex justify="space-between" align="center">
                  <Text fontSize="11px" fontWeight="700" color={T.textMuted} textTransform="uppercase" letterSpacing="0.7px">
                    Extracted Data
                  </Text>
                  <Box px={2.5} py={0.5} bg={T.greenLight} borderRadius="full">
                    <Text fontSize="11px" fontWeight="700" color={T.green}>
                      {extractedEntries.length} fields found
                    </Text>
                  </Box>
                </Flex>
              </Box>

              {/* Stat chips */}
              {extractedEntries.length > 0 && (
                <HStack spacing={3} px={5} pt={4} pb={2}>
                  <StatChip label="Total Fields" value={extractedEntries.length} accent="linear-gradient(90deg,#2563eb,#7c3aed)" />
                  <StatChip label="Filled" value={filledCount} accent="linear-gradient(90deg,#16a34a,#059669)" />
                  <StatChip label="Empty" value={emptyCount} accent="linear-gradient(90deg,#d97706,#f59e0b)" />
                </HStack>
              )}

              {/* Field rows */}
              <Box pt={2}>
                {extractedEntries.length > 0 ? (
                  extractedEntries.map(([key, value], idx) => (
                    <FieldRow key={key} label={key} value={value} isLast={idx === extractedEntries.length - 1} />
                  ))
                ) : (
                  <Box py={12} textAlign="center">
                    <Text fontSize="30px" mb={2}>🔍</Text>
                    <Text fontSize="13px" color={T.textMuted} fontWeight="500">
                      No fields could be extracted from this document.
                    </Text>
                  </Box>
                )}
              </Box>

              {/* Raw JSON */}
              {extractedEntries.length > 0 && (
                <Box borderTop="1px solid" borderColor={T.border} px={5} py={4}>
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: '12px', color: T.textMuted, fontWeight: 600, userSelect: 'none', listStyle: 'none', letterSpacing: '0.1px' }}>
                      {'{ } '} View raw JSON
                    </summary>
                    <Box mt={3} bg="#f8fafc" border="1px solid" borderColor={T.border} borderRadius={T.radiusSm} p={4} overflow="auto" maxH="260px">
                      <pre style={{ fontSize: '12px', color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, lineHeight: 1.7, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                        {JSON.stringify(result.extracted, null, 2)}
                      </pre>
                    </Box>
                  </details>
                </Box>
              )}
            </Box>
          )}

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
    </Box>
  )
}