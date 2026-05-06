'use client'

import { useState } from 'react'
import axios from 'axios'
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  Spinner,
} from '@chakra-ui/react'

export default function UploadPolicyPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleUpload = async () => {
    if (!file) return alert('Select file first')

    const formData = new FormData()
    formData.append('file', file)

    try {
      setLoading(true)

      const res = await axios.post(
        'http://localhost:3001/policy-upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setResult(res.data)
    } catch (err) {
      console.error(err)
      alert('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={6}>
      <VStack spacing={4} align="start">
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <Button colorScheme="blue" onClick={handleUpload}>
          Upload Policy
        </Button>

        {loading && <Spinner />}

        {result && (
          <Box bg="gray.100" p={4} borderRadius="md">
            <Text fontWeight="bold">Extracted Data:</Text>
            <pre>{JSON.stringify(result.extracted, null, 2)}</pre>
          </Box>
        )}
      </VStack>
    </Box>
  )
}