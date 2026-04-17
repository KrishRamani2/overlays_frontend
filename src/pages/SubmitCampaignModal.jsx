/* SubmitCampaignModal.jsx */
import { useState, useMemo } from 'react'
import './SubmitCampaignModal.css'

const TIER_INFO = [
  { id: 'Tier 1', label: 'Tier 1', desc: 'Top creators · 100K+ avg viewers',   multiplier: 3.0 },
  { id: 'Tier 2', label: 'Tier 2', desc: 'Rising stars · 20K–100K viewers',    multiplier: 1.8 },
  { id: 'Tier 3', label: 'Tier 3', desc: 'Mid-tier · 5K–20K viewers',          multiplier: 1.2 },
  { id: 'Tier 4', label: 'Tier 4', desc: 'Micro · 1K–5K viewers',              multiplier: 0.8 },
  { id: 'Tier 5', label: 'Tier 5', desc: 'Nano · up to 1K viewers',            multiplier: 0.5 },
]

const DURATION_OPTIONS = [
  { label: '3 days',   days: 3  },
  { label: '7 days',   days: 7  },
  { label: '14 days',  days: 14 },
  { label: '1 month',  days: 30 },
  { label: '3 months', days: 90 },
  { label: 'Custom',   days: 0  },
]

const BASE_DAILY_RATE = 1200 // ₹ per day per streamer (Tier 3 baseline)

export default function SubmitCampaignModal({ ads, campaignId, brandName, onConfirm, onClose }) {
  const [tier,        setTier]        = useState('Tier 3')
  const [exclusive,   setExclusive]   = useState(false)
  const [durationOpt, setDurationOpt] = useState(7)   // days
  const [customDays,  setCustomDays]  = useState(14)
  const [isCustom,    setIsCustom]    = useState(false)
  const [budgetMin,   setBudgetMin]   = useState(5000)
  const [budgetMax,   setBudgetMax]   = useState(20000)

  const days = isCustom ? customDays : durationOpt

  const tierInfo = TIER_INFO.find(t => t.id === tier)

  /* Estimated cost range — purely indicative */
  const estimate = useMemo(() => {
    const daily    = BASE_DAILY_RATE * (tierInfo?.multiplier || 1)
    const excMult  = exclusive ? 2.5 : 1
    const low      = Math.round(daily * days * excMult * 0.8)
    const high     = Math.round(daily * days * excMult * 1.3)
    return { low, high }
  }, [tier, exclusive, days, tierInfo])

  const handleConfirm = () => {
    if (!tier) { alert('Please select a streamer tier'); return }
    if (budgetMin > budgetMax) { alert('Min budget cannot exceed max budget'); return }
    if (days < 1) { alert('Duration must be at least 1 day'); return }
    onConfirm({ tier, exclusive, daysLive: days, budgetMin, budgetMax })
  }

  return (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="scm-header">
          <div>
            <div className="scm-eyebrow">Submit for review</div>
            <h2 className="scm-title">{campaignId}</h2>
            {brandName && <div className="scm-brand-chip">{brandName}</div>}
          </div>
          <button className="scm-close" onClick={onClose}>✕</button>
        </div>

        {/* Ad variants summary */}
        <div className="scm-section">
          <div className="scm-section-label">Ad variants</div>
          <div className="scm-variants-list">
            {ads.map((ad, i) => (
              <div key={i} className="scm-variant-row">
                <div className="scm-variant-num">{i + 1}</div>
                <div className="scm-variant-info">
                  <span className="scm-variant-name">{ad.name || `Ad ${i + 1}`}</span>
                  <span className="scm-variant-meta">
                    {ad.type?.replace('_', ' ')}
                    {ad.text ? ` · "${ad.text.slice(0, 32)}${ad.text.length > 32 ? '…' : ''}"` : ''}
                  </span>
                </div>
                <span className="scm-variant-type-badge">{ad.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="scm-divider"/>

        {/* Tier selection */}
        <div className="scm-section">
          <div className="scm-section-label">Target streamer tier</div>
          <div className="scm-tier-grid">
            {TIER_INFO.map(t => (
              <button
                key={t.id}
                className={`scm-tier-card ${tier === t.id ? 'active' : ''}`}
                onClick={() => setTier(t.id)}
              >
                <span className="scm-tier-label">{t.label}</span>
                <span className="scm-tier-desc">{t.desc}</span>
                <span className="scm-tier-mult">{t.multiplier}× rate</span>
              </button>
            ))}
          </div>
        </div>

        <div className="scm-divider"/>

        {/* Exclusive toggle */}
        <div className="scm-section">
          <div className="scm-section-label">Exclusivity</div>
          <div className="scm-exclusive-row">
            <div className="scm-exclusive-info">
              <span className="scm-exclusive-title">Single-streamer exclusive</span>
              <span className="scm-exclusive-desc">
                One streamer runs your full campaign. Higher cost, maximum brand focus.
                <strong> 2.5× rate multiplier.</strong>
              </span>
            </div>
            <button
              className={`scm-toggle ${exclusive ? 'on' : ''}`}
              onClick={() => setExclusive(v => !v)}
            >
              <span className="scm-toggle-knob"/>
            </button>
          </div>
        </div>

        <div className="scm-divider"/>

        {/* Duration */}
        <div className="scm-section">
          <div className="scm-section-label">Campaign duration</div>
          <div className="scm-duration-pills">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.label}
                className={`scm-duration-pill ${
                  opt.days === 0
                    ? isCustom ? 'active' : ''
                    : !isCustom && durationOpt === opt.days ? 'active' : ''
                }`}
                onClick={() => {
                  if (opt.days === 0) { setIsCustom(true) }
                  else { setIsCustom(false); setDurationOpt(opt.days) }
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {isCustom && (
            <div className="scm-custom-days">
              <input
                type="number" min="1" max="365"
                className="scm-input"
                value={customDays}
                onChange={e => setCustomDays(Number(e.target.value))}
              />
              <span className="scm-custom-label">days</span>
            </div>
          )}
          <div className="scm-duration-meta">
            Ends on <strong>{
              new Date(Date.now() + days * 86400000)
                .toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
            }</strong> · auto-expires after {days} {days === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="scm-divider"/>

        {/* Budget range */}
        <div className="scm-section">
          <div className="scm-section-label">Budget range (₹)</div>
          <div className="scm-budget-row">
            <div className="scm-budget-field">
              <label className="scm-budget-label">Minimum</label>
              <div className="scm-budget-input-wrap">
                <span className="scm-budget-currency">₹</span>
                <input
                  type="number" min="0" step="500"
                  className="scm-input scm-budget-input"
                  value={budgetMin}
                  onChange={e => setBudgetMin(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="scm-budget-sep">—</div>
            <div className="scm-budget-field">
              <label className="scm-budget-label">Maximum</label>
              <div className="scm-budget-input-wrap">
                <span className="scm-budget-currency">₹</span>
                <input
                  type="number" min="0" step="500"
                  className="scm-input scm-budget-input"
                  value={budgetMax}
                  onChange={e => setBudgetMax(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="scm-divider"/>

        {/* Cost estimate */}
        <div className="scm-estimate-box">
          <div className="scm-estimate-label">Estimated cost</div>
          <div className="scm-estimate-range">
            ₹{estimate.low.toLocaleString('en-IN')} – ₹{estimate.high.toLocaleString('en-IN')}
          </div>
          <div className="scm-estimate-meta">
            Based on {tier} · {days} days{exclusive ? ' · exclusive' : ''} · indicative only
          </div>
        </div>

        {/* Actions */}
        <div className="scm-actions">
          <button className="scm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="scm-btn-primary" onClick={handleConfirm}>
            Submit {ads.length} variant{ads.length !== 1 ? 's' : ''} for review →
          </button>
        </div>

      </div>
    </div>
  )
}