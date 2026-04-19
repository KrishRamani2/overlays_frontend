/* SubmitCampaignModal.jsx */
import { useState, useMemo, useEffect } from 'react'
import './SubmitCampaignModal.css'
import toast from 'react-hot-toast'

const ADV_BASE = import.meta.env.VITE_ADVERTISER_API_BASE || 'http://localhost:8000'

const TIER_INFO = [
  { id: 'Tier 1', label: 'Tier 1', desc: 'Top creators · 100K+ avg viewers',   cpm: 120, avgViewers: 150000 },
  { id: 'Tier 2', label: 'Tier 2', desc: 'Rising stars · 20K–100K viewers',    cpm: 75,  avgViewers: 50000 },
  { id: 'Tier 3', label: 'Tier 3', desc: 'Mid-tier · 5K–20K viewers',          cpm: 45,  avgViewers: 12000 },
  { id: 'Tier 4', label: 'Tier 4', desc: 'Micro · 1K–5K viewers',              cpm: 25,  avgViewers: 3000 },
  { id: 'Tier 5', label: 'Tier 5', desc: 'Nano · up to 1K viewers',            cpm: 12,  avgViewers: 500 },
]

const DURATION_OPTIONS = [
  { label: '3 days',   days: 3  },
  { label: '7 days',   days: 7  },
  { label: '14 days',  days: 14 },
  { label: '1 month',  days: 30 },
  { label: '3 months', days: 90 },
  { label: 'Custom',   days: 0  },
]

const FREQUENCY_OPTIONS = [
  { label: '5 min',  minutes: 5  },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
]

const GRID_MULT = { 1: 1.0, 2: 1.6, 3: 2.2 }
const TIME_MULT = { 5: 0.7, 10: 1.0, 20: 1.6, 30: 2.2, 60: 3.5 }
const TYPE_MULT = { text_image: 1, image: 1, text: 1, sticker: 1, video: 2 }

function getGridCount(gridSelection) {
  if (!gridSelection || !gridSelection.length) return 1
  return Math.min(gridSelection.length, 3)
}

function getClosestTimeBucket(seconds) {
  if (!seconds || seconds <= 0) return 10
  const buckets = [5, 10, 20, 30, 60]
  return buckets.reduce((prev, curr) => Math.abs(curr - seconds) < Math.abs(prev - seconds) ? curr : prev)
}

function formatINR(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function SubmitCampaignModal({ ads, campaignId, brandId, userId, onConfirm, onClose }) {
  const [tier,        setTier]        = useState('Tier 3')
  const [exclusive,   setExclusive]   = useState(false)
  const [durationOpt, setDurationOpt] = useState(7)
  const [customDays,  setCustomDays]  = useState(14)
  const [isCustom,    setIsCustom]    = useState(false)
  const [frequency,   setFrequency]   = useState(10)
  const [showCpmInfo, setShowCpmInfo] = useState(false)
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [loadingBudget, setLoadingBudget] = useState(false)

  const days = isCustom ? customDays : durationOpt
  const tierInfo = TIER_INFO.find(t => t.id === tier)

  // Fetch brand budget and account info on mount / brand change
  useEffect(() => {
    if (!brandId || !userId) return
    setLoadingBudget(true)

    // Fetch brand info, billing summary, and user profile to handle Single Brand mode
    Promise.all([
      fetch(`${ADV_BASE}/api/accounts/${userId}/billing/brands/${brandId}`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null),
      fetch(`${ADV_BASE}/api/accounts/${userId}/billing/summary`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null),
      fetch(`${ADV_BASE}/auth/google/me/${userId}`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
    ]).then(([brandData, summary, meData]) => {
      const user = meData?.user || meData
      const isSingleBrand = user?.company_type === 'brands' || user?.company_type === 'brand'
      
      if (isSingleBrand && summary?.wallet) {
        const w = summary.wallet
        // Synchronize brand budget status with wallet for single brand mode
        const totalRupees = parseFloat(w.budget_rupees || w.ad_budget_rupees || 0) || (parseFloat(w.balance_rupees || 0) + parseFloat(w.spent_rupees || 0))
        const totalCents = (w.budget_cents || w.ad_budget_cents) || (w.balance_cents + w.spent_cents)
        
        setBudgetStatus({
          ...brandData,
          allocated_rupees: totalRupees.toString(),
          allocated_cents: totalCents,
          remaining_cents: w.balance_cents,
          remaining_rupees: w.balance_rupees,
          spent_cents: w.spent_cents,
          spent_rupees: w.spent_rupees
        })
      } else {
        setBudgetStatus(brandData)
      }
      setLoadingBudget(false)
    }).catch(err => {
      console.error("Failed to fetch budget status", err)
      setLoadingBudget(false)
    })
  }, [brandId, userId])

  /* ── Local cost calculation (mirrors backend formula exactly) ── */
  const costBreakdown = useMemo(() => {
    const baseCpm = tierInfo?.cpm || 45
    const avgViewers = tierInfo?.avgViewers || 12000
    const avgStreamMin = 240 // 4 hrs
    const playsPerStream = Math.max(1, Math.floor(avgStreamMin / Math.max(5, frequency)))
    const totalPlays = playsPerStream * days
    const numAds = Math.max(1, ads.length)
    const playsPerAd = Math.max(1, Math.floor(totalPlays / numAds))

    let totalCost = 0
    const adBreakdowns = ads.map((ad, i) => {
      const gridCount = getGridCount(ad.gridSelection)
      const gridMult = GRID_MULT[Math.min(gridCount, 3)] || 1.0
      const durationBucket = getClosestTimeBucket(ad.duration || 10)
      const timeMult = TIME_MULT[durationBucket] || 1.0
      const typeMult = TYPE_MULT[ad.type] || 1.0

      const perPlay = (avgViewers * baseCpm * gridMult * timeMult * typeMult) / 1000
      const subtotal = perPlay * playsPerAd

      totalCost += subtotal

      return {
        name: ad.visibleName || ad.name || `Ad ${i + 1}`,
        type: ad.type,
        gridCount,
        gridMult,
        durationBucket,
        timeMult,
        typeMult,
        perPlay: Math.round(perPlay * 100) / 100,
        plays: playsPerAd,
        subtotal: Math.round(subtotal * 100) / 100,
      }
    })

    const excMult = exclusive ? 2.5 : 1.0
    totalCost *= excMult

    return {
      baseCpm,
      avgViewers,
      playsPerStream,
      totalPlays,
      exclusiveMultiplier: excMult,
      adBreakdowns,
      totalCost: Math.round(totalCost * 100) / 100,
    }
  }, [tier, exclusive, days, frequency, ads, tierInfo])

  const budgetExceeded = budgetStatus
    ? costBreakdown.totalCost * 100 > budgetStatus.remaining_cents
    : false

  const handleConfirm = () => {
    if (!tier) { toast.error('Please select a streamer tier'); return }
    if (days < 1) { toast.error('Duration must be at least 1 day'); return }
    if (budgetExceeded) { toast.error('Estimated cost exceeds brand budget. Please reduce scope or increase budget.'); return }
    onConfirm({ tier, exclusive, daysLive: days, frequency, estimatedCost: costBreakdown.totalCost })
  }

  return (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="scm-header">
          <div>
            <div className="scm-eyebrow">Submit for review</div>
            <h2 className="scm-title">{campaignId}</h2>
          </div>
          <button className="scm-close" onClick={onClose}>✕</button>
        </div>

        {/* ══ STEP 1: Brand Budget Status ══ */}
        <div className="scm-section">
          <div className="scm-section-label">Brand Budget</div>
          {loadingBudget ? (
            <div className="scm-budget-loading">
              <div className="scm-spinner-sm"/> Loading budget data...
            </div>
          ) : budgetStatus ? (
            <div className="scm-budget-card">
              <div className="scm-budget-row">
                <div className="scm-budget-item">
                  <span className="scm-budget-item-label">Allocated</span>
                  <span className="scm-budget-item-value">{budgetStatus.allocated_rupees}</span>
                </div>
                <div className="scm-budget-item">
                  <span className="scm-budget-item-label">Remaining</span>
                  <span className="scm-budget-item-value scm-remaining">{formatINR(budgetStatus.remaining_cents / 100)}</span>
                </div>
              </div>
              <div className="scm-budget-bar-wrap">
                <div className="scm-budget-bar-track">
                  <div className="scm-budget-bar-spent" style={{
                    width: `${Math.min(100, (budgetStatus.spent_cents / Math.max(1, budgetStatus.allocated_cents)) * 100)}%`
                  }}/>
                </div>
                <span className="scm-budget-bar-label">
                  {Math.round((budgetStatus.spent_cents / Math.max(1, budgetStatus.allocated_cents)) * 100)}% used
                </span>
              </div>
            </div>
          ) : (
            <div className="scm-budget-empty">
              No brand selected or budget not configured.
              {!brandId && <span className="scm-budget-hint"> Select a brand in the ad settings first.</span>}
            </div>
          )}
        </div>

        <div className="scm-divider"/>

        {/* ══ STEP 2: Tier Selection ══ */}
        <div className="scm-section">
          <div className="scm-section-label">
            Target streamer tier
            <button className="scm-info-btn" onClick={() => setShowCpmInfo(v => !v)} title="What is CPM?">ⓘ</button>
          </div>
          {showCpmInfo && (
            <div className="scm-cpm-explainer">
              <div className="scm-cpm-title">How CPM pricing works</div>
              <div className="scm-cpm-formula">
                Cost = <span className="scm-formula-hl">(Views × Base CPM × Grid × Time × Type)</span> ÷ 1000
              </div>
              <div className="scm-cpm-desc">
                <strong>CPM</strong> = Cost Per Mille (per 1,000 impressions). Each time your ad is shown during a livestream,
                the cost is calculated based on the concurrent viewers at that moment, multiplied by your tier's base CPM
                rate and adjusted by grid size, ad duration, and format multipliers.
              </div>
              <div className="scm-cpm-table">
                <div className="scm-cpm-col">
                  <div className="scm-cpm-col-title">Grid Multiplier</div>
                  <div className="scm-cpm-row-item"><span>1 grid</span><span>1.0×</span></div>
                  <div className="scm-cpm-row-item"><span>2 grids</span><span>1.6×</span></div>
                  <div className="scm-cpm-row-item"><span>3 grids</span><span>2.2×</span></div>
                </div>
                <div className="scm-cpm-col">
                  <div className="scm-cpm-col-title">Time Multiplier</div>
                  <div className="scm-cpm-row-item"><span>5s</span><span>0.7×</span></div>
                  <div className="scm-cpm-row-item"><span>10s</span><span>1.0×</span></div>
                  <div className="scm-cpm-row-item"><span>20s</span><span>1.6×</span></div>
                  <div className="scm-cpm-row-item"><span>30s</span><span>2.2×</span></div>
                  <div className="scm-cpm-row-item"><span>60s</span><span>3.5×</span></div>
                </div>
                <div className="scm-cpm-col">
                  <div className="scm-cpm-col-title">Type Multiplier</div>
                  <div className="scm-cpm-row-item"><span>Image/Text</span><span>1.0×</span></div>
                  <div className="scm-cpm-row-item"><span>Video</span><span>2.0×</span></div>
                </div>
              </div>
            </div>
          )}
          <div className="scm-tier-grid">
            {TIER_INFO.map(t => (
              <button
                key={t.id}
                className={`scm-tier-card ${tier === t.id ? 'active' : ''}`}
                onClick={() => setTier(t.id)}
              >
                <span className="scm-tier-label">{t.label}</span>
                <span className="scm-tier-desc">{t.desc}</span>
                <span className="scm-tier-cpm">₹{t.cpm} CPM</span>
              </button>
            ))}
          </div>
        </div>

        <div className="scm-divider"/>

        {/* ══ STEP 3: Exclusive toggle ══ */}
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

        {/* ══ STEP 4: Duration ══ */}
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

        {/* ══ STEP 5: Ad Frequency ══ */}
        <div className="scm-section">
          <div className="scm-section-label">Ad frequency</div>
          <div className="scm-duration-pills">
            {FREQUENCY_OPTIONS.map(opt => (
              <button
                key={opt.minutes}
                className={`scm-duration-pill ${frequency === opt.minutes ? 'active' : ''}`}
                onClick={() => setFrequency(opt.minutes)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="scm-duration-meta">
            Ads dispatched every {frequency} minutes · ~{costBreakdown.playsPerStream} plays per stream session (4h avg)
          </div>
        </div>

        <div className="scm-divider"/>

        {/* ══ STEP 6: Per-Ad Cost Breakdown ══ */}
        <div className="scm-section">
          <div className="scm-section-label">Cost breakdown per ad variation</div>
          <div className="scm-ad-cost-list">
            {costBreakdown.adBreakdowns.map((ab, i) => (
              <div key={i} className="scm-ad-cost-card">
                <div className="scm-ad-cost-header">
                  <div className="scm-ad-cost-name">
                    <span className="scm-ad-cost-num">{i + 1}</span>
                    {ab.name}
                  </div>
                  <span className="scm-ad-cost-subtotal">{formatINR(ab.subtotal)}</span>
                </div>
                <div className="scm-ad-cost-details">
                  <div className="scm-ad-cost-chip">
                    <span className="scm-chip-label">Grid</span>
                    <span className="scm-chip-value">{ab.gridCount} cell{ab.gridCount > 1 ? 's' : ''} · {ab.gridMult}×</span>
                  </div>
                  <div className="scm-ad-cost-chip">
                    <span className="scm-chip-label">Duration</span>
                    <span className="scm-chip-value">{ab.durationBucket}s · {ab.timeMult}×</span>
                  </div>
                  <div className="scm-ad-cost-chip">
                    <span className="scm-chip-label">Type</span>
                    <span className="scm-chip-value">{ab.type?.replace('_',' ')} · {ab.typeMult}×</span>
                  </div>
                  <div className="scm-ad-cost-chip">
                    <span className="scm-chip-label">Per play</span>
                    <span className="scm-chip-value">{formatINR(ab.perPlay)}</span>
                  </div>
                  <div className="scm-ad-cost-chip">
                    <span className="scm-chip-label">Plays</span>
                    <span className="scm-chip-value">{ab.plays.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {/* Formula line */}
                <div className="scm-ad-formula">
                  ({tierInfo?.avgViewers?.toLocaleString('en-IN')} views × ₹{tierInfo?.cpm} CPM × {ab.gridMult} × {ab.timeMult} × {ab.typeMult}) ÷ 1000 = <strong>₹{ab.perPlay}</strong>/play
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="scm-divider"/>

        {/* ══ STEP 7: Final Estimate & Budget Comparison ══ */}
        <div className={`scm-estimate-box ${budgetExceeded ? 'scm-estimate-exceeded' : ''}`}>
          <div className="scm-estimate-top">
            <div>
              <div className="scm-estimate-label">Estimated total cost</div>
              <div className="scm-estimate-range">{formatINR(costBreakdown.totalCost)}</div>
            </div>
            {exclusive && (
              <div className="scm-exclusive-badge">
                2.5× exclusive
              </div>
            )}
          </div>
          <div className="scm-estimate-meta">
            Based on {tier} · ₹{tierInfo?.cpm} CPM · {tierInfo?.avgViewers?.toLocaleString('en-IN')} avg viewers · {days} days · every {frequency} min{exclusive ? ' · exclusive' : ''}
          </div>

          {budgetStatus && (
            <div className={`scm-budget-compare ${budgetExceeded ? 'exceeded' : 'within'}`}>
              <div className="scm-budget-compare-row">
                <span>Estimated cost</span>
                <span className="scm-compare-val">{formatINR(costBreakdown.totalCost)}</span>
              </div>
              <div className="scm-budget-compare-row">
                <span>Brand remaining budget</span>
                <span className="scm-compare-val">{formatINR(budgetStatus.remaining_rupees)}</span>
              </div>
              <div className="scm-budget-compare-divider"/>
              <div className={`scm-budget-verdict ${budgetExceeded ? 'bad' : 'good'}`}>
                {budgetExceeded ? (
                  <>
                    <span className="scm-verdict-icon">⚠</span>
                    <span>Estimated cost exceeds remaining budget by <strong>{formatINR(costBreakdown.totalCost - budgetStatus.remaining_rupees)}</strong>. Reduce campaign scope or increase brand budget to submit.</span>
                  </>
                ) : (
                  <>
                    <span className="scm-verdict-icon">✓</span>
                    <span>Within budget. <strong>{formatINR(budgetStatus.remaining_rupees - costBreakdown.totalCost)}</strong> will remain after this campaign.</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="scm-actions">
          <button className="scm-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={`scm-btn-primary ${budgetExceeded ? 'scm-btn-disabled' : ''}`}
            onClick={handleConfirm}
            disabled={budgetExceeded}
            title={budgetExceeded ? 'Cannot submit: estimated cost exceeds brand budget' : ''}
          >
            {budgetExceeded ? 'Budget exceeded' : `Submit ${ads.length} variant${ads.length !== 1 ? 's' : ''} for review →`}
          </button>
        </div>

      </div>
    </div>
  )
}