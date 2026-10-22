/*************************************************************************
 * FILE 4B: renderer.js (VISUAL RENDERER & UI EVENT CONTROLLER)
 * Berisi:
 * - Rendering 1:1 untuk Multiply Gates Center (Static Spiral Lower Loops,
 *   Top White Wedge Bumper, 4 Glass Styles: Hexagons, Hourglass, Triangles,
 *   Diamonds, Center Black Hole / Energy Portal, & Multiplier Gate Orbs)
 * - Rendering Spiked Spiral Center, Beaded Spiral Progress, & Merge 2048
 * - Seluruh Event Listener UI & Kontrol Dinamis
 *************************************************************************/

function renderSimulation(state, config) {
    ctx.save();

    // 1. Background Fill
    ctx.fillStyle = state.bgColor || config.bgColor || '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.shakeMag > 0.2) {
        ctx.translate((Math.random() - 0.5) * state.shakeMag, (Math.random() - 0.5) * state.shakeMag);
    }

    // 2. Trail Expansion Layer
    if (config.mode === 'trail_expansion') {
        ctx.drawImage(trailCanvas, 0, 0);
    }

    // 3. Center Arena Watermark (BALLSIMULATOR.COM like Screenshots 1-5)
    if (config.watermarkText && config.watermarkText.trim() !== '') {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 22px "Plus Jakarta Sans"';
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
    if (config.mode === 'spiked_spiral') {
        drawSpikedSpiralArena(ctx, state, config, maxOuterR, lineThick, spikeH);
    } else if (config.mode === 'multiply_gates') {
        drawMultiplyGatesArena(ctx, state, config, maxOuterR, lineThick, spikeH);
    } else if (config.mode === 'beaded_spiral') {
        drawBeadedSpiralArena(ctx, state, config, maxOuterR, lineThick);
    } else {
        // Standard Concentric Rings & Flask
        for (let i = 0; i < state.rings.length; i++) {
            const r = state.rings[i];
            ctx.save();

            if (config.mode === 'classic') {
                ctx.strokeStyle = `hsl(${r.hue}, 90%, 58%)`;
                ctx.lineWidth = 2.4;
            } else {
                const ringGrad = ctx.createLinearGradient(CX - r.radius, CY - r.radius, CX + r.radius, CY + r.radius);
                ringGrad.addColorStop(0, state.gradStart);
                ringGrad.addColorStop(1, state.gradEnd);
                ctx.strokeStyle = ringGrad;
                ctx.lineWidth = lineThick;
            }

            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(CX, CY, r.radius, r.angle + r.gap, r.angle + Math.PI * 2);
            ctx.stroke();

            if (r.isFlask) {
                const halfGap = r.gap / 2;
                const neckHalfW = r.radius * Math.sin(halfGap);
                const neckBotY = CY - r.radius * Math.cos(halfGap);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = lineThick;
                ctx.beginPath();
                ctx.moveTo(CX - neckHalfW, 18);
                ctx.lineTo(CX - neckHalfW, neckBotY);
                ctx.moveTo(CX + neckHalfW, 18);
                ctx.lineTo(CX + neckHalfW, neckBotY);
                ctx.stroke();
            }

            if (r.hasSpikes && spikeH > 0) {
                drawRingSpikes1to1(ctx, r, state, config, spikeH, lineThick);
            }
            ctx.restore();
        }
    }

    // Destruction Beaded Dot Matrix Rings
    if (config.mode === 'destruction') {
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

    // Outward Spiral Vortex
    if (config.mode === 'spiral') {
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
    for (const gs of state.glassShards) {
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
    for (const sw of state.shockwaves) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, sw.alpha)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Particles & Floating Texts
    for (const p of state.particles) {
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
        ctx.font = '700 15px "Plus Jakarta Sans"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(config.bottomHookText, CX, canvas.height - 185);
        ctx.restore();
    }

    ctx.restore();
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
const ALL_SPECIFIC_GROUPS = [
    'ctrlGroupSpikedSpiral',
    'ctrlGroupMultiplyGates',
    'ctrlGroupBeadedSpiral',
    'ctrlGroupMerge',
    'ctrlGroupClassic',
    'ctrlGroupDestruction',
    'ctrlGroupInfinite',
    'ctrlGroupGrowth',
    'ctrlGroupFragment',
    'ctrlGroupSpiral',
    'ctrlGroupCollision',
    'ctrlGroupEating',
    'ctrlGroupRoyale'
];

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

function selectGameMode(modeId) {
    simConfig.mode = modeId;
    const modeObj = GAME_MODES.find(m => m.id === modeId);
    if (modeObj) {
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

        const leftMergeCard = document.getElementById('leftCardMergeTiers');
        if (modeId === 'fusion') leftMergeCard.classList.remove('hidden');
        else leftMergeCard.classList.add('hidden');

        const p = modeObj.preset;
        simConfig.circleRadiusRef = p.circleRadius;
        simConfig.outlineThicknessRef = p.outlineThickness;
        simConfig.openingSizeDeg = p.openingSize;
        simConfig.spikeHeightRef = p.spikeHeight;
        simConfig.spikeWidthRef = p.spikeWidth;
        simConfig.ballRadiusRef = p.ballRadius;
        simConfig.gravityRef = p.gravity;
        simConfig.minBounceSpeedRef = p.minBounce;
        simConfig.initSpeedXRef = p.initSpeedX;
        simConfig.rotSpeedMult = p.rotSpeed;
        simConfig.spikeCoverage = p.spikeCov;
        simConfig.spikeStyle = p.spikeStyle;

        simConfig.hookText = modeObj.defaultHookTop || '';
        simConfig.bottomHookText = modeObj.defaultHookBot || '';
        document.getElementById('inpCustomHook').value = simConfig.hookText;
        document.getElementById('inpBottomHook').value = simConfig.bottomHookText;

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
}

function resetSimulation() {
    sound.noteIdx = 0;
    simState = createSimulationState(simConfig);
    document.getElementById('escapeBanner').classList.add('hidden');
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

// Other Mode-Specific Controls
document.getElementById('rngSpikedSpiralTurns').addEventListener('input', (e) => {
    simConfig.spikedSpiralTurns = parseFloat(e.target.value);
    document.getElementById('valSpikedSpiralTurns').textContent = simConfig.spikedSpiralTurns + ' turns';
    resetSimulation();
});
document.getElementById('rngStreamSpawnRate').addEventListener('input', (e) => {
    simConfig.streamSpawnRate = parseInt(e.target.value, 10);
    document.getElementById('valStreamSpawnRate').textContent = simConfig.streamSpawnRate + 'f';
});
document.getElementById('rngGlassShardCount').addEventListener('input', (e) => {
    simConfig.glassShardCount = parseInt(e.target.value, 10);
    document.getElementById('valGlassShardCount').textContent = simConfig.glassShardCount + ' shards';
});
document.getElementById('rngBeadSpiralTurns').addEventListener('input', (e) => {
    simConfig.beadSpiralTurns = parseFloat(e.target.value);
    document.getElementById('valBeadSpiralTurns').textContent = simConfig.beadSpiralTurns + ' turns';
    resetSimulation();
});
document.getElementById('rngBeadSubRows').addEventListener('input', (e) => {
    simConfig.beadSubRows = parseInt(e.target.value, 10);
    document.getElementById('valBeadSubRows').textContent = simConfig.beadSubRows + ' rows';
    resetSimulation();
});

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
    if (simConfig.mode === 'multiply_gates') {
        const styles = ['hexagons', 'hourglass', 'triangles', 'diamonds'];
        simConfig.glassStyle = styles[Math.floor(Math.random() * styles.length)];
        simConfig.gateLayout = 'random';
    }
    syncUIFromConfig();
    resetSimulation();
});
document.getElementById('btnResetSettings').addEventListener('click', () => selectGameMode(simConfig.mode));

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

document.getElementById('rngMasterVol').addEventListener('input', (e) => {
    sound.volume = parseFloat(e.target.value);
    if (sound.masterGain) sound.masterGain.gain.value = sound.volume;
});
document.getElementById('chkSoundEnabled').addEventListener('change', (e) => sound.enabled = e.target.checked);
document.getElementById('selMelody').addEventListener('change', (e) => {
    sound.sequence = [...(MELODIES[e.target.value] || MELODIES.arpeggio)];
    sound.noteIdx = 0;
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
document.getElementById('btnPlayPause').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('playPauseIcon').textContent = isPaused ? '▶️' : '⏸';
    document.getElementById('playPauseText').textContent = isPaused ? 'Play' : 'Pause';
});
document.getElementById('btnApplySeed').addEventListener('click', () => {
    simConfig.seed = parseInt(document.getElementById('inpSeed').value, 10) || 1042;
    resetSimulation();
});

// Main 60FPS Animation Loop
function animate() {
    if (!isPaused && simState) {
        stepPhysics(simState, simConfig, false);
        renderSimulation(simState, simConfig);

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
selectGameMode('multiply_gates');
requestAnimationFrame(animate);