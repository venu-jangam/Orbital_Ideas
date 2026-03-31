/**
 * IdeaSwipe - core logic
 * Supporting Auth Flow, Profile Onboarding, and Persistent Data
 */

// Mock Data
const MOCK_IDEAS = [
    { id: 1, title: 'Tinder for Dog Walkers', desc: 'Connect busy professionals with local, vetted dog walkers who can take their pups out on short notice.', category: 'Mobile App', difficulty: 'Intermediate', time: '1 Month', poster: 'Sarah K.', color: '#ff6b6b', likes: 124, saves: 45, devs: 3, tags: ['pets', 'gig-work'] },
    { id: 2, title: 'AI Code Review Assistant', desc: 'A GitHub bot that uses LLMs to perform automated style, security, and logic reviews on pull requests.', category: 'AI Tool', difficulty: 'Advanced', time: '3+ Months', poster: 'DevNinjaX', color: '#6366f1', likes: 412, saves: 120, devs: 15, tags: ['ai', 'github'] },
    { id: 3, title: 'Leftover Building Material Market', desc: 'Contractors list unused materials for DIY buyers. Reduces waste and construction costs.', category: 'Marketplace', difficulty: 'Intermediate', time: '1 Month', poster: 'EcoBuild', color: '#10b981', likes: 89, saves: 22, devs: 1, tags: ['green', 'construction'] },
    { id: 4, title: 'Privacy-First Ad Blocker', desc: 'A network-level ad blocker that protects privacy and cleans up your browsing experience automatically.', category: 'SaaS', difficulty: 'Advanced', time: '3+ Months', poster: 'PrivacyGuard', color: '#f59e0b', likes: 210, saves: 55, devs: 4, tags: ['security', 'privacy'] },
    { id: 5, title: 'Mars Logistics Dashboard', desc: 'Visual tracker for interplanetary supply chain management and automated orbital docking.', category: 'Space', difficulty: 'Advanced', time: '1 Year', poster: 'InterstellarX', color: '#8b5cf6', likes: 530, saves: 200, devs: 8, tags: ['mars', 'api'] }
];

const CATEGORIES = ['Science', 'Finance', 'Space', 'Health', 'AI', 'SaaS', 'Marketplace', 'Social', 'Education', 'Developer Tool'];

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

// --- Storage Logic ---
const storage = {
    save() {
        if (!state.user) return;
        const userData = {
            user: state.user,
            savedIds: Array.from(state.savedIds),
            contactedIds: Array.from(state.contactedIds),
            postedIdeas: state.postedIdeas
        };
        localStorage.setItem(`ideaSwipe_${state.user.id}`, JSON.stringify(userData));
        localStorage.setItem('ideaSwipe_activeSession', state.user.id);
    },
    loadActive() {
        const activeId = localStorage.getItem('ideaSwipe_activeSession');
        if (!activeId) return null;
        
        const data = localStorage.getItem(`ideaSwipe_${activeId}`);
        if (!data) return null;
        
        const parsed = JSON.parse(data);
        return {
            ...parsed,
            savedIds: new Set(parsed.savedIds),
            contactedIds: new Set(parsed.contactedIds)
        };
    },
    clear() {
        localStorage.removeItem('ideaSwipe_activeSession');
    }
};

// --- App Core ---
const app = {
    init() {
        this.setupNavigation();
        this.setupAuthListeners();
        this.setupDiscover();
        this.renderHome();
        this.setupForms();
        
        // Auto-detect login
        const savedSession = storage.loadActive();
        if (savedSession) {
            state.user = savedSession.user;
            state.isAuthenticated = true;
            state.savedIds = savedSession.savedIds;
            state.contactedIds = savedSession.contactedIds;
            state.postedIdeas = savedSession.postedIdeas;
            this.updateAuthUI();
        }

        // Handle URL Hash
        this.navigate(window.location.hash.slice(1) || 'home');
    },

    navigate(pageId) {
        if (!pageId) return;
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');
        
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.target === pageId);
        });

        pages.forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageId}`);
        });

        if (pageId === 'discover') this.loadNextSwipeCard();
        if (pageId === 'saved') this.renderSaved();
        if (pageId === 'messages') this.renderMessages();
        if (pageId === 'profile') this.renderProfile();
        
        window.history.pushState(null, null, `#${pageId}`);
        window.scrollTo(0, 0);
    },

    showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    // --- Auth & Onboarding ---
    showAuthModal() {
        document.getElementById('auth-modal').classList.add('open');
    },

    hideModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    },

    setupAuthListeners() {
        const signupForm = document.getElementById('signup-form');
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            // Create user object
            state.user = {
                id: Date.now(),
                email: email,
                name: '',
                role: '',
                interests: [],
                avatar: ''
            };
            this.hideModals();
            this.showOnboarding();
        });

        const onboardingForm = document.getElementById('onboarding-form');
        onboardingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('ob-name').value;
            const role = document.getElementById('ob-role').value;
            const interests = Array.from(document.querySelectorAll('#ob-interests .tag.selected'))
                              .map(t => t.textContent);

            if (interests.length === 0) return this.showToast('Select at least one interest!');

            state.user.name = name;
            state.user.role = role;
            state.user.interests = interests;
            state.user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=200`;
            state.isAuthenticated = true;

            this.hideModals();
            this.updateAuthUI();
            this.showToast(`Welcome aboard, ${name}!`);
            storage.save();
            this.navigate('discover');
        });

        // Setup Onboarding Interest tags
        const obInterests = document.getElementById('ob-interests');
        obInterests.innerHTML = CATEGORIES.slice(0, 8).map(c => `<span class="tag">${c}</span>`).join('');
        obInterests.querySelectorAll('.tag').forEach(t => {
            t.onclick = () => t.classList.toggle('selected');
        });

        // Modal close listeners
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
            el.onclick = () => this.hideModals();
        });
    },

    showOnboarding() {
        document.getElementById('onboarding-modal').classList.add('open');
    },

    updateAuthUI() {
        const userArea = document.getElementById('nav-user-area');
        const signinBtn = document.getElementById('nav-signin-btn');
        const heroAuth = document.getElementById('hero-auth-cta');
        const heroUser = document.getElementById('hero-user-cta');
        
        if (state.isAuthenticated) {
            userArea.style.display = 'flex';
            signinBtn.style.display = 'none';
            heroAuth.style.display = 'none';
            heroUser.style.display = 'block';
            
            document.getElementById('nav-username').textContent = state.user.name;
            document.getElementById('nav-avatar').src = state.user.avatar;
            document.getElementById('welcome-message').textContent = `Welcome back, ${state.user.name}!`;
        } else {
            userArea.style.display = 'none';
            signinBtn.style.display = 'block';
            heroAuth.style.display = 'block';
            heroUser.style.display = 'none';
        }
    },

    signOut() {
        state.isAuthenticated = false;
        state.user = null;
        state.savedIds = new Set();
        state.contactedIds = new Set();
        state.postedIdeas = [];
        storage.clear();
        this.updateAuthUI();
        this.showToast('Signed out successfully.');
        this.navigate('home');
    },

    mockSocialAuth(type) {
        this.showToast(`Logging in with ${type}...`);
        setTimeout(() => {
            const signupEmail = document.getElementById('signup-email');
            signupEmail.value = `${type.toLowerCase()}User@example.com`;
            // Trigger same signup flow
            document.getElementById('signup-form').dispatchEvent(new Event('submit'));
        }, 1000);
    },

    // --- Home Logic ---
    renderHome() {
        const homeCats = document.getElementById('home-categories');
        homeCats.innerHTML = CATEGORIES.slice(0, 6).map(c => `<span class="tag" onclick="app.filterAndDiscover('${c}')">${c}</span>`).join('');

        const grid = document.getElementById('featured-ideas');
        grid.innerHTML = state.ideas.slice(0, 3).map(i => this.renderCardHTML(i)).join('');
    },

    renderCardHTML(i) {
        return `
            <div class="idea-card" onclick="app.openModal(${i.id})">
                <div class="card-header">
                    <h3 class="card-title">${i.title}</h3>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <span class="badge" style="background: ${i.color}20; color: ${i.color}">${i.category}</span>
                        <span class="badge" style="background: var(--bg-elevated); color: var(--text-muted); margin-top:0.3rem">${i.type || 'Project'}</span>
                    </div>
                </div>
                <p class="card-desc">${i.desc}</p>
                <div class="card-stats">
                    <div class="stat-item"><i class="ti ti-heart"></i> ${state.savedIds.has(i.id) ? i.saves+1 : i.saves}</div>
                    <div class="stat-item"><i class="ti ti-code"></i> ${i.devs} devs</div>
                </div>
            </div>
        `;
    },

    filterAndDiscover(cat) {
        state.currentFilter = cat;
        this.buildDiscoverFilters();
        this.refillSwipeQueue();
        this.navigate('discover');
    },

    // --- Discover (Swipe) logic ---
    setupDiscover() {
        this.buildDiscoverFilters();
        this.refillSwipeQueue();
        document.getElementById('btn-skip').onclick = () => this.handleSwipeChoice('left');
        document.getElementById('btn-save').onclick = () => this.handleSwipeChoice('right');
    },

    buildDiscoverFilters() {
        const filters = ['All', ...CATEGORIES];
        const container = document.getElementById('discover-filters');
        container.innerHTML = filters.map(f => `
            <button class="filter-btn ${state.currentFilter === f ? 'active' : ''}" onclick="app.setFilter('${f}')">${f}</button>
        `).join('');
    },

    setFilter(cat) {
        state.currentFilter = cat;
        this.buildDiscoverFilters();
        this.refillSwipeQueue();
        this.loadNextSwipeCard();
    },

    refillSwipeQueue() {
        let pool = state.ideas.filter(i => {
            const isSaved = state.savedIds.has(i.id) || i.status === 'saved';
            return !isSaved && i.status !== 'archived';
        });
        if (state.currentFilter !== 'All') {
            pool = pool.filter(i => i.category === state.currentFilter);
        }
        state.swipeQueue = pool.sort(() => Math.random() - 0.5);
    },

    loadNextSwipeCard() {
        const cont = document.getElementById('swipe-container');
        cont.querySelectorAll('.swipe-card').forEach(c => c.remove());

        if (state.swipeQueue.length === 0) return;

        const i = state.swipeQueue[0];
        const card = document.createElement('div');
        card.className = 'swipe-card';
        card.innerHTML = `
            <div class="stamp stamp-nope">SKIP</div>
            <div class="stamp stamp-like">SAVE</div>
            <div class="swipe-card-content">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="swipe-hero-tag" style="color:${i.color}">${i.category}</span>
                    <span class="badge" style="background:var(--bg-elevated)">${i.type || 'App'}</span>
                </div>
                <h2 class="swipe-title">${i.title}</h2>
                <p class="swipe-desc">${i.desc}</p>
                <div class="swipe-details">
                    <div class="detail-row"><i class="ti ti-clock"></i> <span class="label">Time:</span> <span class="val">${i.time}</span></div>
                    <div class="detail-row"><i class="ti ti-chart-bar"></i> <span class="label">Difficulty:</span> <span class="val">${i.difficulty}</span></div>
                </div>
            </div>
            <div style="margin-top:auto; text-align:center; color: var(--text-muted); cursor:pointer;" onclick="app.openModal(${i.id})">
                <i class="ti ti-dots"></i> Tap for more
            </div>
        `;
        cont.appendChild(card);
        this.initSwipeMechanics(card, i.id);
    },

    initSwipeMechanics(card, ideaId) {
        let startX = 0, currentX = 0, isDragging = false;
        const lStamp = card.querySelector('.stamp-like'), nStamp = card.querySelector('.stamp-nope');

        const move = (clientX) => {
            if (!isDragging) return;
            currentX = clientX - startX;
            const rot = currentX * 0.05;
            card.style.transform = `translateX(${currentX}px) rotate(${rot}deg)`;
            lStamp.style.opacity = Math.min(currentX / 100, 1);
            nStamp.style.opacity = Math.min(-currentX / 100, 1);
        };

        const end = () => {
            if (!isDragging) return;
            isDragging = false;
            if (Math.abs(currentX) > 120) {
                this.handleSwipeAction(card, ideaId, currentX > 0 ? 'right' : 'left');
            } else {
                card.style.transform = '';
                lStamp.style.opacity = nStamp.style.opacity = 0;
            }
        };

        card.onmousedown = (e) => { isDragging = true; startX = e.clientX; card.style.transition = 'none'; };
        window.onmousemove = (e) => move(e.clientX);
        window.onmouseup = end;
        
        card.ontouchstart = (e) => { isDragging = true; startX = e.touches[0].clientX; card.style.transition = 'none'; };
        window.ontouchmove = (e) => move(e.touches[0].clientX);
        window.ontouchend = end;
    },

    handleSwipeAction(card, id, dir) {
        const xOut = dir === 'right' ? 1000 : -1000;
        card.style.transition = 'transform 0.4s ease-out';
        card.style.transform = `translateX(${xOut}px) rotate(${dir==='right'?30:-30}deg)`;
        
        if (dir === 'right') {
            if (!state.isAuthenticated) {
                this.showAuthModal();
                card.style.transform = ''; // reset since they didn't really swipe
                return;
            }
            state.savedIds.add(id);
            // Update status in master list
            const idea = state.ideas.find(i => i.id === id);
            if (idea) idea.status = 'saved';
            
            this.showToast('Idea saved!');
            storage.save();
        }

        setTimeout(() => {
            state.swipeQueue.shift();
            this.loadNextSwipeCard();
        }, 300);
    },

    handleSwipeChoice(dir) {
        const card = document.querySelector('.swipe-card');
        if (card) this.handleSwipeAction(card, state.swipeQueue[0].id, dir);
    },

    // --- Detail Modal ---
    openModal(id) {
        const idea = state.ideas.find(i => i.id === id) || state.postedIdeas.find(i => i.id === id);
        if (!idea) return;

        const body = document.getElementById('idea-modal-body');
        body.innerHTML = `
            <div class="idea-full-details">
                <span class="badge" style="color:${idea.color}">${idea.category}</span>
                <h2 class="title" style="margin-top:1rem">${idea.title}</h2>
                <p class="text-muted" style="margin:1rem 0">${idea.desc}</p>
                <div class="detail-row"><i class="ti ti-user"></i> Posted by ${idea.poster}</div>
                <div class="detail-row"><i class="ti ti-chart-bar"></i> Difficulty: ${idea.difficulty}</div>
                <div class="detail-row"><i class="ti ti-clock"></i> Build time: ${idea.time}</div>
                <div class="contact-box" style="margin-top:2rem">
                    <h4>Interested in building this?</h4>
                    <p class="text-muted" style="font-size:0.9rem">Message the poster to start collaborating.</p>
                    <button class="btn btn-primary btn-block mt-3" onclick="app.contactPoster(${idea.id})"><i class="ti ti-message"></i> Send Request</button>
                </div>
            </div>
        `;
        document.getElementById('idea-modal').classList.add('open');
    },

    contactPoster(id) {
        if (!state.isAuthenticated) return this.showAuthModal();
        state.contactedIds.add(id);
        this.hideModals();
        this.showToast('Collaboration request sent!');
        storage.save();
        this.navigate('messages');
    },

    // --- Profile & Saved ---
    renderSaved() {
        const list = document.getElementById('saved-ideas-list');
        const saved = state.ideas.filter(i => state.savedIds.has(i.id) || i.status === 'saved');
        if (saved.length === 0) {
            list.innerHTML = `<div style="grid-column:1/-1; padding:4rem; text-align:center; color:var(--text-muted)">No saved ideas yet. Start swiping!</div>`;
            return;
        }
        list.innerHTML = saved.map(i => this.renderCardHTML(i)).join('');
    },

    renderMessages() {
        const list = document.getElementById('messages-list');
        const items = state.ideas.filter(i => state.contactedIds.has(i.id));
        if (items.length === 0) {
            list.innerHTML = `<div style="padding:4rem; text-align:center; color:var(--text-muted)">You haven't messaged anyone yet.</div>`;
            return;
        }
        list.innerHTML = items.map(i => `
            <div class="message-card" onclick="app.openModal(${i.id})">
                <div class="msg-avatar">${i.poster[0]}</div>
                <div class="msg-info">
                    <h4>${i.poster}</h4>
                    <p>Re: ${i.title}</p>
                </div>
                <i class="ti ti-chevron-right" style="margin-left:auto"></i>
            </div>
        `).join('');
    },

    renderProfile() {
        if (!state.isAuthenticated) return this.showAuthModal();
        
        document.getElementById('profile-page-name').textContent = state.user.name;
        document.getElementById('profile-page-email').textContent = state.user.email;
        document.getElementById('profile-page-avatar').src = state.user.avatar;
        document.getElementById('profile-saves-count').textContent = state.savedIds.size;
        document.getElementById('profile-posted-count').textContent = state.postedIdeas.length;

        const interests = document.getElementById('profile-interests-display');
        interests.innerHTML = state.user.interests.map(i => `<span class="tag">${i}</span>`).join('');

        const grid = document.getElementById('profile-posted-ideas');
        if (state.postedIdeas.length === 0) {
            grid.innerHTML = '<p class="text-muted">You haven\'t posted any ideas yet.</p>';
        } else {
            grid.innerHTML = state.postedIdeas.map(i => this.renderCardHTML(i)).join('');
        }
    },

    // --- Forms ---
    setupForms() {
        const catSelect = document.getElementById('idea-category');
        catSelect.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');

        document.getElementById('post-idea-form').onsubmit = (e) => {
            e.preventDefault();
            if (!state.isAuthenticated) return this.showAuthModal();

            const newIdea = {
                id: Date.now(),
                title: document.getElementById('idea-title').value,
                desc: document.getElementById('idea-desc').value,
                category: document.getElementById('idea-category').value,
                type: document.getElementById('idea-type').value,
                difficulty: document.getElementById('idea-difficulty').value,
                time: document.getElementById('idea-time-input').value,
                poster: state.user.name,
                color: '#8b5cf6',
                status: 'available',
                likes: 0,
                saves: 0,
                devs: 0,
                tags: []
            };

            state.postedIdeas.push(newIdea);
            storage.save();
            this.showToast('Idea published!');
            e.target.reset();
            this.navigate('profile');
        };
    },

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(l => {
            l.onclick = (e) => {
                e.preventDefault();
                this.navigate(l.dataset.target);
            };
        });
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
