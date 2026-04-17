import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAllBrandsWithStats, getCampaigns, getBillingTransactions } from '../assets/overlaysStore'
import DownloadReportModal from './DownloadReportModal'
import { getMe } from '../api/auth'
import './AdvertiserDashboard.css'

/* ── DEV MODE ── */
const DEV_MODE = true

/* ── AGENCY DATA ── */
const AGENCY_USER = {
  name: 'Purva Shah',
  email: 'purva@pixelmosaic.agency',
  agency: 'PixelMosaic Agency',
}

const AGENCY_MONTHLY = [
  { month: 'Jan', amount: 28400  },
  { month: 'Feb', amount: 36800  },
  { month: 'Mar', amount: 31200  },
]

const AGENCY_WEEKLY = [
  { month: 'W1',  amount: 12400 },
  { month: 'W2',  amount: 18200 },
  { month: 'W3',  amount: 14800 },
  { month: 'W4',  amount: 17900 },
]

const AGENCY_YEARLY = [
  { month: '2021', amount: 180000 },
  { month: '2022', amount: 290000 },
  { month: '2023', amount: 410000 },
  { month: '2024', amount: 520000 },
  { month: '2025', amount: 680000 },
  { month: '2026', amount: 257400 },
]

const AGENCY_MONTHLY_2025 = [
  { month: 'Jan', amount: 18200 },
  { month: 'Feb', amount: 24600 },
  { month: 'Mar', amount: 21800 },
  { month: 'Apr', amount: 31200 },
  { month: 'May', amount: 38400 },
  { month: 'Jun', amount: 44100 },
  { month: 'Jul', amount: 39800 },
  { month: 'Aug', amount: 47200 },
  { month: 'Sep', amount: 52100 },
  { month: 'Oct', amount: 61400 },
  { month: 'Nov', amount: 58900 },
  { month: 'Dec', amount: 67800 },
]

const AGENCY_MONTHLY_2024 = [
  { month: 'Jan', amount: 12100 },
  { month: 'Feb', amount: 16400 },
  { month: 'Mar', amount: 14200 },
  { month: 'Apr', amount: 19800 },
  { month: 'May', amount: 24600 },
  { month: 'Jun', amount: 28900 },
  { month: 'Jul', amount: 31200 },
  { month: 'Aug', amount: 38400 },
  { month: 'Sep', amount: 42100 },
  { month: 'Oct', amount: 48600 },
  { month: 'Nov', amount: 44200 },
  { month: 'Dec', amount: 51800 },
]

const TIER_COLORS = {
  'Tier 1': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  'Tier 2': { bg: '#EEF2FF', color: '#3B5BFF', border: '#C7D2FE' },
  'Tier 3': { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  'Tier 4': { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' },
  'Tier 5': { bg: '#FEF2F2', color: '#EF4444', border: '#FECACA' },
}

/* ── Icons / helpers ── */
const LogoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',          icon: '⊞' },
  { id: 'campaigns', label: 'Campaign Editor',  icon: '◈' },
  { id: 'billing',   label: 'Billing',           icon: '₹' },
  { id: 'settings',  label: 'Settings',          icon: '⚙' },
]

function EarningsChart({ data }) {
  const max = Math.max(...data.map(d => d.amount))
  return (
    <div className="ad-chart">
      {data.map((d, i) => (
        <div key={i} className="ad-chart-col">
          <div className="ad-chart-bar-wrap">
            <div className="ad-chart-bar" style={{ height: `${(d.amount / max) * 100}%` }}>
              <div className="ad-chart-tooltip">₹{d.amount.toLocaleString()}</div>
            </div>
          </div>
          <span className="ad-chart-label">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  return <span className={`ad-badge ad-badge-${status}`}>{status}</span>
}

function TierBadge({ tier }) {
  const style = TIER_COLORS[tier] || {}
  return (
    <span className="ad-tier-badge" style={{
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`
    }}>{tier}</span>
  )
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function AdvertiserDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activePage, setActivePage]         = useState(() => {
    const page = searchParams.get('page')
    return (page && ['overview','billing','settings'].includes(page)) ? page : 'overview'
  })
  const [sidebarOpen, setSidebarOpen]       = useState(true)
  const [selectedBrand, setSelectedBrand]   = useState(null) // brand id or null
  const [billingFilters, setBillingFilters] = useState({ tier: 'All', brand: 'All' })
  const [brandStatusFilter, setBrandStatusFilter] = useState('all')
  const [chartView, setChartView] = useState('monthly') // 'weekly' | 'monthly' | 'yearly' | '2025' | '2024'
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const chartData = {
    weekly:  AGENCY_WEEKLY,
    monthly: AGENCY_MONTHLY,
    yearly:  AGENCY_YEARLY,
    '2025':  AGENCY_MONTHLY_2025,
    '2024':  AGENCY_MONTHLY_2024,
  }[chartView] || AGENCY_MONTHLY
  
  const [user, setUser] = useState(AGENCY_USER)

  useEffect(() => {
    getMe().then(data => {
      if (data) {
        setUser({
          ...AGENCY_USER,
          name: data.name || AGENCY_USER.name,
          email: data.email || AGENCY_USER.email,
          picture: data.picture || null,
        })
      }
    })
  }, [])

  const handleNav = (id) => {
    if (id === 'campaigns') { navigate('/campaign-manager'); return }
    setActivePage(id)
    setSelectedBrand(null)
  }

  const handleLogout = () => navigate('/')

  const [refresh, setRefresh] = useState(0)

  const BRANDS        = getAllBrandsWithStats()
  const totalSpend    = BRANDS.reduce((s, b) => s + b.spendRaw, 0)
  const totalStreams   = BRANDS.reduce((s, b) => s + b.streams, 0)
  const totalCampaigns = BRANDS.reduce((s, b) => s + b.campaigns, 0)
  const totalBudgetAllocated = BRANDS.reduce((s, b) => s + (b.budgetAllocated || b.spendRaw * 1.4), 0)

  const activeBrand    = selectedBrand ? BRANDS.find(b => b.id === selectedBrand) : null
  const brandCampaigns = selectedBrand ? getCampaigns(selectedBrand) : []

  /* Billing filters */
  const BILLING_TRANSACTIONS = getBillingTransactions()
  const filteredBilling = BILLING_TRANSACTIONS.filter(t => {
    const tierOk  = billingFilters.tier  === 'All' || t.tier  === billingFilters.tier
    const brandOk = billingFilters.brand === 'All' || t.brand === billingFilters.brand
    return tierOk && brandOk
  })
  const filteredTotal = filteredBilling.reduce((s, t) => s + t.amount, 0)

  const exportCSV = () => {
    const rows = [
      ['Brand', 'Campaign', 'Tier', 'Amount', 'Date', 'Status'],
      ...filteredBilling.map(t => [t.brand, t.campaign, t.tier, `₹${t.amount.toLocaleString()}`, t.date, t.status])
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'billing.csv'; a.click()
  }

  return (
    <div className="ad-page">

      {/* ══ TOP NAV ══ */}
      <nav className="ad-topnav">
        <div className="ad-topnav-left">
          <button className="ad-hamburger" onClick={() => setSidebarOpen(v => !v)}>
            <span/><span/><span/>
          </button>
          <a href="/" className="ad-topnav-logo"><LogoIcon /> Overlays</a>
          <span className="ad-topnav-divider"/>
          <span className="ad-topnav-role">Agency Portal</span>
        </div>
        <div className="ad-topnav-right">
          {DEV_MODE && <span className="ad-dev-chip">Dev Mode</span>}
          <button className="ad-wallet-btn" title="Wallet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
              <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
            </svg>
          </button>
          <div className="ad-topnav-user">
            {user.picture ? (
              <img src={user.picture} alt="Avatar" className="ad-user-avatar" style={{ border: 'none', objectFit: 'cover' }} />
            ) : (
              <div className="ad-user-avatar">{user.name ? user.name[0] : 'U'}</div>
            )}
            <div className="ad-user-info">
              <span className="ad-user-name">{user.name}</span>
              <span className="ad-user-company">{user.agency}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="ad-body">

        {/* ══ SIDEBAR ══ */}
        <aside className={`ad-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="ad-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`ad-nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                <span className="ad-nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="ad-nav-label">{item.label}</span>}
              </button>
            ))}
          </div>
          <div className="ad-sidebar-bottom">
            <button className="ad-sidebar-logout" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {sidebarOpen && <span>Log out</span>}
            </button>
          </div>
        </aside>

        {/* ══ MAIN CONTENT ══ */}
        <main className="ad-main">

          {/* ── OVERVIEW — Agency Home ── */}
          {activePage === 'overview' && !selectedBrand && (
            <div className="ad-content">
              <div className="ad-page-header">
                <div>
                  <div className="ad-eyebrow">Agency Overview</div>
                  <h1 className="ad-page-title">Good morning, <em>{user.name.split(' ')[0]}.</em></h1>
                </div>
                <div className="ad-page-actions">
                  <button className="ad-btn-ghost" onClick={() => navigate('/campaign-manager')}>+ New Campaign</button>
                </div>
              </div>

              {/* Agency totals */}
              <div className="ad-stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                {[
                  { label: 'Total agency spend', value: `₹${(totalSpend / 1000).toFixed(0)}K`, sub: 'Across all brands' },
                  { label: 'Total live streams',  value: totalStreams,   sub: 'All brands combined', highlight: true },
                  { label: 'Total campaigns',     value: totalCampaigns, sub: 'Active & completed' },
                ].map((s, i) => (
                  <div key={i} className={`ad-stat-card ${s.highlight ? 'highlight' : ''}`}>
                    <div className="ad-stat-value">{s.value}</div>
                    <div className="ad-stat-label">{s.label}</div>
                    <div className="ad-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Monthly chart */}
              <div className="ad-card" style={{ marginBottom: '1.25rem' }}>
                <div className="ad-card-header">
                  <div>
                    <div className="ad-eyebrow">Monthly Spend</div>
                    <h2 className="ad-card-title">Agency <em>spend trend</em></h2>
                  </div>
                  <span className="ad-earnings-total">₹{AGENCY_MONTHLY[AGENCY_MONTHLY.length - 1].amount.toLocaleString()} this month</span>
                </div>
                <EarningsChart data={AGENCY_MONTHLY} />
              </div>

              {/* Brand cards */}
              <div className="primary-brand-header">
                <div className="ad-eyebrow" style={{ marginBottom: '0.85rem' }}>Your Brands</div>
                <button className="ad-btn-primary ad-btn-sm">+ Add brand</button>
              </div>
              <div className="ad-brands-grid">
                {BRANDS.map(brand => (
                  <button
                    key={brand.id}
                    className="ad-brand-card"
                    // inside the brand card onClick, change:
                    onClick={() => { setSelectedBrand(brand.id); setBrandStatusFilter('all'); setRefresh(r => r + 1) }}
                    style={{ '--brand-color': brand.color, '--brand-soft': brand.colorSoft }}
                  >
                    <div className="ad-brand-card-top">
                      <div className="ad-brand-logo" style={{ background: brand.color, color: 'white' }}>
                        {brand.logo}
                      </div>
                      <div className="ad-brand-header-info">
                        <span className="ad-brand-name">{brand.name}</span>
                        <span className="ad-brand-category">{brand.category}</span>
                      </div>
                      <span className="ad-brand-arrow">→</span>
                    </div>

                    <div className="ad-brand-spend">{brand.totalSpend}</div>
                    <div className="ad-brand-spend-label">total spend</div>

                    <div className="ad-brand-stats">
                      <div className="ad-brand-stat">
                        <span className="ad-brand-stat-val">{brand.streams}</span>
                        <span className="ad-brand-stat-key">streams</span>
                      </div>
                      <div className="ad-brand-stat-divider"/>
                      <div className="ad-brand-stat">
                        <span className="ad-brand-stat-val">{brand.campaigns}</span>
                        <span className="ad-brand-stat-key">campaigns</span>
                      </div>
                    </div>

                    {/* Budget allocated vs spent */}
                    <div className="ad-brand-budget-row">
                      <span className="ad-brand-budget-label">Allocated</span>
                      <span className="ad-brand-budget-val">
                        ₹{((brand.spendRaw * 1.4) / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="ad-brand-bar-track">
                      <div
                        className="ad-brand-bar-fill"
                        style={{
                          width: `${Math.min((brand.spendRaw / (brand.spendRaw * 1.4)) * 100, 100)}%`,
                          background: brand.color,
                        }}
                      />
                    </div>
                    <div className="ad-brand-bar-pct" style={{ color: brand.color }}>
                      {((brand.spendRaw / (brand.spendRaw * 1.4)) * 100).toFixed(0)}% of allocated budget used
                      · ₹{((brand.spendRaw * 1.4 - brand.spendRaw) / 1000).toFixed(0)}K remaining
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── BRAND DETAIL VIEW ── */}
          {activePage === 'overview' && selectedBrand && activeBrand && (
            <div className="ad-content">
              <div className="ad-page-header">
                <div>
                  <button
                    className="ad-back-btn"
                    onClick={() => setSelectedBrand(null)}
                  >
                    ← All brands
                  </button>
                  <div className="ad-brand-detail-header" style={{ '--brand-color': activeBrand.color }}>
                    <div className="ad-brand-logo-lg" style={{ background: activeBrand.color, color: 'white' }}>
                      {activeBrand.logo}
                    </div>
                    <div>
                      <div className="ad-eyebrow">{activeBrand.category}</div>
                      <h1 className="ad-page-title"><em>{activeBrand.name}</em></h1>
                    </div>
                  </div>
                </div>
                <div className="ad-page-actions">
                  <button className="ad-btn-primary" onClick={() => navigate('/campaign-manager')}>
                    + New Campaign
                  </button>
                </div>
              </div>

              {/* Brand stats */}
              <div className="ad-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                  { label: 'Total spend',   value: activeBrand.totalSpend, sub: 'All time'          },
                  { label: 'Live streams',  value: activeBrand.streams,    sub: 'Total streams',  highlight: true },
                  { label: 'Campaigns',     value: activeBrand.campaigns,  sub: 'All campaigns'     },
                  {
                    label: 'Avg. per stream',
                    value: `₹${Math.round(activeBrand.spendRaw / activeBrand.streams / 100) * 100}`,
                    sub: 'Per stream'
                  },
                ].map((s, i) => (
                  <div key={i} className={`ad-stat-card ${s.highlight ? 'highlight' : ''}`} style={s.highlight ? { background: activeBrand.color, borderColor: 'transparent' } : {}}>
                    <div className="ad-stat-value">{s.value}</div>
                    <div className="ad-stat-label">{s.label}</div>
                    <div className="ad-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Campaign table */}
              <div className="ad-card" style={{ marginTop: '1.25rem' }}>
                <div className="ad-card-header">
                  <div>
                    <div className="ad-eyebrow">Campaigns</div>
                    <h2 className="ad-card-title">All campaigns <em>for {activeBrand.name}</em></h2>
                  </div>
                  <button className="ad-btn-ghost ad-btn-sm" onClick={() => navigate('/campaign-manager')}>
                    Manage →
                  </button>
                </div>
                <div className="ad-table-wrap">
                  {/* Status filter tabs */}
                  <div className="ad-status-tabs">
                    {['all','pending','live','ended','rejected'].map(s => (
                      <button
                        key={s}
                        className={`ad-status-tab ${brandStatusFilter === s ? 'active' : ''}`}
                        onClick={() => setBrandStatusFilter(s)}
                      >
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        <span className="ad-status-tab-count">
                          {s === 'all'
                            ? brandCampaigns.length
                            : brandCampaigns.filter(c => c.status === s).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Status</th>
                        <th>Budget allocated</th>
                        <th>Spent</th>
                        <th>Tier</th>
                        <th>Duration</th>
                        <th>Streamers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandCampaigns
                        .filter(c => brandStatusFilter === 'all' || c.status === brandStatusFilter)
                        .map(c => (
                          <tr key={c.id} className="ad-table-row" onClick={() => navigate('/campaign-manager')}>
                            <td>
                              <span className="ad-table-name">{c.name}</span>
                              <span className="ad-table-id">{c.id}</span>
                            </td>
                            <td><StatusBadge status={c.status} /></td>
                            <td>
                              {c.budgetMax
                                ? `₹${c.budgetMax.toLocaleString('en-IN')}`
                                : c.spend ? `₹${(c.spend * 1.4).toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td>
                              <div className="ad-spend-cell">
                                <span>{c.spend ? `₹${c.spend.toLocaleString('en-IN')}` : '—'}</span>
                                {c.budgetMax && c.spend > 0 && (
                                  <div className="ad-mini-bar-track">
                                    <div className="ad-mini-bar-fill"
                                      style={{ width: `${Math.min((c.spend / c.budgetMax) * 100, 100)}%` }}/>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>{c.tier ? <TierBadge tier={c.tier} /> : '—'}</td>
                            <td className="ad-muted">{c.daysLive ? `${c.daysLive}d` : '—'}</td>
                            <td>{c.streamers || '—'}</td>
                          </tr>
                        ))}
                      {brandCampaigns.filter(c => brandStatusFilter === 'all' || c.status === brandStatusFilter).length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign:'center', color:'var(--muted)', padding:'2rem' }}>
                            No {brandStatusFilter} campaigns.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── BILLING PAGE ── */}
          {activePage === 'billing' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <div>
                  <div className="ad-eyebrow">Billing</div>
                  <h1 className="ad-page-title">Spend <em>overview</em></h1>
                </div>
                <div className="ad-page-actions">
                  <button className="ad-btn-ghost" onClick={() => setShowDownloadModal(true)}>↓ Download Report</button>
                </div>
              </div>

              {/* Summary stats */}
              <div className="ad-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                  { label: 'Total agency spend',  value: `₹${(totalSpend / 1000).toFixed(0)}K`, sub: 'All time, all brands' },
                  { label: 'This month',           value: '₹63,400',  sub: 'June 2026'         },
                  { label: 'Active campaigns',     value: totalCampaigns, sub: 'Across all brands', highlight: true },
                  { label: 'Filtered total',       value: `₹${(filteredTotal / 1000).toFixed(1)}K`, sub: 'Current filter view' },
                ].map((s, i) => (
                  <div key={i} className={`ad-stat-card ${s.highlight ? 'highlight' : ''}`}>
                    <div className="ad-stat-value">{s.value}</div>
                    <div className="ad-stat-label">{s.label}</div>
                    <div className="ad-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="ad-billing-filters">
                <div className="ad-filter-group">
                  <label className="ad-filter-label">Filter by Tier</label>
                  <div className="ad-filter-pills">
                    {['All', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'].map(t => (
                      <button
                        key={t}
                        className={`ad-filter-pill ${billingFilters.tier === t ? 'active' : ''}`}
                        onClick={() => setBillingFilters(f => ({ ...f, tier: t }))}
                        style={billingFilters.tier === t && t !== 'All' ? {
                          background: TIER_COLORS[t]?.bg,
                          color: TIER_COLORS[t]?.color,
                          borderColor: TIER_COLORS[t]?.border,
                        } : {}}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ad-filter-group">
                  <label className="ad-filter-label">Filter by Brand</label>
                  <div className="ad-filter-pills">
                    {['All', ...BRANDS.map(b => b.name)].map(b => (
                      <button
                        key={b}
                        className={`ad-filter-pill ${billingFilters.brand === b ? 'active' : ''}`}
                        onClick={() => setBillingFilters(f => ({ ...f, brand: b }))}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Per-brand spend breakdown */}
              <div className="ad-row-2" style={{ marginBottom: '1.25rem' }}>
                <div className="ad-card">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">By Brand</div>
                      <h2 className="ad-card-title">Spend <em>breakdown</em></h2>
                    </div>
                  </div>
                  <div className="ad-breakdown-list">
                    {BRANDS.map(brand => (
                      <div key={brand.id} className="ad-breakdown-row">
                        <div className="ad-brand-logo-sm" style={{ background: brand.color, color: 'white' }}>{brand.logo}</div>
                        <div className="ad-breakdown-info">
                          <span className="ad-breakdown-name">{brand.name}</span>
                          <div className="ad-breakdown-bar-track">
                            <div className="ad-breakdown-bar" style={{
                              width: `${(brand.spendRaw / totalSpend) * 100}%`,
                              background: brand.color,
                            }}/>
                          </div>
                        </div>
                        <span className="ad-breakdown-amount">{brand.totalSpend}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ad-card">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Spend Trend</div>
                      <h2 className="ad-card-title">Agency <em>spend</em></h2>
                    </div>
                  </div>
                  <div className="ad-chart-filters">
                    {[
                      { id: 'weekly',  label: 'This week' },
                      { id: 'monthly', label: '2026'      },
                      { id: '2025',    label: '2025'      },
                      { id: '2024',    label: '2024'      },
                      { id: 'yearly',  label: 'All years' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        className={`ad-chart-filter-btn ${chartView === opt.id ? 'active' : ''}`}
                        onClick={() => setChartView(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                <EarningsChart data={chartData} />
              </div>
              </div>

              {/* Transactions table */}
              <div className="ad-card">
                <div className="ad-card-header">
                  <div>
                    <div className="ad-eyebrow">Transactions</div>
                    <h2 className="ad-card-title">Recent <em>charges</em>
                      <span className="ad-count-chip">{filteredBilling.length}</span>
                    </h2>
                  </div>
                </div>
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Brand</th>
                        <th>Campaign</th>
                        <th>Tier</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBilling.map((t, i) => (
                        <tr key={i} className="ad-table-row">
                          <td>
                            <div className="ad-table-brand">
                              <div className="ad-brand-logo-xs"
                                style={{ background: BRANDS.find(b => b.name === t.brand)?.color, color: 'white' }}>
                                {t.brand[0]}
                              </div>
                              {t.brand}
                            </div>
                          </td>
                          <td><span className="ad-table-name">{t.campaign}</span></td>
                          <td><TierBadge tier={t.tier} /></td>
                          <td className="ad-muted">{t.date}</td>
                          <td><strong>₹{t.amount.toLocaleString()}</strong></td>
                          <td><StatusBadge status={t.status} /></td>
                        </tr>
                      ))}
                      {filteredBilling.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                            No transactions match this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredBilling.length > 0 && (
                  <div className="ad-billing-total-row">
                    <span>Filtered total</span>
                    <strong>₹{filteredTotal.toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS PAGE ── */}
          {activePage === 'settings' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <div>
                  <div className="ad-eyebrow">Settings</div>
                  <h1 className="ad-page-title">Account <em>settings</em></h1>
                </div>
              </div>

              <div className="ad-settings-grid">

                {/* Profile */}
                <div className="ad-card">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Profile</div>
                      <h2 className="ad-card-title">Agency <em>info</em></h2>
                    </div>
                  </div>
                  <div className="ad-settings-fields">
                    {[
                      { label: 'Full name',    value: user.name   },
                      { label: 'Email',        value: user.email  },
                      { label: 'Agency name',  value: user.agency },
                    ].map(f => (
                      <div key={f.label} className="ad-settings-field">
                        <label className="ad-settings-label">{f.label}</label>
                        <input className="ad-settings-input" defaultValue={f.value} />
                      </div>
                    ))}
                    <button className="ad-btn-primary" style={{ marginTop: '0.75rem' }}>Save changes</button>
                  </div>
                </div>

                {/* Notifications */}
                <div className="ad-card">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Notifications</div>
                      <h2 className="ad-card-title">Email <em>alerts</em></h2>
                    </div>
                  </div>
                  <div className="ad-settings-fields">
                    {[
                      'Email when streamer approves a request',
                      'Email when streamer rejects a request',
                      'Weekly performance digest',
                      'Monthly billing statement',
                      'Campaign goes live notification',
                      'Campaign budget threshold alert',
                    ].map(pref => (
                      <label key={pref} className="ad-pref-row">
                        <input type="checkbox" defaultChecked className="ad-pref-check" />
                        <span>{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brand management */}
                <div className="ad-card">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Brands</div>
                      <h2 className="ad-card-title">Manage <em>brands</em></h2>
                    </div>
                    <button className="ad-btn-primary ad-btn-sm">+ Add brand</button>
                  </div>
                  <div className="ad-brand-settings-list">
                    {BRANDS.map(brand => (
                      <div key={brand.id} className="ad-brand-settings-row">
                        <div className="ad-brand-logo-sm" style={{ background: brand.color, color: 'white' }}>{brand.logo}</div>
                        <div className="ad-breakdown-info">
                          <span className="ad-breakdown-name">{brand.name}</span>
                          <span className="ad-breakdown-sub">{brand.category}</span>
                        </div>
                        <button className="ad-btn-ghost ad-btn-sm">Edit</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preferences */}
                <div className="ad-card">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Preferences</div>
                      <h2 className="ad-card-title">Dashboard <em>display</em></h2>
                    </div>
                  </div>
                  <div className="ad-settings-fields">
                    {[
                      { label: 'Default currency', value: '₹ INR' },
                      { label: 'Default date range', value: 'Last 30 days' },
                      { label: 'Timezone', value: 'IST (UTC +5:30)' },
                    ].map(f => (
                      <div key={f.label} className="ad-settings-field">
                        <label className="ad-settings-label">{f.label}</label>
                        <input className="ad-settings-input" defaultValue={f.value} />
                      </div>
                    ))}
                    <div className="ad-settings-field">
                      <label className="ad-settings-label">Default analytics view</label>
                      <select className="ad-settings-input">
                        <option>Agency overview</option>
                        <option>By brand</option>
                        <option>By campaign</option>
                      </select>
                    </div>
                    <button className="ad-btn-primary" style={{ marginTop: '0.75rem' }}>Save preferences</button>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="ad-card ad-card-danger">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Danger zone</div>
                      <h2 className="ad-card-title">Account <em>actions</em></h2>
                    </div>
                  </div>
                  <p className="ad-danger-desc">
                    Permanently delete your agency account and all brand & campaign data. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="ad-btn-danger-outline">Delete all data</button>
                    <button className="ad-btn-danger-outline">Deactivate account</button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {showDownloadModal && (
        <DownloadReportModal
          brands={BRANDS}
          onClose={() => setShowDownloadModal(false)}
          onDownload={(config) => {
            alert(`Generating ${config.fileType} report for ${config.brand} (Tier: ${config.tier}).\nPassword Protecion: ${config.locked ? 'Enabled' : 'Disabled'}`)
          }}
        />
      )}
    </div>
  )
}