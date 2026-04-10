/**
 * OrbitalIdeas | Space Discovery Platform
 */

const CATEGORIES = [
    'Earth Observation', 'Lunar Missions', 'Mars Exploration', 'Space Robotics', 
    'Satellite Tech', 'Space Tourism', 'Propulsion', 'Astrobiology', 
    'Space Medicine', 'Deep Space Comms', 'Debris Cleanup', 'Space Mining', 
    'Space Habitats', 'Exoplanet Research'
];

const IDEA_TYPES = ['Website', 'Mobile App', 'Startup', 'Research Topic', 'Hardware', 'Open Source Tool', 'Space Mission', 'Educational'];

const MOCK_IDEAS = [
    { id: 101, title: 'Swarm robotics for autonomous lunar regolith mining', tagline: 'Extracting He-3 with collaborative micro-rovers.', desc: 'Using swarms of inexpensive 1kg rovers to slowly but continuously mine lunar topsoil for resources.', category: 'Space Robotics', type: 'Hardware', difficulty: 'Deep Space (Hard)', time: '2+ years', poster: 'astro_AI_Oracle', isAI: true, likes: 342, tags: ['lunar', 'robotics'], stage: 'Concept', problem: 'Large rovers are single points of failure.' },
    { id: 102, title: 'AR app overlaying satellite data on real-time sky view', tagline: 'Point your phone up, see live orbits.', desc: 'An AR mobile application that queries live telemetry to show passing satellites, debris, and ISS with interactive tooltips.', category: 'Earth Observation', type: 'Mobile App', difficulty: 'Orbital (Easy)', time: '3-6 months', poster: 'astro_AI_Oracle', isAI: true, likes: 512, tags: ['ar', 'education'], stage: 'Prototype', problem: 'People feel disconnected from space infrastructure.' },
    { id: 103, title: 'Crowdsourced exoplanet transit detection via smartphone cameras', tagline: 'Distributed telescope array using civilian phones.', desc: 'App that snaps long-exposure sky photos while users sleep, aggregating data to find light dips in target stars.', category: 'Exoplanet Research', type: 'Mobile App', difficulty: 'Lunar (Mid)', time: '1 year', poster: 'astro_AI_Oracle', isAI: true, likes: 128, tags: ['crowdsourcing', 'astronomy'], stage: 'Early Validation', problem: 'Telescope time is expensive and limited.' },
    { id: 104, title: 'Biodegradable microsat bus for debris reduction', tagline: 'Satellites that safely burn up completely.', desc: 'Replacing aluminum structures with specialized polymers that offer structural integrity during launch but vaporize rapidly upon reentry.', category: 'Debris Cleanup', type: 'Hardware', difficulty: 'Deep Space (Hard)', time: '2+ years', poster: 'astro_AI_Oracle', isAI: true, likes: 890, tags: ['sustainability', 'materials'], stage: 'Research Topic', problem: 'Kessler syndrome threatens LEO operations.' },
    { id: 105, title: 'AI triage system for space medicine', tagline: 'Autonomous diagnosis for deep space missions.', desc: 'An LLM-driven medical assistant trained on NASA datasets to guide non-physician astronauts through medical emergencies.', category: 'Space Medicine', type: 'Research Topic', difficulty: 'Lunar (Mid)', time: '1 year', poster: 'astro_AI_Oracle', isAI: true, likes: 215, tags: ['ai', 'health'], stage: 'Concept', problem: 'Communication delays make earth-bound doctors useless in emergencies.' },
    { id: 106, title: 'P2P mesh network using CubeSat constellation', tagline: 'Routing data directly between cheap sats.', desc: 'Software protocol allowing standard CubeSats to route packets to each other without ground stations, creating an orbital mesh net.', category: 'Satellite Tech', type: 'Startup', difficulty: 'Deep Space (Hard)', time: '1 year', poster: 'astro_AI_Oracle', isAI: true, likes: 430, tags: ['comms', 'software'], stage: 'Concept', problem: 'Downlink bottlenecks limit small-sat viability.' }
];

let state = {
    auth: false,
    user: null,
    theme: 'light',
    ideas: [...MOCK_IDEAS],
    swiped: { right: new Set(), left: new Set(), saved: new Set() },
    collabs: new Set(),
    myLaunches: [],
    swipeQueue: [],
    filter: 'All'
};

const storage = {
    save() {
        localStorage.setItem('orbitApp_theme', state.theme);
        if(!state.auth) return;
        localStorage.setItem(`orbitApp_u_${state.user.id}`, JSON.stringify({
            user: state.user,
            swiped: { right: Array.from(state.swiped.right), left: Array.from(state.swiped.left), saved: Array.from(state.swiped.saved) },
            collabs: Array.from(state.collabs),
            myLaunches: state.myLaunches
        }));
        localStorage.setItem('orbitApp_session', state.user.id);
        
        let global = JSON.parse(localStorage.getItem('orbitApp_global') || '[]');
        state.myLaunches.forEach(ml => {
            if(!global.find(g => g.id === ml.id)) global.push(ml);
        });
        localStorage.setItem('orbitApp_global', JSON.stringify(global));
    },
    load() {
        state.theme = localStorage.getItem('orbitApp_theme') || 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        
        let global = JSON.parse(localStorage.getItem('orbitApp_global') || '[]');
        state.ideas = [...MOCK_IDEAS];
        global.forEach(g => { if(!state.ideas.find(i => i.id === g.id)) state.ideas.push(g); });

        const sid = localStorage.getItem('orbitApp_session');
        if(sid) {
            const data = JSON.parse(localStorage.getItem(`orbitApp_u_${sid}`));
            if(data) {
                state.user = data.user;
                state.swiped = { right: new Set(data.swiped.right), left: new Set(data.swiped.left), saved: new Set(data.swiped.saved) };
                state.collabs = new Set(data.collabs);
                state.myLaunches = data.myLaunches || [];
                state.auth = true;
                
                state.myLaunches.forEach(ml => { if(!state.ideas.find(i => i.id === ml.id)) state.ideas.push(ml); });
            }
        }
    },
    logout() {
        localStorage.removeItem('orbitApp_session');
        state.auth = false; state.user = null;
        state.swiped = { right: new Set(), left: new Set(), saved: new Set() };
        state.collabs = new Set(); state.myLaunches = [];
    }
};

const app = {
    init() {
        storage.load();
        this.setupCanvas();
        this.updateThemeIcon();
        this.setupNavigation();
        this.setupAuthForms();
        this.renderHome();
        this.setupIdeaForm();
        this.updateUI();
        
        const hash = window.location.hash.slice(1) || 'home';
        this.navigate(hash);
        
        // Keyboard Swiping
        document.addEventListener('keydown', (e) => {
            if(!document.getElementById('page-discover').classList.contains('active')) return;
            if(document.querySelector('.modal.open')) return;
            if(e.key === 'ArrowLeft') this.handleSwipeChoice('left');
            if(e.key === 'ArrowRight') this.handleSwipeChoice('right');
            if(e.key === 'ArrowUp' || e.key.toLowerCase() === 's') this.handleSwipeChoice('up');
        });

        // Input limits
        const title = document.getElementById('idea-title'), tCount = document.getElementById('title-char-count');
        const sum = document.getElementById('idea-tagline'), sCount = document.getElementById('summary-char-count');
        if(title) title.oninput = () => tCount.innerText = `${title.value.length}/80`;
        if(sum) sum.oninput = () => sCount.innerText = `${sum.value.length}/120`;
    },

    setupCanvas() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        document.getElementById('starfield').appendChild(canvas);
        
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        
        const stars = Array.from({length: 150}, () => ({
            x: Math.random() * width, y: Math.random() * height,
            r: Math.random() * 1.5,
            dy: Math.random() * 0.5 + 0.1,
            opacity: Math.random()
        }));

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        function animate() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(123, 94, 167, 0.4)' : 'rgba(255, 255, 255, 0.6)';
            
            stars.forEach(s => {
                ctx.globalAlpha = s.opacity;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
                s.y += s.dy;
                if(s.y > height) { s.y = 0; s.x = Math.random() * width; }
            });
            requestAnimationFrame(animate);
        }
        animate();
    },

    toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        this.updateThemeIcon();
        storage.save();
    },
    
    updateThemeIcon() {
        const icon = document.getElementById('theme-icon');
        icon.className = state.theme === 'light' ? 'ti ti-moon' : 'ti ti-sun';
    },

    navigate(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        const target = document.getElementById(`page-${page}`);
        if(target) target.classList.add('active');
        document.querySelectorAll(`[data-target="${page}"]`).forEach(l => l.classList.add('active'));
        
        if (page === 'discover') { this.setupDiscoverFilters(); this.refillSwipeQueue(); }
        if (page === 'dashboard') this.renderDashboard();
        if (page === 'profile') this.renderProfile();
        if (page === 'messages') this.renderMessages();
        
        window.scrollTo(0,0);
        window.history.pushState(null, null, `#${page}`);
    },

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.onclick = (e) => { e.preventDefault(); this.navigate(link.dataset.target); };
        });
    },

    showAuthModal() { document.getElementById('auth-modal').classList.add('open'); },
    hideModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); },

    setupAuthForms() {
        // Sign Up
        document.getElementById('signup-form').onsubmit = (e) => {
            e.preventDefault();
            const f = document.getElementById('signup-first').value;
            const l = document.getElementById('signup-last').value;
            
            state.user = { 
                id: 'usr_' + Date.now(), 
                firstName: f, lastName: l,
                username: `astro_${f}_${l}`.replace(/\s+/g,'').toLowerCase(),
                role: '💡 Idea Giver', interests: [], bio: '',
                avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${f}${l}`
            };
            
            document.getElementById('ob-username').value = state.user.username;
            const obInt = document.getElementById('ob-interests');
            obInt.innerHTML = CATEGORIES.map(c => `<span class="filter-chip">${c}</span>`).join('');
            obInt.querySelectorAll('.filter-chip').forEach(c => c.onclick = () => c.classList.toggle('active'));
            
            document.querySelectorAll('#ob-role-selector .role-card').forEach(rc => {
                rc.onclick = () => {
                    document.querySelectorAll('#ob-role-selector .role-card').forEach(r => r.classList.remove('active'));
                    rc.classList.add('active');
                };
            });

            this.hideModals();
            document.getElementById('onboarding-modal').classList.add('open');
        };

        // Onboarding
        document.getElementById('onboarding-form').onsubmit = (e) => {
            e.preventDefault();
            state.user.username = document.getElementById('ob-username').value;
            state.user.role = document.querySelector('#ob-role-selector .role-card.active').dataset.role;
            state.user.interests = Array.from(document.querySelectorAll('#ob-interests .filter-chip.active')).map(c => c.textContent);
            
            state.auth = true;
            this.hideModals();
            this.updateUI();
            storage.save();
            this.showToast('Systems online. Welcome to Mission Control.');
            this.navigate('dashboard');
        };

        // Edit Profile setup
        const editInt = document.getElementById('edit-interests');
        editInt.innerHTML = CATEGORIES.map(c => `<span class="filter-chip">${c}</span>`).join('');
        editInt.querySelectorAll('.filter-chip').forEach(c => c.onclick = () => c.classList.toggle('active'));

        document.getElementById('edit-profile-form').onsubmit = (e) => {
            e.preventDefault();
            state.user.bio = document.getElementById('edit-bio').value;
            state.user.role = document.getElementById('edit-role').value;
            state.user.interests = Array.from(document.querySelectorAll('#edit-interests .filter-chip.active')).map(c => c.textContent);
            this.hideModals();
            this.updateUI();
            storage.save();
            this.showToast('Profile updated.');
            if(document.getElementById('page-profile').classList.contains('active')) this.renderProfile();
        };
    },

    showEditProfileModal() {
        if(!state.auth) return;
        document.getElementById('edit-bio').value = state.user.bio;
        document.getElementById('edit-role').value = state.user.role;
        document.querySelectorAll('#edit-interests .filter-chip').forEach(c => {
            if(state.user.interests.includes(c.textContent)) c.classList.add('active');
            else c.classList.remove('active');
        });
        document.getElementById('edit-profile-modal').classList.add('open');
    },

    mockSocialAuth(provider) {
        document.getElementById('signup-first').value = 'Cosmic';
        document.getElementById('signup-last').value = provider;
        document.getElementById('signup-email').value = `user@${provider.toLowerCase()}.com`;
        document.getElementById('signup-pass').value = '123456';
    },

    mockLogin() {
        document.getElementById('signup-first').value = 'Test';
        document.getElementById('signup-last').value = 'Pilot';
        document.getElementById('signup-form').dispatchEvent(new Event('submit'));
    },

    updateUI() {
        const logged = state.auth;
        document.getElementById('nav-user-profile').style.display = logged ? 'flex' : 'none';
        document.getElementById('nav-signin-btn').style.display = logged ? 'none' : 'block';
        document.getElementById('nav-dash-link').style.display = logged ? 'flex' : 'none';
        document.getElementById('nav-msgs-link').style.display = logged ? 'flex' : 'none';
        
        document.getElementById('hero-auth-cta').style.display = logged ? 'none' : 'flex';
        document.getElementById('hero-user-cta').style.display = logged ? 'flex' : 'none';
        
        if(logged) {
            document.getElementById('nav-avatar').src = state.user.avatar;
            document.getElementById('role-indicator').textContent = state.user.role;
            const badgeCount = state.collabs.size;
            const b = document.getElementById('msg-badge-count');
            if(badgeCount > 0){ b.style.display = 'inline-block'; b.innerText = badgeCount; } else { b.style.display='none'; }
        }
    },

    signOut() {
        storage.logout();
        this.updateUI();
        this.navigate('home');
        this.showToast('Session ended.');
    },

    // --- Home ---
    renderHome() {
        const hs = document.getElementById('home-sectors');
        hs.innerHTML = CATEGORIES.slice(0,8).map(c => `<span class="filter-chip" onclick="app.navigate('discover'); app.setFilter('${c}')">${c}</span>`).join('');
        
        const fi = document.getElementById('featured-ideas');
        fi.innerHTML = state.ideas.filter(i => i.isAI).slice(0,3).map(i => this.renderCard(i)).join('');
        
        // stats
        document.getElementById('stat-ideas').innerText = state.ideas.length;
    },

    renderCard(i) {
        return `
            <div class="card-glass" onclick="app.openDetail(${i.id})">
                <div class="card-badge">${i.category}</div>
                ${i.isAI ? '<span class="ai-badge">✨ Oracle</span>' : ''}
                <h4 style="margin: 0.5rem 0; font-size:1.3rem;">${i.title}</h4>
                <p class="text-muted" style="font-size:0.95rem; margin-bottom:1.5rem;">${i.tagline}</p>
                <div class="card-footer">
                    <div class="poster-info"><i class="ti ti-user-circle"></i> @${i.poster}</div>
                    <div style="color:var(--teal); font-weight:bold;"><i class="ti ti-heart"></i> ${i.likes}</div>
                </div>
            </div>
        `;
    },

    // --- Discover / Swipe ---
    setupDiscoverFilters() {
        const f = document.getElementById('discover-filters');
        f.innerHTML = `<span class="filter-chip ${state.filter==='All'?'active':''}" onclick="app.setFilter('All')">All Domains</span>` + 
                      CATEGORIES.map(c => `<span class="filter-chip ${state.filter===c?'active':''}" onclick="app.setFilter('${c}')">${c}</span>`).join('');
    },
    
    setFilter(cat) {
        state.filter = cat;
        this.setupDiscoverFilters();
        this.refillSwipeQueue();
    },

    refillSwipeQueue() {
        let pool = state.ideas.filter(i => 
            !state.swiped.right.has(i.id) && 
            !state.swiped.left.has(i.id) && 
            !state.swiped.saved.has(i.id) &&
            (!state.user || i.poster !== state.user.username)
        );
        if(state.filter !== 'All') pool = pool.filter(i => i.category === state.filter);
        state.swipeQueue = pool.sort(() => 0.5 - Math.random());
        this.loadNextSwipeCard();
    },

    loadNextSwipeCard() {
        const cont = document.getElementById('swipe-container');
        document.querySelectorAll('.swipe-card').forEach(c => c.remove());
        
        document.getElementById('empty-state-swipe').style.display = state.swipeQueue.length === 0 ? 'flex' : 'none';
        if(state.swipeQueue.length === 0) return;

        // Render top 2 for 3D effect
        const toRender = state.swipeQueue.slice(0, 2).reverse();
        toRender.forEach((i, idx) => {
            const isTop = idx === toRender.length - 1;
            const c = document.createElement('div');
            c.className = 'swipe-card';
            if(!isTop) {
                c.style.transform = 'scale(0.95) translateY(20px)';
                c.style.opacity = '0.5';
                c.style.pointerEvents = 'none';
            }
            
            c.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span class="card-badge">${i.category}</span>
                    <span class="card-badge" style="background:transparent; border:1px solid var(--border-color); color:var(--text-muted);">${i.type}</span>
                </div>
                <h3 class="card-title">${i.title}</h3>
                <p class="card-summary">${i.tagline}</p>
                <div class="card-meta">
                    <span class="meta-chip"><i class="ti ti-rocket"></i> ${i.difficulty}</span>
                    <span class="meta-chip"><i class="ti ti-clock"></i> ${i.time}</span>
                    <span class="meta-chip"><i class="ti ti-bulb"></i> ${i.stage}</span>
                </div>
                <div style="margin-bottom:1rem;">
                    ${(i.tags||[]).slice(0,3).map(t => `<span class="badge" style="margin-right:4px;">#${t}</span>`).join('')}
                </div>
                <div class="card-footer" onclick="${isTop ? `app.openDetail(${i.id})` : ''}" style="${isTop ? 'cursor:pointer;' : ''}">
                    <div class="poster-info"><i class="ti ti-user-circle"></i> @${i.poster} ${i.isAI ? '<span class="ai-badge">✨ Base</span>' : ''}</div>
                    <div style="color:var(--text-muted);"><i class="ti ti-thumb-up"></i> ${i.likes} Likes</div>
                </div>
            `;
            cont.appendChild(c);
            if(isTop) this.initSwipeMechanics(c, i.id);
        });
    },

    initSwipeMechanics(c, id) {
        let scX = 0, scY = 0, dragging = false, startX=0, startY=0;
        
        const move = (x, y) => {
            if(!dragging) return;
            scX = x - startX; scY = y - startY;
            const rot = scX * 0.05;
            c.style.transform = `translate(${scX}px, ${scY}px) rotate(${rot}deg)`;
        };

        const end = () => {
            if(!dragging) return;
            dragging = false;
            c.style.transition = '0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            if(scX > 100) this.handleSwipeAction(c, id, 'right');
            else if(scX < -100) this.handleSwipeAction(c, id, 'left');
            else if(scY < -100) this.handleSwipeAction(c, id, 'up');
            else c.style.transform = '';
        };

        c.addEventListener('mousedown', e => { if(e.target.closest('.card-footer')) return; dragging = true; startX = e.clientX; startY = e.clientY; c.style.transition='none'; });
        window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
        window.addEventListener('mouseup', end);
        
        c.addEventListener('touchstart', e => { if(e.target.closest('.card-footer')) return; dragging = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY; c.style.transition='none'; }, {passive:true});
        window.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), {passive:true});
        window.addEventListener('touchend', end);
    },

    handleSwipeChoice(dir) {
        const c = document.querySelector('.swipe-card:last-child');
        if(c && state.swipeQueue.length > 0) this.handleSwipeAction(c, state.swipeQueue[0].id, dir);
    },

    handleSwipeAction(c, id, dir) {
        if(!state.auth && dir !== 'left') return this.showAuthModal();
        c.style.transition = '0.4s ease-out';
        
        if(dir === 'right') {
            c.style.transform = 'translate(100vw, -100px) rotate(30deg)';
            state.swiped.right.add(id);
            const idea = state.ideas.find(i=>i.id===id);
            if(idea) idea.likes++;
            this.showToast('Signal Sent! Added to Building list.');
        } else if(dir === 'left') {
            c.style.transform = 'translate(-100vw, -100px) rotate(-30deg)';
            if(state.auth) state.swiped.left.add(id);
        } else if(dir === 'up') {
            c.style.transform = 'translate(0, -100vh)';
            state.swiped.saved.add(id);
            this.showToast('Bookmark secured.');
        }
        
        storage.save();
        setTimeout(() => { state.swipeQueue.shift(); this.loadNextSwipeCard(); }, 300);
    },

    // --- Details Modal ---
    openDetail(id) {
        const i = state.ideas.find(x => x.id === id);
        if(!i) return;
        
        const b = document.getElementById('idea-modal-body');
        const isOwner = state.user && i.poster === state.user.username;
        const alreadyBuilding = state.swiped.right.has(id) || state.collabs.has(id);
        
        b.innerHTML = `
            <div class="detail-header">
                <span class="card-badge">${i.category} • ${i.type}</span>
                <h2 style="font-size:2.5rem; margin:1rem 0; color:var(--violet); font-family:'Space Grotesk'">${i.title}</h2>
                <p class="text-muted" style="font-size:1.2rem;">${i.tagline}</p>
            </div>
            <div class="detail-body">
                <h4 style="margin-bottom:0.5rem;">Mission Parameters</h4>
                <p style="margin-bottom:2rem; line-height:1.8;">${i.desc}</p>
                
                <h4 style="margin-bottom:0.5rem; color:var(--danger)">The Problem</h4>
                <p style="margin-bottom:2rem; line-height:1.8;">${i.problem || 'Not specified.'}</p>
                
                <h4 style="margin-bottom:1rem;">Specs</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:2rem;">
                    <div class="meta-chip">Difficulty: <strong>${i.difficulty}</strong></div>
                    <div class="meta-chip">Est. Time: <strong>${i.time}</strong></div>
                    <div class="meta-chip">Stage: <strong>${i.stage}</strong></div>
                    <div class="meta-chip">Tags: <strong>${(i.tags||[]).join(', ')}</strong></div>
                </div>
                
                <div style="background:var(--bg-elevated); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color); display:flex; gap:1rem; align-items:center;">
                    <i class="ti ti-star" style="font-size:2rem; color:var(--gold);"></i>
                    <div><span class="text-muted">Target Needs:</span><br><strong>${(i.lookingFor||[]).join(', ') || 'Community Support'}</strong></div>
                </div>
            </div>
            <div class="detail-actions">
                ${isOwner ? `<div style="color:var(--success); font-weight:bold; width:100%; text-align:center;"><i class="ti ti-check"></i> This is your launch.</div>` : 
                 `<button class="btn btn-primary btn-block" onclick="app.signalBuilder(${i.id})">
                    ${alreadyBuilding ? '<i class="ti ti-message"></i> Message Platform Owner' : '<i class="ti ti-satellite"></i> Signal This Builder (I want to build)'}
                 </button>`}
            </div>
        `;
        document.getElementById('idea-modal').classList.add('open');
    },

    signalBuilder(id) {
        if(!state.auth) return this.showAuthModal();
        state.collabs.add(id);
        this.hideModals();
        storage.save();
        this.showToast('Comm-link established with Owner!');
        this.navigate('messages');
    },

    // --- Post Form ---
    setupIdeaForm() {
        document.getElementById('idea-category').innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('idea-type').innerHTML = IDEA_TYPES.map(c => `<option value="${c}">${c}</option>`).join('');
        
        document.getElementById('post-idea-form').onsubmit = (e) => {
            e.preventDefault();
            if(!state.auth) return this.showAuthModal();
            
            const lf = Array.from(document.querySelectorAll('#idea-looking-for .filter-chip.active')).map(c => c.textContent);
            const tags = document.getElementById('idea-tags').value.split(',').map(t => t.trim()).filter(t=>t);
            
            const n = {
                id: Date.now(),
                title: document.getElementById('idea-title').value,
                tagline: document.getElementById('idea-tagline').value,
                desc: document.getElementById('idea-desc').value,
                problem: document.getElementById('idea-problem').value,
                category: document.getElementById('idea-category').value,
                type: document.getElementById('idea-type').value,
                stage: document.getElementById('idea-stage').value,
                difficulty: document.getElementById('idea-difficulty').value,
                time: document.getElementById('idea-time').value,
                tags: tags, lookingFor: lf,
                poster: state.user.username, likes: 0, isAI: false
            };
            
            state.myLaunches.unshift(n);
            state.ideas.unshift(n);
            storage.save();
            this.showToast('Concept successfully launched into Orbit! 🚀');
            e.target.reset(); document.querySelectorAll('#idea-looking-for .filter-chip').forEach(c=>c.classList.remove('active'));
            this.navigate('dashboard');
        };
    },

    // --- Dashboard ---
    renderDashboard() {
        document.getElementById('dash-greeting').innerText = `Welcome back, ${state.user.username}`;
        
        // Tab setup
        const tabs = document.querySelectorAll('#dash-tabs .filter-chip');
        tabs.forEach(t => t.onclick = () => {
            tabs.forEach(x => x.classList.remove('active')); t.classList.add('active');
            this.refreshDashboardGrid(t.dataset.tab);
        });
        
        this.updateStarProgress();
        this.refreshDashboardGrid('My Launches');
        
        // Recommended
        const rec = state.ideas.filter(i => 
            state.user.interests.includes(i.category) && 
            i.poster !== state.user.username &&
            !state.swiped.right.has(i.id)
        ).sort(() => 0.5 - Math.random()).slice(0,3);
        
        document.getElementById('dash-recommended').innerHTML = rec.length ? rec.map(i => this.renderCard(i)).join('') : '<p class="text-muted">Explore Discover to find more recommendations.</p>';
    },
    
    refreshDashboardGrid(type) {
        const g = document.getElementById('dashboard-ideas-list');
        let arr = [];
        if(type === 'My Launches') arr = state.myLaunches;
        if(type === 'Building') arr = state.ideas.filter(i => state.collabs.has(i.id) || state.swiped.right.has(i.id));
        if(type === 'Saved') arr = state.ideas.filter(i => state.swiped.saved.has(i.id));
        
        if(!arr.length) {
            g.innerHTML = `<div style="grid-column:1/-1; padding:3rem; text-align:center; background:var(--bg-card); border-radius:var(--radius-md);"><p class="text-muted">No data found in this quadrant.</p></div>`;
            return;
        }
        g.innerHTML = arr.map(i => this.renderCard(i)).join('');
    },

    updateStarProgress() {
        const posted = state.myLaunches.length;
        const built = state.collabs.size + state.swiped.right.size;
        
        const getLvl = (n, ranks) => ranks.slice().reverse().find(r => n >= r.req) || {lvl: 0, req:0};
        const getNext = (n, ranks) => ranks.find(r => n < r.req);
        
        const yRanks = [{lvl:1, req:1},{lvl:2, req:5},{lvl:3, req:10},{lvl:4, req:20},{lvl:5, req:35}];
        const rRanks = [{lvl:1, req:1},{lvl:2, req:5},{lvl:3, req:15},{lvl:4, req:30},{lvl:5, req:50}];
        
        const yC = getLvl(posted, yRanks), yN = getNext(posted, yRanks);
        const rC = getLvl(built, rRanks),  rN = getNext(built, rRanks);
        
        document.getElementById('dash-yellow-star-lvl').innerText = '⭐'.repeat(yC.lvl) || 'No Stars';
        document.getElementById('dash-red-star-lvl').innerText = '⭐'.repeat(rC.lvl) || 'No Stars';
        
        const updateBar = (curr, curRank, nextRank, fillId, subId, itemStr) => {
            const fill = document.getElementById(fillId), sub = document.getElementById(subId);
            if(!nextRank) { fill.style.width = '100%'; sub.innerText = 'Max Rank Reached'; return; }
            const p = curRank.req === nextRank.req ? 0 : ((curr - curRank.req) / (nextRank.req - curRank.req)) * 100;
            fill.style.width = `${Math.min(100, Math.max(5, p))}%`;
            sub.innerText = `${nextRank.req - curr} ${itemStr} to Level ${nextRank.lvl}`;
        };
        
        updateBar(posted, yC, yN, 'dash-yellow-fill', 'dash-yellow-sub', 'ideas');
        updateBar(built, rC, rN, 'dash-red-fill', 'dash-red-sub', 'builds');
    },

    // --- Profile ---
    renderProfile() {
        document.getElementById('profile-page-name').innerText = state.user.firstName ? `${state.user.firstName} ${state.user.lastName}` : 'Explorer';
        document.getElementById('profile-page-username').innerText = '@'+state.user.username;
        document.getElementById('profile-page-avatar').src = state.user.avatar;
        document.getElementById('profile-page-bio').innerText = state.user.bio || 'Silence in the void. Update bio to transmit signal.';
        
        document.getElementById('profile-page-interests').innerHTML = state.user.interests.map(i => `<span class="badge" style="margin-right:0.5rem; margin-bottom:0.5rem;">${i}</span>`).join('');
        
        const posted = state.myLaunches.length;
        const built = state.collabs.size + state.swiped.right.size;
        
        const yLvl = [{l:1, r:1},{l:2, r:5},{l:3, r:10},{l:4, r:20},{l:5, r:35}].slice().reverse().find(x=>posted>=x.r)?.l || 0;
        const rLvl = [{l:1, r:1},{l:2, r:5},{l:3, r:15},{l:4, r:30},{l:5, r:50}].slice().reverse().find(x=>built>=x.r)?.l || 0;
        
        document.getElementById('profile-yellow-stars').innerText = '⭐'.repeat(yLvl) || '-';
        document.getElementById('profile-red-stars').innerText = '⭐'.repeat(rLvl) || '-';
        
        document.getElementById('profile-ideas-count').innerText = posted;
        document.getElementById('profile-build-count').innerText = built;
        document.getElementById('profile-swipe-count').innerText = state.myLaunches.reduce((a,c)=>a+(c.likes||0),0);
    },

    // --- Messages ---
    renderMessages() {
        const ml = document.getElementById('messages-list');
        const activeIds = Array.from(state.collabs).concat(Array.from(state.swiped.right));
        const chats = state.ideas.filter(i => activeIds.includes(i.id));
        
        if(!chats.length) { ml.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted)">Inbox Empty. Request build on an idea.</div>'; document.getElementById('chat-area').style.display='none'; return; }
        
        ml.innerHTML = chats.map(c => `
            <div style="padding:1rem; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="app.openChat(${c.id})">
                <div style="font-weight:bold; margin-bottom:0.2rem;">@${c.poster}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Re: ${c.title}</div>
            </div>
        `).join('');
        
        this.openChat(chats[0].id);
    },
    
    openChat(id) {
        document.getElementById('chat-area').style.display = 'flex';
        const c = state.ideas.find(i=>i.id===id);
        document.getElementById('chat-partner').innerText = '@' + c.poster;
        document.getElementById('chat-context').innerText = `Re: ${c.title}`;
        
        const cm = document.getElementById('chat-messages');
        cm.innerHTML = `
            <div style="text-align:center; color:var(--text-muted); font-size:0.8rem; margin:1rem 0;">Channel Opened: Secure Transmission</div>
            <div class="chat-bubble received">Greetings. I noticed you're interested in ${c.title}. How can we collaborate on this?</div>
        `;
    },
    
    sendMessage() {
        const i = document.getElementById('chat-input');
        if(!i.value.trim()) return;
        const msg = `<div class="chat-bubble sent">${i.value}</div>`;
        document.getElementById('chat-messages').insertAdjacentHTML('beforeend', msg);
        i.value = '';
        setTimeout(() => {
            const reply = `<div class="chat-bubble received">Received your transmission. Let's sync up later.</div>`;
            document.getElementById('chat-messages').insertAdjacentHTML('beforeend', reply);
        }, 1500);
    },

    showToast(m) {
        const t = document.getElementById('toast');
        t.innerText = m;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
