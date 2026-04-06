'use client'

import * as React from 'react'
import type { NextPage } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Container,
  Divider,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { FiArrowRight, FiSearch } from 'react-icons/fi'

const HERO_BG = '/static/doctor-portal-bg.png'
const PENDING_KEY = 'pending_identify_search'

type DetectMode = 'mobile' | 'email' | 'reg'

const Home: NextPage = () => {
  return (
    <Box>
      <HeroSection />
    </Box>
  )
}

const HeroSection: React.FC = () => {
  const toast = useToast()
  const router = useRouter()

  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const placeholder = 'Enter Mobile / Email / Registration No.'

  const getToken = () => {
    if (typeof window === 'undefined') return null
    const t = localStorage.getItem('token')
    if (!t) return null
    if (t === 'null' || t === 'undefined') return null
    if (!t.trim()) return null
    return t
  }

  const detectMode = (qRaw: string): DetectMode | null => {
    const q = qRaw.trim()
    if (!q) return null

    const mobileOnly = q.replace(/\D/g, '')
    let normalizedMobile = mobileOnly

    if (normalizedMobile.startsWith('91') && normalizedMobile.length === 12) {
      normalizedMobile = normalizedMobile.slice(2)
    }

    if (/^[6-9]\d{9}$/.test(normalizedMobile)) return 'mobile'

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return 'email'

    const upper = q.toUpperCase()
    const hasLetterOrSymbol = /[A-Z\/\-]/.test(upper)

    if (hasLetterOrSymbol && /^[A-Z0-9\/\- ]{3,30}$/.test(upper)) {
      return 'reg'
    }

    return null
  }

  const normalize = (qRaw: string, m: DetectMode) => {
    const q = qRaw.trim()

    if (m === 'mobile') {
      let mobile = q.replace(/\D/g, '')
      if (mobile.startsWith('91') && mobile.length === 12) {
        mobile = mobile.slice(2)
      }
      return mobile
    }

    if (m === 'reg') {
      return q.toUpperCase().replace(/\s+/g, ' ').trim()
    }

    return q
  }

  const runSearch = async (qRaw: string, m: DetectMode) => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    const searchValue = normalize(qRaw, m)

    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/get-lead?search=${encodeURIComponent(searchValue)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token')
          toast({
            title: 'Session expired',
            description: 'Please login again.',
            status: 'warning',
          })
          router.push('/login')
          return
        }

        toast({
          title: 'Search failed',
          description: Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || 'Error',
          status: 'error',
        })
        return
      }

      const items = Array.isArray(data?.items) ? data.items : []

      if (items.length === 0) {
        router.push(`/profession-lead?mode=${m}&q=${encodeURIComponent(searchValue)}`)
        return
      }

      router.push(`/profession/${items[0]._id}`)
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const token = getToken()
    if (!token) return

    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      const q = String(parsed?.query || '').trim()

      localStorage.removeItem(PENDING_KEY)

      if (!q) return

      setQuery(q)

      const m = detectMode(q)
      if (!m) return

      runSearch(q, m)
    } catch {
      localStorage.removeItem(PENDING_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleIdentifyClick = async () => {
    const token = getToken()

    const q = query.trim()
    if (!q) {
      toast({ title: 'Please enter value', status: 'warning' })
      return
    }

    if (!token) {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ query: q }))
      toast({
        title: 'Please login first',
        description: 'Login karo, phir result dikhaenge.',
        status: 'info',
      })
      router.push('/login')
      return
    }

    const detected = detectMode(q)
    if (!detected) {
      toast({
        title: 'Invalid input',
        description: 'Enter valid Mobile / Email / Registration No.',
        status: 'warning',
      })
      return
    }

    await runSearch(q, detected)
  }

  return (
    <Box position="relative" overflow="hidden" minH={{ base: '78vh', lg: '84vh' }}>
      <Box position="absolute" inset={0} zIndex={0}>
        <Image
          src={HERO_BG}
          alt="Professional Portal background"
          fill
          priority
          style={{ objectFit: 'cover' }}
        />
        <Box position="absolute" inset={0} bg="white" opacity={0.82} />
        <Box
          position="absolute"
          inset={0}
          bgGradient="radial(transparent 30%, rgba(255,255,255,0.95) 75%)"
        />
      </Box>

      <Container maxW="container.xl" position="relative" zIndex={1} py={{ base: 12, lg: 8 }}>
        <Stack spacing={{ base: 10, lg: 12 }} align="center" textAlign="center">
          <VStack spacing={1} pt={{ base: 6, lg: 8 }}>
            <Heading
              fontSize={{ base: '3xl', md: '5xl', lg: '6xl' }}
              fontWeight="800"
              letterSpacing="-0.02em"
              color="blue.600"
              lineHeight="1.05"
            >
              Customer Intelligence Portal
            </Heading>
            <Text maxW="3xl" color="gray.600" fontSize={{ base: 'md', md: 'lg' }}>
              Search Customerby Mobile / Email / Registration No.
            </Text>
          </VStack>

          <Box
            w={{ base: '100%', md: '720px' }}
            borderRadius="2xl"
            bg="white"
            boxShadow="0 20px 60px rgba(16, 24, 40, 0.18)"
            border="1px solid"
            borderColor="gray.100"
            overflow="hidden"
          >
            <Box borderTop="6px solid" borderTopColor="blue.600" />
            <Box px={{ base: 6, md: 10 }} py={{ base: 7, md: 9 }}>
              <VStack spacing={3}>
                <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }} color="blue.700" fontWeight="800">
                  Customer Identification
                </Heading>

                <Box w="100%" pt={3}>
                  <InputGroup size="lg">
                    <InputLeftElement pointerEvents="none" color="gray.400">
                      <Icon as={FiSearch} />
                    </InputLeftElement>

                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={placeholder}
                      bg="white"
                      borderColor="gray.200"
                      _hover={{ borderColor: 'gray.300' }}
                      _focus={{
                        borderColor: 'blue.500',
                        boxShadow: '0 0 0 4px rgba(49, 130, 206, 0.12)',
                      }}
                      borderRadius="xl"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleIdentifyClick()
                      }}
                    />
                  </InputGroup>

                  <Button
                    mt={5}
                    w="100%"
                    size="lg"
                    colorScheme="blue"
                    borderRadius="xl"
                    rightIcon={<Icon as={FiArrowRight} />}
                    isLoading={loading}
                    loadingText="Searching..."
                    onClick={handleIdentifyClick}
                  >
                    Identify Customer
                  </Button>

                  <Divider mt={5} borderColor="gray.100" />
                  <Text fontSize="xs" color="gray.500" pt={3}>
                    If you are not logged in, we will ask you to login first and then show results.
                  </Text>
                </Box>
              </VStack>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

export default Home