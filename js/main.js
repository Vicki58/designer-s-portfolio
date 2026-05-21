/**
 * Supabase Configuration
 * Replace these placeholders with your actual project details from the Supabase dashboard.
 */
const SB_URL='https://qpnhuomtgtyldutatpbg.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbmh1b210Z3R5bGR1dGF0cGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTEzMjQsImV4cCI6MjA5NDkyNzMyNH0.-u6U7adKC-OJu6PrqNM4Os2NXgg16FVFkOnHTlu_Tp8';
const BUCKET='portfolio-images';

const SBH={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
const COLORS={'Brand & Corporate Design':'#e8c547','Event & Promotional Design':'#c47b3a','Social & Lifestyle Events':'#7b9ec4','Creative & Concept Work':'#9c7bc4'};
const PASS_KEY='ian_admin_pass';
let curFile=null,profFile=null,activeFilter='All';

async function dbGet(t,q){const r=await fetch(SB_URL+'/rest/v1/'+t+(q||''),{headers:Object.assign({},SBH,{'Accept':'application/json'})});return r.json()}
async function dbPost(t,b){const r=await fetch(SB_URL+'/rest/v1/'+t,{method:'POST',headers:Object.assign({},SBH,{'Prefer':'return=representation'}),body:JSON.stringify(b)});return r.json()}
async function dbPatch(t,q,b){const r=await fetch(SB_URL+'/rest/v1/'+t+q,{method:'PATCH',headers:Object.assign({},SBH,{'Prefer':'return=representation'}),body:JSON.stringify(b)});return r.json()}
async function dbDel(t,q){await fetch(SB_URL+'/rest/v1/'+t+q,{method:'DELETE',headers:SBH})}
async function upload(file,path){
  const r=await fetch(SB_URL+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':file.type,'x-upsert':'true'},body:file});
  const d=await r.json();
  if(d.Key||d.path||d.fullPath)return SB_URL+'/storage/v1/object/public/'+BUCKET+'/'+path;
  throw new Error(d.error||'Upload failed');
}

function getPass(){return localStorage.getItem(PASS_KEY)||'admin123'}
function openAdmin(){document.getElementById('admin-overlay').classList.add('open');document.getElementById('admin-password').value='';document.getElementById('login-error').style.display='none'}
function closeAdmin(){document.getElementById('admin-overlay').classList.remove('open')}
function checkLogin(){
  if(document.getElementById('admin-password').value===getPass()){
    document.getElementById('login-screen').style.display='none';
    document.getElementById('admin-dashboard').style.display='block';
    loadAdminData();
  }else{document.getElementById('login-error').style.display='block';document.getElementById('admin-password').value=''}
}
function changePassword(){
  var np=document.getElementById('new-pass').value,cp=document.getElementById('confirm-pass').value;
  if(!np)return toast('Enter a new password',1);
  if(np!==cp)return toast('Passwords do not match',1);
  if(np.length<6)return toast('Minimum 6 characters',1);
  localStorage.setItem(PASS_KEY,np);document.getElementById('new-pass').value='';document.getElementById('confirm-pass').value='';toast('Password updated!');
}
function switchTab(tab){
  var tabs=['projects','profile','contact','settings'];
  document.querySelectorAll('.admin-tab').forEach(function(t,i){t.classList.toggle('active',tabs[i]===tab)});
  document.querySelectorAll('.admin-section').forEach(function(s){s.classList.remove('active')});
  document.getElementById('tab-'+tab).classList.add('active');
}

async function loadAdminData(){
  try{
    var pr=await dbGet('profile','?id=eq.1');var p=pr[0];
    if(p){['name','tagline','bio','about1','about2','skills','years','projs','clients'].forEach(function(k){var el=document.getElementById('p-'+k);if(el)el.value=p[k]||''});if(p.photo_url)document.getElementById('profile-photo-preview').innerHTML='<img src="'+p.photo_url+'" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-top:0.5rem">'}
    var cr=await dbGet('contact','?id=eq.1');var c=cr[0];
    if(c){['email','behance','instagram','linkedin'].forEach(function(k){var el=document.getElementById('c-'+k);if(el)el.value=c[k]||''})}
    await loadAdminProjects();
  }catch(e){toast('Error loading data',1)}
}
async function loadAdminProjects(){var p=await dbGet('projects','?order=created_at.desc');renderAdminProjects(p)}

function handleImageUpload(input){
  if(!input.files||!input.files[0])return;
  if(input.files[0].size>5242880)return toast('Image too large (max 5MB)',1);
  curFile=input.files[0];
  document.getElementById('new-img-preview').innerHTML='<div style="margin-top:0.8rem;border-radius:4px;overflow:hidden;height:140px"><img src="'+URL.createObjectURL(curFile)+'" style="width:100%;height:100%;object-fit:cover"></div>';
}
function handleProfilePhoto(input){
  if(!input.files||!input.files[0])return;
  profFile=input.files[0];
  document.getElementById('profile-photo-preview').innerHTML='<img src="'+URL.createObjectURL(profFile)+'" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-top:0.5rem">';
}

async function addProject(){
  var title=document.getElementById('proj-title').value.trim(),category=document.getElementById('proj-cat').value;
  if(!title)return toast('Please enter a project title',1);
  var btn=document.getElementById('add-proj-btn');btn.disabled=true;btn.textContent='Uploading...';
  try{
    var image_url=null;
    if(curFile){var path='projects/'+Date.now()+'_'+curFile.name.replace(/\s/g,'_');image_url=await upload(curFile,path)}
    await dbPost('projects',{title:title,category:category,image_url:image_url});
    document.getElementById('proj-title').value='';curFile=null;document.getElementById('new-img-preview').innerHTML='';document.getElementById('img-upload').value='';
    toast('Project added!');
    var projects=await dbGet('projects','?order=created_at.desc');renderAdminProjects(projects);renderPortfolio(projects);
  }catch(e){toast('Error: '+e.message,1)}
  btn.disabled=false;btn.textContent='Add Project';
}
async function deleteProject(id){
  if(!confirm('Remove this project?'))return;
  await dbDel('projects','?id=eq.'+id);toast('Project removed');
  var p=await dbGet('projects','?order=created_at.desc');renderAdminProjects(p);renderPortfolio(p);
}
function renderAdminProjects(projects){
  var el=document.getElementById('projects-admin-list');
  if(!projects||!projects.length){el.innerHTML='<p style="color:var(--muted);font-size:0.85rem;text-align:center;padding:1rem">No projects yet.</p>';return}
  el.innerHTML=projects.map(function(p){var col=COLORS[p.category]||'#888';return'<div class="project-item-admin">'+(p.image_url?'<img class="project-thumb" src="'+p.image_url+'">' :'<div class="project-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--muted);font-size:0.65rem">IMG</div>')+'<div class="project-info"><h4>'+p.title+'</h4><p><span class="dot" style="background:'+col+'"></span>'+p.category+'</p></div><div><button class="btn-sm danger" onclick="deleteProject(\''+p.id+'\')">Remove</button></div></div>'}).join('');
}
function filterPortfolio(cat,btn){
  activeFilter=cat;document.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');
  document.querySelectorAll('.portfolio-item').forEach(function(el){el.classList.toggle('hidden',cat!=='All'&&el.dataset.cat!==cat)});
}
function renderPortfolio(projects){
  var grid=document.getElementById('portfolio-grid');
  if(!projects||!projects.length){grid.innerHTML='<div class="empty-portfolio"><p>No projects yet.</p><button class="btn-primary" style="border:none" onclick="openAdmin()">Open Admin &rarr;</button></div>';return}
  grid.innerHTML=projects.map(function(p){var col=COLORS[p.category]||'#888';return'<div class="portfolio-item" data-cat="'+p.category+'" onclick="openLightbox(\''+p.image_url+'\')">'+(p.image_url?'<img src="'+p.image_url+'" alt="'+p.title+'" loading="lazy">':'<div class="portfolio-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style="font-size:0.8rem;opacity:0.5">No image</span></div>')+'<div class="portfolio-overlay"><h3>'+p.title+'</h3><p style="color:'+col+';font-size:0.8rem;letter-spacing:0.06em;text-transform:uppercase">'+p.category+'</p></div></div>'}).join('');
  if(activeFilter!=='All')document.querySelectorAll('.portfolio-item').forEach(function(el){el.classList.toggle('hidden',el.dataset.cat!==activeFilter)});
}

function openLightbox(url){
  if(!url||url==='null')return;
  var lb=document.getElementById('lightbox'),img=document.getElementById('lightbox-img');
  img.src=url;lb.classList.add('open');document.body.style.overflow='hidden';
}
function closeLightbox(){
  var lb=document.getElementById('lightbox');
  lb.classList.remove('open');document.body.style.overflow='auto';
}

async function saveProfile(){
  var btn=document.getElementById('save-profile-btn');btn.disabled=true;btn.textContent='Saving...';
  try{
    var photo_url=undefined;
    if(profFile){var path='profile/'+Date.now()+'_'+profFile.name.replace(/\s/g,'_');photo_url=await upload(profFile,path);profFile=null}
    var body={name:document.getElementById('p-name').value,tagline:document.getElementById('p-tagline').value,bio:document.getElementById('p-bio').value,about1:document.getElementById('p-about1').value,about2:document.getElementById('p-about2').value,skills:document.getElementById('p-skills').value,years:document.getElementById('p-years').value,projs:document.getElementById('p-projs').value,clients:document.getElementById('p-clients').value};
    if(photo_url)body.photo_url=photo_url;
    await dbPatch('profile','?id=eq.1',body);applyProfile(Object.assign({},body,{photo_url:photo_url}));toast('Profile saved!');
  }catch(e){toast('Error saving profile',1)}
  btn.disabled=false;btn.textContent='Save Profile';
}
function applyProfile(p){
  if(p.name){document.getElementById('nav-name').innerHTML=p.name+'<span>.</span>';document.getElementById('footer-name').textContent='\u00A9 2025 '+p.name+'. All rights reserved.'}
  if(p.tagline)document.getElementById('hero-title').innerHTML=p.tagline+'<em>Designer.</em>';
  if(p.bio)document.getElementById('hero-bio').textContent=p.bio;
  if(p.about1)document.getElementById('about-para1').textContent=p.about1;
  if(p.about2)document.getElementById('about-para2').textContent=p.about2;
  if(p.years)document.getElementById('stat-years').textContent=p.years;
  if(p.projs)document.getElementById('stat-projects').textContent=p.projs;
  if(p.clients)document.getElementById('stat-clients').textContent=p.clients;
  if(p.skills){var tags=p.skills.split(',').map(function(s){return s.trim()}).filter(Boolean);document.getElementById('skills-list').innerHTML=tags.map(function(t){return'<span class="skill-tag">'+t+'</span>'}).join('')}
  if(p.photo_url)document.getElementById('about-img-wrap').innerHTML='<img src="'+p.photo_url+'" style="width:100%;height:100%;object-fit:cover">';
}

async function saveContact(){
  var btn=document.getElementById('save-contact-btn');btn.disabled=true;btn.textContent='Saving...';
  try{
    var body={email:document.getElementById('c-email').value,behance:document.getElementById('c-behance').value,instagram:document.getElementById('c-instagram').value,linkedin:document.getElementById('c-linkedin').value};
    await dbPatch('contact','?id=eq.1',body);applyContact(body);toast('Contact info saved!');
  }catch(e){toast('Error saving contact',1)}
  btn.disabled=false;btn.textContent='Save Contact Info';
}
function applyContact(c){
  if(c.email){document.getElementById('contact-email').textContent='\u2709 '+c.email;document.getElementById('contact-email').href='mailto:'+c.email}
  if(c.behance)document.getElementById('contact-behance').href=c.behance;
  if(c.instagram)document.getElementById('contact-instagram').href='https://instagram.com/'+c.instagram.replace('@','');
  if(c.linkedin)document.getElementById('contact-linkedin').href=c.linkedin;
}

async function clearAllProjects(){
  if(!confirm('Delete ALL projects permanently? This cannot be undone.'))return;
  await dbDel('projects','?id=neq.00000000-0000-0000-0000-000000000000');
  toast('All projects deleted');renderPortfolio([]);renderAdminProjects([]);
}

function toast(msg,isErr){
  var t=document.getElementById('toast');t.textContent=msg;
  t.className='toast'+(isErr?' error':'');t.classList.add('show');
  setTimeout(function(){t.classList.remove('show')},2800);
}

document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'})}})});
document.getElementById('admin-overlay').addEventListener('click',function(e){if(e.target===document.getElementById('admin-overlay'))closeAdmin()});

(async function init(){
  try{
    var pr=await dbGet('profile','?id=eq.1');if(pr[0])applyProfile(pr[0]);
    var cr=await dbGet('contact','?id=eq.1');if(cr[0])applyContact(cr[0]);
    var projects=await dbGet('projects','?order=created_at.desc');renderPortfolio(projects);
  }catch(e){document.getElementById('portfolio-grid').innerHTML='<div class="empty-portfolio"><p>Could not load projects.</p></div>'}
})();
