'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/backend/StatsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { isPendingCase, isInProgressCase, isCompletedCase, isCancelledCase, isShelterDestination, isHospitalDestination, isSuppliesDestination } from '@/lib/caseUtils';
import { getSeverityText } from '@/lib/utils';
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
  ShieldCheck,
  Filter,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const COMPLETED_STATUSES = [
  "completed",
  "resolved",
  "ปลอดภัยแล้ว",
  "ส่งเข้าศูนย์พักพิงสำเร็จ",
  "มอบถุงยังชีพเสร็จสิ้น",
  "นำส่งโรงพยาบาลแล้ว",
  "เสร็จสิ้น",
  "ยุติการช่วยเหลือ"
];

export default function ReportDashboardPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [volunteersList, setVolunteersList] = useState<any[]>([]);
  const [safeReportsList, setSafeReportsList] = useState<any[]>([]);
  const [activityLogsList, setActivityLogsList] = useState<any[]>([]);
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

      const [{ data: casesData }, { data: volData }, { data: safeData }, { data: logData }] = await Promise.all([
        supabase.from('cases').select('*').order('created_at', { ascending: false }),
        supabase.from('volunteers').select('*').order('created_at', { ascending: false }),
        supabase.from('safe_reports').select('*').order('timestamp', { ascending: false }),
        supabase.from('activity_logs').select('*').order('timestamp', { ascending: false })
      ]);

      const fetchedCases = (casesData || []).map(d => {
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
          isBedridden: Number(d.bedridden) === 1 || d.bedridden === true || String(d.details || '').includes('ติดเตียง'),
          isElderly: Number(d.elderly) === 1 || d.elderly === true || String(d.details || '').includes('สูงอายุ') || String(d.details || '').includes('เด็ก'),
          isMyAssignedCase: Boolean(isMyAssignedCase),
          assignedVolunteerName: d.assigned_volunteer_name || d.rescuer_name || '-'
        };
      });

      setCases(fetchedCases);
      if (volData) setVolunteersList(volData);
      if (safeData) setSafeReportsList(safeData);
      if (logData) setActivityLogsList(logData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel(`custom-report-cases-channel-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      if (role !== 'admin' && volunteerScope === 'my_cases') {
        if (!c.isMyAssignedCase) return false;
      }

      if (!startDate && !endDate) return true;
      const dateField = c.created_at || c.timestamp || '';
      if (!dateField) return false;
      
      const parsedDateString = dateField.replace(' ', 'T');
      const itemDate = new Date(parsedDateString).getTime();
      
      const sDate = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const eDate = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;
      
      return itemDate >= sDate && itemDate <= eDate;
    });
  }, [cases, role, volunteerScope, startDate, endDate]);

  const reportStats = useMemo(() => {
    let total = 0, completed = 0, inProgress = 0, pending = 0, l5 = 0, l4 = 0, l3 = 0, l2 = 0, l1 = 0, vulnerableCount = 0;
    roleAndDateFilteredCases.forEach(d => {
      const status = (d.status || '').toLowerCase();
      if (isCancelledCase(status)) return;

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

  // Accurate Today Statistics Calculation
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  const todayStats = useMemo(() => {
    let todayTotal = 0;
    let todayActive = 0;
    let todayCompleted = 0;

    cases.forEach(c => {
      if (role !== 'admin' && volunteerScope === 'my_cases' && !c.isMyAssignedCase) {
        return;
      }
      const dateField = c.created_at || c.timestamp || '';
      if (!dateField) return;

      const t = new Date(dateField.replace(' ', 'T')).getTime();
      if (t >= todayStart && t <= todayEnd) {
        const status = (c.status || '').toLowerCase();
        if (isCancelledCase(status)) return;

        todayTotal++;
        if (isCompletedCase(status)) {
          todayCompleted++;
        } else {
          todayActive++;
        }
      }
    });

    return { todayTotal, todayActive, todayCompleted };
  }, [cases, role, volunteerScope, todayStart, todayEnd]);

  // Dynamic Dataset Preview Table based on selected exportType
  const dynamicDatasetPreview = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();

    // 1. Volunteer Dataset
    if (exportType === 'users') {
      let list = volunteersList;
      if (q) {
        list = list.filter(v => 
          (v.name || '').toLowerCase().includes(q) || 
          (v.phone || '').includes(q) || 
          (v.agency || '').toLowerCase().includes(q)
        );
      }
      return {
        title: `ข้อมูลอาสาสมัครทั้งหมด (${list.length} รายการ)`,
        headers: ['ชื่อ-นามสกุล', 'เบอร์โทรศัพท์', 'สังกัด/หน่วยงาน', 'จังหวัด', 'สถานะปฏิบัติงาน'],
        rows: list.slice(0, 15).map(v => [
          v.name || 'อาสาสมัคร',
          v.phone || '-',
          v.agency || '-',
          v.province || '-',
          v.is_online ? 'พร้อมปฏิบัติงาน' : (v.status || 'ออฟไลน์')
        ])
      };
    }

    // 2. Safe Reports Dataset
    if (exportType === 'safe') {
      let list = safeReportsList;
      if (q) {
        list = list.filter(s => 
          (s.name || '').toLowerCase().includes(q) || 
          (s.phone || '').includes(q) || 
          (s.agency || '').toLowerCase().includes(q) ||
          (s.destination || '').toLowerCase().includes(q)
        );
      }
      return {
        title: `รายชื่อผู้ปลอดภัยทั้งหมด (${list.length} รายการ)`,
        headers: ['ชื่อ-นามสกุล', 'เบอร์โทรศัพท์', 'หน่วยงานที่นำส่ง', 'จุดหมายปลายทาง', 'เวลาที่บันทึก'],
        rows: list.slice(0, 15).map(s => [
          s.name || 'ไม่ระบุชื่อ',
          s.phone || '-',
          s.agency || '-',
          s.destination || '-',
          s.timestamp ? new Date(s.timestamp).toLocaleString('th-TH') : '-'
        ])
      };
    }

    // 3. Activity Logs Dataset (System Audit Logs / My Personal Rescue Logs)
    if (exportType === 'logs' || exportType === 'my_logs') {
      const uId = currentUser?.id || currentUser?.uid || '';
      const uName = currentUser?.name || currentUser?.username || currentUser?.fullname || '';
      
      let list = activityLogsList;
      if (exportType === 'my_logs') {
        list = list.filter(l => {
          const logUser = String(l.user || l.user_name || l.volunteer_name || l.user_id || l.action_by || '');
          return (uId && String(l.user_id) === String(uId)) || (uName && logUser.toLowerCase().includes(uName.toLowerCase()));
        });
      }

      if (q) {
        list = list.filter(l => 
          (l.action || l.details || '').toLowerCase().includes(q) || 
          (l.user || l.user_name || '').toLowerCase().includes(q)
        );
      }
      return {
        title: exportType === 'my_logs' ? `ประวัติการทำงานเฉพาะของฉัน (${list.length} รายการ)` : `ประวัติการทำงานระบบ (${list.length} รายการ)`,
        headers: ['เวลาที่บันทึก', 'ผู้ใช้งาน', 'การกระทำ/กิจกรรม', 'รหัสเคสอ้างอิง', 'รายละเอียดเพิ่มเติม'],
        rows: list.slice(0, 15).map(l => [
          l.timestamp ? new Date(l.timestamp).toLocaleString('th-TH') : '-',
          l.user || l.user_name || uName,
          l.action || 'การใช้งานระบบ',
          l.case_id ? `CAS-${l.case_id}` : '-',
          l.details || l.ip_address || '-'
        ])
      };
    }

    // 4. Emergency Cases Datasets (default)
    let filtered = roleAndDateFilteredCases;
    if (exportType === 'shelter_cases') filtered = filtered.filter(c => isShelterDestination(c.destination));
    else if (exportType === 'hospital_cases') filtered = filtered.filter(c => isHospitalDestination(c.destination));
    else if (exportType === 'supplies_cases') filtered = filtered.filter(c => isSuppliesDestination(c.destination));
    else if (exportType === 'critical_cases') filtered = filtered.filter(c => Number(c.severity) === 5);
    else if (exportType === 'vulnerable_cases') filtered = filtered.filter(c => c.isBedridden || c.isElderly);

    if (q) {
      filtered = filtered.filter(c => 
        c.caseCode.toLowerCase().includes(q) || 
        c.reporterName.toLowerCase().includes(q) || 
        c.reporterPhone.includes(q) || 
        (c.details && c.details.toLowerCase().includes(q))
      );
    }

    return {
      title: `รายการข้อมูลเคสฉุกเฉิน (${filtered.length} รายการ)`,
      headers: ['รหัสเคส', 'วันที่แจ้งเหตุ', 'ผู้แจ้งเหตุ', 'ระดับความรุนแรง', 'สถานะการช่วยเหลือ'],
      rows: filtered.slice(0, 15).map(c => [
        c.caseCode,
        c.formattedDate,
        `${c.reporterName} (${c.reporterPhone})`,
        getSeverityText(Number(c.severity) || 1),
        COMPLETED_STATUSES.includes((c.status || '').toLowerCase()) ? 'ช่วยเหลือสำเร็จ' : c.status === 'in_progress' ? 'กำลังช่วยเหลือ' : 'รอดำเนินการ'
      ])
    };
  }, [exportType, volunteersList, safeReportsList, activityLogsList, roleAndDateFilteredCases, tableSearch, currentUser]);

  // Real Native Excel (.xlsx) File Export
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      let excelData: any[] = [];
      const uId = currentUser?.id || currentUser?.uid || '';
      const uName = currentUser?.name || currentUser?.username || currentUser?.fullname || '';

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

        if (exportType === 'cases' || exportType === 'my_cases' || exportType.endsWith('_cases')) {
          let exportableCases = rawData;

          if (exportType === 'shelter_cases') {
            exportableCases = rawData.filter(c => isShelterDestination(c.destination));
          } else if (exportType === 'hospital_cases') {
            exportableCases = rawData.filter(c => isHospitalDestination(c.destination));
          } else if (exportType === 'supplies_cases') {
            exportableCases = rawData.filter(c => isSuppliesDestination(c.destination));
          } else if (exportType === 'vulnerable_cases') {
            exportableCases = rawData.filter(c => Number(c.bedridden) === 1 || Number(c.elderly) === 1 || String(c.details || '').includes('ติดเตียง') || String(c.details || '').includes('สูงอายุ') || String(c.details || '').includes('เด็ก'));
          } else if (exportType === 'critical_cases') {
            exportableCases = rawData.filter(c => Number(c.severity) === 5);
          } else if (role !== 'admin' || exportType === 'my_cases') {
            exportableCases = rawData.filter(c => {
              const cVolId = String(c.assigned_volunteer_id || c.volunteer_id || c.rescuer_id || '');
              const cVolName = String(c.assigned_volunteer_name || c.rescuer_name || c.volunteer_name || '');
              return (uId && cVolId === String(uId)) || (uName && cVolName.toLowerCase().includes(uName.toLowerCase()));
            });
          }

          if (exportableCases.length === 0) {
            alert('ไม่พบรายการเคสที่ตรงกับชุดข้อมูลที่เลือกในช่วงเวลานี้');
            setIsExportingExcel(false);
            return;
          }

          excelData = exportableCases.map(c => ({
            'รหัสเคส': c.case_number ? `CAS-${String(c.case_number).padStart(3, '0')}` : `CAS-${String(c.id).substring(0, 5)}`,
            'วันที่แจ้งเหตุ': c.created_at ? new Date(c.created_at).toLocaleString('th-TH') : '-',
            'ชื่อผู้แจ้งเหตุ': c.name || c.reporter_name || 'ผู้แจ้งเหตุ',
            'เบอร์โทรศัพท์': c.phone || c.contact_phone || c.tel || '-',
            'จุดหมายนำส่ง/การช่วยเหลือ': c.destination || c.type || '-',
            'ประเภทความช่วยเหลือ': c.type === 'sos' ? 'SOS ฉุกเฉิน' : (c.type || 'ไม่ระบุ'),
            'ระดับความรุนแรง': getSeverityText(Number(c.severity) || 1),
            'สถานะการช่วยเหลือ': COMPLETED_STATUSES.includes((c.status || '').toLowerCase()) ? 'ช่วยเหลือสำเร็จ' : c.status === 'in_progress' ? 'กำลังช่วยเหลือ' : 'รอดำเนินการ',
            'จำนวนผู้ประสบภัย (คน)': Number(c.peopleCount) || 1,
            'กลุ่มเปราะบาง': (c.bedridden ? 'ผู้ป่วยติดเตียง ' : '') + (c.elderly ? 'ผู้สูงอายุ/เด็ก' : (!c.bedridden ? 'ไม่มี' : '')),
            'ระดับน้ำ': c.water_level || c.waterLevel || '-',
            'รายละเอียดเหตุการณ์': c.details || '',
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

  const handleExportPDF = () => {
    setIsExportingPDF(true);
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

          {/* Volunteer Personal Banner */}
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

          {/* 1. AI Executive Summary Banner */}
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

          {/* 2. Unified Export Hub & Date Range Filter (Moved Up Front!) */}
          <div className="bg-slate-900 dark:bg-[#111c35] p-5 rounded-2xl shadow-lg border border-slate-800 w-full print:hidden min-w-0 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700/80 pb-4 w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 break-words">
                  <Download className="w-5 h-5 text-orange-400 shrink-0" />
                  <span>ส่งออกรายงาน (Export Hub)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ช่วงเวลาที่เลือก: <span className="text-orange-400 font-bold">{startDate && endDate ? `${startDate} ถึง ${endDate}` : 'สะสมทั้งหมด (All Time)'}</span>
                </p>
              </div>

              {/* Role badge */}
              <div className="text-xs px-3 py-1.5 rounded-full font-bold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5 shrink-0">
                {role === 'admin' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>สิทธิ์แอดมิน (ข้อมูลทั้งระบบ)</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-orange-400" />
                    <span>สิทธิ์อาสาสมัคร ({currentUser?.name || 'เคสของฉัน'})</span>
                  </>
                )}
              </div>
            </div>

            {/* Date Range Selector inside Export Hub */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                <span>เลือกช่วงเวลาข้อมูล</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/60 p-1.5 rounded-lg w-full min-w-0">
                <button onClick={() => setPresetRange('today')} className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all text-center min-w-0 ${startDate && startDate === (new Date().toISOString().split('T')[0]) ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>วันนี้</button>
                <button onClick={() => setPresetRange('7d')} className="px-2 py-1.5 rounded-md text-xs font-bold text-slate-300 hover:text-white transition-all text-center min-w-0">7 วัน</button>
                <button onClick={() => setPresetRange('30d')} className="px-2 py-1.5 rounded-md text-xs font-bold text-slate-300 hover:text-white transition-all text-center min-w-0">30 วัน</button>
                <button onClick={() => setPresetRange('all')} className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all text-center min-w-0 ${!startDate && !endDate ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>ทั้งหมด</button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full min-w-0 pt-1">
                <div 
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement;
                    if (input) { try { input.showPicker(); } catch (err) {} }
                  }}
                  className="w-full sm:flex-1 relative flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 cursor-pointer hover:border-orange-500 transition-colors shadow-inner"
                  title="คลิกเพื่อเลือกวันที่เริ่มต้นจากปฏิทิน"
                >
                  <Calendar className="w-4 h-4 text-orange-400 mr-2 shrink-0 pointer-events-none" />
                  <span className="text-xs text-slate-400 font-bold mr-2 shrink-0 pointer-events-none">จาก:</span>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    onClick={(e) => { e.stopPropagation(); try { e.currentTarget.showPicker(); } catch (err) {} }}
                    className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer [color-scheme:dark]" 
                  />
                </div>

                <span className="hidden sm:block text-slate-400 shrink-0 font-bold">-</span>

                <div 
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement;
                    if (input) { try { input.showPicker(); } catch (err) {} }
                  }}
                  className="w-full sm:flex-1 relative flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 cursor-pointer hover:border-orange-500 transition-colors shadow-inner"
                  title="คลิกเพื่อเลือกวันที่สิ้นสุดจากปฏิทิน"
                >
                  <Calendar className="w-4 h-4 text-orange-400 mr-2 shrink-0 pointer-events-none" />
                  <span className="text-xs text-slate-400 font-bold mr-2 shrink-0 pointer-events-none">ถึง:</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    onClick={(e) => { e.stopPropagation(); try { e.currentTarget.showPicker(); } catch (err) {} }}
                    className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer [color-scheme:dark]" 
                  />
                </div>

                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }} 
                    className="w-full sm:w-auto px-3 py-2.5 bg-rose-900/40 text-rose-300 border border-rose-700/50 hover:bg-rose-900/60 rounded-xl shrink-0 flex justify-center items-center font-bold text-xs gap-1 transition-all active:scale-95 cursor-pointer"
                    title="ล้างช่วงเวลา"
                  >
                    <X className="w-4 h-4" />
                    <span className="sm:hidden">ล้างวันที่</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dataset Selector & Download Buttons */}
            <div className="space-y-4 w-full min-w-0">
              <div className="space-y-1.5 w-full min-w-0">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-orange-400" />
                  <span>ชุดข้อมูลที่จะส่งออกและพรีวิว (Dataset)</span>
                </label>
                <select 
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full border border-slate-700 rounded-xl px-4 py-2.5 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-orange-500 text-xs sm:text-sm font-bold min-w-0"
                >
                  {role === 'admin' ? (
                    <>
                      <option value="cases">เคสฉุกเฉินทั้งหมด (All Cases)</option>
                      <option value="shelter_cases">รายงานเคสนำส่งศูนย์พักพิง (Shelter Cases)</option>
                      <option value="hospital_cases">รายงานเคสนำส่งโรงพยาบาล/หน่วยแพทย์ (Hospital Cases)</option>
                      <option value="supplies_cases">รายงานเคสแจกถุงยังชีพ/เสบียง (Supplies Rations)</option>
                      <option value="vulnerable_cases">รายงานเคสกลุ่มเปราะบาง/ติดเตียง (Vulnerable Cases)</option>
                      <option value="critical_cases">รายงานเคสวิกฤตด่วนสูงสุด ระดับ 5 (Critical Cases)</option>
                      <option value="safe">รายชื่อผู้ปลอดภัยทั้งหมด (Safe Reports)</option>
                      <option value="users">ข้อมูลอาสาสมัครทั้งหมด (Volunteers)</option>
                      <option value="logs">ประวัติการทำงานระบบ (Audit Logs)</option>
                    </>
                  ) : (
                    <>
                      <option value="my_cases">เคสฉุกเฉินเฉพาะของฉัน (My Assigned Cases)</option>
                      <option value="my_logs">ประวัติการทำงานเฉพาะของฉัน (My Personal Rescue Logs)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full min-w-0 pt-1">
                <button
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="flex items-center justify-center gap-2 p-3 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 rounded-xl transition-all disabled:opacity-50 min-w-0 w-full font-extrabold text-xs active:scale-95 cursor-pointer shadow-md"
                >
                  {isExportingExcel ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <span>ส่งออก Excel (.xlsx)</span>
                </button>
                
                <button
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="flex items-center justify-center gap-2 p-3 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/50 text-rose-300 rounded-xl transition-all disabled:opacity-50 min-w-0 w-full font-extrabold text-xs active:scale-95 cursor-pointer shadow-md"
                >
                  {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FileText className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>บันทึกเป็น PDF</span>
                </button>

                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="flex items-center justify-center gap-2 p-3 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 rounded-xl transition-all min-w-0 w-full font-extrabold text-xs active:scale-95 cursor-pointer shadow-md"
                >
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>ส่งรายงานทางอีเมล</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Daily Statistics */}
          <div className="bg-orange-50/60 dark:bg-orange-950/20 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/40 print:border-slate-300 w-full min-w-0">
            <h3 className="text-sm font-bold text-orange-900 dark:text-orange-100 mb-4 flex items-center gap-2 break-words">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <span>สถิติประจำวันนี้ ({new Date().toLocaleDateString('th-TH')})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0 w-full">
              <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-orange-100/60 dark:border-orange-800/40 text-center shadow-sm min-w-0 w-full">
                <p className="text-xs font-bold text-slate-500 mb-1 break-words">รับแจ้งเคสใหม่วันนี้</p>
                <p className="text-2xl font-black text-orange-600 break-words">{todayStats.todayTotal}</p>
              </div>
              <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-orange-100/60 dark:border-orange-800/40 text-center shadow-sm min-w-0 w-full">
                <p className="text-xs font-bold text-slate-500 mb-1 break-words">รอดำเนินการ/กำลังช่วยเหลือวันนี้</p>
                <p className="text-2xl font-black text-slate-700 dark:text-slate-300 break-words">{todayStats.todayActive}</p>
              </div>
              <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-orange-100/60 dark:border-orange-800/40 text-center shadow-sm min-w-0 w-full">
                <p className="text-xs font-bold text-slate-500 mb-1 break-words">ช่วยเหลือสำเร็จแล้ววันนี้</p>
                <p className="text-2xl font-black text-emerald-600 break-words">{todayStats.todayCompleted}</p>
              </div>
            </div>
          </div>

          {/* 4. Overall KPI Summary */}
          <div className="space-y-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 break-words">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{volunteerScope === 'my_cases' ? 'สถิติเคสของฉัน' : 'สถิติภาพรวม'} {startDate && endDate ? `(${startDate} ถึง ${endDate})` : ''}</span>
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

          {/* 5. Triage Risk Bar Chart */}
          <Card className="p-5 bg-white dark:bg-[#151b2c] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 break-words">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>ระดับความเสี่ยงฉุกเฉิน (Triage Breakdown)</span>
            </h3>
            <div className="space-y-4 w-full min-w-0">
              {[
                { level: 5, label: 'ระดับ 5 (วิกฤตหนัก)', color: 'bg-red-500', count: reportStats.l5 },
                { level: 4, label: 'ระดับ 4 (เสี่ยงรุนแรง)', color: 'bg-orange-500', count: reportStats.l4 },
                { level: 3, label: 'ระดับ 3 (เสี่ยงปานกลาง)', color: 'bg-yellow-500', count: reportStats.l3 },
                { level: 2, label: 'ระดับ 2 (เฝ้าระวัง)', color: 'bg-blue-500', count: reportStats.l2 },
                { level: 1, label: 'ระดับ 1 (ทั่วไป)', color: 'bg-emerald-500', count: reportStats.l1 },
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

          {/* 6. Dynamic Dataset Preview Table (Matches Selected Dataset) */}
          <Card className="p-4 sm:p-5 bg-white dark:bg-[#151b2c] border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden print:border-slate-300 w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4 min-w-0 w-full">
              <div className="min-w-0 w-full sm:w-auto">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 break-words">
                  <FileBox className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>พรีวิว: {dynamicDatasetPreview.title}</span>
                </h3>
              </div>

              <div className="relative w-full sm:w-72 print:hidden min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาในตาราง..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none min-w-0"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    {dynamicDatasetPreview.headers.map((h, idx) => (
                      <th key={idx} className="p-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {dynamicDatasetPreview.rows.length === 0 ? (
                    <tr>
                      <td colSpan={dynamicDatasetPreview.headers.length} className="p-8 text-center text-slate-400 font-medium">
                        ไม่พบข้อมูลในชุดข้อมูลนี้
                      </td>
                    </tr>
                  ) : (
                    dynamicDatasetPreview.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-bold text-orange-600 break-words">{row[0]}</td>
                        <td className="p-3 break-words">{row[1]}</td>
                        <td className="p-3 font-medium break-words">{row[2]}</td>
                        <td className="p-3 break-words">{row[3]}</td>
                        <td className="p-3 font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            row[4]?.includes('สำเร็จ') || row[4]?.includes('พร้อม') 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}>
                            {row[4]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {dynamicDatasetPreview.rows.length > 0 && (
              <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 font-medium">
                * แสดงตัวอย่างสูงสุด 15 รายการแรก กดปุ่ม "ส่งออก Excel" ด้านบนเพื่อรับข้อมูลฉบับเต็มทั้งหมด
              </div>
            )}
          </Card>
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
