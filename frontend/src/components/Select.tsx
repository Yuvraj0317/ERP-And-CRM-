import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder = '-- Select Option --',
  error,
  disabled,
  className = '',
  value,
  onChange,
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full appearance-none bg-slate-50 border rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100/80 ${
            error ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200'
          } ${className}`}
          {...props}
        >
          <option value="" disabled hidden={Boolean(value)}>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className="py-1 text-slate-800 bg-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {error && <p className="text-[11px] text-rose-500 font-semibold mt-1">{error}</p>}
    </div>
  );
};
