import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { auth, ensureCsrfCookie } from './api';
import LoginPage from './pages/LoginPage';
import ClientHome from './pages/ClientHome';
import StaffHome from './pages/StaffHome';
import MasterPublicPage from './pages/MasterPublicPage';
import { AppProvider } from './contexts/AppContext';
import { C } from './theme';

const ManagerHome = lazy(() => import('./pages/ManagerHome'));

function App() {
  const [staffUser, setStaffUser] = useState(null);
  const [clientUser, setClientUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingRole, setAddingRole] = useState(false);

  useEffect(() => {
    const init = async () => {
      await ensureCsrfCookie();

      // Migrate old single-token sessions
      const oldToken = localStorage.getItem('token');
      if (oldToken && !localStorage.getItem('token_staff') && !localStorage.getItem('token_client')) {
        localStorage.setItem('token_staff', oldToken);
        localStorage.removeItem('token');
      }

      const staffToken = localStorage.getItem('token_staff');
      const clientToken = localStorage.getItem('token_client');
      const savedRole = localStorage.getItem('active_role');

      let resolvedStaff = null;
      let resolvedClient = null;

      if (staffToken) {
        try { resolvedStaff = await auth.userWithToken(staffToken); }
        catch { localStorage.removeItem('token_staff'); }
      }
      if (clientToken) {
        try { resolvedClient = await auth.userWithToken(clientToken); }
        catch { localStorage.removeItem('token_client'); }
      }

      setStaffUser(resolvedStaff);
      setClientUser(resolvedClient);

      let role = null;
      if (savedRole === 'client' && resolvedClient) role = 'client';
      else if (savedRole === 'staff' && resolvedStaff) role = 'staff';
      else if (resolvedStaff) role = 'staff';
      else if (resolvedClient) role = 'client';

      if (role) localStorage.setItem('active_role', role);
      else localStorage.removeItem('active_role');
      setActiveRole(role);
      setLoading(false);
    };
    init();
  }, []);

  const onLogin = (data) => {
    const role = data.user.role === 'client' ? 'client' : 'staff';
    localStorage.setItem(`token_${role}`, data.token);
    localStorage.setItem('active_role', role);
    if (role === 'staff') setStaffUser(data.user);
    else setClientUser(data.user);
    setActiveRole(role);
    setAddingRole(false);
  };

  const onLogout = async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    localStorage.removeItem(`token_${activeRole}`);
    if (activeRole === 'staff') {
      setStaffUser(null);
      if (clientUser) {
        localStorage.setItem('active_role', 'client');
        setActiveRole('client');
      } else {
        localStorage.removeItem('active_role');
        setActiveRole(null);
      }
    } else {
      setClientUser(null);
      if (staffUser) {
        localStorage.setItem('active_role', 'staff');
        setActiveRole('staff');
      } else {
        localStorage.removeItem('active_role');
        setActiveRole(null);
      }
    }
  };

  const switchRole = (role) => {
    localStorage.setItem('active_role', role);
    setActiveRole(role);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: C.bg, color: C.textSec, fontSize: 14,
      }}>
        Загрузка...
      </div>
    );
  }

  const isLoggedIn = activeRole !== null;

  const currentUser = activeRole === 'client' ? clientUser : staffUser;
  const otherRole = activeRole === 'staff' ? 'client' : 'staff';
  const hasOtherSession = activeRole === 'staff' ? !!clientUser : !!staffUser;
  const canAddRole = activeRole !== null && !hasOtherSession;
  const roleSwitch = {
    hasOtherSession,
    canAddRole,
    otherRole,
    onSwitch: () => switchRole(otherRole),
    onAdd: () => setAddingRole(true),
  };

  return (
    <BrowserRouter>
      {addingRole && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <LoginPage
            onLogin={onLogin}
            limitToMode={otherRole}
            onClose={() => setAddingRole(false)}
          />
        </div>
      )}
      <Routes>
        <Route path="/m/:slug" element={<MasterPublicPage />} />
        <Route
          path="/login"
          element={
            isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={onLogin} initialMode="client" />
          }
        />
        <Route
          path="/login/staff"
          element={
            isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={onLogin} initialMode="staff" />
          }
        />
        <Route
          path="/"
          element={
            !isLoggedIn ? (
              <Navigate to="/login" replace />
            ) : activeRole === 'client' ? (
              <AppProvider initialUser={currentUser}>
                <ClientHome onLogout={onLogout} roleSwitch={roleSwitch} />
              </AppProvider>
            ) : currentUser?.role === 'manager' ? (
              <AppProvider initialUser={currentUser}>
                <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.bg, color: C.textSec }}>Загрузка...</div>}>
                  <ManagerHome onLogout={onLogout} roleSwitch={roleSwitch} />
                </Suspense>
              </AppProvider>
            ) : (
              <AppProvider initialUser={currentUser}>
                <StaffHome onLogout={onLogout} roleSwitch={roleSwitch} />
              </AppProvider>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
