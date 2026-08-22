import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, Image, ChevronDown, Check, Loader2 } from 'lucide-react';
import { ExportColumn, exportToCSV, exportToExcel, exportToPDF, exportChartToPNG } from '../utils/exportUtils';

export interface ExportDropdownProps {
  title: string;
  subtitle?: string;
  filenamePrefix: string;
  columns: ExportColumn[];
  currentViewData: Record<string, any>[];
  allData?: Record<string, any>[];
  activeFiltersText?: string;
  chartElementIdRef?: string | HTMLElement;
  variant?: 'default' | 'compact' | 'chart';
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  title,
  subtitle,
  filenamePrefix,
  columns,
  currentViewData,
  allData,
  activeFiltersText,
  chartElementIdRef,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'preparing' | 'complete' | 'error'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTargetData = (): Record<string, any>[] => {
    if (exportScope === 'all' && allData && allData.length > 0) {
      return allData;
    }
    return currentViewData;
  };

  const getFormattedDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const generateFilename = (ext: string): string => {
    const dateStr = getFormattedDate();
    const scopeStr = exportScope === 'all' ? 'all' : 'filtered';
    return `${filenamePrefix}-${scopeStr}-${dateStr}.${ext}`;
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf' | 'png') => {
    if (isExporting) return;

    setIsExporting(true);
    setExportStatus('preparing');

    try {
      // Simulate minor async tick to ensure UI state renders cleanly
      await new Promise((resolve) => setTimeout(resolve, 300));

      const data = getTargetData();
      const filename = generateFilename(format);

      if (format === 'csv') {
        exportToCSV(filename, data, columns);
      } else if (format === 'xlsx') {
        exportToExcel(filename, title, data, columns);
      } else if (format === 'pdf') {
        const filterNote =
          exportScope === 'current'
            ? activeFiltersText || 'Active Table Filters'
            : 'All Unfiltered Records';
        exportToPDF(title, subtitle || 'Mini Operations ERP Export', columns, data, filename, filterNote);
      } else if (format === 'png' && chartElementIdRef) {
        await exportChartToPNG(chartElementIdRef, generateFilename('png'), title);
      }

      setExportStatus('complete');
      setTimeout(() => {
        setExportStatus('idle');
        setIsOpen(false);
      }, 1200);
    } catch (error) {
      console.error('Export Error:', error);
      setExportStatus('error');
      setTimeout(() => {
        setExportStatus('idle');
      }, 2500);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`flex items-center space-x-1.5 rounded-xl text-xs font-bold transition-all duration-200 border shadow-sm active:scale-95 disabled:opacity-60 ${
          variant === 'chart'
            ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 px-2.5 py-1.5'
            : variant === 'compact'
            ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 px-3 py-1.5'
            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 px-3.5 py-2 shadow-sm'
        }`}
        title="Export data or chart"
      >
        {isExporting ? (
          <Loader2 className="h-3.5 w-3.5 text-[#2563EB] animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5 text-[#2563EB]" />
        )}
        <span>
          {exportStatus === 'preparing'
            ? 'Preparing...'
            : exportStatus === 'complete'
            ? 'Exported!'
            : 'Export'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-slate-200/90 z-50 animate-modal-scale space-y-1">
          {/* Scope Selector if allData is available */}
          {allData && allData.length > 0 && (
            <div className="p-1 bg-slate-50 rounded-xl mb-1 flex items-center justify-between text-[11px] font-semibold border border-slate-100">
              <button
                type="button"
                onClick={() => setExportScope('current')}
                className={`flex-1 py-1 px-2 rounded-lg text-center transition ${
                  exportScope === 'current'
                    ? 'bg-white text-[#2563EB] shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Current View ({currentViewData.length})
              </button>
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`flex-1 py-1 px-2 rounded-lg text-center transition ${
                  exportScope === 'all'
                    ? 'bg-white text-[#2563EB] shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Export All ({allData.length})
              </button>
            </div>
          )}

          <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Select Format
          </div>

          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition"
          >
            <FileCode className="h-4 w-4 text-emerald-600" />
            <span>Export CSV (.csv)</span>
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            disabled={isExporting}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition"
          >
            <FileText className="h-4 w-4 text-rose-600" />
            <span>Export PDF Document (.pdf)</span>
          </button>

          {chartElementIdRef && (
            <button
              onClick={() => handleExport('png')}
              disabled={isExporting}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium transition border-t border-slate-100 pt-2"
            >
              <Image className="h-4 w-4 text-[#2563EB]" />
              <span>Export Chart PNG (.png)</span>
            </button>
          )}

          {exportStatus === 'error' && (
            <div className="px-3 py-1.5 text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-lg text-center">
              Unable to export data. Please try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
