/* ========================================================================= */
/* 1. CONFIGURATION ET INITIALISATION FIREBASE */
/* ========================================================================= */

// ⚠️ REMPLACER PAR VOTRE PROPRE CONFIGURATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyB0U_y6sMU8_vYriCK17H-Y5uPUb2ewPRw",
  authDomain: "magicmeet--app.firebaseapp.com",
  projectId: "magicmeet--app",
  storageBucket: "magicmeet--app.firebasestorage.app",
  messagingSenderId: "168285202241",
  appId: "1:168285202241:web:6284051ec3884cfd81a3c0",

};

// Initialisation de Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ========================================================================= */
/* 2. DONNÉES GLOBALES ET VARIABLES D'ÉTAT */
/* ========================================================================= */

let currentUserData = null;
let currentFilterActivity = 'All';
let currentFilterSubActivity = '';
let currentFilterCity = 'All';

const activitiesData = {
    'Sport': {
        color: '#4da6ff',
        sub: {
            'Ballon': {
                'Football': 'Football',
                'Basketball': 'Basketball',
                'Volley': 'Volley',
                'Handball': 'Handball'
            },
            'Raquette': {
                'Tennis': 'Tennis',
                'Padel': 'Padel',
                'Badminton': 'Badminton'
            },
            'Course': {
                'Running': 'Running',
                'Trail': 'Trail'
            },
            'Autres Sports': null
        }
    },
    'Culture': {
        color: '#78d6a4',
        sub: {
            'Musée': null,
            'Concert': null,
            'Exposition': null,
            'Théâtre': null
        }
    },
    'Loisir': {
        color: '#f0ad4e',
        sub: {
            'Jeux de société': null,
            'Cinéma': null,
            'Balade': null,
            'Cuisine': null
        }
    }
};

/* ========================================================================= */
/* 3. FONCTIONS UTILITAIRES */
/* ========================================================================= */

/**
 * Affiche une notification toast.
 */
function showToast(message, isSuccess = true) {
    const toastContainer = document.getElementById('toast-container') || document.createElement('div');
    toastContainer.id = 'toast-container';
    if (!document.body.contains(toastContainer)) {
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'success' : 'error'}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

/**
 * Met à jour l'affichage des liens dans le header (Profil et Déconnexion).
 */
function updateHeaderDisplay() {
    const profileLink = document.getElementById('profile-link');
    const logoutBtnIndex = document.getElementById('logout');
    const logoutBtnProfile = document.getElementById('logout-profile');

    if (auth.currentUser) {
        if (profileLink) profileLink.style.display = 'block';
        if (logoutBtnIndex) logoutBtnIndex.style.display = 'block';
        if (logoutBtnProfile) logoutBtnProfile.style.display = 'block';
    } else {
        if (profileLink) profileLink.style.display = 'none';
        if (logoutBtnIndex) logoutBtnIndex.style.display = 'none';
        if (logoutBtnProfile) logoutBtnProfile.style.display = 'none';
    }
}

/**
 * Normalise et formate une chaîne de caractères (pour les comparaisons).
 */
function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


/* ========================================================================= */
/* 4. FONCTIONS DE RENDU (accessibles globalement pour showMain) */
/* ========================================================================= */

function populateFormActivitySelect() {
    const select = document.getElementById('form-activity-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choisis une activité --</option>';
    for (const activity in activitiesData) {
        const option = document.createElement('option');
        option.value = activity;
        option.textContent = activity;
        select.appendChild(option);
    }
}

function populateSubActivitiesForForm(activity) {
    const subSelect = document.getElementById('sub-select');
    const subsubSelect = document.getElementById('subsub-select');
    if (!subSelect || !subsubSelect) return;

    subSelect.innerHTML = '<option value="">-- Choisis une sous-activité --</option>';
    subsubSelect.innerHTML = '<option value="">-- Optionnel --</option>';

    if (activity && activitiesData[activity] && activitiesData[activity].sub) {
        for (const subActivity in activitiesData[activity].sub) {
            const option = document.createElement('option');
            option.value = subActivity;
            option.textContent = subActivity;
            subSelect.appendChild(option);
        }
    }
}

function populateSubSub(activity, subActivity) {
    const subsubSelect = document.getElementById('subsub-select');
    if (!subsubSelect) return;

    subsubSelect.innerHTML = '<option value="">-- Optionnel --</option>';

    if (activity && subActivity && activitiesData[activity] && activitiesData[activity].sub && activitiesData[activity].sub[subActivity]) {
        const subSub = activitiesData[activity].sub[subActivity];
        
        if (typeof subSub === 'object') {
             for (const key in subSub) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = subSub[key];
                subsubSelect.appendChild(option);
            }
        }
    }
}

function renderActivities() {
    const activityContainer = document.getElementById('activities');
    if (!activityContainer) return; 

    activityContainer.innerHTML = '';
    
    // Bouton "Tout voir"
    const allBtn = document.createElement('button');
    allBtn.className = `activity-btn ${currentFilterActivity === 'All' ? 'selected' : ''}`;
    allBtn.textContent = 'Tout voir';
    allBtn.style.backgroundColor = '#6c757d'; 
    allBtn.addEventListener('click', () => {
        currentFilterActivity = 'All';
        currentFilterSubActivity = '';
        renderActivities(); 
        populateSubActivities('All'); 
        loadSlots();
    });
    activityContainer.appendChild(allBtn);

    for (const activity in activitiesData) {
        const data = activitiesData[activity];
        const btn = document.createElement('button');
        btn.className = `activity-btn ${currentFilterActivity === activity ? 'selected' : ''}`;
        btn.textContent = activity;
        btn.style.backgroundColor = data.color;
        btn.addEventListener('click', () => {
            currentFilterActivity = activity;
            currentFilterSubActivity = '';
            renderActivities();
            populateSubActivities(activity);
            loadSlots();
        });
        activityContainer.appendChild(btn);
    }
}

function populateSubActivities(activity) {
    const subActivityContainer = document.getElementById('subactivities');
    if (!subActivityContainer) return;

    subActivityContainer.innerHTML = '';

    if (activity === 'All' || !activitiesData[activity]) {
        subActivityContainer.style.display = 'none';
        return;
    }

    subActivityContainer.style.display = 'flex';
    const subActivities = activitiesData[activity].sub;
    const color = activitiesData[activity].color;

    // Bouton "Toutes les sous-activités"
    const allSubBtn = document.createElement('button');
    allSubBtn.className = `activity-btn ${currentFilterSubActivity === '' ? 'selected' : ''}`;
    allSubBtn.textContent = `Toutes les ${activity}`;
    allSubBtn.style.backgroundColor = color;
    allSubBtn.addEventListener('click', () => {
        currentFilterSubActivity = '';
        populateSubActivities(activity);
        loadSlots();
    });
    subActivityContainer.appendChild(allSubBtn);

    for (const subActivity in subActivities) {
        const btn = document.createElement('button');
        btn.className = `activity-btn ${currentFilterSubActivity === subActivity ? 'selected' : ''}`;
        btn.textContent = subActivity;
        btn.style.backgroundColor = color;
        btn.addEventListener('click', () => {
            currentFilterSubActivity = subActivity;
            populateSubActivities(activity); 
            loadSlots();
        });
        subActivityContainer.appendChild(btn);
    }
}


async function populateCityFilter() {
    const select = document.getElementById('city-filter-select');
    if (!select) return;

    const snapshot = await db.collection('slots').get();
    const cities = new Set();
    
    snapshot.forEach(doc => {
        const slot = doc.data();
        if (slot.city) {
            cities.add(slot.city);
        }
    });

    select.innerHTML = '';
    
    const allOption = document.createElement('option');
    allOption.value = 'All';
    allOption.textContent = 'Toutes les villes';
    select.appendChild(allOption);

    const sortedCities = Array.from(cities).sort((a, b) => normalizeString(a).localeCompare(normalizeString(b)));

    sortedCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        select.appendChild(option);
    });

    select.value = currentFilterCity;
    select.addEventListener('change', (e) => {
        currentFilterCity = e.target.value;
        loadSlots();
    });
}

/**
 * Crée l'élément HTML pour un créneau.
 * Cette fonction est rendue plus robuste pour gérer les utilisateurs déconnectés.
 */
function renderSlotItem(slot, currentUserEmail, currentUserPseudo, targetListElement) {
    if (!targetListElement) return;

    const isUserLoggedIn = !!currentUserEmail;
    
    const isJoined = isUserLoggedIn && slot.participants.some(p => p.email === currentUserEmail);
    const isCreator = isUserLoggedIn && slot.creator.email === currentUserEmail;
    const canJoin = slot.maxParticipants === null || slot.participants.length < slot.maxParticipants;
    const activityColor = activitiesData[slot.activity]?.color || '#808080';
    const isPrivate = slot.isPrivate;
    const isOwnerView = targetListElement.id === 'user-slots'; 

    const li = document.createElement('li');
    li.className = 'slot-item';
    li.style.borderLeftColor = activityColor;

    let participantsText = isPrivate && !isOwnerView ? `Participants: ${slot.participants.length} / ${slot.maxParticipants || '∞'} (Privé)` : `Participants: ${slot.participants.length} / ${slot.maxParticipants || '∞'}`;
    let participantsListHTML = '';

    if (!isPrivate || isOwnerView) {
        const participantsNames = slot.participants.map(p => 
            (isUserLoggedIn && p.email === currentUserEmail) ? `<span style="font-weight: bold; color: ${activityColor};">${p.pseudo} (Vous)</span>` : p.pseudo
        ).join(', ');
        participantsListHTML = `<p class="participants-list">Membres : ${participantsNames}</p>`;
    }

    const currentCount = slot.participants.length;
    const maxCount = slot.maxParticipants;
    const gaugeWidth = maxCount ? (currentCount / maxCount) * 100 : 0;

    li.innerHTML = `
        <div class="slot-info">
            <strong style="color:${activityColor};">${slot.name}</strong>
            <p class="subsub-line">
                <span class="subsub-box" style="background-color: ${activityColor}; color: white;">${slot.activity}</span>
                <span class="subsub-box" style="background-color: ${activityColor}50; color: ${activityColor};">${slot.subActivity || slot.activity}</span>
                ${slot.subSubActivity ? `<span class="subsub-box" style="background-color: ${activityColor}30; color: ${activityColor};">${slot.subSubActivity}</span>` : ''}
            </p>
            <p>📍 ${slot.location} (${slot.city})</p>
            <p>📅 ${new Date(slot.date).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} à ${slot.time}</p>
            <p>Créateur : ${slot.creator.pseudo}</p>
            
            <div class="participants-box">
                <span>${participantsText}</span>
                ${maxCount ? `
                    <div class="gauge-bar">
                        <div class="gauge-fill" style="width: ${gaugeWidth}%;"></div>
                    </div>
                ` : ''}
            </div>
            ${participantsListHTML}
        </div>
        <div class="actions-box">
            </div>
    `;

    const actionsBox = li.querySelector('.actions-box');

    if (isUserLoggedIn) {
        if (isCreator) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn leave-btn';
            deleteBtn.textContent = 'Supprimer';
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Êtes-vous sûr de vouloir supprimer le créneau "${slot.name}" ?`)) {
                    db.collection('slots').doc(slot.id).delete()
                        .then(() => {
                            showToast(`Créneau "${slot.name}" supprimé.`, true);
                            loadSlots(); 
                        })
                        .catch(error => showToast(`Erreur lors de la suppression : ${error.message}`, false));
                }
            });
            actionsBox.appendChild(deleteBtn);

        } else if (isJoined) {
            const leaveBtn = document.createElement('button');
            leaveBtn.className = 'action-btn leave-btn';
            leaveBtn.textContent = 'Quitter';
            leaveBtn.addEventListener('click', () => {
                const newParticipants = slot.participants.filter(p => p.email !== currentUserEmail);
                db.collection('slots').doc(slot.id).update({ participants: newParticipants })
                    .then(() => {
                        showToast(`Vous avez quitté le créneau "${slot.name}".`, true);
                        loadSlots();
                    })
                    .catch(error => showToast(`Erreur : ${error.message}`, false));
            });
            actionsBox.appendChild(leaveBtn);
            
        } else if (canJoin) {
            const joinBtn = document.createElement('button');
            joinBtn.className = 'action-btn join-btn';
            joinBtn.textContent = 'Rejoindre';
            joinBtn.addEventListener('click', () => {
                const newParticipant = { email: currentUserEmail, pseudo: currentUserPseudo };
                db.collection('slots').doc(slot.id).update({
                    participants: firebase.firestore.FieldValue.arrayUnion(newParticipant)
                })
                .then(() => {
                    showToast(`Vous avez rejoint le créneau "${slot.name}" !`, true);
                    loadSlots();
                })
                .catch(error => showToast(`Erreur : ${error.message}`, false));
            });
            actionsBox.appendChild(joinBtn);
            
        } else {
            const fullSpan = document.createElement('span');
            fullSpan.textContent = 'Complet';
            fullSpan.style.color = 'var(--danger-color)';
            fullSpan.style.fontWeight = 'bold';
            actionsBox.appendChild(fullSpan);
        }
    } else {
        const loginSpan = document.createElement('span');
        loginSpan.textContent = 'Connectez-vous pour agir';
        loginSpan.style.fontSize = '0.9em';
        loginSpan.style.color = 'var(--muted-text)';
        actionsBox.appendChild(loginSpan);
    }


    targetListElement.appendChild(li);
}


async function loadSlots() {
    const slotsList = document.getElementById('slots-list');
    if (!slotsList) return; 

    slotsList.innerHTML = '<li>Chargement des créneaux...</li>';

    // Rendu plus robuste : définit les variables d'utilisateur, même s'il est déconnecté
    const isConnected = !!auth.currentUser && !!currentUserData && !!currentUserData.pseudo;
    const currentUserEmail = isConnected ? auth.currentUser.email : null;
    const currentUserPseudo = isConnected ? currentUserData.pseudo : null;
    
    try {
        let query = db.collection('slots');
        const now = new Date().toISOString().slice(0, 10); 
        
        query = query.where('date', '>=', now).orderBy('date', 'asc');

        if (currentFilterActivity !== 'All') {
            query = query.where('activity', '==', currentFilterActivity);
        }

        if (currentFilterSubActivity !== '') {
            query = query.where('subActivity', '==', currentFilterSubActivity);
        }

        if (currentFilterCity !== 'All') {
            query = query.where('city', '==', currentFilterCity);
        }

        const snapshot = await query.get();
        slotsList.innerHTML = '';
        
        if (snapshot.empty) {
            slotsList.innerHTML = `<li>Aucun créneau trouvé pour les filtres sélectionnés.</li>`;
            return;
        }

        const sortedSlots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
            if (a.date === b.date) {
                return a.time.localeCompare(b.time);
            }
            return 0; 
        });

        sortedSlots.forEach(slot => {
            renderSlotItem(slot, currentUserEmail, currentUserPseudo, slotsList);
        });

    } catch (error) {
        showToast(`Erreur lors du chargement des créneaux: ${error.message}`, false);
        slotsList.innerHTML = '<li>Erreur de chargement. Veuillez vérifier la console.</li>';
    }
}


/* ========================================================================= */
/* 5. LOGIQUE D'AFFICHAGE DES PAGES (AUTH vs MAIN) */
/* ========================================================================= */

function showAuth() {
    const authSection = document.getElementById('auth-section');
    const mainSection = document.getElementById('main-section');
    if (authSection) authSection.style.display = 'flex';
    if (mainSection) mainSection.style.display = 'none';
    
    if (window.location.pathname.includes('profile.html')) {
         window.location.href = 'index.html';
    }

    updateHeaderDisplay();
}

async function showMain() {
    const authSection = document.getElementById('auth-section');
    const mainSection = document.getElementById('main-section');
    if (authSection) authSection.style.display = 'none';
    if (mainSection) mainSection.style.display = 'block';

    updateHeaderDisplay();
    
    // Ces fonctions sont désormais accessibles globalement
    renderActivities();
    await loadSlots();
    await populateCityFilter();
}


/* ========================================================================= */
/* 6. LOGIQUE DE LA PAGE D'ACCUEIL (index.html) */
/* ========================================================================= */

function handleIndexPageLogic() {
    const loginBtn = document.getElementById('login');
    const signupBtn = document.getElementById('signup');
    const createSlotBtn = document.getElementById('create-slot');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const pseudoInput = document.getElementById('pseudo');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const passwordMatchStatus = document.getElementById('password-match-status');
    const formActivitySelect = document.getElementById('form-activity-select');
    const subSelect = document.getElementById('sub-select');
    const subsubSelect = document.getElementById('subsub-select');
    const currentActivitySpan = document.getElementById('current-activity');
    const slotLocationInput = document.getElementById('slot-location');
    const locationLinkP = document.getElementById('location-link');
    const locationLinkA = locationLinkP ? locationLinkP.querySelector('a') : null;
    const toggleCreateForm = document.getElementById('toggle-create-form');
    const createSlotForm = document.getElementById('create-slot-form');
    
    if (!loginBtn) return; // Stop si on n'est pas sur index.html

    // ----------------------------------------------------
    // --- UTILS INDEX PAGE ---
    // ----------------------------------------------------

    function updateMapLink() {
        if (slotLocationInput.value.length > 5 && locationLinkA) {
            const query = encodeURIComponent(slotLocationInput.value);
            // Assurez-vous que l'URL est correcte (simple lien Google Maps)
            const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
            locationLinkA.href = url;
            locationLinkP.style.display = 'block';
        } else if (locationLinkP) {
            locationLinkP.style.display = 'none';
        }
    }

    function checkSignupValidity() {
        const passwordSignup = document.getElementById('password-signup').value;
        const passwordConfirm = passwordConfirmInput.value;
        const pseudo = pseudoInput.value;
        
        const passwordsMatch = passwordSignup === passwordConfirm && passwordSignup.length >= 6;
        const pseudoValid = pseudo.length >= 2;

        if (passwordConfirm.length > 0) {
            passwordMatchStatus.textContent = passwordsMatch ? 'Mots de passe correspondent.' : 'Mots de passe ne correspondent pas.';
            passwordMatchStatus.style.color = passwordsMatch ? 'var(--success-color)' : 'var(--danger-color)';
        } else {
            passwordMatchStatus.textContent = '';
        }

        if (pseudo.length > 0) {
            pseudoInput.style.borderColor = pseudoValid ? 'var(--success-color)' : 'var(--danger-color)';
            document.getElementById('pseudo-status').textContent = pseudoValid ? '' : '2 caractères minimum.';
        } else {
            pseudoInput.style.borderColor = '#ccc';
            document.getElementById('pseudo-status').textContent = '';
        }

        signupBtn.disabled = !(passwordsMatch && pseudoValid);
    }
    
    // ----------------------------------------------------
    // --- FORMULAIRE D'AUTHENTIFICATION ---
    // ----------------------------------------------------

    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('email-login').value;
        const password = document.getElementById('password-login').value;
        
        if (!email || !password) {
            showToast("Veuillez remplir tous les champs de connexion.", false);
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast("Connexion réussie ! 👋", true);
            loginForm.reset();
        } catch (error) {
            let message = "Erreur de connexion. Vérifiez votre email et mot de passe.";
            if (error.code === 'auth/wrong-password') {
                message = "Mot de passe incorrect.";
            } else if (error.code === 'auth/user-not-found') {
                message = "Aucun compte trouvé avec cet email.";
            }
            showToast(message, false);
        }
    });

    signupBtn.addEventListener('click', async () => {
        const email = document.getElementById('email-signup').value;
        const password = document.getElementById('password-signup').value;
        const pseudo = pseudoInput.value;

        if (!email || !password || !pseudo || password !== passwordConfirmInput.value) {
            showToast("Veuillez corriger le formulaire d'inscription.", false);
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            await db.collection('users').doc(userCredential.user.uid).set({
                pseudo: pseudo,
                email: email,
                phone: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast(`Bienvenue ${pseudo} ! Votre compte est créé. 🎉`, true);
            signupForm.reset();
        } catch (error) {
            let message = "Erreur lors de l'inscription.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Cet email est déjà utilisé par un autre compte.";
            }
            showToast(message, false);
        }
    });

    pseudoInput.addEventListener('input', checkSignupValidity);
    passwordConfirmInput.addEventListener('input', checkSignupValidity);
    document.getElementById('password-signup').addEventListener('input', checkSignupValidity);


    // ----------------------------------------------------
    // --- FORMULAIRE DE CRÉATION DE CRÉNEAU ---
    // ----------------------------------------------------

    if (toggleCreateForm && createSlotForm) {
        toggleCreateForm.addEventListener('click', () => {
            const isVisible = createSlotForm.style.display === 'block';
            createSlotForm.style.display = isVisible ? 'none' : 'block';
            toggleCreateForm.querySelector('.arrow').style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
        });
    }

    populateFormActivitySelect();

    if (formActivitySelect) {
        formActivitySelect.addEventListener('change', (e) => {
            const selectedActivity = e.target.value;
            currentActivitySpan.textContent = selectedActivity || 'Aucune';
            currentActivitySpan.style.color = activitiesData[selectedActivity]?.color || 'var(--text-color)';
            populateSubActivitiesForForm(selectedActivity);
        });
    }
    
    if (subSelect) {
        subSelect.addEventListener('change', (e) => {
            const selectedSub = e.target.value;
            const selectedActivity = formActivitySelect.value;
            populateSubSub(selectedActivity, selectedSub);
        });
    }

    if (slotLocationInput) {
        slotLocationInput.addEventListener('input', updateMapLink);
    }
    
    if (createSlotBtn) {
        createSlotBtn.addEventListener('click', async () => {
            if (!auth.currentUser || !currentUserData) {
                showToast("Vous devez être connecté pour créer un créneau.", false);
                return;
            }

            const name = document.getElementById('slot-name').value.trim();
            const activity = formActivitySelect.value;
            const subActivity = subSelect.value || null;
            const subSubActivity = subsubSelect.value || null;
            const location = slotLocationInput.value.trim();
            const date = document.getElementById('slot-date').value;
            const time = document.getElementById('slot-time').value;
            const isPrivate = document.getElementById('private-slot').checked;
            const maxParticipants = null; // Simplifié pour l'instant

            if (!name || !activity || !location || !date || !time) {
                showToast("Veuillez remplir tous les champs obligatoires (Nom, Activité, Lieu, Date, Heure).", false);
                return;
            }
            
            // Extraction de la ville
            const parts = location.split(',').map(p => p.trim());
            const city = parts.length > 1 ? parts[parts.length - 1] : parts[0];


            try {
                const newSlot = {
                    name,
                    activity,
                    subActivity,
                    subSubActivity,
                    location,
                    city: city, 
                    date,
                    time,
                    isPrivate,
                    maxParticipants,
                    creator: {
                        uid: auth.currentUser.uid,
                        email: auth.currentUser.email,
                        pseudo: currentUserData.pseudo 
                    },
                    participants: [{ 
                        email: auth.currentUser.email,
                        pseudo: currentUserData.pseudo 
                    }],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('slots').add(newSlot);
                showToast(`Créneau "${name}" créé avec succès ! ✅`, true);
                document.getElementById('create-slot-form').reset();
                updateMapLink(); 
                loadSlots(); 
            } catch (error) {
                showToast(`Erreur lors de la création du créneau: ${error.message}`, false);
            }
        });
    }

    // ----------------------------------------------------
    // --- LOGIQUE DE DÉCONNEXION ---
    // ----------------------------------------------------

    const logoutBtnIndex = document.getElementById('logout');
    if (logoutBtnIndex) {
        logoutBtnIndex.addEventListener('click', async () => {
            try {
                await auth.signOut();
                showToast("Déconnexion réussie. À bientôt !", true);
            } catch (error) {
                showToast(`Erreur de déconnexion: ${error.message}`, false);
            }
        });
    }

    // Afficher/Cacher mot de passe
    function setupPasswordVisibilityToggle(checkboxId, passwordFieldId) {
        const checkbox = document.getElementById(checkboxId);
        const passwordField = document.getElementById(passwordFieldId);
        if (checkbox && passwordField) {
            checkbox.addEventListener('change', () => {
                passwordField.type = checkbox.checked ? 'text' : 'password';
            });
        }
    }
    setupPasswordVisibilityToggle('show-password-login', 'password-login');
    setupPasswordVisibilityToggle('show-password-signup', 'password-signup');
}


/* ========================================================================= */
/* 7. LOGIQUE DE LA PAGE DE PROFIL (profile.html) */
/* ========================================================================= */

async function loadUserSlots() {
    const userSlotsList = document.getElementById('user-slots');
    const joinedSlotsList = document.getElementById('joined-slots');

    if (!userSlotsList || !joinedSlotsList || !auth.currentUser || !currentUserData) return;

    const slotsSnapshot = await db.collection('slots').get();
    
    userSlotsList.innerHTML = '';
    joinedSlotsList.innerHTML = '';

    let createdCount = 0;
    let joinedCount = 0;

    slotsSnapshot.forEach(doc => {
        const slot = { id: doc.id, ...doc.data() };
        const isCreator = slot.creator.email === auth.currentUser.email;
        const isJoined = slot.participants.some(p => p.email === auth.currentUser.email);

        if (isCreator) {
            renderSlotItem(slot, auth.currentUser.email, currentUserData.pseudo, userSlotsList);
            createdCount++;
        } else if (isJoined && !isCreator) {
            renderSlotItem(slot, auth.currentUser.email, currentUserData.pseudo, joinedSlotsList);
            joinedCount++;
        }
    });

    if (createdCount === 0) {
        userSlotsList.innerHTML = '<li>Vous n\'avez créé aucun créneau.</li>';
    }
    if (joinedCount === 0) {
        joinedSlotsList.innerHTML = '<li>Vous n\'avez rejoint aucun créneau.</li>';
    }
}


async function handleProfilePageLogic() {
    const profileMain = document.getElementById('profile-main');
    if (!profileMain || !auth.currentUser || !currentUserData) {
        // Redirection gérée par onAuthStateChanged si non connecté
        return; 
    }

    const profilePseudoInput = document.getElementById('profile-pseudo');
    const profileEmailInput = document.getElementById('profile-email');
    const profilePhoneInput = document.getElementById('profile-phone');
    const profilePasswordInput = document.getElementById('profile-password');
    const profileForm = document.getElementById('profile-form');
    
    // --- Chargement des données utilisateur ---
    profileEmailInput.value = auth.currentUser.email;
    profilePseudoInput.value = currentUserData.pseudo;
    profilePhoneInput.value = currentUserData.phone || '';


    // --- Logique de mise à jour du profil ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPseudo = profilePseudoInput.value.trim();
        const newPhone = profilePhoneInput.value.trim();
        const newPassword = profilePasswordInput.value.trim();
        
        if (newPseudo.length < 2) {
            showToast("Le pseudo doit contenir au moins 2 caractères.", false);
            return;
        }

        try {
            await db.collection('users').doc(auth.currentUser.uid).update({
                pseudo: newPseudo,
                phone: newPhone
            });
            
            currentUserData.pseudo = newPseudo;
            currentUserData.phone = newPhone;

            if (newPassword) {
                if (newPassword.length < 6) {
                     showToast("Le nouveau mot de passe doit contenir au moins 6 caractères. Veuillez réessayer.", false);
                     return;
                }
                await auth.currentUser.updatePassword(newPassword);
                profilePasswordInput.value = ''; 
            }

            showToast("Profil mis à jour avec succès ! ✨", true);
            updateHeaderDisplay(); 
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                showToast("Pour changer votre mot de passe, veuillez vous déconnecter puis vous reconnecter, et réessayer.", false);
            } else {
                showToast(`Erreur de mise à jour: ${error.message}`, false);
            }
        }
    });

    // --- Chargement des créneaux de l'utilisateur ---
    loadUserSlots();

    // --- Logique de déconnexion sur la page de profil ---
    const logoutBtnProfile = document.getElementById('logout-profile');
    if (logoutBtnProfile) {
        logoutBtnProfile.addEventListener('click', async () => {
            await auth.signOut();
            showToast("Déconnexion réussie.", true);
        });
    }
}


/* ========================================================================= */
/* 8. GESTION DE L'ÉTAT D'AUTHENTIFICATION (POINT D'ENTRÉE PRINCIPAL) */
/* ========================================================================= */

auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUserData = userDoc.data();
            } else {
                currentUserData = { pseudo: 'Utilisateur Inconnu', email: user.email, phone: '' };
            }
            
            if (window.location.pathname.includes('profile.html')) {
                handleProfilePageLogic();
            } else {
                // S'assurer que les listeners de la page d'accueil sont setup
                handleIndexPageLogic(); 
                showMain();
            }
            
        } catch (error) {
            showToast(`Erreur de chargement des données utilisateur: ${error.message}`, false);
            showAuth(); 
        }
    } else {
        currentUserData = null;
        showAuth();
        
        // Exécuter la logique de la page d'accueil pour setup login/signup et afficher les créneaux (sans actions)
        if (!window.location.pathname.includes('profile.html')) {
            handleIndexPageLogic();
            // Appeler showMain même déconnecté pour afficher les créneaux publics
            if (document.getElementById('main-section')) {
                 showMain();
            }
        }
    }
});
