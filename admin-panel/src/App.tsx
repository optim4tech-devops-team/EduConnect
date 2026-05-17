import { createContext, useContext, useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import { api, onApiSessionFailure, sessionStorageKey, type ApiSessionFailureReason, type UserSession } from './lib/api';
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
import MealPlanPage from './pages/MealPlanPage';
import { ChartIcon, ClassIcon, HeartIcon, InboxIcon, MealIcon, PanelIcon, StudentIcon, TeacherIcon } from './components/layout/AdminLayout';

interface AuthContextValue {
  session: UserSession | null;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
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

  useEffect(() => {
    onApiSessionFailure((reason: ApiSessionFailureReason) => {
      window.localStorage.removeItem(sessionStorageKey);
      setSession(null);

      if (window.location.pathname !== '/login') {
        const query = new URLSearchParams({ reason }).toString();
        window.location.assign(`/login?${query}`);
      }
    });

    return () => {
      onApiSessionFailure(null);
    };
  }, []);

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
        mustChangePassword: result.mustChangePassword,
      };
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
      setSession(nextSession);
    },
    changePassword: async (newPassword: string) => {
      if (!session) {
        throw new Error('Oturum bulunamadi.');
      }

      await api.changePassword(session.accessToken, newPassword);
      const nextSession: UserSession = {
        ...session,
        mustChangePassword: false,
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
  const { session, changePassword, logout } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.mustChangePassword) {
    return <RequiredPasswordChangePage session={session} onChangePassword={changePassword} onLogout={logout} />;
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
    { to: '/meal-plans', label: 'Yemek Takvimi', icon: <MealIcon /> },
    { to: '/reports', label: 'Raporlar', icon: <ChartIcon /> },
  ];

  const schoolPageTitleMap = {
    '/': 'Panel',
    '/classes': 'Sınıf Yönetimi',
    '/teachers': 'Öğretmen Yönetimi',
    '/students': 'Öğrenci Yönetimi',
    '/parents': 'Veli Yönetimi',
    '/meal-plans': 'Yemek Takvimi',
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
        <Route path="/meal-plans" element={<MealPlanPage token={session.accessToken} />} />
        <Route path="/reports" element={<ReportsPage mode="school" token={session.accessToken} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequiredPasswordChangePage({
  session,
  onChangePassword,
  onLogout,
}: {
  session: UserSession;
  onChangePassword: (newPassword: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = newPassword.length >= 6 && newPassword === confirmPassword && !loading;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      await onChangePassword(newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-orb login-orb-top" />
      <div className="login-orb login-orb-bottom" />

      <div className="login-panel login-panel-compact">
        <section className="login-hero password-hero">
          <div className="hero-mark">
            <img src="/notio-bird-mark.png" alt="Notio" />
          </div>
          <div className="hero-copy">
            <div className="hero-title">Notio</div>
            <p className="hero-subtitle">İlk giriş güvenliği.</p>
            <div className="hero-chip">{session.fullName} için geçici şifreyi yenileyin.</div>
          </div>
        </section>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="card-kicker">Güvenlik adımı</div>
          <h1>İlk giriş şifreni yenile</h1>
          <p>
            Okul yöneticisi hesabı geçici şifreyle oluşturuldu. Panele devam etmek için yalnızca
            sizin bildiğiniz yeni bir şifre belirleyin.
          </p>

          <label className="field">
            <span>Yeni şifre</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="En az 6 karakter"
              autoComplete="new-password"
              data-testid="new-password"
            />
          </label>

          <label className="field">
            <span>Yeni şifre tekrar</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Şifreyi tekrar yazın"
              autoComplete="new-password"
              data-testid="confirm-password"
            />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>

          <button className="ghost-button button-link" type="button" onClick={onLogout}>
            Farklı hesapla giriş yap
          </button>

          <div className="login-note">
            Bu adım tamamlanmadan okul paneli, öğrenci, veli ve rapor ekranları açılmaz.
          </div>
        </form>
      </div>
    </div>
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
