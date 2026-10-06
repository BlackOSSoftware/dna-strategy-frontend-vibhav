'use client';

import { useEffect, useRef, useState } from 'react';

const tokenKey = 'gridpilot-token';
const apiBase = () => (typeof location !== 'undefined' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' ? 'https://dna-api.emotionlesstraders.com' : '');

export default function DashboardClient({ markup }) {
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
    if (existing?.dataset.version === '15' && window.bootGridPilot) {
      start();
      return;
    }
    existing?.remove();
    const script = document.createElement('script');
    script.src = '/dashboard.js?v=15';
    script.dataset.gridpilot = '1';
    script.dataset.version = '15';
    script.addEventListener('load', start);
    document.body.appendChild(script);
  }, [phase, markup]);

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
          <button type="submit" disabled={busy || phase === 'checking'}>{phase === 'checking' ? 'Checking session…' : busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    );
  }
  return <div ref={ref} />;
}
