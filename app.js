// ============================================================================
// 1. CONFIGURACIÓN INICIAL: TAREAS, SEMESTRES UC, FESTIVOS VENEZUELA Y APUNTES
// ============================================================================
const DEFAULT_TASKS = [
    { id: '1', semester: 1, subject: 'Matemática I', title: 'Guía de Ejercicios: Funciones y Límites', date: '2026-11-05', hours: 4, priority: 'Alta' },
    { id: '2', semester: 1, subject: 'Microeconomía I', title: 'Lectura: Teoría del Consumidor y Curvas de Indiferencia', date: '2026-11-07', hours: 3, priority: 'Alta' },
    { id: '3', semester: 1, subject: 'Principios de Computación', title: 'Práctica de Algoritmos y Estructuras Lógicas', date: '2026-11-10', hours: 2, priority: 'Media' }
];

const DEFAULT_CLASSES = [
    { id: 'c1', semester: 1, code: 'MAT', subject: 'Matemática I', room: 'Aula 1212 • 02', day: 'Lunes', start: '10:25', end: '13:30', color: 'blue' },
    { id: 'c2', semester: 1, code: 'PC', subject: 'Principios de Computación', room: 'Aula L232 • 01', day: 'Martes', start: '07:20', end: '10:20', color: 'teal' },
    { id: 'c3', semester: 1, code: 'MIC', subject: 'Microeconomía I', room: 'Aula 1210 • 01', day: 'Miércoles', start: '13:30', end: '16:30', color: 'purple' },
    { id: 'c4', semester: 1, code: 'FI', subject: 'Formación Integral', room: 'Aula 1305 • 02', day: 'Jueves', start: '08:50', end: '10:25', color: 'rose' }
];

const DEFAULT_NOTES = [
    {
        id: 'n1',
        subject: 'Matemática I',
        title: 'Límites Notables e Indeterminaciones (0/0)',
        content: '• Indeterminación 0/0 con polinomios: Factorizar (Ruffini / productos notables) y simplificar.\n• Con radicales: Multiplicar numerador y denominador por la conjugada.\n• Límite trigonométrico fundamental: lim (x→0) [sen(x)/x] = 1.',
        date: '2026-10-28'
    },
    {
        id: 'n2',
        subject: 'Microeconomía I',
        title: 'Elasticidad Precio de la Demanda y Equilibrio',
        content: '• Ep = (% variación cantidad demandada) / (% variación en el precio) = (dQ/dP) * (P/Q).\n• Si |Ep| > 1: Demanda Elástica.\n• Si |Ep| < 1: Demanda Inelástica.\n• Óptimo del consumidor: RMS = Px / Py (Tasa Marginal de Sustitución igual a relación de precios).',
        date: '2026-10-28'
    }
];

const DEFAULT_HOLIDAYS_VE_UC = [
    { id: 'h1', date: '2026-11-13', name: 'Día de la Virgen del Socorro (Feriado Regional Valencia)', type: 'Regional Carabobo' },
    { id: 'h2', date: '2026-11-15', name: 'Aniversario de la Reapertura de la Universidad de Carabobo', type: 'Asueto UC' },
    { id: 'h3', date: '2026-11-21', name: 'Día del Estudiante Universitario en Venezuela', type: 'Asueto UC' },
    { id: 'h4', date: '2026-12-18', name: 'Inicio de Receso Navideño Universitario (UC)', type: 'Receso UC' },
    { id: 'h5', date: '2027-01-15', name: 'Día del Profesor Universitario', type: 'Asueto UC' },
    { id: 'h6', date: '2027-02-08', name: 'Lunes y Martes de Carnaval', type: 'Feriado Nacional' },
    { id: 'h7', date: '2027-03-25', name: 'Jueves y Viernes Santo (Semana Santa)', type: 'Feriado Nacional' },
    { id: 'h8', date: '2027-04-19', name: 'Declaración de la Independencia de Venezuela', type: 'Feriado Nacional' },
    { id: 'h9', date: '2027-05-01', name: 'Día Internacional del Trabajador', type: 'Feriado Nacional' },
    { id: 'h10', date: '2027-06-24', name: 'Batalla de Carabobo', type: 'Feriado Nacional' },
    { id: 'h11', date: '2027-07-05', name: 'Día de la Independencia de Venezuela', type: 'Feriado Nacional' }
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 60;

// ============================================================================
// 2. MOTOR FIREBASE AUTH + FIRESTORE (CON RESPALDO LOCAL AUTOMÁTICO)
// ============================================================================
let db = null;
let auth = null;
let isFirebaseReady = false;
let unsubscribeFirestore = null;

function initFirebase() {
    try {
        const cfg = window.CONFIG?.FIREBASE_CONFIG;
        if (window.firebase && cfg && cfg.apiKey && !cfg.apiKey.includes('TU_FIREBASE')) {
            if (!firebase.apps.length) {
                firebase.initializeApp(cfg);
            }
            auth = firebase.auth();
            db = firebase.firestore();
            isFirebaseReady = true;
        }
    } catch (e) {
        console.warn('Modo Local activo (configura FIREBASE_CONFIG en config.js para Cloud Sync):', e);
    }
}

initFirebase();

let currentUser = JSON.parse(localStorage.getItem('unisync_current_user')) || null;
let activeSemester = parseInt(localStorage.getItem('unisync_active_semester') || '1', 10);

let tasks = [];
let classBlocks = [];
let scheduleBlocks = [];
let notes = [];
let holidays = [];
let pomodorosCompleted = 0;

function getUserDocId() {
    return currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_') : 'default_user';
}

function getUserPrefix() {
    return `unisync_${getUserDocId()}_`;
}

function loadUserData() {
    const prefix = getUserPrefix();
    tasks = JSON.parse(localStorage.getItem(prefix + 'tasks')) || DEFAULT_TASKS;
    classBlocks = JSON.parse(localStorage.getItem(prefix + 'classes')) || DEFAULT_CLASSES;
    scheduleBlocks = JSON.parse(localStorage.getItem(prefix + 'schedule')) || [];
    notes = JSON.parse(localStorage.getItem(prefix + 'notes')) || DEFAULT_NOTES;
    holidays = JSON.parse(localStorage.getItem(prefix + 'holidays')) || DEFAULT_HOLIDAYS_VE_UC;
    pomodorosCompleted = parseInt(localStorage.getItem(prefix + 'pomos') || '0', 10);

    // Suscripción en tiempo real a Firestore si Firebase está configurado
    if (isFirebaseReady && db && currentUser) {
        if (unsubscribeFirestore) unsubscribeFirestore();
        unsubscribeFirestore = db.collection('unisync_users').doc(getUserDocId())
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const cloud = doc.data();
                    if (cloud.tasks) tasks = cloud.tasks;
                    if (cloud.classBlocks) classBlocks = cloud.classBlocks;
                    if (cloud.scheduleBlocks) scheduleBlocks = cloud.scheduleBlocks;
                    if (cloud.notes) notes = cloud.notes;
                    if (cloud.holidays) holidays = cloud.holidays;
                    if (typeof cloud.pomodorosCompleted === 'number') pomodorosCompleted = cloud.pomodorosCompleted;
                    saveLocalCacheOnly();
                    renderAll();
                } else {
                    saveData();
                }
            });
    }

    if (scheduleBlocks.length === 0 && tasks.length > 0) {
        generateSmartSchedule(false);
    }
    updateUserUI();
    renderAll();
}

function saveLocalCacheOnly() {
    const prefix = getUserPrefix();
    localStorage.setItem(prefix + 'tasks', JSON.stringify(tasks));
    localStorage.setItem(prefix + 'classes', JSON.stringify(classBlocks));
    localStorage.setItem(prefix + 'schedule', JSON.stringify(scheduleBlocks));
    localStorage.setItem(prefix + 'notes', JSON.stringify(notes));
    localStorage.setItem(prefix + 'holidays', JSON.stringify(holidays));
    localStorage.setItem(prefix + 'pomos', pomodorosCompleted.toString());
}

function saveData() {
    saveLocalCacheOnly();
    if (isFirebaseReady && db && currentUser) {
        db.collection('unisync_users').doc(getUserDocId()).set({
            profile: currentUser,
            tasks,
            classBlocks,
            scheduleBlocks,
            notes,
            holidays,
            pomodorosCompleted,
            updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Sync pendiente:', err));
    }
    renderAll();
}

// --- AUTENTICACIÓN ---
function checkAuthGate() {
    const screen = document.getElementById('auth-screen');
    if (currentUser) {
        screen.classList.add('hidden');
        loadUserData();
    } else {
        screen.classList.remove('hidden');
    }
}

async function loginWithFirebaseGoogle() {
    if (isFirebaseReady && auth) {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            currentUser = {
                name: user.displayName || 'Estudiante UC',
                email: user.email,
                initial: (user.displayName || 'U').charAt(0).toUpperCase(),
                uid: user.uid
            };
            localStorage.setItem('unisync_current_user', JSON.stringify(currentUser));
            checkAuthGate();
            return;
        } catch (err) {
            alert('Aviso de Firebase Auth: ' + err.message + '. Iniciando con perfil directo.');
        }
    }
    loginWithCustomProfile();
}

function loginWithCustomProfile(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const email = document.getElementById('login-email').value.trim();
    if (!name || !email) return;

    currentUser = { name, email, initial: name.charAt(0).toUpperCase() };
    localStorage.setItem('unisync_current_user', JSON.stringify(currentUser));
    checkAuthGate();
}

function logoutUser() {
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (isFirebaseReady && auth) auth.signOut();
    localStorage.removeItem('unisync_current_user');
    currentUser = null;
    checkAuthGate();
}

function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('nav-user-name').textContent = currentUser.name;
    document.getElementById('nav-user-avatar').textContent = currentUser.initial;
    document.getElementById('settings-user-name').textContent = currentUser.name;
    document.getElementById('settings-user-email').textContent = currentUser.email;
    document.getElementById('settings-user-avatar').textContent = currentUser.initial;

    const syncStatus = document.getElementById('settings-cloud-status');
    if (syncStatus) {
        syncStatus.textContent = isFirebaseReady ? 'Conectado a Firebase Cloud' : 'Guardado Local (Multi-perfil)';
    }
}

// ============================================================================
// 3. GESTIÓN DE SEMESTRES (1er Y 2º SEMESTRE UC) Y FESTIVOS DE VENEZUELA
// ============================================================================
function changeActiveSemester(semValue) {
    activeSemester = parseInt(semValue, 10);
    localStorage.setItem('unisync_active_semester', activeSemester.toString());

    document.getElementById('header-semester-select').value = activeSemester.toString();
    document.getElementById('settings-semester-select').value = activeSemester.toString();

    const label = activeSemester === 1 ? '1er Semestre' : '2º Semestre';
    document.getElementById('dash-semester-label').textContent = label;
    document.getElementById('schedule-semester-pill').textContent = `${label.toLowerCase()} • semana activa`;

    document.getElementById('badge-sem-1').classList.toggle('hidden', activeSemester !== 1);
    document.getElementById('badge-sem-2').classList.toggle('hidden', activeSemester !== 2);

    generateSmartSchedule(false);
    renderAll();
}

function openHolidaysModal() {
    const modal = document.getElementById('holidays-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderHolidays();
}

function closeHolidaysModal() {
    const modal = document.getElementById('holidays-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function addCustomHoliday(e) {
    e.preventDefault();
    const date = document.getElementById('holiday-date').value;
    const name = document.getElementById('holiday-name').value.trim();
    if (!date || !name) return;

    holidays.push({ id: 'h_' + Date.now(), date, name, type: 'Asueto UC' });
    document.getElementById('holiday-date').value = '';
    document.getElementById('holiday-name').value = '';
    saveData();
    renderHolidays();
}

function deleteHoliday(id) {
    holidays = holidays.filter(h => h.id !== id);
    saveData();
    renderHolidays();
}

function renderHolidays() {
    const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
    const container = document.getElementById('holidays-list-container');
    const preview = document.getElementById('dashboard-holidays-preview');
    const countEl = document.getElementById('settings-holidays-count');

    if (countEl) countEl.textContent = `${holidays.length} feriados ›`;

    if (container) {
        container.innerHTML = sorted.map(h => `
      <div class="bg-[#0b0d13] border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
        <div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">${h.type}</span>
          <h4 class="text-xs font-bold text-white mt-1">${h.name}</h4>
          <p class="text-[11px] text-slate-400 font-mono">${h.date}</p>
        </div>
        <button onclick="deleteHoliday('${h.id}')" class="text-slate-500 hover:text-rose-400 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    `).join('');
    }

    if (preview) {
        preview.innerHTML = sorted.slice(0, 3).map(h => `
      <div class="bg-[#181c28] border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
        <span class="font-medium text-slate-200 truncate pr-2">${h.name}</span>
        <span class="font-mono text-[11px] text-amber-400 shrink-0">${h.date}</span>
      </div>
    `).join('');
    }
    if (window.lucide) lucide.createIcons();
}

// ============================================================================
// 4. PESTAÑA DE APUNTES Y FÓRMULAS (CON GENERADOR IA)
// ============================================================================
function saveNote(e) {
    if (e) e.preventDefault();
    const subject = document.getElementById('note-subject').value;
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    if (!title || !content) return;

    notes.unshift({
        id: 'n_' + Date.now(),
        subject,
        title,
        content,
        date: new Date().toISOString().slice(0, 10)
    });

    document.getElementById('note-form').reset();
    saveData();
}

function deleteNote(id) {
    notes = notes.filter(n => n.id !== id);
    saveData();
}

function saveChatReplyToNotes(encodedText) {
    const content = decodeURIComponent(encodedText);
    const title = prompt('Título para guardar este resumen en tus Apuntes:', 'Resumen IA de Estudio');
    if (!title) return;

    const subject = prompt('¿A qué materia pertenece? (Matemática I, Microeconomía I, Principios de Computación, Formación Integral):', 'Matemática I') || 'Matemática I';
    notes.unshift({
        id: 'n_' + Date.now(),
        subject,
        title,
        content,
        date: new Date().toISOString().slice(0, 10)
    });
    saveData();
    switchTab('notes');
}

async function generateAINoteSummary() {
    const subject = document.getElementById('note-subject').value;
    const topic = document.getElementById('note-title').value.trim() || prompt(`¿Sobre qué tema de ${subject} quieres que la IA redacte el apunte?`);
    if (!topic) return;

    document.getElementById('note-title').value = topic;
    const contentArea = document.getElementById('note-content');
    contentArea.value = 'Generando ficha de estudio y fórmulas con Gemini 2.5 Flash...';

    try {
        const reply = await callGeminiAPI([{
            text: `Redacta un apunte universitario conciso, claro y esquematizado sobre "${topic}" para la asignatura ${subject}. Incluye fórmulas clave, definiciones puntuales y un ejemplo breve.`
        }]);
        contentArea.value = reply;
    } catch (err) {
        contentArea.value = 'Error al generar apunte: ' + err.message;
    }
}

function renderNotes() {
    const filter = document.getElementById('notes-filter-subject')?.value || 'ALL';
    const grid = document.getElementById('notes-grid');
    if (!grid) return;

    const filtered = filter === 'ALL' ? notes : notes.filter(n => n.subject === filter);
    grid.innerHTML = filtered.length === 0
        ? `<p class="text-xs text-slate-500 col-span-2 py-8 text-center">No hay apuntes en esta categoría todavía.</p>`
        : filtered.map(n => `
      <div class="bg-[#181c28] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">${n.subject}</span>
            <span class="text-[10px] text-slate-500 font-mono">${n.date}</span>
          </div>
          <h4 class="text-sm font-bold text-white mt-2">${n.title}</h4>
          <p class="text-xs text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto custom-scrollbar">${n.content}</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
          <button onclick="askTutorAboutTask('${n.subject}', '${n.title.replace(/'/g, "\\'")}')" class="text-[11px] text-indigo-400 hover:underline flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3 h-3"></i> Practicar tema
          </button>
          <button onclick="deleteNote('${n.id}')" class="text-slate-500 hover:text-rose-400 p-1">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('');
}

// ============================================================================
// 5. UTILIDADES, HORARIO SMART Y GEMINI 2.5 FLASH
// ============================================================================
function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
}

function minutesToTime(mins) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(Math.round(mins % 60)).padStart(2, '0');
    return `${h}:${m}`;
}

function overlaps(s1, e1, s2, e2) {
    return Math.max(s1, s2) < Math.min(e1, e2);
}

function switchTab(tab) {
    ['dashboard', 'tasks', 'schedule', 'notes', 'settings'].forEach(t => {
        document.getElementById(`view-${t}`)?.classList.add('hidden');
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('text-slate-400');
        }
    });

    document.getElementById(`view-${tab}`)?.classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white');
        activeBtn.classList.remove('text-slate-400');
    }
}

function addTask(e) {
    e.preventDefault();
    const subject = document.getElementById('task-subject').value;
    const title = document.getElementById('task-title').value.trim();
    const date = document.getElementById('task-date').value;
    const hours = parseInt(document.getElementById('task-hours').value, 10);
    const priority = document.getElementById('task-priority').value;
    if (!title || !date) return;

    tasks.push({ id: Date.now().toString(), semester: activeSemester, subject, title, date, hours, priority });
    document.getElementById('task-form').reset();
    document.getElementById('task-hours').value = 3;
    generateSmartSchedule(false);
    saveData();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    generateSmartSchedule(false);
    saveData();
}

function askTutorAboutTask(subject, title) {
    toggleChat(true);
    quickPrompt(`Tengo la evaluación de ${subject}: "${title}". Créame una ruta de estudio breve aplicando Active Recall y hazme 2 preguntas tipo parcial.`);
}

function generateSmartSchedule(switchView = true) {
    scheduleBlocks = [];
    const candidateSlots = [
        { start: '08:30', end: '10:00' },
        { start: '10:30', end: '12:00' },
        { start: '16:00', end: '17:30' },
        { start: '18:00', end: '19:30' }
    ];

    const semClasses = classBlocks.filter(c => (c.semester || 1) === activeSemester);
    const semTasks = tasks.filter(t => (t.semester || 1) === activeSemester)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    semTasks.forEach(task => {
        let remainingHours = Number(task.hours);
        for (let s = 0; s < candidateSlots.length && remainingHours > 0; s++) {
            for (let d = 0; d < 6 && remainingHours > 0; d++) {
                const day = DAYS[d];
                const slot = candidateSlots[s];
                const sMin = timeToMinutes(slot.start);
                const eMin = timeToMinutes(slot.end);

                const hasClassConflict = semClasses.some(c => c.day === day && overlaps(sMin, eMin, timeToMinutes(c.start), timeToMinutes(c.end)));
                const hasLunchConflict = overlaps(sMin, eMin, timeToMinutes('14:30'), timeToMinutes('15:30'));
                const hasStudyConflict = scheduleBlocks.some(b => b.day === day && overlaps(sMin, eMin, timeToMinutes(b.start), timeToMinutes(b.end)));

                if (!hasClassConflict && !hasLunchConflict && !hasStudyConflict) {
                    const duration = remainingHours >= 1.5 ? 1.5 : 1;
                    const endCalc = minutesToTime(sMin + duration * 60);
                    scheduleBlocks.push({
                        id: 'st_' + Date.now() + '_' + Math.random(),
                        semester: activeSemester,
                        day,
                        start: slot.start,
                        end: endCalc,
                        subject: task.subject,
                        title: task.title,
                        duration: `${duration}h`
                    });
                    remainingHours -= duration;
                }
            }
        }
    });

    saveData();
    if (switchView) switchTab('schedule');
}

function openClassModal(classId = null, defaultDay = 'Lunes', defaultStart = '08:00', defaultSem = null) {
    const modal = document.getElementById('class-modal');
    const delBtn = document.getElementById('btn-delete-class');
    document.getElementById('class-form').reset();

    if (classId) {
        const item = classBlocks.find(c => c.id === classId);
        if (!item) return;
        document.getElementById('class-id').value = item.id;
        document.getElementById('class-semester').value = (item.semester || 1).toString();
        document.getElementById('class-code').value = item.code || '';
        document.getElementById('class-subject').value = item.subject || '';
        document.getElementById('class-day').value = item.day || 'Lunes';
        document.getElementById('class-room').value = item.room || '';
        document.getElementById('class-start').value = item.start || '08:00';
        document.getElementById('class-end').value = item.end || '10:00';
        document.getElementById('class-color').value = item.color || 'blue';
        delBtn.classList.remove('hidden');
    } else {
        document.getElementById('class-id').value = '';
        document.getElementById('class-semester').value = (defaultSem || activeSemester).toString();
        document.getElementById('class-day').value = defaultDay;
        document.getElementById('class-start').value = defaultStart;
        document.getElementById('class-end').value = minutesToTime(timeToMinutes(defaultStart) + 120);
        delBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeClassModal() {
    const modal = document.getElementById('class-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function saveClassBlock(e) {
    e.preventDefault();
    const id = document.getElementById('class-id').value;
    const newBlock = {
        id: id || 'c_' + Date.now(),
        semester: parseInt(document.getElementById('class-semester').value, 10) || activeSemester,
        code: document.getElementById('class-code').value.trim().toUpperCase(),
        subject: document.getElementById('class-subject').value.trim(),
        day: document.getElementById('class-day').value,
        room: document.getElementById('class-room').value.trim(),
        start: document.getElementById('class-start').value,
        end: document.getElementById('class-end').value,
        color: document.getElementById('class-color').value
    };

    if (id) {
        classBlocks = classBlocks.map(c => c.id === id ? newBlock : c);
    } else {
        classBlocks.push(newBlock);
    }

    closeClassModal();
    generateSmartSchedule(false);
    saveData();
}

function deleteCurrentClass() {
    const id = document.getElementById('class-id').value;
    if (!id) return;
    classBlocks = classBlocks.filter(c => c.id !== id);
    closeClassModal();
    generateSmartSchedule(false);
    saveData();
}

function shareSchedule() {
    const semClasses = classBlocks.filter(c => (c.semester || 1) === activeSemester);
    navigator.clipboard?.writeText(JSON.stringify(semClasses));
    alert(`¡Horario del ${activeSemester}º Semestre copiado al portapapeles!`);
}

// --- CONEXIÓN GEMINI 2.5 FLASH ---
function getActiveApiKey() {
    const cfgKey = window.CONFIG?.GEMINI_API_KEY;
    if (cfgKey && cfgKey !== 'TU_API_KEY_DE_GEMINI_AQUI' && cfgKey !== 'tu_clave') {
        return cfgKey.trim();
    }
    return (localStorage.getItem('unisync_gemini_key') || '').trim();
}

async function callGeminiAPI(partsArray) {
    const apiKey = getActiveApiKey();
    // Modelos actualizados y vigentes según la directiva de la API
    const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            if (!apiKey) throw new Error('Configura tu API Key en config.js o en el ícono de la llave 🔑.');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: partsArray }] })
            });
            const data = await response.json();
            if (data.error) {
                lastError = data.error.message;
                continue;
            }
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta.';
        } catch (err) {
            lastError = err.message;
        }
    }
    throw new Error(lastError || 'No se pudo conectar con Gemini.');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function importScheduleFromImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!getActiveApiKey()) {
        configureApiKey();
        if (!getActiveApiKey()) {
            event.target.value = '';
            return;
        }
    }

    const btn = document.getElementById('btn-scan-schedule');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Analizando...`;
    btn.disabled = true;

    try {
        const base64Data = await fileToBase64(file);
        const promptVision = `Extrae todas las materias de este horario universitario. Devuelve ÚNICAMENTE un arreglo JSON válido sin markdown:
[{"code":"MAT","subject":"Matemática I","room":"Aula 1212","day":"Lunes","start":"10:25","end":"13:30","color":"blue"}]`;

        let rawText = await callGeminiAPI([
            { text: promptVision },
            { inline_data: { mime_type: file.type || 'image/png', data: base64Data } }
        ]);

        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedClasses = JSON.parse(rawText);

        if (Array.isArray(parsedClasses) && parsedClasses.length > 0) {
            // Reemplaza las clases del semestre activo con las detectadas
            const otherSemClasses = classBlocks.filter(c => (c.semester || 1) !== activeSemester);
            const imported = parsedClasses.map((c, idx) => ({
                id: 'ai_' + Date.now() + '_' + idx,
                semester: activeSemester,
                code: c.code || 'MAT',
                subject: c.subject || 'Materia',
                room: c.room || '',
                day: DAYS.includes(c.day) ? c.day : 'Lunes',
                start: c.start || '08:00',
                end: c.end || '10:00',
                color: ['blue', 'teal', 'purple', 'rose', 'amber'].includes(c.color) ? c.color : 'blue'
            }));
            classBlocks = [...otherSemClasses, ...imported];
            generateSmartSchedule(false);
            saveData();
            switchTab('schedule');
            alert(`¡Se acoplaron ${imported.length} materias al ${activeSemester}º Semestre!`);
        }
    } catch (err) {
        alert('Error al leer imagen: ' + err.message);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        event.target.value = '';
        if (window.lucide) lucide.createIcons();
    }
}

// --- RENDERIZADO GENERAL ---
function renderScheduleCalendar() {
    const headerEl = document.getElementById('calendar-header');
    const bodyEl = document.getElementById('calendar-body');
    if (!headerEl || !bodyEl) return;

    const semClasses = classBlocks.filter(c => (c.semester || 1) === activeSemester);

    let totalClassMins = 0;
    semClasses.forEach(c => { totalClassMins += Math.max(0, timeToMinutes(c.end) - timeToMinutes(c.start)); });
    document.getElementById('stat-class-hours').textContent = `● Clase ${Math.floor(totalClassMins / 60)}h ${totalClassMins % 60}m`;

    let totalStudyMins = 0;
    scheduleBlocks.forEach(b => { totalStudyMins += Math.max(0, timeToMinutes(b.end) - timeToMinutes(b.start)); });
    document.getElementById('stat-study-hours').textContent = `✦ Estudio IA ${(totalStudyMins / 60).toFixed(1)}h`;

    headerEl.innerHTML = `<div class="p-3 border-r border-slate-800 text-[11px] text-slate-500 font-mono"></div>` +
        DAYS.map((day, idx) => {
            const dayMins = semClasses.filter(c => c.day === day)
                .reduce((acc, c) => acc + Math.max(0, timeToMinutes(c.end) - timeToMinutes(c.start)), 0);
            const freeMins = Math.max(0, (13 * 60) - dayMins);
            return `
        <div class="p-3 border-r border-slate-800 last:border-r-0">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold uppercase text-slate-300">${day.slice(0, 3)}</span>
            <span class="text-sm font-extrabold ${idx === 2 ? 'bg-orange-600 text-white px-2 py-0.5 rounded-full' : 'text-white'}">${26 + idx <= 31 ? 26 + idx : (26 + idx) - 31}</span>
          </div>
          <p class="text-[11px] text-slate-500 mt-0.5">${Math.floor(freeMins / 60)}h ${freeMins % 60}m libres</p>
        </div>
      `;
        }).join('');

    let hoursColumnHTML = `<div class="border-r border-slate-800 relative select-none">`;
    for (let h = START_HOUR; h < END_HOUR; h++) {
        hoursColumnHTML += `<div style="top: ${(h - START_HOUR) * HOUR_HEIGHT}px; height: ${HOUR_HEIGHT}px;" class="absolute inset-x-0 border-b border-slate-800/50 pr-2 pt-1 text-right text-[11px] font-mono text-slate-500">${h}:00</div>`;
    }
    hoursColumnHTML += `</div>`;

    const colorMap = {
        blue: 'bg-[#17253b] border-blue-500/60 text-blue-100',
        teal: 'bg-[#113038] border-teal-500/60 text-teal-100',
        purple: 'bg-[#251838] border-purple-500/60 text-purple-100',
        rose: 'bg-[#361627] border-rose-500/60 text-rose-100',
        amber: 'bg-amber-950/90 border-amber-500/60 text-amber-100'
    };

    const daysColumnsHTML = DAYS.map(day => {
        let gridLines = '';
        for (let h = START_HOUR; h < END_HOUR; h++) {
            const hourStr = String(h).padStart(2, '0') + ':00';
            gridLines += `<div onclick="openClassModal(null, '${day}', '${hourStr}', ${activeSemester})" style="top: ${(h - START_HOUR) * HOUR_HEIGHT}px; height: ${HOUR_HEIGHT}px;" class="absolute inset-x-0 border-b border-slate-800/40 hover:bg-slate-800/20 cursor-pointer"></div>`;
        }

        const lunchTop = ((timeToMinutes('14:30') - START_HOUR * 60) / 60) * HOUR_HEIGHT;
        const lunchBlock = `<div style="top: ${lunchTop}px; height: 48px;" class="absolute inset-x-1.5 rounded-xl bg-[#26201d] border border-amber-900/40 px-2.5 flex items-center justify-between text-[11px] text-stone-300 pointer-events-none z-10"><span>🍽️ Comer</span><span class="font-mono text-[10px] text-stone-400">14:30</span></div>`;

        const dayClasses = semClasses.filter(c => c.day === day).map(c => {
            const startMin = timeToMinutes(c.start);
            const endMin = timeToMinutes(c.end);
            const topPx = Math.max(0, ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT);
            const heightPx = Math.max(38, ((endMin - startMin) / 60) * HOUR_HEIGHT);
            return `
        <div onclick="event.stopPropagation(); openClassModal('${c.id}')" style="top: ${topPx}px; height: ${heightPx}px;" class="absolute inset-x-1.5 rounded-xl border-l-4 border ${colorMap[c.color] || colorMap.blue} p-2.5 shadow-md cursor-pointer z-20 overflow-hidden">
          <p class="text-xs font-bold leading-tight">${c.code ? c.code + ' • ' : ''}${c.subject}</p>
          <p class="text-[11px] opacity-80 mt-0.5">${c.room || ''}</p>
        </div>`;
        }).join('');

        const dayStudies = scheduleBlocks.filter(b => b.day === day).map(b => {
            const startMin = timeToMinutes(b.start);
            const endMin = timeToMinutes(b.end);
            const topPx = Math.max(0, ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT);
            const heightPx = Math.max(40, ((endMin - startMin) / 60) * HOUR_HEIGHT);
            return `
        <div style="top: ${topPx}px; height: ${heightPx}px;" class="absolute inset-x-1.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/30 p-2 text-emerald-200 z-10 overflow-hidden pointer-events-none">
          <div class="flex justify-between text-[10px] font-mono text-emerald-400"><span>✦ Estudio</span><span>${b.start}</span></div>
          <p class="text-[11px] font-bold text-white truncate">${b.subject}</p>
        </div>`;
        }).join('');

        return `<div class="relative border-r border-slate-800 last:border-r-0 h-full">${gridLines}${lunchBlock}${dayStudies}${dayClasses}</div>`;
    }).join('');

    bodyEl.innerHTML = hoursColumnHTML + daysColumnsHTML;
}

function renderSettingsList() {
    const sem1El = document.getElementById('settings-classes-sem1');
    const sem2El = document.getElementById('settings-classes-sem2');
    const countEl = document.getElementById('settings-subjects-count');
    if (!sem1El || !sem2El) return;

    const activeList = classBlocks.filter(c => (c.semester || 1) === activeSemester);
    if (countEl) countEl.textContent = `${activeList.length} asignaturas ›`;

    const barColors = { blue: 'bg-blue-500', teal: 'bg-teal-400', purple: 'bg-purple-500', rose: 'bg-rose-500', amber: 'bg-amber-500' };
    const pillColors = {
        blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        teal: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    };

    const renderGroup = (semNum) => {
        const items = classBlocks.filter(c => (c.semester || 1) === semNum);
        return items.map(c => `
      <div onclick="openClassModal('${c.id}')" class="p-3.5 flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition">
        <div class="flex items-center gap-3.5">
          <div class="w-1 h-9 rounded-full ${barColors[c.color] || 'bg-blue-500'}"></div>
          <div>
            <h4 class="text-xs font-bold text-white">${c.subject}</h4>
            <p class="text-[11px] text-slate-400">${c.day.slice(0, 3).toLowerCase()} ${c.start} • ${c.room || 'FAC'}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${pillColors[c.color] || pillColors.blue}">${c.code}</span>
          <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500"></i>
        </div>
      </div>
    `).join('');
    };

    sem1El.innerHTML = renderGroup(1);
    sem2El.innerHTML = renderGroup(2);
}

function renderAll() {
    const semTasks = tasks.filter(t => (t.semester || 1) === activeSemester);
    document.getElementById('stat-pending').textContent = semTasks.length;
    const totalHours = semTasks.reduce((acc, t) => acc + Number(t.hours), 0);
    document.getElementById('stat-hours').textContent = `${totalHours}h`;
    document.getElementById('stat-notes').textContent = notes.length;
    document.getElementById('stat-blocks').textContent = scheduleBlocks.length;

    const badgeColor = (p) => p === 'Alta' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

    const sorted = [...semTasks].sort((a, b) => new Date(a.date) - new Date(b.date));
    const htmlList = sorted.length === 0
        ? `<p class="text-xs text-slate-500 py-6 text-center">No hay evaluaciones registradas en este semestre.</p>`
        : sorted.map(t => `
      <div class="bg-[#181c28] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-indigo-400 uppercase">${t.subject}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full border ${badgeColor(t.priority)}">${t.priority}</span>
          </div>
          <h4 class="font-semibold text-white text-sm mt-1">${t.title}</h4>
          <p class="text-xs text-slate-400 mt-1">Entrega: <b>${t.date}</b> • Estudio requerido: <b>${t.hours}h</b></p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="askTutorAboutTask('${t.subject}', '${t.title.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Estudiar IA
          </button>
          <button onclick="deleteTask('${t.id}')" class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('');

    document.getElementById('dashboard-tasks-list').innerHTML = htmlList;
    document.getElementById('full-tasks-list').innerHTML = htmlList;

    renderScheduleCalendar();
    renderSettingsList();
    renderNotes();
    renderHolidays();

    if (window.lucide) lucide.createIcons();
}

// --- POMODORO ---
let pomoSeconds = 25 * 60;
let pomoInterval = null;

function togglePomodoro() {
    const btn = document.getElementById('pomo-btn');
    if (pomoInterval) {
        clearInterval(pomoInterval);
        pomoInterval = null;
        btn.textContent = 'Reanudar';
    } else {
        btn.textContent = 'Pausar';
        pomoInterval = setInterval(() => {
            if (pomoSeconds > 0) {
                pomoSeconds--;
                const m = String(Math.floor(pomoSeconds / 60)).padStart(2, '0');
                const s = String(pomoSeconds % 60).padStart(2, '0');
                document.getElementById('pomo-timer').textContent = `${m}:${s}`;
            } else {
                clearInterval(pomoInterval);
                pomoInterval = null;
                pomodorosCompleted++;
                pomoSeconds = 25 * 60;
                saveData();
            }
        }, 1000);
    }
}

// --- CHAT TUTOR IA (CON BOTÓN PARA GUARDAR RESPUESTA EN APUNTES) ---
function toggleChat(forceState) {
    const panel = document.getElementById('ai-chat-panel');
    panel.classList.toggle('hidden', typeof forceState === 'boolean' ? !forceState : undefined);
}

function configureApiKey() {
    const current = getActiveApiKey();
    const key = prompt('Ingresa tu API Key de Google AI Studio:', current);
    if (key !== null) {
        localStorage.setItem('unisync_gemini_key', key.trim());
        alert('API Key actualizada.');
    }
}

function appendMessage(text, sender = 'ai') {
    const container = document.getElementById('chat-messages');
    const wrapper = document.createElement('div');
    if (sender === 'user') {
        wrapper.className = 'bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] ml-auto text-xs leading-relaxed';
        wrapper.textContent = text;
    } else {
        wrapper.className = 'bg-slate-800/90 border border-slate-700/60 text-slate-200 p-3 rounded-2xl rounded-tl-none max-w-[88%] text-xs leading-relaxed space-y-2';
        const textEl = document.createElement('div');
        textEl.className = 'whitespace-pre-wrap';
        textEl.textContent = text;
        wrapper.appendChild(textEl);
    }
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
    return wrapper;
}

function quickPrompt(promptText) {
    document.getElementById('chat-input').value = promptText;
    sendChatMessage(new Event('submit'));
}

async function sendChatMessage(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('chat-input');
    const userText = input.value.trim();
    if (!userText) return;

    if (!getActiveApiKey()) {
        configureApiKey();
        if (!getActiveApiKey()) return;
    }

    input.value = '';
    appendMessage(userText, 'user');
    const loadingWrapper = appendMessage('Analizando con Gemini 2.5 Flash...', 'ai');

    const semClasses = classBlocks.filter(c => (c.semester || 1) === activeSemester);
    const classSummary = semClasses.map(c => `${c.subject} (${c.day} ${c.start})`).join(', ');
    const systemContext = `Eres el Tutor IA Universitario de ${currentUser?.name || 'el estudiante'} en la Universidad de Carabobo (Economía).
Asignaturas del semestre actual: ${classSummary}.
Explica paso a paso, aplica Active Recall y finaliza con 1 pregunta práctica.`;

    try {
        const reply = await callGeminiAPI([{ text: `${systemContext}\n\nPregunta: ${userText}` }]);
        const encoded = encodeURIComponent(reply);
        loadingWrapper.innerHTML = `
      <div class="whitespace-pre-wrap">${reply.replace(/</g, '&lt;')}</div>
      <div class="pt-2 border-t border-slate-700/60 flex justify-end">
        <button onclick="saveChatReplyToNotes('${encoded}')" class="text-[11px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition">
          + Guardar en Apuntes
        </button>
      </div>
    `;
    } catch (err) {
        loadingWrapper.textContent = `Error: ${err.message}`;
    }
}

Object.assign(window, {
    loginWithFirebaseGoogle,
    loginWithCustomProfile,
    logoutUser,
    changeActiveSemester,
    openHolidaysModal,
    closeHolidaysModal,
    addCustomHoliday,
    deleteHoliday,
    saveNote,
    deleteNote,
    saveChatReplyToNotes,
    generateAINoteSummary,
    renderNotes,
    switchTab,
    addTask,
    deleteTask,
    askTutorAboutTask,
    generateSmartSchedule,
    openClassModal,
    closeClassModal,
    saveClassBlock,
    deleteCurrentClass,
    shareSchedule,
    importScheduleFromImage,
    togglePomodoro,
    toggleChat,
    configureApiKey,
    quickPrompt,
    sendChatMessage
});

checkAuthGate();