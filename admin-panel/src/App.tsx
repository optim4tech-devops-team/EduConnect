import { createContext, useContext, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import { api, sessionStorageKey, type UserSession } from './lib/api';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ClassesPage from './pages/ClassesPage';
import TeachersPage from './pages/TeachersPage';
import StudentsPage from './pages/StudentsPage';
import ParentsPage from './pages/ParentsPage';
import PlatformDashboardPage from './pages/PlatformDashboardPage';
import PlatformSchoolsPage from './pages/PlatformSchoolsPage';
import ReportsPage from './pages/ReportsPage';
import DemoRequestsPage from './pages/DemoRequestsPage';
import { ChartIcon, ClassIcon, HeartIcon, InboxIcon, PanelIcon, StudentIcon, TeacherIcon } from './components/layout/AdminLayout';

interface AuthContextValue {
  session: UserSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('Auth context bulunamadi.');
  }
  return context;
}

function readSession() {
  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(() => readSession());

  const value = useMemo<AuthContextValue>(() => ({
    session,
    login: async (email: string, password: string) => {
      const result = await api.login(email, password);
      const nextSession: UserSession = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        role: result.role,
        userId: result.userId,
        fullName: result.fullName,
        email: result.email,
        schoolId: result.schoolId,
        avatarUrl: result.avatarUrl,
        phone: result.phone,
      };
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
      setSession(nextSession);
    },
    logout: () => {
      window.localStorage.removeItem(sessionStorageKey);
      setSession(null);
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ProtectedRoutes() {
  const { session, logout } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === 'Admin' || session.role === 'PlatformAdmin') {
    const menuItems = [
      { to: '/', label: 'Panel', icon: <PanelIcon /> },
      { to: '/schools', label: 'Okullar', icon: <ClassIcon /> },
      { to: '/demo-requests', label: 'Demo Talepleri', icon: <InboxIcon /> },
      { to: '/reports', label: 'Raporlar', icon: <ChartIcon /> },
    ];

    const pageTitleMap = {
      '/': 'Platform Paneli',
      '/schools': 'Okul Yönetimi',
      '/demo-requests': 'Demo Talepleri',
      '/reports': 'Platform Raporlari',
    };

    return (
      <Routes>
        <Route
          element={
            <AdminLayout
              session={session}
              onLogout={logout}
              brandSubtitle="Platform Admin Panel"
              menuItems={menuItems}
              pageTitleMap={pageTitleMap}
              areaLabel="Platform yonetimi"
            />
          }
        >
          <Route path="/" element={<PlatformDashboardPage token={session.accessToken} />} />
          <Route path="/schools" element={<PlatformSchoolsPage token={session.accessToken} />} />
          <Route path="/demo-requests" element={<DemoRequestsPage token={session.accessToken} />} />
          <Route path="/reports" element={<ReportsPage mode="platform" token={session.accessToken} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (session.role !== 'SchoolAdmin') {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <section className="panel-card">
              <div className="panel-card-header">
                <div>
                  <div className="section-eyebrow">Erisim siniri</div>
                  <h3>Bu portal yalnizca iki rol icin acik</h3>
                </div>
              </div>
              <p className="panel-copy">
                Web portal su an sadece Platform Admin ve Okul Yoneticisi rollerini destekliyor.
              </p>
            </section>
          }
        />
      </Routes>
    );
  }

  const schoolMenuItems = [
    { to: '/', label: 'Panel', icon: <PanelIcon /> },
    { to: '/classes', label: 'Sınıflar', icon: <ClassIcon /> },
    { to: '/teachers', label: 'Öğretmenler', icon: <TeacherIcon /> },
    { to: '/students', label: 'Öğrenciler', icon: <StudentIcon /> },
    { to: '/parents', label: 'Veliler', icon: <HeartIcon /> },
    { to: '/reports', label: 'Raporlar', icon: <ChartIcon /> },
  ];

  const schoolPageTitleMap = {
    '/': 'Panel',
    '/classes': 'Sınıf Yönetimi',
    '/teachers': 'Öğretmen Yönetimi',
    '/students': 'Öğrenci Yönetimi',
    '/parents': 'Veli Yönetimi',
    '/reports': 'Okul Raporlari',
  };

  return (
    <Routes>
      <Route
        element={
          <AdminLayout
            session={session}
            onLogout={logout}
            brandSubtitle="School Admin Panel"
            menuItems={schoolMenuItems}
            pageTitleMap={schoolPageTitleMap}
            areaLabel="Okul yonetimi"
          />
        }
      >
        <Route path="/" element={<DashboardPage token={session.accessToken} />} />
        <Route path="/classes" element={<ClassesPage token={session.accessToken} />} />
        <Route path="/teachers" element={<TeachersPage token={session.accessToken} />} />
        <Route path="/students" element={<StudentsPage token={session.accessToken} />} />
        <Route path="/parents" element={<ParentsPage token={session.accessToken} />} />
        <Route path="/reports" element={<ReportsPage mode="school" token={session.accessToken} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PublicRoutes() {
  const { session, login } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />} />
      <Route path="*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PublicRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
