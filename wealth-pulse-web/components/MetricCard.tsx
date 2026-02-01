
import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  subColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, subColor = 'text-slate-400' }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <p className="text-slate-400 text-xs font-semibold mb-2">{label}</p>
    <h3 className="text-2xl font-black text-slate-800">{value}</h3>
    {subValue && <p className={`text-[10px] mt-1 ${subColor}`}>{subValue}</p>}
  </div>
);

export default MetricCard;
