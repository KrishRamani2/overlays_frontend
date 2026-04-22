import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchStreamerCallback, fetchStreamerUser, saveStreamerSession } from '../api/auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleCallback = async () => {
      const data = await fetchStreamerCallback(location.search)
      if (data) {
        // Successfully got user data
        const userId = data.id || (data.user && (data.user.id || data.user.uid)) || data.uid
        
        // Fetch extended user data (preferences, playlist, etc)
        let fullData = data
        if (userId && userId !== 'undefined') {
          const fullUserData = await fetchStreamerUser(userId)
          fullData = fullUserData || data
        }

        // Persist session with 1-year expiry
        saveStreamerSession(fullData)

        navigate(`/streamer-dashboard/${userId}`, { replace: true })
      } else {
        // Failed to get user data
        navigate('/login/streamer?error=oauth_failed', { replace: true })
      }
    }

    handleCallback()
  }, [location, navigate])

  return (
    <div className="auth-callback-loading" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: '#0f172a',
      color: 'white',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div className="spinner" style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#3B5BFF',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '500' }}>Authenticating...</h2>
      <p style={{ color: '#94a3b8', marginTop: '8px' }}>Finalizing your secure session</p>
    </div>
  )
}
