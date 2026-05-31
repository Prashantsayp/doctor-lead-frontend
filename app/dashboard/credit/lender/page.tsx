'use client'

import {
  Box, Text, Button, Container, Flex, HStack, VStack,
  Input, InputGroup, InputLeftElement, Select,
  Table, Thead, Tbody, Tr, Th, Td,
  SimpleGrid, Spinner, useToast, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Switch, Collapse,
} from '@chakra-ui/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lender {
  _id: string; name: string; minCibil: number
  maxFoir: number; minIncome: number; isActive: boolean
}
interface LenderForm {
  name: string; minCibil: string; maxFoir: string; minIncome: string; isActive: boolean
}
interface Policy {
  _id: string; lenderId: string; lenderName: string
  minCibil: number; maxCibil: number; minLoanAmount: number; maxLoanAmount: number
  minIncome: number; maxFOIR: number; roi: number
  allowedProfessions: string[]; isActive: boolean; createdAt: string
}
interface EligResult { lenderId: string; eligible: boolean; reason?: string }

type SortKey      = 'lenderName' | 'minCibil' | 'roi' | 'maxLoanAmount' | 'minIncome' | 'maxFOIR'
type SortDir      = 'asc' | 'desc'
type ViewMode     = 'grid' | 'table'
type StatusFilter = 'all' | 'active' | 'inactive'
type ActiveTab    = 'manage' | 'compare'

// ─── Constants ────────────────────────────────────────────────────────────────

const API            = process.env.NEXT_PUBLIC_API_URL
const L_API          = `${API}/lender`
const MAX_MANAGE_CMP = 3
const MAX_DEEP_CMP   = 3

const INIT_FORM: LenderForm = { name: '', minCibil: '', maxFoir: '', minIncome: '', isActive: true }

const PALETTES = [
  { bg: '#EEF2FF', text: '#3730A3' }, { bg: '#F0FDF4', text: '#166534' },
  { bg: '#FFF7ED', text: '#9A3412' }, { bg: '#FDF4FF', text: '#7E22CE' },
  { bg: '#F0FDFA', text: '#134E4A' }, { bg: '#FFFBEB', text: '#92400E' },
]

const PROFESSIONS = [
  { value: 'DOCTOR',            label: 'Doctor' },
  { value: 'CA',                label: 'Chartered Accountant' },
  { value: 'LAWYER',            label: 'Lawyer' },
  { value: 'SALARIED',          label: 'Salaried' },
  { value: 'BUSINESSMAN',       label: 'Businessman' },
  { value: 'COMPANY_SECRETARY', label: 'Company Secretary' },
  { value: 'COST_ACCOUNTANT',   label: 'Cost Accountant' },
  { value: 'REALTOR',           label: 'Realtor' },
  { value: 'BROKER',            label: 'Broker' },
  { value: 'CHANNEL_PARTNER',   label: 'Channel Partner' },
]

// Deep compare rows definition
const DEEP_ROWS: {
  label: string
  fmt: (p: Policy) => string
  numKey: keyof Policy | null
  best: 'low' | 'high' | null
}[] = [
  { label: 'CIBIL Range',    fmt: p => `${p.minCibil || '–'} – ${p.maxCibil || '–'}`,                   numKey: 'minCibil',      best: 'low'  },
  { label: 'Interest Rate',  fmt: p => p.roi ? `${p.roi}% p.a.` : '–',                                  numKey: 'roi',           best: 'low'  },
  { label: 'Loan Range',     fmt: p => `${fmtINR(p.minLoanAmount)} – ${fmtINR(p.maxLoanAmount)}`,        numKey: 'maxLoanAmount',  best: 'high' },
  { label: 'Min Income',     fmt: p => fmtINR(p.minIncome),                                              numKey: 'minIncome',     best: 'low'  },
  { label: 'Max FOIR',       fmt: p => p.maxFOIR ? `${p.maxFOIR}%` : '–',                               numKey: 'maxFOIR',       best: 'high' },
  { label: 'Professions',    fmt: p => p.allowedProfessions?.length ? p.allowedProfessions.join(', ') : 'All professions', numKey: null, best: null },
  { label: 'Status',         fmt: p => p.isActive ? 'Active' : 'Inactive',                               numKey: null,            best: null  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(v?: number): string {
  if (!v) return '–'
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`
  return `₹${v.toLocaleString('en-IN')}`
}
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
const palette  = (n: string) => PALETTES[(n || 'A').charCodeAt(0) % PALETTES.length]
const fmtDate  = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub: string; accent?: string
}) {
  return (
    <Box bg="white" border="1px solid #F1F5F9" borderRadius="12px" px={5} py={4}>
      <Text fontSize="11px" fontWeight="700" color="#94A3B8" textTransform="uppercase" letterSpacing="0.1em">
        {label}
      </Text>
      <Text fontSize="28px" fontWeight="800" color={accent || '#0F172A'} mt={1} lineHeight={1} letterSpacing="-0.02em">
        {value}
      </Text>
      <Text fontSize="11px" color="#94A3B8" mt={2}>{sub}</Text>
    </Box>
  )
}

// ─── Sort Th ──────────────────────────────────────────────────────────────────

function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort(k: SortKey): void
}) {
  const active = current === sortKey
  return (
    <Th py={3} px={4} cursor="pointer" userSelect="none" onClick={() => onSort(sortKey)}
      fontSize="10px" fontWeight="700" letterSpacing="0.08em" textTransform="uppercase"
      whiteSpace="nowrap" color={active ? '#111827' : '#6B7280'}
      borderBottom="1px solid #F3F4F6" _hover={{ color: '#111827' }}>
      <Flex align="center" gap={1}>
        {label}
        <Text fontSize="10px" ml={0.5} color={active ? '#2563EB' : '#D1D5DB'}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </Text>
      </Flex>
    </Th>
  )
}

// ─── Manage Compare Modal ─────────────────────────────────────────────────────

const MANAGE_ROWS = [
  { label: 'Min CIBIL',  key: 'minCibil',  fmt: (v: any) => v ? `${v}` : '–',  best: 'low'  as const },
  { label: 'Max FOIR',   key: 'maxFoir',   fmt: (v: any) => v ? `${v}%` : '–', best: 'high' as const },
  { label: 'Min income', key: 'minIncome', fmt: (v: any) => fmtINR(v),          best: 'low'  as const },
]

function ManageCompareModal({ lenders, isOpen, onClose, eligMap }: {
  lenders: Lender[]; isOpen: boolean; onClose(): void; eligMap: Record<string, EligResult>
}) {
  const getBest = (key: string, dir: 'low' | 'high') => {
    const vals = lenders.map(l => (l as any)[key]).filter((v: any) => v != null && v !== 0)
    if (!vals.length) return null
    return dir === 'low' ? Math.min(...vals) : Math.max(...vals)
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered scrollBehavior="inside">
      <ModalOverlay bg="rgba(2,6,23,0.75)" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="14px" overflow="hidden" mx={4}>
        <Box h="3px" bg="#1D4ED8" />
        <ModalHeader p={0}>
          <Flex align="center" justify="space-between" px={6} py={4} borderBottom="1px solid #F1F5F9">
            <Box>
              <Text fontSize="16px" fontWeight="800" color="#0F172A" letterSpacing="-0.02em">Lender comparison</Text>
              <Text fontSize="12px" color="#94A3B8" mt={0.5}>{lenders.length} lenders · green = best value</Text>
            </Box>
            <ModalCloseButton position="static" color="#94A3B8" borderRadius="8px" />
          </Flex>
        </ModalHeader>
        <ModalBody p={0}>
          <Box overflowX="auto">
            <Table variant="unstyled" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <Thead>
                <Tr>
                  <Th w="160px" py={5} px={6} fontSize="11px" fontWeight="700" color="#94A3B8"
                    textTransform="uppercase" letterSpacing="0.1em" borderBottom="1px solid #F1F5F9" bg="#FAFBFC">
                    Parameter
                  </Th>
                  {lenders.map(l => {
                    const p = palette(l.name); const e = eligMap[l._id]
                    return (
                      <Th key={l._id} py={5} px={5} textAlign="center" minW="160px"
                        borderBottom="1px solid #F1F5F9" bg="#FAFBFC">
                        <VStack spacing={2}>
                          <Flex w="44px" h="44px" borderRadius="11px" bg={p.bg} color={p.text}
                            align="center" justify="center" fontWeight="800" fontSize="14px">
                            {initials(l.name)}
                          </Flex>
                          <Text fontSize="13px" fontWeight="800" color="#0F172A" textTransform="none" letterSpacing="normal">
                            {l.name}
                          </Text>
                          {e && (
                            <Box px={2} py={0.5} borderRadius="5px"
                              bg={e.eligible ? '#F0FDF4' : '#FEF2F2'}
                              border="1px solid" borderColor={e.eligible ? '#BBF7D0' : '#FECACA'}>
                              <Text fontSize="10px" fontWeight="700" color={e.eligible ? '#15803D' : '#DC2626'}>
                                {e.eligible ? '✓ Eligible' : '✗ Not eligible'}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </Th>
                    )
                  })}
                </Tr>
              </Thead>
              <Tbody>
                {MANAGE_ROWS.map((row, ri) => {
                  const bv = getBest(row.key, row.best)
                  return (
                    <Tr key={row.key} bg={ri % 2 === 0 ? 'white' : '#FAFBFC'}>
                      <Td py={4} px={6} borderBottom="1px solid #F8FAFC">
                        <Text fontSize="13px" fontWeight="600" color="#475569">{row.label}</Text>
                      </Td>
                      {lenders.map(l => {
                        const raw = (l as any)[row.key]; const isBest = bv != null && raw === bv
                        return (
                          <Td key={l._id} py={4} px={5} textAlign="center" borderBottom="1px solid #F8FAFC">
                            <Flex justify="center" align="center" gap={1.5} px={3} py={1.5}
                              borderRadius="8px" display="inline-flex"
                              bg={isBest ? '#F0FDF4' : 'transparent'}
                              border={isBest ? '1px solid #BBF7D0' : '1px solid transparent'}>
                              <Text fontSize="14px" fontWeight={isBest ? '800' : '500'} color={isBest ? '#15803D' : '#0F172A'}>
                                {row.fmt(raw)}
                              </Text>
                              {isBest && (
                                <Text fontSize="9px" fontWeight="700" color="#16A34A"
                                  textTransform="uppercase" letterSpacing="0.06em">Best</Text>
                              )}
                            </Flex>
                          </Td>
                        )
                      })}
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Box>
        </ModalBody>
        <ModalFooter bg="#FAFBFC" borderTop="1px solid #F1F5F9" px={6} py={3}>
          <Button onClick={onClose} bg="#0F172A" color="white" borderRadius="8px"
            fontWeight="700" fontSize="13px" h="38px" px={5} _hover={{ bg: '#1E293B' }}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

// ─── Deep Compare Modal ───────────────────────────────────────────────────────

function DeepCompareModal({ policies, isOpen, onClose, eligMap }: {
  policies: Policy[]; isOpen: boolean; onClose(): void; eligMap: Record<string, boolean>
}) {
  const getBest = (numKey: keyof Policy | null, best: 'low' | 'high' | null) => {
    if (!numKey || !best) return null
    const vals = policies.map(p => p[numKey] as number).filter(v => v != null && v !== 0)
    if (!vals.length) return null
    return best === 'low' ? Math.min(...vals) : Math.max(...vals)
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered scrollBehavior="inside">
      <ModalOverlay bg="rgba(2,6,23,0.8)" backdropFilter="blur(8px)" />
      <ModalContent borderRadius="16px" overflow="hidden" mx={4} maxH="90vh">
        <Box h="4px" bgGradient="linear(to-r, #1D4ED8, #7C3AED)" />
        <ModalHeader p={0}>
          <Flex align="center" justify="space-between" px={7} py={5} bg="white" borderBottom="1px solid #F1F5F9">
            <Box>
              <Text fontSize="18px" fontWeight="800" color="#0F172A" letterSpacing="-0.02em">
                Deep lender comparison
              </Text>
              <Text fontSize="12px" color="#94A3B8" mt={0.5}>
                {policies.length} lenders · green = best value for borrower
              </Text>
            </Box>
            <ModalCloseButton position="static" color="#94A3B8" borderRadius="8px" />
          </Flex>
        </ModalHeader>
        <ModalBody p={0} bg="#F8FAFC">
          <Box overflowX="auto">
            <Table variant="unstyled" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <Thead>
                <Tr>
                  <Th
                    w="180px" py={6} px={6}
                    fontSize="11px" fontWeight="700" color="#94A3B8"
                    textTransform="uppercase" letterSpacing="0.1em"
                    borderBottom="2px solid #E5E7EB" bg="#F8FAFC"
                  >
                    Parameter
                  </Th>
                  {policies.map(p => {
                    const pal = palette(p.lenderName || 'A')
                    const isEl = eligMap[p.lenderId]
                    return (
                      <Th key={p._id} py={5} px={5} textAlign="center" minW="200px"
                        borderBottom="2px solid #E5E7EB" bg="white">
                        <VStack spacing={2.5}>
                          <Flex w="52px" h="52px" borderRadius="14px" bg={pal.bg} color={pal.text}
                            align="center" justify="center" fontWeight="800" fontSize="16px">
                            {initials(p.lenderName || 'NA')}
                          </Flex>
                          <Box textAlign="center">
                            <Text fontSize="14px" fontWeight="800" color="#111827" textTransform="none" letterSpacing="normal">
                              {p.lenderName}
                            </Text>
                            <Text fontSize="10px" color="#9CA3AF" mt={0.5}>
                              Added {fmtDate(p.createdAt)}
                            </Text>
                          </Box>
                          {p.lenderId in eligMap && (
                            <Box px={2.5} py={1} borderRadius="6px"
                              bg={isEl ? '#F0FDF4' : '#FEF2F2'}
                              border="1px solid" borderColor={isEl ? '#BBF7D0' : '#FECACA'}>
                              <Text fontSize="10px" fontWeight="700" color={isEl ? '#15803D' : '#DC2626'}>
                                {isEl ? '✓ Eligible' : '✗ Not eligible'}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </Th>
                    )
                  })}
                </Tr>
              </Thead>
              <Tbody>
                {DEEP_ROWS.map((row, ri) => {
                  const bv = getBest(row.numKey, row.best)
                  return (
                    <Tr key={row.label} bg={ri % 2 === 0 ? 'white' : '#FAFBFC'}>
                      <Td py={4} px={6} borderBottom="1px solid #F3F4F6"
                        bg={ri % 2 === 0 ? 'white' : '#FAFBFC'}>
                        <Text fontSize="13px" fontWeight="600" color="#374151">{row.label}</Text>
                      </Td>
                      {policies.map(p => {
                        const rawNum  = row.numKey ? p[row.numKey] as number : null
                        const isBest  = bv != null && rawNum === bv
                        const display = row.fmt(p)
                        return (
                          <Td key={p._id} py={4} px={5} textAlign="center" borderBottom="1px solid #F3F4F6">
                            <Flex justify="center" align="center" gap={1.5} px={3} py={1.5}
                              borderRadius="8px" display="inline-flex"
                              bg={isBest ? '#F0FDF4' : 'transparent'}
                              border={isBest ? '1px solid #BBF7D0' : '1px solid transparent'}>
                              <Text fontSize="14px"
                                fontWeight={isBest ? '800' : '500'}
                                color={isBest ? '#15803D' : display === '–' ? '#D1D5DB' : '#111827'}>
                                {display}
                              </Text>
                              {isBest && (
                                <Box px={1} py={0.5} bg="#DCFCE7" borderRadius="4px" ml={1}>
                                  <Text fontSize="9px" fontWeight="800" color="#15803D"
                                    textTransform="uppercase" letterSpacing="0.06em">Best</Text>
                                </Box>
                              )}
                            </Flex>
                          </Td>
                        )
                      })}
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Box>
        </ModalBody>
        <ModalFooter bg="white" borderTop="1px solid #F1F5F9" px={7} py={4}>
          <Text fontSize="12px" color="#9CA3AF" flex={1}>
            Green = most borrower-friendly value for that parameter
          </Text>
          <Button onClick={onClose} bg="#0F172A" color="white" borderRadius="9px"
            fontWeight="700" fontSize="13px" h="40px" px={6} _hover={{ bg: '#1E293B' }}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

// ─── Manage Compare Tray ──────────────────────────────────────────────────────

function ManageCompareTray({ ids, lenders, onRemove, onCompare, onClear }: {
  ids: string[]; lenders: Lender[]
  onRemove(id: string): void; onCompare(): void; onClear(): void
}) {
  if (!ids.length) return null
  const selected = ids.map(id => lenders.find(l => l._id === id)).filter(Boolean) as Lender[]
  return (
    <Box position="fixed" bottom={5} left="50%" transform="translateX(-50%)"
      zIndex={1000} bg="#0F172A" borderRadius="12px" px={4} py={3}
      minW="460px" maxW="680px" boxShadow="0 16px 48px rgba(0,0,0,0.35)"
      border="1px solid rgba(255,255,255,0.07)">
      <Flex align="center" gap={3}>
        <Flex gap={2} flex={1} align="center" flexWrap="wrap">
          <Text fontSize="11px" fontWeight="600" color="rgba(255,255,255,0.4)"
            textTransform="uppercase" letterSpacing="0.1em" flexShrink={0}>Compare</Text>
          {[0,1,2].map(i => {
            const l = selected[i]; const p = l ? palette(l.name) : null
            return l ? (
              <Flex key={i} align="center" gap={2} bg="rgba(255,255,255,0.08)"
                borderRadius="8px" px={3} py={1.5} border="1px solid rgba(255,255,255,0.1)">
                <Box w="20px" h="20px" borderRadius="5px" bg={p!.bg}
                  display="flex" alignItems="center" justifyContent="center">
                  <Text fontSize="8px" fontWeight="800" color={p!.text}>{initials(l.name)}</Text>
                </Box>
                <Text fontSize="12px" fontWeight="700" color="white"
                  maxW="110px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {l.name}
                </Text>
                <Box as="button" onClick={() => onRemove(l._id)} fontSize="11px"
                  color="rgba(255,255,255,0.35)" _hover={{ color: 'white' }}
                  transition="color 0.1s" lineHeight={1}>✕</Box>
              </Flex>
            ) : (
              <Box key={i} px={3} py={1.5} borderRadius="8px"
                border="1px dashed rgba(255,255,255,0.12)">
                <Text fontSize="12px" color="rgba(255,255,255,0.2)">Slot {i + 1}</Text>
              </Box>
            )
          })}
        </Flex>
        <Flex gap={2} flexShrink={0}>
          <Button onClick={onClear} variant="ghost" h="34px" px={3} borderRadius="7px"
            fontSize="12px" fontWeight="600" color="rgba(255,255,255,0.4)"
            _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
            Clear
          </Button>
          <Button onClick={onCompare} isDisabled={ids.length < 2} h="34px" px={4}
            borderRadius="7px" fontSize="13px" fontWeight="700"
            bg={ids.length >= 2 ? '#2563EB' : 'rgba(255,255,255,0.08)'}
            color={ids.length >= 2 ? 'white' : 'rgba(255,255,255,0.25)'}
            _hover={ids.length >= 2 ? { bg: '#1D4ED8' } : {}}
            _disabled={{ opacity: 1, cursor: 'not-allowed' }}>
            {ids.length >= 2 ? `Compare (${ids.length})` : `Select ${2 - ids.length} more`}
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

// ─── Deep Compare Tray ────────────────────────────────────────────────────────

function DeepCompareTray({ ids, policies, onRemove, onCompare, onClear }: {
  ids: string[]; policies: Policy[]
  onRemove(id: string): void; onCompare(): void; onClear(): void
}) {
  if (!ids.length) return null
  const selected = ids.map(id => policies.find(p => p._id === id)).filter(Boolean) as Policy[]
  return (
    <Box position="fixed" bottom={5} left="50%" transform="translateX(-50%)"
      zIndex={1000} bg="#0F172A" borderRadius="12px" px={4} py={3}
      minW="520px" maxW="750px" boxShadow="0 16px 48px rgba(0,0,0,0.35)"
      border="1px solid rgba(255,255,255,0.07)">
      <Flex align="center" gap={3}>
        <Flex gap={2} flex={1} align="center" flexWrap="wrap">
          <Text fontSize="11px" fontWeight="600" color="rgba(255,255,255,0.4)"
            textTransform="uppercase" letterSpacing="0.1em" flexShrink={0}>Deep Compare</Text>
          {[0,1,2].map(i => {
            const p = selected[i]; const pal = p ? palette(p.lenderName || 'A') : null
            return p ? (
              <Flex key={i} align="center" gap={2} bg="rgba(255,255,255,0.08)"
                borderRadius="8px" px={3} py={1.5} border="1px solid rgba(255,255,255,0.1)">
                <Box w="20px" h="20px" borderRadius="5px" bg={pal!.bg}
                  display="flex" alignItems="center" justifyContent="center">
                  <Text fontSize="8px" fontWeight="800" color={pal!.text}>
                    {initials(p.lenderName || 'NA')}
                  </Text>
                </Box>
                <Text fontSize="12px" fontWeight="700" color="white"
                  maxW="130px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {p.lenderName}
                </Text>
                {p.roi ? (
                  <Text fontSize="10px" color="rgba(255,255,255,0.4)">{p.roi}%</Text>
                ) : null}
                <Box as="button" onClick={() => onRemove(p._id)} fontSize="11px"
                  color="rgba(255,255,255,0.35)" _hover={{ color: 'white' }}
                  transition="color 0.1s" lineHeight={1}>✕</Box>
              </Flex>
            ) : (
              <Box key={i} px={3} py={1.5} borderRadius="8px"
                border="1px dashed rgba(255,255,255,0.12)">
                <Text fontSize="12px" color="rgba(255,255,255,0.2)">Slot {i + 1}</Text>
              </Box>
            )
          })}
        </Flex>
        <Flex gap={2} flexShrink={0}>
          <Button onClick={onClear} variant="ghost" h="34px" px={3} borderRadius="7px"
            fontSize="12px" fontWeight="600" color="rgba(255,255,255,0.4)"
            _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
            Clear
          </Button>
          <Button onClick={onCompare} isDisabled={ids.length < 2} h="34px" px={4}
            borderRadius="7px" fontSize="13px" fontWeight="700"
            bg={ids.length >= 2 ? '#7C3AED' : 'rgba(255,255,255,0.08)'}
            color={ids.length >= 2 ? 'white' : 'rgba(255,255,255,0.25)'}
            _hover={ids.length >= 2 ? { bg: '#6D28D9' } : {}}
            _disabled={{ opacity: 1, cursor: 'not-allowed' }}>
            {ids.length >= 2 ? `Compare (${ids.length})` : `Select ${2 - ids.length} more`}
          </Button>
        </Flex>
      </Flex>
      {ids.length < 2 && (
        <Text fontSize="10px" color="rgba(255,255,255,0.25)" textAlign="center" mt={1.5}>
          Select 2–3 rows from the table to compare side-by-side
        </Text>
      )}
    </Box>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LenderIntelligencePage() {
  const toast   = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<ActiveTab>('manage')

  // ── Manage tab state ──────────────────────────────────────────────────────
  const [lenders,    setLenders]    = useState<Lender[]>([])
  const [lLoading,   setLLoading]   = useState(true)
  const [togId,      setTogId]      = useState<string | null>(null)
  const [delId,      setDelId]      = useState<string | null>(null)
  const [form,       setForm]       = useState<LenderForm>(INIT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [csvFile,    setCsvFile]    = useState<File | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [viewMode,   setViewMode]   = useState<ViewMode>('grid')
  const [lSearch,    setLSearch]    = useState('')
  const [lStatus,    setLStatus]    = useState<StatusFilter>('all')
  const [mCmpIds,    setMCmpIds]    = useState<string[]>([])
  const [eligMap,    setEligMap]    = useState<Record<string, EligResult>>({})
  const [showEligM,  setShowEligM]  = useState(false)
  const [mCibil,     setMCibil]     = useState('')
  const [mIncome,    setMIncome]    = useState('')
  const [mLoan,      setMLoan]      = useState('')
  const [mChecking,  setMChecking]  = useState(false)
  const [mChecked,   setMChecked]   = useState(false)

  // ── Deep Compare tab state ────────────────────────────────────────────────
  const [policies,    setPolicies]    = useState<Policy[]>([])
  const [pLoading,    setPLoading]    = useState(true)
  const [pSearch,     setPSearch]     = useState('')
  const [sortKey,     setSortKey]     = useState<SortKey>('lenderName')
  const [sortDir,     setSortDir]     = useState<SortDir>('asc')
  const [activeOnly,  setActiveOnly]  = useState(false)
  const [dCmpIds,     setDCmpIds]     = useState<string[]>([])
  const [pEligMap,    setPEligMap]    = useState<Record<string, boolean>>({})
  const [pChecked,    setPChecked]    = useState(false)
  const [showEligC,   setShowEligC]   = useState(true)
  const [dCibil,      setDCibil]      = useState('')
  const [dIncome,     setDIncome]     = useState('')
  const [dLoan,       setDLoan]       = useState('')
  const [dProfession, setDProfession] = useState('')
  const [dChecking,   setDChecking]   = useState(false)

  const { isOpen: isAddOpen,  onOpen: openAdd,  onClose: closeAdd  } = useDisclosure()
  const { isOpen: isBulkOpen, onOpen: openBulk, onClose: closeBulk } = useDisclosure()
  const { isOpen: isMCmpOpen, onOpen: openMCmp, onClose: closeMCmp } = useDisclosure()
  const { isOpen: isDCmpOpen, onOpen: openDCmp, onClose: closeDCmp } = useDisclosure()

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadLenders = useCallback(async () => {
    try {
      setLLoading(true)
      const res = await axios.get<Lender[]>(`${L_API}/get-all`)
      setLenders(Array.isArray(res.data) ? res.data : (res.data as any)?.data || [])
    } catch {
      toast({ title: 'Failed to load lenders', status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally { setLLoading(false) }
  }, [toast])

  const loadPolicies = useCallback(async () => {
    try {
      setPLoading(true)
      const res = await axios.get(`${API}/lender-policy/all-policies`)
      setPolicies(res.data?.data || res.data || [])
    } catch {
      toast({ title: 'Failed to load policies', status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally { setPLoading(false) }
  }, [toast])

  useEffect(() => { loadLenders(); loadPolicies() }, [loadLenders, loadPolicies])

  // ── Manage CRUD ───────────────────────────────────────────────────────────

  const addLender = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Lender name is required', status: 'warning', duration: 3000, isClosable: true, position: 'top-right' })
      return
    }
    setSubmitting(true)
    try {
      await axios.post(`${L_API}/create`, {
        name: form.name.trim(), minCibil: Number(form.minCibil) || 0,
        maxFoir: Number(form.maxFoir) || 0, minIncome: Number(form.minIncome) || 0,
        isActive: form.isActive,
      })
      toast({ title: 'Lender added', status: 'success', duration: 3000, isClosable: true, position: 'top-right' })
      setForm(INIT_FORM); closeAdd(); await loadLenders()
    } catch {
      toast({ title: 'Failed to add lender', status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally { setSubmitting(false) }
  }

  const downloadTemplate = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(
      ['name,minCibil,maxFoir,minIncome\nHDFC Bank,720,50,30000\nICICI Bank,700,55,25000'],
      { type: 'text/csv' }
    ))
    a.download = 'lenders_template.csv'; a.click()
  }

  const bulkUpload = async () => {
    if (!csvFile) {
      toast({ title: 'Select a CSV file first', status: 'warning', duration: 3000, isClosable: true }); return
    }
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', csvFile)
      await axios.post(`${L_API}/bulk-upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast({ title: 'Bulk import successful', status: 'success', duration: 3000, isClosable: true, position: 'top-right' })
      setCsvFile(null); closeBulk(); await loadLenders()
    } catch {
      toast({ title: 'Import failed', status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally { setUploading(false) }
  }

  const toggleStatus = async (l: Lender) => {
    setTogId(l._id)
    try {
      await axios.patch(`${L_API}/toggle-status/${l._id}`, { isActive: !l.isActive })
      await loadLenders()
    } catch {
      toast({ title: 'Status update failed', status: 'error', duration: 3000, isClosable: true, position: 'top-right' })
    } finally { setTogId(null) }
  }

  const deleteLender = async (id: string) => {
    setDelId(id)
    try {
      await axios.delete(`${L_API}/${id}`)
      setMCmpIds(p => p.filter(c => c !== id))
      toast({ title: 'Lender deleted', status: 'success', duration: 3000, isClosable: true, position: 'top-right' })
      await loadLenders()
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Delete failed', status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally { setDelId(null) }
  }

  // ── Manage eligibility ────────────────────────────────────────────────────

  const checkManageElig = async () => {
    if (!mCibil || !mIncome || !mLoan) {
      toast({ title: 'Fill CIBIL, income and loan amount', status: 'warning', duration: 3000, isClosable: true, position: 'top-right' }); return
    }
    setMChecking(true)
    try {
      const res = await axios.post(`${API}/eligibility/check`, {
        cibilScore: Number(mCibil), monthlyIncome: Number(mIncome), loanAmount: Number(mLoan),
      })
      const results: EligResult[] = res.data?.results || res.data?.data || res.data || []
      const map: Record<string, EligResult> = {}
      results.forEach(r => { map[r.lenderId] = r })
      setEligMap(map); setMChecked(true)
      const ec = results.filter(r => r.eligible).length
      toast({ title: `${ec} of ${results.length} lenders eligible`, status: ec > 0 ? 'success' : 'warning', duration: 3500, isClosable: true, position: 'top-right' })
    } catch (e: any) {
      toast({ title: 'Eligibility check failed', description: e?.response?.data?.message, status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally { setMChecking(false) }
  }

  // ── Deep Compare eligibility ───────────────────────────────────────────────

  const checkDeepElig = async () => {
    if (!dCibil || !dIncome || !dLoan) {
      toast({ title: 'Fill CIBIL, income and loan amount', status: 'warning', duration: 3000, isClosable: true, position: 'top-right' }); return
    }
    setDChecking(true)
    try {
      const res = await axios.post(`${API}/eligibility/check`, {
        cibilScore: Number(dCibil), monthlyIncome: Number(dIncome), loanAmount: Number(dLoan),
        ...(dProfession ? { profession: dProfession } : {}),
      })
      const results = res.data?.results || res.data?.data || res.data || []
      const map: Record<string, boolean> = {}
      results.forEach((r: any) => { map[r.lenderId] = r.eligible })
      setPEligMap(map); setPChecked(true)
      const ec = results.filter((r: any) => r.eligible).length
      toast({ title: `${ec} of ${results.length} lenders eligible`, status: ec > 0 ? 'success' : 'warning', duration: 3500, isClosable: true, position: 'top-right' })
    } catch (e: any) {
      toast({ title: 'Eligibility check failed', description: e?.response?.data?.message, status: 'error', duration: 4000, isClosable: true, position: 'top-right' })
    } finally { setDChecking(false) }
  }

  // ── Compare select ────────────────────────────────────────────────────────

  const toggleMCmp = (id: string) => {
    setMCmpIds(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id)
      if (prev.length >= MAX_MANAGE_CMP) {
        toast({ title: `Max ${MAX_MANAGE_CMP} lenders can be compared`, status: 'info', duration: 2500, isClosable: true, position: 'top-right' }); return prev
      }
      return [...prev, id]
    })
  }

  const toggleDCmp = (id: string) => {
    setDCmpIds(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id)
      if (prev.length >= MAX_DEEP_CMP) {
        toast({ title: `Max ${MAX_DEEP_CMP} lenders can be compared`, status: 'info', duration: 2500, isClosable: true, position: 'top-right' }); return prev
      }
      return [...prev, id]
    })
  }

  // ── Filtered / sorted data ────────────────────────────────────────────────

  const filteredLenders = lenders.filter(l => {
    const ms  = l.name.toLowerCase().includes(lSearch.toLowerCase())
    const mst = lStatus === 'all' ? true : lStatus === 'active' ? l.isActive : !l.isActive
    return ms && mst
  })

  const filteredPolicies = policies
    .filter(p => {
      const ms  = p.lenderName?.toLowerCase().includes(pSearch.toLowerCase())
      const mst = !activeOnly || p.isActive
      return ms && mst
    })
    .sort((a, b) => {
      const av = (a as any)[sortKey] ?? ''; const bv = (b as any)[sortKey] ?? ''
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const activeL    = lenders.filter(l => l.isActive).length
  const activeP    = policies.filter(p => p.isActive)
  const avgRoi     = activeP.length
    ? (activeP.reduce((s, p) => s + (p.roi || 0), 0) / activeP.length).toFixed(2) : '–'
  const minRoi     = activeP.length ? Math.min(...activeP.map(p => p.roi || 99)) : null
  const maxLoan    = activeP.length ? Math.max(...activeP.map(p => p.maxLoanAmount || 0)) : 0
  const mEligCount = Object.values(eligMap).filter(r => r.eligible).length
  const pEligCount = Object.values(pEligMap).filter(Boolean).length

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box bg="#F8FAFC" minH="100vh" pb="100px">
      <Box h="3px" bg="#1D4ED8" />

      <Container maxW="1400px" px={{ base: 4, md: 6 }} pt={8} pb={12}>

        {/* Page header */}
        <Flex justify="space-between" align="flex-start" mb={6}
          direction={{ base: 'column', sm: 'row' }} gap={4}>
          <Box>
            <Text fontSize="26px" fontWeight="800" color="#0F172A" letterSpacing="-0.03em">
              Lender Intelligence
            </Text>
            <Text fontSize="13px" color="#94A3B8" mt={0.5}>
              Manage lending partners · compare eligibility criteria side-by-side
            </Text>
          </Box>
          <HStack bg="#F1F5F9" p={1} borderRadius="10px" gap={0} flexShrink={0}>
            {(['manage', 'compare'] as ActiveTab[]).map(t => (
              <Button key={t} onClick={() => setTab(t)}
                h="34px" px={4} borderRadius="8px" fontSize="13px" fontWeight="700"
                bg={tab === t ? 'white' : 'transparent'}
                color={tab === t ? '#0F172A' : '#94A3B8'}
                boxShadow={tab === t ? 'sm' : 'none'}
                _hover={tab !== t ? { color: '#475569' } : {}}>
                {t === 'manage' ? 'Manage' : 'Deep Compare'}
              </Button>
            ))}
          </HStack>
        </Flex>

        {/* ══════════════════════════════
            MANAGE TAB
        ══════════════════════════════ */}
        {tab === 'manage' && (
          <>
            {/* Stats */}
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
              <StatCard label="Total lenders" value={lenders.length}
                sub={`${activeL} active · ${lenders.length - activeL} inactive`} />
              <StatCard label="Active" value={activeL}
                sub={lenders.length ? `${Math.round(activeL / lenders.length * 100)}% of partners` : '–'} />
              <StatCard label="In comparison" value={mCmpIds.length}
                sub={mCmpIds.length >= 2 ? 'Ready to compare' : `Select ${2 - mCmpIds.length} more`} />
              <StatCard label="Eligible (last check)" value={mChecked ? mEligCount : '–'}
                sub={mChecked ? `of ${Object.keys(eligMap).length} checked` : 'Run eligibility check'} />
            </SimpleGrid>

            {/* Eligibility panel */}
            <Box bg="white" border="1px solid #E5E7EB" borderRadius="12px" mb={5} overflow="hidden">
              <Flex px={5} py={3.5} align="center" justify="space-between"
                cursor="pointer" onClick={() => setShowEligM(s => !s)} userSelect="none">
                <Flex align="center" gap={3}>
                  <Box w="8px" h="8px" borderRadius="full"
                    bg={mChecked ? '#16A34A' : '#94A3B8'} flexShrink={0} />
                  <Text fontSize="13px" fontWeight="700" color="#0F172A">Customer eligibility check</Text>
                  {mChecked && (
                    <Box px={2} py={0.5} bg="#F0FDF4" border="1px solid #BBF7D0" borderRadius="5px">
                      <Text fontSize="10px" fontWeight="700" color="#15803D">{mEligCount} eligible</Text>
                    </Box>
                  )}
                </Flex>
                <Text fontSize="16px" color="#94A3B8" lineHeight={1}>{showEligM ? '−' : '+'}</Text>
              </Flex>
              <Collapse in={showEligM} animateOpacity>
                <Box px={5} pt={1} pb={5} borderTop="1px solid #F1F5F9">
                  <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={4}>
                    {[
                      { label: 'CIBIL score',        ph: '750',        val: mCibil,  set: setMCibil  },
                      { label: 'Monthly income (₹)', ph: '80,000',    val: mIncome, set: setMIncome },
                      { label: 'Loan amount (₹)',    ph: '20,00,000', val: mLoan,   set: setMLoan   },
                    ].map(f => (
                      <Box key={f.label}>
                        <Text fontSize="10px" fontWeight="700" color="#6B7280"
                          textTransform="uppercase" letterSpacing="0.08em" mb={1.5}>{f.label}</Text>
                        <Input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                          inputMode="decimal" h="36px" borderRadius="8px" bg="#F9FAFB"
                          borderColor="#E5E7EB" fontSize="13px" fontWeight="600" color="#111827"
                          _placeholder={{ color: '#D1D5DB', fontWeight: '400' }}
                          _focus={{ borderColor: '#2563EB', bg: 'white', boxShadow: '0 0 0 2px #DBEAFE' }} />
                      </Box>
                    ))}
                  </SimpleGrid>
                  <HStack gap={2}>
                    <Button onClick={checkManageElig} isLoading={mChecking} loadingText="Checking…"
                      h="36px" px={5} borderRadius="8px" bg="#1D4ED8" color="white"
                      fontSize="13px" fontWeight="700" _hover={{ bg: '#1E40AF' }}>
                      Check eligibility
                    </Button>
                    {mChecked && (
                      <Button onClick={() => { setEligMap({}); setMChecked(false) }}
                        variant="ghost" h="36px" px={4} borderRadius="8px"
                        fontSize="13px" fontWeight="600" color="#6B7280" _hover={{ bg: '#F9FAFB' }}>
                        Clear results
                      </Button>
                    )}
                  </HStack>
                </Box>
              </Collapse>
            </Box>

            {/* Toolbar */}
            <Flex justify="space-between" align="center" gap={3} mb={3} flexWrap="wrap">
              <HStack gap={2} flex={1}>
                <InputGroup maxW="240px">
                  <InputLeftElement h="36px" pointerEvents="none">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </InputLeftElement>
                  <Input value={lSearch} onChange={e => setLSearch(e.target.value)}
                    placeholder="Search lenders" h="36px" pl={9} borderRadius="8px"
                    bg="white" borderColor="#E5E7EB" fontSize="13px"
                    _focus={{ borderColor: '#2563EB', boxShadow: '0 0 0 2px #DBEAFE' }} />
                </InputGroup>
                <Select value={lStatus} onChange={e => setLStatus(e.target.value as StatusFilter)}
                  h="36px" borderRadius="8px" bg="white" borderColor="#E5E7EB"
                  fontSize="13px" maxW="120px" _focus={{ borderColor: '#2563EB' }}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </HStack>
              <HStack gap={2}>
                <Button onClick={openBulk} h="36px" px={4} borderRadius="8px" fontSize="13px"
                  fontWeight="700" bg="white" color="#374151" border="1px solid #E5E7EB"
                  _hover={{ bg: '#F9FAFB' }}
                  leftIcon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}>
                  Bulk import
                </Button>
                <Button onClick={openAdd} h="36px" px={4} borderRadius="8px" fontSize="13px"
                  fontWeight="700" bg="#1D4ED8" color="white" _hover={{ bg: '#1E40AF' }}
                  leftIcon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
                  Add lender
                </Button>
                <HStack bg="#F3F4F6" p={0.5} borderRadius="8px" gap={0}>
                  {(['grid', 'table'] as ViewMode[]).map(mode => (
                    <Box key={mode} as="button" onClick={() => setViewMode(mode)}
                      px={2} py={1.5} borderRadius="6px"
                      bg={viewMode === mode ? 'white' : 'transparent'}
                      color={viewMode === mode ? '#111827' : '#9CA3AF'}>
                      {mode === 'grid'
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                      }
                    </Box>
                  ))}
                </HStack>
              </HStack>
            </Flex>

            <Text fontSize="12px" color="#9CA3AF" mb={4} fontWeight="500">
              {filteredLenders.length} lender{filteredLenders.length !== 1 ? 's' : ''}
              {mCmpIds.length > 0 && ` · ${mCmpIds.length} selected for comparison`}
            </Text>

            {/* Lender list */}
            {lLoading ? (
              <Flex justify="center" py={16}><Spinner size="lg" color="blue.600" thickness="3px" /></Flex>
            ) : filteredLenders.length === 0 ? (
              <Box bg="white" border="1px solid #E5E7EB" borderRadius="12px" py={14} textAlign="center">
                <Text fontSize="13px" fontWeight="600" color="#6B7280">
                  {lSearch ? `No lenders match "${lSearch}"` : 'No lenders added yet'}
                </Text>
                {!lSearch && (
                  <Button onClick={openAdd} mt={4} bg="#1D4ED8" color="white" borderRadius="8px"
                    fontWeight="700" fontSize="13px" h="36px" px={5} _hover={{ bg: '#1E40AF' }}>
                    Add first lender
                  </Button>
                )}
              </Box>
            ) : viewMode === 'grid' ? (
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={4}>
                {filteredLenders.map(l => {
                  const p = palette(l.name); const sel = mCmpIds.includes(l._id)
                  const canSel = sel || mCmpIds.length < MAX_MANAGE_CMP; const elig = eligMap[l._id]
                  return (
                    <Box key={l._id} bg="white" border="1.5px solid"
                      borderColor={sel ? '#2563EB' : '#E5E7EB'} borderRadius="12px"
                      boxShadow={sel ? '0 0 0 3px #DBEAFE' : 'none'}
                      transition="border-color 0.15s, box-shadow 0.15s"
                      opacity={l.isActive ? 1 : 0.65} overflow="hidden">
                      {elig?.eligible === true  && <Box h="2px" bg="#22C55E" />}
                      {elig?.eligible === false && <Box h="2px" bg="#EF4444" />}
                      {!elig && <Box h="2px" />}
                      <Box p={4}>
                        <Flex justify="space-between" align="flex-start" mb={4}>
                          <Flex align="center" gap={3}>
                            <Flex w="40px" h="40px" borderRadius="10px" bg={p.bg} color={p.text}
                              align="center" justify="center" fontWeight="800" fontSize="13px" flexShrink={0}>
                              {initials(l.name)}
                            </Flex>
                            <Box>
                              <Text fontWeight="800" fontSize="13px" color="#111827" noOfLines={1}>{l.name}</Text>
                              <Flex gap={1.5} mt={0.5} align="center">
                                <Box w="5px" h="5px" borderRadius="full" bg={l.isActive ? '#22C55E' : '#D1D5DB'} />
                                <Text fontSize="11px" fontWeight="600" color={l.isActive ? '#16A34A' : '#9CA3AF'}>
                                  {l.isActive ? 'Active' : 'Inactive'}
                                </Text>
                                {elig && (
                                  <>
                                    <Box w="3px" h="3px" borderRadius="full" bg="#D1D5DB" />
                                    <Text fontSize="11px" fontWeight="700" color={elig.eligible ? '#16A34A' : '#DC2626'}>
                                      {elig.eligible ? 'Eligible' : 'Not eligible'}
                                    </Text>
                                  </>
                                )}
                              </Flex>
                            </Box>
                          </Flex>
                          <Box w="20px" h="20px" borderRadius="5px" border="1.5px solid"
                            borderColor={sel ? '#2563EB' : '#D1D5DB'} bg={sel ? '#2563EB' : 'white'}
                            display="flex" alignItems="center" justifyContent="center"
                            cursor={canSel ? 'pointer' : 'not-allowed'} flexShrink={0}
                            onClick={() => canSel && toggleMCmp(l._id)} transition="all 0.15s">
                            {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          </Box>
                        </Flex>
                        <Box borderTop="1px solid #F3F4F6" pt={3} mb={4}>
                          {[
                            { label: 'Min CIBIL',  value: l.minCibil ? `${l.minCibil}` : '–' },
                            { label: 'Max FOIR',   value: l.maxFoir  ? `${l.maxFoir}%` : '–' },
                            { label: 'Min income', value: fmtINR(l.minIncome)                 },
                          ].map(({ label, value }) => (
                            <Flex key={label} justify="space-between" align="center"
                              py={1.5} borderBottom="1px solid #F9FAFB" _last={{ borderBottom: 'none' }}>
                              <Text fontSize="12px" color="#9CA3AF" fontWeight="500">{label}</Text>
                              <Text fontSize="13px" color="#111827" fontWeight="700">{value}</Text>
                            </Flex>
                          ))}
                        </Box>
                        <Flex gap={2}>
                          <Button flex={1} size="sm" h="30px" borderRadius="6px" fontWeight="700"
                            fontSize="11px" variant="outline"
                            colorScheme={l.isActive ? 'red' : 'green'}
                            onClick={() => toggleStatus(l)} isLoading={togId === l._id}>
                            {l.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button size="sm" h="30px" borderRadius="6px" fontWeight="700"
                            fontSize="11px" variant="outline" colorScheme="red"
                            onClick={() => deleteLender(l._id)} isLoading={delId === l._id} px={3}>
                            Delete
                          </Button>
                        </Flex>
                      </Box>
                    </Box>
                  )
                })}
              </SimpleGrid>
            ) : (
              <Box bg="white" border="1px solid #E5E7EB" borderRadius="12px" overflow="hidden">
                <Box overflowX="auto">
                  <Table variant="unstyled" size="sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <Thead>
                      <Tr bg="#F9FAFB">
                        <Th w="44px" py={3} px={4} borderBottom="1px solid #F3F4F6" />
                        {['Lender', 'Min CIBIL', 'Max FOIR', 'Min income', 'Status', 'Eligibility', ''].map((h, i) => (
                          <Th key={i} py={3} px={4} fontSize="10px" fontWeight="700" color="#6B7280"
                            textTransform="uppercase" letterSpacing="0.08em" whiteSpace="nowrap"
                            textAlign={i === 6 ? 'right' : 'left'} borderBottom="1px solid #F3F4F6">{h}</Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredLenders.map(l => {
                        const p = palette(l.name); const sel = mCmpIds.includes(l._id)
                        const elig = eligMap[l._id]; const can = sel || mCmpIds.length < MAX_MANAGE_CMP
                        return (
                          <Tr key={l._id} borderBottom="1px solid #F9FAFB"
                            bg={sel ? '#EFF6FF' : 'white'} _hover={{ bg: sel ? '#EFF6FF' : '#FAFAFA' }}
                            opacity={l.isActive ? 1 : 0.7} transition="background 0.1s">
                            <Td py={3} px={4}>
                              <Box w="18px" h="18px" borderRadius="4px" border="1.5px solid"
                                borderColor={sel ? '#2563EB' : '#D1D5DB'} bg={sel ? '#2563EB' : 'white'}
                                display="flex" alignItems="center" justifyContent="center"
                                cursor={can ? 'pointer' : 'not-allowed'}
                                onClick={() => can && toggleMCmp(l._id)} transition="all 0.15s">
                                {sel && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                              </Box>
                            </Td>
                            <Td py={3} px={4}>
                              <Flex align="center" gap={3}>
                                <Flex w="30px" h="30px" borderRadius="8px" bg={p.bg} color={p.text}
                                  align="center" justify="center" fontWeight="800" fontSize="10px" flexShrink={0}>
                                  {initials(l.name)}
                                </Flex>
                                <Text fontSize="13px" fontWeight="700" color="#111827">{l.name}</Text>
                              </Flex>
                            </Td>
                            <Td py={3} px={4}><Text fontSize="13px" fontWeight="600" color="#111827">{l.minCibil || '–'}</Text></Td>
                            <Td py={3} px={4}><Text fontSize="13px" fontWeight="600" color="#111827">{l.maxFoir ? `${l.maxFoir}%` : '–'}</Text></Td>
                            <Td py={3} px={4}><Text fontSize="13px" fontWeight="600" color="#111827">{fmtINR(l.minIncome)}</Text></Td>
                            <Td py={3} px={4}>
                              <Flex align="center" gap={1.5}>
                                <Box w="6px" h="6px" borderRadius="full" bg={l.isActive ? '#22C55E' : '#D1D5DB'} />
                                <Text fontSize="12px" fontWeight="600" color={l.isActive ? '#16A34A' : '#9CA3AF'}>
                                  {l.isActive ? 'Active' : 'Inactive'}
                                </Text>
                              </Flex>
                            </Td>
                            <Td py={3} px={4}>
                              {elig
                                ? <Text fontSize="12px" fontWeight="700" color={elig.eligible ? '#16A34A' : '#DC2626'}>{elig.eligible ? '✓ Eligible' : '✗ Not eligible'}</Text>
                                : <Text fontSize="12px" color="#D1D5DB">–</Text>}
                            </Td>
                            <Td py={3} px={4} textAlign="right">
                              <HStack gap={1.5} justify="flex-end">
                                <Button size="xs" h="26px" borderRadius="5px" fontWeight="700" variant="outline"
                                  colorScheme={l.isActive ? 'red' : 'green'} onClick={() => toggleStatus(l)}
                                  isLoading={togId === l._id} fontSize="11px">
                                  {l.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button size="xs" h="26px" borderRadius="5px" fontWeight="700" variant="outline"
                                  colorScheme="red" onClick={() => deleteLender(l._id)}
                                  isLoading={delId === l._id} fontSize="11px">Delete</Button>
                              </HStack>
                            </Td>
                          </Tr>
                        )
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </>
        )}

        {/* ══════════════════════════════
            DEEP COMPARE TAB
        ══════════════════════════════ */}
        {tab === 'compare' && (
          <>
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
              <StatCard label="Active lenders" value={activeP.length} sub={`${policies.length} total policies`} />
              <StatCard label="Avg interest rate" value={avgRoi !== '–' ? `${avgRoi}%` : '–'} sub="across active lenders" />
              <StatCard label="Best rate" value={minRoi !== null ? `${minRoi}%` : '–'} sub="lowest ROI available" accent="#16A34A" />
              <StatCard
                label={pChecked ? 'Eligible lenders' : 'Max loan available'}
                value={pChecked ? pEligCount : fmtINR(maxLoan)}
                sub={pChecked ? `of ${Object.keys(pEligMap).length} checked` : 'highest across all lenders'}
                accent={pChecked ? '#7C3AED' : undefined} />
            </SimpleGrid>

            {/* Eligibility panel */}
            <Box bg="white" border="1px solid #E5E7EB" borderRadius="12px" mb={5} overflow="hidden">
              <Flex px={5} py={3.5} align="center" justify="space-between"
                cursor="pointer" onClick={() => setShowEligC(s => !s)} userSelect="none">
                <Flex align="center" gap={3}>
                  <Box w="8px" h="8px" borderRadius="full" bg={pChecked ? '#16A34A' : '#94A3B8'} flexShrink={0} />
                  <Text fontSize="13px" fontWeight="700" color="#0F172A">Check customer eligibility</Text>
                  <Text fontSize="12px" color="#94A3B8">— highlights matching rows</Text>
                  {pChecked && (
                    <Box px={2} py={0.5} bg="#F0FDF4" border="1px solid #BBF7D0" borderRadius="5px">
                      <Text fontSize="10px" fontWeight="700" color="#15803D">{pEligCount} eligible</Text>
                    </Box>
                  )}
                </Flex>
                <Text fontSize="16px" color="#94A3B8" lineHeight={1}>{showEligC ? '−' : '+'}</Text>
              </Flex>
              {showEligC && (
                <Box px={5} pt={1} pb={5} borderTop="1px solid #F1F5F9">
                  <SimpleGrid columns={{ base: 2, sm: 4 }} gap={4} mb={4}>
                    {[
                      { label: 'CIBIL score',        ph: '750',        val: dCibil,  set: setDCibil  },
                      { label: 'Monthly income (₹)', ph: '80,000',    val: dIncome, set: setDIncome },
                      { label: 'Loan amount (₹)',    ph: '20,00,000', val: dLoan,   set: setDLoan   },
                    ].map(f => (
                      <Box key={f.label}>
                        <Text fontSize="10px" fontWeight="700" color="#6B7280"
                          textTransform="uppercase" letterSpacing="0.08em" mb={1.5}>{f.label}</Text>
                        <Input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                          inputMode="decimal" h="36px" borderRadius="8px" bg="#F9FAFB"
                          borderColor="#E5E7EB" fontSize="13px" fontWeight="600" color="#111827"
                          _placeholder={{ color: '#D1D5DB', fontWeight: '400' }}
                          _focus={{ borderColor: '#2563EB', bg: 'white', boxShadow: '0 0 0 2px #DBEAFE' }} />
                      </Box>
                    ))}
                    <Box>
                      <Text fontSize="10px" fontWeight="700" color="#6B7280"
                        textTransform="uppercase" letterSpacing="0.08em" mb={1.5}>Profession</Text>
                      <Select value={dProfession} onChange={e => setDProfession(e.target.value)}
                        h="36px" borderRadius="8px" bg="#F9FAFB" borderColor="#E5E7EB"
                        fontSize="13px" color="#111827"
                        _focus={{ borderColor: '#2563EB', bg: 'white', boxShadow: '0 0 0 2px #DBEAFE' }}>
                        <option value="">All professions</option>
                        {PROFESSIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </Select>
                    </Box>
                  </SimpleGrid>
                  <HStack gap={2}>
                    <Button onClick={checkDeepElig} isLoading={dChecking} loadingText="Checking…"
                      h="36px" px={5} borderRadius="8px" bg="#1D4ED8" color="white"
                      fontSize="13px" fontWeight="700" _hover={{ bg: '#1E40AF' }}>
                      Check eligibility
                    </Button>
                    {pChecked && (
                      <Button onClick={() => { setPEligMap({}); setPChecked(false) }}
                        variant="ghost" h="36px" px={4} borderRadius="8px"
                        fontSize="13px" fontWeight="600" color="#6B7280" _hover={{ bg: '#F9FAFB' }}>
                        Clear results
                      </Button>
                    )}
                  </HStack>
                </Box>
              )}
            </Box>

            {/* Toolbar */}
            <Flex justify="space-between" align="center" gap={3} mb={4} flexWrap="wrap">
              <InputGroup maxW="260px">
                <InputLeftElement h="36px" pointerEvents="none">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </InputLeftElement>
                <Input value={pSearch} onChange={e => setPSearch(e.target.value)}
                  placeholder="Search by lender name" h="36px" pl={9} borderRadius="8px"
                  bg="white" borderColor="#E5E7EB" fontSize="13px"
                  _focus={{ borderColor: '#2563EB', boxShadow: '0 0 0 2px #DBEAFE' }} />
              </InputGroup>
              <HStack gap={2}>
                {dCmpIds.length > 0 && (
                  <Box px={2.5} py={1} bg="#F5F3FF" border="1px solid #DDD6FE" borderRadius="7px">
                    <Text fontSize="11px" fontWeight="700" color="#7C3AED">{dCmpIds.length} selected</Text>
                  </Box>
                )}
                <Box as="button" onClick={() => setActiveOnly(o => !o)} px={3} py={1.5} borderRadius="8px"
                  bg={activeOnly ? '#EFF6FF' : 'white'} border="1px solid"
                  borderColor={activeOnly ? '#BFDBFE' : '#E5E7EB'}
                  fontSize="12px" fontWeight="700" color={activeOnly ? '#1D4ED8' : '#6B7280'}
                  transition="all 0.15s">
                  {activeOnly ? '● Active only' : '○ Show all'}
                </Box>
                <Text fontSize="11px" color="#9CA3AF" fontWeight="600">Sort</Text>
                <Select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                  h="36px" borderRadius="8px" bg="white" borderColor="#E5E7EB"
                  fontSize="13px" maxW="150px" _focus={{ borderColor: '#2563EB' }}>
                  <option value="lenderName">Name</option>
                  <option value="minCibil">Min CIBIL</option>
                  <option value="roi">Interest rate</option>
                  <option value="maxLoanAmount">Max loan</option>
                  <option value="minIncome">Min income</option>
                  <option value="maxFOIR">Max FOIR</option>
                </Select>
                <Button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  h="36px" w="36px" p={0} borderRadius="8px" bg="white"
                  border="1px solid #E5E7EB" fontSize="14px" color="#374151" _hover={{ bg: '#F9FAFB' }}>
                  {sortDir === 'asc' ? '↑' : '↓'}
                </Button>
                <Text fontSize="12px" color="#9CA3AF" fontWeight="500">
                  {filteredPolicies.length} result{filteredPolicies.length !== 1 ? 's' : ''}
                </Text>
              </HStack>
            </Flex>

            {/* Hint */}
            {dCmpIds.length === 0 && !pLoading && filteredPolicies.length > 0 && (
              <Flex align="center" gap={2} mb={3} px={1}>
                <Box w="6px" h="6px" borderRadius="full" bg="#7C3AED" flexShrink={0} />
                <Text fontSize="12px" color="#6B7280">
                  Select 2–3 lenders using the checkbox on each row, then click "Compare" to see side-by-side
                </Text>
              </Flex>
            )}

            {/* Policy table */}
            {pLoading ? (
              <Flex justify="center" py={16}>
                <VStack gap={3}>
                  <Spinner size="lg" color="purple.600" thickness="3px" />
                  <Text fontSize="13px" color="#9CA3AF">Loading lender policies…</Text>
                </VStack>
              </Flex>
            ) : filteredPolicies.length === 0 ? (
              <Box bg="white" border="1px solid #E5E7EB" borderRadius="12px" py={14} textAlign="center">
                <Text fontSize="13px" fontWeight="600" color="#6B7280">
                  {pSearch ? `No lenders match "${pSearch}"` : 'No policies found'}
                </Text>
                {!pSearch && (
                  <Button as="a" href="/dashboard/credit/policy/upload" mt={4}
                    bg="#1D4ED8" color="white" borderRadius="8px" fontWeight="700"
                    fontSize="13px" h="36px" px={5} _hover={{ bg: '#1E40AF' }}>
                    Upload first policy
                  </Button>
                )}
              </Box>
            ) : (
              <Box bg="white" border="1px solid #E5E7EB" borderRadius="12px" overflow="hidden">
                <Box overflowX="auto">
                  <Table variant="unstyled" size="sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <Thead>
                      <Tr bg="#F9FAFB">
                        <Th w="44px" py={3} px={4} borderBottom="1px solid #F3F4F6">
                          <Text fontSize="9px" fontWeight="700" color="#94A3B8"
                            textTransform="uppercase" letterSpacing="0.08em">CMP</Text>
                        </Th>
                        <SortTh label="Lender"        sortKey="lenderName"    current={sortKey} dir={sortDir} onSort={handleSort} />
                        <SortTh label="CIBIL range"   sortKey="minCibil"      current={sortKey} dir={sortDir} onSort={handleSort} />
                        <SortTh label="Interest rate" sortKey="roi"           current={sortKey} dir={sortDir} onSort={handleSort} />
                        <SortTh label="Loan range"    sortKey="maxLoanAmount" current={sortKey} dir={sortDir} onSort={handleSort} />
                        <SortTh label="Min income"    sortKey="minIncome"     current={sortKey} dir={sortDir} onSort={handleSort} />
                        <SortTh label="Max FOIR"      sortKey="maxFOIR"       current={sortKey} dir={sortDir} onSort={handleSort} />
                        <Th py={3} px={4} fontSize="10px" fontWeight="700" color="#6B7280"
                          textTransform="uppercase" letterSpacing="0.08em" whiteSpace="nowrap"
                          borderBottom="1px solid #F3F4F6">Professions</Th>
                        <Th py={3} px={4} fontSize="10px" fontWeight="700" color="#6B7280"
                          textTransform="uppercase" letterSpacing="0.08em" whiteSpace="nowrap"
                          borderBottom="1px solid #F3F4F6">Status</Th>
                        {pChecked && (
                          <Th py={3} px={4} fontSize="10px" fontWeight="700" color="#7C3AED"
                            textTransform="uppercase" letterSpacing="0.08em" whiteSpace="nowrap"
                            borderBottom="1px solid #F3F4F6">Eligibility</Th>
                        )}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredPolicies.map(p => {
                        const pal       = palette(p.lenderName || 'A')
                        const sel       = dCmpIds.includes(p._id)
                        const canSel    = sel || dCmpIds.length < MAX_DEEP_CMP
                        const isElig    = pEligMap[p.lenderId]
                        const eligKnown = pChecked && p.lenderId in pEligMap
                        const rowBg     = sel
                          ? '#F5F3FF'
                          : eligKnown ? (isElig ? '#F0FDF4' : '#FEF9F9') : 'white'
                        return (
                          <Tr key={p._id} bg={rowBg} borderBottom="1px solid #F9FAFB"
                            _hover={{ bg: sel ? '#F5F3FF' : eligKnown ? rowBg : '#FAFAFA' }}
                            opacity={p.isActive ? 1 : 0.65} transition="background 0.1s"
                            outline={sel ? '1.5px solid #7C3AED' : 'none'} outlineOffset="-1px">

                            {/* Checkbox */}
                            <Td py={3.5} px={4}>
                              <Box w="18px" h="18px" borderRadius="4px" border="1.5px solid"
                                borderColor={sel ? '#7C3AED' : '#D1D5DB'} bg={sel ? '#7C3AED' : 'white'}
                                display="flex" alignItems="center" justifyContent="center"
                                cursor={canSel ? 'pointer' : 'not-allowed'}
                                onClick={() => canSel && toggleDCmp(p._id)} transition="all 0.15s"
                                _hover={canSel ? { borderColor: '#7C3AED' } : {}}>
                                {sel && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                              </Box>
                            </Td>

                            {/* Lender name */}
                            <Td py={3.5} px={4}>
                              <Flex align="center" gap={3}>
                                <Flex w="34px" h="34px" borderRadius="9px" bg={pal.bg} color={pal.text}
                                  align="center" justify="center" fontWeight="800" fontSize="11px" flexShrink={0}>
                                  {initials(p.lenderName || 'NA')}
                                </Flex>
                                <Box>
                                  <Text fontSize="13px" fontWeight="700" color="#111827" noOfLines={1}>{p.lenderName}</Text>
                                  <Text fontSize="10px" color="#9CA3AF">Added {fmtDate(p.createdAt)}</Text>
                                </Box>
                              </Flex>
                            </Td>

                            <Td py={3.5} px={4}>
                              <Text fontSize="13px" fontWeight="600" color="#111827">
                                {p.minCibil || '–'} – {p.maxCibil || '–'}
                              </Text>
                            </Td>

                            <Td py={3.5} px={4}>
                              {p.roi ? (
                                <Flex align="center" gap={1.5}>
                                  <Text fontSize="13px" fontWeight="700" color={p.roi <= 9 ? '#16A34A' : '#111827'}>
                                    {p.roi}% p.a.
                                  </Text>
                                  {p.roi <= 9 && (
                                    <Box px={1.5} py={0.5} bg="#F0FDF4" border="1px solid #BBF7D0" borderRadius="4px">
                                      <Text fontSize="9px" fontWeight="700" color="#15803D">Low</Text>
                                    </Box>
                                  )}
                                </Flex>
                              ) : <Text fontSize="13px" color="#D1D5DB">–</Text>}
                            </Td>

                            <Td py={3.5} px={4}>
                              <Text fontSize="13px" fontWeight="600" color="#111827">
                                {fmtINR(p.minLoanAmount)} – {fmtINR(p.maxLoanAmount)}
                              </Text>
                            </Td>

                            <Td py={3.5} px={4}>
                              <Text fontSize="13px" fontWeight="600" color="#111827">{fmtINR(p.minIncome)}</Text>
                            </Td>

                            <Td py={3.5} px={4}>
                              <Text fontSize="13px" fontWeight="600" color="#111827">
                                {p.maxFOIR ? `${p.maxFOIR}%` : '–'}
                              </Text>
                            </Td>

                            <Td py={3.5} px={4}>
                              {p.allowedProfessions?.length ? (
                                <Flex gap={1} flexWrap="wrap">
                                  {p.allowedProfessions.slice(0, 2).map(pr => (
                                    <Box key={pr} px={1.5} py={0.5} bg="#F3F4F6" borderRadius="4px">
                                      <Text fontSize="10px" fontWeight="600" color="#374151">{pr}</Text>
                                    </Box>
                                  ))}
                                  {p.allowedProfessions.length > 2 && (
                                    <Tooltip label={p.allowedProfessions.slice(2).join(', ')} placement="top">
                                      <Box px={1.5} py={0.5} bg="#F3F4F6" borderRadius="4px" cursor="pointer">
                                        <Text fontSize="10px" fontWeight="600" color="#6B7280">
                                          +{p.allowedProfessions.length - 2}
                                        </Text>
                                      </Box>
                                    </Tooltip>
                                  )}
                                </Flex>
                              ) : <Text fontSize="12px" color="#9CA3AF">All</Text>}
                            </Td>

                            <Td py={3.5} px={4}>
                              <Flex align="center" gap={1.5}>
                                <Box w="6px" h="6px" borderRadius="full" bg={p.isActive ? '#22C55E' : '#D1D5DB'} />
                                <Text fontSize="12px" fontWeight="600" color={p.isActive ? '#16A34A' : '#9CA3AF'}>
                                  {p.isActive ? 'Active' : 'Inactive'}
                                </Text>
                              </Flex>
                            </Td>

                            {pChecked && (
                              <Td py={3.5} px={4}>
                                {eligKnown
                                  ? <Text fontSize="12px" fontWeight="700" color={isElig ? '#16A34A' : '#DC2626'}>
                                      {isElig ? '✓ Eligible' : '✗ Not eligible'}
                                    </Text>
                                  : <Text fontSize="12px" color="#D1D5DB">–</Text>}
                              </Td>
                            )}
                          </Tr>
                        )
                      })}
                    </Tbody>
                  </Table>
                </Box>

                {/* Table footer */}
                <Box px={5} py={3} borderTop="1px solid #F3F4F6" bg="#FAFBFC">
                  <Flex justify="space-between" align="center">
                    <Text fontSize="11px" color="#9CA3AF" fontWeight="500">
                      Showing {filteredPolicies.length} of {policies.length} policies
                      {pChecked && ` · ${pEligCount} eligible for entered profile`}
                      {dCmpIds.length > 0 && ` · ${dCmpIds.length} selected`}
                    </Text>
                    {dCmpIds.length >= 2 && (
                      <Button onClick={openDCmp} h="30px" px={4} borderRadius="7px"
                        bg="#7C3AED" color="white" fontSize="12px" fontWeight="700"
                        _hover={{ bg: '#6D28D9' }}>
                        Compare selected ({dCmpIds.length}) →
                      </Button>
                    )}
                  </Flex>
                </Box>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* ── Floating Trays ── */}
      {tab === 'manage' && (
        <ManageCompareTray
          ids={mCmpIds} lenders={lenders}
          onRemove={id => setMCmpIds(p => p.filter(c => c !== id))}
          onCompare={openMCmp} onClear={() => setMCmpIds([])}
        />
      )}
      {tab === 'compare' && (
        <DeepCompareTray
          ids={dCmpIds} policies={policies}
          onRemove={id => setDCmpIds(p => p.filter(c => c !== id))}
          onCompare={openDCmp} onClear={() => setDCmpIds([])}
        />
      )}

      {/* ── Modals ── */}
      <ManageCompareModal
        lenders={lenders.filter(l => mCmpIds.includes(l._id))}
        isOpen={isMCmpOpen} onClose={closeMCmp} eligMap={eligMap}
      />
      <DeepCompareModal
        policies={policies.filter(p => dCmpIds.includes(p._id))}
        isOpen={isDCmpOpen} onClose={closeDCmp} eligMap={pEligMap}
      />

      {/* Add Lender Modal */}
      <Modal isOpen={isAddOpen} onClose={closeAdd} isCentered size="md">
        <ModalOverlay bg="rgba(2,6,23,0.7)" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="14px" overflow="hidden" mx={4}>
          <Box h="3px" bg="#1D4ED8" />
          <ModalHeader fontWeight="800" fontSize="16px" color="#111827"
            borderBottom="1px solid #F3F4F6" py={4} px={5}>Add lender</ModalHeader>
          <ModalCloseButton top="14px" right={4} color="#9CA3AF" borderRadius="7px" />
          <ModalBody py={5} px={5}>
            <VStack gap={4}>
              {[
                { key: 'name',      label: 'Lender name',            ph: 'State Bank of India' },
                { key: 'minCibil',  label: 'Min CIBIL score',        ph: '700'                 },
                { key: 'maxFoir',   label: 'Max FOIR (%)',            ph: '50'                  },
                { key: 'minIncome', label: 'Min monthly income (₹)', ph: '35000'               },
              ].map(f => (
                <FormControl key={f.key}>
                  <FormLabel fontSize="11px" fontWeight="700" color="#6B7280"
                    textTransform="uppercase" letterSpacing="0.08em" mb={1.5}>{f.label}</FormLabel>
                  <Input name={f.key} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                    placeholder={f.ph} h="40px" borderRadius="8px" bg="#F9FAFB" borderColor="#E5E7EB"
                    fontSize="14px" fontWeight="600" color="#111827"
                    _placeholder={{ color: '#D1D5DB', fontWeight: '400' }}
                    _focus={{ borderColor: '#2563EB', bg: 'white', boxShadow: '0 0 0 2px #DBEAFE' }} />
                </FormControl>
              ))}
              <Flex w="full" justify="space-between" align="center" bg="#F9FAFB" borderRadius="8px" px={4} py={3}>
                <Box>
                  <Text fontSize="13px" fontWeight="700" color="#111827">Set as active</Text>
                  <Text fontSize="11px" color="#9CA3AF">Live for loan matching immediately</Text>
                </Box>
                <Switch isChecked={form.isActive}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  colorScheme="blue" size="md" />
              </Flex>
            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px solid #F3F4F6" px={5} py={4} gap={2}>
            <Button onClick={closeAdd} variant="ghost" h="38px" px={4} borderRadius="8px"
              fontSize="13px" fontWeight="600" color="#6B7280">Cancel</Button>
            <Button onClick={addLender} isLoading={submitting} loadingText="Saving…"
              bg="#1D4ED8" color="white" h="38px" px={5} borderRadius="8px"
              fontWeight="700" fontSize="13px" _hover={{ bg: '#1E40AF' }}>Save lender</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal isOpen={isBulkOpen} onClose={closeBulk} isCentered size="md">
        <ModalOverlay bg="rgba(2,6,23,0.7)" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="14px" overflow="hidden" mx={4}>
          <Box h="3px" bg="#059669" />
          <ModalHeader fontWeight="800" fontSize="16px" color="#111827"
            borderBottom="1px solid #F3F4F6" py={4} px={5}>Bulk import lenders</ModalHeader>
          <ModalCloseButton top="14px" right={4} color="#9CA3AF" borderRadius="7px" />
          <ModalBody py={5} px={5}>
            <VStack gap={4} align="stretch">
              <Text fontSize="13px" color="#6B7280" lineHeight={1.6}>
                Upload a CSV with columns:{' '}
                <Box as="code" bg="#F3F4F6" px={1.5} py={0.5} borderRadius="4px" fontSize="12px" color="#374151">
                  name, minCibil, maxFoir, minIncome
                </Box>
              </Text>
              <Button onClick={downloadTemplate} variant="ghost" h="34px" borderRadius="8px"
                fontSize="12px" fontWeight="700" color="#2563EB" w="max-content"
                leftIcon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
                _hover={{ bg: '#EFF6FF' }}>Download sample template</Button>
              <Box border="1.5px dashed" borderColor={csvFile ? '#059669' : '#D1D5DB'}
                borderRadius="10px" py={8} px={5} textAlign="center" cursor="pointer"
                bg={csvFile ? '#F0FDF4' : '#F9FAFB'}
                onClick={() => fileRef.current?.click()} transition="all 0.15s"
                _hover={{ borderColor: '#2563EB', bg: '#EFF6FF' }}>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f && !f.name.endsWith('.csv')) {
                      toast({ title: 'Only .csv files allowed', status: 'error', duration: 3000, isClosable: true }); return
                    }
                    if (f) setCsvFile(f)
                  }} />
                <Text fontSize="13px" fontWeight="700" color={csvFile ? '#059669' : '#374151'}>
                  {csvFile ? csvFile.name : 'Click to select or drop a CSV file'}
                </Text>
                {csvFile && <Text fontSize="11px" color="#6B7280" mt={1}>{(csvFile.size / 1024).toFixed(1)} KB</Text>}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px solid #F3F4F6" px={5} py={4} gap={2}>
            <Button onClick={closeBulk} variant="ghost" h="38px" px={4} borderRadius="8px"
              fontSize="13px" fontWeight="600" color="#6B7280">Cancel</Button>
            <Button onClick={bulkUpload} isLoading={uploading} loadingText="Importing…"
              isDisabled={!csvFile} bg="#059669" color="white" h="38px" px={5}
              borderRadius="8px" fontWeight="700" fontSize="13px" _hover={{ bg: '#047857' }}>
              Import lenders
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}