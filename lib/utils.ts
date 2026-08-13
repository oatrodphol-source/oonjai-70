export const getSeverityBadgeStyle = (severity: string | number) => {
  const level = String(severity);
  if (level.includes('5')) return 'bg-red-100 text-red-800 border-red-200';
  if (level.includes('4')) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (level.includes('3')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (level.includes('2')) return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200'; // Default Level 1
};

export const getSeveritySolidColor = (severity: string | number) => {
  const level = String(severity);
  if (level.includes('5')) return 'bg-red-600';
  if (level.includes('4')) return 'bg-orange-500';
  if (level.includes('3')) return 'bg-yellow-500';
  if (level.includes('2')) return 'bg-blue-500';
  return 'bg-emerald-500'; // Default Level 1
};

export const getSeverityColor = (severity: number | string) => {
  const num = Number(severity) || 1;
  switch (num) {
    case 5: return 'bg-red-500 text-white';
    case 4: return 'bg-orange-500 text-white';
    case 3: return 'bg-yellow-500 text-slate-900 font-extrabold';
    case 2: return 'bg-blue-500 text-white';
    case 1: return 'bg-emerald-500 text-white';
    default: return 'bg-emerald-500 text-white';
  }
};

export const getSeverityText = (severity: number | string) => {
  const num = Number(severity) || 1;
  switch (num) {
    case 5: return 'วิกฤต (ระดับ 5)';
    case 4: return 'รุนแรง (ระดับ 4)';
    case 3: return 'ปานกลาง (ระดับ 3)';
    case 2: return 'เฝ้าระวัง (ระดับ 2)';
    case 1: return 'ทั่วไป (ระดับ 1)';
    default: return `ทั่วไป (ระดับ ${num})`;
  }
};
