'use client'
import * as React from 'react'
import {
  Box,
  Button,
  Container,
  Input,
  Stack,
  Text,
  useToast,
  HStack,
  Icon,
  InputGroup,
  InputLeftElement,
  InputRightElement,
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
      fontFamily="'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      bg="#0f172a"
      position="relative"
      overflow="hidden"
    >
      <Box position="absolute" inset={0} overflow="hidden" pointerEvents="none">
        <Box
          position="absolute" top="-160px" left="-160px"
          w="500px" h="500px"
          borderRadius="full"
          bg="radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 70%)"
        />

        <Box
          position="absolute" bottom="-200px" right="-100px"
          w="600px" h="600px"
          borderRadius="full"
          bg="radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)"
        />

        <Box
          position="absolute" inset={0}
          opacity={0.04}
          backgroundImage="linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)"
          backgroundSize="48px 48px"
        />
      </Box>

      <Box
        display={{ base: 'none', lg: 'flex' }}
        flexDir="column"
        justify="space-between"
        w="46%"
        flexShrink={0}
        px={12}
        pt={20}
        pb={12}
        position="relative"
        zIndex={1}
      >
        {/* Logo */}
        <HStack spacing={3}>
          <Box
            w="38px" h="38px"
            borderRadius="10px"
            background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
            display="flex" alignItems="center" justifyContent="center"
            boxShadow="0 4px 14px rgba(37,99,235,0.4)"
          >
            <Text fontSize="14px" fontWeight="900" color="white" letterSpacing="-0.5px">CE</Text>
          </Box>
          <Box>
            <Text fontSize="15px" fontWeight="800" color="white" letterSpacing="-0.3px" lineHeight="1">
              Credit Engine
            </Text>
            <Text fontSize="10px" fontWeight="600" color="rgba(255,255,255,0.4)" letterSpacing="1px" textTransform="uppercase">
              Intelligence Portal
            </Text>
          </Box>
        </HStack>

        {/* Center hero text */}
        <Box mt={10}>
          <Box
            display="inline-flex" alignItems="center" gap="8px"
            px={3} py={1.5}
            bg="rgba(37,99,235,0.15)"
            border="1px solid rgba(37,99,235,0.3)"
            borderRadius="full"
            mb={5}
          >
            <Box w="6px" h="6px" borderRadius="full" bg="#22c55e" />
            <Text fontSize="11px" fontWeight="700" color="rgba(255,255,255,0.7)" letterSpacing="0.5px">
              CUSTOMER INTELLIGENCE PLATFORM
            </Text>
          </Box>

          <Text
            fontSize={{ md: '34px', lg: '40px' }}
            fontWeight="800"
            color="white"
            lineHeight="1.15"
            letterSpacing="-1px"
            mb={4}
          >
            Smarter credit<br />
            decisions,{' '}
            <Text as="span" background="linear-gradient(90deg, #60a5fa, #a78bfa)" backgroundClip="text" color="transparent">
              faster.
            </Text>
          </Text>

          <Text fontSize="14px" color="rgba(255,255,255,0.45)" fontWeight="500" lineHeight="1.7" maxW="340px">
            Unified professional lead management with AI-powered risk scoring, CIBIL analytics, and real-time credit intelligence.
          </Text>

          {/* Feature pills */}
          <HStack spacing={2} mt={7} flexWrap="wrap">
            {['Risk Scoring', 'CIBIL Analytics', 'Lead Sync', 'KYC Verified'].map((f) => (
              <Box
                key={f}
                px={3} py={1}
                bg="rgba(255,255,255,0.06)"
                border="1px solid rgba(255,255,255,0.1)"
                borderRadius="full"
              >
                <Text fontSize="11px" fontWeight="600" color="rgba(255,255,255,0.5)">{f}</Text>
              </Box>
            ))}
          </HStack>
        </Box>

        {/* Bottom stats */}
        <HStack spacing={8}>
          {[
            { value: '10K+', label: 'Professionals' },
            { value: '98%', label: 'Accuracy' },
            { value: '< 2s', label: 'Response Time' },
          ].map((s) => (
            <Box key={s.label}>
              <Text fontSize="20px" fontWeight="800" color="white" lineHeight="1">{s.value}</Text>
              <Text fontSize="11px" fontWeight="500" color="rgba(255,255,255,0.35)" mt={0.5}>{s.label}</Text>
            </Box>
          ))}
        </HStack>
      </Box>

      {/* ── Right: Login form ── */}
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={{ base: 4, md: 8 }}
        py={10}
        position="relative"
        zIndex={1}
      >
        <Box w="100%" maxW="420px">

          {/* Mobile logo */}
          <HStack spacing={3} mb={8} display={{ base: 'flex', lg: 'none' }} justify="center">
            <Box
              w="36px" h="36px"
              borderRadius="10px"
              background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontSize="13px" fontWeight="900" color="white">CE</Text>
            </Box>
            <Text fontSize="15px" fontWeight="800" color="white" letterSpacing="-0.3px">Credit Engine</Text>
          </HStack>

          {/* Card */}
          <Box
            bg="rgba(255,255,255,0.04)"
            border="1px solid rgba(255,255,255,0.1)"
            borderRadius="20px"
            p={{ base: 6, md: 8 }}
            backdropFilter="blur(20px)"
            boxShadow="0 24px 64px rgba(0,0,0,0.4)"
          >
            {/* Form header */}
            <Box mb={7}>
              <Text fontSize="22px" fontWeight="800" color="white" letterSpacing="-0.4px" lineHeight="1.1">
                Sign in
              </Text>
              <Text fontSize="13px" color="rgba(255,255,255,0.4)" mt={1} fontWeight="500">
                Enter your credentials to access the portal
              </Text>
            </Box>

            {/* Fields */}
            <Stack spacing={4}>

              {/* Email */}
              <Box>
                <Text fontSize="11px" fontWeight="700" color="rgba(255,255,255,0.5)" mb={1.5} textTransform="uppercase" letterSpacing="0.6px">
                  Email Address
                </Text>
                <InputGroup>
                  <InputLeftElement h="44px" pointerEvents="none">
                    <Icon as={FiMail} color="rgba(255,255,255,0.25)" boxSize={4} />
                  </InputLeftElement>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder="name@company.com"
                    autoComplete="email"
                    h="44px"
                    fontSize="13px"
                    fontWeight="500"
                    pl="42px"
                    bg="rgba(255,255,255,0.06)"
                    border="1px solid rgba(255,255,255,0.1)"
                    borderRadius="12px"
                    color="white"
                    _placeholder={{ color: 'rgba(255,255,255,0.2)' }}
                    _hover={{ border: '1px solid rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.08)' }}
                    _focus={{
                      bg: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(37,99,235,0.7)',
                      boxShadow: '0 0 0 3px rgba(37,99,235,0.15)',
                      outline: 'none',
                    }}
                  />
                </InputGroup>
              </Box>

              {/* Password */}
              <Box>
                <HStack justify="space-between" mb={1.5}>
                  <Text fontSize="11px" fontWeight="700" color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing="0.6px">
                    Password
                  </Text>
                  <Button
                    variant="link"
                    fontSize="11px"
                    fontWeight="600"
                    color="rgba(96,165,250,0.8)"
                    _hover={{ color: '#60a5fa', textDecoration: 'none' }}
                    h="auto" p={0} minW="auto"
                    onClick={() => toast({ title: 'Contact admin to reset password', status: 'info' })}
                  >
                    Forgot password?
                  </Button>
                </HStack>
                <InputGroup>
                  <InputLeftElement h="44px" pointerEvents="none">
                    <Icon as={FiLock} color="rgba(255,255,255,0.25)" boxSize={4} />
                  </InputLeftElement>
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    h="44px"
                    fontSize="13px"
                    fontWeight="500"
                    pl="42px"
                    pr="46px"
                    bg="rgba(255,255,255,0.06)"
                    border="1px solid rgba(255,255,255,0.1)"
                    borderRadius="12px"
                    color="white"
                    _placeholder={{ color: 'rgba(255,255,255,0.2)' }}
                    _hover={{ border: '1px solid rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.08)' }}
                    _focus={{
                      bg: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(37,99,235,0.7)',
                      boxShadow: '0 0 0 3px rgba(37,99,235,0.15)',
                      outline: 'none',
                    }}
                  />
                  <InputRightElement h="44px">
                    <Button
                      size="sm" variant="ghost" h="32px" w="32px" p={0}
                      borderRadius="8px"
                      color="rgba(255,255,255,0.3)"
                      _hover={{ bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                      onClick={() => setShowPass((s) => !s)}
                      aria-label="Toggle password visibility"
                    >
                      <Icon as={showPass ? FiEyeOff : FiEye} boxSize={4} />
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </Box>

              {/* Login button */}
              <Button
                mt={2}
                h="46px"
                fontSize="14px"
                fontWeight="700"
                borderRadius="12px"
                background="linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
                color="white"
                boxShadow="0 4px 20px rgba(37,99,235,0.4)"
                rightIcon={<Icon as={FiArrowRight} boxSize={4} />}
                _hover={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
                  boxShadow: '0 6px 24px rgba(37,99,235,0.5)',
                  transform: 'translateY(-1px)',
                }}
                _active={{ transform: 'translateY(0px)' }}
                transition="all 0.15s"
                onClick={handleLogin}
                isLoading={loading}
                loadingText="Signing in…"
              >
                Sign In to Portal
              </Button>
            </Stack>

            {/* Divider */}
            <Box mt={6} mb={5} position="relative">
              <Box h="1px" bg="rgba(255,255,255,0.08)" />
              <Box
                position="absolute" top="50%" left="50%" transform="translate(-50%,-50%)"
                bg="rgba(15,23,42,0.95)" px={3}
              >
                <Text fontSize="10px" fontWeight="600" color="rgba(255,255,255,0.2)" letterSpacing="0.5px">
                  SECURED ACCESS
                </Text>
              </Box>
            </Box>

            {/* Trust badges */}
            <HStack justify="center" spacing={4}>
              {['🔒 SSL Encrypted', '🛡 Role-based Access', '📊 Audit Logged'].map((b) => (
                <Text key={b} fontSize="10px" fontWeight="500" color="rgba(255,255,255,0.2)">{b}</Text>
              ))}
            </HStack>
          </Box>

          {/* Footer */}
          <Text mt={5} textAlign="center" fontSize="11px" color="rgba(255,255,255,0.2)" fontWeight="500">
            © {new Date().getFullYear()} Credit Engine · Customer Intelligence Portal
          </Text>
        </Box>
      </Box>
    </Box>
  )
}