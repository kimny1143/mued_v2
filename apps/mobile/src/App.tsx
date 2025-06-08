import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import Landing from './pages/Landing';
import PWADebug from './pages/PWADebug';
import { Reservations } from './pages/Reservations';
import { ReservationDetail } from './pages/ReservationDetail';
import BookingCalendar from './pages/BookingCalendar';
import ReservationNew from './pages/ReservationNew';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { Materials } from './pages/Materials';
import { EnvDebug } from './pages/EnvDebug';
import { ApiTest } from './pages/ApiTest';
import { InstallPWA } from './components/InstallPWA';
import { PWAPrompt } from './components/PWAPrompt';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import './App.css';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

// App Routes component
const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  // 特定のルートはローディング中でもレンダリングする必要がある
  const pathname = window.location.pathname;
  const isAuthCallback = pathname === '/auth/callback';
  const isPublicRoute = ['/login', '/pwa-debug', '/env-debug', '/api-test', '/landing'].includes(pathname);

  console.log('AppRoutes render:', {
    pathname,
    isAuthCallback,
    isPublicRoute,
    loading,
    user: !!user
  });

  if (loading && !isAuthCallback && !isPublicRoute) {
    console.log('Showing loading screen');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/pwa-debug" element={<PWADebug />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <ProtectedRoute>
            <Reservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations/:id"
        element={
          <ProtectedRoute>
            <ReservationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <BookingCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations/new"
        element={
          <ProtectedRoute>
            <ReservationNew />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/materials"
        element={
          <ProtectedRoute>
            <Materials />
          </ProtectedRoute>
        }
      />
      <Route path="/env-debug" element={<EnvDebug />} />
      <Route path="/api-test" element={<ApiTest />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
          <InstallPWA />
          <PWAPrompt />
          <IOSInstallPrompt />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
