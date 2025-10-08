/* ===== Configuration & categories (Point 6: Nouvelles activités) ===== */
const ADMIN_EMAIL = "benjamin.vitre@gmail.com";

const ACTIVITIES = {
  "Toutes": [], // Nouvelle activité de filtrage
  "Jeux": ["Jeux de cartes", "Jeux vidéo"],
  "Culture": [],
  "Restaurant / Bar": [],
  "Sport": [],
  "Sorties": []
};

const SUBSUB = {
  "Jeux de cartes": ["Magic The Gathering", "Pokémon", "Yu-Gi-Oh!"],
  "Jeux vidéo": []
};

// Mappage des couleurs pour les boîtes d'activité/sous-activité
const COLOR_MAP = {
  "Magic The Gathering": "#b294f2", "Pokémon": "#f6d06f", "Yu-Gi-Oh!": "#f1a66a",
  "Jeux de cartes": "#c085f5", "Jeux vidéo": "#6fb2f2", "Jeux": "#c085f5",
  "Culture": "#e67c73", "Restaurant / Bar": "#78d6a4", "Sport": "#f27a7d", 
  "Sorties": "#f1a66a", "Toutes": "#9aa9bf"
};

const MAX_PARTICIPANTS = 10;
let currentFilterActivity = "Toutes"; // Pour le point 5

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

// Helper pour formater la date en mots (e.g., 10 Octobre)
function formatDateToWords(dateString){
  const date = new Date(dateString + 'T00:00:00'); // Assuming date is YYYY-MM-DD
  if (isNaN(date)) return dateString;
  const options = { day: 'numeric', month: 'long' };
  return date.toLocaleDateString('fr-FR', options);
}

/* Ajout d'une fonction pour mettre à jour un slot */
function updateSlot(slotId, updateFn){
  let slots = getSlots();
  const index = slots.findIndex(s => s.id === slotId);
  if (index !== -1){
    slots[index] = updateFn(slots[index]);
    saveSlots(slots);
    if (typeof loadSlots === 'function') loadSlots(); // Re-render the list if available
  }
}

/**
 * Fonction pour gérer l'ouverture du formulaire de modification.
 * Nécessite que le formulaire existe dans profile.html
 */
function editSlot(slotId) {
  const slot = getSlots().find(s => s.id === slotId);
  if (!slot) return alert("Créneau non trouvé.");

  const editForm = document.getElementById('edit-slot-form');
  if (!editForm) return; 

  // Populate the form fields
  document.getElementById('edit-slot-id').value = slot.id;
  document.getElementById('edit-slot-name').value = slot.name;
  document.getElementById('edit-slot-location').value = slot.location;
  document.getElementById('edit-slot-date').value = slot.date;
  document.getElementById('edit-slot-time').value = slot.time;
  document.getElementById('edit-private-slot').checked = slot.private;

  // Populate activity selects for editing
  const editActSelect = document.getElementById('edit-activity-select');
  const editSubSelect = document.getElementById('edit-sub-select');
  const editSubSubSelect = document.getElementById('edit-subsub-select');

  // Populate main activity select
  editActSelect.innerHTML = '<option value="">-- Choisis une activité --</option>';
  Object.keys(ACTIVITIES).filter(a=>a!=='Toutes').forEach(act => {
    const o = document.createElement('option'); o.value = act; o.textContent = act; editActSelect.appendChild(o);
  });
  editActSelect.value = slot.activity;

  // Populate sub-activity select
  populateEditSubActivities(slot.activity, slot.sub);
  
  // Populate sub-sub-activity select
  populateEditSubSub(slot.sub, slot.subsub);

  // Show the edit form
  document.getElementById('edit-slot-container').style.display = 'block';
  window.scrollTo(0, 0); // Scroll to top to see the form
}

// Helper pour peupler les sous-activités du formulaire d'édition
function populateEditSubActivities(act, selectedSub = '') {
  const editSubSelect = document.getElementById('edit-sub-select');
  editSubSelect.innerHTML = '<option value="">-- Choisis une sous-activité --</option>';
  (ACTIVITIES[act]||[]).forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s; editSubSelect.appendChild(o);
  });
  editSubSelect.value = selectedSub;
}

// Helper pour peupler les sous-sous-activités du formulaire d'édition
function populateEditSubSub(sub, selectedSubSub = '') {
  const editSubSubSelect = document.getElementById('edit-subsub-select');
  editSubSubSelect.innerHTML = '<option value="">-- Optionnel --</option>';
  (SUBSUB[sub]||[]).forEach(ss=>{
    const o = document.createElement('option'); o.value = ss; o.textContent = ss; editSubSubSelect.appendChild(o);
  });
  editSubSubSelect.value = selectedSubSub;
}


/* ===== DOM behavior (Index) ===== */
document.addEventListener('DOMContentLoaded', () => {
  const signupBtn = document.getElementById('signup'), loginBtn = document.getElementById('login');
  const logoutBtn = document.getElementById('logout'), toggleCreate = document.getElementById('toggle-create-form');
  const createForm = document.getElementById('create-slot-form'), arrow = document.querySelector('.arrow');
  const activitiesDiv = document.getElementById('activities'), subDiv = document.getElementById('subactivities');
  const currentActivityEl = document.getElementById('current-activity');
  const subSelect = document.getElementById('sub-select'), subsubSelect = document.getElementById('subsub-select');
  const formActivitySelect = document.getElementById('form-activity-select');
  const formSubSelect = document.getElementById('sub-select');

  const createBtn = document.getElementById('create-slot');
  let selectedActivity = null; // Activity selected in the main section

  let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  // Populate form activity select on load
  function populateFormActivitySelect(){
    if (!formActivitySelect) return;
    formActivitySelect.innerHTML = '<option value="">-- Choisis une activité --</option>';
    // Exclure 'Toutes' du formulaire de création
    Object.keys(ACTIVITIES).filter(a=>a!=='Toutes').forEach(act => {
      const o = document.createElement('option'); o.value = act; o.textContent = act; formActivitySelect.appendChild(o);
    });
    formActivitySelect.value = selectedActivity || '';
    populateSubActivitiesForForm(formActivitySelect.value);
  }

  // Initial render activity buttons (Point 5 & 6)
  function renderActivities(){
    activitiesDiv.innerHTML = '';
    Object.keys(ACTIVITIES).forEach(act => {
      const b = document.createElement('button');
      const classNameMap = {
        "Jeux": 'act-jeux', "Culture": 'act-culture', "Restaurant / Bar": 'act-restaurant', "Sport": 'act-sport', "Sorties": 'act-sorties', "Toutes": 'act-toutes'
      };
      b.className = 'activity-btn ' + classNameMap[act] + (act === currentFilterActivity ? ' active' : '');
      b.textContent = act;

      b.addEventListener('click', ()=> {
        // Point 5: Filtrage des créneaux
        currentFilterActivity = act;
        loadSlots(); // Charger les slots filtrés

        // Mise à jour des classes 'active'
        document.querySelectorAll('.activity-btn').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');

        // Gestion de la sélection pour la création de créneau
        if(act !== "Toutes") {
          selectedActivity = act;
          currentActivityEl.textContent = act;
          populateSubActivities(act);
          if (formActivitySelect) { 
            formActivitySelect.value = act; 
            populateSubActivitiesForForm(act); 
          }
        } else {
          selectedActivity = null;
          currentActivityEl.textContent = 'Aucune';
          subDiv.innerHTML = '';
        }
      });
      activitiesDiv.appendChild(b);
    });
    populateFormActivitySelect();
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
        formSubSelect.value = s;
        populateSubSub(s);
      });
      subDiv.appendChild(btn);
    });
  }

  // populate sub-select dropdown based on activity
  function populateSubActivitiesForForm(act){
    formSubSelect.innerHTML = '<option value="">-- Choisis une sous-activité --</option>';
    (ACTIVITIES[act]||[]).forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s; formSubSelect.appendChild(o);
    });
    populateSubSub(formSubSelect.value);
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
    window.location.href = 'index.html'; // Redirect to clear state
  });

  // toggle create form
  if (toggleCreate && createForm) toggleCreate.addEventListener('click', ()=> {
    const visible = createForm.style.display === 'block';
    createForm.style.display = visible ? 'none' : 'block';
    arrow.style.transform = visible ? 'rotate(0deg)' : 'rotate(90deg)';
    // when opening populate form selects
    if (!visible) {
      populateFormActivitySelect();
      formActivitySelect.value = selectedActivity || '';
      populateSubActivitiesForForm(formActivitySelect.value);
    }
  });

  // keep selects in sync when user chooses activity select manually
  if (formActivitySelect) formActivitySelect.addEventListener('change', ()=>{
    selectedActivity = formActivitySelect.value;
    currentActivityEl.textContent = selectedActivity || 'Aucune';
    populateSubActivitiesForForm(selectedActivity);
  });

  // keep selects in sync when user chooses sub-select manually
  formSubSelect.addEventListener('change', ()=> populateSubSub(formSubSelect.value));

  // create slot
  if (createBtn) createBtn.addEventListener('click', ()=> {
    if (!currentUser) return alert('Connecte-toi d’abord');
    
    // Get activity from either button choice or select in form
    const activity = selectedActivity || formActivitySelect.value;
    const sub = formSubSelect.value || '';
    const subsub = subsubSelect.value || '';
    const name = (document.getElementById('slot-name')?.value||'').trim();
    const location = (document.getElementById('slot-location')?.value||'').trim();
    const date = (document.getElementById('slot-date')?.value||'').trim();
    const time = (document.getElementById('slot-time')?.value||'').trim();
    const isPrivate = !!document.getElementById('private-slot')?.checked;
    
    if (!activity) return alert('Choisis d’abord une activité (ex: Jeux)');
    if (!name || !location || !date || !time) return alert('Remplis les champs nom, lieu, date et heure');
    
    const slots = getSlots();
    const newSlot = {
      id: Date.now(),
      activity,
      sub: sub || '',
      subsub: subsub || '',
      name, location, date, time, private: isPrivate,
      owner: currentUser.email, 
      ownerPseudo: currentUser.pseudo || '',
      participants: [{email: currentUser.email, pseudo: currentUser.pseudo || currentUser.email.split('@')[0]}]
    };
    slots.push(newSlot); saveSlots(slots);
    
    // clear form
    document.getElementById('slot-name').value=''; document.getElementById('slot-location').value=''; document.getElementById('slot-date').value=''; document.getElementById('slot-time').value='';
    formSubSelect.value=''; subsubSelect.value=''; formActivitySelect.value=''; selectedActivity = null; currentActivityEl.textContent='Aucune'; createForm.style.display='none'; if (arrow) arrow.style.transform='rotate(0deg)';
    loadSlots();
  });

  // Load and render slots (Point 3 & 5)
  function loadSlots(){
    const list = document.getElementById('slots-list'); if (!list) return; list.innerHTML='';
    let slots = getSlots() || [];
    
    // Point 5: Filtrage
    if (currentFilterActivity !== "Toutes") {
      slots = slots.filter(s => s.activity === currentFilterActivity);
    }

    // sort by date+time
    slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    // limit 10
    slots = slots.slice(0,10);

    
    const current = JSON.parse(localStorage.getItem('currentUser')||'null');
    const currentUserEmail = current ? current.email : null;
    const currentUserPseudo = current ? current.pseudo || currentUserEmail.split('@')[0] : '';
    
    slots.forEach(slot => {
      const li = document.createElement('li'); li.className='slot-item';
      const info = document.createElement('div'); info.className='slot-info';

      // Point 3: Affichage des boîtes de sous-activité/sous-sous-activité
      const activityLine = document.createElement('div'); activityLine.className = 'subsub-line';

      // 1. Activité principale
      let actPill = document.createElement('span'); 
      actPill.className = 'subsub-box';
      actPill.textContent = slot.activity;
      actPill.style.border = `1px solid ${COLOR_MAP[slot.activity] || '#9aa9bf'}`; 
      actPill.style.color = COLOR_MAP[slot.activity] || '#9aa9bf';
      activityLine.appendChild(actPill);

      // 2. Sous-activité
      if (slot.sub) {
        let subPill = document.createElement('span'); 
        subPill.className = 'subsub-box';
        subPill.textContent = slot.sub;
        subPill.style.border = `1px solid ${COLOR_MAP[slot.sub] || '#9aa9bf'}`; 
        subPill.style.color = COLOR_MAP[slot.sub] || '#9aa9bf';
        activityLine.appendChild(subPill);
      }

      // 3. Sous-sous-activité
      if (slot.subsub) {
        let subsubPill = document.createElement('span'); 
        subsubPill.className = 'subsub-box';
        subsubPill.textContent = slot.subsub;
        subsubPill.style.border = `1px solid ${COLOR_MAP[slot.subsub] || '#9aa9bf'}`; 
        subsubPill.style.color = COLOR_MAP[slot.subsub] || '#9aa9bf';
        activityLine.appendChild(subsubPill);
      }

      info.appendChild(activityLine);


      const title = document.createElement('strong'); title.textContent = slot.name;
      
      // Format de date avec des lettres pour le mois
      const formattedDate = formatDateToWords(slot.date);
      const when = document.createElement('div'); when.textContent = `📍 ${slot.location} — 🗓️ ${formattedDate} à ${slot.time}`;
      
      const owner = document.createElement('small'); 
      owner.textContent = `par ${slot.ownerPseudo || slot.owner}`;
      if (slot.private) owner.innerHTML += ' <span class="private-slot-lock">🔒 Privé</span>';

      // info.appendChild(pill); // Remplacé par activityLine
      info.appendChild(title); info.appendChild(when); 
      
      // Participants and Gauge
      const participantsCount = (slot.participants || []).length;
      const participantsBox = document.createElement('div'); participantsBox.className = 'participants-box';
      participantsBox.innerHTML = `👤 ${participantsCount} personnes`;

      const gaugeBar = document.createElement('div'); gaugeBar.className = 'gauge-bar';
      const gaugeFill = document.createElement('div'); gaugeFill.className = 'gauge-fill';
      const fillPercent = Math.min(100, (participantsCount / MAX_PARTICIPANTS) * 100);
      gaugeFill.style.width = `${fillPercent}%`;
      gaugeBar.appendChild(gaugeFill);
      participantsBox.appendChild(gaugeBar);
      
      info.appendChild(participantsBox);
      
      // Liste des participants (cachée si privée)
      const participantsList = document.createElement('div'); participantsList.className = 'participants-list';
      if (slot.private && slot.owner !== currentUserEmail){
        participantsList.textContent = 'Participants cachés.';
      } else {
        const pseudos = (slot.participants || []).map(p => p.pseudo || p.email.split('@')[0]);
        participantsList.textContent = 'Membres: ' + pseudos.join(', ');
      }
      info.appendChild(participantsList);
      
      info.appendChild(owner); // Owner at the bottom

      const actions = document.createElement('div'); actions.className='actions';
      
      const isParticipant = (slot.participants || []).some(p => p.email === currentUserEmail);
      const isOwner = slot.owner === currentUserEmail;

      // Bouton Rejoindre
      if (current && !isParticipant){
        const joinBtn = document.createElement('button');
        joinBtn.className = 'ghost-btn';
        joinBtn.textContent = '✅ Rejoindre';
        
        // Logique de rejoindre: public OU invité (via owner check pour la simu d'invitation)
        if (!slot.private || isOwner){ // Si public OU invité (via owner check pour la simu d'invitation)
          joinBtn.onclick = ()=> {
            if (participantsCount >= MAX_PARTICIPANTS) return alert('Désolé, ce créneau est complet.');
            
            updateSlot(slot.id, s => {
              s.participants = s.participants || []; // Ensure participants array exists
              s.participants.push({ email: currentUserEmail, pseudo: currentUserPseudo });
              return s;
            });
          };
          actions.appendChild(joinBtn);
        } else {
          // Slot privé et utilisateur non invité/propriétaire
          joinBtn.textContent = '🔒 Privé';
          joinBtn.disabled = true;
          actions.appendChild(joinBtn);
        }
      } else if (isParticipant && !isOwner) {
        // Bouton Quitter
        const leaveBtn = document.createElement('button');
        leaveBtn.className = 'ghost-btn';
        leaveBtn.textContent = '❌ Quitter';
        leaveBtn.onclick = ()=> {
          updateSlot(slot.id, s => {
            s.participants = s.participants.filter(p => p.email !== currentUserEmail);
            return s;
          });
        };
        actions.appendChild(leaveBtn);
      }

      // delete & reminder if owner
      if (isOwner){
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
    const formattedDate = formatDateToWords(s.date);
    alert(`Créneau partagé :\n${s.name}\n${s.activity} ${s.sub ? ' - '+s.sub : ''} ${s.subsub ? ' - '+s.subsub : ''}\n📍 ${s.location}\n🕒 ${formattedDate} ${s.time}\npar ${s.ownerPseudo || s.owner}`);
  })();
});
