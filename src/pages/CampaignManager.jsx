import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SubmitCampaignModal from './SubmitCampaignModal'
import toast from 'react-hot-toast'
import './SubmitCampaignModal.css'
import { logout, getMe } from '../api/auth'
import './CampaignManager.css'

const LogoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

const ADV_BASE = import.meta.env.VITE_ADVERTISER_API_BASE || 'http://localhost:8000'

const AD_TYPES = [
  { id: 'text_image', label: 'Text + Image', icon: '▤' },
  { id: 'image',      label: 'Image Only',   icon: '🖼' },
  { id: 'video',      label: 'Video',        icon: '▶' },
  { id: 'sticker',    label: 'Sticker',      icon: '⭐' },
  { id: 'text',       label: 'Text Only',    icon: 'T' },
]
const ANIM_TYPES = [
  { value: 'fade',        label: 'Fade In' },
  { value: 'slide_up',    label: 'Slide Up' },
  { value: 'slide_down',  label: 'Slide Down' },
  { value: 'slide_left',  label: 'Slide Left' },
  { value: 'slide_right', label: 'Slide Right' },
]
const FONT_FAMILIES = [
  { value: "'Segoe UI', sans-serif",   label: 'Segoe UI' },
  { value: 'Arial, sans-serif',        label: 'Arial' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: 'Georgia, serif',           label: 'Georgia' },
  { value: 'Impact, sans-serif',       label: 'Impact' },
  { value: 'Verdana, sans-serif',      label: 'Verdana' },
]

const SNAP_THRESHOLD = 15 // px in 1920-space

const defaultAd = (index = 0) => ({
  name:         `Ad ${index + 1}`,
  visibleName:  '',
  type:         'text_image',
  text:         '',
  media:        '',
  fontColor:    '#ffffff',
  fontFamily:   "'Segoe UI', sans-serif",
  fontSize:     48,
  contentScale: 1,
  animType:     'fade',
  animSpeed:    0.7,
  bgColor:      '#0E0F14',
  bgOpacity:    0.88,
  bgRadius:     8,
  imgRotate:    0,
  imgLockRatio: true,
  imgNaturalW:  0,
  imgNaturalH:  0,
  zOrder:       { img: 1, text: 2 },
  styles:       { bold: false, italic: false, underline: false, heading: false },
  gridSelection: [6, 7, 8],
  layout: {
    img:    { x: 20,  y: 20, w: 180, h: 0 },
    text:   { x: 20,  y: 20, size: 48 },
    banner: { x: 0,  y: 720, w: 1920, h: 360 },
  },
})

function getGridBounds(indices) {
  const W = 640, H = 360
  let minCol = 2, maxCol = 0, minRow = 2, maxRow = 0
  indices.forEach(idx => {
    const row = Math.floor(idx / 3), col = idx % 3
    if (row < minRow) minRow = row; if (row > maxRow) maxRow = row
    if (col < minCol) minCol = col; if (col > maxCol) maxCol = col
  })
  return { x: minCol*W, y: minRow*H, w:(maxCol-minCol+1)*W, h:(maxRow-minRow+1)*H }
}

function isContiguous(indices) {
  if (indices.length <= 1) return true
  const set = new Set(indices), visited = new Set(), queue = [indices[0]]
  visited.add(indices[0])
  while (queue.length) {
    const cur = queue.shift()
    const nb = []
    if (cur%3!==0) nb.push(cur-1); if ((cur+1)%3!==0) nb.push(cur+1)
    if (cur>=3) nb.push(cur-3);    if (cur<6) nb.push(cur+3)
    nb.forEach(n => { if (set.has(n) && !visited.has(n)) { visited.add(n); queue.push(n) } })
  }
  return visited.size === indices.length
}

export default function CampaignManager() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [userId, setUserId] = useState(id || 'demo-id')
  useEffect(() => {
    getMe().then(u => {
      if(u && u.id) setUserId(u.id)
      else if(u && u._id) setUserId(u._id)
    })
  }, [id])
  useEffect(() => {
    if (!userId || userId === 'demo-id') return
    // Fetch brands
    fetch(`${ADV_BASE}/api/accounts/${userId}/brands`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAvailableBrands(data))
      .catch(err => console.error("Failed to fetch brands", err))

    // Fetch campaigns
    fetch(`${ADV_BASE}/api/accounts/${userId}/campaigns`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => setCampaigns(data))
      .catch(err => console.error("Failed to fetch campaigns", err))
  }, [userId])
  /* ── Campaign state ── */
  const [campaigns,        setCampaigns]       = useState([])
  const [activeCampaignId, setActiveCampaignId]= useState(null)
  const [campaignId,       setCampaignId]      = useState('')
  const [duration,         setDuration]        = useState(10)
  const [isEditing,        setIsEditing]       = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [availableBrands, setAvailableBrands] = useState([])

  /* ── Ad variations ── */
  const [ads,              setAds]             = useState([defaultAd(0)])
  const [currentAdIdx,     setCurrentAdIdx]    = useState(0)

  // Derived state
  const currentCampaign = campaigns.find(c => (c.campaign_id || c.id) === activeCampaignId) || 
                          campaigns.find(c => (c.campaign_id || c.id) === campaignId);
  const currentCampaignStatus = currentCampaign ? (currentCampaign.status || 'draft') : 'draft';

  /* ── Canvas background ── */
  const [canvasBgColor, setCanvasBgColor]  = useState('#0d0d1a')
  const [canvasBgImage, setCanvasBgImage]  = useState('')

  /* ── Preview state ── */
  const [hideGrid,    setHideGrid]   = useState(false)
  const [looping,     setLooping]    = useState(false)
  const [animVisible, setAnimVisible]= useState(true)
  const [animOffset,  setAnimOffset] = useState('none')
  const [selected,    setSelected]   = useState(null) // 'img' | 'text' | null

  /* ── Snap guides ── */
  const [guideV, setGuideV] = useState(null) // x coordinate
  const [guideH, setGuideH] = useState(null) // y coordinate

  const simRef    = useRef()
  const scalerRef = useRef()
  const loopTimer = useRef()
  const dragRef   = useRef(null)
  const imgFileRef= useRef()
  const bgFileRef = useRef()

  const currentAd = ads[currentAdIdx] || defaultAd(0)

  /* ── Scale simulator ── */
  const fitPreview = useCallback(() => {
    if (!simRef.current || !scalerRef.current) return
    scalerRef.current.style.transform = `scale(${simRef.current.clientWidth / 1920})`
  }, [])

  useEffect(() => {
    fitPreview()
    window.addEventListener('resize', fitPreview)
    return () => window.removeEventListener('resize', fitPreview)
  }, [fitPreview])

  /* ── Update helpers ── */
  const updateAd = useCallback((fields) => {
    setAds(prev => {
      const next = [...prev]
      next[currentAdIdx] = { ...next[currentAdIdx], ...fields }
      return next
    })
  }, [currentAdIdx])

  const updateLayout = useCallback((fields) => {
    setAds(prev => {
      const next = [...prev]
      next[currentAdIdx] = {
        ...next[currentAdIdx],
        layout: { ...next[currentAdIdx].layout, ...fields }
      }
      return next
    })
  }, [currentAdIdx])

  const updateStyle = (s) =>
    updateAd({ styles: { ...currentAd.styles, [s]: !currentAd.styles[s] } })

  /* ── Grid ── */
  const toggleGridCell = (idx) => {
    const cur = currentAd.gridSelection
    const isRemoving = cur.includes(idx)
    let next = isRemoving ? cur.filter(i=>i!==idx) : [...cur,idx]
    
    // Constraints:
    // 1. Cannot be empty
    if (!next.length) {
      toast.error("At least one grid cell must be selected");
      return
    }
    // 2. Max 3 selected
    if (next.length > 3 && !isRemoving) {
      toast.error("Maximum 3 grid cells can be selected");
      return
    }

    if (!isContiguous(next)) {
      toast.error("Grid cells must be contiguous");
      return
    }

    const b = getGridBounds(next)
    updateAd({ gridSelection:next, layout:{ ...currentAd.layout, banner:{...currentAd.layout.banner,...b} } })
  }

  /* ── Ad variation management ── */
  const addAd    = () => { const n=[...ads,defaultAd(ads.length)]; setAds(n); setCurrentAdIdx(n.length-1) }
  const switchAd = (i) => { setCurrentAdIdx(i); setSelected(null) }
  const deleteAd = () => {
    if (ads.length<=1) return
    const n=ads.filter((_,i)=>i!==currentAdIdx)
    setAds(n); setCurrentAdIdx(Math.min(currentAdIdx,n.length-1))
  }

  /* ── Campaign CRUD ── */
  const initNew = () => {
    setCampaignId(''); setDuration(10); setIsEditing(false)
    setActiveCampaignId(null); setAds([defaultAd(0)]); setCurrentAdIdx(0)
    setSelected(null)
  }

  const getCampaignPayload = () => ({
    campaign_id: campaignId,
    campaign_name: currentAd.visibleName || campaignId,
    duration_seconds: duration,
    brand_id: parseInt(currentAd.brand) || null,
    ads: ads.map(ad => ({
      brand_id: parseInt(ad.brand) || 0,
      ad_name: ad.visibleName || ad.name,
      duration_seconds: duration,
      ad_type: ad.type,
      ad_copy: ad.text,
      text_color: ad.fontColor,
      text_style: JSON.stringify(ad.styles),
      image_url: ad.media,
      image_rotate: ad.imgRotate || 0,
      image_x: ad.layout.img.x,
      image_y: ad.layout.img.y,
      image_width: Math.round(ad.layout.img.w),
      text_x: ad.layout.text.x,
      text_y: ad.layout.text.y,
      text_size: ad.layout.text.size || ad.fontSize,
      lock_aspect_ratio: ad.imgLockRatio,
      z_order: ad.zOrder.img,
      text_z_order: ad.zOrder.text,
      content_zoom: ad.contentScale,
      banner_background_color: ad.bgColor,
      canvas_background: canvasBgColor,
      stream_background_url: canvasBgImage,
      entrance_animation: ad.animType,
      animation_speed: ad.animSpeed,
      grid_cell_placement: (ad.gridSelection || []).join(',')
    }))
  });

  const saveCampaign = () => {
    if (!campaignId.trim()) { toast.error('Campaign ID is required'); return }
    
    // Ensure all ads have at least one grid cell
    const emptyGrid = ads.find(a => !a.gridSelection || a.gridSelection.length === 0)
    if (emptyGrid) {
      toast.error(`Variation "${emptyGrid.name}" must have at least one grid cell selected.`);
      return
    }

    // Save locally only — does NOT persist to backend
    const localData = { id: campaignId, campaign_id: campaignId, campaign_name: currentAd.visibleName || campaignId, duration, ads, status: 'draft', savedAt: new Date().toISOString() }
    setCampaigns(prev => {
      const i = prev.findIndex(c => (c.campaign_id || c.id) === campaignId)
      if (i >= 0) { const n = [...prev]; n[i] = localData; return n }
      return [...prev, localData]
    })
    setActiveCampaignId(campaignId); setIsEditing(true)
    toast.success(`Ad saved locally. Use "Submit for review" to finalize and save to server.`)
  }

  const handleSubmitClick = () => {
    if (!campaignId.trim()) { toast.error('Campaign ID is required'); return }
    if (!currentAd.brand) { toast.error('Please select a brand for the ad first'); return }

    // Ensure all ads have at least one grid cell
    const emptyGrid = ads.find(a => !a.gridSelection || a.gridSelection.length === 0)
    if (emptyGrid) {
      toast.error(`Variation "${emptyGrid.name}" must have at least one grid cell selected.`);
      return
    }

    setShowSubmitModal(true)
  }

  const handleModalConfirm = async ({ tier, exclusive, daysLive, frequency, estimatedCost }) => {
    const payload = getCampaignPayload();

    try {
      // Step 1: Save campaign + ads to backend
      const saveRes = await fetch(`${ADV_BASE}/api/accounts/${userId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json();
        toast.error(`Failed to save campaign: ${errData.detail || 'Server error'}`);
        return;
      }

      // Step 2: Submit for review (this deducts from brand budget)
      const submitRes = await fetch(`${ADV_BASE}/api/accounts/${userId}/campaigns/${campaignId}/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tier,
          exclusive,
          days_live: daysLive,
          frequency,
          estimated_cost: estimatedCost,
          brand_id: parseInt(currentAd.brand) || null,
        })
      });

      if (submitRes.ok) {
        setShowSubmitModal(false);
        toast.success(`Campaign "${campaignId}" submitted for review! ₹${estimatedCost?.toLocaleString('en-IN') || '0'} deducted from brand budget.`);
        initNew();
        // Refresh campaign list
        fetch(`${ADV_BASE}/api/accounts/${userId}/campaigns`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : [])
          .then(data => setCampaigns(data))
          .catch(err => console.error("Failed to refresh campaigns", err))
      } else {
        const errData = await submitRes.json();
        toast.error(`Failed to submit campaign: ${errData.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to connect to the server.");
    }
  };


  const loadCampaign = async (c) => {
    const cid = c.campaign_id || c.id
    setActiveCampaignId(cid)
    setCampaignId(cid)
    setIsEditing(true)
    setSelected(null)
    setCurrentAdIdx(0)

    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${userId}/campaigns/${cid}`, { credentials: 'include' })
      if (!res.ok) throw new Error("Failed to fetch details")
      const data = await res.json()
      
      const campaign = data.campaign
      setDuration(campaign.duration_seconds || 10)

      if (data.ads && data.ads.length > 0) {
        const mappedAds = data.ads.map((ad, idx) => {
          const base = defaultAd(idx)
          let styles = { bold: false, italic: false, underline: false, heading: false }
          try {
            if (ad.text_style) styles = JSON.parse(ad.text_style)
          } catch(e) {}

          return {
            ...base,
            name: ad.ad_name,
            visibleName: ad.ad_name,
            type: ad.ad_type,
            text: ad.ad_copy || '',
            fontColor: ad.text_color || '#ffffff',
            styles: styles,
            media: ad.image_url || '',
            imgRotate: ad.image_rotate || 0,
            imgLockRatio: ad.lock_aspect_ratio ?? true,
            contentScale: ad.content_zoom || 1,
            bgColor: ad.banner_background_color || '#0E0F14',
            animType: ad.entrance_animation || 'fade',
            animSpeed: ad.animation_speed || 0.7,
            brand: ad.brand_id?.toString() || '',
            gridSelection: ad.grid_cell_placement ? ad.grid_cell_placement.split(',').map(Number) : [6,7,8],
            zOrder: { img: ad.z_order || 1, text: ad.text_z_order || 2 },
            fontSize: ad.text_size || base.fontSize,
            layout: {
              ...base.layout,
              img: { 
                ...base.layout.img, 
                x: ad.image_x ?? base.layout.img.x,
                y: ad.image_y ?? base.layout.img.y,
                w: ad.image_width || 180 
              },
              text: {
                ...base.layout.text,
                x: ad.text_x ?? base.layout.text.x,
                y: ad.text_y ?? base.layout.text.y,
                size: ad.text_size || base.layout.text.size
              }
            }
          }
        })

        // Also update the banner layout for each ad based on its grid selection
        const finalizedAds = mappedAds.map(ad => {
          const b = getGridBounds(ad.gridSelection)
          return {
            ...ad,
            layout: { ...ad.layout, banner: { ...ad.layout.banner, ...b } }
          }
        })

        setAds(finalizedAds)

        // Global backgrounds from the first ad (since they are currently shared in the UI)
        if (data.ads[0].canvas_background) setCanvasBgColor(data.ads[0].canvas_background)
        if (data.ads[0].stream_background_url) setCanvasBgImage(data.ads[0].stream_background_url)
      } else {
        setAds([defaultAd(0)])
      }
    } catch (err) {
      console.error("Load error:", err)
      toast.error("Failed to load campaign details from server.")
      // Fallback to what we have in the list if any
      setAds(c.ads || [defaultAd(0)])
    }
  }
  const deleteCampaign = async () => {
    if (!window.confirm('Delete this campaign?')) return

    // Try deleting from backend if it might exist there
    try {
      const res = await fetch(`${ADV_BASE}/api/accounts/${userId}/campaigns/${campaignId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok && res.status !== 404) {
        const err = await res.json()
        toast.error(`Failed to delete from server: ${err.detail || 'Server error'}`)
        return
      }
    } catch (err) {
      console.error("Delete backend error:", err)
    }

    setCampaigns(prev=>prev.filter(c=>(c.campaign_id || c.id)!==campaignId)); 
    initNew()
    toast.success('Campaign deleted successfully')
  }

  /* ── Animation loop ── */
  useEffect(() => { if (looping) startLoop(); else stopLoop(); return ()=>stopLoop() }, [looping, currentAd.animType, currentAd.animSpeed, currentAd.duration])

  const getAnimStart = (t) => ({
    fade:'none', slide_up:'translateY(80px)', slide_down:'translateY(-80px)',
    slide_left:'translateX(80px)', slide_right:'translateX(-80px)'
  }[t]||'none')

  const startLoop = () => {
    stopLoop()
    setAnimVisible(false); setAnimOffset(getAnimStart(currentAd.animType))
    setTimeout(() => {
      setAnimVisible(true); setAnimOffset('none')
      loopTimer.current = setTimeout(() => {
        setAnimVisible(false)
        loopTimer.current = setTimeout(startLoop, 1500)
      }, (currentAd.duration||5)*1000)
    }, 100)
  }
  const stopLoop = () => { clearTimeout(loopTimer.current); setAnimVisible(true); setAnimOffset('none') }

  /* ── Cloudinary Upload ── */
  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey    = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret || apiKey === 'your_api_key') {
      console.error("Cloudinary credentials missing or not configured in .env");
      return null;
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = `timestamp=${timestamp}${apiSecret}`;
    
    // Generate SHA-1 signature
    const msgUint8 = new TextEncoder().encode(params);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append("file", file);
    formData.append("timestamp", timestamp);
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        console.log("Cloudinary Upload Success:", data.secure_url);
        return data.secure_url;
      }
      console.error("Upload failed", data);
      return null;
    } catch (err) {
      console.error("Cloudinary upload error", err);
      return null;
    }
  };

  /* ── File uploads ── */
  const handleMediaFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    
    // Check if it's image or gif
    if (!file.type.startsWith('image/')) {
      toast.error("Only images and GIFs are allowed!");
      return;
    }

    const toastId = toast.loading("Uploading image...");
    const url = await uploadToCloudinary(file);
    if (url) {
      toast.success("Image uploaded successfully", { id: toastId });
      const img = new Image()
      img.onload = () => updateAd({ media: url, imgNaturalW: img.width, imgNaturalH: img.height })
      img.src = url
    } else {
      // Fallback to local preview if upload fails (optional)
      toast.error("Upload failed. Using local preview.", { id: toastId });
      const reader = new FileReader()
      reader.onload = ev => {
        const img = new Image()
        img.onload = () => updateAd({ media: ev.target.result, imgNaturalW: img.width, imgNaturalH: img.height })
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCanvasBgFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Only images and GIFs are allowed!");
      return;
    }

    const toastId = toast.loading("Uploading background...");
    const url = await uploadToCloudinary(file);
    if (url) {
      toast.success("Background uploaded successfully", { id: toastId });
      setCanvasBgImage(url);
    } else {
      toast.error("Upload failed. Using local preview.", { id: toastId });
      const reader = new FileReader()
      reader.onload = ev => setCanvasBgImage(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  /* ── Snap helper ── */
  const snap = (val, targets) => {
    for (const t of targets) {
      if (Math.abs(val - t) < SNAP_THRESHOLD) return { snapped: t, guide: t }
    }
    return { snapped: val, guide: null }
  }

  /* ── Drag: move + resize ── */
  const onMouseDown = (e, target, mode='move') => {
    e.stopPropagation(); e.preventDefault()
    setSelected(target)
    const scale = scalerRef.current.getBoundingClientRect().width / 1920
    const ad = ads[currentAdIdx]
    dragRef.current = {
      target, mode, scale,
      startX: e.clientX, startY: e.clientY,
      baseX: ad.layout[target]?.x || 0,
      baseY: ad.layout[target]?.y || 0,
      baseW: ad.layout.img.w,
      baseH: ad.layout.img.h || (ad.imgNaturalH && ad.imgNaturalW ? ad.layout.img.w * ad.imgNaturalH / ad.imgNaturalW : ad.layout.img.w),
      lockRatio: ad.imgLockRatio,
      natW: ad.imgNaturalW, natH: ad.imgNaturalH,
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }

  const onMouseMove = useCallback((e) => {
    const d = dragRef.current; if (!d) return
    const dx = (e.clientX - d.startX) / d.scale
    const dy = (e.clientY - d.startY) / d.scale
    const ad = ads[currentAdIdx]
    const banner = ad.layout.banner

    if (d.mode === 'move') {
      let nx = d.baseX + dx, ny = d.baseY + dy

      // Snap to banner edges and centre (in relative coords)
      const snapXTargets = [0, banner.w/2, banner.w]
      const snapYTargets = [0, banner.h/2, banner.h]
      const sx = snap(nx, snapXTargets)
      const sy = snap(ny, snapYTargets)
      nx = sx.snapped; ny = sy.snapped

      // Show guides in absolute coords for display
      setGuideV(sx.guide !== null ? banner.x + sx.guide : null)
      setGuideH(sy.guide !== null ? banner.y + sy.guide : null)

      // Clamp inside banner
      nx = Math.max(0, Math.min(nx, banner.w - 10))
      ny = Math.max(0, Math.min(ny, banner.h - 10))

      updateLayout({ [d.target]: { ...ad.layout[d.target], x: nx, y: ny } })
    }
    else if (d.mode === 'resize-se') {
      let nw = Math.max(20, d.baseW + dx)
      let nh = d.lockRatio && d.natW && d.natH ? nw * d.natH / d.natW : Math.max(20, d.baseH + dy)
      updateLayout({ img: { ...ad.layout.img, w: nw, h: nh } })
    }
    else if (d.mode === 'resize-sw') {
      let nw = Math.max(20, d.baseW - dx)
      let nh = d.lockRatio && d.natW && d.natH ? nw * d.natH / d.natW : Math.max(20, d.baseH + dy)
      const relX = ad.layout.img.x - (nw - d.baseW)
      updateLayout({ img: { ...ad.layout.img, x: relX, w: nw, h: nh } })
    }
    else if (d.mode === 'resize-ne') {
      let nw = Math.max(20, d.baseW + dx)
      let nh = d.lockRatio && d.natW && d.natH ? nw * d.natH / d.natW : Math.max(20, d.baseH - dy)
      const relY = ad.layout.img.y - (nh - d.baseH)
      updateLayout({ img: { ...ad.layout.img, y: relY, w: nw, h: nh } })
    }
    else if (d.mode === 'resize-nw') {
      let nw = Math.max(20, d.baseW - dx)
      let nh = d.lockRatio && d.natW && d.natH ? nw * d.natH / d.natW : Math.max(20, d.baseH - dy)
      const relX = ad.layout.img.x - (nw - d.baseW)
      const relY = ad.layout.img.y - (nh - d.baseH)
      updateLayout({ img: { ...ad.layout.img, x: relX, y: relY, w: nw, h: nh } })
    }
  }, [ads, currentAdIdx, updateLayout])

  const onMouseUp = useCallback(() => {
    dragRef.current = null
    setGuideV(null); setGuideH(null)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup',   onMouseUp)
  }, [onMouseMove])

  /* ── Z-order ── */
  const bringForward = (target) => {
    const z = currentAd.zOrder
    updateAd({ zOrder: { ...z, [target]: Math.max(z.img, z.text) + 1 } })
  }
  const sendBackward = (target) => {
    const z = currentAd.zOrder
    updateAd({ zOrder: { ...z, [target]: Math.min(z.img, z.text) - 1 } })
  }

  /* ── Banner style ── */
  const getBannerStyle = () => {
    const { banner } = currentAd.layout
    const r = parseInt(currentAd.bgColor.substr(1,2),16)
    const g = parseInt(currentAd.bgColor.substr(3,2),16)
    const b = parseInt(currentAd.bgColor.substr(5,2),16)
    return {
      position: 'absolute',
      left: banner.x, top: banner.y, width: banner.w, height: banner.h,
      backgroundColor: currentAd.type==='sticker' ? 'transparent' : `rgba(${r},${g},${b},${currentAd.bgOpacity})`,
      borderRadius: currentAd.bgRadius,
      boxShadow: currentAd.type==='sticker'||currentAd.bgOpacity===0 ? 'none' : '0 10px 30px rgba(0,0,0,0.25)',
      opacity: looping ? (animVisible?1:0) : 1,
      transform: looping ? animOffset : 'none',
      transition: looping ? `opacity ${currentAd.animSpeed}s ease, transform ${currentAd.animSpeed}s ease` : 'none',
      overflow: 'visible',
    }
  }

  const showText  = !['image','video','sticker'].includes(currentAd.type)
  const showMedia = currentAd.type !== 'text'
  const bounds    = getGridBounds(currentAd.gridSelection)

  /* ── Image dimensions ── */
  const imgH = currentAd.layout.img.h ||
    (currentAd.imgNaturalW && currentAd.imgNaturalH
      ? currentAd.layout.img.w * currentAd.imgNaturalH / currentAd.imgNaturalW
      : currentAd.layout.img.w * 0.6)

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */

  const AD_NAV_ITEMS = [
    { id: 'overview',  label: 'Overview',         icon: '⊞' },
    { id: 'campaigns', label: 'Campaign Editor', icon: '◈' },
    { id: 'billing',   label: 'Billing',          icon: '₹' },
    { id: 'settings',  label: 'Settings',         icon: '⚙' },
  ]

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [campaignListOpen, setCampaignListOpen] = useState(true)

  return (
    <div className="cm-page" onClick={() => setSelected(null)}>

      {/* ══ TOP NAV ══ */}
      <nav className="cm-topnav-main">
        <div className="cm-topnav-left">
          <button className="cm-hamburger" onClick={() => setSidebarOpen(v => !v)}>
            <span/><span/><span/>
          </button>
          <a href="/" className="cm-topnav-logo"><LogoIcon /> Overlays</a>
          <span className="cm-topnav-divider"/>
          <span className="cm-topnav-role">Agency Portal</span>
        </div>
        
      </nav>

      <div className="cm-body-wrap">

        {/* ══ SIDEBAR ══ */}
        <aside className={`cm-nav-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="cm-nav-sidebar-top">
            {AD_NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`cm-nav-item ${item.id === 'campaigns' ? 'active' : ''}`}
                onClick={() => {
                  if (item.id === 'overview') navigate(`/advertiser-dashboard/${userId}`)
                  else if (item.id === 'billing') navigate(`/advertiser-dashboard/${userId}?page=billing`)
                  else if (item.id === 'settings') navigate(`/advertiser-dashboard/${userId}?page=settings`)
                }}
              >
                <span className="cm-nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="cm-nav-label">{item.label}</span>}
              </button>
            ))}
          </div>
          <div className="cm-nav-sidebar-bottom">
            <button className="cm-nav-logout" onClick={() => logout()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {sidebarOpen && <span>Log out</span>}
            </button>
          </div>
        </aside>

        {/* ══ MAIN AREA ══ */}
        <div className="cm-main-area">

          {/* ── Campaign list panel (collapsible) ── */}
          <aside className={`cm-sidebar ${campaignListOpen ? '' : 'cm-sidebar-collapsed'}`} onClick={e=>e.stopPropagation()}>
            <div className="cm-sidebar-header">
              <div className="cm-sidebar-title">Campaigns</div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button className="cm-add-btn" onClick={initNew}>+</button>
                <button className="cm-collapse-btn" onClick={() => setCampaignListOpen(v => !v)} title={campaignListOpen ? 'Collapse' : 'Expand'}>
                  {campaignListOpen ? '‹' : '›'}
                </button>
              </div>
            </div>
            {campaignListOpen && (
              <div className="cm-campaign-list">
                {campaigns.length===0 && <div className="cm-empty-list">No campaigns yet.<br/>Click + to create one.</div>}
                {campaigns.map(c => (
                  <div key={c.campaign_id || c.id}
                    className={`cm-c-item ${activeCampaignId===(c.campaign_id || c.id)?'active':''}`}
                    onClick={()=>loadCampaign(c)}>
                    <div className="cm-c-info">
                      <span className="cm-c-name">{c.campaign_name || c.campaign_id || 'Untitled'}</span>
                      <span className="cm-c-sub">{c.campaign_id}</span>
                    </div>
                    <span className={`cm-c-status cm-status-${c.status || 'draft'}`}>{c.status || 'draft'}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ── Editor ── */}
          <div className="cm-editor" onClick={e=>e.stopPropagation()}>

            {/* Topbar */}
            <div className="cm-topbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="cm-topbar-title">{isEditing ? `Editing: ${campaignId}` : 'New Campaign'}</span>
              </div>
              <div className="cm-topbar-right">
                {isEditing && currentCampaignStatus === 'draft' && <button className="cm-btn-danger" onClick={deleteCampaign}>Delete</button>}
                {currentCampaignStatus === 'draft' && <button className="cm-btn-primary" onClick={handleSubmitClick}>Submit for review</button>}
              </div>
            </div>

        <div className="cm-workspace">

            {/* Settings */}
            <div className="cm-settings" style={{ position: 'relative' }}>
              {currentCampaignStatus !== 'draft' && (
                <div className="cm-readonly-overlay">
                  <span>This campaign is {currentCampaignStatus} and cannot be edited.</span>
                </div>
              )}

            {/* Ad tabs */}
            <div className="cm-field-label">Ad Variations</div>
            <div className="cm-ad-tabs">
              {ads.map((ad,i) => (
                <button key={i} className={`cm-ad-tab ${i===currentAdIdx?'active':''}`} onClick={()=>switchAd(i)}>
                  {ad.name}
                </button>
              ))}
              <button className="cm-add-ad-btn" onClick={addAd}>+</button>
            </div>

            <div className="cm-field">
              <label className="cm-field-label">Brand</label>
              <select className="cm-select" value={currentAd.brand} onChange={e=>updateAd({brand:e.target.value})} disabled={currentCampaignStatus !== 'draft'}>
                <option value="">Select a brand</option>
                {availableBrands.map(b => (
                  <option key={b.id} value={b.id}>{b.brand_name}</option>
                ))}
              </select>
            </div>

            <div className="cm-field">
              <label className="cm-field-label">Campaign ID</label>
              <input className="cm-input" placeholder="e.g. brand_summer_01"
                value={campaignId} onChange={e=>setCampaignId(e.target.value)} disabled={isEditing}/>
            </div>

            <div className="cm-field">
              <label className="cm-field-label">Name visible to streamer</label>
              <input className="cm-input" placeholder="e.g. Summer Campaign"
                value={currentAd.visibleName} onChange={e=>updateAd({visibleName:e.target.value})} disabled={currentCampaignStatus !== 'draft'}/>
            </div>

            <div className="cm-field">
              <label className="cm-field-label">Show duration (seconds)</label>
              <input className="cm-input" type="number" min="5" value={duration}
                onChange={e=>setDuration(Number(e.target.value))}/>
            </div>

            <div className="cm-divider"/>

            {/* Ad type */}
            <div className="cm-field">
              <label className="cm-field-label">Ad type</label>
              <div className="cm-type-grid">
                {AD_TYPES.map(t => (
                  <button key={t.id} className={`cm-type-card ${currentAd.type===t.id?'selected':''}`}
                    onClick={()=>updateAd({type:t.id})}>
                    <span className="cm-type-icon">{t.icon}</span>
                    <span className="cm-type-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text */}
            {showText && (
              <div className="cm-field">
                <label className="cm-field-label">Ad copy</label>
                <textarea className="cm-input cm-textarea" rows={3}
                  value={currentAd.text} onChange={e=>updateAd({text:e.target.value})}/>
                <div className="cm-font-row">
                  <input type="color" className="cm-color-pick" value={currentAd.fontColor}
                    onChange={e=>updateAd({fontColor:e.target.value})} title="Font colour"/>
                  <select className="cm-select" value={currentAd.fontFamily}
                    onChange={e=>updateAd({fontFamily:e.target.value})}>
                    {FONT_FAMILIES.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="cm-font-size-row">
                  <input type="range" min="10" max="120" className="cm-slider"
                    value={currentAd.fontSize} onChange={e=>updateAd({fontSize:Number(e.target.value)})}/>
                  <input type="number" className="cm-input cm-input-sm"
                    value={currentAd.fontSize} onChange={e=>updateAd({fontSize:Number(e.target.value)})}/>
                </div>
                <div className="cm-style-btns">
                  {[['bold','B'],['italic','I'],['underline','U'],['heading','H1']].map(([s,l]) => (
                    <button key={s} className={`cm-style-btn ${currentAd.styles[s]?'active':''}`}
                      onClick={()=>updateStyle(s)}>{l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Media */}
            {showMedia && (
              <div className="cm-field">
                <label className="cm-field-label">{currentAd.type==='video'?'Video URL':'Image URL'}</label>
                <input className="cm-input" placeholder="https://..."
                  value={currentAd.media} onChange={e=>updateAd({media:e.target.value})}/>
                <label className="cm-upload-btn">
                  ↑ Upload file
                  <input type="file" accept="image/png,image/jpeg,image/gif" style={{display:'none'}} onChange={handleMediaFile}/>
                </label>

                {/* Image transform controls */}
                {currentAd.type !== 'video' && currentAd.media && (
                  <div className="cm-transform-box">
                    <div className="cm-transform-title">Transform</div>

                    <div className="cm-transform-row">
                      <span className="cm-transform-label">Rotate</span>
                      <input type="range" min="-180" max="180" className="cm-slider"
                        value={currentAd.imgRotate||0}
                        onChange={e=>updateAd({imgRotate:Number(e.target.value)})}/>
                      <span className="cm-scale-val">{currentAd.imgRotate||0}°</span>
                      <button className="cm-transform-reset" onClick={()=>updateAd({imgRotate:0})}>↺</button>
                    </div>

                    <div className="cm-transform-row">
                      <span className="cm-transform-label">Width</span>
                      <input type="range" min="20" max="1920" className="cm-slider"
                        value={currentAd.layout.img.w}
                        onChange={e=>{
                          const nw=Number(e.target.value)
                          const nh=currentAd.imgLockRatio&&currentAd.imgNaturalW&&currentAd.imgNaturalH
                            ? nw*currentAd.imgNaturalH/currentAd.imgNaturalW : currentAd.layout.img.h
                          updateLayout({img:{...currentAd.layout.img,w:nw,h:nh}})
                        }}/>
                      <span className="cm-scale-val">{Math.round(currentAd.layout.img.w)}</span>
                    </div>

                    <label className="cm-lock-ratio">
                      <input type="checkbox" checked={currentAd.imgLockRatio}
                        onChange={e=>updateAd({imgLockRatio:e.target.checked})}/>
                      Lock aspect ratio
                    </label>

                    <div className="cm-transform-row" style={{marginTop:'0.5rem'}}>
                      <span className="cm-transform-label">Z-order</span>
                      <button className="cm-z-btn" onClick={()=>bringForward('img')} title="Bring image forward">↑ Front</button>
                      <button className="cm-z-btn" onClick={()=>sendBackward('img')} title="Send image back">↓ Back</button>
                    </div>

                    {showText && (
                      <div className="cm-transform-row">
                        <span className="cm-transform-label">Text z</span>
                        <button className="cm-z-btn" onClick={()=>bringForward('text')}>↑ Front</button>
                        <button className="cm-z-btn" onClick={()=>sendBackward('text')}>↓ Back</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Content zoom */}
            <div className="cm-field">
              <label className="cm-field-label">Content zoom</label>
              <div className="cm-font-size-row">
                <input type="range" min="0.5" max="3" step="0.1" className="cm-slider"
                  value={currentAd.contentScale}
                  onChange={e=>updateAd({contentScale:Number(e.target.value)})}/>
                <span className="cm-scale-val">{currentAd.contentScale}×</span>
              </div>
            </div>

            {/* Banner BG */}
            <div className="cm-field">
              <label className="cm-field-label">Banner background</label>
              <div className="cm-bg-row">
                <input type="color" className="cm-color-pick" value={currentAd.bgColor}
                  onChange={e=>updateAd({bgColor:e.target.value})}/>
                <span className="cm-bg-label">Colour</span>
                <input type="range" min="0" max="1" step="0.05" className="cm-slider"
                  value={currentAd.bgOpacity} onChange={e=>updateAd({bgOpacity:Number(e.target.value)})}/>
                <span className="cm-bg-label">Opacity</span>
              </div>
              <div className="cm-bg-row" style={{marginTop:'0.5rem'}}>
                <input type="range" min="0" max="50" className="cm-slider"
                  value={currentAd.bgRadius} onChange={e=>updateAd({bgRadius:Number(e.target.value)})}/>
                <span className="cm-bg-label">{currentAd.bgRadius}px radius</span>
              </div>
            </div>

            {/* Canvas BG */}
            <div className="cm-field">
              <label className="cm-field-label">Canvas background</label>
              <div className="cm-bg-row">
                <input type="color" className="cm-color-pick" value={canvasBgColor}
                  onChange={e=>{setCanvasBgColor(e.target.value); setCanvasBgImage('')}}/>
                <span className="cm-bg-label">Colour</span>
              </div>
              <div className="cm-canvas-bg-row">
                <label className="cm-upload-btn" style={{marginTop:'0.5rem'}}>
                  ↑ Upload stream BG
                  <input type="file" accept="image/png,image/jpeg,image/gif" style={{display:'none'}} onChange={handleCanvasBgFile}/>
                </label>
                {canvasBgImage && (
                  <button className="cm-clear-bg" onClick={()=>setCanvasBgImage('')}>✕ Remove</button>
                )}
              </div>
            </div>

            <div className="cm-divider"/>

            {/* Animation */}
            <div className="cm-field">
              <label className="cm-field-label">Entrance animation</label>
              <select className="cm-select" value={currentAd.animType}
                onChange={e=>updateAd({animType:e.target.value})}>
                {ANIM_TYPES.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="cm-field">
              <label className="cm-field-label">Animation speed (s)</label>
              <input className="cm-input" type="number" step="0.1" min="0.1"
                value={currentAd.animSpeed} onChange={e=>updateAd({animSpeed:Number(e.target.value)})}/>
            </div>

            <div className="cm-divider"/>

            <div className="cm-ad-actions">
              {currentCampaignStatus === 'draft' ? (
                <>
                  <button className="cm-btn-primary cm-btn-full" onClick={saveCampaign}>Save draft (local)</button>
                  <div className="cm-ad-action-row">
                    <button className="cm-btn-ghost cm-btn-flex" onClick={saveCampaign}>Save draft</button>
                    <button className="cm-btn-danger-sm" onClick={deleteAd}>Delete ad</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', padding: '1rem' }}>
                  This campaign is {currentCampaignStatus} and cannot be edited.
                </div>
              )}
            </div>

          </div>{/* end settings */}

          {/* ── Preview ── */}
          <div className="cm-preview-panel">

            <div className="cm-preview-controls">
              <label className="cm-preview-toggle">
                <input type="checkbox" checked={hideGrid} onChange={e=>setHideGrid(e.target.checked)}/>
                Hide grid & drag
              </label>
              <label className="cm-preview-toggle">
                <input type="checkbox" checked={looping} onChange={e=>setLooping(e.target.checked)}/>
                Loop animation
              </label>
              {selected && (
                <span className="cm-selected-indicator">
                  Selected: <strong>{selected}</strong>
                </span>
              )}
            </div>

            <div className="cm-sim-wrap" ref={simRef}>

              {/* Canvas background */}
              <div className="cm-sim-bg" style={{
                backgroundColor: canvasBgImage ? 'transparent' : canvasBgColor,
                backgroundImage: canvasBgImage ? `url(${canvasBgImage})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
              }}>
                {!canvasBgImage && (
                  <>
                    <div className="cm-yt-icon"><div className="cm-yt-tri"></div></div>
                    <div className="cm-yt-bar"><div className="cm-yt-prog"><div className="cm-yt-dot"></div></div></div>
                  </>
                )}
              </div>

              {/* Scaler */}
              <div className="cm-scaler" ref={scalerRef}>

                {/* Snap guides */}
                {guideV !== null && (
                  <div style={{position:'absolute',left:guideV,top:0,width:2,height:1080,
                    background:'#ff00ea',zIndex:9999,pointerEvents:'none'}}/>
                )}
                {guideH !== null && (
                  <div style={{position:'absolute',top:guideH,left:0,height:2,width:1920,
                    background:'#ff00ea',zIndex:9999,pointerEvents:'none'}}/>
                )}

                {/* 3×3 grid */}
                {!hideGrid && (
                  <div className="cm-grid-overlay">
                    {Array.from({length:9},(_,i) => (
                      <div key={i}
                        className={`cm-grid-cell ${currentAd.gridSelection.includes(i)?'selected':''}`}
                        onClick={()=>toggleGridCell(i)}/>
                    ))}
                  </div>
                )}

                {/* Banner */}
                <div id="cm-banner" style={getBannerStyle()}>

                  {/* Image */}
                  {showMedia && currentAd.media && (
                    <div
                      className={`cm-movable ${selected==='img'?'cm-selected':''}`}
                      style={{
                        position:'absolute',
                        left: Math.max(0, currentAd.layout.img.x),
                        top:  Math.max(0, currentAd.layout.img.y),
                        width: currentAd.layout.img.w,
                        height: imgH,
                        zIndex: currentAd.zOrder.img,
                        cursor: hideGrid ? 'grab' : 'default',
                        transform: `scale(${currentAd.contentScale}) rotate(${currentAd.imgRotate||0}deg)`,
                        transformOrigin: 'top left',
                        userSelect:'none',
                      }}
                      onMouseDown={hideGrid?(e)=>{ e.stopPropagation(); onMouseDown(e,'img','move') }:undefined}
                      onClick={e=>{ e.stopPropagation(); setSelected('img') }}
                    >
                      {currentAd.type==='video'
                        ? <video src={currentAd.media} autoPlay muted loop style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                        : <img src={currentAd.media} alt="" style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}}
                            onLoad={ev=>updateAd({imgNaturalW:ev.target.naturalWidth,imgNaturalH:ev.target.naturalHeight})}/>
                      }

                      {/* Resize handles — only when selected and hideGrid */}
                      {selected==='img' && hideGrid && (
                        <>
                          <div className="cm-handle cm-handle-se" onMouseDown={e=>{ e.stopPropagation(); onMouseDown(e,'img','resize-se') }}/>
                          <div className="cm-handle cm-handle-sw" onMouseDown={e=>{ e.stopPropagation(); onMouseDown(e,'img','resize-sw') }}/>
                          <div className="cm-handle cm-handle-ne" onMouseDown={e=>{ e.stopPropagation(); onMouseDown(e,'img','resize-ne') }}/>
                          <div className="cm-handle cm-handle-nw" onMouseDown={e=>{ e.stopPropagation(); onMouseDown(e,'img','resize-nw') }}/>
                        </>
                      )}
                    </div>
                  )}

                  {/* Text */}
                  {showText && (
                    <div
                      className={`cm-movable ${selected==='text'?'cm-selected':''}`}
                      style={{
                        position:'absolute',
                        left: Math.max(0, currentAd.layout.text.x),
                        top:  Math.max(0, currentAd.layout.text.y),
                        zIndex: currentAd.zOrder.text,
                        cursor: hideGrid ? 'grab' : 'default',
                        fontSize: currentAd.fontSize,
                        color: currentAd.fontColor,
                        fontFamily: currentAd.fontFamily,
                        fontWeight: currentAd.styles.bold||currentAd.styles.heading?'bold':'normal',
                        fontStyle: currentAd.styles.italic?'italic':'normal',
                        textDecoration: currentAd.styles.underline?'underline':'none',
                        textTransform: currentAd.styles.heading?'uppercase':'none',
                        whiteSpace:'nowrap', userSelect:'none',
                        padding:'8px 16px',
                        transform:`scale(${currentAd.contentScale})`,
                        transformOrigin:'top left',
                      }}
                      onMouseDown={hideGrid?(e)=>{ e.stopPropagation(); onMouseDown(e,'text','move') }:undefined}
                      onClick={e=>{ e.stopPropagation(); setSelected('text') }}
                    >
                      {currentAd.text || 'Ad text preview'}
                    </div>
                  )}
                </div>

                {/* Grid bounds dashed outline - always visible for reference */}
                <div style={{
                  position:'absolute', pointerEvents:'none',
                  left:bounds.x, top:bounds.y, width:bounds.w, height:bounds.h,
                  border: hideGrid ? '1px dashed rgba(59,91,255,0.2)' : '2px dashed rgba(59,91,255,0.4)', 
                  borderRadius:4,
                  transition: 'all 0.3s ease'
                }}/>

              </div>{/* end cm-scaler */}
            </div>{/* end cm-sim-wrap */}

            <div className="cm-preview-hint">
              {hideGrid
                ? '⟳ Click an element to select it, then drag to move or use corner handles to resize'
                : '⊞ Click grid cells to set placement zone · Uncheck "Hide grid" to enable editing'
              }
            </div>

          </div>{/* end cm-preview-panel */}
        </div>{/* end cm-workspace */}
      </div>{/* end cm-editor */}
      </div>{/* end cm-main-area */}
      </div>{/* end cm-body-wrap */}

      {showSubmitModal && (
        <SubmitCampaignModal
          ads={ads}
          campaignId={campaignId}
          brandId={parseInt(currentAd.brand || ads.find(a => a.brand)?.brand) || null}
          userId={userId}
          onConfirm={handleModalConfirm}
          onClose={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  )
}