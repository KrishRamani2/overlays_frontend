import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getMe, loginWithGoogle } from '../api/auth'
import './StreamerLogin.css'

const LogoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

/* ── Role-card icon: Streamer (headset/mic) ── */
const StreamerIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="20" fill="#EEF1FF"/>
    <path d="M20 12a7 7 0 0 0-7 7v2a2 2 0 0 0 2 2h1v-4a4 4 0 1 1 8 0v4h1a2 2 0 0 0 2-2v-2a7 7 0 0 0-7-7z" stroke="#3B5BFF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 23v1a5 5 0 0 0 5 5v0a5 5 0 0 0 5-5v-1" stroke="#3B5BFF" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <circle cx="20" cy="28" r="1" fill="#3B5BFF"/>
  </svg>
)

/* ── Role-card icon: Brand (megaphone/rocket) ── */
const BrandIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="20" fill="#FFF4EE"/>
    <path d="M14 22l2-8h8l2 8" stroke="#FF6B35" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 22h16v2a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2v-2z" stroke="#FF6B35" strokeWidth="1.5" fill="none"/>
    <path d="M18 26v2M22 26v2" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="20" cy="17" r="2" stroke="#FF6B35" strokeWidth="1.5" fill="none"/>
  </svg>
)

const ERROR_MESSAGES = {
  wrong_role:   'This account is registered under a different role.',
  oauth_failed: 'Google sign-in failed. Please try again.',
  server_error: 'Something went wrong on our end. Please try again.',
}

export default function StreamerLogin() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [checking, setChecking] = useState(true)
  const [error,    setError]    = useState('')
  const [hovered,  setHovered]  = useState(null) // 'streamer' | 'brand' | null

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const err = params.get('error')
    if (err) setError(ERROR_MESSAGES[err] || 'Sign-in failed. Please try again.')

    getMe().then(user => {
      if (user && user.role === 'streamer') {
        const hasSetup = localStorage.getItem(`setup_done_${user.id}`)
        navigate(hasSetup ? '/streamer-dashboard' : '/setup/profile', { replace: true })
      } else if (user && user.role === 'advertiser') {
        navigate('/campaign-manager', { replace: true })
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) {
    return (
      <div className="sl-loading">
        <div className="sl-spinner-lg"></div>
      </div>
    )
  }

  return (
    <div className="sl-page">
      <div className="sl-arc"></div>
      <div className="sl-dots"></div>

      <a href="/" className="sl-logo">
        <LogoIcon />
        Overlays
      </a>

      {/* ── Header ── */}
      <div className="sl-header">
        <div className="sl-eyebrow">Choose your portal</div>
        <h1 className="sl-h1">
          Sign in or<br/><em>get started.</em>
        </h1>
        <p className="sl-sub">
          Select how you'd like to use Overlays — stream with personalized overlays or promote your brand to thousands of streamers.
        </p>
      </div>

      {/* ── Error ── */}
      {error && <div className="sl-error">{error}</div>}

      {/* ── Cards row ── */}
      <div className={`sl-cards-row ${hovered ? 'sl-cards-row--active' : ''}`}>

        {/* Streamer card */}
        <div
          className={`sl-role-card ${hovered === 'streamer' ? 'sl-role-card--hovered' : ''} ${hovered === 'brand' ? 'sl-role-card--dimmed' : ''}`}
          onMouseEnter={() => setHovered('streamer')}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="sl-role-icon"><StreamerIcon /></div>
          <div className="sl-role-tag sl-role-tag--streamer">Streamer</div>
          <h2 className="sl-role-title">I create content</h2>
          <p className="sl-role-desc">
            Manage your dashboard, customize overlays, and grow your audience with powerful tools.
          </p>
          <button className="sl-google-btn" onClick={() => loginWithGoogle('streamer')}>
            <GoogleIcon />
            Continue with Google
          </button>
          <span className="sl-role-note">New accounts auto-created on first sign-in</span>
        </div>

        {/* Brand card */}
        <div
          className={`sl-role-card ${hovered === 'brand' ? 'sl-role-card--hovered' : ''} ${hovered === 'streamer' ? 'sl-role-card--dimmed' : ''}`}
          onMouseEnter={() => setHovered('brand')}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="sl-role-icon"><BrandIcon /></div>
          <div className="sl-role-tag sl-role-tag--brand">Brand</div>
          <h2 className="sl-role-title">I run campaigns</h2>
          <p className="sl-role-desc">
            Launch campaigns, target streamers, and track real-time performance analytics.
          </p>
          <button className="sl-google-btn sl-google-btn--brand" onClick={() => loginWithGoogle('advertiser')}>
            <GoogleIcon />
            Continue with Google
          </button>
          <span className="sl-role-note">New accounts auto-created on first sign-in</span>
        </div>
      </div>

      <p className="sl-footer-note">
        By continuing you agree to our{' '}
        <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
      </p>
    </div>
  )
}