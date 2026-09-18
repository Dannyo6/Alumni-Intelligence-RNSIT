import { useMemo } from 'react';
import { useTheme } from '../../contexts/theme';

/**
 * Recharts takes literal colour strings, not CSS classes, so chart chrome has
 * to be resolved in JS. Keyed off the theme so charts flip with the app.
 */
export const useChartTheme = () => {
  const { theme } = useTheme();

  return useMemo(() => {
    const dark = theme === 'dark';
    return {
      grid: dark ? '#1e293b' : '#eef2f7',
      axis: dark ? '#94a3b8' : '#64748b',
      label: dark ? '#cbd5e1' : '#334155',
      cursor: dark ? 'rgba(148,163,184,0.08)' : 'rgba(241,245,249,0.9)',
      tooltip: {
        borderRadius: '10px',
        border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
        backgroundColor: dark ? '#172033' : '#ffffff',
        color: dark ? '#f1f5f9' : '#0f172a',
        boxShadow: dark
          ? '0 12px 28px -6px rgba(0,0,0,0.5)'
          : '0 12px 28px -6px rgba(15,23,42,0.12)',
        fontSize: '12px',
        padding: '8px 12px',
      } as React.CSSProperties,
      labelStyle: { color: dark ? '#94a3b8' : '#64748b', fontSize: '11px' } as React.CSSProperties,
      /** Categorical series palette — tuned to stay legible on both canvases. */
      series: dark
        ? ['#60a5fa', '#2dd4bf', '#a78bfa', '#fbbf24', '#fb7185', '#38bdf8',
           '#34d399', '#f472b6', '#818cf8', '#facc15', '#94a3b8', '#a3e635']
        : ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#e11d48', '#0284c7',
           '#059669', '#db2777', '#4f46e5', '#ca8a04', '#64748b', '#65a30d'],
    };
  }, [theme]);
};
