/*************************************************************************
 * FILE 4B: renderer.js (VISUAL RENDERER & UI EVENT CONTROLLER)
 * Berisi:
 * - Rendering 1:1 untuk Multiply Gates Center (Static Spiral Lower Loops,
 *   Top White Wedge Bumper, 4 Glass Styles: Hexagons, Hourglass, Triangles,
 *   Diamonds, Center Black Hole / Energy Portal, & Multiplier Gate Orbs)
 * - Rendering Spiked Spiral Center, Beaded Spiral Progress, & Merge 2048
 * - Seluruh Event Listener UI & Kontrol Dinamis
 *************************************************************************/

// Mode rendering is registered separately from physics so each mode can own
// its arena and optional overlay without adding branches to the main loop.
const recordingCanvas = document.createElement('canvas');
recordingCanvas.width = 1080;
recordingCanvas.height = 1920;
const recordingCtx = recordingCanvas.getContext('2d');
let playbackSpeed = 1;
let mediaRecorder = null;
let recordingChunks = [];
let recordingTimer = null;
let speedBeforeRecording = 1;
let pauseBeforeRecording = false;

const MODE_ARENA_RENDERERS = {
    spiked_spiral: (state, config, maxOuterR, lineThick, spikeH) =>
        drawSpikedSpiralArena(ctx, state, config, maxOuterR, lineThick, spikeH),
    multiply_gates: (state, config, maxOuterR, lineThick, spikeH) =>
        drawMultiplyGatesArena(ctx, state, config, maxOuterR, lineThick, spikeH),
    beaded_spiral: (state, config, maxOuterR, lineThick) =>
        drawBeadedSpiralArena(ctx, state, config, maxOuterR, lineThick)
};

MODE_ARENA_RENDERERS.target=MODE_ARENA_RENDERERS.multiply_gates;
MODE_ARENA_RENDERERS.portal=MODE_ARENA_RENDERERS.multiply_gates;

const MODE_ARENA_OVERLAYS = {
    destruction: drawDestructionBeads,
    spiral: drawSpiralVortex
};

MODE_ARENA_OVERLAYS.shatter = MODE_ARENA_OVERLAYS.destruction;

function renderSimulation(state, config) {
    ctx.save();

    // 1. Background Fill
    ctx.fillStyle = state.bgColor || config.bgColor || '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.shakeMag > 0.2) {
        ctx.translate((Math.random() - 0.5) * state.shakeMag, (Math.random() - 0.5) * state.shakeMag);
    }

    // 2. Trail Expansion Layer
    if (config.mode === 'trail_expansion' || config.mode === 'paint' || config.colorTrails) {
        if (config.colorTrails && config.mode !== 'trail_expansion' && config.mode !== 'paint') {
            trailCtx.fillStyle = 'rgba(0, 0, 0, 0.035)';
            trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
        }
        ctx.drawImage(trailCanvas, 0, 0);
    }

    // 3. Center Arena Watermark (BALLSIMULATOR.COM like Screenshots 1-5)
    if (config.watermarkText && config.watermarkText.trim() !== '') {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `800 ${config.hookFontSize || 22}px "Plus Jakarta Sans"`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillText(config.watermarkText, 0, 0);
        if (config.watermarkSub && config.watermarkSub.trim() !== '') {
            ctx.font = '700 11px "JetBrains Mono"';
            ctx.fillStyle = 'rgba(212, 255, 51, 0.25)';
            ctx.fillText(config.watermarkSub, 0, 20);
        }
        ctx.restore();
    }

    // 4. Web Expansion Starburst Rays & Web Battle Flag Threads
    if (state.webLines.length > 0) {
        ctx.lineWidth = 1.25;
        for (const l of state.webLines) {
            ctx.strokeStyle = l.color;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            const targetX = l.ballRef ? l.ballRef.x : CX;
            const targetY = l.ballRef ? l.ballRef.y : CY;
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
        }
    }

    // 5. Audio-Reactive Spectrum Ring Halo
    const freqData = sound.getSpectrumData();
    if (config.reactiveBackground) {
        const energy = (freqData[2] + freqData[5] + freqData[8]) / (3 * 255);
        const alpha = 0.025 + energy * 0.15;
        const glow = ctx.createRadialGradient(CX, CY, 30, CX, CY, canvas.height * 0.72);
        glow.addColorStop(0, `rgba(0, 0, 0, 0)`);
        glow.addColorStop(1, `${state.gradStart}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (config.audioSpectrum && state.rings.length > 0) {
        const outerR = state.rings[state.rings.length - 1].radius;
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 255, 51, 0.24)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const bins = 48;
        for (let i = 0; i <= bins; i++) {
            const ang = (Math.PI * 2 * i) / bins;
            const amp = (freqData[i % 24] / 255) * 22;
            const r = outerR + 6 + amp;
            const px = CX + Math.cos(ang) * r;
            const py = CY + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    const lineThick = Math.max(2, config.outlineThicknessRef * SCALE_1080);
    const spikeH = config.spikeHeightRef * SCALE_1080 * 0.45;
    const maxOuterR = config.circleRadiusRef * SCALE_1080;

    // =====================================================================
    // MODE-SPECIFIC ARENA RENDERERS
    // =====================================================================
    ctx.save();
    if (config.wallGlowFX) {
        ctx.shadowColor = state.gradEnd || '#d4ff33';
        ctx.shadowBlur = Math.max(8, lineThick * 2.2);
    }
    const arenaRenderer = MODE_ARENA_RENDERERS[config.mode];
    if (arenaRenderer) arenaRenderer(state, config, maxOuterR, lineThick, spikeH);
    else drawStandardRingArena(state, config, spikeH, lineThick);

    const drawModeOverlay = MODE_ARENA_OVERLAYS[config.mode];
    if (drawModeOverlay) drawModeOverlay(state, config, maxOuterR);
    ctx.restore();

    // Pinned Grey Shield Balls
    for (const pb of state.pinnedBalls) {
        ctx.save();
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pb.x, pb.y, pb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Active Balls
    for (const b of state.balls) {
        drawSingleBallVisual(ctx, b, state, config, false);
    }

    // Polygonal Glass Shards
    for (const gs of (config.shatterFX !== false ? state.glassShards : [])) {
        ctx.save();
        ctx.translate(gs.x, gs.y);
        ctx.rotate(gs.rot);
        ctx.globalAlpha = Math.max(0, gs.life);
        ctx.fillStyle = gs.fill;
        ctx.strokeStyle = gs.stroke;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        gs.verts.forEach((v, idx) => {
            if (idx === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Shockwaves
    for (const sw of (config.shockwaveFX !== false ? state.shockwaves : [])) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, sw.alpha)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Particles & Floating Texts
    for (const p of (config.confettiFX !== false ? state.particles : [])) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    for (const ft of state.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.font = '800 13px "JetBrains Mono"';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    // Top Engagement Hook Text
    if (config.hookText && config.hookText.trim() !== '') {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '800 22px "Plus Jakarta Sans"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(config.hookText, CX, 145);
        ctx.restore();
    }

    // Bottom Hook Caption (e.g. "Did you recognize the sounds?")
    if (config.bottomHookText && config.bottomHookText.trim() !== '') {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `700 ${config.bottomHookFontSize || 15}px "Plus Jakarta Sans"`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(config.bottomHookText, CX, canvas.height - 185);
        ctx.restore();
    }

    ctx.restore();
}

function drawStandardRingArena(state, config, spikeH, lineThick) {
    for (const ring of state.rings) {
        ctx.save();
        if (config.mode === 'classic') {
            ctx.strokeStyle = `hsl(${ring.hue}, 90%, 58%)`;
            ctx.lineWidth = 2.4;
        } else {
            const ringGrad = ctx.createLinearGradient(CX - ring.radius, CY - ring.radius, CX + ring.radius, CY + ring.radius);
            ringGrad.addColorStop(0, state.gradStart);
            ringGrad.addColorStop(1, state.gradEnd);
            ctx.strokeStyle = ringGrad;
            ctx.lineWidth = lineThick;
        }

        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(CX, CY, ring.radius, ring.angle + ring.gap, ring.angle + Math.PI * 2);
        ctx.stroke();

        if (ring.isFlask) {
            const halfGap = ring.gap / 2;
            const neckHalfW = ring.radius * Math.sin(halfGap);
            const neckBotY = CY - ring.radius * Math.cos(halfGap);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = lineThick;
            ctx.beginPath();
            ctx.moveTo(CX - neckHalfW, 18);
            ctx.lineTo(CX - neckHalfW, neckBotY);
            ctx.moveTo(CX + neckHalfW, 18);
            ctx.lineTo(CX + neckHalfW, neckBotY);
            ctx.stroke();
        }

        if (ring.hasSpikes && spikeH > 0) drawRingSpikes1to1(ctx, ring, state, config, spikeH, lineThick);
        ctx.restore();
    }
}

function drawDestructionBeads(state) {
    for (const bead of state.beads) {
        if (!bead.alive) continue;
        const bx = CX + Math.cos(bead.angle) * bead.radius;
        const by = CY + Math.sin(bead.angle) * bead.radius;
        ctx.fillStyle = `hsl(${bead.hue}, 92%, 62%)`;
        ctx.beginPath();
        ctx.arc(bx, by, bead.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawSpiralVortex(state, config, maxOuterR) {
    ctx.save();
    const maxTheta = (config.spiralTurns || 4.2) * Math.PI * 2;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    for (let t = 0; t <= maxTheta; t += 0.07) {
        const rad = 34 + ((maxOuterR - 34) / maxTheta) * t;
        const ang = t + state.spiralAngle;
        const px = CX + Math.cos(ang) * rad;
        const py = CY + Math.sin(ang) * rad;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    for (const obs of state.spiralObstacles) {
        if (!obs.alive) continue;
        const ang = obs.theta + state.spiralAngle;
        const ox = CX + Math.cos(ang) * obs.r;
        const oy = CY + Math.sin(ang) * obs.r;
        ctx.fillStyle = `hsl(${obs.hue}, 90%, 65%)`;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ox, oy, obs.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

/*************************************************************************
 * DEDICATED RENDERER: MULTIPLY GATES CENTER (SCREENSHOTS 1–5)
 *************************************************************************/
function drawMultiplyGatesArena(targetCtx, state, config, maxOuterR, lineThick, spikeH) {
    targetCtx.save();
    const { innerR, bCoeff } = getMultiplySpiralParams(maxOuterR);
    const effectiveSpikeH = Math.max(11, config.spikeHeightRef * SCALE_1080 * 0.45);

    // 1. Gambar Kaca Penghancur (Hexagons / Hourglass / Triangles / Diamonds)
    for (const tri of state.meshTriangles) {
        if (!tri.alive) continue;
        targetCtx.beginPath();
        tri.pts.forEach((pt, idx) => {
            if (idx === 0) targetCtx.moveTo(pt.x, pt.y);
            else targetCtx.lineTo(pt.x, pt.y);
        });
        targetCtx.closePath();

        if (tri.style === 'hexagons') {
            targetCtx.fillStyle = `hsla(${tri.hue}, 75%, 38%, 0.58)`;
            targetCtx.strokeStyle = `hsla(${tri.hue}, 92%, 64%, 0.94)`;
            targetCtx.lineWidth = 1.35;
            targetCtx.fill();
            targetCtx.stroke();
        } else if (tri.style === 'hourglass') {
            targetCtx.fillStyle = 'rgba(132, 169, 44, 0.42)';
            targetCtx.strokeStyle = 'rgba(212, 255, 51, 0.85)';
            targetCtx.lineWidth = 1.15;
            targetCtx.fill();
            targetCtx.stroke();
        } else {
            targetCtx.fillStyle = `hsla(${tri.hue}, 82%, 48%, 0.50)`;
            targetCtx.strokeStyle = `hsla(${tri.hue}, 95%, 70%, 0.90)`;
            targetCtx.lineWidth = 1.15;
            targetCtx.fill();
            targetCtx.stroke();
        }
    }

    // 2. Gambar Portal Tengah (Black Hole Vortex / Energy Core / Diamond)
    drawCenterTargetVisual(targetCtx, state, config);

    // 3. Gambar Duri Pelangi Tajam (Menunjuk ke ATAS/DALAM di atas 3 busur spiral bawah-kanan)
    if (config.spikeHeightRef > 0) {
        for (let k = 1; k <= 3; k++) {
            const numTeeth = 8 + k * 3;
            const startPhi = 0.06;
            const endPhi = 1.48;
            const stepPhi = (endPhi - startPhi) / numTeeth;

            for (let t = 0; t < numTeeth; t++) {
                const phi1 = startPhi + t * stepPhi + stepPhi * 0.12;
                const phiMid = startPhi + (t + 0.5) * stepPhi;
                const phi2 = startPhi + (t + 1) * stepPhi - stepPhi * 0.12;

                const r1 = innerR + bCoeff * (k * Math.PI * 2 + phi1);
                const rMid = innerR + bCoeff * (k * Math.PI * 2 + phiMid);
                const r2 = innerR + bCoeff * (k * Math.PI * 2 + phi2);

                const x1 = CX + Math.cos(phi1) * (r1 - 1.5), y1 = CY + Math.sin(phi1) * (r1 - 1.5);
                // Ujung duri menunjuk ke DALAM (rMid - effectiveSpikeH) seperti di image_ec1c8f.png!
                const xTip = CX + Math.cos(phiMid) * (rMid - effectiveSpikeH), yTip = CY + Math.sin(phiMid) * (rMid - effectiveSpikeH);
                const x2 = CX + Math.cos(phi2) * (r2 - 1.5), y2 = CY + Math.sin(phi2) * (r2 - 1.5);

                const toothHue = ((t / numTeeth) * 260 + k * 35 + 50) % 360;
                targetCtx.fillStyle = `hsl(${toothHue}, 95%, 60%)`;
                targetCtx.beginPath();
                targetCtx.moveTo(x1, y1);
                targetCtx.lineTo(xTip, yTip);
                targetCtx.lineTo(x2, y2);
                targetCtx.closePath();
                targetCtx.fill();
            }
        }
    }

    // 4. Gambar Garis Dinding Spiral Statis (100% Rapi Tanpa Double Ring!)
    targetCtx.lineWidth = 3.2;
    targetCtx.lineCap = 'round';
    if (config.multiplyRainbowWalls) {
        const grad = targetCtx.createLinearGradient(CX - maxOuterR, CY - maxOuterR, CX + maxOuterR, CY + maxOuterR);
        grad.addColorStop(0, '#c084fc');
        grad.addColorStop(0.5, '#f43f5e');
        grad.addColorStop(1, '#fde047');
        targetCtx.strokeStyle = grad;
    } else {
        targetCtx.strokeStyle = '#ffffff';
    }

    // 3 Busur Spiral Bawah (k = 0, 1, 2 dari 0 rad kanan memutar bawah sampai PI rad kiri)
    for (let k = 0; k <= 2; k++) {
        targetCtx.beginPath();
        for (let phi = 0.0; phi <= Math.PI; phi += 0.03) {
            const theta = k * Math.PI * 2 + phi;
            const r = innerR + bCoeff * theta;
            const px = CX + Math.cos(phi) * r;
            const py = CY + Math.sin(phi) * r;
            if (phi === 0.0) targetCtx.moveTo(px, py);
            else targetCtx.lineTo(px, py);
        }
        targetCtx.stroke();
    }

    // Busur Terluar Utuh: Dari Jam 3 (θ = 6*PI) memutar ke Bawah -> Kiri (7*PI) -> Kubah Atas (7.5*PI) -> Kanan (8*PI) -> Ekor Kanan Bawah (8.36*PI)
    targetCtx.beginPath();
    for (let theta = Math.PI * 6; theta <= Math.PI * 8.36; theta += 0.03) {
        const r = innerR + bCoeff * theta;
        const px = CX + Math.cos(theta) * r;
        const py = CY + Math.sin(theta) * r;
        if (theta === Math.PI * 6) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
    }
    targetCtx.stroke();

    // 5. Gambar Segitiga Putih Pemantul di Langit-Langit Atas (Jam 12)
    if (state.topObstacle) {
        const obs = state.topObstacle;
        targetCtx.fillStyle = '#ffffff';
        targetCtx.beginPath();
        obs.pts.forEach((p, idx) => {
            if (idx === 0) targetCtx.moveTo(p.x, p.y);
            else targetCtx.lineTo(p.x, p.y);
        });
        targetCtx.closePath();
        targetCtx.fill();
    }

    // 6. Gambar Multiplier Gate Orbs (x1, x2, x3, x4, x5)
    for (const g of state.gateOrbs) {
        targetCtx.save();
        targetCtx.translate(g.x, g.y);
        targetCtx.scale(g.pulseScale || 1, g.pulseScale || 1);

        targetCtx.beginPath();
        targetCtx.arc(0, 0, g.r + 3, 0, Math.PI * 2);
        targetCtx.strokeStyle = g.border;
        targetCtx.lineWidth = 1.8;
        targetCtx.globalAlpha = 0.65;
        targetCtx.stroke();
        targetCtx.globalAlpha = 1.0;

        targetCtx.fillStyle = g.color;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, g.r, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.lineWidth = 2.2;
        targetCtx.strokeStyle = g.border;
        targetCtx.stroke();

        targetCtx.fillStyle = '#090b12';
        targetCtx.font = '800 13px "Plus Jakarta Sans"';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(`x${g.mult}`, 0, 1);
        targetCtx.restore();
    }

    targetCtx.restore();
}

function drawCenterTargetVisual(targetCtx, state, config) {
    targetCtx.save();
    targetCtx.translate(CX, CY);

    if (customCenterImage) {
        const r = 28;
        targetCtx.save();
        if (config.centerShape === 'circle') {
            targetCtx.beginPath();
            targetCtx.arc(0, 0, r, 0, Math.PI * 2);
            targetCtx.clip();
        } else if (config.centerShape === 'diamond') {
            targetCtx.beginPath();
            targetCtx.moveTo(0, -r);
            targetCtx.lineTo(r, 0);
            targetCtx.lineTo(0, r);
            targetCtx.lineTo(-r, 0);
            targetCtx.closePath();
            targetCtx.clip();
        }
        targetCtx.drawImage(customCenterImage, -r, -r, r * 2, r * 2);
        targetCtx.restore();
        targetCtx.restore();
        return;
    }

    if (config.centerEmoji && config.centerEmoji.trim() !== '') {
        targetCtx.font = '38px sans-serif';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(config.centerEmoji.trim(), 0, 2);
        targetCtx.restore();
        return;
    }

    const style = config.centerPortalStyle || 'blackhole';
    if (style === 'blackhole') {
        // Glowing Purple/Pink Black Hole Vortex with orbiting sparks (Screenshots 2-4)
        const glow = targetCtx.createRadialGradient(0, 0, 8, 0, 0, 48);
        glow.addColorStop(0, '#000000');
        glow.addColorStop(0.45, 'rgba(192, 38, 211, 0.55)');
        glow.addColorStop(0.75, 'rgba(234, 88, 12, 0.25)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        targetCtx.fillStyle = glow;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, 48, 0, Math.PI * 2);
        targetCtx.fill();

        // Black core
        targetCtx.fillStyle = '#000000';
        targetCtx.beginPath();
        targetCtx.arc(0, 0, 22, 0, Math.PI * 2);
        targetCtx.fill();

        // Swirling neon arc rim
        targetCtx.strokeStyle = '#f0abfc';
        targetCtx.lineWidth = 2.2;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, 23, 0.2, Math.PI * 1.45);
        targetCtx.stroke();

        // Inner red/orange hot dots
        const dots = [
            { x: -6, y: -4, c: '#f97316' },
            { x: 5, y: -5, c: '#fb923c' },
            { x: -3, y: 6, c: '#ef4444' },
            { x: 6, y: 5, c: '#ef4444' }
        ];
        dots.forEach(d => {
            targetCtx.fillStyle = d.c;
            targetCtx.beginPath();
            targetCtx.arc(d.x, d.y, 2.2, 0, Math.PI * 2);
            targetCtx.fill();
        });
    } else if (style === 'energy') {
        // Blue Swirling Energy Core (Screenshot 1)
        const glow = targetCtx.createRadialGradient(0, 0, 4, 0, 0, 36);
        glow.addColorStop(0, '#e0f2fe');
        glow.addColorStop(0.4, '#38bdf8');
        glow.addColorStop(0.8, '#6366f1');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        targetCtx.fillStyle = glow;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, 36, 0, Math.PI * 2);
        targetCtx.fill();

        for (let i = 0; i < 3; i++) {
            targetCtx.strokeStyle = i % 2 === 0 ? '#7dd3fc' : '#c084fc';
            targetCtx.lineWidth = 2;
            targetCtx.beginPath();
            targetCtx.ellipse(0, 0, 22, 13, (i * Math.PI) / 3 + state.ticks * 0.02, 0, Math.PI * 2);
            targetCtx.stroke();
        }
    } else {
        // Faceted Cyan Diamond Crystal
        const r = 22;
        targetCtx.fillStyle = '#38bdf8';
        targetCtx.strokeStyle = '#e0f2fe';
        targetCtx.lineWidth = 2;
        targetCtx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) targetCtx.moveTo(px, py);
            else targetCtx.lineTo(px, py);
        }
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.stroke();
    }

    targetCtx.restore();
}

/*************************************************************************
 * DEDICATED RENDERERS FOR SPIKED SPIRAL & BEADED SPIRAL
 *************************************************************************/
function drawSpikedSpiralArena(targetCtx, state, config, maxOuterR, lineThick, spikeH) {
    targetCtx.save();
    const innerR = 26;
    const turns = getAlignedSpikedSpiralTurns(config);
    const maxTheta = turns * Math.PI * 2;
    const bCoeff = (maxOuterR - innerR) / maxTheta;

    // 1. Center Diamond Target
    drawCenterTargetVisual(targetCtx, state, { ...config, centerPortalStyle: 'diamond' });

    // 2. Alive Spiral Spikes
    for (const sp of state.spiralSpikes) {
        if (!sp.alive) continue;
        const r1 = innerR + bCoeff * sp.theta1;
        const rMid = innerR + bCoeff * sp.thetaMid;
        const r2 = innerR + bCoeff * sp.theta2;

        const a1 = -sp.theta1 + state.spiralAngle;
        const aMid = -sp.thetaMid + state.spiralAngle;
        const a2 = -sp.theta2 + state.spiralAngle;

        const x1 = CX + Math.cos(a1) * r1, y1 = CY + Math.sin(a1) * r1;
        const xTip = CX + Math.cos(aMid) * Math.max(innerR, rMid - spikeH), yTip = CY + Math.sin(aMid) * Math.max(innerR, rMid - spikeH);
        const x2 = CX + Math.cos(a2) * r2, y2 = CY + Math.sin(a2) * r2;

        const hue = ((sp.thetaMid / maxTheta) * 360 * 2) % 360;
        targetCtx.fillStyle = `hsl(${hue}, 92%, 58%)`;
        targetCtx.beginPath();
        targetCtx.moveTo(x1, y1);
        targetCtx.lineTo(xTip, yTip);
        targetCtx.lineTo(x2, y2);
        targetCtx.closePath();
        targetCtx.fill();
    }

    // 3. Continuous Spiral Wall
    targetCtx.lineWidth = lineThick;
    targetCtx.lineCap = 'round';
    const step = 0.06;
    for (let t = 0; t < maxTheta; t += step) {
        const tNext = Math.min(maxTheta, t + step);
        const r1 = innerR + bCoeff * t;
        const r2 = innerR + bCoeff * tNext;
        const a1 = -t + state.spiralAngle;
        const a2 = -tNext + state.spiralAngle;

        targetCtx.strokeStyle = `hsl(${((t / maxTheta) * 360) % 360}, 90%, 60%)`;
        targetCtx.beginPath();
        targetCtx.moveTo(CX + Math.cos(a1) * r1, CY + Math.sin(a1) * r1);
        targetCtx.lineTo(CX + Math.cos(a2) * r2, CY + Math.sin(a2) * r2);
        targetCtx.stroke();
    }

    // 4. Stationary Multiplier Gate at 5 o'clock
    if (state.spiralGate) {
        const g = state.spiralGate;
        const gAng = -g.theta + state.spiralAngle;
        const gx = CX + Math.cos(gAng) * g.rTrack;
        const gy = CY + Math.sin(gAng) * g.rTrack;

        targetCtx.save();
        targetCtx.translate(gx, gy);
        targetCtx.scale(g.pulseScale || 1, g.pulseScale || 1);
        targetCtx.fillStyle = '#eab308';
        targetCtx.strokeStyle = '#fef08a';
        targetCtx.lineWidth = 2.5;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, g.r, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();

        targetCtx.fillStyle = '#090b12';
        targetCtx.font = '800 12px "Plus Jakarta Sans"';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(`x${g.mult}`, 0, 1);
        targetCtx.restore();
    }

    targetCtx.restore();
}

function drawBeadedSpiralArena(targetCtx, state, config, maxOuterR, lineThick) {
    targetCtx.save();
    const innerR = 26;
    const turns = config.beadSpiralTurns || 4.5;
    const maxTheta = turns * Math.PI * 2;
    const bCoeff = (maxOuterR - innerR) / maxTheta;

    for (const bead of state.beads) {
        if (!bead.alive) continue;
        const ang = bead.theta + state.spiralAngle;
        const bx = CX + Math.cos(ang) * bead.radius;
        const by = CY + Math.sin(ang) * bead.radius;
        targetCtx.fillStyle = `hsl(${bead.hue}, 92%, 60%)`;
        targetCtx.beginPath();
        targetCtx.arc(bx, by, bead.size, 0, Math.PI * 2);
        targetCtx.fill();
    }

    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = lineThick * 0.65;
    targetCtx.lineCap = 'round';
    targetCtx.beginPath();
    for (let t = 0; t <= maxTheta; t += 0.06) {
        const r = innerR + bCoeff * t;
        const ang = t + state.spiralAngle;
        const px = CX + Math.cos(ang) * r;
        const py = CY + Math.sin(ang) * r;
        if (t === 0) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
    }
    targetCtx.stroke();

    // Progress Bar at Bottom
    const barW = 280;
    const barH = 14;
    const bx = CX - barW / 2;
    const by = canvas.height - 115;
    targetCtx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(bx, by, barW, barH);
    targetCtx.fillStyle = '#22c55e';
    targetCtx.fillRect(bx + 2, by + 2, ((barW - 4) * (state.centerProgress || 0)) / 100, barH - 4);

    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = '800 13px "JetBrains Mono"';
    targetCtx.textAlign = 'center';
    targetCtx.fillText(`${state.centerProgress || 0}% TO CENTER`, CX, by - 8);

    targetCtx.restore();
}

function drawRingSpikes1to1(targetCtx, ring, state, config, spikeH, lineThick) {
    const baseR = ring.radius - lineThick * 0.4;
    const toothWidthPx = Math.max(12, config.spikeWidthRef * SCALE_1080 * 0.48);

    const arcs = [];
    if (config.spikeCoverage === 'full') {
        arcs.push({ start: ring.angle + ring.gap, span: Math.PI * 2 - ring.gap });
    } else if (config.spikeCoverage === 'bottom') {
        const span = Math.PI * 0.65;
        arcs.push({ start: ring.angle + Math.PI - span / 2, span });
    } else {
        for (let c = 0; c < 3; c++) {
            arcs.push({ start: ring.angle + (c * Math.PI * 2) / 3 + 0.55, span: 0.38 });
        }
    }

    targetCtx.save();
    const grad = targetCtx.createLinearGradient(CX - baseR, CY - baseR, CX + baseR, CY + baseR);
    grad.addColorStop(0, state.gradStart);
    grad.addColorStop(1, state.gradEnd);

    for (const arc of arcs) {
        const arcLen = arc.span * baseR;
        const numTeeth = Math.max(3, Math.floor(arcLen / toothWidthPx));
        const step = arc.span / numTeeth;

        targetCtx.beginPath();
        for (let i = 0; i < numTeeth; i++) {
            const a1 = arc.start + i * step;
            const aMid = a1 + step * 0.5;
            const a2 = a1 + step;
            const x1 = CX + Math.cos(a1) * baseR, y1 = CY + Math.sin(a1) * baseR;
            const xTip = CX + Math.cos(aMid) * (baseR - spikeH), yTip = CY + Math.sin(aMid) * (baseR - spikeH);
            const x2 = CX + Math.cos(a2) * baseR, y2 = CY + Math.sin(a2) * baseR;
            targetCtx.moveTo(x1, y1);
            targetCtx.lineTo(xTip, yTip);
            targetCtx.lineTo(x2, y2);
        }

        if (config.spikeStyle === 'hollow') {
            targetCtx.strokeStyle = grad;
            targetCtx.lineWidth = 2.2;
            targetCtx.stroke();
        } else if (config.spikeStyle === 'gradient' || config.spikeStyle === 'rainbow') {
            targetCtx.fillStyle = grad;
            targetCtx.fill();
        } else {
            targetCtx.fillStyle = '#ff2e63';
            targetCtx.fill();
        }
    }
    targetCtx.restore();
}

function drawSingleBallVisual(targetCtx, b, state, config, isTrailStamp = false) {
    targetCtx.save();
    targetCtx.translate(b.x, b.y);
    if (isTrailStamp) {
        const trailScale = Math.max(0.25, Math.min(2, Number(config.trailThickness) || 0.8));
        targetCtx.scale(trailScale, trailScale);
    }
    if (config.glowFX && !isTrailStamp) {
        targetCtx.shadowColor = `hsl(${b.hue || 185}, 95%, 65%)`;
        targetCtx.shadowBlur = Math.max(7, b.r * 0.8);
    }
    if (b.spawnPopScale && b.spawnPopScale < 1) {
        targetCtx.scale(b.spawnPopScale, b.spawnPopScale);
    }

    if (b.country) {
        drawCountryFlagBall(targetCtx, b);
        targetCtx.restore();
        return;
    }

    if (b.isMergeBall) {
        drawMergeBallVisual(targetCtx, b, config);
        targetCtx.restore();
        return;
    }

    if (config.customBallEmoji && config.customBallEmoji.trim() !== '') {
        targetCtx.font = `${Math.floor(b.r * 1.6)}px sans-serif`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(config.customBallEmoji.trim(), 0, 1);
        targetCtx.restore();
        return;
    }

    if (customBallImage || b.useAvatar) {
        const imgSource = customBallImage || defaultMemeAvatarCanvas;
        if (b.rot) targetCtx.rotate(b.rot);
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.arc(0, 0, b.r, 0, Math.PI * 2);
        targetCtx.clip();
        const imgW = imgSource.naturalWidth || imgSource.width;
        const imgH = imgSource.naturalHeight || imgSource.height;
        const minDim = Math.min(imgW, imgH);
        targetCtx.drawImage(imgSource, (imgW - minDim) / 2, (imgH - minDim) / 2, minDim, minDim, -b.r, -b.r, b.r * 2, b.r * 2);
        targetCtx.restore();

        targetCtx.beginPath();
        targetCtx.arc(0, 0, b.r, 0, Math.PI * 2);
        targetCtx.lineWidth = 1.6;
        targetCtx.strokeStyle = '#ffffff';
        targetCtx.stroke();
        targetCtx.restore();
        return;
    }

    if (b.isWhiteStar) {
        targetCtx.fillStyle = '#ffffff';
        targetCtx.shadowColor = '#ffffff';
        targetCtx.shadowBlur = 14;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, b.r, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
        return;
    }

    targetCtx.fillStyle = config.mode === 'accumulation' ? '#10b981' : (b.veins ? '#7e22ce' : `hsl(${b.hue}, 82%, 48%)`);
    targetCtx.beginPath();
    targetCtx.arc(0, 0, b.r, 0, Math.PI * 2);
    targetCtx.fill();

    if (b.WhiteBorder) {
        targetCtx.lineWidth = 1.8;
        targetCtx.strokeStyle = '#cbd5e1';
        targetCtx.stroke();
    } else if (isTrailStamp) {
        targetCtx.lineWidth = 1.4;
        targetCtx.strokeStyle = 'rgba(5, 6, 10, 0.78)';
        targetCtx.stroke();
    }

    if (!isTrailStamp && config.emojiFX && b.r >= 8) {
        const r = b.r;
        targetCtx.fillStyle = '#090b12';
        targetCtx.beginPath();
        targetCtx.arc(-r * 0.32, -r * 0.15, Math.max(1.5, r * 0.13), 0, Math.PI * 2);
        targetCtx.arc(r * 0.32, -r * 0.15, Math.max(1.5, r * 0.13), 0, Math.PI * 2);
        targetCtx.fill();
    }

    targetCtx.restore();
}

function drawMergeBallVisual(targetCtx, b, config) {
    const tier = activeMergeTiers[b.level] || activeMergeTiers[0];
    const r = b.r;

    if (tier.customImg) {
        targetCtx.save();
        if (config.mergeSpriteMode === 'circle') {
            targetCtx.beginPath();
            targetCtx.arc(0, 0, r, 0, Math.PI * 2);
            targetCtx.clip();
        }
        targetCtx.drawImage(tier.customImg, -r, -r, r * 2, r * 2);
        targetCtx.restore();
        if (config.mergeSpriteMode === 'circle') {
            targetCtx.strokeStyle = '#ffffff';
            targetCtx.lineWidth = 2;
            targetCtx.beginPath();
            targetCtx.arc(0, 0, r, 0, Math.PI * 2);
            targetCtx.stroke();
        }
        return;
    }

    if (config.mergeTheme === 'video2_cats' && proceduralCatSprites[b.level]) {
        targetCtx.save();
        if (config.mergeSpriteMode === 'circle') {
            targetCtx.beginPath();
            targetCtx.arc(0, 0, r, 0, Math.PI * 2);
            targetCtx.clip();
        }
        targetCtx.drawImage(proceduralCatSprites[b.level], -r, -r, r * 2, r * 2);
        targetCtx.restore();
        return;
    }

    targetCtx.fillStyle = tier.color;
    targetCtx.beginPath();
    targetCtx.arc(0, 0, r, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.lineWidth = 2;
    targetCtx.strokeStyle = '#ffffff';
    targetCtx.stroke();

    if (tier.emoji && tier.emoji.trim() !== '') {
        targetCtx.font = `${Math.floor(r * 1.15)}px sans-serif`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(tier.emoji, 0, 2);
    } else {
        targetCtx.fillStyle = '#090b12';
        targetCtx.beginPath();
        targetCtx.arc(-r * 0.3, -r * 0.12, Math.max(1.5, r * 0.14), 0, Math.PI * 2);
        targetCtx.arc(r * 0.3, -r * 0.12, Math.max(1.5, r * 0.14), 0, Math.PI * 2);
        targetCtx.fill();
    }
}

function drawCountryFlagBall(targetCtx, b) {
    const r = b.r;
    const c = b.country;
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(0, 0, r, 0, Math.PI * 2);
    targetCtx.clip();

    if (c.style === 'horizontal2') {
        targetCtx.fillStyle = c.colors[0];
        targetCtx.fillRect(-r, -r, r * 2, r);
        targetCtx.fillStyle = c.colors[1];
        targetCtx.fillRect(-r, 0, r * 2, r);
    } else if (c.style === 'horizontal3') {
        targetCtx.fillStyle = c.colors[0];
        targetCtx.fillRect(-r, -r, r * 2, (r * 2) / 3);
        targetCtx.fillStyle = c.colors[1];
        targetCtx.fillRect(-r, -r / 3, r * 2, (r * 2) / 3);
        targetCtx.fillStyle = c.colors[2];
        targetCtx.fillRect(-r, r / 3, r * 2, (r * 2) / 3);
    } else if (c.style === 'vertical3') {
        targetCtx.fillStyle = c.colors[0];
        targetCtx.fillRect(-r, -r, (r * 2) / 3, r * 2);
        targetCtx.fillStyle = c.colors[1];
        targetCtx.fillRect(-r / 3, -r, (r * 2) / 3, r * 2);
        targetCtx.fillStyle = c.colors[2];
        targetCtx.fillRect(r / 3, -r, (r * 2) / 3, r * 2);
    } else if (c.style === 'circle') {
        targetCtx.fillStyle = c.colors[0];
        targetCtx.fillRect(-r, -r, r * 2, r * 2);
        targetCtx.fillStyle = c.colors[1];
        targetCtx.beginPath();
        targetCtx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
        targetCtx.fill();
    } else {
        targetCtx.fillStyle = c.colors[0];
        targetCtx.fillRect(-r, -r, r * 2, r * 2);
        targetCtx.fillStyle = c.colors[1];
        targetCtx.fillRect(-r, -r * 0.25, r * 2, r * 0.5);
    }
    targetCtx.restore();

    targetCtx.beginPath();
    targetCtx.arc(0, 0, r, 0, Math.PI * 2);
    targetCtx.lineWidth = 2;
    targetCtx.strokeStyle = '#ffffff';
    targetCtx.stroke();

    if (simConfig.mode === 'country_royale') {
        const barW = r * 1.7;
        const hpRatio = Math.max(0, b.hp / b.maxHp);
        targetCtx.fillStyle = 'rgba(0,0,0,0.75)';
        targetCtx.fillRect(-barW / 2, -r - 8, barW, 4);
        targetCtx.fillStyle = hpRatio > 0.5 ? '#d4ff33' : '#f43f5e';
        targetCtx.fillRect(-barW / 2, -r - 8, barW * hpRatio, 4);
    }
}

/*************************************************************************
 * UI CONTROLLERS & DYNAMIC MODE BINDINGS
 *************************************************************************/
const ALL_SPECIFIC_GROUPS = [...new Set(GAME_MODES.map(mode => mode.specificGroup).filter(Boolean))];
const ALL_MODE_CARDS = [...new Set(GAME_MODES.map(mode => mode.leftPanelCard).filter(Boolean))];

// Single source of truth for mode-exclusive controls: config key, display
// formatting, parsing, and whether a changed value requires a fresh state.
const MODE_CONTROL_DEFINITIONS = {
    rngSpikedSpiralTurns: { key: 'spikedSpiralTurns', format: v => `${v} turns`, reset: true },
    rngStreamSpawnRate: { key: 'streamSpawnRate', format: v => `${v}f` },
    rngGlassShardCount: { key: 'glassShardCount', format: v => `${v} shards` },
    rngBeadSpiralTurns: { key: 'beadSpiralTurns', format: v => `${v} turns`, reset: true },
    rngBeadSubRows: { key: 'beadSubRows', format: v => `${v} rows`, reset: true },
    rngSpawnInterval: { key: 'spawnIntervalTicks', format: v => `${v}f` },
    rngClassicRings: { key: 'classicRingCount', format: v => `${v} rings`, reset: true },
    rngClassicPhase: { key: 'classicPhaseShift', format: v => `${Number(v).toFixed(2)} rad`, reset: true },
    rngBeadRings: { key: 'beadRingLayers', format: v => `${v} layers`, reset: true },
    rngBeadSize: { key: 'beadDotSize', format: v => `${Number(v).toFixed(1)}px`, reset: true },
    rngMultiplyFactor: { key: 'multiplyFactor', format: v => `x${v} per escape` },
    rngGrowthRate: { key: 'ballGrowthRate', format: v => `+${Number(v).toFixed(2)}px / hit` },
    rngFragmentCount: { key: 'fragmentMaxCount', format: v => `${v} fragments` },
    rngSpiralTurns: { key: 'spiralTurns', format: v => `${Number(v).toFixed(1)} turns` },
    rngCollisionBurst: { key: 'collisionBurstCount', format: v => `+${v} balls` },
    rngEatingCount: { key: 'eatingInitialCount', format: v => `${v} balls`, reset: true },
    rngRoyaleDmg: { key: 'royaleDamageMult', format: v => `${Number(v).toFixed(1)}x` }
};

function buildTopModePills() {
    const container = document.getElementById('topModePills');
    container.innerHTML = '';
    GAME_MODES.forEach(m => {
        const btn = document.createElement('button');
        btn.className = `mode-pill px-3 py-1 rounded-full border border-slate-700 bg-[#141722] hover:bg-slate-800 text-xs font-bold whitespace-nowrap transition ${m.id === simConfig.mode ? 'active' : 'text-slate-300'}`;
        btn.textContent = m.name;
        btn.addEventListener('click', () => selectGameMode(m.id));
        container.appendChild(btn);
    });
}

function applyMergeTierTheme(themeId, restoreOverrides = true) {
    const theme = DEFAULT_MERGE_THEMES[themeId] || DEFAULT_MERGE_THEMES.video1_faces;
    activeMergeTiers = theme.map(tier => ({ ...tier, customImg: null, customImgUrl: null }));
    const overrides = restoreOverrides && simConfig.modeSettings?.fusion?.tierOverrides;
    if (Array.isArray(overrides)) {
        overrides.forEach((override, index) => {
            const tier = activeMergeTiers[index];
            if (!tier || !override) return;
            if (typeof override.emoji === 'string') tier.emoji = override.emoji;
            if (typeof override.color === 'string' && /^#[0-9a-f]{6}$/i.test(override.color)) tier.color = override.color;
        });
    }
    renderMergeTierEditor();
}

function saveMergeTierOverrides() {
    const modeSettings = simConfig.modeSettings.fusion;
    modeSettings.tierOverrides = activeMergeTiers.map(({ emoji, color }) => ({ emoji, color }));
}

function renderMergeTierEditor() {
    const list = document.getElementById('mergeTierList');
    if (!list) return;
    list.replaceChildren();
    activeMergeTiers.forEach((tier, index) => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-[1fr_auto_auto_auto] items-center gap-1.5 bg-[#0b0d14] rounded p-1.5';

        const name = document.createElement('span');
        name.className = 'text-[10px] text-slate-300 truncate';
        name.textContent = `${index + 1}. ${tier.name}`;

        const emoji = document.createElement('input');
        emoji.type = 'text';
        emoji.value = tier.emoji || '';
        emoji.placeholder = 'Emoji';
        emoji.title = 'Emoji tier';
        emoji.className = 'w-14 bg-[#181b26] border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white';
        emoji.addEventListener('input', () => {
            tier.emoji = emoji.value;
            saveMergeTierOverrides();
        });

        const color = document.createElement('input');
        color.type = 'color';
        color.value = tier.color;
        color.title = 'Warna tier';
        color.addEventListener('input', () => {
            tier.color = color.value;
            saveMergeTierOverrides();
        });

        const imageLabel = document.createElement('label');
        imageLabel.className = 'px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-white cursor-pointer';
        imageLabel.textContent = tier.customImg ? '✓' : '📷';
        imageLabel.title = 'Unggah gambar tier (berlaku selama sesi ini)';
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.className = 'hidden';
        imageInput.addEventListener('change', event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = loadEvent => {
                const image = new Image();
                image.onload = () => {
                    tier.customImg = image;
                    tier.customImgUrl = loadEvent.target.result;
                    imageLabel.textContent = '✓';
                };
                image.src = loadEvent.target.result;
            };
            reader.readAsDataURL(file);
        });
        imageLabel.appendChild(imageInput);

        row.append(name, emoji, color, imageLabel);
        list.appendChild(row);
    });
}

function selectGameMode(modeId, resetModeSettings = false) {
    const modeChanged = simConfig.mode !== modeId;
    if (modeChanged) rememberActiveModeSettings();
    simConfig.mode = modeId;
    const modeObj = GAME_MODES.find(m => m.id === modeId);
    if (modeObj) {
        if (modeChanged || resetModeSettings) activateModeSettings(modeId, resetModeSettings);
        if (modeId === 'fusion') applyMergeTierTheme(simConfig.mergeTheme, true);
        document.getElementById('canvasModeTitle').textContent = modeObj.name;
        document.getElementById('canvasModeSubtitle').textContent = modeObj.subtitle;
        document.getElementById('rightPanelModeName').textContent = modeObj.name;

        ALL_SPECIFIC_GROUPS.forEach(gid => {
            const el = document.getElementById(gid);
            if (el) el.classList.add('hidden');
        });
        const secSpecific = document.getElementById('sectionModeSpecific');
        if (modeObj.specificGroup) {
            secSpecific.classList.remove('hidden');
            document.getElementById('lblModeSpecificHeader').textContent = modeObj.specificHeader;
            const activeGrp = document.getElementById(modeObj.specificGroup);
            if (activeGrp) activeGrp.classList.remove('hidden');
        } else {
            secSpecific.classList.add('hidden');
        }

        const secTrap = document.getElementById('sectionTrap');
        if (modeObj.hasSpikes) secTrap.classList.remove('hidden');
        else secTrap.classList.add('hidden');

        ALL_MODE_CARDS.forEach(cardId => document.getElementById(cardId)?.classList.add('hidden'));
        if (modeObj.leftPanelCard) document.getElementById(modeObj.leftPanelCard)?.classList.remove('hidden');

        if (modeId === 'fusion') sound.mergeSoundMode = simConfig.mergeSoundMode || 'pop';

        syncUIFromConfig();
    }
    buildTopModePills();
    resetSimulation();
}

function syncUIFromConfig() {
    document.getElementById('rngCircleRadius').value = simConfig.circleRadiusRef;
    document.getElementById('valCircleRadius').textContent = simConfig.circleRadiusRef + 'px';

    document.getElementById('rngOutlineThickness').value = simConfig.outlineThicknessRef;
    document.getElementById('valOutlineThickness').textContent = simConfig.outlineThicknessRef + 'px';

    document.getElementById('rngOpeningSize').value = simConfig.openingSizeDeg;
    document.getElementById('valOpeningSize').textContent = simConfig.openingSizeDeg + '°';

    document.getElementById('rngRotSpeed').value = simConfig.rotSpeedMult;
    document.getElementById('valRotSpeed').textContent = simConfig.rotSpeedMult.toFixed(2) + 'x';
    const modeSupportsRotation = Boolean(GAME_MODES.find(mode => mode.id === simConfig.mode)?.hasRotation);
    document.getElementById('chkRotationEnabled').checked = Boolean(simConfig.rotationEnabled);
    document.getElementById('rowRotationToggle').classList.toggle('hidden', !modeSupportsRotation);
    document.getElementById('rowRotSpeed').classList.toggle('hidden', !modeSupportsRotation);

    document.getElementById('rngSpikeHeight').value = simConfig.spikeHeightRef;
    document.getElementById('valSpikeHeight').textContent = simConfig.spikeHeightRef + 'px';

    document.getElementById('rngSpikeWidth').value = simConfig.spikeWidthRef;
    document.getElementById('valSpikeWidth').textContent = simConfig.spikeWidthRef + 'px';

    document.getElementById('selSpikeCoverage').value = simConfig.spikeCoverage;
    document.getElementById('selSpikeStyle').value = simConfig.spikeStyle;

    document.getElementById('rngBallRadius').value = simConfig.ballRadiusRef;
    document.getElementById('valBallRadius').textContent = simConfig.ballRadiusRef + 'px';

    document.getElementById('rngGravity').value = simConfig.gravityRef;
    document.getElementById('valGravity').textContent = simConfig.gravityRef.toFixed(2);

    document.getElementById('rngMinBounce').value = simConfig.minBounceSpeedRef;
    document.getElementById('valMinBounce').textContent = simConfig.minBounceSpeedRef.toFixed(1);

    document.getElementById('rngInitSpeedX').value = simConfig.initSpeedXRef;
    document.getElementById('valInitSpeedX').textContent = simConfig.initSpeedXRef.toFixed(1);

    // Multiply Gates UI Sync
    document.getElementById('selGlassStyle').value = simConfig.glassStyle;
    document.getElementById('selGateLayout').value = simConfig.gateLayout;
    document.getElementById('selCenterPortalStyle').value = simConfig.centerPortalStyle;
    document.getElementById('rngGateCount').value = simConfig.gateCount;
    document.getElementById('valGateCount').textContent = simConfig.gateCount + ' orbs';
    document.getElementById('rngGateIncrement').value = simConfig.gateIncrement;
    document.getElementById('valGateIncrement').textContent = `+${simConfig.gateIncrement} / hit`;
    document.getElementById('rngMeshDensity').value = simConfig.meshDensity;
    document.getElementById('valMeshDensity').textContent = simConfig.meshDensity + ' layers';
    document.getElementById('chkMultiplyRainbowWalls').checked = simConfig.multiplyRainbowWalls;

    for (const [id, definition] of Object.entries(MODE_CONTROL_DEFINITIONS)) {
        const input = document.getElementById(id);
        if (!input) continue;
        input.value = simConfig[definition.key];
        const valueLabel = document.getElementById(id.replace('rng', 'val'));
        if (valueLabel) valueLabel.textContent = definition.format(simConfig[definition.key]);
    }

    const configControls = {
        selCountryPack: 'countryPack', selMergeTheme: 'mergeTheme',
        selMergeSpriteMode: 'mergeSpriteMode', selMergeSoundMode: 'mergeSoundMode',
        inpCustomHook: 'hookText', inpBottomHook: 'bottomHookText',
        chkAudioSpectrum: 'audioSpectrum', chkFloatingText: 'floatingTextFX',
        chkSuddenDeath: 'suddenDeath', chkEmoji: 'emojiFX',
        chkReactiveBackground: 'reactiveBackground', chkGlowFX: 'glowFX',
        chkWallGlowFX: 'wallGlowFX', chkColorTrails: 'colorTrails',
        chkConfettiFX: 'confettiFX', chkShatterFX: 'shatterFX', chkShockwaveFX: 'shockwaveFX',
        inpCustomBallEmoji: 'customBallEmoji', inpCenterEmoji: 'centerEmoji',
        selCenterShape: 'centerShape', inpWatermarkText: 'watermarkText',
        inpWatermarkSub: 'watermarkSub', inpSeed: 'seed',
        chkRandomColors: 'randomColorsEachRound'
    };
    for (const [id, key] of Object.entries(configControls)) {
        const input = document.getElementById(id);
        if (!input || simConfig[key] === undefined) continue;
        if (input.type === 'checkbox') input.checked = Boolean(simConfig[key]);
        else input.value = simConfig[key];
    }
    document.getElementById('rngHookFontSize').value = simConfig.hookFontSize;
    document.getElementById('valHookFontSize').textContent = `${simConfig.hookFontSize}px`;
    document.getElementById('rngBottomHookFontSize').value = simConfig.bottomHookFontSize;
    document.getElementById('valBottomHookFontSize').textContent = `${simConfig.bottomHookFontSize}px`;
    document.getElementById('rngTrailThickness').value = simConfig.trailThickness;
    document.getElementById('valTrailThickness').textContent = `${Number(simConfig.trailThickness).toFixed(1)}×`;
    const hookPreset = document.getElementById('selHookPreset');
    hookPreset.value = [...hookPreset.options].some(option => option.value === simConfig.hookText)
        ? simConfig.hookText
        : 'custom';
    document.getElementById('selColorTheme').value = simConfig.themeName || 'ballsim';
    document.getElementById('colGradStart').value = simConfig.gradStart;
    document.getElementById('colGradEnd').value = simConfig.gradEnd;
    document.getElementById('colBackground').value = simConfig.bgColor;
    document.getElementById('rngMasterVol').value = sound.volume;
    document.getElementById('chkSoundEnabled').checked = sound.enabled;
    document.getElementById('chkPolyBass').checked = sound.polyBass;
    document.getElementById('selInstrument').value = sound.instrument;
    document.getElementById('selDeathSound').value = sound.deathSound;
    document.getElementById('selEscapeSound').value = sound.escapeSound;
    document.getElementById('selMergeSoundMode').value = sound.mergeSoundMode;
}

function resetSimulation() {
    sound.noteIdx = 0;
    rememberActiveModeSettings();
    simState = createSimulationState(simConfig);
    document.getElementById('escapeBanner').classList.add('hidden');
}

function noteNameFromMidiNumber(number) {
    const midi = Math.min(96, Math.max(24, number));
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function parseMidiNoteSequence(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const readU32 = offset => ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    const readTag = offset => String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    if (bytes.length < 14 || readTag(0) !== 'MThd') throw new Error('Header MIDI tidak valid');
    const headerLength = readU32(4);
    const trackCount = (bytes[10] << 8) | bytes[11];
    const division = (bytes[12] << 8) | bytes[13];
    if (!trackCount || (division & 0x8000)) throw new Error('Format timing MIDI tidak didukung');

    let offset = 8 + headerLength;
    const notes = [];
    for (let track = 0; track < trackCount && offset + 8 <= bytes.length; track++) {
        if (readTag(offset) !== 'MTrk') throw new Error('Track MIDI tidak valid');
        const trackLength = readU32(offset + 4);
        let cursor = offset + 8;
        const end = Math.min(bytes.length, cursor + trackLength);
        let runningStatus = 0;
        let tick = 0;
        const readVLQ = () => {
            let value = 0;
            let byte;
            let count = 0;
            do {
                if (cursor >= end || count++ > 4) throw new Error('Data MIDI terpotong');
                byte = bytes[cursor++];
                value = (value << 7) | (byte & 0x7f);
            } while (byte & 0x80);
            return value;
        };

        while (cursor < end) {
            tick += readVLQ();
            const first = bytes[cursor++];
            let status;
            if (first & 0x80) {
                status = first;
                runningStatus = status < 0xf0 ? status : runningStatus;
            } else {
                if (!runningStatus) throw new Error('Running status MIDI tidak valid');
                status = runningStatus;
                cursor--;
            }

            if (status === 0xff) {
                cursor++;
                cursor += readVLQ();
                continue;
            }
            if (status === 0xf0 || status === 0xf7) {
                cursor += readVLQ();
                continue;
            }

            const command = status >> 4;
            const channel = status & 0x0f;
            if (cursor >= end) throw new Error('Event MIDI tidak lengkap');
            const pitch = bytes[cursor++];
            const velocity = command === 0xc || command === 0xd ? 0 : (cursor < end ? bytes[cursor++] : 0);
            if (channel !== 9 && command === 0x9 && velocity > 0) {
                notes.push({ tick, pitch: noteNameFromMidiNumber(pitch), velocity });
            }
        }
        offset = end;
    }

    notes.sort((a, b) => a.tick - b.tick || b.velocity - a.velocity);
    const sequence = notes.slice(0, 512).map(note => note.pitch).filter(note => NOTE_TO_FREQ[note]);
    if (!sequence.length) throw new Error('Tidak ada nada melodi yang ditemukan');
    return sequence;
}

function setMelodySequence(sequence, label, selection = 'custom') {
    if (!Array.isArray(sequence) || !sequence.length) return false;
    sound.sequence = sequence.filter(note => typeof note === 'string' && NOTE_TO_FREQ[note]);
    if (!sound.sequence.length) return false;
    sound.noteIdx = 0;
    document.getElementById('inpMelodyNotes').value = sound.sequence.join(' ');
    document.getElementById('midiStatusText').textContent = label;
    const select = document.getElementById('selMelody');
    if (selection === 'custom' && ![...select.options].some(option => option.value === 'custom')) {
        const option = document.createElement('option');
        option.value = 'custom';
        option.textContent = 'Custom / MIDI Import';
        select.appendChild(option);
    }
    select.value = selection;
    return true;
}

// Multiply Gates Exclusive Event Listeners
document.getElementById('selGlassStyle').addEventListener('change', (e) => {
    simConfig.glassStyle = e.target.value;
    if (e.target.value === 'hourglass') {
        simConfig.multiplyRainbowWalls = true;
        simConfig.gateLayout = 'right_line';
        simConfig.centerPortalStyle = 'energy';
        simConfig.gateCount = 3;
    } else if (e.target.value === 'hexagons') {
        simConfig.multiplyRainbowWalls = false;
        simConfig.gateLayout = 'scattered';
        simConfig.centerPortalStyle = 'blackhole';
        simConfig.gateCount = 4;
    }
    syncUIFromConfig();
    resetSimulation();
});
document.getElementById('selGateLayout').addEventListener('change', (e) => {
    simConfig.gateLayout = e.target.value;
    resetSimulation();
});
document.getElementById('selCenterPortalStyle').addEventListener('change', (e) => {
    simConfig.centerPortalStyle = e.target.value;
});
document.getElementById('rngGateCount').addEventListener('input', (e) => {
    simConfig.gateCount = parseInt(e.target.value, 10);
    document.getElementById('valGateCount').textContent = simConfig.gateCount + ' orbs';
    resetSimulation();
});
document.getElementById('rngGateIncrement').addEventListener('input', (e) => {
    simConfig.gateIncrement = parseInt(e.target.value, 10);
    document.getElementById('valGateIncrement').textContent = `+${simConfig.gateIncrement} / hit`;
});
document.getElementById('rngMeshDensity').addEventListener('input', (e) => {
    simConfig.meshDensity = parseInt(e.target.value, 10);
    document.getElementById('valMeshDensity').textContent = simConfig.meshDensity + ' layers';
    resetSimulation();
});
document.getElementById('chkMultiplyRainbowWalls').addEventListener('change', (e) => {
    simConfig.multiplyRainbowWalls = e.target.checked;
});
document.getElementById('btnRandomizeGates').addEventListener('click', () => {
    simConfig.gateLayout = 'random';
    simConfig.seed = Math.floor(1000 + Math.random() * 90000);
    document.getElementById('inpSeed').value = simConfig.seed;
    syncUIFromConfig();
    resetSimulation();
});

// Global country roster is shared by both country modes.
document.getElementById('selCountryPack').addEventListener('change', event => {
    simConfig.countryPack = event.target.value;
    resetSimulation();
});

document.getElementById('selMergeTheme').addEventListener('change', event => {
    simConfig.mergeTheme = event.target.value;
    simConfig.modeSettings.fusion.tierOverrides = null;
    applyMergeTierTheme(simConfig.mergeTheme, false);
    if (simConfig.mode === 'fusion') resetSimulation();
});
document.getElementById('selMergeSpriteMode').addEventListener('change', event => {
    simConfig.mergeSpriteMode = event.target.value;
});
document.getElementById('selMergeSoundMode').addEventListener('change', event => {
    simConfig.mergeSoundMode = event.target.value;
    simConfig.modeSettings.fusion.mergeSoundMode = event.target.value;
    sound.mergeSoundMode = event.target.value;
});
document.getElementById('inpCustomMergeAudio').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const status = document.getElementById('customSfxStatus');
    status.textContent = 'Memuat audio…';
    try {
        await sound.loadCustomAudioFile(file);
        status.textContent = file.name.slice(0, 28);
    } catch {
        status.textContent = 'Audio tidak dapat dibaca';
    }
});
document.getElementById('btnResetMergeTiers').addEventListener('click', () => {
    simConfig.modeSettings.fusion.tierOverrides = null;
    applyMergeTierTheme(simConfig.mergeTheme, false);
});

// Mode-specific controls are bound from the same definitions used by UI sync.
for (const [id, definition] of Object.entries(MODE_CONTROL_DEFINITIONS)) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.addEventListener('input', event => {
        const value = Number(event.target.value);
        if (!Number.isFinite(value)) return;
        simConfig[definition.key] = value;
        const valueLabel = document.getElementById(id.replace('rng', 'val'));
        if (valueLabel) valueLabel.textContent = definition.format(value);
        if (definition.reset) resetSimulation();
    });
}

// Standard Geometry & Physics Sliders
document.getElementById('rngCircleRadius').addEventListener('input', (e) => {
    simConfig.circleRadiusRef = parseInt(e.target.value, 10);
    document.getElementById('valCircleRadius').textContent = simConfig.circleRadiusRef + 'px';
    resetSimulation();
});
document.getElementById('rngOutlineThickness').addEventListener('input', (e) => {
    simConfig.outlineThicknessRef = parseInt(e.target.value, 10);
    document.getElementById('valOutlineThickness').textContent = simConfig.outlineThicknessRef + 'px';
});
document.getElementById('rngOpeningSize').addEventListener('input', (e) => {
    simConfig.openingSizeDeg = parseInt(e.target.value, 10);
    document.getElementById('valOpeningSize').textContent = simConfig.openingSizeDeg + '°';
    resetSimulation();
});
document.getElementById('chkRotationEnabled').addEventListener('change', e => {
    simConfig.rotationEnabled = e.target.checked;
    resetSimulation();
});
document.getElementById('rngRotSpeed').addEventListener('input', (e) => {
    simConfig.rotSpeedMult = parseFloat(e.target.value);
    document.getElementById('valRotSpeed').textContent = simConfig.rotSpeedMult.toFixed(2) + 'x';
    resetSimulation();
});
document.getElementById('rngSpikeHeight').addEventListener('input', (e) => {
    simConfig.spikeHeightRef = parseInt(e.target.value, 10);
    document.getElementById('valSpikeHeight').textContent = simConfig.spikeHeightRef + 'px';
});
document.getElementById('rngSpikeWidth').addEventListener('input', (e) => {
    simConfig.spikeWidthRef = parseInt(e.target.value, 10);
    document.getElementById('valSpikeWidth').textContent = simConfig.spikeWidthRef + 'px';
});
document.getElementById('selSpikeCoverage').addEventListener('change', (e) => {
    simConfig.spikeCoverage = e.target.value;
});
document.getElementById('selSpikeStyle').addEventListener('change', (e) => {
    simConfig.spikeStyle = e.target.value;
});
document.getElementById('rngBallRadius').addEventListener('input', (e) => {
    simConfig.ballRadiusRef = parseInt(e.target.value, 10);
    document.getElementById('valBallRadius').textContent = simConfig.ballRadiusRef + 'px';
    resetSimulation();
});
document.getElementById('rngGravity').addEventListener('input', (e) => {
    simConfig.gravityRef = parseFloat(e.target.value);
    document.getElementById('valGravity').textContent = simConfig.gravityRef.toFixed(2);
});
document.getElementById('rngMinBounce').addEventListener('input', (e) => {
    simConfig.minBounceSpeedRef = parseFloat(e.target.value);
    document.getElementById('valMinBounce').textContent = simConfig.minBounceSpeedRef.toFixed(1);
});
document.getElementById('rngInitSpeedX').addEventListener('input', (e) => {
    simConfig.initSpeedXRef = parseFloat(e.target.value);
    document.getElementById('valInitSpeedX').textContent = simConfig.initSpeedXRef.toFixed(1);
    resetSimulation();
});

// Randomize & Reset
document.getElementById('btnRandomizeSettings').addEventListener('click', () => {
    simConfig.seed = Math.floor(1000 + Math.random() * 90000);
    document.getElementById('inpSeed').value = simConfig.seed;
    if (['multiply_gates', 'target', 'portal'].includes(simConfig.mode)) {
        const styles = ['hexagons', 'hourglass', 'triangles', 'diamonds'];
        simConfig.glassStyle = styles[Math.floor(Math.random() * styles.length)];
        simConfig.gateLayout = 'random';
    }
    syncUIFromConfig();
    resetSimulation();
});
document.getElementById('btnResetSettings').addEventListener('click', () => selectGameMode(simConfig.mode, true));

// Presets store simulation and visual configuration in the browser. Uploaded
// image/audio files remain session-local because browsers cannot restore a
// user's local file selection from a saved preset.
const PRESET_STORAGE_KEY = 'ballsimulator.presets.v1';

function readSavedPresets() {
    try {
        const value = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

function refreshSavedPresetList(selectName = '') {
    const select = document.getElementById('selSavedPresets');
    const presets = readSavedPresets();
    select.innerHTML = '';
    const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
    if (!names.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Belum ada preset tersimpan';
        select.appendChild(option);
        return;
    }
    for (const name of names) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
    if (selectName && names.includes(selectName)) select.value = selectName;
}

function setPresetStatus(message, isError = false) {
    const badge = document.getElementById('presetStatusBadge');
    badge.textContent = message;
    badge.className = `text-[10px] mono ${isError ? 'text-rose-400' : 'text-emerald-400'}`;
}

document.getElementById('btnSavePreset').addEventListener('click', () => {
    const name = document.getElementById('inpPresetName').value.trim();
    if (!name) {
        setPresetStatus('Isi nama preset', true);
        return;
    }
    try {
        rememberActiveModeSettings();
        const presets = readSavedPresets();
        presets[name] = {
            version: 2,
            config: JSON.parse(JSON.stringify(simConfig)),
            audio: {
                volume: sound.volume,
                enabled: sound.enabled,
                instrument: sound.instrument,
                deathSound: sound.deathSound,
                escapeSound: sound.escapeSound,
                polyBass: sound.polyBass,
                sequence: sound.sequence
            }
        };
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
        refreshSavedPresetList(name);
        setPresetStatus('Tersimpan');
    } catch {
        setPresetStatus('Gagal menyimpan', true);
    }
});

document.getElementById('btnLoadPreset').addEventListener('click', () => {
    const name = document.getElementById('selSavedPresets').value;
    const entry = readSavedPresets()[name];
    const saved = entry && [1, 2].includes(entry.version) && entry.config;
    if (!saved || !GAME_MODES.some(mode => mode.id === saved.mode)) {
        setPresetStatus('Preset tidak valid', true);
        return;
    }
    selectGameMode(saved.mode, true);
    const safeKeys = Object.keys(simConfig).filter(key => key !== 'modeSettings' && key in saved);
    for (const key of safeKeys) simConfig[key] = saved[key];
    if (typeof saved.wallBreakFX === 'boolean') {
        for (const key of ['confettiFX', 'shatterFX', 'shockwaveFX']) {
            if (typeof saved[key] !== 'boolean') simConfig[key] = saved.wallBreakFX;
        }
    }
    if (saved.modeSettings && typeof saved.modeSettings === 'object') {
        simConfig.modeSettings = Object.fromEntries(
            Object.entries(MODE_SETTING_DEFAULTS).map(([modeId, defaults]) => {
                const stored = saved.modeSettings[modeId];
                const safeSettings = {};
                for (const key of Object.keys(defaults)) {
                    const legacyValue = modeId === saved.mode && key in saved ? saved[key] : undefined;
                    const value = stored?.[key] !== undefined ? stored[key] : legacyValue;
                    const valid = typeof value === typeof defaults[key] &&
                        (typeof value !== 'number' || Number.isFinite(value));
                    safeSettings[key] = valid ? value : defaults[key];
                }
                return [modeId, safeSettings];
            })
        );
    } else {
        // Migrate older flattened presets into the active mode's new settings bucket.
        const defaults = MODE_SETTING_DEFAULTS[saved.mode] || {};
        const migrated = { ...defaults };
        for (const [key, defaultValue] of Object.entries(defaults)) {
            const value = saved[key];
            if (value !== undefined && typeof value === typeof defaultValue &&
                (typeof value !== 'number' || Number.isFinite(value))) {
                migrated[key] = value;
            }
        }
        simConfig.modeSettings = Object.fromEntries(
            Object.entries(MODE_SETTING_DEFAULTS).map(([modeId, modeDefaults]) =>
                [modeId, modeId === saved.mode ? migrated : { ...modeDefaults }])
        );
    }
    activateModeSettings(saved.mode, false);
    setOutputOrientation(simConfig.outputOrientation || 'portrait', false);
    const audio = entry.audio || {};
    if (Number.isFinite(audio.volume)) sound.volume = Math.min(1, Math.max(0, audio.volume));
    for (const key of ['enabled', 'instrument', 'deathSound', 'escapeSound', 'polyBass']) {
        if (audio[key] !== undefined && typeof audio[key] === typeof sound[key]) sound[key] = audio[key];
    }
    if (saved.mode === 'fusion') {
        const mergeSoundMode = simConfig.mergeSoundMode || audio.mergeSoundMode || 'pop';
        simConfig.mergeSoundMode = mergeSoundMode;
        simConfig.modeSettings.fusion.mergeSoundMode = mergeSoundMode;
        sound.mergeSoundMode = mergeSoundMode;
    }
    if (Array.isArray(audio.sequence) && audio.sequence.every(note => typeof note === 'string' && NOTE_TO_FREQ[note])) {
        sound.sequence = [...audio.sequence];
    }
    const melodyMatch = Object.entries(MELODIES).find(([, notes]) => notes.length === sound.sequence.length && notes.every((note, index) => note === sound.sequence[index]));
    setMelodySequence(sound.sequence, melodyMatch ? 'Melodi preset dimuat' : 'Urutan nada preset dimuat', melodyMatch?.[0] || 'custom');
    if (sound.masterGain) sound.masterGain.gain.value = sound.volume;
    syncUIFromConfig();
    resetSimulation();
    setPresetStatus('Preset dimuat');
});

document.getElementById('btnDeletePreset').addEventListener('click', () => {
    const name = document.getElementById('selSavedPresets').value;
    if (!name) return;
    try {
        const presets = readSavedPresets();
        delete presets[name];
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
        refreshSavedPresetList();
        setPresetStatus('Preset dihapus');
    } catch {
        setPresetStatus('Gagal menghapus', true);
    }
});

refreshSavedPresetList();

// Hooks & Audio
document.getElementById('selHookPreset').addEventListener('change', (e) => {
    if (e.target.value !== 'custom') {
        simConfig.hookText = e.target.value;
        document.getElementById('inpCustomHook').value = e.target.value;
    }
});
document.getElementById('inpCustomHook').addEventListener('input', (e) => simConfig.hookText = e.target.value);
document.getElementById('inpBottomHook').addEventListener('input', (e) => simConfig.bottomHookText = e.target.value);
document.getElementById('chkAudioSpectrum').addEventListener('change', (e) => simConfig.audioSpectrum = e.target.checked);
document.getElementById('chkPolyBass').addEventListener('change', (e) => sound.polyBass = e.target.checked);
document.getElementById('chkFloatingText').addEventListener('change', (e) => simConfig.floatingTextFX = e.target.checked);
document.getElementById('chkSuddenDeath').addEventListener('change', (e) => simConfig.suddenDeath = e.target.checked);
document.getElementById('chkEmoji').addEventListener('change', (e) => simConfig.emojiFX = e.target.checked);
document.getElementById('chkReactiveBackground').addEventListener('change', e => simConfig.reactiveBackground = e.target.checked);
document.getElementById('chkGlowFX').addEventListener('change', e => simConfig.glowFX = e.target.checked);
document.getElementById('chkWallGlowFX').addEventListener('change', e => simConfig.wallGlowFX = e.target.checked);
document.getElementById('chkColorTrails').addEventListener('change', e => {
    simConfig.colorTrails = e.target.checked;
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
});
document.getElementById('chkConfettiFX').addEventListener('change', e => simConfig.confettiFX = e.target.checked);
document.getElementById('chkShatterFX').addEventListener('change', e => simConfig.shatterFX = e.target.checked);
document.getElementById('chkShockwaveFX').addEventListener('change', e => simConfig.shockwaveFX = e.target.checked);
document.getElementById('rngTrailThickness').addEventListener('input', e => {
    simConfig.trailThickness = Number(e.target.value);
    document.getElementById('valTrailThickness').textContent = `${simConfig.trailThickness.toFixed(1)}×`;
});
document.getElementById('rngHookFontSize').addEventListener('input', e => {
    simConfig.hookFontSize = Number(e.target.value);
    document.getElementById('valHookFontSize').textContent = `${simConfig.hookFontSize}px`;
});
document.getElementById('rngBottomHookFontSize').addEventListener('input', e => {
    simConfig.bottomHookFontSize = Number(e.target.value);
    document.getElementById('valBottomHookFontSize').textContent = `${simConfig.bottomHookFontSize}px`;
});

document.getElementById('rngMasterVol').addEventListener('input', (e) => {
    sound.volume = parseFloat(e.target.value);
    if (sound.masterGain) sound.masterGain.gain.value = sound.volume;
});
document.getElementById('chkSoundEnabled').addEventListener('change', (e) => sound.enabled = e.target.checked);
document.getElementById('selMelody').addEventListener('change', (e) => {
    if (e.target.value === 'custom') return;
    setMelodySequence(MELODIES[e.target.value] || MELODIES.arpeggio, `Melodi bawaan: ${e.target.selectedOptions[0]?.textContent || e.target.value}`, e.target.value);
});
document.getElementById('btnApplyMelodyNotes').addEventListener('click', () => {
    const notes = document.getElementById('inpMelodyNotes').value.trim().split(/[\s,;|]+/).filter(Boolean).map(note => note.toUpperCase());
    const invalid = notes.find(note => !NOTE_TO_FREQ[note]);
    if (!notes.length || invalid) {
        document.getElementById('midiStatusText').textContent = invalid ? `Nada tidak dikenal: ${invalid}` : 'Masukkan urutan nada';
        return;
    }
    setMelodySequence(notes, `${notes.length} nada kustom aktif`);
});
document.getElementById('inpMidiFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const status = document.getElementById('midiStatusText');
    status.textContent = 'Membaca MIDI…';
    try {
        const sequence = parseMidiNoteSequence(await file.arrayBuffer());
        setMelodySequence(sequence, `${file.name}: ${sequence.length} nada diimpor`);
    } catch (error) {
        status.textContent = error.message || 'MIDI tidak dapat dibaca';
    }
});
function searchMelodyLibrary() {
    const query = document.getElementById('inpSongSearch').value.trim().toLowerCase();
    const results = document.getElementById('songSearchResults');
    results.replaceChildren();
    const matches = STREAMING_CATALOG.filter(item => !query || item.title.toLowerCase().includes(query));
    for (const item of matches) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'w-full text-left px-2 py-1 rounded bg-[#0b0d14] hover:bg-slate-800 text-[11px] text-slate-200';
        button.textContent = `${item.title} · ${item.platform}`;
        button.addEventListener('click', () => setMelodySequence(item.notes, `Melodi bawaan: ${item.title}`));
        results.appendChild(button);
    }
    if (!matches.length) results.textContent = 'Tidak ada melodi bawaan yang cocok.';
}
document.getElementById('btnSongSearch').addEventListener('click', searchMelodyLibrary);
document.getElementById('inpSongSearch').addEventListener('keydown', event => {
    if (event.key === 'Enter') searchMelodyLibrary();
});
document.getElementById('selInstrument').addEventListener('change', (e) => sound.instrument = e.target.value);
document.getElementById('selDeathSound').addEventListener('change', (e) => {
    sound.deathSound = e.target.value;
    sound.playDeathSFX();
});
document.getElementById('selEscapeSound').addEventListener('change', (e) => {
    sound.escapeSound = e.target.value;
    sound.playEscapeSFX();
});

document.getElementById('selColorTheme').addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        simConfig.themeName = 'custom';
        return;
    }
    const theme = COLOR_THEMES[e.target.value];
    if (!theme) return;
    simConfig.themeName = e.target.value;
    simConfig.gradStart = theme.start;
    simConfig.gradEnd = theme.end;
    simConfig.bgColor = theme.bg;
    document.getElementById('colGradStart').value = theme.start;
    document.getElementById('colGradEnd').value = theme.end;
    resetSimulation();
});
document.getElementById('colGradStart').addEventListener('input', (e) => {
    simConfig.gradStart = e.target.value;
    simConfig.themeName = 'custom';
    resetSimulation();
});
document.getElementById('colGradEnd').addEventListener('input', (e) => {
    simConfig.gradEnd = e.target.value;
    simConfig.themeName = 'custom';
    resetSimulation();
});
document.getElementById('colBackground').addEventListener('input', (e) => {
    simConfig.bgColor = e.target.value;
    simConfig.themeName = 'custom';
    resetSimulation();
});
document.getElementById('chkRandomColors').addEventListener('change', (e) => {
    simConfig.randomColorsEachRound = e.target.checked;
    resetSimulation();
});

// Ball & Center Image/Emoji Customizer
document.getElementById('inpBallImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            customBallImage = img;
            document.getElementById('ballThumbPreview').innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover" />`;
            document.getElementById('ballTextureStatus').textContent = file.name.slice(0, 16);
            document.getElementById('btnClearBallImage').classList.remove('hidden');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});
document.getElementById('btnClearBallImage').addEventListener('click', () => {
    customBallImage = null;
    document.getElementById('ballThumbPreview').innerHTML = '🧑🏽';
    document.getElementById('ballTextureStatus').textContent = 'Meme Avatar / Upload';
    document.getElementById('btnClearBallImage').classList.add('hidden');
});
document.getElementById('inpCustomBallEmoji').addEventListener('input', (e) => simConfig.customBallEmoji = e.target.value);

document.getElementById('inpCenterImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            customCenterImage = img;
            document.getElementById('centerThumbPreview').innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover" />`;
            document.getElementById('centerTextureStatus').textContent = file.name.slice(0, 16);
            document.getElementById('btnClearCenterImage').classList.remove('hidden');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});
document.getElementById('btnClearCenterImage').addEventListener('click', () => {
    customCenterImage = null;
    document.getElementById('centerThumbPreview').innerHTML = '💎';
    document.getElementById('centerTextureStatus').textContent = 'Default Faceted Diamond';
    document.getElementById('btnClearCenterImage').classList.add('hidden');
});
document.getElementById('inpCenterEmoji').addEventListener('input', (e) => simConfig.centerEmoji = e.target.value);
document.getElementById('selCenterShape').addEventListener('change', (e) => simConfig.centerShape = e.target.value);
document.getElementById('inpWatermarkText').addEventListener('input', (e) => simConfig.watermarkText = e.target.value);
document.getElementById('inpWatermarkSub').addEventListener('input', (e) => simConfig.watermarkSub = e.target.value);

// Playback Controls
document.getElementById('btnRestart').addEventListener('click', resetSimulation);
function syncPlayPauseButton() {
    document.getElementById('playPauseIcon').textContent = isPaused ? '▶️' : '⏸';
    document.getElementById('playPauseText').textContent = isPaused ? 'Play' : 'Pause';
}
document.getElementById('btnPlayPause').addEventListener('click', () => {
    isPaused = !isPaused;
    syncPlayPauseButton();
});
document.getElementById('btnApplySeed').addEventListener('click', () => {
    simConfig.seed = parseInt(document.getElementById('inpSeed').value, 10) || 1042;
    resetSimulation();
});

function updatePlaybackSpeedButtons() {
    for (const button of document.querySelectorAll('.speed-pill')) {
        const active = Number(button.dataset.speed) === playbackSpeed;
        button.classList.toggle('bg-slate-700', active);
        button.classList.toggle('text-white', active);
        button.classList.toggle('text-slate-400', !active);
    }
}
for (const button of document.querySelectorAll('.speed-pill')) {
    button.addEventListener('click', () => {
        if (mediaRecorder?.state === 'recording') return;
        playbackSpeed = Number(button.dataset.speed) || 1;
        updatePlaybackSpeedButtons();
    });
}

function syncOrientationControls() {
    const orientation = simConfig.outputOrientation === 'landscape' ? 'landscape' : 'portrait';
    document.getElementById('gameCanvasFrame').dataset.orientation = orientation;
    for (const button of document.querySelectorAll('[data-orientation-option]')) {
        button.setAttribute('aria-pressed', String(button.dataset.orientationOption === orientation));
    }
}

function setOutputOrientation(orientation, reset = true) {
    if (mediaRecorder?.state === 'recording') return false;
    const next = orientation === 'landscape' ? 'landscape' : 'portrait';
    simConfig.outputOrientation = next;
    const changed = setSimulationOrientation(next);
    recordingCanvas.width = next === 'landscape' ? 1920 : 1080;
    recordingCanvas.height = next === 'landscape' ? 1080 : 1920;
    syncOrientationControls();
    const label = next === 'landscape' ? '1920×1080' : '1080×1920';
    document.getElementById('recordStatus').textContent = 'Preview ' + label + ' · not recording';
    if (reset && changed) resetSimulation();
    return true;
}

function setMobileSettings(open, tab = 'global') {
    document.body.classList.toggle('settings-drawer-open', open);
    document.getElementById('globalSettingsPanel').classList.toggle('mobile-active', open && tab === 'global');
    document.getElementById('modeSettingsPanel').classList.toggle('mobile-active', open && tab === 'mode');
    for (const button of document.querySelectorAll('[data-settings-tab]')) {
        button.setAttribute('aria-pressed', String(button.dataset.settingsTab === tab));
    }
}

document.querySelectorAll('[data-orientation-option]').forEach(button => {
    button.addEventListener('click', () => setOutputOrientation(button.dataset.orientationOption));
});
document.getElementById('btnOpenSettings').addEventListener('click', () => setMobileSettings(true, 'global'));
document.getElementById('btnCloseMobileSettings').addEventListener('click', () => setMobileSettings(false));
document.getElementById('mobileSettingsBackdrop').addEventListener('click', () => setMobileSettings(false));
document.querySelectorAll('[data-settings-tab]').forEach(button => {
    button.addEventListener('click', () => setMobileSettings(true, button.dataset.settingsTab));
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMobileSettings(false);
});

function setRecordingUI(isRecording, message) {
    const button = document.getElementById('btnRecord');
    button.textContent = isRecording ? '⏹ Stop Recording' : '⏺ Record WebM';
    document.getElementById('recordStatus').textContent = message;
    document.querySelectorAll('[data-orientation-option]').forEach(option => { option.disabled = isRecording; });
}

function stopVideoRecording() {
    if (recordingTimer) clearTimeout(recordingTimer);
    recordingTimer = null;
    if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
}

async function startVideoRecording() {
    if (typeof MediaRecorder === 'undefined' || !recordingCanvas.captureStream) {
        setRecordingUI(false, 'Browser tidak mendukung rekaman WebM');
        return;
    }

    const duration = Math.min(90, Math.max(5, Number(document.getElementById('inpRecordDuration').value) || 22));
    document.getElementById('inpRecordDuration').value = duration;
    speedBeforeRecording = playbackSpeed;
    pauseBeforeRecording = isPaused;
    playbackSpeed = 1;
    updatePlaybackSpeedButtons();
    isPaused = false;
    syncPlayPauseButton();
    try { sound.init(); } catch { /* keep video recording available without audio */ }

    let recordingStream;
    try {
        const videoStream = recordingCanvas.captureStream(60);
        const audioTracks = sound.destNode?.stream?.getAudioTracks() || [];
        recordingStream = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks]);
    } catch (error) {
        playbackSpeed = speedBeforeRecording;
        isPaused = pauseBeforeRecording;
        updatePlaybackSpeedButtons();
        syncPlayPauseButton();
        setRecordingUI(false, `Gagal menyiapkan rekaman: ${error.message}`);
        return;
    }
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find(type => MediaRecorder.isTypeSupported(type));
    try {
        mediaRecorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
    } catch (error) {
        recordingStream.getTracks().forEach(track => track.stop());
        playbackSpeed = speedBeforeRecording;
        isPaused = pauseBeforeRecording;
        updatePlaybackSpeedButtons();
        syncPlayPauseButton();
        setRecordingUI(false, `Gagal memulai rekaman: ${error.message}`);
        return;
    }

    const recorder = mediaRecorder;
    recordingChunks = [];
    recorder.ondataavailable = event => {
        if (event.data?.size) recordingChunks.push(event.data);
    };
    recorder.onstop = () => {
        const blob = new Blob(recordingChunks, { type: recorder.mimeType || 'video/webm' });
        if (blob.size) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'ballsim-' + simConfig.mode + '-' + simConfig.seed + '-' + (simConfig.outputOrientation || 'portrait') + '.webm';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            setRecordingUI(false, `Tersimpan · ${(blob.size / 1048576).toFixed(1)} MB`);
        } else {
            setRecordingUI(false, 'Rekaman kosong');
        }
        recordingStream.getTracks().forEach(track => track.stop());
        mediaRecorder = null;
        playbackSpeed = speedBeforeRecording;
        isPaused = pauseBeforeRecording;
        updatePlaybackSpeedButtons();
        syncPlayPauseButton();
        if (autoBatchEnabled) {
            setTimeout(() => {
                if (!autoBatchEnabled) return;
                simConfig.seed = Math.floor(1000 + Math.random() * 90000);
                document.getElementById('inpSeed').value = simConfig.seed;
                resetSimulation();
                startVideoRecording();
            }, 700);
        }
    };
    recorder.onerror = () => {
        setRecordingUI(false, 'Terjadi kesalahan saat merekam');
        stopVideoRecording();
    };
    recorder.start(250);
    setRecordingUI(true, 'Merekam ' + duration + ' detik · ' + recordingCanvas.width + '×' + recordingCanvas.height + ' · 1×');
    recordingTimer = setTimeout(stopVideoRecording, duration * 1000);
}

document.getElementById('btnRecord').addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') {
        autoBatchEnabled = false;
        document.getElementById('btnBatchMode').textContent = '🔁 Auto-Batch: OFF';
        stopVideoRecording();
    } else {
        startVideoRecording();
    }
});
document.getElementById('btnBatchMode').addEventListener('click', () => {
    autoBatchEnabled = !autoBatchEnabled;
    document.getElementById('btnBatchMode').textContent = `🔁 Auto-Batch: ${autoBatchEnabled ? 'ON' : 'OFF'}`;
    if (autoBatchEnabled && mediaRecorder?.state !== 'recording') startVideoRecording();
});

let seedSearchToken = 0;
let seedSearchRunning = false;
const autoFindButton = document.getElementById('btnAutoSearch');
autoFindButton.addEventListener('click', async () => {
    if (seedSearchRunning) {
        seedSearchToken++;
        seedSearchRunning = false;
        autoFindButton.textContent = '🔍 Auto-Find Seed';
        document.getElementById('searchStatus').textContent = 'Pencarian dibatalkan.';
        return;
    }

    const targetSeconds = Math.min(90, Math.max(5, Number(document.getElementById('inpTargetSec').value) || 22));
    document.getElementById('inpTargetSec').value = targetSeconds;
    const targetTicks = targetSeconds * 60;
    const maxTicks = targetTicks + 180;
    const firstSeed = Math.max(1, Number(document.getElementById('inpSeed').value) || 1042);
    const searchToken = ++seedSearchToken;
    seedSearchRunning = true;
    autoFindButton.textContent = '✕ Stop Search';
    const status = document.getElementById('searchStatus');
    status.classList.remove('hidden');

    try {
        const maxCandidates = 80;
        for (let candidate = 0; candidate < maxCandidates && seedSearchRunning && searchToken === seedSearchToken; candidate++) {
            const seed = firstSeed + candidate;
            const searchConfig = { ...simConfig, seed };
            const searchState = createSimulationState(searchConfig, seed, true);
            let elapsedTicks = 0;
            while (elapsedTicks < maxTicks && !searchState.escaped && searchToken === seedSearchToken) {
                const end = Math.min(maxTicks, elapsedTicks + 120);
                while (elapsedTicks < end && !searchState.escaped) {
                    stepPhysics(searchState, searchConfig, true);
                    elapsedTicks++;
                }
                status.textContent = `Menguji seed ${candidate + 1}/${maxCandidates} · ${seed} · ${Math.floor(elapsedTicks / 60)}s`;
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            if (searchToken !== seedSearchToken) break;
            const duration = searchState.escapeTime === null ? NaN : Number(searchState.escapeTime);
            if (Number.isFinite(duration) && Math.abs(duration - targetSeconds) <= 0.5) {
                simConfig.seed = seed;
                document.getElementById('inpSeed').value = seed;
                resetSimulation();
                status.textContent = `Seed ${seed} cocok · simulasi sudah diulang · selesai sekitar ${duration.toFixed(1)}s (target ${targetSeconds}s).`;
                return;
            }
        }
        if (searchToken === seedSearchToken) status.textContent = `Belum ada seed cocok dalam ${maxCandidates} percobaan. Coba target lain atau mulai dari seed berbeda.`;
    } catch (error) {
        status.textContent = `Pencarian gagal: ${error.message || 'kesalahan simulasi'}`;
    } finally {
        if (searchToken === seedSearchToken) {
            seedSearchRunning = false;
            autoFindButton.textContent = '🔍 Auto-Find Seed';
        }
    }
});

// Main 60FPS Animation Loop
function animate() {
    if (!isPaused && simState) {
        const stepsThisFrame = mediaRecorder?.state === 'recording' ? 1 : playbackSpeed;
        for (let step = 0; step < stepsThisFrame; step++) stepPhysics(simState, simConfig, false);
        renderSimulation(simState, simConfig);
        if (mediaRecorder?.state === 'recording') {
            recordingCtx.drawImage(canvas, 0, 0, recordingCanvas.width, recordingCanvas.height);
        }

        document.getElementById('statBallsLost').textContent = simState.ballsLost;
        document.getElementById('statEscapedCount').textContent = simState.escapedCount;
        document.getElementById('statBalls').textContent = simState.balls.length;
        document.getElementById('statTime').textContent = (simState.ticks / 60).toFixed(1) + 's';
        document.getElementById('statBounces').textContent = simState.bounces;

        const banner = document.getElementById('escapeBanner');
        const txt = document.getElementById('escapeBannerText');
        if (simState.escaped || simState.goalCelebrationTimer > 0) {
            banner.classList.remove('hidden');
            txt.textContent = simState.winnerText || `GOAL REACHED IN ${simState.escapeTime}s!`;
        } else {
            banner.classList.add('hidden');
        }
    }
    requestAnimationFrame(animate);
}

// Boot directly on Multiply Gates Center so you can test it immediately!
document.getElementById('inpMelodyNotes').value = sound.sequence.join(' ');
searchMelodyLibrary();
setOutputOrientation(simConfig.outputOrientation || 'portrait', false);
selectGameMode('multiply_gates');
requestAnimationFrame(animate);
