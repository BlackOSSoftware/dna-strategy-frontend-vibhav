import test from 'node:test';
import assert from 'node:assert/strict';
import {signalMarkers} from './signals.mjs';

test('marks the first closed BUY and SELL setup for the day', () => {
  const start = Date.parse('2026-10-06T04:00:00Z') / 1000;
  const bars = [
    {time:start,open:100,close:100,emaClose:null,emaOpen:100},
    {time:start+900,open:100,close:103,emaClose:101,emaOpen:100},
    {time:start+1800,open:101,close:104,emaClose:102,emaOpen:101},
    {time:start+2700,open:103,close:98,emaClose:100,emaOpen:101},
    {time:start+3600,open:101,close:97,emaClose:99,emaOpen:100}
  ];
  const markers = signalMarkers(bars, start+5400);
  assert.deepEqual(markers.map(marker => [marker.time, marker.text, marker.position]), [
    [start+900,'BUY signal','belowBar'],
    [start+2700,'SELL signal','aboveBar']
  ]);
});

test('does not mark a candle until its 15-minute interval has closed', () => {
  const time = Date.parse('2026-10-06T04:00:00Z') / 1000;
  const bars = [{time,open:100,close:103,emaClose:101,emaOpen:100}];
  assert.deepEqual(signalMarkers(bars,time+899),[]);
  assert.equal(signalMarkers(bars,time+900).length,1);
});
