import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Edit3 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  value: string;
  onChange: (e: any) => void;
  name?: string;
  allowCustom?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder = '-- Select or Type Custom Value --',
  error,
  disabled = false,
  className = '',
  value,
  onChange,
  name,
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal typedValue with value prop
  useEffect(() => {
    setTypedValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find matching option label if value corresponds to an existing option value
  const matchedOption = options.find((opt) => opt.value === value);
  const displayInputText = matchedOption ? matchedOption.label : typedValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedValue(val);
    setIsOpen(true);
    onChange({ target: { value: val, name } });
  };

  const handleSelectOption = (opt: SelectOption) => {
    if (opt.disabled) return;
    setTypedValue(opt.value);
    setIsOpen(false);
    onChange({ target: { value: opt.value, name } });
  };

  return (
    <div className="space-y-1.5 w-full relative" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[10px] text-sky-600 font-semibold flex items-center gap-0.5">
            <Edit3 className="h-3 w-3" /> Select or Type Custom
          </span>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={isOpen ? typedValue : displayInputText}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!allowCustom}
          className={`w-full bg-slate-50 border rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition cursor-text disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100/80 ${
            error ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200'
          } ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 transition"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Options Popup List */}
      {isOpen && !disabled && (
        <div className="absolute z-[100] left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200/90 max-h-56 overflow-y-auto py-1 animate-fade-in-rise">
          {options.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-slate-400 italic">
              No predefined options available. You can type any custom value above.
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed bg-slate-50'
                      : isSelected
                      ? 'bg-sky-50 text-sky-700 font-bold'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-sky-600 flex-shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500 font-semibold mt-1">{error}</p>}
    </div>
  );
};
