import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StreamerLogin from './pages/StreamerLogin'
import StreamerDashboard from './pages/StreamerDashboard'
import ProfileSetup from './pages/Profilesetup'
import AdvertiserLogin from './pages/AdvertiserLogin'
import CampaignManager from './pages/CampaignManager'
import AdvertiserDashboard from './pages/AdvertiserDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
            <Home />
          
        }/>
        <Route path="/login/streamer" element={<StreamerLogin />} />
        <Route path="/streamer-dashboard" element={<StreamerDashboard />} />
        <Route path="/setup/profile" element={<ProfileSetup />} />
        <Route path="/login/advertiser" element={<AdvertiserLogin />} />
        <Route path="/campaign-manager" element={<CampaignManager />} />
        <Route path="/advertiser-dashboard" element={<AdvertiserDashboard />} />
        
          <Route path="/streamer-dashboard" element={<StreamerDashboard />} />
        

      </Routes>
    </BrowserRouter>
  )
}
export default App