/* ===== CONFIGURATION DES DONNÉES ET DE FIREBASE ===== */

// VOS CLÉS FIREBASE INSÉRÉES ICI
const firebaseConfig = {
    apiKey: "AIzaSyB0U_y6sMU8_vYriCK17H-Y5uPUb2ewPRw",
    authDomain: "magicmeet--app.firebaseapp.com",
    projectId: "magicmeet--app",
    storageBucket: "magicmeet--app.firebasestorage.app",
    messagingSenderId: "168285202241",
    appId: "1:168285202241:web:6284051ec3884cfd81a3c0",
    measurementId: "G-VGHYDK5B7R"
};

// Initialisation de Firebase
// NOTE: Assurez-vous d'avoir bien importé les SDK dans le HTML AVANT ce script !
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const USERS_COLLECTION = db.collection('users');
const SLOTS_COLLECTION = db.collection('slots');

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

const sortedActivityKeys = Object.keys(ACTIVITIES).filter(key => key !== "Toutes").sort((a, b) => a.localeCompare(b, 'fr'));
const tempActivities = { "Toutes": ACTIVITIES["Toutes"] };
sortedActivityKeys.forEach(key => tempActivities[key] = ACTIVITIES[key]);
Object.assign(ACTIVITIES, tempActivities); 

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
Object.keys(SUBSUB).forEach(key => {
  if (SUBSUB[key].length > 0) {
    SUBSUB[key] = sortArray(SUBSUB[key]);
  }
});


const COLOR_MAP = {
  "Autres": "#78d6a4", 
  "Jeux": "#c085f5", 
  "Culture": "#e67c73", 
  "Sport": "#f27a7d", 
  "Sorties": "#f1a66a", 
  "Toutes": "#9aa9bf",
  
  "Jeux de cartes": "#c085f5", "Jeux vidéo": "#6fb2f2", "Jeux de société": "#64e3be",
  "Cinéma": "#e67c73", "Théâtre": "#cc5a4f", "Exposition": "#e39791", "Concert": "#f1b6b3",
  "Foot": "#f27a7d", "Padel": "#cc5a5e", "Tennis": "#e39799", "Running": "#f1b6b7", "Badminton": "#78d6a4",
  "Bar": "#f1a66a", "Restaurant": "#d68e4a", "Picnic": "#f5c399",
  
  "Magic The Gathering": "#b294f2", "Pokémon": "#f6d06f", "Yu-Gi-Oh!": "#f1a66a",
};


const MAX_PARTICIPANTS = 10;
let currentFilterActivity = "Toutes"; 
let currentFilterSub = "Toutes"; 
let currentFilterCity = "Toutes"; 
let currentUser = null; 

/* ===== NOUVEAUX HELPERS DE DONNÉES FIREBASE ===== */

async function getSlotsFromDB() {
    try {
        const snapshot = await SLOTS_COLLECTION.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erreur de récupération des créneaux:", error);
        return [];
    }
}

async function saveSlotToDB(slotData, slotId = null) {
    try {
        if (slotId) {
            await SLOTS_COLLECTION.doc(slotId).update(slotData);
        } else {
            const newDoc = await SLOTS_COLLECTION.add(slotData);
            slotData.id = newDoc.id; 
        }
        return true;
    } catch (error) {
        console.error("Erreur de sauvegarde du créneau:", error);
        return false;
    }
}

async function getUserData(email) {
    const snapshot = await USERS_COLLECTION.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const userData = snapshot.docs[0].data();
    userData.docId = snapshot.docs[0].id; 
    return userData;
}

async function updateUserData(docId, data) {
    try {
        await USERS_COLLECTION.doc(docId).update(data);
        return true;
    } catch (error) {
        console.error("Erreur de mise à jour de l'utilisateur:", error);
        return false;
    }
}

async function getAllUserPseudos() {
    try {
        const snapshot = await USERS_COLLECTION.get();
        return snapshot.docs.map(doc => doc.data().pseudo).filter(p => p);
    } catch (error) {
        console.error("Erreur de récupération des pseudos:", error);
        return [];
    }
}

/* --- Fonctions de logiques persistantes --- */

function formatDateToWords(dateString){
  const date = new Date(dateString + 'T00:00:00'); 
  if (isNaN(date)) return dateString;
  const options = { day: 'numeric', month: 'long' };
  return date.toLocaleDateString('fr-FR', options);
}

async function updateSlot(slotId, updateFn){
    const currentSlotDoc = await SLOTS_COLLECTION.doc(slotId).get();
    if (!currentSlotDoc.exists) return;

    let slot = { id: currentSlotDoc.id, ...currentSlotDoc.data() };

    let updatedSlot = updateFn(slot);

    await SLOTS_COLLECTION.doc(slotId).set(updatedSlot); 
    
    // Assure le rafraîchissement de TOUTES les listes (si elles existent)
    if (document.getElementById('slots-list')) await loadSlots(); 
    if (document.getElementById('user-slots')) await loadUserSlots(); 
    if (document.getElementById('joined-slots')) await loadJoinedSlots(); 
}

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

async function initializeUserSession(email) {
    if (!email) {
        currentUser = null;
        return;
    }
    const userData = await getUserData(email);
    if (userData) {
        currentUser = userData; 
    } else {
        console.warn("Utilisateur authentifié mais pas de données Firestore. Forcing logout.");
        auth.signOut();
        localStorage.removeItem('currentUserEmail');
        currentUser = null;
    }
}

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

function fillProfileFields(user) {
    if (!user) return;
    
    const profilePseudo = document.getElementById('profile-pseudo');
    const profileEmail = document.getElementById('profile-email');
    const profilePhone = document.getElementById('profile-phone');

    if (profilePseudo) profilePseudo.value = user.pseudo || '';
    if (profileEmail) profileEmail.value = user.email || '';
    if (profilePhone) profilePhone.value = user.phone || '';
}

function logout() {
    auth.signOut(); 
    localStorage.removeItem('currentUserEmail'); 
    currentUser = null;
    window.location.href = 'index.html'; 
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- Gestion de l'affichage du mot de passe (Point 3) ---
    const setupPasswordToggle = (checkboxId, ...inputIds) => {
        const checkbox = document.getElementById(checkboxId);
        const inputs = inputIds.map(id => document.getElementById(id)).filter(el => el);
        
        if (checkbox && inputs.length > 0) {
            checkbox.addEventListener('change', () => {
                const newType = checkbox.checked ? 'text' : 'password';
                inputs.forEach(input => input.type = newType);
            });
        }
    };

    setupPasswordToggle('show-password-login', 'password-login');
    setupPasswordToggle('show-password-signup', 'password-signup', 'password-confirm');
    // --- Fin Point 3 ---


    // *************************************************************
    // NOUVEAU: Utilisation de onAuthStateChanged pour une gestion de session fiable
    // *************************************************************
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            localStorage.setItem('currentUserEmail', user.email); 
            await initializeUserSession(user.email); 
        } else {
            localStorage.removeItem('currentUserEmail'); 
            currentUser = null;
        }

        updateHeaderDisplay(); 

        if (document.getElementById('profile-main')) {
            // Sur la page de profil
            if (currentUser) {
                handleProfilePage();
            } else {
                window.location.href = 'index.html'; // Redirection si déconnecté
            }
        } 
        else if (document.getElementById('main-section')) {
            // Sur la page d'accueil
            if (currentUser) {
                showMain();
            } else {
                showAuth();
            }
            handleIndexPageLogic(); // Contient toute la logique des écouteurs de bouton
        }
    });

    // Événements de déconnexion pour les deux pages
    const logoutIndex = document.getElementById('logout');
    const logoutProfile = document.getElementById('logout-profile');
    if (logoutIndex) logoutIndex.addEventListener('click', logout);
    if (logoutProfile) logoutProfile.addEventListener('click', logout);
});


/* --- Fonctions d'affichage --- */

function showAuth(){
    const authSection = document.getElementById('auth-section');
    const mainSection = document.getElementById('main-section');
    if (authSection) authSection.style.display = 'flex';
    if (mainSection) mainSection.style.display = 'none';
}

async function showMain(){
    const authSection = document.getElementById('auth-section');
    const mainSection = document.getElementById('main-section');
    if (authSection) authSection.style.display = 'none';
    if (mainSection) mainSection.style.display = 'block';

    updateHeaderDisplay();
    // Les fonctions de chargement sont appelées ici
    renderActivities();
    await loadSlots(); 
    await populateCityFilter(); 
}


/* ===== LOGIQUE DE LA PAGE D'ACCUEIL (index.html) ===== */

function handleIndexPageLogic() {
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
    // Point 4: Nouveaux éléments
    const passwordSignup = document.getElementById('password-signup');
    const passwordConfirm = document.getElementById('password-confirm');
    const passwordMatchStatus = document.getElementById('password-match-status');
    
    let selectedActivity = null; 
    let suggestedAddress = ''; 

    const addressCache = {
        '1 rue de la roquet': '1 rue de la Roquette, 75011 Paris',
        'cafe du coin': '4 rue des Canettes, 75006 Paris',
        'tour eiffel': 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
        '10 rue de lappe': '10 Rue de Lappe, 75011 Paris',
        'liberty': 'Le Liberty, 11 Rue de la Tonnellerie, 28000 Chartres'
    };

    /* --- Fonctions de rendu et de filtrage --- */

    function populateFormActivitySelect() {
        if (!formActivitySelect) return;
        formActivitySelect.innerHTML = '<option value="">-- Choisis une activité --</option>';
        Object.keys(ACTIVITIES).filter(a => a !== "Toutes").forEach(activity => {
            const option = document.createElement('option');
            option.value = activity;
            option.textContent = `${ACTIVITY_EMOJIS[activity] || ''} ${activity}`;
            formActivitySelect.appendChild(option);
        });
    }

    function populateSubActivitiesForForm(activity) {
        if (!formSubSelect) return;
        formSubSelect.innerHTML = '<option value="">-- Choisis une sous-activité --</option>';
        if (ACTIVITIES[activity] && ACTIVITIES[activity].length > 0) {
            ACTIVITIES[activity].forEach(sub => {
                const option = document.createElement('option');
                option.value = sub;
                option.textContent = sub;
                formSubSelect.appendChild(option);
            });
        }
        // Réinitialise la sous-sous-activité
        populateSubSub(''); 
    }

    function populateSubSub(subActivity) {
        if (!subsubSelect) return;
        subsubSelect.innerHTML = '<option value="">-- Optionnel --</option>';
        if (SUBSUB[subActivity] && SUBSUB[subActivity].length > 0) {
            SUBSUB[subActivity].forEach(subsub => {
                const option = document.createElement('option');
                option.value = subsub;
                option.textContent = subsub;
                subsubSelect.appendChild(option);
            });
        }
    }

    function renderActivities() {
        if (!activitiesDiv) return;
        activitiesDiv.innerHTML = '';
        Object.keys(ACTIVITIES).forEach(activity => {
            const btn = document.createElement('button');
            btn.className = 'activity-btn';
            btn.textContent = `${ACTIVITY_EMOJIS[activity] || ''} ${activity}`;
            btn.style.backgroundColor = COLOR_MAP[activity] || '#9aa9bf';
            
            if (activity === currentFilterActivity) {
                btn.classList.add('selected');
            }

            btn.onclick = () => {
                currentFilterActivity = activity;
                currentFilterSub = 'Toutes'; 
                renderActivities(); // Re-render les activités
                populateSubActivities(activity); // Affiche les sous-activités
                loadSlots(); // Recharge les créneaux
            };
            activitiesDiv.appendChild(btn);
        });
        
        // Assure que les sous-activités sont à jour avec le filtre principal
        populateSubActivities(currentFilterActivity); 
    }

    function populateSubActivities(activity) {
        if (!subDiv) return;
        subDiv.innerHTML = '';
        subDiv.style.display = 'none';

        if (activity === "Toutes" || !ACTIVITIES[activity] || ACTIVITIES[activity].length === 0) {
            return;
        }
        
        // Ajout du bouton "Toutes" pour les sous-catégories
        const allBtn = document.createElement('button');
        allBtn.className = 'activity-btn sub-activity-btn';
        allBtn.textContent = `Tous (${activity})`;
        allBtn.style.backgroundColor = '#9aa9bf'; 
        if (currentFilterSub === 'Toutes') allBtn.classList.add('selected');

        allBtn.onclick = () => {
            currentFilterSub = 'Toutes';
            populateSubActivities(activity); 
            loadSlots();
        };
        subDiv.appendChild(allBtn);

        // Ajout des sous-activités spécifiques
        ACTIVITIES[activity].forEach(sub => {
            const btn = document.createElement('button');
            btn.className = 'activity-btn sub-activity-btn';
            btn.textContent = sub;
            btn.style.backgroundColor = COLOR_MAP[sub] || COLOR_MAP[activity]; 

            if (sub === currentFilterSub) {
                btn.classList.add('selected');
            }

            btn.onclick = () => {
                currentFilterSub = sub;
                populateSubActivities(activity); 
                loadSlots();
            };
            subDiv.appendChild(btn);
        });
        
        subDiv.style.display = 'flex';
    }

    async function populateCityFilter() {
        if (!cityFilterSelect) return;
        // UTILISATION FIREBASE: Récupère les slots
        const allSlots = await getSlotsFromDB();
        
        let cities = allSlots
            .map(s => extractCity(s.location))
            .filter(c => c && c.length > 1); 
            
        // Dédupliquer et trier
        cities = Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b, 'fr'));

        // Remplir le select
        cityFilterSelect.innerHTML = `<option value="Toutes">Toutes les villes</option>`;
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            if (city === currentFilterCity) option.selected = true;
            cityFilterSelect.appendChild(option);
        });

        cityFilterSelect.onchange = () => {
            currentFilterCity = cityFilterSelect.value;
            loadSlots();
        };
    }

    function renderSlotItem(slot, currentUserEmail, currentUserPseudo, targetListElement) {
        const li = document.createElement('li'); li.className='slot-item';
        const info = document.createElement('div'); info.className='slot-info';
        const isOwner = slot.owner === currentUserEmail;
        
        // Activity/Sub activity line
        const activityLine = document.createElement('div'); activityLine.className = 'subsub-line';
        let actPill = document.createElement('span'); 
        actPill.className = 'subsub-box';
        actPill.textContent = slot.activity;
        actPill.style.border = `1px solid ${COLOR_MAP[slot.activity] || '#9aa9bf'}`; 
        actPill.style.color = COLOR_MAP[slot.activity] || '#9aa9bf';
        activityLine.appendChild(actPill);

        if (slot.sub) {
            let subPill = document.createElement('span'); 
            subPill.className = 'subsub-box';
            subPill.textContent = slot.sub;
            subPill.style.border = `1px solid ${COLOR_MAP[slot.sub] || COLOR_MAP[slot.activity] || '#9aa9bf'}`; 
            subPill.style.color = COLOR_MAP[slot.sub] || COLOR_MAP[slot.activity] || '#9aa9bf';
            activityLine.appendChild(subPill);
        }

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
        participantsBox.appendChild(gaugeFill);
        
        info.appendChild(participantsBox);
        
        // Liste des participants 
        const participantsList = document.createElement('div'); participantsList.className = 'participants-list';
        const isParticipant = (slot.participants || []).some(p => p.email === currentUserEmail);
        
        if (slot.private && slot.owner !== currentUserEmail){
            participantsList.textContent = 'Participants cachés.';
        } else {
            const pseudos = (slot.participants || []).map(p => p.pseudo || p.email.split('@')[0]);
            participantsList.textContent = 'Membres: ' + pseudos.join(', ');
        }
        info.appendChild(participantsList);
        
        info.appendChild(owner); 

        const actions = document.createElement('div'); actions.className='actions-box'; 
        
        // Bouton Rejoindre / Quitter (pour la page index.html)
        if (targetListElement.id === 'slots-list' && currentUser) {
            if (!isParticipant){
                const joinBtn = document.createElement('button');
                joinBtn.className = 'action-btn join-btn'; 
                joinBtn.textContent = '✅ Rejoindre';
                
                if (!slot.private || isOwner){ 
                    joinBtn.onclick = async ()=> {
                        if (participantsCount >= MAX_PARTICIPANTS) return alert('Désolé, ce créneau est complet.');
                        
                        await updateSlot(slot.id, s => {
                            s.participants = s.participants || []; 
                            s.participants.push({ email: currentUserEmail, pseudo: currentUserPseudo });
                            return s;
                        });
                        alert('Cool ! Créneau rejoint 😃');
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
                leaveBtn.onclick = async ()=> {
                    await updateSlot(slot.id, s => {
                        s.participants = s.participants.filter(p => p.email !== currentUserEmail);
                        return s;
                    });
                };
                actions.appendChild(leaveBtn);
            }
        }
        
        // Boutons d'action pour le propriétaire (index.html ET profile.html) 
        if (isOwner){
            const del = document.createElement('button'); del.textContent='🗑️'; del.title='Supprimer';
            del.className = 'action-btn ghost-action-btn'; 
            del.onclick = async ()=> { 
                if (!confirm('Supprimer ce créneau ?')) return; 
                await SLOTS_COLLECTION.doc(slot.id).delete();
                if (document.getElementById('slots-list')) await loadSlots(); 
                if (document.getElementById('user-slots')) await loadUserSlots(); 
                if (typeof populateCityFilter === 'function') await populateCityFilter(); 
            };
            actions.appendChild(del);

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

        const share = document.createElement('button'); share.textContent='🔗'; share.title='Partager';
        share.className = 'action-btn ghost-action-btn'; 
        share.onclick = ()=> { 
            const link = `${window.location.origin}${window.location.pathname}?slot=${slot.id}`; 
            navigator.clipboard.writeText(link).then(()=>alert('Lien copié !')); 
        };
        actions.appendChild(share);


        li.appendChild(info); 
        
        if (targetListElement.id === 'user-slots') {
             li.appendChild(actions); 

        } else if (targetListElement.id === 'joined-slots') {
            if (isParticipant && !isOwner) {
                const leaveBtn = document.createElement('button');
                leaveBtn.className = 'action-btn leave-btn'; 
                leaveBtn.textContent = '❌ Quitter';
                leaveBtn.style.width = '70px'; 
                leaveBtn.onclick = async ()=> { 
                    await updateSlot(slot.id, s => {
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
            li.appendChild(actions);
        }
        targetListElement.appendChild(li);
    }
    
    async function loadSlots(){
        const list = document.getElementById('slots-list'); if (!list) return; list.innerHTML='';
        let slots = await getSlotsFromDB() || []; 
        
        if (currentFilterActivity !== "Toutes") {
            slots = slots.filter(s => s.activity === currentFilterActivity);
        }
        
        if (currentFilterSub !== "Toutes") {
            slots = slots.filter(s => s.sub === currentFilterSub);
        }

        if (currentFilterCity !== "Toutes") {
            slots = slots.filter(s => {
                const city = extractCity(s.location);
                return city === currentFilterCity;
            });
        }

        slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
        slots = slots.slice(0,10);

        
        const currentUserEmail = currentUser ? currentUser.email : null;
        const currentUserPseudo = currentUser ? currentUser.pseudo || currentUser.email.split('@')[0] : '';
        
        if (slots.length === 0) {
            list.innerHTML = '<li style="color:var(--muted-text); padding: 10px 0;">Aucun créneau ne correspond à vos filtres.</li>';
            return;
        }

        slots.forEach(slot => renderSlotItem(slot, currentUserEmail, currentUserPseudo, list));
    }


    /* --- Gestion de l'Authentification et des formulaires --- */
    
    // Vérification de l'unicité du pseudo et de la confirmation du mot de passe
    function checkSignupValidity() {
        let isValid = true;
        const pseudoValid = pseudoStatus.textContent === 'Pseudo disponible ! 😊';
        
        // Point 4: Validation du mot de passe
        if (passwordSignup.value && passwordConfirm.value) {
            if (passwordSignup.value === passwordConfirm.value) {
                passwordMatchStatus.textContent = 'Mots de passe correspondent ✅';
                passwordMatchStatus.style.color = '#78d6a4'; 
            } else {
                passwordMatchStatus.textContent = 'Les mots de passe ne correspondent pas ❌';
                passwordMatchStatus.style.color = '#e67c73'; 
                isValid = false;
            }
        } else {
            passwordMatchStatus.textContent = '';
            isValid = false; // Ne valide pas si un champ est vide
        }

        if (!pseudoValid) isValid = false;
        if (passwordSignup.value.length < 6) isValid = false;
        
        if (signupBtn) signupBtn.disabled = !isValid;
    }


    if (pseudoInput && signupBtn) {
        pseudoInput.addEventListener('input', async () => { 
            const pseudo = pseudoInput.value.trim();
            if (!pseudo) {
                pseudoStatus.textContent = '';
                if (signupBtn) signupBtn.disabled = true; 
                return;
            }
            const allPseudos = await getAllUserPseudos();
            const isTaken = allPseudos.some(p => p === pseudo);
            
            if (isTaken) {
                pseudoStatus.textContent = 'Ce pseudo est déjà pris 😞';
                pseudoStatus.style.color = '#e67c73'; 
            } else {
                pseudoStatus.textContent = 'Pseudo disponible ! 😊';
                pseudoStatus.style.color = '#78d6a4'; 
            }
            checkSignupValidity();
        });
        
        if (passwordSignup) passwordSignup.addEventListener('input', checkSignupValidity);
        if (passwordConfirm) passwordConfirm.addEventListener('input', checkSignupValidity);
    }


    // signup handler (Point 2 - Connexion sécurisée)
    if (signupBtn) signupBtn.addEventListener('click', async ()=>{ 
        const pseudo = (document.getElementById('pseudo')?.value||'').trim();
        const email = (document.getElementById('email-signup')?.value||'').trim();
        const password = (document.getElementById('password-signup')?.value||'').trim();
        const confirmPassword = (document.getElementById('password-confirm')?.value||'').trim();

        if (!pseudo || !email || !password || !confirmPassword) return alert('Remplis tous les champs.');
        if (password !== confirmPassword) return alert('Les mots de passe ne correspondent pas.');
        if (password.length < 6) return alert('Le mot de passe doit contenir au moins 6 caractères.');

        try {
            const allPseudos = await getAllUserPseudos();
            if (allPseudos.some(p => p === pseudo)) return alert('Ce pseudo est déjà pris. Choisis-en un autre.');
            
            // Création du compte Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Création du document utilisateur dans Firestore
            const userData = {
                email: user.email,
                pseudo: pseudo,
                phone: '',
                uid: user.uid 
            };
            await USERS_COLLECTION.add(userData); 

            localStorage.setItem('currentUserEmail', user.email); 
            
            // Re-lance la vérification d'état (qui appellera showMain après initialisation)
            await initializeUserSession(user.email); 
            showMain();

        } catch(error) {
            let message = "Erreur lors de l'inscription.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Cet email est déjà utilisé."; 
            } else if (error.code === 'auth/weak-password') {
                message = "Le mot de passe doit contenir au moins 6 caractères.";
            }
            alert(message + " " + error.message);
        }
    });

    // login handler (Point 2 - Connexion sécurisée)
    if (loginBtn) loginBtn.addEventListener('click', async ()=>{ 
        const email = (document.getElementById('email-login')?.value||'').trim();
        const password = (document.getElementById('password-login')?.value||'').trim();
        if (!email || !password) return alert('Remplis tous les champs.');

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            localStorage.setItem('currentUserEmail', user.email);
            
            // Re-lance la vérification d'état (qui appellera showMain après initialisation)
            await initializeUserSession(user.email); 
            showMain();

        } catch(error) {
            alert("Erreur de connexion: Email ou mot de passe invalide.");
        }
    });

    // toggle create form 
    if (toggleCreate && createForm) toggleCreate.addEventListener('click', ()=> {
        const visible = createForm.style.display === 'block';
        createForm.style.display = visible ? 'none' : 'block';
        if (arrow) arrow.style.transform = visible ? 'rotate(0deg)' : 'rotate(90deg)';
        if (!visible) {
            populateFormActivitySelect();
            formActivitySelect.value = selectedActivity || '';
            populateSubActivitiesForForm(formActivitySelect.value);
        }
    });

    // keep selects in sync
    if (formActivitySelect) formActivitySelect.addEventListener('change', ()=>{
        selectedActivity = formActivitySelect.value;
        const emoji = ACTIVITY_EMOJIS[selectedActivity] || ''; 
        currentActivityEl.textContent = selectedActivity ? `${emoji} ${selectedActivity}` : 'Aucune';
        populateSubActivitiesForForm(selectedActivity);
    });

    formSubSelect.addEventListener('change', ()=> populateSubSub(formSubSelect.value));

    // Address location logic (suggestion & map link)
    if (locationInput) {
        locationInput.addEventListener('input', () => {
            const query = locationInput.value.trim().toLowerCase();
            locationSuggestionBox.innerHTML = '';
            locationSuggestionBox.style.display = 'none';
            locationLink.style.display = 'none';

            if (query.length > 2) {
                const suggestions = Object.keys(addressCache).filter(key => key.includes(query));
                if (suggestions.length > 0) {
                    suggestions.forEach(key => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        div.textContent = addressCache[key];
                        div.onclick = () => {
                            locationInput.value = addressCache[key];
                            locationSuggestionBox.style.display = 'none';
                            suggestedAddress = addressCache[key];
                            updateMapLink(suggestedAddress);
                        };
                        locationSuggestionBox.appendChild(div);
                    });
                    locationSuggestionBox.style.display = 'block';
                }
            }
        });
        locationInput.addEventListener('blur', () => {
            // Un petit délai pour permettre le clic sur la suggestion
            setTimeout(() => {
                locationSuggestionBox.style.display = 'none';
            }, 200);
        });
        locationInput.addEventListener('focus', () => {
            // Afficher de nouveau si une saisie est là
            if (locationInput.value.trim().length > 2) {
                locationSuggestionBox.style.display = 'block';
            }
        });
        locationInput.addEventListener('change', () => {
            updateMapLink(locationInput.value.trim());
        });
    }

    function updateMapLink(address) {
        if (address && address.match(/\d+\s(rue|avenue|boul|place|impasse|allée|quai)/i)) {
            const encodedAddress = encodeURIComponent(address);
            const linkA = locationLink.querySelector('a');
            if (linkA) {
                linkA.href = `https://maps.google.com/?q=${encodedAddress}`;
                locationLink.style.display = 'block';
            }
        } else {
            locationLink.style.display = 'none';
        }
    }

    // create slot
    if (createBtn) createBtn.addEventListener('click', async ()=> { 
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
        
        const newSlot = {
            activity,
            sub: sub || '',
            subsub: subsub || '',
            name, location, date, time, private: isPrivate,
            owner: currentUser.email, 
            ownerPseudo: currentUser.pseudo, 
            participants: [{email: currentUser.email, pseudo: currentUser.pseudo}]
        };
        
        const success = await saveSlotToDB(newSlot); 
        
        if (success) {
            // clear form
            document.getElementById('slot-name').value=''; document.getElementById('slot-location').value=''; document.getElementById('slot-date').value=''; document.getElementById('slot-time').value='';
            locationLink.style.display = 'none'; 
            locationSuggestionBox.style.display = 'none'; 
            formSubSelect.value=''; subsubSelect.value=''; formActivitySelect.value=''; selectedActivity = null; currentActivityEl.textContent='Aucune'; createForm.style.display='none'; if (arrow) arrow.style.transform='rotate(0deg)';
            
            await loadSlots(); 
            await populateCityFilter(); 
        } else {
            alert('Échec de la création du créneau.');
        }
    });


    // handle shared slot in URL
    (async function checkShared(){ 
        const params = new URLSearchParams(window.location.search); const sid = params.get('slot');
        if (!sid) return;
        
        const allSlots = await getSlotsFromDB(); 
        const s = allSlots.find(x=>String(x.id)===sid);
        
        if (!s) return alert('Ce créneau n’existe plus.');
        if (s.private) return alert('🔒 Ce créneau est privé : détails cachés.');
        const formattedDate = formatDateToWords(s.date);
        alert(`Créneau partagé :\n${s.name}\n${s.activity} ${s.sub ? ' - '+s.sub : ''} ${s.subsub ? ' - '+s.subsub : ''}\n📍 ${s.location}\n🕒 ${formattedDate} ${s.time}\npar ${s.ownerPseudo || s.owner}`);
    })();
}

/* ===== LOGIQUE DE LA PAGE PROFIL (profile.html) ===== */

function handleProfilePage() {
    // Si l'utilisateur n'est pas (ou plus) currentUser (géré par onAuthStateChanged dans DOMContentLoaded)
    if (!currentUser) return; 
    
    fillProfileFields(currentUser);

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => { 
            e.preventDefault();
            const newPseudo = document.getElementById('profile-pseudo').value.trim();
            const newPhone = document.getElementById('profile-phone').value.trim();
            const newPassword = document.getElementById('profile-password').value.trim();

            if (!newPseudo) return alert('Le pseudo est obligatoire.');

            const pseudoConflictSnapshot = await USERS_COLLECTION
                .where('pseudo', '==', newPseudo)
                .get();
                
            const pseudoConflict = pseudoConflictSnapshot.docs.some(doc => doc.data().email !== currentUser.email);

            if (pseudoConflict) return alert('Ce pseudo est déjà pris par un autre utilisateur.');

            const updateData = {
                pseudo: newPseudo,
                phone: newPhone
            };
            
            if (newPassword) {
                 const user = auth.currentUser;
                 if (user) {
                     try {
                         await user.updatePassword(newPassword);
                     } catch(error) {
                         alert(`Erreur de changement de mot de passe: ${error.message}. Veuillez vous reconnecter et réessayer.`);
                         return;
                     }
                 } else {
                     alert("Erreur: Utilisateur non connecté. Veuillez vous reconnecter.");
                     return;
                 }
            }

            const success = await updateUserData(currentUser.docId, updateData); 

            if (success) {
                // Recharger les données et mettre à jour l'affichage
                await initializeUserSession(currentUser.email); 
                fillProfileFields(currentUser);
                alert('Profil mis à jour avec succès !');
                document.getElementById('profile-password').value = '';
            } else {
                 alert('Échec de la mise à jour du profil.');
            }
        });
    }
    
    loadUserSlots();
    loadJoinedSlots();
}

async function loadUserSlots(){ 
    const list = document.getElementById('user-slots'); if (!list) return; list.innerHTML='';
    if (!currentUser) return;

    let slots = await getSlotsFromDB();
    slots = slots.filter(s => s.owner === currentUser.email);
    slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    const currentUserEmail = currentUser.email;
    const currentUserPseudo = currentUser.pseudo || currentUserEmail.split('@')[0];
    
    if (slots.length === 0) {
        list.innerHTML = '<li style="color:var(--muted-text); padding: 10px 0;">Vous n\'avez créé aucun créneau.</li>';
        return;
    }

    slots.forEach(slot => renderSlotItem(slot, currentUserEmail, currentUserPseudo, list));
}

async function loadJoinedSlots(){ 
    const list = document.getElementById('joined-slots'); if (!list) return; list.innerHTML='';
    if (!currentUser) return;

    let slots = await getSlotsFromDB();
    slots = slots.filter(s => s.participants.some(p => p.email === currentUser.email) && s.owner !== currentUser.email);
    slots = slots.filter(s => s.date && s.time).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    const currentUserEmail = currentUser.email;
    const currentUserPseudo = currentUser.pseudo || currentUserEmail.split('@')[0];

    if (slots.length === 0) {
        list.innerHTML = '<li style="color:var(--muted-text); padding: 10px 0;">Vous n\'avez rejoint aucun autre créneau.</li>';
        return;
    }

    slots.forEach(slot => renderSlotItem(slot, currentUserEmail, currentUserPseudo, list));
}
