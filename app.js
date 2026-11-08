'use strict';
const $=id=>document.getElementById(id),uid=()=>crypto.randomUUID?.()||Date.now()+'-'+Math.random();
const baseState=()=>({version:5,plays:[],scenes:[],characters:[],activeScene:null});
let state=baseState(),db=null,saveTimer=null,toastTimer=null,recording=null,playing=null,playToken=0,paused=false,sceneRunning=false,scrollDisabledUntil=0,playingId=null,ticker=null,elapsed=0,selectedLine=0,trimOpenId=null,trimDraft=null,trimTileHeight=213,trimSession=null;
const getScene=()=>state.scenes.find(s=>s.id===state.activeScene),getChar=id=>state.characters.find(c=>c.id===id),rawDuration=l=>Math.max(.1,Number(l.duration)||Math.max(2,Math.ceil((l.text||'').trim().split(/\s+/).filter(Boolean).length/2))),trimBounds=l=>{const total=rawDuration(l),a=Math.min(total-.05,Math.max(0,Number(l.trimStart)||0)),b=Math.max(a+.05,Math.min(total,Number(l.trimEnd)||total));return {start:a,end:b,total}},duration=l=>{const t=trimBounds(l);return t.end-t.start},stamp=v=>{let t=Math.max(0,Math.round(v||0));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')},stampFine=v=>Number(v||0).toFixed(1)+'s';
const make=(tag,cls='',text=null)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==null)x.textContent=text;return x};
const button=(name,cb,cls='button ghost')=>{const x=make('button',cls,name);x.type='button';x.onclick=cb;return x};
const field=(name,control,help='')=>{const d=make('div','field');const l=make('label','',name);d.append(l,control);if(help)d.append(make('small','',help));return d};
const textInput=(value='',placeholder='')=>{const x=make('input');x.value=value;x.placeholder=placeholder;return x};
const dropdown=(options,value='')=>{const sel=make('select');for(const [v,n] of options){let o=make('option','',n);o.value=v;sel.append(o)}sel.value=value;return sel};
const actions=(...elements)=>{const x=make('div','formActions');x.append(...elements);return x};
function svgIcon(name){
 const path={
 record:'<circle cx="12" cy="12" r="7" fill="#e65b68" stroke="none"/>',
 stop:'<rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="currentColor" stroke="none"/>',
 play:'<path d="M8 5.5 19 12 8 18.5Z" fill="currentColor" stroke="none"/>',
 pause:'<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
 restart:'<path d="M4 11a8 8 0 1 1 2.1 5.7M4 5v6h6"/>',
 audible:'<path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/>',
 muted:'<path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l6 6m0-6-6 6"/>'
 }[name];return '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(path||'')+'</svg>'
}
function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200)}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('LineRunnerDB',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('kv',{keyPath:'key'});d.createObjectStore('audio',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function dbPut(store,value){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
function dbGet(store,key){return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function dbDelete(store,key){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
function dbAll(store){return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function persist(){if(!db)return;$('saveStatus').textContent='Saving';clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await dbPut('kv',{key:'main',value:state});$('saveStatus').textContent='Saved locally'}catch(e){notify('Could not save: '+e.message)}},100)}
function modal(title,body){$('modalTitle').textContent=title;$('modalBody').className='modalBody';$('modalBody').replaceChildren(body);$('modalBackdrop').hidden=false}
function closeModal(){$('modalBackdrop').hidden=true;$('modalBody').replaceChildren()}
const scopeOf=s=>s.playId||'scene:'+s.id;
const scopedScenes=s=>state.scenes.filter(x=>scopeOf(x)===scopeOf(s));
const sceneCharIds=s=>[...new Set(s.lines.map(l=>l.characterId).filter(id=>getChar(id)))];
const scopeCharIds=s=>[...new Set(scopedScenes(s).flatMap(scene=>[...(scene.cast||[]),...scene.lines.map(l=>l.characterId)]))].filter(id=>getChar(id));
const sameName=(a,b)=>String(a||'').trim().toLocaleLowerCase()===String(b||'').trim().toLocaleLowerCase();
function normalizeCharacterScopes(){
 // Reconcile older scene-specific characters with the requested play-level roster.
 // Identical names inside one play resolve to one identity; identities never cross scopes.
 const canonical=new Map(),usedBy=new Map();
 for(const scene of state.scenes){
  const scope=scopeOf(scene),refs=[...new Set([...(scene.cast||[]),...scene.lines.map(l=>l.characterId)])],mapping=new Map();
  for(const id of refs){
   const c=getChar(id);if(!c)continue;
   const key=scope+'\u0000'+c.name.trim().toLocaleLowerCase();
   let canonicalId=canonical.get(key);
   if(!canonicalId){
    // If the same legacy character ID occurs in another scope, fork it with identical settings.
    if(usedBy.has(id)&&usedBy.get(id)!==scope){const newChar={...c,id:uid()};state.characters.push(newChar);canonicalId=newChar.id}
    else canonicalId=id;
    canonical.set(key,canonicalId);usedBy.set(canonicalId,scope);
   }
   mapping.set(id,canonicalId);
  }
  for(const l of scene.lines)if(mapping.has(l.characterId))l.characterId=mapping.get(l.characterId);
  scene.cast=[...new Set([...scene.cast.map(id=>mapping.get(id)||id),...scene.lines.map(l=>l.characterId)])].filter(id=>getChar(id));
 }
}
function migrate(){
 state.plays||=[];state.scenes||=[];state.characters||=[];
 const miscellaneous=new Set(state.plays.filter(p=>p.misc===true).map(p=>p.id));
 for(const scene of state.scenes){
  if(miscellaneous.has(scene.playId)||!state.plays.some(p=>p.id===scene.playId))scene.playId=null;
  scene.lines||=[];scene.cast||=[];scene.mutedCharacters||=[];
 }
 state.plays=state.plays.filter(p=>!p.misc);
 for(const c of state.characters){c.recordPitch=Number(c.recordPitch??0);c.effect=c.effect||'none';c.muted=!!c.muted}
 for(const scene of state.scenes){
  for(const id of scene.mutedCharacters){const c=getChar(id);if(c)c.muted=true}
  scene.mutedCharacters=[];
  for(const l of scene.lines){
   if(l.muteOverride===undefined)l.muteOverride=l.muted===true?true:null;
   l.recordPitch=undefined;
   if(l.muteOverride!=null&&!!l.muteOverride===!!getChar(l.characterId)?.muted)l.muteOverride=null;
  }
 }
 normalizeCharacterScopes();state.version=8;state.activeScene=null;
}
function findScopedCharacter(scene,name){return scopeCharIds(scene).map(id=>getChar(id)).find(c=>c&&sameName(c.name,name))||null}
function moveSceneToScope(scene,newPlayId){
 if((scene.playId||null)===(newPlayId||null))return;
 // Determine destination profiles before changing membership.
 const targets=state.scenes.filter(s=>s.id!==scene.id&&(s.playId||null)===(newPlayId||null)&&!!newPlayId);
 const targetIds=[...new Set(targets.flatMap(s=>sceneCharIds(s)))];
 const mapping=new Map();
 for(const oldId of [...new Set([...scene.cast,...scene.lines.map(l=>l.characterId)])]){
  const original=getChar(oldId);if(!original)continue;
  const existing=targetIds.map(id=>getChar(id)).find(c=>c&&sameName(c.name,original.name));
  if(existing)mapping.set(oldId,existing.id);
  else{const clone={...original,id:uid()};state.characters.push(clone);mapping.set(oldId,clone.id);targetIds.push(clone.id)}
 }
 scene.playId=newPlayId||null;
 scene.cast=[...new Set(scene.cast.map(id=>mapping.get(id)||id))];
 for(const line of scene.lines)if(mapping.has(line.characterId))line.characterId=mapping.get(line.characterId);
}
function openHome(){selectedLine=0;if(recording){notify('Stop recording before leaving the scene.');return}stop();state.activeScene=null;persist();render();window.scrollTo({top:0,behavior:'instant'})}
function openScene(id){selectedLine=0;if(recording){notify('Stop recording before changing scenes.');return}stop();state.activeScene=id;persist();render();window.scrollTo({top:0,behavior:'instant'})}
function render(){const s=getScene();$('home').hidden=!!s;$('scene').hidden=!s;if(!s){renderFolders();return}renderScene()}
function renderFolders(){
 const root=$('folders');root.replaceChildren();
 for(const p of state.plays){
  const scenes=state.scenes.filter(s=>s.playId===p.id),box=make('section','folder'),head=make('div','folderHead');
  const toggle=button('',()=>{p.open=p.open===false;persist();renderFolders()},'folderToggle');
  toggle.append(make('span','symbol',p.open===false?'📁':'📂'));
  const label=make('span');label.append(make('strong','',p.name),make('small','',scenes.length+' scene'+(scenes.length===1?'':'s')));
  toggle.append(label);head.append(toggle);
  const edit=button('⋯',()=>editFolder(p.id),'iconBtn');edit.title='Play settings';edit.setAttribute('aria-label','Settings for '+p.name);
  head.append(edit);box.append(head);
  if(p.open!==false){const body=make('div','folderBody');for(const scene of scenes)body.append(sceneRow(scene));if(!scenes.length)body.append(make('div','emptyFolder','No scenes yet.'));body.append(button('＋ New scene',()=>createScene(p.id),'newInFolder'));box.append(body)}
  root.append(box);
 }
 const standalone=state.scenes.filter(s=>!s.playId),section=make('section','standaloneGroup'),head=make('div','standaloneHead');
 head.append(make('h2','','Standalone Scenes'),button('＋ New scene',()=>createScene(null),'button ghost small'));section.append(head);
 if(!standalone.length)section.append(make('p','standaloneEmpty','No standalone scenes yet.'));
 for(const scene of standalone)section.append(sceneRow(scene));root.append(section);
}
function sceneRow(s){
 const row=make('div','sceneRow');const link=button('',()=>openScene(s.id),'sceneLink');
 link.append(make('span','',s.name),make('small','',s.lines.length+' lines'));
 const menu=button('⋯',()=>editScene(s.id),'iconBtn sceneMenuBtn');menu.title='Manage '+s.name;menu.setAttribute('aria-label','Settings for '+s.name);
 row.append(link,menu);return row;
}
function createFolder(){const body=make('div','folderChoice');body.append(button('＋ Create new folder',createEmptyFolder,'button primary'),button('↥ Import folder backup',chooseFolderBackup,'button ghost'));modal('Add folder',body)}
function createEmptyFolder(){const name=textInput('','Folder or play name'),body=make('div');body.append(field('Folder name',name),actions(button('Create folder',()=>{if(!name.value.trim())return notify('Enter a folder name');state.plays.push({id:uid(),name:name.value.trim(),open:true});persist();closeModal();render()},'button primary')));modal('New folder',body);name.focus()}
function editFolder(id){const p=state.plays.find(p=>p.id===id);if(!p)return;const name=textInput(p.name),body=make('div');body.append(field('Folder name',name));const remove=button('Delete folder',()=>{if(state.scenes.some(s=>s.playId===id))return notify('Move scenes to another folder before deleting.');if(!confirm('Delete folder '+p.name+'?'))return;state.plays=state.plays.filter(x=>x.id!==id);persist();closeModal();render()},'button danger');body.append(actions(remove,button('↧ Export backup',()=>exportFolderBackup(id).catch(e=>notify('Backup failed: '+e.message)),'button ghost'),button('Save',()=>{if(!name.value.trim())return;p.name=name.value.trim();persist();closeModal();render()},'button primary')));modal('Folder settings',body)}
function createScene(folderId=null){
 const name=textInput('','Scene title');
 const options=[['','Main library (standalone)'],...state.plays.map(p=>[p.id,p.name])];
 const folder=dropdown(options,folderId||''),body=make('div');
 body.append(field('Scene name',name),field('Save in',folder),actions(button('Cancel',closeModal),button('Create scene',()=>{
  if(!name.value.trim())return notify('Enter a scene title');
  const scene={id:uid(),name:name.value.trim(),playId:folder.value||null,cast:[],lines:[],loop:false,mutedCharacters:[]};
  state.scenes.push(scene);state.activeScene=scene.id;persist();closeModal();render();window.scrollTo(0,0);
 },'button primary')));
 modal('New scene',body);name.focus();
}
function editScene(sceneId=state.activeScene){
 const s=state.scenes.find(s=>s.id===sceneId);if(!s)return;
 const name=textInput(s.name),folder=dropdown([['','Main library (standalone)'],...state.plays.map(p=>[p.id,p.name])],s.playId||''),body=make('div');
 body.append(field('Scene name',name),field('Move to',folder));
 body.append(actions(button('Delete scene',async()=>{
  if(!confirm('Permanently delete this scene and all its recordings?'))return;
  const ids=s.lines.map(l=>l.audioId).filter(Boolean);state.scenes=state.scenes.filter(x=>x.id!==s.id);
  if(state.activeScene===s.id){stop();state.activeScene=null}
  persist();closeModal();render();
  for(const id of ids){if(!state.scenes.some(scene=>scene.lines.some(l=>l.audioId===id)))await dbDelete('audio',id).catch(()=>{})}
 },'button danger'),button('Save',()=>{
  if(!name.value.trim())return notify('Enter a scene name');
  moveSceneToScope(s,folder.value||null);s.name=name.value.trim();persist();closeModal();render();
 },'button primary')));
 modal('Scene settings',body);
}
function renderScene(){const s=getScene(),p=state.plays.find(p=>p.id===s.playId);$('breadcrumb').textContent=p?.name||'';$('breadcrumb').hidden=!p;$('sceneTitle').textContent=s.name;$('sceneSubtitle').textContent=s.lines.length+' dialogue lines';$('loop').checked=!!s.loop;updateSceneTotals();renderCast();renderTimeline();refreshPlayButtons()}
function updateSceneTotals(){
 const s=getScene();if(!s)return;
 const total=s.lines.reduce((sum,l)=>sum+(l.audioId?duration(l):0),0);
 $('lineCount').textContent=s.lines.length+' lines · '+stamp(total);
}
function renderCast(){
 const s=getScene(),root=$('cast');root.replaceChildren();
 for(const id of sceneCharIds(s)){
  const c=getChar(id);if(!c)continue;
  const b=button(c.name,()=>characterSettings(id),'castBtn'+(c.muted?' muted':''));b.title='Character settings: '+c.name;root.append(b);
 }
 if(!sceneCharIds(s).length)root.append(make('span','tileNote','Create a character in the first dialogue tile.'));
}
function speakerOptions(line){
 const s=getScene(),ids=scopeCharIds(s);
 return [['','Choose character…'],...ids.map(id=>[id,getChar(id).name]),['__new','＋ New character']];
}
function createCharacterForLine(lineId){
 const name=textInput('','Type character name (emoji optional)'),body=make('div');
 body.append(field('Character name',name),actions(button('Cancel',closeModal),button('Create character',()=>{
  if(!name.value.trim())return notify('Enter a character name');
  const s=getScene(),l=s.lines.find(x=>x.id===lineId);if(!l)return;
  let c=findScopedCharacter(s,name.value);
  if(!c){c={id:uid(),name:name.value.trim(),recordPitch:0,effect:'none',muted:false};state.characters.push(c)}
  l.characterId=c.id;if(!s.cast.includes(c.id))s.cast.push(c.id);
  persist();closeModal();renderScene();
 },'button primary')));modal('New character',body);name.focus();
}
function addNext(){const s=getScene();s.lines.push({id:uid(),characterId:'',type:'audio',text:'',audioId:null,duration:0,revealed:false,muteOverride:null});persist();renderScene();document.querySelector('.tile:last-child')?.scrollIntoView({behavior:'smooth',block:'center'})}
function changeSpeaker(lineId,value){if(value==='__new')return createCharacterForLine(lineId);const l=getScene().lines.find(x=>x.id===lineId);if(!l)return;l.characterId=value;if(value&&!getScene().cast.includes(value))getScene().cast.push(value);persist();renderScene()}
function effectiveMute(line){const c=getChar(line.characterId);return line.muteOverride===null||line.muteOverride===undefined?!!(c?.muted||getScene()?.mutedCharacters?.includes(line.characterId)):!!line.muteOverride}
function muteLine(l){const requested=!effectiveMute(l);const characterDefault=!!getChar(l.characterId)?.muted;l.muteOverride=requested===characterDefault?null:requested;persist();renderTimeline()}
function characterSettings(id){
 const c=getChar(id),scene=getScene();if(!c||!scene)return;
 const isPlay=!!scene.playId;const involved=scopedScenes(scene).filter(s=>s.lines.some(l=>l.characterId===id));
 const allLines=involved.flatMap(s=>s.lines.filter(l=>l.characterId===id));
 const totalTime=allLines.reduce((total,l)=>total+(l.audioId?duration(l):0),0);
 const name=textInput(c.name),body=make('div'),mute=make('input');mute.type='checkbox';mute.checked=!!c.muted;
 body.append(field('Character name',name));
 const stats=make('div','characterStats');
 const stat=(label,value)=>{const cell=make('div','characterStat');cell.append(make('small','',label),make('strong','',String(value)));stats.append(cell)};
 if(isPlay)stat('Scenes',involved.length);
 stat('Lines',allLines.length);stat('Duration',stamp(totalTime));body.append(stats);
 const row=make('div','muteRow');row.append(make('strong','', 'Mute character'),mute);
 const pitchBox=make('div','field'),pitchHead=make('div','rangeHead'),pitchLabel=make('label','','Pitch (semitones)'),out=make('output','',String(c.recordPitch||0));
 pitchHead.append(pitchLabel,out);const pitch=make('input','range');pitch.type='range';pitch.min=-6;pitch.max=6;pitch.step=1;pitch.value=c.recordPitch||0;
 pitch.oninput=()=>out.textContent=(+pitch.value>0?'+':'')+pitch.value;pitchBox.append(pitchHead,pitch);
 const effect=dropdown([['none','Natural (no effect)'],['echo','Echo'],['reverb','Reverb'],['telephone','Telephone'],['robot','Robot'],['deep','Deep / dark'],['bright','Bright / thin']],c.effect||'none');
 body.append(row,pitchBox,field('Voice effect',effect));
 body.append(make('p','characterHelp','Effects are applied during playback; recordings stay unchanged. Character settings apply only to this '+(isPlay?'play.':'scene.')));
 body.append(actions(button('Cancel',closeModal),button('Save settings',()=>{
  if(!name.value.trim())return notify('Enter a name');
  const collision=scopeCharIds(scene).filter(other=>other!==id).map(other=>getChar(other)).some(other=>other&&sameName(other.name,name.value));
  if(collision)return notify('That character name is already used in this '+(isPlay?'play':'scene')+'.');
  c.name=name.value.trim();c.muted=mute.checked;c.recordPitch=Number(pitch.value);c.effect=effect.value;
  persist();closeModal();renderScene();
 },'button primary')));
 modal('Character settings',body);
}
function renderTimeline(){const s=getScene(),root=$('timeline');root.replaceChildren();if(!s)return;updateSceneTotals();for(let index=0;index<s.lines.length;index++){const l=s.lines[index],active=playingId===l.id&&(sceneRunning||paused),tile=make('article','tile'+(active?' active':''));tile.dataset.id=l.id;tile.classList.toggle('trimMode',trimOpenId===l.id);if(trimOpenId===l.id){tile.style.height=trimTileHeight+'px';tile.style.minHeight=trimTileHeight+'px';tile.style.maxHeight=trimTileHeight+'px'}const top=make('div','tileTop');top.append(make('span','tileNum',String(index+1).padStart(2,'0')));if(trimOpenId===l.id){const label=make('strong','trimTitle','Trim recording');top.append(label);const done=button('Done',()=>finishTrim(l),'button ghost small');top.append(done);tile.append(top);renderTrimContents(tile,l);root.append(tile);continue}
const sel=dropdown(speakerOptions(l),l.characterId||'');sel.setAttribute('aria-label','Character for line '+(index+1));sel.onchange=()=>changeSpeaker(l.id,sel.value);const box=make('div','speakerSelect');box.append(sel);top.append(box);const time=button(active?stamp(elapsed)+' / '+stamp(duration(l)):stamp(duration(l)),()=>openTrim(l),'tileTime trimTrigger');time.title=l.audioId?'Trim recording':'Record a line to enable trimming';time.disabled=!l.audioId;top.append(time);const removeLine=button('×',()=>deleteLine(l.id),'iconBtn');removeLine.title='Delete dialogue line';removeLine.setAttribute('aria-label','Delete line '+(index+1));top.append(removeLine);tile.append(top);
if(!l.revealed){const reveal=button('◉ Reveal dialogue',()=>{l.revealed=true;persist();renderTimeline()},'reveal');tile.append(reveal)}else{const area=make('div','dialogueBox'),edit=make('textarea');edit.value=l.text||'';edit.placeholder='Double tap to enter text';edit.rows=2;edit.setAttribute('aria-label','Dialogue text, line '+(index+1));edit.oninput=()=>{l.text=edit.value;persist()};area.append(edit,button('Hide dialogue',()=>{l.revealed=false;persist();renderTimeline()},'hideText'));tile.append(area)}
const controls=make('div','tileControls');let isRec=recording?.lineId===l.id,isPlaying=active&&!paused;const rec=button('',()=>toggleRecording(l.id),'toolbtn record'+(isRec?' recording':''));rec.innerHTML=isRec?svgIcon('stop'):svgIcon('record');rec.title=isRec?'Stop recording':'Record this line';rec.setAttribute('aria-label',rec.title);const play=button('',()=>toggleLine(l.id),'toolbtn');play.innerHTML=svgIcon(isPlaying?'pause':'play');play.title=isPlaying?'Pause line':'Play or resume line';const restart=button('',()=>playLine(l.id),'toolbtn');restart.innerHTML=svgIcon('restart');restart.title='Restart line';const muted=effectiveMute(l);const mute=button('',()=>muteLine(l),'toolbtn'+(muted?' activeMute':''));mute.innerHTML=svgIcon(muted?'muted':'audible');mute.title=muted?'Unmute this line':'Mute this line';for(const b of [play,restart,mute])b.setAttribute('aria-label',b.title);controls.append(rec,play,restart,mute);const reorder=make('div','tileReorder');const up=button('↑',()=>moveLine(index,-1),'toolbtn'),down=button('↓',()=>moveLine(index,1),'toolbtn');up.disabled=index===0;down.disabled=index===s.lines.length-1;up.title='Move line up';down.title='Move line down';reorder.append(up,down);controls.append(reorder);tile.append(controls);if(isRec)tile.append(make('div','tileNote','● Recording… Tap stop to save automatically.'));if(l.muteOverride!==null&&l.muteOverride!==undefined&&!!l.muteOverride!==!!getChar(l.characterId)?.muted)tile.append(button('Mute override active · Reset to character setting',()=>{l.muteOverride=null;persist();renderTimeline()},'hideText'));root.append(tile)}if(!s.lines.length)root.append(make('div','note','No dialogue yet. Tap + Add Next Line to begin.'))}
function openTrim(line){if(!line.audioId)return;const existing=document.querySelector('.tile[data-id=\"'+line.id+'\"]');trimTileHeight=existing?.getBoundingClientRect().height||213;stop();const b=trimBounds(line);trimDraft={start:b.start,end:b.end,total:b.total,head:b.start,previewPlaying:false};trimOpenId=line.id;renderTimeline();loadWaveform(line).catch(e=>notify('Waveform unavailable: '+e.message))}
function finishTrim(line){stopTrimAudio();if(trimDraft){line.trimStart=trimDraft.start;line.trimEnd=trimDraft.end>=trimDraft.total-.05?null:trimDraft.end;persist()}trimOpenId=null;trimDraft=null;renderTimeline()}
const waveformCache=new Map();
async function loadWaveform(line){const id=line.audioId;let peaks=waveformCache.get(id);if(!peaks){const row=await dbGet('audio',id);if(!row?.blob)return;const ctx=new (window.AudioContext||window.webkitAudioContext)();try{const decoded=await ctx.decodeAudioData(await row.blob.arrayBuffer());const data=decoded.getChannelData(0),bins=100;peaks=Array.from({length:bins},(_,i)=>{const a=Math.floor(i*data.length/bins),b=Math.floor((i+1)*data.length/bins);let max=0;for(let j=a;j<b;j+=Math.max(1,Math.floor((b-a)/64)))max=Math.max(max,Math.abs(data[j]));return max});waveformCache.set(id,peaks)}finally{ctx.close().catch(()=>{})}}if(trimOpenId===line.id){const canvas=document.querySelector('.trimWave');if(canvas)drawTrimWave(canvas,peaks)}}
function drawTrimWave(canvas,peaks){const ctx=canvas.getContext('2d');const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#9dafff';for(let i=0;i<peaks.length;i++){const height=Math.max(2,peaks[i]*h*.85);ctx.fillRect(i*w/peaks.length,(h-height)/2,Math.max(1,w/peaks.length-1),height)}}
function stopTrimAudio(){
 if(!trimSession)return;
 const session=trimSession;trimSession=null;
 clearInterval(session.timer);
 session.audio.pause();session.audio.removeAttribute('src');session.audio.load();
 URL.revokeObjectURL(session.url);
 if(trimDraft)trimDraft.previewPlaying=false;
}
const trimFormat=n=>Math.max(0,Number(n)||0).toFixed(1)+'s';
function renderTrimContents(tile,line){
 const d=trimDraft;if(!d)return;
 const wrap=make('div','trimEditor');
 const lane=make('div','trimLane'),canvas=make('canvas','trimWave');canvas.width=660;canvas.height=100;lane.append(canvas);
 const leftShade=make('div','trimShade left'),rightShade=make('div','trimShade right'),selected=make('div','trimSelected');lane.append(leftShade,rightShade,selected);
 const left=make('div','trimHandle left'),right=make('div','trimHandle right'),head=make('div','trimPlayhead');head.innerHTML='<span class="trimPlayheadTip"></span>';
 for(const [el,label] of [[left,'Trim start'],[right,'Trim end'],[head,'Playhead position']]){el.tabIndex=0;el.setAttribute('role','slider');el.setAttribute('aria-label',label);el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax',String(d.total.toFixed(1)))}
 lane.append(left,right,head);
 const read=make('div','trimReadout'),startText=make('span'),headText=make('span'),endText=make('span');read.append(startText,headText,endText);
 const update=()=>{
  const a=d.start/d.total*100,b=d.end/d.total*100,h=d.head/d.total*100;
  left.style.left=a+'%';right.style.left=b+'%';head.style.left=h+'%';
  leftShade.style.width=a+'%';rightShade.style.left=b+'%';rightShade.style.width=(100-b)+'%';selected.style.left=a+'%';selected.style.width=(b-a)+'%';
  startText.textContent='In '+trimFormat(d.start);headText.textContent='● '+trimFormat(d.head);endText.textContent='Out '+trimFormat(d.end);
  left.setAttribute('aria-valuenow',d.start.toFixed(1));right.setAttribute('aria-valuenow',d.end.toFixed(1));head.setAttribute('aria-valuenow',d.head.toFixed(1));
 };
 const setValue=(which,v)=>{
  v=Math.round(Math.max(0,Math.min(d.total,v))*10)/10;
  if(which==='start')d.start=Math.min(d.end-.1,v);
  else if(which==='end')d.end=Math.max(d.start+.1,v);
  else d.head=v;
  d.start=Math.max(0,Math.round(d.start*10)/10);d.end=Math.min(d.total,Math.round(d.end*10)/10);
  if(which!=='head'&&d.head<d.start)d.head=d.start;
  if(which!=='head'&&d.head>d.end)d.head=d.end;
  if(which==='head'&&trimSession){trimSession.audio.currentTime=d.head;}
  update();
 };
 const setAt=(which,clientX)=>{const rect=lane.getBoundingClientRect();setValue(which,(clientX-rect.left)/rect.width*d.total)};
 for(const [handle,which] of [[left,'start'],[right,'end'],[head,'head']]){
  handle.addEventListener('pointerdown',e=>{e.preventDefault();handle.setPointerCapture(e.pointerId);setAt(which,e.clientX)});
  handle.addEventListener('pointermove',e=>{if(handle.hasPointerCapture(e.pointerId))setAt(which,e.clientX)});
  handle.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setValue(which,(which==='start'?d.start:which==='end'?d.end:d.head)+(e.key==='ArrowRight'?.1:-.1))}});
 }
 // Tapping an unoccupied position on the waveform also seeks the playback marker.
 lane.addEventListener('pointerdown',e=>{if(e.target===lane||e.target===canvas||e.target===selected){setAt('head',e.clientX)}});
 const buttons=make('div','trimActions');
 const play=button('',()=>toggleTrimPlayback(line,d,play,update),'toolbtn trimTransport');
 play.innerHTML=svgIcon('play');play.title='Play selected audio';play.setAttribute('aria-label',play.title);
 const restart=button('',()=>restartTrimPlayback(line,d,play,update),'toolbtn trimTransport');
 restart.innerHTML=svgIcon('restart');restart.title='Replay selected audio';restart.setAttribute('aria-label',restart.title);
 const reset=button('Reset trim',()=>{stopTrimAudio();d.start=0;d.end=d.total;d.head=0;play.innerHTML=svgIcon('play');update()},'button ghost small');
 buttons.append(play,restart,reset);wrap.append(lane,read,buttons);tile.append(wrap);update();
 if(waveformCache.has(line.audioId))drawTrimWave(canvas,waveformCache.get(line.audioId));
}
async function toggleTrimPlayback(line,d,control,redraw){
 if(trimSession){if(!trimSession.audio.paused){trimSession.audio.pause();d.previewPlaying=false;control.innerHTML=svgIcon('play')}else{try{await trimSession.audio.play();d.previewPlaying=true;control.innerHTML=svgIcon('pause')}catch(e){notify('Could not resume audio: '+e.message)}}return}
 await startTrimPlayback(line,d,control,redraw,false)
}
async function restartTrimPlayback(line,d,control,redraw){
 stopTrimAudio();d.head=d.start;redraw();await startTrimPlayback(line,d,control,redraw,true)
}
async function startTrimPlayback(line,d,control,redraw,fromStart){
 if(!fromStart&&(d.head<d.start||d.head>=d.end-.05))d.head=d.start;
 try{
  const record=await dbGet('audio',line.audioId);if(!record?.blob)return notify('Recording missing');
  if(trimOpenId!==line.id)return;
  stopTrimAudio();
  const url=URL.createObjectURL(record.blob),audio=new Audio(url),session={audio,url,timer:null};trimSession=session;
  audio.preload='auto';audio.currentTime=d.head;
  const complete=()=>{if(trimSession!==session)return;d.head=Math.min(d.end,Math.max(d.start,audio.currentTime));stopTrimAudio();control.innerHTML=svgIcon('play');redraw()};
  session.timer=setInterval(()=>{
   if(trimSession!==session)return;
   if(!audio.paused){d.head=Math.min(d.end,audio.currentTime);redraw();if(audio.currentTime>=d.end-.025)complete()}
  },40);
  audio.ontimeupdate=()=>{if(trimSession===session&&audio.currentTime>=d.end-.025)complete()};audio.onended=complete;
  audio.onerror=()=>{complete();notify('Audio preview unavailable')};
  try{await audio.play();if(trimSession!==session)return;d.previewPlaying=true;control.innerHTML=svgIcon('pause')}catch(e){complete();notify('Audio preview unavailable: '+e.message)}
 }catch(e){notify('Audio preview failed: '+e.message)}
}
async function deleteLine(id){const s=getScene(),l=s.lines.find(x=>x.id===id);if(!l)return;if(!confirm('Delete this dialogue tile'+(l.audioId?' and its recording':'')+'?'))return;if(recording?.lineId===id){notify('Stop recording before deleting.');return}stop();s.lines=s.lines.filter(x=>x.id!==id);persist();renderScene();if(l.audioId)await dbDelete('audio',l.audioId).catch(()=>{})}
function moveLine(index,step){const s=getScene(),target=index+step;if(target<0||target>=s.lines.length)return;stop();[s.lines[index],s.lines[target]]=[s.lines[target],s.lines[index]];persist();renderScene()}
async function toggleRecording(lineId){if(recording){if(recording.lineId===lineId){recording.recorder.stop();return}return notify('Stop the current recording first.')}const l=getScene().lines.find(x=>x.id===lineId);if(!l)return;if(!l.characterId)return notify('Choose a character first.');if(l.audioId&&!confirm('Replace the existing recording for this line? This cannot be undone.'))return;stop();if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return notify('Recording requires Android Chrome over HTTPS.');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const rec=new MediaRecorder(stream),chunks=[],start=performance.now();recording={lineId,recorder:rec,stream};rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const elapsed=(performance.now()-start)/1000,blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});recording=null;try{if(!blob.size)throw Error('Empty recording');const newId=uid();await dbPut('audio',{id:newId,blob});const oldId=l.audioId;l.audioId=newId;l.duration=elapsed;l.trimStart=0;l.trimEnd=null;waveformCache.delete(oldId);l.type='audio';persist();if(oldId)await dbDelete('audio',oldId).catch(()=>{});notify('Recording saved')}catch(e){notify('Recording failed: '+e.message)}renderTimeline()};rec.onerror=()=>notify('Recording error. Please try again.');rec.start(250);renderTimeline()}catch(e){notify('Microphone unavailable: '+e.message)}}
function stop(){stopTrimAudio();if(playingId&&getScene()){const i=getScene().lines.findIndex(l=>l.id===playingId);if(i>=0)selectedLine=i}clearInterval(ticker);ticker=null;playToken++;sceneRunning=false;paused=false;playingId=null;elapsed=0;if(playing?.audio){playing.audio.pause();playing.audio.removeAttribute('src');playing.audio.load();playing.finish?.()}if(playing?.url)URL.revokeObjectURL(playing.url);if(playing?.context)playing.context.close().catch(()=>{});playing=null;refreshPlayButtons();if(getScene())renderTimeline()}
function refreshPlayButtons(){const s=getScene();$('masterPlay').textContent=sceneRunning?(paused?'▶ Resume':'Ⅱ Pause'):'▶ Play';if(!s)return;const found=s.lines.findIndex(l=>l.id===playingId);if(sceneRunning&&found>=0)selectedLine=found;const input=$('currentLine');input.disabled=!!(sceneRunning&&!paused);if(document.activeElement!==input){input.value=s.lines.length?String(selectedLine+1):'0'}$('lineTotal').textContent='/ '+s.lines.length}
function selectPausedLine(index){
 const s=getScene();if(!s?.lines.length)return;
 stop();selectedLine=index;playingId=s.lines[index].id;paused=true;sceneRunning=false;
 renderTimeline();refreshPlayButtons();
 document.querySelector('.tile[data-id="'+playingId+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});
}
function setLinePosition(){
 const s=getScene();if(!s?.lines.length)return;
 const value=Number($('currentLine').value);
 if(!Number.isInteger(value)||value<1||value>s.lines.length){$('currentLine').value=String(selectedLine+1);return notify('Choose a line between 1 and '+s.lines.length)}
 selectPausedLine(value-1);
}
function pauseToggle(){if(!sceneRunning)return playScene();paused=!paused;if(playing?.audio){if(paused)playing.audio.pause();else playing.audio.play().catch(()=>notify('Could not resume playback'))}refreshPlayButtons();renderTimeline()}
function toggleLine(id){
 const index=getScene()?.lines.findIndex(l=>l.id===id);
 if(index<0)return;
 if(sceneRunning&&playingId===id)return pauseToggle();
 if(sceneRunning){if(paused)selectPausedLine(index);else runSequence(index,true);return}
 playLine(id);
}
function playScene(start=selectedLine){const s=getScene();if(!s?.lines.length)return notify('Add a dialogue line first');runSequence(start,true)}
function playLine(id){const index=getScene()?.lines.findIndex(l=>l.id===id);if(index>=0)runSequence(index,false)}
function activeFollow(){if(Date.now()<scrollDisabledUntil)return;const tile=document.querySelector('.tile.active');if(!tile)return;const rect=tile.getBoundingClientRect(),margin=$('master').getBoundingClientRect().bottom+12;if(rect.top<margin||rect.bottom>window.innerHeight-18)window.scrollTo({top:window.scrollY+rect.top-margin,behavior:'smooth'})}
async function silentWait(ms,token){let left=ms,last=performance.now();while(left>0&&token===playToken){await new Promise(r=>setTimeout(r,65));const now=performance.now();if(!paused)left-=now-last;last=now}}
async function runSequence(start,continuous){stop();const token=playToken,s=getScene();sceneRunning=true;let index=start;while(token===playToken){const l=s.lines[index];if(!l)break;playingId=l.id;elapsed=0;clearInterval(ticker);ticker=setInterval(()=>{if(!sceneRunning||paused||playingId!==l.id)return;elapsed=playing?.audio?Math.max(0,playing.audio.currentTime-trimBounds(l).start):Math.min(duration(l),elapsed+.1);const el=document.querySelector('.tile.active .tileTime');if(el)el.textContent=stamp(elapsed)+' / '+stamp(duration(l))},100);refreshPlayButtons();renderTimeline();activeFollow();if(effectiveMute(l)||!l.audioId){await silentWait(duration(l)*1000,token)}else{await playRecorded(l,token)}if(token!==playToken)break;if(!continuous)break;index++;if(index>=s.lines.length){if(s.loop)index=0;else break}}if(token===playToken)stop()}

async function pitchProcessedUrl(blob,semitones){
 if(!semitones)return null;
 const ctx=new (window.AudioContext||window.webkitAudioContext)();
 try{
  const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
  if(decoded.length>decoded.sampleRate*150)throw Error('Pitch processing supports recordings up to 2.5 minutes per line');
  const ratio=Math.pow(2,semitones/12),length=decoded.length,sr=decoded.sampleRate;
  const channels=[];const grain=Math.max(512,Math.round(sr*.075)),half=Math.floor(grain/2);
  // Dual, Hann-windowed variable-delay grains. Output sample count is unchanged.
  for(let ch=0;ch<decoded.numberOfChannels;ch++){
   const src=decoded.getChannelData(ch),dst=new Float32Array(length);
   for(let i=0;i<length;i++){
    let sum=0,norm=0;
    for(let phaseOffset=0;phaseOffset<=.5;phaseOffset+=.5){
     const phase=((i/grain)+phaseOffset)%1;
     const window=.5-.5*Math.cos(2*Math.PI*phase);
     const shift=(ratio-1)*phase*grain;
     const pos=i+shift;
     if(pos>=0&&pos<src.length-1){const idx=Math.floor(pos),frac=pos-idx;sum+=((1-frac)*src[idx]+frac*src[idx+1])*window;norm+=window}
    }
    dst[i]=norm>0?sum/norm:0;
   }
   channels.push(dst)
  }
  const count=Math.min(2,channels.length),out=new ArrayBuffer(44+length*count*2),view=new DataView(out),bytes=new Uint8Array(out);
  const word=(offset,value)=>{for(let i=0;i<value.length;i++)bytes[offset+i]=value.charCodeAt(i)};
  word(0,'RIFF');view.setUint32(4,36+length*count*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,sr,true);view.setUint32(28,sr*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,length*count*2,true);
  let offset=44;for(let i=0;i<length;i++){for(let ch=0;ch<count;ch++){const value=Math.max(-1,Math.min(1,channels[ch][i]));view.setInt16(offset,value<0?value*32768:value*32767,true);offset+=2}}
  return URL.createObjectURL(new Blob([out],{type:'audio/wav'}))
 }finally{ctx.close().catch(()=>{})}
}

function downloadJson(obj,filename){const b=new Blob([JSON.stringify(obj)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000)}
async function encodeBlob(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
function decodeBlob(a){const raw=atob(a.base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:a.type||'audio/webm'})}
async function exportFolderBackup(id){const folder=state.plays.find(p=>p.id===id);if(!folder)return;const scenes=state.scenes.filter(s=>s.playId===id);const charIds=new Set(scenes.flatMap(s=>[...s.cast,...s.lines.map(l=>l.characterId)]));const chars=state.characters.filter(c=>charIds.has(c.id));const audioIds=[...new Set(scenes.flatMap(s=>s.lines.map(l=>l.audioId)).filter(Boolean))];const audios=[];for(const aid of audioIds){const r=await dbGet('audio',aid);if(r?.blob)audios.push({id:aid,type:r.blob.type,base64:await encodeBlob(r.blob)})}downloadJson({format:'LineRunner Folder Backup v1',exportedAt:new Date().toISOString(),folder,scenes,characters:chars,audios},folder.name.replace(/[^a-z0-9-_]+/gi,'-')+'-LineRunner-backup.json');notify('Folder backup downloaded')}
function chooseFolderBackup(){const body=make('div');body.append(make('p','note','Import adds a separate folder without replacing existing scenes. Older whole-library backups can also be imported as separate folders.'));const file=make('input');file.type='file';file.accept='.json,application/json';file.onchange=async()=>{if(!file.files?.[0])return;await importFolderBackup(file.files[0])};body.append(field('Choose backup file',file));modal('Import folder backup',body)}
async function importFolderBackup(file){let data;try{data=JSON.parse(await file.text());if(data.format==='LineRunner Backup v1'){const folder=data.state?.plays?.find(p=>p.id===data.state.scenes?.[0]?.playId)||{id:uid(),name:'Imported library'};data={format:'LineRunner Folder Backup v1',folder,scenes:data.state.scenes||[],characters:data.state.characters||[],audios:data.audios||[]}}if(data.format!=='LineRunner Folder Backup v1'||!data.folder||!Array.isArray(data.scenes)||!Array.isArray(data.characters)||!Array.isArray(data.audios))throw Error('Unsupported backup format');if(data.audios.some(a=>typeof a.base64!=='string'))throw Error('Invalid audio data')}catch(e){return notify('Cannot import backup: '+e.message)}const charMap=new Map(),audioMap=new Map();const importId=uid(),newFolder={id:importId,name:data.folder.name+' (Imported)',open:true};const chars=data.characters.map(c=>{const id=uid();charMap.set(c.id,id);return {...c,id}});const audios=data.audios.map(a=>{const id=uid();audioMap.set(a.id,id);return {id,blob:decodeBlob(a)}});const scenes=data.scenes.map(s=>({...s,id:uid(),playId:importId,cast:(s.cast||[]).map(id=>charMap.get(id)).filter(Boolean),lines:(s.lines||[]).map(l=>({...l,id:uid(),characterId:charMap.get(l.characterId)||'',audioId:audioMap.get(l.audioId)||null}))}));try{for(const a of audios)await dbPut('audio',a);state.plays.push(newFolder);state.characters.push(...chars);state.scenes.push(...scenes);normalizeCharacterScopes();await dbPut('kv',{key:'main',value:state});closeModal();render();notify('Folder imported without replacing existing work')}catch(e){notify('Import failed: '+e.message)}}
async function playRecorded(l,token){let obj;try{obj=await dbGet('audio',l.audioId)}catch(e){notify('Recording unavailable: '+e.message);return}if(!obj?.blob||token!==playToken)return;let url=URL.createObjectURL(obj.blob);const c=getChar(l.characterId)||{};if(c.recordPitch){try{const processed=await pitchProcessedUrl(obj.blob,Math.max(-6,Math.min(6,c.recordPitch)));if(processed){URL.revokeObjectURL(url);url=processed}}catch(e){notify('Pitch processing unavailable; natural pitch used')}}if(token!==playToken){URL.revokeObjectURL(url);return}
const a=new Audio(url);a.preload='auto';const bounds=trimBounds(l);const session={audio:a,url,context:null};playing=session;const effect=c.effect||'none';try{if(effect!=='none')session.context=attachEffect(a,effect)}catch(e){console.warn(e)}const result=await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};session.finish=finish;a.onended=finish;a.onerror=finish;a.ontimeupdate=()=>{if(a.currentTime>=bounds.end-.025)finish()};const start=()=>{if(token!==playToken)return finish();if(paused){setTimeout(start,80);return}if(a.currentTime<bounds.start)a.currentTime=bounds.start;a.play().catch(e=>{notify('Audio could not play: '+e.message);finish()})};start()});a.pause();a.removeAttribute('src');a.load();URL.revokeObjectURL(url);session.context?.close().catch(()=>{});if(playing===session)playing=null;return result}
function attachEffect(a,effect){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;const ctx=new Ctx(),source=ctx.createMediaElementSource(a),gain=ctx.createGain();gain.gain.value=.8;let node=source;
 if(effect==='telephone'||effect==='deep'||effect==='bright'){const f=ctx.createBiquadFilter();if(effect==='telephone'){f.type='bandpass';f.frequency.value=1250;f.Q.value=.75}else if(effect==='deep'){f.type='lowpass';f.frequency.value=1150}else{f.type='highshelf';f.frequency.value=1850;f.gain.value=9}node.connect(f);node=f}
 if(effect==='robot'){const mod=ctx.createOscillator(),modGain=ctx.createGain(),vca=ctx.createGain();mod.frequency.value=33;modGain.gain.value=.45;vca.gain.value=.55;mod.connect(modGain);modGain.connect(vca.gain);mod.start();node.connect(vca);node=vca}
 node.connect(gain);gain.connect(ctx.destination);
 if(effect==='echo'||effect==='reverb'){const delay=ctx.createDelay(1),feedback=ctx.createGain(),wet=ctx.createGain();delay.delayTime.value=effect==='echo'?.24:.065;feedback.gain.value=effect==='echo'?.28:.48;wet.gain.value=effect==='echo'?.4:.27;node.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(ctx.destination)}
 ctx.resume().catch(()=>{});return ctx}
function jump(step){
 const s=getScene();if(!s?.lines.length)return;
 const i=s.lines.findIndex(l=>l.id===playingId),base=i<0?selectedLine:i;
 const target=Math.max(0,Math.min(s.lines.length-1,base+step));
 if(sceneRunning&&!paused)runSequence(target,true);
 else selectPausedLine(target);
}
async function init(){try{db=await openDB();const row=await dbGet('kv','main');if(row?.value?.scenes)state=row.value}catch(e){notify('Browser storage unavailable: '+e.message)}migrate();persist();$('homeBtn').onclick=openHome;$('createFolder').onclick=createFolder;$('createScene').onclick=()=>createScene(null);$('sceneMenu').onclick=()=>editScene();$('goTop').onclick=()=>{scrollDisabledUntil=Date.now()+15000;window.scrollTo({top:0,behavior:'smooth'})};$('goBottom').onclick=()=>{scrollDisabledUntil=Date.now()+15000;$('addNext').scrollIntoView({behavior:'smooth',block:'end'})};$('currentLine').addEventListener('change',setLinePosition);$('currentLine').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setLinePosition();e.target.blur()}});$('masterPlay').onclick=()=>sceneRunning?pauseToggle():playScene();$('prev').onclick=()=>jump(-1);$('next').onclick=()=>jump(1);$('loop').onchange=e=>{getScene().loop=e.target.checked;persist()};$('addNext').onclick=addNext;$('modalClose').onclick=closeModal;$('modalBackdrop').onclick=e=>{if(e.target===$('modalBackdrop'))closeModal()};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modalBackdrop').hidden)closeModal()});window.addEventListener('wheel',()=>{scrollDisabledUntil=Date.now()+2500},{passive:true});window.addEventListener('touchmove',()=>{scrollDisabledUntil=Date.now()+3000},{passive:true});render();if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});if(!window.isSecureContext)setTimeout(()=>notify('Use an HTTPS site on Android to enable recording.'),1600)}
init();
