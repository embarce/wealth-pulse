import React, { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onRangeChange: (start: string, end: string) => void;
    label?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onRangeChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Constants for presets
    const presets = [
        { label: '全部', days: null },
        { label: '近7天', days: 7 },
        { label: '近30天', days: 30 },
        { label: '今年', days: 'YTD' },
    ];

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const handlePresetClick = (type: number | string | null) => {
        const end = new Date();
        let start = new Date();

        if (type === null) {
            onRangeChange('', '');
            setIsOpen(false);
            return;
        }

        if (type === 'YTD') {
            start = new Date(new Date().getFullYear(), 0, 1);
        } else {
            start.setDate(end.getDate() - (type as number) + 1);
        }

        onRangeChange(formatDate(start), formatDate(end));
        setIsOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayValue = !startDate && !endDate
        ? '全部时间'
        : `${startDate || '...'} ~ ${endDate || '...'}`;

    return (
        <div className="relative" ref={containerRef}>
            {label && <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">{label}</div>}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full sm:min-w-[200px] bg-white pl-4 pr-10 py-2.5 rounded-2xl text-xs font-black text-slate-700 text-left border border-slate-100 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all flex items-center gap-2 ${isOpen ? 'ring-2 ring-indigo-100' : ''}`}
            >
                <i className="far fa-calendar-alt text-slate-400 text-xs"></i>
                <span className="truncate">{displayValue}</span>
                <i className={`fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${label ? 'mt-2' : ''}`}></i>
            </button>

            {/* Popover */}
            <div
                className={`absolute z-50 left-0 mt-2 p-4 bg-white rounded-3xl shadow-xl border border-slate-100 w-[300px] origin-top transition-all duration-200 ${isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}
            >
                {/* Presets */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {presets.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => handlePresetClick(preset.days)}
                            className="px-3 py-1.5 rounded-lg bg-slate-50 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                <div className="h-px bg-slate-100 mb-4"></div>

                {/* Custom Manual Input */}
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">开始日期</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => onRangeChange(e.target.value, endDate)}
                            className="w-full bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">结束日期</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => onRangeChange(startDate, e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateRangePicker;
