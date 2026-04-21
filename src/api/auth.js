const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1000/api/v1'
const ADV_BASE = import.meta.env.VITE_ADVERTISER_API_BASE || 'http://localhost:8000'
const STREAMER_BASE = 'http://127.0.0.1:5000'

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
  window.location.href = `${STREAMER_BASE}/auth/login`
}

export async function fetchStreamerCallback(search) {
  try {
    const res = await fetch(`${STREAMER_BASE}/api/auth/callback${search}`, {
      credentials: 'include'
    })
    if (!res.ok) return null
    // If the backend returns a redirect, we might need to handle it or the browser handles it.
    // But the user said "get this data ... you get all data like id and all"
    // So we assume it returns JSON or we can get the data from it.
    // If it redirects, we might need to follow it or call /auth/status after.
    const body = await res.json()
    return body.user || body
  } catch {
    return null
  }
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

export async function getStreamerMe() {
  try {
    const res = await fetch(`${STREAMER_BASE}/auth/status`, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json()
    return body.user || body
  } catch {
    return null
  }
}

export async function fetchStreamerUser(userId) {
  try {
    const res = await fetch(`${STREAMER_BASE}/api/auth/user/${userId}`, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json()
    return body
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
    const res = await fetch(`${ADV_BASE}/auth/google/me/${userId}`, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json()
    return body.user || body
  } catch {
    return null
  }
}

export function loginWithGoogleAdvertiser() {
  window.location.href = `${ADV_BASE}/auth/google/login`
}

export async function logoutAdvertiser() {
  try {
    await fetch(`${ADV_BASE}/auth/google/logout`, { credentials: 'include' })
  } catch {}
  window.location.href = '/'
}