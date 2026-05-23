'use client';

import {
  Box,
  Text,
  Input, // Kept to prevent ReferenceErrors
  Button,
  Grid,
  SimpleGrid,
  Switch,
  Badge,
  Container,
  FormControl,
  FormLabel,
  useToast,
  Flex,
  Divider,
  HStack,
  VStack,
  Select,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Icon,
} from '@chakra-ui/react';
import { useEffect, useCallback, useState, useRef } from 'react';
import axios from 'axios';

// ─── Interfaces ──────────────────────────────────────────────────────────────

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

type ViewMode = 'grid' | 'table';
type StatusFilter = 'all' | 'active' | 'inactive';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/lender`

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

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getCardColorTheme = (name: string) => {
  const code = name.charCodeAt(0) || 0;
  if (code % 4 === 0) return { bg: 'blue.50', color: 'blue.700', darkBg: 'blue.900', darkColor: 'blue.200' };
  if (code % 4 === 1) return { bg: 'orange.50', color: 'orange.700', darkBg: 'orange.900', darkColor: 'orange.200' };
  if (code % 4 === 2) return { bg: 'purple.50', color: 'purple.700', darkBg: 'purple.900', darkColor: 'purple.200' };
  return { bg: 'red.50', color: 'red.700', darkBg: 'red.900', darkColor: 'red.200' };
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
);

const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3" y2="18"/><line x1="21" y1="6" x2="21" y2="18"/></svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const FileIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
);

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function LenderPage() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  // Manual Entry States
  const [form, setForm] = useState<LenderForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Bulk Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters Controls
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // Modals Controller Hooks
  const { isOpen: isManualOpen, onOpen: onManualOpen, onClose: onManualClose } = useDisclosure();
  const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
  const toast = useToast();

  // ── Fetch Lenders ──
  const fetchLenders = useCallback(async () => {
    try {
      const res = await axios.get<Lender[]>(`${API_BASE}/get-all`);
      setLenders(res.data);
    } catch {
      toast({ title: 'Failed to load lenders', status: 'error', duration: 4000, isClosable: true, position: 'top-right' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLenders();
  }, [fetchLenders]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Manual Submission Mapper (CreateLenderDto Alignment) ──
  const handleManualSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Lender name is required', status: 'warning', duration: 3000, isClosable: true, position: 'top-right' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        minCibil: Number(form.minCibil) || 0,
        maxFoir: Number(form.maxFoir) || 0,
        minIncome: Number(form.minIncome) || 0,
        isActive: form.isActive,
      };

      await axios.post(`${API_BASE}/create`, payload);
      
      toast({ title: 'Lender created successfully', status: 'success', duration: 3000, isClosable: true, position: 'top-right' });
      setForm(INITIAL_FORM);
      onManualClose();
      await fetchLenders();
    } catch {
      toast({ title: 'Failed to create lender', description: 'Failed to create lender', status: 'error', duration: 4000, isClosable: true, position: 'top-right' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Dynamic CSV Generator (Triggered inside Bulk Modal now) ──
  const downloadSampleTemplate = () => {
    const headers = ['name', 'minCibil', 'maxFoir', 'minIncome'];
    const sampleRows = [
      ['HDFC Bank', '720', '50', '30000'],
      ['ICICI Bank', '700', '55', '25000']
    ];

    const csvContent = [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'lender_bulk_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({ title: 'Invalid File', description: 'Please choose a valid formatted .csv file.', status: 'error', duration: 3000, isClosable: true });
        return;
      }
      setSelectedFile(file);
    }
  };

  // ── Bulk Post Trigger ──
  const handleBulkUploadSubmit = async () => {
    if (!selectedFile) {
      toast({ title: 'No file selected', status: 'warning', duration: 3000, isClosable: true });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    try {
      await axios.post(`${API_BASE}/bulk-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({ title: 'Bulk Lenders parsed successfully!', status: 'success', duration: 3000, isClosable: true, position: 'top-right' });
      setSelectedFile(null);
      onBulkClose();
      await fetchLenders();
    } catch {
      toast({ title: 'Upload failed', description: 'Check structural parameters row mappings alignment.', status: 'error', duration: 5000, isClosable: true, position: 'top-right' });
    } finally {
      setUploading(false);
    }
  };

  const [deletingId, setDeletingId] =
  useState<string | null>(null);

  const toggleStatus = async (lender: Lender) => {
    setTogglingId(lender._id);
    try {
      await axios.patch(`${API_BASE}/toggle-status/${lender._id}`, { isActive: !lender.isActive });
      await fetchLenders();
    } catch {
      toast({ title: 'Failed to update status', status: 'error', duration: 3000, isClosable: true, position: 'top-right' });
    } finally {
      setTogglingId(null);
    }
  };

  const deleteLender = async (
  lenderId: string,
) => {

  try {

    setDeletingId(lenderId);

    await axios.delete(`${API_BASE}/${lenderId}`);

    toast({
      title: 'Lender deleted',
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    });

    await fetchLenders();

  } catch (error: any) {

    toast({
      title:
        error?.response?.data?.message
        || 'Delete failed',
      status: 'error',
      duration: 4000,
      isClosable: true,
      position: 'top-right',
    });

  } finally {

    setDeletingId(null);

  }
};

  // ── Realtime Calculations Filter ──
  const filteredLenders = lenders.filter((lender) => {
    const matchesSearch = lender.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'active' ? lender.isActive : !lender.isActive;
    return matchesSearch && matchesStatus;
  });

  const totalLenders = lenders.length;
  const activeCount = lenders.filter((l) => l.isActive).length;
  const inactiveCount = totalLenders - activeCount;
  const activePercentage = totalLenders > 0 ? Math.round((activeCount / totalLenders) * 100) : 0;

  return (
    <Box bg="gray.50" _dark={{ bg: 'gray.900' }} minH="100vh" py={10}>
      <Container maxW="1140px" px={{ base: 4, md: 6 }}>
        
        {/* Main Section Dashboard Header */}
        <Flex justify="space-between" align="center" mb={8} direction={{ base: 'column', sm: 'row' }} gap={4}>
          <Box>
            <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" tracking="tight" color="gray.900" _dark={{ color: 'white' }}>
              Lender management
            </Text>
            <Text fontSize="md" color="gray.500" mt={1}>
              Monitor landing requirements and criteria settings
            </Text>
          </Box>

          {/* Clean Dual-Action Layout Header */}
          <HStack spacing={3} w={{ base: 'full', sm: 'auto' }}>
            <Button
              onClick={onBulkOpen}
              variant="outline"
              bg="white"
              color="indigo.600"
              _dark={{ bg: 'gray.800', borderColor: 'indigo.800', color: 'indigo.300' }}
              borderColor="indigo.100"
              leftIcon={<UploadIcon />}
              size="md"
              rounded="xl"
              fontWeight="700"
              fontSize="sm"
            >
              Bulk Import
            </Button>
            <Button
              onClick={onManualOpen}
              bg="indigo.600"
              _hover={{ bg: 'indigo.700' }}
              color="white"
              leftIcon={<PlusIcon />}
              size="md"
              px={5}
              rounded="xl"
              fontWeight="700"
              shadow="sm"
            >
              Add Lender
            </Button>
          </HStack>
        </Flex>

        {/* ── Summary Matrix Widgets ── */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={8}>
          <Box bg="white" _dark={{ bg: 'gray.800', borderColor: 'gray.700' }} border="1px solid" borderColor="gray.100" p={6} rounded="2xl" shadow="sm">
            <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase">Total Partners</Text>
            <Text fontSize="4xl" fontWeight="800" color="gray.900" _dark={{ color: 'white' }} mt={2}>{totalLenders}</Text>
            <HStack spacing={4} mt={3} fontSize="sm" fontWeight="600" color="gray.600" _dark={{ color: 'gray.400' }}>
              <Flex align="center" gap={1.5}><Box w={2} h={2} rounded="full" bg="emerald-500" /> {activeCount} Active</Flex>
              <Flex align="center" gap={1.5}><Box w={2} h={2} rounded="full" bg="rose-500" /> {inactiveCount} Inactive</Flex>
            </HStack>
          </Box>

          <Box bg="white" _dark={{ bg: 'gray.800', borderColor: 'gray.700' }} border="1px solid" borderColor="gray.100" p={6} rounded="2xl" shadow="sm">
            <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase">Active Ratio</Text>
            <Text fontSize="4xl" fontWeight="800" color="gray.900" _dark={{ color: 'white' }} mt={2}>{activeCount}</Text>
            <Text mt={3} fontSize="sm" fontWeight="500" color="gray.500">
              <Box as="span" bg="emerald-50" color="emerald-700" px={2} py={0.5} rounded="md" fontWeight="600" mr={1.5}>
                {activePercentage}%
              </Box> 
              coverage scope
            </Text>
          </Box>

          <Box bg="white" _dark={{ bg: 'gray.800', borderColor: 'gray.700' }} border="1px solid" borderColor="gray.100" p={6} rounded="2xl" shadow="sm">
            <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase">Filtered View Hits</Text>
            <Text fontSize="4xl" fontWeight="800" color="indigo.600" mt={2}>{filteredLenders.length}</Text>
            <Text mt={3} fontSize="sm" fontWeight="500" color="gray.500">Results dynamically scaled</Text>
          </Box>
        </SimpleGrid>

        {/* ── Filters Dynamic Toolbar Center ── */}
        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={4} mb={6}>
          <HStack spacing={3} flex={1}>
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="white"
              _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
              borderColor="gray.200"
              rounded="xl"
              maxW={{ base: 'full', md: '280px' }}
              fontSize="sm"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              bg="white"
              _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
              borderColor="gray.200"
              rounded="xl"
              maxW="160px"
              fontSize="sm"
            >
              <option value="all">All Lenders</option>
              <option value="active">Active State</option>
              <option value="inactive">Inactive State</option>
            </Select>
          </HStack>

          <HStack bg="gray.200" _dark={{ bg: 'gray.700' }} p={1} rounded="xl" spacing={0}>
            <IconButton
              aria-label="Grid switch"
              icon={<GridIcon />}
              size="sm"
              rounded="lg"
              variant={viewMode === 'grid' ? 'solid' : 'ghost'}
              bg={viewMode === 'grid' ? 'white' : 'transparent'}
              _dark={{ bg: viewMode === 'grid' ? 'gray.600' : 'transparent' }}
              onClick={() => setViewMode('grid')}
            />
            <IconButton
              aria-label="Table switch"
              icon={<TableIcon />}
              size="sm"
              rounded="lg"
              variant={viewMode === 'table' ? 'solid' : 'ghost'}
              bg={viewMode === 'table' ? 'white' : 'transparent'}
              _dark={{ bg: viewMode === 'table' ? 'gray.600' : 'transparent' }}
              onClick={() => setViewMode('table')}
            />
          </HStack>
        </Flex>

        {/* ── Main Dynamic Workspace View ── */}
        {filteredLenders.length === 0 ? (
          <Box bg="white" _dark={{ bg: 'gray.800' }} rounded="2xl" border="1px dashed" borderColor="gray.200" py={12} textAlign="center">
            <Text fontSize="3xl" mb={2}>🔍</Text>
            <Text color="gray.500" fontSize="sm" fontWeight="600">No records found matching criteria scope parameters.</Text>
          </Box>
        ) : viewMode === 'grid' ? (
          
          /* VIEW 1: GRID LAYOUT */
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={6}>
            {filteredLenders.map((l) => {
              const theme = getCardColorTheme(l.name);
              return (
                <Flex
                  key={l._id}
                  direction="column"
                  justify="space-between"
                  bg="white"
                  _dark={{ bg: 'gray.800' }}
                  p={6}
                  rounded="2xl"
                  border={l.isActive ? "1px solid" : "1px dashed"}
                  borderColor={l.isActive ? "gray.100" : "gray.300"}
                  _dark={{ borderColor: l.isActive ? "gray.700" : "gray.600" }}
                  shadow="sm"
                  transition="all 0.2s"
                  opacity={togglingId === l._id ? 0.5 : l.isActive ? 1 : 0.8}
                >
                  <Box>
                    <Flex align="center" justify="space-between" mb={5}>
                      <HStack spacing={3}>
                        <Flex w={12} h={12} rounded="xl" align="center" justify="center" fontWeight="800" fontSize="md" bg={theme.bg} color={theme.color} _dark={{ bg: theme.darkBg, color: theme.darkColor }}>
                          {getInitials(l.name)}
                        </Flex>
                        <VStack align="start" spacing={0.5}>
                          <Text fontWeight="700" fontSize="sm" color={l.isActive ? "gray.900" : "gray.400"} _dark={{ color: l.isActive ? "white" : "gray.500" }} noOfLines={1}>
                            {l.name}
                          </Text>
                          <Badge colorScheme={l.isActive ? 'green' : 'red'} variant="subtle" rounded="md" px={1.5} py={0.5} fontSize="10px" fontWeight="700">
                            {l.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </VStack>
                      </HStack>
                    </Flex>

                    <VStack spacing={3.5} mb={6} align="stretch">
                      <Flex justify="space-between" align="center" borderBottom="1px solid" borderColor="gray.50" _dark={{ borderColor: 'gray.750' }} pb={1.5}>
                        <Text fontSize="xs" fontWeight="600" color="gray.400">Min CIBIL</Text>
                        <Text fontSize="sm" fontWeight="700" color={l.isActive ? "gray.800" : "gray.500"} _dark={{ color: 'white' }}>{l.minCibil}+</Text>
                      </Flex>
                      <Flex justify="space-between" align="center" borderBottom="1px solid" borderColor="gray.50" _dark={{ borderColor: 'gray.750' }} pb={1.5}>
                        <Text fontSize="xs" fontWeight="600" color="gray.400">FOIR</Text>
                        <Text fontSize="sm" fontWeight="700" color={l.isActive ? "gray.800" : "gray.500"} _dark={{ color: 'white' }}>{l.maxFoir}%</Text>
                      </Flex>
                      <Flex justify="space-between" align="center">
                        <Text fontSize="xs" fontWeight="600" color="gray.400">Min Income</Text>
                        <Text fontSize="sm" fontWeight="700" color={l.isActive ? "gray.800" : "gray.500"} _dark={{ color: 'white' }}>{formatINR(l.minIncome)}</Text>
                      </Flex>
                    </VStack>
                  </Box>

                  <HStack>

                  <Button
                    size="xs"
                    rounded="lg"
                    fontWeight="700"
                    variant={
                      l.isActive
                        ? "outline"
                        : "solid"
                    }
                    colorScheme={
                      l.isActive
                        ? "red"
                        : "green"
                    }
                    onClick={() => toggleStatus(l)}
                    isLoading={
                      togglingId === l._id
                    }
                  >
                    {l.isActive
                      ? 'Deactivate'
                      : 'Activate'}
                  </Button>

                  <Button
                    size="xs"
                    rounded="lg"
                    fontWeight="700"
                    variant={
                     l.isActive
                        ? "outline"
                        : "solid"
                    }
                    colorScheme={
                      l.isActive
                        ? "red"
                        : "green"
                    }
                    isLoading={
                      deletingId === l._id
                    }
                    onClick={() =>
                      deleteLender(l._id)
                    }
                  >
                    Delete
                  </Button>

                </HStack>
                </Flex>
              );
            })}
          </SimpleGrid>
        ) : (
          /* VIEW 2: DATATABLE VIEW */
          <Box bg="white" _dark={{ bg: 'gray.800' }} rounded="2xl" border="1px solid" borderColor="gray.100" _dark={{ borderColor: 'gray.700' }} shadow="sm" overflow="hidden">
            <Box overflowX="auto">
              <Table variant="simple" size="md">
                <Thead bg="gray.50" _dark={{ bg: 'gray.750' }}>
                  <Tr>
                    <Th py={4}>Lender Identity</Th>
                    <Th py={4}>Min CIBIL</Th>
                    <Th py={4}>Max FOIR</Th>
                    <Th py={4}>Min Income</Th>
                    <Th py={4}>Status</Th>
                    <Th py={4} textAlign="right">Control Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredLenders.map((l) => (
                    <Tr key={l._id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.750' } }}>
                      <Td py={4}><Text fontWeight="700" fontSize="sm">{l.name}</Text></Td>
                      <Td py={4}><Text fontSize="sm" fontWeight="600">{l.minCibil}+</Text></Td>
                      <Td py={4}><Text fontSize="sm" fontWeight="600">{l.maxFoir}%</Text></Td>
                      <Td py={4}><Text fontSize="sm" fontWeight="600">{formatINR(l.minIncome)}</Text></Td>
                      <Td py={4}>
                        <Badge colorScheme={l.isActive ? 'green' : 'red'} variant="subtle" rounded="md" px={2} py={0.5} fontSize="xs" fontWeight="700">
                          {l.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td py={4} textAlign="right">
                        <Button size="xs" rounded="lg" fontWeight="700" variant={l.isActive ? "outline" : "solid"} colorScheme={l.isActive ? "red" : "green"} onClick={() => toggleStatus(l)} isLoading={togglingId === l._id}>
                          {l.isActive ? 'Deactivate' : 'Activate'}
                        </Button>

                        <Button size="xs" rounded="lg" fontWeight="700" variant={l.isActive ? "outline" : "solid"}colorScheme={l.isActive ? "red" : "green"} isLoading= {deletingId === l._id }onClick={() =>deleteLender(l._id)}
                          >
                    Delete
                  </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>
        )}

        {/* ── 🚀 MODAL 1: MANUAL SINGLE ENTRY FORM (Matches CreateLenderDto) ── */}
        <Modal isOpen={isManualOpen} onClose={onManualClose} isCentered size="md">
          <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
          <ModalContent rounded="2xl" mx={4}>
            <ModalHeader fontWeight="800" borderBottom="1px solid" borderColor="gray.100" fontSize="lg">
              Onboard Single Lender
            </ModalHeader>
            <ModalCloseButton rounded="xl" top={4} />
            
            <ModalBody py={5}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.400" mb={1.5} textTransform="uppercase">Lender Name</FormLabel>
                  <Input name="name" value={form.name} onChange={handleInputChange} placeholder="e.g. State Bank of India" size="md" rounded="xl" bg="gray.50" _dark={{ bg: 'gray.700' }} border="none" focusBorderColor="indigo.500" />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.400" mb={1.5} textTransform="uppercase">Min CIBIL Score</FormLabel>
                  <Input name="minCibil" type="number" value={form.minCibil} onChange={handleInputChange} placeholder="e.g. 750" size="md" rounded="xl" bg="gray.50" _dark={{ bg: 'gray.700' }} border="none" focusBorderColor="indigo.500" />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.400" mb={1.5} textTransform="uppercase">Max FOIR (%)</FormLabel>
                  <Input name="maxFoir" type="number" value={form.maxFoir} onChange={handleInputChange} placeholder="e.g. 45" size="md" rounded="xl" bg="gray.50" _dark={{ bg: 'gray.700' }} border="none" focusBorderColor="indigo.500" />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.400" mb={1.5} textTransform="uppercase">Min Income (₹ / Month)</FormLabel>
                  <Input name="minIncome" type="number" value={form.minIncome} onChange={handleInputChange} placeholder="e.g. 35000" size="md" rounded="xl" bg="gray.50" _dark={{ bg: 'gray.700' }} border="none" focusBorderColor="indigo.500" />
                </FormControl>

                <Flex w="100%" align="center" justify="space-between" pt={2}>
                  <FormLabel htmlFor="modalIsActive" mb={0} fontSize="sm" fontWeight="600" color="gray.600" cursor="pointer">
                    Set instantly active
                  </FormLabel>
                  <Switch id="modalIsActive" isChecked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} colorScheme="green" size="md" />
                </Flex>
              </VStack>
            </ModalBody>

            <ModalFooter borderTop="1px solid" borderColor="gray.100" gap={3}>
              <Button variant="ghost" rounded="xl" size="md" fontWeight="600" onClick={onManualClose}>Cancel</Button>
              <Button
                colorScheme="indigo"
                bg="indigo.600"
                _hover={{ bg: 'indigo.700' }}
                size="md"
                px={6}
                rounded="xl"
                fontWeight="700"
                onClick={handleManualSubmit}
                isLoading={submitting}
                loadingText="Saving..."
              >
                Save Lender
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* ── 📤 MODAL 2: BULK CSV IMPORT FILE DROPZONE (TEMPLATE CORES ADDED HERE) ── */}
        <Modal isOpen={isBulkOpen} onClose={onBulkClose} isCentered size="md">
          <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
          <ModalContent rounded="2xl" mx={4}>
            <ModalHeader fontWeight="800" borderBottom="1px solid" borderColor="gray.100" fontSize="lg">
              Bulk Import Partners via CSV
            </ModalHeader>
            <ModalCloseButton rounded="xl" top={4} />
            
            <ModalBody py={5}>
              <VStack spacing={4} w="100%" align="stretch">
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Drag and drop your spreadsheet layout file below. Columns will auto-map directly to system structures.
                </Text>

                {/* ── Integrated Template Download Trigger Action right inside the context ── */}
                <Flex justify="center" pt={1}>
                  <Button
                    onClick={downloadSampleTemplate}
                    variant="ghost"
                    colorScheme="indigo"
                    color="indigo.600"
                    _dark={{ color: 'indigo.300' }}
                    leftIcon={<DownloadIcon />}
                    size="sm"
                    fontWeight="700"
                    _hover={{ bg: 'indigo.50', _dark: { bg: 'indigo.950/30' } }}
                  >
                    Download Sample CSV Template
                  </Button>
                </Flex>

                <Box
                  w="100%"
                  py={8}
                  px={4}
                  border="2px dashed"
                  borderColor={selectedFile ? "indigo.500" : "gray.200"}
                  _dark={{ borderColor: selectedFile ? "indigo.400" : "gray.600" }}
                  rounded="2xl"
                  bg="gray.50"
                  _dark={{ bg: 'gray.750' }}
                  textAlign="center"
                  cursor="pointer"
                  onClick={() => fileInputRef.current?.click()}
                  transition="all 0.2s"
                  _hover={{ borderColor: 'indigo.400', bg: 'indigo.50/30' }}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />
                  <VStack spacing={2}>
                    <Icon as={FileIcon} />
                    <Text fontWeight="700" fontSize="sm" color="gray.700" _dark={{ color: 'gray.200' }}>
                      {selectedFile ? selectedFile.name : "Click to browse or drop CSV"}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Supports standard layout structure rules validations"}
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </ModalBody>

            <ModalFooter borderTop="1px solid" borderColor="gray.100" gap={3}>
              <Button variant="ghost" rounded="xl" size="md" fontWeight="600" onClick={onBulkClose}>Cancel</Button>
              <Button
                onClick={handleBulkUploadSubmit}
                colorScheme="indigo"
                bg="indigo.600"
                _hover={{ bg: 'indigo.700' }}
                size="md"
                px={6}
                rounded="xl"
                fontWeight="700"
                isLoading={uploading}
                loadingText="Processing..."
                isDisabled={!selectedFile}
              >
                Import Batch List
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

      </Container>
    </Box>
  );
}