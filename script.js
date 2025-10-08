/* ========================================================================= */
/* 1. CONFIGURATION ET INITIALISATION FIREBASE */
/* ========================================================================= */

// ⚠️ REMPLACER PAR VOTRE PROPRE CONFIGURATION FIREBASE
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_AUTH_DOMAIN",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_STORAGE_BUCKET",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
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
 * @param {string} message - Le message à afficher.
 * @param {boolean} isSuccess - Vrai pour succès (vert), faux pour erreur (rouge).
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
    
    // Animation et suppression
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
    const logoutBtn = document.getElementById('logout') || document.getElementById('logout-profile');

    if (auth.currentUser) {
        if (profileLink) profileLink.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
        if (profileLink) profileLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

/**
 * Normalise et formate une chaîne de caractères (pour les comparaisons).
 * @param {string} str 
 * @returns {string}
 */
function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


/* ========================================================================= */
/* 4. FONCTIONS DE RENDU (Pour index.html et profile.html) */
/* (Déplacées ici pour être accessibles par showMain) */
/* ========================================================================= */

/**
 * Remplit le sélecteur d'activité du formulaire de création de créneau.
 */
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

/**
 * Remplit le sélecteur de sous-activité du formulaire de création de créneau.
 * @param {string} activity - L'activité principale sélectionnée.
 */
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

/**
 * Remplit le troisième niveau de sélection (sous-sous-activité).
 * @param {string} activity - L'activité principale sélectionnée.
 * @param {string} subActivity - La sous-activité sélectionnée.
 */
function populateSubSub(activity, subActivity) {
    const subsubSelect = document.getElementById('subsub-select');
    if (!subsubSelect) return;

    subsubSelect.innerHTML = '<option value="">-- Optionnel --</option>';

    if (activity && subActivity && activitiesData[activity] && activitiesData[activity].sub && activitiesData[activity].sub[subActivity]) {
        const subSub = activitiesData[activity].sub[subActivity];
        
        // S'il s'agit d'un objet (liste de sous-sous-activités)
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

/**
 * Affiche les boutons de filtre pour les activités principales.
 */
function renderActivities() {
    const activityContainer = document.getElementById('activities');
    if (!activityContainer) return; // Non pertinent si on n'est pas sur index.html

    activityContainer.innerHTML = '';
    
    // Bouton "Tout voir"
    const allBtn = document.createElement('button');
    allBtn.className = `activity-btn ${currentFilterActivity === 'All' ? 'selected' : ''}`;
    allBtn.textContent = 'Tout voir';
    allBtn.style.backgroundColor = '#6c757d'; // Gris
    allBtn.addEventListener('click', () => {
        currentFilterActivity = 'All';
        currentFilterSubActivity = '';
        renderActivities(); // Re-render pour la sélection
        populateSubActivities('All'); // Vide les sous-activités
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

/**
 * Affiche les boutons de filtre pour les sous-activités.
 * @param {string} activity - L'activité principale sélectionnée.
 */
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
            populateSubActivities(activity); // Re-render pour la sélection
            loadSlots();
        });
        subActivityContainer.appendChild(btn);
    }
}


/**
 * Remplit le filtre des villes à partir de toutes les entrées de créneaux.
 */
async function populateCityFilter() {
    const select = document.getElementById('city-filter-select');
    if (!select) return;

    // Récupérer toutes les villes uniques
    const snapshot = await db.collection('slots').get();
    const cities = new Set();
    
    snapshot.forEach(doc => {
        const slot = doc.data();
        if (slot.city) {
            cities.add(slot.city);
        }
    });

    // Remplir le sélecteur
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

    // Événement de changement
    select.value = currentFilterCity;
    select.addEventListener('change', (e) => {
        currentFilterCity = e.target.value;
        loadSlots();
    });
}

/**
 * Crée l'élément HTML pour un créneau.
 * @param {object} slot - Les données du créneau.
 * @param {string} currentUserEmail - L'email de l'utilisateur actuel.
 * @param {string} currentUserPseudo - Le pseudo de l'utilisateur actuel.
 * @param {HTMLElement} targetListElement - L'élément <ul> où insérer le créneau.
 */
function renderSlotItem(slot, currentUserEmail, currentUserPseudo, targetListElement) {
    if (!targetListElement) return;
    
    const isJoined = slot.participants.some(p => p.email === currentUserEmail);
    const isCreator = slot.creator.email === currentUserEmail;
    const canJoin = slot.maxParticipants === null || slot.participants.length < slot.maxParticipants;
    const activityColor = activitiesData[slot.activity]?.color || '#808080';
    const isPrivate = slot.isPrivate;
    const isOwnerView = targetListElement.id === 'user-slots'; // Indique si on est dans la section "Mes Créneaux"

    const li = document.createElement('li');
    li.className = 'slot-item';
    li.style.borderLeftColor = activityColor;

    // --- Info du créneau ---
    let participantsText = isPrivate && !isOwnerView ? `Participants: ${slot.participants.length} / ${slot.maxParticipants || '∞'} (Privé)` : `Participants: ${slot.participants.length} / ${slot.maxParticipants || '∞'}`;
    let participantsListHTML = '';

    if (!isPrivate || isOwnerView) {
        const participantsNames = slot.participants.map(p => 
            p.email === currentUserEmail ? `<span style="font-weight: bold; color: ${activityColor};">${p.pseudo} (Vous)</span>` : p.pseudo
        ).join(', ');
        participantsListHTML = `<p class="participants-list">Membres : ${participantsNames}</p>`;
    }

    // Calcul de la jauge
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

    // --- Boutons d'action ---

    if (isCreator) {
        // Bouton de suppression (visible uniquement par le créateur)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn leave-btn';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Êtes-vous sûr de vouloir supprimer le créneau "${slot.name}" ?`)) {
                db.collection('slots').doc(slot.id).delete()
                    .then(() => {
                        showToast(`Créneau "${slot.name}" supprimé.`, true);
                        loadSlots(); // Recharge les créneaux
                    })
                    .catch(error => showToast(`Erreur lors de la suppression : ${error.message}`, false));
            }
        });
        actionsBox.appendChild(deleteBtn);

    } else if (isJoined) {
        // Bouton de désinscription
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
        // Bouton d'inscription
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
        // Créneau complet
        const fullSpan = document.createElement('span');
        fullSpan.textContent = 'Complet';
        fullSpan.style.color = 'var(--danger-color)';
        fullSpan.style.fontWeight = 'bold';
        actionsBox.appendChild(fullSpan);
    }


    targetListElement.appendChild(li);
}


/**
 * Charge les créneaux depuis Firestore et les affiche.
 */
async function loadSlots() {
    const slotsList = document.getElementById('slots-list');
    if (!slotsList) return; 

    slotsList.innerHTML = '<li>Chargement des créneaux...</li>';

    try {
        let query = db.collection('slots');
        const now = new Date().toISOString().slice(0, 10); // Date du jour YYYY-MM-DD
        
        // 1. Filtrer par date (uniquement les créneaux futurs ou d'aujourd'hui)
        query = query.where('date', '>=', now).orderBy('date', 'asc');

        // 2. Filtrer par activité
        if (currentFilterActivity !== 'All') {
            query = query.where('activity', '==', currentFilterActivity);
        }

        // 3. Filtrer par sous-activité
        if (currentFilterSubActivity !== '') {
            query = query.where('subActivity', '==', currentFilterSubActivity);
        }

        // 4. Filtrer par ville
        if (currentFilterCity !== 'All') {
            query = query.where('city', '==', currentFilterCity);
        }

        const snapshot = await query.get();
        slotsList.innerHTML = '';
        
        if (snapshot.empty) {
            slotsList.innerHTML = `<li>Aucun créneau trouvé pour les filtres sélectionnés.</li>`;
            return;
        }

        // Convertir et trier par heure (l'heure n'est pas triée par Firestore si on filtre par date)
        const sortedSlots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
            if (a.date === b.date) {
                return a.time.localeCompare(b.time);
            }
            return 0; // Le tri par date a déjà été fait par Firestore
        });

        sortedSlots.forEach(slot => {
            renderSlotItem(slot, auth.currentUser.email, currentUserData.pseudo, slotsList);
        });

    } catch (error) {
        showToast(`Erreur lors du chargement des créneaux: ${error.message}`, false);
        slotsList.innerHTML = '<li>Erreur de chargement. Veuillez vérifier la console.</li>';
    }
}


/* ========================================================================= */
/* 5. LOGIQUE D'AFFICHAGE DES PAGES (AUTH vs MAIN) */
/* ========================================================================= */

/**
 * Affiche la section d'authentification et cache la section principale.
 */
function showAuth() {
    const authSection = document.getElementById('auth-section');
    const mainSection = document.getElementById('main-section');
    if (authSection) authSection.style.display = 'flex';
    if (mainSection) mainSection.style.display = 'none';
    
    // Si on est sur la page de profil, rediriger vers l'accueil si déconnecté
    if (window.location.pathname.includes('profile.html')) {
         window.location.href = 'index.html';
    }

    updateHeaderDisplay();
}

/**
 * Affiche la section principale et cache la section d'authentification.
 * Appelle les fonctions de rendu.
 */
async function showMain() {
    const authSection = document.getElementById('auth-section');
    const mainSection = document.getElementById('main-section');
    if (authSection) authSection.style.display = 'none';
    if (mainSection) mainSection.style.display = 'block';

    updateHeaderDisplay();
    
    // Ces fonctions sont maintenant dans la portée globale et accessibles !
    renderActivities();
    await loadSlots();
    await populateCityFilter();
}


/* ========================================================================= */
/* 6. LOGIQUE DE LA PAGE D'ACCUEIL (index.html) */
/* ========================================================================= */

function handleIndexPageLogic() {
    // Les sélecteurs DOM restent ici, car ils ne sont utilisés que par les handlers de cette page
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
    
    if (!loginBtn) return; // Si on n'est pas sur index.html, on arrête.

    // ----------------------------------------------------
    // --- UTILS INDEX PAGE ---
    // ----------------------------------------------------

    /** Met à jour le lien Google Maps */
    function updateMapLink() {
        if (slotLocationInput.value.length > 5) {
            const query = encodeURIComponent(slotLocationInput.value);
            const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
            locationLinkA.href = url;
            locationLinkP.style.display = 'block';
        } else {
            locationLinkP.style.display = 'none';
        }
    }

    /** Vérifie la validité du formulaire d'inscription */
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
            
            // Ajouter les données utilisateur à Firestore
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

    // Écouteurs pour l'inscription
    pseudoInput.addEventListener('input', checkSignupValidity);
    passwordConfirmInput.addEventListener('input', checkSignupValidity);
    document.getElementById('password-signup').addEventListener('input', checkSignupValidity);


    // ----------------------------------------------------
    // --- FORMULAIRE DE CRÉATION DE CRÉNEAU ---
    // ----------------------------------------------------

    // Toggle de la visibilité du formulaire de création
    if (toggleCreateForm && createSlotForm) {
        toggleCreateForm.addEventListener('click', () => {
            const isVisible = createSlotForm.style.display === 'block';
            createSlotForm.style.display = isVisible ? 'none' : 'block';
            toggleCreateForm.querySelector('.arrow').style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
        });
    }

    // Initialisation du sélecteur d'activité du formulaire
    populateFormActivitySelect();

    // Gestion du changement d'activité principale
    if (formActivitySelect) {
        formActivitySelect.addEventListener('change', (e) => {
            const selectedActivity = e.target.value;
            currentActivitySpan.textContent = selectedActivity || 'Aucune';
            currentActivitySpan.style.color = activitiesData[selectedActivity]?.color || 'var(--text-color)';
            populateSubActivitiesForForm(selectedActivity);
        });
    }
    
    // Gestion du changement de sous-activité
    if (subSelect) {
        subSelect.addEventListener('change', (e) => {
            const selectedSub = e.target.value;
            const selectedActivity = formActivitySelect.value;
            populateSubSub(selectedActivity, selectedSub);
        });
    }

    // Gestion de l'input de localisation
    if (slotLocationInput) {
        slotLocationInput.addEventListener('input', updateMapLink);
    }
    
    // Logique de création
    if (createSlotBtn) {
        createSlotBtn.addEventListener('click', async () => {
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
            
            // Simuler l'extraction de la ville (première partie de l'adresse après virgule)
            // C'est une simplification qui devrait être améliorée par une API de géocodage
            const parts = location.split(',').map(p => p.trim());
            const city = parts.length > 1 ? parts[parts.length - 1] : parts[0];


            try {
                const newSlot = {
                    name,
                    activity,
                    subActivity,
                    subSubActivity,
                    location,
                    city: city, // Ajout de la ville pour le filtre
                    date,
                    time,
                    isPrivate,
                    maxParticipants,
                    creator: {
                        uid: auth.currentUser.uid,
                        email: auth.currentUser.email,
                        pseudo: currentUserData.pseudo 
                    },
                    participants: [{ // Le créateur est le premier participant
                        email: auth.currentUser.email,
                        pseudo: currentUserData.pseudo 
                    }],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('slots').add(newSlot);
                showToast(`Créneau "${name}" créé avec succès ! ✅`, true);
                document.getElementById('create-slot-form').reset();
                updateMapLink(); // Cache le lien de la carte
                loadSlots(); // Recharge les créneaux pour afficher le nouveau
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

async function handleProfilePageLogic() {
    const profileMain = document.getElementById('profile-main');
    if (!profileMain || !auth.currentUser) return; // Si on n'est pas sur profile.html ou pas connecté

    const profilePseudoInput = document.getElementById('profile-pseudo');
    const profileEmailInput = document.getElementById('profile-email');
    const profilePhoneInput = document.getElementById('profile-phone');
    const profilePasswordInput = document.getElementById('profile-password');
    const profileForm = document.getElementById('profile-form');
    const userSlotsList = document.getElementById('user-slots');
    const joinedSlotsList = document.getElementById('joined-slots');

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
            // 1. Mise à jour de Firestore (Pseudo et Téléphone)
            await db.collection('users').doc(auth.currentUser.uid).update({
                pseudo: newPseudo,
                phone: newPhone
            });
            
            // Mettre à jour la variable globale et le champ si nécessaire
            currentUserData.pseudo = newPseudo;
            currentUserData.phone = newPhone;

            // 2. Mise à jour du mot de passe si un nouveau est fourni
            if (newPassword) {
                if (newPassword.length < 6) {
                     showToast("Le nouveau mot de passe doit contenir au moins 6 caractères. Veuillez réessayer.", false);
                     return;
                }
                await auth.currentUser.updatePassword(newPassword);
                profilePasswordInput.value = ''; // Vider le champ après succès
            }

            showToast("Profil mis à jour avec succès ! ✨", true);

            // Pour s'assurer que le header est à jour si le pseudo était utilisé quelque part
            updateHeaderDisplay(); 
        } catch (error) {
            // Un cas fréquent : 'auth/requires-recent-login'
            if (error.code === 'auth/requires-recent-login') {
                showToast("Pour changer votre mot de passe, veuillez vous déconnecter puis vous reconnecter, et réessayer.", false);
            } else {
                showToast(`Erreur de mise à jour: ${error.message}`, false);
            }
        }
    });

    // --- Chargement et affichage des créneaux de l'utilisateur ---
    async function loadUserSlots() {
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
            } else if (isJoined) {
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

    loadUserSlots();

    // --- Logique de déconnexion sur la page de profil ---
    const logoutBtnProfile = document.getElementById('logout-profile');
    if (logoutBtnProfile) {
        logoutBtnProfile.addEventListener('click', async () => {
            await auth.signOut();
            showToast("Déconnexion réussie.", true);
            // La redirection vers index.html sera gérée par l'écouteur d'état d'authentification (showAuth)
        });
    }
}


/* ========================================================================= */
/* 8. GESTION DE L'ÉTAT D'AUTHENTIFICATION (POINT D'ENTRÉE PRINCIPAL) */
/* ========================================================================= */

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Utilisateur connecté
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUserData = userDoc.data();
            } else {
                // Créer une entrée utilisateur minimale si elle n'existe pas (cas rare)
                currentUserData = { pseudo: 'Utilisateur Inconnu', email: user.email, phone: '' };
            }
            
            // Gérer l'affichage en fonction de la page
            if (window.location.pathname.includes('profile.html')) {
                handleProfilePageLogic();
            } else {
                showMain();
                handleIndexPageLogic(); // Pour setup les écouteurs d'événements
            }
            
        } catch (error) {
            showToast(`Erreur de chargement des données utilisateur: ${error.message}`, false);
            showAuth(); // Afficher l'authentification en cas d'erreur critique
        }
    } else {
        // Utilisateur déconnecté
        currentUserData = null;
        showAuth();
        // Le code de handleIndexPageLogic doit être appelé pour setup les écouteurs de login/signup
        if (!window.location.pathname.includes('profile.html')) {
            handleIndexPageLogic();
        }
    }
});
