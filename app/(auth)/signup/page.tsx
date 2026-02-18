'use client'

import * as React from 'react'
import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
  Select,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [designation, setDesignation] = React.useState('')
  const [role, setRole] = React.useState<'SUPER_ADMIN' | 'ADMIN' | 'USER'>('USER')

  const [loading, setLoading] = React.useState(false)

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      alert('Name, Email, Password required')
      return
    }
    if (!designation.trim()) {
      alert('Designation required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        designation: designation.trim(), // ✅ cannot be empty
        role, // ✅ must be SUPER_ADMIN | ADMIN | USER
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg =
          (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) ||
          'Signup failed'
        alert(msg)
        return
      }

      alert('Signup successful!')
      router.push('/login')
    } catch (err) {
      console.error(err)
      alert('Server error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center">
      <Container maxW="md">
        <Box bg="white" p={8} borderRadius="xl" boxShadow="lg">
          <VStack spacing={5} align="stretch">
            <Heading size="lg" textAlign="center">
              Create Account
            </Heading>

            <Stack spacing={2}>
              <Text>Name</Text>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
              />
            </Stack>

            <Stack spacing={2}>
              <Text>Email</Text>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </Stack>

            <Stack spacing={2}>
              <Text>Password</Text>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </Stack>

            <Stack spacing={2}>
              <Text>Designation</Text>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Enter designation"
              />
            </Stack>

            <Stack spacing={2}>
              <Text>Role</Text>
              <Select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </Select>
            </Stack>

            <Button
              colorScheme="purple"
              onClick={handleSignup}
              isLoading={loading}
              loadingText="Signing up..."
            >
              Sign Up
            </Button>

            <Text fontSize="sm" textAlign="center">
              Already have account?{' '}
              <Text
                as="span"
                color="purple.500"
                cursor="pointer"
                onClick={() => router.push('/login')}
              >
                Login
              </Text>
            </Text>
          </VStack>
        </Box>
      </Container>
    </Box>
  )
}
