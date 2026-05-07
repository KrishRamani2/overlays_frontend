import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { getStreamerMe, logout, apiFetch, fetchStreamerUser, fetchTierBrands, postApprovedAd, fetchApprovedAds, postRejectedAd, fetchRejectedAds, updateApprovedAd, startStreamSession, updatePlaysPerStream, getPlaysPerStream, createPlaysPerStream, updateAdPlaysPerStream, fetchStreamerWallet, updateStreamerWallet, saveStreamEarnings, endStreamSession } from '../api/auth'
import { useParams, useNavigate } from 'react-router-dom'
import { setSecureItem, getSecureItem, removeSecureItem } from '../utils/secureStorage'
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
  const [streamAdOrder,      setStreamAdOrder]       = useState([])
  const [showAdPicker,       setShowAdPicker]        = useState(false)
  const [selectedStreamAds,  setSelectedStreamAds]   = useState([])
  const [newPrefName,        setNewPrefName]         = useState('')
  const [posStatus,          setPosStatus]           = useState('')
  const [overlayLink,        setOverlayLink]         = useState('')
  const [copiedLink,         setCopiedLink]          = useState(false)
  const [streamSessionData,  setStreamSessionData]   = useState(null)

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
  const [playlist,           setPlaylist]            = useState(DEV_MODE ? DUMMY_PLAYLIST : [])
  const [playlistTab,        setPlaylistTab]         = useState('live')
  const [activeIndex,        setActiveIndex]         = useState(0)
  const [progressMap,        setProgressMap]         = useState({})
  const [adRequests,         setAdRequests]          = useState(DEV_MODE ? DUMMY_REQUESTS : [])
  const [rejectedAds,        setRejectedAds]         = useState(DEV_MODE ? DUMMY_REJECTED : [])
  const [countdownMap,       setCountdownMap]        = useState({}) // { index: secondsUntilPlay }
  const [streamPlaysMap,     setStreamPlaysMap]      = useState({}) // { adId: playsRemainingThisStream }

  // Misc
  const [previewOpen,        setPreviewOpen]         = useState(false)
  const [previewAd,          setPreviewAd]           = useState(null)
  const [expandedBrandRequests, setExpandedBrandRequests] = useState({})
  const [expandedPlaylistBrands, setExpandedPlaylistBrands] = useState({})
  const [expandedPickerBrands,  setExpandedPickerBrands]  = useState({})
  const [selectedBrandAdsModal, setSelectedBrandAdsModal] = useState(null)
  const [selectedBrandModal,    setSelectedBrandModal]    = useState(null)
  const [selectedBrandRequestModal, setSelectedBrandRequestModal] = useState(null)
  const [walletInfo,         setWalletInfo]          = useState({ account_number: '', ifsc_code: '', account_holder_name: '', upi_id: '' })
  const [completedStreams,   setCompletedStreams]    = useState([])
  const [expandedStreamId,   setExpandedStreamId]    = useState(null)
  const [totalWalletEarnings, setTotalWalletEarnings] = useState(0)
  const [currentMonthEarnings, setCurrentMonthEarnings] = useState(0)
  const [currentMonthLabel,  setCurrentMonthLabel]   = useState('')
  const [monthlyChart,       setMonthlyChart]        = useState([])
  const [brandsWorkedWith,   setBrandsWorkedWith]    = useState([])
  const [totalStreamsDone,   setTotalStreamsDone]    = useState(0)
  const [totalPlaylistAds,   setTotalPlaylistAds]    = useState(0)
  const [savingWallet,       setSavingWallet]        = useState(false)
  const [isEditMode,         setIsEditMode]          = useState(false)
  const [checkedIds,         setCheckedIds]          = useState([])

  const syncRef       = useRef(null)
  const timerRef      = useRef(null)
  const playlistRef   = useRef([])
  const gapRef        = useRef(20)
  const draggedRef    = useRef(null)
  const streamPlaysRef= useRef({}) // live ref so sync loop can read without stale closure

  // ── Derived state for live brands and statistics ──
  const { liveBrands, brandStats } = useMemo(() => {
    const brandsMap = {}
    let totalLifetimeCents = 0
    let totalStreamsWithAds = completedStreams.length

    // 1. Process Completed Streams (Historical data)
    completedStreams.forEach(stream => {
      totalLifetimeCents += (stream.total_earned_cents || 0)
      const ads = stream.ads || []
      ads.forEach(ad => {
        // Try to find the actual brand name from the current playlist using ad_id or ad_name
        const playlistAd = playlist.find(p => p.backendId === ad.ad_id || p.name === ad.ad_name)
        const name = ad.brand_name || ad.brand || playlistAd?.brand || playlistAd?.brand_name || 'Unknown Brand'

        if (!brandsMap[name]) {
          brandsMap[name] = { 
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name, 
            category: 'Partner', 
            color: '#3B5BFF', 
            logo: name[0],
            earned_cents: 0, 
            streamsCount: 0, 
            lastStreamDate: stream.stream_date,
            status: 'ended'
          }
        }
        brandsMap[name].earned_cents += (ad.earned_cents || 0)
        brandsMap[name].streamsCount += 1
        if (new Date(stream.stream_date) > new Date(brandsMap[name].lastStreamDate)) {
          brandsMap[name].lastStreamDate = stream.stream_date
        }
      })
    })

    // 2. Process Current Playlist (Active brands)
    playlist.forEach(ad => {
      const name = ad.brand_name || ad.brand || 'Unknown Brand'
      const isActive = ad.plays_per_stream !== 0
      if (!brandsMap[name]) {
        brandsMap[name] = { 
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name, 
          category: 'Partner', 
          color: '#3B5BFF', 
          logo: name[0],
          earned_cents: 0, 
          streamsCount: 0, 
          lastStreamDate: 'Never',
          status: isActive ? 'active' : 'ended'
        }
      } else {
        if (isActive) {
          brandsMap[name].status = 'active'
        }
      }
    })

    // 3. Process Ad Requests (Potential brands)
    adRequests.forEach(req => {
      const name = req.brandName || req.brand || 'Potential Partner'
      if (!brandsMap[name]) {
        brandsMap[name] = {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          category: req.brandCategory || 'Potential Partner',
          color: '#CBD5E1',
          logo: name[0],
          earned_cents: 0,
          streamsCount: 0,
          lastStreamDate: 'Never',
          status: 'pending'
        }
      }
    })

    const brandsList = Object.values(brandsMap).sort((a, b) => b.earned_cents - a.earned_cents)

    return { 
      liveBrands: brandsList,
      brandStats: {
        totalEarned: totalLifetimeCents / 100,
        activeCount: brandsList.filter(b => b.status === 'active').length,
        totalStreams: totalStreamsWithAds,
        pendingCount: adRequests.length
      }
    }
  }, [completedStreams, playlist, adRequests])

  /* ── Auth + data load ── */
  useEffect(() => {
    const processUserData = (data) => {
      if (!data) return
      const u = data.user || data
      setUser(u)
      
      // Use id from user object
      const userId = u.id || u.uid
      // Default overlay link — gets replaced with a long session link when going live
      setOverlayLink(`http://127.0.0.1:5000/api/overlay/${userId}`)
      
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

    const storedUser = getSecureItem('streamer_user')
    if (storedUser) {
      processUserData(storedUser)
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

  /* ── Load Wallet and Earnings ── */
  useEffect(() => {
    if (!user) return
    const userId = user.id || user.uid || id
    fetchStreamerWallet(userId).then(res => {
      if (res) {
        if (res.payout_details)              setWalletInfo(res.payout_details)
        if (res.streams)                     setCompletedStreams(res.streams)
        if (res.total_earned_cents != null)  setTotalWalletEarnings(res.total_earned_cents)
        if (res.current_month_earned_cents != null) setCurrentMonthEarnings(res.current_month_earned_cents)
        if (res.current_month_label)         setCurrentMonthLabel(res.current_month_label)
        if (res.monthly_chart)               setMonthlyChart(res.monthly_chart)
        if (res.brands_worked_with)          setBrandsWorkedWith(res.brands_worked_with)
        if (res.total_streams_done != null)  setTotalStreamsDone(res.total_streams_done)
        if (res.total_playlist_ads != null)  setTotalPlaylistAds(res.total_playlist_ads)
      }
    }).catch(err => console.error('Error fetching wallet:', err))
  }, [user, activePage])
  useEffect(() => {
    if (!user || DEV_MODE) return

    const userId = user?.id || user?.uid || id
    if (!userId) return

    const tier = user?.tier || 'Tier 5'
    const playlistKey = `streamer_playlist_${userId}`
    const rejectedKey = `streamer_rejected_${userId}`

    // Load from cache first for instant UI
    const cachedPlaylist = getSecureItem(playlistKey)
    if (cachedPlaylist) setPlaylist(cachedPlaylist)
    
    const cachedRejected = getSecureItem(rejectedKey)
    if (cachedRejected) setRejectedAds(cachedRejected)

    // Load cached stream ad selection
    const cachedStreamAds = getSecureItem(`streamer_stream_ads_${userId}`)
    if (cachedStreamAds) setSelectedStreamAds(cachedStreamAds)

    // Restore stream plays map from cache (survives page refresh mid-stream)
    const cachedStreamPlays = getSecureItem(`streamer_stream_plays_${userId}`)
    if (cachedStreamPlays) {
      streamPlaysRef.current = cachedStreamPlays
      setStreamPlaysMap(cachedStreamPlays)
    }

    // ── Restore active stream session on page refresh ──
    const savedSession = sessionStorage.getItem(`stream_session_${userId}`)
    if (savedSession) {
      try {
        const sess = JSON.parse(savedSession)
        if (sess.isStreaming) {
          setIsStreaming(true)
          setStreamTitle(sess.streamTitle || '')
          setStreamLink(sess.streamLink || '')
          setStreamContent(sess.streamContent || '')
          setStreamStartTime(sess.streamStartTime || Date.now())
          setAdsAiredCount(sess.adsAiredCount || 0)
          if (sess.selectedStreamAds) setSelectedStreamAds(sess.selectedStreamAds)
        }
      } catch (e) { console.error('Error restoring stream session', e) }
    }

    // Check if we already have the API data cached within the last 5 minutes
    const lastFetchTime = getSecureItem(`streamer_last_fetch_${userId}`)
    const cachedAdRequests = getSecureItem(`streamer_ad_requests_${userId}`)
    const now = Date.now()

    if (lastFetchTime && now - lastFetchTime < 300000 && cachedPlaylist && cachedRejected && cachedAdRequests) {
      setAdRequests(cachedAdRequests)
      return // skip hitting the backend
    }

    Promise.all([
      fetchTierBrands(tier),
      fetchApprovedAds(userId),
      fetchRejectedAds(userId)
    ]).then(([brandData, approvedData, rejectedData]) => {
      // Mark as fetched
      setSecureItem(`streamer_last_fetch_${userId}`, now)
      if (brandData && brandData.items) {
        const approvedSet = new Set((approvedData || []).map(a => a.ad_name))
        const rejectedSet = new Set((rejectedData || []).map(r => r.ad_name))
        const approvedCampaignSet = new Set((approvedData || []).map(a => a.campaign_id).filter(Boolean))
        const rejectedCampaignSet = new Set((rejectedData || []).map(r => r.campaign_id).filter(Boolean))
        const approvedBrandsSet = new Set((approvedData || []).map(a => a.brand_name).filter(Boolean))
        const seenCampaignIds = new Set()
        const seenDisplayNames = new Set()
        const adsToAutoApprove = []

        let mapped = brandData.items.map(brand => {
          const validAdsForBrand = []
          let totalBrandPay = 0
          
          ;(brand.campaigns || []).forEach(camp => {
             const budget = camp.estimated_cost_rupees || 0
             const playCount = camp.play_count || 1
             const amountPerPlay = budget / playCount
             const displayName = `${brand.brand_name} — ${camp.campaign_name || 'Unnamed Campaign'}`
             const campaignId = camp.campaign_id || camp.id

             if (campaignId && (approvedCampaignSet.has(campaignId) || rejectedCampaignSet.has(String(campaignId)))) return
             if (campaignId && seenCampaignIds.has(campaignId)) return
             if (displayName && seenDisplayNames.has(displayName)) return
             
             if (campaignId) seenCampaignIds.add(campaignId)
             if (displayName) seenDisplayNames.add(displayName)

             const campAds = camp.ads || []
             campAds.forEach(ad => {
                const adName = ad.ad_name || camp.campaign_name || displayName
                if (approvedSet.has(adName) || rejectedSet.has(adName)) return
                
                const adReqObj = {
                   id: `req_${campaignId}_${ad.id || Math.random()}`,
                   campaignId: campaignId,
                   campaignName: camp.campaign_name || 'Unnamed Campaign',
                   brand: brand.brand_name,
                   brandCategory: brand.brand_category,
                   displayName: displayName,
                   tier: camp.tier || tier,
                   amountPerPlay: amountPerPlay,
                   daysLive: camp.campaign_duration_days || 7,
                   type: ad.ad_type || 'unknown',
                   approvedCount: camp.play_count || 10,
                   playsPerStream: ad.plays_per_stream || 24,
                   ads: [ad],
                   layout_json: ad
                }
                
                if (approvedBrandsSet.has(brand.brand_name)) {
                   adsToAutoApprove.push({ brand, adReq: adReqObj })
                   return; // Don't add to validAdsForBrand
                }

                validAdsForBrand.push(adReqObj)
                totalBrandPay += amountPerPlay
             })
          })

          return {
             id: `brand_${brand.brand_id || brand.brand_name}`,
             brandName: brand.brand_name,
             brandCategory: brand.brand_category || 'Partner',
             totalPlayCount: brand.total_play_count,
             totalBrandPay: totalBrandPay,
             ads: validAdsForBrand
          }
        }).filter(b => b.ads.length > 0).sort((a, b) => b.totalBrandPay - a.totalBrandPay)
        
        setAdRequests(mapped)
        setSecureItem(`streamer_ad_requests_${userId}`, mapped)

        // Extract real plays_per_stream from the brandData items for lookup
        const realPlaysMap = {}
        const realPaysMap = {}
        if (brandData && brandData.items) {
          brandData.items.forEach(b => {
            (b.campaigns || []).forEach(c => {
              const budget = c.estimated_cost_rupees || 0
              const playCount = c.play_count || 1
              const amountPerPlay = budget / playCount
              
              ;(c.ads || []).forEach(a => {
                if (a.plays_per_stream != null) {
                  if (c.campaign_id) realPlaysMap[`${c.campaign_id}_${a.ad_name}`] = a.plays_per_stream
                  if (c.id) realPlaysMap[`${c.id}_${a.ad_name}`] = a.plays_per_stream
                }
                if (c.campaign_id) realPaysMap[`${c.campaign_id}_${a.ad_name}`] = amountPerPlay
                if (c.id) realPaysMap[`${c.id}_${a.ad_name}`] = amountPerPlay
              })
            })
          })
        }

        if (approvedData) {
          const mappedPlaylist = approvedData.map(ad => {
            const layout = ad.layout_json || {}
            let gridCellsStr = ''
            if (layout.grid_cell_placement) {
              gridCellsStr = Array.isArray(layout.grid_cell_placement)
                ? layout.grid_cell_placement.join(',')
                : String(layout.grid_cell_placement)
            } else if (ad.grid_selection) {
              gridCellsStr = Array.isArray(ad.grid_selection)
                ? ad.grid_selection.join(',')
                : String(ad.grid_selection)
            }

            const originalAd = {
              ...layout,
              media_url: ad.ad_media_url || layout.media_url || layout.image_url,
              ad_type: ad.ad_media_type || layout.ad_type,
              grid_cell_placement: gridCellsStr || '6,7,8'
            }

            const realPlays = realPlaysMap[`${ad.campaign_id}_${ad.ad_name}`] || realPlaysMap[`${ad.campaign_db_id}_${ad.ad_name}`] || 24

            const adThumb = ad.ad_media_url || layout.media_url || layout.image_url
            return {
              id: `approved_${ad.id}`,
              backendId: ad.id,
              campaignId: ad.campaign_id,
              name: ad.ad_name,
              brand: ad.brand_name,
              brandCategory: ad.brand_category,
              duration: ad.show_duration || 10,
              status: (ad.status === 'approved' || ad.status === 'partially_used') ? 'live' : ad.status,
              daysLeft: 0,
              earnings: '—',
              amountPerPlay: ad.amount_per_play || realPaysMap[`${ad.campaign_id}_${ad.ad_name}`] || realPaysMap[`${ad.campaign_db_id}_${ad.ad_name}`] || 0,
              type: ad.ad_media_type || 'text',
              media_url: adThumb,
              remaining_count: ad.remaining_count,
              approved_count: ad.approved_count,
              used_count: ad.used_count || 0,
              plays_per_stream: ad.plays_per_stream || realPlays || ad.remaining_count || ad.approved_count || 24,
              gridSelection: ad.grid_selection || [],
              ads: [originalAd],
              layout_json: layout
            }
          }).sort((a, b) => (b.amountPerPlay || 0) - (a.amountPerPlay || 0))
          
          setPlaylist(mappedPlaylist)

          // Sync plays_per_stream with the backend
          Promise.all(mappedPlaylist.map(async (ad) => {
            if (ad.backendId && ad.campaignId) {
              const existing = await getPlaysPerStream(userId, ad.campaignId, ad.backendId)
              if (existing && existing.plays_per_stream != null) {
                return { ...ad, plays_per_stream: existing.plays_per_stream }
              } else if (ad.plays_per_stream != null) {
                await createPlaysPerStream(userId, ad.campaignId, ad.backendId, { plays_per_stream: ad.plays_per_stream })
                return ad
              }
            }
            return ad
          })).then(finalPlaylist => {
            setPlaylist(finalPlaylist)
          })

          if (adsToAutoApprove.length > 0) {
            const autoApproveProcess = async () => {
                const newPlaylistItems = []
                for (const item of adsToAutoApprove) {
                    const { brand, adReq } = item;
                    const adToApprove = adReq.ads[0]
                    const adName = adToApprove?.ad_name || adReq.campaignName || adReq.displayName
                    
                    const backendAd = await postApprovedAd(userId, {
                        brand_name: brand.brand_name,
                        ad_name: adName,
                        campaign_id: adReq.campaignId,
                        approved_count: adReq.approvedCount,
                        remaining_count: adReq.approvedCount,
                        plays_per_stream: adReq.playsPerStream,
                        amount_per_play: adReq.amountPerPlay,
                        ad_media_url: adToApprove.image_url || adToApprove.media_url,
                        ad_media_type: adToApprove.ad_type,
                        grid_selection: adToApprove.grid_cell_placement
                          ? adToApprove.grid_cell_placement.split(',').map(Number)
                          : [],
                        show_duration: adToApprove.duration_seconds || 15,
                        layout_json: adToApprove
                    })

                    if (backendAd) {
                        newPlaylistItems.push({
                            id: `approved_${backendAd.id}`,
                            backendId: backendAd.id,
                            name: adName,
                            brand: brand.brand_name,
                            campaignId: adReq.campaignId,
                            duration: adToApprove?.duration_seconds || 15, 
                            status: 'live', 
                            daysLeft: adReq.daysLive, 
                            earnings: '—', 
                            amountPerPlay: adReq.amountPerPlay,
                            type: adReq.type,
                            remaining_count: adReq.approvedCount,
                            approved_count: adReq.approvedCount,
                            used_count: 0,
                            media_url: adToApprove?.image_url || adToApprove?.media_url,
                            gridSelection: adToApprove?.grid_cell_placement
                              ? adToApprove.grid_cell_placement.split(',').map(Number)
                              : [],
                            ads: adReq.ads,
                            plays_per_stream: adReq.playsPerStream || 24
                        })
                    }
                }
                
                if (newPlaylistItems.length > 0) {
                    setPlaylist(p => {
                       const next = [...p, ...newPlaylistItems].sort((a, b) => (b.amountPerPlay || 0) - (a.amountPerPlay || 0))
                       setSecureItem(`streamer_playlist_${userId}`, next)
                       return next
                    })

                    // ── Auto-add to live queue only if ad grid overlaps streamer's selected positions ──
                    setSelectedPositions(currentPositions => {
                      const matchingNewAds = newPlaylistItems.filter(ad => {
                        if (!currentPositions || currentPositions.length === 0) return true // no filter = accept all
                        const adGrid = ad.gridSelection || []
                        if (adGrid.length === 0) return true // ad has no restriction = accept
                        return adGrid.some(cell => currentPositions.includes(cell))
                      })

                      if (matchingNewAds.length > 0) {
                        setSelectedStreamAds(p => {
                           if (p.length === 0) return p;
                           const brandMaxPay = {};
                           const combined = [...p, ...matchingNewAds];
                           combined.forEach(ad => {
                             const pay = ad.amountPerPlay || 0;
                             if (!brandMaxPay[ad.brand] || brandMaxPay[ad.brand] < pay) {
                               brandMaxPay[ad.brand] = pay;
                             }
                           });
                           const sortedAds = combined.sort((a, b) => {
                             const brandDiff = (brandMaxPay[b.brand] || 0) - (brandMaxPay[a.brand] || 0);
                             if (brandDiff !== 0) return brandDiff;
                             if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
                             return (b.amountPerPlay || 0) - (a.amountPerPlay || 0);
                           });
                           setSecureItem(`streamer_stream_ads_${userId}`, sortedAds)
                           return sortedAds
                        })
                      }
                      return currentPositions // don't change positions
                    })
                }
            }
            autoApproveProcess()
          }
        }

        if (rejectedData) {
          const mappedRejected = rejectedData.map(r => ({
            ...r,
            name: r.ad_name || 'Unnamed Ad',
            brand: r.brand_name || 'Unknown Brand',
            reason: 'Rejected by streamer'
          }))
          setRejectedAds(mappedRejected)
        }
      }
    }).catch(err => console.error("Failed to fetch brands or status", err))
  }, [user, id])

  /* ── Poll every 30s for new ads from already-approved brands ── */
  useEffect(() => {
    if (!user || DEV_MODE) return
    const userId = user?.id || user?.uid || id
    if (!userId) return
    const tier = user?.tier || 'Tier 5'

    const checkForNewAds = async () => {
      try {
        const [brandData, approvedData] = await Promise.all([
          fetchTierBrands(tier),
          fetchApprovedAds(userId)
        ])
        if (!brandData?.items || !approvedData) return

        const approvedCampaignSet = new Set(approvedData.map(a => a.campaign_id).filter(Boolean))
        const approvedBrandsSet   = new Set(approvedData.map(a => a.brand_name).filter(Boolean))
        const existingAdNames     = new Set(approvedData.map(a => a.ad_name).filter(Boolean))

        const freshItems = []
        brandData.items.forEach(brand => {
          if (!approvedBrandsSet.has(brand.brand_name)) return // only already-approved brands
          ;(brand.campaigns || []).forEach(camp => {
            const campaignId = camp.campaign_id || camp.id
            if (approvedCampaignSet.has(campaignId)) return // campaign already in playlist
            const budget = camp.estimated_cost_rupees || 0
            const playCount = camp.play_count || 1
            const amountPerPlay = budget / playCount
            ;(camp.ads || []).forEach(ad => {
              const adName = ad.ad_name || camp.campaign_name
              if (existingAdNames.has(adName)) return // already approved
              freshItems.push({ brand, camp, ad, campaignId, amountPerPlay })
            })
          })
        })

        if (freshItems.length === 0) return

        // Auto-approve each new ad
        const newPlaylistItems = []
        for (const { brand, camp, ad, campaignId, amountPerPlay } of freshItems) {
          const adName = ad.ad_name || camp.campaign_name
          const backendAd = await postApprovedAd(userId, {
            brand_name: brand.brand_name,
            ad_name: adName,
            campaign_id: campaignId,
            approved_count: camp.play_count || 10,
            remaining_count: camp.play_count || 10,
            plays_per_stream: ad.plays_per_stream || 24,
            amount_per_play: amountPerPlay,
            ad_media_url: ad.image_url || ad.media_url,
            ad_media_type: ad.ad_type,
            grid_selection: ad.grid_cell_placement
              ? ad.grid_cell_placement.split(',').map(Number)
              : [],
            show_duration: ad.duration_seconds || 15,
            layout_json: ad
          })
          if (backendAd) {
            newPlaylistItems.push({
              id: `approved_${backendAd.id}`,
              backendId: backendAd.id,
              name: adName,
              brand: brand.brand_name,
              campaignId,
              duration: ad.duration_seconds || 15,
              status: 'live',
              daysLeft: camp.campaign_duration_days || 7,
              earnings: '—',
              amountPerPlay,
              type: ad.ad_type || 'text',
              remaining_count: camp.play_count || 10,
              approved_count: camp.play_count || 10,
              used_count: 0,
              media_url: ad.image_url || ad.media_url,
              gridSelection: ad.grid_cell_placement
                ? ad.grid_cell_placement.split(',').map(Number)
                : [],
              ads: [ad],
              plays_per_stream: ad.plays_per_stream || 24
            })
          }
        }

        if (newPlaylistItems.length === 0) return

        // Add to playlist
        setPlaylist(p => {
          const next = [...p, ...newPlaylistItems].sort((a, b) => (b.amountPerPlay || 0) - (a.amountPerPlay || 0))
          setSecureItem(`streamer_playlist_${userId}`, next)
          return next
        })

        // Add to live queue only if grid preference matches
        setSelectedPositions(currentPositions => {
          const matchingAds = newPlaylistItems.filter(ad => {
            if (!currentPositions || currentPositions.length === 0) return true
            const adGrid = ad.gridSelection || []
            if (adGrid.length === 0) return true
            return adGrid.some(cell => currentPositions.includes(cell))
          })
          if (matchingAds.length > 0) {
            setSelectedStreamAds(p => {
              if (p.length === 0) return p
              const brandMaxPay = {}
              const combined = [...p, ...matchingAds]
              combined.forEach(ad => {
                const pay = ad.amountPerPlay || 0
                if (!brandMaxPay[ad.brand] || brandMaxPay[ad.brand] < pay) brandMaxPay[ad.brand] = pay
              })
              const sorted = combined.sort((a, b) => {
                const bd = (brandMaxPay[b.brand] || 0) - (brandMaxPay[a.brand] || 0)
                if (bd !== 0) return bd
                if (a.brand !== b.brand) return a.brand.localeCompare(b.brand)
                return (b.amountPerPlay || 0) - (a.amountPerPlay || 0)
              })
              setSecureItem(`streamer_stream_ads_${userId}`, sorted)
              return sorted
            })
          }
          return currentPositions
        })

        // Bust the ad-requests cache so new requests reload
        setSecureItem(`streamer_last_fetch_${userId}`, 0)
      } catch (e) {
        console.warn('Ad poll error:', e)
      }
    }

    const interval = setInterval(checkForNewAds, 30000) // every 30 seconds
    return () => clearInterval(interval)
  }, [user, id])

  /* ── Keep refs in sync & Cache ── */
  useEffect(() => { 
    playlistRef.current = playlist
    const userId = user?.id || user?.uid || id
    if (userId && playlist.length > 0) {
      setSecureItem(`streamer_playlist_${userId}`, playlist)
    }
  }, [playlist, user, id])

  useEffect(() => {
    const userId = user?.id || user?.uid || id
    if (userId && rejectedAds.length > 0) {
      setSecureItem(`streamer_rejected_${userId}`, rejectedAds)
    }
  }, [rejectedAds, user, id])

  useEffect(() => { gapRef.current = gapInput }, [gapInput])

  /* ── Sync loop ── */
  useEffect(() => {
    // When streaming, only rotate through selectedStreamAds
    const adsToSync = isStreaming && selectedStreamAds.length > 0
      ? selectedStreamAds
      : playlist.filter(a => a.status === 'live')
    if (adsToSync.length > 0) startSync(adsToSync)
    else stopSync()
    return () => stopSync()
  }, [playlist, gapInput, isStreaming, selectedStreamAds])

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
      let currentIdx = -1
      let currentT = 0

      // Find which ad is currently playing
      for (let i = 0; i < liveAds.length; i++) {
        const seg = liveAds[i].duration + gap
        if (rel >= acc && rel < acc + seg) {
          currentIdx = i
          currentT = rel - acc
          break
        }
        acc += seg
      }

      if (currentIdx !== -1) {
        const t = currentT
        const activeAd = liveAds[currentIdx]
        const adId = activeAd.id
        const instanceTimestamp = Math.floor((Date.now() / 1000) / total) * total + acc

        if (!window.lastCountedInstances) window.lastCountedInstances = {}

        if (t < activeAd.duration + 1) {
          if (window.lastCountedInstances[adId] !== instanceTimestamp) {
            window.lastCountedInstances[adId] = instanceTimestamp
            setAdsAiredCount(c => c + 1)

            // ── Decrement plays_per_stream for the ad that just STARTED ──
            const currentPlays = streamPlaysRef.current[adId]
            if (currentPlays !== undefined) {
              const newPlays = Math.max(0, currentPlays - 1)
              streamPlaysRef.current = { ...streamPlaysRef.current, [adId]: newPlays }
              setStreamPlaysMap(prev => ({ ...prev, [adId]: newPlays }))

              // ── Sync to playlist and selectedStreamAds for UI everywhere ──
              setPlaylist(prev => prev.map(a => a.id === adId ? { ...a, plays_per_stream: newPlays } : a))
              setSelectedStreamAds(prev => prev.map(a => a.id === adId ? { ...a, plays_per_stream: newPlays } : a))

              // ── Save to DB immediately ──
              if (activeAd.backendId) {
                const userId = user?.id || user?.uid || id;
                if (userId && activeAd.campaignId) {
                  updatePlaysPerStream(userId, activeAd.campaignId, activeAd.backendId, { plays_per_stream: newPlays }).catch(e => console.error(e))
                }
                updateAdPlaysPerStream(activeAd.backendId, { plays_per_stream: newPlays }).catch(e => console.error(e))
              }

              if (newPlays === 0) {
                // Alert the streamer that this ad's stream quota is exhausted
                setTimeout(() => {
                  alert(`⚠️ Ad quota reached!\n\n"${activeAd.name}" has used all its allowed plays for this stream.`)
                }, 100)
              }
            }
          }
          prevIndex = currentIdx
          setActiveIndex(currentIdx)
          setProgressMap(p => ({ ...p, [currentIdx]: Math.min(100, (t / activeAd.duration) * 100) }))
        }

        // Compute countdown for every ad
        const countdowns = {}
        for (let i = 0; i < liveAds.length; i++) {
          if (i === currentIdx) {
            countdowns[i] = 0 // currently playing
          } else {
            // Time until this ad starts playing
            let startOfAd = 0
            for (let j = 0; j < i; j++) {
              startOfAd += liveAds[j].duration + gap
            }
            let timeUntil = startOfAd - rel
            if (timeUntil < 0) timeUntil += total // wrap around
            countdowns[i] = Math.ceil(timeUntil)
          }
        }
        setCountdownMap(countdowns)
      }
    }
    tick()
    syncRef.current = setInterval(tick, 500)
  }
  const stopSync = () => clearInterval(syncRef.current)

  /* ── Actions ── */
  const toggleBrandRequest = (brandId) => {
    setExpandedBrandRequests(p => ({ ...p, [brandId]: !p[brandId] }))
  }

  const togglePlaylistBrand = (brandId) => {
    setExpandedPlaylistBrands(p => ({ ...p, [brandId]: !p[brandId] }))
  }

  const togglePickerBrand = (brandName) => {
    setExpandedPickerBrands(p => ({ ...p, [brandName]: !p[brandName] }))
  }

  const approveBrand = async (brandId) => {
    if (!window.confirm('Approve this brand? All its ads will be added to your playlist.')) return
    const brand = adRequests.find(b => b.id === brandId)
    if (!brand) return

    const userId = user.id || user.uid || id
    
    // Process all ads sequentially to ensure DB writes
    for (const req of brand.ads) {
        const adToApprove = req.ads[0]
        const adName = adToApprove?.ad_name || req.campaignName || req.displayName
        
        const backendAd = await postApprovedAd(userId, {
            brand_name: brand.brandName,
            ad_name: adName,
            campaign_id: req.campaignId,
            approved_count: req.approvedCount,
            remaining_count: req.approvedCount,
            plays_per_stream: req.playsPerStream,
            amount_per_play: req.amountPerPlay,
            ad_media_url: adToApprove.image_url || adToApprove.media_url,
            ad_media_type: adToApprove.ad_type,
            grid_selection: adToApprove.grid_cell_placement
              ? adToApprove.grid_cell_placement.split(',').map(Number)
              : [],
            show_duration: adToApprove.duration_seconds || 15,
            layout_json: adToApprove
        })

        if (!backendAd) {
            console.error('Failed to save ad to DB:', req.displayName)
            continue
        }

        // Add to playlist immediately
        setPlaylist(p => {
          const next = [...p, {
            id: `approved_${backendAd.id}`,
            backendId: backendAd.id,
            name: adName,
            brand: brand.brandName,
            campaignId: req.campaignId,
            duration: adToApprove?.duration_seconds || 15, 
            status: 'live', 
            daysLeft: req.daysLive, 
            earnings: '—', 
            amountPerPlay: req.amountPerPlay,
            type: req.type,
            remaining_count: req.approvedCount,
            approved_count: req.approvedCount,
            used_count: 0,
            media_url: adToApprove?.image_url || adToApprove?.media_url,
            gridSelection: adToApprove?.grid_cell_placement
              ? adToApprove.grid_cell_placement.split(',').map(Number)
              : [],
            ads: req.ads,
            plays_per_stream: req.playsPerStream || 24
          }].sort((a, b) => (b.amountPerPlay || 0) - (a.amountPerPlay || 0))
          
          setSecureItem(`streamer_playlist_${userId}`, next)
          return next
        })
    }

    setAdRequests(p => p.filter(r => r.id !== brandId))
  }

  const rejectBrand = async (brandId) => {
    if (!window.confirm('Reject this brand?')) return
    const brand = adRequests.find(b => b.id === brandId)
    if (!brand) return
    const userId = user?.id || user?.uid || id
    
    for (const req of brand.ads) {
        const adToReject = req.ads[0]
        const adName = adToReject?.ad_name || req.campaignName || req.displayName
        
        const newRej = await postRejectedAd(userId, {
            brand_name: brand.brandName,
            ad_name: adName,
            campaign_id: req.campaignId,
            status: 'rejected'
        })

        if (newRej) {
            const rejectedEntry = {
              ...newRej,
              name: newRej.ad_name || 'Unnamed Ad',
              brand: newRej.brand_name || 'Unknown Brand',
              reason: 'Rejected by streamer'
            }
            
            setRejectedAds(p => {
              const next = [rejectedEntry, ...p]
              setSecureItem(`streamer_rejected_${userId}`, next)
              return next
            })
        }
    }
    setAdRequests(p => p.filter(r => r.id !== brandId))
  }

  const approveRejectedAd = (ad) => {
    if (!window.confirm(`Approve "${ad.name}"? This will move it to your active playlist.`)) return
    const userId = user?.id || user?.uid || id
    
    updateApprovedAd(userId, ad.id, {
      status: 'approved',
      approved_count: 10,
      remaining_count: 10
    }).then(res => {
      const newAd = res?.ad || res
      if (newAd) {
        setPlaylist(p => {
          const mapped = {
            id: `approved_${newAd.id}`,
            backendId: newAd.id,
            name: newAd.ad_name,
            brand: newAd.brand_name,
            duration: 10,
            status: 'live',
            daysLeft: 0,
            earnings: '—',
            type: newAd.ad_media_type || 'text',
            remaining_count: newAd.remaining_count,
            approved_count: newAd.approved_count,
            used_count: newAd.used_count || 0,
            ads: []
          }
          return [...p, mapped]
        })
        setRejectedAds(p => p.filter(r => r.id !== ad.id))
      }
    })
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

  /* ── Generate clean OBS overlay link — no session data in URL ── */
  const generateLongOverlayLink = (sessionData) => {
    const userId = user?.id || user?.uid || id
    // Clean URL — backend resolves session data from DB using streamer_id
    return `http://127.0.0.1:5000/api/overlay/${userId}`
  }

  /* ── Move ad up/down in the streaming queue ── */
  const moveStreamAd = (index, direction) => {
    setSelectedStreamAds(prev => {
      const next = [...prev]
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= next.length) return prev
      const temp = next[index]
      next[index] = next[newIndex]
      next[newIndex] = temp
      return next
    })
  }

  const handleDragStart = (e, id) => { draggedRef.current = id; e.dataTransfer.effectAllowed = 'move' }
  const handleDrop = (e, targetId) => {
    e.stopPropagation()
    const fromId = draggedRef.current
    if (fromId === targetId || fromId === null) return
    const userId = user?.id || user?.uid || id
    setPlaylist(p => {
      const fromIndex = p.findIndex(a => a.id === fromId)
      const toIndex = p.findIndex(a => a.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return p
      
      const next = [...p]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      setSecureItem(`streamer_playlist_${userId}_${user?.tier || 'Tier 5'}`, next)
      return next
    })
    draggedRef.current = null
  }

  const deleteSelected = () => {
    if (!checkedIds.length || !window.confirm(`Remove ${checkedIds.length} ad(s)?`)) return
    const userId = user?.id || user?.uid || id
    setPlaylist(p => {
      const next = p.filter(i => !checkedIds.includes(i.id))
      setSecureItem(`streamer_playlist_${userId}_${user?.tier || 'Tier 5'}`, next)
      return next
    })
    setCheckedIds([])
    setIsEditMode(false)
  }

  const handleLogout = () => { 
    removeSecureItem('streamer_user')
    if (DEV_MODE) navigate('/'); else logout() 
  }

  const startStream = () => {
    const userId = user?.id || user?.uid || id;
    const overlaySetup = activePrefId 
      ? savedPrefs.find(p => p.id === activePrefId) 
      : { positions: selectedPositions, gap: gapInput, adsEnabled };
    
    // ── Snapshot plays_per_stream for each selected ad ──
    const initialPlaysMap = {}
    selectedStreamAds.forEach(ad => {
      const activeAdData = playlist.find(p => p.id === ad.id) || ad
      initialPlaysMap[ad.id] = activeAdData.plays_per_stream || ad.plays_per_stream || ad.remaining_count || ad.approved_count || 24
    })
    streamPlaysRef.current = initialPlaysMap
    setStreamPlaysMap(initialPlaysMap)
    setSecureItem(`streamer_stream_plays_${userId}`, initialPlaysMap)

    const sessionPayload = {
      streamer_id: userId,
      live_stream_url: streamLink,
      stream_title: streamTitle,
      stream_content: streamContent,
      overlay_config: {
        presetId: activePrefId,
        presetName: activePrefId ? savedPrefs.find(p => p.id === activePrefId)?.name : 'Custom',
        positions: selectedPositions,
        restrictedPositions: restrictedPositions,
        gap: gapInput,
        adsEnabled: adsEnabled
      },
      selected_ads: selectedStreamAds.map(ad => ({
        id: ad.id,
        backendId: ad.backendId,
        campaignId: ad.campaignId,
        name: ad.name,
        brand: ad.brand,
        type: ad.type,
        duration: ad.duration,
        amountPerPlay: ad.amountPerPlay,
        plays_per_stream: initialPlaysMap[ad.id],
        gridSelection: ad.gridSelection || [],
        ads: ad.ads || [],
        layout_json: ad.layout_json || {}
      })),
      total_ads_approved: selectedStreamAds.length,
      ads_left_count: selectedStreamAds.length
    }

    // Generate the long OBS overlay link with full session data
    const longLink = generateLongOverlayLink(sessionPayload)
    setOverlayLink(longLink)
    sessionPayload.obs_overlay_link = longLink

    // Save stream session data locally
    setStreamSessionData(sessionPayload)
    setSecureItem(`streamer_active_session_${userId}`, sessionPayload)

    setIsStreaming(true)
    setStreamStartTime(Date.now())
    setAdsAiredCount(0)
    setStreamElapsed(0)

    // ── Persist stream session so page refresh doesn't end it ──
    const userId2 = user?.id || user?.uid || id
    sessionStorage.setItem(`stream_session_${userId2}`, JSON.stringify({
      isStreaming: true,
      streamTitle,
      streamLink,
      streamContent,
      streamStartTime: Date.now(),
      adsAiredCount: 0,
      selectedStreamAds
    }))

    // Send to backend
    startStreamSession(sessionPayload)
  }

  const endStream = async () => {
    if (!window.confirm('End this stream?')) return
    const userId = user?.id || user?.uid || id

    const finalPlays = streamPlaysRef.current
    const initialPlays = getSecureItem(`streamer_stream_plays_${userId}`) || {}

    // ── Update plays count for EVERY ad — one pair of calls each ──
    const allAdsWithBackendId = selectedStreamAds.filter(ad => ad.backendId && ad.campaignId)
    const updatePromises = allAdsWithBackendId.flatMap(ad => {
      const playsRemaining = finalPlays[ad.id] ?? 0
      const plays_start = initialPlays[ad.id] || ad.plays_per_stream || ad.approved_count || 24
      const plays_occurred = Math.max(0, plays_start - playsRemaining)
      const new_remaining_count = Math.max(0, (ad.remaining_count || 0) - plays_occurred)
      
      return [
        updatePlaysPerStream(userId, ad.campaignId, ad.backendId, { plays_per_stream: playsRemaining }),
        updateAdPlaysPerStream(ad.backendId, { plays_per_stream: playsRemaining }),
        updateApprovedAd(userId, ad.backendId, { remaining_count: new_remaining_count })
      ]
    })

    try {
      // Fire all play-count updates in parallel — don't block on failures
      const results = await Promise.allSettled(updatePromises)
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length) console.warn(`${failed.length} ad play-count update(s) failed:`, failed)
      else console.log(`All ${allAdsWithBackendId.length} ad play counts updated.`)

      // ── Build earnings payload for every ad in this stream ──
      const adsPayload = selectedStreamAds.map(ad => {
        const plays_start = initialPlays[ad.id] || ad.plays_per_stream || ad.approved_count || 24
        const plays_end   = finalPlays[ad.id] ?? 0
        const plays_occurred = Math.max(0, plays_start - plays_end)
        const estimated_cost_cents = Math.round((ad.amountPerPlay || 0) * plays_occurred * 100)
        return {
          ad_id: ad.backendId,
          ad_name: ad.name,
          brand_name: ad.brand,
          plays_per_stream_start: plays_start,
          plays_per_stream_end: plays_end,
          estimated_cost_cents
        }
      })

      // ── Build approved_ads payload for the overlays backend ──
      const approvedAdsPayload = allAdsWithBackendId.map(ad => ({
        approved_ad_id: ad.backendId,
        id: ad.backendId,
        remaining_count: finalPlays[ad.id] ?? 0
      }))

      // ── End session on overlays backend (marks it ended, returns 410 from overlay link) ──
      await endStreamSession({
        streamer_id: userId,
        approved_ads: approvedAdsPayload,
        ads_left_count: allAdsWithBackendId.reduce((s, ad) => s + (finalPlays[ad.id] ?? 0), 0),
        total_ads_approved: selectedStreamAds.length
      })

      // ── Save earnings if there are ads ──
      if (adsPayload.length > 0) {
        await saveStreamEarnings({
          streamer_id: userId,
          stream_title: streamTitle || 'Untitled Stream',
          ads: adsPayload
        })
        // Reload wallet data
        fetchStreamerWallet(userId).then(res => {
          if (res) {
            if (res.payout_details) setWalletInfo(res.payout_details)
            if (res.streams) setCompletedStreams(res.streams)
            if (res.total_earned_cents != null) setTotalWalletEarnings(res.total_earned_cents)
          }
        }).catch(err => console.error(err))
      }
    } catch (err) {
      console.error('Failed during stream end cleanup:', err)
    }

    // ── Reset local state ──
    removeSecureItem(`streamer_stream_plays_${userId}`)
    removeSecureItem(`streamer_last_fetch_${userId}`)
    streamPlaysRef.current = {}
    setStreamPlaysMap({})
    setOverlayLink('') // clear the OBS link — a new one is generated on next stream start
    setIsStreaming(false)
    // Clear persisted stream session
    const userId3 = user?.id || user?.uid || id
    sessionStorage.removeItem(`stream_session_${userId3}`)
    setStreamStartTime(null)
    setStreamElapsed(0)
    setGoLiveStep(1)
  }

  const liveAds     = playlist.filter(a => a.status === 'live' && (a.plays_per_stream === undefined || a.plays_per_stream > 0))
  const upcomingAds = playlist.filter(a => a.status === 'upcoming' && (a.plays_per_stream === undefined || a.plays_per_stream > 0))
  const tierMeta    = TIER_META[user?.tier] || TIER_META['Tier 5']

  // When streaming, only rotate through selected ads
  const streamingAds = isStreaming ? selectedStreamAds : liveAds

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
                  <h1 className="sd-page-title">Good to see you, <em>{user?.name?.split(' ')[0]}.</em></h1>
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
                  {/* Row 1: Earnings KPIs */}
                  <div className="sd-stats-row">
                    {[
                      {
                        label: 'Lifetime earnings',
                        value: `₹${(totalWalletEarnings / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        sub: 'All time'
                      },
                      {
                        label: 'This month',
                        value: `₹${(currentMonthEarnings / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        sub: currentMonthLabel || 'Current month',
                        highlight: true
                      },
                      {
                        label: 'Unpaid balance',
                        value: `₹${(totalWalletEarnings / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        sub: 'Pending payout'
                      },
                    ].map((s, i) => (
                      <div key={i} className={`sd-stat-card ${s.highlight ? 'highlight' : ''}`}>
                        <div className="sd-stat-value">{s.value}</div>
                        <div className="sd-stat-label">{s.label}</div>
                        <div className="sd-stat-sub">{s.sub}</div>
                      </div>
                    ))}
                  </div>
                  {/* Row 2: Activity counts */}
                  <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    {[
                      { label: 'Brands worked with', value: brandsWorkedWith.length, sub: 'All time' },
                      { label: 'Total streams',       value: totalStreamsDone,        sub: 'With ads' },
                      { label: 'Ads in playlist',     value: totalPlaylistAds || liveAds.length, sub: 'Scheduled' },
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
                    <span className="sd-earnings-chip">
                      {currentMonthEarnings > 0
                        ? `↑ ₹${(currentMonthEarnings / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} this month`
                        : 'No earnings yet'}
                    </span>
                  </div>
                  {monthlyChart.length > 0
                    ? <EarningsChart data={monthlyChart} />
                    : <p className="sd-empty" style={{ padding: '2rem' }}>Complete streams to see your earnings chart.</p>
                  }
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">Recent Activity</div>
                      <h2 className="sd-card-title">Stream <em>history</em></h2>
                    </div>
                  </div>
                  <div className="sd-history-list">
                    {completedStreams.length === 0
                      ? <p className="sd-empty">No completed streams yet.</p>
                      : completedStreams.slice(0, 6).map((s, i) => {
                          const streamAds = Array.isArray(s.ads) ? s.ads : []
                          const brands = [...new Set(streamAds.map(a => a.ad_name).filter(Boolean))]
                          const dateStr = s.stream_date
                            ? new Date(s.stream_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'
                          return (
                            <div key={s.id || i} className="sd-history-row">
                              <div className="sd-history-info">
                                <span className="sd-history-date">{s.stream_title || 'Untitled Stream'}</span>
                                <span className="sd-history-meta">{dateStr}</span>
                                <div className="sd-history-brands">
                                  {brands.slice(0, 3).map(b => (
                                    <span key={b} className="sd-history-brand-chip">{b}</span>
                                  ))}
                                  {brands.length > 3 && <span className="sd-history-brand-chip">+{brands.length - 3}</span>}
                                </div>
                              </div>
                              <span className="sd-history-earn">
                                ₹{((s.total_earned_cents || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )
                        })
                    }
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
                        const thumbUrl = ad.media_url || ad.ads?.[0]?.media_url
                        return (
                          <div key={ad.id} className={`sd-live-row ${isPlaying ? 'now-playing' : ''}`}>
                            <div className="sd-live-indicator-dot" style={{ background: isPlaying ? '#10B981' : '#e2e8f0' }}/>
                            
                            <div className="sd-live-thumb small">
                              {thumbUrl 
                                ? <img src={thumbUrl} alt="" />
                                : <div className="sd-live-thumb-placeholder">{ad.brand?.[0] || 'A'}</div>
                              }
                            </div>

                            <div className="sd-live-info">
                              <span className="sd-live-name">{ad.name}</span>
                              <span className="sd-live-brand">
                                {ad.brand} · {ad.type?.replace('_',' ')} · {ad.amountPerPlay > 0 ? `₹${ad.amountPerPlay.toFixed(2)}/play` : '—'}
                              </span>
                            </div>
                            <span className="sd-live-earn">{ad.earnings}</span>
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
                  { id: 'ended',    label: 'Ended',     count: playlist.filter(a => a.status === 'ended' || a.plays_per_stream === 0).length },
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

              <div style={{ marginTop: '1rem' }}>
                {(() => {
                  const items = playlistTab === 'live' ? liveAds 
                              : playlistTab === 'upcoming' ? upcomingAds
                              : playlist.filter(a => a.status === 'ended' || a.plays_per_stream === 0)

                  if (items.length === 0) {
                    return <p className="sd-empty">No {playlistTab} ads.</p>
                  }

                  // Group items by brand
                  const groupedPlaylist = {};
                  items.forEach(item => {
                    const bName = item.brand || 'Unknown';
                    if (!groupedPlaylist[bName]) groupedPlaylist[bName] = { brandName: bName, items: [], totalPay: 0 };
                    groupedPlaylist[bName].items.push(item);
                    groupedPlaylist[bName].totalPay += (item.amountPerPlay || 0);
                  });
                  
                  const sortedBrands = Object.values(groupedPlaylist).sort((a, b) => b.totalPay - a.totalPay);

                  return (
                    <div className="sd-playlist-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', background: 'transparent', padding: '0', border: 'none' }}>
                      {sortedBrands.map(brandGroup => {
                        return (
                          <div key={brandGroup.brandName} className="sd-req-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', padding: '0', borderRadius: '12px', overflow: 'hidden', background: 'white' }} onClick={() => setSelectedBrandAdsModal(brandGroup)} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
                             <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div className="sd-brand-logo-sm" style={{ background: '#10b981', color: 'white' }}>{brandGroup.brandName[0]}</div>
                                  <h3 className="sd-req-title" style={{ margin: 0 }}>{brandGroup.brandName}</h3>
                               </div>
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                     <div className="sd-eyebrow" style={{ fontSize: '0.6rem' }}>Ads Approved</div>
                                     <div className="sd-req-meta" style={{ margin: 0, color: '#334155', fontWeight: 600 }}>{brandGroup.items.length} ad{brandGroup.items.length > 1 ? 's' : ''}</div>
                                  </div>
                                  <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
                                     <div className="sd-eyebrow" style={{ fontSize: '0.6rem' }}>Total Value</div>
                                     <div className="sd-brand-earned" style={{ margin: 0, fontSize: '1rem' }}>₹{(brandGroup.totalPay || 0).toFixed(2)} <span className="sd-brand-earned-label" style={{ display: 'inline', fontSize: '0.75rem' }}>/ play</span></div>
                                  </div>
                               </div>
                               <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <span className="sd-days-badge blue">View Ads →</span>
                               </div>
                             </div>
                          </div>
                        )
                      })}
                    </div>
                  )
              })()}
              </div>
            </div>
          )}

          {/* ── BRANDS & REQUESTS (merged) ── */}
          {activePage === 'brands' && (
            <div className="sd-content">
              <div className="sd-page-header">
                <div>
                  <div className="sd-eyebrow">Brand Requests</div>
                  <h1 className="sd-page-title">Brand <em>Requests</em></h1>
                </div>
              </div>

              {/* ── Brand stats ── */}
              <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom:'1.25rem' }}>
                {[
                  { label: 'Total earned from brands', value: `₹${brandStats.totalEarned.toLocaleString()}`, sub: 'All time' },
                  { label: 'Active brand relationships', value: brandStats.activeCount, sub: 'Currently running', highlight: true },
                  { label: 'Total streams with ads',   value: brandStats.totalStreams, sub: 'Across all brands' },
                  { label: 'Pending requests',   value: brandStats.pendingCount, sub: 'Need review' },
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
                  <span className="sd-earnings-chip">{brandStats.activeCount} active</span>
                </div>
                <div className="sd-brands-grid">
                  {liveBrands.map(brand => (
                    <div key={brand.id} className="sd-brand-card" style={{ '--brand-color': brand.color, cursor: 'pointer' }} onClick={() => setSelectedBrandModal(brand)}>
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
                      <div className="sd-brand-earned">₹{(brand.earned_cents / 100).toLocaleString()}</div>
                      <div className="sd-brand-earned-label">total earned</div>
                      <div className="sd-brand-stats">
                        <div className="sd-brand-stat">
                          <span className="sd-brand-stat-val">{brand.streamsCount}</span>
                          <span className="sd-brand-stat-key">streams</span>
                        </div>
                        <div className="sd-brand-stat-divider"/>
                        <div className="sd-brand-stat">
                          <span className="sd-brand-stat-val">
                            {brand.lastStreamDate === 'Never' ? 'Never' : 
                             new Date(brand.lastStreamDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="sd-brand-stat-key">last stream</span>
                        </div>
                      </div>
                      <div className="sd-brand-bar-track">
                        <div className="sd-brand-bar-fill" style={{ background: brand.color, width: `${Math.min((brand.earned_cents / 5000000) * 100, 100)}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Ad requests section ── */}
              <div className="sd-card" style={{ marginBottom: '1.25rem' }}>
                <div className="sd-card-header">
                  <div>
                    <div className="sd-eyebrow">Incoming</div>
                    <h2 className="sd-card-title">Brand <em>Requests</em></h2>
                  </div>
                  <div className="sd-request-stats-inline">
                    {adRequests.length > 0 && (
                      <span className="sd-nav-badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.55rem' }}>{adRequests.length} pending</span>
                    )}
                  </div>
                </div>

                {adRequests.length === 0 ? (
                  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    {/* Animated icon stack */}
                    <div style={{ position: 'relative', width: '72px', height: '72px', marginBottom: '0.25rem' }}>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #dbeafe, #ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🤝</div>
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700, boxShadow: '0 0 0 3px white' }}>✓</div>
                    </div>
                    <div>
                      <h3 className="sd-req-title" style={{ margin: '0 0 0.35rem' }}>All clear!</h3>
                      <p className="sd-req-meta" style={{ margin: 0 }}>No incoming brand requests right now.<br/>New partnerships will show up here.</p>
                    </div>
                    <span className="sd-days-badge blue" style={{ marginTop: '0.25rem' }}>Sit back &amp; stream 🎮</span>
                  </div>
                ) : (
                  <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {adRequests.map(brand => (
                      <div key={brand.id} className="sd-req-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', background: 'white', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                        onClick={() => setSelectedBrandRequestModal(brand)}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
                      >
                        {/* Card top accent */}
                        <div style={{ height: '4px', background: 'linear-gradient(90deg, #3B5BFF, #6B8DFF)' }} />
                        <div style={{ padding: '1.1rem 1.1rem 1rem' }}>
                          {/* Brand identity row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                            <div className="sd-brand-logo-sm" style={{ background: '#3B5BFF', color: 'white', flexShrink: 0 }}>{brand.brandName[0]}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 className="sd-req-title" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand.brandName}</h3>
                            </div>
                            <span className="sd-nav-badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: '#fef3c7', color: '#b45309', flexShrink: 0 }}>Pending</span>
                          </div>
                          {/* Stats */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '8px', padding: '0.6rem 0.85rem', border: '1px solid #f1f5f9', marginBottom: '0.85rem' }}>
                            <div>
                              <div className="sd-eyebrow" style={{ fontSize: '0.58rem' }}>Ads</div>
                              <div className="sd-req-meta" style={{ margin: 0, fontWeight: 600, color: '#334155' }}>{brand.ads.length}</div>
                            </div>
                            <div style={{ width: '1px', background: '#e2e8f0' }} />
                            <div style={{ textAlign: 'right' }}>
                              <div className="sd-eyebrow" style={{ fontSize: '0.58rem' }}>Potential</div>
                              <div className="sd-brand-earned" style={{ margin: 0, fontSize: '0.9rem' }}>₹{(brand.totalBrandPay || 0).toFixed(2)} <span className="sd-brand-earned-label" style={{ display: 'inline', fontSize: '0.7rem' }}>/play</span></div>
                            </div>
                          </div>
                          {/* CTA */}
                          <div className="sd-days-badge blue" style={{ width: '100%', justifyContent: 'center', display: 'flex', cursor: 'pointer', boxSizing: 'border-box' }}>View Ads →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Rejected Ads ── */}
              {rejectedAds.length > 0 && (
                <div className="sd-card" style={{ marginTop: '1.25rem' }}>
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">Declined</div>
                      <h2 className="sd-card-title">Rejected <em>Ads</em></h2>
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
                        <div className="sd-request-btns">
                          <button className="sd-btn-primary sd-btn-sm" onClick={() => approveRejectedAd(ad)}>Approve</button>
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

                  {/* Ad counter cards — only counting selected ads for this stream */}
                  <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom:'1.25rem' }}>
                    <div className="sd-stat-card sd-stat-card-green">
                      <div className="sd-stat-value">{adsAiredCount}</div>
                      <div className="sd-stat-label">Ads aired this stream</div>
                      <div className="sd-stat-sub">Since stream started</div>
                    </div>
                    <div className="sd-stat-card highlight">
                      <div className="sd-stat-value">{selectedStreamAds.length}</div>
                      <div className="sd-stat-label">Currently in rotation</div>
                      <div className="sd-stat-sub">Live ads playing now</div>
                    </div>
                    <div className="sd-stat-card">
                      <div className="sd-stat-value">{selectedStreamAds.filter((_, i) => i > activeIndex).length}</div>
                      <div className="sd-stat-label">Upcoming in stream</div>
                      <div className="sd-stat-sub">Queued and ready</div>
                    </div>
                  </div>

                  {/* Now playing — only selected ads for this stream */}
                  <div className="sd-row-2" style={{ marginBottom: '1.25rem' }}>
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <div>
                          <div className="sd-eyebrow">Now playing</div>
                          <h2 className="sd-card-title">Live <em>rotation</em></h2>
                        </div>
                        <span className="sd-now-badge" style={{ alignSelf:'center' }}>● LIVE</span>
                      </div>
                      {selectedStreamAds.length === 0
                        ? <p className="sd-empty">No ads selected for this stream.</p>
                        : (
                          <div className="sd-live-list">
                            {selectedStreamAds.map((ad, i) => {
                              const isPlaying = i === activeIndex
                              const prog = progressMap[i] || 0
                              const playsLeft = streamPlaysMap[ad.id]
                              const exhausted = playsLeft !== undefined && playsLeft === 0
                              const thumbUrl = ad.ads?.[0]?.media_url || ad.media_url || (ad.layout_json?.image_url)
                              
                              return (
                                <div key={ad.id} className={`sd-live-row ${isPlaying ? 'now-playing' : ''}`} style={{ opacity: exhausted ? 0.5 : 1 }}>
                                  <div className="sd-live-indicator-dot" style={{ background: exhausted ? '#EF4444' : isPlaying ? '#10B981' : '#e2e8f0' }}/>
                                  
                                  <div className="sd-live-thumb">
                                    {thumbUrl 
                                      ? <img src={thumbUrl} alt="" />
                                      : <div className="sd-live-thumb-placeholder">{ad.brand?.[0] || 'A'}</div>
                                    }
                                  </div>

                                  <div className="sd-live-info">
                                    <span className="sd-live-name">{ad.name}</span>
                                    <span className="sd-live-brand">
                                      {ad.brand} · {ad.duration}s · {ad.type?.replace('_',' ')}
                                      {playsLeft !== undefined && (
                                        <span style={{ marginLeft: '0.4rem', fontWeight: 600, color: exhausted ? '#EF4444' : playsLeft <= 2 ? '#F59E0B' : '#10B981' }}>
                                          · {exhausted ? '⚠ Quota done' : `${playsLeft} play${playsLeft !== 1 ? 's' : ''} left`}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  {isPlaying && (
                                    <div className="sd-mini-progress">
                                      <div className="sd-mini-fill" style={{ width: `${prog}%` }}/>
                                    </div>
                                  )}
                                  {isPlaying
                                    ? <span className="sd-now-badge">NOW</span>
                                    : <span className="sd-days-badge" style={{ background: i < activeIndex ? '#ECFDF5' : '#EEF2FF', color: i < activeIndex ? '#059669' : '#3B5BFF', fontSize: '0.7rem' }}>
                                        {i < activeIndex ? 'Played' : `Queued #${i - activeIndex}`}
                                      </span>
                                  }
                                </div>
                              )
                            })}
                          </div>
                        )
                      }
                    </div>

                    {/* Upcoming queue — shows remaining ads with reorder */}
                    <div className="sd-card">
                      <div className="sd-card-header">
                        <div>
                          <div className="sd-eyebrow">Queued</div>
                          <h2 className="sd-card-title">Upcoming <em>ads</em></h2>
                        </div>
                        <span className="sd-days-badge blue" style={{ alignSelf:'center' }}>{selectedStreamAds.filter((_, i) => i > activeIndex).length} queued</span>
                      </div>
                      {(() => {
                        const queuedAds = selectedStreamAds.filter((_, i) => i > activeIndex)
                        if (queuedAds.length === 0) {
                          return <p className="sd-empty">No upcoming ads queued.</p>
                        }
                        return (
                          <div className="sd-live-list">
                            {queuedAds.map((ad, qi) => {
                              const realIndex = selectedStreamAds.findIndex(s => s.id === ad.id)
                              const countdown = countdownMap[realIndex]
                              return (
                                <div key={ad.id} className="sd-live-row" style={{ alignItems: 'center' }}>
                                  <div className="sd-live-indicator-dot" style={{ background: '#C7D2FE' }}/>
                                  
                                  <div className="sd-live-thumb small">
                                    {(ad.ads?.[0]?.media_url || ad.media_url) 
                                      ? <img src={ad.ads?.[0]?.media_url || ad.media_url} alt="" />
                                      : <div className="sd-live-thumb-placeholder">{ad.brand?.[0] || 'A'}</div>
                                    }
                                  </div>

                                  <div className="sd-live-info">
                                    <span className="sd-live-name">{ad.name}</span>
                                    <span className="sd-live-brand">
                                      {ad.brand} · {ad.duration}s · {ad.type?.replace('_',' ')}
                                      {ad.plays_per_stream != null && ` · ${ad.plays_per_stream} play${ad.plays_per_stream !== 1 ? 's' : ''}/stream`}
                                      {countdown > 0 && ` · plays in ${countdown}s`}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                                    <button
                                      className="sd-btn-ghost sd-btn-xs"
                                      disabled={realIndex <= activeIndex + 1}
                                      onClick={() => moveStreamAd(realIndex, -1)}
                                      title="Move up"
                                      style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', opacity: realIndex <= activeIndex + 1 ? 0.3 : 1 }}
                                    >▲</button>
                                    <button
                                      className="sd-btn-ghost sd-btn-xs"
                                      disabled={realIndex >= selectedStreamAds.length - 1}
                                      onClick={() => moveStreamAd(realIndex, 1)}
                                      title="Move down"
                                      style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', opacity: realIndex >= selectedStreamAds.length - 1 ? 0.3 : 1 }}
                                    >▼</button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* OBS overlay link — long encoded link */}
                  <div className="sd-card">
                    <div className="sd-card-header">
                      <div>
                        <div className="sd-eyebrow">OBS Setup</div>
                        <h2 className="sd-card-title">Your <em>overlay link</em></h2>
                      </div>
                    </div>
                    <div className="sd-link-row">
                      <input className="sd-input sd-input-mono" value={overlayLink} readOnly style={{ fontSize: '0.72rem' }}/>
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
                          onClick={() => {
                            const link = streamLink.toLowerCase()
                            if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
                              alert('Please enter a valid YouTube stream link.')
                              return
                            }
                            setGoLiveStep(2)
                          }}
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

                      {/* Find matching ads button */}
                      {selectedPositions.length > 0 && (
                        <div style={{ margin: '1.25rem 0' }}>
                          <button 
                            className="sd-btn-primary" 
                            style={{ width: '100%' }}
                            onClick={() => setShowAdPicker(true)}
                          >
                            🔍 Find ads matching {selectedPositions.length} selected position{selectedPositions.length !== 1 ? 's' : ''}
                          </button>
                          {selectedStreamAds.length > 0 && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', fontSize: '0.82rem', color: '#059669', fontWeight: 500 }}>
                              ✓ {selectedStreamAds.length} ad{selectedStreamAds.length !== 1 ? 's' : ''} selected for this stream
                            </div>
                          )}
                        </div>
                      )}

                      <div className="sd-step-actions">
                        <button className="sd-btn-ghost" onClick={() => setGoLiveStep(1)}>← Back</button>
                        <button className="sd-btn-primary" onClick={() => {
                          if (selectedStreamAds.length === 0) {
                            alert('Please select matching ads for this stream before continuing.')
                            return
                          }
                          const userId = user?.id || user?.uid || id
                          setStreamAdOrder(selectedStreamAds)
                          setSecureItem(`streamer_stream_ads_${userId}`, selectedStreamAds)
                          setGoLiveStep(3)
                        }}>
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
                        <div className="sd-confirm-row">
                          <span className="sd-confirm-label">Positions</span>
                          <span className="sd-confirm-val" style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {selectedPositions.map(p => (
                              <span key={p} className="sd-pref-pos-chip">{p.replace(/_/g, ' ')}</span>
                            ))}
                          </span>
                        </div>
                        <div className="sd-confirm-row">
                          <span className="sd-confirm-label">Ads selected</span>
                          <span className="sd-confirm-val" style={{ fontWeight: 600, color: selectedStreamAds.length > 0 ? '#059669' : '#EF4444' }}>
                            {selectedStreamAds.length} ad{selectedStreamAds.length !== 1 ? 's' : ''} for this stream
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
                      <p className="sd-step-hint" style={{ marginBottom: '1rem' }}>Drag to reorder the sequence of ads for this stream.</p>
                      {selectedStreamAds.length === 0 ? (
                        <p className="sd-empty">No active brand campaigns at the moment.</p>
                      ) : (
                        <div className="sd-confirm-brands">
                          {selectedStreamAds.map((ad, i) => {
                            const brand = DUMMY_BRANDS.find(b => b.name === ad.brand)
                            return (
                              <div 
                                key={ad.id} 
                                className="sd-confirm-brand-row"
                                draggable
                                onDragStart={e => handleDragStart(e, ad.id)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                  e.stopPropagation()
                                  const fromId = draggedRef.current
                                  const toId = ad.id
                                  if (fromId === toId) return
                                  setSelectedStreamAds(p => {
                                    const fromIndex = p.findIndex(x => x.id === fromId)
                                    const toIndex = p.findIndex(x => x.id === toId)
                                    if (fromIndex === -1 || toIndex === -1) return p
                                    const next = [...p]
                                    const [item] = next.splice(fromIndex, 1)
                                    next.splice(toIndex, 0, item)
                                    return next
                                  })
                                }}
                                style={{ cursor: 'grab' }}
                              >
                                <span className="sd-drag-handle" style={{ marginRight: '0.75rem', color: '#94a3b8' }}>⠿</span>
                                <div className="sd-brand-logo-sm" style={{ background: brand?.color || '#3B5BFF', color:'white' }}>
                                  {ad.brand[0]}
                                </div>
                                <div className="sd-request-info">
                                  <span className="sd-request-name">{ad.name}</span>
                                  <span className="sd-request-meta">
                                    {ad.brand} · {ad.duration}s · {ad.type?.replace('_',' ')}
                                    {ad.plays_per_stream != null && ` · ${ad.plays_per_stream} play${ad.plays_per_stream !== 1 ? 's' : ''}/stream`}
                                  </span>
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

          {/* ── EARNINGS & WALLET ── */}
          {activePage === 'earnings' && (
            <div className="sd-content">
              <div className="sd-page-header">
                <div>
                  <div className="sd-eyebrow">Wallet & Earnings</div>
                  <h1 className="sd-page-title">Payouts & <em>Financials</em></h1>
                </div>
              </div>

              <div className="sd-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom:'1.25rem' }}>
                {[
                  { label: 'Total wallet balance',  value: `₹${(totalWalletEarnings / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,  sub: 'Live from DB', highlight: true },
                  { label: 'This month',          value: `₹${(currentMonthEarnings / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: currentMonthLabel || 'Current month' },
                  { label: 'Completed streams',         value: completedStreams.length, sub: 'With ads' },
                  { label: 'Avg per stream',      value: `₹${(completedStreams.length > 0 ? (totalWalletEarnings / 100 / completedStreams.length) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Per ad-enabled stream' },
                ].map((s, i) => (
                  <div key={i} className={`sd-stat-card ${s.highlight ? 'highlight' : ''}`}>
                    <div className="sd-stat-value">{s.value}</div>
                    <div className="sd-stat-label">{s.label}</div>
                    <div className="sd-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="sd-row-2" style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.25rem' }}>
                {/* Completed Streams History */}
                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">By Stream</div>
                      <h2 className="sd-card-title">Completed <em>Streams & Earnings</em></h2>
                    </div>
                  </div>
                  <div className="sd-table-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    {completedStreams.length === 0 ? (
                      <p className="sd-empty" style={{ padding: '2rem' }}>No stream earnings recorded yet.</p>
                    ) : (
                      <table className="sd-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Stream Title</th>
                            <th>Amount Earned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedStreams.map((s, i) => {
                            const isExpanded = expandedStreamId === s.id
                            return (
                              <div key={s.id || i} style={{ display: 'contents' }}>
                                <tr onClick={() => setExpandedStreamId(isExpanded ? null : s.id)} style={{ cursor: 'pointer' }}>
                                  <td className="sd-muted">
                                    <span style={{ 
                                      marginRight: '0.6rem', 
                                      display: 'inline-block', 
                                      fontSize: '0.6rem',
                                      transition: 'transform 0.2s', 
                                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                                      color: '#94A3B8'
                                    }}>▶</span>
                                    {new Date(s.stream_date).toLocaleDateString()}
                                  </td>
                                  <td><strong>{s.stream_title || 'Untitled Stream'}</strong></td>
                                  <td><strong style={{ color: '#10B981' }}>₹{(s.total_earned_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan="3" style={{ padding: '0', background: '#F8FAFC' }}>
                                      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', animation: 'sd-slide-down 0.2s ease-out' }}>
                                        <div className="sd-eyebrow" style={{ marginBottom: '0.75rem', fontSize: '0.65rem' }}>Earnings Breakdown</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                          {(s.ads || []).length === 0 ? (
                                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>No ad data for this stream</div>
                                          ) : (
                                            (s.ads || []).map((ad, ai) => (
                                              <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1E293B', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}>{ad.brand_name || ad.brand || playlist.find(p => p.name === ad.ad_name)?.brand || 'Unknown Brand'}</span>
                                                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: "'Inter', sans-serif" }}>{ad.ad_name}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#059669' }}>₹{(ad.earned_cents / 100).toFixed(2)}</div>
                                                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{ad.plays_used} plays</div>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </div>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Streamer Payout Settings */}
                <div className="sd-card">
                  <div className="sd-card-header">
                    <div>
                      <div className="sd-eyebrow">Payout settings</div>
                      <h2 className="sd-card-title">Bank & <em>UPI Details</em></h2>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="sd-field-group">
                      <label className="sd-field-label" style={{ fontWeight: '500', fontSize: '0.85rem' }}>Account Holder Name</label>
                      <input
                        type="text"
                        className="sd-input"
                        placeholder="John Doe"
                        value={walletInfo.account_holder_name || ''}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '0.25rem' }}
                        onChange={e => setWalletInfo(p => ({ ...p, account_holder_name: e.target.value }))}
                      />
                    </div>
                    <div className="sd-field-group">
                      <label className="sd-field-label" style={{ fontWeight: '500', fontSize: '0.85rem' }}>Bank Account Number</label>
                      <input
                        type="text"
                        className="sd-input"
                        placeholder="1234567890"
                        value={walletInfo.account_number || ''}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '0.25rem' }}
                        onChange={e => setWalletInfo(p => ({ ...p, account_number: e.target.value }))}
                      />
                    </div>
                    <div className="sd-field-group">
                      <label className="sd-field-label" style={{ fontWeight: '500', fontSize: '0.85rem' }}>IFSC Code</label>
                      <input
                        type="text"
                        className="sd-input"
                        placeholder="HDFC0001234"
                        value={walletInfo.ifsc_code || ''}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '0.25rem' }}
                        onChange={e => setWalletInfo(p => ({ ...p, ifsc_code: e.target.value }))}
                      />
                    </div>
                    <div className="sd-field-group">
                      <label className="sd-field-label" style={{ fontWeight: '500', fontSize: '0.85rem' }}>UPI ID (Optional)</label>
                      <input
                        type="text"
                        className="sd-input"
                        placeholder="johndoe@upi"
                        value={walletInfo.upi_id || ''}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '0.25rem' }}
                        onChange={e => setWalletInfo(p => ({ ...p, upi_id: e.target.value }))}
                      />
                    </div>
                    <button
                      className="sd-btn-primary"
                      disabled={savingWallet}
                      onClick={() => {
                        setSavingWallet(true)
                        const userId = user?.id || user?.uid || id
                        updateStreamerWallet(userId, walletInfo).then(() => {
                          alert('Payout details saved successfully!')
                        }).catch(err => {
                          console.error(err)
                          alert('Failed to save payout details')
                        }).finally(() => setSavingWallet(false))
                      }}
                      style={{ marginTop: '0.5rem', width: '100%' }}
                    >
                      {savingWallet ? 'Saving...' : 'Save details'}
                    </button>
                  </div>
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
        <div className="sd-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setPreviewOpen(false)}>
          <div className="sd-modal sd-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-head">
              <div>
                <div className="sd-eyebrow">Ad Preview</div>
                <h3 className="sd-modal-title">{previewAd?.name || 'Preview'}</h3>
                {previewAd?.brand && <div className="sd-modal-brand-chip">{previewAd.brand}</div>}
              </div>
              <button className="sd-modal-close" onClick={() => setPreviewOpen(false)}>✕</button>
            </div>
            {(() => {
              const labels = [
                "Top Left", "Top Center", "Top Right",
                "Center Left", "Center", "Center Right",
                "Bottom Left", "Bottom Center", "Bottom Right"
              ];
              const getGridCellLabel = (indices) => {
                if (!indices || indices.length === 0) return 'Bottom Row (Cells 6, 7, 8)';
                return indices.map(idx => labels[idx]).filter(Boolean).join(', ');
              };
              const adFormat = previewAd?.ads?.[0]?.ad_type || previewAd?.type || 'Standard Overlay';
              const gridPlacement = previewAd?.ads?.[0]?.grid_cell_placement 
                ? getGridCellLabel(previewAd.ads[0].grid_cell_placement.split(',').map(Number)) 
                : (previewAd?.gridSelection && previewAd.gridSelection.length > 0 
                   ? getGridCellLabel(previewAd.gridSelection) 
                   : 'Bottom Row (Cells 6, 7, 8)');

              return (
                <div className="sd-modal-ad-meta" style={{ padding: '0.85rem 1.75rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', borderBottom: '1px solid #eef2f6', background: '#f8fafc', fontSize: '0.85rem' }}>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <strong style={{ display: 'block', color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Ad Type / Format</strong>
                    <span style={{ color: '#1e293b', fontWeight: '600' }}>{adFormat}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <strong style={{ display: 'block', color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Grid Cells Placement</strong>
                    <span style={{ color: '#1e293b', fontWeight: '600' }}>{gridPlacement}</span>
                  </div>
                  {previewAd?.amountPerPlay > 0 && (
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <strong style={{ display: 'block', color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Pay Per View</strong>
                      <span style={{ color: '#1e293b', fontWeight: '600' }}>₹{previewAd.amountPerPlay.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
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

                {/* Robust Unified Ad overlay preview for all types of preview items */}
                {(() => {
                  if (!previewAd) return null;
                  let ad = null;
                  if (previewAd.ads && previewAd.ads.length > 0) {
                    ad = previewAd.ads[0];
                  } else if (previewAd.layout_json) {
                    ad = previewAd.layout_json;
                  } else {
                    ad = previewAd;
                  }

                  const allowedCells = ad?.grid_cell_placement
                    ? (typeof ad.grid_cell_placement === 'string'
                        ? ad.grid_cell_placement.split(',').map(Number)
                        : ad.grid_cell_placement)
                    : (previewAd?.gridSelection && previewAd.gridSelection.length > 0
                        ? previewAd.gridSelection
                        : [6,7,8]);

                  const bounds = getGridBounds(allowedCells);

                  const adCopy = ad?.ad_copy || ad?.text || previewAd?.name;
                  const imageUrl = ad?.image_url || ad?.media_url || previewAd?.media_url || previewAd?.image_url;
                  const mediaType = ad?.ad_type || ad?.media_type || previewAd?.type || '';

                  const bannerBg = ad?.banner_background_color || previewAd?.banner_background_color || 'transparent';
                  const imgX = ad?.image_x !== undefined ? ad.image_x : (ad?.layout?.img?.x || 0);
                  const imgY = ad?.image_y !== undefined ? ad.image_y : (ad?.layout?.img?.y || 0);
                  const imgW = ad?.image_width !== undefined ? ad.image_width : (ad?.layout?.img?.w || 300);
                  const imgRot = ad?.image_rotate !== undefined ? ad.image_rotate : (ad?.imgRotate || 0);
                  const zOrder = ad?.z_order !== undefined ? ad.z_order : (ad?.zOrder?.img || 1);
                  const zoom = ad?.content_zoom !== undefined ? ad.content_zoom : (ad?.contentScale || 1);

                  const textX = ad?.text_x !== undefined ? ad.text_x : (ad?.layout?.text?.x || 0);
                  const textY = ad?.text_y !== undefined ? ad.text_y : (ad?.layout?.text?.y || 0);
                  const textColor = ad?.text_color || ad?.fontColor || '#ffffff';
                  const textSize = ad?.text_size !== undefined ? ad.text_size : (ad?.layout?.text?.size || ad?.fontSize || 24);
                  const textStyle = ad?.text_style || ad?.styles;
                  const textZ = ad?.text_z_order !== undefined ? ad.text_z_order : (ad?.zOrder?.text || 2);

                  let styles = {};
                  try {
                    const parsed = typeof textStyle === 'string' ? JSON.parse(textStyle) : textStyle;
                    if (parsed && parsed.bold) styles.fontWeight = 'bold';
                    if (parsed && parsed.italic) styles.fontStyle = 'italic';
                    if (parsed && parsed.underline) styles.textDecoration = 'underline';
                    if (parsed && parsed.heading) styles.textTransform = 'uppercase';
                  } catch (e) {}

                  return (
                    <div className="sd-sim-ad-container" style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none'
                    }}>
                      {/* Banner Container */}
                      <div style={{
                        position: 'absolute',
                        left: `${(bounds.x / 1920) * 100}%`,
                        top: `${(bounds.y / 1080) * 100}%`,
                        width: `${(bounds.w / 1920) * 100}%`,
                        height: `${(bounds.h / 1080) * 100}%`,
                        background: 'transparent',
                        borderRadius: '0px', 
                        boxShadow: 'none',
                        overflow: 'hidden',
                        zIndex: 1
                      }}>
                        {/* Image Layer */}
                        {imageUrl && (
                          mediaType?.includes?.('video') ? (
                            <video 
                              src={imageUrl} 
                              autoPlay muted loop
                              style={{
                                position: 'absolute',
                                left: `${(Math.max(0, imgX) / bounds.w) * 100}%`,
                                top: `${(Math.max(0, imgY) / bounds.h) * 100}%`,
                                width: `${(imgW / bounds.w) * 100}%`,
                                height: 'auto',
                                transform: `scale(${zoom}) rotate(${imgRot}deg)`,
                                transformOrigin: 'top left',
                                zIndex: zOrder,
                                objectFit: 'contain'
                              }} 
                            />
                          ) : (
                            <img 
                              src={imageUrl} 
                              alt="" 
                              style={{
                                position: 'absolute',
                                left: `${(Math.max(0, imgX) / bounds.w) * 100}%`,
                                top: `${(Math.max(0, imgY) / bounds.h) * 100}%`,
                                width: `${(imgW / bounds.w) * 100}%`,
                                height: 'auto',
                                transform: `scale(${zoom}) rotate(${imgRot}deg)`,
                                transformOrigin: 'top left',
                                zIndex: zOrder,
                                objectFit: 'contain'
                              }} 
                            />
                          )
                        )}

                        {/* Text Layer */}
                        {adCopy && (
                          <div style={{
                            position: 'absolute',
                            left: `${(Math.max(0, textX) / bounds.w) * 100}%`,
                            top: `${(Math.max(0, textY) / bounds.h) * 100}%`,
                            color: textColor || '#ffffff',
                            fontSize: `calc(${textSize / 1920} * 100cqw)`, 
                            zIndex: textZ,
                            fontFamily: 'Geist, sans-serif',
                            whiteSpace: 'nowrap',
                            padding: `calc(8 / 1920 * 100cqw) calc(16 / 1920 * 100cqw)`,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top left',
                            ...styles
                          }}>
                            {adCopy}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

              <div className="sd-modal-footer" style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="sd-btn-ghost" onClick={() => setPreviewOpen(false)}>Close</button>
              </div>
          </div>
        </div>
      )}

      {/* ── BRAND REQUEST MODAL ── */}
      {selectedBrandRequestModal && (
        <div className="sd-modal-overlay" onClick={() => setSelectedBrandRequestModal(null)}>
          <div className="sd-modal sd-modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '95vw' }}>
            <div className="sd-modal-head">
              <div>
                <div className="sd-eyebrow">Brand Request</div>
                <h3 className="sd-modal-title">{selectedBrandRequestModal.brandName}</h3>
                <div className="sd-req-meta" style={{ marginTop: '0.2rem' }}>
                  {selectedBrandRequestModal.ads.length} ad{selectedBrandRequestModal.ads.length > 1 ? 's' : ''} pending · ₹{(selectedBrandRequestModal.totalBrandPay || 0).toFixed(2)} / play potential
                </div>
              </div>
              <button className="sd-modal-close" onClick={() => setSelectedBrandRequestModal(null)}>✕</button>
            </div>

            {/* Ads as cards */}
            <div style={{ padding: '1.25rem 1.5rem', maxHeight: '55vh', overflowY: 'auto', background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.85rem' }}>
                {selectedBrandRequestModal.ads.map(req => {
                  const thumbUrl = req.media_url || req.ads?.[0]?.media_url
                  return (
                    <div key={req.id} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      {/* Thumbnail */}
                      <div style={{ width: '100%', height: '90px', background: '#f1f5f9', flexShrink: 0, overflow: 'hidden' }}>
                        {thumbUrl
                          ? <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', color: '#94a3b8' }}>{selectedBrandRequestModal.brandName[0]}</div>
                        }
                      </div>
                      {/* Body */}
                      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                        <span className="sd-pl-name" style={{ fontSize: '0.85rem' }}>{req.displayName}</span>
                        <span className="sd-pl-meta">
                          {req.type?.replace('_', ' ')} · {req.daysLive}d
                        </span>
                        <span className="sd-brand-earned" style={{ margin: 0, fontSize: '0.85rem' }}>₹{(req.amountPerPlay || 0).toFixed(2)} <span className="sd-brand-earned-label" style={{ display: 'inline', fontSize: '0.7rem' }}>/play</span></span>
                        <div style={{ marginTop: 'auto', paddingTop: '0.35rem' }}>
                          <button className="sd-btn-ghost sd-btn-xs" onClick={() => { setPreviewAd(req); setPreviewOpen(true); }}>Preview</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action footer */}
            <div className="sd-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="sd-btn-ghost" onClick={() => setSelectedBrandRequestModal(null)}>Cancel</button>
              <button className="sd-btn-danger-outline" onClick={() => { rejectBrand(selectedBrandRequestModal.id); setSelectedBrandRequestModal(null); }}>Reject Brand</button>
              <button className="sd-btn-primary" onClick={() => { approveBrand(selectedBrandRequestModal.id); setSelectedBrandRequestModal(null); }}>Approve Brand & Add Ads</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BRAND EARNINGS MODAL ── */}
      {selectedBrandModal && (
        <div className="sd-modal-overlay" onClick={() => setSelectedBrandModal(null)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '95vw' }}>
            <div className="sd-modal-head">
              <div>
                <div className="sd-eyebrow">Brand Partner</div>
                <h3 className="sd-modal-title">{selectedBrandModal.name}</h3>
                {selectedBrandModal.category && <div className="sd-modal-brand-chip">{selectedBrandModal.category}</div>}
              </div>
              <button className="sd-modal-close" onClick={() => setSelectedBrandModal(null)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem 1.75rem' }}>
              {/* Big earnings number */}
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <div className="sd-brand-earned" style={{ fontSize: '2.5rem', margin: 0 }}>₹{(selectedBrandModal.earned_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="sd-brand-earned-label" style={{ marginTop: '0.25rem' }}>Total earned from this brand</div>
              </div>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div className="sd-brand-stat-val" style={{ fontSize: '1.5rem' }}>{selectedBrandModal.streamsCount}</div>
                  <div className="sd-brand-stat-key">Streams with ads</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div className="sd-brand-stat-val" style={{ fontSize: '1.5rem' }}>
                    {selectedBrandModal.lastStreamDate === 'Never' ? 'Never'
                      : new Date(selectedBrandModal.lastStreamDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="sd-brand-stat-key">Last streamed</div>
                </div>
              </div>
              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px' }}>
                <span className="sd-brand-stat-key">Partnership status</span>
                <StatusBadge status={selectedBrandModal.status} />
              </div>
              {/* Earnings bar */}
              {selectedBrandModal.earned_cents > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="sd-brand-stat-key">Earnings progress</span>
                    <span className="sd-brand-stat-key">{Math.min(Math.round((selectedBrandModal.earned_cents / 5000000) * 100), 100)}%</span>
                  </div>
                  <div className="sd-brand-bar-track">
                    <div className="sd-brand-bar-fill" style={{ background: selectedBrandModal.color, width: `${Math.min((selectedBrandModal.earned_cents / 5000000) * 100, 100)}%` }}/>
                  </div>
                </div>
              )}
            </div>
            <div className="sd-modal-footer" style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="sd-btn-ghost" onClick={() => setSelectedBrandModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BRAND ADS MODAL ── */}
      {selectedBrandAdsModal && (
        <div className="sd-modal-overlay" onClick={() => setSelectedBrandAdsModal(null)}>
          <div className="sd-modal sd-modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95vw' }}>
            <div className="sd-modal-head">
              <div>
                <div className="sd-eyebrow">Brand Schedule</div>
                <h3 className="sd-modal-title">{selectedBrandAdsModal.brandName} Ads</h3>
              </div>
              <button className="sd-modal-close" onClick={() => setSelectedBrandAdsModal(null)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', maxHeight: '65vh', overflowY: 'auto', background: '#f8fafc' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {selectedBrandAdsModal.items.map(ad => {
                    const i = playlistTab === 'live' ? liveAds.findIndex(x => x.id === ad.id) : -1;
                    const isPlaying = playlistTab === 'live' && i === activeIndex;
                    const thumbUrl = ad.media_url || ad.ads?.[0]?.media_url;
                    return (
                      <div
                        key={ad.id}
                        draggable={!isEditMode && playlistTab === 'live'}
                        onDragStart={e => handleDragStart(e, ad.id)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, ad.id)}
                        style={{
                          background: 'white',
                          borderRadius: '10px',
                          border: `1.5px solid ${isPlaying ? '#10b981' : '#e2e8f0'}`,
                          boxShadow: isPlaying ? '0 0 0 3px rgba(16,185,129,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          minHeight: '160px'
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{ width: '100%', height: '100px', background: '#f1f5f9', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                          {thumbUrl
                            ? <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#94a3b8' }}>{ad.brand?.[0] || 'A'}</div>
                          }
                          {isPlaying && (
                            <div style={{ position: 'absolute', top: '0.4rem', left: '0.4rem', background: '#10b981', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>● Live</div>
                          )}
                          {isEditMode && (
                            <div style={{ position: 'absolute', top: '0.4rem', right: '0.4rem' }}>
                              <input type="checkbox" className="sd-checkbox"
                                checked={checkedIds.includes(ad.id)}
                                onChange={e => setCheckedIds(prev =>
                                  e.target.checked ? [...prev, ad.id] : prev.filter(x => x !== ad.id)
                                )}/>
                            </div>
                          )}
                        </div>
                        {/* Card body */}
                        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                          <span className="sd-pl-name" style={{ fontSize: '0.88rem' }}>{ad.name}</span>
                          <span className="sd-pl-meta">
                            {ad.type?.replace('_',' ')}
                            {ad.amountPerPlay > 0 && ` · ₹${ad.amountPerPlay.toFixed(2)} / play`}
                            {ad.plays_per_stream != null && (
                              <span style={{ marginLeft: '0.3rem', fontWeight: 600, color: ad.plays_per_stream === 0 ? '#EF4444' : ad.plays_per_stream <= 2 ? '#F59E0B' : '#3B82F6' }}>
                                · {ad.plays_per_stream === 0 ? '⚠ done' : `${ad.plays_per_stream}×/stream`}
                              </span>
                            )}
                          </span>
                          {/* Footer row */}
                          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {ad.status === 'upcoming' && <span className="sd-days-badge blue" style={{ fontSize: '0.65rem' }}>in {ad.daysLeft}d</span>}
                            {ad.status === 'ended' && <span className="sd-days-badge muted" style={{ fontSize: '0.65rem' }}>Ended</span>}
                            {ad.status === 'live' && !isPlaying && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />}
                            <span style={{ flex: 1 }} />
                            <button className="sd-btn-ghost sd-btn-xs" onClick={() => { setPreviewAd(ad); setPreviewOpen(true) }}>
                              Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
               </div>
            </div>
            <div className="sd-modal-footer" style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
               <button className="sd-btn-ghost" onClick={() => setSelectedBrandAdsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AD PICKER MODAL ── */}
      {showAdPicker && (
        <div className="sd-modal-overlay" onClick={() => setShowAdPicker(false)}>
          <div className="sd-modal sd-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-head">
              <div>
                <div className="sd-eyebrow">Select Ads</div>
                <h3 className="sd-modal-title">Ads matching your grid positions</h3>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {selectedPositions.map(p => (
                    <span key={p} className="sd-pref-pos-chip">{p.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
              <button className="sd-modal-close" onClick={() => setShowAdPicker(false)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem 1.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {(() => {
                const posIndices = selectedPositions.map(p => ALL_POSITIONS.indexOf(p)).filter(i => i >= 0)
                const matchingAds = liveAds.filter(ad => {
                  // Check all possible grid data sources
                  let adGrids = ad.gridSelection || []
                  if (adGrids.length === 0 && ad.ads?.[0]?.grid_cell_placement) {
                    adGrids = ad.ads[0].grid_cell_placement.split(',').map(Number)
                  }
                  if (adGrids.length === 0 && ad.ads?.[0]?.grid_selection) {
                    adGrids = ad.ads[0].grid_selection
                  }
                  // Only show ads that have grid data AND overlap with selected positions
                  if (!adGrids || adGrids.length === 0) return false
                  return adGrids.some(g => posIndices.includes(g))
                })

                if (matchingAds.length === 0) {
                  return <p className="sd-empty">No approved ads match your selected grid positions.</p>
                }

                // Group by brand
                const grouped = {}
                matchingAds.forEach(ad => {
                  const bName = ad.brand || 'Unknown'
                  if (!grouped[bName]) grouped[bName] = []
                  grouped[bName].push(ad)
                })

                return Object.entries(grouped).map(([brandName, ads]) => {
                  const isExpanded = expandedPickerBrands[brandName]
                  const allSelected = ads.every(ad => selectedStreamAds.some(s => s.id === ad.id))
                  const someSelected = ads.some(ad => selectedStreamAds.some(s => s.id === ad.id))

                  return (
                    <div key={brandName} className="sd-req-card" style={{ padding: '0', marginBottom: '0.75rem' }}>
                      <div className="sd-req-head" style={{ padding: '0.85rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => togglePickerBrand(brandName)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <div style={{
                             width: '20px', height: '20px', borderRadius: '4px',
                             border: allSelected ? '2px solid #3B5BFF' : (someSelected ? '2px solid #3B5BFF' : '2px solid #CBD5E1'),
                             background: allSelected ? '#3B5BFF' : (someSelected ? '#EEF2FF' : 'white'),
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             flexShrink: 0, transition: 'all 0.15s'
                           }} onClick={(e) => {
                             e.stopPropagation();
                             if (allSelected) {
                               // Deselect all
                               setSelectedStreamAds(prev => prev.filter(s => !ads.find(a => a.id === s.id)))
                             } else {
                               // Select all
                               setSelectedStreamAds(prev => {
                                 const next = [...prev]
                                 ads.forEach(a => {
                                    if (!next.find(n => n.id === a.id)) next.push(a)
                                 })
                                 return next
                               })
                             }
                           }}>
                             {allSelected && <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                             {(!allSelected && someSelected) && <span style={{ color: '#3B5BFF', fontSize: '1rem', fontWeight: 700 }}>-</span>}
                           </div>
                           <div className="sd-brand-logo-sm" style={{ background: '#3B5BFF', color: 'white' }}>
                             {brandName[0]}
                           </div>
                           <div>
                             <h3 className="sd-req-title" style={{ fontSize: '0.9rem', margin: 0 }}>{brandName}</h3>
                             <div className="sd-req-meta" style={{ fontSize: '0.75rem' }}>{ads.length} matching ad{ads.length !== 1 ? 's' : ''}</div>
                           </div>
                        </div>
                        <span style={{ fontSize: '1rem', color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                      </div>
                      
                      {isExpanded && (
                         <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '0.75rem 1rem' }}>
                           {ads.map(ad => {
                             const isSelected = selectedStreamAds.some(s => s.id === ad.id)
                             return (
                               <div key={ad.id} style={{
                                 display: 'flex', alignItems: 'center', gap: '0.75rem',
                                 padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
                                 borderRadius: '8px',
                                 border: isSelected ? '1px solid #3B5BFF' : '1px solid #e2e8f0',
                                 background: isSelected ? '#EEF2FF' : 'white',
                                 cursor: 'pointer',
                                 transition: 'all 0.15s'
                               }} onClick={() => {
                                 setSelectedStreamAds(prev => {
                                   if (isSelected) return prev.filter(s => s.id !== ad.id)
                                   return [...prev, ad]
                                 })
                               }}>
                                 <div style={{ flex: 1 }}>
                                   <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1e293b' }}>{ad.name}</div>
                                   <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                     {ad.duration}s · {ad.type?.replace('_', ' ')}
                                     {ad.amountPerPlay > 0 && ` · ₹${ad.amountPerPlay.toFixed(2)} / play`}
                                   </div>
                                 </div>
                               </div>
                             )
                           })}
                         </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
            <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {selectedStreamAds.length} ad{selectedStreamAds.length !== 1 ? 's' : ''} selected
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="sd-btn-ghost" onClick={() => setSelectedStreamAds([])}>Clear all</button>
                <button className="sd-btn-primary" onClick={() => {
                  const userId = user?.id || user?.uid || id
                  
                  // Sorting by brand-wise most expensive
                  const brandMaxPay = {};
                  selectedStreamAds.forEach(ad => {
                    const pay = ad.amountPerPlay || 0;
                    if (!brandMaxPay[ad.brand] || brandMaxPay[ad.brand] < pay) {
                      brandMaxPay[ad.brand] = pay;
                    }
                  });

                  const sortedAds = [...selectedStreamAds].sort((a, b) => {
                    const brandDiff = (brandMaxPay[b.brand] || 0) - (brandMaxPay[a.brand] || 0);
                    if (brandDiff !== 0) return brandDiff;
                    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
                    return (b.amountPerPlay || 0) - (a.amountPerPlay || 0);
                  });

                  setSecureItem(`streamer_stream_ads_${userId}`, sortedAds)
                  setSelectedStreamAds(sortedAds)
                  setShowAdPicker(false)
                }}>
                  Confirm selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}