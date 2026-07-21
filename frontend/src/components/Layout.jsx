import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  ShieldAlert, 
  LogOut, 
  User, 
  Shield,
  Menu,
  X
} from 'lucide-react';
import api from '../services/api';

/**
 * Common Layout component containing Header and Sidebar.
 */
export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissions, setPermissions] = useState({
    can_submit: 1,
    can_it: 0,
    can_management: 0,
    can_manage_permissions: 0,
  });

  useEffect(() => {
    if (user?.id) {
      api.get('/api/requests') // This will trigger interceptor if unauthorized, but we load permissions contextually
        .catch(() => {});
      // In a real application, permissions payload is decoded from JWT.
      // We will parse user role and permissions from decoded user token.
      setPermissions({
        can_submit: 1,
        can_it: user.role === 'superadmin' || user.username === 'it_staff',
        can_management: user.role === 'superadmin' || user.role === 'admin',
        can_manage_permissions: user.role === 'superadmin',
      });
    }
  }, [user]);

  const navigation = [
    { name: 'แดชบอร์ดข้อมูล', href: '/', icon: LayoutDashboard, show: true },
    { name: 'ส่งคำร้องไอที', href: '/new-request', icon: FileText, show: permissions.can_submit },
    { name: 'รายการคำร้องไอที', href: '/requests-list', icon: ClipboardList, show: true },
    { name: 'จัดการสิทธิ์พนักงาน', href: '/permissions', icon: ShieldAlert, show: permissions.can_manage_permissions },
  ];

  return (
    <div className="layout-container">
      {/* Header Bar */}
      <header className="main-header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="logo-section">
            <span className="logo-icon">💻</span>
            <h1>SiamGroup IT Request System</h1>
          </div>
        </div>

        <div className="header-right">
          <div className="user-profile-badge">
            <User size={16} />
            <span className="username">{user?.name_th || user?.username}</span>
            <span className="role-tag">{user?.role}</span>
          </div>

          <div className="branch-badge">
            <Shield size={16} />
            <span>
              {permissions.can_it ? 'ฝ่ายไอที (IT)' : permissions.can_management ? 'ฝ่ายบริหาร (Management)' : 'ผู้ใช้งานทั่วไป'}
            </span>
          </div>

          <button className="logout-btn" onClick={onLogout} title="ออกจากระบบ">
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="layout-body">
        {/* Sidebar Navigation */}
        <aside className={`main-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
          <nav className="sidebar-nav">
            {navigation
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </nav>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
        )}

        {/* Page Content */}
        <main className="content-area">
          <div className="page-wrapper animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
