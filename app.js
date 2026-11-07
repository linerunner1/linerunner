'use strict';
const $ = id => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random().toString(36).slice(2));
const blank = () => ({version:1,plays:[],scenes:[],characters:[],activeScene:null});
let state=blank(), db=null, voices=[], pendingAudio=null, capture=null, recognition=null, toastTimer=null, saveTimer=null, dragId=null;
const runtime={token:0,running:false,paused:false,activeId:null,currentAudio:null,utterance:null,remaining:0,started:0,elapsed:0};
let ticker=null,audioContext=null,inlinePanel=null,emojiLibrary=null,followScroll=true,scrollSuspendUntil=0;
const icons=['🎭','👤','🎩','👑','🕵️','🧙','👻','🤖','🦊','🐉','🎤','🎬'];
const sec = n => {n=Math.max(0,Math.round(Number(n)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
const getScene=()=>state.scenes.find(s=>s.id===state.activeScene);
const char=id=>state.characters.find(c=>c.id===id);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const estimate=text=>Math.max(2,Math.ceil((String(text||'').trim().split(/\s+/).filter(Boolean).length/2.3)+.4));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=s=>{const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200)};
const persist=()=>{if(!db)return;$('saveStatus').textContent='Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await put('kv',{key:'main',value:state});$('saveStatus').textContent='Saved locally'}catch(e){$('saveStatus').textContent='Save failed';toast('Could not save project. Check browser storage.')}},150)};
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('LineRunnerDB',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('kv',{keyPath:'key'});d.createObjectStore('audio',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(store,value){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
function get(store,key){return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function remove(store,key){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
function all(store){return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function newEl(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el}
function btn(label,onClick,cls='button ghost'){const b=newEl('button',cls,label);b.type='button';b.addEventListener('click',onClick);return b}
function modal(title,content){$('modalTitle').textContent=title;const body=$('modalBody');body.className='modalbody';body.replaceChildren();if(typeof content==='string')body.innerHTML=content;else body.append(content);$('modalBackdrop').hidden=false;$('closeModal').focus()}
function closeModal(){if(capture?.recorder?.state==='recording')endCapture();if(recognition){try{recognition.stop()}catch{}recognition=null}if(pendingAudio?.url)URL.revokeObjectURL(pendingAudio.url);pendingAudio=null;$('modalBackdrop').hidden=true;$('modalBody').replaceChildren()}
function section(label,el,help){const d=newEl('div','field');d.append(newEl('label','',label));d.append(el);if(help)d.append(newEl('small','',help));return d}
function input(value='',placeholder='',type='text'){const i=document.createElement('input');i.type=type;i.value=value;i.placeholder=placeholder;return i}
function select(options,value){const s=document.createElement('select');for(const [v,label] of options){const o=document.createElement('option');o.value=v;o.textContent=label;s.append(o)}s.value=value;return s}
function footer(...children){const d=newEl('div','modalactions');d.append(...children);return d}
function avatar(c,round=false){const node=newEl('div','avatar'+(round?' round':''));node.textContent=c?.icon||'🎭';return node}
function render(){const s=getScene();renderLibrary();$('emptyState').hidden=!!s;$('sceneUI').hidden=!s;if(!s)return;const p=state.plays.find(p=>p.id===s.playId);$('breadcrumb').textContent=p?p.name+' / Scene':'Standalone scene';$('sceneTitle').textContent=s.name;$('sceneDescription').textContent=`${s.lines.length} lines · ${new Set(s.lines.map(x=>x.characterId)).size} characters`;$('loopToggle').checked=!!s.loop;renderCast();renderTimeline()}
function renderLibrary(){const root=$('library');root.replaceChildren();for(const p of state.plays){const row=newEl('div','library-row');row.append(btn('▾  '+p.name,()=>{p.open=!p.open;persist();renderLibrary()},'library-entry'));const add=btn('＋',()=>createScene(p.id),'tinyadd');add.title='Add scene to this play';row.append(add);root.append(row);if(p.open!==false){const nested=newEl('div','library-children');for(const s of state.scenes.filter(x=>x.playId===p.id))nested.append(btn('◦  '+s.name,()=>changeScene(s.id),'library-entry'+(s.id===state.activeScene?' active':'')));root.append(nested)}}const solo=state.scenes.filter(s=>!s.playId);const heading=newEl('div','library-caption','STANDALONE SCENES');root.append(heading);for(const s of solo)root.append(btn('◦  '+s.name,()=>changeScene(s.id),'library-entry'+(s.id===state.activeScene?' active':'')))}
function renderCast(){const s=getScene();const cast=$('castRow');cast.replaceChildren();const ids=[...new Set([...s.cast,...s.lines.map(x=>x.characterId)])];for(const id of ids){const c=char(id);if(!c)continue;const chip=newEl('button','castchip'+(s.mutedCharacters?.includes(id)?' off':''));chip.title='Click to mute/unmute all lines. Right-click or long-press to edit character.';chip.append(avatar(c,true));const span=newEl('span','castchip-name',c.name);chip.append(span);chip.append(newEl('span','',s.mutedCharacters?.includes(id)?'🔇':'🔊'));chip.onclick=()=>{s.mutedCharacters=s.mutedCharacters||[];s.mutedCharacters=s.mutedCharacters.includes(id)?s.mutedCharacters.filter(x=>x!==id):[...s.mutedCharacters,id];persist();renderCast();renderTimeline()};chip.oncontextmenu=e=>{e.preventDefault();characterEditor(id)};let timer;chip.addEventListener('touchstart',()=>{timer=setTimeout(()=>characterEditor(id),650)},{passive:true});chip.addEventListener('touchend',()=>clearTimeout(timer));chip.addEventListener('touchmove',()=>clearTimeout(timer));cast.append(chip);const editButton=btn('✎',()=>characterEditor(id),'tinyadd');editButton.title='Edit '+c.name;cast.append(editButton)}cast.append(btn('＋ Cast',()=>characterEditor(null),'button ghost small'));$('castHint').textContent=ids.length+' roles'}
function lineDuration(line){return line.duration||estimate(line.text)}
function effectiveMute(s,l){return !!(l.muted||s.mutedCharacters?.includes(l.characterId))}
function extraTime(l){return l.extraOverride??char(l.characterId)?.extra??l.extra??0}
function pitchFor(l){return l.pitchOverride??char(l.characterId)?.recordPitch??0}
function renderTimeline(){
 const s=getScene();if(!s)return;
 if(capture?.recorder?.state==='recording' && document.querySelector('.tile-inline:not([hidden])'))return;
 const root=$('timeline');root.replaceChildren();$('timelineEmpty').hidden=s.lines.length>0;
 if($('timelineCount'))$('timelineCount').textContent=s.lines.length+' lines · Use ↑ and ↓ to reorder';
 for(let i=0;i<s.lines.length;i++){
  const l=s.lines[i],c=char(l.characterId),tile=newEl('article','tile'+(runtime.activeId===l.id?' active':''));tile.dataset.id=l.id;tile.dataset.index=i;
  const top=newEl('div','tile-top');top.append(newEl('span','line-no',String(i+1).padStart(2,'0')));
  const characterAvatar=btn('',()=>characterEditor(l.characterId),'tile-avatar-button');characterAvatar.title='Edit '+(c?.name||'character')+' defaults';characterAvatar.append(avatar(c));top.append(characterAvatar);
  const meta=newEl('div','tile-meta'),title=newEl('div','tile-name');title.append(newEl('span','',c?.name||'Unknown character'),newEl('span','type-tag',l.type==='audio'?'● Recorded':l.type==='tts'?'◉ Text-to-speech':'○ Empty'));meta.append(title,newEl('div','tile-state',effectiveMute(s,l)?'Muted during scene playback':'Audible in scene playback'));top.append(meta);
  const timer=newEl('span','tile-time',runtime.activeId===l.id&&runtime.running?sec(runtime.elapsed)+' / '+sec(runtime.remaining):sec(lineDuration(l)+(effectiveMute(s,l)?extraTime(l):0)));timer.id='time-'+l.id;top.append(timer);tile.append(top);
  const revealed=!!l.revealed;const reveal=newEl('button','reveal'+(revealed?' shown':''),revealed?(l.text||'[No transcript yet]'):'◉  Reveal dialogue');reveal.title='Show or hide this line';reveal.onclick=()=>{l.revealed=!l.revealed;persist();renderTimeline()};const body=newEl('div','tile-body');body.append(reveal);tile.append(body);
  const bottom=newEl('div','tile-bottom'),buttons=newEl('div','tile-buttons'),active=runtime.running&&runtime.activeId===l.id;
  const recNow=capture?.lineId===l.id&&capture.recorder?.state==='recording';
  const actions=[
   [recNow?'⏹':'🔴',recNow?'Stop recording':'Record dialogue',()=>recNow?endCapture():showInlineEditor(l.id,'record')],
   [active&&!runtime.paused?'Ⅱ':'▶',active&&!runtime.paused?'Pause this line':active?'Resume this line':'Play this line',()=>{if(runtime.running&&runtime.activeId===l.id)togglePause();else playSingle(l.id)}],
   ['↻','Replay line',()=>playSingle(l.id)],
   [l.muted?'🔇':'🔊','Mute or unmute line',()=>{l.muted=!l.muted;persist();renderTimeline()}],
   ['⚙','Edit line',()=>showInlineEditor(l.id,'edit')]
  ];
  for(const [glyph,label,fn] of actions){const b=btn(glyph,fn,'toolbtn'+(l.muted&&label.includes('Mute')?' selected':''));b.title=label;b.setAttribute('aria-label',label);buttons.append(b)}
  bottom.append(buttons);const reorder=newEl('div','reorder-mini');const up=btn('↑',()=>moveAt(i,-1),'toolbtn'),down=btn('↓',()=>moveAt(i,1),'toolbtn');up.title='Move up';down.title='Move down';up.disabled=i===0;down.disabled=i===s.lines.length-1;reorder.append(up,down);bottom.append(reorder);tile.append(bottom);
  const inline=newEl('div','tile-inline');inline.hidden=true;tile.append(inline);root.append(tile);
 }
 if(inlinePanel&&!(capture?.recorder?.state==='recording')){
  const {id,type}=inlinePanel;const autoStart=!!inlinePanel.autoStart;inlinePanel.autoStart=false;showInlineEditor(id,type,true,autoStart)
 }
}
function moveAt(i,d){const s=getScene();const j=i+d;if(j<0||j>=s.lines.length)return;[s.lines[i],s.lines[j]]=[s.lines[j],s.lines[i]];stopPlayback();persist();renderTimeline()}
function moveLine(fromId,toId){const s=getScene();const i=s.lines.findIndex(l=>l.id===fromId),j=s.lines.findIndex(l=>l.id===toId);if(i<0||j<0||i===j)return;const [line]=s.lines.splice(i,1);s.lines.splice(j,0,line);stopPlayback();persist();renderTimeline()}
function changeScene(id){document.getElementById('sidebar')?.classList.remove('library-open');document.getElementById('mobileLibraryBtn')?.setAttribute('aria-expanded','false');stopPlayback();inlinePanel=null;state.activeScene=id;persist();render()}
function openSettings(){const body=document.createElement('div');body.append(newEl('div','note','Projects and recordings are saved locally on this device. Keep a backup before changing phones or clearing browser data.'));const exportButton=btn('↓ Export complete backup',()=>exportBackup().catch(e=>toast('Backup failed: '+e.message)),'button ghost full');const importInput=document.createElement('input');importInput.type='file';importInput.accept='.json,application/json';importInput.onchange=e=>{const file=e.target.files?.[0];if(file)restoreBackup(file).then(()=>closeModal());importInput.value=''};body.append(section('Data management',exportButton),section('Restore a saved backup',importInput,'Restoring replaces your existing projects.'));body.append(footer(btn('Close',closeModal)));modal('Settings',body)}
function createPlay(){const name=input('','Play title');const body=document.createElement('div');body.append(section('Play name',name),footer(btn('Cancel',closeModal),btn('Create play',()=>{if(!name.value.trim())return toast('Enter a name');const p={id:uid(),name:name.value.trim(),open:true};state.plays.push(p);persist();closeModal();render();toast('Play folder created. Add a scene to this folder from the Library menu.')},'button primary')));modal('Create a play',body);name.focus()}
function createScene(playId=null){const name=input('','Scene title');const target=select([['','Standalone scene'],...state.plays.map(p=>[p.id,p.name])],playId||'');const body=document.createElement('div');body.append(section('Scene title',name),section('Save under',target),footer(btn('Cancel',closeModal),btn('Create scene',()=>{if(!name.value.trim())return toast('Enter a scene title');const s={id:uid(),name:name.value.trim(),playId:target.value||null,cast:[],lines:[],mutedCharacters:[],mode:'rehearsal',loop:false};state.scenes.push(s);state.activeScene=s.id;stopPlayback();persist();closeModal();render()},'button primary')));modal('Create a scene',body);name.focus()}
function renameScene(){const s=getScene();const name=input(s.name);const parent=select([['','Standalone scene'],...state.plays.map(p=>[p.id,p.name])],s.playId||'');const body=document.createElement('div');body.append(section('Scene name',name),section('Location',parent),footer(btn('Cancel',closeModal),btn('Save changes',()=>{if(!name.value.trim())return;s.name=name.value.trim();s.playId=parent.value||null;persist();closeModal();render()},'button primary')));modal('Scene settings',body)}
function deleteScene(){const s=getScene();if(!confirm('Delete "'+s.name+'" and its dialogue? This cannot be undone.'))return;stopPlayback();const doomed=s.lines.map(l=>l.audioId).filter(Boolean);state.scenes=state.scenes.filter(x=>x.id!==s.id);state.activeScene=state.scenes[0]?.id||null;persist();render();doomed.forEach(a=>remove('audio',a).catch(()=>{}))}
function characterEditor(characterId=null,onSaved=null){
 const c=characterId?char(characterId):null;let icon=c?.icon||'🎭';
 const name=input(c?.name||'','Character name');
 const voiceSel=select([['','Device default'],...voices.map(v=>[v.voiceURI,v.name+' ('+v.lang+')'])],c?.voiceURI||'');
 const pitch=rangeField('Default recorded pitch (semitones)',c?.recordPitch??0,-6,6,1);
 const extra=rangeField('Default extra rehearsal seconds',c?.extra??0,0,30,1);
 const ttsPitch=rangeField('Text-to-speech pitch',c?.pitch??1,.5,2,.1);
 const rate=rangeField('Text-to-speech speed',c?.rate??1,.5,1.8,.1),volume=rangeField('Volume',c?.volume??1,0,1,.1);
 const body=document.createElement('div');body.append(section('Character name',name));
 const subheading=newEl('h3','settings-subhead','Audio settings');body.append(subheading,pitch.el,extra.el,section('Default TTS voice',voiceSel),ttsPitch.el,rate.el,volume.el);
 const avatarHeader=newEl('h3','settings-subhead','Avatar');body.append(avatarHeader);
 const preview=avatar({icon},true);preview.classList.add('avatar-preview');const browse=btn('Choose emoji',openPicker,'button ghost');const pickerPanel=newEl('div','emoji-picker');pickerPanel.hidden=true;
 function openPicker(){pickerPanel.hidden=!pickerPanel.hidden;if(!pickerPanel.hidden)populatePicker()}
 function populatePicker(){pickerPanel.replaceChildren();if(!emojiLibrary){pickerPanel.append(newEl('div','help','Emoji collection is loading. Please try again.'));return}
  const categories=Object.keys(emojiLibrary);
  const group=select(categories.map(v=>[v,v]),'Faces & emotions');group.value='Faces & emotions';const search=input('','Search emojis');search.setAttribute('aria-label','Search emojis');const grid=newEl('div','emoji-picker-grid');
  const draw=()=>{const query=search.value.trim().toLowerCase(),items=(query?Object.values(emojiLibrary).flat():emojiLibrary[group.value]||[]).filter(x=>!query||x.name.toLowerCase().includes(query));grid.replaceChildren();for(const item of items.slice(0,400)){const b=btn(item.emoji,()=>{icon=item.emoji;preview.textContent=icon;browse.textContent='Change emoji';pickerPanel.hidden=true},'emoji-choice'+(item.emoji===icon?' active':''));b.title=item.name;b.setAttribute('aria-label',item.name);grid.append(b)}if(!items.length)grid.append(newEl('p','help','No matching emoji found.'))};
  group.onchange=draw;search.oninput=draw;pickerPanel.append(section('Category',group),section('Search by name',search),grid,newEl('div','help','Emoji appearance depends on your Android version. Search results show up to 400 matches; narrow your search for more.'));draw()
 }
 const previewRow=newEl('div','avatar-settings');previewRow.append(preview,browse);body.append(previewRow,pickerPanel,newEl('div','help','Choose from the bundled emoji collection. No photo upload or color settings.'));
 body.append(footer(btn('Cancel',closeModal),btn(c?'Save character':'Create character',()=>{
  if(!name.value.trim())return toast('Enter a character name');let target=c;if(!target){target={id:uid()};state.characters.push(target)}
  Object.assign(target,{name:name.value.trim(),avatar:null,color:null,icon,voiceURI:voiceSel.value,recordPitch:+pitch.control.value,extra:+extra.control.value,pitch:+ttsPitch.control.value,rate:+rate.control.value,volume:+volume.control.value});
  const s=getScene();if(s&&!s.cast.includes(target.id))s.cast.push(target.id);persist();closeModal();render();onSaved?.(target.id)
 },'button primary')));
 modal(c?'Edit character':'New character',body);name.focus()
}

function rangeField(label,value,min,max,step){const wrapper=newEl('div','field'),heading=newEl('div','fieldlabel'),out=newEl('span','pill',String(value));heading.textContent=label+' ';heading.append(out);const slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=value;slider.oninput=()=>out.textContent=slider.value;wrapper.append(heading,slider);return{el:wrapper,control:slider}}
function addLine(){const s=getScene();if(!s)return;const body=document.createElement('div');const choose=newEl('div','character-options');let choice=s.cast[0]||'new';let type='audio';const selectorArea=newEl('div');function drawChoices(){choose.replaceChildren();for(const id of s.cast){const c=char(id);if(!c)continue;const b=newEl('button','character-option'+(id===choice?' selected':''));b.append(avatar(c,true),newEl('span','',c.name));b.onclick=()=>{choice=id;drawChoices()};choose.append(b)}const b=newEl('button','character-option'+(choice==='new'?' selected':''));b.append(newEl('div','avatar round','＋'),newEl('span','',''));b.lastChild.textContent='New character';b.onclick=()=>{choice='new';drawChoices()};choose.append(b)}drawChoices();const name=input('','New character name');selectorArea.append(section('New character name',name));const typeRow=newEl('div','choice-row');const recordBtn=btn('🎙 Record',()=>setType('audio'),'choice active'),ttsBtn=btn('▤ Type + TTS',()=>setType('tts'),'choice');typeRow.append(recordBtn,ttsBtn);const typed=newEl('textarea');typed.placeholder='Enter the dialogue here, or use your keyboard microphone to dictate.';function setType(v){type=v;recordBtn.classList.toggle('active',v==='audio');ttsBtn.classList.toggle('active',v==='tts');typed.closest('.field').hidden=v==='audio'}const typedBox=section('Dialogue',typed);const renderNew=()=>selectorArea.hidden=choice!=='new';choose.addEventListener('click',renderNew);renderNew();const submit=btn('Continue',()=>{const finalize=id=>{const l={id:uid(),characterId:id,type,text:typed.value.trim(),audioId:null,duration:0,muted:false,revealed:false,extraOverride:null,pitchOverride:null};s.lines.push(l);persist();closeModal();render();if(type==='audio')showInlineEditor(l.id,'record');else showInlineEditor(l.id,'edit')};if(choice==='new'){if(!name.value.trim())return toast('Enter a character name');const c={id:uid(),name:name.value.trim(),icon:'🎭',color:null,avatar:null,voiceURI:'',pitch:1,rate:1,volume:1,recordPitch:0,extra:0};state.characters.push(c);s.cast.push(c.id);finalize(c.id)}else finalize(choice)},'button primary');body.append(section('Choose the speaker',choose),selectorArea,section('Line input method',typeRow),typedBox,footer(btn('Cancel',closeModal),submit));setType('audio');modal('Add dialogue',body)}
function lineEditor(id){showInlineEditor(id,'edit')}
function showInlineEditor(id,type,fromRender=false,autoStart=false){
 const l=findLine(id);if(!l)return;
 if(capture?.recorder?.state==='recording'&&capture.lineId!==id)return toast('Stop recording before editing another line.');
 if(!fromRender){if(inlinePanel?.id===id&&inlinePanel.type===type){inlinePanel=null;renderTimeline();return}inlinePanel={id,type,autoStart:type==='record'};stopPlayback(false);renderTimeline();return}
 const tile=[...document.querySelectorAll('.tile')].find(x=>x.dataset.id===id);if(!tile)return;
 const region=tile.querySelector('.tile-inline');region.hidden=false;
 region.append(newEl('h3','inline-title',type==='record'?'Record dialogue':'Dialogue settings'));
 if(type==='edit')attachInlineSettings(l,region);else attachInlineRecorder(l,region,autoStart);
 region.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function closeInline(){if(capture?.recorder?.state==='recording'){endCapture();return}if(recognition){try{recognition.stop()}catch{}recognition=null}if(pendingAudio?.url)URL.revokeObjectURL(pendingAudio.url);pendingAudio=null;inlinePanel=null;renderTimeline()}
function attachInlineSettings(l,region){
 const s=getScene();const charSel=select([...new Set([...s.cast,...state.characters.map(c=>c.id)])].map(id=>[id,char(id)?.name||'Unknown']),l.characterId);
 const transcript=newEl('textarea');transcript.value=l.text||'';
 const type=select([['audio','Recorded audio'],['tts','Text-to-speech']],l.type);
 const pitchOverride=document.createElement('input');pitchOverride.type='checkbox';pitchOverride.checked=l.pitchOverride!=null;
 const pitch=rangeField('Pitch override (semitones)',l.pitchOverride??pitchFor(l),-6,6,1);
 const extraOverride=document.createElement('input');extraOverride.type='checkbox';extraOverride.checked=l.extraOverride!=null;
 const extra=rangeField('Extra rehearsal seconds',l.extraOverride??extraTime(l),0,30,1);
 const pitchCheck=section('Override character pitch',pitchOverride);pitchCheck.classList.add('inline-check');
 const extraCheck=section('Override character pause',extraOverride);extraCheck.classList.add('inline-check');
 pitch.el.hidden=!pitchOverride.checked;extra.el.hidden=!extraOverride.checked;
 pitchOverride.onchange=()=>pitch.el.hidden=!pitchOverride.checked;extraOverride.onchange=()=>extra.el.hidden=!extraOverride.checked;
 region.append(section('Speaker',charSel),section('Dialogue transcript',transcript,'Editing the text does not replace recorded audio.'),section('Audio source',type),pitchCheck,pitch.el,extraCheck,extra.el);
 const del=btn('Delete tile',()=>{if(!confirm('Delete this line and its recording?'))return;const old=l.audioId;s.lines=s.lines.filter(x=>x.id!==l.id);if(old)remove('audio',old).catch(()=>{});inlinePanel=null;persist();render()},'button danger-quiet');
 region.append(footer(del,btn('Close',closeInline),btn('Save',()=>{
  Object.assign(l,{characterId:charSel.value,text:transcript.value,type:type.value,extraOverride:extraOverride.checked?+extra.control.value:null,pitchOverride:pitchOverride.checked?+pitch.control.value:null});
  if(!s.cast.includes(l.characterId))s.cast.push(l.characterId);inlinePanel=null;persist();render();toast('Dialogue updated')
 },'button primary')))
}
function findLine(id){return getScene()?.lines.find(x=>x.id===id)}
async function recordEditor(id){showInlineEditor(id,'record')}
function attachInlineRecorder(l,region,autoStart=false){
 pendingAudio=null;
 const status=newEl('div','record-status','Ready to record.'),recordButton=btn('🔴 Record',toggleRecording,'button primary');
 const preview=document.createElement('audio');preview.controls=true;preview.className='preview-audio';preview.hidden=true;
 const transcript=newEl('textarea');transcript.value=l.text||'';transcript.placeholder='Transcript is captured automatically when supported, or enter it with your Android keyboard microphone.';
 const sttStatus=newEl('div','help','On Android, browser speech recognition may not support microphone recording at the same time. Your recording is saved independently.');
 let recordingStarted=0,hadResults=false,hadError=false;
 function autoTranscribe(){
  const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRec){sttStatus.textContent='Automatic transcription unavailable in this browser. Tap the transcript field and use Android keyboard dictation.';return}
  try{const rec=new SpeechRec();recognition=rec;rec.lang=navigator.language||'en-US';rec.continuous=true;rec.interimResults=true;
   let confirmed=transcript.value.trim();rec.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal){confirmed=(confirmed+' '+r[0].transcript).trim();hadResults=true}else interim+=' '+r[0].transcript}transcript.value=(confirmed+' '+interim).trim()};
   rec.onerror=e=>{hadError=true;sttStatus.textContent='Android speech recognition unavailable ('+e.error+'). Audio recording continues. Use keyboard dictation if needed.'};
   rec.onend=()=>{if(recognition===rec)recognition=null;if(!hadError)sttStatus.textContent=hadResults?'Transcript captured. Please review.':'No transcript detected. Use Android keyboard dictation or type it manually.'};
   rec.start();sttStatus.textContent='Attempting automatic transcription while recording…';
  }catch(e){recognition=null;sttStatus.textContent='Automatic transcription could not start. Recording still works.'}
 }
 async function toggleRecording(){if(capture?.recorder?.state==='recording'){endCapture();return}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Microphone recording requires HTTPS and Android Chrome permission.');return}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const recorder=new MediaRecorder(stream),parts=[];recordingStarted=Date.now();capture={recorder,stream,lineId:l.id};
   recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
   recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());if(recognition){try{recognition.stop()}catch{}}
    const blob=new Blob(parts,{type:recorder.mimeType||'audio/webm'});const url=URL.createObjectURL(blob);const duration=await measureDuration(url);
    if(pendingAudio?.url)URL.revokeObjectURL(pendingAudio.url);pendingAudio={blob,url,duration:duration||Math.max(1,(Date.now()-recordingStarted)/1000)};
    preview.src=url;preview.hidden=false;status.textContent='Recording stopped. Review, then Save or Delete.';status.classList.remove('live');recordButton.textContent='🔴 Record';capture=null;
    const tile=document.querySelector('.tile[data-id="'+l.id+'"]');const b=tile?.querySelector('[aria-label="Stop recording"]');if(b){b.textContent='🔴';b.setAttribute('aria-label','Record dialogue')}
   };
   recorder.start(250);autoTranscribe();status.textContent='🔴 Recording…';status.classList.add('live');recordButton.textContent='⏹ Stop';
   const tile=document.querySelector('.tile[data-id="'+l.id+'"]');const b=tile?.querySelector('[aria-label="Record dialogue"]');if(b){b.textContent='⏹';b.setAttribute('aria-label','Stop recording')}
  }catch(e){toast('Microphone unavailable: '+e.message)}
 }
 const deleteB=btn('Delete',async()=>{if(pendingAudio?.url){URL.revokeObjectURL(pendingAudio.url);pendingAudio=null}if(l.audioId){if(!confirm('Delete saved audio for this line?'))return;await remove('audio',l.audioId);l.audioId=null;l.duration=0;persist()}preview.hidden=true;status.textContent='Audio deleted. Transcript is retained.'},'button danger-quiet');
 const saveB=btn('Save',async()=>{if(capture?.recorder?.state==='recording')return toast('Tap Stop before saving');
  if(pendingAudio?.blob){const audioId=uid();try{await put('audio',{id:audioId,blob:pendingAudio.blob});if(l.audioId)await remove('audio',l.audioId);l.audioId=audioId;l.duration=pendingAudio.duration;l.type='audio'}catch(e){return toast('Could not save audio: '+e.message)}}
  l.text=transcript.value.trim();inlinePanel=null;persist();if(pendingAudio?.url)URL.revokeObjectURL(pendingAudio.url);pendingAudio=null;render();toast('Line saved')
 },'button primary');
 region.append(status,recordButton,preview,section('Transcript',transcript,'Correct any misheard text without changing the recording.'),sttStatus,footer(deleteB,btn('Close',closeInline),saveB));if(autoStart)recordButton.click()
}
function endCapture(){if(capture?.recorder?.state==='recording')capture.recorder.stop()}
function measureDuration(url){return new Promise(res=>{const a=new Audio();let done=false;const finish=v=>{if(done)return;done=true;res(v)};a.preload='metadata';a.onloadedmetadata=()=>{if(Number.isFinite(a.duration))finish(a.duration)};a.onerror=()=>finish(0);a.src=url;setTimeout(()=>finish(0),2200)})}
function refreshVoices(){voices=window.speechSynthesis?.getVoices()||[]}
function stopPlayback(redraw=true){runtime.token++;runtime.running=false;runtime.paused=false;runtime.activeId=null;runtime.elapsed=0;if(runtime.currentAudio){runtime.currentAudio.pause();runtime.currentAudio.src='';runtime.currentAudio=null}if(window.speechSynthesis)window.speechSynthesis.cancel();runtime.utterance=null;clearInterval(ticker);ticker=null;$('startIcon').textContent='▶';$('startLabel').textContent='Play scene';if(redraw&&getScene())renderTimeline()}
function togglePause(){if(!runtime.running){playScene();return}runtime.paused=!runtime.paused;if(runtime.currentAudio){if(runtime.paused)runtime.currentAudio.pause();else runtime.currentAudio.play().catch(()=>{})}if(runtime.utterance){if(runtime.paused)window.speechSynthesis?.pause();else window.speechSynthesis?.resume()}$('startIcon').textContent=runtime.paused?'▶':'Ⅱ';$('startLabel').textContent=runtime.paused?'Resume':'Pause';renderTimeline()}
function togglePauseFor(id){if(runtime.running&&runtime.activeId===id)togglePause();else toast('Play this line first to pause it')}
function playScene(start=0){const s=getScene();if(!s?.lines.length)return toast('Add dialogue to start playback');playSequence(start,true,false)}
function playSingle(id){const s=getScene(),i=s?.lines.findIndex(l=>l.id===id);if(i>=0)playSequence(i,false,true)}
async function waitPause(milliseconds,token){let left=milliseconds;let last=performance.now();while(left>0&&runtime.token===token){await new Promise(r=>setTimeout(r,60));const now=performance.now();if(!runtime.paused){left-=now-last;runtime.elapsed=(milliseconds-left)/1000;updateActiveTime()}last=now}return runtime.token===token}
function updateActiveTime(){const el=$('time-'+runtime.activeId);if(el)el.textContent=sec(runtime.elapsed)+' / '+sec(runtime.remaining)}
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
async function playAudio(l,token){
 const obj=await get('audio',l.audioId);if(token!==runtime.token)return;if(!obj?.blob){toast('Audio recording missing.');return}
 let url=URL.createObjectURL(obj.blob);
 const semitones=pitchFor(l);
 if(semitones){try{const processed=await pitchProcessedUrl(obj.blob,semitones);if(processed){URL.revokeObjectURL(url);url=processed}}catch(e){toast('Pitch adjustment unavailable; playing natural recording. '+e.message)}}
 if(token!==runtime.token){URL.revokeObjectURL(url);return}
 const a=new Audio(url);runtime.currentAudio=a;a.playbackRate=1;a.preservesPitch=true;a.volume=char(l.characterId)?.volume??1;
 runtime.remaining=l.duration||estimate(l.text);runtime.elapsed=0;renderTimeline();
 try{await new Promise(resolve=>{a.onended=resolve;a.onerror=resolve;let attempts=0;const test=()=>{if(runtime.token!==token){resolve();return}if(runtime.paused){setTimeout(test,80);return}a.play().catch(()=>{if(++attempts>3)resolve();else setTimeout(test,100)})};test()})}
 finally{a.pause();a.removeAttribute('src');a.load();URL.revokeObjectURL(url);if(runtime.currentAudio===a)runtime.currentAudio=null}
}
async function playTTS(l,token){if(!('speechSynthesis'in window)){toast('Text-to-speech is not available on this browser.');return}const c=char(l.characterId)||{};const spoken=l.text.trim();if(!spoken)return;const u=new SpeechSynthesisUtterance(spoken);const voice=voices.find(v=>v.voiceURI===c.voiceURI);if(voice)u.voice=voice;u.pitch=c.pitch??1;u.rate=c.rate??1;u.volume=c.volume??1;runtime.utterance=u;runtime.remaining=estimate(spoken)/(c.rate||1);runtime.elapsed=0;renderTimeline();await new Promise(resolve=>{u.onend=resolve;u.onerror=resolve;if(runtime.token!==token)return resolve();window.speechSynthesis.cancel();window.speechSynthesis.speak(u)});runtime.utterance=null}
async function playSequence(start,continuous,forceAudible){stopPlayback(false);const token=runtime.token;runtime.running=true;$('startIcon').textContent='Ⅱ';$('startLabel').textContent='Pause';const s=getScene();if(!s)return;let idx=start;while(token===runtime.token){const l=s.lines[idx];if(!l)break;runtime.activeId=l.id;runtime.elapsed=0;runtime.remaining=lineDuration(l);runtime.started=performance.now();clearInterval(ticker);ticker=setInterval(()=>{if(runtime.running&&!runtime.paused&&runtime.activeId===l.id){if(runtime.currentAudio)runtime.elapsed=runtime.currentAudio.currentTime;else runtime.elapsed=Math.min(runtime.remaining,runtime.elapsed+.1);updateActiveTime()}},100);renderTimeline();followActiveTile();const silent=!forceAudible&&effectiveMute(s,l);if(silent){const duration=(lineDuration(l)+extraTime(l))*1000;runtime.remaining=duration/1000;await waitPause(duration,token)}else if(l.type==='audio'&&l.audioId){await playAudio(l,token)}else if(l.type==='tts'&&l.text.trim()){await playTTS(l,token)}else{await waitPause(estimate(l.text)*1000,token)}if(runtime.token!==token)break;if(!continuous)break;idx++;if(idx>=s.lines.length){if(s.loop)idx=0;else break}}if(token===runtime.token)stopPlayback()}
function followActiveTile(){if(Date.now()<scrollSuspendUntil)return;const el=document.querySelector('.tile.active');if(!el)return;const toolbar=$('playbackToolbar'),header=document.querySelector('.topbar');const top=(header?.offsetHeight||0)+(toolbar?.offsetHeight||0)+18;const rect=el.getBoundingClientRect();if(rect.top<top||rect.bottom>window.innerHeight-24){window.scrollTo({top:window.scrollY+rect.top-top,behavior:'smooth'})}}
function jump(delta){const s=getScene();if(!s?.lines.length)return;const i=s.lines.findIndex(l=>l.id===runtime.activeId);playScene(clamp(i+delta,0,s.lines.length-1))}
async function exportBackup(){await new Promise(r=>setTimeout(r,180));const audios=await all('audio');const serialized=[];for(const item of audios){const buf=await item.blob.arrayBuffer();const bytes=new Uint8Array(buf);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));serialized.push({id:item.id,type:item.blob.type,base64:btoa(binary)})}const obj={format:'LineRunner Backup v1',exportedAt:new Date().toISOString(),state,audios:serialized};const blob=new Blob([JSON.stringify(obj)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='LineRunner-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Backup downloaded')}
async function restoreBackup(file){if(!file)return;let parsed;try{parsed=JSON.parse(await file.text());if(parsed.format!=='LineRunner Backup v1'||!Array.isArray(parsed.state?.scenes)||!Array.isArray(parsed.audios))throw Error('Not a LineRunner backup')}catch(e){return toast('Invalid backup: '+e.message)}if(!confirm('Restore this backup? Current scenes and recordings will be replaced.'))return;stopPlayback();try{const tx=db.transaction(['kv','audio'],'readwrite');tx.objectStore('kv').clear();tx.objectStore('audio').clear();await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});for(const a of parsed.audios){const raw=atob(a.base64);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);await put('audio',{id:a.id,blob:new Blob([bytes],{type:a.type||'audio/webm'})})}state=parsed.state;await put('kv',{key:'main',value:state});render();toast('Backup restored')}catch(e){toast('Restore failed: '+e.message)}}
function initEvents(){$('mobileLibraryBtn').onclick=()=>{const open=$('sidebar').classList.toggle('library-open');$('mobileLibraryBtn').setAttribute('aria-expanded',String(open))};$('newPlayBtn').onclick=createPlay;$('newSceneBtn').onclick=()=>createScene();$('emptyCreate').onclick=()=>createScene();$('renameSceneBtn').onclick=renameScene;$('deleteSceneBtn').onclick=deleteScene;$('addLineBtn').onclick=addLine;$('bottomAddBtn').onclick=addLine;$('closeModal').onclick=closeModal;$('modalBackdrop').onclick=e=>{if(e.target===$('modalBackdrop'))closeModal()};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modalBackdrop').hidden)closeModal()});$('startBtn').onclick=()=>runtime.running?togglePause():playScene();$('stopBtn').onclick=()=>stopPlayback();$('backBtn').onclick=()=>jump(-1);$('nextBtn').onclick=()=>jump(1);$('topBtn').onclick=()=>{scrollSuspendUntil=Date.now()+8000;window.scrollTo({top:0,behavior:'smooth'})};$('loopToggle').onchange=e=>{getScene().loop=e.target.checked;persist()};$('hideAllBtn').onclick=()=>{getScene().lines.forEach(l=>l.revealed=false);persist();renderTimeline()};$('showAllBtn').onclick=()=>{getScene().lines.forEach(l=>l.revealed=true);persist();renderTimeline()};$('settingsBtn').onclick=openSettings}
async function init(){if(!window.isSecureContext&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){setTimeout(()=>toast('For recording on Android, open LineRunner from an HTTPS address.'),1600)}try{db=await openDB();const saved=await get('kv','main');if(saved?.value?.scenes){state=saved.value;for(const s of state.scenes){s.cast=s.cast||[];s.lines=s.lines||[];s.mutedCharacters=s.mutedCharacters||[];for(const l of s.lines){if(l.extraOverride===undefined)l.extraOverride=(l.extra&&l.extra>0)?l.extra:null;if(l.pitchOverride===undefined)l.pitchOverride=null}}}}catch(e){toast('Local storage unavailable. Projects may not be saved.')}refreshVoices();fetch('./emoji-data.json').then(r=>r.ok?r.json():Promise.reject(Error('Emoji data missing'))).then(data=>emojiLibrary=data).catch(()=>{});if('speechSynthesis'in window)window.speechSynthesis.onvoiceschanged=refreshVoices;initEvents();render();if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});document.addEventListener('visibilitychange',()=>{if(document.hidden&&runtime.running&&!runtime.paused)togglePause()})}
init();
