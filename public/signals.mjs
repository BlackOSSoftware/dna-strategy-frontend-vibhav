const istDay = new Intl.DateTimeFormat('en-CA', {
  timeZone:'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit'
});

export function signalMarkers(candles, nowSeconds = Date.now() / 1000) {
  const marked = new Set();
  const markers = [];
  for (const bar of candles) {
    const time = Number(bar.time);
    if (!Number.isFinite(time) || time + 900 > nowSeconds) continue;
    if (bar.emaClose == null || bar.emaOpen == null) continue;
    const open = Number(bar.open), close = Number(bar.close);
    const emaClose = Number(bar.emaClose), emaOpen = Number(bar.emaOpen);
    if (![open, close, emaClose, emaOpen].every(Number.isFinite)) continue;
    const side = close > open && close > emaClose && close > emaOpen ? 'buy'
      : close < open && close < emaClose && close < emaOpen ? 'sell' : null;
    if (!side) continue;
    const key = `${istDay.format(new Date(time * 1000))}:${side}`;
    if (marked.has(key)) continue;
    marked.add(key);
    markers.push({
      time,
      position: side === 'buy' ? 'belowBar' : 'aboveBar',
      shape: side === 'buy' ? 'arrowUp' : 'arrowDown',
      color: side === 'buy' ? '#25874a' : '#c7434d',
      text: side === 'buy' ? 'BUY signal' : 'SELL signal'
    });
  }
  return markers;
}
