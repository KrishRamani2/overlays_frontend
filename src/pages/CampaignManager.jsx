import { useState, useRef, useEffect, useCallback } from 'react'
import { getBrands, addCampaign } from '../assets/overlaysStore'
import { useNavigate } from 'react-router-dom'
import SubmitCampaignModal from './SubmitCampaignModal'
import './SubmitCampaignModal.css'
import { logout } from '../api/auth'
import './CampaignManager.css'

const LogoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

const brands = getBrands()

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
  /* ── Campaign state ── */
  const [campaigns,        setCampaigns]       = useState([])
  const [activeCampaignId, setActiveCampaignId]= useState(null)
  const [campaignId,       setCampaignId]      = useState('')
  const [duration,         setDuration]        = useState(10)
  const [isEditing,        setIsEditing]       = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  /* ── Ad variations ── */
  const [ads,          setAds]         = useState([defaultAd(0)])
  const [currentAdIdx, setCurrentAdIdx]= useState(0)

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
    let next = cur.includes(idx) ? cur.filter(i=>i!==idx) : [...cur,idx]
    if (!next.length || !isContiguous(next)) return
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
  const saveCampaign = () => {
    if (!campaignId.trim()) { alert('Campaign ID is required'); return }
    // Just save locally — don't submit yet
    const payload = { id: campaignId, duration, ads, status: 'pending', savedAt: new Date().toISOString() }
    setCampaigns(prev => {
      const i = prev.findIndex(c => c.id === campaignId)
      if (i >= 0) { const n = [...prev]; n[i] = payload; return n }
      return [...prev, payload]
      })
    setActiveCampaignId(campaignId); setIsEditing(true)
    }

  const handleSubmitClick = () => {
    if (!campaignId.trim()) { alert('Campaign ID is required'); return }
    saveCampaign()           // save first, then open modal
    setShowSubmitModal(true)
  }

  const handleModalConfirm = ({ tier, exclusive, daysLive, budgetMin, budgetMax }) => {
    const brandId = currentAd.brand  // ← this is where brand from the select is read
    addCampaign({
      id:        campaignId,
      brandId,
      name:      currentAd.visibleName || campaignId,
      budgetMin,
      budgetMax,
      tier,
      exclusive,
      daysLive,
      ads,
    })
    setShowSubmitModal(false)
    alert(`✓ ${ads.length} variant${ads.length !== 1 ? 's' : ''} submitted for review!`)
  }


  const loadCampaign = (c) => {
    setCampaignId(c.id); setDuration(c.duration); setAds(c.ads)
    setCurrentAdIdx(0); setIsEditing(true); setActiveCampaignId(c.id); setSelected(null)
  }
  const deleteCampaign = () => {
    if (!window.confirm('Delete this campaign?')) return
    setCampaigns(prev=>prev.filter(c=>c.id!==campaignId)); initNew()
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

  /* ── File uploads ── */
  const handleMediaFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (file.type.startsWith('image')) {
        const img = new Image()
        img.onload = () => updateAd({ media: ev.target.result, imgNaturalW: img.width, imgNaturalH: img.height })
        img.src = ev.target.result
      } else {
        updateAd({ media: ev.target.result })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCanvasBgFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCanvasBgImage(ev.target.result)
    reader.readAsDataURL(file)
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
  return (
    <div className="cm-page" onClick={() => setSelected(null)}>

      {/* ── Sidebar ── */}
      <aside className="cm-sidebar" onClick={e=>e.stopPropagation()}>
        <div className="cm-sidebar-header">
          <a href="/" className="cm-sidebar-logo"><LogoIcon /> Overlays</a>
          <div className="cm-sidebar-title">Campaigns</div>
          <button className="cm-add-btn" onClick={initNew}>+</button>
        </div>
        <div className="cm-campaign-list">
          {campaigns.length===0 && <div className="cm-empty-list">No campaigns yet.<br/>Click + to create one.</div>}
          {campaigns.map(c => (
            <div key={c.id}
              className={`cm-c-item ${activeCampaignId===c.id?'active':''}`}
              onClick={()=>loadCampaign(c)}>
              <span className="cm-c-name">{c.id}</span>
              <span className={`cm-c-status cm-status-${c.status}`}>{c.status}</span>
            </div>
          ))}
        </div>
        <div className="cm-sidebar-footer">
          <button className="cm-logout-btn" onClick={()=>logout()}>Log out</button>
        </div>
      </aside>

      {/* ── Editor ── */}
      <div className="cm-editor" onClick={e=>e.stopPropagation()}>

        {/* Topbar */}
        <div className="cm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/advertiser-dashboard')}
              style={{
                background: 'none', border: '1.5px solid #e2e8f0',
                borderRadius: '100px', padding: '0.35rem 0.9rem',
                fontSize: '0.82rem', color: '#64748b',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = '#3B5BFF'; e.target.style.color = '#3B5BFF' }}
              onMouseLeave={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.color = '#64748b' }}
            >
              ← Dashboard
            </button>
            <span className="cm-topbar-title">{isEditing ? `Editing: ${campaignId}` : 'New Campaign'}</span>
          </div>
          <div className="cm-topbar-right">
            {isEditing && <button className="cm-btn-danger" onClick={deleteCampaign}>Delete</button>}
            <button className="cm-btn-primary" onClick={handleSubmitClick}>Submit for review</button>
          </div>
        </div>

        <div className="cm-workspace">

          {/* ── Settings ── */}
          <div className="cm-settings">

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
              <label className="cm-field-label">Campaign ID</label>
              <input className="cm-input" placeholder="e.g. brand_summer_01"
                value={campaignId} onChange={e=>setCampaignId(e.target.value)} disabled={isEditing}/>
            </div>

            <div className="cm-field">
              <label className="cm-field-label">Name visible to streamer</label>
              <input className="cm-input" placeholder="e.g. Summer Campaign"
                value={currentAd.visibleName} onChange={e=>updateAd({visibleName:e.target.value})}/>
            </div>

            <div className="cm-field">
              <label className="cm-field-label">Brand</label>
              <select className="cm-select" value={currentAd.brand} onChange={e=>updateAd({brand:e.target.value})}>
                <option value="">Select a brand</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
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
                  <input type="file" accept="image/*,video/*" style={{display:'none'}} onChange={handleMediaFile}/>
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
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={handleCanvasBgFile}/>
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
              <button className="cm-btn-primary cm-btn-full" onClick={saveCampaign}>Save ad</button>
              <div className="cm-ad-action-row">
                <button className="cm-btn-ghost cm-btn-flex" onClick={saveCampaign}>Submit ad only</button>
                <button className="cm-btn-danger-sm" onClick={deleteAd}>Delete ad</button>
              </div>
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

                {/* Grid bounds dashed outline */}
                {!hideGrid && (
                  <div style={{
                    position:'absolute', pointerEvents:'none',
                    left:bounds.x, top:bounds.y, width:bounds.w, height:bounds.h,
                    border:'2px dashed rgba(59,91,255,0.35)', borderRadius:4,
                  }}/>
                )}

              </div>
            </div>

            <div className="cm-preview-hint">
              {hideGrid
                ? '⟳ Click an element to select it, then drag to move or use corner handles to resize'
                : '⊞ Click grid cells to set placement zone · Uncheck "Hide grid" to enable editing'
              }
            </div>

          </div>
        </div>
      </div>
      {showSubmitModal && (
      <SubmitCampaignModal
        ads={ads}
        campaignId={campaignId}
        brandName={getBrands().find(b => b.id === currentAd.brand)?.name}
        onConfirm={handleModalConfirm}
        onClose={() => setShowSubmitModal(false)}
      />
    )}
    </div>
  )
}