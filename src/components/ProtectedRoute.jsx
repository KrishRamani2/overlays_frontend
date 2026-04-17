import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { getMe } from '../api/auth'

export default function ProtectedRoute({ allowedRole }) {
  const navigate = useNavigate()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    getMe().then(user => {
      if (!user) {
        navigate('/login/streamer', { replace: true })
        return
      }
      if (allowedRole && user.role !== allowedRole && user.role !== 'admin') {
        navigate('/', { replace: true })
        return
      }
      setAllowed(true)
    })
  }, [])

  if (!allowed) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#F7F8FC'
    }}>
      <div style={{
        width: 32, height: 32,
        border: '2px solid rgba(14,15,20,0.08)',
        borderTopColor: '#3B5BFF', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return <Outlet />
}