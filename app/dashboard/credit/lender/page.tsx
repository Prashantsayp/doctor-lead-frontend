'use client';

import {
  Box,
  Text,
  Input,
  Button,
  Grid,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Stack,
  Container,
  FormControl,
  FormLabel,
  InputGroup,
  InputLeftElement,
  Skeleton,
  SkeletonText,
  useToast,
  Flex,
  Icon,
  Divider,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useCallback , useState } from 'react';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LenderForm {
  name: string;
  minCibil: string;
  maxFoir: string;
  minIncome: string;
  isActive: boolean;
}

interface Lender {
  _id: string;
  name: string;
  minCibil: number;
  maxFoir: number;
  minIncome: number;
  isActive: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3001/lender';

const INITIAL_FORM: LenderForm = {
  name: '',
  minCibil: '',
  maxFoir: '',
  minIncome: '',
  isActive: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
  bg="white"
  _dark={{
    bg: 'gray.800',
    borderColor: 'gray.700',
  }}
  rounded="xl"
  shadow="sm"
  border="1px solid"
  borderColor="gray.100"
  overflow="hidden"
  mb={6}
>
      {children}
    </Box>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box px={6} py={4} borderBottom="1px solid" borderColor="gray.100" _dark={{ borderColor: 'gray.700' }}>
      <Text fontWeight="600" fontSize="md" color="gray.800" _dark={{ color: 'gray.100' }}>
        {title}
      </Text>
      {subtitle && (
        <Text fontSize="sm" color="gray.500" mt={0.5}>
          {subtitle}
        </Text>
      )}
    </Box>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      colorScheme={isActive ? 'green' : 'red'}
      variant="subtle"
      px={3}
      py={1}
      rounded="full"
      fontSize="xs"
      fontWeight="600"
      textTransform="uppercase"
      letterSpacing="0.05em"
    >
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Tr key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <Td key={j}>
              <Skeleton height="16px" rounded="md" />
            </Td>
          ))}
        </Tr>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LenderPage() {
  const [form, setForm] = useState<LenderForm>(INITIAL_FORM);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toast = useToast();

  // ── Data fetching ──

  const fetchLenders = useCallback(async () => {
    try {
      const res = await axios.get<Lender[]>(`${API_BASE}/get-all`);
      setLenders(res.data);
    } catch {
      toast({
        title: 'Failed to load lenders',
        description: 'Please check your connection and try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
  fetchLenders();
}, [fetchLenders]);

  // ── Handlers ──

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Lender name is required',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        minCibil: Number(form.minCibil),
        maxFoir: Number(form.maxFoir),
        minIncome: Number(form.minIncome),
        isActive: form.isActive,
      };

await axios.post(`${API_BASE}/create`, payload);
      toast({
        title: 'Lender created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });

      setForm(INITIAL_FORM);
      await fetchLenders();
    } catch {
      toast({
        title: 'Failed to create lender',
        description: 'Something went wrong. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (lender: Lender) => {
    setTogglingId(lender._id);
    try {
      await axios.patch(`${API_BASE}/${lender._id}`, {
        isActive: !lender.isActive,
      });
      await fetchLenders();
    } catch {
      toast({
        title: 'Failed to update status',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // ── Derived stats ──

  const activeCount = lenders.filter((l) => l.isActive).length;
  const inactiveCount = lenders.length - activeCount;

  // ── Render ──

  return (
    <Box bg="gray.50" _dark={{ bg: 'gray.900' }} minH="100vh">
      <Box pt="calc(64px + 24px)" pb={10}>
        <Container maxW="1100px" px={{ base: 4, md: 6 }}>

          {/* Page header */}
          <Flex
            align={{ base: 'flex-start', sm: 'center' }}
            justify="space-between"
            direction={{ base: 'column', sm: 'row' }}
            gap={3}
            mb={6}
          >
            <Box>
              <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" color="gray.800" _dark={{ color: 'white' }}>
                🏦 Lender Management
              </Text>
              <Text fontSize="sm" color="gray.500" mt={0.5}>
                Manage lending partners and their eligibility criteria
              </Text>
            </Box>

            {/* Summary pills */}
            {!loading && lenders.length > 0 && (
              <HStack spacing={2}>
                <Badge colorScheme="green" variant="subtle" px={3} py={1} rounded="full" fontSize="xs" fontWeight="600">
                  {activeCount} Active
                </Badge>
                {inactiveCount > 0 && (
                  <Badge colorScheme="red" variant="subtle" px={3} py={1} rounded="full" fontSize="xs" fontWeight="600">
                    {inactiveCount} Inactive
                  </Badge>
                )}
              </HStack>
            )}
          </Flex>

          {/* ── Add Lender Form ── */}
          <SectionCard>
            <SectionHeader
              title="Add New Lender"
              subtitle="Fill in the eligibility criteria for the new lending partner"
            />

            <Box px={6} py={5}>
              <Grid
                templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
                gap={4}
                mb={4}
              >
                <FormControl>
                  <FormLabel fontSize="xs" fontWeight="600" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.05em">
                    Lender Name
                  </FormLabel>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank"
                    size="md"
                    focusBorderColor="blue.400"
                    bg="gray.50"
                    _dark={{ bg: 'gray.700' }}
                    rounded="lg"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" fontWeight="600" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.05em">
                    Min CIBIL Score
                  </FormLabel>
                  <Input
                    name="minCibil"
                    type="number"
                    value={form.minCibil}
                    onChange={handleChange}
                    placeholder="e.g. 700"
                    size="md"
                    focusBorderColor="blue.400"
                    bg="gray.50"
                    _dark={{ bg: 'gray.700' }}
                    rounded="lg"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" fontWeight="600" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.05em">
                    Max FOIR (%)
                  </FormLabel>
                  <InputGroup>
                    <Input
                      name="maxFoir"
                      type="number"
                      value={form.maxFoir}
                      onChange={handleChange}
                      placeholder="e.g. 50"
                      size="md"
                      focusBorderColor="blue.400"
                      bg="gray.50"
                      _dark={{ bg: 'gray.700' }}
                      rounded="lg"
                    />
                  </InputGroup>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" fontWeight="600" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.05em">
                    Min Income (₹)
                  </FormLabel>
                  <Input
                    name="minIncome"
                    type="number"
                    value={form.minIncome}
                    onChange={handleChange}
                    placeholder="e.g. 30000"
                    size="md"
                    focusBorderColor="blue.400"
                    bg="gray.50"
                    _dark={{ bg: 'gray.700' }}
                    rounded="lg"
                  />
                </FormControl>
              </Grid>

              <Divider mb={4} />

              <Flex
                align={{ base: 'flex-start', sm: 'center' }}
                justify="space-between"
                direction={{ base: 'column', sm: 'row' }}
                gap={4}
              >
                <HStack spacing={3}>
                  <Switch
                    id="isActive"
                    isChecked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    colorScheme="green"
                    size="md"
                  />
                  <FormLabel htmlFor="isActive" mb={0} fontSize="sm" fontWeight="500" color="gray.700" _dark={{ color: 'gray.300' }} cursor="pointer">
                    Mark as active on creation
                  </FormLabel>
                </HStack>

                <Button
                  colorScheme="blue"
                  size="md"
                  px={8}
                  rounded="lg"
                  fontWeight="600"
                  onClick={handleSubmit}
                  isLoading={submitting}
                  loadingText="Creating…"
                  w={{ base: 'full', sm: 'auto' }}
                >
                  Create Lender
                </Button>
              </Flex>
            </Box>
          </SectionCard>

          {/* ── Lender Table ── */}
          <SectionCard>
          <SectionHeader
            title="Lender List"
            subtitle={
              loading
                ? 'Loading…'
                : `${lenders.length} lender${lenders.length !== 1 ? 's' : ''} registered`
            }
          />

          <Box overflowX="auto" w="100%">
            <Table variant="simple" size="md">
              <Thead>
                <Tr bg="gray.50" _dark={{ bg: 'gray.700' }}>
                  {[
                    'Lender',
                    'Min CIBIL',
                    'Max FOIR',
                    'Min Income',
                    'Status',
                    'Toggle',
                  ].map((col) => (
                    <Th
                      key={col}
                      fontSize="xs"
                      fontWeight="700"
                      color="gray.500"
                      textTransform="uppercase"
                      letterSpacing="0.07em"
                      py={3}
                      whiteSpace="nowrap"
                    >
                      {col}
                    </Th>
                  ))}
                </Tr>
              </Thead>

              <Tbody>
                {loading ? (
                  <TableSkeleton />
                ) : lenders.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} textAlign="center" py={12}>
                      <VStack spacing={2}>
                        <Text fontSize="2xl">🏦</Text>

                        <Text
                          color="gray.500"
                          _dark={{ color: 'gray.400' }}
                          fontSize="sm"
                        >
                          No lenders yet. Add your first one above.
                        </Text>
                      </VStack>
                    </Td>
                  </Tr>
                ) : (
                  lenders.map((l) => (
                    <Tr
                      key={l._id}
                      _hover={{
                        bg: 'blue.50',
                        _dark: { bg: 'gray.700' },
                      }}
                      transition="background 0.15s ease"
                      opacity={togglingId === l._id ? 0.5 : 1}
                    >
                      <Td>
                        <Text
                          fontWeight="600"
                          fontSize="sm"
                          color="gray.800"
                          _dark={{ color: 'gray.100' }}
                        >
                          {l.name}
                        </Text>
                      </Td>

                      <Td>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: 'gray.400' }}
                        >
                          {l.minCibil}+
                        </Text>
                      </Td>

                      <Td>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: 'gray.400' }}
                        >
                          {l.maxFoir}%
                        </Text>
                      </Td>

                      <Td>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: 'gray.400' }}
                        >
                          {formatINR(l.minIncome)}
                        </Text>
                      </Td>

                      <Td>
                        <StatusBadge isActive={l.isActive} />
                      </Td>

                      <Td>
                        <Switch
                          isChecked={l.isActive}
                          onChange={() => toggleStatus(l)}
                          colorScheme="green"
                          size="md"
                          isDisabled={togglingId === l._id}
                          aria-label={`Toggle ${l.name}`}
                        />
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
          </SectionCard>
        </Container>
      </Box>
    </Box>
  );
}