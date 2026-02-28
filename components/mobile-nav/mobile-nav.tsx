import * as React from 'react'
import {
  // Box,
  // CloseButton,
  // Flex,
  // HStack,
  // IconButton,
  IconButtonProps,
  LinkProps,
  // Stack,
  useBreakpointValue,
  useColorModeValue,
  useUpdateEffect,
} from '@chakra-ui/react'
import { Link } from '@saas-ui/react'
import useRouteChanged from 'hooks/use-route-changed'
import { usePathname } from 'next/navigation'
// import { AiOutlineMenu } from 'react-icons/ai'
// import { RemoveScroll } from 'react-remove-scroll'

// import { Logo } from '#components/layout/logo'
// import siteConfig from '#data/config'

interface NavLinkProps extends LinkProps {
  label: string
  href?: string
  isActive?: boolean
}

function NavLink({ href, children, isActive, ...rest }: NavLinkProps) {
  const pathname = usePathname()
  const bgActiveHoverColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const [, group] = href?.split('/') || []
  isActive = isActive ?? pathname?.includes(group)

  return (
    <Link
      href={href}
      display="inline-flex"
      flex="1"
      minH="40px"
      px="8"
      py="3"
      transition="0.2s all"
      fontWeight={isActive ? 'semibold' : 'medium'}
      borderColor={isActive ? 'purple.400' : undefined}
      borderBottomWidth="1px"
      color={isActive ? 'white' : undefined}
      _hover={{ bg: isActive ? 'purple.500' : bgActiveHoverColor }}
      {...rest}
    >
      {children}
    </Link>
  )
}

interface MobileNavContentProps {
  isOpen?: boolean
  onClose?: () => void
}

export function MobileNavContent(props: MobileNavContentProps) {
  const { isOpen, onClose = () => {} } = props

  React.useEffect(() => {
    if (isOpen) onClose()
  }, [isOpen, onClose])

  useRouteChanged(onClose)

  const showOnBreakpoint = useBreakpointValue({ base: true, lg: false })
  React.useEffect(() => {
    if (showOnBreakpoint === false) onClose()
  }, [showOnBreakpoint, onClose])

  useUpdateEffect(() => {
    if (isOpen) onClose()
  }, [isOpen])
  return null
}

export const MobileNavButton = React.forwardRef(
  (props: IconButtonProps, ref: React.Ref<any>) => {
    return null

    // (Keeping code below only for reference; unreachable)
    // return (
    //   <IconButton
    //     ref={ref}
    //     display={{ base: 'flex', md: 'none' }}
    //     fontSize="20px"
    //     color={useColorModeValue('gray.800', 'inherit')}
    //     variant="ghost"
    //     icon={<AiOutlineMenu />}
    //     {...props}
    //     aria-label="Open menu"
    //   />
    // )
  },
)

MobileNavButton.displayName = 'MobileNavButton'