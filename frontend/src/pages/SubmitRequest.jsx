import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Upload, Link, FileText, X, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import './SubmitRequest.css';

export default function SubmitRequest() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const maxSize = 10 * 1024 * 1024;
    const forbidden = ['exe', 'bat', 'sh', 'cmd', 'com', 'vbs', 'msi'];

    const valid = fileArray.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      if (forbidden.includes(ext)) {
        Swal.fire({ icon: 'warning', title: 'ไม่อนุญาต', text: `ไฟล์ .${ext} ไม่สามารถแนบได้`, background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7' });
        return false;
      }
      if (f.size > maxSize) {
        Swal.fire({ icon: 'warning', title: 'ไฟล์ใหญ่เกินไป', text: `${f.name} เกิน 10MB`, background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7' });
        return false;
      }
      return true;
    });

    setFiles(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > 5) {
        Swal.fire({ icon: 'info', title: 'จำกัดจำนวน', text: 'แนบได้สูงสุด 5 ไฟล์', background: '#1a1a2e', color: '#f0f0f5', confirmButtonColor: '#6c5ce7' });
        return combined.slice(0, 5);
      }
      return combined;
    });
  };

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (url.trim()) formData.append('url', url.trim());
      files.forEach(f => formData.append('files[]', f));

      await api.post('/api/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await Swal.fire({
        icon: 'success', title: 'ส่งคำร้องสำเร็จ!', text: 'คำร้องถูกส่งเรียบร้อยแล้ว',
        confirmButtonColor: '#6c5ce7', background: '#1a1a2e', color: '#f0f0f5', timer: 2000, showConfirmButton: false,
      });
      navigate('/my-requests');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.response?.data?.error || 'ไม่สามารถส่งคำร้องได้', confirmButtonColor: '#6c5ce7', background: '#1a1a2e', color: '#f0f0f5' });
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="app-header">
        <h1><Send size={20} /> ส่งคำร้อง</h1>
      </div>
      <div className="app-content">
        <div className="submit-container fade-in">
          <form onSubmit={handleSubmit} className="submit-form card">
            <div className="form-group">
              <label className="form-label">หัวข้อเรื่อง *</label>
              <input type="text" className="form-input" placeholder="ระบุหัวข้อคำร้อง เช่น ติดตั้งโปรแกรม, แก้ไขระบบ..." value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">รายละเอียด *</label>
              <textarea className="form-input" placeholder="อธิบายรายละเอียดของคำร้อง..." rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label"><Link size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />URL (ถ้ามี)</label>
              <input type="url" className="form-input" placeholder="https://example.com/..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">แนบไฟล์ (สูงสุด 5 ไฟล์, ไม่เกิน 10MB/ไฟล์)</label>
              <div className={`file-dropzone ${dragOver ? 'drag-over' : ''}`} onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}>
                <Upload size={28} className="file-dropzone__icon" />
                <div className="file-dropzone__text">คลิกหรือลากไฟล์มาวางที่นี่</div>
                <div className="file-dropzone__hint">รองรับทุกประเภทไฟล์ ยกเว้น .exe, .bat, .sh</div>
              </div>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
              {files.length > 0 && (
                <div className="file-list">
                  {files.map((f, i) => (
                    <div key={i} className="file-item">
                      <FileText size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                      <span className="file-item__name">{f.name}</span>
                      <span className="file-item__size">{formatSize(f.size)}</span>
                      <button type="button" className="file-item__remove" onClick={() => removeFile(i)}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <><CheckCircle size={16} /> ส่งคำร้อง</>}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
