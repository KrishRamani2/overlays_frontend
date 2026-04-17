/* ── Brands (full data) ── */
let brands = [
  {
    id:         'nova',
    name:       'NovaBrands',
    category:   'Consumer Tech',
    color:      '#3B5BFF',
    colorSoft:  '#EEF2FF',
    logo:       'N',
    spendRaw:   124800,
    streams:    47,
  },
  {
    id:         'zara_in',
    name:       'ZaraIN',
    category:   'Fashion & Apparel',
    color:      '#3B5BFF',
    colorSoft:  '#EEF2FF',
    logo:       'Z',
    spendRaw:   89400,
    streams:    31,
  },
  {
    id:         'brewlab',
    name:       'BrewLab Coffee',
    category:   'Food & Beverage',
    color:      '#3B5BFF',
    colorSoft:  '#EEF2FF',
    logo:       'B',
    spendRaw:   62100,
    streams:    22,
  },
  {
    id:         'motionfit',
    name:       'MotionFit',
    category:   'Health & Fitness',
    color:      '#3B5BFF',
    colorSoft:  '#EEF2FF',
    logo:       'M',
    spendRaw:   44500,
    streams:    18,
  },
  {
    id:         'pixplay',
    name:       'PixPlay Studios',
    category:   'Gaming & Entertainment',
    color:      '#3B5BFF',
    colorSoft:  '#EEF2FF',
    logo:       'P',
    spendRaw:   103200,
    streams:    58,
  },
]

/* ── Campaigns (seeded dummy + runtime additions) ── */
let campaigns = [
  // NovaBrands
  { id:'nova_summer_01',  brandId:'nova',      name:'Nova Summer Promo',      status:'live',     spend:32000, streamers:12, clicks:'18.4K', viewers:'420K', tier:'Tier 1', exclusive:false, daysLive:14 },
  { id:'nova_tech_02',    brandId:'nova',      name:'Tech Launch Q2',         status:'live',     spend:24500, streamers:8,  clicks:'12.1K', viewers:'280K', tier:'Tier 2', exclusive:false, daysLive:10 },
  { id:'nova_app_03',     brandId:'nova',      name:'App Install Drive',      status:'pending',  spend:0,     streamers:0,  clicks:'—',     viewers:'—',    tier:'Tier 3', exclusive:false, daysLive:7  },
  { id:'nova_brand_04',   brandId:'nova',      name:'Brand Awareness Oct',    status:'live',     spend:18200, streamers:5,  clicks:'9.2K',  viewers:'190K', tier:'Tier 2', exclusive:false, daysLive:30 },
  { id:'nova_game_05',    brandId:'nova',      name:'Gaming Peripheral Ad',   status:'ended',    spend:28100, streamers:10, clicks:'14.8K', viewers:'310K', tier:'Tier 1', exclusive:false, daysLive:21 },
  { id:'nova_sale_06',    brandId:'nova',      name:'Festive Sale Push',      status:'rejected', spend:0,     streamers:0,  clicks:'—',     viewers:'—',    tier:'Tier 4', exclusive:false, daysLive:7  },
  // ZaraIN
  { id:'zara_spring_01',  brandId:'zara_in',   name:'Spring Collection',      status:'live',     spend:31000, streamers:9,  clicks:'22.1K', viewers:'510K', tier:'Tier 1', exclusive:false, daysLive:14 },
  { id:'zara_sale_02',    brandId:'zara_in',   name:'End of Season Sale',     status:'ended',    spend:28400, streamers:11, clicks:'17.3K', viewers:'390K', tier:'Tier 2', exclusive:false, daysLive:21 },
  { id:'zara_collab_03',  brandId:'zara_in',   name:'Designer Collab Drop',   status:'live',     spend:18000, streamers:6,  clicks:'11.8K', viewers:'240K', tier:'Tier 3', exclusive:false, daysLive:7  },
  { id:'zara_winter_04',  brandId:'zara_in',   name:'Winter Lookbook',        status:'pending',  spend:0,     streamers:0,  clicks:'—',     viewers:'—',    tier:'Tier 2', exclusive:false, daysLive:30 },
  // BrewLab
  { id:'brew_launch_01',  brandId:'brewlab',   name:'Nitro Cold Brew Launch', status:'live',     spend:22400, streamers:8,  clicks:'9.4K',  viewers:'210K', tier:'Tier 3', exclusive:false, daysLive:14 },
  { id:'brew_morn_02',    brandId:'brewlab',   name:'Morning Ritual',         status:'live',     spend:21700, streamers:7,  clicks:'8.8K',  viewers:'195K', tier:'Tier 2', exclusive:false, daysLive:10 },
  { id:'brew_fest_03',    brandId:'brewlab',   name:'Monsoon Special',        status:'ended',    spend:18000, streamers:5,  clicks:'7.1K',  viewers:'160K', tier:'Tier 3', exclusive:false, daysLive:7  },
  // MotionFit
  { id:'mf_app_01',       brandId:'motionfit', name:'App Download Push',      status:'live',     spend:12000, streamers:4,  clicks:'6.2K',  viewers:'140K', tier:'Tier 4', exclusive:false, daysLive:14 },
  { id:'mf_run_03',       brandId:'motionfit', name:'Run Season Campaign',    status:'live',     spend:18500, streamers:7,  clicks:'9.8K',  viewers:'218K', tier:'Tier 3', exclusive:false, daysLive:21 },
  { id:'mf_yoga_04',      brandId:'motionfit', name:'Yoga & Wellness Push',   status:'ended',    spend:14000, streamers:5,  clicks:'7.4K',  viewers:'168K', tier:'Tier 5', exclusive:false, daysLive:30 },
  // PixPlay
  { id:'pp_launch_01',    brandId:'pixplay',   name:'GameZone Launch',        status:'live',     spend:28000, streamers:14, clicks:'31.4K', viewers:'720K', tier:'Tier 1', exclusive:true,  daysLive:7  },
  { id:'pp_collab_02',    brandId:'pixplay',   name:'Creator Collab Series',  status:'live',     spend:22000, streamers:11, clicks:'24.8K', viewers:'580K', tier:'Tier 2', exclusive:false, daysLive:14 },
  { id:'pp_esports_03',   brandId:'pixplay',   name:'Esports Tournament',     status:'live',     spend:18400, streamers:9,  clicks:'20.1K', viewers:'460K', tier:'Tier 1', exclusive:false, daysLive:21 },
  { id:'pp_dlc_04',       brandId:'pixplay',   name:'DLC Drop Campaign',      status:'ended',    spend:14800, streamers:8,  clicks:'16.4K', viewers:'380K', tier:'Tier 3', exclusive:false, daysLive:10 },
  { id:'pp_mobile_05',    brandId:'pixplay',   name:'Mobile Gaming Blitz',    status:'ended',    spend:12200, streamers:7,  clicks:'13.7K', viewers:'320K', tier:'Tier 4', exclusive:false, daysLive:7  },
]

/* ═══════════════════════════════════════
   BRANDS API
═══════════════════════════════════════ */

export const getBrands = () => brands

export const getBrandById = (id) => brands.find(b => b.id === id)

/** Derived display fields — computed fresh each call */
export const getBrandWithStats = (id) => {
  const brand = getBrandById(id)
  if (!brand) return null
  const bc = campaigns.filter(c => c.brandId === id)
  const totalSpend = brand.spendRaw + bc
    .filter(c => c._userCreated)
    .reduce((s, c) => s + (c.spend || 0), 0)
  return {
    ...brand,
    totalSpend:  `₹${totalSpend.toLocaleString('en-IN')}`,
    spendRaw:    totalSpend,
    campaigns:   bc.length,
    streams:     brand.streams + bc.filter(c => c._userCreated && c.status === 'live').length,
  }
}

export const getAllBrandsWithStats = () =>
  brands.map(b => getBrandWithStats(b.id))

/* ═══════════════════════════════════════
   CAMPAIGNS API
═══════════════════════════════════════ */

export const getCampaigns = (brandId) =>
  campaigns.filter(c => c.brandId === brandId)

export const getAllCampaigns = () => campaigns

/**
 * addCampaign — called from CampaignManager on submit
 *
 * @param {object} campaign
 * @param {string} campaign.id            — campaignId from the form
 * @param {string} campaign.brandId       — currentAd.brand (selected brand id)
 * @param {string} campaign.name          — currentAd.visibleName or campaignId
 * @param {number} campaign.budgetMin     — from submission popup
 * @param {number} campaign.budgetMax     — from submission popup
 * @param {string} campaign.tier          — 'Tier 1' … 'Tier 5'
 * @param {boolean} campaign.exclusive    — single streamer takes whole ad
 * @param {number} campaign.daysLive      — duration in days
 * @param {Array}  campaign.ads           — ad variations array
 */
export const addCampaign = (campaign) => {
  // Prevent duplicate IDs — update if exists
  const existing = campaigns.findIndex(c => c.id === campaign.id)
  const payload = {
    id:          campaign.id,
    brandId:     campaign.brandId,
    name:        campaign.name || campaign.id,
    status:      'pending',
    spend:       0,
    streamers:   0,
    clicks:      '—',
    viewers:     '—',
    budgetMin:   campaign.budgetMin,
    budgetMax:   campaign.budgetMax,
    tier:        campaign.tier,
    exclusive:   campaign.exclusive,
    daysLive:    campaign.daysLive,
    ads:         campaign.ads,
    submittedAt: new Date().toISOString(),
    _userCreated: true,
  }
  if (existing >= 0) {
    campaigns[existing] = payload
  } else {
    campaigns.push(payload) }
    return payload
}

export const getBillingTransactions = () =>
  campaigns
    .filter(c => c.spend > 0)
    .map(c => {
      const brand = getBrandById(c.brandId)
      return {
        brand:    brand?.name   || c.brandId,
        brandId:  c.brandId,
        campaign: c.name,
        tier:     c.tier        || 'Tier 3',
        amount:   c.spend,
        date:     c._userCreated
          ? new Date(c.submittedAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'})
          : 'Jun 2026',
        status:   c.status,
      }
    })