import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Events from './pages/Events';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EventDetail from './pages/EventDetail';
import RegistrationFlow from './pages/RegistrationFlow';
import MyTickets from './pages/MyTickets';
import OrganizerDashboard from './pages/OrganizerDashboard';
import CheckInScanner from './pages/CheckInScanner';
import FeedbackSubmission from './pages/FeedbackSubmission';
import EventGallery from './pages/EventGallery';
import AdminPanel from './pages/AdminPanel';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Verifying session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const hasRole = user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={<Login />}
          />
          <Route
            path="/signup"
            element={<Signup />}
          />
          <Route
            path="/"
            element={
              <MainLayout>
                <Home />
              </MainLayout>
            }
          />
          <Route
            path="/events"
            element={
              <MainLayout>
                <Events />
              </MainLayout>
            }
          />
          <Route
            path="/event/:id"
            element={
              <MainLayout>
                <EventDetail />
              </MainLayout>
            }
          />
          <Route
            path="/register/:id"
            element={
              <MainLayout>
                <ProtectedRoute>
                  <RegistrationFlow />
                </ProtectedRoute>
              </MainLayout>
            }
          />
          <Route
            path="/tickets"
            element={
              <MainLayout>
                <ProtectedRoute>
                  <MyTickets />
                </ProtectedRoute>
              </MainLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              </MainLayout>
            }
          />
          <Route
            path="/checkin/:eventId"
            element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                  <CheckInScanner />
                </ProtectedRoute>
              </MainLayout>
            }
          />
          <Route
            path="/feedback/:eventId"
            element={
              <MainLayout>
                <ProtectedRoute>
                  <FeedbackSubmission />
                </ProtectedRoute>
              </MainLayout>
            }
          />
          <Route
            path="/gallery/:eventId"
            element={
              <MainLayout>
                <EventGallery />
              </MainLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              </MainLayout>
            }
          />
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
