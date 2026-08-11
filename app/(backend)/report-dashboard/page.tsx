'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/backend/StatsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { isPendingCase, isInProgressCase, isCompletedCase, isCancelledCase, isShelterDestination, isHospitalDestination, isSuppliesDestination } from '@/lib/caseUtils';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Mail, 
  Calendar, 
  Sparkles, 
  Search, 
  Clock, 
  AlertTriangle,
  Users,
  Loader2,
  X,
  UserCheck,
  Globe,
  TrendingUp,
  FileBox,
  AlertCircle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';


const COMPLETED_STATUSES = [
  "completed",
  "resolved"
];

const CANCELLED_STATUSES = [
  "cancelled",
  "ยกเลิก"
];

export default function ReportDashboardPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportType, setExportType] = useState('cases');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [role, setRole] = useState<string>('volunteer');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tableSearch, setTableSearch] = useState('');

  // Volunteer Mode Filter: 'my_cases' | 'all_cases' (Default to my_cases for volunteer)
  const [volunteerScope, setVolunteerScope] = useState<'my_cases' | 'all_cases'>('my_cases');

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', cc: '', subject: 'รายงานสรุปเคสภัยพิบัติประจำวัน - ระบบอุ่นใจ (OonJai)', message: '', attachment: 'pdf' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let loggedUser: any = null;
        const stored = localStorage.getItem('oonjai_user');
        if (stored) {
          loggedUser = JSON.parse(stored);
          setCurrentUser(loggedUser);
          const userRole = loggedUser.role || 'volunteer';
          setRole(userRole);
          if (userRole !== 'admin') {
            setExportType('my_cases');
          }
        }

        const { data: snapshot, error } = await supabase.from('cases').select('*');
        if (error) throw error;

        const fetchedCases = (snapshot || []).map(d => {
          const uId = loggedUser?.uid || loggedUser?.id || '';
          const uName = loggedUser?.name || loggedUser?.username || loggedUser?.fullname || '';

          const cVolId = String(d.assigned_volunteer_id || d.volunteer_id || d.rescuer_id || '');
          const cVolName = String(d.assigned_volunteer_name || d.rescuer_name || d.volunteer_name || '');
          
          const isMyAssignedCase = (uId && cVolId === String(uId)) || (uName && cVolName.toLowerCase().includes(uName.toLowerCase()));

          return {
            ...d, 
            id: String(d.id),
            caseCode: d.case_number ? `CAS-${String(d.case_number).padStart(3, '0')}` : `CAS-${String(d.id).substring(0, 5)}`,
            formattedDate: d.created_at ? new Date(d.created_at).toLocaleString('th-TH') : '-',
            reporterName: d.name || d.reporter_name || 'ผู้แจ้งเหตุ',
            reporterPhone: d.phone || d.contact_phone || d.tel || '-',
            isBedridden: Number(d.bedridden) === 1 || d.bedridden === true || d.details?.includes('ติดเตียง'),
            isElderly: Number(d.elderly) === 1 || d.elderly === true || d.details?.includes('สูงอายุ') || d.details?.includes('เด็ก'),
            isMyAssignedCase: Boolean(isMyAssignedCase),
            assignedVolunteerName: d.assigned_volunteer_name || d.rescuer_name || '-'
          };
        });
        setCases(fetchedCases);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setLoading(false);
      }
    };

    fetchStats();

    const channel = supabase
      .channel(`custom-report-cases-channel-${Date.now()}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const COMPLETED_STATUSES = [
    "ปลอดภัยแล้ว", 
    "ส่งเข้าศูนย์พักพิงสำเร็จ", 
    "มอบถุงยังชีพเสร็จสิ้น", 
    "นำส่งโรงพยาบาลแล้ว", 
    "เสร็จสิ้น", 
    "ยุติการช่วยเหลือ",
    "completed",
    "resolved"
  ];
  
  

  const getSeverityText = (level: number) => {
    switch (level) {
      case 5: return 'พื้นที่เสี่ยงวิกฤต (ระดับ 5)';
      case 4: return 'พื้นที่เสี่ยงรุนแรง (ระดับ 4)';
      case 3: return 'พื้นที่เสี่ยงปานกลาง (ระดับ 3)';
      case 2: return 'พื้นที่เฝ้าระวัง (ระดับ 2)';
      case 1: default: return 'พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)';
    }
  };

  // Quick Date Range Preset Selector
  const setPresetRange = (preset: 'today' | '7d' | '30d' | 'all') => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    if (preset === 'today') {
      // today
    } else if (preset === '7d') {
      start.setDate(end.getDate() - 7);
    } else if (preset === '30d') {
      start.setDate(end.getDate() - 30);
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Filter cases by Role (Volunteer vs Admin) and Date Range
  const roleAndDateFilteredCases = useMemo(() => {
    return cases.filter(c => {
      // Volunteer Scope Filter
      if (role !== 'admin' && volunteerScope === 'my_cases') {
        if (!c.isMyAssignedCase) return false;
      }

      // Date Range Filter
      if (!startDate && !endDate) return true;
      const dateField = c.created_at || c.timestamp || '';
      if (!dateField) return false;
      
      // Parse dates properly
      const parsedDateString = dateField.replace(' ', 'T');
      const itemDate = new Date(parsedDateString).getTime();
      
      const sDate = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const eDate = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;
      
      return itemDate >= sDate && itemDate <= eDate;
    });
  }, [cases, role, volunteerScope, startDate, endDate]);

  // Table Searched Cases
  const tableCases = useMemo(() => {
    if (!tableSearch.trim()) return roleAndDateFilteredCases;
    const query = tableSearch.toLowerCase();
    return roleAndDateFilteredCases.filter(c => 
      c.caseCode.toLowerCase().includes(query) ||
      c.reporterName.toLowerCase().includes(query) ||
      c.reporterPhone.includes(query) ||
      (c.details && c.details.toLowerCase().includes(query))
    );
  }, [roleAndDateFilteredCases, tableSearch]);

  const reportStats = useMemo(() => {
    let total = 0, completed = 0, inProgress = 0, pending = 0, l5 = 0, l4 = 0, l3 = 0, l2 = 0, l1 = 0, vulnerableCount = 0;
    roleAndDateFilteredCases.forEach(d => {
      const status = (d.status || '').toLowerCase();
      
      // Skip cancelled cases
      if (isCancelledCase(status)) {
        return; 
      }

      total++;
      if (isCompletedCase(status)) completed++;
      else if (isInProgressCase(status)) inProgress++;
      else pending++;
      
      if (d.isBedridden || d.isElderly) vulnerableCount++;

      const severity = Number(d.severity) || 1;
      if (severity === 5) l5++;
      else if (severity === 4) l4++;
      else if (severity === 3) l3++;
      else if (severity === 2) l2++;
      else l1++;
    });

    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
    const criticalPercent = total > 0 ? ((l5 / total) * 100).toFixed(1) : '0.0';
    return { total, completed, inProgress, pending, successRate, l5, l4, l3, l2, l1, vulnerableCount, criticalPercent };
  }, [roleAndDateFilteredCases]);

  // Today Stats for active scope
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCases = roleAndDateFilteredCases.filter(c => c.created_at && c.created_at.startsWith(todayStr));
  const todayTotal = todayCases.length;
  const todayCompleted = todayCases.filter(c => COMPLETED_STATUSES.includes(c.status?.toLowerCase())).length;
  const todayActive = todayTotal - todayCompleted;

  // Real Native Excel (.xlsx) File Export
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      let excelData: any[] = [];
      const uId = currentUser?.id || currentUser?.uid || '';
      const uName = currentUser?.name || currentUser?.username || currentUser?.fullname || '';

      // --- CASE 1: Volunteer My Logs (Combine Cases + Activity Logs) ---
      if (exportType === 'my_logs') {
        let casesReq = supabase.from('cases').select('*');
        let logsReq = supabase.from('activity_logs').select('*');

        if (startDate && endDate) {
          const startIso = new Date(`${startDate}T00:00:00`).toISOString();
          const endIso = new Date(`${endDate}T23:59:59`).toISOString();
          casesReq = casesReq.gte('created_at', startIso).lte('created_at', endIso);
          logsReq = logsReq.gte('timestamp', startIso).lte('timestamp', endIso);
        }

        const [{ data: rawCases }, { data: rawLogs }] = await Promise.all([casesReq, logsReq]);

        let volunteerCases = (rawCases || []).filter(c => {
          const cVolId = String(c.assigned_volunteer_id || c.volunteer_id || c.rescuer_id || '');
          const cVolName = String(c.assigned_volunteer_name || c.rescuer_name || c.volunteer_name || '');
          return (uId && cVolId === String(uId)) || (uName && cVolName.toLowerCase().includes(uName.toLowerCase()));
        }).map(c => ({
          'เวลาบันทึก/ปฏิบัติงาน': c.resolved_at ? new Date(c.resolved_at).toLocaleString('th-TH') : (c.updated_at ? new Date(c.updated_at).toLocaleString('th-TH') : new Date(c.created_at).toLocaleString('th-TH')),
          'ผู้ปฏิบัติงาน': c.assigned_volunteer_name || c.volunteer_name || uName,
          'กิจกรรม/การดำเนินการ': `ปฏิบัติภารกิจกู้ภัย เคส #${c.case_number || c.id} (${c.type || 'ฉุกเฉิน'}) - สถานะ: ${COMPLETED_STATUSES.includes((c.status || '').toLowerCase()) ? 'ช่วยเหลือสำเร็จ' : c.status === 'in_progress' ? 'กำลังช่วยเหลือ' : c.status}`,
          'รหัสเคสอ้างอิง': c.case_number ? `CAS-${String(c.case_number).padStart(3, '0')}` : `CAS-${String(c.id).substring(0, 5)}`,
          'รายละเอียดเพิ่มเติม': `ผู้แจ้ง: ${c.name || c.reporter_name || '-'} (${c.phone || '-'}) | ระดับน้ำ: ${c.water_level || '-'}`
        }));

        let volunteerLogs = (rawLogs || []).filter(l => {
          const logUser = String(l.user || l.user_name || l.volunteer_name || l.user_id || l.action_by || '');
          return (uId && String(l.user_id) === String(uId)) || (uName && logUser.toLowerCase().includes(uName.toLowerCase()));
        }).map(l => ({
          'เวลาบันทึก/ปฏิบัติงาน': l.timestamp ? new Date(l.timestamp).toLocaleString('th-TH') : '-',
          'ผู้ปฏิบัติงาน': l.user || l.user_name || uName,
          'กิจกรรม/การดำเนินการ': l.action || l.details || 'การใช้งานระบบ',
          'รหัสเคสอ้างอิง': l.case_id ? `CAS-${l.case_id}` : '-',
          'รายละเอียดเพิ่มเติม': l.ip_address ? `IP: ${l.ip_address}` : '-'
        }));

        const combinedLogs = [...volunteerCases, ...volunteerLogs];
        if (combinedLogs.length === 0) {
          alert('ไม่พบประวัติการทำงานของคุณในช่วงเวลาที่เลือก');
          setIsExportingExcel(false);
          return;
        }
        excelData = combinedLogs;

      // --- CASE 2: Other Datasets (cases, my_cases, users, logs, safe) ---
      } else {
        const targetCollection = 
          exportType === 'users' ? 'volunteers' : 
          exportType === 'logs' ? 'activity_logs' : 
          exportType === 'safe' ? 'safe_reports' : 
          'cases';
        const dateField = (exportType === 'logs' || exportType === 'safe') ? 'timestamp' : 'created_at';

        let req = supabase.from(targetCollection).select('*');

        if (startDate && endDate) {
          const startIso = new Date(`${startDate}T00:00:00`).toISOString();
          const endIso = new Date(`${endDate}T23:59:59`).toISOString();
          req = req.gte(dateField, startIso).lte(dateField, endIso);
        }

        const { data: rawData, error } = await req;
        
        if (error || !rawData || rawData.length === 0) {
          alert('ไม่มีข้อมูลในช่วงเวลาที่เลือก');
          setIsExportingExcel(false);
          return;
        }

        if (exportType === 'cases' || exportType === 'my_cases') {
          let exportableCases = rawData;
          if (role !== 'admin' || exportType === 'my_cases') {
            exportableCases = rawData.filter(c => {
              const cVolId = String(c.assigned_volunteer_id || c.volunteer_id || c.rescuer_id || '');
              const cVolName = String(c.assigned_volunteer_name || c.rescuer_name || c.volunteer_name || '');
              return (uId && cVolId === String(uId)) || (uName && cVolName.toLowerCase().includes(uName.toLowerCase()));
            });
          }

          if (exportableCases.length === 0) {
            alert('ไม่พบรายการเคสที่ได้รับมอบหมายในช่วงเวลาที่เลือก');
            setIsExportingExcel(false);
            return;
          }

          excelData = exportableCases.map(c => ({
            'รหัสเคส': c.case_number ? `CAS-${String(c.case_number).padStart(3, '0')}` : `CAS-${String(c.id).substring(0, 5)}`,
            'วันที่แจ้งเหตุ': c.created_at ? new Date(c.created_at).toLocaleString('th-TH') : '-',
            'ชื่อผู้แจ้งเหตุ': c.name || c.reporter_name || 'ผู้แจ้งเหตุ',
            'เบอร์โทรศัพท์': c.phone || c.contact_phone || c.tel || '-',
            'ประเภทความช่วยเหลือ': c.type === 'sos' ? 'SOS ฉุกเฉิน' : (c.type || 'ไม่ระบุ'),
            'ระดับความรุนแรง': getSeverityText(Number(c.severity) || 1),
            'สถานะการช่วยเหลือ': COMPLETED_STATUSES.includes((c.status || '').toLowerCase()) ? 'ช่วยเหลือสำเร็จ' : c.status === 'in_progress' ? 'กำลังช่วยเหลือ' : 'รอดำเนินการ',
            'จำนวนผู้ประสบภัย (คน)': Number(c.peopleCount) || 1,
            'กลุ่มเปราะบาง': (c.bedridden ? 'ผู้ป่วยติดเตียง ' : '') + (c.elderly ? 'ผู้สูงอายุ/เด็ก' : (!c.bedridden ? 'ไม่มี' : '')),
            'ระดับน้ำ': c.water_level || c.waterLevel || '-',
            'รายละเอียดเหตุการณ์': c.details || '',
            'ละติจูด': c.latitude || '',
            'ลองจิจูด': c.longitude || '',
            'ผู้เข้าช่วยเหลือ': c.assigned_volunteer_name || c.rescuer_name || '-'
          }));
        } else {
          excelData = rawData;
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "รายงานสรุปภัยพิบัติ");

      const dateSuffix = startDate ? `_${startDate}_to_${endDate}` : '_AllTime';
      XLSX.writeFile(workbook, `OonJai_${exportType}${dateSuffix}.xlsx`);
    } catch (err) {
      console.error("Export Excel Error:", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ Excel");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // PDF Export Fallback to Native Browser Print
  const handleExportPDF = () => {
    setIsExportingPDF(true);
    // html2canvas ไม่รองรับสี oklch/lab ของ Tailwind v4 
    // จึงใช้ Native Browser Print (Save as PDF) แทน ซึ่งคมชัดกว่าและไม่เพี้ยน
    setTimeout(() => {
      window.print();
      setIsExportingPDF(false);
    }, 500);
  };

  const handleSendEmail = () => {
    if (!emailData.to) {
      alert('กรุณาระบุอีเมลผู้รับ');
      return;
    }
    
    // Use mailto scheme for zero-cost client-side email
    const subject = encodeURIComponent(emailData.subject || 'รายงานสรุปเคสภัยพิบัติประจำวัน - ระบบอุ่นใจ (OonJai)');
    const bodyText = 
      `เรียนท่านที่เกี่ยวข้อง,\n\n` +
      `รายงานสรุปผลการดำเนินงานช่วยเหลือ ระบบอุ่นใจ (OonJai)\n` +
      `ช่วงเวลา: ${startDate && endDate ? `${startDate} ถึง ${endDate}` : 'สะสมทั้งหมด'}\n\n` +
      `ข้อมูลสถิติเบื้องต้น:\n` +
      `- เคสทั้งหมด: ${reportStats.total} เคส\n` +
      `- ช่วยเหลือสำเร็จแล้ว: ${reportStats.completed} เคส\n` +
      `- กำลังรอกู้ภัย/ดำเนินการ: ${reportStats.pending + reportStats.inProgress} เคส\n` +
      `- อัตราความสำเร็จ: ${reportStats.successRate}%\n\n` +
      `* หมายเหตุ: คุณสามารถส่งออกไฟล์ ${emailData.attachment.toUpperCase()} จากในระบบ และแนบไปกับอีเมลฉบับนี้ได้เลย\n\n` +
      `ขอแสดงความนับถือ,\n` +
      `ศูนย์ประสานงานกู้ภัย OonJai`;
      
    const body = encodeURIComponent(bodyText);
    const cc = emailData.cc ? `&cc=${encodeURIComponent(emailData.cc)}` : '';
    
    // Open user's default email client
    window.location.href = `mailto:${emailData.to}?subject=${subject}${cc}&body=${body}`;
    
    setIsEmailModalOpen(false);
    setEmailData({ to: '', cc: '', subject: 'รายงานสรุปเคสภัยพิบัติประจำวัน - ระบบอุ่นใจ (OonJai)', message: '', attachment: 'pdf' });
  };

  if (loading) {
    return (
      <>
        <DashboardHeader title="รายงานและส่งออก" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  const volunteerAssignedCount = cases.filter(c => c.isMyAssignedCase).length;

  return (
    <>
      <DashboardHeader title="รายงานและส่งออก" />
      <div className="w-full mx-auto py-6 px-4 space-y-6 md:space-y-8 pb-32 md:pb-10 max-w-[100vw] overflow-hidden">
        <div id="printable-report-content" className="space-y-6 sm:space-y-8 print:p-6 print:bg-white print:text-black w-full min-w-0">
          
          {/* Print Header */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 break-words">ศูนย์ประสานงานกู้ภัยและจัดการภัยพิบัติ (OonJai System)</h1>
                <p className="text-sm font-medium text-slate-600 break-words">
                  {role === 'admin' ? 'รายงานสรุปผลการดำเนินงานและสถิติภาพรวม' : `รายงานผลการดำเนินงาน: ${currentUser?.name || 'อาสาสมัคร'}`}
                </p>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-600 min-w-0">
                <p>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
                <p>ข้อมูลช่วง: {startDate && endDate ? `${startDate} ถึง ${endDate}` : 'สะสมทั้งหมด'}</p>
              </div>
            </div>
          </div>

          {/* Volunteer Banner */}
          {role !== 'admin' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex flex-col gap-4 print:hidden w-full min-w-0">
              <div className="flex items-start gap-3 w-full min-w-0">
                <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white break-words leading-tight">
                    ข้อมูลส่วนตัว: {currentUser?.name || 'ผู้เข้าช่วยเหลือ'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 break-words">
                    สถิติและรายการเคสที่คุณรับผิดชอบ ({volunteerAssignedCount} เคส)
                  </p>
                </div>
              </div>

              </div>
          )}

          {/* AI Exec Summary */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 shadow-sm border border-slate-800 text-white print:border-slate-300 print:bg-white print:text-slate-900 print:shadow-none w-full min-w-0">
            <div className="space-y-3 w-full min-w-0">
              <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Executive Summary</span>
              </div>
              <h2 className="text-xl font-bold leading-tight break-words">
                {role === 'admin' ? 'วิเคราะห์เชิงยุทธศาสตร์ภัยพิบัติ' : 'สรุปผลการช่วยเหลือของอาสาสมัคร'}
              </h2>
              <div className="text-slate-400 print:text-slate-600 text-sm leading-relaxed break-words whitespace-normal w-full">
                {role === 'admin' ? (
                  <p>
                    วิกฤตระดับ 5 สะสม <strong className="text-white print:text-black">{reportStats.l5} เคส ({reportStats.criticalPercent}%)</strong>, 
                    กลุ่มเปราะบาง <strong className="text-white print:text-black">{reportStats.vulnerableCount} เคส</strong>, 
                    ความสำเร็จในการกู้ภัยรวม <strong className="text-emerald-400 print:text-emerald-600">{reportStats.successRate}%</strong>
                  </p>
                ) : (
                  <p>
                    ช่วยเหลือสำเร็จ <strong className="text-emerald-400 print:text-emerald-600">{reportStats.completed} เคส</strong> 
                    จากทั้งหมด <strong className="text-white print:text-black">{reportStats.total} เคส</strong> 
                    (อัตราความสำเร็จ <strong className="text-orange-300 print:text-orange-600">{reportStats.successRate}%</strong>)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white dark:bg-[#151b2c] p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4 print:hidden w-full min-w-0">
            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm shrink-0 min-w-0">
              <Calendar className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate break-words">ช่วงเวลาข้อมูล</span>
            </div>

            <div className="flex flex-col gap-3 w-full min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl w-full min-w-0">
                <button onClick={() => setPresetRange('today')} className={`px-2 py-2 rounded-lg text-xs font-bold transition-all text-center min-w-0 break-words ${startDate && startDate === todayStr ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>วันนี้</button>
                <button onClick={() => setPresetRange('7d')} className="px-2 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center min-w-0 break-words">7 วัน</button>
                <button onClick={() => setPresetRange('30d')} className="px-2 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center min-w-0 break-words">30 วัน</button>
                <button onClick={() => setPresetRange('all')} className={`px-2 py-2 rounded-lg text-xs font-bold transition-all text-center min-w-0 break-words ${!startDate && !endDate ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>ทั้งหมด</button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full min-w-0">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none min-w-0" />
                <span className="hidden sm:block text-slate-400 shrink-0">-</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none min-w-0" />
                {(startDate || endDate) && (
                  <button onClick={() => { setStartDate(''); setEndDate(''); }} className="w-full sm:w-auto p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl shrink-0 flex justify-center items-center">
                    <X className="w-4 h-4" />
                  </button>
                )}
            </div>
          </div>

          {/* Export Hub (Placed Right Below Date Range Filter) */}
          <div className="bg-slate-900 dark:bg-[#111c35] p-5 rounded-2xl shadow-lg border border-slate-800 w-full print:hidden min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-700 pb-3 w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 break-words">
                  <Printer className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>ส่งออกรายงาน (Export Hub)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ช่วงเวลาส่งออก: <span className="text-orange-300 font-bold">{startDate && endDate ? `${startDate} ถึง ${endDate}` : 'สะสมทั้งหมด (All Time)'}</span>
                </p>
              </div>

              {/* Role badge */}
              <div className="text-xs px-3 py-1 rounded-full font-bold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5 shrink-0">
                {role === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>สิทธิ์แอดมิน (ข้อมูลทั้งระบบ)</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-orange-400" />
                    <span>สิทธิ์อาสาสมัคร ({currentUser?.name || 'เคสของฉัน'})</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 w-full min-w-0">
              <div className="space-y-1.5 w-full min-w-0">
                <label className="block text-xs font-bold text-slate-400">ชุดข้อมูลที่จะส่งออก (Dataset)</label>
                <select 
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full border border-slate-700 rounded-xl px-4 py-2.5 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-orange-500 text-xs font-bold min-w-0"
                >
                  {role === 'admin' ? (
                    <>
                      <option value="cases">เคสฉุกเฉินทั้งหมด (All Cases)</option>
                      <option value="users">ข้อมูลอาสาสมัครทั้งหมด (Volunteers)</option>
                      <option value="logs">ประวัติการทำงานระบบ (System Logs)</option>
                      <option value="safe">รายชื่อผู้ปลอดภัยทั้งหมด (Safe Reports)</option>
                    </>
                  ) : (
                    <>
                      <option value="my_cases">เคสฉุกเฉินเฉพาะของฉัน (My Assigned Cases)</option>
                      <option value="my_logs">ประวัติการทำงานเฉพาะของฉัน (My Personal Rescue Logs)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full min-w-0">
                <button
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="flex items-center justify-center gap-2 p-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl transition-colors disabled:opacity-50 min-w-0 w-full font-bold text-xs"
                >
                  {isExportingExcel ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <span>ส่งออก Excel (.xlsx)</span>
                </button>
                
                <button
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="flex items-center justify-center gap-2 p-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl transition-colors disabled:opacity-50 min-w-0 w-full font-bold text-xs"
                >
                  {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FileText className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>บันทึกเป็น PDF</span>
                </button>

                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="flex items-center justify-center gap-2 p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl transition-colors min-w-0 w-full font-bold text-xs"
                >
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>ส่งรายงานทางอีเมล</span>
                </button>
              </div>
            </div>
          </div>

          {/* Daily Stats */}
          <div className="bg-orange-50/50 dark:bg-orange-950/20 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/40 print:border-slate-300 w-full min-w-0">
            <h3 className="text-sm font-bold text-orange-900 dark:text-orange-100 mb-4 flex items-center gap-2 break-words">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <span>สถิติรายวัน ({new Date().toLocaleDateString('th-TH')})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0 w-full">
              <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-orange-100/50 dark:border-orange-800/30 text-center shadow-sm min-w-0 w-full">
                <p className="text-xs font-bold text-slate-500 mb-1 break-words">รับแจ้ง (เคส)</p>
                <p className="text-2xl font-black text-orange-600 break-words">{todayTotal}</p>
              </div>
              <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-orange-100/50 dark:border-orange-800/30 text-center shadow-sm min-w-0 w-full">
                <p className="text-xs font-bold text-slate-500 mb-1 break-words">รอดำเนินการ</p>
                <p className="text-2xl font-black text-slate-700 dark:text-slate-300 break-words">{todayActive}</p>
              </div>
              <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-orange-100/50 dark:border-orange-800/30 text-center shadow-sm min-w-0 w-full">
                <p className="text-xs font-bold text-slate-500 mb-1 break-words">สำเร็จแล้ว</p>
                <p className="text-2xl font-black text-emerald-600 break-words">{todayCompleted}</p>
              </div>
            </div>
          </div>

          {/* KPI */}
          <div className="space-y-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 break-words">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{volunteerScope === 'my_cases' ? 'สถิติเคสของฉัน' : 'สถิติรวมทั้งหมด'} {startDate && endDate ? `(${startDate} ถึง ${endDate})` : ''}</span>
              </h3>
              
              {role !== 'admin' && (
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 min-w-0 w-full sm:w-auto shrink-0 print:hidden">
                  <button
                    type="button"
                    onClick={() => setVolunteerScope('my_cases')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-0 ${volunteerScope === 'my_cases' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-slate-500'}`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">เคสของฉัน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVolunteerScope('all_cases')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-0 ${volunteerScope === 'all_cases' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-slate-500'}`}
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">สถิติรวม</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0 w-full">
              <StatsCard 
                title="เคสทั้งหมด" 
                value={reportStats.total.toString()} 
                icon={Users} 
                colorClass="text-blue-500 bg-blue-100 dark:bg-blue-900/30" 
              />
              <StatsCard 
                title="ช่วยเหลือสำเร็จ" 
                value={reportStats.completed.toString()} 
                icon={CheckCircle2} 
                colorClass="text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30" 
              />
              <StatsCard 
                title="กำลังดำเนินการ" 
                value={(reportStats.pending + reportStats.inProgress).toString()} 
                icon={AlertCircle} 
                colorClass="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" 
              />
              <StatsCard 
                title="อัตราสำเร็จ (%)" 
                value={reportStats.successRate.toString()} 
                icon={TrendingUp} 
                colorClass="text-orange-500 bg-orange-100 dark:bg-orange-900/30" 
              />
            </div>
          </div>

          {/* Triage Bar Chart */}
          <Card className="p-5 bg-white dark:bg-[#151b2c] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 break-words">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>ระดับความเสี่ยงฉุกเฉิน (Triage)</span>
            </h3>
            <div className="space-y-4 w-full min-w-0">
              {[
                { level: 5, label: 'ระดับ 5 (วิกฤตหนัก)', color: 'bg-red-600', count: reportStats.l5 },
                { level: 4, label: 'ระดับ 4 (เสี่ยงรุนแรง)', color: 'bg-orange-500', count: reportStats.l4 },
                { level: 3, label: 'ระดับ 3 (เสี่ยงปานกลาง)', color: 'bg-yellow-500', count: reportStats.l3 },
                { level: 2, label: 'ระดับ 2 (เฝ้าระวัง)', color: 'bg-blue-500', count: reportStats.l2 },
                { level: 1, label: 'ระดับ 1 (ปลอดภัย)', color: 'bg-emerald-500', count: reportStats.l1 },
              ].map((opt, i) => {
                const percentage = reportStats.total > 0 ? (opt.count / reportStats.total) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col gap-2 w-full min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end text-xs font-bold gap-1 w-full min-w-0">
                      <span className="text-slate-600 dark:text-slate-400 break-words">{opt.label}</span>
                      <span className="text-slate-900 dark:text-white break-words">
                        {opt.count} เคส <span className="text-slate-400 font-normal ml-1">({percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                      <div className={`h-full rounded-full transition-all duration-1000 ${opt.color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Table */}
          <Card className="p-4 sm:p-5 bg-white dark:bg-[#151b2c] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden print:border-slate-300 w-full min-w-0">
            <div className="flex flex-col gap-4 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4 min-w-0 w-full">
              <div className="min-w-0 w-full">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 break-words">
                  <FileBox className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>รายการข้อมูล ({tableCases.length} รายการ)</span>
                </h3>
              </div>

              <div className="relative w-full print:hidden min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none min-w-0"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">รหัส</th>
                    <th className="p-3">วันที่</th>
                    <th className="p-3">ผู้แจ้ง</th>
                    <th className="p-3">ระดับ</th>
                    <th className="p-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {tableCases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">ไม่พบข้อมูล</td>
                    </tr>
                  ) : (
                    tableCases.slice(0, 10).map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-bold text-orange-600 break-words">{c.caseCode}</td>
                        <td className="p-3 break-words">{c.formattedDate}</td>
                        <td className="p-3 font-bold break-words">
                          {c.reporterName}
                          <div className="text-slate-500 font-normal mt-0.5">{c.reporterPhone}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${Number(c.severity) === 5 ? 'bg-red-100 text-red-700' : Number(c.severity) === 4 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                            ระดับ {c.severity || 1}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${COMPLETED_STATUSES.includes((c.status || '').toLowerCase()) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {COMPLETED_STATUSES.includes((c.status || '').toLowerCase()) ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {tableCases.length > 10 && (
              <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">* แสดง 10 รายการแรก ส่งออกเพื่อดูทั้งหมด</div>
            )}
          </Card>
        </div>

        </div>
      </div>

      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                ส่งอีเมลรายงาน
              </h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
              <div className="space-y-1 w-full min-w-0">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">อีเมลผู้รับ (To) *</label>
                <input type="email" value={emailData.to} onChange={e => setEmailData({...emailData, to: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-orange-500 min-w-0" placeholder="admin@example.com" />
              </div>
              <div className="space-y-1 w-full min-w-0">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">สำเนา (CC)</label>
                <input type="email" value={emailData.cc} onChange={e => setEmailData({...emailData, cc: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-orange-500 min-w-0" />
              </div>
              <div className="space-y-1 w-full min-w-0">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">หัวข้อ (Subject)</label>
                <input type="text" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-orange-500 min-w-0" />
              </div>
              
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-xl text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="break-words">ระบบจะเปิดแอปอีเมลของคุณขึ้นมาพร้อมแนบรายละเอียดสถิติเบื้องต้นให้โดยอัตโนมัติ คุณสามารถแนบไฟล์ PDF/Excel เพิ่มเติมได้ก่อนกดส่ง</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
              <button onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">ยกเลิก</button>
              <button onClick={handleSendEmail} disabled={!emailData.to} className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 transition-colors">เปิดแอปอีเมล</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
