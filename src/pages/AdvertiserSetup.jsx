import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdvertiserMe } from '../api/auth';
import './AdvertiserSetup.css';

const ADV_BASE = import.meta.env.VITE_ADVERTISER_API_BASE || 'http://localhost:8000'

const LogoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <rect x="2"  y="2"  width="10" height="10" rx="3" fill="#3B5BFF"/>
    <rect x="14" y="2"  width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="2"  y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.4"/>
    <rect x="14" y="14" width="10" height="10" rx="3" fill="#3B5BFF" opacity="0.7"/>
  </svg>
);

const CheckSvg = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 8.5 6.5 12 13 4"/>
  </svg>
);

/* ─── Dynamic steps based on type ─── */
const BRAND_STEPS = [
  { n: 1, label: 'Account Type' },
  { n: 2, label: 'Company Info' },
  { n: 3, label: 'Brand Details' },
];

const AGENCY_STEPS = [
  { n: 1, label: 'Account Type' },
  { n: 2, label: 'Agency Info' },
  { n: 3, label: 'Your Brands' },
];

export default function AdvertiserSetup() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [step, setStep] = useState(1);
  const [type, setType] = useState(''); // 'brands' or 'agency'
  const [isGstVerified, setIsGstVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showGstModal, setShowGstModal] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState(null);

  const [companyData, setCompanyData] = useState({
    registered: true,
    name: '',
    address: '',
    phone: '',
    targetAudience: '',
    email: '',
    gstin: '',
    webLink: '',
    panCard: ''
  });

  // For brands flow
  const [brandInfo, setBrandInfo] = useState({
    brandName: '',
    brandDescription: '',
    target: ''
  });

  // For agency flow
  const [brands, setBrands] = useState([{ brandName: '', brandDescription: '', target: '' }]);

  const STEPS = type === 'agency' ? AGENCY_STEPS : BRAND_STEPS;

  const [userDetails, setUserDetails] = useState({ name: '', picture: '' });

  useEffect(() => {
    if (id) {
      getAdvertiserMe(id).then(data => {
        if (data) {
          setUserDetails({
            name: data.name || '',
            picture: data.picture || ''
          });
          setCompanyData(prev => ({ ...prev, email: prev.email || data.email || '' }));
        }
      });
      
      // Check if data is already available
      fetch(`${ADV_BASE}/api/accounts/${id}`, { credentials: 'include' })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Not found');
        })
        .then(data => {
          if (data && (data.company_type === 'brands' || data.company_type === 'agency')) {
            navigate(`/advertiser-dashboard/${id}?type=${data.company_type}`, { replace: true });
          }
        })
        .catch(err => {
          console.error("Failed to check existing account data", err);
        });
    }
  }, [id, navigate]);

  const handleCompanyChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    if (name === 'gstin') setIsGstVerified(false);
    setCompanyData(prev => ({ ...prev, [name]: t === 'checkbox' ? checked : value }));
  };

  const verifyGst = () => {
    if (!companyData.gstin || companyData.gstin.length < 5) {
      setErrorMsg('Please enter a valid GST number');
      return;
    }
    setErrorMsg('');
    setFetchedDetails({
      name: 'PixelMosaic Agency Pvt Ltd',
      email: 'contact@pixelmosaic.in',
      address: '123 Tech Park, Andheri East, Mumbai, Maharashtra 400069',
      phone: '+91 98765 43210',
      panCard: 'ABCDE1234F'
    });
    setShowGstModal(true);
  };

  const confirmGstDetails = () => {
    setCompanyData(prev => ({
      ...prev,
      name: fetchedDetails.name,
      email: fetchedDetails.email,
      address: fetchedDetails.address,
      phone: fetchedDetails.phone,
      panCard: fetchedDetails.panCard
    }));
    setIsGstVerified(true);
    setShowGstModal(false);
  };

  const validateCompanyData = () => {
    const { name, email, address, phone, targetAudience, webLink, registered, gstin, panCard } = companyData;
    if (!name || !email || !address || !phone || !targetAudience || !webLink) {
      setErrorMsg('Please fill in all compulsory fields.');
      return false;
    }
    if (registered) {
      if (!gstin || !panCard) {
        setErrorMsg('GSTIN and PAN Card are compulsory for registered companies.');
        return false;
      }
      if (!isGstVerified) {
        setErrorMsg('Please verify your GST Number before proceeding.');
        return false;
      }
    }
    setErrorMsg('');
    return true;
  };

  const saveCompanyAndProceed = async (nextStep) => {
    if (!validateCompanyData()) return;
    try {
      await fetch(`${ADV_BASE}/api/accounts/${id || 'demo-id'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_type: type === 'agency' ? 'agency' : 'brands',
          gst_number: companyData.registered ? companyData.gstin : '',
          pan_card: companyData.registered ? companyData.panCard : '',
          company_name: companyData.name,
          address: companyData.address,
          phone: companyData.phone,
          target_audience: companyData.targetAudience,
          web_link: companyData.webLink,
          email: companyData.email,
          name: userDetails.name || companyData.name,
          picture: userDetails.picture || ''
        })
      });
    } catch (err) {
      console.error('Failed to save company data', err);
    }
    setStep(nextStep);
  };

  const handleBrandChange = (idx, field, val) => {
    const b = [...brands];
    b[idx][field] = val;
    setBrands(b);
  };

  const addBrand = () => setBrands([...brands, { brandName: '', brandDescription: '', target: '' }]);

  const finishSetup = async () => {
    try {
      const brandList = type === 'agency' ? brands : [brandInfo];
      for (const b of brandList) {
        if (!b.brandName) continue;
        await fetch(`http://127.0.0.1:8000/api/accounts/${id || 'demo-id'}/brands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand_name: b.brandName,
            target_audience: b.target,
            brand_description: b.brandDescription,
            brand_logo: ""
          })
        });
      }
    } catch (err) {
      console.error('Failed to save brand data', err);
    }
    navigate(`/advertiser-dashboard/${id || 'demo-id'}?type=${type}`);
  };

  const stepState = (n) => n < step ? 'done' : n === step ? 'active' : '';

  return (
    <div className="as-page">
      <div className="as-arc" />
      <div className="as-dots" />

      <div className="as-header">
        <a href="/" className="as-logo"><LogoIcon /> Overlays</a>
      </div>

      {/* ── STEPPER ── */}
      <div className="as-stepper-bar">
        <div className="as-stepper">
          {STEPS.map((s, i) => (
            <div className="as-step" key={s.n}>
              <div className="as-step-node">
                <div className={`as-step-dot ${stepState(s.n)}`}>
                  {stepState(s.n) === 'done' ? <CheckSvg /> : s.n}
                </div>
                <span className={`as-step-txt ${stepState(s.n)}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`as-step-line ${stepState(s.n) === 'done' ? 'done' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="as-container">

        {/* ════════════════════════════════════════
           STEP 1 — Account Type Selection
        ════════════════════════════════════════ */}
        {step === 1 && (
          <div className="as-card as-fade-in">
            <h1 className="as-title">How will you use Overlays?</h1>
            <p className="as-sub">Select the option that best describes you.</p>

            <div className="as-options">
              <button className={`as-opt ${type === 'brands' ? 'on' : ''}`} onClick={() => setType('brands')}>
                <div className="as-opt-icon">🏷️</div>
                <div className="as-opt-text">
                  <h3>Single Brand</h3>
                  <p>I represent one specific brand</p>
                </div>
                <div className="as-opt-radio" />
              </button>
              <button className={`as-opt ${type === 'agency' ? 'on' : ''}`} onClick={() => setType('agency')}>
                <div className="as-opt-icon">🏢</div>
                <div className="as-opt-text">
                  <h3>Advertiser Agency</h3>
                  <p>I manage campaigns for multiple brands</p>
                </div>
                <div className="as-opt-radio" />
              </button>
            </div>

            <div className="as-foot">
              <button className="as-btn" disabled={!type} onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
           STEP 2 — Company / Agency Info
           Same for both flows, but label changes
        ════════════════════════════════════════ */}
        {step === 2 && (
          <div className="as-card as-fade-in">
            <div className="as-badge agency">
              Step 2 · {type === 'agency' ? 'Agency' : 'Company'}
            </div>
            <h1 className="as-title">
              {type === 'agency' ? 'Agency Details' : 'Company Details'}
            </h1>
            <p className="as-sub">
              {type === 'agency'
                ? 'Tell us about your advertising agency.'
                : 'Tell us about your company.'}
            </p>

            <label className="as-check-label">
              <input type="checkbox" name="registered" checked={companyData.registered} onChange={handleCompanyChange} />
              My company is registered
            </label>

            {companyData.registered && (
              <>
                <div className="as-section-label">Registration</div>
                <div className="as-grid">
                  <div className="as-field">
                    <label>GST Number *</label>
                    <div className="as-gst-row">
                      <input type="text" name="gstin" value={companyData.gstin} onChange={handleCompanyChange} placeholder="Enter GST Number" />
                      <button className={`as-verify ${isGstVerified ? 'ok' : ''}`} onClick={verifyGst}>
                        {isGstVerified ? '✓ Verified' : 'Verify'}
                      </button>
                    </div>
                  </div>
                  <div className="as-field">
                    <label>PAN Card *</label>
                    <input type="text" name="panCard" value={companyData.panCard} onChange={handleCompanyChange} placeholder="PAN Number" />
                  </div>
                </div>
              </>
            )}

            <div className="as-section-label">
              {type === 'agency' ? 'Agency Information' : 'Company Information'}
            </div>
            <div className="as-grid">
              <div className="as-field">
                <label>Company Name *</label>
                <input type="text" name="name" value={companyData.name} onChange={handleCompanyChange} placeholder="Enter company name" />
              </div>
              <div className="as-field">
                <label>Email *</label>
                <input type="email" name="email" value={companyData.email} onChange={handleCompanyChange} placeholder="company@email.com" />
              </div>
              <div className="as-field as-full">
                <label>Address *</label>
                <input type="text" name="address" value={companyData.address} onChange={handleCompanyChange} placeholder="Full address" />
              </div>
              <div className="as-field">
                <label>Phone *</label>
                <input type="text" name="phone" value={companyData.phone} onChange={handleCompanyChange} placeholder="+91 00000 00000" />
              </div>
              <div className="as-field">
                <label>Target Audience *</label>
                <input type="text" name="targetAudience" value={companyData.targetAudience} onChange={handleCompanyChange} placeholder="e.g. Gamers, Tech" />
              </div>
              <div className="as-field as-full">
                <label>Website *</label>
                <input type="text" name="webLink" value={companyData.webLink} onChange={handleCompanyChange} placeholder="https://yourwebsite.com" />
              </div>
            </div>

            {errorMsg && <div className="as-err">{errorMsg}</div>}

            <div className="as-foot-split">
              <button className="as-btn-back" onClick={() => setStep(1)}>← Back</button>
              <button className="as-btn" onClick={() => saveCompanyAndProceed(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
           STEP 3 (Single Brand) — Brand Details
        ════════════════════════════════════════ */}
        {step === 3 && type === 'brands' && (
          <div className="as-card as-fade-in">
            <div className="as-badge brand">Step 3 · Brand</div>
            <h1 className="as-title">Brand Details</h1>
            <p className="as-sub">Tell us about the brand you're promoting.</p>

            <div className="as-grid">
              <div className="as-field as-full">
                <label>Brand Name *</label>
                <input
                  type="text"
                  value={brandInfo.brandName}
                  onChange={e => setBrandInfo(p => ({ ...p, brandName: e.target.value }))}
                  placeholder="Enter your brand name"
                />
              </div>
              <div className="as-field as-full">
                <label>Brand Description *</label>
                <textarea
                  value={brandInfo.brandDescription}
                  onChange={e => setBrandInfo(p => ({ ...p, brandDescription: e.target.value }))}
                  placeholder="What does your brand do? Describe your products or services."
                  rows="3"
                />
              </div>
              <div className="as-field as-full">
                <label>Target Audience *</label>
                <input
                  type="text"
                  value={brandInfo.target}
                  onChange={e => setBrandInfo(p => ({ ...p, target: e.target.value }))}
                  placeholder="e.g. Gamers 18-34, Tech Enthusiasts, Fitness Community"
                />
              </div>
            </div>

            {errorMsg && <div className="as-err">{errorMsg}</div>}

            <div className="as-foot-split">
              <button className="as-btn-back" onClick={() => setStep(2)}>← Back</button>
              <button className="as-btn" onClick={() => {
                if (!brandInfo.brandName || !brandInfo.brandDescription || !brandInfo.target) {
                  setErrorMsg('Please fill in all brand details.');
                  return;
                }
                setErrorMsg('');
                finishSetup();
              }}>
                Complete Setup ✓
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
           STEP 3 (Agency) — Multiple Brands
        ════════════════════════════════════════ */}
        {step === 3 && type === 'agency' && (
          <div className="as-card as-card-wide as-fade-in">
            <div className="as-badge brand">Step 3 · Brands</div>
            <h1 className="as-title">Manage Your Brands</h1>
            <p className="as-sub">Add the brands your agency currently manages.</p>

            <div className="as-brands-scroll">
              {brands.map((brand, i) => (
                <div key={i} className="as-brand-card">
                  <div className="as-brand-num"><span>{i + 1}</span> Brand #{i + 1}</div>
                  <div className="as-grid">
                    <div className="as-field">
                      <label>Brand Name</label>
                      <input type="text" value={brand.brandName} onChange={e => handleBrandChange(i, 'brandName', e.target.value)} placeholder="Name of the brand" />
                    </div>
                    <div className="as-field">
                      <label>Target Audience</label>
                      <input type="text" value={brand.target} onChange={e => handleBrandChange(i, 'target', e.target.value)} placeholder="Target demographic" />
                    </div>
                    <div className="as-field as-full">
                      <label>Description</label>
                      <textarea value={brand.brandDescription} onChange={e => handleBrandChange(i, 'brandDescription', e.target.value)} placeholder="Brief description of the brand" rows="2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="as-add-brand" onClick={addBrand}>+ Add another brand</button>

            <div className="as-foot-split">
              <button className="as-btn-back" onClick={() => setStep(2)}>← Back</button>
              <button className="as-btn" onClick={finishSetup}>Complete Setup ✓</button>
            </div>
          </div>
        )}
      </div>

      {/* ── GST Modal ── */}
      {showGstModal && fetchedDetails && (
        <div className="as-overlay">
          <div className="as-modal">
            <h2>Company Details Found</h2>
            <p className="as-muted">Confirm if these details match your company.</p>
            <div className="as-detail-list">
              <div><strong>Name:</strong> {fetchedDetails.name}</div>
              <div><strong>Email:</strong> {fetchedDetails.email}</div>
              <div><strong>Address:</strong> {fetchedDetails.address}</div>
              <div><strong>Phone:</strong> {fetchedDetails.phone}</div>
              <div><strong>PAN:</strong> {fetchedDetails.panCard}</div>
            </div>
            <div className="as-modal-btns">
              <button className="as-btn-back" onClick={() => setShowGstModal(false)}>Cancel</button>
              <button className="as-btn" onClick={confirmGstDetails}>Confirm & Auto-fill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
