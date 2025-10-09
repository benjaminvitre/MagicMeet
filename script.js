/* ===== Configuration & categories (Mise à jour V8) ===== */
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
Object.keys(SUBSUB).forEach(key => {
  if (SUBSUB[key].length > 0) {
    SUBSUB[key] = sortArray(SUBSUB[key]);
  }
});

const COLOR_MAP = {
  "Autres": "#78d6a4", "Jeux": "#c085f5", "Culture": "#e67c73", "Sport": "#f27a7d", "Sorties": "#f1a66a", "Toutes": "#9aa9bf",
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
let currentFilterGroup = "Toutes";
let currentUser = null;

function formatDateToWords(dateString){
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date)) return dateString;
  const options = { day: 'numeric', month: 'long' };
  return date.toLocaleDateString('fr-FR', options);
}

function extractCity(locationText) {
    if (!locationText) return '';
    const parts = locationText.split(',').map(p => p.trim());
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.match(/\d{5}\s/)) { return lastPart.replace(/\d{5}\s*/, '').trim(); }
        return lastPart.replace(/\d{5}/, '').trim();
    }
    const words = locationText.split(' ');
    const lastWord = words[words.length -1];
    if (lastWord && lastWord.length > 2 && lastWord[0] === lastWord[0].toUpperCase()) { return lastWord; }
    return locationText;
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
    auth.signOut().catch(error => console.error("Erreur de déconnexion: ", error));
}

function renderSlotItem(slot, targetListElement) {
    const li = document.createElement('li'); li.className='slot-item';
    const info = document.createElement('div'); info.className='slot-info';
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
        const locationLink = document.createElement('a');
        locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(slot.location)}`;
        locationLink.textContent = `📍 ${slot.location}`;
        locationLink.target = '_blank';
        locationLink.rel = 'noopener noreferrer';
        when.appendChild(locationLink);
        const dateSpan = document.createElement('span');
        dateSpan.textContent = ` — 🗓️ ${formattedDate} à ${slot.time}`;
        when.appendChild(dateSpan);
    } else {
        when.textContent = `🗓️ ${formattedDate} à ${slot.time}`;
    }
    const owner = document.createElement('small');
    owner.textContent = `par ${slot.ownerPseudo}`;
    if (slot.private) owner.innerHTML += ' <span class="private-slot-lock">🔒 Privé</span>';
    info.appendChild(title); info.appendChild(when);
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
    const participantsList = document.createElement('div'); participantsList.className = 'participants-list';
    const isParticipant = currentUser && (slot.participants_uid || []).includes(currentUser.uid);
    const isOwner = currentUser && slot.owner === currentUser.uid;
    if (slot.private && !isOwner && !isParticipant) {
        participantsList.textContent = 'Participants cachés.';
    } else {
        const pseudos = (slot.participants || []).map(p => p.pseudo);
        participantsList.textContent = 'Membres: ' + pseudos.join(', ');
    }
    info.appendChild(participantsList);
    info.appendChild(owner);
    const actions = document.createElement('div'); actions.className='actions-box';
    const slotRef = db.collection('slots').doc(slot.id);
    const reloadLists = () => {
        if (typeof loadSlots === 'function' && document.getElementById('slots-list')) loadSlots();
        if (typeof loadUserSlots === 'function' && document.getElementById('user-slots')) loadUserSlots();
        if (typeof loadJoinedSlots === 'function' && document.getElementById('joined-slots')) loadJoinedSlots();
    };
    if (currentUser) {
        if (targetListElement.id === 'slots-list' || targetListElement.id === 'user-slots') {
            if (!isParticipant){
                const joinBtn = document.createElement('button');
                joinBtn.className = 'action-btn join-btn';
                joinBtn.textContent = '✅ Rejoindre';
                if (!slot.private || isOwner){
                    joinBtn.onclick = ()=> {
                        if (participantsCount >= MAX_PARTICIPANTS) return alert('Désolé, ce créneau est complet.');
                        slotRef.update({
                            participants: firebase.firestore.FieldValue.arrayUnion({uid: currentUser.uid, pseudo: currentUser.pseudo}),
                            participants_uid: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                        }).then(reloadLists);
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
                    slotRef.update({
                        participants: firebase.firestore.FieldValue.arrayRemove({uid: currentUser.uid, pseudo: currentUser.pseudo}),
                        participants_uid: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                    }).then(reloadLists);
                };
                actions.appendChild(leaveBtn);
            }
        }
        if (targetListElement.id === 'joined-slots') {
            const leaveBtn = document.createElement('button');
            leaveBtn.className = 'action-btn leave-btn';
            leaveBtn.textContent = '❌ Quitter';
            leaveBtn.onclick = () => {
                 slotRef.update({
                    participants: firebase.firestore.FieldValue.arrayRemove({uid: currentUser.uid, pseudo: currentUser.pseudo}),
                    participants_uid: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                }).then(reloadLists);
            };
            actions.appendChild(leaveBtn);
        }
        if (isOwner){
            const editBtn = document.createElement('button'); 
            editBtn.textContent='✏️'; 
            editBtn.title='Modifier';
            editBtn.className = 'action-btn ghost-action-btn';
            editBtn.onclick = () => openEditModal(slot);
            actions.appendChild(editBtn);

            const del = document.createElement('button'); del.textContent='🗑️'; del.title='Supprimer';
            del.className = 'action-btn ghost-action-btn';
            del.onclick = ()=> {
                if (!confirm('Supprimer ce créneau ?')) return;
                slotRef.delete().then(reloadLists);
            };
            actions.appendChild(del);
        }
    }
    const share = document.createElement('button'); share.textContent='🔗'; share.title='Partager';
    share.className = 'action-btn ghost-action-btn';
    share.onclick = ()=> {
        const link = `${window.location.origin}${window.location.pathname}?slot=${slot.id}`;
        navigator.clipboard.writeText(link).then(()=>alert('Lien copié !'));
    };
    actions.appendChild(share);
    li.appendChild(info);
    li.appendChild(actions);
    targetListElement.appendChild(li);
}

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async user => {
        if (user) {
            const userDocRef = db.collection('users').doc(user.uid);
            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
            } else {
                currentUser = { uid: user.uid, email: user.email, pseudo: user.email.split('@')[0] };
            }
            checkShared();
            if (document.getElementById('profile-main')) {
                handleProfilePage();
            } else if (document.getElementById('main-section')) {
                showMain();
            }
        } else {
            currentUser = null;
            checkShared();
            if (document.getElementById('auth-section')) {
                 document.getElementById('auth-section').style.display = 'flex';
                 document.getElementById('main-section').style.display = 'none';
            } else if (document.getElementById('profile-main')) {
                 window.location.href = 'index.html';
            }
        }
        updateHeaderDisplay();
    });
    const logoutIndex = document.getElementById('logout');
    const logoutProfile = document.getElementById('logout-profile');
    if (logoutIndex) logoutIndex.addEventListener('click', logout);
    if (logoutProfile) logoutProfile.addEventListener('click', logout);
    if (document.getElementById('main-section')) {
        handleIndexPageListeners();
    }
});

function handleIndexPageListeners() {
    // ... (fonction identique au message #18)
}

function showMain(){
    // ... (fonction identique au message #18)
}

function handleProfilePage() {
    if (!currentUser) return;
    fillProfileFields(currentUser);
    loadUserSlots();
    loadJoinedSlots();
    loadUserGroups();
    const createGroupBtn = document.getElementById('create-group-btn');
    const groupNameInput = document.getElementById('group-name-input');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', async () => {
            const name = groupNameInput.value.trim();
            if (name.length < 3) return alert('Le nom du groupe doit faire au moins 3 caractères.');
            const existingGroup = await db.collection('groups').where('name', '==', name).get();
            if (!existingGroup.empty) { return alert('Ce nom de groupe est déjà pris.'); }
            const newGroup = {
                name: name, owner_uid: currentUser.uid, owner_pseudo: currentUser.pseudo,
                members_uid: [currentUser.uid],
                members: [{ uid: currentUser.uid, pseudo: currentUser.pseudo }],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            db.collection('groups').add(newGroup).then(() => { groupNameInput.value = ''; loadUserGroups(); });
        });
    }
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
        });
    }
}

async function loadUserSlots(){
    // ... (fonction identique au message #18)
}

async function loadJoinedSlots(){
    // ... (fonction identique au message #18)
}

async function loadUserGroups() {
    // ... (fonction identique au message #18)
}

function renderGroupItem(group) {
    // ... (fonction identique au message #18)
}

function checkShared(){
    // ... (fonction identique au message #18)
}

// NOUVELLE FONCTION
function openEditModal(slot) {
    const modal = document.getElementById('edit-slot-modal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.close-btn');
    const saveBtn = document.getElementById('save-slot-changes');
    const activitySelect = document.getElementById('edit-form-activity-select');
    const subSelect = document.getElementById('edit-sub-select');
    const subsubSelect = document.getElementById('edit-subsub-select');

    document.getElementById('edit-slot-id').value = slot.id;
    document.getElementById('edit-slot-name').value = slot.name;
    document.getElementById('edit-slot-location').value = slot.location;
    document.getElementById('edit-slot-date').value = slot.date;
    document.getElementById('edit-slot-time').value = slot.time;
    document.getElementById('edit-private-slot').checked = slot.private;

    activitySelect.innerHTML = '';
    Object.keys(ACTIVITIES).filter(a=>a!=='Toutes').forEach(act => {
        const o = document.createElement('option'); o.value = act; o.textContent = act;
        activitySelect.appendChild(o);
    });
    activitySelect.value = slot.activity;

    const populateSubs = (activity) => {
        subSelect.innerHTML = '<option value="">-- Optionnel --</option>';
        (ACTIVITIES[activity] || []).forEach(s => {
            const o = document.createElement('option'); o.value = s; o.textContent = s; subSelect.appendChild(o);
        });
        subSelect.value = slot.sub;
    };

    const populateSubSubs = (subActivity) => {
        subsubSelect.innerHTML = '<option value="">-- Optionnel --</option>';
        (SUBSUB[subActivity] || []).forEach(ss => {
            const o = document.createElement('option'); o.value = ss; o.textContent = ss; subsubSelect.appendChild(o);
        });
        subsubSelect.value = slot.subsub;
    };
    
    populateSubs(slot.activity);
    populateSubSubs(slot.sub);

    activitySelect.onchange = () => populateSubs(activitySelect.value);
    subSelect.onchange = () => populateSubSubs(subSelect.value);

    modal.style.display = 'block';

    const closeModal = () => modal.style.display = 'none';
    closeBtn.onclick = closeModal;
    window.onclick = (event) => { if (event.target == modal) closeModal(); };

    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', () => {
        const updatedSlot = {
            name: document.getElementById('edit-slot-name').value,
            location: document.getElementById('edit-slot-location').value,
            date: document.getElementById('edit-slot-date').value,
            time: document.getElementById('edit-slot-time').value,
            private: document.getElementById('edit-private-slot').checked,
            activity: activitySelect.value,
            sub: subSelect.value,
            subsub: subsubSelect.value,
        };

        const slotId = document.getElementById('edit-slot-id').value;
        db.collection('slots').doc(slotId).update(updatedSlot)
            .then(() => {
                closeModal();
                loadUserSlots();
            })
            .catch(error => console.error("Erreur lors de la mise à jour: ", error));
    });
}
