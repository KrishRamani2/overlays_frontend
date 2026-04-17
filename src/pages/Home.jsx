import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/auth'
import Navbar from '../components/Navbar'
import './Home.css'

// ── Scroll reveal ────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold: 0.08 }
    )
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function usePostLoginRedirect() {
  const navigate = useNavigate()
  const checked  = useRef(false)
  useEffect(() => {
    if (checked.current) return
    checked.current = true
    getMe().then(user => {
      if (!user) return
      if (user.role === 'streamer') {
        const hasSetup = localStorage.getItem(`setup_done_${user.id}`)
        navigate(hasSetup ? '/streamer-dashboard' : '/setup/profile', { replace: true })
      } else if (user.role === 'advertiser') {
        const id = user.id || user._id || 'demo-id';
        navigate(`/setup/advertiser/${id}`, { replace: true })
      } else if (user.role === 'admin') {
        navigate('/admin/control', { replace: true })
      }
    })
  }, [])
}

// ── Logo ─────────────────────────────────────────────────
const LogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
)

// ── Stream window mock ────────────────────────────────────
function StreamMock() {
  return (
    <div className="hero-stream-mock">
      <div className="stream-window">
        <div className="stream-chrome">
          <div className="stream-dots">
            <div className="stream-dot" style={{background:'#FF5F57'}}/>
            <div className="stream-dot" style={{background:'#FFBD2E'}}/>
            <div className="stream-dot" style={{background:'#28CA42'}}/>
          </div>
          <div className="stream-url">obs-studio · scene: Gaming</div>
        </div>
        <div className="stream-body">
          <div className="stream-game-bg"/>
          <div className="stream-stars"/>
          <div className="stream-horizon"/>
          <div className="stream-scanline"/>
          <div className="stream-live-badge"><div className="live-dot"/> LIVE</div>
          <div className="stream-viewers">👁 4.2K</div>
          <div className="stream-ad-overlay">
            <div className="ad-overlay-logo">N</div>
            <div className="ad-overlay-text">
              <div className="ad-overlay-brand">NovaBrands</div>
              <div className="ad-overlay-sub">Summer Sale · 40% off</div>
            </div>
            <div className="ad-overlay-cta">Shop →</div>
          </div>
        </div>
        <div className="stream-info-bar">
          <div className="stream-name">TechWithRaj</div>
          <div className="stream-earnings">↑ ₹284 earned today</div>
        </div>
      </div>
    </div>
  )
}

// ── Brand dashboard mock ──────────────────────────────────
function BrandMock() {
  return (
    <div className="hero-brand-mock">
      <div className="brand-dash">
        <div className="brand-dash-top">
          <div className="brand-dash-title">NovaBrands · Campaign Overview</div>
          <div className="brand-live-chip">● 7 live</div>
        </div>
        <div className="brand-dash-body">
          <div className="brand-mini-stats">
            {[['₹1.2L','Spent'],['47','Streams'],['2.1M','Reach']].map(([v,l]) => (
              <div className="bms" key={l}>
                <div className="bms-val">{v}</div>
                <div className="bms-label">{l}</div>
              </div>
            ))}
          </div>
          <div className="brand-chart-area">
            <div className="brand-chart-label">Monthly spend</div>
            <div className="brand-bars">
              {[30,45,38,62,55,80,68,90,72,100].map((h,i) => (
                <div key={i} className={`brand-bar ${h > 65 ? 'hi' : ''}`} style={{height:`${h}%`}}/>
              ))}
            </div>
          </div>
          <div className="brand-streamer-list">
            {[
              { name:'TechWithRaj', spend:'₹12.4K', color:'#BFDBFE', c:'#1D4ED8', badge:'live' },
              { name:'GamersZone',  spend:'₹9.8K',  color:'#DDD6FE', c:'#5B21B6', badge:'live' },
              { name:'PxlRacer',    spend:'₹7.2K',  color:'#FED7AA', c:'#92400E', badge:'live' },
            ].map(s => (
              <div className="brand-streamer-row" key={s.name}>
                <div className="bsr-av" style={{background:s.color, color:s.c}}>{s.name[0]}</div>
                <div className="bsr-name">{s.name}</div>
                <div className="bsr-spend">{s.spend}</div>
                <div className="bsr-badge">{s.badge}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────
function Hero() {
  return (
    <div className="hero">
      <div className="hero-blob"/>
      <div className="hero-dots"/>

      <StreamMock />
      <BrandMock />

      <div className="hero-inner">
        <div className="hero-eyebrow">Streams · Ads · Earnings</div>

        <h1 className="hero-h1">
          Your stream.<br/>
          Their <em className="accent">ad budget.</em><br/>
          <span className="light">Your earnings.</span>
        </h1>

        <p className="hero-sub">
          Overlays drops native brand ads directly into your stream —
          matched automatically, shown in real time, paid every Friday.
          No cold emails. No contracts. No friction.
        </p>

        <div className="hero-cta-row">
          <a href="#" className="btn-hero-primary">Start earning free →</a>
          <a href="#" className="btn-hero-ghost">Run a campaign</a>
        </div>

        <div className="hero-roles">
          <span style={{color:'#94a3b8'}}>Built for</span>
          <div className="hero-role-badge">
            <div className="hrb-dot" style={{background:'#7C3AED'}}/>
            Streamers
          </div>
          <div className="hero-role-badge">
            <div className="hrb-dot" style={{background:'#3B5BFF'}}/>
            Brands & Agencies
          </div>
        </div>
      </div>

      {/* Scrolling ticker */}
      <div className="hero-ticker">
        <div className="ticker-track">
          {[...Array(2)].map((_, rep) => (
            <span key={rep} style={{display:'inline-flex', gap:'3rem'}}>
              {[
                ['₹4.2M','paid to streamers'],
                ['150K+','active streamers'],
                ['500+','brand partners'],
                ['92%','campaign retention'],
                ['5 min','to go live'],
                ['Every Friday','payout day'],
                ['Tier 1–5','streamer matching'],
                ['Real-time','impression tracking'],
              ].map(([hl, txt]) => (
                <span className="ticker-item" key={hl+rep}>
                  <span className="ticker-dot"/>
                  <span className="ticker-hl">{hl}</span>
                  <span>{txt}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────
function Stats() {
  const items = [
    { num: '150', suffix: 'K+', label: 'Active streamers' },
    { num: '500', suffix: '+',  label: 'Brand partners'   },
    { num: '₹4.2', suffix: 'M', label: 'Paid to creators' },
    { num: '92',   suffix: '%', label: 'Campaign retention'},
  ]
  return (
    <div className="stats-row">
      {items.map((s, i) => (
        <div className={`stat-cell reveal d${i}`} key={i}>
          <div className="stat-num">{s.num}<span>{s.suffix}</span></div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Two sides ─────────────────────────────────────────────
function TwoSides() {
  return (
    <div className="two-sides">
      <div className="two-sides-inner">

        {/* Streamers */}
        <div className="side-panel">
          <div className="side-panel-tag tag-streamer reveal">For Streamers</div>
          <h3 className="side-h3 reveal d1">Stream more.<br/><em>Earn automatically.</em></h3>
          <p className="side-p reveal d2">
            Drop one URL into OBS and our system handles everything else —
            matching you with brands, rendering the overlay, tracking impressions,
            and depositing your earnings every Friday.
          </p>
          <div className="side-steps reveal d2">
            {[
              { n:'01', title:'Connect your channel', body:'Link your YouTube. One browser source URL into OBS and you\'re live.' },
              { n:'02', title:'We find the brands',   body:'Our system matches you to campaigns that fit your content and audience.' },
              { n:'03', title:'Collect every Friday', body:'Your balance updates in real time. Money hits your account weekly, no minimum.' },
            ].map(s => (
              <div className="side-step" key={s.n}>
                <div className="side-step-n">{s.n}</div>
                <div className="side-step-body"><h4>{s.title}</h4><p>{s.body}</p></div>
              </div>
            ))}
          </div>
          <a href="#" className="btn-side btn-side-streamer reveal d3">Join as a streamer →</a>

          {/* OBS mock */}
          <div className="obs-mock reveal d3" style={{marginTop:'2rem'}}>
            <div className="obs-bar">
              <div className="obs-title">OBS Studio — Scene Collection</div>
              <div className="obs-controls">
                {['#FF5F57','#FFBD2E','#28CA42'].map(c => (
                  <div key={c} className="obs-ctrl" style={{background:c}}/>
                ))}
              </div>
            </div>
            <div className="obs-body">
              <div className="obs-preview">
                <div className="obs-preview-bg"/>
                <div className="obs-preview-stars"/>
                <div className="obs-overlay-badge" style={{position:'relative',zIndex:2}}>
                  <div className="obs-overlay-dot"/> Overlays Ad · Active
                </div>
              </div>
              <div className="obs-panel">
                <div className="obs-panel-title">Sources</div>
                {[
                  { color:'#10B981', name:'Game Capture' },
                  { color:'#3B5BFF', name:'Overlays URL' },
                  { color:'#F59E0B', name:'Webcam' },
                  { color:'#64748b', name:'Mic Input' },
                ].map(s => (
                  <div className="obs-source" key={s.name}>
                    <div className="obs-source-dot" style={{background:s.color}}/>
                    <div className="obs-source-name">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Brands */}
        <div className="side-panel">
          <div className="side-panel-tag tag-brand reveal">For Brands & Agencies</div>
          <h3 className="side-h3 reveal d1">Place ads where<br/><em>audiences actually watch.</em></h3>
          <p className="side-p reveal d2">
            Reach engaged streaming audiences with native overlays that fit naturally
            into the content — not a pre-roll that gets skipped. Set your budget,
            pick your tier, and watch impressions roll in.
          </p>
          <div className="side-steps reveal d2">
            {[
              { n:'01', title:'Create a campaign',    body:'Upload your creative, set your budget range, choose your streamer tier and duration.' },
              { n:'02', title:'We find your audience',body:'Our matching engine places your ad on streams where your target audience is actively watching.' },
              { n:'03', title:'Track every rupee',    body:'Real-time dashboard shows impressions, click-throughs, and spend across all your campaigns.' },
            ].map(s => (
              <div className="side-step" key={s.n}>
                <div className="side-step-n">{s.n}</div>
                <div className="side-step-body"><h4>{s.title}</h4><p>{s.body}</p></div>
              </div>
            ))}
          </div>
          <a href="#" className="btn-side btn-side-brand reveal d3">Run a campaign →</a>

          {/* Analytics mock */}
          <div className="analytics-mock reveal d3">
            <div className="am-top">
              <div className="am-title">Campaign Analytics · NovaBrands</div>
              <div className="am-export">↓ Export CSV</div>
            </div>
            <div className="am-body">
              <div className="am-kpis">
                {[['₹32K','Spent'],['18.4K','Clicks'],['420K','Viewers'],['Tier 1','Target']].map(([v,l]) => (
                  <div className="am-kpi" key={l}>
                    <div className="am-kpi-val">{v}</div>
                    <div className="am-kpi-label">{l}</div>
                  </div>
                ))}
              </div>
              <div className="am-chart">
                {[20,35,28,55,42,70,58,85,65,100,78,90].map((h,i) => (
                  <div key={i} className="am-bar" style={{
                    height:`${h}%`,
                    background: h > 65 ? '#3B5BFF' : '#EEF2FF',
                    borderRadius:'2px 2px 0 0'
                  }}/>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── How it works ──────────────────────────────────────────
function HowItWorks() {
  return (
    <section className="how-section" id="how">
      <div className="how-inner">
        <div className="how-header reveal">
          <div className="eyebrow" style={{justifyContent:'center'}}>How it works</div>
          <h2 className="section-h2" style={{textAlign:'center'}}>
            Stream → Match → <em>Earn</em>
          </h2>
          <p className="section-p" style={{margin:'0 auto', textAlign:'center'}}>
            The entire pipeline runs automatically. You stream — we handle everything in between.
          </p>
        </div>
        <div className="how-flow">
          {[
            { icon:'🎮', bg:'#0f172a', title:'You stream', desc:'Go live as usual. OBS picks up the browser source overlay in your scene collection.', delay:'d1' },
            { icon:'⚡', bg:'#3B5BFF', title:'We match & render', desc:'Our engine finds the right brand for your content and renders the overlay in real time.', delay:'d2' },
            { icon:'💸', bg:'#ECFDF5', title:'You get paid', desc:'Impressions are tracked live. Earnings accumulate and land in your account every Friday.', delay:'d3' },
          ].map((n, i) => (
            <>
              <div className={`how-node reveal ${n.delay}`} key={n.title}>
                <div className="how-node-icon" style={{background:n.bg}}>
                  <span style={{fontSize:'1.5rem'}}>{n.icon}</span>
                </div>
                <div>
                  <div className="how-node-title">{n.title}</div>
                  <div className="how-node-desc">{n.desc}</div>
                </div>
              </div>
              {i < 2 && <div className="how-arrow reveal" key={`arrow-${i}`}>→</div>}
            </>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features bento ────────────────────────────────────────
function Features() {
  return (
    <section className="features-section" id="features">
      <div className="features-inner">
        <div className="reveal" style={{marginBottom:'2.5rem'}}>
          <div className="eyebrow">Features</div>
          <h2 className="section-h2">Built for streams.<br/>Designed for <em>results.</em></h2>
        </div>
        <div className="bento">

          <div className="bc bc-1 reveal d1">
            <div className="bc-icon">🎯</div>
            <div className="bc-title">Smart Brand Matching</div>
            <div className="bc-desc">We look at your game, your chat, your niche — and find brand campaigns that actually belong on your stream. No awkward mismatches, no irrelevant ads.</div>
            <div className="platform-strip">
              {[['#FF0000','YouTube'],['#9146FF','Twitch'],['#53FC18','Kick']].map(([color,name]) => (
                <div className="plat-chip" key={name}>
                  <div className="plat-dot" style={{background:color}}/>{name}
                </div>
              ))}
            </div>
            <a href="#" className="bc-link">See how matching works →</a>
          </div>

          <div className="bc bc-2 dark reveal d2">
            <div className="bc-icon">📊</div>
            <div className="bc-title">Real-Time Dashboards</div>
            <div className="bc-desc">Streamers watch their balance grow per impression. Brands track spend, reach, and CTR live — all in one place.</div>
            <a href="#" className="bc-link">Explore the dashboard →</a>
          </div>

          <div className="bc bc-3 reveal d3">
            <div>
              <div className="bc-big-num">5<span style={{fontSize:'2rem'}}>min</span></div>
              <div className="bc-big-label">From signup to your first live campaign</div>
            </div>
            <a href="#" className="bc-link">Get started →</a>
          </div>

          <div className="bc bc-4 reveal d1">
            <div className="bc-icon">🏆</div>
            <div className="bc-title">5-Tier Streamer Network</div>
            <div className="bc-desc">Brands choose which tier to target — from nano creators with hyper-engaged audiences to Tier 1 streamers with 100K+ live viewers. Every tier is priced to match its reach.</div>
            <div className="tier-chips">
              {[
                { label:'Tier 1', desc:'100K+ avg viewers', bg:'#F5F3FF', color:'#7C3AED', border:'#DDD6FE' },
                { label:'Tier 2', desc:'20K–100K viewers',  bg:'#EEF2FF', color:'#3B5BFF', border:'#C7D2FE' },
                { label:'Tier 3', desc:'5K–20K viewers',    bg:'#ECFDF5', color:'#059669', border:'#A7F3D0' },
              ].map(t => (
                <div className="tier-chip" key={t.label} style={{background:t.bg, borderColor:t.border}}>
                  <span className="tier-chip-label" style={{color:t.color}}>{t.label}</span>
                  <span className="tier-chip-desc"  style={{color:t.color}}>{t.desc}</span>
                </div>
              ))}
            </div>
            <a href="#" className="bc-link" style={{marginTop:'1rem'}}>View all tiers →</a>
          </div>

          <div className="bc bc-5 reveal d2">
            <div className="bc-icon">💳</div>
            <div className="bc-title">Paid Every Friday</div>
            <div className="bc-desc">No minimums, no waiting periods, no invoices. Streamers are paid automatically every Friday. Brands are charged only on verified impressions — not estimates.</div>
            <a href="#" className="bc-link">See payout details →</a>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────
function Testimonials() {
  const cards = [
    { role:'Streamer', initials:'MK', bg:'#BFDBFE', color:'#1D4ED8', quote:'I didn\'t change a single thing about my streams. Added the overlay URL and started seeing money come in. Genuinely surprised at how seamless it is.', name:'Mika_Kurosawa', handle:'2.4K avg viewers · YouTube Live' },
    { role:'Brand Manager', initials:'JL', bg:'#DDD6FE', color:'#5B21B6', quote:'The brands we run get matched with audiences that actually care about the product. Our CTR on Overlays is 3× what we see on standard display.', name:'James Liu', handle:'Head of Growth · Gearbox Co.' },
    { role:'Agency', initials:'PR', bg:'#FED7AA', color:'#92400E', quote:'Managing five brands from one dashboard, seeing real-time spend per streamer tier — it\'s exactly what we needed. Friday payouts to our streamers never miss.', name:'PixelMosaic Agency', handle:'5 brands · 47 active streamers' },
  ]
  return (
    <div className="testimonials-bg">
      <div className="testimonials-inner">
        <div className="reveal">
          <div className="eyebrow">From the community</div>
          <h2 className="section-h2">Streamers and brands<br/>who switched to <em>Overlays</em></h2>
        </div>
        <div className="t-grid">
          {cards.map((c, i) => (
            <div className={`t-card reveal d${i+1}`} key={c.name}>
              <div className="t-role">{c.role}</div>
              <div className="t-stars">★★★★★</div>
              <p className="t-quote">"{c.quote}"</p>
              <div className="t-author">
                <div className="t-av" style={{background:c.bg, color:c.color}}>{c.initials}</div>
                <div><div className="t-name">{c.name}</div><div className="t-handle">{c.handle}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Pricing ───────────────────────────────────────────────
function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-inner">
        <div className="pricing-header reveal">
          <div className="eyebrow" style={{justifyContent:'center'}}>Pricing</div>
          <h2 className="section-h2">Simple, honest pricing</h2>
          <p className="section-p">Start free. Upgrade when you scale. No hidden fees, no lock-in.</p>
          <div className="p-toggle">
            Monthly
            <div className="toggle-pill"><div className="toggle-knob"/></div>
            Annual <span className="save-chip">Save 20%</span>
          </div>
        </div>
        <div className="p-cards reveal d1">
          <div className="p-card">
            <div className="p-plan">Basic</div>
            <div className="p-price"><sup>₹</sup>0 <span className="p-period">/ month</span></div>
            <p className="p-sub">Everything to get started. No credit card, no commitment.</p>
            <div className="p-divider"/>
            <ul className="p-feats">
              {['1 active campaign at a time','Standard overlay templates','Friday payouts, no minimum','Basic earnings dashboard','Tier 3–5 streamer access'].map(f => (
                <li className="p-feat" key={f}><span className="check">✓</span>{f}</li>
              ))}
            </ul>
            <a href="#" className="btn-p-free">Create free account</a>
          </div>
          <div className="p-card pro">
            <div className="p-plan">Pro</div>
            <div className="p-price"><sup>₹</sup>269 <span className="p-period">/ month</span></div>
            <p className="p-sub">For serious streamers and agencies running multiple campaigns at scale.</p>
            <div className="p-divider"/>
            <ul className="p-feats">
              {['Unlimited campaigns','All 5 streamer tiers','Custom branded overlays','Priority brand matching','Real-time analytics dashboard','CSV export & API access','Agency multi-brand management'].map(f => (
                <li className="p-feat" key={f}><span className="check">✓</span>{f}</li>
              ))}
            </ul>
            <a href="#" className="btn-p-pro">Get started</a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────
function FAQ() {
  const items = [
    { q:'How does the ad overlay actually appear on my stream?',       a:'You paste one browser source URL into OBS. Overlays handles the rest — it renders the correct ad at the right time, automatically switching campaigns as scheduled. You never touch it again.' },
    { q:'What data can brands see on their dashboard?',                a:'Real-time impressions, click-through rates, spend per campaign, tier breakdown, streamer-level performance, and estimated reach — all updating live.' },
    { q:'How are streamers matched to brands?',                        a:'We look at your game category, average viewer count, chat engagement, and content language to find campaigns that genuinely fit. You\'re never shown ads unrelated to your audience.' },
    { q:'What\'s the difference between Basic and Pro?',               a:'Basic gives one active campaign with Tier 3–5 streamers. Pro unlocks all five tiers, unlimited campaigns, custom overlay branding, API access, and the full agency multi-brand dashboard.' },
    { q:'Do streamers need a minimum follower count to join?',         a:'No minimum at all. We match based on engagement quality. A 500-viewer channel with great engagement earns well.' },
  ]

  const toggle = (e) => {
    const btn = e.currentTarget
    const answer = btn.nextElementSibling
    const isOpen = btn.classList.contains('open')
    document.querySelectorAll('.faq-q').forEach(b => { b.classList.remove('open'); b.nextElementSibling.classList.remove('open') })
    if (!isOpen) { btn.classList.add('open'); answer.classList.add('open') }
  }

  return (
    <section className="faq-section" id="faq">
      <div className="faq-header reveal">
        <div className="eyebrow" style={{justifyContent:'center'}}>FAQ</div>
        <h2 className="section-h2">Frequently asked<br/><em>questions</em></h2>
      </div>
      <div className="faq-list reveal d1">
        {items.map(({ q, a }) => (
          <div className="faq-item" key={q}>
            <button className="faq-q" onClick={toggle}>{q} <span className="faq-icon">+</span></button>
            <div className="faq-a">{a}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── CTA ───────────────────────────────────────────────────
function CTA() {
  return (
    <div className="cta-wrap reveal">
      <div className="cta-tag">Get started today</div>
      <h2 className="cta-h2">Your stream is already<br/><em>worth more.</em></h2>
      <p className="cta-sub">150,000 streamers earning. 500+ brands running. Join both sides of the marketplace — free.</p>
      <div className="cta-btns">
        <a href="#" className="btn-cta-w">Join as a streamer →</a>
        <a href="#" className="btn-cta-o">Run a campaign</a>
      </div>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────
function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo"><LogoIcon /> Overlays</div>
            <p>Native stream ads that earn for you — automatically, every broadcast.</p>
          </div>
          <div className="footer-cols">
            {[
              { title:'Company', links:['About','Careers','Blog','Press'] },
              { title:'Product', links:['Features','Pricing','Integrations','Changelog'] },
              { title:'Legal',   links:['Privacy','Terms','Cookies'] },
            ].map(col => (
              <div className="footer-col" key={col.title}>
                <h4>{col.title}</h4>
                {col.links.map(l => <a href="#" key={l}>{l}</a>)}
              </div>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Overlays. All rights reserved.</p>
          <p>Stream more. Earn more. Do less.</p>
        </div>
      </div>
    </footer>
  )
}

// ── Main export ───────────────────────────────────────────
export default function Home() {
  usePostLoginRedirect()
  useScrollReveal()
  return (
    <>
      <Navbar />
      <Hero />
      <Stats />
      <TwoSides />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </>
  )
}