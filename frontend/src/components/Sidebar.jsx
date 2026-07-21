import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Send, ClipboardList, Monitor, BarChart3,
  Shield, LogOut, Cpu, ChevronLeft, ChevronRight, Briefcase
} from 'lucide-react';
import { useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const perms = user?.permissions || {};

  const navItems = [
    { to: '/submit', icon: Send, label: 'ส่งคำร้อง', show: true },
    { to: '/my-requests', icon: ClipboardList, label: 'ประวัติคำร้อง', show: true },
    { to: '/it-dashboard', icon: Monitor, label: 'รายการคำร้อง (IT)', show: !!perms.can_it },
    { to: '/my-tasks', icon: Briefcase, label: 'งานของฉัน', show: !!perms.can_it },
    { to: '/management', icon: BarChart3, label: 'ภาพรวม (บริหาร)', show: !!perms.can_management },
    { to: '/permissions', icon: Shield, label: 'จัดการสิทธิ์', show: !!perms.can_manage_permissions },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand__icon">
          <Cpu size={22} />
        </div>
        {!collapsed && (
          <div className="sidebar-brand__text">
            <span className="sidebar-brand__title">IT Request</span>
            <span className="sidebar-brand__subtitle">Management</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.filter(item => item.show).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user__avatar">
              {(user?.name_th || user?.name || '?')[0]}
            </div>
            <div className="sidebar-user__info">
              <div className="sidebar-user__name">{user?.name_th || user?.name}</div>
            </div>
          </div>
        )}
        {!collapsed && <ThemeSwitcher position="sidebar" />}
        <button className="sidebar-link sidebar-link--logout" onClick={logout} title="ออกจากระบบ">
          <LogOut size={18} />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'ขยาย' : 'ย่อ'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
