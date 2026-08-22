import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Clean RFC 4180 CSV export with UTF-8 BOM
 */
export const exportToCSV = (
  filename: string,
  data: Record<string, any>[],
  columns: ExportColumn[]
): void => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      let val = row[col.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    })
  );

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Real Excel (.xlsx) file export using SheetJS XLSX engine
 */
export const exportToExcel = (
  filename: string,
  sheetName: string,
  data: Record<string, any>[],
  columns: ExportColumn[]
): void => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const formattedData = data.map((row) => {
    const item: Record<string, any> = {};
    columns.forEach((col) => {
      let val = row[col.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      item[col.header] = val;
    });
    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column auto-widths
  const colWidths = columns.map((col) => ({
    wch: Math.max(col.header.length + 4, col.width || 14),
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Data Export');

  const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, fullFilename);
};

/**
 * Professional PDF Report Export with Mini Operations ERP Branding
 */
export const exportToPDF = (
  title: string,
  subtitle: string,
  columns: ExportColumn[],
  data: Record<string, any>[],
  filename: string,
  activeFilters?: string
): void => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner - Ocean Blue Accent (#2563EB)
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MINI OPERATIONS ERP', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('ENTERPRISE OPERATIONS REPORT', 14, 18);

  // Date & Timestamp
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth - 14, 12, { align: 'right' });

  // Report Sub-Header
  doc.setTextColor(15, 23, 42); // Dark Navy #0F172A
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 34);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Muted Slate #64748B
    doc.text(subtitle, 14, 40);
  }

  if (activeFilters) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text(`Applied Filters: ${activeFilters}`, 14, subtitle ? 46 : 41);
  }

  // Data Table Formatting
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      let val = row[col.key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    })
  );

  const startY = activeFilters ? (subtitle ? 50 : 45) : (subtitle ? 44 : 38);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Ocean Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (dataArg) => {
      // Footer page numbering
      const str = `Page ${dataArg.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      doc.text(
        'Confidential — Mini Operations ERP Audit System',
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    },
  });

  const fullFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(fullFilename);
};

/**
 * High-Resolution PNG Chart Image Export
 */
export const exportChartToPNG = async (
  elementIdOrRef: string | HTMLElement,
  filename: string,
  chartTitle?: string
): Promise<void> => {
  try {
    const element =
      typeof elementIdOrRef === 'string'
        ? document.getElementById(elementIdOrRef)
        : elementIdOrRef;

    if (!element) {
      alert('Chart element not found for export.');
      return;
    }

    const dataUrl = await toPng(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#FFFFFF',
    });

    const fullFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
    const link = document.createElement('a');
    link.download = fullFilename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export chart image:', error);
    alert('Unable to export chart image. Please try again.');
  }
};
