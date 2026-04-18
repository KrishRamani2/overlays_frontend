import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getMe, loginWithGoogleAdvertiser } from '../api/auth'
import './AdvertiserLogin.css'

const ADV_BASE = import.meta.env.VITE_ADVERTISER_API_BASE || 'http://localhost:8000'

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

const ERROR_MESSAGES = {
  wrong_role:   'This Google account is registered as a streamer. Use the streamer login instead.',
  oauth_failed: 'Google sign-in failed. Please try again.',
  server_error: 'Something went wrong on our end. Please try again.',
}

export default function AdvertiserLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const err = params.get('error')
    if (err) setError(ERROR_MESSAGES[err] || 'Sign-in failed. Please try again.')

    getMe().then(async user => {
      if (user && user.role === 'advertiser') {
        const id = user.id || user._id || 'demo-id';
        try {
          const res = await fetch(`${ADV_BASE}/api/accounts/${id}`, { credentials: 'include' });
          const data = res.ok ? await res.json() : null;
          const needsSetup = !data || !data.company_type || data.company_type === 'advertiser';

          if (needsSetup) {
            // Sync Google profile data before setup
            await fetch(`${ADV_BASE}/api/accounts/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                name: user.name,
                picture: user.picture,
                email: user.email
              })
            }).catch(e => console.error("Failed to sync profile", e));
            
            navigate(`/setup/advertiser/${id}`, { replace: true });
          } else {
            navigate(`/advertiser-dashboard/${id}?type=${data.company_type}`, { replace: true });
          }
          return;
        } catch (err) {
          console.error("Failed to check existing account data", err);
          navigate(`/setup/advertiser/${id}`, { replace: true });
          return;
        }
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) return (
    <div className="al-loading">
      <div className="al-spinner"></div>
    </div>
  )

  return (
    <div className="al-page">
      <div className="al-arc"></div>
      <div className="al-dots"></div>

      <a href="/" className="al-logo"><LogoIcon /> Overlays</a>

      <div className="al-card">
        <div className="al-card-top">
          <div className="al-eyebrow">Brand Portal</div>
          <h1 className="al-h1">
            Reach streamers<br/><em>that convert.</em>
          </h1>
          <p className="al-sub">
            Sign in to manage your campaigns, set targeting preferences,
            and track real-time performance across thousands of streams.
          </p>
        </div>

        <div className="al-divider"></div>

        {error && <div className="al-error">{error}</div>}

        <button className="al-google-btn" onClick={() => loginWithGoogleAdvertiser()}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="al-or-row">
          <span className="al-or-line"></span>
          <span className="al-or-text">new here? we'll set up your brand account</span>
          <span className="al-or-line"></span>
        </div>

        <p className="al-hint">
          Are you a streamer?{' '}
          <a href="/login/streamer">Sign in here →</a>
        </p>
      </div>

      <p className="al-footer-note">
        By continuing you agree to our{' '}
        <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
      </p>
    </div>
  )
}