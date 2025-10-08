/* ===== Configuration & categories (Mise à jour V7) ===== */
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
let currentFilterSub = "Toutes"; // Nouveau filtre pour la sous-activité (Point 1)
let currentFilterCity = "Toutes"; 
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null'); // Initialise l'utilisateur

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
    // Re-render the list if loadSlots is available (index page)
    if (typeof loadSlots === 'function' && document.getElementById('slots-list')) loadSlots(); 
    // Re-render the profile page lists
    if (document.getElementById('user-slots')) loadUserSlots(); 
    if (document.getElementById('joined-slots')) loadJoinedSlots(); 
  }
}

/* Fonction pour extraire la ville d'une adresse */
function extractCity(locationText) {
    if (!locationText) return '';
    const parts = locationText.split(',').map(p => p.trim());
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.match(/\d{5}\s/)) { 
            return lastPart.replace(/\d{5}\s*/, '').trim(); 
        }
        return lastPart; 
    }
    return locationText.split(' ').pop(); 
}

/* ===== CORE DOM INIT & HELPERS ===== */

// Mise à jour de l'affichage du header (connexion/profil)
function updateHeaderDisplay() {
    const profileLink = document.getElementById('profile-link');
    const logoutBtn = document.getElementById('logout');
    const logoutProfileBtn = document.getElementById('logout-profile');

    if (currentUser) {
        if (profileLink) profileLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (logoutProfileBtn) logoutProfileBtn.style.display = 'inline-block';
        
    } else {
        if (profileLink) profileLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (logoutProfileBtn) logoutProfileBtn.style.display = 'none';
    }
}

// Remplissage des champs de profil (pour index.html et profile.html)
function fillProfileFields(user) {
    if (!user) return;
    
    // Champs de la page de profil
    const profilePseudo = document.getElementById('profile-pseudo');
    const profileEmail = document.getElementById('profile-email');
    const profilePhone = document.getElementById('profile-phone');

    if (profilePseudo) profilePseudo.value = user.pseudo || '';
    if (profileEmail) profileEmail.value = user.email || '';
    if (profilePhone) profilePhone.value = user.phone || '';
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('currentUser'); 
    currentUser = null;
    window.location.href = 'index.html'; // Redirection vers l'accueil
}


document.addEventListener('DOMContentLoaded', () => {
    updateHeaderDisplay(); // Initialiser l'affichage du header

    // Événements de déconnexion pour les deux pages
    const logoutIndex = document.getElementById('logout');
    const logoutProfile = document.getElementById('logout-profile');
    if (logoutIndex) logoutIndex.addEventListener('click', logout);
    if (logoutProfile) logoutProfile.addEventListener('click', logout);

    // Si on est sur la page de profil
    if (document.getElementById('profile-main')) {
        handleProfilePage();
    } 
    // Si on est sur la page d'accueil
    else if (document.getElementById('main-section')) {
        handleIndexPage();
    }
});

/* ===== LOGIQUE DE LA PAGE D'ACCUEIL (index.html) ===== */

function handleIndexPage() {
    const signupBtn = document.getElementById('signup');
    const loginBtn = document.getElementById('login');
    const toggleCreate = document.getElementById('toggle-create-form');
    const createForm = document.getElementById('create-slot-form');
    const arrow = document.querySelector('.arrow');
    const activitiesDiv = document.getElementById('activities');
    const subDiv = document.getElementById('subactivities');
    const currentActivityEl = document.getElementById('current-activity');
    const formActivitySelect = document.getElementById('form-activity-select');
    const formSubSelect = document.getElementById('sub-select');
    const subsubSelect = document.getElementById('subsub-select');
    const createBtn = document.getElementById('create-slot');
    const cityFilterSelect = document.getElementById('city-filter-select');
    const locationInput = document.getElementById('slot-location');
    const locationLink = document.getElementById('location-link');
    const locationSuggestionBox = document.getElementById('location-suggestion-box');
    const pseudoInput = document.getElementById('pseudo');
    const pseudoStatus = document.getElementById('pseudo-status');
    
    let selectedActivity = null; 
    let suggestedAddress = ''; 

    // Cache des adresses (simulation pour éviter des recherches API répétitives)
    const addressCache = {
        '1 rue de la roquet': '1 rue de la Roquette, 75011 Paris',
        'cafe du coin': '4 rue des Canettes, 75006 Paris',
        'tour eiffel': 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
        '10 rue de lappe': '10 Rue de Lappe, 75011 Paris',
        'liberty': 'Le Liberty, 11 Rue de la Tonnellerie, 28000 Chartres'
    };


    /* --- Fonctions de rendu et de filtrage --- */

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

    // Initial render activity buttons (Filtre activité principale)
    function renderActivities(){
        activitiesDiv.innerHTML = '';
        Object.keys(ACTIVITIES).forEach(act => {
            const b = document.createElement('button');
            const classNameMap = {
                "Jeux": 'act-jeux', "Culture": 'act-culture', "Sport": 'act-sport', "Sorties": 'act-sorties', "Autres": 'act-autres', "Toutes": 'act-toutes'
            };
            const className = classNameMap[act] || `act-${act.toLowerCase().replace(/\s|\//g, '-')}`; 
            
            b.className = 'activity-btn ' + className + (act === currentFilterActivity ? ' active' : '');
            
            const emoji = ACTIVITY_EMOJIS[act] || ''; 
            b.textContent = `${emoji} ${act}`;

            b.addEventListener('click', ()=> {
                currentFilterActivity = act;
                currentFilterSub = "Toutes"; // Réinitialise le filtre sous-activité lors du changement d'activité principale
                loadSlots(); 

                document.querySelectorAll('.activity-buttons > .activity-btn').forEach(btn => btn.classList.remove('active'));
                b.classList.add('active');

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
        // S'assurer que les sous-activités sont chargées pour le filtre actif
        if (currentFilterActivity !== "Toutes") {
            populateSubActivities(currentFilterActivity);
        }
    }

    // populate subactivities area (Point 1: Rendu et filtre de sous-activité)
    function populateSubActivities(act){
        subDiv.innerHTML = '';
        
        // 1. Bouton Réinitialiser/Toutes (pour les sous-activités)
        const resetBtn = document.createElement('button');
        resetBtn.className = 'activity-btn';
        resetBtn.textContent = '❌ Toutes les sous-activités';
        const actColor = COLOR_MAP[act] || '#9aa9bf';
        resetBtn.style.borderColor = actColor; // Couleur de l'activité principale
        resetBtn.style.color = actColor;
        if (currentFilterSub === "Toutes") {
             resetBtn.classList.add('active');
             resetBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }

        resetBtn.addEventListener('click', () => {
            currentFilterSub = "Toutes";
            loadSlots();
            populateSubActivities(act); // Re-render pour l'état actif
        });
        subDiv.appendChild(resetBtn);


        // 2. Boutons pour chaque sous-activité
        const subs = ACTIVITIES[act] || [];
        subs.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'activity-btn';
            
            const btnColor = COLOR_MAP[s] || COLOR_MAP[act] || 'var(--muted-text)';
            btn.style.borderColor = btnColor;
            btn.style.color = btnColor;
            
            if (s === currentFilterSub) {
                btn.classList.add('active');
                btn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Couleur de survol pour l'état actif
            }

            btn.textContent = s;
            
            // Logique de Filtrage (Point 1)
            btn.addEventListener('click', ()=> {
                // Pour la création : remplissage du formulaire
                formSubSelect.value = s;
                populateSubSub(s); 
                
                // Pour le filtrage des slots
                currentFilterSub = s;
                loadSlots();
                populateSubActivities(act); // Re-render pour l'état actif
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

    // Remplir la liste de villes
    function populateCityFilter() {
        if (!cityFilterSelect) return;
        cityFilterSelect.innerHTML = '<option value="Toutes">Toutes</option>'; 
        const slots = getSlots();
        const cities = new Set(slots.map(s => extractCity(s.location)).filter(c => c.length > 0));
        const sortedCities = Array.from(cities).sort((a, b) => a.localeCompare(b, 'fr'));

        sortedCities.forEach(city => {
            const o = document.createElement('option');
            o.value = city;
            o.textContent = city; 
            cityFilterSelect.appendChild(o);
        });

        cityFilterSelect.value = currentFilterCity;
        cityFilterSelect.onchange = () => { // Utilisation d'onchange au lieu d'addEventListener pour éviter les multiples listeners
            currentFilterCity = cityFilterSelect.value;
            loadSlots();
        };
    }

    // Fonction centrale pour le rendu d'un slot
    function renderSlotItem(slot, currentUserEmail, currentUserPseudo, targetListElement) {
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
        const formattedDate = formatDateToWords(slot.date);
        
        const when = document.createElement('div');
        
        // Rendre l'adresse cliquable (dans la liste des créneaux)
        if (slot.location) {
            if (slot.location.match(/\d+\s(rue|avenue|boul|place|impasse|allée|quai)/i)) {
                const locationLinkList = document.createElement('a');
                const encodedLocation = encodeURIComponent(slot.location);
                locationLinkList.href = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                locationLinkList.target = '_blank';
                locationLinkList.textContent = `📍 ${slot.location}`;
                when.appendChild(locationLinkList);
            } else {
                when.textContent = `📍 ${slot.location}`;
            }
        }

        when.innerHTML += ` — 🗓️ ${formattedDate} à ${slot.time}`;
        
        const owner = document.createElement('small'); 
        owner.textContent = `par ${slot.ownerPseudo || slot.owner}`;
        if (slot.private) owner.innerHTML += ' <span class="private-slot-lock">🔒 Privé</span>';

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
        const isParticipant = (slot.participants || []).some(p => p.email === currentUserEmail);
        const isOwner = slot.owner === currentUserEmail;
        
        if (slot.private && slot.owner !== currentUserEmail){
            participantsList.textContent = 'Participants cachés.';
        } else {
            const pseudos = (slot.participants || []).map(p => p.pseudo || p.email.split('@')[0]);
            participantsList.textContent = 'Membres: ' + pseudos.join(', ');
        }
        info.appendChild(participantsList);
        
        info.appendChild(owner); // Owner at the bottom

        const actions = document.createElement('div'); actions.className='actions-box'; 
        
        // Bouton Rejoindre / Quitter (pour la page index.html)
        if (targetListElement.id === 'slots-list' && currentUser) {
            if (!isParticipant){
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
        }
        
        // Boutons d'action pour le propriétaire (index.html ET profile.html)
        if (isOwner){
            // Supprimer
            const del = document.createElement('button'); del.textContent='🗑️'; del.title='Supprimer';
            del.className = 'action-btn ghost-action-btn'; 
            del.onclick = ()=> { 
                if (!confirm('Supprimer ce créneau ?')) return; 
                const remain = getSlots().filter(s=>s.id!==slot.id); 
                saveSlots(remain); 
                if (typeof loadSlots === 'function' && document.getElementById('slots-list')) loadSlots(); 
                if (document.getElementById('user-slots')) loadUserSlots(); 
                if (typeof populateCityFilter === 'function') populateCityFilter(); 
            };
            actions.appendChild(del);

            // Rappel 
            const rem = document.createElement('button'); rem.textContent='⏰'; rem.title='Rappel';
            rem.className = 'action-btn ghost-action-btn'; 
            rem.onclick = ()=> {
                const notifTime = new Date(slot.date + 'T' + slot.time); const delay = notifTime - new Date();
                if (delay>0){ alert('Rappel programmé (simple notification navigateur)'); 
                if (Notification.permission === 'granted') {
                    new Notification(`Rappel : ${slot.name}`);
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') new Notification(`Rappel : ${slot.name}`);
                        else alert(`Rappel : ${slot.name}`);
                    });
                } else {
                    alert(`Rappel : ${slot.name}`);
                }
                 }
                else alert('Ce créneau est déjà passé.');
            };
            actions.appendChild(rem);
        }

        // Partager pour tous 
        const share = document.createElement('button'); share.textContent='🔗'; share.title='Partager';
        share.className = 'action-btn ghost-action-btn'; 
        share.onclick = ()=> { 
            const link = `${window.location.origin}${window.location.pathname}?slot=${slot.id}`; 
            navigator.clipboard.writeText(link).then(()=>alert('Lien copié !')); 
        };
        actions.appendChild(share);


        li.appendChild(info); 
        
        // Logique pour les actions sur la page de profil
        if (targetListElement.id === 'joined-slots') {
            // Ajouter seulement l'action 'Quitter' dans la liste des créneaux rejoints
            if (isParticipant && !isOwner) {
                const leaveBtn = document.createElement('button');
                leaveBtn.className = 'action-btn leave-btn'; 
                leaveBtn.textContent = '❌ Quitter';
                leaveBtn.style.width = '70px'; // Ajustement taille
                leaveBtn.onclick = ()=> {
                    updateSlot(slot.id, s => {
                        s.participants = s.participants.filter(p => p.email !== currentUserEmail);
                        return s;
                    });
                };
                const actionsJoined = document.createElement('div'); 
                actionsJoined.className='actions-box';
                actionsJoined.appendChild(leaveBtn);
                li.appendChild(actionsJoined);
            }
        } else {
            // Si index.html ou user-slots sur profile.html, ajouter les actions complètes
            li.appendChild(actions);
        }
        targetListElement.appendChild(li);
    }


    // Load and render slots (Page Index)
    function loadSlots(){
        const list = document.getElementById('slots-list'); if (!list) return; list.innerHTML='';
        let slots = getSlots() || [];
        
        // Filtrage par activité principale
        if (currentFilterActivity !== "Toutes") {
            slots = slots.filter(s => s.activity === currentFilterActivity);
        }
        
        // Filtrage par sous-activité (Point 1)
        if (currentFilterSub !== "Toutes") {
            slots = slots.filter(s => s.sub === currentFilterSub);
        }


        // Filtrage par ville
        if (currentFilterCity !== "Toutes") {
            slots = slots.filter(s => {
                const city = extractCity(s.location);
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
        
        if (slots.length === 0) {
            list.innerHTML = '<li style="color:var(--muted-text); padding: 10px 0;">Aucun créneau ne correspond à vos filtres.</li>';
            return;
        }

        slots.forEach(slot => renderSlotItem(slot, currentUserEmail, currentUserPseudo, list));
    }

    /* --- Gestion de l'Authentification et des formulaires --- */
    function showMain(){
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        updateHeaderDisplay();
        renderActivities();
        loadSlots();
        populateCityFilter(); 
    }

    if (currentUser) {
        showMain();
    } else {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('main-section').style.display = 'none';
    }


    // Vérification de l'unicité du pseudo
    if (pseudoInput && signupBtn) {
        pseudoInput.addEventListener('input', () => {
            const pseudo = pseudoInput.value.trim();
            if (!pseudo) {
                pseudoStatus.textContent = '';
                signupBtn.disabled = true; 
                return;
            }
            const isTaken = getUsers().some(u => u.pseudo === pseudo);
            if (isTaken) {
                pseudoStatus.textContent = 'Ce pseudo est déjà pris 😞';
                pseudoStatus.style.color = '#e67c73'; 
                signupBtn.disabled = true;
            } else {
                pseudoStatus.textContent = 'Pseudo disponible ! 😊';
                pseudoStatus.style.color = '#78d6a4'; 
                signupBtn.disabled = false;
            }
        });
    }

    // signup/login handlers
    if (signupBtn) signupBtn.addEventListener('click', async ()=>{
        const pseudo = (document.getElementById('pseudo')?.value||'').trim();
        const email = (document.getElementById('email-signup')?.value||'').trim();
        const password = (document.getElementById('password-signup')?.value||'').trim();

        if (!pseudo || !email || !password) return alert('Remplis tous les champs (y compris le pseudo).');
        
        const users = getUsers();
        if (users.find(u=>u.email===email)) return alert('Utilisateur existant avec cet email.');
        if (users.find(u=>u.pseudo===pseudo)) return alert('Ce pseudo est déjà pris. Choisis-en un autre.');
        
        const hashed = await hashPassword(password);
        const newUser = { email, password: hashed, pseudo, phone:'' }; 
        users.push(newUser); saveUsers(users);
        localStorage.setItem('currentUser', JSON.stringify(newUser)); currentUser = newUser;
        showMain();
    });

    if (loginBtn) loginBtn.addEventListener('click', async ()=>{
        const email = (document.getElementById('email-login')?.value||'').trim();
        const password = (document.getElementById('password-login')?.value||'').trim();
        if (!email || !password) return alert('Remplis tous les champs.');
        const hashed = await hashPassword(password);
        const user = getUsers().find(u=>u.email===email && u.password===hashed);
        if (!user) return alert('Identifiants invalides');

        localStorage.setItem('currentUser', JSON.stringify(user)); currentUser = user; 
        showMain();
    });

    // toggle create form
    if (toggleCreate && createForm) toggleCreate.addEventListener('click', ()=> {
        const visible = createForm.style.display === 'block';
        createForm.style.display = visible ? 'none' : 'block';
        arrow.style.transform = visible ? 'rotate(0deg)' : 'rotate(90deg)';
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

    /* --- Suggestion d'adresse et Lien Google Maps (Intelligente) --- */
    if (locationInput) {
        locationInput.addEventListener('input', () => {
            const location = locationInput.value.trim();
            locationLink.style.display = 'none';
            locationSuggestionBox.style.display = 'none';
            suggestedAddress = ''; // Reset suggestion

            if (location.length > 5) {
                
                // --- Simulation de l'API de géolocalisation ---
                let mockAddress = '';
                const lowerLocation = location.toLowerCase();

                const cacheKey = Object.keys(addressCache).find(key => lowerLocation.includes(key));
                if (cacheKey) {
                    mockAddress = addressCache[cacheKey];
                }

                setTimeout(() => {
                    if (mockAddress) {
                        suggestedAddress = mockAddress;
                        
                        locationSuggestionBox.innerHTML = `
                            <span style="font-size:0.8em; color:var(--muted-text);">Adresse exacte ?</span>
                            <button id="suggest-btn" type="button" class="action-btn join-btn" style="width: auto; padding: 5px 10px; margin-left: 5px; margin-top:0;">
                                ${mockAddress}
                            </button>
                        `;
                        locationSuggestionBox.style.display = 'flex';

                        document.getElementById('suggest-btn').onclick = () => {
                            locationInput.value = suggestedAddress;
                            locationSuggestionBox.style.display = 'none';
                            updateGoogleMapLink(suggestedAddress, true); 
                        };
                        
                        updateGoogleMapLink(location, false); 
                    } else {
                        updateGoogleMapLink(location, location.match(/\d+\s(rue|avenue|boul|place|impasse|allée|quai)/i));
                    }

                }, 300);
            } else {
                updateGoogleMapLink(location, false);
            }
        });
    }

    // Fonction pour mettre à jour le lien Google Map
    function updateGoogleMapLink(locationText, isValidAddress) {
        if (locationLink) {
            if (locationText && isValidAddress) {
                const encodedLocation = encodeURIComponent(locationText);
                locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                locationLink.style.display = 'inline-block';
            } else {
                locationLink.style.display = 'none';
            }
        }
    }


    // create slot
    if (createBtn) createBtn.addEventListener('click', ()=> {
        if (!currentUser) return alert('Connecte-toi d’abord');
        
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
            ownerPseudo: currentUser.pseudo || currentUser.email.split('@')[0], 
            participants: [{email: currentUser.email, pseudo: currentUser.pseudo || currentUser.email.split('@')[0]}]
        };
        slots.push(newSlot); saveSlots(slots);
        
        // clear form
        document.getElementById('slot-name').value=''; document.getElementById('slot-location').value=''; document.getElementById('slot-date').value=''; document.getElementById('slot-time').value='';
        locationLink.style.display = 'none'; 
        locationSuggestionBox.style.display = 'none'; 
        formSubSelect.value=''; subsubSelect.value=''; formActivitySelect.value=''; selectedActivity = null; currentActivityEl.textContent='Aucune'; createForm.style.display='none'; if (arrow) arrow.style.transform='rotate(0deg)';
        loadSlots();
        populateCityFilter(); 
    });


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
}

/* ===== LOGIQUE DE LA PAGE PROFIL (profile.html) ===== */

function handleProfilePage() {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // Charger les informations de profil
    fillProfileFields(currentUser);

    // Charger les créneaux créés et rejoints
    loadUserSlots();
    loadJoinedSlots();
    
    // Gestion de la modification du profil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPseudo = document.getElementById('profile-pseudo').value.trim();
            const newPhone = document.getElementById('profile-phone').value.trim();
            const newPassword = document.getElementById('profile-password').value.trim();

            if (!newPseudo) return alert('Le pseudo est obligatoire.');

            let users = getUsers();
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            if (userIndex === -1) return alert('Erreur utilisateur non trouvé.');

            const pseudoConflict = users.some((u, index) => u.pseudo === newPseudo && index !== userIndex);
            if (pseudoConflict) return alert('Ce pseudo est déjà pris par un autre utilisateur.');

            users[userIndex].pseudo = newPseudo;
            users[userIndex].phone = newPhone;

            if (newPassword) {
                users[userIndex].password = await hashPassword(newPassword);
            }

            saveUsers(users);
            localStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
            currentUser = users[userIndex]; // Mise à jour de la variable globale

            alert('Profil mis à jour avec succès !');
        });
    }
}

// Load and render user created slots (Page Profile)
function loadUserSlots(){
    const list = document.getElementById('user-slots'); if (!list) return; list.innerHTML='';
    if (!currentUser) return;

    // Point 3: Correction - filtrer uniquement par owner, et trier
    let slots = getSlots().filter(s => s.owner === currentUser.email);
    slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    const currentUserEmail = currentUser.email;
    const currentUserPseudo = currentUser.pseudo || currentUserEmail.split('@')[0];
    
    if (slots.length === 0) {
        list.innerHTML = '<li style="color:var(--muted-text); padding: 10px 0;">Vous n\'avez créé aucun créneau.</li>';
        return;
    }

    slots.forEach(slot => renderSlotItem(slot, currentUserEmail, currentUserPseudo, list));
}

// Load and render user joined slots (Page Profile)
function loadJoinedSlots(){
    const list = document.getElementById('joined-slots'); if (!list) return; list.innerHTML='';
    if (!currentUser) return;

    let slots = getSlots().filter(s => s.participants.some(p => p.email === currentUser.email) && s.owner !== currentUser.email);
    slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    const currentUserEmail = currentUser.email;
    const currentUserPseudo = currentUser.pseudo || currentUserEmail.split('@')[0];

    if (slots.length === 0) {
        list.innerHTML = '<li style="color:var(--muted-text); padding: 10px 0;">Vous n\'avez rejoint aucun autre créneau.</li>';
        return;
    }

    slots.forEach(slot => renderSlotItem(slot, currentUserEmail, currentUserPseudo, list));
}
