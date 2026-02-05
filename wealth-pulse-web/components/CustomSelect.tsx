import React, { useState, useRef, useEffect } from 'react';

interface Option<T> {
    value: T;
    label: string;
}

interface CustomSelectProps<T> {
    value: T;
    options: Option<T>[];
    onChange: (value: T) => void;
    label?: string;
    className?: string; // Optional custom className
    prefixIcon?: string; // Optional FontAwesome icon class
}

const CustomSelect = <T extends string | number>({ value, options, onChange, label, className = "", prefixIcon }: CustomSelectProps<T>) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">{label}</div>}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white pl-4 pr-10 py-2.5 rounded-2xl text-xs font-black text-slate-700 text-left border border-slate-100 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all flex items-center gap-2 ${isOpen ? 'ring-2 ring-indigo-100' : ''}`}
            >
                {prefixIcon && <i className={`${prefixIcon} text-slate-400 text-[10px]`}></i>}
                <span className="truncate">{selectedOption.label}</span>
                <i className={`fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${label ? 'mt-2' : ''}`}></i>
            </button>

            {/* Dropdown Menu */}
            <div
                className={`absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden origin-top transition-all duration-200 ${isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}
            >
                <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {options.map((option) => (
                        <div
                            key={String(option.value)}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`px-4 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-colors flex items-center justify-between group ${option.value === value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span>{option.label}</span>
                            {option.value === value && <i className="fas fa-check text-[10px]"></i>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomSelect;
