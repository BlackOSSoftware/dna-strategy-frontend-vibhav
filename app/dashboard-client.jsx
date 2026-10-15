'use client';

import { useEffect, useRef, useState } from 'react';

const tokenKey = 'gridpilot-token';
const apiBase = () => (typeof location !== 'undefined' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' ? 'https://dna-api.emotionlesstraders.com' : '');

export default function DashboardClient({markup,view='dashboard'}) {
  const ref = useRef(null);
  const [phase, setPhase] = useState('checking');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setPhase('out');
      return;
    }
    fetch(`${apiBase()}/api/session`, {headers: {Authorization: `Bearer ${token}`}})
      .then(response => {
        if (!response.ok) throw Error('Login required');
        setPhase('in');
      })
      .catch(() => {
        localStorage.removeItem(tokenKey);
        setPhase('out');
      });
  }, []);

  useEffect(() => {
    if (phase !== 'in') return;
    const root = ref.current;
    if (!root) return;
    root.innerHTML = markup;
    const pages={
      dashboard:{title:'Trading dashboard',description:'One direction. One signal. Managed grid execution.',breadcrumb:'Workspace / Overview',href:'/'},
      strategy:{title:'Strategy control',description:'Set direction, symbol, option, and order parameters together.',breadcrumb:'Workspace / Strategy control',href:'/strategy'},
      activity:{title:'Activity log',description:'Recent strategy and order events.',breadcrumb:'Workspace / Activity log',href:'/activity'}
    };
    const page=pages[view]||pages.dashboard;
    const heading=root.querySelector('.page-heading h1');
    const description=root.querySelector('.page-heading p');
    const breadcrumb=root.querySelector('.breadcrumb');
    if(heading)heading.textContent=page.title;
    if(description)description.textContent=page.description;
    if(breadcrumb)breadcrumb.textContent=page.breadcrumb;
    root.querySelectorAll('.rail nav a').forEach(link=>link.classList.toggle('active',link.getAttribute('href')===page.href));
    if (view === 'dashboard') {
      const settings = root.querySelector('#settings');
      const modal = document.createElement('dialog');
      modal.id = 'strategySettingsModal';
      modal.className = 'broker-modal strategy-settings-modal';
      modal.setAttribute('aria-label', 'Strategy Settings');
      const close = document.createElement('button');
      close.className = 'broker-close strategy-settings-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Close Strategy Settings');
      close.textContent = '×';
      close.onclick = () => modal.close();
      modal.append(close, settings);
      root.appendChild(modal);
      root.querySelector('#strategySettingsOpen').onclick = () => {
        modal.showModal();
        window.refreshGridPilotOption?.();
      };
      modal.addEventListener('click', event => {
        if (event.target === modal) modal.close();
      });
    }
    if(location.hash==='#brokerBook')requestAnimationFrame(()=>root.querySelector('#brokerBook')?.scrollIntoView());
    const actions = root.querySelector('.top-actions');
    if (actions && !actions.querySelector('#appLogout')) {
      const button = document.createElement('button');
      button.id = 'appLogout';
      button.className = 'secondary';
      button.type = 'button';
      button.textContent = 'Log out';
      button.onclick = () => {
        localStorage.removeItem(tokenKey);
        window.location.reload();
      };
      actions.appendChild(button);
    }
    const start = () => window.bootGridPilot?.();
    const existing = document.querySelector('script[data-gridpilot]');
    if (existing?.dataset.version === '66' && window.bootGridPilot) {
      start();
      return;
    }
    existing?.remove();
    const script = document.createElement('script');
    script.src = '/dashboard.js?v=66';
    script.dataset.gridpilot = '1';
    script.dataset.version = '66';
    script.addEventListener('load', start);
    document.body.appendChild(script);
  }, [phase,markup,view]);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBase()}/api/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: form.get('username'), password: form.get('password')})
      });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { throw Error('Sign in could not reach the API'); }
      if (!response.ok) throw Error(data.error || 'Login failed');
      localStorage.setItem(tokenKey, data.token);
      setPhase('in');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'checking') {
    return (
      <div className="app-loader" role="status" aria-live="polite">
        <div className="loader-card">
          <svg className="bull-loader" viewBox="0 0 160 110" aria-hidden="true">
            <ellipse className="bull-shadow" cx="80" cy="101" rx="54" ry="5" />
            <g className="bull-run">
              <path className="bull-tail" d="M31 52 Q12 44 17 28" />
              <g className="bull-leg bull-leg-back"><path d="M53 72 L45 96 L37 96" /><path d="M70 73 L77 96 L85 96" /></g>
              <ellipse className="bull-body" cx="74" cy="55" rx="47" ry="31" />
              <path className="bull-neck" d="M94 35 Q109 27 121 38 L123 67 Q109 78 98 67 Z" />
              <g className="bull-leg bull-leg-front"><path d="M95 72 L91 96 L83 96" /><path d="M110 70 L120 96 L128 96" /></g>
              <path className="bull-head" d="M113 32 Q133 23 143 37 L145 59 Q136 68 117 59 Z" />
              <path className="bull-horn" d="M119 32 Q109 17 112 11 Q115 21 128 27" />
              <path className="bull-horn" d="M134 31 Q142 16 150 15 Q148 27 141 36" />
              <ellipse className="bull-muzzle" cx="143" cy="54" rx="12" ry="8" />
              <circle className="bull-eye" cx="134" cy="40" r="2.5" />
            </g>
          </svg>
          <strong>Loading dashboard</strong>
          <span>Checking your session…</span>
        </div>
      </div>
    );
  }
  if (phase !== 'in') {
    return (
      <main className="login-screen">
        <form className="login-card" onSubmit={submit}>
          <div className="brandmark">◈</div>
          <div className="eyebrow">GRIDPILOT</div>
          <h1>Sign in</h1>
          <p>Enter the console ID and password to open the trading dashboard.</p>
          <label>ID<input name="username" autoComplete="username" required autoFocus /></label>
          <label className="login-secret">Password<input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required /><button type="button" className="login-reveal" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    );
  }
  return <div ref={ref} className={`view-${view}`} />;
}
