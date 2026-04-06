'use client'

import { useEffect, useState } from 'react'

type Lead = {
  _id: string
  fullName: string
  mobileNumber: string
  cityOrPinCode?: string
  profession?: string
  leadStatus?: string
  createdAt?: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token')

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-lead`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      setLeads(data || [])
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  if (loading) return <div style={{ padding: 20 }}>Loading leads...</div>

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Leads</h1>

      <table width="100%" border={1} cellPadding={10} style={{ borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f5f5f5' }}>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>City</th>
            <th>Profession</th>
            <th>Status</th>
            <th>Created</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id}>
              <td>{lead.fullName}</td>
              <td>{lead.mobileNumber}</td>
              <td>{lead.cityOrPinCode || '-'}</td>
              <td>{lead.profession || '-'}</td>
              <td>{lead.leadStatus || 'NEW'}</td>
              <td>
                {lead.createdAt
                  ? new Date(lead.createdAt).toLocaleDateString()
                  : '-'}
              </td>
              <td>
                <a href={`/leads/${lead._id}`}>
                  <button>Open</button>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}