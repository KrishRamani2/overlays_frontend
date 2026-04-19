import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import './DownloadReportModal.css'

export default function DownloadReportModal({ brands, onClose, onDownload }) {
  const [tier, setTier] = useState('All')
  const [brand, setBrand] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fileType, setFileType] = useState('CSV')
  const [locked, setLocked] = useState(true)
  const [password, setPassword] = useState('')

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let pwd = ""
    for(let i=0; i<12; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(pwd)
  }

  useEffect(() => {
    if (locked && !password) {
      generatePassword()
    }
  }, [locked, password])

  const handleDownload = () => {
    onDownload({ tier, brand, startDate, endDate, fileType, locked, password })
    onClose()
  }

  return (
    <div className="drm-overlay" onClick={onClose}>
      <div className="drm-modal" onClick={e => e.stopPropagation()}>
        
        <div className="drm-header">
          <div>
            <div className="drm-eyebrow">Export Options</div>
            <h2 className="drm-title">Download <em>Report</em></h2>
          </div>
          <button className="drm-close" onClick={onClose}>✕</button>
        </div>

        <div className="drm-section">
            <div className="drm-field-group">
                <div className="drm-field">
                    <label className="drm-label">Filter by Tier</label>
                    <select className="drm-select" value={tier} onChange={e => setTier(e.target.value)}>
                        <option value="All">All Tiers</option>
                        <option value="Tier 1">Tier 1</option>
                        <option value="Tier 2">Tier 2</option>
                        <option value="Tier 3">Tier 3</option>
                        <option value="Tier 4">Tier 4</option>
                        <option value="Tier 5">Tier 5</option>
                    </select>
                </div>
                <div className="drm-field">
                    <label className="drm-label">Filter by Brand</label>
                    <select className="drm-select" value={brand} onChange={e => setBrand(e.target.value)}>
                        <option value="All">All Brands</option>
                        {brands.map(b => (
                            <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="drm-field-group">
                <div className="drm-field">
                    <label className="drm-label">Start Date</label>
                    <input type="date" className="drm-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="drm-field">
                    <label className="drm-label">End Date</label>
                    <input type="date" className="drm-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>
        </div>

        <div className="drm-divider" />

        <div className="drm-section">
            <div className="drm-section-label">File Type</div>
            <div className="drm-type-grid">
                {['CSV', 'XLSX', 'PDF', 'JSON'].map(type => (
                    <button 
                        key={type} 
                        className={`drm-type-card ${fileType === type ? 'active' : ''}`}
                        onClick={() => setFileType(type)}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>

        <div className="drm-section">
            <div className="drm-lock-section">
                <div className="drm-toggle-row">
                    <div className="drm-lock-info">
                        <span className="drm-lock-title">Password Protect File</span>
                        <span className="drm-lock-desc">Encrypt report with an auto-generated password.</span>
                    </div>
                    <button className={`drm-toggle ${locked ? 'on' : ''}`} onClick={() => setLocked(!locked)}>
                        <span className="drm-toggle-knob" />
                    </button>
                </div>
                
                {locked && (
                    <div className="drm-password-box">
                        <span className="drm-password">{password}</span>
                        <button className="drm-copy-btn" onClick={() => {
                            navigator.clipboard.writeText(password)
                            toast.success("Password copied to clipboard")
                        }}>Copy</button>
                    </div>
                )}
            </div>
        </div>

        <div className="drm-actions">
          <button className="drm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="drm-btn-primary" onClick={handleDownload}>Generate Report</button>
        </div>

      </div>
    </div>
  )
}
