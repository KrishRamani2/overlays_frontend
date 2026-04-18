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
)

export default function AdvertiserSetup() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [step, setStep] = useState(1);
  const [type, setType] = useState(''); // 'single' or 'agency'
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
            // Company is already set up, skip directly to dashboard
            navigate(`/advertiser-dashboard/${id}`, { replace: true });
          }
        })
        .catch(err => {
          // Needs setup, continue
        });
    }
  }, [id, navigate]);

  const handleCompanyChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'gstin') setIsGstVerified(false);
    setCompanyData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const handleBrandChange = (index, field, value) => {
    const newBrands = [...brands];
    newBrands[index][field] = value;
    setBrands(newBrands);
  };

  const addBrand = () => setBrands([...brands, { brandName: '', brandDescription: '', target: '' }]);

  const finishSetup = () => {
    navigate(`/advertiser-dashboard/${id || 'demo-id'}`);
  };

  return (
    <div className="as-page">
      <div className="as-arc"></div>
      <div className="as-dots"></div>

      <div className="as-header">
        <a href="/" className="as-logo"><LogoIcon /> Overlays</a>
      </div>

      <div className="as-container">
        {step === 1 && (
          <div className="as-card as-fade-in">
            <h1 className="as-title">Welcome. Let's set up your account.</h1>
            <p className="as-sub">Are you representing a single brand or an advertising agency?</p>
            <div className="as-options">
              <button className={`as-option-card ${type === 'single' ? 'selected' : ''}`} onClick={() => setType('single')}>
                <div className="as-option-icon">🏷️</div>
                <h3>Single Brand</h3>
                <p>I represent one specific brand</p>
              </button>
              <button className={`as-option-card ${type === 'agency' ? 'selected' : ''}`} onClick={() => setType('agency')}>
                <div className="as-option-icon">🏢</div>
                <h3>Advertiser Agency</h3>
                <p>I manage campaigns for multiple brands</p>
              </button>
            </div>
            <div className="as-footer">
              <button className="as-btn-primary" disabled={!type} onClick={() => {
                if(type === 'single') finishSetup(); 
                else setStep(2);
              }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="as-card as-fade-in">
            <h1 className="as-title">Company Data</h1>
            <p className="as-sub">Please provide details about your agency.</p>
            
            <div className="as-form-grid">
              <label className="as-checkbox-label" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                <input type="checkbox" name="registered" checked={companyData.registered} onChange={handleCompanyChange} />
                <span>Is your company registered?</span>
              </label>

              {companyData.registered && (
                <>
                  <div className="as-input-group" style={{ position: 'relative' }}>
                    <label>GST Number *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" name="gstin" value={companyData.gstin} onChange={handleCompanyChange} placeholder="Enter GST Number" style={{ flex: 1 }} />
                      <button className="as-btn-primary" onClick={verifyGst} style={{ padding: '0 1rem', whiteSpace: 'nowrap' }}>
                        {isGstVerified ? '✓ Verified' : 'Verify & Fetch'}
                      </button>
                    </div>
                  </div>
                  <div className="as-input-group">
                    <label>PAN Card *</label>
                    <input type="text" name="panCard" value={companyData.panCard} onChange={handleCompanyChange} placeholder="PAN Number" />
                  </div>
                </>
              )}

              <div className="as-input-group">
                <label>Company Name *</label>
                <input type="text" name="name" value={companyData.name} onChange={handleCompanyChange} placeholder="Enter company name" />
              </div>
              <div className="as-input-group">
                <label>Email ID *</label>
                <input type="email" name="email" value={companyData.email} onChange={handleCompanyChange} placeholder="company@email.com" />
              </div>
              <div className="as-input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address *</label>
                <input type="text" name="address" value={companyData.address} onChange={handleCompanyChange} placeholder="Full address" />
              </div>
              <div className="as-input-group">
                <label>Phone Number *</label>
                <input type="text" name="phone" value={companyData.phone} onChange={handleCompanyChange} placeholder="+91 00000 00000" />
              </div>
              <div className="as-input-group">
                <label>Target Audience *</label>
                <input type="text" name="targetAudience" value={companyData.targetAudience} onChange={handleCompanyChange} placeholder="e.g. Gamers, Tech Enthusiasts" />
              </div>
              
              <div className="as-input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Web Link *</label>
                <input type="text" name="webLink" value={companyData.webLink} onChange={handleCompanyChange} placeholder="https://yourwebsite.com" />
              </div>
            </div>

            {errorMsg && <div className="as-error-msg" style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>{errorMsg}</div>}

            <div className="as-footer-split">
              <button className="as-btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="as-btn-primary" onClick={handleNextStep2}>Next Step →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="as-card as-fade-in as-large-card">
            <h1 className="as-title">Manage Brands</h1>
            <p className="as-sub">Add the brands you are currently managing.</p>

            <div className="as-brands-list">
              {brands.map((brand, index) => (
                <div key={index} className="as-brand-form">
                  <div className="as-brand-header">Brand #{index + 1}</div>
                  <div className="as-form-grid">
                    <div className="as-input-group">
                      <label>Brand Name</label>
                      <input type="text" value={brand.brandName} onChange={(e) => handleBrandChange(index, 'brandName', e.target.value)} placeholder="Name of the brand" />
                    </div>
                    <div className="as-input-group">
                      <label>Target Audience</label>
                      <input type="text" value={brand.target} onChange={(e) => handleBrandChange(index, 'target', e.target.value)} placeholder="Target demographic" />
                    </div>
                    <div className="as-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Brand Description</label>
                      <textarea value={brand.brandDescription} onChange={(e) => handleBrandChange(index, 'brandDescription', e.target.value)} placeholder="Brief description of the brand" rows="2"></textarea>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="as-btn-ghost" onClick={addBrand} style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>+ Add another brand</button>

            <div className="as-footer-split">
              <button className="as-btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="as-btn-primary" onClick={finishSetup}>Complete Setup ✓</button>
            </div>
          </div>
        )}
      </div>

      {/* GST Verification Modal */}
      {showGstModal && fetchedDetails && (
        <div className="as-modal-overlay">
          <div className="as-modal-content">
            <h2>Company Details Found</h2>
            <p className="as-muted">Please confirm if these details match your company.</p>
            
            <div className="as-details-list">
              <div className="as-detail-item"><strong>Name:</strong> {fetchedDetails.name}</div>
              <div className="as-detail-item"><strong>Email:</strong> {fetchedDetails.email}</div>
              <div className="as-detail-item"><strong>Address:</strong> {fetchedDetails.address}</div>
              <div className="as-detail-item"><strong>Phone:</strong> {fetchedDetails.phone}</div>
              <div className="as-detail-item"><strong>PAN Card:</strong> {fetchedDetails.panCard}</div>
            </div>

            <div className="as-modal-actions">
              <button className="as-btn-ghost" onClick={() => setShowGstModal(false)}>Cancel</button>
              <button className="as-btn-primary" onClick={confirmGstDetails}>Confirm & Auto-fill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
