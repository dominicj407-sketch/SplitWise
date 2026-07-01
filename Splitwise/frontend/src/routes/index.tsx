import { Route, Routes, Navigate } from 'react-router-dom'
import LandingPage from '@pages/LandingPage'
import GroupDashboard from '@pages/GroupDashboard'
import GroupDetailsPage from '@pages/GroupDetailsPage'
import EventDashboard from '@pages/EventDashboard'
import SubEventDetailsPage from '@pages/SubEventDetailsPage'
import SettlementPage from '@pages/SettlementPage'
import WeeklySettlementsPage from '@pages/WeeklySettlementsPage'
import { useAuth } from '@context/AuthContext'

export default function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/groups" element={user ? <GroupDashboard /> : <Navigate to="/" replace />} />
      <Route path="/groups/:groupId" element={user ? <GroupDetailsPage /> : <Navigate to="/" replace />} />
      <Route path="/events/:eventId" element={user ? <EventDashboard /> : <Navigate to="/" replace />} />
      <Route path="/subevents/:subEventId" element={user ? <SubEventDetailsPage /> : <Navigate to="/" replace />} />
      <Route path="/settlements/:groupId" element={user ? <SettlementPage /> : <Navigate to="/" replace />} />
      <Route path="/settlements/:groupId/weekly/:week/:year" element={user ? <WeeklySettlementsPage /> : <Navigate to="/" replace />} />
    </Routes>
  )
}
