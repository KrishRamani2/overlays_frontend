const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1000/api/v1'
const ADV_BASE = import.meta.env.VITE_ADVERTISER_API_BASE || 'http://localhost:8000'
const STREAMER_BASE = 'http://127.0.0.1:5000'

/* ── Session persistence helpers (1-year expiry) ── */

const SESSION_KEY = 'streamer_session'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Save streamer session to localStorage with a 1-year expiry.
 * @param {object} data – user data (may include user, preferences, playlist)
 */
export function saveStreamerSession(data) {
  const session = {
    data,
    expiresAt: Date.now() + ONE_YEAR_MS,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  // Also keep legacy keys for dashboard and quick-login
  localStorage.setItem('streamer_user', JSON.stringify(data))
  const u = data.user || data
  const uid = u.id || u.uid
  if (uid) localStorage.setItem('userId', uid)
}

/**
 * Get the saved streamer session. Returns null if missing or expired.
 */
export function getStreamerSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session.expiresAt || Date.now() > session.expiresAt) {
      clearStreamerSession()
      return null
    }
    return session.data
  } catch {
    return null
  }
}

/**
 * Clear all streamer session data (used on logout).
 */
export function clearStreamerSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('streamer_user')
  localStorage.removeItem('userId')
}

/**
 * Get the user ID from the saved session (if any).
 */
export function getSavedUserId() {
  const session = getStreamerSession()
  if (!session) return null
  const u = session.user || session
  return u.id || u.uid || null
}

/* ── API helpers ── */

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

export async function getStreamerMe(userId = null) {
  try {
    const url = userId 
      ? `${STREAMER_BASE}/api/v1/auth/me?user_id=${userId}`
      : `${STREAMER_BASE}/api/v1/auth/me`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json()
    return body
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

/**
 * Quick-login: re-authenticate a returning user by their ID
 * without requiring Google OAuth. Works only if the user already
 * exists in the backend database.
 */
export async function quickLogin(userId) {
  try {
    const res = await fetch(`${STREAMER_BASE}/api/auth/quick-login/${userId}`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const body = await res.json()
    if (body.authenticated) {
      // Persist the refreshed session for another year
      saveStreamerSession(body)
      return body
    }
    return null
  } catch {
    return null
  }
}

/**
 * Logout — calls streamer backend to clear server session, then wipes local data.
 */
export async function logout() {
  clearStreamerSession()
  window.location.href = `${STREAMER_BASE}/auth/logout`
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

export async function fetchTierBrands(tier) {
  try {
    const encodedTier = encodeURIComponent(tier)
    const url = `${ADV_BASE}/api/streamer/tiers/${encodedTier}/brands?sort_by=play_count&order=desc&include_ads=true`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function postApprovedAd(adData) {
  try {
    const res = await fetch(`${STREAMER_BASE}/api/streamer/approved-brand-ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adData),
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to post approved ad')
    return await res.json()
  } catch (err) {
    console.error(err)
    return null
  }
}