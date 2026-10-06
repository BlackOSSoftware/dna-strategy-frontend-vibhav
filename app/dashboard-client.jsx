'use client';

import { useEffect, useRef } from 'react';

export default function DashboardClient({ markup }) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = markup;
    const start = () => window.bootGridPilot?.();
    const existing = document.querySelector('script[data-gridpilot]');
    if (existing?.dataset.version === '13' && window.bootGridPilot) {
      start();
      return;
    }
    existing?.remove();
    const script = document.createElement('script');
    script.src = '/dashboard.js?v=13';
    script.dataset.gridpilot = '1';
    script.dataset.version = '13';
    script.addEventListener('load', start);
    document.body.appendChild(script);
  }, [markup]);
  return <div ref={ref} />;
}
