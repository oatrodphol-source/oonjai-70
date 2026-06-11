'use client';
import React, { useEffect, useState, useRef } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function ReportDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('oonjai-report.pdf');
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !data) {
    return (
      <>
        <DashboardHeader title="รายงานสรุปผล" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="รายงานสรุปผล" />
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={exportPDF} disabled={isExporting} className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2">
            {isExporting ? <LoadingSpinner /> : <Download className="w-4 h-4" />}
            {isExporting ? 'กำลังสร้าง PDF...' : 'ส่งออกเป็น PDF'}
          </Button>
        </div>
        
        {/* Report Content to be captured */}
        <div ref={reportRef} className="bg-white text-gray-900 p-10 rounded-none shadow-sm min-h-[800px]">
          <div className="text-center mb-10 border-b pb-6">
            <h1 className="text-3xl font-bold text-orange-600 mb-2">รายงานสรุปผลการปฏิบัติงาน</h1>
            <h2 className="text-xl font-medium text-gray-600">ระบบแจ้งเหตุฉุกเฉิน OonJai</h2>
            <p className="text-gray-500 mt-2">พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="border border-gray-200 p-6 rounded-xl bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                สรุปสถิติภาพรวม
              </h3>
              <ul className="space-y-3">
                <li className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">จำนวนเคสทั้งหมด</span>
                  <span className="font-bold text-blue-600">{data.stats.total} เคส</span>
                </li>
                <li className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">ช่วยเหลือเสร็จสิ้น</span>
                  <span className="font-bold text-emerald-600">{data.stats.completed} เคส</span>
                </li>
                <li className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">กำลังดำเนินการ</span>
                  <span className="font-bold text-purple-600">{data.stats.inProgress} เคส</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">รอการช่วยเหลือ</span>
                  <span className="font-bold text-orange-600">{data.stats.waiting} เคส</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 p-6 rounded-xl bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                แยกตามระดับความรุนแรง
              </h3>
              <ul className="space-y-3">
                {data.severityData.map((s: any, idx: number) => (
                  <li key={idx} className="flex justify-between border-b border-gray-200 pb-2 last:border-0">
                    <span className="text-gray-600">{s.level}</span>
                    <span className="font-bold text-gray-800">{s.count} เคส</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              เคสที่ดำเนินการล่าสุด
            </h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 border border-gray-200 font-medium">รหัสเคส</th>
                  <th className="p-3 border border-gray-200 font-medium">เวลา</th>
                  <th className="p-3 border border-gray-200 font-medium">ประเภทเหตุ</th>
                  <th className="p-3 border border-gray-200 font-medium">ระดับ</th>
                  <th className="p-3 border border-gray-200 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCases.slice(0, 10).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 border border-gray-200 text-sm">{row.id}</td>
                    <td className="p-3 border border-gray-200 text-sm">{row.time}</td>
                    <td className="p-3 border border-gray-200 text-sm">{row.type}</td>
                    <td className="p-3 border border-gray-200 text-sm text-center">{row.severity}</td>
                    <td className="p-3 border border-gray-200 text-sm">{row.status}</td>
                  </tr>
                ))}
                {data.recentCases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 border border-gray-200 text-center text-gray-500">ไม่มีข้อมูลเคส</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-16 text-center text-gray-500 text-sm">
            เอกสารฉบับนี้ถูกสร้างขึ้นโดยอัตโนมัติจากระบบ OonJai
          </div>
        </div>
      </div>
    </>
  );
}
