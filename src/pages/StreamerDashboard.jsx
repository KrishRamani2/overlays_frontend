import { useEffect, useRef, useState, useCallback } from 'react'
import { getStreamerMe, logout, apiFetch, fetchStreamerUser, fetchTierBrands, postApprovedAd, fetchApprovedAds, postRejectedAd, fetchRejectedAds, updateApprovedAd, startStreamSession, updatePlaysPerStream, getPlaysPerStream, createPlaysPerStream, updateAdPlaysPerStream, fetchStreamerWallet, updateStreamerWallet, saveStreamEarnings } from '../api/auth'
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
  const [walletInfo,         setWalletInfo]          = useState({ account_number: '', ifsc_code: '', account_holder_name: '', upi_id: '' })
  const [completedStreams,   setCompletedStreams]    = useState([])
  const [totalWalletEarnings, setTotalWalletEarnings] = useState(0)
  const [savingWallet,       setSavingWallet]        = useState(false)
  const [isEditMode,         setIsEditMode]          = useState(false)
  const [checkedIds,         setCheckedIds]          = useState([])

  const syncRef       = useRef(null)
  const timerRef      = useRef(null)
  const playlistRef   = useRef([])
  const gapRef        = useRef(20)
  const draggedRef    = useRef(null)
  const streamPlaysRef= useRef({}) // live ref so sync loop can read without stale closure

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
        if (res.payout_details) setWalletInfo(res.payout_details)
        if (res.streams) setCompletedStreams(res.streams)
        if (res.total_earned_cents != null) setTotalWalletEarnings(res.total_earned_cents)
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
        let mapped = brandData.items.flatMap(brand => 
          (brand.campaigns || []).map(camp => {
            const budget = camp.estimated_cost_rupees || 0
            const playCount = camp.play_count || 1
            const amountPerPlay = budget / playCount
            return {
              id: `req_${camp.id || camp.campaign_id}`,
              campaignId: camp.campaign_id || camp.id,
              campaignName: camp.campaign_name || 'Unnamed Campaign',
              brand: brand.brand_name,
              displayName: `${brand.brand_name} — ${camp.campaign_name || 'Unnamed Campaign'}`,
              tier: camp.tier || tier,
              budgetRange: `₹${budget}`,
              amountPerPlay: amountPerPlay,
              daysLive: camp.campaign_duration_days || 7,
              type: camp.ads && camp.ads.length > 0 ? camp.ads[0].ad_type : 'unknown',
              approvedCount: camp.play_count || 10,
              ads: camp.ads || []
            }
          })
        ).sort((a, b) => b.amountPerPlay - a.amountPerPlay)

        const approvedSet = new Set((approvedData || []).map(a => a.ad_name))
        const rejectedSet = new Set((rejectedData || []).map(r => r.ad_name))
        const approvedCampaignSet = new Set((approvedData || []).map(a => a.campaign_id).filter(Boolean))
        const rejectedCampaignSet = new Set((rejectedData || []).map(r => r.campaign_id).filter(Boolean))
        
        const seenCampaignIds = new Set()
        const seenDisplayNames = new Set()

        mapped = mapped.filter(m => {
          const adName = m.ads?.[0]?.ad_name || m.campaignName || m.displayName.split(' — ')[1] || m.displayName
          if (approvedSet.has(adName) || rejectedSet.has(adName)) return false
          if (m.campaignId && (approvedCampaignSet.has(m.campaignId) || rejectedCampaignSet.has(String(m.campaignId)))) return false

          if (m.campaignId && seenCampaignIds.has(m.campaignId)) return false
          if (m.displayName && seenDisplayNames.has(m.displayName)) return false

          if (m.campaignId) seenCampaignIds.add(m.campaignId)
          if (m.displayName) seenDisplayNames.add(m.displayName)

          return true
        })
        
        setAdRequests(mapped)
        setSecureItem(`streamer_ad_requests_${userId}`, mapped)

        // Extract real plays_per_stream from the brandData items for lookup
        const realPlaysMap = {}
        if (brandData && brandData.items) {
          brandData.items.forEach(b => {
            (b.campaigns || []).forEach(c => {
              (c.ads || []).forEach(a => {
                if (a.plays_per_stream != null) {
                  if (c.campaign_id) realPlaysMap[`${c.campaign_id}_${a.ad_name}`] = a.plays_per_stream
                  if (c.id) realPlaysMap[`${c.id}_${a.ad_name}`] = a.plays_per_stream
                }
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

            return {
              id: `approved_${ad.id}`,
              backendId: ad.id,
              campaignId: ad.campaign_id,
              name: ad.ad_name,
              brand: ad.brand_name,
              duration: ad.show_duration || 10,
              status: ad.status === 'approved' ? 'live' : ad.status,
              daysLeft: 0,
              earnings: '—',
              amountPerPlay: ad.amount_per_play || 0,
              type: ad.ad_media_type || 'text',
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
  const approveRequest = async (reqId, campaignId) => {
    if (!window.confirm('Approve this ad request?')) return
    const req = adRequests.find(r => r.id === reqId)
    if (!req) return

    const userId = user.id || user.uid || id
    
    // Check for duplicates in playlist
    const adToApprove = req.ads?.[0]
    const adName = adToApprove?.ad_name || req.campaignName || req.displayName.split(' — ')[1] || req.displayName
    const isDuplicate = playlist.some(p => 
      p.backendId === req.campaignId || 
      p.name === adName ||
      p.campaignId === req.campaignId
    )
    
    if (isDuplicate) {
      alert('This ad is already in your playlist!')
      setAdRequests(p => p.filter(r => r.id !== reqId))
      return
    }

    // Persist to backend FIRST — await so the DB write completes
    let backendAd = null
    if (adToApprove) {
      backendAd = await postApprovedAd(userId, {
        brand_name: req.brand,
        ad_name: adName,
        campaign_id: req.campaignId,
        approved_count: req.approvedCount,
        remaining_count: req.approvedCount,
        amount_per_play: req.amountPerPlay,
        ad_media_url: adToApprove.media_url,
        ad_media_type: adToApprove.ad_type,
        grid_selection: adToApprove.grid_cell_placement
          ? adToApprove.grid_cell_placement.split(',').map(Number)
          : [],
        show_duration: adToApprove.duration_seconds || 15,
        layout_json: adToApprove
      })

      if (!backendAd) {
        alert('Failed to save to database. Please try again.')
        return
      }
    }

    // Remove from incoming requests (UI only — DB is source of truth on refresh)
    setAdRequests(p => p.filter(r => r.id !== reqId))

    // Add to playlist
    setPlaylist(p => {
      const next = [...p, {
        id: backendAd ? `approved_${backendAd.id}` : campaignId,
        backendId: backendAd?.id,
        name: adName,
        brand: req.brand,
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
        gridSelection: adToApprove?.grid_cell_placement
          ? adToApprove.grid_cell_placement.split(',').map(Number)
          : [],
        ads: req.ads
      }].sort((a, b) => (b.amountPerPlay || 0) - (a.amountPerPlay || 0))
      
      // Update cache immediately
      setSecureItem(`streamer_playlist_${userId}`, next)
      return next
    })
  }

  const rejectRequest = async (reqId) => {
    if (!window.confirm('Reject this ad request?')) return
    const req = adRequests.find(r => r.id === reqId)
    if (!req) return
    const userId = user?.id || user?.uid || id
    
    // Persist to backend FIRST
    const adToReject = req.ads?.[0]
    const adName = adToReject?.ad_name || req.campaignName || req.displayName.split(' — ')[1] || req.displayName
    
    const newRej = await postRejectedAd(userId, {
      brand_name: req.brand,
      ad_name: adName,
      campaign_id: req.campaignId,
      status: 'rejected'
    })

    if (!newRej) {
      alert('Failed to save rejection. Please try again.')
      return
    }

    // Update UI
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

    setAdRequests(p => p.filter(r => r.id !== reqId))
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

  /* ── Generate long OBS overlay link with full session data ── */
  const generateLongOverlayLink = (sessionData) => {
    const userId = user?.id || user?.uid || id
    const baseUrl = `http://127.0.0.1:5000/api/overlay/${userId}`
    
    // Build comprehensive query params
    const params = new URLSearchParams()
    params.set('session_id', `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`)
    params.set('streamer_id', userId || '')
    params.set('streamer_name', user?.name || '')
    params.set('channel', user?.channel_title || user?.channel || '')
    params.set('tier', user?.tier || 'Tier 5')
    params.set('stream_title', sessionData.stream_title || '')
    params.set('stream_content', sessionData.stream_content || '')
    params.set('stream_url', sessionData.live_stream_url || '')
    params.set('started_at', new Date().toISOString())
    params.set('positions', (sessionData.overlay_config?.positions || []).join(','))
    params.set('restricted', (sessionData.overlay_config?.restrictedPositions || []).join(','))
    params.set('gap_seconds', String(sessionData.overlay_config?.gap || 20))
    params.set('ads_enabled', String(sessionData.overlay_config?.adsEnabled !== false))
    params.set('preset_name', sessionData.overlay_config?.presetName || 'Custom')
    params.set('total_ads', String(sessionData.selected_ads?.length || 0))
    
    // Encode each ad's full data
    if (sessionData.selected_ads) {
      sessionData.selected_ads.forEach((ad, i) => {
        params.set(`ad_${i}_id`, ad.id || '')
        params.set(`ad_${i}_name`, ad.name || '')
        params.set(`ad_${i}_brand`, ad.brand || '')
        params.set(`ad_${i}_duration`, String(ad.duration || 10))
        params.set(`ad_${i}_type`, ad.type || 'text')
        params.set(`ad_${i}_grid`, (ad.gridSelection || []).join(','))
        params.set(`ad_${i}_ppp`, String(ad.amountPerPlay || 0))
        params.set(`ad_${i}_campaign`, ad.campaignId || '')
        if (ad.layout_json) {
          try {
            params.set(`ad_${i}_layout`, btoa(JSON.stringify(ad.layout_json)))
          } catch(e) {}
        }
      })
    }
    
    // Add a signature hash for verification
    params.set('sig', btoa(`${userId}:${Date.now()}:${sessionData.selected_ads?.length || 0}`).replace(/=/g, ''))
    params.set('v', '2')
    params.set('resolution', '1920x1080')
    params.set('bg', 'transparent')
    
    return `${baseUrl}?${params.toString()}`
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

    // Send to backend
    startStreamSession(sessionPayload)
  }

  const endStream = async () => {
    if (!window.confirm('End this stream?')) return
    const userId = user?.id || user?.uid || id

    // ── Sync final play counts back to the backend for each ad ──
    const finalPlays = streamPlaysRef.current
    const updatePromises = selectedStreamAds
      .filter(ad => ad.backendId && ad.campaignId)
      .flatMap(ad => {
        const playsRemaining = finalPlays[ad.id] ?? 0
        // This is what we will send to the backend so it knows what the new remaining count should be
        return [
          updatePlaysPerStream(userId, ad.campaignId, ad.backendId, {
            plays_per_stream: playsRemaining
          }),
          updateAdPlaysPerStream(ad.backendId, {
            plays_per_stream: playsRemaining
          })
        ]
      })

    try {
      await Promise.all(updatePromises)
      console.log('Ad play counts updated after stream ended.')

      const initialPlays = getSecureItem(`streamer_stream_plays_${userId}`) || {}
      const adsPayload = selectedStreamAds.map(ad => {
        const plays_start = initialPlays[ad.id] || ad.plays_per_stream || ad.approved_count || 24
        const plays_end = finalPlays[ad.id] ?? 0
        const amountPerPlayRupees = ad.amountPerPlay || 0
        const estimated_cost_cents = Math.round(amountPerPlayRupees * plays_start * 100)
        return {
          ad_id: ad.backendId,
          ad_name: ad.name,
          plays_per_stream_start: plays_start,
          plays_per_stream_end: plays_end,
          estimated_cost_cents: estimated_cost_cents
        }
      })

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
      console.error('Failed to update some ad counts or save stream earnings:', err)
    }

    // Clear stream plays from storage
    removeSecureItem(`streamer_stream_plays_${userId}`)
    streamPlaysRef.current = {}
    setStreamPlaysMap({})

    // Invalidate the data cache so next load re-fetches fresh counts
    removeSecureItem(`streamer_last_fetch_${userId}`)

    setIsStreaming(false)
    setStreamStartTime(null)
    setStreamElapsed(0)
    setGoLiveStep(1)
  }

  const liveAds     = playlist.filter(a => a.status === 'live' && (a.remaining_count === undefined || a.remaining_count > 0))
  const upcomingAds = playlist.filter(a => a.status === 'upcoming' && (a.remaining_count === undefined || a.remaining_count > 0))
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
                        return (
                          <div key={ad.id} className={`sd-live-row ${isPlaying ? 'now-playing' : ''}`}>
                            <div className="sd-live-indicator-dot" style={{ background: isPlaying ? '#10B981' : '#e2e8f0' }}/>
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
                  { id: 'ended',    label: 'Ended',     count: playlist.filter(a => a.status === 'ended' || a.remaining_count === 0).length },
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
                {(() => {
                  const items = playlistTab === 'live' ? liveAds 
                              : playlistTab === 'upcoming' ? upcomingAds
                              : playlist.filter(a => a.status === 'ended' || a.remaining_count === 0)

                  if (items.length === 0) {
                    return <p className="sd-empty">No {playlistTab} ads.</p>
                  }

                  return (
                    <div className="sd-playlist-list">
                      {items.map((ad, i) => {
                        const isPlaying = playlistTab === 'live' && i === activeIndex
                        return (
                          <div
                            key={ad.id}
                            className={`sd-playlist-row ${isPlaying ? 'now-playing' : ''}`}
                            draggable={!isEditMode && playlistTab === 'live'}
                            onDragStart={e => handleDragStart(e, ad.id)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDrop(e, ad.id)}
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
                            <span className="sd-pl-meta">
                              {ad.brand} · {ad.type?.replace('_',' ')}
                              {ad.amountPerPlay > 0 && ` · ₹${ad.amountPerPlay.toFixed(2)} / play`}
                              {ad.plays_per_stream != null && (
                                <span style={{
                                  marginLeft: '0.4rem',
                                  fontWeight: 600,
                                  color: ad.plays_per_stream === 0 ? '#EF4444'
                                       : ad.plays_per_stream <= 2   ? '#F59E0B'
                                       : '#059669'
                                }}>
                                  · {ad.plays_per_stream === 0
                                      ? '⚠ Stream quota done'
                                      : `${ad.plays_per_stream} play${ad.plays_per_stream !== 1 ? 's' : ''} / stream`}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="sd-pl-right">
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
                              {req.tier} · {req.budgetRange}
                              {req.amountPerPlay > 0 && ` (₹${req.amountPerPlay.toFixed(2)}/play)`}
                              {` · ${req.daysLive} days · ${req.type?.replace('_',' ')} · ${req.approvedCount} plays`}
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
                              return (
                                <div key={ad.id} className={`sd-live-row ${isPlaying ? 'now-playing' : ''}`} style={{ opacity: exhausted ? 0.5 : 1 }}>
                                  <div className="sd-live-indicator-dot" style={{ background: exhausted ? '#EF4444' : isPlaying ? '#10B981' : '#e2e8f0' }}/>
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
                  { label: 'This month',          value: DUMMY_EARNINGS.thisMonth, sub: 'June 2026' },
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
                          {completedStreams.map((s, i) => (
                            <tr key={i}>
                              <td className="sd-muted">{new Date(s.stream_date).toLocaleDateString()}</td>
                              <td><strong>{s.stream_title || 'Untitled Stream'}</strong></td>
                              <td><strong style={{ color: '#10B981' }}>₹{(s.total_earned_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                            </tr>
                          ))}
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
                        background: bannerBg || 'transparent',
                        borderRadius: '0px', 
                        boxShadow: bannerBg ? '0 10px 30px rgba(0,0,0,0.25)' : 'none',
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

            {/* Adaptive footer: show approve/reject for requests, just close for playlist */}
            {previewAd?.id?.startsWith?.('req_') ? (
              <div className="sd-modal-footer" style={{ padding: '1.5rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="sd-btn-ghost" onClick={() => setPreviewOpen(false)}>Close</button>
                <button className="sd-btn-danger-sm" style={{ padding: '0.6rem 1.3rem' }} onClick={() => { rejectRequest(previewAd.id); setPreviewOpen(false); }}>Reject</button>
                <button className="sd-btn-primary" onClick={() => { approveRequest(previewAd.id, previewAd.campaignId); setPreviewOpen(false); }}>Approve Request</button>
              </div>
            ) : (
              <div className="sd-modal-footer" style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="sd-btn-ghost" onClick={() => setPreviewOpen(false)}>Close</button>
              </div>
            )}
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

                return matchingAds.map(ad => {
                  const isSelected = selectedStreamAds.some(s => s.id === ad.id)
                  const brand = DUMMY_BRANDS.find(b => b.name === ad.brand)
                  return (
                    <div key={ad.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.85rem 1rem', marginBottom: '0.5rem',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #3B5BFF' : '1px solid var(--border)',
                      background: isSelected ? '#EEF2FF' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }} onClick={() => {
                      setSelectedStreamAds(prev => {
                        if (isSelected) return prev.filter(s => s.id !== ad.id)
                        return [...prev, ad]
                      })
                    }}>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '4px',
                        border: isSelected ? '2px solid #3B5BFF' : '2px solid #CBD5E1',
                        background: isSelected ? '#3B5BFF' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s'
                      }}>
                        {isSelected && <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                      </div>
                      <div className="sd-brand-logo-sm" style={{ background: brand?.color || '#3B5BFF', color: 'white' }}>
                        {ad.brand?.[0] || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--ink)' }}>{ad.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {ad.brand} · {ad.duration}s · {ad.type?.replace('_', ' ')}
                          {ad.amountPerPlay > 0 && ` · ₹${ad.amountPerPlay.toFixed(2)} / play`}
                          {ad.plays_per_stream != null && ` · ${ad.plays_per_stream} play${ad.plays_per_stream !== 1 ? 's' : ''}/stream`}
                        </div>
                      </div>
                      <StatusBadge status={ad.status} />
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
                  setSecureItem(`streamer_stream_ads_${userId}`, selectedStreamAds)
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