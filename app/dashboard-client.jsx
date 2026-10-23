'use client';

import React, { useEffect, useRef, useState } from 'react';

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
    if (view === 'strategy') {
      const head = root.querySelector('#settings .card-head');
      const banner = root.querySelector('#signalBanner');
      const run = root.querySelector('.strategy-run');
      if (banner && head) head.prepend(banner);
      if (run && head) head.append(run);
    }
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
      const run = root.querySelector('.strategy-run');
      const head = settings.querySelector('.card-head');
      if (run && head && !head.querySelector('.strategy-run')) {
        const copy = run.cloneNode(true);
        copy.classList.add('strategy-run-copy');
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        copy.addEventListener('click', event => {
          const button = event.target.closest('button');
          if (!button) return;
          const label = button.textContent.trim();
          [...run.querySelectorAll('button')].find(item => item.textContent.trim() === label)?.click();
        });
        head.append(copy);
      }
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
    if (existing?.dataset.version === '81' && window.bootGridPilot) {
      start();
      return;
    }
    existing?.remove();
    const script = document.createElement('script');
    script.src = '/dashboard.js?v=100';
    script.dataset.gridpilot = '1';
    script.dataset.version = '81';
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
        <div className="loader-card chip-loader-card">
          <div className="chip-loader">
            <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="chipGradient" x1={0} y1={0} x2={0} y2={1}>
                  <stop offset="0%" stopColor="#2d2d2d" />
                  <stop offset="100%" stopColor="#0f0f0f" />
                </linearGradient>
                <linearGradient id="textGradient" x1={0} y1={0} x2={0} y2={1}>
                  <stop offset="0%" stopColor="#eeeeee" />
                  <stop offset="100%" stopColor="#888888" />
                </linearGradient>
                <linearGradient id="pinGradient" x1={1} y1={0} x2={0} y2={0}>
                  <stop offset="0%" stopColor="#bbbbbb" />
                  <stop offset="50%" stopColor="#888888" />
                  <stop offset="100%" stopColor="#555555" />
                </linearGradient>
              </defs>
              <g>
                <path d="M100 100 H200 V210 H326" className="trace-bg" /><path d="M100 100 H200 V210 H326" className="trace-flow purple" />
                <path d="M80 180 H180 V230 H326" className="trace-bg" /><path d="M80 180 H180 V230 H326" className="trace-flow blue" />
                <path d="M60 260 H150 V250 H326" className="trace-bg" /><path d="M60 260 H150 V250 H326" className="trace-flow yellow" />
                <path d="M100 350 H200 V270 H326" className="trace-bg" /><path d="M100 350 H200 V270 H326" className="trace-flow green" />
                <path d="M700 90 H560 V210 H474" className="trace-bg" /><path d="M700 90 H560 V210 H474" className="trace-flow blue" />
                <path d="M740 160 H580 V230 H474" className="trace-bg" /><path d="M740 160 H580 V230 H474" className="trace-flow green" />
                <path d="M720 250 H590 V250 H474" className="trace-bg" /><path d="M720 250 H590 V250 H474" className="trace-flow red" />
                <path d="M680 340 H570 V270 H474" className="trace-bg" /><path d="M680 340 H570 V270 H474" className="trace-flow yellow" />
              </g>
              <rect x={330} y={190} width={140} height={100} rx={20} ry={20} fill="url(#chipGradient)" stroke="#222" strokeWidth={3} filter="drop-shadow(0 0 6px rgba(0,0,0,0.8))" />
              <g>
                {[205, 225, 245, 265].map(y => (
                  <React.Fragment key={y}>
                    <rect x={322} y={y} width={8} height={10} fill="url(#pinGradient)" rx={2} />
                    <rect x={470} y={y} width={8} height={10} fill="url(#pinGradient)" rx={2} />
                  </React.Fragment>
                ))}
              </g>
              <text x={400} y={246} fontFamily="Arial, sans-serif" fontSize={22} fill="url(#textGradient)" textAnchor="middle">Loading</text>
              {[[100, 100], [80, 180], [60, 260], [100, 350], [700, 90], [740, 160], [720, 250], [680, 340]].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="black" />
              ))}
            </svg>
          </div>
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
