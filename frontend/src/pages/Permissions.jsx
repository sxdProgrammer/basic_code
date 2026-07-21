import { useState, useEffect } from 'react';
import { Shield, Search, Inbox } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import './Permissions.css';

const PERM_COLS = [
  { key: 'can_submit', label: 'ส่งคำร้อง' },
  { key: 'can_it', label: 'ทีม IT' },
  { key: 'can_management', label: 'ทีมบริหาร' },
  { key: 'can_manage_permissions', label: 'จัดการสิทธิ์' },
];

export default function Permissions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState({});

  useEffect(() => {
    document.title = 'จัดการสิทธิ์ — IT Request';
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/permissions/users');
      setUsers(data.data || data.users || []);
    } catch (err) { console.error('Failed to fetch users:', err); }
    finally { setLoading(false); }
  };

  const handleToggle = async (userId, key, currentVal) => {
    const defaultSuperAdminId = 1; // Wait, superadmin is user 1 in best_code_db! Let's check migrate.php.
    // In best_code_db migrate.php, user 'superadmin' is seeded first (so ID is 1).
    // In Dev_work, it was ID 319. Let's make it check username === 'superadmin' or user_id === 1 as well!
    const u = users.find(u => u.id === userId);
    if (!u) return;
    if (u.username === 'superadmin' || userId === 1) {
      Swal.fire({ icon: 'warning', title: 'คำเตือน', text: 'ไม่สามารถแก้ไขสิทธิ์ Super Admin ได้', background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7' });
      return;
    }

    const newPerms = {
      can_submit: u.can_submit,
      can_it: u.can_it,
      can_management: u.can_management,
      can_manage_permissions: u.can_manage_permissions,
      [key]: currentVal ? 0 : 1
    };

    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      await api.post('/api/permissions/update', { user_id: userId, permissions: newPerms });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [key]: currentVal ? 0 : 1 } : u));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.response?.data?.error || 'ไม่สามารถอัปเดตสิทธิ์ได้', background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7' });
    } finally { setSaving(prev => ({ ...prev, [userId]: false })); }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.name_th || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <>
      <div className="app-header">
        <h1><Shield size={20} /> จัดการสิทธิ์</h1>
      </div>
      <div className="app-content">
        <div className="fade-in">
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} />
              <input placeholder="ค้นหาผู้ใช้..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>กำลังโหลด...</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Inbox size={48} /><h3>ไม่พบผู้ใช้</h3></div>
          ) : (
            <div className="card">
              <div className="table-wrapper">
                <table className="data-table permissions-table">
                  <thead>
                    <tr>
                      <th>ผู้ใช้</th><th>อีเมล</th>
                      {PERM_COLS.map(col => <th key={col.key} style={{ textAlign: 'center' }}>{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const isSuperAdmin = u.username === 'superadmin' || u.id === 1;
                      return (
                        <tr key={u.id} className={isSuperAdmin ? 'super-admin-row' : ''}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {u.name_th || u.name}
                              {isSuperAdmin && <span className="badge badge-disbursed" style={{ marginLeft: 8, fontSize: 10 }}>Super Admin</span>}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email || '-'}</td>
                          {PERM_COLS.map(col => (
                            <td key={col.key} style={{ textAlign: 'center' }}>
                              <label className="toggle" style={isSuperAdmin ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                                <input type="checkbox" checked={!!u[col.key]} onChange={() => handleToggle(u.id, col.key, u[col.key])} disabled={isSuperAdmin || saving[u.id]} />
                                <span className="toggle-slider" />
                              </label>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
