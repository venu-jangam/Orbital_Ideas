/**
 * OrbitIdeas | SpaceIdeaSwipe Logic
 * Premium cosmic UI discovery platform
 */

const CATEGORIES = [
    'Earth Observation', 'Space Robotics', 'Satellite Communications', 'Small Satellites / CubeSats',
    'Launch Systems', 'In-Orbit Services', 'Space Data Analytics', 'Navigation / Positioning',
    'Planetary Exploration', 'Lunar Technologies', 'Space Situational Awareness', 'Ground Segment',
    'Space Software', 'Space Education', 'Space Sustainability', 'Human Spaceflight',
    'Defense / Dual-Use', 'Disaster Monitoring', 'Space Manufacturing'
];

const IDEA_TYPES = ['Startup', 'Research', 'Website', 'Web App', 'Mobile App', 'SaaS Tool', 'Data Platform', 'Open Source', 'Student Project'];

const MOCK_IDEAS = [
    { id: 1, title: 'Lunar Microgrid', tagline: 'Sustainable power grid for early moon bases.', desc: 'A decentralized power distribution system using high-efficiency solar and molten salt storage for sub-surface habitats.', category: 'Lunar Technologies', type: 'SaaS Tool', difficulty: 'Advanced', time: '1 Year+', poster: 'Artemis Pilot', color: '#0ea5e9', likes: 145, saves: 53, devs: 12, tags: ['lunar', 'energy', 'resilience'], stage: 'Prototype', status: 'available' },
    { id: 2, title: 'Lidar Orbit Analytics', tagline: 'Earth Observation via 500nm Lidar constellation.', desc: 'High-revisit constellation for tracking forest canopy health and deforestation in real-time with sub-meter accuracy.', category: 'Earth Observation', type: 'Data Platform', difficulty: 'Advanced', time: '18 Months', poster: 'GreenEye Space', color: '#10b981', likes: 231, saves: 89, devs: 4, tags: ['lidar', 'eo', 'climate'], stage: 'Concept', status: 'available' },
    { id: 3, title: 'Orbital Tug Service', tagline: 'Moving CubeSats between orbit planes.', desc: 'Low-cost electrical propulsion tug that intercepts CubeSats and moves them to custom orbits after rideshare launches.', category: 'In-Orbit Services', type: 'Startup', difficulty: 'Intermediate', time: '12 Months', poster: 'SpaceTrucker', color: '#8b5cf6', likes: 89, saves: 45, devs: 6, tags: ['propulsion', 'logistics', 'cubesat'], stage: 'Concept', status: 'available' },
    { id: 4, title: 'Mars Flora Simulator', tagline: 'AI for predicting plant growth in Martian soil.', desc: 'Software platform that simulates biological growth under simulated Mars radiation and soil conditions for future greenhouses.', category: 'Planetary Exploration', type: 'Research', difficulty: 'Intermediate', time: '6 Months', poster: 'BioAstron', color: '#ef4444', likes: 512, saves: 120, devs: 15, tags: ['mars', 'agri', 'sim'], stage: 'Early Validation', status: 'available' }
];

// App State
let state = {
    isAuthenticated: false,
    user: null,
    ideas: [...MOCK_IDEAS],
    savedIds: new Set(),
    contactedIds: new Set(),
    postedIdeas: [],
    swipeQueue: [],
    currentFilter: 'All'
};

const storage = {
    save() {
        if (!state.user) return;
        const data = {
            user: state.user,
            savedIds: Array.from(state.savedIds),
            contactedIds: Array.from(state.contactedIds),
            postedIdeas: state.postedIdeas,
            ideas: state.ideas // Persist status changes
        };
        localStorage.setItem(`orbitIdeas_${state.user.id}`, JSON.stringify(data));
        localStorage.setItem('orbitIdeas_session', state.user.id);
    },
    load() {
        const id = localStorage.getItem('orbitIdeas_session');
        if (!id) return;
        const data = JSON.parse(localStorage.getItem(`orbitIdeas_${id}`));
        if (data) {
            state.user = data.user;
            state.isAuthenticated = true;
            state.savedIds = new Set(data.savedIds);
            state.contactedIds = new Set(data.contactedIds);
            state.postedIdeas = data.postedIdeas || [];
            state.ideas = data.ideas || [...MOCK_IDEAS];
        }
    },
    clear() {
        localStorage.removeItem('orbitIdeas_session');
    }
};

const app = {
    init() {
        this.setupNavigation();
        this.setupAuth();
        this.setupDiscover();
        this.renderHome();
        this.setupForms();
        
        storage.load();
        this.updateAuthUI();
        
        const hash = window.location.hash.slice(1) || 'home';
        this.navigate(hash);
    },

    navigate(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        const target = document.getElementById(`page-${pageId}`);
        if(target) {
            target.classList.add('active');
            document.querySelectorAll(`[data-target="${pageId}"]`).forEach(l => l.classList.add('active'));
        }

        if (pageId === 'discover') this.loadNextSwipeCard();
        if (pageId === 'dashboard') this.renderDashboard();
        if (pageId === 'messages') this.renderMessages();
        if (pageId === 'profile') this.renderProfile();

        window.scrollTo(0,0);
        window.history.pushState(null, null, `#${pageId}`);
    },

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                this.navigate(link.dataset.target);
            };
        });
    },

    showAuthModal() { document.getElementById('auth-modal').classList.add('open'); },
    hideModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); },

    setupAuth() {
        const signupForm = document.getElementById('signup-form');
        signupForm.onsubmit = (e) => {
            e.preventDefault();
            state.user = { 
                id: Date.now(), 
                email: document.getElementById('signup-email').value,
                name: '', bio: '', role: '', interests: [], avatar: '' 
            };
            this.hideModals();
            this.showOnboarding();
        };

        const onboardingForm = document.getElementById('onboarding-form');
        onboardingForm.onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('ob-name').value;
            const role = document.getElementById('ob-role').value;
            const interests = Array.from(document.querySelectorAll('#ob-interests .filter-chip.active')).map(c => c.textContent);

            state.user.name = name;
            state.user.role = role;
            state.user.interests = interests;
            state.user.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
            state.user.bio = `Explorer in ${interests[0] || 'Deep Space'}.`;
            state.isAuthenticated = true;

            this.hideModals();
            this.updateAuthUI();
            this.showToast(`Orbit established. Welcome, Pilot ${name}.`);
            storage.save();
            this.navigate('discover');
        };

        // Interests Chips
        const obContainer = document.getElementById('ob-interests');
        obContainer.innerHTML = CATEGORIES.slice(0, 10).map(c => `<span class="filter-chip">${c}</span>`).join('');
        obContainer.querySelectorAll('.filter-chip').forEach(c => {
            c.onclick = () => c.classList.toggle('active');
        });

        // Modal close listeners
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
            el.onclick = () => this.hideModals();
        });

        // Edit Profile Form
        const editForm = document.getElementById('edit-profile-form');
        editForm.onsubmit = (e) => {
            e.preventDefault();
            state.user.name = document.getElementById('edit-name').value;
            state.user.bio = document.getElementById('edit-bio').value;
            state.user.interests = Array.from(document.querySelectorAll('#edit-interests .filter-chip.active')).map(c => c.textContent);
            
            this.hideModals();
            this.renderProfile();
            this.updateAuthUI();
            this.showToast('Profile records updated.');
            storage.save();
        };
    },

    showOnboarding() { document.getElementById('onboarding-modal').classList.add('open'); },

    showEditProfileModal() {
        if (!state.isAuthenticated) return;
        document.getElementById('edit-name').value = state.user.name;
        document.getElementById('edit-bio').value = state.user.bio || '';
        
        const container = document.getElementById('edit-interests');
        container.innerHTML = CATEGORIES.map(c => `
            <span class="filter-chip ${state.user.interests.includes(c) ? 'active' : ''}">${c}</span>
        `).join('');
        container.querySelectorAll('.filter-chip').forEach(c => {
            c.onclick = () => c.classList.toggle('active');
        });

        document.getElementById('edit-profile-modal').classList.add('open');
    },

    updateAuthUI() {
        const loggedIn = state.isAuthenticated;
        document.getElementById('nav-user-profile').style.display = loggedIn ? 'flex' : 'none';
        document.getElementById('nav-signin-btn').style.display = loggedIn ? 'none' : 'block';
        document.getElementById('hero-auth-cta').style.display = loggedIn ? 'none' : 'flex';
        document.getElementById('hero-user-cta').style.display = loggedIn ? 'flex' : 'none';
        
        if (loggedIn) {
            document.getElementById('nav-username').textContent = state.user.name;
            document.getElementById('nav-avatar').src = state.user.avatar;
            document.getElementById('welcome-message').textContent = `Pilot ${state.user.name}, you are currently in Orbit.`;
        }
    },

    signOut() {
        state.isAuthenticated = false;
        state.user = null;
        storage.clear();
        this.updateAuthUI();
        this.navigate('home');
    },

    showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    // --- Discover ---
    setupDiscover() {
        const filters = document.getElementById('discover-filters');
        filters.innerHTML = ['All', ...CATEGORIES].map(c => `<span class="filter-chip ${state.currentFilter===c?'active':''}" onclick="app.setFilter('${c}')">${c}</span>`).join('');
        
        document.getElementById('btn-skip').onclick = () => this.handleSwipeChoice('left');
        document.getElementById('btn-save').onclick = () => this.handleSwipeChoice('right');
    },

    setFilter(cat) {
        state.currentFilter = cat;
        this.setupDiscover();
        this.refillSwipeQueue();
        this.loadNextSwipeCard();
    },

    refillSwipeQueue() {
        let pool = state.ideas.filter(i => !state.savedIds.has(i.id) && i.status === 'available');
        if (state.currentFilter !== 'All') {
            pool = pool.filter(i => i.category === state.currentFilter);
        }
        state.swipeQueue = pool.sort(() => Math.random() - 0.5);
    },

    loadNextSwipeCard() {
        const cont = document.getElementById('swipe-container');
        cont.innerHTML = '';
        if (state.swipeQueue.length === 0) {
            cont.innerHTML = '<div class="empty-card" style="padding-top:150px; text-align:center;"><i class="ti ti-satellite-off" style="font-size:4rem; color:var(--text-dim);"></i><p style="margin-top:20px; color:var(--text-muted);">Sector empty. Scan another domain.</p></div>';
            return;
        }

        const i = state.swipeQueue[0];
        const card = document.createElement('div');
        card.className = 'swipe-card';
        card.innerHTML = `
            <div class="stamp stamp-nope">IGNORE</div>
            <div class="stamp stamp-like">RETAIN</div>
            <div class="card-category">${i.category}</div>
            <h3 class="card-title">${i.title}</h3>
            <p class="card-summary">${i.tagline}</p>
            <div class="card-stats-grid">
                <div class="card-stat"><i class="ti ti-activity-heartbeat"></i> <span>${i.likes} Likes</span></div>
                <div class="card-stat"><i class="ti ti-box"></i> <span>${i.type}</span></div>
                <div class="card-stat"><i class="ti ti-rocket"></i> <span>${i.difficulty}</span></div>
                <div class="card-stat"><i class="ti ti-clock"></i> <span>${i.time}</span></div>
            </div>
            <div style="margin-top:auto; padding-top:2rem; border-top:1px solid var(--cosmos-border); text-align:center; color:var(--primary); cursor:pointer;" onclick="app.openModal(${i.id})">
                MISSION DETAILS <i class="ti ti-chevron-down"></i>
            </div>
        `;
        cont.appendChild(card);
        this.initSwipeMechanics(card, i.id);
    },

    initSwipeMechanics(card, id) {
        let startX = 0, currentX = 0, dragging = false;
        const lStamp = card.querySelector('.stamp-like'), nStamp = card.querySelector('.stamp-nope');

        const move = (x) => {
            if (!dragging) return;
            currentX = x - startX;
            card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
            lStamp.style.opacity = Math.min(currentX / 100, 1);
            nStamp.style.opacity = Math.min(-currentX / 100, 1);
        };

        const end = () => {
            if (!dragging) return;
            dragging = false;
            if (Math.abs(currentX) > 130) this.handleSwipeAction(card, id, currentX > 0 ? 'right' : 'left');
            else { card.style.transition = '0.3s'; card.style.transform = ''; lStamp.style.opacity = nStamp.style.opacity = 0; }
        };

        card.onmousedown = (e) => { dragging = true; startX = e.clientX; card.style.transition = 'none'; };
        window.onmousemove = (e) => move(e.clientX);
        window.onmouseup = end;
        card.ontouchstart = (e) => { dragging = true; startX = e.touches[0].clientX; card.style.transition = 'none'; };
        window.ontouchmove = (e) => move(e.touches[0].clientX);
        window.ontouchend = end;
    },

    handleSwipeChoice(dir) {
        const card = document.querySelector('.swipe-card');
        if (card && state.swipeQueue.length > 0) this.handleSwipeAction(card, state.swipeQueue[0].id, dir);
    },

    handleSwipeAction(card, id, dir) {
        card.style.transition = '0.5s cubic-bezier(0.165, 0.84, 0.44, 1)';
        card.style.transform = `translateX(${dir==='right'?1000:-1000}px) rotate(${dir==='right'?30:-30}deg)`;
        
        if (dir === 'right') {
            if (!state.isAuthenticated) return this.showAuthModal();
            state.savedIds.add(id);
            this.showToast('Concept retained for study.');
            storage.save();
        }

        setTimeout(() => {
            state.swipeQueue.shift();
            this.loadNextSwipeCard();
        }, 300);
    },

    // --- Details ---
    openModal(id) {
        const i = state.ideas.find(idea => idea.id === id) || state.postedIdeas.find(p => p.id === id);
        if(!i) return;
        const b = document.getElementById('idea-modal-body');
        b.innerHTML = `
            <div class="card-category">${i.category} • ${i.type}</div>
            <h2 style="font-size:2.5rem; margin-top:1rem;">${i.title}</h2>
            <p style="font-size:1.2rem; color:var(--text-muted); margin:1.5rem 0;">${i.desc}</p>
            <div class="dashboard-grid" style="grid-template-columns:1fr 1fr; gap:1.5rem;">
                <div class="idea-item-card"><small class="text-dim">Difficulty</small><div>${i.difficulty}</div></div>
                <div class="idea-item-card"><small class="text-dim">Est. Time</small><div>${i.time}</div></div>
                <div class="idea-item-card"><small class="text-dim">Current Stage</small><div>${i.stage || 'Concept'}</div></div>
                <div class="idea-item-card"><small class="text-dim">Transmitted By</small><div>${i.poster}</div></div>
            </div>
            <div style="margin-top:2.5rem;">
                <button class="btn btn-primary btn-block" onclick="app.sendSignal(${i.id})"><i class="ti ti-satellite"></i> Transmit Signal to Poster</button>
            </div>
        `;
        document.getElementById('idea-modal').classList.add('open');
    },

    sendSignal(id) {
        if (!state.isAuthenticated) return this.showAuthModal();
        state.contactedIds.add(id);
        this.hideModals();
        this.showToast('Signal transmitted via satellite.');
        storage.save();
        this.navigate('messages');
    },

    // --- Dashboards ---
    renderHome() {
        const sectors = document.getElementById('home-sectors');
        sectors.innerHTML = CATEGORIES.slice(0, 7).map(c => `<span class="filter-chip" onclick="app.setFilter('${c}')">${c}</span>`).join('');
        
        const feat = document.getElementById('featured-ideas');
        feat.innerHTML = state.ideas.slice(0, 3).map(i => this.renderSmallCard(i)).join('');
    },

    renderSmallCard(i) {
        return `
            <div class="idea-item-card" onclick="app.openModal(${i.id})">
                <span class="badge">${i.category}</span>
                <h4 style="margin:1rem 0; font-size:1.2rem;">${i.title}</h4>
                <p class="text-muted" style="font-size:0.9rem;">${i.tagline}</p>
                <div style="margin-top:1.5rem; display:flex; gap:1rem; color:var(--text-dim); font-size:0.8rem;">
                    <span><i class="ti ti-heart"></i> ${i.likes}</span>
                    <span><i class="ti ti-box"></i> ${i.type}</span>
                </div>
            </div>
        `;
    },

    renderDashboard() {
        const list = document.getElementById('dashboard-ideas-list');
        const activeTab = document.querySelector('#page-dashboard .filter-chip.active').dataset.tab;
        
        let displayIdeas = [];
        if (activeTab === 'saved') displayIdeas = state.ideas.filter(i => state.savedIds.has(i.id));
        if (activeTab === 'posted') displayIdeas = state.postedIdeas;

        if (displayIdeas.length === 0) {
            list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:4rem;"><i class="ti ti-atom-off" style="font-size:3rem; color:var(--text-dim);"></i><p style="color:var(--text-muted); margin-top:1rem;">No data in this archive sector.</p></div>`;
            return;
        }
        list.innerHTML = displayIdeas.map(i => this.renderSmallCard(i)).join('');
    },

    renderMessages() {
        const list = document.getElementById('messages-list');
        const items = state.ideas.filter(i => state.contactedIds.has(i.id));
        if (items.length === 0) {
            list.innerHTML = `<div class="idea-item-card" style="text-align:center; padding:4rem;">Signal silence. No active transmissions yet.</div>`;
            return;
        }
        list.innerHTML = items.map(i => `
            <div class="idea-item-card" style="display:flex; align-items:center; gap:1.5rem; cursor:pointer;" onclick="app.openModal(${i.id})">
                <div style="width:50px; height:50px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold;">${i.poster[0]}</div>
                <div>
                    <h5 style="font-size:1.1rem; margin-bottom:0.2rem;">${i.poster}</h5>
                    <p class="text-muted" style="font-size:0.9rem;">Re: ${i.title}</p>
                </div>
                <div style="margin-left:auto; color:var(--text-dim);">Active Feed <i class="ti ti-point"></i></div>
            </div>
        `).join('');
    },

    renderProfile() {
        document.getElementById('profile-page-name').textContent = state.user.name;
        document.getElementById('profile-page-avatar').src = state.user.avatar;
        document.getElementById('profile-page-bio').textContent = state.user.bio;
        document.getElementById('profile-saves-count').textContent = state.savedIds.size;
        document.getElementById('profile-posted-count').textContent = state.postedIdeas.length;
        document.getElementById('profile-interests-display').innerHTML = state.user.interests.map(i => `<span class="badge" style="margin-right:0.5rem; margin-bottom:0.5rem;">${i}</span>`).join('');
    },

    setupForms() {
        const catSelect = document.getElementById('idea-category');
        catSelect.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
        const typeSelect = document.getElementById('idea-type');
        typeSelect.innerHTML = IDEA_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

        document.getElementById('post-idea-form').onsubmit = (e) => {
            e.preventDefault();
            if(!state.isAuthenticated) return this.showAuthModal();

            const p = {
                id: Date.now(),
                title: document.getElementById('idea-title').value,
                tagline: document.getElementById('idea-tagline').value,
                desc: document.getElementById('idea-desc').value,
                category: document.getElementById('idea-category').value,
                type: document.getElementById('idea-type').value,
                stage: document.getElementById('idea-stage').value,
                difficulty: document.getElementById('idea-difficulty').value,
                time: document.getElementById('idea-time').value,
                poster: state.user.name,
                status: 'available',
                likes: 0, color: '#0ea5e9'
            };

            state.postedIdeas.push(p);
            storage.save();
            this.showToast('Signal broadcast to deep space.');
            this.navigate('dashboard');
        };

        // Dashboard Tabs
        document.querySelectorAll('#page-dashboard .filter-chip').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('#page-dashboard .filter-chip').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderDashboard();
            };
        });
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
