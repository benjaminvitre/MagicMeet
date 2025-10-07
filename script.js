/* ===== Configuration & categories ===== */
const ADMIN_EMAIL = "benjamin.vitre@gmail.com";

const ACTIVITIES = {
  "Games": ["Card Games","Video Games"],
  "Cinema": [],
  "Restaurant / Bar": [],
  "Sport": []
};

const SUBSUB = {
  "Card Games": ["Magic The Gathering","Pokémon","Yu-Gi-Oh!"],
  "Video Games": []
};

/* ===== storage helpers robust (tries encrypted then plain JSON) ===== */
function encrypt(data) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
  catch(e){ return btoa(JSON.stringify(data)); }
}
function decrypt(str) {
  if (!str) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
  catch(e){
    try { return JSON.parse(atob(str)); } catch(e2){
      try { return JSON.parse(str); } catch(e3){ return null; }
    }
  }
}
function getUsers(){
  const s = localStorage.getItem('users'); if (!s) return [];
  const v = decrypt(s); return Array.isArray(v) ? v : [];
}
function saveUsers(u){ localStorage.setItem('users', encrypt(u || [])); }
function getSlots(){
  const s = localStorage.getItem('slots'); if (!s) return [];
  const v = decrypt(s); return Array.isArray(v) ? v : [];
}
function saveSlots(s){ localStorage.setItem('slots', encrypt(s || [])); }

/* hash password */
async function hashPassword(pwd){
  const enc = new TextEncoder(); const data = enc.encode(pwd);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ===== DOM behavior ===== */
document.addEventListener('DOMContentLoaded', () => {
  const signupBtn = document.getElementById('signup'), loginBtn = document.getElementById('login');
  const logoutBtn = document.getElementById('logout'), toggleCreate = document.getElementById('toggle-create-form');
  const createForm = document.getElementById('create-slot-form'), arrow = document.querySelector('.arrow');
  const activitiesDiv = document.getElementById('activities'), subDiv = document.getElementById('subactivities');
  const currentActivityEl = document.getElementById('current-activity');
  const subSelect = document.getElementById('sub-select'), subsubSelect = document.getElementById('subsub-select');
  const createBtn = document.getElementById('create-slot');
  let selectedActivity = null;

  let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  // render activity buttons
  function renderActivities(){
    activitiesDiv.innerHTML = '';
    Object.keys(ACTIVITIES).forEach(act => {
      const b = document.createElement('button');
      b.className = 'activity-btn ' + (act==='Games' ? 'act-games' : act==='Cinema' ? 'act-cinema' : act==='Restaurant / Bar' ? 'act-restaurant' : 'act-sport');
      b.textContent = (act==='Games' ? '🎮 ' : act==='Cinema' ? '🎬 ' : act==='Restaurant / Bar' ? '🍸 ' : '⚽ ') + act;
      b.addEventListener('click', ()=> {
        selectedActivity = act;
        currentActivityEl.textContent = act;
        populateSubActivities(act);
      });
      activitiesDiv.appendChild(b);
    });
  }

  // populate subactivities area (visual buttons)
  function populateSubActivities(act){
    subDiv.innerHTML = '';
    const subs = ACTIVITIES[act] || [];
    subs.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'activity-btn';
      btn.textContent = s;
      btn.addEventListener('click', ()=> {
        subSelect.value = s;
        populateSubSub(s);
      });
      subDiv.appendChild(btn);
    });
  }

  // populate sub-select dropdown based on activity
  function populateSubActivitiesForForm(act){
    subSelect.innerHTML = '<option value="">-- Choisis une sous-activité --</option>';
    (ACTIVITIES[act]||[]).forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s; subSelect.appendChild(o);
    });
    // if none, keep it with single option and let user skip
  }

  // populate sub-sub (if any)
  function populateSubSub(sub){
    subsubSelect.innerHTML = '<option value="">-- Optionnel --</option>';
    (SUBSUB[sub]||[]).forEach(ss=>{
      const o = document.createElement('option'); o.value = ss; o.textContent = ss; subsubSelect.appendChild(o);
    });
  }

  // initial render
  renderActivities();

  // show main if logged
  function showMain(){
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    renderActivities();
    loadSlots();
    fillProfileOnMain();
  }

  function fillProfileOnMain(){
    const cur = JSON.parse(localStorage.getItem('currentUser')||'null');
    if (!cur) return;
    const editPseudo = document.getElementById('edit-pseudo');
    const editEmail = document.getElementById('edit-email');
    const editPhone = document.getElementById('edit-phone');
    if (editPseudo) editPseudo.value = cur.pseudo||'';
    if (editEmail) editEmail.value = cur.email||'';
    if (editPhone) editPhone.value = cur.phone||'';
  }

  // signup/login handlers
  if (signupBtn) signupBtn.addEventListener('click', async ()=>{
    const email = (document.getElementById('email')?.value||'').trim();
    const password = (document.getElementById('password')?.value||'').trim();
    if (!email || !password) return alert('Remplis tous les champs.');
    const users = getUsers();
    if (users.find(u=>u.email===email)) return alert('Utilisateur existant');
    const hashed = await hashPassword(password);
    const newUser = { email, password: hashed, pseudo:'', phone:'' };
    users.push(newUser); saveUsers(users);
    localStorage.setItem('currentUser', JSON.stringify(newUser)); currentUser = newUser;
    showMain();
  });

  if (loginBtn) loginBtn.addEventListener('click', async ()=>{
    const email = (document.getElementById('email')?.value||'').trim();
    const password = (document.getElementById('password')?.value||'').trim();
    if (!email || !password) return alert('Remplis tous les champs.');
    const hashed = await hashPassword(password);
    const user = getUsers().find(u=>u.email===email && u.password===hashed);
    if (!user) return alert('Identifiants invalides');
    localStorage.setItem('currentUser', JSON.stringify(user)); currentUser = user; showMain();
  });

  // logout
  if (logoutBtn) logoutBtn.addEventListener('click', ()=> {
    localStorage.removeItem('currentUser'); currentUser = null;
    document.getElementById('auth-section').style.display = 'block'; document.getElementById('main-section').style.display='none';
  });

  // toggle create form
  if (toggleCreate && createForm) toggleCreate.addEventListener('click', ()=> {
    const visible = createForm.style.display === 'block';
    createForm.style.display = visible ? 'none' : 'block';
    arrow.style.transform = visible ? 'rotate(0deg)' : 'rotate(90deg)';
    // when opening populate form selects
    if (!visible && selectedActivity) populateSubActivitiesForForm(selectedActivity);
  });

  // keep selects in sync when user chooses sub-select manually
  subSelect.addEventListener('change', ()=> populateSubSub(subSelect.value));

  // create slot
  if (createBtn) createBtn.addEventListener('click', ()=> {
    if (!currentUser) return alert('Connecte-toi d’abord');
    const activity = selectedActivity;
    const sub = subSelect.value || '';
    const subsub = subsubSelect.value || '';
    const name = (document.getElementById('slot-name')?.value||'').trim();
    const location = (document.getElementById('slot-location')?.value||'').trim();
    const date = (document.getElementById('slot-date')?.value||'').trim();
    const time = (document.getElementById('slot-time')?.value||'').trim();
    const isPrivate = !!document.getElementById('private-slot')?.checked;
    if (!activity) return alert('Choisis d’abord une activité (ex: Games)');
    if (!name || !location || !date || !time) return alert('Remplis les champs nom, lieu, date et heure');
    const slots = getSlots();
    const newSlot = {
      id: Date.now(),
      activity,
      sub: sub || '',
      subsub: subsub || '',
      name, location, date, time, private: isPrivate,
      owner: currentUser.email, ownerPseudo: currentUser.pseudo || ''
    };
    slots.push(newSlot); saveSlots(slots);
    // clear form
    document.getElementById('slot-name').value=''; document.getElementById('slot-location').value=''; document.getElementById('slot-date').value=''; document.getElementById('slot-time').value='';
    subSelect.value=''; subsubSelect.value=''; selectedActivity = null; currentActivityEl.textContent='Aucune'; createForm.style.display='none'; if (arrow) arrow.style.transform='rotate(0deg)';
    loadSlots();
  });

  // loadSlots rendering (sorted by nearest date/time, limit 10)
  function loadSlots(){
    const list = document.getElementById('slots-list'); if (!list) return; list.innerHTML='';
    let slots = getSlots() || [];
    // try to preserve older unencrypted slots if present (getSlots already does)
    // sort by date+time
    slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    // limit 10
    slots = slots.slice(0,10);

    const colorMap = {
      "Magic The Gathering":"#b294f2","Pokémon":"#f6d06f","Yu-Gi-Oh!":"#f1a66a",
      "Card Games":"#c085f5","Video Games":"#6fb2f2","Cinema":"#e67c73",
      "Restaurant / Bar":"#78d6a4","Sport":"#f27a7d"
    };

    slots.forEach(slot => {
      const li = document.createElement('li'); li.className='slot-item';
      const info = document.createElement('div'); info.className='slot-info';

      const pill = document.createElement('span'); pill.className='subsub-box';
      const pillText = slot.subsub || slot.sub || slot.activity || '';
      const color = colorMap[pillText] || '#9aa9bf';
      pill.textContent = pillText || slot.activity;
      pill.style.border = `1px solid ${color}`; pill.style.color = color;

      const title = document.createElement('strong'); title.textContent = slot.name;
      const when = document.createElement('div'); when.textContent = `📍 ${slot.location} — 🗓️ ${slot.date} à ${slot.time}`;
      const owner = document.createElement('small'); owner.textContent = `par ${slot.ownerPseudo || slot.owner}`;

      info.appendChild(pill); info.appendChild(title); info.appendChild(when); info.appendChild(owner);

      const actions = document.createElement('div'); actions.className='actions';

      // delete & reminder if owner
      const current = JSON.parse(localStorage.getItem('currentUser')||'null');
      if (current && slot.owner === current.email){
        const del = document.createElement('button'); del.textContent='🗑️'; del.title='Supprimer';
        del.onclick = ()=> { if (!confirm('Supprimer ce créneau ?')) return; const remain = getSlots().filter(s=>s.id!==slot.id); saveSlots(remain); loadSlots(); };
        actions.appendChild(del);

        const rem = document.createElement('button'); rem.textContent='⏰'; rem.title='Rappel';
        rem.onclick = ()=> {
          const notifTime = new Date(slot.date + 'T' + slot.time); const delay = notifTime - new Date();
          if (delay>0){ alert('Rappel programmé (simple notification navigateur)'); setTimeout(()=>{ if (Notification.permission==='granted') new Notification(`Rappel : ${slot.name}`); else alert(`Rappel : ${slot.name}`); }, delay); }
          else alert('Ce créneau est déjà passé.');
        };
        actions.appendChild(rem);
      }

      const share = document.createElement('button'); share.textContent='🔗'; share.title='Partager';
      share.onclick = ()=> { const link = `${window.location.origin}${window.location.pathname}?slot=${slot.id}`; navigator.clipboard.writeText(link).then(()=>alert('Lien copié !')); };
      actions.appendChild(share);

      li.appendChild(info); li.appendChild(actions);
      list.appendChild(li);
    });
  }

  // If already logged, show main
  if (currentUser) showMain();

  // handle shared slot in URL
  (function checkShared(){
    const params = new URLSearchParams(window.location.search); const sid = params.get('slot');
    if (!sid) return;
    const s = getSlots().find(x=>String(x.id)===sid);
    if (!s) return alert('Ce créneau n’existe plus.');
    if (s.private) return alert('🔒 Ce créneau est privé : détails cachés.');
    alert(`Créneau partagé :\n${s.name}\n${s.activity} ${s.sub ? ' - '+s.sub : ''} ${s.subsub ? ' - '+s.subsub : ''}\n📍 ${s.location}\n🕒 ${s.date} ${s.time}\npar ${s.ownerPseudo || s.owner}`);
  })();
});
