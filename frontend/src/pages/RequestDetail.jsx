import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, FileText, Download, ExternalLink, Clock, User, MessageSquare, DollarSign, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import StatusBadge, { DisburseBadge, getStatusLabel } from '../components/StatusBadge';
import './RequestDetail.css';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const isItView = location.pathname.includes('/it-dashboard') || location.pathname.includes('/my-tasks');
  const perms = user?.permissions || {};
  const canEdit = isItView && !!perms.can_it;

  useEffect(() => {
    document.title = 'รายละเอียดคำร้อง — IT Request';
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const endpoint = isItView ? `/api/requests/${id}` : `/api/requests/my/${id}`;
      const { data } = await api.get(endpoint);
      setRequest(data.data.request || data.data);
      setNewStatus((data.data.request || data.data).status);
    } catch (err) { console.error('Failed to fetch:', err); }
    finally { setLoading(false); }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await api.put(`/api/requests/${id}/status`, { status: newStatus, note: note.trim() || null });
      await Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ', background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7', timer: 1500, showConfirmButton: false });
      setNote('');
      fetchRequest();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.response?.data?.error || 'ไม่สามารถอัปเดตได้', background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7' });
    } finally { setSaving(false); }
  };

  const handleToggleDisburse = async () => {
    const newVal = !parseInt(request.is_disbursed);
    try {
      await api.put(`/api/requests/${id}/disburse`, { is_disbursed: newVal });
      fetchRequest();
    } catch (err) { console.error('Disburse toggle failed:', err); }
  };

  const downloadFile = (fileId) => {
    window.open(`/best_code/backend/public/api/files/${fileId}/download`, '_blank');
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const backPath = location.pathname.includes('/it-dashboard')
    ? '/it-dashboard'
    : location.pathname.includes('/my-tasks')
      ? '/my-tasks'
      : '/my-requests';

  if (loading) return (<><div className="app-header"><h1>รายละเอียดคำร้อง</h1></div><div className="app-content"><div className="loading-overlay"><div className="spinner" /><span>กำลังโหลด...</span></div></div></>);
  if (!request) return (<><div className="app-header"><h1>รายละเอียดคำร้อง</h1></div><div className="app-content"><div className="empty-state"><h3>ไม่พบคำร้อง</h3></div></div></>);

  // Normalize files and updates list
  const filesList = request.files || [];
  const updatesList = request.updates || [];

  return (
    <>
      <div className="app-header">
        <h1><FileText size={20} /> คำร้อง #{request.id}</h1>
        <div className="flex items-center gap-3">
          <StatusBadge status={request.status} />
          <DisburseBadge isDisbursed={!!parseInt(request.is_disbursed)} />
        </div>
      </div>
      <div className="app-content">
        <button className="back-link" onClick={() => navigate(backPath)}><ArrowLeft size={16} /> กลับ</button>
        <div className="detail-grid fade-in">
          <div className="detail-main">
            <div className="card">
              <h2 className="detail-title">{request.title}</h2>
              <div className="detail-meta">
                <span><User size={13} /> {request.requester_name_th || request.requester_name}</span>
                <span><Clock size={13} /> {formatDate(request.created_at)}</span>
                {request.assigned_to && <span style={{ color: 'var(--accent-primary)' }}>🔧 ผู้รับงาน: {request.assigned_name_th || request.assigned_name}</span>}
              </div>
              <div className="detail-description">{request.description}</div>
              {request.url && (
                <a href={request.url} target="_blank" rel="noopener noreferrer" className="detail-url">
                  <ExternalLink size={14} /> {request.url}
                </a>
              )}
              {filesList.length > 0 && (
                <div className="detail-files">
                  <h4><FileText size={14} /> ไฟล์แนบ ({filesList.length})</h4>
                  <div className="file-list">
                    {filesList.map(f => (
                      <div key={f.id} className="file-item">
                        <FileText size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span className="file-item__name">{f.file_name}</span>
                        <span className="file-item__size">{(f.file_size / 1024).toFixed(0)} KB</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(f.id)}><Download size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="card mt-4">
              <h3 className="card-title"><MessageSquare size={16} /> ประวัติการอัปเดต</h3>
              {updatesList.length > 0 ? (
                <div className="timeline">
                  {updatesList.map(u => (
                    <div key={u.id} className="timeline-item">
                      <div className="timeline-item__header">
                        <span className="timeline-item__user">{u.updater_name_th || u.updater_name}</span>
                        <span className="timeline-item__date">{formatDate(u.created_at)}</span>
                      </div>
                      <div className="timeline-item__body">
                        {u.old_status && u.new_status && <div style={{ marginBottom: u.note ? 6 : 0 }}>เปลี่ยนสถานะ: {getStatusLabel(u.old_status)} → {getStatusLabel(u.new_status)}</div>}
                        {u.is_disbursed_change ? <div>{u.note}</div> : u.note ? <div>💬 {u.note}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted" style={{ fontSize: 13 }}>ยังไม่มีการอัปเดต</p>}
            </div>
          </div>
          {canEdit && (
            <div className="detail-sidebar">
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>⚙️ จัดการคำร้อง</h3>
                <div className="form-group">
                  <label className="form-label">เปลี่ยนสถานะ</label>
                  <select className="form-input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="pending">รอดำเนินการ</option>
                    <option value="in_progress">กำลังดำเนินการ</option>
                    <option value="completed">เสร็จสิ้น</option>
                    <option value="rejected">ปฏิเสธ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">หมายเหตุ</label>
                  <textarea className="form-input" rows={3} placeholder="เพิ่มหมายเหตุ (ถ้ามี)..." value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <button className="btn btn-primary w-full" onClick={handleStatusUpdate} disabled={saving}>
                  {saving ? <span className="spinner" /> : <><Save size={14} /> บันทึกการอัปเดต</>}
                </button>
                {perms.can_management && (
                  <div className="disburse-section" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}><DollarSign size={14} style={{ verticalAlign: 'middle' }} /> เบิกเงิน</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{parseInt(request.is_disbursed) ? 'เบิกเงินแล้ว' : 'ยังไม่ได้เบิกเงิน'}</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={!!parseInt(request.is_disbursed)} onChange={handleToggleDisburse} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
