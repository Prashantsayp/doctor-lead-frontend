import { Link } from '@saas-ui/react'
import { NextSeoProps } from 'next-seo'
import { FaFacebookF, FaLinkedinIn, FaYoutube, FaInstagram } from 'react-icons/fa'
import { jwtDecode } from 'jwt-decode'
import { Logo } from './logo'

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATION' | 'SALES' | 'USER'

function getRoleFromToken(): AppRole | null {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('token')
  if (!t || t === 'null' || t === 'undefined' || !t.trim()) return null
  try {
    const decoded = jwtDecode<{ role?: AppRole }>(t)
    return decoded?.role ?? null
  } catch {
    return null
  }
}

function canSeeBulkSync(role: AppRole | null) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATION'
}

const ALL_HEADER_LINKS = [
  // { label: 'Portal', href: '/' },
  // { label: 'Bulk Sync', href: '/bulk-sync' },
  // { label: 'Underwriting', href: '/underwriting' },
  // { label: 'Partners', href: '/partners' },
]

const siteConfig = {
  logo: Logo,

  seo: {
    title: 'F2 Fintech Doctor',
    description: 'Doctor Intelligence Portal',
  } as NextSeoProps,

  header: {
    links: (() => {
      const role = getRoleFromToken()
      return ALL_HEADER_LINKS.filter((l) => {
        if (l.href === '/bulk-sync') return canSeeBulkSync(role)
        return true
      })
    })(),

    user: {
      name: 'Admin',
      role: 'admin',
      showAvatar: true,
    },
  },

  footer: {
    copyright: (
      <>
        © {new Date().getFullYear()}&nbsp;
        <Link href="/" _hover={{ color: 'inherit' }}>
          F2 Fintech Doctor
        </Link>
      </>
    ),

    links: [
      { href: 'mailto:wecare@f2fintech.com', label: 'Contact' },
      { href: 'https://www.facebook.com/f2fintech', label: <FaFacebookF size={14} /> },
      { href: 'https://www.linkedin.com/company/f2-fintech', label: <FaLinkedinIn size={14} /> },
      { href: 'https://www.instagram.com/f2fintech', label: <FaInstagram size={14} /> },
      { href: 'https://www.youtube.com/@f2fintech', label: <FaYoutube size={14} /> },
    ],
  },
}

export default siteConfig
