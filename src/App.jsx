import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StreamerLogin from './pages/StreamerLogin'
import StreamerDashboard from './pages/StreamerDashboard'
import ProfileSetup from './pages/Profilesetup'
import AdvertiserLogin from './pages/AdvertiserLogin'
import CampaignManager from './pages/CampaignManager'
import AdvertiserDashboard from './pages/AdvertiserDashboard'
import AdvertiserSetup from './pages/AdvertiserSetup'
import ProtectedRoute from './components/ProtectedRoute'
import AuthCallback from './pages/AuthCallback'
import NotFound from './pages/NotFound'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/streamer" element={<StreamerLogin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/streamer-dashboard/:id" element={<StreamerDashboard />} />
        <Route path="/setup/profile" element={<ProfileSetup />} />
        <Route path="/campaign-manager/:id?" element={<CampaignManager />} />
        <Route path="/advertiser-dashboard/:id" element={<AdvertiserDashboard />} />
        <Route path="/setup/advertiser/:id" element={<AdvertiserSetup />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App