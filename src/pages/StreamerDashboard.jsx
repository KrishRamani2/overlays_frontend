import { useEffect, useRef, useState, useCallback } from 'react'
import { getStreamerMe, logout, apiFetch, fetchStreamerUser, fetchTierBrands, postApprovedAd } from '../api/auth'
import { useParams, useNavigate } from 'react-router-dom'
import './StreamerDashboard.css'

const DEV_MODE = false

/* ── Logo ── */
const LogoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

/* ── Helpers ── */
function getGridBounds(indices) {
  if (!indices || indices.length === 0) indices = [6,7,8]; // fallback bottom third
  const W = 640, H = 360
  let minCol = 2, maxCol = 0, minRow = 2, maxRow = 0
  indices.forEach(idx => {
    const row = Math.floor(idx / 3), col = idx % 3
    if (row < minRow) minRow = row; if (row > maxRow) maxRow = row
    if (col < minCol) minCol = col; if (col > maxCol) maxCol = col
  })
  return { x: minCol*W, y: minRow*H, w:(maxCol-minCol+1)*W, h:(maxRow-minRow+1)*H }
}

/* ══════════════════════════════════════════
   DUMMY DATA
══════════════════════════════════════════ */
const DUMMY_USER = {
  uid: 'dev-uid-12345',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  tier: 'Tier 2',
  channel: 'AlexPlays',
  avgViewers: 600000,
  joinedDate: 'Jan 2025',
}

const DUMMY_EARNINGS = {
  lifetime:  '₹1,84,200',
  thisMonth: '₹18,240',
  nextPayout: '₹6,400',
  nextPayoutDate: 'Friday, Apr 4',
  chart: [
    { month: 'Jan', amount: 12400 },
    { month: 'Feb', amount: 18200 },
    { month: 'Mar', amount: 14800 },
    { month: 'Apr', amount: 22100 },
    { month: 'May', amount: 19600 },
    { month: 'Jun', amount: 18240 },
  ],
}

const DUMMY_PAYOUT_HISTORY = [
  { date: 'Mar 28, 2026', amount: '₹19,600', status: 'paid' },
  { date: 'Mar 21, 2026', amount: '₹14,800', status: 'paid' },
  { date: 'Mar 14, 2026', amount: '₹18,200', status: 'paid' },
  { date: 'Mar 7, 2026',  amount: '₹12,400', status: 'paid' },
]

const DUMMY_BRANDS = [
  { id: 'nova',    name: 'NovaBrands',      category: 'Consumer Tech',   color: '#3B5BFF', colorSoft: '#EEF2FF', logo: 'N', earned: '₹32,400', streams: 12, status: 'active',  lastStream: '2 days ago' },
  { id: 'skill',   name: 'Skillshare',      category: 'Education',       color: '#059669', colorSoft: '#ECFDF5', logo: 'S', earned: '₹18,800', streams: 8,  status: 'active',  lastStream: '5 days ago' },
  { id: 'gear',    name: 'Gearbox Co.',     category: 'Gaming Peripherals',color:'#7C3AED', colorSoft: '#F5F3FF', logo: 'G', earned: '₹24,100', streams: 14, status: 'ended',   lastStream: '3 weeks ago' },
  { id: 'nord',    name: 'NordVPN',         category: 'Cybersecurity',   color: '#0EA5E9', colorSoft: '#F0F9FF', logo: 'V', earned: '₹41,200', streams: 21, status: 'active',  lastStream: 'Yesterday' },
  { id: 'steel',   name: 'SteelSeries',     category: 'Gaming Gear',     color: '#F59E0B', colorSoft: '#FFFBEB', logo: 'S', earned: '₹12,600', streams: 6,  status: 'pending', lastStream: 'Never' },
]

const DUMMY_REQUESTS = [
  { id: 'req1', campaignId: 'camp1', brand: 'NovaBrands', displayName: 'NovaBrands — Summer Tech Campaign', tier: 'Tier 2', budgetRange: '₹8K–₹15K', daysLive: 14, type: 'text_image' },
  { id: 'req2', campaignId: 'camp2', brand: 'Corsair',    displayName: 'Corsair Peripherals Q4 Push',       tier: 'Tier 2', budgetRange: '₹6K–₹12K', daysLive: 7,  type: 'image' },
]

const DUMMY_PLAYLIST = [
  { id: 'camp3', name: 'Skillshare Creative',  brand: 'Skillshare',  duration: 15, status: 'live',     daysLeft: 8,  earnings: '₹1,240', type: 'text_image' },
  { id: 'camp4', name: 'Gearbox Software DLC', brand: 'Gearbox Co.', duration: 10, status: 'live',     daysLeft: 3,  earnings: '₹880',   type: 'image' },
  { id: 'camp5', name: 'SteelSeries Pro Kit',  brand: 'SteelSeries', duration: 12, status: 'upcoming', daysLeft: 12, earnings: '—',      type: 'text_image' },
  { id: 'camp6', name: 'NordVPN Shield',        brand: 'NordVPN',     duration: 20, status: 'upcoming', daysLeft: 18, earnings: '—',      type: 'video' },
  { id: 'camp7', name: 'NovaBrands Summer',     brand: 'NovaBrands',  duration: 15, status: 'ended',    daysLeft: 0,  earnings: '₹3,420', type: 'text_image' },
]

const DUMMY_STREAM_HISTORY = [
  { date: 'Mar 30, 2026', duration: '4h 12m', brands: ['NordVPN', 'Skillshare'], earnings: '₹2,840', viewers: '8.4K peak' },
  { date: 'Mar 28, 2026', duration: '3h 55m', brands: ['NordVPN'],               earnings: '₹1,920', viewers: '7.1K peak' },
  { date: 'Mar 26, 2026', duration: '5h 30m', brands: ['Skillshare','NovaBrands'],earnings: '₹3,410', viewers: '9.2K peak' },
  { date: 'Mar 24, 2026', duration: '2h 40m', brands: ['Gearbox Co.'],            earnings: '₹1,240', viewers: '6.8K peak' },
]

const DUMMY_SAVED_PREFS = [
  { id: 'p1', name: 'Gaming Night Setup',    positions: ['bottom_center','bottom_right'], gap: 20, adsEnabled: true,  lastUsed: '2 days ago' },
  { id: 'p2', name: 'IRL Stream',            positions: ['top_right'],                    gap: 35, adsEnabled: true,  lastUsed: '1 week ago' },
  { id: 'p3', name: 'Chill Lo-fi Session',   positions: ['bottom_left','bottom_center'],  gap: 45, adsEnabled: true,  lastUsed: '2 weeks ago' },
]

const DUMMY_REJECTED = [
  { id: 'rej1', name: 'Generic Energy Drink', brand: 'BuzzCo', reason: 'Off-brand content' },
]

const ALL_POSITIONS = [
  'top_left','top_center','top_right',
  'center_left','center','center_right',
  'bottom_left','bottom_center','bottom_right',
]

const TIER_META = {
  'Tier 1': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', viewers: '> 5M',  rate: '3.0×' },
  'Tier 2': { color: '#3B5BFF', bg: '#EEF2FF', border: '#C7D2FE', viewers: '500K–5M', rate: '1.8×' },
  'Tier 3': { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', viewers: '50K–500K',  rate: '1.2×' },
  'Tier 4': { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', viewers: '500–50K',   rate: '0.8×' },
  'Tier 5': { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', viewers: '0–500', rate: '0.5×' },
}

const STREAM_CONTENT_OPTIONS = [
  'Gaming — FPS / Shooter',
  'Gaming — RPG / Adventure',
  'Gaming — Sports / Racing',
  'Gaming — Strategy',
  'IRL / Just Chatting',
  'Music / DJ Set',
  'Art & Design',
  'Coding / Dev',
  'Educational / Tutorial',
  'Fitness & Wellness',
  'Food & Cooking',
  'Other',
]

/* ══════════════════════════════════════════
   MINI COMPONENTS
══════════════════════════════════════════ */
function StatusBadge({ status }) {
  return <span className={`sd-badge sd-badge-${status}`}>{status}</span>
}

function EarningsChart({ data }) {
  const max = Math.max(...data.map(d => d.amount))
  return (
    <div className="sd-chart">
      {data.map((d, i) => (
        <div key={i} className="sd-chart-col">
          <div className="sd-chart-bar-wrap">
            <div className="sd-chart-bar" style={{ height: `${(d.amount / max) * 100}%` }}>
              <div className="sd-chart-tooltip">₹{d.amount.toLocaleString()}</div>
            </div>
          </div>
          <span className="sd-chart-label">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════
   NAV ITEMS — Go Live moved before Brands & Requests
══════════════════════════════════════════ */
const NAV_ITEMS = [
  { id: 'overview',   label: 'Overview',          icon: '⊞' },
  { id: 'stream',     label: 'Go Live',           icon: '●' },
  { id: 'playlist',   label: 'Ad Playlist',       icon: '◈' },
  { id: 'brands',     label: 'Brands & Requests', icon: '◎' },
  { id: 'earnings',   label: 'Earnings',          icon: '₹' },
  { id: 'settings',   label: 'Settings',          icon: '⚙' },
]

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function StreamerDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user,               setUser]               = useState(null)
  const [loading,            setLoading]             = useState(true)
  const [activePage,         setActivePage]          = useState('overview')
  const [sidebarOpen,        setSidebarOpen]         = useState(true)

  // Stream / preferences
  const [adsEnabled,         setAdsEnabledState]     = useState(true)
  const [gapInput,           setGapInput]            = useState(20)
  const [selectedPositions,  setSelectedPositions]   = useState(['bottom_center'])
  const [restrictedPositions,setRestrictedPositions] = useState([])
  const [savedPrefs,         setSavedPrefs]          = useState(DUMMY_SAVED_PREFS)
  const [activePrefId,       setActivePrefId]        = useState(null)
  const [newPrefName,        setNewPrefName]         = useState('')
  const [posStatus,          setPosStatus]           = useState('')
  const [overlayLink,        setOverlayLink]         = useState('')
  const [copiedLink,         setCopiedLink]          = useState(false)

  // Go Live multi-step
  const [goLiveStep,         setGoLiveStep]          = useState(1) // 1 | 2 | 3
  const [isStreaming,        setIsStreaming]          = useState(false)
  const [streamTitle,        setStreamTitle]         = useState('')
  const [streamLink,         setStreamLink]          = useState('')
  const [streamContent,      setStreamContent]       = useState('')
  const [streamStartTime,    setStreamStartTime]     = useState(null)
  const [streamElapsed,      setStreamElapsed]       = useState(0)
  const [adsAiredCount,      setAdsAiredCount]       = useState(0)

  // Playlist
  const [playlist,           setPlaylist]            = useState(DUMMY_PLAYLIST)
  const [playlistTab,        setPlaylistTab]         = useState('live')
  const [activeIndex,        setActiveIndex]         = useState(0)
  const [progressMap,        setProgressMap]         = useState({})
  const [adRequests,         setAdRequests]          = useState(DUMMY_REQUESTS)
  const [rejectedAds,        setRejectedAds]         = useState(DUMMY_REJECTED)

  // Misc
  const [previewOpen,        setPreviewOpen]         = useState(false)
  const [previewAd,          setPreviewAd]           = useState(null)
  const [isEditMode,         setIsEditMode]          = useState(false)
  const [checkedIds,         setCheckedIds]          = useState([])

  const syncRef    = useRef(null)
  const timerRef   = useRef(null)
  const playlistRef= useRef([])
  const gapRef     = useRef(20)
  const draggedRef = useRef(null)

  /* ── Auth + data load ── */
  useEffect(() => {
    const processUserData = (data) => {
      if (!data) return
      const u = data.user || data
      setUser(u)
      
      // Use id from user object
      const userId = u.id || u.uid
      setOverlayLink(`${window.location.origin}/overlay?id=${userId}`)
      
      // Load preferences if available
      if (data.preferences) {
        const p = data.preferences
        
        // Handle preferred positions
        if (p.preferred_positions) {
          try {
            const pos = typeof p.preferred_positions === 'string' 
              ? JSON.parse(p.preferred_positions) 
              : p.preferred_positions
            if (Array.isArray(pos)) setSelectedPositions(pos)
          } catch (e) { console.error('Error parsing positions', e) }
        }
        
        // Handle restricted positions
        if (p.restricted_positions) {
          try {
            const rpos = typeof p.restricted_positions === 'string'
              ? JSON.parse(p.restricted_positions)
              : p.restricted_positions
            if (Array.isArray(rpos)) setRestrictedPositions(rpos)
          } catch (e) { console.error('Error parsing restricted positions', e) }
        }
        
        // Handle other preferences
        if (p.gap_seconds !== undefined && p.gap_seconds !== null) setGapInput(p.gap_seconds)
        if (p.ads_enabled !== undefined && p.ads_enabled !== null) setAdsEnabledState(p.ads_enabled)
        if (p.live_stream_url) setStreamLink(p.live_stream_url)
      }
      
      // Load playlist if available
      if (data.playlist) {
        const list = data.playlist.campaign_ids || data.playlist.items || (Array.isArray(data.playlist) ? data.playlist : null)
        if (Array.isArray(list) && list.length > 0) {
          if (typeof list[0] === 'object') setPlaylist(list)
        }
      }
      
      setLoading(false)
    }

    const storedUser = localStorage.getItem('streamer_user')
    if (storedUser) {
      processUserData(JSON.parse(storedUser))
    } else {
      if (DEV_MODE) {
        processUserData(DUMMY_USER)
        return
      }
      getStreamerMe().then(u => {
        if (!u) { navigate('/login/streamer'); return }
        const userId = u.id || u.uid || (u.user && (u.user.id || u.user.uid)) || id
        if (userId && userId !== 'undefined') {
          fetchStreamerUser(userId).then(full => {
            processUserData(full || u)
          })
        } else {
          processUserData(u)
        }
      })
    }
  }, [navigate])

  /* ── Ad Requests Fetching & Caching ── */
  useEffect(() => {
    if (!user || DEV_MODE) return

    const tier = user.tier || 'Tier 5'
    const userId = user.id || user.uid || id
    if (!userId) return

    const cacheKey = `streamer_ad_requests_v3_${userId}_${tier}`
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        setAdRequests(JSON.parse(cached))
        return
      } catch (e) {
        console.error("Failed to parse cached ad requests", e)
      }
    }

    fetchTierBrands(tier).then(data => {
      if (data && data.items) {
        const mapped = data.items.flatMap(brand => 
          (brand.campaigns || []).map(camp => ({
            id: `req_${camp.id || camp.campaign_id}`,
            campaignId: camp.campaign_id || camp.id,
            brand: brand.brand_name,
            displayName: `${brand.brand_name} — ${camp.campaign_name}`,
            tier: camp.tier || tier,
            budgetRange: `₹${camp.estimated_cost_rupees || '0'}`,
            daysLive: camp.campaign_duration_days || 7,
            type: camp.ads && camp.ads.length > 0 ? camp.ads[0].ad_type : 'unknown',
            ads: camp.ads || []
          }))
        )
        setAdRequests(mapped)
        localStorage.setItem(cacheKey, JSON.stringify(mapped))
      }
    }).catch(err => console.error("Failed to fetch tier brands", err))
  }, [user, id])

  /* ── Keep refs in sync ── */
  useEffect(() => { playlistRef.current = playlist }, [playlist])
  useEffect(() => { gapRef.current = gapInput }, [gapInput])

  /* ── Sync loop ── */
  useEffect(() => {
    const liveAds = playlist.filter(a => a.status === 'live')
    if (liveAds.length > 0) startSync(liveAds)
    else stopSync()
    return () => stopSync()
  }, [playlist, gapInput])

  /* ── Stream elapsed timer ── */
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        setStreamElapsed(Math.floor((Date.now() - streamStartTime) / 1000))
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isStreaming, streamStartTime])

  const formatElapsed = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const startSync = (liveAds) => {
    stopSync()
    let prevIndex = -1
    const tick = () => {
      const gap = Number(gapRef.current)
      let total = 0
      liveAds.forEach(a => { total += a.duration + gap })
      const rel = (Date.now() / 1000) % total
      let acc = 0
      for (let i = 0; i < liveAds.length; i++) {
        const seg = liveAds[i].duration + gap
        if (rel >= acc && rel < acc + seg) {
          const t = rel - acc
          if (t < liveAds[i].duration + 1) {
            if (i !== prevIndex) {
              if (prevIndex !== -1) {
                setAdsAiredCount(c => c + 1)
              }
              prevIndex = i
              setActiveIndex(i)
            }
            setProgressMap(p => ({ ...p, [i]: Math.min(100, (t / liveAds[i].duration) * 100) }))
          }
          break
        }
        acc += seg
      }
    }
    tick()
    syncRef.current = setInterval(tick, 100)
  }
  const stopSync = () => clearInterval(syncRef.current)

  /* ── Actions ── */
  const approveRequest = (reqId, campaignId) => {
    if (!window.confirm('Approve this ad request?')) return
    const req = adRequests.find(r => r.id === reqId)
    if (!req) return

    const userId = user.id || user.uid || id
    
    // Persist to backend
    const adToApprove = req.ads?.[0]
    if (adToApprove) {
      postApprovedAd({
        streamer_id: userId,
        campaign_id: campaignId,
        brand_name: req.brand,
        ad_name: adToApprove.ad_name,
        ad_text: adToApprove.ad_copy,
        ad_media_url: adToApprove.image_url,
        ad_media_type: adToApprove.ad_type,
        approved_count: req.daysLive * 144, // assuming some frequency
        status: 'approved'
      })
    }

    setAdRequests(p => p.filter(r => r.id !== reqId))
    setPlaylist(p => [...p, {
      id: campaignId, name: req.displayName, brand: req.brand,
      duration: adToApprove?.duration_seconds || 15, 
      status: 'upcoming', 
      daysLeft: req.daysLive, 
      earnings: '—', 
      type: req.type,
      ads: req.ads
    }])
  }

  const rejectRequest = (reqId) => {
    if (!window.confirm('Reject this ad request?')) return
    const req = adRequests.find(r => r.id === reqId)
    setAdRequests(p => p.filter(r => r.id !== reqId))
    setRejectedAds(p => [...p, { id: reqId, name: req.displayName, brand: req.brand, reason: 'Rejected by streamer' }])
  }

  const applyPref = (pref) => {
    setSelectedPositions(pref.positions)
    setGapInput(pref.gap)
    setAdsEnabledState(pref.adsEnabled)
    setActivePrefId(pref.id)
  }

  const saveNewPref = () => {
    if (!newPrefName.trim()) return
    const newPref = {
      id: `p${Date.now()}`,
      name: newPrefName,
      positions: selectedPositions,
      gap: gapInput,
      adsEnabled,
      lastUsed: 'Just now',
    }
    setSavedPrefs(p => [newPref, ...p])
    setActivePrefId(newPref.id)
    setNewPrefName('')
    setPosStatus('Saved!')
    setTimeout(() => setPosStatus(''), 2000)
  }

  const cycleCellState = (pos) => {
    if (selectedPositions.includes(pos)) {
      setSelectedPositions(p => p.filter(x => x !== pos))
      setRestrictedPositions(p => [...p, pos])
    } else if (restrictedPositions.includes(pos)) {
      setRestrictedPositions(p => p.filter(x => x !== pos))
    } else {
      setSelectedPositions(p => [...p, pos])
    }
  }

  const getCellState = (pos) => {
    if (selectedPositions.includes(pos))   return 'preferred'
    if (restrictedPositions.includes(pos)) return 'restricted'
    return 'neutral'
  }

  const copyOverlayLink = () => {
    navigator.clipboard.writeText(overlayLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleDragStart = (e, i) => { draggedRef.current = i; e.dataTransfer.effectAllowed = 'move' }
  const handleDrop = (e, toIndex) => {
    e.stopPropagation()
    const from = draggedRef.current
    if (from === toIndex || from === null) return
    const next = [...playlist]
    const [item] = next.splice(from, 1)
    next.splice(toIndex, 0, item)
    setPlaylist(next)
    draggedRef.current = null
  }

  const deleteSelected = () => {
    if (!checkedIds.length || !window.confirm(`Remove ${checkedIds.length} ad(s)?`)) return
    setPlaylist(p => p.filter(i => !checkedIds.includes(i.id)))
    setCheckedIds([])
    setIsEditMode(false)
  }

  const handleLogout = () => { 
    localStorage.removeItem('streamer_user')
    if (DEV_MODE) navigate('/'); else logout() 
  }

  const startStream = () => {
    setIsStreaming(true)
    setStreamStartTime(Date.now())
    setAdsAiredCount(0)
    setStreamElapsed(0)
  }

  const endStream = () => {
    if (!window.confirm('End this stream?')) return
    setIsStreaming(false)
    setStreamStartTime(null)
    setStreamElapsed(0)
    setGoLiveStep(1)
  }

  const liveAds     = playlist.filter(a => a.status === 'live')
  const upcomingAds = playlist.filter(a => a.status === 'upcoming')
  const tierMeta    = TIER_META[user?.tier] || TIER_META['Tier 5']

  const step1Valid = streamTitle.trim() && streamLink.trim() && streamContent

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8fafc' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #EEF2FF', borderTopColor:'#3B5BFF', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="sd-page">

      {/* ══ TOP NAV ══ */}
      <nav className="sd-topnav">
        <div className="sd-topnav-left">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(v => !v)}>
            <span/><span/><span/>
          </button>
          <a href="/" className="sd-topnav-logo"><LogoIcon /> Overlays</a>
          <span className="sd-topnav-divider"/>
          <span className="sd-topnav-role">Streamer Portal</span>
        </div>
        <div className="sd-topnav-right">
          {DEV_MODE && <span className="sd-dev-chip">Dev Mode</span>}
          {isStreaming && (
            <div className="sd-live-indicator">
              <div className="sd-live-dot-anim"/>
              <span>Live · {formatElapsed(streamElapsed)}</span>
            </div>
          )}
          {!isStreaming && adsEnabled && (
            <div className="sd-live-indicator">
              <div className="sd-live-dot-anim"/>
              <span>Ads on</span>
            </div>
          )}
          <button className="sd-wallet-btn" title="Wallet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
              <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
            </svg>
          </button>
          <div className="sd-topnav-user">
            <div className="sd-user-avatar">
              {user?.picture ? (
                <img src={user.picture} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user?.name?.[0]
              )}
            </div>
            <div className="sd-user-info">
              <span className="sd-user-name">{user?.name}</span>
              <span className="sd-user-sub">{user?.channel_title || user?.channel || user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="sd-body">

        {/* ══ SIDEBAR ══ */}
        <aside className={`sd-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sd-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`sd-nav-item ${activePage === item.id ? 'active' : ''} ${item.id === 'stream' ? 'go-live' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                <span className={`sd-nav-icon ${item.id === 'stream' ? 'live-icon' : ''}`}>{item.icon}</span>
                {sidebarOpen && <span className="sd-nav-label">{item.label}</span>}
                {sidebarOpen && item.id === 'brands' && adRequests.length > 0 && (
                  <span className="sd-nav-badge">{adRequests.length}</span>
                )}
                {sidebarOpen && item.id === 'stream' && isStreaming && (
                  <span className="sd-nav-live-chip">LIVE</span>
                )}
              </button>
            ))}
          </div>
          <div className="sd-sidebar-bottom">
            <button className="sd-sidebar-logout" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {sidebarOpen && <span>Log out</span>}
            </button>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="sd-main">

          {/* ── OVERVIEW ── */}
          {activePage === 'overview' && (
            <div className="sd-content">
              <div className="sd-page-header">
                <div>
                  <div className="sd-eyebrow">Overview</div>
                  <h1 className="sd-page-title">Good morning, <em>{user?.name?.split(' ')[0]}.</em></h1>
                </div>
                <div className="sd-page-actions">
                  <button className="sd-btn-primary" onClick={() => setActivePage('stream')}>
                    ● Go live
                  </button>
                </div>
              </div>

              {/* Tier card + stats */}
              <div className="sd-overview-top">
                <div className="sd-tier-card" style={{ borderColor: tierMeta.border, background: tierMeta.bg }}>
                  <div className="sd-tier-badge-wrap">
                    <span className="sd-tier-name" style={{ color: tierMeta.color }}>{user?.tier || 'Tier 5'}</span>
                    <span className="sd-tier-viewers" style={{ color: tierMeta.color }}>{tierMeta.viewers} avg viewers</span>
                  </div>
                  <div className="sd-tier-desc">Rate multiplier <strong style={{ color: tierMeta.color }}>{tierMeta.rate}</strong></div>
                  <div className="sd-tier-channel">
                    <span className="sd-tier-channel-label">Channel</span>
                    <span className="sd-tier-channel-val">{user?.channel_title || user?.channel || 'Not connected'}</span>
                  </div>
                  <div className="sd-tier-channel">
                    <span className="sd-tier-channel-label">Avg viewers</span>
                    <span className="sd-tier-channel-val">{user?.avg_viewers?.toLocaleString() || user?.avgViewers?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="sd-tier-channel">
                    <span className="sd-tier-channel-label">Member since</span>
                    <span className="sd-tier-channel-val">{user?.joinedDate || 'Just joined'}</span>
                  </div>
                </div>

                <div className="sd-stats-col">
                  <div className="sd-stats-row">
                    {[
                      { label: 'Lifetime earnings',  value: DUMMY_EARNINGS.lifetime,  sub: 'All time' },
                      { label: 'This month',         value: DUMMY_EARNINGS.thisMonth, sub: 'June 2026', highlight: true },
                      { label: 'Next payout',        value: DUMMY_EARNINGS.nextPayout,sub: DUMMY_EARNINGS.nextPayoutDate },
                    ].map((s, i) => (
                      <div key={i} className={`sd-stat-card ${s.highlight ? 'highlight' : ''}`}>
                        <div className="sd-stat-value">{s.value}</div>
                        <div className="sd-stat-label">{s.label}</div>
                        <div className="sd-stat-sub">{s.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    {[
                      { label: 'Brands worked with', value: DUMMY_BRANDS.filter(b=>b.status!=='pending').length, sub: 'All time' },
                      { label: 'Total streams',       value: '84',  sub: 'With ads' },
                      { label: 'Live ads now',        value: liveAds.length, sub: 'In rotation' },
                    ].map((s, i) => (
                      <div key={i} className="sd-stat-card">
                        <div className="sd-stat-value">{s.value}</div>
                        <div className="sd-stat-label">{s.label}</div>
                        <div className="sd-stat-sub">{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Earnings chart + Stream history */}
              <div className="sd-row-2" style={{ marginBottom: '1.25rem' }}>
                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">Earnings</div>
                      <h2 className="sd-card-title">Revenue <em>over time</em></h2>
                    </div>
                    <span className="sd-earnings-chip">↑ {DUMMY_EARNINGS.thisMonth} this month</span>
                  </div>
                  <EarningsChart data={DUMMY_EARNINGS.chart} />
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">Recent Activity</div>
                      <h2 className="sd-card-title">Stream <em>history</em></h2>
                    </div>
                  </div>
                  <div className="sd-history-list">
                    {DUMMY_STREAM_HISTORY.map((s, i) => (
                      <div key={i} className="sd-history-row">
                        <div className="sd-history-info">
                          <span className="sd-history-date">{s.date}</span>
                          <span className="sd-history-meta">{s.duration} · {s.viewers}</span>
                          <div className="sd-history-brands">
                            {s.brands.map(b => (
                              <span key={b} className="sd-history-brand-chip">{b}</span>
                            ))}
                          </div>
                        </div>
                        <span className="sd-history-earn">{s.earnings}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live ads now */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <div>
                    <div className="sd-eyebrow">Now playing</div>
                    <h2 className="sd-card-title">Live <em>ad rotation</em></h2>
                  </div>
                  <button className="sd-btn-ghost sd-btn-sm" onClick={() => setActivePage('playlist')}>
                    Manage →
                  </button>
                </div>
                {liveAds.length === 0
                  ? <p className="sd-empty">No live ads right now.</p>
                  : (
                    <div className="sd-live-list">
                      {liveAds.map((ad, i) => {
                        const isPlaying = i === activeIndex
                        const prog = progressMap[i] || 0
                        return (
                          <div key={ad.id} className={`sd-live-row ${isPlaying ? 'now-playing' : ''}`}>
                            <div className="sd-live-indicator-dot" style={{ background: isPlaying ? '#10B981' : '#e2e8f0' }}/>
                            <div className="sd-live-info">
                              <span className="sd-live-name">{ad.name}</span>
                              <span className="sd-live-brand">{ad.brand} · {ad.duration}s · {ad.daysLeft}d left</span>
                            </div>
                            <span className="sd-live-earn">{ad.earnings}</span>
                            {isPlaying && (
                              <div className="sd-mini-progress">
                                <div className="sd-mini-fill" style={{ width: `${prog}%` }}/>
                              </div>
                            )}
                            {isPlaying && <span className="sd-now-badge">● NOW</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {/* ── PLAYLIST ── */}
          {activePage === 'playlist' && (
            <div className="sd-content">
              <div className="sd-page-header">
                <div>
                  <div className="sd-eyebrow">Ad Playlist</div>
                  <h1 className="sd-page-title">Your <em>ad schedule</em></h1>
                </div>
                <div className="sd-page-actions">
                  {isEditMode ? (
                    <>
                      {checkedIds.length > 0 && (
                        <button className="sd-btn-danger-sm" onClick={deleteSelected}>
                          Remove {checkedIds.length}
                        </button>
                      )}
                      <button className="sd-btn-ghost" onClick={() => { setIsEditMode(false); setCheckedIds([]) }}>Cancel</button>
                    </>
                  ) : (
                    <button className="sd-btn-ghost" onClick={() => setIsEditMode(true)}>Edit playlist</button>
                  )}
                </div>
              </div>

              <div className="sd-playlist-tabs">
                {[
                  { id: 'live',     label: 'Now Live',  count: liveAds.length },
                  { id: 'upcoming', label: 'Upcoming',  count: upcomingAds.length },
                  { id: 'ended',    label: 'Ended',     count: playlist.filter(a=>a.status==='ended').length },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`sd-playlist-tab ${playlistTab === t.id ? 'active' : ''}`}
                    onClick={() => setPlaylistTab(t.id)}
                  >
                    {t.label}
                    <span className={`sd-tab-count ${t.id === 'live' ? 'green' : ''}`}>{t.count}</span>
                  </button>
                ))}
              </div>

              <div className="sd-card" style={{ marginTop: '0' }}>
                {playlist.filter(a => a.status === playlistTab).length === 0 ? (
                  <p className="sd-empty">No {playlistTab} ads.</p>
                ) : (
                  <div className="sd-playlist-list">
                    {playlist.filter(a => a.status === playlistTab).map((ad, i) => {
                      const isPlaying = playlistTab === 'live' && i === activeIndex
                      const prog = progressMap[i] || 0
                      return (
                        <div
                          key={ad.id}
                          className={`sd-playlist-row ${isPlaying ? 'now-playing' : ''}`}
                          draggable={!isEditMode && playlistTab === 'live'}
                          onDragStart={e => handleDragStart(e, i)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleDrop(e, i)}
                        >
                          {isEditMode ? (
                            <input type="checkbox" className="sd-checkbox"
                              checked={checkedIds.includes(ad.id)}
                              onChange={e => setCheckedIds(prev =>
                                e.target.checked ? [...prev, ad.id] : prev.filter(x => x !== ad.id)
                              )}/>
                          ) : (
                            playlistTab === 'live' && <span className="sd-drag-handle">⠿</span>
                          )}
                          <div className="sd-pl-info">
                            <span className="sd-pl-name">{ad.name}</span>
                            <span className="sd-pl-meta">{ad.brand} · {ad.type?.replace('_',' ')} · {ad.duration}s</span>
                          </div>
                          <div className="sd-pl-right">
                            {ad.status === 'live' && (
                              <span className="sd-days-badge green">{ad.daysLeft}d left</span>
                            )}
                            {ad.status === 'upcoming' && (
                              <span className="sd-days-badge blue">Starts in {ad.daysLeft}d</span>
                            )}
                            {ad.status === 'ended' && (
                              <span className="sd-days-badge muted">Ended</span>
                            )}
                            <span className="sd-pl-earn">{ad.earnings}</span>
                            <button className="sd-btn-ghost sd-btn-xs"
                              onClick={() => { setPreviewAd(ad); setPreviewOpen(true) }}>
                              Preview
                            </button>
                          </div>
                          {isPlaying && (
                            <div className="sd-progress-bar">
                              <div className="sd-progress-fill" style={{ width: `${prog}%` }}/>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BRANDS & REQUESTS (merged) ── */}
          {activePage === 'brands' && (
            <div className="sd-content">
              <div className="sd-page-header">
                <div>
                  <div className="sd-eyebrow">Brands & Requests</div>
                  <h1 className="sd-page-title">Brands & <em>requests</em></h1>
                </div>
              </div>

              {/* ── Brand stats ── */}
              <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom:'1.25rem' }}>
                {[
                  { label: 'Total earned from brands', value: DUMMY_EARNINGS.lifetime, sub: 'All time' },
                  { label: 'Active brand relationships', value: DUMMY_BRANDS.filter(b=>b.status==='active').length, sub: 'Currently running', highlight: true },
                  { label: 'Total streams with ads',   value: '84', sub: 'Across all brands' },
                  { label: 'Pending requests',   value: adRequests.length, sub: 'Need review' },
                ].map((s, i) => (
                  <div key={i} className={`sd-stat-card ${s.highlight ? 'highlight' : ''}`}>
                    <div className="sd-stat-value">{s.value}</div>
                    <div className="sd-stat-label">{s.label}</div>
                    <div className="sd-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* ── Brand cards ── */}
              <div className="sd-card" style={{ marginBottom: '1.25rem' }}>
                <div className="sd-card-header">
                  <div>
                    <div className="sd-eyebrow">Partners</div>
                    <h2 className="sd-card-title">Brands I've <em>worked with</em></h2>
                  </div>
                  <span className="sd-earnings-chip">{DUMMY_BRANDS.filter(b=>b.status==='active').length} active</span>
                </div>
                <div className="sd-brands-grid">
                  {DUMMY_BRANDS.map(brand => (
                    <div key={brand.id} className="sd-brand-card" style={{ '--brand-color': brand.color }}>
                      <div className="sd-brand-card-top">
                        <div className="sd-brand-logo" style={{ background: brand.color, color: 'white' }}>
                          {brand.logo}
                        </div>
                        <div className="sd-brand-header-info">
                          <span className="sd-brand-name">{brand.name}</span>
                          <span className="sd-brand-category">{brand.category}</span>
                        </div>
                        <StatusBadge status={brand.status} />
                      </div>
                      <div className="sd-brand-earned">{brand.earned}</div>
                      <div className="sd-brand-earned-label">total earned</div>
                      <div className="sd-brand-stats">
                        <div className="sd-brand-stat">
                          <span className="sd-brand-stat-val">{brand.streams}</span>
                          <span className="sd-brand-stat-key">streams</span>
                        </div>
                        <div className="sd-brand-stat-divider"/>
                        <div className="sd-brand-stat">
                          <span className="sd-brand-stat-val">{brand.lastStream}</span>
                          <span className="sd-brand-stat-key">last stream</span>
                        </div>
                      </div>
                      <div className="sd-brand-bar-track">
                        <div className="sd-brand-bar-fill" style={{ background: brand.color, width: `${Math.min((parseInt(brand.earned.replace(/[^0-9]/g,'')) / 50000) * 100, 100)}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Ad requests section ── */}
              {adRequests.length === 0
                ? (
                  <div className="sd-card" style={{ marginBottom: '1.25rem' }}>
                    <div className="sd-card-header">
                      <div>
                        <div className="sd-eyebrow">Incoming</div>
                        <h2 className="sd-card-title">Ad <em>requests</em></h2>
                      </div>
                      <div className="sd-request-stats-inline">
                        <span className="sd-days-badge green">92% approval rate</span>
                        <span className="sd-days-badge blue">₹12,400 avg budget</span>
                      </div>
                    </div>
                    <p className="sd-empty">No pending requests — you're all caught up! 🎉</p>
                  </div>
                )
                : (
                  <div className="sd-card" style={{ marginBottom: '1.25rem' }}>
                    <div className="sd-card-header">
                      <div>
                        <div className="sd-eyebrow">Incoming</div>
                        <h2 className="sd-card-title">Ad <em>requests</em></h2>
                      </div>
                      <div className="sd-request-stats-inline">
                        <span className="sd-days-badge green">92% approval rate</span>
                        <span className="sd-days-badge blue">₹12,400 avg budget</span>
                        {adRequests.length > 0 && (
                          <span className="sd-nav-badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.55rem' }}>{adRequests.length} pending</span>
                        )}
                      </div>
                    </div>
                    <div className="sd-request-list">
                      {adRequests.map(req => (
                        <div key={req.id} className="sd-request-row">
                          <div className="sd-request-avatar">{req.brand[0]}</div>
                          <div className="sd-request-info">
                            <span className="sd-request-name">{req.displayName}</span>
                            <span className="sd-request-meta">
                              {req.tier} · {req.budgetRange} · {req.daysLive} days · {req.type?.replace('_',' ')}
                            </span>
                          </div>
                          <div className="sd-request-btns">
                            <button className="sd-btn-ghost sd-btn-sm"
                              onClick={() => { setPreviewAd(req); setPreviewOpen(true) }}>
                              Preview
                            </button>
                            <button className="sd-btn-primary sd-btn-sm" onClick={() => approveRequest(req.id, req.campaignId)}>Approve</button>
                            <button className="sd-btn-danger-sm" onClick={() => rejectRequest(req.id)}>Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              {rejectedAds.length > 0 && (
                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">Declined</div>
                      <h2 className="sd-card-title">Rejected <em>ads</em></h2>
                    </div>
                  </div>
                  <div className="sd-rejected-list">
                    {rejectedAds.map(ad => (
                      <div key={ad.id} className="sd-rejected-row">
                        <div className="sd-request-avatar" style={{ background: '#FEF2F2', color: '#EF4444' }}>{ad.brand?.[0] || '?'}</div>
                        <div className="sd-request-info">
                          <span className="sd-request-name">{ad.name}</span>
                          <span className="sd-request-meta">{ad.reason}</span>
                        </div>
                        <StatusBadge status="rejected" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              ── GO LIVE (multi-step) ──
          ══════════════════════════════════════════ */}
          {activePage === 'stream' && (
            <div className="sd-content">

              {/* ── ACTIVE STREAM VIEW ── */}
              {isStreaming ? (
                <>
                  <div className="sd-page-header">
                    <div>
                      <div className="sd-eyebrow" style={{ color: '#10B981' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#10B981', display:'inline-block', marginRight:6, animation:'pulseRing 1.5s ease infinite' }}/>
                        Streaming now
                      </div>
                      <h1 className="sd-page-title"><em>{streamTitle || 'My Stream'}</em></h1>
                    </div>
                    <div className="sd-page-actions">
                      <button className="sd-btn-danger-sm" style={{ padding:'0.6rem 1.3rem', fontSize:'0.85rem' }} onClick={endStream}>
                        ■ End stream
                      </button>
                    </div>
                  </div>

                  {/* Stream info bar */}
                  <div className="sd-stream-info-bar">
                    <div className="sd-stream-info-item">
                      <span className="sd-stream-info-label">Duration</span>
                      <span className="sd-stream-info-val">{formatElapsed(streamElapsed)}</span>
                    </div>
                    <div className="sd-stream-info-divider"/>
                    <div className="sd-stream-info-item">
                      <span className="sd-stream-info-label">Content</span>
                      <span className="sd-stream-info-val">{streamContent}</span>
                    </div>
                    <div className="sd-stream-info-divider"/>
                    <div className="sd-stream-info-item">
                      <span className="sd-stream-info-label">Stream link</span>
                      <a href={streamLink} target="_blank" rel="noreferrer" className="sd-stream-link-val">{streamLink}</a>
                    </div>
                  </div>

                  {/* Ad counter cards */}
                  <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom:'1.25rem' }}>
                    <div className="sd-stat-card sd-stat-card-green">
                      <div className="sd-stat-value">{adsAiredCount}</div>
                      <div className="sd-stat-label">Ads aired this stream</div>
                      <div className="sd-stat-sub">Since stream started</div>
                    </div>
                    <div className="sd-stat-card highlight">
                      <div className="sd-stat-value">{liveAds.length}</div>
                      <div className="sd-stat-label">Currently in rotation</div>
                      <div className="sd-stat-sub">Live ads playing now</div>
                    </div>
                    <div className="sd-stat-card">
                      <div className="sd-stat-value">{upcomingAds.length}</div>
                      <div className="sd-stat-label">Upcoming in stream</div>
                      <div className="sd-stat-sub">Queued and ready</div>
                    </div>
                  </div>

                  {/* Now playing + ad queue */}
                  <div className="sd-row-2" style={{ marginBottom: '1.25rem' }}>
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <div>
                          <div className="sd-eyebrow">Now playing</div>
                          <h2 className="sd-card-title">Live <em>rotation</em></h2>
                        </div>
                        <span className="sd-now-badge" style={{ alignSelf:'center' }}>● LIVE</span>
                      </div>
                      {liveAds.length === 0
                        ? <p className="sd-empty">No live ads.</p>
                        : (
                          <div className="sd-live-list">
                            {liveAds.map((ad, i) => {
                              const isPlaying = i === activeIndex
                              const prog = progressMap[i] || 0
                              return (
                                <div key={ad.id} className={`sd-live-row ${isPlaying ? 'now-playing' : ''}`}>
                                  <div className="sd-live-indicator-dot" style={{ background: isPlaying ? '#10B981' : '#e2e8f0' }}/>
                                  <div className="sd-live-info">
                                    <span className="sd-live-name">{ad.name}</span>
                                    <span className="sd-live-brand">{ad.brand} · {ad.duration}s</span>
                                  </div>
                                  {isPlaying && (
                                    <div className="sd-mini-progress">
                                      <div className="sd-mini-fill" style={{ width: `${prog}%` }}/>
                                    </div>
                                  )}
                                  {isPlaying && <span className="sd-now-badge">NOW</span>}
                                </div>
                              )
                            })}
                          </div>
                        )
                      }
                    </div>

                    <div className="sd-card">
                      <div className="sd-card-header">
                        <div>
                          <div className="sd-eyebrow">Queued</div>
                          <h2 className="sd-card-title">Upcoming <em>ads</em></h2>
                        </div>
                        <span className="sd-days-badge blue" style={{ alignSelf:'center' }}>{upcomingAds.length} queued</span>
                      </div>
                      {upcomingAds.length === 0
                        ? <p className="sd-empty">No upcoming ads queued.</p>
                        : (
                          <div className="sd-live-list">
                            {upcomingAds.map((ad, i) => (
                              <div key={ad.id} className="sd-live-row">
                                <div className="sd-live-indicator-dot" style={{ background: '#C7D2FE' }}/>
                                <div className="sd-live-info">
                                  <span className="sd-live-name">{ad.name}</span>
                                  <span className="sd-live-brand">{ad.brand} · {ad.duration}s · starts in {ad.daysLeft}d</span>
                                </div>
                                <span className="sd-days-badge blue">{ad.type?.replace('_',' ')}</span>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  </div>

                  {/* OBS overlay link */}
                  <div className="sd-card">
                    <div className="sd-card-header">
                      <div>
                        <div className="sd-eyebrow">OBS Setup</div>
                        <h2 className="sd-card-title">Your <em>overlay link</em></h2>
                      </div>
                    </div>
                    <div className="sd-link-row">
                      <input className="sd-input sd-input-mono" value={overlayLink} readOnly/>
                      <button className={`sd-btn-primary ${copiedLink ? 'copied' : ''}`} onClick={copyOverlayLink}>
                        {copiedLink ? '✓ Copied' : 'Copy link'}
                      </button>
                    </div>
                    <p className="sd-field-hint">Paste as a Browser Source in OBS · 1920×1080 · Transparent background</p>
                  </div>
                </>
              ) : (
                /* ── SETUP FLOW (not streaming) ── */
                <>
                  <div className="sd-page-header">
                    <div>
                      <div className="sd-eyebrow">Go Live</div>
                      <h1 className="sd-page-title">Start your <em>stream</em></h1>
                    </div>
                  </div>

                  {/* Step indicators */}
                  <div className="sd-step-bar">
                    {[
                      { n: 1, label: 'Stream details' },
                      { n: 2, label: 'Overlay preset' },
                      { n: 3, label: 'Confirm & go live' },
                    ].map((s, i) => (
                      <div key={s.n} className="sd-step-item">
                        <div className={`sd-step-circle ${goLiveStep === s.n ? 'active' : goLiveStep > s.n ? 'done' : ''}`}>
                          {goLiveStep > s.n ? '✓' : s.n}
                        </div>
                        <span className={`sd-step-label ${goLiveStep === s.n ? 'active' : ''}`}>{s.label}</span>
                        {i < 2 && <div className={`sd-step-line ${goLiveStep > s.n ? 'done' : ''}`}/>}
                      </div>
                    ))}
                  </div>

                  {/* ── STEP 1: Stream details ── */}
                  {goLiveStep === 1 && (
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <div>
                          <div className="sd-eyebrow">Step 1</div>
                          <h2 className="sd-card-title">Stream <em>details</em></h2>
                        </div>
                      </div>

                      <div className="sd-golive-fields">
                        <div className="sd-field">
                          <label className="sd-label">Stream title <span className="sd-required">*</span></label>
                          <input
                            className="sd-input"
                            placeholder="e.g. Late night gaming with the boys 🎮"
                            value={streamTitle}
                            onChange={e => setStreamTitle(e.target.value)}
                          />
                        </div>

                        <div className="sd-field">
                          <label className="sd-label">Stream link <span className="sd-required">*</span></label>
                          <input
                            className="sd-input"
                            placeholder="https://twitch.tv/alexplays or https://youtube.com/live/..."
                            value={streamLink}
                            onChange={e => setStreamLink(e.target.value)}
                          />
                          <span className="sd-field-hint">This helps brands confirm placement. Paste your live stream URL.</span>
                        </div>

                        <div className="sd-field">
                          <label className="sd-label">Stream content <span className="sd-required">*</span></label>
                          <select
                            className="sd-input sd-select"
                            value={streamContent}
                            onChange={e => setStreamContent(e.target.value)}
                          >
                            <option value="" disabled>Select content category…</option>
                            {STREAM_CONTENT_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <span className="sd-field-hint">Brands use this to ensure ad relevance to your audience.</span>
                        </div>
                      </div>

                      <div className="sd-step-actions">
                        <button
                          className="sd-btn-primary"
                          disabled={!step1Valid}
                          onClick={() => setGoLiveStep(2)}
                          style={{ opacity: step1Valid ? 1 : 0.45 }}
                        >
                          Next → Overlay preset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Preset ── */}
                  {goLiveStep === 2 && (
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <div>
                          <div className="sd-eyebrow">Step 2</div>
                          <h2 className="sd-card-title">Overlay <em>preset</em></h2>
                        </div>
                      </div>

                      <p className="sd-step-hint">Choose a saved overlay preset, or configure positions manually below.</p>

                      <div className="sd-saved-prefs-grid" style={{ marginBottom: '1.25rem' }}>
                        {savedPrefs.map(pref => (
                          <div
                            key={pref.id}
                            className={`sd-pref-card ${activePrefId === pref.id ? 'active' : ''}`}
                            onClick={() => applyPref(pref)}
                          >
                            <div className="sd-pref-card-top">
                              <span className="sd-pref-name">{pref.name}</span>
                              {activePrefId === pref.id && <span className="sd-pref-active-chip">Active</span>}
                            </div>
                            <div className="sd-pref-meta">
                              <span>{pref.positions.length} position{pref.positions.length !== 1 ? 's' : ''}</span>
                              <span>·</span>
                              <span>{pref.gap}s gap</span>
                              <span>·</span>
                              <span>{pref.adsEnabled ? 'Ads on' : 'Ads off'}</span>
                            </div>
                            <div className="sd-pref-positions">
                              {pref.positions.map(p => (
                                <span key={p} className="sd-pref-pos-chip">{p.replace(/_/g,' ')}</span>
                              ))}
                            </div>
                            <div className="sd-pref-last">Last used {pref.lastUsed}</div>
                          </div>
                        ))}
                      </div>

                      {/* Manual placement */}
                      <div className="sd-card" style={{ border:'1px dashed var(--border)', background:'var(--off)', marginBottom:'1.25rem' }}>
                        <div className="sd-card-header" style={{ marginBottom:'0.75rem' }}>
                          <div>
                            <div className="sd-eyebrow">Or customize</div>
                            <h3 className="sd-card-title" style={{ fontSize:'1.1rem' }}>Manual <em>placement</em></h3>
                          </div>
                          <p className="sd-pos-legend">
                            <span className="sd-legend-green">● preferred</span>
                            <span className="sd-legend-red">● blocked</span>
                            <span className="sd-legend-neutral">○ neutral</span>
                          </p>
                        </div>
                        <div className="sd-stream-preview" style={{ maxHeight:180 }}>
                          <div className="sd-stream-bg">
                            <div className="sd-stream-icon"><div className="sd-stream-play"/></div>
                          </div>
                          <div className="sd-placement-grid">
                            {ALL_POSITIONS.map(pos => {
                              const state = getCellState(pos)
                              const rank  = selectedPositions.indexOf(pos) + 1
                              return (
                                <div key={pos} className={`sd-grid-cell sd-cell-${state}`} onClick={() => cycleCellState(pos)}>
                                  {state === 'preferred'  && <span className="sd-cell-rank">{rank}</span>}
                                  {state === 'restricted' && <span className="sd-cell-x">✕</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div className="sd-setup-controls" style={{ marginTop:'1rem', marginBottom:0 }}>
                          <div className="sd-field">
                            <label className="sd-label">Gap between ads (seconds)</label>
                            <input className="sd-input sd-input-num" type="number" min="5"
                              value={gapInput} onChange={e => setGapInput(e.target.value)}/>
                          </div>
                          <div className="sd-field">
                            <label className="sd-label">Ads enabled</label>
                            <div className="sd-toggle-row">
                              <button className={`sd-toggle-btn ${adsEnabled ? 'on' : ''}`} onClick={() => setAdsEnabledState(v => !v)}>
                                <div className="sd-toggle-knob"/>
                              </button>
                              <span className="sd-toggle-label">{adsEnabled ? 'Ads on' : 'Ads off'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="sd-save-pref-row" style={{ marginTop:'1rem' }}>
                          <input className="sd-input" placeholder="Save as preset name…"
                            value={newPrefName} onChange={e => setNewPrefName(e.target.value)}/>
                          <button className="sd-btn-ghost" onClick={saveNewPref}>Save preset</button>
                        </div>
                        {posStatus && <span className="sd-saved-msg">{posStatus}</span>}
                      </div>

                      <div className="sd-step-actions">
                        <button className="sd-btn-ghost" onClick={() => setGoLiveStep(1)}>← Back</button>
                        <button className="sd-btn-primary" onClick={() => setGoLiveStep(3)}>
                          Next → Confirm
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: Brand list + Go Live ── */}
                  {goLiveStep === 3 && (
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <div>
                          <div className="sd-eyebrow">Step 3</div>
                          <h2 className="sd-card-title">Confirm & <em>go live</em></h2>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="sd-confirm-summary">
                        <div className="sd-confirm-row">
                          <span className="sd-confirm-label">Title</span>
                          <span className="sd-confirm-val">{streamTitle}</span>
                        </div>
                        <div className="sd-confirm-row">
                          <span className="sd-confirm-label">Link</span>
                          <a href={streamLink} className="sd-confirm-val sd-confirm-link" target="_blank" rel="noreferrer">{streamLink}</a>
                        </div>
                        <div className="sd-confirm-row">
                          <span className="sd-confirm-label">Content</span>
                          <span className="sd-confirm-val">{streamContent}</span>
                        </div>
                        <div className="sd-confirm-row">
                          <span className="sd-confirm-label">Overlay</span>
                          <span className="sd-confirm-val">
                            {activePrefId
                              ? savedPrefs.find(p => p.id === activePrefId)?.name || 'Custom setup'
                              : `Custom · ${selectedPositions.length} position(s)`
                            }
                          </span>
                        </div>
                      </div>

                      {/* OBS link */}
                      <div className="sd-link-row" style={{ margin:'1.25rem 0' }}>
                        <input className="sd-input sd-input-mono" value={overlayLink} readOnly/>
                        <button className={`sd-btn-ghost ${copiedLink ? '' : ''}`} onClick={copyOverlayLink}>
                          {copiedLink ? '✓ Copied' : 'Copy OBS link'}
                        </button>
                      </div>
                      <p className="sd-field-hint" style={{ marginBottom:'1.5rem' }}>Add this as a Browser Source in OBS before going live.</p>

                      {/* Brands in this stream */}
                      <div className="sd-eyebrow" style={{ marginBottom:'0.75rem' }}>Brands running during this stream</div>
                      {liveAds.length === 0 && upcomingAds.length === 0 ? (
                        <p className="sd-empty">No active brand campaigns at the moment.</p>
                      ) : (
                        <div className="sd-confirm-brands">
                          {[...liveAds, ...upcomingAds].map(ad => {
                            const brand = DUMMY_BRANDS.find(b => b.name === ad.brand)
                            return (
                              <div key={ad.id} className="sd-confirm-brand-row">
                                <div className="sd-brand-logo-sm" style={{ background: brand?.color || '#3B5BFF', color:'white' }}>
                                  {ad.brand[0]}
                                </div>
                                <div className="sd-request-info">
                                  <span className="sd-request-name">{ad.name}</span>
                                  <span className="sd-request-meta">{ad.brand} · {ad.duration}s · {ad.type?.replace('_',' ')}</span>
                                </div>
                                <StatusBadge status={ad.status} />
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="sd-step-actions" style={{ marginTop:'2rem' }}>
                        <button className="sd-btn-ghost" onClick={() => setGoLiveStep(2)}>← Back</button>
                        <button
                          className="sd-btn-primary sd-btn-go-live"
                          onClick={startStream}
                        >
                          ● Start streaming
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── EARNINGS ── */}
          {activePage === 'earnings' && (
            <div className="sd-content">
              <div className="sd-page-header">
                <div>
                  <div className="sd-eyebrow">Earnings</div>
                  <h1 className="sd-page-title">Financial <em>overview</em></h1>
                </div>
              </div>

              <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom:'1.25rem' }}>
                {[
                  { label: 'Lifetime earnings',  value: DUMMY_EARNINGS.lifetime,  sub: 'All time'    },
                  { label: 'This month',          value: DUMMY_EARNINGS.thisMonth, sub: 'June 2026', highlight: true },
                  { label: 'Next payout',         value: DUMMY_EARNINGS.nextPayout,sub: DUMMY_EARNINGS.nextPayoutDate },
                  { label: 'Avg per stream',      value: '₹2,191', sub: 'Per stream with ads' },
                ].map((s, i) => (
                  <div key={i} className={`sd-stat-card ${s.highlight ? 'highlight' : ''}`}>
                    <div className="sd-stat-value">{s.value}</div>
                    <div className="sd-stat-label">{s.label}</div>
                    <div className="sd-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="sd-row-2" style={{ marginBottom: '1.25rem' }}>
                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">Monthly trend</div>
                      <h2 className="sd-card-title">Earnings <em>chart</em></h2>
                    </div>
                  </div>
                  <EarningsChart data={DUMMY_EARNINGS.chart} />
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">By brand</div>
                      <h2 className="sd-card-title">Earnings <em>breakdown</em></h2>
                    </div>
                  </div>
                  <div className="sd-brand-breakdown">
                    {DUMMY_BRANDS.filter(b => b.status !== 'pending').map(brand => (
                      <div key={brand.id} className="sd-breakdown-row">
                        <div className="sd-brand-logo-sm" style={{ background: brand.color, color:'white' }}>{brand.logo}</div>
                        <div className="sd-breakdown-info">
                          <span className="sd-breakdown-name">{brand.name}</span>
                          <div className="sd-breakdown-bar-track">
                            <div className="sd-breakdown-bar" style={{ background: brand.color, width: `${Math.min((parseInt(brand.earned.replace(/[^0-9]/g,'')) / 50000)*100,100)}%` }}/>
                          </div>
                        </div>
                        <span className="sd-breakdown-amount">{brand.earned}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sd-card">
                <div className="sd-card-header">
                  <div>
                    <div className="sd-eyebrow">Payout history</div>
                    <h2 className="sd-card-title">Friday <em>payouts</em></h2>
                  </div>
                </div>
                <div className="sd-table-wrap">
                  <table className="sd-table">
                    <thead>
                      <tr><th>Date</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {DUMMY_PAYOUT_HISTORY.map((p, i) => (
                        <tr key={i}>
                          <td className="sd-muted">{p.date}</td>
                          <td><strong>{p.amount}</strong></td>
                          <td><StatusBadge status={p.status}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activePage === 'settings' && (
            <div className="sd-content">
              <div className="sd-page-header">
                <div>
                  <div className="sd-eyebrow">Settings</div>
                  <h1 className="sd-page-title">Account <em>settings</em></h1>
                </div>
              </div>

              <div className="sd-settings-grid">
                <div className="sd-card">
                  <div className="sd-card-header">
                    <div><div className="sd-eyebrow">Profile</div><h2 className="sd-card-title">Your <em>info</em></h2></div>
                  </div>
                  <div className="sd-settings-fields">
                    {[
                      { label: 'Full name',   value: user?.name  },
                      { label: 'Email',       value: user?.email },
                      { label: 'Channel name',value: user?.channel },
                    ].map(f => (
                      <div key={f.label} className="sd-settings-field">
                        <label className="sd-settings-label">{f.label}</label>
                        <input className="sd-input" defaultValue={f.value}/>
                      </div>
                    ))}
                    <button className="sd-btn-primary" style={{ marginTop:'0.75rem' }}>Save changes</button>
                  </div>
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <div><div className="sd-eyebrow">Notifications</div><h2 className="sd-card-title">Email <em>alerts</em></h2></div>
                  </div>
                  <div className="sd-settings-fields">
                    {[
                      'New brand request received',
                      'Campaign goes live on my stream',
                      'Campaign ends on my stream',
                      'Friday payout processed',
                      'Weekly earnings summary',
                      'Tier upgrade notification',
                    ].map(pref => (
                      <label key={pref} className="sd-pref-row">
                        <input type="checkbox" defaultChecked className="sd-pref-check"/>
                        <span>{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <div><div className="sd-eyebrow">Saved Presets</div><h2 className="sd-card-title">Stream <em>preferences</em></h2></div>
                  </div>
                  <div className="sd-saved-presets-list">
                    {savedPrefs.map(pref => (
                      <div key={pref.id} className="sd-saved-preset-row">
                        <div className="sd-preset-info">
                          <span className="sd-preset-name">{pref.name}</span>
                          <span className="sd-preset-meta">{pref.positions.length} positions · {pref.gap}s gap · Last used {pref.lastUsed}</span>
                        </div>
                        <div style={{ display:'flex', gap:'0.5rem' }}>
                          <button className="sd-btn-ghost sd-btn-sm" onClick={() => { applyPref(pref); setActivePage('stream') }}>Use</button>
                          <button className="sd-btn-ghost sd-btn-sm" onClick={() => setSavedPrefs(p => p.filter(x => x.id !== pref.id))}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <div><div className="sd-eyebrow">Payout</div><h2 className="sd-card-title">Bank <em>details</em></h2></div>
                  </div>
                  <div className="sd-settings-fields">
                    {[
                      { label: 'Account holder', value: user?.name },
                      { label: 'Account number', value: '•••• •••• 4821' },
                      { label: 'IFSC code',      value: 'HDFC0001234' },
                    ].map(f => (
                      <div key={f.label} className="sd-settings-field">
                        <label className="sd-settings-label">{f.label}</label>
                        <input className="sd-input" defaultValue={f.value}/>
                      </div>
                    ))}
                    <button className="sd-btn-primary" style={{ marginTop:'0.75rem' }}>Update bank details</button>
                  </div>
                </div>

                <div className="sd-card sd-card-danger">
                  <div className="sd-card-header">
                    <div><div className="sd-eyebrow">Danger zone</div><h2 className="sd-card-title">Account <em>actions</em></h2></div>
                  </div>
                  <p className="sd-danger-desc">Permanently delete your account and all stream & earnings data. This cannot be undone.</p>
                  <button className="sd-btn-danger-outline">Delete account</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── PREVIEW MODAL ── */}
      {previewOpen && (
        <div className="sd-modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="sd-modal sd-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-head">
              <div>
                <div className="sd-eyebrow">Ad Preview</div>
                <h3 className="sd-modal-title">{previewAd?.name || 'Preview'}</h3>
                {previewAd?.brand && <div className="sd-modal-brand-chip">{previewAd.brand}</div>}
              </div>
              <button className="sd-modal-close" onClick={() => setPreviewOpen(false)}>✕</button>
            </div>
            <div className="sd-simulator">
              <div className="sd-sim-bg" style={{
                containerType: 'inline-size',
                ...(previewAd?.ads?.[0]
                  ? {
                      background: previewAd.ads[0].stream_background_url 
                        ? `url(${previewAd.ads[0].stream_background_url}) center/cover no-repeat` 
                        : (previewAd.ads[0].canvas_background || '#0d0d1a')
                    }
                  : {})
              }}>
                <div className="sd-sim-play-icon"><div className="sd-sim-triangle"/></div>
                <div className="sd-sim-bar">
                  <div className="sd-sim-progress"><div className="sd-sim-dot"/></div>
                </div>

                {/* Actual Ad Overlay Preview - High Fidelity (1920x1080 mapped via CSS percentages) */}
                {previewAd?.ads && previewAd.ads.length > 0 && (() => {
                  const ad = previewAd.ads[0];
                  const allowedCells = ad.grid_cell_placement ? ad.grid_cell_placement.split(',').map(Number) : [6,7,8];
                  const bounds = getGridBounds(allowedCells);

                  return (
                    <div className="sd-sim-ad-container" style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none'
                    }}>
                      {/* Banner Container */}
                      <div style={{
                        position: 'absolute',
                        left: `${(bounds.x / 1920) * 100}%`,
                        top: `${(bounds.y / 1080) * 100}%`,
                        width: `${(bounds.w / 1920) * 100}%`,
                        height: `${(bounds.h / 1080) * 100}%`,
                        background: ad.banner_background_color || 'transparent',
                        borderRadius: '0px', 
                        boxShadow: ad.banner_background_color ? '0 10px 30px rgba(0,0,0,0.25)' : 'none',
                        overflow: 'hidden',
                        zIndex: 1
                      }}>
                        {/* Image Layer */}
                        {ad.image_url && (
                          <img 
                            src={ad.image_url} 
                            alt="" 
                            style={{
                              position: 'absolute',
                              left: `${(Math.max(0, ad.image_x || 0) / bounds.w) * 100}%`,
                              top: `${(Math.max(0, ad.image_y || 0) / bounds.h) * 100}%`,
                              width: `${((ad.image_width || 300) / bounds.w) * 100}%`,
                              height: 'auto',
                              transform: `scale(${ad.content_zoom || 1}) rotate(${ad.image_rotate || 0}deg)`,
                              transformOrigin: 'top left',
                              zIndex: ad.z_order || 1,
                              objectFit: 'contain'
                            }} 
                          />
                        )}

                        {/* Text Layer */}
                        {ad.ad_copy && (() => {
                          let styles = {};
                          try {
                            const parsed = typeof ad.text_style === 'string' ? JSON.parse(ad.text_style) : ad.text_style;
                            if (parsed.bold) styles.fontWeight = 'bold';
                            if (parsed.italic) styles.fontStyle = 'italic';
                            if (parsed.underline) styles.textDecoration = 'underline';
                            if (parsed.heading) styles.textTransform = 'uppercase';
                          } catch (e) {}

                          return (
                            <div style={{
                              position: 'absolute',
                              left: `${(Math.max(0, ad.text_x || 0) / bounds.w) * 100}%`,
                              top: `${(Math.max(0, ad.text_y || 0) / bounds.h) * 100}%`,
                              color: ad.text_color || '#ffffff',
                              fontSize: `calc(${(ad.text_size || 24) / 1920} * 100cqw)`, 
                              zIndex: ad.text_z_order || 2,
                              fontFamily: 'Geist, sans-serif',
                              whiteSpace: 'nowrap',
                              padding: `calc(8 / 1920 * 100cqw) calc(16 / 1920 * 100cqw)`,
                              transform: `scale(${ad.content_zoom || 1})`,
                              transformOrigin: 'top left',
                              ...styles
                            }}>
                              {ad.ad_copy}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="sd-modal-footer" style={{ padding: '1.5rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="sd-btn-ghost" onClick={() => setPreviewOpen(false)}>Close</button>
              <button className="sd-btn-danger-sm" style={{ padding: '0.6rem 1.3rem' }} onClick={() => { rejectRequest(previewAd.id); setPreviewOpen(false); }}>Reject</button>
              <button className="sd-btn-primary" onClick={() => { approveRequest(previewAd.id, previewAd.campaignId); setPreviewOpen(false); }}>Approve Request</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}