// Initialize Supabase (Replace with actual keys for production)
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Check if the global 'supabase' object exists from the CDN
const supabaseClient = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!supabaseClient) {
    console.warn("Supabase client not initialized. Check CDN or API Keys.");
}

// --- State Management ---
const state = {
    roomId: null,
    myName: null,
    partnerName: null, // The other person's name (for display)
    targetMessage: null, // The message to reveal
    charge: 0,
    isPremium: false,
    channel: null,
    isSender: false // Track if I am the creator
};

// --- DOM Elements ---
const els = {
    app: document.getElementById('app'),
    setupFlow: document.getElementById('setupFlow'),
    
    // Panels
    creatorPanel: document.getElementById('creatorPanel'),
    sharePanel: document.getElementById('sharePanel'),
    receiverPanel: document.getElementById('receiverPanel'),
    gameArea: document.getElementById('gameArea'),

    // Creator Inputs
    valentineNameInput: document.getElementById('valentineNameInput'),
    senderNameInput: document.getElementById('senderNameInput'),
    secretMessageInput: document.getElementById('secretMessageInput'),
    
    // Share Inputs
    shareLinkInput: document.getElementById('shareLinkInput'),
    
    // Receiver Display
    recvValentineName: document.getElementById('recvValentineName'),
    recvSenderName: document.getElementById('recvSenderName'),

    // Buttons
    createBtn: document.getElementById('createBtn'),
    copyBtn: document.getElementById('copyBtn'),
    joinAsSenderBtn: document.getElementById('joinAsSenderBtn'),
    receiverJoinBtn: document.getElementById('receiverJoinBtn'),

    // Game Elements
    tapBtn: document.getElementById('tapBtn'),
    batteryLevel: document.getElementById('batteryLevel'),
    chargeText: document.getElementById('chargeText'),
    chargingIcon: document.getElementById('chargingIcon'),
    messageReveal: document.getElementById('messageReveal'),
    finalMessage: document.getElementById('finalMessage'),
    statusIndicator: document.getElementById('statusIndicator'),
    
    // Premium / Cert
    premiumBtn: document.getElementById('premiumBtn'),
    adBanner: document.getElementById('adBanner'),
    downloadCertBtn: document.getElementById('downloadCertBtn'),
    certName1: document.getElementById('certName1'),
    certName2: document.getElementById('certName2'),
    certificateTemplate: document.getElementById('certificateTemplate')
};

// --- Initialization ---
function init() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');

    if (room) {
        // Receiver Mode
        state.roomId = room;
        state.isSender = false;
        
        // Decode params
        const toName = params.get('to') || 'Valentine';
        const fromName = params.get('from') || 'Secret Admirer';
        const msgEnc = params.get('msg');
        
        state.myName = toName;
        state.partnerName = fromName;
        
        try {
            state.targetMessage = msgEnc ? decodeURIComponent(escape(atob(msgEnc))) : "Happy Valentine's Day!";
        } catch (e) {
            state.targetMessage = "Happy Valentine's Day!";
        }

        // Show Receiver Panel
        els.creatorPanel.classList.add('hidden');
        els.receiverPanel.classList.remove('hidden');
        
        els.recvValentineName.textContent = toName;
        els.recvSenderName.textContent = fromName;

    } else {
        // Sender Mode (Default)
        state.isSender = true;
        els.creatorPanel.classList.remove('hidden');
    }
}

// --- Logic: Creation Flow ---
els.createBtn.addEventListener('click', () => {
    console.log("Create Button Clicked");
    const valName = els.valentineNameInput.value.trim();
    const senderName = els.senderNameInput.value.trim();
    const msg = els.secretMessageInput.value.trim();

    if (!valName || !senderName || !msg) {
        return alert("Please fill in all fields to create your Valentine!");
    }

    // Generate Room ID and Link
    const roomId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const msgEnc = btoa(unescape(encodeURIComponent(msg)));
    
    // Safer baseUrl for local files
    const baseUrl = window.location.href.split('?')[0];
    const link = `${baseUrl}?room=${roomId}&to=${encodeURIComponent(valName)}&from=${encodeURIComponent(senderName)}&msg=${msgEnc}`;

    // Update State
    state.roomId = roomId;
    state.myName = senderName;
    state.partnerName = valName;
    state.targetMessage = "Your message will be revealed to " + valName;

    // Show Share Panel
    els.shareLinkInput.value = link;
    els.creatorPanel.classList.add('hidden');
    els.sharePanel.classList.remove('hidden');
});

els.copyBtn.addEventListener('click', () => {
    els.shareLinkInput.select();
    document.execCommand('copy');
    alert("Link copied! Send it to " + state.partnerName);
});

// --- Logic: Joining ---
els.joinAsSenderBtn.addEventListener('click', () => {
    enterGame();
});

els.receiverJoinBtn.addEventListener('click', () => {
    enterGame();
});

function enterGame() {
    els.setupFlow.classList.add('hidden');
    els.gameArea.classList.remove('hidden');
    els.gameArea.classList.add('flex');
    els.statusIndicator.classList.replace('bg-red-500', 'bg-yellow-500');

    setupRealtime();
}

// --- Realtime & Game ---
function setupRealtime() {
    if (!state.roomId || !supabaseClient) return;

    state.channel = supabaseClient.channel(`love-room-${state.roomId}`, {
        config: { broadcast: { self: true } }
    });

    state.channel
        .on('broadcast', { event: 'tap' }, (payload) => handleRemoteTap(payload))
        .on('broadcast', { event: 'premium_unlock' }, () => activatePremium())
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                els.statusIndicator.classList.replace('bg-yellow-500', 'bg-green-500');
            }
        });
}

// Reuse Particle Logic
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor(x, y, isGold) {
        this.x = x; this.y = y;
        this.size = Math.random() * 20 + 10;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * -3 - 3;
        this.color = isGold ? '#FFD700' : '#FF1493';
        this.life = 1.0; this.decay = Math.random() * 0.02 + 0.01;
        this.shape = Math.random() > 0.5 ? 'heart' : 'circle';
    }
    update() { this.x += this.speedX; this.y += this.speedY; this.life -= this.decay; this.size *= 0.95; }
    draw() {
        ctx.fillStyle = this.color; ctx.globalAlpha = this.life; ctx.beginPath();
        if (this.shape === 'heart') {
            const h = this.size * 0.3;
            ctx.moveTo(this.x, this.y + h);
            ctx.bezierCurveTo(this.x, this.y, this.x - this.size/2, this.y, this.x - this.size/2, this.y + h);
            ctx.bezierCurveTo(this.x - this.size/2, this.y + (this.size+h)/2, this.x, this.y + (this.size+h)/2 + this.size/2, this.x, this.y + this.size);
            ctx.bezierCurveTo(this.x, this.y + (this.size+h)/2 + this.size/2, this.x + this.size/2, this.y + (this.size+h)/2, this.x + this.size/2, this.y + h);
            ctx.bezierCurveTo(this.x + this.size/2, this.y, this.x, this.y, this.x, this.y + h);
        } else { ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2); }
        ctx.fill(); ctx.globalAlpha = 1.0;
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
        particles[i].update(); particles[i].draw();
        if (particles[i].life <= 0 || particles[i].size <= 0.5) { particles.splice(i, 1); i--; }
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

function emitParticles(amount = 5) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    for (let i = 0; i < amount; i++) particles.push(new Particle(centerX, centerY, state.isPremium));
}

// Tapping
els.tapBtn.addEventListener('click', () => {
    if (state.channel) {
        state.channel.send({ type: 'broadcast', event: 'tap', payload: { sender: state.myName } });
    }
    if (navigator.vibrate) navigator.vibrate(50);
});

function handleRemoteTap(payload) {
    if (state.charge < 100) {
        state.charge += 2;
        if (state.charge > 100) state.charge = 100;
        updateBatteryUI();
        emitParticles(state.isPremium ? 10 : 5);
        els.tapBtn.classList.add('scale-95');
        setTimeout(() => els.tapBtn.classList.remove('scale-95'), 100);
        els.chargingIcon.classList.remove('hidden');
        setTimeout(() => els.chargingIcon.classList.add('hidden'), 500);

        if (state.charge === 100) revealMessage();
    }
}

function updateBatteryUI() {
    els.batteryLevel.style.height = `${state.charge}%`;
    els.chargeText.textContent = `${state.charge}%`;
}

function revealMessage() {
    els.batteryContainer.classList.add('hidden');
    els.tapBtn.classList.add('hidden');
    els.messageReveal.classList.remove('hidden');
    
    // Display the message based on who is viewing
    if (state.isSender) {
        els.finalMessage.textContent = `Your message "${state.targetMessage.replace('Your message will be revealed to ' + state.partnerName, '...')}" has been revealed to ${state.partnerName}!`;
    } else {
        els.finalMessage.textContent = `"${state.targetMessage}"`;
    }
    
    if (state.isPremium) els.downloadCertBtn.classList.remove('hidden');
}

// Premium & Cert
els.premiumBtn.addEventListener('click', () => {
    if (confirm("Simulate Payment of KES 100 via Pesapal?")) {
        if (state.channel) {
            state.channel.send({ type: 'broadcast', event: 'premium_unlock', payload: {} });
        } else {
            // Local fallback if no realtime
            activatePremium();
        }
    }
});

function activatePremium() {
    state.isPremium = true;
    document.body.classList.add('gold-theme');
    els.premiumBtn.innerHTML = `<i data-lucide="check"></i> Premium Active`;
    els.premiumBtn.classList.add('bg-brand-gold', 'text-black', 'cursor-default');
    els.premiumBtn.disabled = true;
    els.adBanner.style.display = 'none';
    if (state.charge >= 100) els.downloadCertBtn.classList.remove('hidden');
    alert("Premium Unlocked! Gold Theme & Certificate enabled.");
}

els.downloadCertBtn.addEventListener('click', () => {
    // Determine names for certificate
    // If Sender: My Name & Partner Name
    // If Receiver: Partner Name (Sender) & My Name (Receiver)
    // Actually, usually certificates are "Romeo & Juliet". Order doesn't matter much, but let's try to be consistent.
    
    // state.partnerName is "The other person"
    // state.myName is "Me"
    
    els.certName1.textContent = state.myName;
    els.certName2.textContent = state.partnerName;
    
    const element = els.certificateTemplate;
    element.classList.remove('hidden');
    element.style.display = 'flex';
    const opt = { margin: 1, filename: 'Love-Certificate.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' } };
    html2pdf().set(opt).from(element).save().then(() => { element.style.display = 'none'; element.classList.add('hidden'); });
});

// Run Init
init();