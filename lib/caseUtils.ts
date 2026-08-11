/**
 * Unified Disaster Case Helpers for OonJai Platform
 * Standardizes status and destination matching across all pages (Dashboard, Info, Heatmap, Reports, Cases, APIs)
 */

export const PENDING_STATUS_KEYWORDS = [
  'pending', 'รอการช่วยเหลือ', 'รอช่วยเหลือ', 'รอดำเนินการ', 'wait', 'new', 'open'
];

export const IN_PROGRESS_STATUS_KEYWORDS = [
  'in_progress', 'กำลังดำเนินการ', 'กำลังช่วยเหลือ', 'กำลังเข้าช่วยเหลือ', 'กำลังปฏิบัติงาน', 'assigned'
];

export const COMPLETED_STATUS_KEYWORDS = [
  'resolved', 'completed', 'เสร็จสิ้น', 'ช่วยเหลือสำเร็จ', 'ปลอดภัยแล้ว', 
  'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'ยุติการช่วยเหลือ'
];

export const CANCELLED_STATUS_KEYWORDS = [
  'cancelled', 'ยกเลิก'
];

export function isPendingCase(status?: string | null): boolean {
  if (!status) return true; // Default unassigned is pending
  const s = String(status).trim().toLowerCase();
  if (CANCELLED_STATUS_KEYWORDS.includes(s) || COMPLETED_STATUS_KEYWORDS.includes(s) || IN_PROGRESS_STATUS_KEYWORDS.includes(s)) {
    return false;
  }
  return PENDING_STATUS_KEYWORDS.some(k => s.includes(k)) || true;
}

export function isInProgressCase(status?: string | null): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return IN_PROGRESS_STATUS_KEYWORDS.some(k => s.includes(k));
}

export function isCompletedCase(status?: string | null): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return COMPLETED_STATUS_KEYWORDS.some(k => s.includes(k));
}

export function isCancelledCase(status?: string | null): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return CANCELLED_STATUS_KEYWORDS.some(k => s.includes(k));
}

export function isActiveCase(status?: string | null): boolean {
  if (!status) return true;
  return !isCompletedCase(status) && !isCancelledCase(status);
}

// Destination Helpers
export function isShelterDestination(destination?: string | null): boolean {
  if (!destination) return false;
  const d = String(destination).trim().toLowerCase();
  return d.includes('ศูนย์พักพิง') || d.includes('พิง') || d.includes('shelter');
}

export function isHospitalDestination(destination?: string | null): boolean {
  if (!destination) return false;
  const d = String(destination).trim().toLowerCase();
  return d.includes('โรงพยาบาล') || d.includes('แพทย์') || d.includes('รพ') || d.includes('hospital') || d.includes('medical');
}

export function isSuppliesDestination(destination?: string | null): boolean {
  if (!destination) return false;
  const d = String(destination).trim().toLowerCase();
  return d.includes('ถุงยังชีพ') || d.includes('เสบียง') || d.includes('ของแจก') || d.includes('supplies') || d.includes('rations');
}
