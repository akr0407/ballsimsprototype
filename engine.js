/*************************************************************************
 * FILE 4A: engine.js (PURE PHYSICS & STATE ENGINE)
 * Berisi:
 * - Inisialisasi State 16 Mode
 * - Polish 1:1 Multiply Gates Center (Static Spiral, Top White Triangle Bumper,
 *   4 Glass Obstacle Types, Random/Custom Gate Layouts, Continuous Post-Goal Spawn)
 * - Spiked Spiral Center, Beaded Spiral Progress, & Bouncy Merge 2048
 *************************************************************************/

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const SCALE_1080 = canvas.width / 1080; // 0.5 exact scale factor

const trailCanvas = document.createElement('canvas');
trailCanvas.width = canvas.width;
trailCanvas.height = canvas.height;
const trailCtx = trailCanvas.getContext('2d');

const CX = canvas.width / 2;
const CY = canvas.height / 2 + 12;

let customBallImage = null;
let customCenterImage = null;
let autoBatchEnabled = false;

let simConfig = {
    mode: 'multiply_gates',
    seed: 1042,
    circleRadiusRef: 460,
    outlineThicknessRef: 8,
    openingSizeDeg: 35,
    spikeHeightRef: 32,
    spikeWidthRef: 46,
    spikeCoverage: 'right_arc',
    spikeStyle: 'rainbow',
    ballRadiusRef: 22,
    gravityRef: 0.68,
    minBounceSpeedRef: 4.3,
    initSpeedXRef: 4.0,
    rotSpeedMult: 0.0,
    // Multiply Gates Exclusive Settings
    glassStyle: 'hexagons',       // 'hexagons' | 'hourglass' | 'triangles' | 'diamonds'
    gateLayout: 'scattered',      // 'scattered' | 'right_line' | 'bottom_stack' | 'random'
    centerPortalStyle: 'blackhole', // 'blackhole' | 'energy' | 'diamond'
    gateCount: 4,
    gateIncrement: 1,
    meshDensity: 8,
    multiplyRainbowWalls: false,
    // Other Mode-Specific Tunable Parameters
    spikedSpiralTurns: 6.0,
    streamSpawnRate: 16,
    glassShardCount: 10,
    beadSpiralTurns: 4.5,
    beadSubRows: 3,
    spawnIntervalTicks: 34,
    classicRingCount: 24,
    classicPhaseShift: 0.14,
    beadRingLayers: 10,
    beadDotSize: 3.2,
    multiplyFactor: 2,
    ballGrowthRate: 0.45,
    fragmentMaxCount: 32,
    spiralTurns: 4.2,
    collisionBurstCount: 24,
    eatingInitialCount: 22,
    royaleDamageMult: 1.0,
    // Merge Theme & Visuals
    mergeTheme: 'video1_faces',
    mergeSpriteMode: 'circle',
    randomColorsEachRound: false,
    gradStart: '#a855f7',
    gradEnd: '#22d3ee',
    bgColor: '#000000',
    hookText: 'Will the Ball Multiply ?',
    bottomHookText: 'Did you recognize the sounds?',
    audioSpectrum: false,
    floatingTextFX: true,
    suddenDeath: false,
    countryPack: 'asean',
    emojiFX: false,
    customBallEmoji: '',
    centerEmoji: '',
    centerShape: 'diamond',
    watermarkText: 'BALLSIMULATOR.COM',
    watermarkSub: ''
};

let simState = null;
let isPaused = false;

function getAlignedSpikedSpiralTurns(config) {
    return Math.max(3, Math.round(config.spikedSpiralTurns || 6));
}

/*************************************************************************
 * 1. STATE INITIALIZATION & GEOMETRY BUILDERS FOR ALL 16 MODES
 *************************************************************************/
function createSimulationState(config, seedOverride) {
    const seed = seedOverride !== undefined ? seedOverride : config.seed;
    const rng = createPRNG(seed);

    const maxOuterR = config.circleRadiusRef * SCALE_1080;
    const gapRad = (config.openingSizeDeg * Math.PI) / 180;
    const baseBallR = Math.max(5, config.ballRadiusRef * SCALE_1080 * 0.72);

    let gStart = config.gradStart;
    let gEnd = config.gradEnd;
    let bgCol = config.bgColor;

    if (config.randomColorsEachRound && !['fusion', 'spiked_spiral', 'multiply_gates', 'beaded_spiral'].includes(config.mode)) {
        const h1 = Math.floor(rng() * 360);
        const h2 = (h1 + 65 + Math.floor(rng() * 90)) % 360;
        gStart = hslToHex(h1, 90, 60);
        gEnd = hslToHex(h2, 90, 58);
        bgCol = hslToHex(h1, 45, 9);
    }

    const state = {
        seed,
        rng,
        ticks: 0,
        bounces: 0,
        ballsLost: 0,
        escapedCount: config.mode === 'fusion' ? 1 : 0,
        escaped: false,
        goalReachedCount: 0,
        goalCelebrationTimer: 0,
        escapeTime: null,
        winnerText: null,
        gradStart: gStart,
        gradEnd: gEnd,
        bgColor: bgCol,
        balls: [],
        rings: [],
        beads: [],
        pinnedBalls: [],
        webLines: [],
        particles: [],
        glassShards: [],
        spiralSpikes: [],
        meshTriangles: [],
        gateOrbs: [],
        topObstacle: null,
        shockwaves: [],
        floatingTexts: [],
        spiralObstacles: [],
        spiralAngle: 0,
        centerProgress: 0,
        spiralGate: null,
        totalInitialSpikes: 1,
        wavePhase: 'drop',
        clonesRemainingToSpawn: 0,
        cloneSpawnTimer: 0,
        waveCooldownTicks: 0,
        shakeMag: 0
    };

    const mode = config.mode;
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    // =====================================================================
    // MODE 1: SPIKED SPIRAL CENTER
    // =====================================================================
    if (mode === 'spiked_spiral') {
        state.spiralAngle = 0;
        buildSpikedSpiralTeethAndGate(state, config, maxOuterR);
        spawnSingleTopRightStarterBall(state, config, maxOuterR);

        // =====================================================================
        // MODE 2: MULTIPLY GATES CENTER (CLEAN ARCHIMEDEAN SPIRAL CORRIDOR)
        // =====================================================================
    } else if (mode === 'multiply_gates') {
        state.spiralAngle = 0;
        state.multiplyOuterR = maxOuterR;

        // Segitiga Putih Pemantul di langit-langit atas (Jam 12)
        const topY = CY - maxOuterR * 0.92;
        const wedgeW = 28;
        const wedgeH = 18;
        state.topObstacle = {
            x: CX,
            y: topY,
            w: wedgeW,
            h: wedgeH,
            pts: [
                { x: CX - wedgeW * 0.5, y: topY },
                { x: CX + wedgeW * 0.5, y: topY },
                { x: CX, y: topY + wedgeH }
            ]
        };

        // Bangun Multiplier Gate Orbs tepat di tengah lorong spiral
        buildMultiplyGateOrbs(state, config, maxOuterR, rng);

        // Bangun Kaca mengikuti kurva spiral
        buildCustomGlassObstacles(state, config, maxOuterR);

        // Spawn 1 bola pertama tepat di mulut corong kanan
        spawnMultiplyGatesStarterBall(state, config, maxOuterR);

        // =====================================================================
        // MODE 3: BEADED SPIRAL PROGRESS
        // =====================================================================
    } else if (mode === 'beaded_spiral') {
        state.spiralAngle = 0;
        const turns = config.beadSpiralTurns || 4.5;
        const subRows = config.beadSubRows || 3;
        const maxTheta = turns * Math.PI * 2;
        const innerR = 26;
        const bCoeff = (maxOuterR - innerR) / maxTheta;

        for (let theta = Math.PI * 0.6; theta < maxTheta - Math.PI * 0.95; theta += 0.075) {
            const rWallIn = innerR + bCoeff * theta;
            const rWallOut = innerR + bCoeff * (theta + Math.PI * 2);
            const corridorW = rWallOut - rWallIn;
            const dTheta = Math.max(0.045, Math.min(0.16, 6.2 / Math.max(30, rWallIn + corridorW * 0.5)));
            if (Math.random() > dTheta / 0.075) continue;

            for (let row = 1; row <= subRows; row++) {
                const frac = row / (subRows + 1);
                const rBead = rWallIn + corridorW * frac;
                const hue = ((theta / maxTheta) * 320 + row * 25 + 110) % 360;
                state.beads.push({
                    theta: theta,
                    radius: rBead,
                    hue: hue,
                    size: 2.3,
                    alive: true,
                    isSpiralBead: true
                });
            }
        }

        const startTheta = (turns - 0.45) * Math.PI * 2;
        const startR = innerR + bCoeff * startTheta;
        const b = spawnBall(state, CX + Math.cos(startTheta) * startR, CY + Math.sin(startTheta) * startR, Math.min(13, baseBallR * 0.85), 0, rng, true, config);
        b.isWhiteStar = true;
        b.vx = 1.8;
        b.vy = 0.5;

        // =====================================================================
        // MODE 4: MERGE / FLASK 2048
        // =====================================================================
    } else if (mode === 'fusion') {
        const flaskR = maxOuterR;
        const neckGap = Math.max(0.22, gapRad);
        state.rings.push({
            radius: flaskR,
            angle: -Math.PI / 2 - neckGap / 2,
            speed: 0,
            gap: neckGap,
            hue: 165,
            hasSpikes: false,
            isFlask: true
        });

        const bGreen = spawnMergeBall(state, CX - 6, CY + flaskR * 0.72, 3, rng, config);
        bGreen.vx = 0.6; bGreen.vy = -0.5;

        const bCyan = spawnMergeBall(state, CX - 34, CY + flaskR * 0.56, 2, rng, config);
        bCyan.vx = -1.4; bCyan.vy = -2.2;

        const bPurp1 = spawnMergeBall(state, CX + 28, CY + flaskR * 0.25, 1, rng, config);
        bPurp1.vx = 1.8; bPurp1.vy = -2.8;

        const bPurp2 = spawnMergeBall(state, CX + 42, CY + flaskR * 0.52, 1, rng, config);
        bPurp2.vx = -1.5; bPurp2.vy = -3.2;

        const neckTopY = 24;
        const neckBotY = CY - flaskR;
        for (let q = 0; q < 4; q++) {
            const yPos = neckTopY + q * ((neckBotY - neckTopY) / 3.6);
            const b = spawnMergeBall(state, CX + (rng() - 0.5) * 3.0, yPos, 0, rng, config);
            b.vx = (rng() - 0.5) * 0.55;
            b.vy = 2.6;
            b.inNeck = true;
        }

    } else if (mode === 'accumulation') {
        state.rings.push({
            radius: maxOuterR,
            angle: -Math.PI / 2 - gapRad / 2,
            speed: 0.011 * config.rotSpeedMult,
            gap: gapRad,
            hue: 155,
            hasSpikes: true
        });
        spawnBall(state, CX + (rng() - 0.5) * 18, CY - 25, baseBallR, 150, rng, false, config);

    } else if (mode === 'classic') {
        const numRings = config.classicRingCount || 24;
        const phase = config.classicPhaseShift !== undefined ? config.classicPhaseShift : 0.14;
        const baseAngle = rng() * Math.PI * 2;
        for (let i = 0; i < numRings; i++) {
            const t = i / Math.max(1, numRings - 1);
            const r = 52 + t * (maxOuterR - 52);
            state.rings.push({
                radius: r,
                angle: baseAngle + i * phase,
                speed: (0.010 + i * 0.0006) * config.rotSpeedMult,
                gap: gapRad * 1.25,
                hue: (i * Math.floor(360 / numRings)) % 360,
                hasSpikes: false
            });
        }
        spawnBall(state, CX, CY - 8, Math.min(11, baseBallR * 0.65), 32, rng, false, config);

    } else if (mode === 'destruction') {
        const numRings = config.beadRingLayers || 10;
        const dotR = config.beadDotSize || 3.2;
        for (let rIdx = 0; rIdx < numRings; rIdx++) {
            const t = rIdx / Math.max(1, numRings - 1);
            const R = 68 + t * (maxOuterR - 68);
            const numBeads = Math.floor((2 * Math.PI * R) / (dotR * 3.4));
            const dir = rIdx % 2 === 0 ? 1 : -1;
            const speed = dir * (0.006 + rIdx * 0.0008) * config.rotSpeedMult;
            for (let b = 0; b < numBeads; b++) {
                const ang = (Math.PI * 2 * b) / numBeads;
                state.beads.push({
                    radius: R,
                    angle: ang,
                    speed,
                    hue: ((ang / (Math.PI * 2)) * 360 + rIdx * 22) % 360,
                    size: dotR,
                    alive: true
                });
            }
        }
        spawnBall(state, CX + (rng() - 0.5) * 10, CY - 10, Math.min(11, baseBallR * 0.65), 25, rng, false, config);

    } else if (mode === 'infinite') {
        state.rings.push({
            radius: maxOuterR,
            angle: -Math.PI / 4,
            speed: 0.012 * config.rotSpeedMult,
            gap: gapRad * 1.15,
            hue: 25,
            hasSpikes: false
        });
        spawnBall(state, CX - 20, CY - 20, Math.min(10, baseBallR * 0.55), 25, rng, false, config);

    } else if (mode === 'web_expansion') {
        state.rings.push({
            radius: maxOuterR,
            angle: rng() * Math.PI * 2,
            speed: 0.011 * config.rotSpeedMult,
            gap: gapRad * 0.7,
            hue: 190,
            hasSpikes: false
        });
        const b = spawnBall(state, CX, CY - 40, baseBallR * 0.85, 0, rng, true, config);
        b.isWhiteStar = true;

    } else if (mode === 'trail_expansion') {
        state.rings.push({
            radius: maxOuterR,
            angle: rng() * Math.PI * 2,
            speed: 0.011 * config.rotSpeedMult,
            gap: gapRad * 0.7,
            hue: 300,
            hasSpikes: false
        });
        spawnBall(state, CX + (rng() - 0.5) * 16, CY - 30, baseBallR * 0.75, 200, rng, false, config);

    } else if (mode === 'fragment') {
        state.rings.push({
            radius: maxOuterR,
            angle: rng() * Math.PI * 2,
            speed: 0.011 * config.rotSpeedMult,
            gap: gapRad * 0.75,
            hue: 280,
            hasSpikes: true
        });
        for (let i = 0; i < 2; i++) {
            const b = spawnBall(state, CX + (i === 0 ? -45 : 45), CY - 25, baseBallR * 1.15, 275, rng, true, config);
            b.veins = true;
        }

    } else if (mode === 'spiral') {
        state.spiralAngle = 0;
        const turns = config.spiralTurns || 4.2;
        const maxTheta = turns * Math.PI * 2;
        for (let t = Math.PI * 1.5; t < maxTheta - 0.6; t += 1.05) {
            const r = 34 + ((maxOuterR - 34) / maxTheta) * t;
            state.spiralObstacles.push({ theta: t, r, hue: (t * 25) % 360, size: 9, alive: true });
        }
        spawnBall(state, CX + 5, CY - 5, Math.min(11, baseBallR * 0.65), 310, rng, false, config);

    } else if (mode === 'collision') {
        state.rings.push({
            radius: maxOuterR,
            angle: rng() * Math.PI * 2,
            speed: 0.011 * config.rotSpeedMult,
            gap: gapRad * 0.8,
            hue: 210,
            hasSpikes: false
        });
        spawnBall(state, CX - 60, CY - 20, baseBallR * 1.15, 330, rng, true, config);
        spawnBall(state, CX + 60, CY - 20, baseBallR * 1.15, 190, rng, true, config);

    } else if (mode === 'web_battle') {
        state.rings.push({
            radius: maxOuterR,
            angle: 0,
            speed: 0.009 * config.rotSpeedMult,
            gap: 0,
            hue: 220,
            hasSpikes: false
        });
        const pack = COUNTRY_PACKS[config.countryPack] || COUNTRY_PACKS.asean;
        for (let i = 0; i < 3; i++) {
            const b = spawnBall(state, CX + (i - 1) * 48, CY - 20, baseBallR * 0.85, i * 115, rng, false, config);
            b.country = pack[i % pack.length];
            b.team = i;
        }

    } else if (mode === 'eating_balls') {
        state.rings.push({
            radius: maxOuterR,
            angle: 0,
            speed: 0.008 * config.rotSpeedMult,
            gap: 0,
            hue: 160,
            hasSpikes: false
        });
        const count = config.eatingInitialCount || 22;
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count;
            const d = (0.2 + rng() * 0.55) * maxOuterR;
            const r = 6 + rng() * 9;
            spawnBall(state, CX + Math.cos(ang) * d, CY + Math.sin(ang) * d, r, (i * 18) % 360, rng, false, config);
        }

    } else if (mode === 'country_royale') {
        state.rings.push({
            radius: maxOuterR,
            angle: -Math.PI / 2,
            speed: 0.010 * config.rotSpeedMult,
            gap: 0,
            hue: 350,
            hasSpikes: true
        });
        const pack = COUNTRY_PACKS[config.countryPack] || COUNTRY_PACKS.asean;
        pack.forEach((country, idx) => {
            const ang = (Math.PI * 2 * idx) / pack.length;
            const dist = maxOuterR * 0.42;
            const b = spawnBall(state, CX + Math.cos(ang) * dist, CY + Math.sin(ang) * dist, baseBallR * 0.88, idx * 40, rng, false, config);
            b.country = country;
            b.hp = 100;
            b.maxHp = 100;
        });
    }

    return state;
}

// ============================================================================
// BUILDER: MULTIPLY GATES SPIRAL PARAMS, STARTER BALL, ORBS, & GLASS OBSTACLES
// ============================================================================
// ============================================================================
// GEOMETRI SPIRAL 1:1 PRESISI SESUAI SCREENSHOT REFERENSI (5 LAPIS DINDING)
// ============================================================================
function getMultiplySpiralParams(maxOuterR) {
    const innerR = 32; // Radius cincin portal tengah
    // 4.5 putaran penuh (9 * PI rad):
    // Menghasilkan 4 lorong spiral di bawah + 1 cincin pelindung terluar yang berjarak lega di kiri & atas!
    const totalTheta = Math.PI * 9;
    const bCoeff = (maxOuterR - innerR) / totalTheta;
    const pitch = bCoeff * Math.PI * 2; // Lebar 1 lorong spiral (~42px)
    return { innerR, maxOuterR, totalTheta, bCoeff, pitch };
}

function spawnMultiplyGatesStarterBall(state, config, maxOuterR) {
    const { innerR, bCoeff } = getMultiplySpiralParams(maxOuterR);
    const baseBallR = Math.max(5, config.ballRadiusRef * SCALE_1080 * 0.72);
    // Tepat di bibir corong kanan (Jam 3, di antara dinding θ = 6*PI dan ekor luar θ = 8*PI)
    const entryR = innerR + bCoeff * (Math.PI * 7.25);
    const b = spawnBall(
        state,
        CX + entryR,
        CY - 4,
        Math.min(11, baseBallR * 0.8),
        165,
        state.rng,
        false,
        config
    );
    b.WhiteBorder = true;
    b.useAvatar = config.glassStyle === 'hourglass';
    b.vx = -0.25;
    b.vy = 2.5;
    return b;
}

function buildMultiplyGateOrbs(state, config, maxOuterR, rng) {
    state.gateOrbs = [];
    const { innerR, bCoeff } = getMultiplySpiralParams(maxOuterR);
    const count = Math.max(1, Math.min(6, config.gateCount || 4));
    const layout = config.gateLayout || 'scattered';

    const palettes = [
        { color: '#eab308', border: '#fef08a' }, // Gold (x4)
        { color: '#c084fc', border: '#fde047' }, // Purple (x5)
        { color: '#4ade80', border: '#bbf7d0' }, // Green (x3)
        { color: '#38bdf8', border: '#bae6fd' }, // Blue (x1)
        { color: '#f43f5e', border: '#fecdd3' }, // Rose (x2)
        { color: '#2dd4bf', border: '#99f6e4' }  // Teal
    ];

    // Posisi 1:1 dengan Screenshot image_ec1c76.jpg & image_ec1c8f.png:
    // - x4 Kuning di Kanan-Atas dekat atap (jam 1)
    // - x5 Ungu di Kanan (jam 3, tepat di ujung dinding spiral θ = 6*PI)
    // - x3 Hijau di Bawah-Tengah (jam 6, menempel di bawah dinding k=1)
    // - x1 Biru di Bawah-Luar (jam 6, menempel di bawah dinding k=2)
    const scatteredSlots = [
        { x: CX + maxOuterR * 0.28, y: CY - maxOuterR * 0.78, mult: 4, palIdx: 0 }, // Top-Right x4 Kuning
        { x: CX + (innerR + bCoeff * (Math.PI * 6.0)), y: CY - 14, mult: 5, palIdx: 1 }, // Right 3 o'clock x5 Ungu
        { x: CX, y: CY + (innerR + bCoeff * (Math.PI * 2.5)) + 15, mult: 3, palIdx: 2 }, // Bottom-Inner x3 Hijau
        { x: CX, y: CY + (innerR + bCoeff * (Math.PI * 4.5)) + 15, mult: 1, palIdx: 3 }, // Bottom-Outer x1 Biru
        { x: CX - maxOuterR * 0.48, y: CY - maxOuterR * 0.42, mult: 2, palIdx: 4 },
        { x: CX + maxOuterR * 0.52, y: CY - maxOuterR * 0.42, mult: 3, palIdx: 5 }
    ];

    // Posisi 1:1 dengan Screenshot image_ec1c73.jpg (Berjajar x4, x3, x2 di tengah lorong kanan):
    const rightLineSlots = [
        { theta: Math.PI * 1.06, mult: 4, palIdx: 2 }, // Lorong 1 Kanan: x4 Hijau
        { theta: Math.PI * 3.06, mult: 3, palIdx: 1 }, // Lorong 2 Kanan: x3 Ungu
        { theta: Math.PI * 5.06, mult: 2, palIdx: 3 }, // Lorong 3 Kanan: x2 Biru
        { theta: Math.PI * 4.50, mult: 3, palIdx: 0 },
        { theta: Math.PI * 2.50, mult: 4, palIdx: 4 },
        { theta: Math.PI * 6.60, mult: 5, palIdx: 5 }
    ];

    const bottomStackSlots = [
        { theta: Math.PI * 1.50, mult: 4, palIdx: 2 },
        { theta: Math.PI * 3.50, mult: 3, palIdx: 1 },
        { theta: Math.PI * 5.50, mult: 2, palIdx: 3 },
        { theta: Math.PI * 6.00, mult: 5, palIdx: 0 },
        { theta: Math.PI * 7.60, mult: 4, palIdx: 4 },
        { theta: Math.PI * 2.50, mult: 1, palIdx: 5 }
    ];

    const chosenPts = [];

    for (let i = 0; i < count; i++) {
        let x, y, mult, pal;
        if (layout === 'scattered') {
            const s = scatteredSlots[i % scatteredSlots.length];
            x = s.x; y = s.y; mult = s.mult; pal = palettes[s.palIdx];
        } else if (layout === 'right_line') {
            const s = rightLineSlots[i % rightLineSlots.length];
            const rOrb = innerR + bCoeff * s.theta;
            x = CX + Math.cos(s.theta) * rOrb;
            y = CY + Math.sin(s.theta) * rOrb;
            mult = s.mult; pal = palettes[s.palIdx];
        } else if (layout === 'bottom_stack') {
            const s = bottomStackSlots[i % bottomStackSlots.length];
            const rOrb = innerR + bCoeff * s.theta;
            x = CX + Math.cos(s.theta) * rOrb;
            y = CY + Math.sin(s.theta) * rOrb;
            mult = s.mult; pal = palettes[s.palIdx];
        } else {
            let tries = 0;
            do {
                const lane = Math.floor(rng() * 3);
                const phi = 0.25 + rng() * (Math.PI * 1.55);
                const theta = (lane * 2 + 1) * Math.PI + phi;
                const rOrb = innerR + bCoeff * theta;
                x = CX + Math.cos(theta) * rOrb;
                y = CY + Math.sin(theta) * rOrb;
                tries++;
            } while (tries < 30 && chosenPts.some(pt => Math.hypot(x - pt.x, y - pt.y) < 44));
            pal = palettes[i % palettes.length];
            mult = 1 + Math.floor(rng() * 5);
        }

        chosenPts.push({ x, y });
        state.gateOrbs.push({
            x,
            y,
            r: 15.5,
            mult,
            color: pal.color,
            border: pal.border,
            hitCooldown: 0,
            pulseScale: 1
        });
    }
}

function buildCustomGlassObstacles(state, config, maxOuterR) {
    state.meshTriangles = [];
    const { innerR, bCoeff, pitch } = getMultiplySpiralParams(maxOuterR);
    const style = config.glassStyle || 'hexagons';

    // Untuk Hourglass (image_ec1c73.jpg): 1 baris jam pasir besar per lorong spiral
    // Untuk Hexagons (image_ec1c76.jpg): 2 baris sarang lebah per lorong spiral dengan celah hitam yang jelas
    const subRows = style === 'hourglass' ? 1 : 2;

    for (let lane = 0; lane < 3; lane++) {
        const thetaStart = lane * Math.PI * 2;
        const thetaEnd = (lane + 1) * Math.PI * 2;

        for (let row = 0; row < subRows; row++) {
            // Jaga jarak aman dari garis dinding spiral putih (0.24 sampai 0.78 dari lebar lorong)
            // sehingga garis dinding putih TIDAK PERNAH memotong kaca!
            const frac1 = style === 'hourglass' ? 0.16 : (0.24 + row * 0.38);
            const frac2 = style === 'hourglass' ? 0.84 : (frac1 + 0.28);
            const fracMid = (frac1 + frac2) * 0.5;

            let theta = thetaStart;
            while (theta < thetaEnd) {
                const rWallInner = innerR + bCoeff * theta;
                const rMid = rWallInner + pitch * fracMid;
                const r1 = rWallInner + pitch * frac1;
                const r2 = rWallInner + pitch * frac2;

                // Beri jarak antar kaca (arcStepPx = 15.5px) agar ada ruang hitam seperti di referensi!
                const arcStepPx = style === 'hexagons' ? 15.2 : (style === 'hourglass' ? 19.5 : 16.5);
                const dTheta = arcStepPx / Math.max(34, rMid);
                const midTheta = theta + dTheta * 0.5;

                const cx = CX + Math.cos(midTheta) * rMid;
                const cy = CY + Math.sin(midTheta) * rMid;

                // Kosongkan ruang di sekitar Gate Orbs, Segitiga Putih Atas, dan Duri Bawah-Kanan
                const nearGate = state.gateOrbs.some(g => Math.hypot(cx - g.x, cy - g.y) < g.r + 9);
                const nearTopWedge = state.topObstacle && Math.hypot(cx - state.topObstacle.x, cy - (state.topObstacle.y + 10)) < 26;

                const phiMod = ((midTheta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const nearSpikes = (row === subRows - 1) && (config.spikeHeightRef > 0) && (phiMod >= 0.08 && phiMod <= 1.50);

                if (!nearGate && !nearTopWedge && !nearSpikes) {
                    const deg = (phiMod * 180) / Math.PI;
                    const hue = style === 'hourglass'
                        ? 68
                        : ((deg + lane * 22 + 95) % 360);

                    if (style === 'hexagons') {
                        // Segi enam berjarak rapi dengan celah hitam (image_ec1c76.jpg)
                        const hexR = 4.6;
                        const pts = [];
                        for (let v = 0; v < 6; v++) {
                            const va = midTheta + (v * Math.PI) / 3;
                            pts.push({ x: cx + Math.cos(va) * hexR, y: cy + Math.sin(va) * hexR });
                        }
                        state.meshTriangles.push({
                            pts, cx, cy, hue, alive: true, style: 'hexagons', hitR: hexR + 1.4
                        });

                    } else if (style === 'hourglass') {
                        // Bentuk Jam Pasir / Kupu-kupu menyilang (2 segitiga bertemu di titik tengah cx, cy)
                        // Persis seperti pola keramik hijau-emas di image_ec1c73.jpg!
                        const a1 = theta + dTheta * 0.08;
                        const a2 = theta + dTheta * 0.92;
                        const r1_a1 = innerR + bCoeff * a1 + pitch * frac1;
                        const r1_a2 = innerR + bCoeff * a2 + pitch * frac1;
                        const r2_a1 = innerR + bCoeff * a1 + pitch * frac2;
                        const r2_a2 = innerR + bCoeff * a2 + pitch * frac2;

                        const p1 = { x: CX + Math.cos(a1) * r1_a1, y: CY + Math.sin(a1) * r1_a1 };
                        const p2 = { x: CX + Math.cos(a2) * r1_a2, y: CY + Math.sin(a2) * r1_a2 };
                        const p3 = { x: CX + Math.cos(a2) * r2_a2, y: CY + Math.sin(a2) * r2_a2 };
                        const p4 = { x: CX + Math.cos(a1) * r2_a1, y: CY + Math.sin(a1) * r2_a1 };
                        const centerPt = { x: cx, y: cy };

                        state.meshTriangles.push({
                            pts: [p1, p2, centerPt, p3, p4, centerPt],
                            cx, cy, hue, alive: true, style: 'hourglass', hitR: 8.5
                        });

                    } else if (style === 'diamonds') {
                        const dR = 5.6;
                        const radX = Math.cos(midTheta), radY = Math.sin(midTheta);
                        const tanX = -radY, tanY = radX;
                        const pts = [
                            { x: cx + radX * dR, y: cy + radY * dR },
                            { x: cx + tanX * dR * 0.68, y: cy + tanY * dR * 0.68 },
                            { x: cx - radX * dR, y: cy - radY * dR },
                            { x: cx - tanX * dR * 0.68, y: cy - tanY * dR * 0.68 }
                        ];
                        state.meshTriangles.push({
                            pts, cx, cy, hue, alive: true, style: 'diamonds', hitR: dR
                        });

                    } else {
                        const a1 = theta + dTheta * 0.08;
                        const a2 = theta + dTheta * 0.92;
                        const p1 = { x: CX + Math.cos(a1) * r1, y: CY + Math.sin(a1) * r1 };
                        const p2 = { x: CX + Math.cos(a2) * r1, y: CY + Math.sin(a2) * r1 };
                        const p3 = { x: CX + Math.cos(midTheta) * r2, y: CY + Math.sin(midTheta) * r2 };
                        state.meshTriangles.push({
                            pts: [p1, p2, p3],
                            cx, cy, hue, alive: true, style: 'triangles', hitR: 6.2
                        });
                    }
                }
                theta += dTheta;
            }
        }
    }
}

// ============================================================================
// BUILDER: 4 CUSTOMIZABLE GLASS OBSTACLE STYLES (HEXAGONS, HOURGLASS, MESH, DIAMONDS)
// ============================================================================
function buildCustomGlassObstacles(state, config, maxOuterR) {
    state.meshTriangles = [];
    const style = config.glassStyle || 'hexagons';
    const ringsCount = Math.max(4, Math.min(12, config.meshDensity || 8));
    const minR = 44;
    const maxMeshR = maxOuterR * 0.84;
    const ringStep = (maxMeshR - minR) / ringsCount;

    for (let rIdx = 0; rIdx < ringsCount; rIdx++) {
        const rMid = minR + (rIdx + 0.5) * ringStep;
        const r1 = minR + rIdx * ringStep;
        const r2 = r1 + ringStep * 0.92;
        const circumference = 2 * Math.PI * rMid;
        const segs = Math.max(12, Math.floor(circumference / (style === 'hexagons' ? 14 : 18)));
        const dAng = (Math.PI * 2) / segs;

        for (let s = 0; s < segs; s++) {
            const a1 = s * dAng + (rIdx % 2) * (dAng * 0.5);
            const a2 = a1 + dAng * 0.88;
            const midA = (a1 + a2) * 0.5;
            const cx = CX + Math.cos(midA) * rMid;
            const cy = CY + Math.sin(midA) * rMid;

            // Leave clean space around Multiply Gate Orbs and Top White Obstacle
            const nearGate = state.gateOrbs.some(g => Math.hypot(cx - g.x, cy - g.y) < g.r + 11);
            if (nearGate) continue;
            if (Math.hypot(cx - CX, cy - (CY - maxOuterR)) < 26) continue;

            // Leave open entry channel on the left/outer-top for the starter ball in Hexagon mode
            const normMidA = ((midA % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (style === 'hexagons' && rIdx >= ringsCount - 2 && normMidA > Math.PI * 0.88 && normMidA < Math.PI * 1.42) {
                continue;
            }

            // Color progression matching Screenshots (Green -> Yellow -> Red -> Purple -> Blue)
            const deg = (normMidA * 180) / Math.PI;
            const hue = style === 'hourglass'
                ? (72 + (rIdx % 2) * 14) // Olive-Gold Hourglass like Screenshot 1
                : ((deg + rIdx * 12 + 80) % 360);

            if (style === 'hexagons') {
                // Hexagon Honeycomb Cell (Screenshots 2-4)
                const hexR = Math.min(6.2, ringStep * 0.42);
                const pts = [];
                for (let v = 0; v < 6; v++) {
                    const va = midA + (v * Math.PI) / 3;
                    pts.push({ x: cx + Math.cos(va) * hexR, y: cy + Math.sin(va) * hexR });
                }
                state.meshTriangles.push({
                    pts, cx, cy, hue, alive: true, style: 'hexagons', hitR: hexR + 1.5
                });

            } else if (style === 'hourglass') {
                // Bowtie / Hourglass Checkerboard Cell (Screenshot 1)
                const p1 = { x: CX + Math.cos(a1) * r1, y: CY + Math.sin(a1) * r1 };
                const p2 = { x: CX + Math.cos(a2) * r1, y: CY + Math.sin(a2) * r1 };
                const p3 = { x: CX + Math.cos(a2) * r2, y: CY + Math.sin(a2) * r2 };
                const p4 = { x: CX + Math.cos(a1) * r2, y: CY + Math.sin(a1) * r2 };
                // Crossed vertices form the authentic hourglass/bowtie pattern!
                state.meshTriangles.push({
                    pts: [p1, p2, p4, p3],
                    cx, cy, hue, alive: true, style: 'hourglass', hitR: ringStep * 0.45
                });

            } else if (style === 'diamonds') {
                // Diamond Crystal Grid
                const dR = Math.min(7.5, ringStep * 0.46);
                const radX = Math.cos(midA), radY = Math.sin(midA);
                const tanX = -radY, tanY = radX;
                const pts = [
                    { x: cx + radX * dR, y: cy + radY * dR },
                    { x: cx + tanX * dR * 0.7, y: cy + tanY * dR * 0.7 },
                    { x: cx - radX * dR, y: cy - radY * dR },
                    { x: cx - tanX * dR * 0.7, y: cy - tanY * dR * 0.7 }
                ];
                state.meshTriangles.push({
                    pts, cx, cy, hue, alive: true, style: 'diamonds', hitR: dR
                });

            } else {
                // Triangulated Polygon Mesh
                const x1 = CX + Math.cos(a1) * r1, y1 = CY + Math.sin(a1) * r1;
                const x2 = CX + Math.cos(a2) * r1, y2 = CY + Math.sin(a2) * r1;
                const x3 = CX + Math.cos(a1) * r2, y3 = CY + Math.sin(a1) * r2;
                const x4 = CX + Math.cos(a2) * r2, y4 = CY + Math.sin(a2) * r2;
                state.meshTriangles.push({
                    pts: [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }],
                    cx: (x1 + x2 + x3) / 3, cy: (y1 + y2 + y3) / 3,
                    hue, alive: true, style: 'triangles', hitR: 8
                });
                state.meshTriangles.push({
                    pts: [{ x: x2, y: y2 }, { x: x4, y: y4 }, { x: x3, y: y3 }],
                    cx: (x2 + x4 + x3) / 3, cy: (y2 + y4 + y3) / 3,
                    hue: (hue + 12) % 360, alive: true, style: 'triangles', hitR: 8
                });
            }
        }
    }
}

// ============================================================================
// BUILDER: STATIC SPIKED SPIRAL & STATIONARY MULTIPLIER GATE
// ============================================================================
function buildSpikedSpiralTeethAndGate(state, config, maxOuterR) {
    const innerR = 26;
    const turns = getAlignedSpikedSpiralTurns(config);
    const maxTheta = turns * Math.PI * 2;
    const bCoeff = (maxOuterR - innerR) / maxTheta;
    const ballR = Math.min(13.5, Math.max(8, config.ballRadiusRef * SCALE_1080 * 0.50));

    const gateTheta = maxTheta - 1.12;
    const spikeEndTheta = maxTheta - 1.52;
    const spikeStartTheta = 0.25;
    const toothArcPx = Math.max(11, config.spikeWidthRef * SCALE_1080 * 0.52);

    for (let t = spikeStartTheta; t < spikeEndTheta;) {
        const r = innerR + bCoeff * t;
        const dTheta = Math.max(0.08, Math.min(0.28, toothArcPx / Math.max(24, r)));
        state.spiralSpikes.push({
            theta1: t,
            thetaMid: t + dTheta * 0.5,
            theta2: t + dTheta,
            alive: true
        });
        t += dTheta;
    }

    state.totalInitialSpikes = Math.max(1, state.spiralSpikes.length);

    const gateTrackR = innerR + bCoeff * gateTheta - ballR - 2.5;
    const gateScreenAng = -gateTheta;
    state.spiralGate = {
        theta: gateTheta,
        rTrack: gateTrackR,
        x: CX + Math.cos(gateScreenAng) * gateTrackR,
        y: CY + Math.sin(gateScreenAng) * gateTrackR,
        r: 17.5,
        mult: 1,
        pulseScale: 1.0
    };
}

function spawnSingleTopRightStarterBall(state, config, maxOuterR) {
    const innerR = 26;
    const turns = getAlignedSpikedSpiralTurns(config);
    const maxTheta = turns * Math.PI * 2;
    const bCoeff = (maxOuterR - innerR) / maxTheta;
    const ballR = Math.min(13.5, Math.max(8, config.ballRadiusRef * SCALE_1080 * 0.50));

    const entryTheta = maxTheta;
    const entryTrackR = innerR + bCoeff * entryTheta - ballR - 2.5;
    const startX = CX + entryTrackR;
    const startY = CY - maxOuterR * 0.58;

    const b = spawnBall(state, startX, startY, ballR, 195, state.rng, false, config);
    b.useAvatar = true;
    b.dropPhase = true;
    b.entryTheta = entryTheta;
    b.entryTrackR = entryTrackR;
    b.spiralTheta = entryTheta;
    b.vx = 0;
    b.vy = 1.8;

    state.wavePhase = 'drop';
}

function spawnBall(state, x, y, radius, hue, rng, isBoss = false, config = simConfig) {
    const initVx = (config.initSpeedXRef || 4.2) * 0.60;
    const dir = rng() > 0.5 ? 1 : -1;
    const b = {
        x,
        y,
        vx: initVx * dir * (0.85 + rng() * 0.3),
        vy: -1.2 - rng() * 1.2,
        r: radius,
        hue: hue !== undefined ? hue : Math.floor(rng() * 360),
        isBoss,
        isWhiteStar: false,
        veins: false,
        useAvatar: false,
        WhiteBorder: false,
        multiplierBadge: null,
        faceTimer: 0,
        level: 0,
        team: 0,
        rot: 0,
        vRot: (rng() - 0.5) * 0.08,
        country: null,
        hp: 100,
        maxHp: 100
    };
    state.balls.push(b);
    return b;
}

function spawnMergeBall(state, x, y, level, rng, config = simConfig) {
    const safeLvl = Math.min(level, activeMergeTiers.length - 1);
    const tier = activeMergeTiers[safeLvl];
    const scaleMult = (config.ballRadiusRef || 100) / 100;
    const r = tier.r * scaleMult;

    let clampedX = x;
    let clampedY = y;
    const maxOuterR = config.circleRadiusRef * SCALE_1080;
    const neckJoinY = CY - maxOuterR * 0.92;
    if (clampedY > neckJoinY) {
        const dx = clampedX - CX;
        const dy = clampedY - CY;
        const dist = Math.hypot(dx, dy);
        if (dist + r > maxOuterR - 2) {
            const allowedDist = Math.max(0, maxOuterR - r - 2);
            clampedX = CX + (dx / (dist || 1)) * allowedDist;
            clampedY = CY + (dy / (dist || 1)) * allowedDist;
        }
    }

    const b = {
        x: clampedX,
        y: clampedY,
        vx: (rng() - 0.5) * (config.initSpeedXRef || 2.2),
        vy: 1.8,
        r,
        hue: safeLvl * 45,
        level: safeLvl,
        isMergeBall: true,
        inNeck: clampedY < neckJoinY,
        rot: 0,
        vRot: (rng() - 0.5) * 0.03,
        mergeCooldown: 7,
        spawnPopScale: 0.78
    };
    state.balls.push(b);
    if (safeLvl + 1 > state.escapedCount) {
        state.escapedCount = safeLvl + 1;
    }
    return b;
}

function spawnPolygonalGlassShards(state, x, y, count = 10, baseHue = 192, isRainbow = false) {
    for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
        const spd = 1.8 + Math.random() * 4.2;
        const rad = 7.5 + Math.random() * 8.5;
        const verts = [];
        const numPts = 4 + (i % 3);
        for (let v = 0; v < numPts; v++) {
            const va = (Math.PI * 2 * v) / numPts + (Math.random() - 0.5) * 0.35;
            const vr = rad * (0.65 + Math.random() * 0.45);
            verts.push({ x: Math.cos(va) * vr, y: Math.sin(va) * vr });
        }
        const shardHue = isRainbow ? (baseHue + i * 18) % 360 : (190 + (i % 3) * 6);
        state.glassShards.push({
            x,
            y,
            vx: Math.cos(ang) * spd - 0.4,
            vy: Math.sin(ang) * spd - 0.8,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.16,
            verts,
            fill: isRainbow ? `hsla(${shardHue}, 85%, 56%, 0.78)` : 'rgba(103, 232, 249, 0.82)',
            stroke: isRainbow ? `hsl(${shardHue}, 95%, 78%)` : '#e0f2fe',
            life: 1.0
        });
    }
    if (state.glassShards.length > 240) {
        state.glassShards.splice(0, state.glassShards.length - 240);
    }
}

function spawnMergeShockwave(state, x, y, targetRadius) {
    state.shockwaves.push({
        x,
        y,
        r: targetRadius * 0.65,
        maxR: Math.max(48, targetRadius * 2.15),
        alpha: 0.95
    });
}

function addFloatingText(state, x, y, text, color = '#d4ff33') {
    if (!simConfig.floatingTextFX) return;
    state.floatingTexts.push({ x, y, text, color, life: 1.0, vy: -1.3 });
    if (state.floatingTexts.length > 30) state.floatingTexts.shift();
}

function isAngleInArc(phi, start, span) {
    if (span <= 0) return false;
    const twoPi = Math.PI * 2;
    const normPhi = ((phi % twoPi) + twoPi) % twoPi;
    const normStart = ((start % twoPi) + twoPi) % twoPi;
    const diff = ((normPhi - normStart) % twoPi + twoPi) % twoPi;
    return diff <= span;
}

function isAngleHittingSpike(phi, ring, config) {
    if (!ring.hasSpikes || config.spikeHeightRef <= 0) return false;
    if (ring.gap > 0 && isAngleInArc(phi, ring.angle, ring.gap)) return false;

    if (config.spikeCoverage === 'full') return true;
    if (config.spikeCoverage === 'right_arc') {
        // Right/Bottom-Right rainbow spike zone along the inner spiral arcs (NO spike at top 12 o'clock!)
        return isAngleInArc(phi, 0.05, Math.PI * 0.45);
    }
    if (config.spikeCoverage === 'bottom') {
        const span = Math.PI * 0.65;
        return isAngleInArc(phi, ring.angle + Math.PI - span / 2, span);
    }
    for (let c = 0; c < 3; c++) {
        if (isAngleInArc(phi, ring.angle + (c * Math.PI * 2) / 3 + 0.55, 0.38)) return true;
    }
    return false;
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const ccw = (Ax, Ay, Bx, By, Cx, Cy) => (Cy - Ay) * (Bx - Ax) > (By - Ay) * (Cx - Ax);
    return (ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4)) &&
        (ccw(x1, y1, x2, y2, x3, y3, x4, y4) !== ccw(x1, y1, x2, y2, x4, y4));
}

/*************************************************************************
 * 2. PHYSICS STEP UPDATE (ALL 16 MODES)
 *************************************************************************/
function stepPhysics(state, config, headless = false) {
    state.ticks++;
    const mode = config.mode;
    const dt = 0.85;
    const subSteps = mode === 'fusion' ? 6 : 4;
    const stepDt = dt / subSteps;

    const gScaled = config.gravityRef * (mode === 'fusion' ? 0.135 : 0.14);
    const minBounceVel = config.minBounceSpeedRef * 0.72;
    const maxSpeedCap = mode === 'fusion' ? 9.5 : Math.max(6.4, minBounceVel * 1.65);
    const baseBallR = Math.max(6, config.ballRadiusRef * SCALE_1080 * 0.72);
    const spikeH = config.spikeHeightRef * SCALE_1080 * 0.45;
    const maxOuterR = config.circleRadiusRef * SCALE_1080;

    if (config.suddenDeath && state.ticks > 1800 && state.rings.length > 0) {
        for (const r of state.rings) {
            if (r.radius > 95) r.radius -= 0.08 * dt;
        }
    }

    if (state.goalCelebrationTimer > 0) {
        state.goalCelebrationTimer--;
    }

    if (mode === 'spiked_spiral') {
        stepSpikedSpiralWaveGateMode(state, config, dt, maxOuterR, headless);
    } else {
        if (mode === 'multiply_gates') {
            state.spiralAngle = 0;
            for (const g of state.gateOrbs) {
                if (g.hitCooldown > 0) g.hitCooldown--;
                if (g.pulseScale > 1) g.pulseScale = Math.max(1, g.pulseScale - 0.04 * dt);
            }
            if (state.balls.length === 0 && state.ticks % 25 === 0) {
                spawnMultiplyGatesStarterBall(state, config, maxOuterR);
            }
        } else if (mode === 'beaded_spiral') {
            state.spiralAngle = (state.spiralAngle - 0.015 * config.rotSpeedMult * dt) % (Math.PI * 2);
        } else if (mode === 'spiral') {
            state.spiralAngle = (state.spiralAngle + 0.011 * config.rotSpeedMult * dt) % (Math.PI * 2);
        }

        if (mode === 'fusion' && state.rings.length > 0) {
            const interval = Math.max(16, config.spawnIntervalTicks || 34);
            if (state.ticks % interval === 0 && state.balls.length < 48 && !state.escaped) {
                const spawnY = 14;
                const tooClose = state.balls.some(b => Math.abs(b.y - spawnY) < b.r * 2.1 && Math.abs(b.x - CX) < 28);
                if (!tooClose) {
                    const b = spawnMergeBall(state, CX + (state.rng() - 0.5) * 3.0, spawnY, 0, state.rng, config);
                    b.vx = (state.rng() - 0.5) * 0.65;
                    b.vy = 2.6;
                    b.inNeck = true;
                }
            }
        }

        for (const ring of state.rings) {
            if (mode !== 'multiply_gates') {
                ring.angle = (ring.angle + ring.speed * dt) % (Math.PI * 2);
            }
        }
        for (const pb of state.pinnedBalls) {
            pb.angle += pb.rotSpeed * dt;
            pb.x = CX + Math.cos(pb.angle) * pb.dist;
            pb.y = CY + Math.sin(pb.angle) * pb.dist;
        }
        for (const bead of state.beads) {
            if (bead.alive && !bead.isSpiralBead) {
                bead.angle = (bead.angle + bead.speed * dt) % (Math.PI * 2);
            }
        }

        for (let s = 0; s < subSteps; s++) {
            for (let bIdx = state.balls.length - 1; bIdx >= 0; bIdx--) {
                const b = state.balls[bIdx];
                if (!b) continue;
                const prevX = b.x;
                const prevY = b.y;

                if (b.mergeCooldown > 0 && s === 0) b.mergeCooldown--;
                if (b.spawnPopScale && b.spawnPopScale < 1) {
                    b.spawnPopScale = Math.min(1, b.spawnPopScale + 0.04 * stepDt);
                }

                b.vy += gScaled * stepDt;

                if (mode === 'fusion') {
                    const isLargeTier = (b.level || 0) >= 4;
                    const airDrag = isLargeTier ? 0.9965 : 0.9996;
                    b.vx *= Math.pow(airDrag, stepDt);
                    b.vy *= Math.pow(airDrag, stepDt);
                }

                b.x += b.vx * stepDt;
                b.y += b.vy * stepDt;
                b.rot = (b.rot || 0) + (b.vRot || 0) * stepDt;

                const spd = Math.hypot(b.vx, b.vy);
                if (spd > maxSpeedCap) {
                    const scale = maxSpeedCap / spd;
                    b.vx *= scale;
                    b.vy *= scale;
                }

                if (!headless && mode === 'trail_expansion' && s === 0) {
                    b.hue = (b.hue + 1.3) % 360;
                    drawSingleBallVisual(trailCtx, b, state, config, true);
                }

                if (mode === 'web_battle' && s === 0) {
                    for (const line of state.webLines) {
                        if (line.team !== b.team && segmentsIntersect(prevX, prevY, b.x, b.y, line.x1, line.y1, b.x, b.y)) {
                            line.team = b.team;
                            line.color = b.country ? b.country.colors[0] : state.gradStart;
                        }
                    }
                }

                if (mode === 'multiply_gates') {
                    handleMultiplyGatesPhysics(state, b, bIdx, config, minBounceVel, headless);
                    continue;
                }

                if (mode === 'beaded_spiral') {
                    handleBeadedSpiralProgressPhysics(state, b, bIdx, config, minBounceVel, headless);
                    continue;
                }

                if (mode === 'spiral') {
                    handleSpiralCollision(state, b, config, minBounceVel, headless);
                    continue;
                }

                if (mode === 'destruction') {
                    handleBeadedDestruction(state, b, config, minBounceVel, headless);
                    continue;
                }

                if (mode === 'fusion' && state.rings.length > 0) {
                    const ring = state.rings[0];
                    const R = ring.radius;
                    const halfGap = ring.gap / 2;
                    const neckHalfW = R * Math.sin(halfGap);
                    const neckJoinY = CY - R * Math.cos(halfGap);

                    if (b.y < neckJoinY && b.r < neckHalfW) {
                        b.inNeck = true;
                        const innerWall = neckHalfW - 3;
                        if (b.x - b.r < CX - innerWall) {
                            b.x = CX - innerWall + b.r;
                            b.vx = Math.abs(b.vx) * 0.75;
                        }
                        if (b.x + b.r > CX + innerWall) {
                            b.x = CX + innerWall - b.r;
                            b.vx = -Math.abs(b.vx) * 0.75;
                        }
                        continue;
                    } else if (b.inNeck) {
                        b.inNeck = false;
                        if (Math.abs(b.vx) < 0.35) {
                            b.vx += (state.rng() - 0.5) * 1.9;
                        }
                    }
                }

                let bouncedOffPinned = false;
                if (state.pinnedBalls.length > 0) {
                    for (const pb of state.pinnedBalls) {
                        const dx = b.x - pb.x;
                        const dy = b.y - pb.y;
                        const d = Math.hypot(dx, dy);
                        const minDist = b.r + pb.r;
                        if (d < minDist && d > 0.001) {
                            const nx = dx / d;
                            const ny = dy / d;
                            b.x += nx * (minDist - d);
                            b.y += ny * (minDist - d);
                            const dot = b.vx * nx + b.vy * ny;
                            if (dot < 0) {
                                b.vx = (b.vx - 2 * dot * nx) * 1.01;
                                b.vy = (b.vy - 2 * dot * ny) * 1.01;
                                onWallBounce(state, b, pb.x, pb.y, config, headless);
                                bouncedOffPinned = true;
                                break;
                            }
                        }
                    }
                }
                if (bouncedOffPinned) continue;

                if (state.rings.length > 0) {
                    const activeRing = state.rings[0];
                    const dx = b.x - CX;
                    const dy = b.y - CY;
                    const dist = Math.hypot(dx, dy);
                    const phi = Math.atan2(dy, dx);

                    const hittingSpikeAngle = isAngleHittingSpike(phi, activeRing, config);
                    const triggerRadius = hittingSpikeAngle ? (activeRing.radius - spikeH * 0.85) : activeRing.radius;

                    if (dist + b.r >= triggerRadius) {
                        if (activeRing.gap > 0 && isAngleInArc(phi, activeRing.angle, activeRing.gap)) {
                            if (mode !== 'fusion' && dist - b.r > activeRing.radius + 6) {
                                onBallEscapeRing(state, b, bIdx, activeRing, config, headless);
                                break;
                            }
                        } else if (hittingSpikeAngle) {
                            if (mode === 'accumulation') {
                                const pinDist = activeRing.radius - spikeH * 0.55 - b.r * 0.35;
                                state.pinnedBalls.push({
                                    x: CX + Math.cos(phi) * pinDist,
                                    y: CY + Math.sin(phi) * pinDist,
                                    r: b.r * 0.92,
                                    angle: phi,
                                    dist: pinDist,
                                    rotSpeed: activeRing.speed
                                });
                                state.ballsLost++;
                                state.balls.splice(bIdx, 1);
                                if (!headless) {
                                    sound.playDeathSFX();
                                    spawnBurstParticles(state, b.x, b.y, '#94a3b8', 10);
                                    addFloatingText(state, b.x, b.y, 'IMPALED!', '#94a3b8');
                                }
                                spawnBall(state, CX + (state.rng() - 0.5) * 16, CY - 20, baseBallR, (state.ballsLost * 35 + 140) % 360, state.rng, false, config);
                                break;
                            } else if (mode === 'fragment' && b.isBoss && b.r >= 13) {
                                shatterBallIntoFragments(state, b, bIdx, config, headless);
                                break;
                            } else if (mode === 'country_royale' && b.country) {
                                const dmg = Math.round((16 + Math.floor(state.rng() * 10)) * (config.royaleDamageMult || 1.0));
                                b.hp -= dmg;
                                if (!headless) {
                                    sound.playDeathSFX();
                                    addFloatingText(state, b.x, b.y - b.r, `-${dmg} SPIKE!`, '#ff2e63');
                                    spawnBurstParticles(state, b.x, b.y, '#ff2e63', 7);
                                }
                                if (b.hp <= 0) {
                                    state.ballsLost++;
                                    state.balls.splice(bIdx, 1);
                                    checkCountryRoyaleWinner(state, headless);
                                    break;
                                }
                            }
                        }

                        const inNeckOpening = activeRing.gap > 0 && isAngleInArc(phi, activeRing.angle, activeRing.gap);
                        if ((!inNeckOpening || (mode === 'fusion' && b.r >= activeRing.radius * Math.sin(activeRing.gap / 2))) && dist + b.r >= activeRing.radius) {
                            const nx = dx / (dist || 1);
                            const ny = dy / (dist || 1);
                            const overlap = (dist + b.r) - activeRing.radius;
                            b.x -= nx * overlap;
                            b.y -= ny * overlap;

                            const dot = b.vx * nx + b.vy * ny;
                            if (dot > 0) {
                                const restitution = mode === 'fusion' ? getMergeTierRestitution(b.level || 0, config) : 1.004;
                                b.vx = (b.vx - (1 + restitution) * dot * nx);
                                b.vy = (b.vy - (1 + restitution) * dot * ny);

                                if (mode === 'fusion') {
                                    const postSpd = Math.hypot(b.vx, b.vy);
                                    if ((b.level || 0) <= 2 && dot > 1.35) {
                                        const minTierWallBounce = (3 - (b.level || 0)) * 1.15;
                                        if (postSpd < minTierWallBounce && postSpd > 0.1) {
                                            const boost = minTierWallBounce / postSpd;
                                            b.vx *= boost;
                                            b.vy *= boost;
                                        }
                                    }

                                    const tangentVel = -b.vx * ny + b.vy * nx;
                                    b.vRot = (tangentVel / Math.max(9, b.r)) * 0.35;
                                    if (!headless && postSpd > 2.0 && sound.mergeSoundMode === 'meow') {
                                        sound.playMeowSynth(b.level, false);
                                    }
                                } else {
                                    b.vx += -ny * activeRing.speed * 15;
                                    b.vy += nx * activeRing.speed * 15;
                                    const newSpd = Math.hypot(b.vx, b.vy);
                                    if (newSpd < minBounceVel) {
                                        const boost = minBounceVel / (newSpd || 1);
                                        b.vx *= boost;
                                        b.vy *= boost;
                                    }
                                    onWallBounce(state, b, CX + nx * activeRing.radius, CY + ny * activeRing.radius, config, headless);
                                }
                            }
                        }
                    }
                }
            }

            if (['multiply_gates', 'country_royale', 'collision', 'fusion', 'web_battle', 'eating_balls', 'fragment'].includes(mode)) {
                handleBallToBallCollisions(state, config, minBounceVel, headless);
            }
        }
    }

    // Update Visual Particles & Glass Shards
    if (!headless) {
        for (let i = state.glassShards.length - 1; i >= 0; i--) {
            const gs = state.glassShards[i];
            gs.vy += 0.15 * dt;
            gs.x += gs.vx * dt;
            gs.y += gs.vy * dt;
            gs.rot += gs.vRot * dt;
            gs.life -= 0.018 * dt;
            if (gs.life <= 0) state.glassShards.splice(i, 1);
        }
        for (let i = state.shockwaves.length - 1; i >= 0; i--) {
            const sw = state.shockwaves[i];
            sw.r += (sw.maxR - sw.r) * 0.22 + 1.4;
            sw.alpha -= 0.048 * dt;
            if (sw.alpha <= 0) state.shockwaves.splice(i, 1);
        }
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.vy += 0.14 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= 0.025 * dt;
            if (p.life <= 0) state.particles.splice(i, 1);
        }
        for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
            const ft = state.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= 0.022 * dt;
            if (ft.life <= 0) state.floatingTexts.splice(i, 1);
        }
        state.shakeMag *= 0.85;
    }
}

/*************************************************************************
 * 3. DEDICATED PHYSICS FOR SPIRAL & MULTIPLY GATES MODES
 *************************************************************************/

// Mode 1: Spiked Spiral Center
function stepSpikedSpiralWaveGateMode(state, config, dt, maxOuterR, headless) {
    const innerR = 26;
    const turns = getAlignedSpikedSpiralTurns(config);
    const maxTheta = turns * Math.PI * 2;
    const bCoeff = (maxOuterR - innerR) / maxTheta;
    const ballR = Math.min(13.5, Math.max(8, config.ballRadiusRef * SCALE_1080 * 0.50));
    const gate = state.spiralGate;

    if (config.rotSpeedMult > 0) {
        state.spiralAngle = (state.spiralAngle + 0.004 * config.rotSpeedMult * dt) % (Math.PI * 2);
    } else {
        state.spiralAngle = 0;
    }

    if (gate && gate.pulseScale > 1.0) {
        gate.pulseScale = Math.max(1.0, gate.pulseScale - 0.035 * dt);
    }

    if (state.wavePhase === 'spawning_clones' && state.clonesRemainingToSpawn > 0) {
        state.cloneSpawnTimer -= dt;
        if (state.cloneSpawnTimer <= 0) {
            const gateT = gate.theta;
            const rGate = innerR + bCoeff * gateT - ballR - 2.5;
            const minAngGap = (ballR * 1.92) / rGate;
            const blocked = state.balls.some(b => !b.dropPhase && Math.abs(b.spiralTheta - gateT) < minAngGap);

            if (!blocked) {
                const gScreenAng = -gateT + state.spiralAngle;
                const gx = CX + Math.cos(gScreenAng) * rGate;
                const gy = CY + Math.sin(gScreenAng) * rGate;

                const clone = spawnBall(state, gx, gy, ballR, 195, state.rng, false, config);
                clone.useAvatar = true;
                clone.dropPhase = false;
                clone.passedGate = true;
                clone.spiralTheta = gateT - 0.02;
                state.clonesRemainingToSpawn--;
                state.cloneSpawnTimer = 1.6;
                gate.pulseScale = 1.18;
                if (!headless) sound.triggerNextNote();
            }
        }
        if (state.clonesRemainingToSpawn <= 0) {
            state.wavePhase = 'marching';
        }
    }

    for (let i = state.balls.length - 1; i >= 0; i--) {
        const b = state.balls[i];
        b.r = ballR;

        if (b.dropPhase) {
            b.vy += 0.16 * dt;
            b.y += b.vy * dt;
            const targetEntryX = CX + Math.cos(state.spiralAngle) * b.entryTrackR;
            const targetEntryY = CY + Math.sin(state.spiralAngle) * b.entryTrackR;
            b.x += (targetEntryX - b.x) * 0.25 * dt;

            if (b.y >= targetEntryY) {
                b.y = targetEntryY;
                b.x = targetEntryX;
                b.dropPhase = false;
                b.spiralTheta = b.entryTheta;
                if (!headless) sound.triggerNextNote();
            }
            continue;
        }

        const rCurrent = Math.max(20, innerR + bCoeff * b.spiralTheta - b.r - 2.5);
        const linearSpd = (config.initSpeedXRef || 4.2) * 1.05;
        const dTheta = (linearSpd / rCurrent) * dt;
        const prevTheta = b.spiralTheta;
        b.spiralTheta -= dTheta;

        if (!b.passedGate && gate && prevTheta >= gate.theta && b.spiralTheta <= gate.theta) {
            b.passedGate = true;
            gate.pulseScale = 1.28;
            if (!headless) sound.triggerNextNote();

            const extraBalls = Math.max(0, gate.mult - 1);
            if (extraBalls > 0) {
                state.clonesRemainingToSpawn = extraBalls;
                state.cloneSpawnTimer = 1.0;
                state.wavePhase = 'spawning_clones';
            } else {
                state.wavePhase = 'marching';
            }
        }

        const screenAng = -b.spiralTheta + state.spiralAngle;
        b.x = CX + Math.cos(screenAng) * rCurrent;
        b.y = CY + Math.sin(screenAng) * rCurrent;

        let hitSpike = false;
        for (let sIdx = state.spiralSpikes.length - 1; sIdx >= 0; sIdx--) {
            const sp = state.spiralSpikes[sIdx];
            if (!sp.alive) continue;
            if (b.spiralTheta <= sp.theta2 + 0.04) {
                sp.alive = false;
                state.ballsLost++;
                state.bounces++;
                if (!headless) {
                    const shardCnt = config.glassShardCount || 10;
                    spawnPolygonalGlassShards(state, b.x, b.y, shardCnt, 190, false);
                    sound.playDeathSFX();
                    sound.triggerNextNote();
                }
                state.balls.splice(i, 1);
                hitSpike = true;
                break;
            }
        }
        if (hitSpike) continue;

        const remainingSpikes = state.spiralSpikes.filter(sp => sp.alive).length;
        const clearedPct = Math.min(99, Math.round(((state.totalInitialSpikes - remainingSpikes) / state.totalInitialSpikes) * 100));
        state.escapedCount = clearedPct;

        if (remainingSpikes === 0 && b.spiralTheta <= 0.22) {
            state.escapedCount = 100;
            if (!state.escaped) {
                state.escaped = true;
                state.winnerText = `CENTER REACHED AT x${gate ? gate.mult : 1}! 💎`;
                state.escapeTime = (state.ticks / 60).toFixed(1);
                if (!headless) sound.playEscapeSFX();
            }
            return;
        }
    }

    const trackBalls = state.balls.filter(b => !b.dropPhase);
    trackBalls.sort((a, b) => a.spiralTheta - b.spiralTheta);
    for (let i = 1; i < trackBalls.length; i++) {
        const ahead = trackBalls[i - 1];
        const behind = trackBalls[i];
        const rCurrent = Math.max(20, innerR + bCoeff * behind.spiralTheta - behind.r - 2.5);
        const minAngGap = (behind.r * 2.02) / rCurrent;
        if (behind.spiralTheta - ahead.spiralTheta < minAngGap) {
            behind.spiralTheta = ahead.spiralTheta + minAngGap;
            const screenAng = -behind.spiralTheta + state.spiralAngle;
            behind.x = CX + Math.cos(screenAng) * rCurrent;
            behind.y = CY + Math.sin(screenAng) * rCurrent;
        }
    }

    if (!state.escaped && state.balls.length === 0 && state.clonesRemainingToSpawn <= 0) {
        if (state.wavePhase !== 'cooldown') {
            state.wavePhase = 'cooldown';
            state.waveCooldownTicks = 18;
            if (gate) {
                gate.mult *= 2;
                gate.pulseScale = 1.32;
            }
        } else {
            state.waveCooldownTicks -= dt;
            if (state.waveCooldownTicks <= 0) {
                spawnSingleTopRightStarterBall(state, config, maxOuterR);
            }
        }
    }
}

// ============================================================================
// MODE 2: MULTIPLY GATES CENTER (POLISHED SCREENSHOT 1-5 MECHANICS)
// ============================================================================
function handleMultiplyGatesPhysics(state, b, bIdx, config, minBounceVel, headless) {
    const dx = b.x - CX;
    const dy = b.y - CY;
    const dist = Math.hypot(dx, dy);
    const maxOuterR = config.circleRadiusRef * SCALE_1080;
    const { innerR, bCoeff } = getMultiplySpiralParams(maxOuterR);
    const spikeH = Math.max(10, config.spikeHeightRef * SCALE_1080 * 0.42);
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const phiWorld = Math.atan2(dy, dx);
    const normPhi = ((phiWorld % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // 1. CENTER PORTAL GOAL CHECK (NON-STOP GAMEPLAY!)
    const centerGoalR = 25;
    if (dist <= centerGoalR + b.r * 0.4) {
        state.goalReachedCount = (state.goalReachedCount || 0) + 1;
        state.escapedCount = state.goalReachedCount;
        state.goalCelebrationTimer = 90;
        state.winnerText = `CENTER GOAL REACHED! (#${state.goalReachedCount}) 🌌`;
        if (!state.escapeTime) {
            state.escapeTime = (state.ticks / 60).toFixed(1);
        }

        if (!headless) {
            spawnMergeShockwave(state, CX, CY, 52);
            spawnPolygonalGlassShards(state, CX, CY, 7, b.hue, true);
            addFloatingText(state, CX, CY - 24, `GOAL #${state.goalReachedCount}! 🎉`, '#d4ff33');
            sound.playEscapeSFX();
        }

        // Respawn bola ini kembali di mulut corong kanan agar mode tidak pernah berhenti!
        const entryR = innerR + bCoeff * (Math.PI * 7.55);
        b.x = CX + entryR;
        b.y = CY - 6;
        b.vx = -0.3 - state.rng() * 0.4;
        b.vy = 2.4 + state.rng() * 0.8;
        b.hue = (b.hue + 45) % 360;
        return;
    }

    // 2. SEGITIGA PUTIH ATAS (OBSTACLE PEMANTUL / DEFLECTOR DI JAM 12)
    if (state.topObstacle) {
        const obs = state.topObstacle;
        const tipX = obs.x;
        const tipY = obs.y + obs.h * 0.55;
        const odx = b.x - tipX;
        const ody = b.y - tipY;
        const od = Math.hypot(odx, ody);
        const hitRadius = b.r + obs.h * 0.62;

        if (od < hitRadius) {
            const onx = odx / (od || 1);
            const ony = ody / (od || 1);
            b.x = tipX + onx * hitRadius;
            b.y = tipY + ony * hitRadius;

            const dot = b.vx * onx + b.vy * ony;
            if (dot < 0) {
                b.vx = (b.vx - 2.0 * dot * onx) * 1.04;
                b.vy = (b.vy - 2.0 * dot * ony) * 1.04;
                if (Math.abs(b.vx) < 1.3) b.vx += (b.x >= CX ? 1.8 : -1.8);
                state.bounces++;
                if (!headless) sound.triggerNextNote();
            }
        }
    }

    // 3. KACA PENGHANCUR (HEXAGONS / HOURGLASS / TRIANGLES / DIAMONDS)
    for (const tri of state.meshTriangles) {
        if (!tri.alive) continue;
        const tdx = b.x - tri.cx;
        const tdy = b.y - tri.cy;
        const td = Math.hypot(tdx, tdy);
        const hitR = tri.hitR || 6.5;
        if (td <= b.r + hitR) {
            tri.alive = false;
            const tnx = tdx / (td || 1);
            const tny = tdy / (td || 1);
            const dot = b.vx * tnx + b.vy * tny;
            if (dot < 0) {
                b.vx = (b.vx - 1.92 * dot * tnx);
                b.vy = (b.vy - 1.92 * dot * tny);
            }
            state.bounces++;
            if (!headless) {
                spawnPolygonalGlassShards(state, tri.cx, tri.cy, 4, tri.hue, true);
                sound.triggerNextNote();
            }
            break;
        }
    }

    // 4. MULTIPLY GATE ORBS (x1, x2, x3, x4, x5)
    for (const gate of state.gateOrbs) {
        const gdx = b.x - gate.x;
        const gdy = b.y - gate.y;
        const gd = Math.hypot(gdx, gdy);
        if (gd <= b.r + gate.r) {
            const gnx = gdx / (gd || 1);
            const gny = gdy / (gd || 1);
            const overlap = (b.r + gate.r) - gd;
            b.x += gnx * overlap;
            b.y += gny * overlap;

            const dot = b.vx * gnx + b.vy * gny;
            if (dot < 0) {
                b.vx = (b.vx - 2.0 * dot * gnx) * 1.05;
                b.vy = (b.vy - 2.0 * dot * gny) * 1.05;
            }

            if (gate.hitCooldown <= 0) {
                gate.hitCooldown = 14;
                gate.pulseScale = 1.26;
                const currentMult = gate.mult;
                const inc = config.gateIncrement !== undefined ? config.gateIncrement : 1;
                if (inc > 0) gate.mult += inc;

                const extraClones = Math.min(5, Math.max(1, currentMult - 1));
                for (let k = 0; k < extraClones; k++) {
                    if (state.balls.length >= 240) break;
                    const ang = Math.atan2(gny, gnx) + (state.rng() - 0.5) * 0.9;
                    const clone = spawnBall(
                        state,
                        gate.x + Math.cos(ang) * (gate.r + b.r + 3),
                        gate.y + Math.sin(ang) * (gate.r + b.r + 3),
                        b.r,
                        (b.hue + (k + 1) * 42) % 360,
                        state.rng,
                        false,
                        config
                    );
                    clone.WhiteBorder = true;
                    clone.useAvatar = b.useAvatar;
                    clone.vx = Math.cos(ang) * 3.6;
                    clone.vy = Math.sin(ang) * 3.6;
                }
                if (!headless) {
                    addFloatingText(state, gate.x, gate.y - gate.r, `x${currentMult}!`, gate.border);
                    sound.triggerNextNote();
                }
            }
            break;
        }
    }

    // 5. TUMBUKAN DINDING SPIRAL MURNI & DURI PELANGI (INWARD SPIKES DI BUSUR BAWAH-KANAN)
    // Cek semua segmen dinding spiral yang aktif pada sudut normPhi saat ini:
    // - Turn k = 0, 1, 2, 3 memiliki dinding busur bawah pada normPhi in [0, PI]
    // - Turn k = 3 juga memiliki kubah atas penuh pada normPhi in [PI, 2*PI]
    // - Turn k = 4 memiliki ekor masuk kanan luar pada normPhi in [0, 0.36*PI]
    for (let k = 0; k <= 4; k++) {
        let isWallActive = false;
        if (k <= 3 && normPhi >= 0.0 && normPhi <= Math.PI) isWallActive = true;
        if (k === 3 && normPhi > Math.PI && normPhi <= Math.PI * 2) isWallActive = true;
        if (k === 4 && normPhi >= 0.0 && normPhi <= Math.PI * 0.36) isWallActive = true;
        if (!isWallActive) continue;

        const thetaWall = k * Math.PI * 2 + normPhi;
        const wallR = innerR + bCoeff * thetaWall;

        // Cek Duri Pelangi yang tumbuh ke ATAS/DALAM dari dinding bawah-kanan (k = 1, 2, 3 pada normPhi in [0.06, 1.48])
        if (config.spikeHeightRef > 0 && k >= 1 && k <= 3 && normPhi >= 0.06 && normPhi <= 1.48) {
            if (dist < wallR && dist + b.r >= wallR - spikeH) {
                state.ballsLost++;
                if (!headless) {
                    spawnPolygonalGlassShards(state, b.x, b.y, 6, b.hue, true);
                    sound.playDeathSFX();
                }
                if (state.balls.length > 1) {
                    state.balls.splice(bIdx, 1);
                } else {
                    // Jika bola terakhir mati kena duri, langsung respawn di mulut corong kanan
                    const entryR = innerR + bCoeff * (Math.PI * 7.55);
                    b.x = CX + entryR;
                    b.y = CY - 6;
                    b.vx = -0.3;
                    b.vy = 2.6;
                }
                return;
            }
        }

        // Pantulan normal pada garis dinding spiral putih
        if (Math.abs(dist - wallR) < b.r + 2.8) {
            const sign = dist < wallR ? -1 : 1;
            b.x = CX + nx * (wallR + sign * (b.r + 2.8));
            b.y = CY + ny * (wallR + sign * (b.r + 2.8));

            const dot = b.vx * nx + b.vy * ny;
            if ((sign === -1 && dot > 0) || (sign === 1 && dot < 0)) {
                b.vx = (b.vx - 1.96 * dot * nx);
                b.vy = (b.vy - 1.96 * dot * ny);

                const newSpd = Math.hypot(b.vx, b.vy);
                if (newSpd < minBounceVel) {
                    b.vx = (b.vx / (newSpd || 1)) * minBounceVel;
                    b.vy = (b.vy / (newSpd || 1)) * minBounceVel;
                }
                if (!headless && Math.abs(dot) > 0.9) sound.triggerNextNote();
            }
            break;
        }
    }

    // Jika ada bola yang terlempar keluar dari batas luar arena, masukkan kembali ke corong kanan
    if (dist > maxOuterR + 35) {
        const entryR = innerR + bCoeff * (Math.PI * 7.55);
        b.x = CX + entryR;
        b.y = CY - 6;
        b.vx = -0.4;
        b.vy = 2.5;
    }
}

// Mode 3: Beaded Spiral Progress
function handleBeadedSpiralProgressPhysics(state, b, bIdx, config, minBounceVel, headless) {
    const dx = b.x - CX;
    const dy = b.y - CY;
    const dist = Math.hypot(dx, dy);
    const maxOuterR = config.circleRadiusRef * SCALE_1080;
    const innerR = 26;
    const turns = config.beadSpiralTurns || 4.5;
    const maxTheta = turns * Math.PI * 2;
    const bCoeff = (maxOuterR - innerR) / maxTheta;

    const pct = Math.min(100, Math.max(0, Math.round(((maxOuterR - dist) / (maxOuterR - innerR)) * 100)));
    state.centerProgress = pct;
    state.escapedCount = pct;

    if (dist <= innerR + b.r + 4 && !state.escaped) {
        state.centerProgress = 100;
        state.escaped = true;
        state.winnerText = '100% CENTER REACHED! 🏆';
        state.escapeTime = (state.ticks / 60).toFixed(1);
        if (!headless) sound.playEscapeSFX();
        return;
    }

    if (dist > maxOuterR + 24) {
        state.ballsLost++;
        state.centerProgress = 0;
        const startTheta = (turns - 0.45) * Math.PI * 2 + state.spiralAngle;
        const startR = maxOuterR - 18;
        b.x = CX + Math.cos(startTheta) * startR;
        b.y = CY + Math.sin(startTheta) * startR;
        b.vx = -1.5;
        b.vy = 1.2;
        return;
    }

    for (const bead of state.beads) {
        if (!bead.alive) continue;
        const ang = bead.theta + state.spiralAngle;
        const bx = CX + Math.cos(ang) * bead.radius;
        const by = CY + Math.sin(ang) * bead.radius;
        const bdx = b.x - bx;
        const bdy = b.y - by;
        const d = Math.hypot(bdx, bdy);
        if (d <= b.r + bead.size + 2.5) {
            bead.alive = false;
            state.bounces++;
            if (!headless) {
                spawnBurstParticles(state, bx, by, `hsl(${bead.hue}, 95%, 65%)`, 3);
                sound.triggerNextNote();
            }
        }
    }

    const phi = ((Math.atan2(dy, dx) - state.spiralAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const wallHalfThick = Math.max(2.5, (config.outlineThicknessRef * SCALE_1080) * 0.5);

    for (let k = 0; k <= Math.ceil(turns); k++) {
        const theta = phi + k * Math.PI * 2;
        if (theta > maxTheta + 0.15) continue;
        const wallR = innerR + bCoeff * theta;
        const minDist = b.r + wallHalfThick;

        if (Math.abs(dist - wallR) < minDist) {
            const sign = dist < wallR ? -1 : 1;
            b.x = CX + nx * (wallR + sign * minDist);
            b.y = CY + ny * (wallR + sign * minDist);

            const dot = b.vx * nx + b.vy * ny;
            if ((sign === -1 && dot > 0) || (sign === 1 && dot < 0)) {
                b.vx = (b.vx - 1.92 * dot * nx);
                b.vy = (b.vy - 1.92 * dot * ny);
                const tx = -ny;
                const ty = nx;
                b.vx += tx * 0.18 * sign;
                b.vy += ty * 0.18 * sign;
                if (!headless && Math.abs(dot) > 1.2) sound.triggerNextNote();
            }
            break;
        }
    }
}

/*************************************************************************
 * 4. EXISTING MODES COLLISION & BOUNCE HELPERS
 *************************************************************************/
function onWallBounce(state, b, hitX, hitY, config, headless) {
    state.bounces++;
    const mode = config.mode;
    const growth = config.ballGrowthRate || 0.45;

    if (mode === 'web_expansion') {
        b.r = Math.min(b.r + growth, 72);
        state.webLines.push({ x1: hitX, y1: hitY, ballRef: b, color: 'rgba(255, 255, 255, 0.72)', team: 0 });
        if (state.webLines.length > 260) state.webLines.shift();
    } else if (mode === 'trail_expansion') {
        b.r = Math.min(b.r + growth, 92);
    } else if (mode === 'fragment') {
        b.r = Math.min(b.r + 0.55, 52);
        if (b.r >= 18) { b.isBoss = true; b.veins = true; }
    } else if (mode === 'web_battle') {
        state.webLines.push({ x1: hitX, y1: hitY, ballRef: b, color: b.country ? b.country.colors[0] : state.gradStart, team: b.team });
        if (state.webLines.length > 220) state.webLines.shift();
    }

    if (!headless) {
        sound.triggerNextNote();
        state.shakeMag = Math.min(state.shakeMag + 1.5, 4.5);
    }
}

function onBallEscapeRing(state, b, bIdx, ring, config, headless) {
    const mode = config.mode;
    state.escapedCount++;

    if (mode === 'classic') {
        if (!headless) {
            spawnRingShatterParticles(state, ring.radius, `hsl(${ring.hue}, 95%, 60%)`);
            sound.playEscapeSFX();
        }
        state.rings.shift();
        if (state.rings.length === 0 && !state.escaped) {
            state.escaped = true;
            state.escapeTime = (state.ticks / 60).toFixed(1);
        }
    } else if (mode === 'infinite') {
        state.balls.splice(bIdx, 1);
        const mult = config.multiplyFactor || 2;
        if (state.balls.length < 380) {
            for (let c = 0; c < mult; c++) {
                spawnBall(state, CX + (state.rng() - 0.5) * 28, CY - 20, b.r, (b.hue + c * 14) % 360, state.rng, false, config);
            }
        }
        if (!headless) sound.playEscapeSFX();
        if (state.balls.length >= 260 && !state.escaped) {
            state.escaped = true;
            state.escapeTime = (state.ticks / 60).toFixed(1);
        }
    } else {
        if (!headless) {
            spawnRingShatterParticles(state, ring.radius, state.gradStart);
            sound.playEscapeSFX();
            addFloatingText(state, b.x, b.y, 'ESCAPED! 🎉', '#d4ff33');
        }
        state.escaped = true;
        state.escapeTime = (state.ticks / 60).toFixed(1);
    }
}

function handleBeadedDestruction(state, b, config, minBounceVel, headless) {
    for (const bead of state.beads) {
        if (!bead.alive) continue;
        const bx = CX + Math.cos(bead.angle) * bead.radius;
        const by = CY + Math.sin(bead.angle) * bead.radius;
        const dx = b.x - bx;
        const dy = b.y - by;
        const d = Math.hypot(dx, dy);
        if (d <= b.r + bead.size + 2) {
            bead.alive = false;
            const nx = dx / (d || 1);
            const ny = dy / (d || 1);
            const dot = b.vx * nx + b.vy * ny;
            if (dot < 0) {
                b.vx = (b.vx - 2 * dot * nx) * 1.006;
                b.vy = (b.vy - 2 * dot * ny) * 1.006;
            }
            onWallBounce(state, b, bx, by, config, headless);
            if (!headless) {
                spawnBurstParticles(state, bx, by, `hsl(${bead.hue}, 95%, 65%)`, 4);
            }
            break;
        }
    }
    const distCenter = Math.hypot(b.x - CX, b.y - CY);
    if (distCenter > (config.circleRadiusRef * SCALE_1080) + 18 && !state.escaped) {
        state.escaped = true;
        state.escapeTime = (state.ticks / 60).toFixed(1);
        if (!headless) sound.playEscapeSFX();
    }
}

function shatterBallIntoFragments(state, b, bIdx, config, headless) {
    const maxFrag = config.fragmentMaxCount || 32;
    const count = Math.min(maxFrag, Math.max(10, Math.floor((b.r * b.r) / 18)));
    const bx = b.x;
    const by = b.y;
    state.balls.splice(bIdx, 1);
    for (let i = 0; i < count; i++) {
        if (state.balls.length >= 260) break;
        const ang = (Math.PI * 2 * i) / count + state.rng() * 0.2;
        const spd = 2.4 + state.rng() * 2.2;
        state.balls.push({
            x: bx + Math.cos(ang) * 6,
            y: by + Math.sin(ang) * 6,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 4.2,
            hue: (i * 15 + state.ticks * 3) % 360,
            isBoss: false
        });
    }
    if (!headless) {
        sound.playDeathSFX();
        addFloatingText(state, bx, by, `SHATTER x${count}!`, '#e879f9');
        state.shakeMag = 6;
    }
}

function handleSpiralCollision(state, b, config, minBounceVel, headless) {
    const dx = b.x - CX;
    const dy = b.y - CY;
    const dist = Math.hypot(dx, dy);
    const phi = ((Math.atan2(dy, dx) - state.spiralAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const maxOuterR = config.circleRadiusRef * SCALE_1080;
    const turns = config.spiralTurns || 4.2;
    const maxTheta = turns * Math.PI * 2;

    for (let k = 0; k < 7; k++) {
        const theta = phi + k * Math.PI * 2;
        if (theta > maxTheta) continue;
        const wallR = 34 + ((maxOuterR - 34) / maxTheta) * theta;
        if (Math.abs(dist - wallR) < b.r + 4) {
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            const sign = dist < wallR ? 1 : -1;
            b.x = CX + nx * (wallR - sign * (b.r + 4));
            b.y = CY + ny * (wallR - sign * (b.r + 4));
            const dot = b.vx * nx + b.vy * ny;
            b.vx = (b.vx - 2 * dot * nx) * 1.005;
            b.vy = (b.vy - 2 * dot * ny) * 1.005;
            onWallBounce(state, b, b.x, b.y, config, headless);
            break;
        }
    }

    for (const obs of state.spiralObstacles) {
        if (!obs.alive) continue;
        const ang = obs.theta + state.spiralAngle;
        const ox = CX + Math.cos(ang) * obs.r;
        const oy = CY + Math.sin(ang) * obs.r;
        if (Math.hypot(b.x - ox, b.y - oy) < b.r + obs.size) {
            obs.alive = false;
            b.vy = -Math.abs(b.vy) * 1.05;
            onWallBounce(state, b, ox, oy, config, headless);
            if (!headless) {
                sound.playDeathSFX();
                spawnBurstParticles(state, ox, oy, '#c084fc', 10);
            }
        }
    }

    if (dist > maxOuterR + 12 && !state.escaped) {
        state.escaped = true;
        state.escapeTime = (state.ticks / 60).toFixed(1);
        if (!headless) sound.playEscapeSFX();
    }
}

function handleBallToBallCollisions(state, config, minBounceVel, headless) {
    const balls = state.balls;
    const mode = config.mode;

    for (let i = balls.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
            const b1 = balls[i];
            const b2 = balls[j];
            if (!b1 || !b2) continue;
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = b1.r + b2.r;

            if (dist < minDist && dist > 0.0001) {
                if (mode === 'fusion' && b1.level === b2.level && b1.level < activeMergeTiers.length - 1) {
                    if ((b1.mergeCooldown || 0) <= 0 && (b2.mergeCooldown || 0) <= 0) {
                        const mx = (b1.x + b2.x) * 0.5;
                        const my = (b1.y + b2.y) * 0.5;
                        const nextLvl = b1.level + 1;

                        const popUpward = Math.max(0.4, (6 - nextLvl) * 0.42);
                        const avgVx = (b1.vx + b2.vx) * 0.55 + (state.rng() - 0.5) * 0.8;
                        const avgVy = Math.min(0.6, (b1.vy + b2.vy) * 0.4) - popUpward;

                        balls.splice(i, 1);
                        balls.splice(j, 1);

                        const merged = spawnMergeBall(state, mx, my, nextLvl, state.rng, config);
                        merged.vx = avgVx;
                        merged.vy = avgVy;
                        state.ballsLost++;
                        state.bounces++;

                        for (const other of balls) {
                            if (other === merged) continue;
                            const odx = other.x - merged.x;
                            const ody = other.y - merged.y;
                            const od = Math.hypot(odx, ody);
                            const pushRadius = merged.r * 2.5;
                            if (od < pushRadius && od > 0.1) {
                                const sizeFactor = Math.max(0.25, 1.5 - (other.level || 0) * 0.22);
                                const push = ((pushRadius - od) / pushRadius) * 2.1 * sizeFactor;
                                other.vx += (odx / od) * push;
                                other.vy += (ody / od) * push - 0.35 * sizeFactor;
                            }
                        }

                        if (!headless) {
                            spawnMergeShockwave(state, merged.x, merged.y, merged.r);
                            sound.playMergePopSFX(nextLvl);
                            addFloatingText(state, merged.x, merged.y - merged.r, `TIER ${nextLvl + 1}!`, '#d4ff33');
                        }

                        if (nextLvl === activeMergeTiers.length - 1 && !state.escaped) {
                            state.escaped = true;
                            state.winnerText = 'FINAL FORM MERGED! 🏆';
                            state.escapeTime = (state.ticks / 60).toFixed(1);
                            if (!headless) sound.playEscapeSFX();
                        }
                        return;
                    }
                }

                if (mode === 'eating_balls') {
                    const eater = b1.r >= b2.r ? b1 : b2;
                    const preyIdx = b1.r >= b2.r ? j : i;
                    const prey = balls[preyIdx];
                    eater.r = Math.min(85, Math.hypot(eater.r, prey.r * 0.65));
                    balls.splice(preyIdx, 1);
                    state.ballsLost++;
                    if (!headless) {
                        sound.triggerNextNote();
                        addFloatingText(state, eater.x, eater.y, 'NOM! +SIZE', '#34d399');
                    }
                    if (balls.length === 1 && !state.escaped) {
                        state.escaped = true;
                        state.escapeTime = (state.ticks / 60).toFixed(1);
                        if (!headless) sound.playEscapeSFX();
                    }
                    return;
                }

                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = minDist - dist;

                const m1 = mode === 'fusion' ? Math.pow(b1.r, 2.6) : (b1.r * b1.r);
                const m2 = mode === 'fusion' ? Math.pow(b2.r, 2.6) : (b2.r * b2.r);
                const totalM = m1 + m2;
                const ratio1 = m2 / totalM;
                const ratio2 = m1 / totalM;

                b1.x -= nx * overlap * ratio1;
                b1.y -= ny * overlap * ratio1;
                b2.x += nx * overlap * ratio2;
                b2.y += ny * overlap * ratio2;

                const rvx = b2.vx - b1.vx;
                const rvy = b2.vy - b1.vy;
                const velAlongNormal = rvx * nx + rvy * ny;

                if (velAlongNormal < 0) {
                    let restitution = 0.92;
                    if (mode === 'fusion') {
                        const minLevel = Math.min(b1.level || 0, b2.level || 0);
                        restitution = getMergeTierRestitution(minLevel, config);
                    }

                    const jImpulse = -(1 + restitution) * velAlongNormal / (1 / m1 + 1 / m2);
                    const ix = jImpulse * nx;
                    const iy = jImpulse * ny;

                    b1.vx -= ix / m1;
                    b1.vy -= iy / m1;
                    b2.vx += ix / m2;
                    b2.vy += iy / m2;

                    if (mode === 'fusion') {
                        const smallerBall = b1.r <= b2.r ? b1 : b2;
                        if ((smallerBall.level || 0) <= 2 && !smallerBall.inNeck && Math.abs(velAlongNormal) > 1.1) {
                            const sign = smallerBall === b1 ? -1 : 1;
                            const minHop = (3 - (smallerBall.level || 0)) * 0.95;
                            const curSpd = Math.hypot(smallerBall.vx, smallerBall.vy);
                            if (curSpd < minHop) {
                                smallerBall.vx += sign * nx * (minHop - curSpd) * 0.75 + (state.rng() - 0.5) * 0.35;
                                smallerBall.vy += sign * ny * (minHop - curSpd) * 0.75;
                            }
                        }
                    }
                }

                if (mode === 'country_royale' && b1.country && b2.country) {
                    const dmgMult = config.royaleDamageMult || 1.0;
                    const dmg1 = Math.round((7 + Math.floor(state.rng() * 9)) * dmgMult);
                    const dmg2 = Math.round((7 + Math.floor(state.rng() * 9)) * dmgMult);
                    b1.hp -= dmg1;
                    b2.hp -= dmg2;
                    if (!headless) {
                        sound.triggerNextNote();
                        addFloatingText(state, b1.x, b1.y - b1.r, `-${dmg1}`, '#fbbf24');
                    }
                    if (b1.hp <= 0) {
                        state.ballsLost++;
                        if (!headless) sound.playDeathSFX();
                        balls.splice(i, 1);
                        checkCountryRoyaleWinner(state, headless);
                        break;
                    }
                    if (b2.hp <= 0) {
                        state.ballsLost++;
                        if (!headless) sound.playDeathSFX();
                        balls.splice(j, 1);
                        checkCountryRoyaleWinner(state, headless);
                        break;
                    }
                }

                if (mode === 'collision' && b1.isBoss && b2.isBoss) {
                    const mx = (b1.x + b2.x) / 2;
                    const my = (b1.y + b2.y) / 2;
                    const burstCount = config.collisionBurstCount || 24;
                    for (let k = 0; k < burstCount; k++) {
                        if (state.balls.length >= 240) break;
                        const ang = (Math.PI * 2 * k) / burstCount;
                        const spd = 2.2 + state.rng() * 2.5;
                        state.balls.push({
                            x: mx,
                            y: my,
                            vx: Math.cos(ang) * spd,
                            vy: Math.sin(ang) * spd,
                            r: 4.5,
                            hue: (state.ticks * 4 + k * 15) % 360,
                            isBoss: false
                        });
                    }
                    if (!headless) {
                        sound.playDeathSFX();
                        addFloatingText(state, mx, my, `BOOM! +${burstCount} BALLS`, '#d4ff33');
                        state.shakeMag = 6;
                    }
                }
            }
        }
    }
}

function checkCountryRoyaleWinner(state, headless) {
    if (state.balls.length === 1 && !state.escaped) {
        state.escaped = true;
        state.winnerText = `${state.balls[0].country.name.toUpperCase()} WINS!`;
        state.escapeTime = (state.ticks / 60).toFixed(1);
        if (!headless) sound.playEscapeSFX();
    }
}

function spawnRingShatterParticles(state, radius, colorStr) {
    for (let i = 0; i < 36; i++) {
        const ang = (Math.PI * 2 * i) / 36;
        state.particles.push({
            x: CX + Math.cos(ang) * radius,
            y: CY + Math.sin(ang) * radius,
            vx: Math.cos(ang) * (1.2 + Math.random() * 2.0),
            vy: Math.sin(ang) * (1.2 + Math.random() * 2.0) - 0.8,
            size: 3.5 + Math.random() * 4,
            color: colorStr,
            life: 1.0
        });
    }
}

function spawnBurstParticles(state, x, y, colorStr, count = 10) {
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.0 + Math.random() * 3.0;
        state.particles.push({
            x,
            y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            size: 3 + Math.random() * 3.5,
            color: colorStr,
            life: 1.0
        });
    }
}