const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1000/api/v1'

export async function apiFetch(path, options = {}) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }
    let res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })
    if (res.status === 401) {
      const refreshed = await tryRefresh()
      if (refreshed) {
        res = await fetch(`${BASE}${path}`, {
          ...options,
          headers,
          credentials: 'include',
        })
      } else {
        return null
      }
    }
    return res
  } catch {
    // Backend not running or network error — fail silently
    return null
  }
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    return res.ok
  } catch {
    return false
  }
}

export function loginWithGoogle(role = 'streamer') {
  window.location.href = `${BASE}/auth/login/google?role=${role}`
}

export async function getMe() {
  try {
    const res = await apiFetch('/auth/me')
    if (!res || !res.ok) return null
    const body = await res.json()
    return body.data || body
  } catch {
    return null
  }
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {}
  window.location.href = '/'
}

export async function getAdvertiserMe(userId) {
  try {
    const res = await fetch(`http://localhost:8000/auth/google/me/${userId}`, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json()
    return body.user || body
  } catch {
    return null
  }
}

export function loginWithGoogleAdvertiser() {
  window.location.href = 'http://localhost:8000/auth/google/login'
}

export async function logoutAdvertiser() {
  try {
    await fetch('http://localhost:8000/auth/google/logout', { credentials: 'include' })
  } catch {}
  window.location.href = '/'
}