/* SCP annotations layered onto the original DF Leaflet map, in map coordinates. */
(function () {
  'use strict';
  const $id=id=>document.getElementById(id), tr=window.SCPMapEnglish;
  const icons={pan:'M4 8h16M4 16h16',pen:'m4 20 3-7L17 3l4 4L11 17Z',line:'m4 20 16-16',arrow:'m4 20 16-16M10 4h10v10',rect:'M4 5h16v14H4Z',ellipse:'M21 12a9 7 0 1 1-18 0 9 7 0 1 1 18 0',text:'M4 6V3h16v3M12 3v18m-4 0h8',eraser:'m3 14 10-11 8 8-10 10H8Z'};
  const tools=document.createElement('div');tools.id='scp-tools';
  tools.innerHTML=`<div class="scp-row"><button id="scp-sidebar" title="Show or hide the original map filters">Filters</button><select id="scp-battlefield" aria-label="Warfare battlefield"></select><select id="scp-platform" aria-label="Game platform"><option value="mobile">Mobile</option><option value="pc">PC</option></select><select id="scp-mode" aria-label="Warfare mode"><option value="normal">Attack & Defend</option><option value="occupy">King of the Hill</option></select><button id="scp-open">Open plan</button><button id="scp-save">Save plan</button><button id="scp-fullscreen">Fullscreen</button><span id="scp-status" role="status">Loading DF map…</span></div><div class="scp-row" role="toolbar" aria-label="SCP drawing tools">${Object.entries(icons).map(([key,path])=>`<button data-ink="${key}" aria-label="${key==='rect'?'Box':key}" aria-pressed="${key==='pan'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg> ${key==='rect'?'Box':key[0].toUpperCase()+key.slice(1)}</button>`).join('')}<input type="color" id="scp-color" value="#b7ffd8" aria-label="Drawing color"><input type="range" id="scp-width" min="1" max="10" value="3" aria-label="Drawing thickness"><input id="scp-text" maxlength="160" placeholder="Type a label…" aria-label="Text to place on map"><button id="scp-undo" disabled>Undo</button><button id="scp-redo" disabled>Redo</button><button id="scp-clear" disabled>Clear</button></div><input class="scp-file" id="scp-file" type="file" accept=".json,application/json">`;
  document.body.appendChild(tools);
  const note=document.createElement('div');note.id='scp-note';note.innerHTML='Map & data: <a href="https://df.qq.com/cp/a20240729directory/index.html" target="_blank" rel="noopener">Delta Force / Tencent</a> · SCP drawing layer';document.body.appendChild(note);
  document.querySelectorAll('.war-list .map-item[data-map]').forEach(item=>{
    const option=document.createElement('option');option.value=item.dataset.map;option.textContent=tr(item.textContent);$id('scp-battlefield').appendChild(option);
  });
  let ink='pan', group, renderer, key='', items=[], undo=[], redo=[], gesture=null, frame=0, ready=false;
  const states=new Map(), pointers=new Map(), container=$id('MapContainer');
  const clone=value=>JSON.parse(JSON.stringify(value));
  function status(text,bad=false){$id('scp-status').textContent=text;$id('scp-status').classList.toggle('scp-map-issue',bad);}
  function controls(){ $id('scp-undo').disabled=!undo.length;$id('scp-redo').disabled=!redo.length;$id('scp-clear').disabled=!items.length; }
  function storageKey(){return 'scp-df-plan-v2:'+key;}
  function saveLocal(){
    states.set(key,{items:clone(items),undo:undo.slice(),redo:redo.slice()});
    try{localStorage.setItem(storageKey(),JSON.stringify(items));status('Plan saved on this device');}
    catch(_){status('Use Save plan to keep a copy',true);}
  }
  function commit(before){
    if(JSON.stringify(items)===JSON.stringify(before))return;
    undo.push(before);if(undo.length>40)undo.shift();redo=[];saveLocal();controls();
  }
  function validItems(value){
    if(!Array.isArray(value)||value.length>2000)throw Error('Too many annotations');
    let total=0;
    return value.map(item=>{
      if(!item||!['pen','line','arrow','rect','ellipse','text'].includes(item.type)||!/^#[0-9a-f]{6}$/i.test(item.color)||!Number.isFinite(item.width)||item.width<1||item.width>10)throw Error('Invalid annotation');
      if(!Array.isArray(item.points)||!item.points.length||item.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>100000)))throw Error('Invalid coordinates');
      total+=item.points.length;if(total>80000)throw Error('Too many drawing points');
      if(item.type==='text'&&(typeof item.text!=='string'||item.text.length>160))throw Error('Invalid label');
      return {type:item.type,color:item.color,width:item.width,points:clone(item.points),...(item.type==='text'?{text:item.text}:{} )};
    });
  }
  function contextKey(){return [isWar?'war':'ops',currLayer?.name||'',isWar?currWarType:'',window.occupy?'occupy':'normal'].join(':');}
  function changeContext(){
    if(!ready)return;
    const next=contextKey();
    $id('scp-battlefield').value=isWar?currWarMap:'';$id('scp-platform').value=currWarType;
    $id('scp-mode').value=window.occupy?'occupy':'normal';
    $id('scp-platform').disabled=!isWar;$id('scp-mode').disabled=!isWar;
    if(next===key)return;
    cancel();
    if(key)states.set(key,{items:clone(items),undo:undo.slice(),redo:redo.slice()});
    key=next;const saved=states.get(key);items=[];undo=[];redo=[];
    if(saved){items=saved.items;undo=saved.undo;redo=saved.redo;}
    else {try{const stored=localStorage.getItem(storageKey());if(stored)items=validItems(JSON.parse(stored));}catch(_){status('Previous draft unavailable · Open a saved plan',true);}}
    render();controls();
  }
  function queueRender(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;changeContext();render();});}
  function drawItem(item){
    const opts={color:item.color,weight:item.width,opacity:1,interactive:false,renderer,pane:'scpInkPane',lineCap:'round',lineJoin:'round'};
    if(item.type==='text'){
      const label=document.createElement('span');label.className='scp-ink-label';label.textContent=item.text;label.style.setProperty('--ink',item.color);
      L.marker(item.points[0],{pane:'scpInkPane',interactive:false,icon:L.divIcon({html:label,className:'',iconSize:null,iconAnchor:[0,0]})}).addTo(group);return;
    }
    if(item.type==='rect'){L.rectangle(item.points,{...opts,fillOpacity:.07}).addTo(group);return;}
    if(item.type==='ellipse'){
      const a=item.points[0],b=item.points[item.points.length-1],cy=(a[0]+b[0])/2,cx=(a[1]+b[1])/2;
      const coords=Array.from({length:49},(_,i)=>{const angle=i*Math.PI/24;return[cy+Math.sin(angle)*Math.abs(a[0]-b[0])/2,cx+Math.cos(angle)*Math.abs(a[1]-b[1])/2];});
      L.polygon(coords,{...opts,fillOpacity:.07}).addTo(group);return;
    }
    L.polyline(item.points,opts).addTo(group);
    if(item.type==='arrow'&&item.points.length>1){
      const end=map.latLngToContainerPoint(item.points.at(-1)),start=map.latLngToContainerPoint(item.points[0]),angle=Math.atan2(end.y-start.y,end.x-start.x),size=12+item.width;
      const points=[-.48,.48].map(delta=>map.containerPointToLatLng([end.x-Math.cos(angle+delta)*size,end.y-Math.sin(angle+delta)*size]));
      L.polyline([points[0],item.points.at(-1),points[1]],opts).addTo(group);
    }
  }
  function render(){if(!group)return;group.clearLayers();for(const item of items)drawItem(item);if(gesture?.preview)drawItem(gesture.preview);}
  function chooseTool(next){cancel();ink=next;document.querySelectorAll('[data-ink]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ink===ink)));container.classList.toggle('scp-drawing',ink!=='pan');if(ready){if(ink==='pan')map.dragging.enable();else map.dragging.disable();}status(ink==='pan'?'Pan map · click original markers':ink==='text'?'Enter a label, then tap the map':'Draw on map · use Pan to explore');}
  function point(event){const value=map.mouseEventToLatLng(event);return [value.lat,value.lng];}
  function distance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=dx||dy?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy))):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
  function hit(target,item){
    const p=map.latLngToContainerPoint(target),pts=item.points.map(v=>map.latLngToContainerPoint(v)),a=pts[0],b=pts.at(-1);
    if(item.type==='text')return p.x>=a.x-10&&p.x<=a.x+Math.max(25,item.text.length*12)&&p.y>=a.y-10&&p.y<=a.y+30;
    if(item.type==='rect'||item.type==='ellipse'){
      const left=Math.min(a.x,b.x)-9,right=Math.max(a.x,b.x)+9,top=Math.min(a.y,b.y)-9,bottom=Math.max(a.y,b.y)+9;
      return p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;
    }
    return pts.some((v,i)=>distance(p,pts[Math.max(0,i-1)],v)<10+item.width);
  }
  function erase(p){for(let i=items.length-1;i>=0;i--)if(hit(p,items[i])){items.splice(i,1);break;}queueRender();}
  function cancel(){if(gesture?.before)items=gesture.before;gesture=null;queueRender();}
  function release(event,cancelled){
    pointers.delete(event.pointerId);
    if(gesture?.id===event.pointerId){
      if(cancelled)cancel();else {const before=gesture.before;if(gesture.preview)items.push(gesture.preview);gesture=null;commit(before);queueRender();}
    }
    if(container.hasPointerCapture(event.pointerId))container.releasePointerCapture(event.pointerId);
  }
  container.addEventListener('pointerdown',event=>{
    if(!ready||ink==='pan'||event.button!==0||event.target.closest('.leaflet-control'))return;
    if(event.pointerType==='touch'&&Array.from(pointers.values()).includes('pen'))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.pointerType==='pen'){cancel();for(const id of pointers.keys()){pointers.delete(id);if(container.hasPointerCapture(id))container.releasePointerCapture(id);}}
    pointers.set(event.pointerId,event.pointerType);container.setPointerCapture(event.pointerId);
    if(pointers.size>1){cancel();return;}
    if(items.length>=2000){status('Plan is full · remove annotations first',true);return;}
    const remaining=80000-items.reduce((sum,item)=>sum+item.points.length,0);
    if(ink!=='eraser'&&remaining<2){status('Drawing limit reached · remove a few strokes first',true);return;}
    const p=point(event),before=clone(items);
    if(ink==='eraser'){gesture={id:event.pointerId,before};erase(p);return;}
    const text=$id('scp-text').value.trim();if(ink==='text'&&!text){status('Type a label first',true);return;}
    gesture={id:event.pointerId,before,remaining,preview:{type:ink,color:$id('scp-color').value,width:Number($id('scp-width').value),points:ink==='pen'||ink==='text'?[p]:[p,p],...(ink==='text'?{text}:{})}};queueRender();
  },true);
  container.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();
    const p=point(event),preview=gesture.preview;
    if(ink==='eraser'){erase(p);return;}
    if(preview.type==='pen'){
      const a=map.latLngToContainerPoint(preview.points.at(-1)),b=map.latLngToContainerPoint(p);
      if(a.distanceTo(b)>2&&preview.points.length<Math.min(12000,gesture.remaining))preview.points.push(p);
    }else if(preview.type==='text')preview.points[0]=p;else preview.points[1]=p;
    queueRender();
  },true);
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])container.addEventListener(eventName,event=>release(event,eventName!=='pointerup'),true);
  // A drawing gesture must not also activate an original DF POI underneath it.
  container.addEventListener('click',event=>{if(ink!=='pan'&&!event.target.closest('.leaflet-control')){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.querySelectorAll('[data-ink]').forEach(button=>button.addEventListener('click',()=>chooseTool(button.dataset.ink)));
  $id('scp-undo').onclick=()=>{cancel();if(undo.length){redo.push(clone(items));items=undo.pop();saveLocal();controls();queueRender();}};
  $id('scp-redo').onclick=()=>{cancel();if(redo.length){undo.push(clone(items));items=redo.pop();saveLocal();controls();queueRender();}};
  $id('scp-clear').onclick=()=>{cancel();const before=clone(items);items=[];commit(before);queueRender();};
  $id('scp-sidebar').onclick=()=>document.querySelector('.btn-nav-state').click();
  function switchWar(){
    if(!ready)return;chooseTool('pan');
    const next=$id('scp-battlefield').value,platform=$id('scp-platform').value,mode=$id('scp-mode').value;
    if(!next)return;
    if(!isWar)document.querySelector('.war-change-text').click();
    // Use DF's original handlers: they also maintain private menu state.
    $('.war-list .map-item[data-map="'+next+'"]').trigger('mouseover');
    $('.war-lv-list .map-lv-item[data-type="'+platform+'"]').trigger('mouseover');
    $('.type-option-item[data-type="'+mode+'"]').trigger('click');
    $('.map-list-ctn').trigger('mouseleave');
    queueRender();
  }
  for(const id of ['scp-battlefield','scp-platform','scp-mode'])$id(id).addEventListener('change',switchWar);
  $id('scp-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){status('Use Open workspace above for a larger view',true);}};
  $id('scp-save').onclick=()=>{
    if(!ready)return;const center=map.getCenter();
    const data={format:'scp-df-plan',version:2,context:key,map:isWar?currWarMap:null,platform:currWarType,mode:window.occupy?'occupy':'normal',sector:isWar?window.warLv:null,pov:window.viewChange?'attacker':'defender',view:{center:[center.lat,center.lng],zoom:map.getZoom()},objects:items};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='SCP-'+(isWar?tr(document.querySelector('.war-list [data-map="'+currWarMap+'"]').textContent):'Operations')+'-plan.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  };
  $id('scp-open').onclick=()=>$id('scp-file').click();
  $id('scp-file').onchange=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{
      if(file.size>8000000)throw Error('Plan file exceeds 8 MB');
      const data=JSON.parse(await file.text());
      if(data.format!=='scp-df-plan'||data.version!==2||typeof data.context!=='string')throw Error('Choose an SCP DF plan file');
      const loaded=validItems(data.objects);
      if(data.sector!=null&&(!Number.isInteger(data.sector)||data.sector<0||data.sector>=(window[data.map]?.info?.sector||0)))throw Error('Invalid sector');
      if(data.pov!==undefined&&!['attacker','defender'].includes(data.pov))throw Error('Invalid POV');
      if(data.view&&(!Array.isArray(data.view.center)||data.view.center.length!==2||data.view.center.some(n=>!Number.isFinite(n)||Math.abs(n)>100000)||!Number.isFinite(data.view.zoom)||data.view.zoom<0||data.view.zoom>8))throw Error('Invalid map view');
      if(items.length&&!confirm('Replace annotations? Save your current plan first to keep a separate copy.'))return;
      if(data.context!==key){
        if(!data.map||!Array.from($id('scp-battlefield').options).some(o=>o.value===data.map)||!['mobile','pc'].includes(data.platform)||!['normal','occupy'].includes(data.mode))throw Error('Open the matching map and floor before importing this plan');
        $id('scp-battlefield').value=data.map;$id('scp-platform').value=data.platform;$id('scp-mode').value=data.mode;switchWar();changeContext();
        if(key!==data.context)throw Error('This plan belongs to a different map or floor');
      }
      if(isWar){
        if(!window.occupy&&data.sector!=null)document.querySelector('.war-lv-item[data-index="'+data.sector+'"]').click();
        if(data.pov)document.querySelector(data.pov==='attacker'?'.view-change1':'.view-change2').click();
      }
      if(data.view){map.stop();map.setView(data.view.center,Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),data.view.zoom)),{animate:false});}
      const before=clone(items);items=loaded;commit(before);queueRender();status('Plan opened');
    }catch(error){status(error.message,true);}
  };
  document.addEventListener('keydown',event=>{
    if(event.target.closest('input,select,textarea'))return;
    if(event.key==='Escape')chooseTool('pan');
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();$id(event.shiftKey?'scp-redo':'scp-undo').click();}
  });
  addEventListener('blur',()=>{cancel();pointers.clear();});
  addEventListener('load',()=>{
    if(!window.map||!window.L){status('DF map could not start · reload to retry',true);return;}
    ready=true;
    map.createPane('scpInkPane').style.zIndex='650';map.getPane('scpInkPane').classList.add('scp-ink-pane');
    renderer=L.svg({pane:'scpInkPane',padding:.5});group=L.featureGroup().addTo(map);
    map.on('layeradd layerremove',event=>{if(event.layer instanceof L.TileLayer)queueRender();});
    map.on('zoomend moveend',queueRender);
    // The main site is Delta Force Mobile; retain the native platform switch.
    if(isWar){currWarType='mobile';changeWarMap(currWarMap,'mobile');}
    // DF's toggle resets every sidebar class and has a private open-state flag.
    // Preserve Warfare styling and keep the compact mobile start state in sync.
    $('.btn-nav-state').off('click').on('click',()=>{
      const nav=document.querySelector('.nav-ctn'),closed=nav.classList.toggle('close');
      nav.classList.toggle('open',!closed);
      $id('scp-sidebar').setAttribute('aria-expanded',String(!closed));
    });
    new ResizeObserver(()=>{if(container.clientWidth&&container.clientHeight)map.invalidateSize({pan:false});}).observe(container);
    if(innerWidth<650)document.querySelector('.nav-ctn').classList.add('close');
    $id('scp-sidebar').setAttribute('aria-expanded',String(innerWidth>=650));
    changeContext();chooseTool('pan');
    status('DF map ready · choose a sector or start drawing');
  });
})();
