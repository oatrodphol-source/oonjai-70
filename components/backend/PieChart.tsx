'use client';
import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const PieChart = ({ data: inputData }: { data?: { name: string, value: number }[] }) => {
  const defaultData = [
    { name: 'ไม่มีข้อมูล', value: 1 }
  ];
  const chartData = inputData && inputData.length > 0 ? inputData : defaultData;

  const data = {
    labels: chartData.map(d => d.name),
    datasets: [
      {
        data: chartData.map(d => Number(d.value)),
        backgroundColor: [
          '#ff6600',
          '#3b82f6',
          '#10b981',
          '#8b5cf6',
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          padding: 20,
        }
      }
    },
    cutout: '70%',
  };

  return (
    <div className="w-full h-64 flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
};
