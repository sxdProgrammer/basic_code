import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import SubmitRequest from './pages/SubmitRequest';
import MyRequests from './pages/MyRequests';
import RequestDetail from './pages/RequestDetail';
import ItDashboard from './pages/ItDashboard';
import MyTasks from './pages/MyTasks';
import ManagementDashboard from './pages/ManagementDashboard';
import Permissions from './pages/Permissions';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="app-loading" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>กำลังเตรียมระบบ...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <h1 style={{ fontSize: '48px', margin: '0 0 16px', color: 'var(--accent-primary)' }}>404</h1>
      <p>ไม่พบหน้าที่ต้องการ</p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes wrapped in Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/submit" element={<SubmitRequest />} />
                <Route path="/my-requests" element={<MyRequests />} />
                <Route path="/my-requests/:id" element={<RequestDetail />} />
                <Route path="/it-dashboard" element={<ItDashboard />} />
                <Route path="/it-dashboard/:id" element={<RequestDetail />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/management" element={<ManagementDashboard />} />
                <Route path="/permissions" element={<Permissions />} />
                <Route path="/" element={<Navigate to="/submit" replace />} />
              </Route>
            </Route>

            {/* Fallback routing */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
