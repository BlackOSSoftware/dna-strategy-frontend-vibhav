import test from 'node:test';
import assert from 'node:assert/strict';
import {signalMarkers} from './signals.mjs';

test('marks the first closed BUY and SELL setup for the day', () => {
  const start = Date.parse('2026-10-06T04:00:00Z') / 1000;
  const bars = [
    {time:start,open:100,close:100,smaClose:null,smaOpen:100},
    {time:start+900,open:100,close:103,smaClose:101,smaOpen:100},
    {time:start+1800,open:101,close:104,smaClose:102,smaOpen:101},
    {time:start+2700,open:103,close:98,smaClose:100,smaOpen:101},
    {time:start+3600,open:101,close:97,smaClose:99,smaOpen:100}
  ];
  const markers = signalMarkers(bars, start+5400);
  assert.deepEqual(markers.map(marker => [marker.time, marker.text, marker.position]), [
    [start+900,'BUY signal','belowBar'],
    [start+2700,'SELL signal','aboveBar']
  ]);
});

test('does not mark a candle until its 15-minute interval has closed', () => {
  const time = Date.parse('2026-10-06T04:00:00Z') / 1000;
  const bars = [{time,open:100,close:103,smaClose:101,smaOpen:100}];
  assert.deepEqual(signalMarkers(bars,time+899),[]);
  assert.equal(signalMarkers(bars,time+900).length,1);
});
