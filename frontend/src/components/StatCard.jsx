import React from 'react';

export default function StatCard({ value, label, subtext, variant = 'default', onClick, active = false }) {
  const getVariantClass = () => {
    if (variant === 'primary') return 'primary';
    if (variant === 'urgent') return 'urgent-card';
    if (variant === 'warning') return 'warning-card';
    return '';
  };

  return (
    <div
      className={`stat-card ${getVariantClass()} ${active ? 'active-filter' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
