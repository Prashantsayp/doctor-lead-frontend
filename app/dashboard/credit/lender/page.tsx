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
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function LenderPage() {
  const [form, setForm] = useState<any>({
    name: '',
    minCibil: '',
    maxFoir: '',
    minIncome: '',
    isActive: true,
  });

  const [lenders, setLenders] = useState<any[]>([]);

  // 🔥 Fetch lenders
  const fetchLenders = async () => {
    const res = await axios.get('http://localhost:3001/lender');
    setLenders(res.data);
  };

  useEffect(() => {
    fetchLenders();
  }, []);

  // 🔥 Handle form change
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔥 Create lender
 const handleSubmit = async () => {
  const payload = {
    name: form.name,
    minCibil: Number(form.minCibil),
    maxFoir: Number(form.maxFoir),
    minIncome: Number(form.minIncome),
    isActive: form.isActive,
  };

  console.log("PAYLOAD:", payload); // debug

  await axios.post('http://localhost:3001/lender', payload);

  alert('Lender Created ✅');
};

  // 🔥 Toggle active
  const toggleStatus = async (l: any) => {
    await axios.patch(`http://localhost:3001/lender/${l._id}`, {
      isActive: !l.isActive,
    });
    fetchLenders();
  };

  return (
    <Box p={6}>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        🏦 Lender Management
      </Text>

      {/* 🔷 CREATE FORM */}
      <Box bg="white" p={5} rounded="lg" shadow="md" mb={6}>
        <Text mb={3} fontWeight="bold">
          Add New Lender
        </Text>

        <Grid templateColumns="repeat(2,1fr)" gap={4}>
          <Input
            placeholder="Lender Name"
            name="name"
            value={form.name}
            onChange={handleChange}
          />

          <Input
            placeholder="Min CIBIL"
            name="minCibil"
            type="number"
            value={form.minCibil}
            onChange={handleChange}
          />

          <Input
            placeholder="Max FOIR (%)"
            name="maxFoir"
            type="number"
            value={form.maxFoir}
            onChange={handleChange}
          />

          <Input
            placeholder="Min Income"
            name="minIncome"
            type="number"
            value={form.minIncome}
            onChange={handleChange}
          />

          <Stack direction="row" align="center">
            <Text>Active</Text>
            <Switch
              isChecked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
          </Stack>
        </Grid>

        <Button mt={4} colorScheme="blue" onClick={handleSubmit}>
          Create Lender
        </Button>
      </Box>

      {/* 🔷 TABLE */}
      <Box bg="white" p={5} rounded="lg" shadow="md">
        <Text mb={3} fontWeight="bold">
          Lender List
        </Text>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>CIBIL</Th>
              <Th>FOIR</Th>
              <Th>Income</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>

          <Tbody>
            {lenders.map((l) => (
              <Tr key={l._id}>
                <Td fontWeight="bold">{l.name}</Td>

                <Td>{l.minCibil}+</Td>

                <Td>{l.maxFoir}%</Td>

                <Td>₹{l.minIncome}</Td>

                <Td>
                  <Badge colorScheme={l.isActive ? 'green' : 'red'}>
                    {l.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>

                <Td>
                  <Switch
                    isChecked={l.isActive}
                    onChange={() => toggleStatus(l)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}