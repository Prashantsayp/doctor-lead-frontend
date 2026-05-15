'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuDivider,
  MenuList,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'

// ─────────────────────────────────────────────────────────────
// LOGIC — 100% UNCHANGED FROM ORIGINAL
// ─────────────────────────────────────────────────────────────

const MOBILE_REGEX = /^[6-9]\d{9}$/
const PAN_REGEX    = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const REG_REGEX    = /^[A-Z0-9][A-Z0-9\/\-\s]{2,20}[A-Z0-9]$/i
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AADHAR_REGEX = /^\d{12}$/

type MultiSelectProps = {
  label: string
  placeholder?: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  isDisabled?: boolean
}

function MultiSelect({
  label,
  placeholder = 'Select',
  options,
  value,
  onChange,
  isDisabled = false,
}: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (isDisabled) return
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt))
    else onChange([...value, opt])
  }
  const display =
    value.length === 0
      ? placeholder
      : value.length <= 2
      ? value.join(', ')
      : `${value.length} selected`

  return (
    <Box>
      <div style={S.flbl}>
        {label}
      </div>
      <Menu closeOnSelect={false}>
        <MenuButton
          as={Button}
          rightIcon={<Box as="span" fontSize="12px">▼</Box>}
          variant="outline"
          w="100%"
          justifyContent="space-between"
          fontWeight="500"
          bg="white"
          borderColor="gray.200"
          _hover={{ borderColor: 'gray.300' }}
          _active={{ bg: 'white' }}
          isDisabled={isDisabled}
          style={S.multiBtn}
        >
          <Text color={value.length ? 'gray.800' : 'gray.400'} noOfLines={1} fontSize="14px">
            {display}
          </Text>
        </MenuButton>
        <MenuList p={2} minW="260px" maxH="240px" overflowY="auto" borderColor="gray.200">
          <Text px={2} py={1} fontSize="xs" color="gray.500">Choose multiple</Text>
          <MenuDivider />
          <Stack spacing={1} p={1}>
            {options.map((opt) => {
              const sel = value.includes(opt)
              return (
                <Box
                  key={opt} px={2} py={2} borderRadius="md"
                  _hover={{ bg: 'gray.50' }} cursor="pointer"
                  onClick={() => toggle(opt)}
                >
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight={sel ? '600' : '400'}>{opt}</Text>
                    <Text fontSize="sm" color={sel ? 'blue.600' : 'gray.300'}>{sel ? '✓' : ''}</Text>
                  </HStack>
                </Box>
              )
            })}
          </Stack>
          <MenuDivider />
          <HStack px={2} pt={2} justify="space-between">
            <Button size="sm" variant="ghost" onClick={() => onChange([])} isDisabled={isDisabled}>Clear</Button>
            <Text fontSize="xs" color="gray.500">{value.length} selected</Text>
          </HStack>
        </MenuList>
      </Menu>
    </Box>
  )
}

type DetectMode = 'mobile' | 'email' | 'reg'
type ProfessionType =
  | 'DOCTOR' | 'CA' | 'LAWYER' | 'SALARIED' | 'BUSINESSMAN'
  | 'COMPANY_SECRETARY' | 'COST_ACCOUNTANT' | 'REALTOR' | 'BROKER'
  | 'CHANNEL_PARTNER' | ''

type ExistsState = {
  checking: boolean
  exists: boolean
  matchedFields: string[]
  existingId?: string
  existingName?: string
  error?: string
}

type ValidationErrors = {
  profession?: string
  fullName?: string
  registrationNumber?: string
  panNumber?: string
  aadharNumber?: string
  mobileNumber?: string
  email?: string
  cityOrPinCode?: string
  yearsOfPractice?: string
}

function normalizePrefill(mode: DetectMode, qRaw: string) {
  const q = String(qRaw || '').trim()
  if (!q) return ''
  if (mode === 'reg')   return q.toUpperCase().replace(/\s+/g, ' ').trim()
  if (mode === 'email') return q.toLowerCase()
  return onlyDigits(q).slice(-10)
}

function onlyDigits(s: string) {
  return String(s || '').replace(/\D/g, '')
}

function normalizeMobileInput(s: string) {
  let digits = onlyDigits(s)
  if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2)
  return digits.slice(0, 10)
}

async function checkLeadExists(params: {
  profession?: string
  registrationNumber?: string
  panNumber?: string
  mobileNumber?: string
  aadharNumber?: string
  email?: string
}) {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_URL missing')
  const url = new URL(`${base}/doctor-lead/exists`)
  if (params.profession)        url.searchParams.set('profession',        params.profession)
  if (params.mobileNumber)      url.searchParams.set('mobileNumber',      params.mobileNumber)
  if (params.registrationNumber)url.searchParams.set('registrationNumber',params.registrationNumber)
  if (params.panNumber)         url.searchParams.set('panNumber',         params.panNumber)
  if (params.aadharNumber)      url.searchParams.set('aadharNumber',      params.aadharNumber)
  if (params.email)             url.searchParams.set('email',             params.email)
  const res  = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Exists check failed')
  return {
    exists:        Boolean(data?.exists),
    matchedFields: Array.isArray(data?.matchedOn)     ? data.matchedOn
                 : Array.isArray(data?.matchedFields) ? data.matchedFields : [],
    existingId:   data?.leadId   || data?.existingId,
    existingName: data?.fullName || data?.existingName,
  }
}

const PROFESSION_OPTIONS = [
  { label: 'Doctor',            value: 'DOCTOR'            },
  { label: 'CA',                value: 'CA'                },
  { label: 'Lawyer',            value: 'LAWYER'            },
  { label: 'Salaried',          value: 'SALARIED'          },
  { label: 'Businessman',       value: 'BUSINESSMAN'       },
  { label: 'Company Secretary', value: 'COMPANY_SECRETARY' },
  { label: 'Cost Accountant',   value: 'COST_ACCOUNTANT'   },
  { label: 'Realtor',           value: 'REALTOR'           },
  { label: 'Broker',            value: 'BROKER'            },
  { label: 'Channel Partner',   value: 'CHANNEL_PARTNER'   },
]

const PROFESSION_CONFIG: Record<
  Exclude<ProfessionType, ''>,
  { title: string; qualificationOptions: string[]; practiceOptions: string[]; registrationLabel: string; registrationPlaceholder: string }
> = {
  DOCTOR:           { title: 'New Doctor Lead',            qualificationOptions: ['DM','MD','MS','DNB','MDS','MBBS','BDS','BHMS','BAMS','Other'],            practiceOptions: ['Private Clinic','Hospital','Govt Hospital','Polyclinic','Nursing Home','Diagnostic Center','Consultant','Other'], registrationLabel: 'Registration Number',        registrationPlaceholder: 'MCI-12345 / UP-889900'  },
  CA:               { title: 'New CA Lead',                qualificationOptions: ['CA','CS','CMA','B.Com','M.Com','MBA','Other'],                             practiceOptions: ['Individual Practice','CA Firm','Audit Firm','Consultant','In-house Finance','Other'],                          registrationLabel: 'Membership Number',          registrationPlaceholder: 'ICAI Membership No.'    },
  LAWYER:           { title: 'New Lawyer Lead',            qualificationOptions: ['LLB','LLM','BA LLB','BBA LLB','Other'],                                   practiceOptions: ['Independent Practice','Law Firm','Corporate Legal','High Court','District Court','Other'],                    registrationLabel: 'Bar Council Number',         registrationPlaceholder: 'Bar Council Reg. No.'   },
  SALARIED:         { title: 'New Salaried Lead',          qualificationOptions: ['Graduate','Post Graduate','Diploma','Other'],                              practiceOptions: ['Private Job','Govt Job','Contract','Other'],                                                                   registrationLabel: 'Employee ID (Optional)',      registrationPlaceholder: 'Employee ID'             },
  BUSINESSMAN:      { title: 'New Business Lead',          qualificationOptions: ['Graduate','MBA','Other'],                                                  practiceOptions: ['Proprietor','Partnership','Pvt Ltd','Other'],                                                                  registrationLabel: 'Business Reg. Number',       registrationPlaceholder: 'GST / UDYAM / Shop Act'  },
  COMPANY_SECRETARY:{ title: 'New Company Secretary Lead', qualificationOptions: ['CS','B.Com','M.Com','LLB','Other'],                                        practiceOptions: ['Practice','Company Job','Consultant','Other'],                                                                 registrationLabel: 'ICSI Membership Number',     registrationPlaceholder: 'ICSI Membership No.'    },
  COST_ACCOUNTANT:  { title: 'New Cost Accountant Lead',   qualificationOptions: ['CMA','B.Com','M.Com','MBA','Other'],                                       practiceOptions: ['Practice','Company Job','Consultant','Other'],                                                                 registrationLabel: 'CMA Membership Number',      registrationPlaceholder: 'CMA Membership No.'     },
  REALTOR:          { title: 'New Realtor Lead',           qualificationOptions: ['Graduate','Other'],                                                        practiceOptions: ['Broker','Builder','Agent','Other'],                                                                            registrationLabel: 'RERA Registration Number',   registrationPlaceholder: 'RERA Number'             },
  BROKER:           { title: 'New Broker Lead',            qualificationOptions: ['Graduate','Other'],                                                        practiceOptions: ['Loan Broker','Insurance Broker','Other'],                                                                      registrationLabel: 'Registration Number',        registrationPlaceholder: 'Enter Registration Number'},
  CHANNEL_PARTNER:  { title: 'New Channel Partner Lead',   qualificationOptions: ['Graduate','Other'],                                                        practiceOptions: ['DSA','Connector','Referral Partner','Other'],                                                                  registrationLabel: 'Partner Code',               registrationPlaceholder: 'Partner Code'            },
}

// ─────────────────────────────────────────────────────────────
// STYLE CONSTANTS (no logic, pure UI tokens)
// ─────────────────────────────────────────────────────────────

const S = {
  // page
  root: {
    fontFamily: "'DM Sans',sans-serif",
    background: '#f0f4f8',
    minHeight: '100vh',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  blob: {
    position: 'absolute' as const,
    top: '-80px', right: '-60px',
    width: '340px', height: '340px',
    background: 'radial-gradient(circle,rgba(24,95,165,.09) 0%,transparent 68%)',
    borderRadius: '50%',
    pointerEvents: 'none' as const,
  },
  wrap: {
    maxWidth: '780px',
    margin: '0 auto',
    position: 'relative' as const,
    zIndex: 1,
    padding: '32px 20px 56px',
  },
  // card
  card: (mb = '14px'): React.CSSProperties => ({
    background: '#fff',
    border: '1px solid rgba(10,37,64,.07)',
    borderRadius: '18px',
    padding: '22px',
    marginBottom: mb,
    position: 'relative',
    overflow: 'hidden',
  }),
  cardBar: (bg: string): React.CSSProperties => ({
    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
    background: bg, borderRadius: '18px 18px 0 0',
  }),
  cardHdr: { display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' } as React.CSSProperties,
  cardIco: (bg: string, color: string): React.CSSProperties => ({
    width: '32px', height: '32px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color, fontSize: '16px', flexShrink: 0,
  }),
  cardLbl: { fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748b' } as React.CSSProperties,
  // grid
  fgrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' } as React.CSSProperties,
  span2: { gridColumn: '1/-1' } as React.CSSProperties,
  // label
  flbl: { fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' } as React.CSSProperties,
  req: { color: '#e24b4a' } as React.CSSProperties,
  // inputs
  inp: (err?: boolean, ok?: boolean): React.CSSProperties => ({
    width: '100%', padding: '11px 13px', fontSize: '14px',
    color: '#0a2540',
    background: err ? '#fff9f9' : ok ? '#f7fcf3' : '#f8fafc',
    border: `1.5px solid ${err ? '#e24b4a' : ok ? '#3b6d11' : '#e2e8f0'}`,
    borderRadius: '10px', outline: 'none', fontFamily: 'inherit',
    boxShadow: err ? '0 0 0 3px rgba(226,75,74,.08)' : ok ? '0 0 0 3px rgba(59,109,17,.08)' : 'none',
    transition: 'all .18s',
  }),
  sel: {
    width: '100%', padding: '11px 34px 11px 13px', fontSize: '14px',
    color: '#0a2540',
    background: `#f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 11px center`,
    border: '1.5px solid #e2e8f0', borderRadius: '10px', outline: 'none',
    appearance: 'none' as any, fontFamily: 'inherit', transition: 'all .18s', cursor: 'pointer',
  },
  multiBtn: { height: '42px', borderRadius: '10px', fontSize: '14px' },
  ferr: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#a32d2d', marginTop: '3px' } as React.CSSProperties,
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS (UI only, zero logic)
// ─────────────────────────────────────────────────────────────

function SectionCard({ children, topBg, iconBg, iconColor, iconClass, title, right }: {
  children: React.ReactNode
  topBg: string
  iconBg: string
  iconColor: string
  iconClass: string
  title: string
  right?: React.ReactNode
}) {
  return (
    <div style={S.card()}>
      <div style={S.cardBar(topBg)} />
      <div style={S.cardHdr}>
        <div style={S.cardIco(iconBg, iconColor)}>
          <i className={`ti ${iconClass}`} aria-hidden="true" />
        </div>
        <span style={S.cardLbl}>{title}</span>
        {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
      </div>
      {children}
    </div>
  )
}

function FL({ icon, children, required }: { icon: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={S.flbl}>
      <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: '12px', color: '#94a3b8' }} />
      {children}
      {required && <span style={S.req}>*</span>}
    </div>
  )
}

function FErr({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div style={S.ferr}>
      <i className="ti ti-alert-circle" aria-hidden="true" style={{ fontSize: '12px' }} />
      {msg}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────

export default function NewDoctorLeadPage() {
  const toast        = useToast()
  const router       = useRouter()
  const searchParams = useSearchParams()

  // ── STATE (unchanged) ──────────────────────────────────────
  const [profession,        setProfession]        = React.useState<ProfessionType>('DOCTOR')
  const [fullName,          setFullName]          = React.useState('')
  const [isFromOms,         setIsFromOms]         = React.useState(false)
  const [registrationNumber,setRegistrationNumber]= React.useState('')
  const [panNumber,         setPanNumber]         = React.useState('')
  const [aadharNumber,      setAadharNumber]      = React.useState('')
  const [mobileNumber,      setMobileNumber]      = React.useState('')
  const [email,             setEmail]             = React.useState('')
  const [cityOrPinCode,     setCityOrPinCode]     = React.useState('')
  const [yearsOfPractice,   setYearsOfPractice]   = React.useState('')
  const [qualification,     setQualification]     = React.useState<string[]>([])
  const [practiceType,      setPracticeType]      = React.useState<string[]>([])
  const [loading,           setLoading]           = React.useState(false)
  const [touched,           setTouched]           = React.useState<Record<string, boolean>>({})
  const [errors,            setErrors]            = React.useState<ValidationErrors>({})
  const [existsState,       setExistsState]       = React.useState<ExistsState>({ checking: false, exists: false, matchedFields: [] })

  // query params — for "not found" banner
  const rawQ    = searchParams?.get('q') || ''
  const rawMode = (searchParams?.get('mode') || '') as DetectMode

  const selectedConfig =
    profession && PROFESSION_CONFIG[profession as Exclude<ProfessionType, ''>]
      ? PROFESSION_CONFIG[profession as Exclude<ProfessionType, ''>]
      : { title: 'New Professional Lead', qualificationOptions: [], practiceOptions: [], registrationLabel: 'Registration Number', registrationPlaceholder: 'Enter registration number' }

  const markTouched = (f: keyof ValidationErrors) => setTouched((p) => ({ ...p, [f]: true }))

  // ── VALIDATE (unchanged) ───────────────────────────────────
  const validateForm = React.useCallback((): ValidationErrors => {
    const e: ValidationErrors = {}
    const mob  = normalizeMobileInput(mobileNumber.trim())
    const pan  = panNumber.trim().toUpperCase()
    const reg  = registrationNumber.trim().toUpperCase()
    const aad  = onlyDigits(aadharNumber.trim())
    const mail = email.trim().toLowerCase()
    const city = cityOrPinCode.trim()
    const yop  = yearsOfPractice.trim()

    if (!profession)           e.profession     = 'Please select profession'
    if (!fullName.trim())      e.fullName       = 'Full name is required'
    if (!city)                 e.cityOrPinCode  = 'City / Pin Code is required'
    if (!mob)                  e.mobileNumber   = 'Mobile number is required'
    else if (!MOBILE_REGEX.test(mob)) e.mobileNumber = 'Enter valid 10 digit mobile number'
    if (!mail)                 e.email          = 'Email is required'
    else if (!EMAIL_REGEX.test(mail)) e.email   = 'Enter valid email address'
    if (reg && !REG_REGEX.test(reg))  e.registrationNumber = 'Enter valid registration number'
    if (pan && !PAN_REGEX.test(pan))  e.panNumber = 'PAN format should be ABCDE1234F'
    if (aad && !AADHAR_REGEX.test(aad)) e.aadharNumber = 'Aadhar must be 12 digits'
    if (yop) { const n = Number(yop); if (!Number.isFinite(n) || n < 0) e.yearsOfPractice = 'Must be 0 or more' }
    return e
  }, [profession, fullName, registrationNumber, panNumber, aadharNumber, mobileNumber, email, cityOrPinCode, yearsOfPractice])

  React.useEffect(() => { setErrors(validateForm()) }, [validateForm])

  // ── PREFILL (unchanged) ────────────────────────────────────
  React.useEffect(() => {
    if (!searchParams) return
    const mode = (searchParams.get('mode') || '') as DetectMode
    const q    = searchParams.get('q') || ''
    const prof = (searchParams.get('profession') || '').toUpperCase()
    if (prof && ['DOCTOR','CA','LAWYER','ENGINEER'].includes(prof)) setProfession(prof as ProfessionType)
    if (!q || !['mobile','email','reg'].includes(mode)) return
    const v = normalizePrefill(mode, q)
    if (mode === 'mobile') setMobileNumber(v)
    if (mode === 'email')  setEmail(v)
    if (mode === 'reg')    setRegistrationNumber(v)
  }, [searchParams])

  // ── OMS FETCH (unchanged) ──────────────────────────────────
  React.useEffect(() => {
    const fetchOmsData = async () => {
      if (!searchParams) return
      const q = searchParams.get('q')
      try {
        const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/get-lead?search=${q}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.source === 'OMS' && data.items?.length > 0) {
          const lead = data.items[0]
          setFullName(lead.fullName || '')
          setMobileNumber(lead.mobileNumber || '')
          setCityOrPinCode(lead.cityOrPinCode || '')
          setIsFromOms(true)
        }
      } catch (err) { console.error('OMS fetch error', err) }
    }
    fetchOmsData()
  }, [searchParams])

  // ── RESET ON PROFESSION CHANGE (unchanged) ─────────────────
  React.useEffect(() => {
    setQualification([])
    setPracticeType([])
    setRegistrationNumber('')
    setExistsState({ checking: false, exists: false, matchedFields: [] })
    setTouched({})
  }, [profession])

  // ── DUPLICATE CHECK (unchanged) ────────────────────────────
  React.useEffect(() => {
    const reg  = registrationNumber.trim().toUpperCase()
    const pan  = panNumber.trim().toUpperCase()
    const mob  = normalizeMobileInput(mobileNumber.trim())
    const aad  = onlyDigits(aadharNumber.trim())
    const mail = email.trim().toLowerCase()

    if (!profession || (!reg && !pan && !mob && !aad && !mail)) {
      setExistsState({ checking: false, exists: false, matchedFields: [] }); return
    }
    const cMob  = mob  ? MOBILE_REGEX.test(mob)  : false
    const cAad  = aad  ? AADHAR_REGEX.test(aad)  : false
    const cPan  = pan  ? PAN_REGEX.test(pan)      : false
    const cReg  = reg  ? REG_REGEX.test(reg)      : false
    const cMail = mail ? EMAIL_REGEX.test(mail)   : false

    if (!(cMob || cAad || cPan || cReg || cMail)) {
      setExistsState((s) => ({ ...s, exists: false, matchedFields: [], error: undefined, checking: false })); return
    }
    const t = setTimeout(async () => {
      try {
        setExistsState((s) => ({ ...s, checking: true, error: undefined }))
        const result = await checkLeadExists({
          profession,
          registrationNumber: cReg  ? reg  : undefined,
          panNumber:          cPan  ? pan  : undefined,
          mobileNumber:       cMob  ? mob  : undefined,
          aadharNumber:       cAad  ? aad  : undefined,
          email:              cMail ? mail : undefined,
        })
        setExistsState({ checking: false, ...result })
      } catch (e: any) {
        setExistsState({ checking: false, exists: false, matchedFields: [], error: e?.message || 'Error' })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [profession, registrationNumber, panNumber, mobileNumber, aadharNumber, email])

  // ── RESET FORM (unchanged) ─────────────────────────────────
  const resetForm = () => {
    setFullName(''); setRegistrationNumber(''); setPanNumber('')
    setAadharNumber(''); setMobileNumber(''); setEmail('')
    setCityOrPinCode(''); setYearsOfPractice('')
    setQualification([]); setPracticeType([])
    setTouched({}); setErrors({})
    setExistsState({ checking: false, exists: false, matchedFields: [] })
  }

  // ── SUBMIT (unchanged) ─────────────────────────────────────
  const handleSubmit = async () => {
    const nextErrors = validateForm()
    setErrors(nextErrors)
    setTouched({ profession:true, fullName:true, registrationNumber:true, panNumber:true, aadharNumber:true, mobileNumber:true, email:true, cityOrPinCode:true, yearsOfPractice:true })

    if (Object.keys(nextErrors).length > 0) {
      toast({ title: 'Please fix highlighted fields', status: 'warning' }); return
    }
    if (existsState.checking) {
      toast({ title: 'Please wait', description: 'Checking duplicate…', status: 'info' }); return
    }
    if (existsState.exists) {
      toast({ title: 'Duplicate Found', description: `Already exists for: ${existsState.matchedFields.join(', ')}`, status: 'error' }); return
    }

    const payload: any = {
      profession,
      fullName: fullName.trim(),
      mobileNumber: normalizeMobileInput(mobileNumber.trim()),
      email: email.trim().toLowerCase(),
      cityOrPinCode: cityOrPinCode.trim(),
      yearsOfPractice: yearsOfPractice ? Number(yearsOfPractice) : undefined,
      qualification,
      practiceType,
    }
    const reg = registrationNumber.trim().toUpperCase()
    const pan = panNumber.trim().toUpperCase()
    const aad = onlyDigits(aadharNumber.trim())
    if (reg) payload.registrationNumber = reg
    if (pan) payload.panNumber = pan
    if (aad) payload.aadharNumber = aad

    setLoading(true)
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Create lead failed', description: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Error', status: 'error' })
        return
      }
      toast({ title: 'Lead created successfully', status: 'success' })
      resetForm()
    } catch {
      toast({ title: 'Server error', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const createDisabled = loading || existsState.checking || existsState.exists || Object.keys(errors).length > 0

  // ── DERIVED UI ─────────────────────────────────────────────
  const modeIconMap: Record<string, string> = { mobile: 'ti-device-mobile', email: 'ti-mail', reg: 'ti-hash' }
  const statusSlot = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: existsState.checking ? '#854f0b' : existsState.exists ? '#a32d2d' : '#3b6d11',
        animation: existsState.checking ? 'nlBlink 1s ease-in-out infinite' : 'none',
      }} />
      <span style={{
        fontSize: '11px', fontWeight: 700,
        color: existsState.checking ? '#412402' : existsState.exists ? '#791f1f' : '#27500a',
      }}>
        {existsState.checking ? 'Checking…' : existsState.exists ? 'Duplicate' : 'Unique lead'}
      </span>
    </div>
  )

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes nlUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes nlBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes nlSpin  { to{transform:rotate(360deg)} }
        .nl-fa  { animation:nlUp .35s ease both; }
        .nl-d1  { animation-delay:.04s; }
        .nl-d2  { animation-delay:.08s; }
        .nl-d3  { animation-delay:.12s; }
        .nl-d4  { animation-delay:.16s; }
        .nl-d5  { animation-delay:.20s; }
        .nl-d6  { animation-delay:.24s; }
        .nl-inp { transition:border-color .18s,box-shadow .18s,background .18s; }
        .nl-inp:focus { border-color:#185fa5 !important; background:#fff !important; box-shadow:0 0 0 3px rgba(24,95,165,.1) !important; outline:none; }
        .nl-sel:focus  { border-color:#185fa5; box-shadow:0 0 0 3px rgba(24,95,165,.1); outline:none; }
        .nl-back:hover { background:#b5d4f4 !important; }
        .nl-submit:hover:not([disabled]) { background:#0c447c !important; transform:translateY(-1px); }
        .nl-submit.dup:hover:not([disabled]) { background:#500000 !important; }
        .nl-dup-link:hover { opacity:.85; }
        .nl-spinner { display:inline-block; width:17px; height:17px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:nlSpin .65s linear infinite; }
        @media(max-width:600px) { .nl-fgrid { grid-template-columns:1fr !important; } .nl-span2 { grid-column:1 !important; } }
      `}</style>

      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />

      <div style={{ ...S.root, backgroundImage: 'linear-gradient(rgba(24,95,165,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(24,95,165,.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }}>
        <div style={S.blob} />

        <div style={S.wrap}>

          {/* ── BACK + BREADCRUMB ─────────────────────────── */}
          <div className="nl-fa" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              className="nl-back"
              onClick={() => router.back()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#185fa5', background: '#e6f1fb', border: '1px solid #b5d4f4', padding: '6px 12px', borderRadius: '100px', cursor: 'pointer', transition: 'background .15s' }}
            >
              <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: '14px' }} />
              Back to search
            </button>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>/</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>New lead</span>
          </div>

          {/* ── NOT-FOUND CONTEXT BANNER ──────────────────── */}
          {rawQ && (
            <div className="nl-fa nl-d1" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #185fa5', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px' }}>
              <div style={{ width: '38px', height: '38px', background: '#e6f1fb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#185fa5', fontSize: '18px', flexShrink: 0 }}>
                <i className="ti ti-search-off" aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a2540', marginBottom: '3px' }}>
                  No record found for{' '}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#185fa5', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', marginLeft: '2px' }}>
                    <i className={`ti ${modeIconMap[rawMode] || 'ti-search'}`} aria-hidden="true" style={{ fontSize: '11px' }} />
                    {rawQ}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Create a new lead below — it will be saved to Credit Engine instantly
                </div>
              </div>
            </div>
          )}

          {/* ── PAGE TITLE ROW ────────────────────────────── */}
          <div className="nl-fa nl-d1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            <h1 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(1.3rem,3vw,1.75rem)', fontWeight: 700, color: '#0a2540', letterSpacing: '-.022em', lineHeight: 1.15, margin: 0 }}>
              {selectedConfig.title.replace(/New |Lead/g, '').trim()
                ? <>Create <em style={{ fontStyle: 'italic', color: '#185fa5' }}>{selectedConfig.title}</em></>
                : <>Create <em style={{ fontStyle: 'italic', color: '#185fa5' }}>New Lead</em></>
              }
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#e6f1fb', border: '1px solid #b5d4f4', color: '#185fa5', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '100px', letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              <i className="ti ti-circle-number-1" aria-hidden="true" style={{ fontSize: '13px' }} />
              Stage 1 — Basic profile
            </div>
          </div>

          {/* ── OMS BANNER ───────────────────────────────── */}
          {isFromOms && (
            <div className="nl-fa nl-d2" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#EAF3DE', border: '1px solid #C0DD97', color: '#27500a', fontSize: '12px', fontWeight: 600, padding: '8px 14px', borderRadius: '10px', marginBottom: '14px' }}>
              <i className="ti ti-database-import" aria-hidden="true" style={{ fontSize: '15px', color: '#3b6d11' }} />
              Data pre-filled from OMS — please verify before submitting
            </div>
          )}

          {/* ── DUPLICATE ALERT ───────────────────────────── */}
          {existsState.exists && (
            <div className="nl-fa nl-d2" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', background: '#F7C1C1', color: '#a32d2d', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                <i className="ti ti-alert-triangle" aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#791f1f', marginBottom: '2px' }}>
                  Lead already exists — {existsState.matchedFields.join(', ') || 'identity fields'}
                </div>
                {existsState.existingName && (
                  <div style={{ fontSize: '12px', color: '#a32d2d' }}>Existing: {existsState.existingName}</div>
                )}
                {existsState.existingId && (
                  <button
                    type="button"
                    className="nl-dup-link"
                    onClick={() => router.push(`/profession-lead/new?mode=mobile&q=${encodeURIComponent(mobileNumber || '')}`)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12px', fontWeight: 600, color: '#185fa5', background: '#e6f1fb', border: '1px solid #b5d4f4', padding: '3px 10px', borderRadius: '100px', cursor: 'pointer', transition: 'opacity .15s' }}
                  >
                    <i className="ti ti-external-link" aria-hidden="true" style={{ fontSize: '12px' }} />
                    Open existing profile
                  </button>
                )}
              </div>
            </div>
          )}

          {existsState.error && (
            <div className="nl-fa nl-d2" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FAEEDA', border: '1px solid #FAC775', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px' }}>
              <i className="ti ti-alert-circle" aria-hidden="true" style={{ fontSize: '16px', color: '#854f0b' }} />
              <span style={{ fontSize: '12px', color: '#412402' }}>{existsState.error}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SECTION 1 — PROFESSION & IDENTITY
          ══════════════════════════════════════════════ */}
          <div className="nl-fa nl-d2">
            <SectionCard
              topBg="linear-gradient(90deg,#185fa5,#378add)"
              iconBg="#e6f1fb" iconColor="#185fa5"
              iconClass="ti-id-badge"
              title="Profession & identity"
              right={statusSlot}
            >
              <div className="nl-fgrid" style={S.fgrid}>

                {/* Profession */}
                <div className="nl-span2" style={S.span2}>
                  <FL icon="ti-briefcase" required>Profession</FL>
                  <select
                    className="nl-sel nl-inp"
                    style={S.sel}
                    value={profession}
                    onChange={(e) => setProfession(e.target.value as ProfessionType)}
                    onBlur={() => markTouched('profession')}
                  >
                    {PROFESSION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <FErr msg={touched.profession ? errors.profession : undefined} />
                </div>

                {/* Full name */}
                <div>
                  <FL icon="ti-user" required>Full name</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.fullName && errors.fullName), !!(touched.fullName && !errors.fullName && fullName))}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => markTouched('fullName')}
                    placeholder="Enter full name"
                  />
                  <FErr msg={touched.fullName ? errors.fullName : undefined} />
                </div>

                {/* Qualification */}
                <div>
                  <MultiSelect
                    label="Qualification"
                    placeholder="Select qualification"
                    options={selectedConfig.qualificationOptions}
                    value={qualification}
                    onChange={setQualification}
                    isDisabled={loading}
                  />
                </div>

                {/* Registration number */}
                <div>
                  <FL icon="ti-hash">{selectedConfig.registrationLabel}</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.registrationNumber && errors.registrationNumber))}
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    onBlur={() => markTouched('registrationNumber')}
                    placeholder={selectedConfig.registrationPlaceholder}
                  />
                  <FErr msg={touched.registrationNumber ? errors.registrationNumber : undefined} />
                </div>

                {/* PAN */}
                <div>
                  <FL icon="ti-id-badge-2">PAN (optional)</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.panNumber && errors.panNumber))}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    onBlur={() => markTouched('panNumber')}
                    placeholder="ABCDE1234F"
                  />
                  <FErr msg={touched.panNumber ? errors.panNumber : undefined} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ══════════════════════════════════════════════
              SECTION 2 — CONTACT & IDENTITY NUMBERS
          ══════════════════════════════════════════════ */}
          <div className="nl-fa nl-d3">
            <SectionCard
              topBg="linear-gradient(90deg,#534ab7,#7f77dd)"
              iconBg="#EEEDFE" iconColor="#534ab7"
              iconClass="ti-phone"
              title="Contact & identity numbers"
            >
              <div className="nl-fgrid" style={S.fgrid}>

                {/* Mobile */}
                <div>
                  <FL icon="ti-device-mobile" required>Mobile number</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.mobileNumber && errors.mobileNumber), !!(touched.mobileNumber && !errors.mobileNumber && mobileNumber))}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(normalizeMobileInput(e.target.value))}
                    onBlur={() => markTouched('mobileNumber')}
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                    maxLength={10}
                  />
                  <FErr msg={touched.mobileNumber ? errors.mobileNumber : undefined} />
                </div>

                {/* Aadhar */}
                <div>
                  <FL icon="ti-fingerprint">Aadhar (optional)</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.aadharNumber && errors.aadharNumber))}
                    value={aadharNumber}
                    onChange={(e) => setAadharNumber(onlyDigits(e.target.value).slice(0, 12))}
                    onBlur={() => markTouched('aadharNumber')}
                    placeholder="12-digit Aadhar"
                    inputMode="numeric"
                    maxLength={12}
                  />
                  <FErr msg={touched.aadharNumber ? errors.aadharNumber : undefined} />
                </div>

                {/* Email */}
                <div>
                  <FL icon="ti-mail" required>Email ID</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.email && errors.email), !!(touched.email && !errors.email && email))}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => markTouched('email')}
                    placeholder="Enter email"
                  />
                  <FErr msg={touched.email ? errors.email : undefined} />
                </div>

                {/* City */}
                <div>
                  <FL icon="ti-map-pin" required>City / pin code</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.cityOrPinCode && errors.cityOrPinCode), !!(touched.cityOrPinCode && !errors.cityOrPinCode && cityOrPinCode))}
                    value={cityOrPinCode}
                    onChange={(e) => setCityOrPinCode(e.target.value)}
                    onBlur={() => markTouched('cityOrPinCode')}
                    placeholder="City or pin code"
                  />
                  <FErr msg={touched.cityOrPinCode ? errors.cityOrPinCode : undefined} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ══════════════════════════════════════════════
              SECTION 3 — PRACTICE DETAILS
          ══════════════════════════════════════════════ */}
          <div className="nl-fa nl-d4">
            <SectionCard
              topBg="linear-gradient(90deg,#0f6e56,#1d9e75)"
              iconBg="#E1F5EE" iconColor="#0f6e56"
              iconClass="ti-building-hospital"
              title="Practice details"
            >
              <div className="nl-fgrid" style={S.fgrid}>

                {/* Years */}
                <div>
                  <FL icon="ti-clock">Years of practice</FL>
                  <input
                    className="nl-inp"
                    style={S.inp(!!(touched.yearsOfPractice && errors.yearsOfPractice))}
                    value={yearsOfPractice}
                    onChange={(e) => setYearsOfPractice(onlyDigits(e.target.value))}
                    onBlur={() => markTouched('yearsOfPractice')}
                    placeholder="Enter years"
                    inputMode="numeric"
                  />
                  <FErr msg={touched.yearsOfPractice ? errors.yearsOfPractice : undefined} />
                </div>

                {/* Practice type */}
                <div>
                  <MultiSelect
                    label="Practice type"
                    placeholder="Select practice type"
                    options={selectedConfig.practiceOptions}
                    value={practiceType}
                    onChange={setPracticeType}
                    isDisabled={loading}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── SUBMIT ────────────────────────────────────── */}
          <div className="nl-fa nl-d5">
            <button
              type="button"
              className={`nl-submit${existsState.exists ? ' dup' : ''}`}
              onClick={handleSubmit}
              disabled={createDisabled}
              style={{
                width: '100%', padding: '14px 24px',
                fontSize: '15px', fontWeight: 700,
                color: '#fff',
                background: existsState.exists ? '#791f1f' : '#185fa5',
                border: 'none', borderRadius: '13px',
                cursor: createDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: 'inherit', letterSpacing: '.01em',
                opacity: createDisabled && !existsState.exists ? 0.55 : 1,
                transition: 'background .15s, transform .12s',
                marginTop: '4px',
              }}
            >
              {loading ? (
                <><span className="nl-spinner" /> Creating…</>
              ) : existsState.exists ? (
                <><i className="ti ti-ban" aria-hidden="true" style={{ fontSize: '17px' }} /> Duplicate found — cannot create</>
              ) : existsState.checking ? (
                <><i className="ti ti-loader" aria-hidden="true" style={{ fontSize: '17px' }} /> Checking for duplicates…</>
              ) : (
                <><i className="ti ti-user-plus" aria-hidden="true" style={{ fontSize: '17px' }} /> Create lead</>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}