import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { UserSession } from '../../lib/api';

export interface AdminMenuItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface AdminLayoutProps {
  session: UserSession;
  onLogout: () => void;
  brandSubtitle: string;
  menuItems: AdminMenuItem[];
  pageTitleMap: Record<string, string>;
  areaLabel: string;
}

export default function AdminLayout({
  session,
  onLogout,
  brandSubtitle,
  menuItems,
  pageTitleMap,
  areaLabel,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="admin-shell">
      <button
        type="button"
        className={`sidebar-overlay${isSidebarOpen ? ' active' : ''}`}
        aria-label="Menüyü kapat"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`admin-sidebar${isSidebarOpen ? ' open' : ''}`}>
        <button type="button" className="brand-card" onClick={() => navigate('/')}>
          <div className="brand-mark">
            <img src="/notio-bird-mark.png" alt="Notio" />
          </div>
          <div>
            <div className="brand-title">Notio</div>
            <div className="brand-subtitle">{brandSubtitle}</div>
          </div>
        </button>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="soft-card compact">
            <div className="soft-label">Aktif kullanıcı</div>
            <div className="soft-value">{session.fullName}</div>
            <div className="soft-muted">{session.email}</div>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-inner">
            <div className="header-leading">
              <button
                type="button"
                className="menu-toggle"
                aria-label="Menüyü aç"
                onClick={() => setIsSidebarOpen((current) => !current)}
              >
                <span />
                <span />
                <span />
              </button>
              <div>
                <div className="page-eyebrow">{areaLabel}</div>
                <h1 className="page-title">{getPageTitle(location.pathname, pageTitleMap)}</h1>
              </div>
            </div>
            <div className="header-actions">
              <div className="school-pill">{getRoleLabel(session.role)}</div>
              <button className="ghost-button" onClick={onLogout}>
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string, pageTitleMap: Record<string, string>) {
  return pageTitleMap[pathname] ?? pageTitleMap['/'] ?? 'Panel';
}

function getRoleLabel(role: string) {
  if (role === 'Admin' || role === 'PlatformAdmin') {
    return 'Platform Admin';
  }

  if (role === 'SchoolAdmin') {
    return 'Okul Yöneticisi';
  }

  return role;
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="nav-icon-svg">
        {children}
      </svg>
    </span>
  );
}

export function PanelIcon() {
  return (
    <IconFrame>
      <rect x="4" y="4" width="7" height="7" rx="2" fill="currentColor" />
      <rect x="13" y="4" width="7" height="7" rx="2" fill="currentColor" opacity="0.85" />
      <rect x="4" y="13" width="7" height="7" rx="2" fill="currentColor" opacity="0.85" />
      <rect x="13" y="13" width="7" height="7" rx="2" fill="currentColor" />
    </IconFrame>
  );
}

export function ClassIcon() {
  return (
    <IconFrame>
      <path
        d="M12 4 4 8.2 12 12l8-3.8L12 4Zm-5.5 6.5V15L12 18l5.5-3v-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function TeacherIcon() {
  return (
    <IconFrame>
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 18c1.3-2.8 3.4-4.2 6-4.2s4.7 1.4 6 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 10.8 3.5 12.3 5 13.8M19 10.8l1.5 1.5-1.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function StudentIcon() {
  return (
    <IconFrame>
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 18c1.1-2.5 2.8-3.8 5-3.8s3.9 1.3 5 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="18" cy="17.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </IconFrame>
  );
}

export function HeartIcon() {
  return (
    <IconFrame>
      <path
        d="M12 19.2 5.7 13A4 4 0 0 1 11 7.1L12 8.1l1-1A4 4 0 1 1 18.3 13L12 19.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function ChartIcon() {
  return (
    <IconFrame>
      <path
        d="M5 18h14M7.5 16v-4M12 16V8m4.5 8v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

export function InboxIcon() {
  return (
    <IconFrame>
      <path
        d="M3 12l2-7h14l2 7M3 12h4l2 3h6l2-3h4M3 12v7h18v-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}
