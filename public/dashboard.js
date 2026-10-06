const authToken=()=>localStorage.getItem('gridpilot-token')||'';
const apiBase=()=>location.hostname==='localhost'||location.hostname==='127.0.0.1'?'':'https://dna-api.emotionlesstraders.com';
const rawFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{const source=typeof input==='string'?input:(input?.url||'');const url=source.startsWith('/api/')?apiBase()+source:source;if(String(url).includes('/api/')){const headers=new Headers(init.headers||{});if(authToken())headers.set('Authorization','Bearer '+authToken());init={...init,headers};}return rawFetch(url,init).then(response=>{if(response.status===401&&!String(url).endsWith('/api/login')){localStorage.removeItem('gridpilot-token');location.reload();}return response;});};
function liveSocketUrl(){const base=location.hostname.endsWith('emotionlesstraders.com')?'wss://dna-api.emotionlesstraders.com/ws':'ws://127.0.0.1:4000/ws';return base+'?token='+encodeURIComponent(authToken());}
let state=null, chosen='buy', marketKey='', marketLast=null, chartBars=[], tvChart=null, candleSeries=null, volumeSeries=null, smaCloseSeries=null, smaOpenSeries=null, stopLine=null, highLine=null, lowLine=null, gridLines=[], brokerWasConnected=false, optionBoard=null, editingOrder=null;
const $=id=>document.getElementById(id);
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=n=>n==null?'—':Number(n).toFixed(2);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,data){const r=await fetch('/api/'+path,{method:path==='state'?'GET':'POST',headers:{'Content-Type':'application/json'},body:path==='state'?undefined:JSON.stringify(data||{})});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');state=j;render();return j;}
function toast(message,error=false){const el=$('toast');el.textContent=message;el.className='show'+(error?' error':'');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.className='',4200);}
async function action(path,data){try{await api(path,data);toast('Updated successfully');}catch(e){toast(e.message,true);}}
function setDirection(d){chosen=d;$('buyDirection').className=d==='buy'?'selected':'';$('shortDirection').className=d==='short'?'selected short':'';refreshOption();}
function paintOption(contract,error){const detail=$('optionDetail');const tag=$('optionTag');if(!detail||!tag)return;if(error){detail.textContent=error;tag.textContent='—';paintGrid(null,error);return;}if(!contract){detail.textContent='Waiting for Nifty price';tag.textContent='—';paintGrid(null);return;}detail.textContent=`${contract.label} · ${contract.expiry} · scrip ${contract.scripCode||'—'} · lot ${contract.lotSize||'—'} · Nifty ${num(contract.spot)}`;tag.textContent=contract.moneyness||'—';if(Array.isArray(contract.grid)||contract.gridError)paintGrid(contract);}
function gridRows(data){if(data?.orders?.length)return data.orders;const quantity=state?.config?.quantity||1;const side=data?.side==='short'?'short':'buy';return (data?.grid||[]).map(row=>({...row,id:null,status:'draft',quantity,side}));}
function orderStatus(status){return status==='pending'?'Pending':status==='open'?'Open':status==='closed'?'Closed':'Not placed';}
function trailLabel(row){if(row.trailText)return row.trailText;const start=Number(state?.config?.trailStartLeg)||3;const step=Number(state?.config?.trailStep)||8;const initial=Number(state?.config?.initialStop)||20;return row.level>=start?`Trail ${step} pts`:`${initial} pt stop`;}
function orderButtons(row){const level=row.level;if(row.status==='closed')return '';if(row.brokerOrderId)return row.status==='pending'?`<button type="button" data-order="unplace" data-level="${level}">Unplace</button>`:'';const send=`<button type="button" data-order="place" data-level="${level}">Send live</button>`;if(row.status==='open')return send;const pending=row.status==='pending'?`<button type="button" data-order="unplace" data-level="${level}">Unplace</button>`:'';return `${send}${pending}<button type="button" data-order="edit" data-level="${level}">Edit</button><button type="button" class="danger" data-order="remove" data-level="${level}">Remove</button>`;}
function paintGrid(data,error){if(data)optionBoard=data;const title=$('gridTitle'),price=$('gridPrice'),body=$('gridBody'),note=$('gridNote');if(!body)return;const trailStep=Number(state?.config?.trailStep)||8,trailFrom=Number(state?.config?.trailStartLeg)||3,initialStop=Number(state?.config?.initialStop)||20;if(note)note.textContent=`Send live submits a real entry order to Sharekhan. Grid target, stop, and trail values do not place broker exit orders.`;if(error||!data?.label){if(title)title.textContent='Detected option';if(price)price.textContent='—';body.innerHTML=`<tr><td colspan="10" class="empty-row">${escape(error||'Waiting for the option price')}</td></tr>`;return;}if(title)title.textContent=`${data.label} · ${data.expiry}`;if(data.price==null){if(price)price.textContent='Price unavailable';body.innerHTML=`<tr><td colspan="10" class="empty-row">${escape(data.gridError||'Option price is unavailable right now')}</td></tr>`;return;}if(price&&price.textContent!==num(data.price))price.textContent=num(data.price);const rows=gridRows(data);body.innerHTML=rows.map(row=>{const gap=row.entry-data.price;const distance=`${gap>0?'+':''}${num(gap)}`;const editing=editingOrder&&editingOrder.level===row.level;if(editing)return `<tr class="grid-edit"><td>${row.level}</td><td>${row.side==='short'?'SHORT':'BUY'}</td><td><input name="entry" value="${row.entry}"></td><td><input name="target" value="${row.target}"></td><td><input name="stop" value="${row.stop}"></td><td>${escape(trailLabel(row))}</td><td>${distance}</td><td><input name="quantity" value="${row.quantity}"></td><td>${orderStatus(row.status)}</td><td class="row-actions"><button type="button" data-order="save" data-level="${row.level}">Save</button><button type="button" data-order="cancel">Cancel</button></td></tr>`;return `<tr data-level="${row.level}" class="${row.status==='pending'?'grid-next':''}"><td>${row.level}</td><td>${row.side==='short'?'SHORT':'BUY'}</td><td>${num(row.entry)}</td><td>${num(row.target)}</td><td>${num(row.stop)}</td><td>${escape(trailLabel(row))}</td><td data-field="distance">${distance}</td><td>${row.quantity}</td><td data-field="status">${orderStatus(row.status)}</td><td class="row-actions">${orderButtons(row)}</td></tr>`;}).join('')||'<tr><td colspan="10" class="empty-row">No orders</td></tr>';}
async function orderAction(action,row,extra={}){try{if(action==='place'&&$('brokerBadge')?.textContent!=='CONNECTED'){$('brokerOpen').click();toast('Sharekhan login abhi complete nahi hai. Login khul gaya hai. OTP ke baad Send live dubara dabao.',true);return;}await api('option-order',{action,id:row?.id||undefined,level:row?.level,side:row?.side||optionBoard?.side||chosen,rows:gridRows(optionBoard),...extra});editingOrder=null;await refreshOption();toast(action==='place'?'Live order sent':action==='unplace'?'Order unplaced':action==='remove'?'Order removed':action==='add'?'Order added':'Order modified');}catch(error){if(/Connect Sharekhan/.test(error.message))$('brokerOpen').click();toast(error.message,true);}}
let optionRequest=0;
async function refreshOption(){if(editingOrder)return;const id=++optionRequest;const form=$('settingsForm');if(!form)return;const params=new URLSearchParams({moneyness:form.optionMoneyness.value,depth:form.optionDepth.value,right:form.optionRight.value,direction:state?.direction||chosen,gridStep:form.gridStep.value,targetPoints:form.targetPoints.value,initialStop:form.initialStop.value,maxLegs:form.maxLegs.value,tickSize:form.tickSize.value,trailStartLeg:form.trailStartLeg.value});if(marketLast)params.set('spot',String(marketLast));const locked=state?.option;if(locked?.strike&&state?.direction){params.set('strike',locked.strike);params.set('expiry',locked.expiry);params.set('right',locked.optionType);params.set('scrip',locked.scripCode||'');params.set('lot',locked.lotSize||'');params.set('moneyness',locked.moneyness||'');}$('optionDetail').textContent='Detecting the option and its price…';try{const response=await fetch('/api/option?'+params);const data=await response.json();if(id!==optionRequest)return;if(!response.ok)throw Error(data.error||'Option detection failed');paintOption(data);}catch(error){if(id===optionRequest)paintOption(null,error.message);}}
function fillSettings(c){for(const [k,v] of Object.entries(c)){const el=document.querySelector(`[name="${k}"]`);if(el)el.value=v;}}
let symbolMatches=[];
function applySymbol(item){
  document.querySelector('[name="symbol"]').value=item.tradingSymbol;
  document.querySelector('[name="scripCode"]').value=item.scripCode;
  if(item.tickSize)document.querySelector('[name="tickSize"]').value=item.tickSize;
  if(item.lotSize>0)document.querySelector('[name="quantity"]').value=item.lotSize;
  $('symbolResults').hidden=true;
}
async function searchSymbols(query){
  const box=$('symbolResults');
  const q=query.trim();
  if(q.length<1){symbolMatches=[];box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;box.innerHTML='<div class="symbol-empty">Searching Sharekhan master…</div>';
  try{
    const response=await fetch('/api/instruments?exchange='+encodeURIComponent(document.querySelector('[name="exchange"]').value)+'&q='+encodeURIComponent(q));
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Scrip search failed');
    symbolMatches=data;
    box.innerHTML=data.length?data.map((item,index)=>`<button type="button" data-index="${index}"><b>${escape(item.tradingSymbol)}</b> · ${escape(item.scripCode)}<small>${escape(item.companyName||item.detail||'Sharekhan scrip')}${item.companyName&&item.detail?' · '+escape(item.detail):''}</small></button>`).join(''):'<div class="symbol-empty">No matching scrip in this exchange</div>';
  }catch(error){symbolMatches=[];box.innerHTML=`<div class="symbol-empty">${escape(error.message)}</div>`;}
}
function render(){if(!state)return;const s=state,c=s.config;
  $('status').textContent=s.status[0].toUpperCase()+s.status.slice(1);
  $('status').className='value '+(s.status==='running'?'positive':s.status==='killed'?'negative':'');
  $('statusSub').textContent=s.haltReason|| (s.direction?`${s.direction.toUpperCase()} · ${s.mode} · ${s.day||'today'}`:'Select direction to begin');
  $('pnl').textContent=money(s.pnl);$('pnl').className='value '+(s.pnl>0?'positive':s.pnl<0?'negative':'');
  $('openLegs').innerHTML=`${s.legs.length} <em>/ ${c.maxLegs}</em>`;
  $('legSub').textContent=s.level?`Level ${s.level} reached`:'Waiting for first signal';
  $('sharedStop').textContent=num(s.sharedStop);
  $('chartTitle').innerHTML=`${escape(c.symbol)} <span>· ${escape(c.exchange)}</span>`;
  $('lastPrice').textContent=marketLast!=null?num(marketLast):num(s.lastPrice);$('bufferLabel').textContent=`${c.entryBuffer} pts`;
  $('directionBadge').textContent=s.status==='running'?`${(s.direction||'BUY').toUpperCase()} RUNNING`:s.status==='paused'?'STOPPED':'NOT STARTED';
  $('directionBadge').className='badge '+(s.status==='running'?(s.direction||'buy'):'neutral');
  $('pendingBox').textContent=s.pending?`Trigger waiting · ${s.pending.side.toUpperCase()} at ${num(s.pending.price)}${s.option?` · ${s.option.label}`:''}`:(s.level?'Entry cycle used · no re-entry':'No trigger candle yet');
  if(s.option?.scripCode&&s.direction)paintOption(s.option);
  $('start').disabled=s.status==='running';$('stop').disabled=s.status!=='running';
  $('buyDirection').disabled=!!s.direction;$('shortDirection').disabled=!!s.direction;
  $('activityList').innerHTML=s.events.length?s.events.slice(0,16).map(e=>`<div class="activity-item"><div class="activity-icon ${escape(e.type)}">${e.type==='risk'?'!':e.type==='exit'?'↙':'↗'}</div><div class="activity-body"><b>${escape(e.message)}</b><small>${new Date(e.time).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}${e.pnl!=null?' · '+money(e.pnl):''}</small></div></div>`).join(''):'<div class="empty-activity">No activity yet</div>';
  syncStopLine(s.sharedStop);
  const key=`${c.exchange}:${c.scripCode||''}`;
  if(key!==marketKey){marketKey=key;loadMarket(true);}
}
function showChartMessage(message){const el=$('emptyChart');el.style.display='grid';el.textContent=message;}
function istStamp(time){const seconds=typeof time==='number'?time:Math.floor(Date.UTC(time.year,time.month-1,time.day)/1000);return new Date(seconds*1000).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
function barChange(bar){const index=chartBars.findIndex(item=>item.time===bar.time);const full=index>=0?chartBars[index]:bar;const prev=index>0?chartBars[index-1]:null;const base=prev?prev.close:Number(full.open);const change=Number(full.close)-base;return {full,change,pct:base?(change/base)*100:0};}
function paintMove(change,pct,element){element.textContent=`${change>=0?'+':''}${num(change)} (${change>=0?'+':''}${pct.toFixed(2)}%)`;element.className=change>=0?'up':'down';}
function paintBar(bar){if(!bar)return;const {full,change,pct}=barChange(bar);$('barOpen').textContent=num(full.open);$('barHigh').textContent=num(full.high);$('barLow').textContent=num(full.low);$('barClose').textContent=num(full.close);$('barClose').className=full.close>=full.open?'up':'down';$('barVolume').textContent=full.volume==null?'—':Number(full.volume).toLocaleString('en-IN');paintMove(change,pct,$('barChange'));$('smaCloseValue').textContent=full.smaClose==null?'—':num(full.smaClose);$('smaOpenValue').textContent=full.smaOpen==null?'—':num(full.smaOpen);$('barTime').textContent=istStamp(full.time);}
function paintHeader(bar){if(!bar)return;$('lastPrice').textContent=num(bar.close);paintMove(barChange(bar).change,barChange(bar).pct,$('priceChange'));$('priceChange').classList.add('chg');}
function loadChartLibrary(){if(window.LightweightCharts)return Promise.resolve();return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/lightweight-charts.js';script.onload=()=>resolve();script.onerror=()=>reject(Error('TradingView chart library failed to load'));document.head.appendChild(script);});}
function ensureChart(){if(tvChart)return;const library=window.LightweightCharts;tvChart=library.createChart($('tvChart'),{autoSize:true,layout:{background:{color:'#ffffff'},textColor:'#62748b',fontFamily:'DM Sans, Arial, sans-serif'},grid:{vertLines:{color:'#d5deea'},horzLines:{color:'#d5deea'}},rightPriceScale:{borderColor:'#dce3ec'},timeScale:{borderColor:'#dce3ec',timeVisible:true,secondsVisible:false,rightOffset:4,barSpacing:9,minBarSpacing:3,tickMarkFormatter:istStamp},localization:{locale:'en-IN',timeFormatter:istStamp},crosshair:{mode:library.CrosshairMode.Normal,vertLine:{color:'#94a3b8',width:1,labelBackgroundColor:'#334155'},horzLine:{color:'#94a3b8',width:1,labelBackgroundColor:'#334155'}},handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false},handleScale:{mouseWheel:true,pinch:true,axisPressedMouseMove:{time:true,price:true}}});candleSeries=tvChart.addSeries(library.CandlestickSeries,{upColor:'#3b9c60',downColor:'#d85d68',borderVisible:false,wickUpColor:'#3b9c60',wickDownColor:'#d85d68',priceLineVisible:true,lastValueVisible:true});candleSeries.priceScale().applyOptions({scaleMargins:{top:0.08,bottom:0.28}});volumeSeries=tvChart.addSeries(library.HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'volume',priceLineVisible:false,lastValueVisible:false});tvChart.priceScale('volume').applyOptions({scaleMargins:{top:0.76,bottom:0},borderVisible:false});smaCloseSeries=tvChart.addSeries(library.LineSeries,{color:'#469b4b',lineWidth:2,priceLineVisible:false,lastValueVisible:true,title:'5 SMA'});smaOpenSeries=tvChart.addSeries(library.LineSeries,{color:'#7869cf',lineWidth:2,priceLineVisible:false,lastValueVisible:true,title:'6 SMA'});tvChart.subscribeCrosshairMove(param=>{if(!param.time){paintBar(chartBars.at(-1));return;}const bar=param.seriesData?.get(candleSeries);if(bar)paintBar(bar);});}
function syncStopLine(price){if(!candleSeries||!window.LightweightCharts)return;if(stopLine){candleSeries.removePriceLine(stopLine);stopLine=null;}if(price==null)return;stopLine=candleSeries.createPriceLine({price:Number(price),color:'#c68d22',lineWidth:1,lineStyle:window.LightweightCharts.LineStyle.Dashed,axisLabelVisible:true,title:'Stop'});}
function syncRangeLines(candles){if(!candleSeries||!candles.length)return;if(highLine)candleSeries.removePriceLine(highLine);if(lowLine)candleSeries.removePriceLine(lowLine);const high=Math.max(...candles.map(candle=>candle.high));const low=Math.min(...candles.map(candle=>candle.low));const dotted=window.LightweightCharts.LineStyle.Dotted;highLine=candleSeries.createPriceLine({price:high,color:'#3b9c60',lineWidth:1,lineStyle:dotted,axisLabelVisible:true,title:'High'});lowLine=candleSeries.createPriceLine({price:low,color:'#d85d68',lineWidth:1,lineStyle:dotted,axisLabelVisible:true,title:'Low'});$('rangeHigh').textContent=num(high);$('rangeLow').textContent=num(low);}
async function loadMarket(resetView=false){const config=state?.config;if(!config?.scripCode){showChartMessage('Choose Nifty 50 from the search list to load the chart');return;}if(resetView||!tvChart)showChartMessage('Loading Sharekhan 15-minute candles…');try{await loadChartLibrary();ensureChart();const response=await fetch(`/api/market?exchange=${encodeURIComponent(config.exchange)}&scripCode=${encodeURIComponent(config.scripCode)}&symbol=${encodeURIComponent(config.symbol||'')}`);const data=await response.json();if(!response.ok)throw Error(data.error||'Chart data failed');const candles=data.candles||[];chartBars=candles;$('chartWatermark').textContent=config.symbol||'NIFTY';candleSeries.setData(candles.map(candle=>({time:candle.time,open:candle.open,high:candle.high,low:candle.low,close:candle.close})));const volumeBars=candles.filter(candle=>Number(candle.volume)>0);volumeSeries.setData(volumeBars.map(candle=>({time:candle.time,value:candle.volume,color:candle.close>=candle.open?'rgba(59,156,96,0.45)':'rgba(216,93,104,0.45)'})));candleSeries.priceScale().applyOptions({scaleMargins:{top:0.08,bottom:volumeBars.length?0.28:0.08}});tvChart.priceScale('volume').applyOptions({scaleMargins:{top:volumeBars.length?0.76:1,bottom:0},visible:volumeBars.length>0});smaCloseSeries.setData(candles.filter(candle=>candle.smaClose!=null).map(candle=>({time:candle.time,value:candle.smaClose})));smaOpenSeries.setData(candles.filter(candle=>candle.smaOpen!=null).map(candle=>({time:candle.time,value:candle.smaOpen})));const last=data.last;marketLast=last?.close??null;if(last){candleSeries.applyOptions({priceLineColor:last.close>=last.open?'#3b9c60':'#d85d68'});paintHeader(last);}paintBar(last);syncRangeLines(candles);syncStopLine(state?.sharedStop);if(resetView)tvChart.timeScale().fitContent();$('emptyChart').style.display='none';refreshOption();}catch(error){if(resetView||!tvChart)marketLast=null;showChartMessage(error.message);}}
let bootTimers=[];
let liveSocket=null,lastNifty=null,lastOption=null,liveSignature='';
function colorPrice(el,value,prev){if(!el||value==null)return;const text=num(value);if(el.textContent!==text)el.textContent=text;if(prev==null||value===prev)return;el.classList.remove('up','down','tick-flash');el.classList.add(value>prev?'up':'down');void el.offsetWidth;el.classList.add('tick-flash');}
function applyTick(msg){if(msg?.type!=='tick')return;const age=$('liveAge');const ageText=msg.error||'Live';if(age&&age.textContent!==ageText)age.textContent=ageText;if(msg.price==null)return;colorPrice($('gridPrice'),msg.price,lastOption);if(msg.nifty)colorPrice($('lastPrice'),msg.nifty,lastNifty);document.querySelectorAll('#gridBody tr[data-level]').forEach(tr=>{if(tr.classList.contains('grid-edit'))return;const entry=Number(tr.children[2]?.textContent);const cell=tr.querySelector('[data-field=distance]');if(cell&&Number.isFinite(entry)){const gap=entry-msg.price;const text=`${gap>0?'+':''}${num(gap)}`;const tone=gap>0?'up':gap<0?'down':'';if(cell.textContent!==text)cell.textContent=text;if(cell.className!==tone)cell.className=tone;}const order=(msg.orders||[]).find(item=>item.level===Number(tr.dataset.level));const status=tr.querySelector('[data-field=status]');if(status&&order)status.textContent=orderStatus(order.status);});if(msg.nifty&&candleSeries&&chartBars.length){const bar=chartBars.at(-1);bar.close=msg.nifty;bar.high=Math.max(bar.high,msg.nifty);bar.low=Math.min(bar.low,msg.nifty);candleSeries.update({time:bar.time,open:bar.open,high:bar.high,low:bar.low,close:bar.close});}const signature=(msg.orders||[]).map(order=>`${order.level}:${order.status}`).join();if(liveSignature&&signature&&signature!==liveSignature&&!editingOrder)refreshOption();liveSignature=signature;lastOption=msg.price;if(msg.nifty)lastNifty=msg.nifty;}
function connectLive(){if(liveSocket&&liveSocket.readyState<2)return;liveSocket=new WebSocket(liveSocketUrl());liveSocket.onmessage=event=>{try{applyTick(JSON.parse(event.data));}catch{}};liveSocket.onclose=()=>{liveSocket=null;setTimeout(connectLive,500);};}
function paintBrokerBook(book){const meta=$('brokerBookMeta'),orders=$('brokerOrdersBody'),positions=$('brokerPositionsBody');if(!orders||!positions)return;if(meta)meta.textContent=book?.error||(book?.connected?`Live · ${book.orders.length} orders · ${book.positions.length} positions`:'Connect Sharekhan');const blank=(cols,text)=>`<tr><td colspan="${cols}" class="empty-row">${escape(text)}</td></tr>`;const tone=side=>side==='BUY'?'up':side==='SELL'?'down':'';orders.innerHTML=book?.orders?.length?book.orders.map(row=>`<tr><td>${escape(row.orderId)}</td><td>${escape(row.symbol)}</td><td class="${tone(row.side)}">${escape(row.side)}</td><td>${escape(row.quantity)}</td><td>${escape(row.filled)}</td><td>${row.price==null?'—':num(row.price)}</td><td>${escape(row.status)}</td><td>${escape(row.product)}</td></tr>`).join(''):blank(8,book?.error||'No Sharekhan orders today');positions.innerHTML=book?.positions?.length?book.positions.map(row=>{const pnl=row.pnl;return `<tr><td>${escape(row.symbol)}</td><td class="${tone(row.side)}">${escape(row.side)}</td><td>${escape(row.quantity)}</td><td>${row.avg==null?'—':num(row.avg)}</td><td>${row.ltp==null?'—':num(row.ltp)}</td><td style="color:${pnl==null?'inherit':pnl>=0?'#25874a':'#c7434d'}">${pnl==null?'—':money(pnl)}</td><td>${escape(row.product)}</td></tr>`}).join(''):blank(7,book?.error||'No open Sharekhan positions');}
async function refreshBrokerBook(){try{const response=await fetch('/api/sharekhan/book');const data=await response.json();if(!response.ok)throw Error(data.error||'Sharekhan book failed');paintBrokerBook(data);}catch(error){paintBrokerBook({connected:false,orders:[],positions:[],error:error.message});}}
function bootGridPilot(){
  bootTimers.forEach(clearInterval);bootTimers=[];
  tvChart=null;candleSeries=null;volumeSeries=null;smaCloseSeries=null;smaOpenSeries=null;stopLine=null;highLine=null;lowLine=null;gridLines=[];chartBars=[];marketKey='';marketLast=null;brokerWasConnected=false;
  $('refresh').onclick=()=>api('state').catch(e=>toast(e.message,true));
  $('chartFit').onclick=()=>tvChart?.timeScale().fitContent();
  connectLive();
  refreshBrokerBook();
  bootTimers.push(setInterval(refreshBrokerBook,2000));
  $('addOrder').onclick=()=>orderAction('add',null,{entry:optionBoard?.price,side:optionBoard?.side||chosen});
  $('gridBody').onclick=event=>{const button=event.target.closest('button');if(!button)return;const row=gridRows(optionBoard).find(item=>item.level===Number(button.dataset.level));if(button.dataset.order==='cancel'){editingOrder=null;paintGrid(optionBoard);return;}if(button.dataset.order==='edit'){editingOrder=row;paintGrid(optionBoard);return;}if(button.dataset.order==='save'){const tr=button.closest('tr');orderAction('edit',row,{entry:tr.querySelector('[name=entry]').value,target:tr.querySelector('[name=target]').value,stop:tr.querySelector('[name=stop]').value,quantity:tr.querySelector('[name=quantity]').value});return;}orderAction(button.dataset.order,row);};
  $('buyDirection').onclick=()=>setDirection('buy');$('shortDirection').onclick=()=>setDirection('short');
  for(const name of ['optionMoneyness','optionDepth','optionRight'])document.querySelector(`[name="${name}"]`).addEventListener('change',()=>refreshOption());
  $('start').onclick=()=>action('start',{direction:chosen,mode:'paper',spot:marketLast});
  $('stop').onclick=()=>action('stop');
  $('kill').onclick=()=>{if(confirm('Square off all paper positions at last price and kill this strategy?'))action('kill')};
  $('newDay').onclick=()=>{if(confirm('Reset strategy for a new trading day? This clears the current dashboard state.'))action('new-day')};
  $('settingsForm').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));action('config',d)};
  bootTimers.push(setInterval(()=>{if(state?.config?.scripCode)loadMarket(false);},60000));
  bootTimers.push(setInterval(()=>$('clock').textContent=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short',year:'numeric'}),1000));
  fetch('/api/instruments/meta').then(r=>r.json()).then(meta=>{
    document.querySelector('[name="exchange"]').innerHTML=meta.exchanges.map(item=>`<option value="${escape(item.code)}">${escape(item.label)}</option>`).join('');
    document.querySelector('[name="productType"]').innerHTML=meta.productTypes.map(item=>`<option value="${escape(item.code)}">${escape(item.label)}</option>`).join('');
    return api('state');
  }).then(s=>{fillSettings(s.config);refreshOption();}).catch(e=>toast(e.message,true));
  const symbolInput=document.querySelector('[name="symbol"]');
  let symbolTimer;
  symbolInput.addEventListener('input',()=>{clearTimeout(symbolTimer);symbolTimer=setTimeout(()=>searchSymbols(symbolInput.value),200);});
  symbolInput.addEventListener('focus',()=>{if(symbolInput.value.trim())searchSymbols(symbolInput.value);});
  symbolInput.addEventListener('keydown',event=>{if(event.key==='Enter'&&!$('symbolResults').hidden&&symbolMatches[0]){event.preventDefault();applySymbol(symbolMatches[0]);}});
  document.querySelector('[name="exchange"]').addEventListener('change',()=>{document.querySelector('[name="scripCode"]').value='';if(symbolInput.value.trim())searchSymbols(symbolInput.value);});
  $('symbolResults').onclick=event=>{const button=event.target.closest('button');if(button)applySymbol(symbolMatches[Number(button.dataset.index)]);};
  if(!window.__gridpilotClick){window.__gridpilotClick=event=>{if(!event.target.closest('.symbol-field'))$('symbolResults').hidden=true;};document.addEventListener('click',window.__gridpilotClick);}
  $('brokerOpen').onclick=()=>$('brokerModal').showModal();
  $('brokerClose').onclick=()=>$('brokerModal').close();
  $('brokerModal').onclick=event=>{
    const rect=event.currentTarget.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.currentTarget.close();
  };
  $('brokerLogin').onclick=async()=>{
    try{
      const result=await brokerApi('start');
      $('brokerState').value=new URL(result.loginUrl).searchParams.get('state')||'';
      window.open(result.loginUrl,'_blank','noopener,noreferrer');
      toast('Sharekhan login opened. API key is already included in its login URL.');
    }catch(e){toast(e.message,true)}
  };
  $('brokerLogout').onclick=async()=>{try{renderBroker(await brokerApi('logout'));toast('Sharekhan disconnected')}catch(e){toast(e.message,true)}};
  $('brokerCredentialForm').onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target));try{renderBroker(await brokerApi('credentials',data));toast('Sharekhan credentials saved')}catch(e){toast(e.message,true)}};
  $('brokerToken').onchange=()=>{try{const u=new URL($('brokerToken').value);const state=u.searchParams.get('state');if(state)$('brokerState').value=state}catch{}};
  $('brokerTokenForm').onsubmit=async e=>{
    e.preventDefault();
    try{const result=await brokerApi('complete',{requestToken:$('brokerToken').value,state:$('brokerState').value});renderBroker(result);$('brokerToken').value='';toast(result.connected?'Sharekhan login connected':result.error||'Session could not be verified',!result.connected)}
    catch(err){toast(err.message,true)}
  };
  refreshBroker();
  bootTimers.push(setInterval(refreshBroker,30000));
  $('brokerCallbackUrl').textContent=(location.hostname==='localhost'||location.hostname==='127.0.0.1'?'https://strategy-dna.emotionlesstraders.com':location.origin)+'/sharekhan/callback';
  $('brokerCopyCallback').onclick=async()=>{try{await navigator.clipboard.writeText($('brokerCallbackUrl').textContent);toast('Callback URL copied')}catch{toast('Could not copy URL; select it manually',true)}};
  if(new URLSearchParams(window.location.search).get('sharekhan')==='connected'){
    toast('Sharekhan connected');
    window.history.replaceState({},'',window.location.pathname);
  }
}
window.bootGridPilot=bootGridPilot;

async function brokerApi(path,data){
  const response=await fetch('/api/sharekhan/'+path,{method:path==='status'?'GET':'POST',headers:{'Content-Type':'application/json'},body:path==='status'?undefined:JSON.stringify(data||{})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Sharekhan request failed');
  return result;
}
function renderBroker(status){
  $('brokerStatus').textContent=status.error|| (status.connected?`Connected${status.customerId?' · Customer '+status.customerId:''}`:status.expired?'Sharekhan session expired · reconnect to continue':status.connectionStatus==='unverified'?'Session could not be verified · try again shortly':status.configured?'Credentials ready · login required':'API credentials missing on backend');
  $('brokerApiHint').textContent=status.apiKeyHint||'not configured';
  for(const name of ['apiKey','secureKey','customerId']){
    const field=document.querySelector(`#brokerCredentialForm [name=${name}]`);
    if(field&&document.activeElement!==field)field.value=status[name]||'';
  }
  $('brokerBadge').textContent=status.connected?'CONNECTED':status.expired?'EXPIRED':status.connectionStatus==='unverified'?'UNVERIFIED':status.configured?'READY':'CHECK CREDENTIALS';
  $('brokerBadge').className='badge '+(status.connected?'buy':status.expired?'short':'neutral');
  $('brokerTriggerStatus').textContent=status.connected?'Connected':status.expired?'Expired':status.configured?'Connect':'Setup needed';
  $('brokerOpen').dataset.connected=String(!!status.connected);
  $('brokerLogin').disabled=!status.configured||status.connected;
  $('brokerLogout').hidden=!status.connected;
  if(status.connected&&!brokerWasConnected){brokerWasConnected=true;if(state?.config?.scripCode)loadMarket(true);}
  if(!status.connected)brokerWasConnected=false;
  if(status.connected)$('brokerManual').open=false;
}
async function refreshBroker(){try{renderBroker(await brokerApi('status'))}catch(e){$('brokerStatus').textContent=e.message}}
