import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './Navbar.css'

const LogoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <rect x="2" y="2" width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="nav-logo">
        <LogoIcon />
        Overlays
      </Link>
      <ul className="nav-links">
        <li><a href="#how">How it works</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#faq">FAQ</a></li>
      </ul>
      <div className="nav-right">
        <Link to="/login/streamer" className="btn-ghost-nav">Log in</Link>
        <Link to="/login/streamer" className="btn-dark">Get started</Link>
      </div>
    </nav>
  )
}