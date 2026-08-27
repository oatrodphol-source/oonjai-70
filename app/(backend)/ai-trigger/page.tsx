'use client';
import React, { useState, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, Save, BrainCircuit, RefreshCw, Eye, EyeOff, Play, Upload, MessageSquare, Image as ImageIcon, X, Loader2 } from 'lucide-react';

export default function AiTriggerPage() {
  const [weights, setWeights] = useState({
    waterLevelHigh: 5,
    waterLevelMedium: 3,
    peopleCountMany: 5,
    peopleCountFew: 2,
    bedridden: 4,
    elderly: 2,
    severityFactor: 2,
    ai_provider: 'OpenAI',
    ai_api_key: '',
    ai_system_prompt: '',
    ai_model_name: '',
    ai_vision_model_name: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);

  // Test AI states
  const [testMode, setTestMode] = useState<'text' | 'image'>('text');
  const [testText, setTestText] = useState('');
  const [testImage, setTestImage] = useState<string | null>(null);
  const [testImageFile, setTestImageFile] = useState<File | null>(null);
  const [imagePrompt, setImagePrompt] = useState('โปรดวิเคราะห์ระดับความเร่งด่วนจากรูปภาพนี้อย่างละเอียด และสรุปผลออกมาตามเกณฑ์ระดับความเสี่ยง (Risk Level) 1-5 แนะนำวิธีรับมือเบื้องต้นมาด้วย');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/ai-triage');
        if (response.ok) {
          const data = await response.json();
          setWeights(data);
          if (data.is_ai_enabled !== undefined) {
            setIsAIEnabled(data.is_ai_enabled);
          }
        }
      } catch (error) {
        console.error('Failed to fetch AI settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/ai-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...weights, is_ai_enabled: isAIEnabled })
      });
      
      if (response.ok) {
        alert('บันทึกการตั้งค่า AI Triage สำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAI = async () => {
    if (testMode === 'text') {
      // Text mode: use /api/ai-test
      if (!weights.ai_api_key) {
        alert('กรุณาใส่ API Key ก่อนทดสอบ');
        return;
      }
      if (!testText.trim()) {
        alert('กรุณาใส่ข้อความทดสอบ');
        return;
      }

      setIsTesting(true);
      setTestResult(null);

      try {
        const response = await fetch('/api/ai-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'text',
            content: testText,
            systemPrompt: weights.ai_system_prompt,
            apiKey: weights.ai_api_key,
            aiProvider: weights.ai_provider,
            modelName: weights.ai_model_name,
            visionModelName: weights.ai_vision_model_name
          })
        });

        const data = await response.json();
        if (response.ok) {
          setTestResult(data.data);
        } else {
          alert(`Error: ${data.error}`);
        }
      } catch (error) {
        console.error('Test AI error:', error);
        alert('เกิดข้อผิดพลาดในการเรียก AI');
      } finally {
        setIsTesting(false);
      }
    } else {
      // Image mode: use /api/analyze (the AI Analyzer endpoint)
      if (!testImageFile) {
        alert('กรุณาอัปโหลดรูปภาพทดสอบ');
        return;
      }

      setIsTesting(true);
      setTestResult(null);

      try {
        const formData = new FormData();
        formData.append('image', testImageFile);
        formData.append('prompt', imagePrompt);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (response.ok) {
          try {
            const parsed = JSON.parse(data.result);
            setTestResult(parsed);
          } catch {
            setTestResult(data.result);
          }
        } else {
          alert(`Error: ${data.error}`);
        }
      } catch (error) {
        console.error('Image analysis error:', error);
        alert('เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ');
      } finally {
        setIsTesting(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTestImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTestImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setTestImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTestImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const clearImage = () => {
    setTestImage(null);
    setTestImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getRiskColor = (level: number) => {
    switch (level) {
      case 1: return { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-500', label: 'เฝ้าระวัง' };
      case 2: return { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500', label: 'รอได้ระยะสั้น' };
      case 3: return { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', label: 'ต้องช่วยเร็ว' };
      case 4: return { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500', label: 'เสี่ยงสูง' };
      case 5: return { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600', label: 'อันตรายถึงชีวิต' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-600', border: 'border-gray-500', label: 'ไม่ระบุ' };
    }
  };

  return (
    <>
      <DashboardHeader title="ตั้งค่า AI" />
      <div className="max-w-4xl mx-auto py-6 pb-32 md:pb-10 space-y-6">
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 p-6 rounded-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-orange-500" /> Smart Triage Algorithm
              </h3>
              <p className="text-sm text-slate-500 mt-1">ระบบคำนวณความรุนแรงอัตโนมัติ</p>
            </div>
            
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isAIEnabled} onChange={() => setIsAIEnabled(!isAIEnabled)} />
                <div className={`block w-14 h-8 rounded-full transition-colors ${isAIEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isAIEnabled ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                {isAIEnabled ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Manual)'}
              </div>
            </label>
          </div>
          <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800/50">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              คำนวณจาก: 
              <code className="bg-white dark:bg-black/20 px-2 py-0.5 rounded mx-1 text-orange-600">
                Score = (Water Level) + (People) + (Bedridden) + (Elderly) + (Severity)
              </code>
            </p>
          </div>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#ff6600]" />
              ปรับแต่งน้ำหนักคะแนน (Scoring Weights)
            </h3>
            <Button variant="outline" size="sm" onClick={() => setWeights(prev => ({
              ...prev, waterLevelHigh: 5, waterLevelMedium: 3, peopleCountMany: 5, peopleCountFew: 2, bedridden: 4, elderly: 2, severityFactor: 2
            }))}>
              <RefreshCw className="w-4 h-4 mr-2" />
              คืนค่าเริ่มต้น
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">ปัจจัยสภาพแวดล้อม</h5>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">ระดับน้ำสูง (ท่วมมิดหัว)</label>
                <Input type="number" value={weights.waterLevelHigh} onChange={e => setWeights({...weights, waterLevelHigh: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">ระดับน้ำปานกลาง (ระดับเอว)</label>
                <Input type="number" value={weights.waterLevelMedium} onChange={e => setWeights({...weights, waterLevelMedium: Number(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">ปัจจัยผู้ประสบภัย</h5>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">มีผู้ป่วยติดเตียง</label>
                <Input type="number" value={weights.bedridden} onChange={e => setWeights({...weights, bedridden: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">มีเด็ก/ผู้สูงอายุ</label>
                <Input type="number" value={weights.elderly} onChange={e => setWeights({...weights, elderly: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">จำนวนคน &gt; 5 คน</label>
                <Input type="number" value={weights.peopleCountMany} onChange={e => setWeights({...weights, peopleCountMany: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <BrainCircuit className="w-5 h-5 text-[#ff6600]" />
              ตั้งค่า AI Provider และ Prompt
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">AI Provider</label>
                  <select 
                    className="w-full p-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                    value={weights.ai_provider}
                    onChange={e => setWeights({...weights, ai_provider: e.target.value})}
                  >
                    <option value="Groq">Groq</option>
                    <option value="OpenAI">OpenAI (ChatGPT)</option>
                    <option value="Google Gemini">Google Gemini</option>
                    <option value="Anthropic Claude">Anthropic Claude</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">API Key</label>
                  <div className="relative">
                    <Input 
                      type={showApiKey ? "text" : "password"} 
                      placeholder="ใส่ API Key..." 
                      value={weights.ai_api_key} 
                      onChange={e => setWeights({...weights, ai_api_key: e.target.value})} 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">คีย์จะถูกบันทึกอย่างปลอดภัย และใช้ในการเรียกใช้งาน AI</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Text Model Name</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. llama-3.3-70b-versatile" 
                    value={weights.ai_model_name || ''} 
                    onChange={e => setWeights({...weights, ai_model_name: e.target.value})} 
                  />
                  <p className="text-xs text-gray-500 mt-1">ชื่อโมเดลสำหรับการวิเคราะห์ข้อความ</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Vision Model Name</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. llama-3.2-90b-vision-preview" 
                    value={weights.ai_vision_model_name || ''} 
                    onChange={e => setWeights({...weights, ai_vision_model_name: e.target.value})} 
                  />
                  <p className="text-xs text-gray-500 mt-1">ชื่อโมเดลสำหรับการวิเคราะห์รูปภาพ</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">System Prompt (ชุดคำสั่ง AI)</label>
                <textarea 
                  className="w-full p-3 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700 min-h-[150px]"
                  placeholder="เช่น ถ้าเป็นเคสน้ำท่วมสูงเกิน 1 เมตร ให้ตีเป็นระดับ 5 ทันที..."
                  value={weights.ai_system_prompt}
                  onChange={e => setWeights({...weights, ai_system_prompt: e.target.value})}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">ชุดคำสั่งเพื่อใช้ปรับแต่งการตัดสินใจของ AI โดยไม่ต้องแก้ไขโค้ด</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Button className="bg-[#0b1325] hover:bg-[#0b1325]/90 flex items-center gap-2" onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </Button>
          </div>
        </Card>

        {/* ========== Test AI Section ========== */}
        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-500" />
              ทดสอบระบบ AI Prompt
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-4 mb-4">
              <Button 
                variant={testMode === 'text' ? 'primary' : 'outline'} 
                onClick={() => { setTestMode('text'); setTestResult(null); }}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> ข้อความ
              </Button>
              <Button 
                variant={testMode === 'image' ? 'primary' : 'outline'} 
                onClick={() => { setTestMode('image'); setTestResult(null); }}
                className="flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> รูปภาพ
              </Button>
            </div>

            {testMode === 'text' ? (
              <div>
                <label className="block text-sm font-semibold mb-2">จำลองข้อความที่ประชาชนส่งมา</label>
                <textarea 
                  className="w-full p-3 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700 min-h-[100px]"
                  placeholder="เช่น น้ำท่วมเข้าบ้านมิดหัวเลย มีคนแก่ติดอยู่ 2 คน ไม่มีใครช่วยได้เลย"
                  value={testText}
                  onChange={e => setTestText(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image upload zone */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">รูปภาพเหตุการณ์</label>
                  {!testImage ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                        isDragOver 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="font-semibold text-gray-600 dark:text-gray-300">คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่</p>
                      <p className="text-sm text-gray-400 mt-1">รองรับ JPG, PNG, WEBP</p>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={testImage} alt="Preview" className="w-full max-h-[300px] object-cover" />
                      <button 
                        onClick={clearImage}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </div>

                {/* Analysis prompt */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">คำสั่งการวิเคราะห์ (Prompt)</label>
                  <textarea 
                    className="w-full p-3 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700 min-h-[80px]"
                    placeholder="โปรดวิเคราะห์ระดับความเร่งด่วนจากรูปภาพนี้..."
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button 
              className="w-full sm:w-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={handleTestAI} 
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังวิเคราะห์...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {testMode === 'image' ? 'เริ่มการวิเคราะห์' : 'ทดสอบการวิเคราะห์'}
                </>
              )}
            </Button>

            {/* ========== Results Display ========== */}
            {testResult && (
              <div className="mt-6 space-y-4">
                {/* Rich card for image analysis results */}
                {testMode === 'image' && typeof testResult === 'object' && testResult.risk_level ? (
                  <div className="space-y-4">
                    {/* Risk Level Header */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                          ระดับความเสี่ยง: {testResult.risk_level}
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${getRiskColor(testResult.risk_level).bg}`}>
                            AI Score: {testResult.ai_score}/100
                          </span>
                          {testResult.response_time && (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              ⏱ เวลาที่เข้าถึงพื้นที่: <strong>{testResult.response_time}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Situation Summary + Recommended Action */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {testResult.situation_summary && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                          <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">สรุปสถานการณ์</h4>
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{testResult.situation_summary}</p>
                        </div>
                      )}
                      {testResult.recommended_action && (
                        <div className={`border rounded-xl p-5 ${getRiskColor(testResult.risk_level).border} bg-opacity-5`} style={{ backgroundColor: `${getRiskColor(testResult.risk_level).bg.replace('bg-', '')}08` }}>
                          <h4 className={`font-bold mb-2 ${getRiskColor(testResult.risk_level).text}`}>
                            ⚡ คำแนะนำการปฏิบัติงาน
                          </h4>
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{testResult.recommended_action}</p>
                        </div>
                      )}
                    </div>

                    {/* Keywords */}
                    {testResult.detected_keywords && testResult.detected_keywords.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3">คีย์เวิร์ดที่พบ</h4>
                        <div className="flex flex-wrap gap-2">
                          {testResult.detected_keywords.map((kw: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fallback: JSON display for text mode or unstructured results */
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border">
                    <h4 className="font-semibold mb-2">ผลการวิเคราะห์ (JSON):</h4>
                    <pre className="text-sm overflow-x-auto p-4 bg-white dark:bg-slate-900 border rounded text-green-600">
                      {typeof testResult === 'string' ? testResult : JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
