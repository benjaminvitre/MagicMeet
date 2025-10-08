/* ===== Configuration & categories (Mise à jour V5) ===== */
const ADMIN_EMAIL = "benjamin.vitre@gmail.com";

// Triez les sous-activités
const sortArray = (arr) => arr.sort((a, b) => a.localeCompare(b, 'fr'));

const ACTIVITIES = {
  "Toutes": [],
  "Autres": [], 
  "Culture": sortArray(["Cinéma", "Théâtre", "Exposition", "Concert"]), 
  "Jeux": sortArray(["Jeux de cartes", "Jeux vidéo", "Jeux de société"]), 
  "Sorties": sortArray(["Bar", "Restaurant", "Picnic"]), 
  "Sport": sortArray(["Foot", "Padel", "Tennis", "Running", "Badminton"]) 
};

// Trie le dictionnaire principal par clé (activité), en gardant 'Toutes' en premier
const sortedActivityKeys = Object.keys(ACTIVITIES).filter(key => key !== "Toutes").sort((a, b) => a.localeCompare(b, 'fr'));
const tempActivities = { "Toutes": ACTIVITIES["Toutes"] };
sortedActivityKeys.forEach(key => tempActivities[key] = ACTIVITIES[key]);
Object.assign(ACTIVITIES, tempActivities); 

// Ajout des emojis
const ACTIVITY_EMOJIS = {
    "Toutes": "🌍",
    "Autres": "❓",
    "Culture": "🖼️",
    "Jeux": "🎮",
    "Sorties": "🎉",
    "Sport": "⚽"
};

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
let currentFilterActivity = "Toutes"; 
let currentFilterCity = "Toutes"; // Nouvelle variable pour le filtre ville

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

// NOTE : Les fonctions editSlot, populateEditSubActivities, populateEditSubSub ne sont pas utilisées dans index.html, 
// mais sont laissées ici pour être complètes si profile.html est utilisé.
/*
function editSlot(slotId) {...}
function populateEditSubActivities(act, selectedSub = '') {...}
function populateEditSubSub(sub, selectedSubSub = '') {...}
*/


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

  let selectedActivity = null; 
  // Récupération de l'utilisateur stocké dans le localStorage
  let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  // Elements pour le filtre ville (Point 5) et le lien Google Maps
  const cityFilterSelect = document.getElementById('city-filter-select');
  const locationInput = document.getElementById('slot-location');
  const locationLink = document.getElementById('location-link');
  const locationSuggestionBox = document.getElementById('location-suggestion-box');


  // Elements pour l'inscription 
  const pseudoInput = document.getElementById('pseudo');
  const pseudoStatus = document.getElementById('pseudo-status');
  
  // Variable pour stocker l'adresse suggérée (Point 4)
  let suggestedAddress = ''; 

  // Vérification de l'unicité du pseudo
  if (pseudoInput && signupBtn) {
    pseudoInput.addEventListener('input', () => {
      const pseudo = pseudoInput.value.trim();
      if (!pseudo) {
        pseudoStatus.textContent = '';
        signupBtn.disabled = true; // Empêche l'inscription sans pseudo
        return;
      }
      const isTaken = getUsers().some(u => u.pseudo === pseudo);
      if (isTaken) {
        pseudoStatus.textContent = 'Ce pseudo est déjà pris 😞';
        pseudoStatus.style.color = '#e67c73'; // Rouge
        signupBtn.disabled = true;
      } else {
        pseudoStatus.textContent = 'Pseudo disponible ! 😊';
        pseudoStatus.style.color = '#78d6a4'; // Vert
        signupBtn.disabled = false;
      }
    });
  }

  // Point 4: Mise à jour du lien Google Maps et Suggestion d'adresse
  if (locationInput) {
    locationInput.addEventListener('input', () => {
      const location = locationInput.value.trim();
      locationLink.style.display = 'none';
      locationSuggestionBox.style.display = 'none';
      suggestedAddress = ''; // Reset suggestion

      if (location.length > 5) {
        // Logique de suggestion d'adresse (simulation)
        const mockAddress = location.includes('paris') ? '10 Rue de Lappe, 75011 Paris' : 'Adresse Complète Trouvée';
        
        // Simuler une recherche asynchrone pour la suggestion
        setTimeout(() => {
            // Afficher la suggestion si une adresse "exacte" est trouvée
            if (location.toLowerCase().includes('rue') || location.toLowerCase().includes('avenue')) {
                suggestedAddress = mockAddress;
                
                locationSuggestionBox.innerHTML = `
                    <span style="font-size:0.8em; color:var(--muted-text);">Adresse exacte ?</span>
                    <button id="suggest-btn" type="button" class="action-btn join-btn" style="width: auto; padding: 5px 10px; margin-left: 5px;">
                        ${mockAddress}
                    </button>
                `;
                locationSuggestionBox.style.display = 'block';

                document.getElementById('suggest-btn').onclick = () => {
                    locationInput.value = suggestedAddress;
                    locationSuggestionBox.style.display = 'none';
                    updateGoogleMapLink(suggestedAddress);
                };
            }
            // Mettre à jour le lien Google Map pour le texte saisi
            updateGoogleMapLink(location);

        }, 500); // Délai pour simuler une recherche
      }
    });
  }

  // Fonction pour mettre à jour le lien Google Map
  function updateGoogleMapLink(locationText) {
    if (locationText) {
        const encodedLocation = encodeURIComponent(locationText);
        // Note: L'URL doit être celle de Google Maps
        locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
        locationLink.style.display = 'inline-block';
    } else {
        locationLink.style.display = 'none';
    }
  }


  // Populate form activity select on load
  function populateFormActivitySelect(){
    if (!formActivitySelect) return;
    formActivitySelect.innerHTML = '<option value="">-- Choisis une activité --</option>';
    // Exclure 'Toutes' du formulaire de création
    Object.keys(ACTIVITIES).filter(a=>a!=='Toutes').forEach(act => {
        const emoji = ACTIVITY_EMOJIS[act] || ''; 
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
      
        const emoji = ACTIVITY_EMOJIS[act] || ''; 
      b.textContent = `${emoji} ${act}`;

      b.addEventListener('click', ()=> {
        // Filtrage des créneaux
        currentFilterActivity = act;
        loadSlots(); // Charger les slots filtrés

        // Mise à jour des classes 'active'
        document.querySelectorAll('.activity-btn').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');

        // Gestion de la sélection pour la création de créneau
        if(act !== "Toutes") {
          selectedActivity = act;
          currentActivityEl.textContent = `${emoji} ${act}`; 
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

  // Point 5: Remplir la liste de villes (uniquement le nom de la ville)
  function populateCityFilter() {
    cityFilterSelect.innerHTML = '<option value="Toutes">Toutes</option>'; // Changement du texte à "Toutes"
    const slots = getSlots();
    // Extraire la première partie de l'adresse (la ville) sans doublons
    const cities = new Set(slots.map(s => (s.location || '').split(',')[0].trim()).filter(c => c.length > 0));
    const sortedCities = Array.from(cities).sort((a, b) => a.localeCompare(b, 'fr'));

    sortedCities.forEach(city => {
      const o = document.createElement('option');
      o.value = city;
      o.textContent = city; // Affichage uniquement du nom de la ville
      cityFilterSelect.appendChild(o);
    });

    cityFilterSelect.value = currentFilterCity;
    cityFilterSelect.addEventListener('change', () => {
      currentFilterCity = cityFilterSelect.value;
      loadSlots();
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
    populateCityFilter(); // Remplir le filtre ville au chargement
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
    const pseudo = (document.getElementById('pseudo')?.value||'').trim();
    const email = (document.getElementById('email')?.value||'').trim();
    const password = (document.getElementById('password')?.value||'').trim();

    if (!pseudo || !email || !password) return alert('Remplis tous les champs (y compris le pseudo).');
    
    const users = getUsers();
    if (users.find(u=>u.email===email)) return alert('Utilisateur existant avec cet email.');
    if (users.find(u=>u.pseudo===pseudo)) return alert('Ce pseudo est déjà pris. Choisis-en un autre.');
    
    const hashed = await hashPassword(password);
    const newUser = { email, password: hashed, pseudo, phone:'' }; 
    users.push(newUser); saveUsers(users);
    // Point 6: Sauvegarde du pseudo dans l'objet currentUser
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

    // Point 6: Sauvegarde de l'objet utilisateur complet (avec pseudo)
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
    const emoji = ACTIVITY_EMOJIS[selectedActivity] || ''; 
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
      ownerPseudo: currentUser.pseudo || currentUser.email.split('@')[0], // Utilisation du pseudo
      participants: [{email: currentUser.email, pseudo: currentUser.pseudo || currentUser.email.split('@')[0]}]
    };
    slots.push(newSlot); saveSlots(slots);
    
    // clear form
    document.getElementById('slot-name').value=''; document.getElementById('slot-location').value=''; document.getElementById('slot-date').value=''; document.getElementById('slot-time').value='';
    locationLink.style.display = 'none'; // Cache le lien Google Maps
    locationSuggestionBox.style.display = 'none'; // Cache la suggestion
    formSubSelect.value=''; subsubSelect.value=''; formActivitySelect.value=''; selectedActivity = null; currentActivityEl.textContent='Aucune'; createForm.style.display='none'; if (arrow) arrow.style.transform='rotate(0deg)';
    loadSlots();
    populateCityFilter(); // Mettre à jour les filtres de ville
  });

  // Load and render slots
  function loadSlots(){
    const list = document.getElementById('slots-list'); if (!list) return; list.innerHTML='';
    let slots = getSlots() || [];
    
    // Filtrage par activité
    if (currentFilterActivity !== "Toutes") {
      slots = slots.filter(s => s.activity === currentFilterActivity);
    }

    // Filtrage par ville (Point 5)
    if (currentFilterCity !== "Toutes") {
        slots = slots.filter(s => {
            // Utilise la première partie de l'adresse (la ville)
            const city = (s.location || '').split(',')[0].trim();
            return city === currentFilterCity;
        });
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
      // Afficher le pseudo de l'owner
      owner.textContent = `par ${slot.ownerPseudo || slot.owner}`;
      if (slot.private) owner.innerHTML += ' <span class="private-slot-lock">🔒 Privé</span>';

      // info.appendChild(pill); 
      info.appendChild(title); info.appendChild(when); 
      
      // Participants and Gauge 
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
        // Afficher les pseudos des participants
        const pseudos = (slot.participants || []).map(p => p.pseudo || p.email.split('@')[0]);
        participantsList.textContent = 'Membres: ' + pseudos.join(', ');
      }
      info.appendChild(participantsList);
      
      info.appendChild(owner); // Owner at the bottom

      const actions = document.createElement('div'); actions.className='actions-box'; 
      
      const isParticipant = (slot.participants || []).some(p => p.email === currentUserEmail);
      const isOwner = slot.owner === currentUserEmail;

      // Bouton Rejoindre / Quitter
      if (current && !isParticipant){
        const joinBtn = document.createElement('button');
        joinBtn.className = 'action-btn join-btn'; 
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
        del.onclick = ()=> { if (!confirm('Supprimer ce créneau ?')) return; const remain = getSlots().filter(s=>s.id!==slot.id); saveSlots(remain); loadSlots(); populateCityFilter(); };
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
