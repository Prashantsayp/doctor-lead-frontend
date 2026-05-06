'use client';

import {
  Box,
  Text,
  Select,
  Button,
  Input,
  Grid,
  Stack,
  Textarea,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Flex,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function LenderPolicyPage() {
  const [lenders, setLenders] = useState<any[]>([]);
  const [selectedLender, setSelectedLender] = useState('');
  const [file, setFile] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const [form, setForm] = useState<any>({
    minCibil: '',
    maxCibil: '',
    minLoanAmount: '',
    maxLoanAmount: '',
    allowedProfessions: '',
    allowedLocations: '',
    blockedLocations: '',
    employmentTypes: '',
    maxFOIR: '',
    minIncome: '',
    isActive: true,
    remarks: '',
  });

  const [policies, setPolicies] = useState<any[]>([]);

  // 🔥 Fetch lenders
  const fetchLenders = async () => {
    const res = await axios.get('http://localhost:3001/lender');
    setLenders(res.data);
  };

  // 🔥 Fetch policies
  const fetchPolicies = async () => {
    const res = await axios.get('http://localhost:3001/lender-policy');
    setPolicies(res.data);
  };

  useEffect(() => {
    fetchLenders();
    fetchPolicies();
  }, []);

  // 🔥 AI Extraction (dummy for now)
  const runAI = async () => {
    if (!file) return alert('Upload file first');

    setLoadingAI(true);

    // 👉 Replace with real API later
    setTimeout(() => {
      setForm({
        minCibil: 650,
        maxCibil: 800,
        minLoanAmount: 50000,
        maxLoanAmount: 500000,
        minIncome: 25000,
        employmentTypes: 'salaried',
      });
      setLoadingAI(false);
    }, 1500);
  };

  // 🔥 Save Policy
  const handleSave = async () => {
    const payload = {
      lenderId: selectedLender,
      ...form,
      allowedProfessions: form.allowedProfessions?.split(',') || [],
      allowedLocations: form.allowedLocations?.split(',') || [],
      blockedLocations: form.blockedLocations?.split(',') || [],
      employmentTypes: form.employmentTypes
        ? [form.employmentTypes]
        : [],
    };

    await axios.post('http://localhost:3001/lender-policy', payload);
    alert('Policy Saved ✅');
    fetchPolicies();
  };

  return (
    <Box p={6}>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        🧠 Lender Policy Engine
      </Text>

      {/* 🔷 LENDER SELECT */}
      <Box mb={4}>
        <Text mb={1}>Select Lender</Text>
        <Select
          placeholder="Choose lender"
          onChange={(e) => setSelectedLender(e.target.value)}
        >
          {lenders.map((l: any) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </Select>
      </Box>

      {/* 🔷 FILE UPLOAD */}
      <Flex gap={3} mb={5}>
        <Input
          type="file"
          onChange={(e: any) => setFile(e.target.files[0])}
        />
        <Button
          colorScheme="purple"
          onClick={runAI}
          isLoading={loadingAI}
        >
          🤖 Run AI
        </Button>
      </Flex>

      {/* 🔷 FORM */}
      <Box bg="white" p={5} rounded="lg" shadow="md">
        <Text mb={3} fontWeight="bold">
          Extracted Policy (Editable)
        </Text>

        <Grid templateColumns="repeat(2,1fr)" gap={4}>
          <Input
            placeholder="Min CIBIL"
            value={form.minCibil || ''}
            onChange={(e) =>
              setForm({ ...form, minCibil: e.target.value })
            }
          />
          <Input
            placeholder="Max CIBIL"
            value={form.maxCibil || ''}
            onChange={(e) =>
              setForm({ ...form, maxCibil: e.target.value })
            }
          />

          <Input
            placeholder="Min Loan"
            value={form.minLoanAmount || ''}
            onChange={(e) =>
              setForm({ ...form, minLoanAmount: e.target.value })
            }
          />
          <Input
            placeholder="Max Loan"
            value={form.maxLoanAmount || ''}
            onChange={(e) =>
              setForm({ ...form, maxLoanAmount: e.target.value })
            }
          />

          <Input
            placeholder="Min Income"
            value={form.minIncome || ''}
            onChange={(e) =>
              setForm({ ...form, minIncome: e.target.value })
            }
          />

          <Select
            placeholder="Employment Type"
            value={form.employmentTypes || ''}
            onChange={(e) =>
              setForm({ ...form, employmentTypes: e.target.value })
            }
          >
            <option value="salaried">Salaried</option>
            <option value="self-employed">Self Employed</option>
          </Select>

          <Input
            placeholder="Allowed Professions (comma)"
            onChange={(e) =>
              setForm({
                ...form,
                allowedProfessions: e.target.value,
              })
            }
          />

          <Input
            placeholder="Allowed Locations"
            onChange={(e) =>
              setForm({
                ...form,
                allowedLocations: e.target.value,
              })
            }
          />

          <Input
            placeholder="Blocked Locations"
            onChange={(e) =>
              setForm({
                ...form,
                blockedLocations: e.target.value,
              })
            }
          />

          <Input
            placeholder="Max FOIR"
            onChange={(e) =>
              setForm({ ...form, maxFOIR: e.target.value })
            }
          />

          <Stack direction="row" align="center">
            <Text>Active</Text>
            <Switch
              isChecked={form.isActive}
              onChange={(e) =>
                setForm({
                  ...form,
                  isActive: e.target.checked,
                })
              }
            />
          </Stack>

          <Textarea
            placeholder="Remarks"
            onChange={(e) =>
              setForm({ ...form, remarks: e.target.value })
            }
          />
        </Grid>

        <Button mt={4} colorScheme="blue" onClick={handleSave}>
          Save Policy
        </Button>
      </Box>

      {/* 🔷 POLICY TABLE */}
      <Box mt={8}>
        <Text fontSize="lg" mb={2}>
          Existing Policies
        </Text>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Lender</Th>
              <Th>CIBIL</Th>
              <Th>Loan</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>

          <Tbody>
            {policies.map((p: any) => (
              <Tr key={p._id}>
                <Td>{p.lenderId?.name || 'N/A'}</Td>
                <Td>
                  {p.minCibil} - {p.maxCibil}
                </Td>
                <Td>
                  ₹{p.minLoanAmount} - ₹{p.maxLoanAmount}
                </Td>
                <Td>
                  <Badge colorScheme={p.isActive ? 'green' : 'red'}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}