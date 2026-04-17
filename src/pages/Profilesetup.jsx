import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getMe } from '../api/auth'
import './ProfileSetup.css'

const LogoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

const CONTENT_CATEGORIES = [
  'Gaming', 'Tech', 'Lifestyle', 'Music', 'Sports',
  'Education', 'Food', 'Travel', 'Finance', 'Art & Design',
  'Fitness', 'Entertainment',
]

const BLOCKED_CATEGORIES = [
  'Alcohol', 'Gambling', 'Tobacco', 'Adult Content',
  'Political Ads', 'Crypto', 'Fast Food', 'Energy Drinks',
]

export default function ProfileSetup() {
  const navigate = useNavigate()
  const fileRef  = useRef()

  const [step,          setStep]         = useState(1)
  const [loading,       setLoading]      = useState(false)
  const [error,         setError]        = useState('')
  const [user,          setUser]         = useState(null)

  // Step 1 — Profile (local only until backend adds route)
  const [username,      setUsername]     = useState('')
  const [avatarFile,    setAvatarFile]   = useState(null)
  const [avatarPreview, setAvatarPreview]= useState('')

  // Step 2 — Channel (local only until backend adds route)
  const [channelUrl,    setChannelUrl]   = useState('')

  // Step 3 — Preferences (saved to backend via PUT /streamers/preferences)
  const [categories,    setCategories]   = useState([])
  const [blockedBrands, setBlockedBrands]= useState([])

  useEffect(() => {
    getMe().then(u => {
      if (!u) { navigate('/login/streamer'); return }
      setUser(u)
      setUsername(u.name?.split(' ')[0]?.toLowerCase().replace(/\s/g, '') || '')
      setAvatarPreview(u.picture || u.avatar || '')
    })
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const toggleCategory = (cat) =>
    setCategories(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat])

  const toggleBrand = (brand) =>
    setBlockedBrands(p => p.includes(brand) ? p.filter(b => b !== brand) : [...p, brand])

  const nextStep = () => {
    setError('')
    if (step === 1) {
      if (!username.trim()) { setError('Username is required.'); return }
      if (username.length < 3) { setError('Username must be at least 3 characters.'); return }
      if (!/^[a-z0-9_]+$/.test(username)) {
        setError('Username can only contain lowercase letters, numbers and underscores.')
        return
      }
    }
    if (step === 2 && channelUrl) {
      if (!channelUrl.includes('youtube.com') && !channelUrl.includes('youtu.be')) {
        setError('Please enter a valid YouTube channel URL.')
        return
      }
    }
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
  setLoading(true)
  setError('')
  try {
    // Save all locally until backend adds content categories endpoint
    if (user) {
      localStorage.setItem(`profile_${user.id}`, JSON.stringify({
        username,
        channelUrl,
        categories,
        blockedBrands,
        avatarPreview: avatarFile ? avatarPreview : (user.picture || user.avatar || ''),
      }))
      localStorage.setItem(`setup_done_${user.id}`, 'true')
    }
    navigate('/streamer-dashboard', { replace: true })
  } catch {
    setError('Something went wrong. Please try again.')
    setLoading(false)
  }
}

  const handleSkipToEnd = async () => {
  if (user) localStorage.setItem(`setup_done_${user.id}`, 'true')
  navigate('/streamer-dashboard', { replace: true })
}

  const progress = (step / 3) * 100

  return (
    <div className="ps-page">
      <div className="ps-arc"></div>
      <div className="ps-dots"></div>

      <a href="/" className="ps-logo"><LogoIcon /> Overlays</a>

      <div className="ps-card">

        {/* Progress */}
        <div className="ps-progress-wrap">
          <div className="ps-progress-bar">
            <div className="ps-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="ps-progress-label">Step {step} of 3</span>
        </div>

        {/* ── STEP 1: Profile ── */}
        {step === 1 && (
          <div className="ps-step">
            <div className="ps-eyebrow">Profile</div>
            <h1 className="ps-h1">Set up your<br/><em>identity.</em></h1>
            <p className="ps-sub">This is how brands and viewers will know you.</p>
            <div className="ps-divider"></div>

            {/* Avatar */}
            <div className="ps-avatar-wrap">
              <div className="ps-avatar" onClick={() => fileRef.current.click()}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="ps-avatar-img"/>
                  : <div className="ps-avatar-placeholder"><span>+</span></div>
                }
                <div className="ps-avatar-overlay">Change</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*"
                style={{display:'none'}} onChange={handleAvatarChange}/>
              <div className="ps-avatar-hint">
                {avatarPreview ? 'Click to change photo' : 'Upload a photo'}
                <br/>
                <span>Using your Google photo by default</span>
              </div>
            </div>

            {/* Username */}
            <div className="ps-field">
              <label className="ps-label">Username</label>
              <div className="ps-input-wrap">
                <span className="ps-input-prefix">overlays.gg/</span>
                <input
                  className="ps-input ps-input-with-prefix"
                  placeholder="yourname"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))}
                />
              </div>
              <p className="ps-field-hint">Lowercase letters, numbers and underscores only.</p>
            </div>

            <div className="ps-pending-note">
              ✦ Username and avatar will sync to your profile once the backend adds support for it.
            </div>
          </div>
        )}

        {/* ── STEP 2: Channel ── */}
        {step === 2 && (
          <div className="ps-step">
            <div className="ps-eyebrow">Channel</div>
            <h1 className="ps-h1">Link your<br/><em>YouTube channel.</em></h1>
            <p className="ps-sub">So we can verify your content and match you with the right brands.</p>
            <div className="ps-divider"></div>

            <div className="ps-field">
              <label className="ps-label">
                YouTube Channel URL{' '}
                <span className="ps-optional">(optional — add later)</span>
              </label>
              <div className="ps-input-wrap">
                <span className="ps-input-prefix">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect width="14" height="14" rx="3" fill="#FF0000"/>
                    <path d="M5.5 4.5L9.5 7L5.5 9.5V4.5Z" fill="white"/>
                  </svg>
                </span>
                <input
                  className="ps-input ps-input-with-prefix"
                  placeholder="https://youtube.com/@yourchannel"
                  value={channelUrl}
                  onChange={e => setChannelUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="ps-channel-note">
              <div className="ps-note-icon">ℹ️</div>
              <p>We only support YouTube right now. More platforms coming soon.</p>
            </div>

            <div className="ps-pending-note">
              ✦ Channel URL will sync to your profile once the backend adds support for it.
            </div>
          </div>
        )}

        {/* ── STEP 3: Preferences ── */}
        {step === 3 && (
          <div className="ps-step">
            <div className="ps-eyebrow">Preferences</div>
            <h1 className="ps-h1">Customise your<br/><em>ad experience.</em></h1>
            <p className="ps-sub">Tell us what fits your channel so we only show relevant ads.</p>
            <div className="ps-divider"></div>

            <div className="ps-field">
              <label className="ps-label">
                Content categories{' '}
                <span className="ps-optional">(select all that apply)</span>
              </label>
              <div className="ps-chips">
                {CONTENT_CATEGORIES.map(cat => (
                  <button key={cat} type="button"
                    className={`ps-chip ${categories.includes(cat) ? 'selected' : ''}`}
                    onClick={() => toggleCategory(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="ps-field" style={{marginTop:'1.5rem'}}>
              <label className="ps-label">
                Block these ad categories{' '}
                <span className="ps-optional">(ads you never want to show)</span>
              </label>
              <div className="ps-chips">
                {BLOCKED_CATEGORIES.map(brand => (
                  <button key={brand} type="button"
                    className={`ps-chip ps-chip-block ${blockedBrands.includes(brand) ? 'selected' : ''}`}
                    onClick={() => toggleBrand(brand)}>
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="ps-error">{error}</div>}

        {/* Actions */}
        <div className="ps-actions">
          {step > 1 && (
            <button className="ps-btn-back"
              onClick={() => { setStep(s => s - 1); setError('') }}>
              ← Back
            </button>
          )}
          {step < 3 && (
            <button className="ps-btn" onClick={nextStep}>
              Continue →
            </button>
          )}
          {step === 3 && (
            <button className="ps-btn" onClick={handleSubmit} disabled={loading}>
              {loading
                ? <span className="ps-spinner"></span>
                : 'Go to my dashboard →'
              }
            </button>
          )}
        </div>

        {/* Skip */}
        {step > 1 && (
          <button className="ps-skip" onClick={() => {
            if (step < 3) { setStep(s => s + 1); return }
            handleSkipToEnd()
          }}>
            Skip for now
          </button>
        )}

      </div>
    </div>
  )
}