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
  useToast,
  HStack,
  Icon,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Divider,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'

export default function LoginPage() {
  const router = useRouter()
  const toast = useToast()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPass, setShowPass] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleLogin = async () => {
    const e = email.trim().toLowerCase()
    const p = password

    if (!e || !p) {
      toast({ title: 'Email and password required', status: 'warning' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password: p }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Login failed'
        toast({ title: msg, status: 'error' })
        return
      }

      const token: string | null = data?.access_token || data?.accessToken || null
      if (!token) {
        toast({ title: 'Token missing in response', status: 'error' })
        return
      }

      localStorage.setItem('token', token)

      const user = data?.user || {}
      const name = (user?.name || '').toString().trim()
      localStorage.setItem('userName', name || 'User')
      if (user?.email) localStorage.setItem('userEmail', String(user.email))
      if (user?.role) localStorage.setItem('userRole', String(user.role))
      if (user?.designation) localStorage.setItem('userDesignation', String(user.designation))

      window.dispatchEvent(new Event('auth-change'))

      toast({ title: 'Login successful', status: 'success' })
      router.replace('/')
    } catch (err) {
      console.error(err)
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      bgGradient="linear(to-br, gray.50, purple.50, blue.50)"
      position="relative"
      overflow="hidden"
    >
      {/* soft blobs */}
      <Box
        position="absolute"
        top="-120px"
        left="-120px"
        w="320px"
        h="320px"
        bg="purple.200"
        filter="blur(70px)"
        opacity={0.35}
        borderRadius="full"
      />
      <Box
        position="absolute"
        bottom="-140px"
        right="-140px"
        w="360px"
        h="360px"
        bg="blue.200"
        filter="blur(80px)"
        opacity={0.35}
        borderRadius="full"
      />

      <Container maxW="lg">
        <Box
          borderRadius="3xl"
          overflow="hidden"
          boxShadow="xl"
          border="1px solid"
          borderColor="whiteAlpha.700"
          bg="whiteAlpha.800"
          backdropFilter="blur(10px)"
        >
          {/* Header strip */}
          <Box px={{ base: 6, md: 8 }} py={{ base: 6, md: 7 }} bgGradient="linear(to-r, purple.700, blue.700)" color="white">
            <HStack justify="space-between" align="start" spacing={4}>
              <Box>
                <Heading size="md" lineHeight="1.1">
                  Welcome back
                </Heading>
                <Text mt={1} fontSize="sm" color="whiteAlpha.800">
                  Sign in to continue
                </Text>
              </Box>

              <Box
                px={3}
                py={1.5}
                borderRadius="full"
                bg="whiteAlpha.300"
                border="1px solid"
                borderColor="whiteAlpha.400"
                fontSize="xs"
                fontWeight="800"
              >
                Professional-Lead
              </Box>
            </HStack>
          </Box>

          {/* Body */}
          <Box px={{ base: 6, md: 8 }} py={{ base: 6, md: 7 }} bg="white">
            <VStack spacing={5} align="stretch">
             

              <Stack spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                    Email
                  </Text>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiMail} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={onEnter}
                      placeholder="name@company.com"
                      autoComplete="email"
                      borderRadius="xl"
                      bg="gray.50"
                      borderColor="gray.200"
                      _focus={{
                        bg: 'white',
                        borderColor: 'purple.400',
                        boxShadow: '0 0 0 1px var(--chakra-colors-purple-400)',
                      }}
                    />
                  </InputGroup>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                    Password
                  </Text>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiLock} color="gray.400" />
                    </InputLeftElement>

                    <Input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={onEnter}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      borderRadius="xl"
                      bg="gray.50"
                      borderColor="gray.200"
                      pr="44px"
                      _focus={{
                        bg: 'white',
                        borderColor: 'purple.400',
                        boxShadow: '0 0 0 1px var(--chakra-colors-purple-400)',
                      }}
                    />

                    <InputRightElement>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPass((s) => !s)}
                        borderRadius="lg"
                        _hover={{ bg: 'gray.100' }}
                        aria-label="Toggle password visibility"
                      >
                        <Icon as={showPass ? FiEyeOff : FiEye} color="gray.600" />
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </Box>

                <Button
                  colorScheme="purple"
                  onClick={handleLogin}
                  isLoading={loading}
                  loadingText="Logging in..."
                  borderRadius="xl"
                  size="lg"
                  rightIcon={<Icon as={FiArrowRight} />}
                >
                  Login
                </Button>

                <Divider />

                <HStack justify="space-between" fontSize="sm" color="gray.600">
                  <Text></Text>
                  <Button variant="link" colorScheme="purple" size="sm" onClick={() => toast({ title: 'Contact admin to reset password', status: 'info' })}>
                    Forgot password?
                  </Button>
                </HStack>
              </Stack>
            </VStack>
          </Box>
        </Box>

        <Text mt={4} textAlign="center" fontSize="xs" color="gray.500">
          © {new Date().getFullYear()} Professional-Lead • Secure access
        </Text>
      </Container>
    </Box>
  )
}
