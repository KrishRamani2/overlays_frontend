import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { getAllBrandsWithStats } from '../assets/overlaysStore'
import DownloadReportModal from './DownloadReportModal'
import { getAdvertiserMe, logoutAdvertiser } from '../api/auth'
import toast from 'react-hot-toast'
import './AdvertiserDashboard.css'

const ADV_BASE = import.meta.env.VITE_ADVERTISER_API_BASE || 'http://localhost:8000'
const BILLING_TOKEN = import.meta.env.VITE_BILLING_TOPUP_TOKEN || 'test_token_123'

/* ── DEV MODE ── */
const DEV_MODE = true

/* ── AGENCY DATA ── */
const AGENCY_USER = {
  name: 'Loading...',
  email: '',
  id: '',
  picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
  company_name: 'Zenith Media',
  company_type: 'agency',
  active: true,
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
  if (!data || data.length === 0) return <div className="ad-chart-empty">No data available</div>
  const max = Math.max(...data.map(d => d.amount), 1)
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

function WalletModal({ isOpen, onClose, currentBalance, onTopup, isLoading }) {
  const [topupAmount, setTopupAmount] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(null)

  const presets = [500, 1000, 2000, 5000, 10000]

  const handleTopup = () => {
    const amount = parseFloat(topupAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    onTopup(amount)
  }

  const handlePreset = (val) => {
    setTopupAmount(val.toString())
    setSelectedPreset(val)
  }

  return (
    <div className="ad-modal-overlay">
      <div className="ad-modal-card wallet-modal">
        <div className="ad-modal-header">
          <div className="ad-modal-title-wrap">
            <div className="ad-eyebrow">Wallet</div>
            <h2 className="ad-modal-title">Add <em>funds</em></h2>
          </div>
          <button className="ad-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="ad-modal-body">
          <div className="wallet-balance-card">
            <span className="wallet-balance-label">Current Balance</span>
            <span className="wallet-balance-value">₹{parseFloat(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleTopup(); }} className="wallet-form">
            <div className="ad-form-group">
              <label className="ad-label">Enter Amount (₹)</label>
              <div className="amount-input-wrap">
                <span className="currency-prefix">₹</span>
                <input 
                  type="number" 
                  className="ad-input amount-input"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={(e) => {
                    setTopupAmount(e.target.value)
                    setSelectedPreset(null)
                  }}
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="presets-grid">
              {presets.map(p => (
                <button 
                  key={p} 
                  type="button" 
                  className={`preset-btn ${selectedPreset === p ? 'active' : ''}`}
                  onClick={() => handlePreset(p)}
                >
                  + ₹{p.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="wallet-info-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Funds will be added instantly after successful payment.
            </div>

            <button 
              type="submit" 
              className="ad-btn-primary wallet-submit-btn" 
              disabled={isLoading || !topupAmount}
            >
              {isLoading ? 'Processing...' : 'Pay & Add Funds'}
            </button>
          </form>
        </div>
      </div>
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
  const { id } = useParams()
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
  const [brandToEdit, setBrandToEdit] = useState(null)
  const [monthlySpendData, setMonthlySpendData] = useState([])

  const [user, setUser] = useState(AGENCY_USER)
  const [brandsList, setBrandsList] = useState([])
  const [loadingBrands, setLoadingBrands] = useState(true)

  const [wallet, setWallet] = useState({ 
    balance_rupees: '0.00', 
    balance_cents: 0,
    budget_rupees: '0.00',
    spent_rupees: '0.00'
  })
  const [billingSummary, setBillingSummary] = useState(null)
  const [showWalletModal, setShowWalletModal] = useState(false)

  const companyType = searchParams.get('type') || user.company_type || 'agency'
  const isSingleBrand = companyType === 'brands' || companyType === 'brand' || user.company_type === 'brand'
  const [isTopupLoading, setIsTopupLoading] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')

  const [showAddBrandModal, setShowAddBrandModal] = useState(false)
  const [showAllocateModal, setShowAllocateModal] = useState(false)
  const [brandToAllocate, setBrandToAllocate] = useState(null)
  const [isBrandLoading, setIsBrandLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [brandCampaignsData, setBrandCampaignsData] = useState({})
  const [allCampaigns, setAllCampaigns] = useState([])

  // Calculate dynamic spend for Single Brand mode
  const { totalEstimatedSpend, calculatedMonthlyData } = (() => {
    const activeCampaigns = allCampaigns.filter(c => c.status !== 'draft' && c.status !== 'rejected')
    const total = activeCampaigns.reduce((sum, c) => sum + parseFloat(c.estimated_cost_rupees || 0), 0)
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthlyMap = {}
    activeCampaigns.forEach(c => {
      const date = new Date(c.created_at || Date.now())
      const m = monthNames[date.getMonth()]
      monthlyMap[m] = (monthlyMap[m] || 0) + parseFloat(c.estimated_cost_rupees || 0)
    })

    const d = new Date()
    const last3 = Array.from({ length: 3 }).map((_, i) => {
      const monthDate = new Date(d.getFullYear(), d.getMonth() - (1 - i), 1)
      const mName = monthNames[monthDate.getMonth()]
      return { month: mName, amount: Math.round(monthlyMap[mName] || 0) }
    })

    return { totalEstimatedSpend: total, calculatedMonthlyData: last3 }
  })()

  const finalMonthlyData = (isSingleBrand && calculatedMonthlyData.some(d => d.amount > 0)) ? calculatedMonthlyData : monthlySpendData

  const chartData = {
    weekly:  AGENCY_WEEKLY,
    monthly: finalMonthlyData,
    yearly:  AGENCY_YEARLY,
    '2025':  AGENCY_MONTHLY_2025,
    '2024':  AGENCY_MONTHLY_2024,
  }[chartView] || finalMonthlyData

  useEffect(() => {
    if (!id) return;
    getAdvertiserMe(id).then(data => {
      if (data) {
        setUser({
          name: data.name || 'Advertiser',
          email: data.email || '',
          picture: data.picture || null,
          id: data.id || null,
          company_name: data.company_name || 'My Company',
          company_type: data.company_type || 'agency',
          status: data.status || 'active',
          active: data.active !== false
        })
      } else {
        setUser(prev => ({ ...prev, name: 'Advertiser' }))
      }
    }).catch(err => console.error('Failed to fetch user profile', err))

    // Fetch real brands
    fetch(`${ADV_BASE}/api/accounts/${id}/brands`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setBrandsList(data)
        setLoadingBrands(false)
      })
      .catch(err => {
        console.error('Failed to fetch brands', err)
        setLoadingBrands(false)
      })

    // Fetch Wallet & Summary
    const fetchBillingData = async () => {
      try {
        const res = await fetch(`${ADV_BASE}/api/accounts/${id}/billing/summary`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setBillingSummary(data)
          if (data.wallet) setWallet(data.wallet)
        }
      } catch (err) { console.error('Failed to fetch billing summary', err) }
    }
    
    const fetchMonthlySpend = async () => {
      try {
        const res = await fetch(`${ADV_BASE}/api/accounts/${id}/billing/monthly-spend?t=${Date.now()}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          if (data && data.length > 0) {
            setMonthlySpendData(data)
          }
        }
      } catch (err) { console.error('Failed to fetch monthly spend', err) }
    }

    fetchBillingData()
    fetchMonthlySpend()

    // Fetch all campaigns for this user
    fetch(`${ADV_BASE}/api/accounts/${id}/campaigns`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAllCampaigns(data))
      .catch(err => console.error('Failed to fetch campaigns', err))
  }, [id, refresh])

  // Fetch campaigns when a brand is selected
  const fetchBrandCampaigns = (brandId) => {
    if (!brandId || !id) return
    fetch(`${ADV_BASE}/api/accounts/${id}/brands/${brandId}/campaigns`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => setBrandCampaignsData(prev => ({ ...prev, [brandId]: data })))
      .catch(err => console.error('Failed to fetch brand campaigns', err))
  }

  const saveSettings = async (newData) => {
    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newData)
      });
      if (res.ok) {
        setUser(newData)
        toast.success('Settings saved successfully!');
      } else {
        const err = await res.json()
        toast.error(`Failed to save settings: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error('Failed to connect to the server.');
      console.error(err)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone. Any remaining balance will be processed for refund.')) return;
    try {
      const closureData = {
        company_google_user_id: id,
        company_name: user.company_name,
        company_type: user.company_type,
        wallet_balance_cents_snapshot: wallet.balance_cents || 0,
        wallet_balance_rupees: wallet.balance_rupees || '0.00',
        status: 'pending',
        reason: 'User requested account closure',
        requested_at: new Date().toISOString()
      };

      const res = await fetch(`${ADV_BASE}/api/accounts/${id}/close-account/request-admin-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(closureData)
      });

      if (res.ok) {
        toast.success('Waiting for admin approval. Please log out.', { duration: 6000 });
        setUser(prev => ({ ...prev, status: 'closure_requested' }));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(`Failed to request closure: ${err.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to request account closure');
    }
  }

  const deactivateAccount = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account?')) return;
    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${id}/deactivate`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        setUser(prev => ({ ...prev, active: false }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to deactivate account');
    }
  }

  const [settingsForm, setSettingsForm] = useState({ name: '', email: '', company_name: '' });
  useEffect(() => {
    if (user.id) {
      setSettingsForm({
        name: user.name,
        email: user.email,
        company_name: user.company_name
      });
    }
  }, [user]);

  const handleNav = (navId) => {
    if (navId === 'campaigns') { navigate(`/campaign-manager/${id || 'demo-id'}`); return }
    setActivePage(navId)
    setSelectedBrand(null)
    if (navId === 'overview') {
      navigate(`/advertiser-dashboard/${id || 'demo-id'}?type=${companyType}`, { replace: true })
    } else {
      navigate(`/advertiser-dashboard/${id || 'demo-id'}?type=${companyType}&page=${navId}`, { replace: true })
    }
  }

  const handleLogout = () => {
    logoutAdvertiser()
  }

  const handleAddBrand = async (brandData) => {
    setIsBrandLoading(true)
    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${id}/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brand_name: brandData.name,
          brand_description: brandData.description,
          brand_logo: brandData.logo,
          allocated_budget_rupees: brandData.budget
        })
      })
      if (res.ok) {
        const newBrand = await res.json()
        setBrandsList(prev => [...prev, newBrand])
        setShowAddBrandModal(false)
        setRefresh(r => r + 1)
        // Refresh wallet too as creating a brand might have deducted budget
        fetch(`${ADV_BASE}/api/accounts/${id}/billing/summary`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.wallet) setWallet(data.wallet)
          })
        toast.success('Brand added successfully!')
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Failed to add brand')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to server')
    } finally {
      setIsBrandLoading(false)
    }
  }

  const handleAllocateBudget = async (brandId, amount) => {
    const idempotencyKey = `allocate_${brandId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${id}/billing/brands/${brandId}/allocate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Billing-Token': BILLING_TOKEN,
          'Idempotency-Key': idempotencyKey
        },
        credentials: 'include',
        body: JSON.stringify({
          amount_rupees: amount.toString()
        })
      })
      if (res.ok) {
        const data = await res.json()
        setWallet(data.wallet)
        setBrandsList(prev => prev.map(b => b.id === brandId ? data.brand : b))
        setRefresh(r => r + 1)
        setShowAllocateModal(false)
        toast.success(`Successfully allocated ₹${amount} to ${data.brand.brand_name}`)
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Failed to allocate budget')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to server')
    } finally {
      setIsBrandLoading(false)
    }
  }

  const handleUpdateBrand = async (brandId, brandData) => {
    setIsBrandLoading(true)
    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${id}/brands/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brand_name: brandData.name,
          brand_description: brandData.description,
          brand_logo: brandData.logo,
          target_audience: brandData.category
        })
      })
      if (res.ok) {
        const updatedBrand = await res.json()
        setBrandsList(prev => prev.map(b => b.id === brandId ? updatedBrand : b))
        setShowAddBrandModal(false)
        setBrandToEdit(null)
        setRefresh(r => r + 1)
        toast.success('Brand updated successfully!')
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Failed to update brand')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to server')
    } finally {
      setIsBrandLoading(false)
    }
  }

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm('Are you sure you want to delete this brand? All associated campaigns will also be affected.')) return
    setIsBrandLoading(true)
    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${id}/brands/${brandId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setBrandsList(prev => prev.filter(b => b.id !== brandId))
        setSelectedBrand(null)
        setRefresh(r => r + 1)
        toast.success('Brand deleted successfully!')
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Failed to delete brand')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to server')
    } finally {
      setIsBrandLoading(false)
    }
  }

  const handleTopup = async (amount) => {
    setIsTopupLoading(true)
    const idempotencyKey = `topup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${id}/billing/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Billing-Token': BILLING_TOKEN
        },
        credentials: 'include',
        body: JSON.stringify({
          amount_rupees: amount.toString(),
          reference: 'Web Dashboard Topup',
          metadata: { source: 'dashboard' }
        })
      })

      if (res.ok) {
        const data = await res.json()
        setWallet(data.wallet)
        setShowWalletModal(false)
        setTopupAmount('')
        setRefresh(r => r + 1)
        toast.success(`Successfully added ₹${amount} to your wallet!`)
      } else {
        const err = await res.json()
        toast.error(`Failed to add amount: ${err.detail || 'Unknown error'}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Network error during topup')
    } finally {
      setIsTopupLoading(false)
    }
  }




  const BRANDS = brandsList.map((b, i) => {
    // For Single Brand mode, the wallet balance/budget is the brand's budget
    const isSingleBrandMode = isSingleBrand && i === 0;
    
    // Total budget is either explicitly provided, or calculated as balance + spent
    const walletTotal = parseFloat(wallet.budget_rupees || wallet.ad_budget_rupees || 0) || 
                       (parseFloat(wallet.balance_rupees || 0) + parseFloat(wallet.spent_rupees || 0));

    const allocated = isSingleBrandMode ? walletTotal : parseFloat(b.allocated_budget_rupees || 0)
    const spent = isSingleBrandMode ? parseFloat(wallet.spent_rupees || 0) : parseFloat(b.spent_rupees || 0)
    const remaining = isSingleBrandMode ? parseFloat(wallet.balance_rupees || 0) : parseFloat(b.remaining_budget_rupees || 0)

    // Count campaigns for this brand from allCampaigns
    const brandCamps = allCampaigns.filter(c => c.brand_id === b.id)
    const campaignCount = brandCamps.length
    const liveStreams = brandCamps.filter(c => c.status === 'live' || c.status === 'approved').length

    return {
      id: b.id,
      name: b.brand_name,
      category: b.target_audience || 'Brand',
      logo: b.brand_logo || (b.brand_name ? b.brand_name[0] : 'B'),
      color: ['#3B5BFF', '#7C3AED', '#EC4899', '#10B981', '#F59E0B'][i % 5],
      brand_description: b.brand_description,
      allocated_budget_rupees: allocated,
      spent_rupees: spent,
      remaining_budget_rupees: isSingleBrandMode ? (allocated - spent) : remaining,
      locked: allocated === 0,
      totalSpend: `\u20b9${spent.toLocaleString()}`,
      spendRaw: spent,
      campaigns: campaignCount,
      streams: liveStreams,
    }
  })


  const totalSpent    = isSingleBrand ? totalEstimatedSpend : parseFloat(wallet.spent_rupees || 0)
  // For Single Brand, the total budget is balance + budget_rupees (which tracks allocated funds)
  const totalBudget   = isSingleBrand 
    ? (parseFloat(wallet.balance_rupees || 0) + parseFloat(wallet.budget_rupees || 0)) 
    : (parseFloat(wallet.budget_rupees || 0) || parseFloat(wallet.ad_budget_rupees || 0))
  
  // Total Balance should represent the available funds. 
  // For Agencies, it's the unallocated wallet balance.
  // For Single Brands, it's (Total Deposited - Total Spent).
  const totalBalance  = isSingleBrand ? (totalBudget - totalSpent) : parseFloat(wallet.balance_rupees || 0)
  const totalCampaigns = allCampaigns.length

  const activeBrand    = selectedBrand ? BRANDS.find(b => b.id === selectedBrand) : null
  const brandCampaigns = selectedBrand ? (brandCampaignsData[selectedBrand] || []) : []

  /* Billing filters */
  /* Billing transactions derived from campaigns */
  const BILLING_TRANSACTIONS = useMemo(() => {
    return allCampaigns.map(c => {
      const brandObj = brandsList.find(b => b.id === c.brand_id);
      
      // Status logic: 
      // - If campaign status is 'ended' -> ended
      // - If approval is pending (pending/draft) -> pending
      // - Otherwise (live/approved) -> live
      let displayStatus = 'live';
      if (c.status === 'ended') displayStatus = 'ended';
      else if (c.status === 'pending' || c.status === 'draft') displayStatus = 'pending';
      else if (c.status === 'approved' || c.status === 'live') displayStatus = 'live';

      const dateObj = new Date(c.created_at || Date.now());
      return {
        id: c.id,
        brand: brandObj ? brandObj.brand_name : 'Unknown Brand',
        brandId: c.brand_id,
        campaign: c.campaign_name,
        tier: c.tier || 'Tier 1',
        amount: parseFloat(c.estimated_cost_rupees || 0),
        date: dateObj.toLocaleDateString('en-IN'),
        time: dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        status: displayStatus
      };
    });
  }, [allCampaigns, brandsList]);
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

  if (user.status === 'closure_requested' || user.status === 'closing' || user.status === 'pending_closure') {
    return (
      <div className="ad-deactivated-overlay">
        <div className="ad-deactivated-card closure-card">
          <div className="ad-closure-icon">⏳</div>
          <h1>Waiting for Admin Approval</h1>
          <p>
            Your request to close this account (<strong>{user.company_name}</strong>) is currently waiting for admin approval. 
            All platform functions have been locked. <strong>Please log out.</strong>
          </p>
          <div className="ad-closure-details">
            <span>Snapshot Balance: ₹{parseFloat(wallet.balance_rupees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <button className="ad-deactivated-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>
    );
  }

  if (user.active === false) {
    return (
      <div className="ad-deactivated-overlay">
        <div className="ad-deactivated-card">
          <h1>Account Deactivated</h1>
          <p>
            Your account has been deactivated. All operations for this company are currently suspended. 
            Please contact support if you believe this is an error.
          </p>
          <button className="ad-deactivated-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>
    );
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
          <span className="ad-topnav-role">{isSingleBrand ? 'Brand Portal' : 'Agency Portal'}</span>
        </div>
        <div className="ad-topnav-right">
          {DEV_MODE && <span className="ad-dev-chip">Dev Mode</span>}
          <button className="ad-wallet-btn" title="Wallet" onClick={() => setShowWalletModal(true)}>
            <div className="ad-wallet-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
              </svg>
              <span className="ad-wallet-balance">₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </button>
          <div className="ad-topnav-user">
            {user.picture ? (
              <img src={user.picture} alt="Avatar" className="ad-user-avatar" style={{ border: 'none', objectFit: 'cover' }} />
            ) : (
              <div className="ad-user-avatar">{user.name ? user.name[0] : 'U'}</div>
            )}
            <div className="ad-user-info">
              <span className="ad-user-name">{user.name}</span>
              <span className="ad-user-company">{user.company_name}</span>
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

          {/* ── OVERVIEW — Single Brand Dashboard ── */}
          {activePage === 'overview' && isSingleBrand && (() => {
            const brand = BRANDS[0]
            if (!brand) return (
              <div className="ad-content">
                <div className="ad-no-brands-empty">
                  <div className="ad-empty-icon">🏢</div>
                  <h3>No brand setup</h3>
                  <p>Your account is set to Single Brand mode, but no brand has been created yet.</p>
                  <button className="ad-btn-primary" onClick={() => setShowAddBrandModal(true)}>
                    + Create Brand
                  </button>
                </div>
              </div>
            )

            const brandBudget = brand.allocated_budget_rupees || 0
            const brandRemaining = brand.remaining_budget_rupees || 0
            const brandCamps = allCampaigns.filter(c => c.brand_id === brand.id)
            return (
              <div className="ad-content">
                <div className="ad-page-header">
                  <div>
                    <div className="ad-eyebrow">Brand Dashboard</div>
                    <h1 className="ad-page-title">Good morning, <em>{user.name.split(' ')[0]}.</em></h1>
                  </div>
                  <div className="ad-page-actions">
                    <button className="ad-btn-ghost" onClick={() => navigate(`/campaign-manager/${id || 'demo-id'}`)}>+ New Campaign</button>
                  </div>
                </div>

                {/* Brand stats with budget */}
                <div className="ad-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                  {[
                    { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, sub: 'Sum of all campaigns' },
                    { 
                      label: 'Budget Remaining', 
                      value: `₹${totalBalance.toLocaleString()}`, 
                      sub: isSingleBrand ? 'Available to spend' : `of ₹${totalBudget.toLocaleString()} total` 
                    },
                    { label: 'Campaigns', value: brandCamps.length, sub: 'All campaigns', highlight: true },
                    { label: 'Pending Review', value: brandCamps.filter(c => c.status === 'pending').length, sub: 'Awaiting approval' },
                  ].map((s, i) => (
                    <div key={i} className={`ad-stat-card ${s.highlight ? 'highlight' : ''}`}>
                      <div className="ad-stat-value">{s.value}</div>
                      <div className="ad-stat-label">{s.label}</div>
                      <div className="ad-stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Budget progress bar */}
                <div className="ad-card" style={{ marginBottom: '1.25rem' }}>
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Budget</div>
                      <h2 className="ad-card-title">Spend <em>overview</em></h2>
                    </div>
                    <span className="ad-earnings-total">₹{totalBalance.toLocaleString()} remaining</span>
                  </div>
                  <div className="ad-brand-bar-track" style={{ height: '8px', borderRadius: '4px' }}>
                    <div className="ad-brand-bar-fill" style={{
                      width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100).toFixed(0) : 0}%`,
                      background: '#3B5BFF', borderRadius: '4px', height: '8px'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem', fontSize: '.78rem', color: '#64748b' }}>
                    <span>₹{totalSpent.toLocaleString()} spent</span>
                    <span>₹{totalBudget.toLocaleString()} total budget</span>
                  </div>
                </div>

                {/* Spend chart */}
                <div className="ad-card" style={{ marginBottom: '1.25rem' }}>
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Monthly Spend</div>
                      <h2 className="ad-card-title">Spend <em>trend</em></h2>
                    </div>
                    <span className="ad-earnings-total">₹{chartData[chartData.length - 1]?.amount?.toLocaleString() || '0'} this month</span>
                  </div>
                  <EarningsChart data={chartData} />
                </div>

                {/* Campaign table */}
                <div className="ad-card">
                  <div className="ad-card-header">
                    <div>
                      <div className="ad-eyebrow">Campaigns</div>
                      <h2 className="ad-card-title">All <em>campaigns</em></h2>
                    </div>
                    <button className="ad-btn-ghost ad-btn-sm" onClick={() => navigate(`/campaign-manager/${id || 'demo-id'}`)}>
                      Manage →
                    </button>
                  </div>
                  <div className="ad-table-wrap">
                    <div className="ad-status-tabs">
                      {['all','draft','pending','live','ended','rejected'].map(s => (
                        <button
                          key={s}
                          className={`ad-status-tab ${brandStatusFilter === s ? 'active' : ''}`}
                          onClick={() => setBrandStatusFilter(s)}
                        >
                          {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                          <span className="ad-status-tab-count">
                            {s === 'all' ? brandCamps.length : brandCamps.filter(c => c.status === s).length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Campaign</th><th>Status</th><th>Plays</th><th>Est. Cost</th><th>Tier</th><th>Duration</th><th>Exclusive</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brandCamps
                          .filter(c => brandStatusFilter === 'all' || c.status === brandStatusFilter)
                          .map(c => (
                            <tr key={c.id} className="ad-table-row" onClick={() => navigate(`/campaign-manager/${id || 'demo-id'}`)}>
                              <td><span className="ad-table-name">{c.campaign_name}</span><span className="ad-table-id">{c.campaign_id}</span></td>
                              <td><StatusBadge status={c.status} /></td>
                              <td><span className="ad-play-count">{c.expected_plays || c.play_count || 0}</span></td>
                              <td>{c.estimated_cost_rupees ? `₹${parseFloat(c.estimated_cost_rupees).toLocaleString('en-IN')}` : '—'}</td>
                              <td>{c.tier ? <TierBadge tier={c.tier} /> : '—'}</td>
                              <td className="ad-muted">{c.campaign_duration_days ? `${c.campaign_duration_days}d` : '—'}</td>
                              <td>{c.exclusive ? '✓ Exclusive' : '—'}</td>
                            </tr>
                          ))}
                        {brandCamps.filter(c => brandStatusFilter === 'all' || c.status === brandStatusFilter).length === 0 && (
                          <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--muted)', padding:'2rem' }}>No {brandStatusFilter} campaigns.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── OVERVIEW — Agency Home ── */}
          {activePage === 'overview' && !isSingleBrand && !selectedBrand && (
            <div className="ad-content">
              <div className="ad-page-header">
                <div>
                  <div className="ad-eyebrow">Agency Overview</div>
                  <h1 className="ad-page-title">Good morning, <em>{user.name.split(' ')[0]}.</em></h1>
                </div>
                <div className="ad-page-actions">
                  <button className="ad-btn-ghost" onClick={() => navigate(`/campaign-manager/${id || 'demo-id'}`)}>+ New Campaign</button>
                </div>
              </div>

              {/* Agency totals with budget */}
              <div className="ad-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                  { label: isSingleBrand ? 'Total Balance' : 'Total Left', value: `₹${totalBalance.toLocaleString()}`, sub: isSingleBrand ? 'Remaining across campaigns' : 'Unallocated in wallet', highlight: true },
                  { label: isSingleBrand ? 'Total Deposited' : 'Total Allocated', value: `₹${totalBudget.toLocaleString()}`, sub: isSingleBrand ? 'All time funds added' : 'Across all brands' },
                  { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, sub: 'By all campaigns' },
                  { label: 'Total Campaigns', value: totalCampaigns, sub: 'Active & completed' },
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
                  <span className="ad-earnings-total">₹{chartData[chartData.length - 1]?.amount?.toLocaleString() || '0'} this month</span>
                </div>
                <EarningsChart data={chartData} />
              </div>

              {/* Brand cards */}
              <div className="primary-brand-header">
                <div className="ad-eyebrow" style={{ marginBottom: '0.85rem' }}>Your Brands</div>
                <button className="ad-btn-primary ad-btn-sm" onClick={() => setShowAddBrandModal(true)}>+ Add brand</button>
              </div>
              <div className="ad-brands-grid">
                {BRANDS.length > 0 ? BRANDS.map(brand => (
                  <button
                    key={brand.id}
                    className={`ad-brand-card ${brand.locked ? 'locked' : ''}`}
                    onClick={() => { 
                      if (brand.locked) {
                        setBrandToAllocate(brand)
                        setShowAllocateModal(true)
                      } else {
                        setSelectedBrand(brand.id); 
                        setBrandStatusFilter('all'); 
                        fetchBrandCampaigns(brand.id);
                        setRefresh(r => r + 1)
                      }
                    }}
                    style={{ '--brand-color': brand.color, '--brand-soft': brand.colorSoft }}
                  >
                    {brand.locked && (
                      <div className="ad-brand-locked-overlay">
                        <div className="ad-lock-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          Budget Required
                        </div>
                      </div>
                    )}
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
                        {brand.allocated_budget_rupees > 0 ? `\u20b9${brand.allocated_budget_rupees.toLocaleString()}` : '\u20b90'}
                      </span>
                    </div>
                    <div className="ad-brand-bar-track">
                      <div
                        className="ad-brand-bar-fill"
                        style={{
                          width: `${brand.allocated_budget_rupees > 0 ? Math.min((brand.spendRaw / brand.allocated_budget_rupees) * 100, 100) : 0}%`,
                          background: brand.color,
                        }}
                      />
                    </div>
                    <div className="ad-brand-bar-pct" style={{ color: brand.color }}>
                      {brand.allocated_budget_rupees > 0
                        ? `${Math.min((brand.spendRaw / brand.allocated_budget_rupees) * 100, 100).toFixed(0)}% used`
                        : 'No budget'}
                      {brand.remaining_budget_rupees > 0 && ` \u00b7 \u20b9${brand.remaining_budget_rupees.toLocaleString()} remaining`}
                    </div>
                  </button>
                )) : !loadingBrands && (
                  <div className="ad-no-brands-empty">
                    <div className="ad-empty-icon">🏢</div>
                    <h3>No brands yet</h3>
                    <p>Add your first brand to start running campaigns and tracking performance.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BRAND DETAIL VIEW ── */}
          {activePage === 'overview' && !isSingleBrand && selectedBrand && activeBrand && (
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
                  <button className="ad-btn-ghost" style={{ marginRight: '0.75rem' }} onClick={() => { setBrandToEdit(activeBrand); setShowAddBrandModal(true); }}>
                    Edit Brand
                  </button>
                  <button className="ad-btn-danger-outline ad-btn-sm" style={{ marginRight: '0.75rem' }} onClick={() => handleDeleteBrand(activeBrand.id)}>
                    Delete
                  </button>
                  <button className="ad-btn-primary" onClick={() => navigate(`/campaign-manager/${id || 'demo-id'}`)}>
                    + New Campaign
                  </button>
                </div>
              </div>

              {/* Brand stats */}
              {(() => {
                const bBudget = activeBrand.allocated_budget_rupees || 0
                const bRemaining = activeBrand.remaining_budget_rupees || 0
                return (
                  <>
                    <div className="ad-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                      {[
                        { label: 'Total Spent',      value: activeBrand.totalSpend, sub: 'Campaign spending' },
                        { label: 'Budget Remaining',  value: `₹${bRemaining.toLocaleString()}`, sub: `of ₹${bBudget.toLocaleString()} allocated` },
                        { label: 'Live Streams',     value: activeBrand.streams || 0,    sub: 'Total streams',  highlight: true },
                        { label: 'Campaigns',        value: activeBrand.campaigns || 0,  sub: 'Active & completed' },
                      ].map((s, i) => (
                        <div key={i} className={`ad-stat-card ${s.highlight ? 'highlight' : ''}`} style={s.highlight ? { background: activeBrand.color, borderColor: 'transparent' } : {}}>
                          <div className="ad-stat-value">{s.value}</div>
                          <div className="ad-stat-label">{s.label}</div>
                          <div className="ad-stat-sub">{s.sub}</div>
                        </div>
                      ))}
                    </div>
                    {/* Budget bar */}
                    <div className="ad-card" style={{ marginTop: '1.25rem' }}>
                      <div className="ad-card-header">
                        <div>
                          <div className="ad-eyebrow">Budget</div>
                          <h2 className="ad-card-title">Spend <em>overview</em></h2>
                        </div>
                        <span className="ad-earnings-total">₹{bRemaining.toLocaleString()} remaining</span>
                      </div>
                      <div className="ad-brand-bar-track" style={{ height: '8px', borderRadius: '4px' }}>
                        <div className="ad-brand-bar-fill" style={{
                          width: `${bBudget > 0 ? Math.min((activeBrand.spendRaw / bBudget) * 100, 100).toFixed(0) : 0}%`,
                          background: activeBrand.color, borderRadius: '4px', height: '8px'
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem', fontSize: '.78rem', color: '#64748b' }}>
                        <span>₹{activeBrand.spendRaw.toLocaleString()} spent</span>
                        <span>₹{bBudget.toLocaleString()} total budget</span>
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* Campaign table */}
              <div className="ad-card" style={{ marginTop: '1.25rem' }}>
                <div className="ad-card-header">
                  <div>
                    <div className="ad-eyebrow">Campaigns</div>
                    <h2 className="ad-card-title">All campaigns <em>for {activeBrand.name}</em></h2>
                  </div>
                  <button className="ad-btn-ghost ad-btn-sm" onClick={() => navigate(`/campaign-manager/${id || 'demo-id'}`)}>
                    Manage →
                  </button>
                </div>
                <div className="ad-table-wrap">
                  {/* Status filter tabs */}
                  <div className="ad-status-tabs">
                    {['all','draft','pending','live','ended','rejected'].map(s => (
                      <button
                        key={s}
                        className={`ad-status-tab ${brandStatusFilter === s ? 'active' : ''}`}
                        onClick={() => setBrandStatusFilter(s)}
                      >
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        <span className="ad-status-tab-count">
                          {s === 'all'
                            ? brandCampaigns.length
                            : brandCampaigns.filter(c => c.status === s || (s === 'live' && c.status === 'approved')).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Status</th>
                        <th>Plays</th>
                        <th>Est. Cost</th>
                        <th>Tier</th>
                        <th>Duration</th>
                        <th>Exclusive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandCampaigns
                        .filter(c => brandStatusFilter === 'all' || c.status === brandStatusFilter || (brandStatusFilter === 'live' && c.status === 'approved'))
                        .map(c => (
                          <tr key={c.id} className="ad-table-row" onClick={() => navigate(`/campaign-manager/${id || 'demo-id'}`)}>
                            <td>
                              <span className="ad-table-name">{c.campaign_name}</span>
                              <span className="ad-table-id">{c.campaign_id}</span>
                            </td>
                            <td><StatusBadge status={c.status} /></td>
                            <td><span className="ad-play-count">{c.expected_plays || c.play_count || 0}</span></td>
                            <td>
                              {c.estimated_cost_rupees
                                ? `₹${parseFloat(c.estimated_cost_rupees).toLocaleString('en-IN')}`
                                : '—'}
                            </td>
                            <td>{c.tier ? <TierBadge tier={c.tier} /> : '—'}</td>
                            <td className="ad-muted">{c.campaign_duration_days ? `${c.campaign_duration_days}d` : '—'}</td>
                            <td>{c.exclusive ? '✓ Exclusive' : '—'}</td>
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
                  { label: isSingleBrand ? 'Total brand spend' : 'Total agency spend',  value: `₹${(totalSpent / 1000).toFixed(0)}K`, sub: isSingleBrand ? 'All time spending' : 'All time, all brands' },
                  { label: 'This month',           value: `₹${chartData[chartData.length - 1]?.amount?.toLocaleString() || '0'}`,  sub: `${chartData[chartData.length - 1]?.month || ''} 2026` },
                  { label: 'Active campaigns',     value: totalCampaigns, sub: isSingleBrand ? 'Campaigns' : 'Across all brands', highlight: true },
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
                              width: `${totalSpent > 0 ? (brand.spendRaw / totalSpent) * 100 : 0}%`,
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
                      { id: 'monthly', label: 'Real Spend' },
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
                          <td className="ad-muted">
                            {t.date}
                            <span style={{ fontSize: '0.68rem', display: 'block', opacity: 0.7 }}>{t.time}</span>
                          </td>
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
                      <h2 className="ad-card-title">{isSingleBrand ? 'Brand' : 'Agency'} <em>info</em></h2>
                    </div>
                  </div>
                  <div className="ad-settings-fields">
                    <div className="ad-settings-field">
                      <label className="ad-settings-label">Full name</label>
                      <input 
                        className="ad-settings-input" 
                        value={settingsForm.name} 
                        onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                      />
                    </div>
                    <div className="ad-settings-field">
                      <label className="ad-settings-label">Email</label>
                      <input 
                        className="ad-settings-input" 
                        value={settingsForm.email} 
                        onChange={e => setSettingsForm({...settingsForm, email: e.target.value})}
                      />
                    </div>
                    <div className="ad-settings-field">
                      <label className="ad-settings-label">Company name</label>
                      <input 
                        className="ad-settings-input" 
                        value={settingsForm.company_name} 
                        onChange={e => setSettingsForm({...settingsForm, company_name: e.target.value})}
                      />
                    </div>
                    <button 
                      className="ad-btn-primary" 
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => saveSettings(settingsForm)}
                    >
                      Save changes
                    </button>
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
                      <h2 className="ad-card-title">{isSingleBrand ? 'Brand profile' : 'Manage brands'}</h2>
                    </div>
                    {!isSingleBrand && <button className="ad-btn-primary ad-btn-sm" onClick={() => setShowAddBrandModal(true)}>+ Add brand</button>}
                  </div>

                  {isSingleBrand && BRANDS[0] ? (
                    <div className="ad-modal-body" style={{ padding: 0 }}>
                      <BrandForm 
                        brand={BRANDS[0]} 
                        onUpdate={handleUpdateBrand} 
                        isLoading={isBrandLoading} 
                        isInline={true}
                      />
                    </div>
                  ) : (
                    <div className="ad-brand-settings-list">
                      {loadingBrands && <div style={{padding:'1rem', color:'var(--muted)'}}>Loading brands...</div>}
                      {!loadingBrands && BRANDS.length === 0 && <div style={{padding:'1rem', color:'var(--muted)'}}>No brands found.</div>}
                      {BRANDS.map(brand => (
                        <div key={brand.id} className="ad-brand-settings-row">
                          <div className="ad-brand-logo-sm" style={{ background: brand.color, color: 'white' }}>{brand.logo}</div>
                          <div className="ad-breakdown-info">
                            <span className="ad-breakdown-name">{brand.name}</span>
                            <span className="ad-breakdown-sub">{brand.category}</span>
                          </div>
                          <div className="ad-breakdown-info" style={{maxWidth:'300px'}}>
                             <span className="ad-breakdown-sub" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                               {brand.brand_description}
                             </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="ad-btn-ghost ad-btn-sm"
                              onClick={() => { setBrandToEdit(brand); setShowAddBrandModal(true); }}
                            >
                              Edit
                            </button>
                            {!isSingleBrand && (
                              <button 
                                className="ad-btn-ghost ad-btn-sm"
                                style={{ color: '#EF4444' }}
                                onClick={() => handleDeleteBrand(brand.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    Permanently delete your account and all brand & campaign data. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="ad-btn-danger-outline" onClick={deleteAccount}>Delete account</button>
                    <button className="ad-btn-danger-outline" onClick={deactivateAccount}>Deactivate account</button>
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
            setShowDownloadModal(false)
            toast.success(`Generating ${config.fileType} report for ${config.brand} (Tier: ${config.tier}).\nPassword Protecion: ${config.locked ? 'Enabled' : 'Disabled'}`, { duration: 4000 })
          }}
        />
      )}

      {/* ══ WALLET MODAL ══ */}
      {showWalletModal && (
        <WalletModal 
          isOpen={showWalletModal} 
          onClose={() => setShowWalletModal(false)} 
          currentBalance={totalBalance}
          onTopup={handleTopup}
          isLoading={isTopupLoading}
        />
      )}

      {/* ══ BRAND MODAL ══ */}
      {showAddBrandModal && (
        <BrandModal 
          onClose={() => { setShowAddBrandModal(false); setBrandToEdit(null); }}
          onAdd={handleAddBrand}
          onUpdate={handleUpdateBrand}
          brand={brandToEdit}
          isLoading={isBrandLoading}
        />
      )}

      {/* ══ ALLOCATE BUDGET MODAL ══ */}
      {showAllocateModal && brandToAllocate && (
        <AllocateBudgetModal 
          brand={brandToAllocate}
          onClose={() => setShowAllocateModal(false)}
          onAllocate={handleAllocateBudget}
          isLoading={isBrandLoading}
        />
      )}
    </div>
  )
}
function BrandModal({ onClose, onAdd, onUpdate, brand, isLoading }) {
  return (
    <div className="ad-modal-overlay">
      <div className="ad-modal-card">
        <div className="ad-modal-header">
          <div className="ad-modal-title-wrap">
            <div className="ad-eyebrow">{brand ? 'Edit Brand' : 'New Brand'}</div>
            <h2 className="ad-modal-title">{brand ? 'Update' : 'Add'} <em>brand</em></h2>
          </div>
          <button className="ad-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ad-modal-body">
          <BrandForm 
            brand={brand} 
            onAdd={onAdd} 
            onUpdate={onUpdate} 
            onClose={onClose} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  )
}

function BrandForm({ brand, onAdd, onUpdate, onClose, isLoading, isInline = false }) {
  const [formData, setFormData] = useState({ 
    name: brand?.name || '', 
    description: brand?.brand_description || '', 
    logo: brand?.logo || '', 
    category: brand?.category || '',
    budget: '' 
  })

  // Keep form in sync with brand prop if it changes (important for inline)
  useEffect(() => {
    if (brand && isInline) {
      setFormData({
        name: brand.name || '',
        description: brand.brand_description || '',
        logo: brand.logo || '',
        category: brand.category || '',
        budget: ''
      })
    }
  }, [brand, isInline])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (brand) {
      onUpdate(brand.id, formData)
    } else {
      onAdd(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ad-settings-fields">
      <div className="ad-settings-field">
        <label className="ad-settings-label">Brand Name</label>
        <input 
          className="ad-settings-input" 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
          placeholder="e.g. Nike"
          required
        />
      </div>
      <div className="ad-settings-field">
        <label className="ad-settings-label">Category / Industry</label>
        <input 
          className="ad-settings-input" 
          value={formData.category} 
          onChange={e => setFormData({...formData, category: e.target.value})} 
          placeholder="e.g. Sports, Gaming, Tech"
        />
      </div>
      <div className="ad-settings-field">
        <label className="ad-settings-label">Description</label>
        <textarea 
          className="ad-settings-input" 
          style={{ height: '80px', resize: 'none' }}
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          placeholder="What does this brand do?"
        />
      </div>
      <div className="ad-settings-field">
        <label className="ad-settings-label">Logo URL (Optional)</label>
        <input 
          className="ad-settings-input" 
          value={formData.logo} 
          onChange={e => setFormData({...formData, logo: e.target.value})} 
          placeholder="https://..."
        />
      </div>
      {!brand && (
        <div className="ad-settings-field">
          <label className="ad-settings-label">Initial Budget Allocation (₹)</label>
          <input 
            type="number"
            className="ad-settings-input" 
            value={formData.budget} 
            onChange={e => setFormData({...formData, budget: e.target.value})} 
            placeholder="0.00"
            min="0"
          />
          <span className="ad-muted" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
            You can start campaigns once budget is allocated.
          </span>
        </div>
      )}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="ad-btn-primary" disabled={isLoading}>
          {isLoading ? (brand ? 'Updating...' : 'Creating...') : (brand ? 'Update Brand' : 'Create Brand')}
        </button>
        {!isInline && <button type="button" className="ad-btn-ghost" onClick={onClose}>Cancel</button>}
      </div>
    </form>
  )
}

function AllocateBudgetModal({ brand, onClose, onAllocate, isLoading }) {
  const [amount, setAmount] = useState('')

  return (
    <div className="ad-modal-overlay">
      <div className="ad-modal-card wallet-modal">
        <div className="ad-modal-header">
          <div className="ad-modal-title-wrap">
            <div className="ad-eyebrow">Budget Allocation</div>
            <h2 className="ad-modal-title">Fund <em>{brand.name}</em></h2>
          </div>
          <button className="ad-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ad-modal-body">
          <div className="wallet-info-note" style={{ marginBottom: '1.5rem' }}>
            Allocating budget will unlock this brand and allow you to start new campaigns.
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onAllocate(brand.id, amount) }} className="wallet-form">
            <div className="ad-form-group">
              <label className="ad-label">Amount to Allocate (₹)</label>
              <div className="amount-input-wrap">
                <span className="currency-prefix">₹</span>
                <input 
                  type="number" 
                  className="ad-input amount-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="ad-btn-primary wallet-submit-btn" 
              disabled={isLoading || !amount}
            >
              {isLoading ? 'Processing...' : 'Confirm Allocation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
