/*
    Developer: Martin Barry
    Date Started: 01.29.2026
    Date Modified: 01.29.2026

    pcb.js
    - Renders a static PCB trace layer to an offscreen canvas and animates wisps
      that travel from CPU nodes along precomputed paths. This file is formatted
      and commented to match the project's header style.
*/

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- Configuration ---
    const GRID_SIZE = 28;
    const TRACE_COLOR = 'rgba(10, 40, 70, 0.55)'; // trace/stroke color
    const WISP_COLOR = '#00fff6';                 // light packet color
    const BASE_WISP_SPEED = 1.2;                  // base speed (pixels/frame)
    const WISP_HOLD_FRAMES = 90;                  // frames to hold at end

    // dynamic counts (will be adapted to viewport)
    let PATH_COUNT = 80;

    // DOM + canvas handles
    const canvas = document.getElementById('pcb-canvas');
    if (!canvas) return; // no canvas found
    const ctx = canvas.getContext('2d');

    // runtime state
    let width = 0;
    let height = 0;
    let paths = [];
    let wisps = [];

    // static offscreen canvas for traces (rendered once on resize)
    let staticCanvas = null;
    let staticCtx = null;

    // CPU nodes -- origin points for paths (relative positions)
    const CPU_POSITIONS_REL = [
        { x: 0.18, y: 0.50 },
        { x: 0.82, y: 0.44 },
        { x: 0.50, y: 0.82 }
    ];
    let cpuNodes = [];

    // small helpers
    const rand = (min, max) => min + Math.random() * (max - min);
    const randInt = (min, max) => Math.floor(rand(min, max + 1));

    // --- Geometry classes ---
    class Point { constructor(x, y) { this.x = x; this.y = y; } }

    /* Path
       - points: array of grid points making up the trace
       - segments: precomputed segment deltas and cumulative lengths
       - cpuIndex: which cpu node the path started at
    */
    class Path {
        constructor(cpuIndex) {
            this.points = [];
            this.segments = [];
            this.totalLength = 0;
            this.cpuIndex = typeof cpuIndex === 'number' ? cpuIndex : 0;
            this.generate();
            this.computeSegments();
        }

        // build a random Manhattan-like path that stays on-grid
        generate() {
            const cpu = cpuNodes[this.cpuIndex] || { x: Math.floor(width / 2), y: Math.floor(height / 2) };
            let x = cpu.x;
            let y = cpu.y;
            this.points.push(new Point(x, y));

            const len = randInt(5, 14);
            let dir = randInt(0, 3); // 0-up,1-right,2-down,3-left

            for (let i = 0; i < len; i++) {
                if (Math.random() < 0.28) dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
                if (dir === 0) y -= GRID_SIZE; else if (dir === 1) x += GRID_SIZE; else if (dir === 2) y += GRID_SIZE; else x -= GRID_SIZE;
                if (x < 0 || x > width || y < 0 || y > height) break;
                this.points.push(new Point(x, y));
            }
        }

        // precompute segment deltas and cumulative lengths for smooth sampling
        computeSegments() {
            this.segments.length = 0;
            this.totalLength = 0;
            for (let i = 0; i < this.points.length - 1; i++) {
                const p1 = this.points[i];
                const p2 = this.points[i + 1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy);
                this.totalLength += dist;
                this.segments.push({ dx, dy, dist, cum: this.totalLength, x1: p1.x, y1: p1.y });
            }
        }

        // draw onto provided context (used to render static layer once)
        draw(ctx) {
            if (this.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(this.points[0].x + 0.5, this.points[0].y + 0.5);
            for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x + 0.5, this.points[i].y + 0.5);
            ctx.strokeStyle = TRACE_COLOR; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
            ctx.fillStyle = TRACE_COLOR; ctx.beginPath(); ctx.arc(this.points[0].x, this.points[0].y, 3, 0, Math.PI * 2);
            const last = this.points[this.points.length - 1]; ctx.arc(last.x, last.y, 3, 0, Math.PI * 2); ctx.fill();
        }

        // sample a point at distance d from path start (clamped)
        getPointAt(d) {
            if (!this.segments.length) return { x: this.points[0].x, y: this.points[0].y };
            if (d <= 0) return { x: this.points[0].x, y: this.points[0].y };
            if (d >= this.totalLength) { const p = this.points[this.points.length - 1]; return { x: p.x, y: p.y }; }
            let si = 0; while (si < this.segments.length && this.segments[si].cum < d) si++;
            const seg = this.segments[si]; const prevCum = si === 0 ? 0 : this.segments[si - 1].cum;
            const into = d - prevCum; const r = into / (seg.dist || 1); return { x: seg.x1 + seg.dx * r, y: seg.y1 + seg.dy * r };
        }
    }

    /* Wisp
       - travels along its path from start to end using cumulative distance sampling
       - state machine: waiting -> moving -> finished (hold) -> reset
    */
    class Wisp {
        constructor(path) { this.path = path; this.reset(); }
        reset() { this.totalDist = 0; this.speed = BASE_WISP_SPEED + Math.random() * 0.4; this.delay = randInt(0, 120); this.state = 'waiting'; this.hold = 0; this.x = 0; this.y = 0; }
        update() {
            if (this.delay > 0) { this.delay--; return; }
            if (!this.path || this.path.totalLength <= 0) return;
            if (this.state === 'waiting') { this.state = 'moving'; this.totalDist = 0; const s = this.path.getPointAt(0); this.x = s.x; this.y = s.y; }
            if (this.state === 'moving') {
                this.totalDist += this.speed;
                if (this.totalDist >= this.path.totalLength) { this.totalDist = this.path.totalLength; const e = this.path.getPointAt(this.totalDist); this.x = e.x; this.y = e.y; this.state = 'finished'; this.hold = WISP_HOLD_FRAMES; return; }
                const p = this.path.getPointAt(this.totalDist); this.x = p.x; this.y = p.y;
            } else if (this.state === 'finished') { if (this.hold > 0) this.hold--; else this.reset(); }
        }
        draw(ctx) {
            if (this.delay > 0) return;
            if (this.state === 'waiting') { const cpu = cpuNodes[this.path.cpuIndex]; if (cpu) { ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = WISP_COLOR; ctx.beginPath(); ctx.arc(cpu.x, cpu.y, 1.2 + Math.random() * 1.4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } return; }
            ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = WISP_COLOR; ctx.fillStyle = WISP_COLOR; const radius = this.state === 'finished' ? 3.2 : 2; ctx.beginPath(); ctx.arc(this.x, this.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
    }

    // --- Initialization & rendering ---
    function computeCpuNodes() { cpuNodes = CPU_POSITIONS_REL.map(p => ({ x: Math.floor((p.x * width) / GRID_SIZE) * GRID_SIZE, y: Math.floor((p.y * height) / GRID_SIZE) * GRID_SIZE })); }
    function initPaths() {
        paths.length = 0; wisps.length = 0; PATH_COUNT = Math.max(40, Math.floor((width * height) / 160000)); staticCanvas = document.createElement('canvas'); staticCanvas.width = width; staticCanvas.height = height; staticCtx = staticCanvas.getContext('2d'); staticCtx.clearRect(0, 0, width, height);
        for (let i = 0; i < PATH_COUNT; i++) { const cpuIndex = randInt(0, cpuNodes.length - 1); const p = new Path(cpuIndex); paths.push(p); p.draw(staticCtx); }
        const wispCount = Math.max(8, Math.floor(PATH_COUNT * 0.22)); for (let i = 0; i < wispCount; i++) { const idx = randInt(0, paths.length - 1); wisps.push(new Wisp(paths[idx])); }
    }

    function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; computeCpuNodes(); initPaths(); }
    function drawCpuNodes(ctx) { ctx.save(); for (let i = 0; i < cpuNodes.length; i++) { const node = cpuNodes[i]; ctx.fillStyle = 'rgba(0,255,246,0.06)'; ctx.shadowColor = WISP_COLOR; ctx.shadowBlur = 26; const chip = GRID_SIZE * 1.4; ctx.fillRect(node.x - chip / 2, node.y - chip / 2, chip, chip); ctx.beginPath(); ctx.fillStyle = WISP_COLOR; ctx.arc(node.x, node.y, 5, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }

    function animate() { ctx.clearRect(0, 0, width, height); if (staticCanvas) ctx.drawImage(staticCanvas, 0, 0); drawCpuNodes(ctx); for (let i = 0; i < wisps.length; i++) { const w = wisps[i]; w.update(); w.draw(ctx); } requestAnimationFrame(animate); }

    // kick off
    window.addEventListener('resize', resize);
    resize(); requestAnimationFrame(animate);
});