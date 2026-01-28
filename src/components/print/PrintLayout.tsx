'use client';

import React from 'react';

interface PrintLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  reportType: 'TTF' | 'SVR' | 'QSC' | 'Quality Audit' | 'Training Audit' | 'Store Visit';
  restaurantName?: string;
  date?: string;
  preparedBy?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  compact?: boolean;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({
  children,
  title,
  subtitle,
  reportType,
  restaurantName,
  date,
  preparedBy,
  showHeader = true,
  showFooter = true,
  compact = false,
}) => {
  return (
    <div className={`print-report-container ${compact ? 'print-compact' : ''}`}>
      {/* Print-only Header */}
      {showHeader && (
        <div className="print-only print-ghidas-header">
          <div className="print-ghidas-logo-section">
            <div>
              <div className="print-ghidas-title">GHIDAS QMS</div>
              <div className="print-ghidas-subtitle">Quality Management System</div>
            </div>
          </div>
          <div className="print-ghidas-report-type">{reportType} Report</div>
        </div>
      )}

      {/* Report Title Section */}
      <div className="print-report-title">
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>

      {/* Report Info Grid */}
      {(restaurantName || date || preparedBy) && (
        <div className="print-info-grid">
          {restaurantName && (
            <div className="print-info-item">
              <div className="print-info-label">Restaurant</div>
              <div className="print-info-value">{restaurantName}</div>
            </div>
          )}
          {date && (
            <div className="print-info-item">
              <div className="print-info-label">Date</div>
              <div className="print-info-value">{date}</div>
            </div>
          )}
          {preparedBy && (
            <div className="print-info-item">
              <div className="print-info-label">Prepared By</div>
              <div className="print-info-value">{preparedBy}</div>
            </div>
          )}
          <div className="print-info-item">
            <div className="print-info-label">Generated</div>
            <div className="print-info-value">{new Date().toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {children}

      {/* Print-only Footer */}
      {showFooter && (
        <div className="print-only print-footer">
          <div className="print-footer-content">
            <span>GHIDAS Quality Management System</span>
            <span className="print-page-number"></span>
            <span>Confidential - Internal Use Only</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Print Section Component
interface PrintSectionProps {
  children: React.ReactNode;
  title: string;
  variant?: 'default' | 'alt' | 'warning';
}

export const PrintSection: React.FC<PrintSectionProps> = ({
  children,
  title,
  variant = 'default',
}) => {
  const headerClass = variant === 'alt'
    ? 'print-section-header-alt'
    : variant === 'warning'
    ? 'print-section-header-warning'
    : 'print-section-header';

  return (
    <div className="print-section">
      <div className={headerClass}>{title}</div>
      {children}
    </div>
  );
};

// Print Table Component
interface PrintTableProps {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  className?: string;
}

export const PrintTable: React.FC<PrintTableProps> = ({
  headers,
  rows,
  className = '',
}) => {
  return (
    <table className={`print-table ${className}`}>
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Print Status Badge
interface PrintStatusProps {
  status: 'pass' | 'fail' | 'warning' | 'na' | 'ok' | 'error' | 'pending';
  label?: string;
}

export const PrintStatus: React.FC<PrintStatusProps> = ({ status, label }) => {
  const statusClass = `print-status print-status-${status}`;
  const defaultLabels: Record<string, string> = {
    pass: 'PASS',
    fail: 'FAIL',
    warning: 'WARNING',
    na: 'N/A',
    ok: 'OK',
    error: 'ERROR',
    pending: 'PENDING',
  };

  return (
    <span className={statusClass}>
      {label || defaultLabels[status]}
    </span>
  );
};

// Print Score Badge
interface PrintScoreProps {
  score: number;
  showPercentage?: boolean;
}

export const PrintScore: React.FC<PrintScoreProps> = ({ score, showPercentage = true }) => {
  const getScoreClass = () => {
    if (score >= 90) return 'print-score print-score-excellent';
    if (score >= 75) return 'print-score print-score-good';
    if (score >= 60) return 'print-score print-score-average';
    return 'print-score print-score-poor';
  };

  return (
    <span className={getScoreClass()}>
      {score}{showPercentage ? '%' : ''}
    </span>
  );
};

// Print Temperature Cell
interface PrintTempCellProps {
  value: string | number;
  min?: number;
  max?: number;
}

export const PrintTempCell: React.FC<PrintTempCellProps> = ({ value, min = 0, max = 5 }) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  let tempClass = 'print-temp-ok';
  if (isNaN(numValue)) {
    tempClass = '';
  } else if (numValue < min || numValue > max) {
    tempClass = 'print-temp-critical';
  } else if (numValue === min || numValue === max) {
    tempClass = 'print-temp-warning';
  }

  return <span className={tempClass}>{value || '-'}</span>;
};

// Print Summary Box
interface PrintSummaryItem {
  label: string;
  value: string | number;
}

interface PrintSummaryBoxProps {
  title: string;
  items: PrintSummaryItem[];
}

export const PrintSummaryBox: React.FC<PrintSummaryBoxProps> = ({ title, items }) => {
  return (
    <div className="print-summary-box">
      <div className="print-summary-title">{title}</div>
      <div className="print-summary-grid">
        {items.map((item, index) => (
          <div key={index} className="print-summary-item">
            <div className="print-summary-value">{item.value}</div>
            <div className="print-summary-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Print Signature Section
interface SignatureField {
  label: string;
  name?: string;
}

interface PrintSignatureSectionProps {
  signatures: SignatureField[];
}

export const PrintSignatureSection: React.FC<PrintSignatureSectionProps> = ({ signatures }) => {
  return (
    <div className="print-signature-section">
      {signatures.map((sig, index) => (
        <div key={index} className="print-signature-box">
          <div className="print-signature-line">
            {sig.name && <span style={{ fontSize: '10pt' }}>{sig.name}</span>}
          </div>
          <div className="print-signature-label">{sig.label}</div>
        </div>
      ))}
    </div>
  );
};

// Print Action Box (for corrective actions)
interface PrintActionBoxProps {
  title: string;
  children: React.ReactNode;
}

export const PrintActionBox: React.FC<PrintActionBoxProps> = ({ title, children }) => {
  return (
    <div className="print-action-box">
      <div className="print-action-title">{title}</div>
      {children}
    </div>
  );
};

// Print Notes Section
interface PrintNotesProps {
  title?: string;
  children: React.ReactNode;
}

export const PrintNotes: React.FC<PrintNotesProps> = ({ title = 'Notes', children }) => {
  return (
    <div className="print-notes">
      <div className="print-notes-title">{title}</div>
      {children}
    </div>
  );
};

// Print Button Component
interface PrintButtonProps {
  onClick?: () => void;
  label?: string;
  className?: string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  onClick,
  label = 'Print Report',
  className = '',
}) => {
  const handlePrint = () => {
    if (onClick) {
      onClick();
    } else {
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      className={`no-print inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95 ${className}`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      {label}
    </button>
  );
};

export default PrintLayout;
