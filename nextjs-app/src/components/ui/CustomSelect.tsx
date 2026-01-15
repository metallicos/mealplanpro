'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    label?: string;
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Select option',
    className = '',
    label
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-400 mb-2">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl
                    bg-[#1a1a24] border border-gray-700
                    text-left transition-all duration-200
                    hover:border-gray-600 focus:outline-none focus:border-[var(--accent-primary)]
                    ${isOpen ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : ''}
                `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-white'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 overflow-hidden bg-[#1a1a24] border border-gray-700 rounded-xl shadow-2xl animate-fade-in-down max-h-60 overflow-y-auto backdrop-blur-xl">
                    <div className="py-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full flex items-center justify-between px-4 py-3 text-sm text-left
                                    transition-colors duration-150
                                    hover:bg-white/5
                                    ${value === option.value ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'text-gray-300'}
                                `}
                            >
                                <span className="font-medium truncate">{option.label}</span>
                                {value === option.value && (
                                    <Check className="w-4 h-4 ml-2 flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
