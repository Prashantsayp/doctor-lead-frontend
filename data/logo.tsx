import { HStack, Box, Text, HTMLChakraProps } from '@chakra-ui/react'

export const Logo: React.FC<HTMLChakraProps<'div'>> = (props) => {
  return (
    <HStack spacing={2} {...props}>
      {/* Circle F2 */}
      <Box
        w="28px"
        h="28px"
        borderRadius="full"
        bg="blue.600"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontWeight="800"
        fontSize="sm"
      >
        F2
      </Box>

      {/* Brand Name */}
      <Text
          fontSize="md"
          fontWeight="700"
          color="blue.600"
          letterSpacing="0.2px"
          noOfLines={1}
          overflow="hidden"
          textOverflow="ellipsis"
          maxW="125px"
        >
        Credit Engine

      </Text>
    </HStack>
  )
}
