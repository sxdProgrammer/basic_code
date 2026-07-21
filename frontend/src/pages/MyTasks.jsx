import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Search, Inbox, Eye, CheckCircle2, AlertTriangle, DollarSign } from 'lucide-react';
import api from '../services/api';
import StatusBadge, { DisburseBadge } from '../components/StatusBadge';
import './MyTasks.css';

export default function MyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    document.title = 'งานของฉัน — IT Request';
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/api/my-tasks');
      setTasks(data.data || []);
      setStats(data.stats || null);
    } catch (err) { console.error('Failed to fetch tasks:', err); }
    finally { setLoading(false); }
  };

  const filtered = tasks.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.requester_name || '').toLowerCase().includes(q) || (r.requester_name_th || '').toLowerCase().includes(q);
    }
    return true;
  });

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statCards = stats ? [
    { label: 'งานทั้งหมด', value: stats.total || 0, icon: Briefcase, color: 'var(--accent-primary)', bg: 'var(--accent-primary-glow)' },
    { label: 'กำลังดำเนินการ', value: stats.in_progress || 0, icon: AlertTriangle, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
    { label: 'เสร็จสิ้น', value: stats.completed || 0, icon: CheckCircle2, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    { label: 'เบิกเงินแล้ว', value: stats.disbursed || 0, icon: DollarSign, color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-glow)' },
  ] : [];

  const STATUS_TABS = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'in_progress', label: 'กำลังทำ' },
    { value: 'pending', label: 'รอ' },
    { value: 'completed', label: 'เสร็จ' },
    { value: 'rejected', label: 'ปฏิเสธ' },
  ];

  return (
    <>
      <div className="app-header">
        <h1><Briefcase size={20} /> งานของฉัน</h1>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tasks.length} รายการ</span>
      </div>
      <div className="app-content">
        <div className="fade-in">
          {/* Stats */}
          {stats && (
            <div className="stats-grid stats-grid--compact">
              {statCards.map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-card__icon" style={{ background: s.bg }}><s.icon size={18} style={{ color: s.color }} /></div>
                  <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-card__label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filter */}
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} />
              <input placeholder="ค้นหางาน..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="filter-tabs">
              {STATUS_TABS.map(tab => (
                <button key={tab.value} className={`filter-tab ${statusFilter === tab.value ? 'active' : ''}`} onClick={() => setStatusFilter(tab.value)}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>กำลังโหลด...</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Inbox size={48} /><h3>{search ? 'ไม่พบงาน' : 'ยังไม่มีงานที่รับ'}</h3><p>{search ? 'ลองเปลี่ยนคำค้นหา' : 'กดรับงานจากหน้ารายการคำร้อง (IT)'}</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>ผู้ส่งคำร้อง</th><th>หัวข้อเรื่อง</th><th>สถานะ</th><th>เบิกเงิน</th><th>รับงานเมื่อ</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="clickable-row" onClick={() => navigate(`/it-dashboard/${r.id}`)}>
                      <td style={{ color: 'var(--text-muted)' }}>{r.id}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{r.requester_name_th || r.requester_name}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td><DisburseBadge isDisbursed={!!parseInt(r.is_disbursed)} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(r.assigned_at)}</td>
                      <td><button className="btn btn-ghost btn-sm"><Eye size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
