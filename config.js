/*************************************************************************
 * FILE 2: config.js
 * Berisi PRNG, Avatar & Cat Cutout Generators, Merge Tiers, Country Packs,
 * 16 Master Game Modes (termasuk 3 Mode Spiral Center Baru), dan Katalog Audio
 *************************************************************************/

// 1. DETERMINISTIC PRNG (MULBERRY32) & COLOR UTILITIES
function createPRNG(seed) {
    let a = seed >>> 0;
    return function () {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// 2. DEFAULT MEME FACE AVATAR GENERATOR (FOR VIDEO REF 1: SPIKED SPIRAL CENTER)
function createDefaultMemeAvatarCanvas() {
    const off = document.createElement('canvas');
    off.width = 128;
    off.height = 128;
    const c = off.getContext('2d');

    // Background Circle
    const bgGrad = c.createRadialGradient(64, 54, 10, 64, 64, 64);
    bgGrad.addColorStop(0, '#475569');
    bgGrad.addColorStop(1, '#1e293b');
    c.fillStyle = bgGrad;
    c.beginPath();
    c.arc(64, 64, 64, 0, Math.PI * 2);
    c.fill();

    // Neck & Shoulders
    c.fillStyle = '#8d5524';
    c.beginPath();
    c.ellipse(64, 118, 36, 22, 0, 0, Math.PI * 2);
    c.fill();

    // Head
    c.fillStyle = '#a16236';
    c.beginPath();
    c.ellipse(64, 66, 33, 41, 0, 0, Math.PI * 2);
    c.fill();

    // Hair / Buzzcut
    c.fillStyle = '#18181b';
    c.beginPath();
    c.arc(64, 48, 32, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();

    // Ears
    c.fillStyle = '#8d5524';
    c.beginPath();
    c.ellipse(30, 68, 6, 11, 0, 0, Math.PI * 2);
    c.ellipse(98, 68, 6, 11, 0, 0, Math.PI * 2);
    c.fill();

    // Eyebrows (raised meme expression)
    c.strokeStyle = '#18181b';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(43, 50); c.quadraticCurveTo(51, 45, 58, 50);
    c.moveTo(70, 50); c.quadraticCurveTo(77, 45, 85, 50);
    c.stroke();

    // Eyes
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(51, 58, 7.5, 5, 0, 0, Math.PI * 2);
    c.ellipse(77, 58, 7.5, 5, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#09090b';
    c.beginPath();
    c.arc(51, 58, 3.8, 0, Math.PI * 2);
    c.arc(77, 58, 3.8, 0, Math.PI * 2);
    c.fill();

    // Nose
    c.strokeStyle = '#6f3d17';
    c.lineWidth = 2.8;
    c.beginPath();
    c.moveTo(64, 58);
    c.lineTo(60, 74);
    c.lineTo(68, 74);
    c.stroke();

    // Goatee / Mustache & Grin
    c.strokeStyle = '#18181b';
    c.lineWidth = 3.2;
    c.beginPath();
    c.arc(64, 83, 13, 0.1 * Math.PI, 0.9 * Math.PI);
    c.stroke();

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(64, 84, 9, 0.08 * Math.PI, 0.92 * Math.PI);
    c.fill();

    return off;
}

const defaultMemeAvatarCanvas = createDefaultMemeAvatarCanvas();

// 3. MERGE TIERS CONFIGURATION (8 SIZES)
const DEFAULT_MERGE_THEMES = {
    video1_faces: [
        { level: 0, name: 'Tier 1 (Mini White)', r: 9.5, color: '#ffffff', emoji: '', faceType: 'white_dots' },
        { level: 1, name: 'Tier 2 (Purple)', r: 14.5, color: '#c026d3', emoji: '', faceType: 'purple_look' },
        { level: 2, name: 'Tier 3 (Cyan Shock)', r: 21.0, color: '#22d3ee', emoji: '', faceType: 'cyan_gasp' },
        { level: 3, name: 'Tier 4 (Green Worry)', r: 29.0, color: '#22c55e', emoji: '', faceType: 'green_worry' },
        { level: 4, name: 'Tier 5 (Yellow Scream)', r: 41.0, color: '#facc15', emoji: '😱', faceType: 'yellow_scream' },
        { level: 5, name: 'Tier 6 (Red Blush)', r: 54.0, color: '#dc2626', emoji: '', faceType: 'red_blush' },
        { level: 6, name: 'Tier 7 (Neon Boss)', r: 68.0, color: '#7c3aed', emoji: '🤯', faceType: 'boss_1' },
        { level: 7, name: 'Tier 8 (Final Form)', r: 84.0, color: '#f43f5e', emoji: '👑', faceType: 'boss_2' }
    ],
    video2_cats: [
        { level: 0, name: 'Tier 1 (Standing Kitten)', r: 11.0, color: '#d6a87c', emoji: '🐈', faceType: 'cat_0' },
        { level: 1, name: 'Tier 2 (King Crown Cat)', r: 19.5, color: '#eab308', emoji: '👑', faceType: 'cat_1' },
        { level: 2, name: 'Tier 3 (Grey Serious Cat)', r: 29.0, color: '#64748b', emoji: '😼', faceType: 'cat_2' },
        { level: 3, name: 'Tier 4 (Orange Smile Cat)', r: 39.0, color: '#ea580c', emoji: '😺', faceType: 'cat_3' },
        { level: 4, name: 'Tier 5 (Tuxedo Cat)', r: 50.0, color: '#cbd5e1', emoji: '🐾', faceType: 'cat_4' },
        { level: 5, name: 'Tier 6 (Gigachad White)', r: 64.0, color: '#f8fafc', emoji: '🗿', faceType: 'cat_5' },
        { level: 6, name: 'Tier 7 (Laser Lion)', r: 76.0, color: '#f59e0b', emoji: '🦁', faceType: 'cat_6' },
        { level: 7, name: 'Tier 8 (Final Cat God)', r: 90.0, color: '#38bdf8', emoji: '🌌', faceType: 'cat_7' }
    ],
    animals_emoji: [
        { level: 0, name: 'Tier 1 (Mouse)', r: 10.5, color: '#94a3b8', emoji: '🐭', faceType: 'none' },
        { level: 1, name: 'Tier 2 (Cat)', r: 15.5, color: '#fbbf24', emoji: '🐱', faceType: 'none' },
        { level: 2, name: 'Tier 3 (Dog)', r: 22.0, color: '#f97316', emoji: '🐶', faceType: 'none' },
        { level: 3, name: 'Tier 4 (Fox)', r: 29.5, color: '#ef4444', emoji: '🦊', faceType: 'none' },
        { level: 4, name: 'Tier 5 (Bear)', r: 39.0, color: '#a16207', emoji: '🐻', faceType: 'none' },
        { level: 5, name: 'Tier 6 (Panda)', r: 50.0, color: '#e2e8f0', emoji: '🐼', faceType: 'none' },
        { level: 6, name: 'Tier 7 (Lion)', r: 63.0, color: '#eab308', emoji: '🦁', faceType: 'none' },
        { level: 7, name: 'Tier 8 (Dragon)', r: 78.0, color: '#22c55e', emoji: '🐲', faceType: 'none' }
    ]
};

let activeMergeTiers = DEFAULT_MERGE_THEMES.video1_faces.map(t => ({ ...t, customImg: null, customImgUrl: null }));

function getMergeTierRestitution(level, config) {
    const topBounce = Math.min(0.95, Math.max(0.35, config.minBounceSpeedRef || 0.84));
    const maxIdx = Math.max(1, activeMergeTiers.length - 1);
    const t = Math.min(1, Math.max(0, level / maxIdx));
    return Math.max(0.20, topBounce * Math.pow(1 - t * 0.72, 1.35));
}

function generateCatCutoutCanvas(level, colorHex) {
    const off = document.createElement('canvas');
    off.width = 160;
    off.height = 160;
    const c = off.getContext('2d');
    c.translate(80, 86);

    c.fillStyle = colorHex;
    c.beginPath();
    c.moveTo(-48, -18); c.lineTo(-56, -68); c.lineTo(-15, -45); c.closePath(); c.fill();
    c.beginPath();
    c.moveTo(48, -18); c.lineTo(56, -68); c.lineTo(15, -45); c.closePath(); c.fill();

    c.fillStyle = '#fda4af';
    c.beginPath();
    c.moveTo(-42, -24); c.lineTo(-48, -55); c.lineTo(-22, -40); c.closePath(); c.fill();
    c.beginPath();
    c.moveTo(42, -24); c.lineTo(48, -55); c.lineTo(22, -40); c.closePath(); c.fill();

    c.fillStyle = colorHex;
    c.beginPath();
    if (level === 5) {
        c.moveTo(-52, -32);
        c.quadraticCurveTo(0, -56, 52, -32);
        c.lineTo(48, 30); c.lineTo(24, 58); c.lineTo(-24, 58); c.lineTo(-48, 30);
        c.closePath();
    } else {
        c.arc(0, 0, 54, 0, Math.PI * 2);
    }
    c.fill();

    if (level === 1) {
        c.strokeStyle = '#facc15';
        c.lineWidth = 7;
        c.strokeRect(-58, -66, 116, 122);
    }

    c.fillStyle = '#0f172a';
    c.beginPath();
    c.arc(-20, -8, 8, 0, Math.PI * 2);
    c.arc(20, -8, 8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(-22, -10, 3, 0, Math.PI * 2);
    c.arc(18, -10, 3, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#fb7185';
    c.beginPath();
    c.moveTo(-7, 6); c.lineTo(7, 6); c.lineTo(0, 14); c.closePath(); c.fill();

    c.strokeStyle = '#1e293b';
    c.lineWidth = 4;
    c.beginPath();
    if (level === 3) {
        c.arc(0, 12, 22, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (level === 5) {
        c.moveTo(-16, 26); c.lineTo(16, 26);
        c.moveTo(0, 42); c.lineTo(0, 54);
    } else {
        c.arc(-8, 16, 8, 0, Math.PI);
        c.arc(8, 16, 8, 0, Math.PI);
    }
    c.stroke();
    return off;
}

const proceduralCatSprites = DEFAULT_MERGE_THEMES.video2_cats.map((t, idx) =>
    generateCatCutoutCanvas(idx, t.color)
);

// 4. COUNTRY PACKS
const COUNTRY_PACKS = {
    asean: [
        { code: 'ID', name: 'Indonesia', colors: ['#ef4444', '#ffffff'], style: 'horizontal2' },
        { code: 'MY', name: 'Malaysia', colors: ['#dc2626', '#ffffff', '#1d4ed8'], style: 'stripes' },
        { code: 'TH', name: 'Thailand', colors: ['#ef4444', '#ffffff', '#1e3a8a'], style: 'horizontal3' },
        { code: 'VN', name: 'Vietnam', colors: ['#dc2626', '#facc15'], style: 'circle' },
        { code: 'PH', name: 'Philippines', colors: ['#1d4ed8', '#dc2626', '#facc15'], style: 'horizontal2' },
        { code: 'SG', name: 'Singapore', colors: ['#ef4444', '#ffffff'], style: 'horizontal2' },
        { code: 'MM', name: 'Myanmar', colors: ['#facc15', '#16a34a', '#ef4444'], style: 'horizontal3' },
        { code: 'KH', name: 'Cambodia', colors: ['#1d4ed8', '#dc2626', '#1d4ed8'], style: 'horizontal3' }
    ],
    world: [
        { code: 'ID', name: 'Indonesia', colors: ['#ef4444', '#ffffff'], style: 'horizontal2' },
        { code: 'JP', name: 'Japan', colors: ['#ffffff', '#dc2626'], style: 'circle' },
        { code: 'BR', name: 'Brazil', colors: ['#16a34a', '#facc15', '#1d4ed8'], style: 'diamond' },
        { code: 'US', name: 'USA', colors: ['#dc2626', '#ffffff', '#1d4ed8'], style: 'stripes' },
        { code: 'KR', name: 'S. Korea', colors: ['#ffffff', '#ef4444', '#2563eb'], style: 'circle' },
        { code: 'DE', name: 'Germany', colors: ['#171717', '#dc2626', '#facc15'], style: 'horizontal3' },
        { code: 'FR', name: 'France', colors: ['#1d4ed8', '#ffffff', '#ef4444'], style: 'vertical3' },
        { code: 'GB', name: 'UK', colors: ['#1e3a8a', '#ffffff', '#dc2626'], style: 'cross' },
        { code: 'AR', name: 'Argentina', colors: ['#38bdf8', '#ffffff', '#38bdf8'], style: 'horizontal3' },
        { code: 'PT', name: 'Portugal', colors: ['#15803d', '#dc2626', '#facc15'], style: 'vertical2' }
    ],
    europe: [
        { code: 'DE', name: 'Germany', colors: ['#171717', '#dc2626', '#facc15'], style: 'horizontal3' },
        { code: 'FR', name: 'France', colors: ['#1d4ed8', '#ffffff', '#ef4444'], style: 'vertical3' },
        { code: 'GB', name: 'UK', colors: ['#1e3a8a', '#ffffff', '#dc2626'], style: 'cross' },
        { code: 'IT', name: 'Italy', colors: ['#16a34a', '#ffffff', '#dc2626'], style: 'vertical3' },
        { code: 'ES', name: 'Spain', colors: ['#dc2626', '#facc15', '#dc2626'], style: 'horizontal3' },
        { code: 'NL', name: 'Netherlands', colors: ['#dc2626', '#ffffff', '#1d4ed8'], style: 'horizontal3' },
        { code: 'PT', name: 'Portugal', colors: ['#15803d', '#dc2626', '#facc15'], style: 'vertical2' },
        { code: 'BE', name: 'Belgium', colors: ['#171717', '#facc15', '#dc2626'], style: 'vertical3' }
    ],
    asia: [
        { code: 'ID', name: 'Indonesia', colors: ['#ef4444', '#ffffff'], style: 'horizontal2' },
        { code: 'JP', name: 'Japan', colors: ['#ffffff', '#dc2626'], style: 'circle' },
        { code: 'KR', name: 'S. Korea', colors: ['#ffffff', '#ef4444', '#2563eb'], style: 'circle' },
        { code: 'SA', name: 'Saudi Arabia', colors: ['#15803d', '#ffffff'], style: 'circle' },
        { code: 'AU', name: 'Australia', colors: ['#1e3a8a', '#ffffff', '#dc2626'], style: 'cross' },
        { code: 'IR', name: 'Iran', colors: ['#16a34a', '#ffffff', '#dc2626'], style: 'horizontal3' },
        { code: 'UZ', name: 'Uzbekistan', colors: ['#0284c7', '#ffffff', '#16a34a'], style: 'horizontal3' },
        { code: 'TH', name: 'Thailand', colors: ['#ef4444', '#ffffff', '#1e3a8a'], style: 'horizontal3' }
    ]
};

// 5. 16 MASTER REFERENCE GAME MODES (INCLUDING 3 NEW SPIRAL CENTER MODES!)
const GAME_MODES = [
    {
        id: 'spiked_spiral',
        name: '💎 Spiked Spiral Center',
        subtitle: 'Ref Video 1: Avatar balls roll inward through a rainbow spiked spiral & shatter into cyan glass shards!',
        hasSpikes: true,
        hasOpening: false,
        hasRotation: true,
        specificGroup: 'ctrlGroupSpikedSpiral',
        specificHeader: '💎 SPIKED SPIRAL LABYRINTH',
        defaultHookTop: 'How Many Balls to Reach the Center ?',
        defaultHookBot: 'Did you recognize the sounds?',
        preset: { circleRadius: 460, outlineThickness: 7, openingSize: 24, spikeHeight: 28, spikeWidth: 44, ballRadius: 28, gravity: 0.65, minBounce: 4.2, initSpeedX: 3.8, rotSpeed: 0.65, spikeCov: 'full', spikeStyle: 'rainbow' }
    },
    {
        id: 'multiply_gates',
        name: '✖️ Multiply Gates Center',
        subtitle: 'Static spiral rings, top white wedge bumper, 4 customizable glass obstacle types, & x1-x5 multiplier gates!',
        hasSpikes: true,
        hasOpening: true,
        hasRotation: false,
        specificGroup: 'ctrlGroupMultiplyGates',
        specificHeader: '✖️ MULTIPLY GATES & MESH',
        defaultHookTop: 'Will the Ball Multiply ?',
        defaultHookBot: 'Did you recognize the sounds?',
        preset: { circleRadius: 460, outlineThickness: 8, openingSize: 35, spikeHeight: 32, spikeWidth: 46, ballRadius: 22, gravity: 0.68, minBounce: 4.3, initSpeedX: 4.0, rotSpeed: 0.0, spikeCov: 'right_arc', spikeStyle: 'rainbow' }
    },
    {
        id: 'beaded_spiral',
        name: '🌀 Beaded Spiral Progress',
        subtitle: 'Ref Video 3: White spiral corridor packed with rainbow dots + live bottom % progress bar to center!',
        hasSpikes: false,
        hasOpening: false,
        hasRotation: true,
        specificGroup: 'ctrlGroupBeadedSpiral',
        specificHeader: '🌀 BEADED SPIRAL PROGRESS',
        defaultHookTop: 'Will the balls get to center ?',
        defaultHookBot: '',
        preset: { circleRadius: 460, outlineThickness: 12, openingSize: 28, spikeHeight: 0, spikeWidth: 48, ballRadius: 26, gravity: 0.72, minBounce: 4.4, initSpeedX: 4.2, rotSpeed: 0.65, spikeCov: 'full', spikeStyle: 'rainbow' }
    },
    {
        id: 'fusion',
        name: '✨ Merge (Flask 2048)',
        subtitle: 'Small balls bounce lively like ping-pong; giant merged balls anchor at the bottom!',
        hasSpikes: false,
        hasOpening: true,
        hasRotation: false,
        specificGroup: 'ctrlGroupMerge',
        specificHeader: '🧪 FLASK MERGE MECHANICS',
        defaultHookTop: 'Will the Ball Merge Into Final Form?',
        defaultHookBot: '',
        preset: { circleRadius: 430, outlineThickness: 10, openingSize: 21, spikeHeight: 0, spikeWidth: 84, ballRadius: 100, gravity: 0.76, minBounce: 0.84, initSpeedX: 2.2, rotSpeed: 0.0, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'accumulation',
        name: 'Circle Spikes / Accumulation',
        subtitle: 'Pop the wall before getting impaled. Impaled balls freeze as grey shields!',
        hasSpikes: true,
        hasOpening: true,
        hasRotation: true,
        specificGroup: null,
        specificHeader: '🦔 ACCUMULATION SHIELD',
        defaultHookTop: 'WAIT UNTIL IT ESCAPES... 🤯',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 14, openingSize: 22, spikeHeight: 58, spikeWidth: 84, ballRadius: 37, gravity: 0.79, minBounce: 4.5, initSpeedX: 4.5, rotSpeed: 0.55, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'classic',
        name: 'Classic (24 Rainbow Rings)',
        subtitle: 'Hypnotic concentric rainbow arcs with customizable spiral phase shift.',
        hasSpikes: false,
        hasOpening: true,
        hasRotation: true,
        specificGroup: 'ctrlGroupClassic',
        specificHeader: '🌈 CLASSIC CONCENTRIC RINGS',
        defaultHookTop: '99% FAIL BEFORE THE LAST RING! 😱',
        defaultHookBot: '',
        preset: { circleRadius: 460, outlineThickness: 6, openingSize: 28, spikeHeight: 0, spikeWidth: 84, ballRadius: 24, gravity: 0.72, minBounce: 4.5, initSpeedX: 4.5, rotSpeed: 0.75, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'destruction',
        name: 'Destruction (Beaded Dots)',
        subtitle: 'Concentric rings of glowing rainbow beads that shatter on every beat!',
        hasSpikes: false,
        hasOpening: false,
        hasRotation: true,
        specificGroup: 'ctrlGroupDestruction',
        specificHeader: '💥 BEADED DOT MATRIX',
        defaultHookTop: 'WAIT UNTIL IT ESCAPES... 🤯',
        defaultHookBot: '',
        preset: { circleRadius: 460, outlineThickness: 10, openingSize: 0, spikeHeight: 0, spikeWidth: 84, ballRadius: 26, gravity: 0.75, minBounce: 4.6, initSpeedX: 4.5, rotSpeed: 0.45, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'infinite',
        name: 'Duplicate / Infinite Loop',
        subtitle: 'Every time a ball escapes the opening, it spawns multiple new ones!',
        hasSpikes: false,
        hasOpening: true,
        hasRotation: true,
        specificGroup: 'ctrlGroupInfinite',
        specificHeader: '♾️ DUPLICATE MULTIPLIER',
        defaultHookTop: 'Will the Ball Multiply ?',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 12, openingSize: 28, spikeHeight: 0, spikeWidth: 84, ballRadius: 26, gravity: 0.75, minBounce: 4.4, initSpeedX: 4.5, rotSpeed: 0.65, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'web_expansion',
        name: 'Web Expansion (Starburst)',
        subtitle: 'Glowing white ball weaves dense white geometric rays from every wall impact!',
        hasSpikes: false,
        hasOpening: true,
        hasRotation: true,
        specificGroup: 'ctrlGroupGrowth',
        specificHeader: '🕸️ STARBURST WEB & GROWTH',
        defaultHookTop: 'WATCH THE BALL GROW TO MAX SIZE! 📈',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 12, openingSize: 18, spikeHeight: 0, spikeWidth: 84, ballRadius: 32, gravity: 0.76, minBounce: 4.6, initSpeedX: 4.5, rotSpeed: 0.55, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'trail_expansion',
        name: 'Trail Expansion (Rainbow)',
        subtitle: 'Let the ball paint the void with an endless rainbow trail while growing larger!',
        hasSpikes: false,
        hasOpening: true,
        hasRotation: true,
        specificGroup: 'ctrlGroupGrowth',
        specificHeader: '🎨 RAINBOW TRAIL GROWTH',
        defaultHookTop: 'WATCH THE BALL GROW TO MAX SIZE! 📈',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 14, openingSize: 18, spikeHeight: 0, spikeWidth: 84, ballRadius: 28, gravity: 0.79, minBounce: 4.5, initSpeedX: 4.5, rotSpeed: 0.60, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'fragment',
        name: 'Fragment Expansion',
        subtitle: 'Purple/rainbow balls grow on each bounce and disintegrate into tiny dots on spikes!',
        hasSpikes: true,
        hasOpening: true,
        hasRotation: true,
        specificGroup: 'ctrlGroupFragment',
        specificHeader: '🟣 FRAGMENT SHATTER',
        defaultHookTop: 'WAIT UNTIL IT SHATTERS! 💥',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 12, openingSize: 20, spikeHeight: 54, spikeWidth: 80, ballRadius: 38, gravity: 0.74, minBounce: 4.5, initSpeedX: 4.5, rotSpeed: 0.55, spikeCov: 'clusters', spikeStyle: 'gradient' }
    },
    {
        id: 'spiral',
        name: 'Spiral Vortex (Outward)',
        subtitle: 'Double-walled neon purple spiral vortex with embedded bumper orbs along the path.',
        hasSpikes: false,
        hasOpening: false,
        hasRotation: true,
        specificGroup: 'ctrlGroupSpiral',
        specificHeader: '🌀 SPIRAL VORTEX COILS',
        defaultHookTop: 'WAIT UNTIL IT ESCAPES... 🤯',
        defaultHookBot: '',
        preset: { circleRadius: 460, outlineThickness: 12, openingSize: 24, spikeHeight: 0, spikeWidth: 84, ballRadius: 26, gravity: 0.68, minBounce: 4.4, initSpeedX: 4.2, rotSpeed: 0.60, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'collision',
        name: 'Collision Burst',
        subtitle: 'Two balls bounce inside a circle until they collide, triggering a massive rainbow swarm!',
        hasSpikes: false,
        hasOpening: true,
        hasRotation: true,
        specificGroup: 'ctrlGroupCollision',
        specificHeader: '⚡ COLLISION SWARM BURST',
        defaultHookTop: 'WAIT FOR THE COLLISION! ⚡',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 12, openingSize: 20, spikeHeight: 0, spikeWidth: 84, ballRadius: 42, gravity: 0.72, minBounce: 4.5, initSpeedX: 4.5, rotSpeed: 0.60, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'web_battle',
        name: 'Web Battle (Flag Threads)',
        subtitle: 'Country flag balls clash and weave colored rays — slice rival threads to steal them all!',
        hasSpikes: false,
        hasOpening: false,
        hasRotation: true,
        specificGroup: 'ctrlGroupRoyale',
        specificHeader: '🏳️ COUNTRY WEB CLASH',
        defaultHookTop: 'COMMENT YOUR COUNTRY! 🏳️',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 12, openingSize: 0, spikeHeight: 0, spikeWidth: 84, ballRadius: 32, gravity: 0.75, minBounce: 4.6, initSpeedX: 4.5, rotSpeed: 0.50, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'eating_balls',
        name: 'Eating Balls (BouncyLab)',
        subtitle: 'Dozens of balls bounce in a ring — bigger balls devour smaller ones on contact and grow!',
        hasSpikes: false,
        hasOpening: false,
        hasRotation: true,
        specificGroup: 'ctrlGroupEating',
        specificHeader: '🍽️ EATING BALLS SWARM',
        defaultHookTop: 'WHICH COLOR WILL WIN? 🏆',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 14, openingSize: 0, spikeHeight: 0, spikeWidth: 84, ballRadius: 24, gravity: 0.72, minBounce: 4.4, initSpeedX: 4.5, rotSpeed: 0.50, spikeCov: 'full', spikeStyle: 'hollow' }
    },
    {
        id: 'country_royale',
        name: 'Country Balls Royale',
        subtitle: 'Flag balls clash inside a spiked arena with RPG damage numbers until 1 country survives!',
        hasSpikes: true,
        hasOpening: false,
        hasRotation: true,
        specificGroup: 'ctrlGroupRoyale',
        specificHeader: '⚔️ BATTLE ROYALE COMBAT',
        defaultHookTop: 'COMMENT YOUR COUNTRY BEFORE IT DIES! 🏳️',
        defaultHookBot: '',
        preset: { circleRadius: 450, outlineThickness: 14, openingSize: 0, spikeHeight: 52, spikeWidth: 80, ballRadius: 36, gravity: 0.70, minBounce: 4.5, initSpeedX: 4.5, rotSpeed: 0.55, spikeCov: 'bottom', spikeStyle: 'crimson' }
    }
];

const COLOR_THEMES = {
    bouncylab: { start: '#34d399', end: '#2dd4bf', bg: '#162912' },
    ballsim: { start: '#a855f7', end: '#22d3ee', bg: '#000000' },
    reference: { start: '#d4ff33', end: '#ff47b5', bg: '#07091e' },
    cyberpunk: { start: '#00f5d4', end: '#f72585', bg: '#080514' },
    gold: { start: '#fde047', end: '#d97706', bg: '#090806' }
};

// 6. MELODIES & STREAMING CATALOG
const NOTE_TO_FREQ = {};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let midi = 24; midi <= 96; midi++) {
    const name = NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
    NOTE_TO_FREQ[name] = 440 * Math.pow(2, (midi - 69) / 12);
}

const MELODIES = {
    arpeggio: [
        'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'C5', 'G4', 'E4', 'D4', 'F#4', 'A4', 'D5',
        'F#5', 'A5', 'D6', 'A5', 'F#5', 'D5', 'A4', 'F#4', 'E4', 'G#4', 'B4', 'E5', 'G#5', 'B5', 'E6', 'B5'
    ],
    rushe: [
        'E5', 'E5', 'E5', 'E5', 'E5', 'F5', 'E5', 'D#5', 'E5', 'A4', 'C5', 'E5', 'A5', 'B5', 'C6', 'B5',
        'A5', 'E5', 'F5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'F5', 'G#5', 'B5', 'C6', 'D6', 'C6', 'B5', 'A5'
    ],
    furelise: [
        'E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5', 'A4', 'C4', 'E4', 'A4', 'B4', 'E4', 'G#4', 'B4',
        'C5', 'E4', 'E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5', 'A4', 'C4', 'E4', 'A4', 'B4', 'A4'
    ],
    megalovania: [
        'D4', 'D4', 'D5', 'A4', 'G#4', 'G4', 'F4', 'D4', 'F4', 'G4', 'C4', 'C4', 'D5', 'A4', 'G#4', 'G4',
        'F4', 'D4', 'F4', 'G4', 'B3', 'B3', 'D5', 'A4', 'G#4', 'G4', 'F4', 'D4', 'F4', 'G4', 'A#3', 'A#3'
    ],
    interstellar: [
        'A4', 'E5', 'A4', 'E5', 'B4', 'E5', 'B4', 'E5', 'C5', 'E5', 'C5', 'E5', 'D5', 'E5', 'D5', 'E5',
        'A4', 'E5', 'A4', 'E5', 'B4', 'E5', 'B4', 'E5', 'C5', 'G5', 'C5', 'G5', 'B4', 'G5', 'A4', 'E5'
    ],
    giorno: [
        'B4', 'B4', 'D5', 'E5', 'F#5', 'F#5', 'E5', 'D5', 'C#5', 'D5', 'E5', 'F#5', 'B4', 'B4', 'C#5', 'D5',
        'E5', 'E5', 'D5', 'C#5', 'B4', 'D5', 'F#5', 'B5', 'A5', 'F#5', 'D5', 'E5', 'F#5', 'E5', 'D5', 'C#5'
    ],
    faded: [
        'F#4', 'F#4', 'F#4', 'A#4', 'D#5', 'D#5', 'D#5', 'C#5', 'B4', 'B4', 'B4', 'B4', 'F#4', 'F#4', 'F#4', 'E4',
        'F#4', 'F#4', 'F#4', 'A#4', 'D#5', 'D#5', 'D#5', 'C#5', 'B4', 'B4', 'B4', 'C#5', 'D#5', 'C#5', 'B4', 'A#4'
    ],
    coffindance: [
        'F#4', 'F#4', 'C#5', 'B4', 'A4', 'G#4', 'G#4', 'G#4', 'B4', 'A4', 'G#4', 'F#4', 'F#4', 'A5', 'G#5', 'A5',
        'G#5', 'A5', 'F#4', 'F#4', 'A5', 'G#5', 'A5', 'G#5', 'A5', 'F#4', 'F#4', 'C#5', 'B4', 'A4', 'G#4', 'F#4'
    ],
    tokyodrift: [
        'A#4', 'B4', 'F#4', 'A#4', 'B4', 'F#4', 'A#4', 'B4', 'F#4', 'A#4', 'B4', 'F#4', 'D#5', 'E5', 'B4', 'D#5',
        'E5', 'B4', 'D#5', 'E5', 'B4', 'D#5', 'E5', 'B4', 'A#4', 'B4', 'F#4', 'A#4', 'B4', 'F#4', 'A#4', 'B4'
    ]
};

const STREAMING_CATALOG = [
    { title: 'Alan Walker - Faded', platform: 'YouTube / Spotify', notes: MELODIES.faded },
    { title: 'Astronomia (Coffin Dance)', platform: 'YouTube Viral', notes: MELODIES.coffindance },
    { title: 'Teriyaki Boyz - Tokyo Drift', platform: 'Spotify / YouTube', notes: MELODIES.tokyodrift },
    { title: 'Sheet Music Boss - Rush E', platform: 'YouTube Viral', notes: MELODIES.rushe },
    { title: 'Toby Fox - Megalovania', platform: 'Spotify / YouTube', notes: MELODIES.megalovania },
    { title: 'Hans Zimmer - Interstellar', platform: 'Spotify / YouTube', notes: MELODIES.interstellar },
    { title: 'Giorno\'s Theme (JoJo)', platform: 'YouTube / Spotify', notes: MELODIES.giorno }
];