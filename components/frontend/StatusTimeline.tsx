import React from 'react';
import { Share2, CheckCircle2, Clock, Truck, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TimelineEvent {
  status: 'wait' | 'accepted' | 'in_progress' | 'completed';
  time: string;
  isCurrent?: boolean;
  isPassed?: boolean;
}

export const StatusTimeline = ({ 
  caseId = '001',
  currentStatus = 'wait',
  updates = [],
  rescuerInfo = null
}: {
  caseId?: string;
  currentStatus?: string;
  updates?: any[];
  rescuerInfo?: { name: string; phone: string } | null;
}) => {
  const ALL_STATUSES = ['wait', 'accepted', 'in_progress', 'completed'] as const;
  const currentIndex = ALL_STATUSES.indexOf(currentStatus as any) !== -1 ? ALL_STATUSES.indexOf(currentStatus as any) : 0;

  const events: TimelineEvent[] = ALL_STATUSES.map((status, index) => {
    const update = updates?.find(u => u.statusType === status);
    let timeStr = '';
    if (update && update.timestamp) {
      timeStr = new Date(update.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }

    return {
      status: status,
      time: timeStr,
      isCurrent: index === currentIndex,
      isPassed: index < currentIndex
    };
  });

  const getStatusDetails = (status: TimelineEvent['status'], isPassed: boolean, isCurrent: boolean) => {
    const activeColor = 'bg-emerald-500';
    const inactiveColor = 'bg-gray-300 dark:bg-gray-700';
    const color = isPassed || isCurrent ? activeColor : inactiveColor;
    
    switch (status) {
      case 'wait': return { label: 'รับเรื่องแล้ว', icon: Clock, color };
      case 'accepted': return { label: 'กำลังเดินทาง', icon: Truck, color };
      case 'in_progress': return { label: 'กำลังช่วยเหลือ รอดำเนินการ', icon: ShieldAlert, color };
      case 'completed': return { label: 'ช่วยเหลือสำเร็จ ไปยังจุดพักพิง', icon: CheckCircle2, color };
    }
  };

  return (
    <Card className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#ff6600]">การติดตามสถานะ : เคส {caseId}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Rescuer Info & Map */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">เจ้าหน้าที่รับผิดชอบ</h3>
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#0b1325] p-3 rounded-xl">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-bold">{rescuerInfo ? rescuerInfo.name : 'รอการมอบหมายเจ้าหน้าที่'}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <span className="w-3 h-3 text-green-500">📞</span> {rescuerInfo ? rescuerInfo.phone : '-'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">ข้อมูลเหตุ</h3>
            <div className="w-full h-32 bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 flex items-center justify-center">
              <p className="text-sm text-gray-500">แผนที่พิกัด</p>
            </div>
          </div>
        </div>

        {/* Right Side: Timeline */}
        <div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">สถานะ</h3>
          
          <div className="relative pl-6 space-y-6">
            {/* Vertical Line */}
            <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            
            {events.map((event, index) => {
              const details = getStatusDetails(event.status, !!event.isPassed, !!event.isCurrent);
              return (
                <div key={index} className={`relative flex items-center gap-4 ${event.isCurrent ? 'opacity-100' : event.isPassed ? 'opacity-80' : 'opacity-40'}`}>
                  {/* Dot */}
                  <div className={`absolute -left-[27px] w-6 h-6 rounded-full border-4 border-white dark:border-[#151b2c] ${details.color} flex items-center justify-center z-10`}>
                  </div>
                  
                  {/* Content */}
                  <div>
                    <p className={`font-medium ${event.isCurrent ? 'text-[#ff6600]' : ''}`}>
                      {details.label} {event.time && <span className="ml-1 text-sm text-gray-500">{event.time}</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <Button variant="secondary" className="flex gap-2">
              <Share2 className="w-4 h-4" /> แชร์สถานะ
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
