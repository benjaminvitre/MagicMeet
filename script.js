/* ===== Configuration & categories (Mise à jour V4) ===== */
const ADMIN_EMAIL = "benjamin.vitre@gmail.com";

// Triez les sous-activités
const sortArray = (arr) => arr.sort((a, b) => a.localeCompare(b, 'fr'));

const ACTIVITIES = {
  "Toutes": [],
  "Autres": [], // Point 1: Nouvelle activité "Autres" (remplace Restaurant / Bar)
  "Culture": sortArray(["Cinéma", "Théâtre", "Exposition", "Concert"]), // Point 6
  "Jeux": sortArray(["Jeux de cartes", "Jeux vidéo", "Jeux de société"]), // Point 2
  "Sorties": sortArray(["Bar", "Restaurant", "Picnic"]), // Point 7
  "Sport": sortArray(["Foot", "Padel", "Tennis", "Running", "Badminton"]) // Point 3
};

// Trie le dictionnaire principal par clé (activité), en gardant 'Toutes' en premier
const sortedActivityKeys = Object.keys(ACTIVITIES).filter(key => key !== "Toutes").sort((a, b) => a.localeCompare(b, 'fr'));
const tempActivities = { "Toutes": ACTIVITIES["Toutes"] };
sortedActivityKeys.forEach(key => tempActivities[key] = ACTIVITIES[key]);
Object.assign(ACTIVITIES, tempActivities); // Remplace ACTIVITIES par la version triée

// Ajout des emojis (Point 3)
const ACTIVITY_EMOJIS = {
    "Toutes": "🌍",
    "Autres": "❓",
    "Culture": "🖼️",
    "Jeux": "🎮",
    "Sorties": "🎉",
    "Sport": "⚽"
};

// Sous-sous-activités (pas de changement dans cette itération, mais on s'assure que les sous-activités liées à l'ancienne caté ne plantent pas)
const SUBSUB = {
  "Jeux de cartes": ["Magic The Gathering", "Pokémon", "Yu-Gi-Oh!"],
  "Jeux vidéo": [],
  "Jeux de société": []
};
// On trie aussi les sous-sous-activités pour être cohérent
Object.keys(SUBSUB).forEach(key => {
  if (SUBSUB[key].length > 0) {
    SUBSUB[key] = sortArray(SUBSUB[key]);
  }
});


// Mappage des couleurs pour les boîtes d'activité/sous-activité
const COLOR_MAP = {
  "Autres": "#78d6a4", 
  "Jeux": "#c085f5", 
  "Culture": "#e67c73", 
  "Sport": "#f27a7d", 
  "Sorties": "#f1a66a", 
  "Toutes": "#9aa9bf",
  
  // Couleurs pour les sous-activités (nouvelles et anciennes)
  "Jeux de cartes": "#c085f5", "Jeux vidéo": "#6fb2f2", "Jeux de société": "#64e3be",
  "Cinéma": "#e67c73", "Théâtre": "#cc5a4f", "Exposition": "#e39791", "Concert": "#f1b6b3",
  "Foot": "#f27a7d", "Padel": "#cc5a5e", "Tennis": "#e39799", "Running": "#f1b6b7", "Badminton": "#78d6a4",
  "Bar": "#f1a66a", "Restaurant": "#d68e4a", "Picnic": "#f5c399",
  
  // Couleurs des sous-sous-activités
  "Magic The Gathering": "#b294f2", "Pokémon": "#f6d06f", "Yu-Gi-Oh!": "#f1a66a",
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
        const emoji = ACTIVITY_EMOJIS[act] || ''; // Point 3: Ajout de l'emoji
      const o = document.createElement('option'); o.value = act; o.textContent = `${emoji} ${act}`; formActivitySelect.appendChild(o);
    });
    formActivitySelect.value = selectedActivity || '';
    populateSubActivitiesForForm(formActivitySelect.value);
  }

  // Initial render activity buttons
  function renderActivities(){
    activitiesDiv.innerHTML = '';
    Object.keys(ACTIVITIES).forEach(act => {
      const b = document.createElement('button');
      // Utilisation d'un mappage basé sur le nom pour les classes CSS
      const classNameMap = {
        "Jeux": 'act-jeux', "Culture": 'act-culture', "Sport": 'act-sport', "Sorties": 'act-sorties', "Autres": 'act-autres', "Toutes": 'act-toutes'
      };
      // On utilise une classe par défaut si le nom n'est pas dans le map (ex: 'Autres')
      const className = classNameMap[act] || `act-${act.toLowerCase().replace(/\s|\//g, '-')}`; 
      
      b.className = 'activity-btn ' + className + (act === currentFilterActivity ? ' active' : '');
      
        const emoji = ACTIVITY_EMOJIS[act] || ''; // Point 3: Ajout de l'emoji
      b.textContent = `${emoji} ${act}`;

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
          currentActivityEl.textContent = `${emoji} ${act}`; // Point 3
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
      // Ajout d'une couleur plus spécifique si possible, sinon on utilise la couleur de l'activité parente
      btn.style.borderColor = COLOR_MAP[s] || COLOR_MAP[act] || 'var(--muted-text)';
      btn.style.color = COLOR_MAP[s] || COLOR_MAP[act] || 'var(--muted-text)';

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
    const emoji = ACTIVITY_EMOJIS[selectedActivity] || ''; // Point 3
    currentActivityEl.textContent = selectedActivity ? `${emoji} ${selectedActivity}` : 'Aucune';
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

  // Load and render slots
  function loadSlots(){
    const list = document.getElementById('slots-list'); if (!list) return; list.innerHTML='';
    let slots = getSlots() || [];
    
    // Filtrage
    if (currentFilterActivity !== "Toutes") {
      slots = slots.filter(s => s.activity === currentFilterActivity);
    }

    // sort by date+time
    slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.date));
    // limit 10
    slots = slots.slice(0,10);

    
    const current = JSON.parse(localStorage.getItem('currentUser')||'null');
    const currentUserEmail = current ? current.email : null;
    const currentUserPseudo = current ? current.pseudo || currentUserEmail.split('@')[0] : '';
    
    slots.forEach(slot => {
      const li = document.createElement('li'); li.className='slot-item';
      const info = document.createElement('div'); info.className='slot-info';

      // Affichage des boîtes de sous-activité/sous-sous-activité
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
        subPill.style.border = `1px solid ${COLOR_MAP[slot.sub] || COLOR_MAP[slot.activity] || '#9aa9bf'}`; 
        subPill.style.color = COLOR_MAP[slot.sub] || COLOR_MAP[slot.activity] || '#9aa9bf';
        activityLine.appendChild(subPill);
      }

      // 3. Sous-sous-activité
      if (slot.subsub) {
        let subsubPill = document.createElement('span'); 
        subsubPill.className = 'subsub-box';
        subsubPill.textContent = slot.subsub;
        subsubPill.style.border = `1px solid ${COLOR_MAP[slot.subsub] || COLOR_MAP[slot.sub] || COLOR_MAP[slot.activity] || '#9aa9bf'}`; 
        subsubPill.style.color = COLOR_MAP[slot.subsub] || COLOR_MAP[slot.sub] || COLOR_MAP[slot.activity] || '#9aa9bf';
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

      // info.appendChild(pill); 
      info.appendChild(title); info.appendChild(when); 
      
      // Participants and Gauge (Point 5: "personne(s)")
      const participantsCount = (slot.participants || []).length;
      const participantsBox = document.createElement('div'); participantsBox.className = 'participants-box';
      participantsBox.innerHTML = `👤 ${participantsCount} personne${participantsCount > 1 ? 's' : ''}`;

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

      const actions = document.createElement('div'); actions.className='actions-box'; // Classe pour le style
      
      const isParticipant = (slot.participants || []).some(p => p.email === currentUserEmail);
      const isOwner = slot.owner === currentUserEmail;

      // Bouton Rejoindre / Quitter
      if (current && !isParticipant){
        const joinBtn = document.createElement('button');
        joinBtn.className = 'action-btn join-btn'; // Nouvelle classe
        joinBtn.textContent = '✅ Rejoindre';
        
        if (!slot.private || isOwner){ 
          joinBtn.onclick = ()=> {
            if (participantsCount >= MAX_PARTICIPANTS) return alert('Désolé, ce créneau est complet.');
            
            updateSlot(slot.id, s => {
              s.participants = s.participants || []; 
              s.participants.push({ email: currentUserEmail, pseudo: currentUserPseudo });
              return s;
            });
          };
          actions.appendChild(joinBtn);
        } else {
          joinBtn.textContent = '🔒 Privé';
          joinBtn.disabled = true;
          actions.appendChild(joinBtn);
        }
      } else if (isParticipant && !isOwner) {
        const leaveBtn = document.createElement('button');
        leaveBtn.className = 'action-btn leave-btn'; 
        leaveBtn.textContent = '❌ Quitter';
        leaveBtn.onclick = ()=> {
          updateSlot(slot.id, s => {
            s.participants = s.participants.filter(p => p.email !== currentUserEmail);
            return s;
          });
        };
        actions.appendChild(leaveBtn);
      }

      // delete, reminder, share for all
      
      if (isOwner){
        const del = document.createElement('button'); del.textContent='🗑️'; del.title='Supprimer';
        del.className = 'action-btn ghost-action-btn'; 
        del.onclick = ()=> { if (!confirm('Supprimer ce créneau ?')) return; const remain = getSlots().filter(s=>s.id!==slot.id); saveSlots(remain); loadSlots(); };
        actions.appendChild(del);
      }

      // Rappel pour le propriétaire 
      if (isOwner){
        const rem = document.createElement('button'); rem.textContent='⏰'; rem.title='Rappel';
        rem.className = 'action-btn ghost-action-btn'; 
        rem.onclick = ()=> {
          const notifTime = new Date(slot.date + 'T' + slot.time); const delay = notifTime - new Date();
          if (delay>0){ alert('Rappel programmé (simple notification navigateur)'); setTimeout(()=>{ if (Notification.permission==='granted') new Notification(`Rappel : ${slot.name}`); else alert(`Rappel : ${slot.name}`); }, delay); }
          else alert('Ce créneau est déjà passé.');
        };
        actions.appendChild(rem);
      }

      // Partager pour tous 
      const share = document.createElement('button'); share.textContent='🔗'; share.title='Partager';
      share.className = 'action-btn ghost-action-btn'; 
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
