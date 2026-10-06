'use client';

import {useEffect,useState} from 'react';

function callbackValues(){
  const query=new URLSearchParams(window.location.search);
  const state=query.get('state')||'';
  for(const name of ['request_token','requestToken','reqToken','token','code','requesttoken']){
    const raw=window.location.search.replace(/^\?/,'').split('&').find(part=>decodeURIComponent(part.split('=')[0]||'')===name);
    if(raw){const value=raw.slice(raw.indexOf('=')+1);return {state,requestToken:decodeURIComponent(value.replace(/\+/g,'%2B'))};}
  }
  return {state,requestToken:''};
}

export default function SharekhanCallback(){
  const [message,setMessage]=useState('Completing Sharekhan login…');
  useEffect(()=>{
    const values=callbackValues();
    window.history.replaceState({},'',window.location.pathname);
    if(!values.state||!values.requestToken){setMessage('Sharekhan did not return a request token. Go back to the dashboard and start login again.');return;}
    const token=localStorage.getItem('gridpilot-token')||'';
    const apiBase=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'':'https://dna-api.emotionlesstraders.com';
    fetch(apiBase+'/api/sharekhan/complete',{method:'POST',headers:{'Content-Type':'application/json',Authorization:token?`Bearer ${token}`:''},body:JSON.stringify(values)})
      .then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Login failed');if(!data.connected)throw Error(data.error||'Sharekhan session could not be verified');window.location.replace('/?sharekhan=connected')})
      .catch(error=>setMessage(error.message));
  },[]);
  return <main className="callback-page"><section className="card callback-card"><div className="eyebrow">BROKER CONNECTION</div><h1>Sharekhan login</h1><p>{message}</p><a href="/" className="secondary callback-link">Back to dashboard</a></section></main>;
}
