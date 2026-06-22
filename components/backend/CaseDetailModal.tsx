import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MapPin, Phone, User, AlertTriangle, Clock } from 'lucide-react';

interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: any;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ isOpen, onClose, caseData }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 5: return 'bg-red-500 text-white';
      case 4: return 'bg-orange-600 text-white';
      case 3: return 'bg-orange-500 text-white';
      case 2: return 'bg-yellow-500 text-white';
      case 1: return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 5: return 'วิกฤต (ระดับ 5)';
      case 4: return 'รุนแรง (ระดับ 4)';
      case 3: return 'ปานกลาง (ระดับ 3)';
      case 2: return 'เฝ้าระวัง (ระดับ 2)';
      case 1: return 'ทั่วไป (ระดับ 1)';
      default: return `ระดับ ${severity}`;
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!caseData || !caseData.rawId) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/cases/${caseData.rawId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Optionally, refresh table or window
        window.location.reload();
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!caseData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`รายละเอียดเคส: ${caseData.id}`}>
      <div className="space-y-6">
        
        {/* Header section with severity and status */}
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {caseData.type}
            </h4>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>แจ้งเมื่อ: {caseData.time}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSeverityColor(caseData.severity)}`}>
              {getSeverityText(caseData.severity || 1)}
            </span>
            <Badge variant={
              caseData.status === 'รอการช่วยเหลือ' ? 'wait' :
              caseData.status === 'กำลังช่วยเหลือ' ? 'in_progress' :
              caseData.status === 'เสร็จสิ้น' ? 'completed' : 'info'
            }>
              {caseData.status}
            </Badge>
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-800" />

        {/* Reporter Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">ผู้แจ้งเหตุ</p>
              <p className="font-medium text-gray-900 dark:text-white">{caseData.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Phone className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">เบอร์ติดต่อ</p>
              <p className="font-medium text-gray-900 dark:text-white">{caseData.phone || '089-123-4567'}</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3 bg-gray-50 dark:bg-[#0b1325] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg shrink-0">
            <MapPin className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">พิกัด / ที่อยู่</p>
            <p className="font-medium text-gray-900 dark:text-white text-sm mt-1">
              13.7563, 100.5018 (ซอยสุขุมวิท 10, กรุงเทพมหานคร)
            </p>
            <a href="#" className="text-xs text-[#ff6600] hover:underline mt-1 inline-block">เปิดใน Google Maps</a>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
          <h5 className="font-bold text-sm text-gray-900 dark:text-white mb-3">ข้อมูลเพิ่มเติม (Smart Triage)</h5>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="flex justify-between pr-4">
              <span className="text-gray-500">จำนวนผู้ประสบภัย:</span>
              <span className="font-medium text-gray-900 dark:text-white">3 คน</span>
            </div>
            <div className="flex justify-between pl-4 border-l border-orange-200 dark:border-orange-800">
              <span className="text-gray-500">ผู้ป่วยติดเตียง:</span>
              <span className="font-medium text-red-600">1 คน</span>
            </div>
            <div className="flex justify-between pr-4 mt-1">
              <span className="text-gray-500">เด็ก/ผู้สูงอายุ:</span>
              <span className="font-medium text-gray-900 dark:text-white">2 คน</span>
            </div>
            <div className="flex justify-between pl-4 border-l border-orange-200 dark:border-orange-800 mt-1">
              <span className="text-gray-500">ระดับน้ำ:</span>
              <span className="font-medium text-orange-600">สูง (ระดับเอว)</span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="pt-4 flex gap-3">
          {caseData.status === 'รอการช่วยเหลือ' ? (
            <Button variant="primary" className="flex-1" onClick={() => updateStatus('in_progress')} disabled={isUpdating}>
              รับเคส (Accept)
            </Button>
          ) : caseData.status === 'กำลังช่วยเหลือ' ? (
            <>
              <Button variant="outline" className="flex-1">อัปเดตสถานะ</Button>
              <Button variant="primary" className="flex-1 bg-emerald-500 hover:bg-emerald-600 border-emerald-500" onClick={() => updateStatus('completed')} disabled={isUpdating}>
                เสร็จสิ้นภารกิจ
              </Button>
            </>
          ) : (
            <Button variant="outline" className="flex-1" onClick={onClose}>ปิด</Button>
          )}
        </div>
        
      </div>
    </Modal>
  );
};
