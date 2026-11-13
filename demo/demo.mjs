import { forge, buildBrief, noticeText, escapeHtml } from './forge.mjs';
import { studySvg } from './study.mjs';
const $ = (selector) => document.querySelector(selector);
const [factions, notice] = await Promise.all(['factions.json','notice.json'].map(async (file) => { const response=await fetch(`${file}?v=__BUILD_VERSION__`);if(!response.ok)throw new Error(`Could not load ${file}`);return response.json(); }));
let faction=factions.find((f)=>f.id==='adeptus-arbites')??factions[0],design,strikes=0,mundane=false;
const groups=[...new Set(factions.map((f)=>f.group))];
const voice={
 'adeptus-arbites':{eyebrow:'THE LEX IMPERIALIS IS VAST. YOUR PATIENCE IS NOT.',title:'Set your legal<br>research <em>on trial.</em>',brand:'ADEPTUS ARBITES / JUDICIAL COGITATOR',decree:'IGNORANCE OF THE LAW IS NO DEFENCE. NEITHER IS HAVING A BAD SEARCH ENGINE.',familiar:'NOMONOMICON',job:'FORMER OWL. CURRENT INSTRUMENT OF PROCEDURAL DREAD.',quote:'“Your objection has been archived.<br>Your appeal has been pre-denied.”'},
 'orks':{eyebrow:'DA BIGGEST BOOK O’ DA BIGGEST RULEZ.',title:'Find da law.<br><em>Then krump it.</em>',brand:'DA BIG GREEN LEGAL KONTRAPSHUN',decree:'OBJEKSHUN! DAT CITATION AIN’T GOT ENUFF DAKKA.',familiar:'NOMO DA SKULL-GIT',job:'STOLEN FROM DA HUMIES. IMPROVED WIV MORE BOLTS.',quote:'“Dis precedent goes fasta<br>if ya paint it red.”'},
 'tau-empire':{eyebrow:'FOR THE GREATER GOOD OF YOUR RESEARCH.',title:'Superior law.<br><em>Superior firepower.</em>',brand:'T’AU / GREATER GOOD LEGAL INTERFACE',decree:'A WELL-RESEARCHED BRIEF IS A FORCE MULTIPLIER.',familiar:'N0-M0 / ARCHIVE DRONE',job:'LESS SUPERSTITION. MORE TARGETING SOLUTIONS.',quote:'“Your argument has been optimized.<br>Please remain statistically calm.”'},
 'drukhari':{eyebrow:'YOUR OPPONENT’S SUFFERING STARTS WITH A WELL-CITED MOTION.',title:'Make your case.<br><em>Exquisitely cruel.</em>',brand:'COMMORRAGH / THE COURT OF QUESTIONABLE MERCY',decree:'EVERY BILLABLE HOUR IS A BEAUTIFUL LITTLE ATROCITY.',familiar:'NOMORROW',job:'A RESEARCH FAMILIAR WITH ALARMINGLY SHARP MARGINALIA.',quote:'“We found your opponent’s weakness.<br>It was their entire argument.”'},
 'necrons':{eyebrow:'SIXTY MILLION YEARS OF PRECEDENT. STILL BETTER INDEXED.',title:'The law awakens.<br><em>Again.</em>',brand:'DYNASTIC ARCHIVE / ETERNAL LITIGATION ENGINE',decree:'YOUR STATUTE OF LIMITATIONS HAS BEEN DECLARED BIOLOGICAL NONSENSE.',familiar:'N0M0-TEKH',job:'IMMORTAL. IMPATIENT. STILL WAITING ON THE INDEX.',quote:'“I have considered your appeal<br>for sixty million years. Denied.”'},
 'adeptus-mechanicus':{eyebrow:'BLESS THE INDEX. ANOINT THE QUERY.',title:'Praise the law.<br><em>Feed the machine.</em>',brand:'ADEPTUS MECHANICUS / LITURGICAL SEARCH ENGINE',decree:'THE MACHINE SPIRIT REQUIRES A VALID CITATION AND A DROP OF SACRED OIL.',familiar:'NOMO-9000',job:'THE FLESH WAS WEAK. THE BOOLEAN OPERATORS ARE STRONG.',quote:'“01001100 01000001 01010111.<br>Translation: your motion is defective.”'},
 'primarch-vulkan':{eyebrow:'FORGED IN FIRE. TEMPERED BY PRECEDENT.',title:'A stronger brief.<br><em>Hammered by hand.</em>',brand:'SALAMANDERS / THE FORGE OF LEGAL AUTHORITY',decree:'PROTECT THE CITIZEN. INCINERATE THE BAD ARGUMENT.',familiar:'NOMO PYROCLAST',job:'WARM HEART. INDUSTRIAL-TEMPERATURE LAW BOOK.',quote:'“This brief needs more warmth.<br>And a substantially larger hammer.”'}
};
function fillOptions(query=''){
 const matches=factions.filter((f)=>`${f.name} ${f.primarch??''} ${f.legion??''}`.toLowerCase().includes(query.toLowerCase()));$('#faction').replaceChildren();
 if(!matches.length){const o=new Option('No matching allegiance','');o.disabled=true;$('#faction').add(o);return;}
 for(const group of groups){const members=matches.filter((f)=>f.group===group);if(!members.length)continue;const g=document.createElement('optgroup');g.label=group;for(const f of members){const o=new Option(f.name,f.id);o.selected=f.id===faction.id;g.append(o);}$('#faction').append(g);}
}
function setCopy(){
 $('#alternate-mascot').style.display=mundane?'none':'';const v=voice[faction.id]??{...voice['adeptus-arbites'],brand:`${faction.name.toUpperCase()} / CONSECRATED RESEARCH ENGINE`,decree:`BY DECREE OF ${faction.primarch?.toUpperCase()??faction.name.toUpperCase()}: YOUR CITATIONS SHALL BE MAGNIFICENT.`};
 $('#case-eyebrow').textContent=mundane?'U.S. CASE LAW AND STATUTE LEGAL RESEARCH':v.eyebrow;
 $('#case-title').innerHTML=mundane?'Set your legal<br>research <em>free.</em>':v.title;
 $('#case-lede').innerHTML=mundane?'Search public case law and statutes.<br>Free keyword search, with optional AI-assisted research.':'Ten million precedents. One merciless search engine.<br>For the citizen who would rather cite authority than become an example.';
 $('#example-brand').textContent=mundane?'U.S. CASE LAW AND STATUTE LEGAL RESEARCH':v.brand;
 $('#example-decree').textContent=mundane?'FREE U.S. CASE-LAW SEARCH — KEYWORD LOOKUP REQUIRES NO ACCOUNT':v.decree;
 $('.case-tld').textContent=mundane?'.ai':'.imperialis';
 $('#familiar-name').textContent=mundane?'Nomo':v.familiar;
 $('#familiar-job').textContent=mundane?'YOUR FRIENDLY AI LAW LIBRARIAN':v.job;
 $('#mascot-speak').innerHTML=mundane?'“I’m Nomo, your AI law librarian.<br>Let’s find the right case.”':v.quote;
 $('#search-label').textContent=mundane?'SEARCH CASE LAW':'PETITION THE ARCHIVES';
 $('#search-query').placeholder=mundane?'Search cases, citations, or legal questions…':'Enter a citation. Confess a legal question.';
 $('#search-submit').innerHTML=mundane?'Search ➜':'INVOKE<br>JUDGMENT ➜';
 $('#login').textContent=mundane?'Login':'Identify Thyself';
}
function reforge(){
 design=forge(faction);strikes++;
 for(const [k,v]of Object.entries(design.tokens))document.documentElement.style.setProperty(k,v);
 Object.assign(document.documentElement.dataset,{grimdark:faction.id,gdFrame:design.frame,gdOrnament:design.ornament,gdTexture:design.texture,gdLayout:design.layout});
 document.documentElement.style.setProperty('--servo-roll',`${(parseInt(design.seed.slice(0,2),16)%7)-3}deg`);
 $('#faction-description').textContent=faction.summary;
 $('#palette').replaceChildren(...['background','surface','accent','secondary','text'].map((key)=>{const el=document.createElement('span');el.style.backgroundColor=design.palette[key];el.title=`${key}: ${design.palette[key]}`;el.setAttribute('role','img');el.setAttribute('aria-label',el.title);return el;}));
 $('#variation-status').textContent=`ABOMINATION ${String(strikes).padStart(3,'0')} / ${faction.name.toUpperCase()}`;
 $('#seed-value').textContent=`RITUAL SEED ${design.seed.slice(0,12)}`;
 const alien=['ceramic','scrap','blades','monolith','chitin','wraithbone'].includes(design.ornament);$('#alternate-mascot').hidden=!alien;$('.servo-skull').hidden=alien;if(alien)$('#alternate-mascot').innerHTML=studySvg(faction,design,notice);$('.mascot-zone').setAttribute('aria-label',`${faction.name} parody research familiar`);setCopy();window.grimdarkify={design,faction,factions,strikes};
}
fillOptions();reforge();$('#faction-count').textContent=factions.length;
$('#faction-search').addEventListener('input',(e)=>fillOptions(e.target.value));
$('#faction').addEventListener('change',(e)=>{const f=factions.find((f)=>f.id===e.target.value);if(f){faction=f;reforge();}});
$('#reforge').addEventListener('click',()=>{reforge();$('#forge-message').textContent='Another perfectly reasonable interface has been lost to the art department.';});
for(const id of ['before','after'])$(`#${id}`).addEventListener('click',()=>{mundane=id==='before';$('#specimen').toggleAttribute('data-before',mundane);$('#before').setAttribute('aria-pressed',String(mundane));$('#after').setAttribute('aria-pressed',String(!mundane));setCopy();});
const samples=[
 {title:'Citizen v. Inconvenient Precedent',text:'The court finds that “I saw it on a forum” is not binding authority.',tag:'M41.026 · FICTIONAL PARODY RECORD · MOTION TO RECONSIDER REALITY'},
 {title:'In re: The Uncited Assertion',text:'A beautifully formatted argument is still required to have a source.',tag:'M41.019 · FICTIONAL PARODY RECORD · EVIDENTIARY PERSISTENCE'},
 {title:'Administratum v. Missing Form 27-B',text:'The filing was complete. Unfortunately, the filing of the complete filing was incomplete.',tag:'M41.008 · FICTIONAL PARODY RECORD · BUREAUCRATIC RECURSION'}
];
$('#case-search').addEventListener('submit',(e)=>{e.preventDefault();const query=$('#search-query').value.trim();if(!query)return;const result=$('#search-results');result.hidden=false;result.replaceChildren();const h=document.createElement('h4');h.textContent=`The archives have judged: “${query}”`;const p=document.createElement('p');p.textContent='FICTIONAL DEMO RESULTS · NOT REAL CASE LAW OR LEGAL ADVICE';result.append(h,p);for(const row of samples){const a=document.createElement('article');a.className='parody-result';const title=document.createElement('strong'),text=document.createElement('p'),tag=document.createElement('small');title.textContent=row.title;text.textContent=row.text;tag.textContent=row.tag;a.append(title,text,tag);result.append(a);}result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});});
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{for(const other of document.querySelectorAll('[data-view]'))other.classList.toggle('active',other===button);const mode=button.dataset.view;if(mode==='statutes')$('input[value="statutes"]').checked=true;else $('input[value="cases"]').checked=true;$('#search-label').textContent={cases:'PETITION THE CASE ARCHIVES',statutes:'CONSULT THE IMPERIAL EDICTS',citations:'PRESENT YOUR CITATION FOR INTERROGATION'}[mode];$('#search-query').focus();});
$('#login').addEventListener('click',()=>$('#identity-dialog').showModal());
const tips=['“Read the full opinion, citizen. A snippet is not a defence.”','“A citation without a source is merely decorative heresy.”','“Check the jurisdiction. The wrong tribunal is extremely wrong.”','“Your footnotes are insufficiently intimidating. Also, verify them.”'];let tip=0;
$('#mascot-speak').addEventListener('click',()=>{$('#mascot-speak').textContent=tips[tip++%tips.length];});
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=`${faction.id}-${design.seed.slice(0,8)}-${name}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export-css').addEventListener('click',async()=>{const css=await fetch('theme-standalone.css').then((r)=>r.text());const vars=Object.entries(design.tokens).map(([k,v])=>`  ${k}: ${v};`).join('\n');download('theme.css',`/* ${noticeText(notice).replaceAll('\n',' ')} */\n[data-grimdark] {\n${vars}\n}\n${css}`,'text/css');});
$('#export-tokens').addEventListener('click',()=>download('tokens.json',JSON.stringify({...design,notice},null,2),'application/json'));
$('#export-brief').addEventListener('click',()=>download('brief.md',buildBrief(faction,design,notice),'text/markdown'));
$('#export-svg').addEventListener('click',()=>download('crest.svg',studySvg(faction,design,notice),'image/svg+xml'));
$('#copy-command').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('git clone https://github.com/jimdawdy-hub/grimdarkify-anything.git\ncd grimdarkify-anything\nnode bin/grimdarkify.mjs kit --faction adeptus-arbites --out ./tribunal');$('#copy-command').textContent='Ritual copied';}catch{$('#copy-command').textContent='Select the ritual to copy';}});
