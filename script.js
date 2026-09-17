/*
 * BEHIND THE MAGIC CURTAIN - CORE ENGINE (V3.3)
 * On-Brand Floating Toasts, Whole-Card Click Architecture, Global Search & Dynamic Renderers
 */

let dlpAttractionsCache = [];
let userCustomRatings = {};
try {
    const rawRatings = localStorage.getItem('btmc_user_dlp_ratings');
    userCustomRatings = rawRatings ? JSON.parse(rawRatings) : {};
} catch (e) {
    console.warn('Could not read user ratings from localStorage:', e);
    userCustomRatings = {};
}
let btmcToastTimer = null;

// --- 0. BTMC Cookie Consent & Analytics Governance Manager ---
document.addEventListener("DOMContentLoaded", function () {
    const consentStatus = localStorage.getItem("btmc_cookie_consent");

    if (!consentStatus) {
        showCookieBanner();
    } else if (consentStatus === "accepted") {
        loadGoogleAnalytics();
    }

    initDynamicNavigation();
    initGlobalSearchTray();
    initGlobalFooter();
    initDynamicPages();
    initSwiperGalleries();
});

function showCookieBanner() {
    const banner = document.createElement("div");
    banner.id = "btmc-cookie-banner";
    banner.innerHTML = `
        <div style="position: fixed; bottom: 0; left: 0; width: 100%; background: #1a1a1a; color: #fff; padding: 15px 20px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; z-index: 9999; font-family: 'Poppins', sans-serif; box-shadow: 0 -4px 10px rgba(0,0,0,0.3); border-top: 3px solid #00838f;">
            <div style="flex: 1; min-width: 280px; margin-right: 15px; font-size: 0.9rem;">
                We use cookies to enhance your experience and analyze site traffic. Read our <a href="privacy.html" style="color: #ffd700; text-decoration: underline;">Privacy & Cookie Policy</a>.
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button id="btmc-accept-cookies" style="background: #00838f; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">Accept All</button>
                <button id="btmc-reject-cookies" style="background: #333; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Reject</button>
            </div>
        </div>
    `;
    document.body.appendChild(banner);

    document.getElementById("btmc-accept-cookies").addEventListener("click", function () {
        localStorage.setItem("btmc_cookie_consent", "accepted");
        loadGoogleAnalytics();
        banner.remove();
    });

    document.getElementById("btmc-reject-cookies").addEventListener("click", function () {
        localStorage.setItem("btmc_cookie_consent", "rejected");
        banner.remove();
    });
}

function loadGoogleAnalytics() {
    // Dynamically inject GA4 script safely after consent
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-CPHCSFHVJK";
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-CPHCSFHVJK');
}

/* --- 1. On-Brand Toast System (Replaces window.alert) --- */
function showBtmcToast(message, type = 'toast-success', duration = 4000) {
    let toast = document.getElementById('btmc-global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'btmc-global-toast';
        document.body.appendChild(toast);
    }

    if (btmcToastTimer) clearTimeout(btmcToastTimer);

    let icon = '<i class="fa-solid fa-circle-check" style="color:var(--color-secondary);"></i>';
    if (type === 'toast-error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    if (type === 'toast-info') icon = '<i class="fa-solid fa-circle-info" style="color:var(--color-secondary);"></i>';

    toast.className = `show ${type}`;
    toast.innerHTML = `${icon} <span>${message}</span>`;

    btmcToastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}
window.showBtmcToast = showBtmcToast;

function saveRatingsToDevice() {
    try {
        if (!userCustomRatings || typeof userCustomRatings !== 'object') {
            userCustomRatings = {};
        }
        localStorage.setItem('btmc_user_dlp_ratings', JSON.stringify(userCustomRatings));
        const count = Object.keys(userCustomRatings).length;
        if (count > 0) {
            showBtmcToast(`Saved ${count} custom sensory rating${count === 1 ? '' : 's'} to your device!`, 'toast-success');
        } else {
            showBtmcToast("Disneyland Paris sensory ratings saved to your device!", 'toast-success');
        }
    } catch (e) {
        console.error('Failed saving ratings to localStorage:', e);
        showBtmcToast("Could not save ratings. Please check storage permissions.", "toast-error");
    }
}
window.saveRatingsToDevice = saveRatingsToDevice;

/* --- 2. Dynamic Nav Controller --- */
async function initDynamicNavigation() {
    const navUl = document.querySelector('.main-nav ul');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    try {
        const res = await fetch('data/navigation.json');
        if (res.ok) {
            const navData = await res.json();
            if (navUl && navData.items) {
                navUl.innerHTML = navData.items
                    .filter(item => item.enabled)
                    .map(item => `<li><a href="${item.url}" class="${currentPath === item.url ? 'active' : ''}">${item.title}</a></li>`)
                    .join('');
            }
        }
    } catch (e) {
        console.warn('Navigation fallback:', e);
    }

    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const tray = document.getElementById('btmc-search-tray');
            if (tray && tray.classList.contains('active')) toggleSearchTray(false);
            mainNav.classList.toggle('nav-open');
        });

        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('nav-open') && !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
                mainNav.classList.remove('nav-open');
            }
        });
    }
}

/* --- 3. Internal Search Engine Tray --- */
function initGlobalSearchTray() {
    const siteHeader = document.querySelector('.site-header');
    if (!siteHeader) return;

    let searchBtn = document.getElementById('btn-global-search-trigger');
    if (!searchBtn) {
        const navContainer = siteHeader.querySelector('.container');
        if (navContainer) {
            searchBtn = document.createElement('button');
            searchBtn.id = 'btn-global-search-trigger';
            searchBtn.className = 'header-search-btn';
            searchBtn.setAttribute('aria-label', 'Toggle Search Tray');
            searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
            navContainer.appendChild(searchBtn);
        }
    }

    if (!document.getElementById('btmc-search-tray')) {
        const trayHtml = `
            <div id="btmc-search-tray" class="search-dropdown-tray">
                <div class="container">
                    <div class="search-tray-inner">
                        <div class="search-input-wrap">
                            <i class="fa-solid fa-magnifying-glass search-field-icon"></i>
                            <input type="search" id="global-search-input" placeholder="Search shows, relaxed venues, sensory guides..." autocomplete="off">
                            <button type="button" id="close-search-tray-btn" class="search-close-btn" aria-label="Close search">&times;</button>
                        </div>
                        <div id="global-search-results" class="search-results-dropdown" style="display:none;"></div>
                    </div>
                </div>
            </div>
        `;
        siteHeader.insertAdjacentHTML('afterend', trayHtml);

        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tray = document.getElementById('btmc-search-tray');
            toggleSearchTray(!tray.classList.contains('active'));
        });

        document.getElementById('close-search-tray-btn').addEventListener('click', () => toggleSearchTray(false));
        document.getElementById('global-search-input').addEventListener('input', debounceSearch(handleGlobalSearchInput, 250));

        document.addEventListener('click', (e) => {
            const tray = document.getElementById('btmc-search-tray');
            if (tray && tray.classList.contains('active') && !tray.contains(e.target) && !searchBtn.contains(e.target)) {
                toggleSearchTray(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') toggleSearchTray(false);
        });
    }
}

function toggleSearchTray(open) {
    const tray = document.getElementById('btmc-search-tray');
    const input = document.getElementById('global-search-input');
    const results = document.getElementById('global-search-results');
    const triggerBtn = document.getElementById('btn-global-search-trigger');
    const mainNav = document.querySelector('.main-nav');

    if (!tray) return;

    if (open) {
        if (mainNav && mainNav.classList.contains('nav-open')) mainNav.classList.remove('nav-open');
        tray.classList.add('active');
        if (triggerBtn) triggerBtn.classList.add('active');
        setTimeout(() => input.focus(), 150);
    } else {
        tray.classList.remove('active');
        if (triggerBtn) triggerBtn.classList.remove('active');
        input.value = '';
        results.style.display = 'none';
        results.innerHTML = '';
    }
}

function debounceSearch(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

async function handleGlobalSearchInput(e) {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('global-search-results');
    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
        return;
    }

    resultsContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<p class="search-msg"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</p>';

    try {
        const [reviews, whatson, theatres, news, dlp] = await Promise.all([
            fetch('data/reviews.json').then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('data/whatson.json').then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('data/theatres.json').then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('data/news.json').then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('data/disneyland.json').then(r => r.ok ? r.json() : [])
        ]);

        let matches = [];

        reviews.forEach(r => {
            if (r.status === 'draft') return;
            if (`${r.title} ${r.summary} ${r.subtitle || ''}`.toLowerCase().includes(query)) {
                matches.push({ type: 'Review', title: r.title, desc: r.summary, url: r.slug, badge: `${r.rating}★ Review` });
            }
        });

        whatson.forEach(w => {
            if (`${w.title} ${w.venue} ${w.desc}`.toLowerCase().includes(query)) {
                matches.push({ type: "What's On", title: w.title, desc: `${w.venue} • ${w.dates}`, url: `whats-on.html?q=${encodeURIComponent(w.title)}`, badge: 'Live Show' });
            }
        });

        theatres.forEach(t => {
            if (`${t.name} ${t.location} ${t.accessibility} ${t.relaxed || ''}`.toLowerCase().includes(query)) {
                matches.push({ type: 'Theatre Guide', title: t.name, desc: `${t.location} - ${t.accessibility.substring(0, 80)}...`, url: `theatre-guide.html?q=${encodeURIComponent(t.name)}`, badge: 'Venue' });
            }
        });

        news.forEach(n => {
            if (n.status === 'draft') return;
            if (`${n.title} ${n.summary} ${n.category || ''}`.toLowerCase().includes(query)) {
                matches.push({ type: 'News', title: n.title, desc: n.summary, url: n.slug, badge: n.category || 'News' });
            }
        });

        dlp.forEach(d => {
            if (`${d.name} ${d.land} ${d.sensoryNotes || ''} ${d.adhdTip || ''}`.toLowerCase().includes(query)) {
                matches.push({ type: 'Disneyland Paris', title: d.name, desc: `${d.park} (${d.land}) - ${d.sensoryNotes || ''}`, url: `disneyland-paris.html?q=${encodeURIComponent(d.name)}#interactive-rater`, badge: 'DLP Sensory' });
            }
        });

        if (matches.length === 0) {
            resultsContainer.innerHTML = `<p class="search-msg">No results found for "<strong>${query}</strong>".</p>`;
            return;
        }

        resultsContainer.innerHTML = matches.slice(0, 8).map(m => `
            <a href="${m.url}" class="search-result-card">
                <div class="result-header">
                    <span class="result-title">${m.title}</span>
                    <span class="result-badge">${m.badge}</span>
                </div>
                <p class="result-desc">${m.desc}</p>
            </a>
        `).join('');

    } catch (err) {
        resultsContainer.innerHTML = `<p class="search-msg" style="color:var(--color-primary);">Search error. Please try again.</p>`;
    }
}

/* --- 4. Dynamic Page Switcher --- */
function initDynamicPages() {
    if (document.getElementById('home-featured-grid') || document.querySelector('.home-featured #home-featured-grid')) loadFeaturedReviews();
    if (document.getElementById('home-featured-whatson-grid')) loadFeaturedWhatsOn();
    if (document.getElementById('home-featured-news-grid')) loadFeaturedNews();
    if (document.querySelector('#all-reviews-grid')) loadReviewsDirectory();
    if (document.querySelector('#whatson-list')) loadWhatsOnDirectory();
    if (document.querySelector('#theatre-list')) loadTheatreGuideDirectory();
    if (document.querySelector('#news-feed-list')) loadNewsDirectory();
    if (document.querySelector('#panto-list')) loadPantomimeDirectory();
    if (document.querySelector('#dlp-rater-list')) initInteractiveDisneylandRater();
}

/* --- 5. Interactive Disneyland Paris Rater Engine --- */
async function initInteractiveDisneylandRater() {
    const container = document.getElementById('dlp-rater-list');
    const searchInput = document.getElementById('dlp-rater-search');
    const filterBtns = document.querySelectorAll('.rater-controls-bar .filter-btn');
    if (!container) return;

    try {
        const res = await fetch('data/disneyland.json');
        if (!res.ok) throw new Error('Could not load Disneyland database');
        dlpAttractionsCache = await res.json();

        updateCustomRatedCount();

        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        if (queryParam && searchInput) searchInput.value = queryParam;

        let currentFilter = 'all';

        const render = () => {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

            const filtered = dlpAttractionsCache.filter(item => {
                const matchesType = currentFilter === 'all' || item.type === currentFilter;
                const matchesText = `${item.name} ${item.park} ${item.land} ${item.sensoryNotes || ''} ${item.adhdTip || ''}`.toLowerCase().includes(query);
                return matchesType && matchesText;
            });

            if (filtered.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#777; margin:40px 0;">No matching attractions found.</p>';
                return;
            }

            container.innerHTML = filtered.map(item => buildInteractiveRaterCard(item)).join('');
        };

        render();

        if (searchInput) searchInput.addEventListener('input', render);

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter');
                render();
            });
        });

    } catch (err) {
        container.innerHTML = `<p style="text-align:center; color:#bd2419;">Failed to load Disneyland guide: ${err.message}</p>`;
    }
}

function buildInteractiveRaterCard(item) {
    const saved = userCustomRatings[item.id] || {};
    const speedVal = saved.speed !== undefined ? saved.speed : item.thrillLevel;
    const fearVal = saved.fear !== undefined ? saved.fear : item.fearFactor;
    const noiseVal = saved.noise !== undefined ? saved.noise : item.noiseLevel;
    const darkVal = saved.dark !== undefined ? saved.dark : item.darkness;

    return `
    <article class="rater-card" id="card-${item.id}">
        <div class="rater-card-left">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <h3>${item.name}</h3>
                <span class="tag tag-age">${item.minHeight === 'None' ? 'All Heights' : item.minHeight}</span>
            </div>
            <span class="rater-park-tag"><i class="fa-solid fa-map-pin" style="color:var(--color-primary);"></i> ${item.park} • ${item.land}</span>
            <p class="rater-desc-box">${item.sensoryNotes || ''}</p>
            ${item.adhdTip ? `<div class="rater-adhd-box"><strong>Sensory Strategy:</strong> ${item.adhdTip}</div>` : ''}
        </div>
        <div class="rater-card-right">
            <div class="slider-group">
                <div class="slider-header">
                    <span>🚀 Speed / Motion</span>
                    <span class="slider-val-badge" id="val-${item.id}-speed">${speedVal} / 5 (Base: ${item.thrillLevel})</span>
                </div>
                <input type="range" class="custom-range-slider" min="1" max="5" step="1" value="${speedVal}" oninput="updateSliderRating('${item.id}', 'speed', this.value, ${item.thrillLevel})">
                <div class="slider-legend"><span>1: Gentle / Static</span><span>5: Intense Thrill</span></div>
            </div>
            <div class="slider-group">
                <div class="slider-header">
                    <span>👻 Fear / Spookiness</span>
                    <span class="slider-val-badge" id="val-${item.id}-fear">${fearVal} / 5 (Base: ${item.fearFactor})</span>
                </div>
                <input type="range" class="custom-range-slider" min="1" max="5" step="1" value="${fearVal}" oninput="updateSliderRating('${item.id}', 'fear', this.value, ${item.fearFactor})">
                <div class="slider-legend"><span>1: Cheerful</span><span>5: Scary / Jumps</span></div>
            </div>
            <div class="slider-group">
                <div class="slider-header">
                    <span>🔊 Noise Level</span>
                    <span class="slider-val-badge" id="val-${item.id}-noise">${noiseVal} / 5 (Base: ${item.noiseLevel})</span>
                </div>
                <input type="range" class="custom-range-slider" min="1" max="5" step="1" value="${noiseVal}" oninput="updateSliderRating('${item.id}', 'noise', this.value, ${item.noiseLevel})">
                <div class="slider-legend"><span>1: Quiet / Soft</span><span>5: Loud / Pyros</span></div>
            </div>
            <div class="slider-group">
                <div class="slider-header">
                    <span>🌑 Darkness</span>
                    <span class="slider-val-badge" id="val-${item.id}-dark">${darkVal} / 5 (Base: ${item.darkness})</span>
                </div>
                <input type="range" class="custom-range-slider" min="1" max="5" step="1" value="${darkVal}" oninput="updateSliderRating('${item.id}', 'dark', this.value, ${item.darkness})">
                <div class="slider-legend"><span>1: Daylight</span><span>5: Total Darkness</span></div>
            </div>
        </div>
    </article>`;
}

function updateSliderRating(id, metric, value, baseVal) {
    const intVal = parseInt(value);
    if (!userCustomRatings[id]) {
        const original = dlpAttractionsCache.find(a => a.id === id);
        userCustomRatings[id] = {
            name: original ? original.name : id,
            speed: original ? original.thrillLevel : 3,
            fear: original ? original.fearFactor : 3,
            noise: original ? original.noiseLevel : 3,
            dark: original ? original.darkness : 3
        };
    }
    userCustomRatings[id][metric] = intVal;
    localStorage.setItem('btmc_user_dlp_ratings', JSON.stringify(userCustomRatings));

    const badge = document.getElementById(`val-${id}-${metric}`);
    if (badge) badge.textContent = `${intVal} / 5 (Base: ${baseVal})`;
    updateCustomRatedCount();
}

function updateCustomRatedCount() {
    const count = Object.keys(userCustomRatings).length;
    const badge = document.getElementById('custom-rated-count');
    if (badge) badge.textContent = `${count} Custom Rated`;
}

/* --- 6. What's On Directory --- */
async function loadWhatsOnDirectory() {
    const container = document.getElementById('whatson-list');
    const searchInput = document.getElementById('whatson-search-input');
    const searchClearBtn = document.getElementById('whatson-search-clear');
    const filterSection = document.getElementById('whatson-filter-section');
    const toggleBtn = document.getElementById('whatson-filter-toggle');
    const filterPanel = document.getElementById('whatson-filter-panel');
    const activeBadge = document.getElementById('whatson-active-badge');
    const activeChipsContainer = document.getElementById('whatson-active-chips');
    const panelCloseBtn = document.getElementById('whatson-panel-close-btn');
    const panelResetBtn = document.getElementById('whatson-panel-reset-btn');
    const collapsedCount = document.getElementById('whatson-collapsed-count');
    const typeButtons = document.querySelectorAll('#whatson-type-buttons .filter-btn');
    const locationButtons = document.querySelectorAll('#whatson-location-buttons .filter-btn');
    const ageButtons = document.querySelectorAll('#whatson-age-buttons .filter-btn');
    const resultsCount = document.getElementById('whatson-results-count');
    const clearAllBtn = document.getElementById('whatson-clear-all');

    if (!container) return;

    try {
        const res = await fetch('data/whatson.json');
        if (!res.ok) throw new Error('Could not load What\'s On');
        const shows = await res.json();
        const today = new Date().toISOString().split('T')[0];

        const activeShows = shows
            .filter(s => s.status !== 'draft' && (!s.expiryDate || s.expiryDate >= today))
            .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));

        const schemaData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": activeShows.map((s, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "TheaterEvent",
                    "name": s.title,
                    "description": (s.desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                    "url": s.siteLink || `https://behindthemagiccurtain.co.uk/whats-on.html?q=${encodeURIComponent(s.title)}`,
                    "location": {
                        "@type": "Place",
                        "name": s.venue,
                        "address": {
                            "@type": "PostalAddress",
                            "addressRegion": s.region || "West Midlands"
                        }
                    }
                }
            }))
        };
        
        const scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.text = JSON.stringify(schemaData);
        document.head.appendChild(scriptTag);

        let selectedType = 'all';
        let selectedLocation = 'all';
        let selectedAge = 'all';

        // Collapsible Drawer State & Controls
        let isPinnedOpen = false;
        let hoverTimeout = null;

        const openPanel = (pinned = false) => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            if (filterPanel) filterPanel.classList.add('open');
            if (toggleBtn) {
                toggleBtn.classList.add('open');
                toggleBtn.setAttribute('aria-expanded', 'true');
            }
            if (pinned) isPinnedOpen = true;
        };

        const closePanel = () => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            if (filterPanel) filterPanel.classList.remove('open');
            if (toggleBtn) {
                toggleBtn.classList.remove('open');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
            isPinnedOpen = false;
        };

        // Click to Toggle / Pin Open
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (filterPanel && filterPanel.classList.contains('open')) {
                    closePanel();
                } else {
                    openPanel(true);
                }
            });
        }

        // Close on "Done" button
        if (panelCloseBtn) {
            panelCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closePanel();
            });
        }

        // Hover Behavior for Desktop
        const canHover = window.matchMedia('(hover: hover)').matches;
        if (canHover && filterSection && filterPanel) {
            const handleMouseEnter = () => {
                if (hoverTimeout) clearTimeout(hoverTimeout);
                openPanel(false);
            };

            const handleMouseLeave = () => {
                if (!isPinnedOpen) {
                    hoverTimeout = setTimeout(() => {
                        if (!isPinnedOpen) closePanel();
                    }, 350);
                }
            };

            if (toggleBtn) {
                toggleBtn.addEventListener('mouseenter', handleMouseEnter);
                toggleBtn.addEventListener('mouseleave', handleMouseLeave);
            }
            filterPanel.addEventListener('mouseenter', handleMouseEnter);
            filterPanel.addEventListener('mouseleave', handleMouseLeave);
        }

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (filterPanel && filterPanel.classList.contains('open')) {
                if (filterSection && !filterSection.contains(e.target)) {
                    closePanel();
                }
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && filterPanel && filterPanel.classList.contains('open')) {
                closePanel();
            }
        });

        // Search clear button
        if (searchClearBtn && searchInput) {
            searchClearBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchClearBtn.style.display = 'none';
                searchInput.focus();
                render();
            });
        }

        // Read URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        if (queryParam && searchInput) {
            searchInput.value = queryParam;
        }
        const typeParam = urlParams.get('type');
        if (typeParam) {
            selectedType = typeParam;
            typeButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-type') === typeParam));
        }
        const locParam = urlParams.get('location');
        if (locParam) {
            selectedLocation = locParam;
            locationButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-location') === locParam));
        }
        const ageParam = urlParams.get('age');
        if (ageParam) {
            selectedAge = ageParam;
            ageButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-age') === ageParam));
        }

        const render = () => {
            const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

            // Toggle clear search button visibility
            if (searchClearBtn) {
                searchClearBtn.style.display = q.length > 0 ? 'inline-flex' : 'none';
            }

            const filtered = activeShows.filter(s => {
                // 1. Text Search Filter
                if (q) {
                    const text = `${s.title} ${s.venue} ${s.dates} ${s.region || ''} ${s.desc || ''}`.toLowerCase();
                    if (!text.includes(q)) return false;
                }

                // 2. Type of Performance Filter
                if (selectedType !== 'all') {
                    const cat = (s.category || '').toLowerCase();
                    const title = (s.title || '').toLowerCase();
                    const desc = (s.desc || '').toLowerCase();
                    if (selectedType === 'panto') {
                        const isPanto = cat === 'panto' || title.includes('panto') || desc.includes('pantomime');
                        if (!isPanto) return false;
                    } else if (selectedType === 'musical') {
                        const isMusical = cat === 'musical' || title.includes('musical') || desc.includes('musical');
                        if (!isMusical) return false;
                    } else if (selectedType === 'theatre') {
                        const isOtherSpecialty = ['panto', 'musical', 'dance', 'circus'].includes(cat);
                        if (isOtherSpecialty) return false;
                    } else if (selectedType === 'dance') {
                        const isDance = ['dance', 'circus', 'ballet'].includes(cat) || desc.includes('dance') || desc.includes('ballet') || desc.includes('circus');
                        if (!isDance) return false;
                    }
                }

                // 3. Location Filter
                if (selectedLocation !== 'all') {
                    const reg = (s.region || '').toLowerCase();
                    const ven = (s.venue || '').toLowerCase();
                    if (selectedLocation === 'midlands') {
                        const isMidlands = reg.includes('midlands') || ['birmingham', 'wolverhampton', 'lichfield', 'belgrade', 'coventry', 'stafford'].some(c => ven.includes(c));
                        if (!isMidlands) return false;
                    } else if (selectedLocation === 'london') {
                        const isLondon = reg.includes('london') || ['london', 'west end', 'savoy'].some(c => ven.includes(c));
                        if (!isLondon) return false;
                    } else if (selectedLocation === 'tour') {
                        const isTour = s.isTouring === true || reg.includes('tour') || ven.includes('tour');
                        if (!isTour) return false;
                    }
                }

                // 4. Age Rating Filter
                if (selectedAge !== 'all') {
                    const ageStr = (s.age || '').toLowerCase();
                    const numMatch = ageStr.match(/\d+/);
                    const ageNum = numMatch ? parseInt(numMatch[0], 10) : 0;
                    if (selectedAge === 'under5') {
                        const isUnder5 = ageStr.includes('all') || ageNum < 5;
                        if (!isUnder5) return false;
                    } else if (selectedAge === '4plus') {
                        const is4to6 = ageNum >= 4 && ageNum <= 6;
                        if (!is4to6) return false;
                    } else if (selectedAge === '7plus') {
                        const is7plus = ageNum >= 7;
                        if (!is7plus) return false;
                    }
                }

                return true;
            });

            // Calculate active filter count & chips
            let activeCount = 0;
            const activeChips = [];

            if (selectedType !== 'all') {
                activeCount++;
                const activeBtn = document.querySelector(`#whatson-type-buttons .filter-btn[data-type="${selectedType}"]`);
                activeChips.push({ key: 'type', label: activeBtn ? activeBtn.textContent : selectedType });
            }
            if (selectedLocation !== 'all') {
                activeCount++;
                const activeBtn = document.querySelector(`#whatson-location-buttons .filter-btn[data-location="${selectedLocation}"]`);
                activeChips.push({ key: 'location', label: activeBtn ? activeBtn.textContent : selectedLocation });
            }
            if (selectedAge !== 'all') {
                activeCount++;
                const activeBtn = document.querySelector(`#whatson-age-buttons .filter-btn[data-age="${selectedAge}"]`);
                activeChips.push({ key: 'age', label: activeBtn ? activeBtn.textContent : selectedAge });
            }
            if (q.length > 0) {
                activeCount++;
                activeChips.push({ key: 'query', label: `"${q}"` });
            }

            // Update badge on toggle button
            if (activeBadge) {
                if (activeCount > 0) {
                    activeBadge.textContent = activeCount;
                    activeBadge.style.display = 'inline-block';
                    if (toggleBtn) toggleBtn.classList.add('has-active');
                } else {
                    activeBadge.style.display = 'none';
                    if (toggleBtn) toggleBtn.classList.remove('has-active');
                }
            }

            // Update active chips summary bar
            if (activeChipsContainer) {
                if (activeChips.length > 0) {
                    activeChipsContainer.innerHTML = activeChips.map(chip => `
                        <div class="active-chip">
                            <span>${chip.label}</span>
                            <button type="button" data-clear-key="${chip.key}" aria-label="Remove filter ${chip.label}">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    `).join('') + `
                        <button type="button" id="whatson-chips-clear-all" style="background:none; border:none; color:var(--color-primary); font-size:0.8rem; font-weight:600; cursor:pointer; text-decoration:underline; padding:4px 6px;">Clear all</button>
                    `;
                    activeChipsContainer.style.display = 'flex';

                    // Attach clear single chip listeners
                    activeChipsContainer.querySelectorAll('[data-clear-key]').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const key = btn.getAttribute('data-clear-key');
                            if (key === 'type') {
                                selectedType = 'all';
                                typeButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-type') === 'all'));
                            } else if (key === 'location') {
                                selectedLocation = 'all';
                                locationButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-location') === 'all'));
                            } else if (key === 'age') {
                                selectedAge = 'all';
                                ageButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-age') === 'all'));
                            } else if (key === 'query') {
                                if (searchInput) searchInput.value = '';
                            }
                            render();
                        });
                    });

                    const chipsClearAll = document.getElementById('whatson-chips-clear-all');
                    if (chipsClearAll) chipsClearAll.addEventListener('click', resetAllFilters);
                } else {
                    activeChipsContainer.innerHTML = '';
                    activeChipsContainer.style.display = 'none';
                }
            }

            // Update UI status & reset visibility
            const isFiltered = activeCount > 0;
            if (clearAllBtn) {
                clearAllBtn.style.display = isFiltered ? 'inline-flex' : 'none';
            }
            if (panelResetBtn) {
                panelResetBtn.style.display = isFiltered ? 'inline-block' : 'none';
            }

            const countText = isFiltered 
                ? `Showing ${filtered.length} of ${activeShows.length} upcoming shows`
                : `Showing all ${activeShows.length} upcoming shows`;

            if (resultsCount) resultsCount.textContent = countText;
            if (collapsedCount) collapsedCount.textContent = countText;

            if (filtered.length > 0) {
                container.innerHTML = filtered.map(s => buildWhatsOnCardHTML(s)).join('');
            } else {
                container.innerHTML = `
                <div style="text-align: center; padding: 48px 24px; background: #fff; border-radius: 12px; border: 1.5px dashed var(--color-border); margin: 30px 0; width: 100%;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 2.5rem; color: var(--color-primary); margin-bottom: 14px; display: inline-block;"></i>
                    <h3 style="font-size: 1.25rem; margin-bottom: 8px; font-family: var(--font-heading);">No shows match your current filters</h3>
                    <p style="color: var(--color-text-light); max-width: 450px; margin: 0 auto 20px auto; font-size: 0.95rem;">Try adjusting your selected performance type, location, or age rating filters.</p>
                    <button type="button" class="btn btn-secondary reset-whatson-inline-btn" style="padding: 9px 22px;"><i class="fa-solid fa-rotate-left"></i> Reset All Filters</button>
                </div>`;
                const inlineReset = container.querySelector('.reset-whatson-inline-btn');
                if (inlineReset) inlineReset.addEventListener('click', resetAllFilters);
            }
        };

        function resetAllFilters() {
            selectedType = 'all';
            selectedLocation = 'all';
            selectedAge = 'all';
            if (searchInput) searchInput.value = '';

            typeButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-type') === 'all'));
            locationButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-location') === 'all'));
            ageButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-age') === 'all'));

            render();
        }

        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedType = btn.getAttribute('data-type') || 'all';
                render();
            });
        });

        locationButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                locationButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedLocation = btn.getAttribute('data-location') || 'all';
                render();
            });
        });

        ageButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                ageButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedAge = btn.getAttribute('data-age') || 'all';
                render();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', render);
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', resetAllFilters);
        }

        if (panelResetBtn) {
            panelResetBtn.addEventListener('click', resetAllFilters);
        }

        render();

    } catch (e) {
        console.warn('What\'s On fallback:', e);
    }
}

/* --- 7. Theatre Directory --- */
async function loadTheatreGuideDirectory() {
    const container = document.getElementById('theatre-list');
    const searchInput = document.getElementById('theatre-search-input');
    const locationSelect = document.getElementById('theatre-location-filter');
    if (!container) return;

    try {
        const res = await fetch('data/theatres.json');
        if (!res.ok) throw new Error('Could not load Theatres');
        const theatres = await res.json();
        theatres.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));

        if (locationSelect) {
            const locations = [...new Set(theatres.map(t => t.location).filter(Boolean))].sort();
            locationSelect.innerHTML = '<option value="all">All Locations</option>' + locations.map(l => `<option value="${l}">${l}</option>`).join('');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        if (queryParam && searchInput) searchInput.value = queryParam;

        const render = () => {
            const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const loc = locationSelect ? locationSelect.value : 'all';

            const filtered = theatres.filter(t => {
                const matchesText = `${t.name} ${t.location} ${t.accessibility} ${t.relaxed || ''}`.toLowerCase().includes(q);
                const matchesLoc = loc === 'all' || t.location === loc;
                return matchesText && matchesLoc;
            });

            if (filtered.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#777; margin:30px 0;">No matching theatre venues found.</p>';
                return;
            }

            const groups = {};
            filtered.forEach(t => {
                const region = t.location || 'Other Venues';
                if (!groups[region]) groups[region] = [];
                groups[region].push(t);
            });

            container.innerHTML = Object.keys(groups).map(region => `
                <div class="theatre-region-group" style="margin-bottom: 45px;">
                    <h2 style="font-size:1.6rem; color:var(--color-primary); border-bottom:2px solid #e0e0e0; padding-bottom:8px; margin-bottom:20px;">
                        <i class="fa-solid fa-location-dot"></i> ${region}
                    </h2>
                    <div class="theatre-region-cards">
                        ${groups[region].map(t => buildTheatreCardHTML(t)).join('')}
                    </div>
                </div>
            `).join('');
        };

        render();

        if (searchInput) searchInput.addEventListener('input', render);
        if (locationSelect) locationSelect.addEventListener('change', render);

    } catch (e) {
        console.warn('Theatre load failure:', e);
    }
}

/* --- 8. News Directory --- */
async function loadNewsDirectory() {
    const container = document.getElementById('news-feed-list');
    if (!container) return;

    try {
        const res = await fetch('data/news.json');
        if (!res.ok) throw new Error('Could not load News');
        const news = await res.json();

        const published = news
            .filter(n => n.status === 'published')
            .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));

        container.innerHTML = published.length > 0
            ? published.map(n => buildNewsCardHTML(n)).join('')
            : '<p style="text-align:center; color:#777; margin:30px 0;">No news stories published yet. Check back soon!</p>';
    } catch (e) {
        console.warn('News load failure:', e);
    }
}

/* --- 9. Pantomime Directory --- */
async function loadPantomimeDirectory() {
    const container = document.getElementById('panto-list');
    if (!container) return;

    try {
        const [showsRes, reviewsRes] = await Promise.all([
            fetch('data/whatson.json').then(r => r.ok ? r.json() : []),
            fetch('data/reviews.json').then(r => r.ok ? r.json() : [])
        ]);

        const today = new Date().toISOString().split('T')[0];
        const pantoShows = showsRes.filter(s => (s.category === 'panto' || s.title.toLowerCase().includes('panto')) && (!s.expiryDate || s.expiryDate >= today));
        const pantoReviews = reviewsRes.filter(r => (r.category === 'panto' || r.title.toLowerCase().includes('panto')) && r.status === 'published');

        let html = '';
        if (pantoShows.length > 0) {
            html += `<h2 style="margin-bottom:20px;">Upcoming Pantomimes Booking Now</h2><div style="margin-bottom:40px;">${pantoShows.map(s => buildWhatsOnCardHTML(s)).join('')}</div>`;
        }
        if (pantoReviews.length > 0) {
            html += `<h2 style="margin-bottom:20px;">Pantomime Reviews & Family Verdicts</h2><div class="card-grid">${pantoReviews.map(r => buildReviewCardHTML(r)).join('')}</div>`;
        }

        container.innerHTML = html || '<p style="text-align:center; color:#777; margin:30px 0;">Seasonal pantomime listings will return for the festive season!</p>';
    } catch (e) {
        console.warn('Panto load failure:', e);
    }
}

/* --- 10. Reviews Directory & Homepage Top 3 --- */
async function loadFeaturedReviews() {
    const container = document.getElementById('home-featured-grid') || document.querySelector('.home-featured .card-grid');
    if (!container) return;
    try {
        const res = await fetch('data/reviews.json');
        if (!res.ok) return;
        const reviews = await res.json();
        const featured = reviews
            .filter(r => r.status === 'published')
            .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999))
            .slice(0, 3);
        container.innerHTML = featured.map(r => buildReviewCardHTML(r)).join('');
    } catch (e) {}
}

async function loadFeaturedWhatsOn() {
    const container = document.getElementById('home-featured-whatson-grid');
    if (!container) return;
    try {
        const res = await fetch('data/whatson.json');
        if (!res.ok) return;
        const shows = await res.json();
        const today = new Date().toISOString().split('T')[0];
        const featured = shows
            .filter(s => s.status !== 'draft' && (!s.expiryDate || s.expiryDate >= today))
            .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999))
            .slice(0, 3);
        container.innerHTML = featured.length > 0
            ? featured.map(s => buildFeaturedWhatsOnCardHTML(s)).join('')
            : '<p style="text-align:center; color:#777; margin:20px 0;">No featured shows currently available.</p>';
    } catch (e) {
        console.warn('Featured What\'s On load failure:', e);
    }
}

async function loadFeaturedNews() {
    const container = document.getElementById('home-featured-news-grid');
    if (!container) return;
    try {
        const res = await fetch('data/news.json');
        if (!res.ok) return;
        const news = await res.json();
        const featured = news
            .filter(n => n.status === 'published')
            .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999))
            .slice(0, 3);
        container.innerHTML = featured.length > 0
            ? featured.map(n => buildNewsCardHTML(n)).join('')
            : '<p style="text-align:center; color:#777; margin:20px 0;">No featured news stories currently available.</p>';
    } catch (e) {
        console.warn('Featured news load failure:', e);
    }
}

async function loadReviewsDirectory() {
    const container = document.getElementById('all-reviews-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (!container) return;
    try {
        const res = await fetch('data/reviews.json');
        if (!res.ok) return;
        let allReviews = await res.json();
        allReviews = allReviews
            .filter(r => r.status === 'published')
            .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));

        const render = (filter = 'all') => {
            const filtered = allReviews.filter(r => {
                if (filter === 'all') return true;
                if (filter === 'adhd') return r.tags && r.tags.adhd;
                if (filter === 'sensory') return r.tags && r.tags.sensory;

                const numMatch = (r.age || '').match(/\d+/);
                const ageNum = numMatch ? parseInt(numMatch[0], 10) : null;

                if (filter === 'under5') {
                    if (r.age && r.age.toLowerCase().includes('all')) return true;
                    return ageNum !== null && ageNum < 5;
                }
                if (filter === '5plus') {
                    return ageNum !== null && ageNum >= 5 && ageNum <= 8;
                }
                if (filter === 'older') {
                    return ageNum !== null && ageNum >= 9;
                }
                return true;
            });
            container.innerHTML = filtered.length > 0 ? filtered.map(r => buildReviewCardHTML(r)).join('') : '<p style="text-align: center; color: var(--color-text-light); margin: 30px 0;">No reviews match this filter.</p>';
        };

        render('all');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                render(btn.getAttribute('data-filter'));
            });
        });
    } catch (e) {}
}

/* --- 11. HTML Builders (Clickable Card Architecture) --- */
function buildFeaturedWhatsOnCardHTML(s) {
    let categoryLabel = 'Family Show';
    const cat = (s.category || '').toLowerCase();
    if (cat === 'panto') categoryLabel = 'Pantomime';
    else if (cat === 'musical') categoryLabel = 'Musical';
    else if (cat === 'theatre') categoryLabel = 'Family Theatre';
    else if (cat === 'dance') categoryLabel = 'Dance &amp; Circus';

    const plainDesc = (s.desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const shortDesc = plainDesc.length > 120 ? plainDesc.substring(0, 120) + '...' : plainDesc;

    return `
    <a href="whats-on.html?q=${encodeURIComponent(s.title)}" class="card whatson-featured-card clickable-card" aria-label="View What's On details for ${s.title}">
        <div class="card-image-wrap">
            <img src="images/${s.image}" alt="Production poster for ${s.title}" loading="lazy" decoding="async">
        </div>
        <div class="card-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
                <span class="tag" style="background:var(--color-primary); color:#fff;">${categoryLabel}</span>
                ${s.isTouring ? '<span class="tag tag-touring"><i class="fa-solid fa-route"></i> UK Tour</span>' : `<span class="tag tag-age">${s.age || 'All Ages'}</span>`}
            </div>
            <h3>${s.title}</h3>
            <ul class="listing-info" style="list-style:none; padding:0; margin:0 0 10px 0; font-size:0.85rem; color:var(--color-text-light);">
                <li style="margin-bottom:4px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-location-dot" style="width:14px; color:var(--color-primary);"></i> <span>${s.venue}</span></li>
                <li style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-calendar-days" style="width:14px; color:var(--color-primary);"></i> <span>${s.dates}</span></li>
            </ul>
            <p>${shortDesc}</p>
            <span class="btn btn-secondary card-action-btn">View Show &amp; Tickets</span>
        </div>
    </a>`;
}

function buildWhatsOnCardHTML(s) {
    let categoryBadge = '';
    const cat = (s.category || '').toLowerCase();
    if (cat === 'panto') categoryBadge = '<span class="tag tag-mature" style="background:#d81b60;">Pantomime</span>';
    else if (cat === 'musical') categoryBadge = '<span class="tag" style="background:#0284c7; color:#fff;">Musical</span>';
    else if (cat === 'theatre') categoryBadge = '<span class="tag" style="background:#7c3aed; color:#fff;">Family Theatre</span>';
    else if (cat === 'dance') categoryBadge = '<span class="tag" style="background:#ea580c; color:#fff;">Dance &amp; Circus</span>';

    const regionBadge = s.region ? `<span class="tag" style="background:#f1f5f9; color:#475569;"><i class="fa-solid fa-location-dot" style="font-size:0.75rem;"></i> ${s.region}</span>` : '';

    const hasTags = s.tags && typeof s.tags === 'object';
    const isRelaxed = hasTags ? (s.tags.relaxed !== undefined ? !!s.tags.relaxed : !!s.hasRelaxed) : !!s.hasRelaxed;
    const isBsl = hasTags ? !!s.tags.bsl : false;
    const isCaptioned = hasTags ? !!s.tags.captioned : false;
    const isAudio = hasTags ? !!s.tags.audioDescribed : false;

    let accessBadges = '';
    if (isRelaxed) accessBadges += '<span class="tag tag-sensory" style="font-size:0.75rem;"><i class="fa-solid fa-heart"></i> Relaxed</span>';
    if (isBsl) accessBadges += '<span class="tag tag-touring" style="font-size:0.75rem;"><i class="fa-solid fa-hands-asl-interpreting"></i> BSL</span>';
    if (isCaptioned) accessBadges += '<span class="tag tag-age" style="font-size:0.75rem;"><i class="fa-solid fa-closed-captioning"></i> CAP</span>';
    if (isAudio) accessBadges += '<span class="tag tag-mature" style="font-size:0.75rem;"><i class="fa-solid fa-headphones"></i> AD</span>';

    return `
    <article class="listing-card">
        <div class="listing-image">
            <img src="images/${s.image}" alt="Production poster for ${s.title}" loading="lazy" decoding="async">
        </div>
        <div class="listing-content">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <h3 class="listing-title" style="margin:0;">${s.title}</h3>
                ${s.isTouring ? '<span class="tag tag-touring"><i class="fa-solid fa-route"></i> UK Tour</span>' : ''}
            </div>
            <div class="card-tags" style="margin:8px 0 12px 0; display:flex; flex-wrap:wrap; gap:6px;">
                <span class="tag tag-age">${s.age || 'All Ages'}</span>
                ${categoryBadge}
                ${regionBadge}
                ${accessBadges}
            </div>
            <ul class="listing-info">
                <li><i class="fa-solid fa-location-dot"></i> <span>${s.venue}</span></li>
                <li><i class="fa-solid fa-calendar-days"></i> <span>${s.dates}</span></li>
                ${s.runtime ? `<li><i class="fa-solid fa-clock"></i> <span>${s.runtime}</span></li>` : ''}
            </ul>
            <div class="listing-desc">${s.desc}</div>
            <div style="margin-top: auto; display: flex; gap: 12px; flex-wrap: wrap;">
                ${s.ticketLink ? `<a href="${s.ticketLink}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Book Tickets</a>` : ''}
                ${s.siteLink ? `<a href="${s.siteLink}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Production Website</a>` : ''}
            </div>
        </div>
    </article>`;
}

function buildNewsCardHTML(n) {
    const formattedDate = new Date(n.datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
    <a href="${n.slug}" class="card news-card clickable-card" aria-label="Read full news story: ${n.title}">
        <div class="card-image-wrap">
            <img src="images/${n.mainImage}" alt="${n.altText || n.title}" loading="lazy" decoding="async">
        </div>
        <div class="card-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="tag" style="background:var(--color-accent);">${n.category || 'News'}</span>
                <time datetime="${n.datePublished}" style="font-size:0.8rem; color:#777;"><i class="fa-regular fa-clock"></i> ${formattedDate}</time>
            </div>
            <h3>${n.title}</h3>
            <p>${n.summary}</p>
            <span class="btn btn-secondary card-action-btn">Read Full Story</span>
        </div>
    </a>`;
}

function buildTheatreCardHTML(t) {
    return `
    <article class="theatre-card">
        <div class="theatre-img-container">
            <img src="images/${t.image}" alt="Exterior view of ${t.name}" loading="lazy" decoding="async">
        </div>
        <div class="theatre-info">
            <h2>${t.name}</h2>
            <span class="theatre-location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${t.location}</span>
            <div class="theatre-meta">
                <p><strong>Accessibility:</strong> ${t.accessibility}</p>
                <p><strong>Relaxed Performances & Sensory Rooms:</strong> ${t.relaxed}</p>
            </div>
            ${t.website ? `<a href="${t.website}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Visit Theatre Website</a>` : ''}
        </div>
    </article>`;
}

function buildReviewCardHTML(r) {
    const ratingPercent = Math.min(100, Math.max(0, ((parseFloat(r.rating) || 5) / 5) * 100));
    let tagsHTML = `<span class="tag tag-age">${r.age || 'All Ages'}</span>`;
    if (r.tags?.adhd) tagsHTML += `\n<span class="tag tag-adhd">Sensory Strategy</span>`;
    if (r.tags?.sensory) tagsHTML += `\n<span class="tag tag-sensory">Sensory Notes</span>`;

    return `
    <a href="${r.slug}" class="card review-card clickable-card" aria-label="Read full sensory review: ${r.title}">
        <div class="card-image-wrap">
            <img src="images/${r.mainImage}" alt="${r.altText || r.title}" loading="lazy" decoding="async">
        </div>
        <div class="card-content">
            <div class="card-star-rating" role="img" aria-label="Rated ${r.rating} out of 5 stars">
                <div class="star-rating" style="display: inline-block;">
                    <div class="stars-empty"><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i></div>
                    <div class="stars-full" style="width: ${ratingPercent}%;"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>
                </div>
            </div>
            <h3>${r.title}</h3>
            <div class="card-tags">${tagsHTML}</div>
            <p>${r.summary}</p>
            <span class="btn btn-secondary card-action-btn">Read Full Review</span>
        </div>
    </a>`;
}

/* --- 12. Global Footer (Includes discreet Privacy Policy link) --- */
function initGlobalFooter() {
    const footerContainer = document.querySelector('.site-footer .container');
    if (!footerContainer) return;
    const currentYear = new Date().getFullYear();
    const domainUrl = "https://behindthemagiccurtain.co.uk";
    const emailAddress = "Hello@behindthemagiccurtain.co.uk";

    footerContainer.innerHTML = `
        <div class="footer-newsletter-card" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 30px 20px; max-width: 640px; margin: 0 auto 35px auto; text-align: center;">
            <h3 style="color: #ffffff; font-family: var(--font-heading, 'Raleway', sans-serif); font-size: 1.45rem; margin-bottom: 8px;">
                <i class="fa-solid fa-envelope-open-text" style="color: var(--color-secondary, #ffd700); margin-right: 8px;"></i> Join the BTMC Family Club
            </h3>
            <p style="color: #cccccc; font-size: 0.92rem; margin-bottom: 20px; line-height: 1.5;">Get our latest neurodivergent family theatre reviews, sensory insights, and Disneyland Paris guides delivered straight to your inbox.</p>
            <form id="footer-newsletter-form" onsubmit="event.preventDefault(); handleFooterNewsletterSubmit();" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: 520px; margin: 0 auto;">
                <input type="text" id="footer-user-name" placeholder="Your Name" style="flex: 1 1 140px; min-width: 130px; padding: 12px 14px; border-radius: 50px; border: 1.5px solid rgba(255, 255, 255, 0.2); background: #ffffff; color: #222222; font-size: 0.9rem; font-family: var(--font-body, 'Poppins', sans-serif); outline: none;">
                <input type="email" id="footer-user-email" placeholder="Email Address *" required style="flex: 1 1 180px; min-width: 170px; padding: 12px 14px; border-radius: 50px; border: 1.5px solid rgba(255, 255, 255, 0.2); background: #ffffff; color: #222222; font-size: 0.9rem; font-family: var(--font-body, 'Poppins', sans-serif); outline: none;">
                <button type="submit" class="btn btn-primary" style="padding: 12px 24px; font-size: 0.92rem; border-radius: 50px; cursor: pointer; border: none; font-weight: 700; white-space: nowrap;">Join Club</button>
            </form>
            <p style="font-size: 0.78rem; color: #999999; margin: 12px 0 0 0;">🔒 Zero spam. <a href="unsubscribe.html" style="color: #bbbbbb; text-decoration: underline;">Unsubscribe or delete your data</a> anytime.</p>
        </div>
        <iframe name="footer_submit_target_iframe" id="footer_submit_target_iframe" style="display:none;"></iframe>
        <form id="native_footer_form" action="https://docs.google.com/forms/d/e/1FAIpQLScODeuHl2_gKBfoitmXdtpmIavjbk3pKyVq3ctHFOnhsgdObg/formResponse" method="POST" target="footer_submit_target_iframe" style="display:none;">
            <input type="hidden" name="entry.1934084784" id="footer_gform_optin">
            <input type="hidden" name="entry.1983797623" id="footer_gform_contact">
            <input type="hidden" name="entry.266837979" id="footer_gform_diary">
        </form>
        <div style="margin-bottom: 12px; font-size: 0.95rem;">
            <a href="mailto:${emailAddress}" style="color: #ffffff; text-decoration: none; font-weight: 600; margin-right: 20px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-envelope" style="color: var(--color-secondary, #ffd700);"></i> ${emailAddress}</a>
            <a href="${domainUrl}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-globe" style="color: var(--color-secondary, #ffd700);"></i> behindthemagiccurtain.co.uk</a>
        </div>
        <div class="footer-social-links" style="margin-top: 20px; margin-bottom: 20px;">
            <a href="https://www.facebook.com/share/19HnVtGmn1/" target="_blank" rel="noopener noreferrer" aria-label="Visit our Facebook page">
                <i class="fa-brands fa-facebook" aria-hidden="true"></i>
            </a>
            <a href="https://www.instagram.com/behind.the.magic.curtain?igsi=MXVwdjZjeTZsZGZvNQ==" target="_blank" rel="noopener noreferrer" aria-label="Visit our Instagram page">
                <i class="fa-brands fa-instagram" aria-hidden="true"></i>
            </a>
        </div>
        <div style="font-size: 0.85rem; color: #777777;">
            &copy; ${currentYear} Behind the Magic Curtain. All rights reserved. 
            <span style="margin: 0 8px; color: #444;">|</span> 
            <a href="privacy.html" style="color: #777777; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#ffd700'" onmouseout="this.style.color='#777777'">Privacy Policy</a>
        </div>
    `;
}

function handleFooterNewsletterSubmit() {
    const nameInput = document.getElementById('footer-user-name');
    const emailInput = document.getElementById('footer-user-email');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    if (!email || !email.includes('@')) return;

    document.getElementById('footer_gform_optin').value = "Yes - Join Club";
    document.getElementById('footer_gform_contact').value = `${name || 'Friend'} (${email})`;
    document.getElementById('footer_gform_diary').value = "General Website Footer Signup";
    document.getElementById('native_footer_form').submit();

    nameInput.value = '';
    emailInput.value = '';
    showBtmcToast(`Welcome ${name || ''}! Check your inbox for a welcome email.`);
}

/* --- 13. Swiper Carousel Auto-Initializer --- */
function initSwiperGalleries() {
    if (typeof Swiper !== 'undefined') {
        if (document.querySelector('.btmc-swiper')) {
            new Swiper('.btmc-swiper', {
                loop: true,
                slidesPerView: 1,
                spaceBetween: 20,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
            });
        }
        if (document.querySelector('.review-swiper')) {
            new Swiper('.review-swiper', {
                loop: true,
                slidesPerView: 1,
                spaceBetween: 20,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
            });
        }
    }
}

/* --- 14. Global Gated Toolkit & Community Modal Handlers --- */
let pendingTargetResource = null;

function requestToolkitAccess(resourceType) {
    pendingTargetResource = resourceType;
    
    if (localStorage.getItem('btmc_toolkit_unlocked') === 'true') {
        openToolkitResource(pendingTargetResource);
    } else {
        const modal = document.getElementById('download-unlock-modal');
        if (modal) modal.style.display = 'flex';
    }
}

function closeUnlockModal() {
    const modal = document.getElementById('download-unlock-modal');
    if (modal) modal.style.display = 'none';
}

function processUnlockSubmission() {
    const nameInput = document.getElementById('unlock-name');
    const emailInput = document.getElementById('unlock-email');
    
    if (!nameInput || !emailInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !email) return;

    const contactString = `${name} (${email})`;
    const optInStatus = "Opted In - DLP Toolkits & Newsletter";
    const payloadBody = `Toolkit Unlock Signup from Disneyland Paris page. Target: ${pendingTargetResource || 'General DLP Toolkit'}`;

    const optinEl = document.getElementById('dlp_gform_optin');
    const contactEl = document.getElementById('dlp_gform_contact');
    const diaryEl = document.getElementById('dlp_gform_diary');
    const nativeForm = document.getElementById('native_dlp_form');

    if (optinEl && contactEl && diaryEl && nativeForm) {
        optinEl.value = optInStatus;
        contactEl.value = contactString;
        diaryEl.value = payloadBody;
        nativeForm.submit();
    }

    localStorage.setItem('btmc_toolkit_unlocked', 'true');
    closeUnlockModal();
    openToolkitResource(pendingTargetResource);
}

function openToolkitResource(type) {
    if (type === 'checklist') {
        window.open('dlp-rides-checklist.html', '_blank');
    } else if (type === 'shows') {
        window.open('dlp-shows-guide.html', '_blank');
    } else {
        window.print();
    }
}

function openCommunityModal() {
    const modal = document.getElementById('community-modal');
    if (modal) modal.style.display = 'flex';
}
window.openCommunityModal = openCommunityModal;

function closeCommunityModal() {
    const modal = document.getElementById('community-modal');
    if (modal) modal.style.display = 'none';
}
window.closeCommunityModal = closeCommunityModal;

function handleCommunitySubmit() {
    const name = document.getElementById('dlp-user-name').value.trim();
    const email = document.getElementById('dlp-user-email').value.trim();
    const optIn = document.getElementById('dlp-join-optin').checked;

    const contactString = `${name || 'Anonymous'} (${email || 'No email provided'})`;
    const optInStatus = optIn ? "Opted In - Community & News" : "Opted Out";
    const ratingsSummary = JSON.stringify(userCustomRatings);
    const payloadBody = `Community DLP Ratings Submission. Ratings: ${ratingsSummary}`;

    document.getElementById('dlp_gform_optin').value = optInStatus;
    document.getElementById('dlp_gform_contact').value = contactString;
    document.getElementById('dlp_gform_diary').value = payloadBody;
    
    document.getElementById('native_dlp_form').submit();
    closeCommunityModal();
    showBtmcToast("Thank you! Your family sensory log has been submitted.");
}
window.handleCommunitySubmit = handleCommunitySubmit;

/* -------------------------------------------------- */
/* Floating Back to Top Button Engine                 */
/* -------------------------------------------------- */
function initBackToTopButton() {
    let btn = document.getElementById('back-to-top-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'back-to-top-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Back to top');
        btn.title = 'Back to top';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
        document.body.appendChild(btn);
    }

    const getScrollY = () => {
        return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const updatePositionAndVisibility = () => {
        const scrollY = getScrollY();
        if (scrollY > 120) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }

        // Check for Disneyland Paris sticky bottom bar
        const stickyBar = document.getElementById('sticky-rater-bar') || document.querySelector('.sticky-rater-bar');
        if (stickyBar) {
            const barHeight = stickyBar.offsetHeight || 65;
            btn.style.setProperty('bottom', `${barHeight + 18}px`, 'important');
            return;
        }

        // Adjust position if cookie banner is actively visible
        const cookieBanner = document.getElementById('cookie-banner');
        if (cookieBanner && cookieBanner.style.display !== 'none' && cookieBanner.offsetHeight > 0) {
            const bannerHeight = cookieBanner.offsetHeight;
            btn.style.bottom = `${bannerHeight + 16}px`;
        } else {
            btn.style.bottom = '';
        }
    };

    window.addEventListener('scroll', updatePositionAndVisibility, { passive: true });
    document.addEventListener('scroll', updatePositionAndVisibility, { passive: true });
    window.addEventListener('resize', updatePositionAndVisibility, { passive: true });

    // Initial check
    updatePositionAndVisibility();

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackToTopButton);
} else {
    initBackToTopButton();
}
