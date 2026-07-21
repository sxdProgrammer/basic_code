import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Monitor, Search, Inbox, Eye, Hand } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import StatusBadge, { DisburseBadge } from '../components/StatusBadge';
import './ItDashboard.css';

const STATUS_TABS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'rejected', label: 'ปฏิเสธ' },
];

export default function ItDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    document.title = 'รายการคำร้อง (IT) — IT Request';
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/api/requests');
      setRequests(data.data || []);
    } catch (err) { console.error('Failed to fetch:', err); }
    finally { setLoading(false); }
  };

  const handleClaim = async (e, requestId) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'รับงานนี้?',
      text: 'งานนี้จะถูกมอบหมายให้คุณ',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'รับงาน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--accent-primary)',
      background: '#1a1a2e',
      color: '#f0f0f5',
    });
    if (!result.isConfirmed) return;

    try {
      await api.post(`/api/requests/${requestId}/claim`);
      await Swal.fire({ icon: 'success', title: 'รับงานสำเร็จ!', timer: 1200, showConfirmButton: false, background: '#1a1a2e', color: '#f0f0f5' });
      fetchRequests();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.response?.data?.error || 'ไม่สามารถรับงานได้', background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7' });
    }
  };

  const filtered = requests.filter(r => {
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

  const statusCounts = {};
  requests.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  return (
    <>
      <div className="app-header">
        <h1><Monitor size={20} /> รายการคำร้อง (IT)</h1>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ทั้งหมด {requests.length} รายการ</span>
      </div>
      <div className="app-content">
        <div className="fade-in">
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} />
              <input placeholder="ค้นหาคำร้อง หรือชื่อผู้ร้อง..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="filter-tabs">
              {STATUS_TABS.map(tab => (
                <button key={tab.value} className={`filter-tab ${statusFilter === tab.value ? 'active' : ''}`} onClick={() => setStatusFilter(tab.value)}>
                  {tab.label}
                  {tab.value !== 'all' && statusCounts[tab.value] > 0 && <span style={{ marginLeft: 4, opacity: 0.8 }}>({statusCounts[tab.value]})</span>}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>กำลังโหลด...</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Inbox size={48} /><h3>ไม่พบคำร้อง</h3><p>ไม่มีรายการที่ตรงกับเงื่อนไข</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>ผู้ส่งคำร้อง</th><th>หัวข้อเรื่อง</th><th>สถานะ</th><th>ผู้รับงาน</th><th>เบิกเงิน</th><th>วันที่ส่ง</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const isAssigned = !!r.assigned_to;
                    const isMyTask = r.assigned_to == user?.id;
                    return (
                      <tr key={r.id} className="clickable-row" onClick={() => navigate(`/it-dashboard/${r.id}`)}>
                        <td style={{ color: 'var(--text-muted)' }}>{r.id}</td>
                        <td><div style={{ fontWeight: 600, fontSize: 13 }}>{r.requester_name_th || r.requester_name}</div></td>
                        <td style={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          {isAssigned ? (
                            <span className={`assigned-badge ${isMyTask ? 'assigned-badge--me' : ''}`}>
                              {isMyTask ? '🙋 ฉัน' : (r.assigned_name_th || r.assigned_name)}
                            </span>
                          ) : (
                            <button className="btn btn-claim btn-sm" onClick={(e) => handleClaim(e, r.id)} title="รับงานนี้">
                              <Hand size={13} /> รับงาน
                            </button>
                          )}
                        </td>
                        <td><DisburseBadge isDisbursed={!!parseInt(r.is_disbursed)} /></td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/it-dashboard/${r.id}`); }}><Eye size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
