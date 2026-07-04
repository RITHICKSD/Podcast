/* ==========================================================================
   Resonate Podcast Network & Studio SPA Controller
   ========================================================================== */

// --- Global Application State ---
const state = {
    activeView: 'home1-view',
    theme: 'dark', // 'dark' or 'light'
    direction: 'ltr', // 'ltr' or 'rtl'
    currentUser: null, // null, 'subscriber', or 'admin'
    audioPlayer: null,
    isPlaying: false,
    currentTrack: {
        cover: 'p1.jpg',
        show: 'The Daily Byte',
        title: 'EP 124: The Future of Neural Audio Architectures',
        episodeNum: '124',
        durationSec: 2902, // 48:22
        currentSec: 0
    },
    playbackSpeed: 1.0,
    charts: {
        listening: null,
        category: null,
        subs: null,
        platform: null
    },
    // Mock Podcast Database for Admin Editor
    episodes: [
        { id: 1, cover: 'p1.jpg', show: 'The Daily Byte', title: 'EP 124: The Future of Neural Audio Architectures', length: '48:22' },
        { id: 2, cover: 'p2.jpg', show: 'Behind the Sound', title: 'EP 89: Secrets of the Abbey Road Plate Reverbs', length: '55:10' },
        { id: 3, cover: 'p3.jpg', show: 'Indie Wave', title: 'EP 42: Synthesizing the 80s Revival Scene', length: '62:15' },
        { id: 4, cover: 'p4.jpg', show: 'True Crime Decoded', title: 'EP 56: The Cryptic Transmission of 1978', length: '38:45' }
    ]
};

// Royalty Free Demo Audio Track Link
const DEMO_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Load persisted state from localStorage
    const savedTheme = localStorage.getItem('resonate_theme') || 'dark';
    state.theme = savedTheme;
    document.body.classList.remove('dark-theme', 'light-theme');
    document.body.classList.add(`${savedTheme}-theme`);

    const savedDirection = localStorage.getItem('resonate_direction') || 'ltr';
    state.direction = savedDirection;
    document.documentElement.setAttribute('dir', savedDirection);
    if (savedDirection === 'rtl') {
        document.body.classList.add('rtl-active');
    } else {
        document.body.classList.remove('rtl-active');
    }

    const savedUser = localStorage.getItem('resonate_currentUser');
    if (savedUser) {
        state.currentUser = savedUser;
        document.getElementById('header-login-btn').style.display = 'none';
        if (document.getElementById('drawer-login-btn')) document.getElementById('drawer-login-btn').style.display = 'none';
        
        const widget = document.getElementById('header-user-widget');
        widget.style.display = 'flex';
        
        const drawerWidget = document.getElementById('drawer-user-widget');
        if (drawerWidget) drawerWidget.style.display = 'flex';
        
        let displayName = 'Premium Member';
        if (savedUser === 'admin') {
            displayName = 'System Admin';
        }
        const savedName = localStorage.getItem('resonate_currentUsername');
        if (savedName) {
            displayName = savedName;
        }

        if (savedUser === 'subscriber') {
            document.getElementById('header-username').textContent = displayName;
            document.getElementById('header-avatar-img').src = 'p6.jpg';
            if (document.getElementById('drawer-username')) document.getElementById('drawer-username').textContent = displayName;
            if (document.getElementById('drawer-avatar-img')) document.getElementById('drawer-avatar-img').src = 'p6.jpg';
            // Sync dashboard user profile widget
            const dbUserText = document.getElementById('dash-user-username');
            const dbUserImg = document.getElementById('dash-user-avatar');
            if (dbUserText) dbUserText.textContent = displayName;
            if (dbUserImg) dbUserImg.src = 'p6.jpg';
            
            // Personalize Dashboard Welcome Header
            const welcomeText = document.getElementById('user-welcome-name');
            if (welcomeText) welcomeText.textContent = displayName;
        } else if (savedUser === 'admin') {
            document.getElementById('header-username').textContent = displayName;
            document.getElementById('header-avatar-img').src = 'p7.jpg';
            if (document.getElementById('drawer-username')) document.getElementById('drawer-username').textContent = displayName;
            if (document.getElementById('drawer-avatar-img')) document.getElementById('drawer-avatar-img').src = 'p7.jpg';
            // Sync dashboard admin profile widget
            const dbAdminText = document.getElementById('dash-admin-username');
            const dbAdminImg = document.getElementById('dash-admin-avatar');
            if (dbAdminText) dbAdminText.textContent = displayName;
            if (dbAdminImg) dbAdminImg.src = 'p7.jpg';
        }
    }

    // 1. Initialize Icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    // 2. Initialize Audio Element
    state.audioPlayer = new Audio();
    state.audioPlayer.src = DEMO_AUDIO_URL;
    setupAudioListeners();

    // 3. Setup Routing Event Listeners
    setupRouting();

    // 4. Setup Theme & Direction Toggle Listeners
    setupToggles();

    // 5. Initialize dashboard charts for standalone dashboard pages
    window.setTimeout(() => {
        initDashboardChartsIfNeeded();
    }, 150);

    // 6. Setup Form Submissions
    setupFormHandlers();

    // 6. Populate Admin Tables
    renderAdminEpisodesTable();

    // 7. Load Default Track Info in deck & player
    syncPlayerUI();

    // 8. Initialize Leaflet Map
    initLeafletMap();
});

// --- Audio Player Engine & Synchronization ---
function setupAudioListeners() {
    // When audio plays
    state.audioPlayer.addEventListener('play', () => {
        state.isPlaying = true;
        document.body.classList.add('playing');
        updatePlayButtonsState(true);
    });

    // When audio pauses
    state.audioPlayer.addEventListener('pause', () => {
        state.isPlaying = false;
        document.body.classList.remove('playing');
        updatePlayButtonsState(false);
    });

    // Time update listener
    state.audioPlayer.addEventListener('timeupdate', () => {
        const current = state.audioPlayer.currentTime;
        const duration = state.audioPlayer.duration || state.currentTrack.durationSec;
        state.currentTrack.currentSec = current;
        
        // Progress percentage
        const percent = (current / duration) * 100;
        
        // Update sliders
        const deckSlider = document.getElementById('deck-slider');
        const barSlider = document.getElementById('bar-progress');
        if (deckSlider) deckSlider.value = percent;
        if (barSlider) barSlider.value = percent;

        // Update timestamps text
        const currentText = formatTime(current);
        const durationText = formatTime(duration);

        // Deck text
        const deckCurrent = document.querySelector('.current-time');
        const deckDuration = document.querySelector('.total-duration');
        if (deckCurrent) deckCurrent.textContent = currentText;
        if (deckDuration && state.audioPlayer.duration) deckDuration.textContent = durationText;

        // Bar text
        const barCurrent = document.querySelector('.bar-current-time');
        const barDuration = document.querySelector('.bar-total-duration');
        if (barCurrent) barCurrent.textContent = currentText;
        if (barDuration && state.audioPlayer.duration) barDuration.textContent = durationText;
    });

    // Setup input sliders seeking
    const deckSlider = document.getElementById('deck-slider');
    const barSlider = document.getElementById('bar-progress');
    
    const handleSeek = (e) => {
        const percent = e.target.value;
        const duration = state.audioPlayer.duration || state.currentTrack.durationSec;
        state.audioPlayer.currentTime = (percent / 100) * duration;
    };

    if (deckSlider) deckSlider.addEventListener('input', handleSeek);
    if (barSlider) barSlider.addEventListener('input', handleSeek);

    // Setup volume controllers
    const deckVol = document.getElementById('deck-volume');
    const barVol = document.getElementById('bar-volume');

    const handleVolume = (e) => {
        const val = e.target.value / 100;
        state.audioPlayer.volume = val;
        // Sync sliders
        if (deckVol) deckVol.value = e.target.value;
        if (barVol) barVol.value = e.target.value;
    };

    if (deckVol) deckVol.addEventListener('input', handleVolume);
    if (barVol) barVol.addEventListener('input', handleVolume);

    // Setup Play/Pause toggle triggers
    const deckPlay = document.getElementById('deck-play-btn');
    const barPlay = document.getElementById('bar-play-trigger');

    const togglePlayState = () => {
        if (state.isPlaying) {
            state.audioPlayer.pause();
        } else {
            // Show global player bar if not visible
            const bar = document.getElementById('global-player-bar');
            if (bar && bar.style.display === 'none' && state.currentUser === null) {
                bar.style.display = 'block';
            }
            state.audioPlayer.play().catch(err => {
                console.log("Audio play failed: ", err);
                // Fallback toggle state if browser blocks autoplay
                state.isPlaying = !state.isPlaying;
                updatePlayButtonsState(state.isPlaying);
            });
        }
    };

    if (deckPlay) deckPlay.addEventListener('click', togglePlayState);
    if (barPlay) barPlay.addEventListener('click', togglePlayState);

    // Setup Speed Toggle
    const speedBtn = document.getElementById('deck-speed');
    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            if (state.playbackSpeed === 1.0) state.playbackSpeed = 1.5;
            else if (state.playbackSpeed === 1.5) state.playbackSpeed = 2.0;
            else state.playbackSpeed = 1.0;
            
            state.audioPlayer.playbackRate = state.playbackSpeed;
            speedBtn.textContent = `${state.playbackSpeed.toFixed(1)}x`;
            showToast(`Playback speed set to ${state.playbackSpeed}x`);
        });
    }

    // Skip Buttons
    const prevBtn = document.getElementById('deck-prev-btn');
    const nextBtn = document.getElementById('deck-next-btn');

    if (prevBtn) prevBtn.addEventListener('click', () => prevTrack());
    if (nextBtn) nextBtn.addEventListener('click', () => nextTrack());
}

function updatePlayButtonsState(playing) {
    const deckPlayIcon = document.querySelector('#deck-play-btn i');
    const barPlayIcon = document.querySelector('#bar-play-trigger i');

    const iconName = playing ? 'pause' : 'play';

    if (deckPlayIcon) deckPlayIcon.setAttribute('data-lucide', iconName);
    if (barPlayIcon) barPlayIcon.setAttribute('data-lucide', iconName);
    
    lucide.createIcons();
}

function syncPlayerUI() {
    // Deck labels
    const deckImg = document.getElementById('deck-img');
    const deckShow = document.getElementById('deck-show-name');
    const deckTitle = document.getElementById('deck-title-text');

    if (deckImg) deckImg.src = state.currentTrack.cover;
    if (deckShow) deckShow.textContent = state.currentTrack.show;
    if (deckTitle) deckTitle.textContent = state.currentTrack.title;

    // Bar labels
    const barImg = document.getElementById('bar-img');
    const barShow = document.getElementById('bar-show');
    const barTitle = document.getElementById('bar-title');

    if (barImg) barImg.src = state.currentTrack.cover;
    if (barShow) barShow.textContent = state.currentTrack.show;
    if (barTitle) barTitle.textContent = state.currentTrack.title;
}

// Load a selected episode track
function loadTrack(cover, show, title, num) {
    state.currentTrack.cover = cover;
    state.currentTrack.show = show;
    state.currentTrack.title = title;
    state.currentTrack.episodeNum = num;
    
    // Reset timelines
    state.audioPlayer.currentTime = 0;
    
    // Sync text labels
    syncPlayerUI();

    // Trigger Play
    state.audioPlayer.play().catch(e => console.log("Blocked: ", e));
    
    // Highlight correct row in lists
    document.querySelectorAll('.episode-row').forEach(row => {
        row.classList.remove('active');
        if (row.querySelector('.ep-num').textContent === num) {
            row.classList.add('active');
        }
    });

    // Make player bar visible
    if (state.currentUser === null) {
        document.getElementById('global-player-bar').style.display = 'block';
    }

    showToast(`Loaded: ${title}`);
}

// Play / Pause shortcut from play buttons
function playEpisode(cover, show, title, num) {
    if (state.currentTrack.episodeNum === num) {
        // Just toggle
        if (state.isPlaying) state.audioPlayer.pause();
        else state.audioPlayer.play().catch(e => console.log(e));
    } else {
        loadTrack(cover, show, title, num);
    }
}

// Jump playback head to timestamp (e.g. from transcript)
function seekTo(seconds) {
    state.audioPlayer.currentTime = seconds;
    if (!state.isPlaying) {
        state.audioPlayer.play().catch(e => console.log(e));
    }
    showToast(`Skipped to ${formatTime(seconds)}`);
}

function prevTrack() {
    showToast("Skipping to previous episode");
    // Mock loop
    loadTrack('p4.jpg', 'True Crime Decoded', 'EP 56: The Cryptic Transmission of 1978', '56');
}

function nextTrack() {
    showToast("Skipping to next episode");
    // Mock loop
    loadTrack('p2.jpg', 'Behind the Sound', 'EP 89: Secrets of the Abbey Road Plate Reverbs', '89');
}

function closeGlobalPlayerBar() {
    document.getElementById('global-player-bar').style.display = 'none';
    state.audioPlayer.pause();
}

// --- Routing & SPA Navigation ---
function setupRouting() {
    // Desktop Nav Items
    document.getElementById('header-logo-btn').addEventListener('click', () => navigateToView('home1'));
    document.getElementById('go-home1').addEventListener('click', () => navigateToView('home1'));
    document.getElementById('go-home2').addEventListener('click', () => navigateToView('home2'));
    document.getElementById('go-about').addEventListener('click', () => navigateToView('about'));
    document.getElementById('go-services').addEventListener('click', () => navigateToView('services'));
    document.getElementById('go-contact').addEventListener('click', () => navigateToView('contact'));
    
    document.getElementById('go-user-dash').addEventListener('click', () => {
        navigateToView('user-dashboard');
    });

    document.getElementById('go-admin-dash').addEventListener('click', () => {
        navigateToView('admin-dashboard');
    });

    // Mobile Drawer Items
    document.getElementById('mob-go-home1').addEventListener('click', () => { toggleMobileDrawer(false); navigateToView('home1'); });
    document.getElementById('mob-go-home2').addEventListener('click', () => { toggleMobileDrawer(false); navigateToView('home2'); });
    document.getElementById('mob-go-about').addEventListener('click', () => { toggleMobileDrawer(false); navigateToView('about'); });
    document.getElementById('mob-go-services').addEventListener('click', () => { toggleMobileDrawer(false); navigateToView('services'); });
    document.getElementById('mob-go-contact').addEventListener('click', () => { toggleMobileDrawer(false); navigateToView('contact'); });
    
    document.getElementById('mob-go-user-dash').addEventListener('click', () => {
        toggleMobileDrawer(false);
        navigateToView('user-dashboard');
    });

    document.getElementById('mob-go-admin-dash').addEventListener('click', () => {
        toggleMobileDrawer(false);
        navigateToView('admin-dashboard');
    });

    // Mobile Drawer Dropdowns Toggles
    const mobHomeToggle = document.getElementById('mob-home-dropdown-toggle');
    if (mobHomeToggle) {
        mobHomeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = mobHomeToggle.parentElement;
            const menu = document.getElementById('mob-home-menu');
            parent.classList.toggle('open');
            if (menu) {
                menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
            }
        });
    }

    const mobDashToggle = document.getElementById('mob-dashboard-dropdown-toggle');
    if (mobDashToggle) {
        mobDashToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = mobDashToggle.parentElement;
            const menu = document.getElementById('mob-dashboard-menu');
            parent.classList.toggle('open');
            if (menu) {
                menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
            }
        });
    }

    // Burger Toggle
    const burgerBtn = document.querySelector('.mobile-nav-toggle');
    if (burgerBtn) {
        burgerBtn.addEventListener('click', () => {
            const drawer = document.getElementById('mobile-drawer-menu');
            const isOpen = drawer.classList.contains('open');
            toggleMobileDrawer(!isOpen);
        });
    }

    // Modal Close Backdrop trigger
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                backdrop.style.display = 'none';
            }
        });
    });

    // Connect Logouts
    document.querySelectorAll('.logout-link-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });

    // Redirect to standalone login.html page
    document.getElementById('header-login-btn').addEventListener('click', () => {
        window.location.href = 'login.html';
    });
    document.getElementById('drawer-login-btn').addEventListener('click', () => {
        toggleMobileDrawer(false);
        window.location.href = 'login.html';
    });

    // Click on avatar widget to open user dashboard
    const userWidget = document.getElementById('header-user-widget');
    if (userWidget) {
        userWidget.addEventListener('click', () => {
            if (state.currentUser === 'admin') {
                navigateToView('admin-dashboard');
            } else {
                navigateToView('user-dashboard');
            }
        });
    }

    // Filter Buttons for Podcast Grid
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const category = tab.getAttribute('data-filter');
            filterPodcastGrid(category);
        });
    });
}

function toggleMobileDrawer(open) {
    const drawer = document.getElementById('mobile-drawer-menu');
    const openIcon = document.querySelector('.menu-open-icon');
    const closeIcon = document.querySelector('.menu-close-icon');

    if (open) {
        drawer.classList.add('open');
        openIcon.style.display = 'none';
        closeIcon.style.display = 'block';
    } else {
        drawer.classList.remove('open');
        openIcon.style.display = 'block';
        closeIcon.style.display = 'none';
    }
}

function navigateToView(viewName) {
    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => panel.style.display = 'none');
    document.getElementById('user-dashboard-view').style.display = 'none';
    document.getElementById('admin-dashboard-view').style.display = 'none';
    
    // Pause audio if transitioning to dashboards
    if (viewName.includes('dashboard')) {
        state.audioPlayer.pause();
        document.getElementById('global-player-bar').style.display = 'none';
    }

    // Show selected view panel
    if (viewName === 'home1') {
        document.getElementById('marketing-container').style.display = 'block';
        document.getElementById('global-header').style.display = 'block';
        document.getElementById('global-footer').style.display = 'block';
        document.getElementById('home1-view').style.display = 'block';
    } else if (viewName === 'home2') {
        document.getElementById('marketing-container').style.display = 'block';
        document.getElementById('global-header').style.display = 'block';
        document.getElementById('global-footer').style.display = 'block';
        document.getElementById('home2-view').style.display = 'block';
    } else if (viewName === 'about') {
        document.getElementById('marketing-container').style.display = 'block';
        document.getElementById('global-header').style.display = 'block';
        document.getElementById('global-footer').style.display = 'block';
        document.getElementById('about-view').style.display = 'block';
    } else if (viewName === 'services') {
        document.getElementById('marketing-container').style.display = 'block';
        document.getElementById('global-header').style.display = 'block';
        document.getElementById('global-footer').style.display = 'block';
        document.getElementById('services-view').style.display = 'block';
    } else if (viewName === 'contact') {
        document.getElementById('marketing-container').style.display = 'block';
        document.getElementById('global-header').style.display = 'block';
        document.getElementById('global-footer').style.display = 'block';
        document.getElementById('contact-view').style.display = 'block';
        
        // Invalidate Leaflet Map Size so it recalculates container dimensions after layout display
        setTimeout(() => {
            if (window.leafletMap) {
                window.leafletMap.invalidateSize();
            }
        }, 150);
    } else if (viewName === 'user-dashboard') {
        document.getElementById('marketing-container').style.display = 'none';
        document.getElementById('global-header').style.display = 'none';
        document.getElementById('global-footer').style.display = 'none';
        document.getElementById('user-dashboard-view').style.display = 'grid';
        
        // Initialize User Charts
        setTimeout(() => {
            initUserDashboardCharts();
        }, 100);
    } else if (viewName === 'admin-dashboard') {
        document.getElementById('marketing-container').style.display = 'none';
        document.getElementById('global-header').style.display = 'none';
        document.getElementById('global-footer').style.display = 'none';
        document.getElementById('admin-dashboard-view').style.display = 'grid';

        // Initialize Admin Charts
        setTimeout(() => {
            initAdminDashboardCharts();
        }, 100);
    }

    state.activeView = viewName;

    // Suppress header backdrop-filter blur flash during transition
    const header = document.getElementById('global-header');
    if (header) {
        header.style.backdropFilter = 'none';
        header.style.webkitBackdropFilter = 'none';
        setTimeout(() => {
            header.style.backdropFilter = '';
            header.style.webkitBackdropFilter = '';
        }, 120);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    // Sync menu highlighting for desktop, mobile, and dropdown elements
    document.querySelectorAll('.nav-link, .dropdown-item, .mobile-nav-link, .mobile-dropdown-item').forEach(link => {
        link.classList.remove('active');
    });
    
    // Highlight desktop links
    const desktopLinkMap = {
        'home1': 'go-home1',
        'home2': 'go-home2',
        'about': 'go-about',
        'services': 'go-services',
        'contact': 'go-contact',
        'user-dashboard': 'go-user-dash',
        'admin-dashboard': 'go-admin-dash'
    };
    const activeDesktopId = desktopLinkMap[viewName];
    if (activeDesktopId) {
        const item = document.getElementById(activeDesktopId);
        if (item) {
            item.classList.add('active');
            const parentDropdown = item.closest('.has-dropdown');
            if (parentDropdown) {
                const trigger = parentDropdown.querySelector('.nav-link');
                if (trigger) trigger.classList.add('active');
            }
        }
    }
    
    // Highlight mobile links
    const mobLinkMap = {
        'home1': 'mob-go-home1',
        'home2': 'mob-go-home2',
        'about': 'mob-go-about',
        'services': 'mob-go-services',
        'contact': 'mob-go-contact',
        'user-dashboard': 'mob-go-user-dash',
        'admin-dashboard': 'mob-go-admin-dash'
    };
    const activeMobId = mobLinkMap[viewName];
    if (activeMobId) {
        const item = document.getElementById(activeMobId);
        if (item) {
            item.classList.add('active');
            const parentLi = item.closest('.mobile-nav-item');
            if (parentLi) {
                const trigger = parentLi.querySelector('.mobile-nav-link');
                if (trigger) trigger.classList.add('active');
            }
        }
    }
}

function navigateToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToPlayer() {
    navigateToSection('home1-player');
}

// --- Theme & Layout Direction Management ---
function setupToggles() {
    // Theme buttons (Header & Dashboard & Mobile)
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('resonate_theme', state.theme);
            
            if (state.theme === 'light') {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                showToast("Switched to Light Theme", "accent");
            } else {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                showToast("Switched to Dark Theme");
            }

            // Sync Charts color scheme
            updateChartsThemeColors();
        });
    });

    // Direction buttons (Header & Dashboard & Mobile)
    document.querySelectorAll('.rtl-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.direction = state.direction === 'ltr' ? 'rtl' : 'ltr';
            localStorage.setItem('resonate_direction', state.direction);
            
            document.documentElement.setAttribute('dir', state.direction);
            if (state.direction === 'rtl') {
                document.body.classList.add('rtl-active');
                showToast("Switched direction to RTL", "accent");
            } else {
                document.body.classList.remove('rtl-active');
                showToast("Switched direction to LTR");
            }
        });
    });
}

// --- Dynamic Interactive Content Controllers ---
function toggleTranscript(id, event) {
    event.stopPropagation(); // Stop row click trigger
    const accordion = document.getElementById(id);
    if (accordion) {
        accordion.classList.toggle('open');
    }
}

function filterPodcastGrid(category) {
    const cards = document.querySelectorAll('.show-card');
    cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (category === 'all' || cat === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Accordion handler for FAQ Page
function toggleFaq(btn) {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');

    // Close all FAQs
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

    // Toggle selected FAQ
    if (!isOpen) {
        item.classList.add('open');
    }
}

// --- Authentications Flow ---
function openLoginModal(intendedRole = null) {
    const modal = document.getElementById('login-modal');
    modal.style.display = 'flex';
    
    // Intended role allows auto highlight/scrolling
    if (intendedRole) {
        switchAuthTab('login');
    }
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function switchAuthTab(tabName) {
    const loginTab = document.querySelector('.auth-tab:nth-child(1)');
    const regTab = document.querySelector('.auth-tab:nth-child(2)');
    const loginPanel = document.getElementById('auth-login-panel');
    const regPanel = document.getElementById('auth-register-panel');

    if (tabName === 'login') {
        loginTab.classList.add('active');
        regTab.classList.remove('active');
        loginPanel.style.display = 'block';
        regPanel.style.display = 'none';
    } else {
        regTab.classList.add('active');
        loginTab.classList.remove('active');
        regPanel.style.display = 'block';
        loginPanel.style.display = 'none';
    }
}

function mockLogin(role, email = '', username = '') {
    state.currentUser = role;
    localStorage.setItem('resonate_currentUser', role); // Save session!
    
    if (email) localStorage.setItem('resonate_currentEmail', email);
    if (username) {
        localStorage.setItem('resonate_currentUsername', username);
    } else if (email) {
        const parts = email.split('@');
        let name = role === 'admin' ? 'System Admin' : 'Premium Member';
        if (parts.length > 0) {
            name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
        localStorage.setItem('resonate_currentUsername', name);
    }
    
    let displayName = localStorage.getItem('resonate_currentUsername') || (role === 'admin' ? 'System Admin' : 'Premium Member');

    closeLoginModal();

    // Toggle Header buttons
    document.getElementById('header-login-btn').style.display = 'none';
    if (document.getElementById('drawer-login-btn')) document.getElementById('drawer-login-btn').style.display = 'none';
    
    const widget = document.getElementById('header-user-widget');
    widget.style.display = 'flex';

    const drawerWidget = document.getElementById('drawer-user-widget');
    if (drawerWidget) drawerWidget.style.display = 'flex';

    if (role === 'subscriber') {
        document.getElementById('header-username').textContent = displayName;
        document.getElementById('header-avatar-img').src = 'p6.jpg';
        if (document.getElementById('drawer-username')) document.getElementById('drawer-username').textContent = displayName;
        if (document.getElementById('drawer-avatar-img')) document.getElementById('drawer-avatar-img').src = 'p6.jpg';
        // Sync dashboard user profile widget
        const dbUserText = document.getElementById('dash-user-username');
        const dbUserImg = document.getElementById('dash-user-avatar');
        if (dbUserText) dbUserText.textContent = displayName;
        if (dbUserImg) dbUserImg.src = 'p6.jpg';
        
        // Personalize Dashboard Welcome Header
        const welcomeText = document.getElementById('user-welcome-name');
        if (welcomeText) welcomeText.textContent = displayName;

        showToast("Logged in as Premium Subscriber", "accent");
        navigateToView('user-dashboard');
    } else if (role === 'admin') {
        document.getElementById('header-username').textContent = displayName;
        document.getElementById('header-avatar-img').src = 'p7.jpg';
        if (document.getElementById('drawer-username')) document.getElementById('drawer-username').textContent = displayName;
        if (document.getElementById('drawer-avatar-img')) document.getElementById('drawer-avatar-img').src = 'p7.jpg';
        // Sync dashboard admin profile widget
        const dbAdminText = document.getElementById('dash-admin-username');
        const dbAdminImg = document.getElementById('dash-admin-avatar');
        if (dbAdminText) dbAdminText.textContent = displayName;
        if (dbAdminImg) dbAdminImg.src = 'p7.jpg';
        showToast("Logged in as Administrator");
        navigateToView('admin-dashboard');
    }
}

function logout() {
    state.currentUser = null;
    localStorage.removeItem('resonate_currentUser'); // Clear local storage!
    localStorage.removeItem('resonate_currentUsername');
    localStorage.removeItem('resonate_currentEmail');
    
    // Reset display names
    document.getElementById('header-username').textContent = 'Premium Member';
    if (document.getElementById('drawer-username')) document.getElementById('drawer-username').textContent = 'Premium Member';
    const dbUserText = document.getElementById('dash-user-username');
    if (dbUserText) dbUserText.textContent = 'Premium Member';
    const welcomeText = document.getElementById('user-welcome-name');
    if (welcomeText) welcomeText.textContent = 'Premium Subscriber';

    document.getElementById('header-login-btn').style.display = 'flex';
    if (document.getElementById('drawer-login-btn')) document.getElementById('drawer-login-btn').style.display = 'flex';
    document.getElementById('header-user-widget').style.display = 'none';
    if (document.getElementById('drawer-user-widget')) document.getElementById('drawer-user-widget').style.display = 'none';
    
    // Destroy charts to free memory
    destroyCharts();

    showToast("Logged out successfully");
    navigateToView('home1');
}

// --- Chart.js Graphics Configurations ---
function initDashboardChartsIfNeeded() {
    if (document.getElementById('userListeningChart') || document.getElementById('userCategoryChart')) {
        initUserDashboardCharts();
    }
    if (document.getElementById('adminSubscriberChart') || document.getElementById('adminPlatformChart')) {
        initAdminDashboardCharts();
    }
}

function initUserDashboardCharts() {
    const isDark = !document.body.classList.contains('light-theme');
    const colorGrid = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const colorText = isDark ? '#9ca3af' : '#4b5563';

    const listeningCanvas = document.getElementById('userListeningChart');
    const categoryCanvas = document.getElementById('userCategoryChart');
    if (!listeningCanvas || !categoryCanvas) return;

    if (typeof Chart === 'undefined') {
        renderFallbackUserCharts();
        return;
    }

    const listeningContext = listeningCanvas.getContext('2d');
    if (!listeningContext || !categoryCanvas.getContext('2d')) {
        renderFallbackUserCharts();
        return;
    }

    // 1. Listening line Chart
    const ctxListening = listeningContext;
    if (state.charts.listening) state.charts.listening.destroy();

    state.charts.listening = new Chart(ctxListening, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Listening Time (Mins)',
                data: [30, 45, 15, 60, 48, 90, 120],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: colorGrid }, ticks: { color: colorText } },
                y: { grid: { color: colorGrid }, ticks: { color: colorText } }
            }
        }
    });

    // 2. Category Donut Chart
    const ctxCategory = categoryCanvas.getContext('2d');
    if (state.charts.category) state.charts.category.destroy();

    state.charts.category = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: ['Tech', 'Audio Arts', 'Culture'],
            datasets: [{
                data: [45, 30, 25],
                backgroundColor: ['#8b5cf6', '#ec4899', '#3b82f6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colorText, boxWidth: 12, font: { family: 'Outfit' } }
                }
            }
        }
    });
}

function initAdminDashboardCharts() {
    const isDark = !document.body.classList.contains('light-theme');
    const colorGrid = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const colorText = isDark ? '#9ca3af' : '#4b5563';

    const subsCanvas = document.getElementById('adminSubscriberChart');
    const platformCanvas = document.getElementById('adminPlatformChart');
    if (!subsCanvas || !platformCanvas) return;

    if (typeof Chart === 'undefined') {
        renderFallbackAdminCharts();
        return;
    }

    const subsContext = subsCanvas.getContext('2d');
    const platformContext = platformCanvas.getContext('2d');
    if (!subsContext || !platformContext) {
        renderFallbackAdminCharts();
        return;
    }

    // 1. Subscriber Growth line chart
    const ctxSubs = subsContext;
    if (state.charts.subs) state.charts.subs.destroy();

    state.charts.subs = new Chart(ctxSubs, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Active Premium Subscribers',
                data: [4200, 4900, 5600, 6800, 7500, 8429],
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.05)',
                fill: true,
                tension: 0.3,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: colorGrid }, ticks: { color: colorText } },
                y: { grid: { color: colorGrid }, ticks: { color: colorText } }
            }
        }
    });

    // 2. Download Platform Pie chart
    const ctxPlatform = platformContext;
    if (state.charts.platform) state.charts.platform.destroy();

    state.charts.platform = new Chart(ctxPlatform, {
        type: 'pie',
        data: {
            labels: ['Spotify', 'Apple Podcasts', 'Web Player', 'Overcast'],
            datasets: [{
                data: [42, 35, 15, 8],
                backgroundColor: ['#1ed760', '#fc3c44', '#8b5cf6', '#f26522'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colorText, boxWidth: 12, font: { family: 'Outfit' } }
                }
            }
        }
    });
}

function renderFallbackUserCharts() {
    const listeningContainer = document.getElementById('userListeningChart')?.parentElement;
    const categoryContainer = document.getElementById('userCategoryChart')?.parentElement;

    if (listeningContainer) {
        listeningContainer.innerHTML = '<div class="chart-fallback chart-bars"><div class="bar" style="height: 32%"></div><div class="bar" style="height: 46%"></div><div class="bar" style="height: 28%"></div><div class="bar" style="height: 58%"></div><div class="bar" style="height: 48%"></div><div class="bar" style="height: 72%"></div><div class="bar" style="height: 92%"></div></div>';
    }

    if (categoryContainer) {
        categoryContainer.innerHTML = '<div class="chart-fallback chart-donut"><div class="donut-ring"></div><div class="chart-legend"><span><i style="background:#8b5cf6"></i>Tech</span><span><i style="background:#ec4899"></i>Audio</span><span><i style="background:#3b82f6"></i>Culture</span></div></div>';
    }
}

function renderFallbackAdminCharts() {
    const subsContainer = document.getElementById('adminSubscriberChart')?.parentElement;
    const platformContainer = document.getElementById('adminPlatformChart')?.parentElement;

    if (subsContainer) {
        subsContainer.innerHTML = '<div class="chart-fallback chart-bars"><div class="bar" style="height: 38%"></div><div class="bar" style="height: 48%"></div><div class="bar" style="height: 58%"></div><div class="bar" style="height: 68%"></div><div class="bar" style="height: 82%"></div><div class="bar" style="height: 94%"></div></div>';
    }

    if (platformContainer) {
        platformContainer.innerHTML = '<div class="chart-fallback chart-donut"><div class="donut-ring"></div><div class="chart-legend"><span><i style="background:#1ed760"></i>Spotify</span><span><i style="background:#fc3c44"></i>Apple</span><span><i style="background:#8b5cf6"></i>Web</span><span><i style="background:#f26522"></i>Overcast</span></div></div>';
    }
}

function updateChartsThemeColors() {
    const isDark = !document.body.classList.contains('light-theme');
    const colorGrid = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const colorText = isDark ? '#9ca3af' : '#4b5563';

    // Update active user charts
    if (state.charts.listening && state.charts.category) {
        // Listening scale updates
        state.charts.listening.options.scales.x.grid.color = colorGrid;
        state.charts.listening.options.scales.x.ticks.color = colorText;
        state.charts.listening.options.scales.y.grid.color = colorGrid;
        state.charts.listening.options.scales.y.ticks.color = colorText;
        state.charts.listening.update();

        // Category legend color update
        state.charts.category.options.plugins.legend.labels.color = colorText;
        state.charts.category.update();
    }

    // Update active admin charts
    if (state.charts.subs && state.charts.platform) {
        // Subs scale updates
        state.charts.subs.options.scales.x.grid.color = colorGrid;
        state.charts.subs.options.scales.x.ticks.color = colorText;
        state.charts.subs.options.scales.y.grid.color = colorGrid;
        state.charts.subs.options.scales.y.ticks.color = colorText;
        state.charts.subs.update();

        // Platform legend color update
        state.charts.platform.options.plugins.legend.labels.color = colorText;
        state.charts.platform.update();
    }
}

function destroyCharts() {
    Object.keys(state.charts).forEach(key => {
        if (state.charts[key]) {
            state.charts[key].destroy();
            state.charts[key] = null;
        }
    });
}

// --- Dashboard view tab navigation switching ---
function switchDashboardTab(tabId, btn) {
    // Hide all tab panels
    document.querySelectorAll('.dash-tab-panel').forEach(panel => panel.style.display = 'none');
    
    // De-activate links
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

    // Activate selected
    if (tabId === 'user-home') {
        document.getElementById('user-tab-home').style.display = 'block';
    } else if (tabId === 'user-feeds') {
        document.getElementById('user-tab-feeds').style.display = 'block';
    } else if (tabId === 'user-bonus') {
        document.getElementById('user-tab-bonus').style.display = 'block';
    } else if (tabId === 'user-video') {
        document.getElementById('user-tab-video').style.display = 'block';
    } else if (tabId === 'user-merch') {
        document.getElementById('user-tab-merch').style.display = 'block';
    }

    // Highlight the correct sidebar link
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const onclickAttr = link.getAttribute('onclick') || '';
        if (onclickAttr.includes(`'${tabId}'`)) {
            link.classList.add('active');
        }
    });

    if (btn) btn.classList.add('active');

    // Auto-close sidebar drawer on mobile
    closeDashSidebar();
}

function switchAdminTab(tabId, btn) {
    // Hide all tab panels
    document.querySelectorAll('.dash-tab-panel').forEach(panel => panel.style.display = 'none');
    
    // De-activate links
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

    // Activate selected
    if (tabId === 'admin-home') {
        document.getElementById('admin-tab-home').style.display = 'block';
    } else if (tabId === 'admin-shows') {
        document.getElementById('admin-tab-shows').style.display = 'block';
    } else if (tabId === 'admin-subs') {
        document.getElementById('admin-tab-subs').style.display = 'block';
    } else if (tabId === 'admin-feedback') {
        document.getElementById('admin-tab-feedback').style.display = 'block';
    }

    // Highlight the correct sidebar link
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const onclickAttr = link.getAttribute('onclick') || '';
        if (onclickAttr.includes(`'${tabId}'`)) {
            link.classList.add('active');
        }
    });

    if (btn) btn.classList.add('active');

    // Auto-close sidebar drawer on mobile
    closeDashSidebar();
}

// --- Admin Dashboard actions ---
function renderAdminEpisodesTable() {
    const tbody = document.getElementById('admin-episodes-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    state.episodes.forEach(ep => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${ep.id}</td>
            <td><img src="${ep.cover}" alt="Show cover"></td>
            <td><strong>${ep.show}</strong></td>
            <td>${ep.title}</td>
            <td><code>${ep.length}</code></td>
            <td>
                <button class="btn btn-secondary btn-small" style="margin-inline-end:5px;" onclick="editEpisodePrompt(${ep.id})"><i data-lucide="edit-2" style="width:14px; height:14px; vertical-align:middle;"></i> Edit</button>
                <button class="btn btn-accent btn-small" onclick="deleteEpisode(${ep.id})"><i data-lucide="trash-2" style="width:14px; height:14px; vertical-align:middle;"></i> Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Re-create icons in dynamically populated table rows
    lucide.createIcons();
}

function deleteEpisode(id) {
    state.episodes = state.episodes.filter(ep => ep.id !== id);
    renderAdminEpisodesTable();
    showToast(`Deleted Episode #${id} from Database`);
}

function editEpisodePrompt(id) {
    const ep = state.episodes.find(e => e.id === id);
    if (!ep) return;

    const newTitle = prompt("Edit Episode Title:", ep.title);
    if (newTitle) {
        ep.title = newTitle;
        renderAdminEpisodesTable();
        showToast(`Updated Episode #${id} Details`);
    }
}

function createNewEpisodePrompt() {
    const show = prompt("Select Podcast Show (e.g. The Daily Byte):", "The Daily Byte");
    if (!show) return;
    const title = prompt("Enter Episode Title (e.g. EP 125: WebGPU Standards):");
    if (!title) return;
    const length = prompt("Enter Episode Length (e.g. 50:15):", "50:00");
    if (!length) return;

    const nextId = state.episodes.length > 0 ? Math.max(...state.episodes.map(e => e.id)) + 1 : 1;
    
    // Mock cover mapping
    let cover = 'p1.jpg';
    if (show.toLowerCase().includes('sound')) cover = 'p2.jpg';
    else if (show.toLowerCase().includes('wave')) cover = 'p3.jpg';
    else if (show.toLowerCase().includes('crime')) cover = 'p4.jpg';

    state.episodes.push({
        id: nextId,
        cover: cover,
        show: show,
        title: title,
        length: length
    });

    renderAdminEpisodesTable();
    showToast(`Successfully added "${title}" to Show Manager`, "accent");
}

function approvePitch(showName) {
    showToast(`Approved "${showName}" invitation! Sending onboarding pack.`);
}

function approveBooking(bookingDetails) {
    showToast(`Confirmed slot reservation booking: "${bookingDetails}"`);
}

function dismissFeedback(btn) {
    const card = btn.closest('.feedback-item-card');
    if (card) {
        card.style.opacity = '0';
        setTimeout(() => {
            card.remove();
            showToast("Archived notification feedback item");
        }, 300);
    }
}

// --- Lightbox / Modals Media Players ---
function openGalleryModal(imgSrc, captionText) {
    const modal = document.getElementById('gallery-modal');
    const img = document.getElementById('gallery-lightbox-img');
    const caption = document.getElementById('gallery-lightbox-caption');

    img.src = imgSrc;
    caption.textContent = captionText;
    modal.style.display = 'flex';
}

function closeGalleryModal() {
    document.getElementById('gallery-modal').style.display = 'none';
}

function openVideoPlayer(imgSrc, videoTitle) {
    const modal = document.getElementById('video-modal');
    const img = document.getElementById('video-player-img');
    const title = document.getElementById('video-lightbox-title');

    img.src = imgSrc;
    title.textContent = videoTitle;
    modal.style.display = 'flex';
    showToast(`Streaming Premium Video: ${videoTitle}`, "accent");
}

function closeVideoPlayer() {
    document.getElementById('video-modal').style.display = 'none';
}

function triggerTeaserVideo() {
    openVideoPlayer('p14.jpg', 'Studio Teaser Session - Behind the Scenes EP 100');
}

// --- Form Submissions Controllers ---
function setupFormHandlers() {
    // Add custom handler to auth standard email form
    const loginForm = document.querySelector('#auth-login-panel form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            // Mock profile routing
            const parts = email.split('@');
            let name = email.includes('admin') ? 'System Admin' : 'Premium Member';
            if (parts.length > 0) {
                name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
            if (email.includes('admin')) {
                mockLogin('admin', email, name);
            } else {
                mockLogin('subscriber', email, name);
            }
        });
    }

    const regForm = document.querySelector('#auth-register-panel form');
    if (regForm) {
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('reg-name');
            const emailInput = document.getElementById('reg-email');
            const name = nameInput ? nameInput.value : 'Premium Member';
            const email = emailInput ? emailInput.value : '';
            mockLogin('subscriber', email, name);
        });
    }
}

function handleFormSubmit(event, formType) {
    event.preventDefault();
    showToast(`Form Submitted: ${formType} request processed.`, "accent");
    event.target.reset();
}

// --- Interactive Toast Notification System ---
function showToast(message, type = "normal") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === "accent" ? "toast-accent" : ""}`;
    
    const iconName = type === "accent" ? "sparkles" : "info";
    
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    
    // Render icon
    lucide.createIcons();

    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(15px)';
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied discount promo code!", "accent");
    }).catch(err => {
        console.log("Copy failed: ", err);
    });
}

function copyTextFromInput(id) {
    const input = document.getElementById(id);
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            showToast("Copied premium RSS feed link!", "accent");
        });
    }
}

function setCalReminder(title) {
    showToast(`Set calendar RSVP reminder for "${title}"`, "accent");
}

function addMerchToCart(title) {
    showToast(`Added to cart: ${title}. Claimed discount!`, "accent");
}

function playMockPreview(title) {
    showToast(`Playing 10s preview snippet: "${title}"`, "accent");
    state.audioPlayer.currentTime = 5;
    state.audioPlayer.play().catch(e => console.log(e));
}

function playDashboardEpisode(title) {
    showToast(`Streaming premium subscriber episode: "${title}"`, "accent");
    state.audioPlayer.currentTime = 10;
    state.audioPlayer.play().catch(e => console.log(e));
}

function showDownloadToast(fileName) {
    showToast(`Downloading asset: ${fileName} file.`, "accent");
}

function showRssToast(e) {
    e.preventDefault();
    showToast("Login to Premium dashboard to get your custom RSS feeds!", "accent");
}

function showPressToast(e) {
    e.preventDefault();
    showToast("Press kit media assets bundle download started...", "accent");
}

// --- Helper Functions ---
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Leaflet Map Initialization ---
function initLeafletMap() {
    const mapContainer = document.getElementById('contact-leaflet-map');
    if (!mapContainer) return;

    // Initialize Leaflet map centered at New York Arts district coordinate
    const leafletMap = L.map('contact-leaflet-map', {
        zoomControl: true,
        scrollWheelZoom: false
    }).setView([40.7128, -74.0060], 15);

    // Dark Theme CartoDB style tile layer matches dark neon palette of Resonate SPA
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(leafletMap);

    // Marker with stylized premium popup
    const marker = L.marker([40.7128, -74.0060]).addTo(leafletMap);
    marker.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; color: #1f2937; line-height: 1.4;">
            <h4 style="margin: 0 0 4px; color: #8b5cf6; font-family: 'Righteous'; font-size: 1.1rem; letter-spacing: 0.5px;">RESONATE HQ</h4>
            <p style="margin: 0; font-size: 0.85rem; color: #4b5563;">842 Acoustic Ave, Suite 300<br>Downtown Arts District</p>
        </div>
    `).openPopup();

    // Expose to window for invalidateSize transitions
    window.leafletMap = leafletMap;
}

// --- Redesigned Ops Console Diagnostic Ping ---
function pingOpsServer() {
    const indicator = document.getElementById('ping-latency');
    const text = document.getElementById('latency-text');
    if (indicator && text) {
        indicator.style.display = 'inline-flex';
        text.textContent = 'Pinging system routes...';
        setTimeout(() => {
            const randomPing = Math.floor(Math.random() * 12) + 8; // 8ms to 20ms
            text.textContent = `Ping: ${randomPing}ms (Network Stable)`;
            showToast(`Platform Diagnostics: Latency is ${randomPing}ms. All endpoints operational.`, "accent");
        }, 800);
    }
}

// --- Dashboard Sidebar Mobile Toggle Operations ---
function toggleDashSidebar() {
    const sidebarUser = document.querySelector('#user-dashboard-view .dash-sidebar');
    const sidebarAdmin = document.querySelector('#admin-dashboard-view .dash-sidebar');
    const backdrop = document.getElementById('dash-sidebar-backdrop');
    
    let activeSidebar = null;
    if (document.getElementById('user-dashboard-view').style.display !== 'none') {
        activeSidebar = sidebarUser;
    } else if (document.getElementById('admin-dashboard-view').style.display !== 'none') {
        activeSidebar = sidebarAdmin;
    }
    
    if (activeSidebar && backdrop) {
        const isOpen = activeSidebar.classList.contains('open');
        if (!isOpen) {
            activeSidebar.classList.add('open');
            backdrop.style.display = 'block';
            setTimeout(() => {
                backdrop.classList.add('visible');
            }, 10);
        } else {
            activeSidebar.classList.remove('open');
            backdrop.classList.remove('visible');
            setTimeout(() => {
                backdrop.style.display = 'none';
            }, 300);
        }
    }
}

function closeDashSidebar() {
    document.querySelectorAll('.dash-sidebar').forEach(sidebar => sidebar.classList.remove('open'));
    const backdrop = document.getElementById('dash-sidebar-backdrop');
    if (backdrop) {
        backdrop.classList.remove('visible');
        setTimeout(() => {
            backdrop.style.display = 'none';
        }, 300);
    }
}
