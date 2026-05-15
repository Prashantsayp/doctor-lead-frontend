'use client'

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Box, Container, useToast } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

// ─── Profession Config ─────────────────────────────────────────────────────────
// To add/remove a profession, only edit this array. No other change needed.

interface Profession {
  label: string
  tablerIcon: string
  iconBg: string
  iconColor: string
  desc: string
  hints: [string, string, string]
  placeholder: string
}

const PROFESSIONS: Profession[] = [
  {
    label: 'All Profession',
    tablerIcon: 'ti-layout-grid',
    iconBg: '#EEEDFE',
    iconColor: '#534ab7',
    desc: 'Any entity type',
    hints: ['Mobile / Email / PAN', 'CIF / Aadhaar / ID No.', 'Registration No.'],
    placeholder: 'Mobile / Email / PAN / CIF / ID No.',
  },
  {
    label: 'Doctor',
    tablerIcon: 'ti-stethoscope',
    iconBg: '#E1F5EE',
    iconColor: '#0f6e56',
    desc: 'MCI / NMC reg.',
    hints: ['Mobile / Email', 'MCI / NMC Reg. No.', 'State Council Reg.'],
    placeholder: 'Mobile / Email / MCI Reg. No.',
  },
  {
    label: 'CA',
    tablerIcon: 'ti-chart-bar',
    iconBg: '#e6f1fb',
    iconColor: '#185fa5',
    desc: 'ICAI membership',
    hints: ['Mobile / Email', 'ICAI Mem. No.', 'PAN / Firm Reg. No.'],
    placeholder: 'Mobile / Email / ICAI Mem. No.',
  },
  {
    label: 'Lawyer',
    tablerIcon: 'ti-scale',
    iconBg: '#FAEEDA',
    iconColor: '#854f0b',
    desc: 'Bar Council reg.',
    hints: ['Mobile / Email', 'Bar Council No.', 'Enrollment No.'],
    placeholder: 'Mobile / Email / Bar Council No.',
  },
  {
    label: 'Salaried',
    tablerIcon: 'ti-briefcase',
    iconBg: '#F1EFE8',
    iconColor: '#5f5e5a',
    desc: 'Employee / payroll',
    hints: ['Mobile / Email', 'Employee ID', 'PAN / Aadhaar'],
    placeholder: 'Mobile / Email / Employee ID / PAN',
  },
  {
    label: 'Businessman',
    tablerIcon: 'ti-building-store',
    iconBg: '#EAF3DE',
    iconColor: '#3b6d11',
    desc: 'CIN / GSTIN / Udyam',
    hints: ['Mobile / Email', 'CIN / GSTIN', 'PAN / Udyam No.'],
    placeholder: 'Mobile / Email / CIN / GSTIN',
  },
  {
    label: 'Co. Secretary',
    tablerIcon: 'ti-clipboard-list',
    iconBg: '#EEEDFE',
    iconColor: '#534ab7',
    desc: 'ICSI membership',
    hints: ['Mobile / Email', 'ICSI Mem. No.', 'PAN / COP No.'],
    placeholder: 'Mobile / Email / ICSI Mem. No.',
  },
  {
    label: 'Cost Accountant',
    tablerIcon: 'ti-calculator',
    iconBg: '#e6f1fb',
    iconColor: '#185fa5',
    desc: 'ICMAI membership',
    hints: ['Mobile / Email', 'ICMAI Mem. No.', 'PAN / COP No.'],
    placeholder: 'Mobile / Email / ICMAI Mem. No.',
  },
  {
    label: 'Realtor',
    tablerIcon: 'ti-home',
    iconBg: '#FAECE7',
    iconColor: '#993c1d',
    desc: 'RERA registered',
    hints: ['Mobile / Email', 'RERA Reg. No.', 'PAN / License No.'],
    placeholder: 'Mobile / Email / RERA Reg. No.',
  },
  {
    label: 'Broker',
    tablerIcon: 'ti-handshake',
    iconBg: '#FAEEDA',
    iconColor: '#854f0b',
    desc: 'SEBI / IRDAI / AMFI',
    hints: ['Mobile / Email', 'SEBI / IRDAI Reg.', 'ARN / AMFI No.'],
    placeholder: 'Mobile / Email / SEBI Reg. / ARN No.',
  },
  {
    label: 'Channel Partner',
    tablerIcon: 'ti-share',
    iconBg: '#EEEDFE',
    iconColor: '#534ab7',
    desc: 'Partner / DSA / DST',
    hints: ['Mobile / Email', 'Partner Code', 'IRDAI / AMFI Reg.'],
    placeholder: 'Mobile / Email / Partner Code / Reg. No.',
  },
]

const HINT_ICONS = ['📱', '🪪', '#']

// ─── Component ────────────────────────────────────────────────────────────────

export default function IdentifyDoctorPage() {
  const [selected, setSelected] = React.useState<Profession>(PROFESSIONS[0])
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [inputError, setInputError] = React.useState(false)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [dropdownRect, setDropdownRect] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const toast = useToast()
  const router = useRouter()

  // ── Close dropdown on outside click ────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        !(e.target as Element)?.closest?.('.ci-dd-panel')
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Update dropdown position on scroll or resize
  React.useEffect(() => {
    if (!dropdownOpen) return
    const update = () => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect()
        setDropdownRect({ top: r.bottom + 6, left: r.left, width: r.width + 30 })
      }
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [dropdownOpen])

  // ── Original logic — unchanged ──────────────────────────────────────────────
  const detectMode = (q: string) => {
    if (/^[6-9]\d{9}$/.test(q)) return 'mobile'
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return 'email'
    return 'reg'
  }

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) {
      setInputError(true)
      setTimeout(() => setInputError(false), 1400)
      return
    }

    const mode = detectMode(q)
    if (!mode) {
      toast({ title: 'Invalid input', description: 'Enter Mobile / Email / Reg No.', status: 'warning' })
      return
    }

    setLoading(true)
    try {
      const profParam =
        selected.label === 'All Profession'
          ? ''
          : `&profession=${encodeURIComponent(selected.label)}`

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/get-lead?search=${q}${profParam}`
      )
      const data = await res.json()

      if (data?.items?.length) {
        router.push(`/profession/${data.items[0]._id}`)
      } else {
        router.push(`/profession-lead?q=${q}&profession=${encodeURIComponent(selected.label)}`)
      }
    } catch {
      toast({ title: 'Search failed', status: 'error' })
    } finally {
      setLoading(false)
    }
  }
  // ── End original logic ──────────────────────────────────────────────────────

  const handleSelect = (prof: Profession) => {
    setSelected(prof)
    setQuery('')
    setInputError(false)
    setDropdownOpen(false)
  }

  const isAll = selected.label === 'All Profession'
  const btnLabel = isAll ? 'Identify entity' : `Identify ${selected.label}`

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .ci-root {
          font-family: 'DM Sans', sans-serif;
          background: #f5f6fa;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        /* Subtle dot grid */
        .ci-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(24,95,165,.12) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        /* Accent blobs */
        .ci-blob-a {
          position: absolute; top: -120px; right: -100px;
          width: 480px; height: 480px;
          background: radial-gradient(circle at 40% 40%, rgba(83,74,183,.13) 0%, transparent 65%);
          border-radius: 50%; pointer-events: none; z-index: 0;
        }
        .ci-blob-b {
          position: absolute; bottom: -100px; left: -80px;
          width: 360px; height: 360px;
          background: radial-gradient(circle at 60% 60%, rgba(24,95,165,.1) 0%, transparent 65%);
          border-radius: 50%; pointer-events: none; z-index: 0;
        }

        .ci-wrap {
          position: relative; z-index: 1;
          padding: 52px 0 72px;
        }

        /* ── Header ── */
        .ci-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: #fff;
          border: 1px solid rgba(24,95,165,.2);
          color: #185fa5; font-size: 11px; font-weight: 600;
          letter-spacing: .13em; text-transform: uppercase;
          padding: 5px 14px; border-radius: 100px; margin-bottom: 16px;
        }
        .ci-pulse {
          width: 7px; height: 7px; background: #185fa5;
          border-radius: 50%; animation: ciPulse 2.2s ease-in-out infinite;
        }
        @keyframes ciPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.35; transform:scale(.55); }
        }

        .ci-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2rem, 4vw, 2.8rem);
          font-weight: 800;
          color: #0a1628;
          line-height: 1.08;
          letter-spacing: -.03em;
          margin: 0 0 10px;
        }
        .ci-title-accent {
          color: #185fa5;
          position: relative;
        }
        .ci-title-accent::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -3px;
          height: 3px;
          background: linear-gradient(90deg, #185fa5, #534ab7);
          border-radius: 2px;
        }

        .ci-sub {
          font-size: 13.5px; color: #64748b;
          line-height: 1.6; margin-bottom: 0;
        }

        /* ── Main card ── */
        .ci-main-card {
          background: #fff;
          border: 1px solid rgba(10,22,40,.08);
          border-radius: 24px;
          padding: 28px 28px 24px;
          box-shadow:
            0 1px 3px rgba(0,0,0,.04),
            0 8px 24px rgba(10,22,40,.07),
            0 1px 0 rgba(255,255,255,.9) inset;
          position: relative;
          overflow: visible;
        }

        /* Top gradient bar */
        .ci-main-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #185fa5 0%, #534ab7 60%, #0f6e56 100%);
          border-radius: 24px 24px 0 0;
        }

        /* ── Row layout: dropdown + input ── */
        .ci-search-row {
          display: flex;
          gap: 10px;
          align-items: stretch;
          margin-bottom: 12px;
        }

        /* ── Custom Dropdown ── */
        .ci-dd-wrap {
          position: relative;
          flex-shrink: 0;
          width: 210px;
        }

        .ci-dd-trigger {
          width: 100%;
          height: 50px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px 0 10px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 13px;
          cursor: pointer;
          transition: border-color .18s, background .18s, box-shadow .18s;
          font-family: 'DM Sans', sans-serif;
          appearance: none;
          text-align: left;
          overflow: hidden;
        }
        .ci-dd-trigger:hover {
          border-color: #b5d4f4;
          background: #f0f7ff;
        }
        .ci-dd-trigger.ci-dd-open {
          border-color: #185fa5;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(24,95,165,.1);
        }

        .ci-dd-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ci-dd-icon i { font-size: 15px; }

        .ci-dd-text {
          flex: 1; min-width: 0;
        }
        .ci-dd-label {
          font-size: 12.5px; font-weight: 600; color: #0a1628;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.2;
        }
        .ci-dd-desc {
          font-size: 10.5px; color: #94a3b8; margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ci-dd-caret {
          flex-shrink: 0; color: #94a3b8;
          transition: transform .2s;
        }
        .ci-dd-open .ci-dd-caret {
          transform: rotate(180deg);
        }

        /* Dropdown panel */
        .ci-dd-panel {
          position: fixed;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0,0,0,.06), 0 16px 40px rgba(10,22,40,.16);
          z-index: 9999;
          overflow: hidden;
          animation: ciDdOpen .15s ease both;
        }
        @keyframes ciDdOpen {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ci-dd-search {
          padding: 10px 12px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ci-dd-sinp {
          width: 100%; box-sizing: border-box;
          padding: 7px 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12.5px; color: #0a1628;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px; outline: none;
          transition: border-color .15s;
        }
        .ci-dd-sinp:focus { border-color: #185fa5; }
        .ci-dd-sinp::placeholder { color: #b0bec5; }

        .ci-dd-list {
          max-height: 280px;
          overflow-y: auto;
          padding: 6px;
          scrollbar-width: thin;
          scrollbar-color: #e2e8f0 transparent;
        }

        .ci-dd-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 9px;
          border-radius: 10px;
          cursor: pointer;
          transition: background .12s;
          width: 100%;
          border: none;
          appearance: none;
          font-family: 'DM Sans', sans-serif;
          text-align: left;
          background: transparent;
        }
        .ci-dd-item:hover { background: #f8fafc; }
        .ci-dd-item.ci-dd-active { background: #e6f1fb; }
        .ci-dd-item.ci-dd-active.ci-dd-allactive { background: #EEEDFE; }

        .ci-dd-ico {
          width: 28px; height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ci-dd-ico i { font-size: 14px; }

        .ci-dd-iname {
          font-size: 12.5px; font-weight: 500; color: #0a1628;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1; min-width: 0;
        }
        .ci-dd-idesc {
          font-size: 10.5px; color: #94a3b8; flex-shrink: 0;
        }
        .ci-dd-tick {
          width: 16px; height: 16px; border-radius: 50%;
          background: #185fa5;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-left: auto;
        }
        .ci-dd-item.ci-dd-allactive .ci-dd-tick { background: #534ab7; }

        /* ── Input ── */
        .ci-inp-wrap {
          flex: 1;
          position: relative;
        }
        .ci-inp-ico {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none;
          transition: color .18s;
        }
        .ci-inp-wrap:focus-within .ci-inp-ico { color: #185fa5; }

        .ci-inp {
          width: 100%; box-sizing: border-box;
          height: 50px;
          padding: 0 13px 0 42px;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: #0a1628; background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 13px; outline: none;
          transition: all .18s;
        }
        .ci-inp::placeholder { color: #b0bec5; }
        .ci-inp:focus {
          border-color: #185fa5; background: #fff;
          box-shadow: 0 0 0 3px rgba(24,95,165,.1);
        }
        .ci-inp.ci-err {
          border-color: #e24b4a;
          box-shadow: 0 0 0 3px rgba(226,75,74,.1);
          animation: ciShake .35s ease;
        }
        @keyframes ciShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-5px); }
          60%      { transform: translateX(5px); }
        }

        /* ── Hints row ── */
        .ci-hints {
          display: flex; align-items: center; gap: 6px;
          flex-wrap: wrap; margin-bottom: 16px;
        }
        .ci-hints-lbl {
          font-size: 10.5px; color: #94a3b8; font-weight: 600;
          text-transform: uppercase; letter-spacing: .08em; margin-right: 2px;
        }
        .ci-chip {
          font-size: 11.5px; font-weight: 500; color: #475569;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 100px; padding: 3px 10px;
          transition: background .15s, border-color .15s;
        }

        /* ── Submit button ── */
        .ci-btn {
          width: 100%; height: 50px;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          letter-spacing: .02em;
          color: #fff;
          background: #185fa5;
          border: none; border-radius: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: background .15s, transform .12s, box-shadow .15s;
          position: relative; overflow: hidden;
        }
        .ci-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .ci-btn:hover:not(:disabled) {
          background: #0c447c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(24,95,165,.3);
        }
        .ci-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
        .ci-btn:disabled { opacity: .6; cursor: not-allowed; }

        .ci-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff; border-radius: 50%;
          animation: ciSpin .65s linear infinite;
        }
        @keyframes ciSpin { to { transform: rotate(360deg); } }

        /* ── Divider + note ── */
        .ci-divider {
          height: 1px; background: #f1f5f9; margin: 18px 0 14px;
        }
        .ci-note {
          display: flex; align-items: center; justify-content: center;
          gap: 5px; font-size: 11px; color: #94a3b8;
        }

        /* ── Stats strip ── */
        .ci-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #fff;
          border: 1px solid #e8edf3;
          border-radius: 16px;
          overflow: hidden;
          width: 100%;
          margin-top: 14px;
        }
        .ci-sc {
          padding: 14px 8px; text-align: center;
          border-right: 1px solid #f1f5f9;
        }
        .ci-sc:last-child { border-right: none; }
        .ci-sn {
          display: block;
          font-family: 'Syne', sans-serif;
          font-size: 18px; font-weight: 700; color: #0a1628;
          letter-spacing: -.02em;
        }
        .ci-sl {
          font-size: 10px; color: #94a3b8; font-weight: 600;
          letter-spacing: .07em; text-transform: uppercase; margin-top: 2px;
          display: block;
        }

        /* ── Animations ── */
        @keyframes ciFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ci-fa  { animation: ciFadeUp .4s ease both; }
        .ci-fa1 { animation-delay: .04s; }
        .ci-fa2 { animation-delay: .1s; }
        .ci-fa3 { animation-delay: .17s; }
        .ci-fa4 { animation-delay: .24s; }
      `}</style>

      {/* Tabler icons CDN */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
      />

      <Box className="ci-root" ml={{ base: 0, md: '20px' }}>
        <div className="ci-blob-a" />
        <div className="ci-blob-b" />

        <div className="ci-wrap">
          <Container maxW="620px" mx="auto">

            {/* ── Header ── */}
            <div className="ci-fa" style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="ci-eyebrow" style={{ display: 'inline-flex' }}>
                <span className="ci-pulse" />
                Credit Engine &nbsp;·&nbsp; Customer Intelligence
              </div>
              <h1 className="ci-title">
                Identify by{' '}
                <span className="ci-title-accent">Profession</span>
              </h1>
              <p className="ci-sub">
                Choose a profession from the dropdown, then search by mobile, email, PAN or registration number
              </p>
            </div>

            {/* ── Main card ── */}
            <div className="ci-main-card ci-fa ci-fa1">

              {/* Section label */}
              <div style={{
                fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em',
                textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px',
              }}>
                Select profession &amp; enter identifier
              </div>

              {/* Search row: dropdown + input */}
              <div className="ci-search-row">

                {/* ── Custom Dropdown ── */}
                <div className="ci-dd-wrap" ref={dropdownRef}>
                  <button
                    type="button"
                    ref={triggerRef}
                    className={`ci-dd-trigger${dropdownOpen ? ' ci-dd-open' : ''}`}
                    onClick={() => {
                      if (!dropdownOpen && triggerRef.current) {
                        const r = triggerRef.current.getBoundingClientRect()
                        setDropdownRect({ top: r.bottom + 6, left: r.left, width: r.width + 30 })
                      }
                      setDropdownOpen((v) => !v)
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                  >
                    <div
                      className="ci-dd-icon"
                      style={{ background: selected.iconBg, color: selected.iconColor }}
                    >
                      <i className={`ti ${selected.tablerIcon}`} aria-hidden="true" />
                    </div>
                    <div className="ci-dd-text">
                      <div className="ci-dd-label">{selected.label}</div>
                      <div className="ci-dd-desc">{selected.desc}</div>
                    </div>
                    <svg
                      className="ci-dd-caret"
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {dropdownOpen && dropdownRect && typeof document !== 'undefined' && ReactDOM.createPortal(
                    <div
                      className="ci-dd-panel"
                      role="listbox"
                      style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
                    >
                      <div className="ci-dd-list">
                        {PROFESSIONS.map((prof) => {
                          const isActive = selected.label === prof.label
                          const isAllProf = prof.label === 'All Profession'
                          return (
                            <button
                              key={prof.label}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              className={[
                                'ci-dd-item',
                                isActive ? 'ci-dd-active' : '',
                                isActive && isAllProf ? 'ci-dd-allactive' : '',
                              ].filter(Boolean).join(' ')}
                              onClick={() => handleSelect(prof)}
                            >
                              <div
                                className="ci-dd-ico"
                                style={{ background: prof.iconBg, color: prof.iconColor }}
                              >
                                <i className={`ti ${prof.tablerIcon}`} aria-hidden="true" />
                              </div>
                              <span className="ci-dd-iname">{prof.label}</span>
                              <span className="ci-dd-idesc">{prof.desc}</span>
                              {isActive && (
                                <div className="ci-dd-tick" aria-hidden="true">
                                  <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
                                    <polyline
                                      points="1.5,4.5 3.5,7 7.5,2.5"
                                      stroke="#fff"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* ── Text input ── */}
                <div className="ci-inp-wrap">
                  <svg
                    className="ci-inp-ico"
                    width="17" height="17"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className={`ci-inp${inputError ? ' ci-err' : ''}`}
                    placeholder={selected.placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    aria-label="Search identifier"
                  />
                </div>
              </div>

              {/* Hints */}
              <div className="ci-hints">
                <span className="ci-hints-lbl">Accepts:</span>
                {selected.hints.map((hint, i) => (
                  <span key={hint} className="ci-chip">
                    {HINT_ICONS[i]} {hint}
                  </span>
                ))}
              </div>

              {/* Submit */}
              <button
                type="button"
                className="ci-btn"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="ci-spinner" aria-hidden="true" />
                    Searching…
                  </>
                ) : (
                  <>
                    {btnLabel}
                    <svg
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>

              {/* Divider + note */}
              <div className="ci-divider" />
              <div className="ci-note">
                <svg
                  width="11" height="11" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                All lookups are encrypted, audit-logged and role-access controlled
              </div>
            </div>

            {/* ── Stats strip ── */}
            <div className="ci-strip ci-fa ci-fa2">
              {[
                { n: '4.8M+', l: 'Entities' },
                { n: '11',    l: 'Professions' },
                { n: '99.97%',l: 'Accuracy' },
                { n: '360°',  l: 'Credit view' },
              ].map((s) => (
                <div key={s.l} className="ci-sc">
                  <span className="ci-sn">{s.n}</span>
                  <span className="ci-sl">{s.l}</span>
                </div>
              ))}
            </div>

          </Container>
        </div>
      </Box>
    </>
  )
}