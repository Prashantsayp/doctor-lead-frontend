import { Link } from '@saas-ui/react'
import {
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
  FaInstagram,
} from 'react-icons/fa'
import { Logo } from './logo'

export type HeaderLink = {
  label: string
  href?: string
  id?: string
}

const ALL_HEADER_LINKS: HeaderLink[] = [
  // ✅ ab yaha links add/uncomment karo
  // { label: 'Portal', href: '/' },
  // { label: 'Bulk Sync', href: '/bulk-sync' },
  // { label: 'Underwriting', href: '/underwriting' },
  // { label: 'Partners', href: '/partners' },
]

const siteConfig = {
  logo: Logo,

  seo: {
    title: 'F2 Fintech',
    description: 'Customer Intelligence Portal',
    titleTemplate: '%s | F2 Fintech',
    openGraph: {
      type: 'website',
      site_name: 'F2 Fintech',
    },
    twitter: {
      cardType: 'summary_large_image',
    },
  },

  header: {
    // ✅ static + typed (never[] issue gone)
    links: ALL_HEADER_LINKS,
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
          F2 Fintech Pvt. Ltd.
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
} satisfies {
  logo: any
  seo: any
  header: { links: HeaderLink[]; user: any }
  footer: any
}

export default siteConfig
