'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Search, AlertCircle, CheckCircle2, Edit2, Upload, FileUp, Plus, Download } from 'lucide-react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

interface SafeReport {
  id: string | number;
  name: string;
  phone: string;
  agency: string;
  destination: string;
  status: string;
  timestamp: string;
}

export default function SafeReportsPage() {
  const [reports, setReports] = useState<SafeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // For delete confirmation
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<SafeReport | null>(null);

  // For Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<SafeReport | null>(null);
  const [editForm, setEditForm] = useState({ name: '', agency: '', destination: '' });

  // For Add modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', agency: '', destination: 'ศูนย์พักพิง' });

  // For CSV Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('safe_reports')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching safe reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDeleteClick = (report: SafeReport) => {
    setReportToDelete(report);
    setIsConfirmOpen(true);
  };

  const handleEditClick = (report: SafeReport) => {
    setEditingReport(report);
    setEditForm({
      name: report.name || '',
      agency: report.agency || '',
      destination: report.destination || ''
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingReport) return;
    try {
      const { error } = await supabase
        .from('safe_reports')
        .update({
          name: editForm.name,
          agency: editForm.agency,
          destination: editForm.destination
        })
        .eq('id', editingReport.id);

      if (error) throw error;
      
      // Update local state
      setReports(reports.map(r => 
        r.id === editingReport.id 
          ? { ...r, name: editForm.name, agency: editForm.agency, destination: editForm.destination } 
          : r
      ));
      
      setIsEditOpen(false);
      setEditingReport(null);
    } catch (err) {
      console.error('Error updating report:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const saveNewReport = async () => {
    if (!addForm.name) {
      toast.error('กรุณากรอกชื่อผู้ปลอดภัย');
      return;
    }
    try {
      const finalName = addForm.phone ? `${addForm.name} (เบอร์: ${addForm.phone})` : addForm.name;
      const { error } = await supabase
        .from('safe_reports')
        .insert([{
          name: finalName,
          agency: addForm.agency || 'ทีมกู้ภัยภายนอก',
          destination: addForm.destination,
          timestamp: new Date().toISOString(),
          status: 'safe'
        }]);

      if (error) throw new Error(error.message || JSON.stringify(error));
      
      toast.success('บันทึกรายชื่อผู้ปลอดภัยสำเร็จ');
      setIsAddOpen(false);
      setAddForm({ name: '', phone: '', agency: '', destination: 'ศูนย์พักพิง' });
      fetchReports();
    } catch (err: any) {
      console.error('Supabase Error:', err.message || err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      const { error } = await supabase
        .from('safe_reports')
        .delete()
        .eq('id', reportToDelete.id);
        
      if (error) throw error;
      
      // Update state
      setReports(reports.filter(r => r.id !== reportToDelete.id));
      setIsConfirmOpen(false);
      setReportToDelete(null);
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      let rows: any[] = [];
      
      if (fileExt === 'csv') {
        const text = await file.text();
        const results = Papa.parse(text, { header: true, skipEmptyLines: true });
        rows = results.data as any[];
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      } else {
        toast.error('รองรับเฉพาะไฟล์ .csv, .xlsx, .xls');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (rows.length === 0) {
        toast.error('ไม่พบข้อมูลในไฟล์');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Check if headers match expected values
      const firstRow = rows[0] || {};
      const firstRowKeys = Object.keys(firstRow).map(k => k.toLowerCase().trim());
      const expectedKeys = ['name', 'ชื่อ', 'phone', 'เบอร์โทร', 'agency', 'หน่วยงาน', 'destination', 'จุดหมายปลายทาง'];
      const hasValidHeaders = firstRowKeys.some(key => expectedKeys.includes(key));

      if (!hasValidHeaders) {
        toast.error('หัวตารางไม่ถูกต้อง! กรุณาใช้ไฟล์ตัวอย่าง (Template)');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const insertData = rows.map(row => {
        const rawName = row['Name'] || row['ชื่อ'] || row['name'] || 'ไม่ระบุชื่อ';
        const rawPhone = row['Phone'] || row['เบอร์โทร'] || row['phone'] || '';
        const finalName = rawPhone ? `${rawName} (เบอร์: ${rawPhone})` : rawName;
        
        return {
          name: finalName,
          agency: row['Agency'] || row['หน่วยงาน'] || row['agency'] || 'ทีมกู้ภัยภายนอก',
          destination: row['Destination'] || row['จุดหมายปลายทาง'] || row['destination'] || 'พื้นที่ปลอดภัย',
          status: 'safe',
          timestamp: new Date().toISOString()
        };
      });

      const { error } = await supabase.from('safe_reports').insert(insertData);
      if (error) throw new Error(error.message || JSON.stringify(error));

      toast.success(`นำเข้าข้อมูลสำเร็จ ${insertData.length} รายการ`);
      fetchReports();
    } catch (error: any) {
      console.error('File Parse/Upload Error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = ['ชื่อ', 'เบอร์โทร', 'หน่วยงาน', 'จุดหมายปลายทาง'];
    const example = ['สมชาย ใจดี', '0812345678', 'ทีมกู้ภัย A', 'ศูนย์พักพิง B'];
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + example.join(',');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'OonJai_Safe_Reports_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReports = reports.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (r.name || '').toLowerCase().includes(searchLower) ||
      (r.phone || '').includes(searchTerm) ||
      (r.agency || '').toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <DashboardHeader title="จัดการรายชื่อผู้ปลอดภัย" />
      
      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              จัดการรายชื่อผู้ปลอดภัย
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              ข้อมูลรายชื่อผู้ปลอดภัยและผู้ได้รับการช่วยเหลือจากระบบภายนอก
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="ค้นหาชื่อ, เบอร์โทร, หน่วยงาน..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-green-500 outline-none dark:text-white transition-all font-medium shadow-sm"
              />
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">เพิ่มผู้ปลอดภัย</span>
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-800/40 text-orange-700 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors shadow-sm whitespace-nowrap"
              title="ดาวน์โหลดไฟล์ตัวอย่าง (Template)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">โหลด Template</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
              title="อัปโหลดไฟล์ (CSV, Excel)"
            >
              {isUploading ? <Upload className="w-4 h-4 animate-bounce" /> : <FileUp className="w-4 h-4" />}
              <span className="hidden sm:inline">{isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์ (CSV, Excel)'}</span>
            </button>
            <input 
              type="file"
              accept=".csv, .xlsx, .xls"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151b2c] sm:rounded-2xl border-y sm:border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          
          {/* Mobile View (Cards) */}
          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
            ) : paginatedReports.length > 0 ? (
              paginatedReports.map((report, idx) => (
                <div key={report.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white text-base">
                        {report.name || 'ไม่ระบุชื่อ'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {report.timestamp ? new Date(report.timestamp).toLocaleString('th-TH') : ''}
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                      {report.status || 'ปลอดภัย'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">เบอร์โทรศัพท์</span>
                      <span className="text-gray-700 dark:text-gray-300">{report.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">หน่วยงาน</span>
                      <span className="inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-100 dark:border-blue-800/50 font-medium">
                        {report.agency || '-'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">จุดหมายปลายทาง</span>
                      <span className="text-gray-700 dark:text-gray-300">{report.destination || '-'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    <button
                      onClick={() => handleEditClick(report)}
                      className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Edit2 className="w-4 h-4" /> แก้ไข
                    </button>
                    <button
                      onClick={() => handleDeleteClick(report)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> ลบ
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-gray-500">
                {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ยังไม่มีข้อมูลรายชื่อผู้ปลอดภัย'}
              </div>
            )}
          </div>

          {/* Desktop View (Table) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="w-[10%] px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ลำดับ</th>
                  <th className="w-[25%] px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อ-สกุล</th>
                  <th className="w-[15%] px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">เบอร์โทรศัพท์</th>
                  <th className="w-[15%] px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">หน่วยงาน</th>
                  <th className="w-[15%] px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">จุดหมายปลายทาง</th>
                  <th className="w-[10%] px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">สถานะ</th>
                  <th className="w-[10%] px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : paginatedReports.length > 0 ? (
                  paginatedReports.map((report, idx) => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-6 py-4 truncate">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {report.name || '-'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">
                          {report.timestamp ? new Date(report.timestamp).toLocaleString('th-TH') : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 truncate">
                        {report.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 truncate">
                        {report.agency ? (
                          <span className="inline-block max-w-full truncate bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1.5 rounded-md border border-blue-100 dark:border-blue-800/50 font-medium">
                            {report.agency}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 truncate">
                        {report.destination || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                          {report.status || 'ปลอดภัย'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(report)}
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors inline-flex"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(report)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors inline-flex"
                            title="ลบข้อมูล"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ยังไม่มีข้อมูลรายชื่อผู้ปลอดภัย'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredReports.length)} จากทั้งหมด {filteredReports.length} รายการ
              </div>
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-[#151b2c] text-gray-700 dark:text-gray-300 shadow-sm"
                >
                  ก่อนหน้า
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                          currentPage === page 
                            ? 'bg-green-600 text-white border border-green-600' 
                            : 'bg-white dark:bg-[#151b2c] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-gray-400 flex items-center">...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-[#151b2c] text-gray-700 dark:text-gray-300 shadow-sm"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {isConfirmOpen && reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center gap-4 text-red-600 dark:text-red-400 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">ยืนยันการลบข้อมูล</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">การกระทำนี้ไม่สามารถเรียกคืนได้</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ <span className="font-bold">&quot;{reportToDelete.name || reportToDelete.phone || 'ไม่ระบุชื่อ'}&quot;</span>?
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-blue-500" />
                แก้ไขข้อมูลผู้ปลอดภัย
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อ-สกุล</label>
                <input 
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ไม่ระบุชื่อ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หน่วยงาน</label>
                <input 
                  type="text"
                  value={editForm.agency}
                  onChange={e => setEditForm({...editForm, agency: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น ทีมกู้ภัย"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">จุดหมายปลายทาง</label>
                <input 
                  type="text"
                  value={editForm.destination}
                  onChange={e => setEditForm({...editForm, destination: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น โรงพยาบาล หรือ ศูนย์พักพิง"
                />
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-green-500">🛡️</span> เพิ่มรายชื่อผู้ปลอดภัย
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อ-สกุล (ผู้ได้รับการช่วยเหลือ)</label>
                <input 
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm({...addForm, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เบอร์โทรศัพท์ (ถ้ามี)</label>
                <input 
                  type="text"
                  value={addForm.phone}
                  onChange={e => setAddForm({...addForm, phone: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="เช่น 0812345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หน่วยงานที่ช่วยเหลือ</label>
                <input 
                  type="text"
                  value={addForm.agency}
                  onChange={e => setAddForm({...addForm, agency: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="ค่าเริ่มต้น: ทีมกู้ภัยภายนอก"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">จุดหมายที่นำส่ง (Destination)</label>
                <select 
                  value={addForm.destination}
                  onChange={e => setAddForm({...addForm, destination: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="ศูนย์พักพิง">⛺ ศูนย์พักพิง</option>
                  <option value="โรงพยาบาล">🏥 โรงพยาบาล / หน่วยแพทย์</option>
                  <option value="พื้นที่ปลอดภัย">🏡 บ้านญาติ / พื้นที่ปลอดภัย</option>
                  <option value="รับถุงยังชีพ">📦 อยู่บ้าน (รับถุงยังชีพแล้ว)</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveNewReport}
                className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-md"
              >
                บันทึกรายชื่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
