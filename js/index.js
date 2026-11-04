
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize Lucide icons safely
            try { lucide.createIcons(); } catch(e) { console.warn('Lucide init deferred:', e); }

            // --- Hamburger nav ---
            const hamburger = document.getElementById('nav-hamburger');
            const navLinks  = document.getElementById('nav-links');
            if (hamburger && navLinks) {
                hamburger.addEventListener('click', () => {
                    navLinks.classList.toggle('open');
                });
                // Close nav when a link is clicked
                navLinks.querySelectorAll('a').forEach(a => {
                    a.addEventListener('click', () => navLinks.classList.remove('open'));
                });
            }

            // --- Canvas resize on orientation change ---
            const canvas = document.getElementById('preloader-canvas');
            window.addEventListener('resize', () => {
                if (canvas) {
                    canvas.width  = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
            });

            const helix = document.getElementById('neural-helix');
            if (helix) {
                const n = parseInt(getComputedStyle(helix).getPropertyValue('--n'));
                const images = ['lab_logo.png', 'neural_core.png', 'wait.jpg', 'adrg.jpg'];
                
                for (let i = 0; i < n; i++) {
                    const img = document.createElement('img');
                    img.src = images[i % images.length];
                    img.style.setProperty('--i', i);
                    helix.appendChild(img);
                }
            }

            // ================================================
            // WAIT LAB — PARTICLE CONVERGENCE ENGINE
            // ================================================
            // Shared reveal function to avoid race conditions
            let hasRevealed = false;
            function revealMainContent() {
                if (hasRevealed) return;
                hasRevealed = true;
                const preloader = document.getElementById('preloader');
                const appEl = document.getElementById('app');
                if (preloader) {
                    preloader.style.opacity = '0';
                    preloader.style.visibility = 'hidden';
                }
                if (appEl) {
                    appEl.classList.add('content-visible');
                }
                try { lucide.createIcons(); } catch(e) { console.warn('Lucide icons:', e); }
            }

            try {
            (function () {
                const canvas = document.getElementById('preloader-canvas');
                if (!canvas) return;
                const ctx = canvas.getContext('2d');

                canvas.width  = window.innerWidth;
                canvas.height = window.innerHeight;
                const W = canvas.width, H = canvas.height;

                // --- Phase control ---
                // GATHER → HOLD → SCATTER → (reveal)
                const GATHER_MS  = 2000;
                const HOLD_MS    = 900;
                const SCATTER_MS = 700;
                let startTime = null;

                // --- Sample target pixel positions from text ---
                const offscreen = document.createElement('canvas');
                offscreen.width  = W;
                offscreen.height = H;
                const oct = offscreen.getContext('2d');

                const fontSize = Math.min(W * 0.10, 90);
                oct.font = `700 ${fontSize}px 'Inter', sans-serif`;
                oct.letterSpacing = '0.22em';
                oct.fillStyle = '#ffffff';
                oct.textAlign = 'center';
                oct.textBaseline = 'middle';
                oct.fillText('WAIT LAB', W / 2, H / 2);

                const imgData = oct.getImageData(0, 0, W, H).data;
                const targets = [];
                const SAMPLE = 4; // skip pixels for performance
                for (let y = 0; y < H; y += SAMPLE) {
                    for (let x = 0; x < W; x += SAMPLE) {
                        const idx = (y * W + x) * 4;
                        if (imgData[idx + 3] > 80) targets.push({ tx: x, ty: y });
                    }
                }

                // Shuffle targets
                for (let i = targets.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [targets[i], targets[j]] = [targets[j], targets[i]];
                }

                // --- Create particles ---
                const NUM_PARTICLES = Math.min(targets.length, 3500);
                const particles = [];
                for (let i = 0; i < NUM_PARTICLES; i++) {
                    const t = targets[i];
                    // Spawn from random edge
                    const edge = Math.floor(Math.random() * 4);
                    let sx, sy;
                    if (edge === 0) { sx = Math.random() * W; sy = -20; }
                    else if (edge === 1) { sx = W + 20; sy = Math.random() * H; }
                    else if (edge === 2) { sx = Math.random() * W; sy = H + 20; }
                    else { sx = -20; sy = Math.random() * H; }

                    particles.push({
                        x: sx, y: sy,
                        sx, sy,
                        tx: t.tx, ty: t.ty,
                        vx: 0, vy: 0,
                        // Scatter destination (fly out)
                        scatterAngle: Math.atan2(t.ty - H/2, t.tx - W/2) + (Math.random() - 0.5) * 1.5,
                        scatterDist: 200 + Math.random() * 400,
                        delay: Math.random() * 0.4, // stagger 0-40% into gather phase
                        size: 1 + Math.random() * 1.2,
                    });
                }

                // --- Color palette from image ---
                const COLORS = [
                    '#ffffff',
                    '#b8d4ff',
                    '#7eb8f7',
                    '#a8e6f0',
                ];

                function glowColor(p, progress) {
                    // As particles converge, shift from cold blue edge to white core
                    const t = Math.min(1, progress * 1.8);
                    if (t < 0.5) return COLORS[1];
                    if (t < 0.8) return COLORS[3];
                    return COLORS[0];
                }

                // Easy-in-out cubic
                function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
                function easeOut(t) { return 1 - (1 - t) ** 3; }

                let frame = 0;
                let revealed = false;

                function loop(ts) {
                    if (!startTime) startTime = ts;
                    const elapsed = ts - startTime;
                    frame++;

                    ctx.clearRect(0, 0, W, H);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, W, H);

                    const gatherProgress = Math.min(1, elapsed / GATHER_MS);
                    const phase = elapsed < GATHER_MS ? 'gather'
                        : elapsed < GATHER_MS + HOLD_MS ? 'hold'
                        : elapsed < GATHER_MS + HOLD_MS + SCATTER_MS ? 'scatter'
                        : 'done';

                    // Breathing glow on hold phase
                    const holdT = Math.max(0, elapsed - GATHER_MS) / HOLD_MS;
                    const breathe = phase === 'hold' ? 0.6 + 0.4 * Math.sin(holdT * Math.PI * 4) : 1;

                    particles.forEach(p => {
                        if (phase === 'gather') {
                            const localT = Math.max(0, (gatherProgress - p.delay) / (1 - p.delay));
                            const ease = easeOut(Math.min(1, localT));
                            p.x = p.sx + (p.tx - p.sx) * ease;
                            p.y = p.sy + (p.ty - p.sy) * ease;
                            ctx.globalAlpha = Math.min(1, ease * 1.5);
                            ctx.fillStyle = glowColor(p, ease);
                        } else if (phase === 'hold') {
                            p.x = p.tx; p.y = p.ty;
                            ctx.globalAlpha = 0.85 * breathe;
                            ctx.fillStyle = '#c8e8ff';
                        } else if (phase === 'scatter') {
                            const st = easeInOut(Math.min(1, (elapsed - GATHER_MS - HOLD_MS) / SCATTER_MS));
                            p.x = p.tx + Math.cos(p.scatterAngle) * p.scatterDist * st;
                            p.y = p.ty + Math.sin(p.scatterAngle) * p.scatterDist * st;
                            ctx.globalAlpha = Math.max(0, (1 - st) * 0.9);
                            ctx.fillStyle = '#b8d4ff';
                        } else {
                            ctx.globalAlpha = 0;
                        }

                        // Draw glow halo + particle core
                        ctx.shadowBlur = 8;
                        ctx.shadowColor = '#7eb8f7';
                        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                        ctx.shadowBlur = 0;
                    });

                    // Soft text overlay during hold for crisp logo
                    if (phase === 'hold' || phase === 'scatter') {
                        const textAlpha = phase === 'hold'
                            ? 0.18 * breathe
                            : 0.18 * (1 - easeInOut(Math.min(1, (elapsed - GATHER_MS - HOLD_MS) / SCATTER_MS)));
                        ctx.globalAlpha = textAlpha;
                        ctx.shadowBlur = 40;
                        ctx.shadowColor = '#7eb8f7';
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `700 ${fontSize}px 'Inter', sans-serif`;
                        ctx.letterSpacing = '0.22em';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('WAIT LAB', W / 2, H / 2);
                        ctx.shadowBlur = 0;
                    }

                    ctx.globalAlpha = 1;

                    if (phase === 'done' && !revealed) {
                        revealed = true;
                        revealMainContent();
                        return; // stop loop
                    }

                    requestAnimationFrame(loop);
                }

                requestAnimationFrame(loop);
            })();
            } catch(e) {
                console.error('Particle engine error, revealing content:', e);
                revealMainContent();
            }

            // Signal Feed Logic
            const signalFeed = document.getElementById('signal-feed');
            if (signalFeed) {
                const signals = [
                    "[WAIT-SIGNAL] Analyzing Twi prosody (Kwa-group)...",
                    "[ADRG-STREAM] Bogolan fractal extraction: 88% core sync.",
                    "[SIGNAL] Mental health sentiment loop: OPTIMAL.",
                    "[CORE] 3D Neural Helix sync successful.",
                    "[MAC-VOICE] Low-resource prosody adjustment: +0.2ms.",
                    "[DATA] Hausa dialectical drift model refreshing...",
                    "[SYS] Adwenepa-Guild protocol: ACTIVE."
                ];
                
                let signalIndex = 0;
                const injectSignal = () => {
                    const line = document.createElement('span');
                    line.className = 'signal-line';
                    line.textContent = signals[signalIndex];
                    signalFeed.innerHTML = '';
                    signalFeed.appendChild(line);
                    signalIndex = (signalIndex + 1) % signals.length;
                };
                
                setInterval(injectSignal, 3000);
                injectSignal();
            }

            // Safety-net: guarantee reveal after 5s even if particle engine fails
            setTimeout(() => {
                revealMainContent();
            }, 5000);

            // Visit Tracking
            fetch('/api/visit', { method: 'POST' })
                .then(res => res.json())
                .then(data => console.log('Visit logged. Total:', data.visits))
                .catch(err => console.error('Failed to log visit:', err));

            // Fetch and display posts
            const postsContainer = document.getElementById('posts-container');
            if (postsContainer) {
                postsContainer.addEventListener('click', (e) => {
                    const card = e.target.closest('.card[data-post-id]');
                    if (card) window.location.href = '/updates?post=' + encodeURIComponent(card.getAttribute('data-post-id'));
                });
                fetch('/api/posts')
                    .then(res => res.json())
                    .then(posts => {
                        if (posts.length === 0) {
                            postsContainer.innerHTML = '<p class="card-text">No posts yet. Stay tuned!</p>';
                            return;
                        }
                        // Only show the 3 most recent posts on the home page
                        postsContainer.innerHTML = posts.slice(0, 3).map(post => `
                            <div class="card" data-post-id="${post.id}" style="cursor: pointer;">
                                ${post.media ? (post.mediaType === 'video' 
                                    ? `<div style="position: relative; height: 160px; overflow: hidden; border-radius: 4px; margin-bottom: 1.5rem;"><video src="${post.media}" style="width: 100%; height: 100%; object-fit: cover;"></video><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.5); border-radius: 50%; padding: 8px;"><i data-lucide="play" style="color: white; width: 16px; height: 16px;"></i></div></div>`
                                    : `<img src="${post.media}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 4px; margin-bottom: 1.5rem;" alt="${DOMPurify.sanitize(post.title)}">`) : ''}
                                <span class="project-tag">${new Date(post.date).toLocaleDateString()}</span>
                                <h3 class="card-title">${DOMPurify.sanitize(post.title)}</h3>
                            </div>
                        `).join('');
                        try { lucide.createIcons(); } catch(e){}
                    })
                    .catch(err => {
                        console.error('Failed to fetch posts:', err);
                        postsContainer.innerHTML = '<p class="card-text">Failed to load updates. Please check back later.</p>';
                    });
            }

        });
    