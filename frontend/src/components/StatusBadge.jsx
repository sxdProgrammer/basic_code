import { Clock, Loader, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  pending:     { label: 'รอดำเนินการ', icon: Clock },
  in_progress: { label: 'กำลังดำเนินการ', icon: Loader },
  completed:   { label: 'เสร็จสิ้น', icon: CheckCircle2 },
  rejected:    { label: 'ปฏิเสธ', icon: XCircle },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`badge badge-${status}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export function DisburseBadge({ isDisbursed }) {
  return (
    <span className={`badge ${isDisbursed ? 'badge-disbursed' : 'badge-not-disbursed'}`}>
      {isDisbursed ? '✓ เบิกแล้ว' : '○ ยังไม่เบิก'}
    </span>
  );
}

export function getStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || status;
}
