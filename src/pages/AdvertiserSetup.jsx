import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AdvertiserSetup.css';

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

const STEPS = [
  { n: 1, label: 'Account Type' },
  { n: 2, label: 'Agency Info' },
  { n: 3, label: 'Brands' },
];

export default function AdvertiserSetup() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
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

  const [brands, setBrands] = useState([{ brandName: '', brandDescription: '', target: '' }]);

  React.useEffect(() => {
    if (id) {
      fetch(`http://localhost:8000/api/company/${id}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Not found');
        })
        .then(data => {
          if (data && data.name) {
            navigate(`/advertiser-dashboard/${id}`, { replace: true });
          }
        })
        .catch(() => {});
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

  const handleNextStep2 = async () => {
    const { name, email, address, phone, targetAudience, webLink, registered, gstin, panCard } = companyData;
    if (!name || !email || !address || !phone || !targetAudience || !webLink) {
      setErrorMsg('Please fill in all compulsory fields.');
      return;
    }
    if (registered) {
      if (!gstin || !panCard) {
        setErrorMsg('GSTIN and PAN Card are compulsory for registered companies.');
        return;
      }
      if (!isGstVerified) {
        setErrorMsg('Please verify your GST Number before proceeding.');
        return;
      }
    }
    setErrorMsg('');
    try {
      await fetch(`http://localhost:8000/api/company/${id || 'demo-id'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyData.name })
      });
    } catch (err) {
      console.error('Failed to save company name', err);
    }
    setStep(3);
  };

  const handleBrandChange = (idx, field, val) => {
    const b = [...brands];
    b[idx][field] = val;
    setBrands(b);
  };

  const addBrand = () => setBrands([...brands, { brandName: '', brandDescription: '', target: '' }]);
  const finishSetup = () => navigate(`/advertiser-dashboard/${id || 'demo-id'}`);

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

        {/* ════ STEP 1 ════ */}
        {step === 1 && (
          <div className="as-card as-fade-in">
            <h1 className="as-title">How will you use Overlays?</h1>
            <p className="as-sub">Select the option that best describes you.</p>

            <div className="as-options">
              <button className={`as-opt ${type === 'single' ? 'on' : ''}`} onClick={() => setType('single')}>
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
              <button className="as-btn" disabled={!type} onClick={() => {
                if (type === 'single') finishSetup();
                else setStep(2);
              }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 2 — Agency Info ════ */}
        {step === 2 && (
          <div className="as-card as-fade-in">
            <div className="as-badge agency">Step 2 · Agency</div>
            <h1 className="as-title">Agency Details</h1>
            <p className="as-sub">Tell us about your advertising agency.</p>

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

            <div className="as-section-label">Company Information</div>
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
              <button className="as-btn" onClick={handleNextStep2}>Continue →</button>
            </div>
          </div>
        )}

        {/* ════ STEP 3 — Brands ════ */}
        {step === 3 && (
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
