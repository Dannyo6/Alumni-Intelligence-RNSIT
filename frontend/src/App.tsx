import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ShieldOff, ShieldAlert, RefreshCw, TriangleAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { hasValidSupabaseConfig, supabase } from './utils/supabase';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import ImportData from './pages/Import';
import DataQuality from './pages/DataQuality';
import Admin from './pages/Admin';
import NotFound from './components/NotFound';

// Bhuvi UI Components
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';

const PageLoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-canvas p-6">
    <div className="flex w-full max-w-7xl flex-col gap-6">
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 flex-1 bg-surface-sunken rounded-lg border border-line-light animate-pulse shadow-2xs" />
        ))}
      </div>
      <div className="h-72 bg-surface-sunken rounded-lg border border-line-light animate-pulse shadow-2xs" />
    </div>
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { user, loading, isAdmin, isActive, authStatus, refreshProfile } = useAuth();
  const [isRetrying, setIsRetrying] = React.useState(false);

  // 1. If auth session initialization or authorization profile fetch is pending:
  if (loading || authStatus === 'INITIALIZING' || authStatus === 'PROFILE_LOADING') {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
          <p className="text-sm font-semibold text-ink-muted tracking-wide uppercase">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // 2. If no authenticated session -> send to login page
  if (!user || authStatus === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />;
  }

  // 3. Transient error state (e.g. network/Supabase resolution interruption):
  if (authStatus === 'ERROR') {
    const handleRetry = async () => {
      if (isRetrying) return;
      setIsRetrying(true);
      try {
        await refreshProfile();
      } finally {
        setIsRetrying(false);
      }
    };

    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <ShieldAlert size={22} />
          </div>
          <h1 className="text-lg font-semibold text-ink">Unable to verify access</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            We couldn't verify your administrator access right now. Check your connection and try again.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              onClick={handleRetry}
              disabled={isRetrying || loading}
            >
              <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                supabase.auth.signOut();
              }}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 4. Conclusively authorized admin:
  if (authStatus === 'AUTHORIZED' && isAdmin && isActive) {
    return <>{children}</>;
  }

  // 5. Conclusively resolved unauthorized or inactive account:
  return (
    <div className="flex h-screen items-center justify-center bg-canvas p-6">
      <Card className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ShieldOff size={22} />
        </div>
        <h1 className="text-lg font-semibold text-ink">Session Terminated</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Your account is inactive, pending approval, or not authorized to access the portal. Contact an administrator.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            supabase.auth.signOut();
          }}
        >
          Sign Out
        </Button>
      </Card>
    </div>
  );
};

function App() {
  if (!hasValidSupabaseConfig) {
    const code =
      'rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink-secondary';
    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6">
        <Card className="max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <TriangleAlert size={22} />
          </div>
          <h1 className="text-xl font-semibold text-ink">Configuration Error</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Supabase environment variables are missing or invalid. Please configure{' '}
            <code className={code}>VITE_SUPABASE_URL</code> and{' '}
            <code className={code}>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your{' '}
            <code className={code}>.env</code> file and restart the development server.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/entry" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="directory" element={<Directory />} />
              <Route path="data-quality" element={<DataQuality />} />
              <Route path="admin" element={<Admin />} />
              <Route path="import" element={<ImportData />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;


