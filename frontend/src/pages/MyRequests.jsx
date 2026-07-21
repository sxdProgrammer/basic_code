import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Eye, FileText, Search, Inbox } from 'lucide-react';
import api from '../services/api';
import StatusBadge, { DisburseBadge } from '../components/StatusBadge';
import './MyRequests.css';

export default function MyRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'ประวัติคำร้อง — IT Request';
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/api/requests/my');
      setRequests(data.data || []);
    } catch (err) { console.error('Failed to fetch requests:', err); }
    finally { setLoading(false); }
  };

  const filtered = requests.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="app-header">
        <h1><ClipboardList size={20} /> ประวัติคำร้อง</h1>
      </div>
      <div className="app-content">
        <div className="fade-in">
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} />
              <input placeholder="ค้นหาคำร้อง..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>กำลังโหลด...</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Inbox size={48} />
              <h3>{search ? 'ไม่พบคำร้องที่ค้นหา' : 'ยังไม่มีคำร้อง'}</h3>
              <p>{search ? 'ลองเปลี่ยนคำค้นหา' : 'คุณยังไม่เคยส่งคำร้อง'}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>หัวข้อเรื่อง</th>
                    <th>สถานะ</th>
                    <th>เบิกเงิน</th>
                    <th>ไฟล์</th>
                    <th>วันที่ส่ง</th>
                    <th>อัปเดตล่าสุด</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="clickable-row" onClick={() => navigate(`/my-requests/${r.id}`)}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td><DisburseBadge isDisbursed={!!parseInt(r.is_disbursed)} /></td>
                      <td>{r.file_count > 0 && <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: 12 }}><FileText size={13} /> {r.file_count}</span>}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(r.updated_at)}</td>
                      <td><button className="btn btn-ghost btn-sm" title="ดูรายละเอียด"><Eye size={14} /></button></td>
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
