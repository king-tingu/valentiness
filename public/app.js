// Initialize Supabase (Replace with actual keys for production)
const SUPABASE_URL = 'https://stcsccyjtvlamutmrnwl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Xwv_YP0mi_jzlb0Ir5gGbA_q0SfZ0tv';

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
    isSender: false, // Track if I am the creator
    myConsecutiveTaps: 0 // Track turn-taking
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
    jarLevel: document.getElementById('jarLevel'),
    jarContainer: document.getElementById('jarContainer'),
    chargeText: document.getElementById('chargeText'),
    chargingIcon: document.getElementById('chargingIcon'),
    messageReveal: document.getElementById('messageReveal'),
    finalMessage: document.getElementById('finalMessage'),
    statusIndicator: document.getElementById('statusIndicator'),
    soloWarning: document.getElementById('soloWarning'), // New warning toast
    
    // Premium / Cert
    premiumBtn: document.getElementById('premiumBtn'),
    adBanner: document.getElementById('adBanner'),
    downloadCertBtn: document.getElementById('downloadCertBtn'),
    certName1: document.getElementById('certName1'),
    certName2: document.getElementById('certName2'),
    certificateTemplate: document.getElementById('certificateTemplate')
};

// --- Initialization ---
async function init() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');

    // 1. Receiver / Direct Link Mode
    if (room) {
        state.roomId = room;
        state.isSender = false;
        
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

        els.creatorPanel.classList.add('hidden');
        els.receiverPanel.classList.remove('hidden');
        els.recvValentineName.textContent = toName;
        els.recvSenderName.textContent = fromName;

        // Check DB for Premium Status immediately
        if (supabaseClient) {
            const { data } = await supabaseClient.from('rooms').select('is_premium').eq('id', room).single();
            if (data && data.is_premium) activatePremium();
        }

    // 2. Sender / Homepage Mode
    } else {
        // Check LocalStorage for existing session
        const savedRoom = localStorage.getItem('bloom_room_id');
        const savedName = localStorage.getItem('bloom_my_name');
        
        if (savedRoom && savedName) {
            showRejoinPrompt(savedRoom, savedName);
        } else {
            state.isSender = true;
            els.creatorPanel.classList.remove('hidden');
        }
    }
}

function showRejoinPrompt(roomId, name) {
    els.creatorPanel.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-2xl font-bold">Welcome back, ${name}!</h2>
            <p class="text-gray-400">You have an active Valentine's Room.</p>
            <div class="flex flex-col gap-3">
                <button id="rejoinBtn" class="w-full bg-brand-pink text-white font-bold p-4 rounded-xl shadow-lg">
                    Rejoin Room
                </button>
                <button id="resetBtn" class="text-sm text-gray-500 underline">
                    Create New Valentine
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('rejoinBtn').addEventListener('click', () => {
        state.roomId = roomId;
        state.myName = name;
        state.isSender = true;
        // Fetch partner name from DB or just enter (visuals might be generic without DB fetch, but realtime will sync)
        enterGame();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        if(confirm("Abandon current room?")) {
            localStorage.clear();
            location.reload();
        }
    });
}

// --- Logic: Creation Flow ---
els.createBtn.addEventListener('click', async () => {
    console.log("Create Button Clicked");
    const valName = els.valentineNameInput.value.trim();
    const senderName = els.senderNameInput.value.trim();
    const msg = els.secretMessageInput.value.trim();

    if (!valName || !senderName || !msg) {
        return alert("Please fill in all fields to create your Valentine!");
    }

    // Generate Room ID
    const roomId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const msgEnc = btoa(unescape(encodeURIComponent(msg)));
    
    // Safer baseUrl for local files
    const baseUrl = window.location.href.split('?')[0];
    const link = `${baseUrl}?room=${roomId}&to=${encodeURIComponent(valName)}&from=${encodeURIComponent(senderName)}&msg=${msgEnc}`;

    // 1. SAVE TO DB (Crucial for Payments)
    if (supabaseClient) {
        const { error } = await supabaseClient.from('rooms').insert({
            id: roomId,
            partner_1_name: senderName,
            partner_2_name: valName,
            message: msg,
            is_premium: false
        });

        if (error) {
            console.error("DB Error:", error);
            alert("Warning: Could not save to database. Payments may not work. (Check Console)");
        }
    }

    // 2. SAVE TO LOCAL STORAGE (Remember Me)
    localStorage.setItem('bloom_room_id', roomId);
    localStorage.setItem('bloom_my_name', senderName);

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
        .on('broadcast', { event: 'sync_request' }, () => {
            // Someone joined! Send them our current charge so they are in sync
            state.channel.send({ type: 'broadcast', event: 'sync_response', payload: { charge: state.charge } });
        })
        .on('broadcast', { event: 'sync_response' }, (payload) => {
            // Received charge from someone already in the room
            if (payload.charge > state.charge) {
                state.charge = payload.charge;
                updateBatteryUI();
            }
        })
        .on('broadcast', { event: 'premium_unlock' }, () => activatePremium())
        .on('presence', { event: 'sync' }, () => updatePresence()) // Listen for joins/leaves
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                els.statusIndicator.classList.replace('bg-yellow-500', 'bg-green-500');
                // Track my presence in the room
                await state.channel.track({ user: state.myName, online_at: new Date().toISOString() });
                
                // Ask for current state from anyone already there
                state.channel.send({ type: 'broadcast', event: 'sync_request', payload: {} });
            }
        });
}

function updatePresence() {
    const newState = state.channel.presenceState();
    const totalUsers = Object.keys(newState).length;
    const isPartnerConnected = totalUsers >= 2;

    const tapBtn = els.tapBtn;
    const infoText = document.querySelector('#gameArea p.animate-pulse');

    if (isPartnerConnected) {
        // Enable Game
        tapBtn.disabled = false;
        tapBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale');
        tapBtn.classList.add('cursor-pointer');
        
        if (infoText) {
            infoText.textContent = "Partner Connected! Tap the heart together!";
            infoText.classList.add('text-brand-pink');
            infoText.classList.remove('text-gray-400');
        }
    } else {
        // Disable Game
        tapBtn.disabled = true;
        tapBtn.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale');
        tapBtn.classList.remove('cursor-pointer');
        
        if (infoText) {
            infoText.textContent = "Waiting for partner to join...";
            infoText.classList.remove('text-brand-pink');
            infoText.classList.add('text-gray-400');
        }
    }
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
    // 1. Collaboration Check
    if (state.myConsecutiveTaps >= 5) {
        els.soloWarning.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Error buzz
        return;
    }

    // 2. Broadcast Tap with explicit Charge value for sync
    // Optimistically assume we will succeed to +1 locally, so send that future value
    const nextCharge = Math.min(state.charge + 1, 100);

    if (state.channel) {
        state.channel.send({ 
            type: 'broadcast', 
            event: 'tap', 
            payload: { 
                sender: state.myName,
                charge: nextCharge // Authoritative sync value
            } 
        });
    }

    state.myConsecutiveTaps++;
    if (navigator.vibrate) navigator.vibrate(50);
});

function handleRemoteTap(payload) {
    const isSelf = payload.sender === state.myName;

    // Reset restriction if partner tapped
    if (!isSelf) {
        state.myConsecutiveTaps = 0;
        els.soloWarning.classList.add('hidden');
    }

    // Sync Logic: Adopt the higher charge to fix desyncs (83 vs 87)
    // If payload.charge is present, use it. Otherwise fallback to local + 1.
    const remoteCharge = payload.charge || (state.charge + 1);
    
    // We update local state if the remote is ahead, OR if it's a standard increment
    // Logic: Always take the max of (local, remote) to ensure we never go backward
    const newCharge = Math.max(state.charge, remoteCharge);

    if (state.charge < 100) {
        state.charge = newCharge;
        
        // Cap at 100
        if (state.charge >= 100) {
            state.charge = 100;
            updateBatteryUI();
            revealMessage();
            return;
        }
        updateBatteryUI();
        
        // Visuals
        const particleCount = state.isPremium ? 10 : 5;
        emitParticles(particleCount);

        // If it's the PARTNER tapping, give extra feedback to me
        if (!isSelf) {
            if (navigator.vibrate) navigator.vibrate(50); // Haptic
            
            // Visual Pulse on the button to show "They tapped!"
            els.tapBtn.classList.add('scale-95', 'border-white'); 
            setTimeout(() => els.tapBtn.classList.remove('scale-95', 'border-white'), 100);
            
            // Show charging icon
            els.chargingIcon.classList.remove('hidden');
            setTimeout(() => els.chargingIcon.classList.add('hidden'), 500);
        } else {
            // Self tap feedback (subtler)
             els.tapBtn.classList.add('scale-95');
             setTimeout(() => els.tapBtn.classList.remove('scale-95'), 100);
        }
    }
}

function updateBatteryUI() {
    els.jarLevel.style.height = `${state.charge}%`;
    els.chargeText.textContent = `${state.charge}%`;

    // Add a "glow" that intensifies with charge
    const glowStrength = state.charge / 2;
    els.jarContainer.style.boxShadow = `0 0 ${glowStrength}px rgba(255, 20, 147, ${state.charge/100})`;
}

function revealMessage() {
    // Prevent double execution
    if (els.jarContainer.classList.contains('hidden')) return;

    // 1. Celebration!
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: state.isPremium ? ['#FFD700', '#FFA500'] : ['#FF1493', '#FF69B4']
    });

    // 2. Hide Game UI
    els.jarContainer.classList.add('hidden');
    els.tapBtn.classList.add('hidden');
    document.querySelector('#gameArea p.animate-pulse').classList.add('hidden'); // Hide instruction text

    // 3. Show Message with Animation
    els.messageReveal.classList.remove('hidden');
    els.messageReveal.classList.add('animate-fade-in', 'scale-100', 'opacity-100');
    
    // Display the message based on who is viewing
    if (state.isSender) {
        els.finalMessage.innerHTML = `
            <span class="block text-sm text-gray-400 mb-2">You sent:</span>
            <span class="text-2xl font-serif text-brand-pink">"${state.targetMessage.replace('Your message will be revealed to ' + state.partnerName, '...')}"</span>
            <span class="block text-sm text-green-400 mt-4 animate-bounce">✨ Revealed to ${state.partnerName}! ✨</span>
        `;
    } else {
        els.finalMessage.innerHTML = `
            <span class="text-3xl font-serif text-brand-pink leading-relaxed">"${state.targetMessage}"</span>
        `;
    }
    
    if (state.isPremium) {
        els.downloadCertBtn.classList.remove('hidden');
        els.downloadCertBtn.classList.add('animate-bounce');
    }
}

// Premium & Cert
els.premiumBtn.addEventListener('click', async () => {
    // 1. Real Pesapal Integration
    if (!confirm("Upgrade to Premium for KES 10.00? This unlocks the Gold Theme and Love Certificate.")) return;

    els.premiumBtn.textContent = "Processing...";
    els.premiumBtn.disabled = true;

    try {
        const response = await fetch('/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: state.roomId,
                name: state.myName,
                email: "user@example.com" // In a real app, you might ask for this
            })
        });

        const data = await response.json();

        if (data.redirect_url) {
            // Redirect user to Pesapal payment page
            window.location.href = data.redirect_url;
        } else {
            throw new Error(data.error || "Payment initialization failed");
        }

    } catch (err) {
        console.error(err);
        alert("Payment Error: " + err.message);
        els.premiumBtn.textContent = "Unlock Premium (Gold Theme)";
        els.premiumBtn.disabled = false;
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