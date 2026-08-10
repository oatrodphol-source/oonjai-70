export const getSeverityBadgeStyle = (severity: string | number) => {
  const level = String(severity);
  if (level.includes('5')) return 'bg-red-100 text-red-800 border-red-200';
  if (level.includes('4')) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (level.includes('3')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (level.includes('2')) return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-green-100 text-green-800 border-green-200'; // Default Level 1
};

export const getSeveritySolidColor = (severity: string | number) => {
  const level = String(severity);
  if (level.includes('5')) return 'bg-red-600';
  if (level.includes('4')) return 'bg-orange-500';
  if (level.includes('3')) return 'bg-yellow-500';
  if (level.includes('2')) return 'bg-blue-500';
  return 'bg-green-500'; // Default Level 1
};
