import { useState, useEffect } from 'react';
import { BarChart3, ClipboardCheck, Clock, CheckCircle2, XCircle, DollarSign, AlertTriangle, Inbox, Search } from 'lucide-react';
import api from '../services/api';
import StatusBadge, { DisburseBadge } from '../components/StatusBadge';
import './ManagementDashboard.css';

export default function ManagementDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'ภาพรวม (บริหาร) — IT Request';
    Promise.all([fetchStats(), fetchRequests()]).finally(() => setLoading(false));
  }, []);

  const fetchStats = async () => {
    try { const { data } = await api.get('/api/dashboard/stats'); setStats(data.data); }
    catch (err) { console.error('Stats failed:', err); }
  };

  const fetchRequests = async () => {
    try { const { data } = await api.get('/api/requests'); setRequests(data.data || []); }
    catch (err) { console.error('Requests failed:', err); }
  };

  const filtered = requests.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || (r.requester_name || '').toLowerCase().includes(q) || (r.requester_name_th || '').toLowerCase().includes(q);
  });

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) return (<><div className="app-header"><h1><BarChart3 size={20} /> ภาพรวม (บริหาร)</h1></div><div className="app-content"><div className="loading-overlay"><div className="spinner" /><span>กำลังโหลด...</span></div></div></>);

  const statCards = [
    { label: 'คำร้องทั้งหมด', value: stats?.total || 0, icon: ClipboardCheck, color: 'var(--accent-primary)', bg: 'var(--accent-primary-glow)' },
    { label: 'รอดำเนินการ', value: stats?.pending || 0, icon: Clock, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    { label: 'กำลังดำเนินการ', value: stats?.in_progress || 0, icon: AlertTriangle, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
    { label: 'เสร็จสิ้น', value: stats?.completed || 0, icon: CheckCircle2, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    { label: 'ปฏิเสธ', value: stats?.rejected || 0, icon: XCircle, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
    { label: 'เบิกเงินแล้ว', value: stats?.disbursed || 0, icon: DollarSign, color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-glow)' },
  ];

  return (
    <>
      <div className="app-header">
        <h1><BarChart3 size={20} /> ภาพรวม (บริหาร)</h1>
      </div>
      <div className="app-content">
        <div className="fade-in">
          <div className="stats-grid">
            {statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card__icon" style={{ background: s.bg }}><s.icon size={20} style={{ color: s.color }} /></div>
                <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📋 รายการงาน IT ทั้งหมด</h3>
              <div className="search-input" style={{ width: 280 }}>
                <Search size={16} />
                <input placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state"><Inbox size={40} /><h3>ไม่พบรายการ</h3></div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>#</th><th>ผู้ส่งคำร้อง</th><th>หัวข้อเรื่อง</th><th>สถานะงาน</th><th>เบิกเงิน</th><th>วันที่ส่ง</th></tr></thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{r.id}</td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{r.requester_name_th || r.requester_name}</td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td><DisburseBadge isDisbursed={!!parseInt(r.is_disbursed)} /></td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
