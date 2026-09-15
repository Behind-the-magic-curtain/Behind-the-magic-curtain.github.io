/*
 * BEHIND THE MAGIC CURTAIN - NEWSLETTER STUDIO & EMAIL COMPILER
 * Generates bulletproof, responsive, inline-styled HTML email newsletters
 * using live data from Reviews, What's On, Theatre Guide, News Stories & Disneyland Paris.
 * Optimized for HubSpot, Google Workspace Mail Merge, and standard email clients.
 */

(function () {
    'use strict';

    // --- State Management ---
    const defaultState = {
        subject: "✨ Behind the Magic Curtain: New Stage Reviews, What's On & Sensory Guides",
        preheader: "UK family theatre reviews, upcoming stage shows, accessibility highlights, and Disneyland Paris sensory tips.",
        platform: "hubspot", // "hubspot", "google", "generic"
        theme: "btmc-crimson", // "btmc-crimson", "sensory-teal", "editorial-dark"
        baseUrl: "https://behindthemagiccurtain.co.uk",
        headerTitle: "Behind the Magic Curtain",
        headerSubtitle: "UK Family Theatre Reviews, Sensory Guides & What's On",
        issueTag: "Monthly Family Stage Edition",
        introNote: "Welcome to this edition of Behind the Magic Curtain! Whether you are planning your family's first theatre trip, looking for sensory-adapted or relaxed performances, or planning a magical getaway to Disneyland Paris, here is our handpicked selection of stage reviews, booking highlights, and practical accessibility insights.",
        activePreset: "digest",
        componentOrder: ["reviews", "whatson", "theatres", "news", "disneyland", "callout"],
        selectedReviews: [],
        heroReviewId: null,
        selectedWhatson: [],
        selectedTheatres: [],
        selectedNews: [],
        selectedDisneyland: [],
        showCallout: true,
        calloutTitle: "Planning a Theatre Trip with Neurodivergent Children?",
        calloutText: "Visit our complete website directory for detailed sensory breakdowns, ear-defender tips, and venue accessibility ratings across the UK.",
        calloutBtnText: "Explore Sensory Guides",
        calloutBtnUrl: "https://behindthemagiccurtain.co.uk/reviews.html",
        closingNote: "Have questions about venue accommodations or sensory strategies? We'd love to hear from you—simply reply to this email or visit our online community.",
        signoffName: "Katy Rose Meaney",
        signoffTitle: "Journalist, Theatre Critic & Parent"
    };

    let state = JSON.parse(JSON.stringify(defaultState));
    let dataCache = {
        reviews: [],
        whatson: [],
        theatres: [],
        news: [],
        disneyland: []
    };

    let activePreviewDevice = 'desktop'; // 'desktop' or 'mobile'
    let activePreviewMode = 'visual'; // 'visual' or 'code'

    // --- Theme Configurations ---
    const THEMES = {
        "btmc-crimson": {
            primary: "#bd2419",
            primaryDark: "#941c13",
            accent: "#00838f",
            gold: "#ffd700",
            bgBody: "#f4f6f9",
            cardBg: "#ffffff",
            textPrimary: "#1e293b",
            textMuted: "#64748b",
            border: "#e2e8f0"
        },
        "sensory-teal": {
            primary: "#00838f",
            primaryDark: "#006064",
            accent: "#bd2419",
            gold: "#f59e0b",
            bgBody: "#f0fdfa",
            cardBg: "#ffffff",
            textPrimary: "#134e4a",
            textMuted: "#64748b",
            border: "#ccfbf1"
        },
        "editorial-dark": {
            primary: "#1e293b",
            primaryDark: "#0f172a",
            accent: "#bd2419",
            gold: "#ffd700",
            bgBody: "#f8fafc",
            cardBg: "#ffffff",
            textPrimary: "#0f172a",
            textMuted: "#475569",
            border: "#cbd5e1"
        }
    };

    // --- Initialization ---
    window.initNewsletterTab = async function () {
        await loadAllData();
        populateAllPickers();
        applyPreset('digest'); // Default to digest with top items selected
        syncUiFromState();
        renderPreview();
    };

    // --- Data Fetcher (GitHub or Local) ---
    async function loadAllData() {
        // If currentCache already populated in admin.js, borrow it
        if (window.currentCache && window.currentCache.reviews && window.currentCache.reviews.length > 0) {
            dataCache.reviews = window.currentCache.reviews;
            dataCache.whatson = window.currentCache.whatson || [];
            dataCache.theatres = window.currentCache.theatres || [];
            dataCache.news = window.currentCache.news || [];
            dataCache.disneyland = window.currentCache.disneyland || [];
            return;
        }

        try {
            const [revs, wo, th, nw, dlp] = await Promise.all([
                fetch('data/reviews.json').then(r => r.ok ? r.json() : []).catch(() => []),
                fetch('data/whatson.json').then(r => r.ok ? r.json() : []).catch(() => []),
                fetch('data/theatres.json').then(r => r.ok ? r.json() : []).catch(() => []),
                fetch('data/news.json').then(r => r.ok ? r.json() : []).catch(() => []),
                fetch('data/disneyland.json').then(r => r.ok ? r.json() : []).catch(() => [])
            ]);

            dataCache.reviews = (revs || []).sort((a,b) => (Number(a.rank)||0) - (Number(b.rank)||0));
            dataCache.whatson = (wo || []).sort((a,b) => (Number(a.rank)||0) - (Number(b.rank)||0));
            dataCache.theatres = (th || []).sort((a,b) => (Number(a.rank)||0) - (Number(b.rank)||0));
            dataCache.news = (nw || []).sort((a,b) => (Number(a.rank)||0) - (Number(b.rank)||0));
            dataCache.disneyland = dlp || [];
        } catch (err) {
            console.warn('Newsletter data fetch error:', err);
        }
    }

    // --- Component Metadata ---
    const COMPONENT_META = {
        reviews: { label: 'Stage Reviews', icon: 'fa-solid fa-star' },
        whatson: { label: "What's On Stage", icon: 'fa-solid fa-calendar-days' },
        theatres: { label: 'Theatre Venues', icon: 'fa-solid fa-landmark' },
        news: { label: 'News Stories', icon: 'fa-solid fa-newspaper' },
        disneyland: { label: 'Disneyland Paris', icon: 'fa-solid fa-wand-magic-sparkles' },
        callout: { label: 'Highlighted Callout Banner', icon: 'fa-solid fa-bullhorn' }
    };

    const ALL_COMPONENTS = ['reviews', 'whatson', 'theatres', 'news', 'disneyland', 'callout'];

    function hasComponentContent(key) {
        if (key === 'reviews') return Array.isArray(state.selectedReviews) && state.selectedReviews.length > 0;
        if (key === 'whatson') return Array.isArray(state.selectedWhatson) && state.selectedWhatson.length > 0;
        if (key === 'theatres') return Array.isArray(state.selectedTheatres) && state.selectedTheatres.length > 0;
        if (key === 'news') return Array.isArray(state.selectedNews) && state.selectedNews.length > 0;
        if (key === 'disneyland') return Array.isArray(state.selectedDisneyland) && state.selectedDisneyland.length > 0;
        if (key === 'callout') return Boolean(state.showCallout);
        return false;
    }

    function syncComponentOrderWithContent() {
        if (!Array.isArray(state.componentOrder)) {
            state.componentOrder = [];
        }

        // 1. When an object has no content, remove it from the priority order
        state.componentOrder = state.componentOrder.filter(key => hasComponentContent(key));

        // 2. When something is added into content, add it onto the bottom of the list
        ALL_COMPONENTS.forEach(key => {
            if (hasComponentContent(key) && !state.componentOrder.includes(key)) {
                state.componentOrder.push(key);
            }
        });
    }

    // --- UI Sync & Event Binding ---
    function syncUiFromState() {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== undefined ? val : '';
        };
        const setChecked = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!val;
        };

        setVal('nl-subject', state.subject);
        setVal('nl-preheader', state.preheader);
        setVal('nl-platform', state.platform);
        setVal('nl-theme', state.theme);
        setVal('nl-base-url', state.baseUrl);
        setVal('nl-header-title', state.headerTitle);
        setVal('nl-header-subtitle', state.headerSubtitle);
        setVal('nl-issue-tag', state.issueTag);
        setVal('nl-intro-note', state.introNote);

        setChecked('nl-show-callout', state.showCallout);
        updateCalloutFieldsVisibility();
        setVal('nl-callout-title', state.calloutTitle);
        setVal('nl-callout-text', state.calloutText);
        setVal('nl-callout-btn-text', state.calloutBtnText);
        setVal('nl-callout-btn-url', state.calloutBtnUrl);

        setVal('nl-closing-note', state.closingNote);
        setVal('nl-signoff-name', state.signoffName);
        setVal('nl-signoff-title', state.signoffTitle);

        syncComponentOrderWithContent();
        updatePresetButtonsUI();
        reorderTabsFromState();
        renderFlowList();
        updateSelectionCounters();
    }

    function updateCalloutFieldsVisibility() {
        const fields = document.getElementById('nl-callout-fields');
        if (fields) {
            fields.style.opacity = state.showCallout ? '1' : '0.45';
            fields.style.pointerEvents = state.showCallout ? 'auto' : 'none';
        }
    }

    function updatePresetButtonsUI() {
        const presetKeys = ['digest', 'sensory', 'whatson', 'disneyland'];
        presetKeys.forEach(key => {
            const btn = document.getElementById(`btn-preset-${key}`);
            if (btn) {
                if (state.activePreset === key) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });

        const statusLabel = document.getElementById('nl-preset-status-label');
        if (statusLabel) {
            const names = {
                digest: 'Monthly Family Digest',
                sensory: 'Sensory Guide Special',
                whatson: "What's On Stage",
                disneyland: 'Disneyland Paris Dispatch',
                clear: 'Custom Configuration'
            };
            statusLabel.textContent = `Preset: ${names[state.activePreset] || 'Custom'}`;
        }
    }

    function reorderTabsFromState() {
        const nav = document.getElementById('nl-tab-nav');
        if (!nav) return;
        const activeOrder = (Array.isArray(state.componentOrder) ? state.componentOrder : []).filter(k => k !== 'callout');
        const allPickerTabs = ['reviews', 'whatson', 'theatres', 'news', 'disneyland'];
        const fullTabOrder = [...activeOrder, ...allPickerTabs.filter(k => !activeOrder.includes(k))];

        fullTabOrder.forEach(key => {
            const btn = document.getElementById(`nl-tab-btn-${key}`);
            if (btn) {
                nav.appendChild(btn);
            }
        });
    }

    function renderFlowList() {
        const container = document.getElementById('nl-flow-list') || document.getElementById('nl-flow-pills');
        if (!container) return;

        syncComponentOrderWithContent();

        const countLabel = document.getElementById('nl-flow-count-label');
        if (countLabel) {
            const count = state.componentOrder.length;
            countLabel.textContent = count === 0 
                ? '(0 active sections)' 
                : `(${count} active ${count === 1 ? 'section' : 'sections'} in priority order)`;
        }

        const activePane = document.querySelector('.nl-component-pane.active');
        const activeTabKey = activePane ? activePane.id.replace('nl-pane-', '') : '';

        if (state.componentOrder.length === 0) {
            container.innerHTML = `
                <div class="nl-flow-empty">
                    <div style="font-size:1.4rem; color:#94a3b8; margin-bottom:6px;"><i class="fa-solid fa-layer-group"></i></div>
                    <strong style="display:block; color:#475569; margin-bottom:4px;">No Content Sections Active</strong>
                    <span>Select items from the tabs below or apply a Preset above. Whenever content is added to a category, it appends at the bottom of priority and can be moved up or down.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = state.componentOrder.map((key, index) => {
            const meta = COMPONENT_META[key] || { label: key, icon: 'fa-solid fa-layer-group' };
            const isActive = activeTabKey === key;
            const isFirst = index === 0;
            const isLast = index === state.componentOrder.length - 1;

            let tagText = '';
            if (key === 'reviews') {
                const count = state.selectedReviews.length;
                tagText = `${count} ${count === 1 ? 'review' : 'reviews'}${state.heroReviewId ? ' • Hero set' : ''}`;
            } else if (key === 'whatson') {
                const count = state.selectedWhatson.length;
                tagText = `${count} ${count === 1 ? 'show' : 'shows'}`;
            } else if (key === 'theatres') {
                const count = state.selectedTheatres.length;
                tagText = `${count} ${count === 1 ? 'theatre' : 'theatres'}`;
            } else if (key === 'news') {
                const count = state.selectedNews.length;
                tagText = `${count} ${count === 1 ? 'story' : 'stories'}`;
            } else if (key === 'disneyland') {
                const count = state.selectedDisneyland.length;
                tagText = `${count} ${count === 1 ? 'attraction' : 'attractions'}`;
            } else if (key === 'callout') {
                tagText = 'Callout Banner Enabled';
            }

            const clickAction = key === 'callout' 
                ? "document.getElementById('nl-card-callout')?.scrollIntoView({behavior:'smooth'})" 
                : `switchNlPickerTab('${key}')`;

            return `
                <div class="nl-flow-row ${isActive ? 'active' : ''}" 
                     onclick="${clickAction}"
                     title="Click to view/edit ${meta.label}. Priority rank: #${index + 1}">
                    <div class="nl-flow-row-left">
                        <span class="nl-flow-rank-badge">#${index + 1}</span>
                        <i class="${meta.icon} nl-flow-icon"></i>
                        <div class="nl-flow-info">
                            <div class="nl-flow-title-row">
                                <span class="nl-flow-title">${meta.label}</span>
                                <span class="nl-flow-tag">${tagText}</span>
                            </div>
                        </div>
                    </div>
                    <div class="nl-flow-row-right" onclick="event.stopPropagation()">
                        <button type="button" class="nl-flow-jump-btn" onclick="${clickAction}; event.stopPropagation();" title="Jump to ${meta.label}">
                            Edit <i class="fa-solid fa-arrow-right" style="font-size:0.68rem;"></i>
                        </button>
                        <button type="button" class="nl-flow-btn" 
                                onclick="moveComponentOrder('${key}', -1); event.stopPropagation();" 
                                ${isFirst ? 'disabled' : ''} 
                                title="${isFirst ? 'Top priority' : 'Move up in priority'}">
                            <i class="fa-solid fa-arrow-up"></i>
                        </button>
                        <button type="button" class="nl-flow-btn" 
                                onclick="moveComponentOrder('${key}', 1); event.stopPropagation();" 
                                ${isLast ? 'disabled' : ''} 
                                title="${isLast ? 'Bottom priority' : 'Move down in priority'}">
                            <i class="fa-solid fa-arrow-down"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Retain function name alias for backward compatibility
    window.renderFlowPills = renderFlowList;

    window.moveComponentOrder = function (componentKey, delta) {
        syncComponentOrderWithContent();
        if (!state.componentOrder || state.componentOrder.length === 0) return;

        const idx = state.componentOrder.indexOf(componentKey);
        if (idx === -1) return;
        const newIdx = idx + delta;
        if (newIdx < 0 || newIdx >= state.componentOrder.length) return;

        const item = state.componentOrder.splice(idx, 1)[0];
        state.componentOrder.splice(newIdx, 0, item);

        reorderTabsFromState();
        renderFlowList();
        renderPreview();
        showNlToast(`Priority updated: ${COMPONENT_META[componentKey]?.label || componentKey} moved to #${newIdx + 1}`);
    };

    // --- Render Component Pickers ---
    function populateAllPickers() {
        renderReviewsPicker();
        renderWhatsOnPicker();
        renderTheatresPicker();
        renderNewsPicker();
        renderDisneylandPicker();
    }

    function renderReviewsPicker(filter = '') {
        const container = document.getElementById('nl-reviews-list');
        if (!container) return;

        const filtered = dataCache.reviews.filter(r => 
            !filter || `${r.title} ${r.subtitle || ''} ${r.summary || ''}`.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = `<div class="nl-empty-state"><i class="fa-solid fa-magnifying-glass"></i> No reviews match your filter.</div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isChecked = state.selectedReviews.includes(item.id);
            const isHero = state.heroReviewId === item.id;
            const stars = '★'.repeat(Math.min(5, Math.floor(item.rating || 5)));

            return `
                <div class="nl-item-card ${isChecked ? 'selected' : ''}" data-id="${item.id}">
                    <div class="nl-item-drag-handle"><i class="fa-solid fa-star" style="color:var(--color-secondary);"></i></div>
                    <img src="${item.mainImage ? `images/${item.mainImage}` : 'images/placeholder.webp'}" class="nl-item-thumb" alt="${item.title}">
                    <div class="nl-item-info">
                        <div class="nl-item-title-row">
                            <strong>${item.title}</strong>
                            <span class="nl-rating-badge">${stars} ${item.rating}/5</span>
                        </div>
                        <div class="nl-item-meta">
                            <span class="nl-meta-pill age">${item.age || 'All Ages'}</span>
                            ${item.tags?.adhd ? '<span class="nl-meta-pill adhd">ADHD Friendly</span>' : ''}
                            ${item.tags?.sensory ? '<span class="nl-meta-pill sensory">Sensory Notes</span>' : ''}
                        </div>
                        <p class="nl-item-desc">${escapeHtml(item.summary || item.subtitle || '')}</p>
                    </div>
                    <div class="nl-item-actions">
                        <label class="nl-check-wrap" title="Include in email">
                            <input type="checkbox" onchange="toggleItemSelection('reviews', '${item.id}', this.checked)" ${isChecked ? 'checked' : ''}>
                            <span class="nl-check-label">Include</span>
                        </label>
                        ${isChecked ? `
                            <button type="button" class="nl-btn-hero ${isHero ? 'active' : ''}" onclick="toggleHeroReview('${item.id}')" title="Feature as large hero card">
                                <i class="fa-solid fa-crown"></i> ${isHero ? 'Hero Spotlight' : 'Make Hero'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderWhatsOnPicker(filter = '') {
        const container = document.getElementById('nl-whatson-list');
        if (!container) return;

        const filtered = dataCache.whatson.filter(w => 
            !filter || `${w.title} ${w.venue} ${w.dates}`.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = `<div class="nl-empty-state"><i class="fa-solid fa-magnifying-glass"></i> No stage shows match your filter.</div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isChecked = state.selectedWhatson.includes(item.id);
            return `
                <div class="nl-item-card ${isChecked ? 'selected' : ''}" data-id="${item.id}">
                    <div class="nl-item-drag-handle"><i class="fa-solid fa-calendar-days" style="color:#00838f;"></i></div>
                    <img src="${item.image ? `images/${item.image}` : 'images/placeholder.webp'}" class="nl-item-thumb" alt="${item.title}">
                    <div class="nl-item-info">
                        <div class="nl-item-title-row">
                            <strong>${item.title}</strong>
                            <span class="nl-meta-pill age">${item.age || 'All Ages'}</span>
                        </div>
                        <div class="nl-item-meta">
                            <span><i class="fa-solid fa-location-dot"></i> ${item.venue}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${item.dates}</span>
                        </div>
                        <p class="nl-item-desc">${stripHtml(item.desc || '').substring(0, 120)}...</p>
                    </div>
                    <div class="nl-item-actions">
                        <label class="nl-check-wrap">
                            <input type="checkbox" onchange="toggleItemSelection('whatson', '${item.id}', this.checked)" ${isChecked ? 'checked' : ''}>
                            <span class="nl-check-label">Include</span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderTheatresPicker(filter = '') {
        const container = document.getElementById('nl-theatres-list');
        if (!container) return;

        const filtered = dataCache.theatres.filter(t => 
            !filter || `${t.name} ${t.location}`.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = `<div class="nl-empty-state"><i class="fa-solid fa-magnifying-glass"></i> No theatres match your filter.</div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isChecked = state.selectedTheatres.includes(item.id);
            return `
                <div class="nl-item-card ${isChecked ? 'selected' : ''}" data-id="${item.id}">
                    <div class="nl-item-drag-handle"><i class="fa-solid fa-landmark" style="color:#9333ea;"></i></div>
                    <img src="${item.image ? `images/${item.image}` : 'images/theatre-default.webp'}" class="nl-item-thumb" alt="${item.name}">
                    <div class="nl-item-info">
                        <div class="nl-item-title-row">
                            <strong>${item.name}</strong>
                            <span class="nl-meta-pill" style="background:#f3e8ff; color:#7e22ce;">${item.location}</span>
                        </div>
                        <div class="nl-item-meta">
                            <span><i class="fa-solid fa-wheelchair"></i> Accessibility Verified</span>
                            <span><i class="fa-solid fa-heart"></i> Relaxed Shows</span>
                        </div>
                        <p class="nl-item-desc">${stripHtml(item.accessibility || '').substring(0, 130)}...</p>
                    </div>
                    <div class="nl-item-actions">
                        <label class="nl-check-wrap">
                            <input type="checkbox" onchange="toggleItemSelection('theatres', '${item.id}', this.checked)" ${isChecked ? 'checked' : ''}>
                            <span class="nl-check-label">Include</span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderNewsPicker(filter = '') {
        const container = document.getElementById('nl-news-list');
        if (!container) return;

        const filtered = dataCache.news.filter(n => 
            !filter || `${n.title} ${n.category || ''} ${n.summary || ''}`.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = `<div class="nl-empty-state"><i class="fa-solid fa-magnifying-glass"></i> No news stories match your filter.</div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isChecked = state.selectedNews.includes(item.id);
            const dateStr = item.datePublished ? new Date(item.datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

            return `
                <div class="nl-item-card ${isChecked ? 'selected' : ''}" data-id="${item.id}">
                    <div class="nl-item-drag-handle"><i class="fa-solid fa-newspaper" style="color:#2563eb;"></i></div>
                    <img src="${item.mainImage ? `images/${item.mainImage}` : 'images/placeholder.webp'}" class="nl-item-thumb" alt="${item.title}">
                    <div class="nl-item-info">
                        <div class="nl-item-title-row">
                            <strong>${item.title}</strong>
                            <span class="nl-meta-pill" style="background:#dbeafe; color:#1d4ed8;">${item.category || 'News'}</span>
                        </div>
                        <div class="nl-item-meta">
                            <span><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                            <span><i class="fa-solid fa-pen-nib"></i> ${item.author || 'Katy Rose Meaney'}</span>
                        </div>
                        <p class="nl-item-desc">${escapeHtml(item.summary || '')}</p>
                    </div>
                    <div class="nl-item-actions">
                        <label class="nl-check-wrap">
                            <input type="checkbox" onchange="toggleItemSelection('news', '${item.id}', this.checked)" ${isChecked ? 'checked' : ''}>
                            <span class="nl-check-label">Include</span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderDisneylandPicker(filter = '') {
        const container = document.getElementById('nl-disneyland-list');
        if (!container) return;

        const filtered = dataCache.disneyland.filter(d => 
            !filter || `${d.name} ${d.park} ${d.land}`.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = `<div class="nl-empty-state"><i class="fa-solid fa-magnifying-glass"></i> No Disneyland attractions match your filter.</div>`;
            return;
        }

        // Limit rendering to 35 items if no filter to prevent DOM overload
        const displayItems = filter ? filtered : filtered.slice(0, 35);

        container.innerHTML = displayItems.map(item => {
            const isChecked = state.selectedDisneyland.includes(item.id);
            return `
                <div class="nl-item-card ${isChecked ? 'selected' : ''}" data-id="${item.id}">
                    <div class="nl-item-drag-handle"><i class="fa-solid fa-wand-magic-sparkles" style="color:#eab308;"></i></div>
                    <div class="nl-item-info" style="padding-left: 5px;">
                        <div class="nl-item-title-row">
                            <strong>${item.name}</strong>
                            <span class="nl-meta-pill" style="background:#fef9c3; color:#854d0e;">${item.land}</span>
                        </div>
                        <div class="nl-item-meta">
                            <span>${item.park}</span>
                            <span>Sensory (T:${item.thrillLevel} • F:${item.fearFactor} • N:${item.noiseLevel} • D:${item.darkness})</span>
                        </div>
                        <p class="nl-item-desc">${item.adhdTip ? `<strong>ADHD Tip:</strong> ${escapeHtml(item.adhdTip)}` : escapeHtml(item.sensoryNotes || '')}</p>
                    </div>
                    <div class="nl-item-actions">
                        <label class="nl-check-wrap">
                            <input type="checkbox" onchange="toggleItemSelection('disneyland', '${item.id}', this.checked)" ${isChecked ? 'checked' : ''}>
                            <span class="nl-check-label">Include</span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Selection Toggles & Helpers ---
    window.toggleItemSelection = function (type, id, checked) {
        const prop = type === 'reviews' ? 'selectedReviews' :
                     type === 'whatson' ? 'selectedWhatson' :
                     type === 'theatres' ? 'selectedTheatres' :
                     type === 'news' ? 'selectedNews' : 'selectedDisneyland';

        if (checked) {
            if (!state[prop].includes(id)) state[prop].push(id);
            // Default first review as hero if none set
            if (type === 'reviews' && !state.heroReviewId) {
                state.heroReviewId = id;
            }
        } else {
            state[prop] = state[prop].filter(x => x !== id);
            if (type === 'reviews' && state.heroReviewId === id) {
                state.heroReviewId = state.selectedReviews[0] || null;
            }
        }

        syncComponentOrderWithContent();
        reorderTabsFromState();
        renderFlowList();
        updateSelectionCounters();
        renderPreview();

        // Refresh card visual selected class
        const card = document.querySelector(`.nl-item-card[data-id="${id}"]`);
        if (card) {
            if (checked) card.classList.add('selected');
            else card.classList.remove('selected');
        }
        if (type === 'reviews') renderReviewsPicker(document.getElementById('nl-search-reviews')?.value || '');
    };

    window.toggleHeroReview = function (id) {
        state.heroReviewId = state.heroReviewId === id ? null : id;
        renderReviewsPicker(document.getElementById('nl-search-reviews')?.value || '');
        renderFlowList();
        renderPreview();
    };

    window.filterPicker = function (type, query) {
        if (type === 'reviews') renderReviewsPicker(query);
        else if (type === 'whatson') renderWhatsOnPicker(query);
        else if (type === 'theatres') renderTheatresPicker(query);
        else if (type === 'news') renderNewsPicker(query);
        else if (type === 'disneyland') renderDisneylandPicker(query);
    };

    window.switchNlPickerTab = function (tabName, btn) {
        document.querySelectorAll('.nl-component-pane').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nl-tab-item').forEach(b => b.classList.remove('active'));
        const target = document.getElementById(`nl-pane-${tabName}`);
        if (target) target.classList.add('active');
        const activeBtn = btn || document.getElementById(`nl-tab-btn-${tabName}`);
        if (activeBtn) activeBtn.classList.add('active');
        renderFlowList();
    };

    function updateSelectionCounters() {
        const setBadge = (id, count) => {
            const el = document.getElementById(id);
            if (el) el.textContent = count;
        };
        setBadge('badge-count-reviews', state.selectedReviews.length);
        setBadge('badge-count-whatson', state.selectedWhatson.length);
        setBadge('badge-count-theatres', state.selectedTheatres.length);
        setBadge('badge-count-news', state.selectedNews.length);
        setBadge('badge-count-disneyland', state.selectedDisneyland.length);
    }

    // --- Campaign Presets ---
    window.applyPreset = function (presetName) {
        state.activePreset = presetName;

        if (presetName === 'digest') {
            state.componentOrder = ['reviews', 'whatson', 'theatres', 'news', 'disneyland', 'callout'];
            state.subject = "✨ Behind the Magic Curtain: New Stage Reviews, What's On & Sensory Guides";
            state.preheader = "Discover our top rated family shows, upcoming West End & regional dates, and sensory guides.";
            state.issueTag = "Monthly Family Stage Round-Up";
            state.introNote = "Welcome to this month's roundup of stage adventures across the UK! From West End spectacles to local touring productions, we've reviewed the performances, detailed accessibility notes, and mapped out what to book next.";
            state.closingNote = "Have you caught a show recently? Reply directly to this email and let us know your thoughts so we can share family feedback with the community.";
            state.showCallout = true;
            state.calloutTitle = "Planning a Theatre Trip with Neurodivergent Children?";
            state.calloutText = "Visit our complete website directory for detailed sensory breakdowns, ear-defender tips, and venue accessibility ratings across the UK.";
            state.calloutBtnText = "Explore Sensory Guides";
            state.calloutBtnUrl = `${state.baseUrl}/reviews.html`;

            state.selectedReviews = dataCache.reviews.slice(0, 2).map(r => r.id);
            state.heroReviewId = state.selectedReviews[0] || null;
            state.selectedWhatson = dataCache.whatson.slice(0, 3).map(w => w.id);
            state.selectedTheatres = dataCache.theatres.slice(0, 1).map(t => t.id);
            state.selectedNews = dataCache.news.slice(0, 2).map(n => n.id);
            state.selectedDisneyland = dataCache.disneyland.slice(0, 1).map(d => d.id);
        } else if (presetName === 'sensory') {
            state.componentOrder = ['reviews', 'disneyland', 'theatres', 'whatson', 'callout'];
            state.subject = "🌟 Sensory-Friendly Theatre Guide & Relaxed Performances";
            state.preheader = "Noise ratings, dark scene warnings, ADHD queue strategies, and relaxed theatre guides for UK families.";
            state.issueTag = "Neurodivergent & Sensory Special";
            state.introNote = "Navigating live theatre with sensory differences or ADHD shouldn't be guesswork. In this special edition, we highlight productions offering relaxed performances, low-sensory breakout zones, and our comprehensive Disneyland Paris sensory breakdown.";
            state.closingNote = "Every child experiences live performance differently. If you need specific sound level or lighting details for an upcoming show, reply directly to this email and our team will gladly check for you.";
            state.showCallout = true;
            state.calloutTitle = "Interactive Sensory Rater & Free Checklists";
            state.calloutText = "Rate noise, darkness, fear, and speed for DLP attractions and download our sensory packing checklist before you go.";
            state.calloutBtnText = "Get Free Sensory Checklists";
            state.calloutBtnUrl = `${state.baseUrl}/disneyland-paris.html`;

            // Filter reviews with sensory or adhd
            state.selectedReviews = dataCache.reviews.filter(r => r.tags?.adhd || r.tags?.sensory).slice(0, 3).map(r => r.id);
            state.heroReviewId = state.selectedReviews[0] || null;
            state.selectedWhatson = dataCache.whatson.slice(0, 2).map(w => w.id);
            state.selectedTheatres = dataCache.theatres.slice(0, 2).map(t => t.id);
            state.selectedNews = [];
            state.selectedDisneyland = dataCache.disneyland.slice(0, 3).map(d => d.id);
        } else if (presetName === 'whatson') {
            state.componentOrder = ['whatson', 'theatres', 'reviews', 'news', 'callout'];
            state.subject = "🎟️ What's On Stage Across the UK: Booking Now & Upcoming Tours!";
            state.preheader = "Plan your family theatre calendar with our curated guide to upcoming musicals, plays, and seasonal tours.";
            state.issueTag = "Upcoming Shows & Stage Seasons";
            state.introNote = "Tickets are moving fast for this season's most anticipated family stage shows and regional tours! Here is your complete booking guide with dates, venues, age recommendations, and ticket links.";
            state.closingNote = "Booking tip: Many regional theatres offer family ticket discounts and booster seat reservations if requested at the box office in advance.";
            state.showCallout = true;
            state.calloutTitle = "Looking for Regional Tour Dates & Booking Links?";
            state.calloutText = "Check our full interactive venue database covering regional theatres, travel tips, and family concessions across the UK.";
            state.calloutBtnText = "Browse Regional Theatres";
            state.calloutBtnUrl = `${state.baseUrl}/theatres.html`;

            state.selectedWhatson = dataCache.whatson.map(w => w.id); // All upcoming shows
            state.selectedTheatres = dataCache.theatres.slice(0, 2).map(t => t.id);
            state.selectedReviews = dataCache.reviews.slice(0, 1).map(r => r.id);
            state.heroReviewId = state.selectedReviews[0] || null;
            state.selectedNews = dataCache.news.slice(0, 2).map(n => n.id);
            state.selectedDisneyland = [];
        } else if (presetName === 'disneyland') {
            state.componentOrder = ['disneyland', 'callout', 'news', 'reviews', 'whatson'];
            state.subject = "🏰 Disneyland Paris Sensory Guide: Queue Strategies & Attraction Tips";
            state.preheader = "Speed, fear, noise, and darkness ratings for Disneyland Paris attractions, plus ADHD queue survival tips.";
            state.issueTag = "Disneyland Paris Special Dispatch";
            state.introNote = "Planning a magical trip to Disneyland Paris? Whether your family loves thrilling coasters or prefers gentle character encounters, our attraction breakdown helps you manage noise, darkness, and queues like a pro.";
            state.closingNote = "Don't forget to pack ear defenders and review our queue strategy before you go. Wishing your family a truly unforgettable and stress-free adventure!";
            state.showCallout = true;
            state.calloutTitle = "Rate DLP Attractions Online & Save Your Ratings";
            state.calloutText = "Save your own custom sensory ratings, calculate queue strategies, and download free printable ride checklists directly from our interactive guide.";
            state.calloutBtnText = "Open Disneyland Paris Guide";
            state.calloutBtnUrl = `${state.baseUrl}/disneyland-paris.html`;

            state.selectedDisneyland = dataCache.disneyland.slice(0, 4).map(d => d.id);
            state.selectedNews = dataCache.news.slice(0, 1).map(n => n.id);
            state.selectedReviews = dataCache.reviews.slice(0, 1).map(r => r.id);
            state.heroReviewId = null;
            state.selectedWhatson = [];
            state.selectedTheatres = [];
        } else if (presetName === 'clear') {
            state.componentOrder = ['reviews', 'whatson', 'theatres', 'news', 'disneyland', 'callout'];
            state.selectedReviews = [];
            state.heroReviewId = null;
            state.selectedWhatson = [];
            state.selectedTheatres = [];
            state.selectedNews = [];
            state.selectedDisneyland = [];
            state.showCallout = false;
        }

        syncUiFromState();
        populateAllPickers();

        // Surface the most relevant component tab for this preset
        if (presetName === 'disneyland') {
            switchNlPickerTab('disneyland');
        } else if (presetName === 'whatson') {
            switchNlPickerTab('whatson');
        } else if (presetName === 'sensory') {
            switchNlPickerTab('reviews');
        } else {
            switchNlPickerTab('reviews');
        }

        renderPreview();
        showNlToast(`Preset applied: ${presetName.toUpperCase()} (Components prioritized & reordered)`);
    };

    // --- Mail Merge Token Inserter ---
    window.insertNlToken = function (tokenType) {
        const textarea = document.getElementById('nl-intro-note');
        if (!textarea) return;

        let tokenText = '';
        if (state.platform === 'hubspot') {
            tokenText = tokenType === 'name' ? "{{ contact.firstname | default('Theatre Friend') }}" : "{{ contact.email }}";
        } else if (state.platform === 'google') {
            tokenText = tokenType === 'name' ? "{{First Name}}" : "{{Email}}";
        } else {
            tokenText = tokenType === 'name' ? "Theatre Friends," : "";
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        textarea.value = val.substring(0, start) + tokenText + val.substring(end);
        state.introNote = textarea.value;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tokenText.length;
        renderPreview();
    };

    // --- State Update Handler from Form Elements ---
    window.handleNlInputChange = function (field, value) {
        state[field] = value;
        if (field === 'platform') {
            updateTokenHints();
        }
        if (field === 'showCallout') {
            updateCalloutFieldsVisibility();
            syncComponentOrderWithContent();
            renderFlowList();
        }
        renderPreview();
    };

    function updateTokenHints() {
        const hintEl = document.getElementById('nl-platform-hint');
        if (!hintEl) return;
        if (state.platform === 'hubspot') {
            hintEl.innerHTML = `<strong>HubSpot mode:</strong> Uses <code>{{ contact.firstname | default('Theatre Friend') }}</code> and <code>{{ unsubscribe_link }}</code>.`;
        } else if (state.platform === 'google') {
            hintEl.innerHTML = `<strong>Google Workspace mode:</strong> Uses <code>{{First Name}}</code> for Gmail Mail Merge &amp; Sheets.`;
        } else {
            hintEl.innerHTML = `<strong>Generic mode:</strong> Clean, static greeting without dynamic tokens.`;
        }
    }

    // --- Switch Preview Device (Desktop vs Mobile) ---
    window.setPreviewDevice = function (device) {
        activePreviewDevice = device;
        const iframe = document.getElementById('nl-preview-frame');
        const dBtn = document.getElementById('btn-prev-desktop');
        const mBtn = document.getElementById('btn-prev-mobile');

        if (device === 'mobile') {
            if (iframe) iframe.style.width = '375px';
            if (dBtn) dBtn.classList.remove('active');
            if (mBtn) mBtn.classList.add('active');
        } else {
            if (iframe) iframe.style.width = '100%';
            if (dBtn) dBtn.classList.add('active');
            if (mBtn) mBtn.classList.remove('active');
        }
    };

    // --- Switch Preview Mode (Visual vs HTML Code) ---
    window.setPreviewMode = function (mode) {
        activePreviewMode = mode;
        const visualWrap = document.getElementById('nl-visual-preview-wrap');
        const codeWrap = document.getElementById('nl-code-preview-wrap');
        const btnV = document.getElementById('btn-mode-visual');
        const btnC = document.getElementById('btn-mode-code');

        if (mode === 'code') {
            if (visualWrap) visualWrap.style.display = 'none';
            if (codeWrap) codeWrap.style.display = 'block';
            if (btnV) btnV.classList.remove('active');
            if (btnC) btnC.classList.add('active');
            updateRawCodeView();
        } else {
            if (visualWrap) visualWrap.style.display = 'block';
            if (codeWrap) codeWrap.style.display = 'none';
            if (btnV) btnV.classList.add('active');
            if (btnC) btnC.classList.remove('active');
        }
    };

    function updateRawCodeView() {
        const codeBox = document.getElementById('nl-raw-code-output');
        if (codeBox) {
            codeBox.value = compileNewsletterHtml();
        }
    }

    // --- Core HTML Email Generator (Bulletproof Standard) ---
    function compileNewsletterHtml() {
        const theme = THEMES[state.theme] || THEMES['btmc-crimson'];
        const base = (state.baseUrl || 'https://behindthemagiccurtain.co.uk').replace(/\/+$/, '');

        // Resolve recipient greeting
        let greetingText = "Dear Theatre Friend,";
        if (state.platform === 'hubspot') {
            greetingText = "Hi {{ contact.firstname | default('Theatre Friend') }},";
        } else if (state.platform === 'google') {
            greetingText = "Hi {{First Name}},";
        } else {
            greetingText = "Hello Theatre Friends,";
        }

        // 1. Compile Selected Reviews HTML
        let reviewsHtml = '';
        if (state.selectedReviews.length > 0) {
            const revItems = state.selectedReviews.map(id => dataCache.reviews.find(r => r.id === id)).filter(Boolean);
            
            const cardsHtml = revItems.map(item => {
                const isHero = state.heroReviewId === item.id;
                const imgUrl = item.mainImage ? `${base}/images/${item.mainImage}` : `${base}/images/placeholder.webp`;
                const linkUrl = `${base}/${item.slug}`;
                const ratingStars = '★'.repeat(Math.min(5, Math.floor(item.rating || 5)));

                let tagPills = `<span style="display:inline-block; padding:3px 8px; font-size:11px; font-weight:700; color:#0369a1; background-color:#e0f2fe; border-radius:4px; margin-right:4px;">${item.age || 'All Ages'}</span>`;
                if (item.tags?.adhd) {
                    tagPills += `<span style="display:inline-block; padding:3px 8px; font-size:11px; font-weight:700; color:#b45309; background-color:#fef3c7; border-radius:4px; margin-right:4px;">ADHD Friendly</span>`;
                }
                if (item.tags?.sensory) {
                    tagPills += `<span style="display:inline-block; padding:3px 8px; font-size:11px; font-weight:700; color:#0f766e; background-color:#ccfbf1; border-radius:4px; margin-right:4px;">Sensory Notes</span>`;
                }

                if (isHero) {
                    return `
                    <!-- Hero Review Card -->
                    <tr>
                        <td style="padding: 0 0 20px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid ${theme.border}; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td>
                                        <a href="${linkUrl}" target="_blank" style="text-decoration: none; display: block;">
                                            <img src="${imgUrl}" alt="${escapeHtml(item.title)}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <div style="margin-bottom: 8px;">${tagPills}</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #d97706; margin-bottom: 4px;">${ratingStars} ${item.rating} / 5.0 Rating</div>
                                        <h3 style="margin: 0 0 6px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: ${theme.textPrimary}; line-height: 1.3;">
                                            <a href="${linkUrl}" target="_blank" style="color: ${theme.textPrimary}; text-decoration: none;">${escapeHtml(item.title)}</a>
                                        </h3>
                                        ${item.subtitle ? `<p style="margin: 0 0 10px 0; font-size: 14px; color: ${theme.accent}; font-weight: 600;">${escapeHtml(item.subtitle)}</p>` : ''}
                                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${theme.textMuted};">
                                            ${escapeHtml(item.summary || '')}
                                        </p>
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="border-radius: 6px; background-color: ${theme.primary};">
                                                    <a href="${linkUrl}" target="_blank" style="display: inline-block; padding: 10px 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 6px;">
                                                        Read Full Review &amp; Sensory Guide &rarr;
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    `;
                }

                // Standard Review Card
                return `
                <tr>
                    <td style="padding: 0 0 14px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid ${theme.border}; border-radius: 8px; padding: 16px;">
                            <tr>
                                <td width="110" valign="top" style="padding-right: 16px;">
                                    <a href="${linkUrl}" target="_blank">
                                        <img src="${imgUrl}" alt="${escapeHtml(item.title)}" width="110" style="width: 110px; height: 85px; object-fit: cover; border-radius: 6px; display: block; border: 0;" />
                                    </a>
                                </td>
                                <td valign="top">
                                    <div style="font-size: 12px; font-weight: bold; color: #d97706; margin-bottom: 2px;">${ratingStars} ${item.rating}★</div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: ${theme.textPrimary}; line-height: 1.3;">
                                        <a href="${linkUrl}" target="_blank" style="color: ${theme.textPrimary}; text-decoration: none;">${escapeHtml(item.title)}</a>
                                    </h4>
                                    <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: ${theme.textMuted};">
                                        ${escapeHtml(item.summary ? item.summary.substring(0, 110) + '...' : '')}
                                    </p>
                                    <div style="margin-bottom: 8px;">${tagPills}</div>
                                    <a href="${linkUrl}" target="_blank" style="font-size: 12px; font-weight: bold; color: ${theme.primary}; text-decoration: none;">
                                        Read Review &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                `;
            }).join('');

            reviewsHtml = `
            <!-- REVIEWS SECTION -->
            <tr>
                <td style="padding: 24px 20px 8px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 2px solid ${theme.primary}; margin-bottom: 18px;">
                        <tr>
                            <td style="padding-bottom: 8px; font-family: 'Poppins', -apple-system, sans-serif; font-size: 16px; font-weight: 800; color: ${theme.primary}; text-transform: uppercase; letter-spacing: 0.5px;">
                                ★ Stage Reviews &amp; Sensory Guides
                            </td>
                            <td align="right" style="padding-bottom: 8px;">
                                <a href="${base}/reviews.html" target="_blank" style="font-size: 12px; font-weight: bold; color: ${theme.accent}; text-decoration: none;">View All &rarr;</a>
                            </td>
                        </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${cardsHtml}
                    </table>
                </td>
            </tr>
            `;
        }

        // 2. Compile Selected What's On HTML
        let whatsonHtml = '';
        if (state.selectedWhatson.length > 0) {
            const woItems = state.selectedWhatson.map(id => dataCache.whatson.find(w => w.id === id)).filter(Boolean);

            const cardsHtml = woItems.map(item => {
                const imgUrl = item.image ? `${base}/images/${item.image}` : `${base}/images/placeholder.webp`;
                const ticketLink = item.ticketLink || `${base}/whats-on.html`;
                const cleanSnippet = stripHtml(item.desc || '').substring(0, 120);

                return `
                <tr>
                    <td style="padding: 0 0 14px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid ${theme.border}; border-radius: 8px; padding: 16px;">
                            <tr>
                                <td width="95" valign="top" style="padding-right: 14px;">
                                    <img src="${imgUrl}" alt="${escapeHtml(item.title)}" width="95" style="width: 95px; height: 110px; object-fit: cover; border-radius: 6px; display: block; border: 0;" />
                                </td>
                                <td valign="top">
                                    <span style="display:inline-block; padding:2px 7px; font-size:10px; font-weight:bold; color:#0369a1; background-color:#e0f2fe; border-radius:3px; margin-bottom:4px;">${item.age || 'All Ages'}</span>
                                    <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: ${theme.textPrimary}; line-height: 1.3;">${escapeHtml(item.title)}</h4>
                                    <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: ${theme.accent};">
                                        📍 ${escapeHtml(item.venue)}
                                    </p>
                                    <p style="margin: 0 0 8px 0; font-size: 12px; color: ${theme.textMuted};">
                                        🗓️ ${escapeHtml(item.dates)}
                                    </p>
                                    <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: ${theme.textMuted};">
                                        ${escapeHtml(cleanSnippet)}...
                                    </p>
                                    <table cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center" style="border-radius: 4px; background-color: ${theme.accent};">
                                                <a href="${ticketLink}" target="_blank" style="display: inline-block; padding: 7px 16px; font-size: 12px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 4px;">
                                                    Show Details &amp; Tickets &rarr;
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                `;
            }).join('');

            whatsonHtml = `
            <!-- WHAT'S ON SECTION -->
            <tr>
                <td style="padding: 16px 20px 8px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 2px solid ${theme.accent}; margin-bottom: 18px;">
                        <tr>
                            <td style="padding-bottom: 8px; font-family: 'Poppins', -apple-system, sans-serif; font-size: 16px; font-weight: 800; color: ${theme.accent}; text-transform: uppercase; letter-spacing: 0.5px;">
                                📅 What's On On Stage &amp; Booking Now
                            </td>
                            <td align="right" style="padding-bottom: 8px;">
                                <a href="${base}/whats-on.html" target="_blank" style="font-size: 12px; font-weight: bold; color: ${theme.primary}; text-decoration: none;">Full Calendar &rarr;</a>
                            </td>
                        </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${cardsHtml}
                    </table>
                </td>
            </tr>
            `;
        }

        // 3. Compile Selected Theatres HTML
        let theatresHtml = '';
        if (state.selectedTheatres.length > 0) {
            const thItems = state.selectedTheatres.map(id => dataCache.theatres.find(t => t.id === id)).filter(Boolean);

            const cardsHtml = thItems.map(item => {
                const imgUrl = item.image ? `${base}/images/${item.image}` : `${base}/images/theatre-default.webp`;
                const venueUrl = item.website || `${base}/theatres.html`;
                const accessSnippet = stripHtml(item.accessibility || '').substring(0, 140);
                const relaxedSnippet = stripHtml(item.relaxed || '').substring(0, 140);

                return `
                <tr>
                    <td style="padding: 0 0 14px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 18px;">
                            <tr>
                                <td width="100" valign="top" style="padding-right: 16px;">
                                    <img src="${imgUrl}" alt="${escapeHtml(item.name)}" width="100" style="width: 100px; height: 90px; object-fit: cover; border-radius: 6px; display: block; border: 0;" />
                                </td>
                                <td valign="top">
                                    <span style="display:inline-block; padding:2px 7px; font-size:10px; font-weight:bold; color:#7e22ce; background-color:#f3e8ff; border-radius:3px; margin-bottom:4px;">${escapeHtml(item.location)}</span>
                                    <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: bold; color: #581c87; line-height: 1.3;">${escapeHtml(item.name)}</h4>
                                    <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.5; color: #4b5563;">
                                        <strong>Accessibility:</strong> ${escapeHtml(accessSnippet)}...
                                    </p>
                                    ${relaxedSnippet ? `
                                    <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.5; color: #4b5563;">
                                        <strong>Relaxed Performances:</strong> ${escapeHtml(relaxedSnippet)}...
                                    </p>` : ''}
                                    <a href="${venueUrl}" target="_blank" style="font-size: 12px; font-weight: bold; color: #7e22ce; text-decoration: none;">
                                        Official Venue Guide &amp; Access Info &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                `;
            }).join('');

            theatresHtml = `
            <!-- THEATRES SECTION -->
            <tr>
                <td style="padding: 16px 20px 8px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 2px solid #9333ea; margin-bottom: 18px;">
                        <tr>
                            <td style="padding-bottom: 8px; font-family: 'Poppins', -apple-system, sans-serif; font-size: 16px; font-weight: 800; color: #7e22ce; text-transform: uppercase; letter-spacing: 0.5px;">
                                🏛️ Theatre Spotlight &amp; Accessibility Guide
                            </td>
                            <td align="right" style="padding-bottom: 8px;">
                                <a href="${base}/theatres.html" target="_blank" style="font-size: 12px; font-weight: bold; color: #7e22ce; text-decoration: none;">All Venues &rarr;</a>
                            </td>
                        </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${cardsHtml}
                    </table>
                </td>
            </tr>
            `;
        }

        // 4. Compile Selected News Stories HTML
        let newsHtml = '';
        if (state.selectedNews.length > 0) {
            const nwItems = state.selectedNews.map(id => dataCache.news.find(n => n.id === id)).filter(Boolean);

            const cardsHtml = nwItems.map(item => {
                const imgUrl = item.mainImage ? `${base}/images/${item.mainImage}` : `${base}/images/placeholder.webp`;
                const storyUrl = `${base}/${item.slug}`;
                const dateStr = item.datePublished ? new Date(item.datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

                return `
                <tr>
                    <td style="padding: 0 0 14px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid ${theme.border}; border-radius: 8px; padding: 16px;">
                            <tr>
                                <td width="100" valign="top" style="padding-right: 14px;">
                                    <a href="${storyUrl}" target="_blank">
                                        <img src="${imgUrl}" alt="${escapeHtml(item.title)}" width="100" style="width: 100px; height: 80px; object-fit: cover; border-radius: 6px; display: block; border: 0;" />
                                    </a>
                                </td>
                                <td valign="top">
                                    <div style="margin-bottom: 3px;">
                                        <span style="display:inline-block; padding:2px 7px; font-size:10px; font-weight:bold; color:#1d4ed8; background-color:#dbeafe; border-radius:3px;">${escapeHtml(item.category || 'Theatre News')}</span>
                                        ${dateStr ? `<span style="font-size: 11px; color: ${theme.textMuted}; margin-left: 6px;">• ${dateStr}</span>` : ''}
                                    </div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: bold; color: ${theme.textPrimary}; line-height: 1.3;">
                                        <a href="${storyUrl}" target="_blank" style="color: ${theme.textPrimary}; text-decoration: none;">${escapeHtml(item.title)}</a>
                                    </h4>
                                    <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: ${theme.textMuted};">
                                        ${escapeHtml(item.summary ? item.summary.substring(0, 110) + '...' : '')}
                                    </p>
                                    <a href="${storyUrl}" target="_blank" style="font-size: 12px; font-weight: bold; color: #2563eb; text-decoration: none;">
                                        Read Story &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                `;
            }).join('');

            newsHtml = `
            <!-- NEWS STORIES SECTION -->
            <tr>
                <td style="padding: 16px 20px 8px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 2px solid #2563eb; margin-bottom: 18px;">
                        <tr>
                            <td style="padding-bottom: 8px; font-family: 'Poppins', -apple-system, sans-serif; font-size: 16px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
                                📰 Theatre News &amp; Castings
                            </td>
                            <td align="right" style="padding-bottom: 8px;">
                                <a href="${base}/news.html" target="_blank" style="font-size: 12px; font-weight: bold; color: #2563eb; text-decoration: none;">All News &rarr;</a>
                            </td>
                        </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${cardsHtml}
                    </table>
                </td>
            </tr>
            `;
        }

        // 5. Compile Selected Disneyland Paris HTML
        let disneylandHtml = '';
        if (state.selectedDisneyland.length > 0) {
            const dlpItems = state.selectedDisneyland.map(id => dataCache.disneyland.find(d => d.id === id)).filter(Boolean);

            const cardsHtml = dlpItems.map(item => {
                return `
                <tr>
                    <td style="padding: 0 0 14px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px;">
                            <tr>
                                <td>
                                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                                        <span style="display:inline-block; padding:2px 7px; font-size:10px; font-weight:bold; color:#854d0e; background-color:#fef9c3; border-radius:3px;">${escapeHtml(item.park)} • ${escapeHtml(item.land)}</span>
                                    </div>
                                    <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: bold; color: #713f12; line-height: 1.3;">${escapeHtml(item.name)}</h4>
                                    
                                    <!-- Sensory Ratings Scorecard -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #fef08a; border-radius: 6px; margin-bottom: 8px; font-size: 12px; color: #713f12;">
                                        <tr>
                                            <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #fef08a;">
                                                <div style="font-size: 10px; text-transform: uppercase; color: #a16207;">Speed</div>
                                                <strong>${item.thrillLevel || 3}/5</strong>
                                            </td>
                                            <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #fef08a;">
                                                <div style="font-size: 10px; text-transform: uppercase; color: #a16207;">Fear</div>
                                                <strong>${item.fearFactor || 3}/5</strong>
                                            </td>
                                            <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #fef08a;">
                                                <div style="font-size: 10px; text-transform: uppercase; color: #a16207;">Noise</div>
                                                <strong>${item.noiseLevel || 3}/5</strong>
                                            </td>
                                            <td style="padding: 6px 8px; text-align: center;">
                                                <div style="font-size: 10px; text-transform: uppercase; color: #a16207;">Darkness</div>
                                                <strong>${item.darkness || 3}/5</strong>
                                            </td>
                                        </tr>
                                    </table>

                                    ${item.adhdTip ? `
                                    <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.5; color: #854d0e; background: #fffbeb; padding: 8px 10px; border-radius: 4px; border-left: 3px solid #eab308;">
                                        <strong>💡 Sensory / ADHD Tip:</strong> ${escapeHtml(item.adhdTip)}
                                    </p>` : ''}
                                    
                                    <a href="${base}/disneyland-paris.html" target="_blank" style="font-size: 12px; font-weight: bold; color: #854d0e; text-decoration: none;">
                                        Interactive DLP Sensory Rater &amp; Queue Guide &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                `;
            }).join('');

            disneylandHtml = `
            <!-- DISNEYLAND PARIS SECTION -->
            <tr>
                <td style="padding: 16px 20px 8px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 2px solid #ca8a04; margin-bottom: 18px;">
                        <tr>
                            <td style="padding-bottom: 8px; font-family: 'Poppins', -apple-system, sans-serif; font-size: 16px; font-weight: 800; color: #854d0e; text-transform: uppercase; letter-spacing: 0.5px;">
                                ✨ Disneyland Paris Sensory &amp; ADHD Strategies
                            </td>
                            <td align="right" style="padding-bottom: 8px;">
                                <a href="${base}/disneyland-paris.html" target="_blank" style="font-size: 12px; font-weight: bold; color: #854d0e; text-decoration: none;">Full DLP Guide &rarr;</a>
                            </td>
                        </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${cardsHtml}
                    </table>
                </td>
            </tr>
            `;
        }

        // 6. Optional Callout Banner
        let calloutHtml = '';
        if (state.showCallout) {
            calloutHtml = `
            <!-- CALLOUT BANNER -->
            <tr>
                <td style="padding: 16px 20px 10px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%); border-radius: 8px; padding: 24px; text-align: center;">
                        <tr>
                            <td>
                                <h3 style="margin: 0 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; color: #ffffff;">${escapeHtml(state.calloutTitle || '')}</h3>
                                <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #fecdd3; max-width: 480px; margin-left: auto; margin-right: auto;">
                                    ${escapeHtml(state.calloutText || '')}
                                </p>
                                <table cellpadding="0" cellspacing="0" border="0" align="center">
                                    <tr>
                                        <td align="center" style="border-radius: 6px; background-color: ${theme.gold};">
                                            <a href="${escapeHtml(state.calloutBtnUrl || base)}" target="_blank" style="display: inline-block; padding: 10px 24px; font-size: 13px; font-weight: bold; color: #1e293b; text-decoration: none; border-radius: 6px;">
                                                ${escapeHtml(state.calloutBtnBtnText || state.calloutBtnText || 'Explore Now')} &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            `;
        }

        // Unsubscribe text / link directed to existing unsubscribe.html functionality
        const unsubPageUrl = state.platform === 'hubspot' 
            ? `${base}/unsubscribe.html?email={{ contact.email }}`
            : (state.platform === 'google' ? `${base}/unsubscribe.html?email={{Email}}` : `${base}/unsubscribe.html`);

        let unsubscribeMarkup = '';
        if (state.platform === 'hubspot') {
            unsubscribeMarkup = `
                <p style="margin: 14px 0 0 0; font-size: 11px; line-height: 1.6; color: #94a3b8;">
                    You received this email because you opted in to Behind the Magic Curtain updates.<br />
                    To unsubscribe, <a href="${unsubPageUrl}" target="_blank" style="color: ${theme.primary}; text-decoration: underline; font-weight: 600;">visit our unsubscribe page</a> (or <a href="{{ unsubscribe_link }}" style="color: #64748b; text-decoration: underline;">instant 1-click unsubscribe</a>), or simply reply with &quot;Unsubscribe&quot; and we will remove you promptly.
                </p>
            `;
        } else {
            unsubscribeMarkup = `
                <p style="margin: 14px 0 0 0; font-size: 11px; line-height: 1.6; color: #94a3b8;">
                    You received this email because you opted in to Behind the Magic Curtain updates.<br />
                    To unsubscribe, <a href="${unsubPageUrl}" target="_blank" style="color: ${theme.primary}; text-decoration: underline; font-weight: 600;">visit our unsubscribe page</a>, or simply reply with &quot;Unsubscribe&quot; and we will remove you promptly.
                </p>
            `;
        }

        // Assemble dynamic content sections in prioritized component order
        const sectionMap = {
            reviews: reviewsHtml,
            whatson: whatsonHtml,
            theatres: theatresHtml,
            news: newsHtml,
            disneyland: disneylandHtml,
            callout: calloutHtml
        };

        const activeOrder = (Array.isArray(state.componentOrder) && state.componentOrder.length > 0)
            ? state.componentOrder
            : ['reviews', 'whatson', 'theatres', 'news', 'disneyland', 'callout'];

        const dynamicSectionsHtml = activeOrder
            .map(key => sectionMap[key] || '')
            .filter(Boolean)
            .join('\n');

        // Full Email Template Assembly
        return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${escapeHtml(state.subject)}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
    </style>
    <![endif]-->
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: ${theme.bgBody}; }
        table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        @media only screen and (max-width: 620px) {
            .email-container { width: 100% !important; max-width: 100% !important; }
            .header-cell { padding: 24px 16px !important; }
            .content-cell { padding: 16px 14px !important; }
            .footer-cell { padding: 20px 14px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${theme.bgBody}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <!-- Inbox Preheader Preview Text -->
    <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
        ${escapeHtml(state.preheader)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>

    <center style="width: 100%; background-color: ${theme.bgBody}; padding: 25px 0 40px 0;">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${theme.cardBg}; margin: 0 auto; border-radius: 8px; border: 1px solid ${theme.border}; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            
            <!-- HEADER / BRANDING -->
            <tr>
                <td class="header-cell" style="background-color: ${theme.primary}; padding: 30px 24px; text-align: center; border-bottom: 4px solid ${theme.gold};">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center">
                                ${state.issueTag ? `<span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1e293b; background-color: ${theme.gold}; border-radius: 20px; margin-bottom: 12px;">${escapeHtml(state.issueTag)}</span>` : ''}
                                <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                                    <a href="${base}" target="_blank" style="color: #ffffff; text-decoration: none;">${escapeHtml(state.headerTitle)}</a>
                                </h1>
                                <p style="margin: 8px 0 0 0; font-size: 13px; color: #fecdd3; font-weight: 500;">
                                    ${escapeHtml(state.headerSubtitle)}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- INTRO / EDITOR LETTER -->
            <tr>
                <td class="content-cell" style="padding: 26px 24px 16px 24px; background-color: #ffffff;">
                    <p style="margin: 0 0 14px 0; font-size: 16px; font-weight: bold; color: ${theme.textPrimary};">
                        ${greetingText}
                    </p>
                    <div style="font-size: 14px; line-height: 1.7; color: ${theme.textPrimary};">
                        ${state.introNote}
                    </div>
                </td>
            </tr>

            <!-- DYNAMIC CONTENT SECTIONS (ORDERED BY PRESET / CUSTOM PRIORITY) -->
            ${dynamicSectionsHtml}

            <!-- CLOSING NOTE & SIGN-OFF -->
            <tr>
                <td class="content-cell" style="padding: 16px 24px 24px 24px; background-color: #ffffff; border-top: 1px solid ${theme.border};">
                    ${state.closingNote ? `
                    <div style="font-size: 14px; line-height: 1.6; color: ${theme.textMuted}; margin-bottom: 16px;">
                        ${state.closingNote}
                    </div>` : ''}
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: ${theme.textPrimary};">
                        Warmest regards,<br />
                        <strong>${escapeHtml(state.signoffName)}</strong><br />
                        <span style="font-size: 12px; color: ${theme.textMuted};">${escapeHtml(state.signoffTitle)}</span>
                    </p>
                </td>
            </tr>

            <!-- FOOTER LINKS & COMPLIANCE -->
            <tr>
                <td class="footer-cell" style="background-color: #f8fafc; padding: 28px 24px; text-align: center; border-top: 1px solid ${theme.border};">
                    <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: bold; color: ${theme.textMuted};">
                        <a href="${base}/reviews.html" target="_blank" style="color: ${theme.primary}; text-decoration: none; margin: 0 8px;">Reviews</a> |
                        <a href="${base}/whats-on.html" target="_blank" style="color: ${theme.primary}; text-decoration: none; margin: 0 8px;">What's On</a> |
                        <a href="${base}/theatres.html" target="_blank" style="color: ${theme.primary}; text-decoration: none; margin: 0 8px;">Theatre Guide</a> |
                        <a href="${base}/news.html" target="_blank" style="color: ${theme.primary}; text-decoration: none; margin: 0 8px;">News</a> |
                        <a href="${base}/disneyland-paris.html" target="_blank" style="color: ${theme.primary}; text-decoration: none; margin: 0 8px;">Disneyland Paris</a>
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: ${theme.textMuted};">
                        &copy; ${new Date().getFullYear()} Behind the Magic Curtain. All rights reserved.
                    </p>
                    ${unsubscribeMarkup}
                </td>
            </tr>

        </table>
    </center>
</body>
</html>`;
    }

    // --- Render Live Preview ---
    function renderPreview() {
        const html = compileNewsletterHtml();
        const iframe = document.getElementById('nl-preview-frame');
        if (iframe) {
            iframe.srcdoc = html;
        }

        if (activePreviewMode === 'code') {
            updateRawCodeView();
        }
    }

    // --- Clipboard Exporters ---
    window.copyNewsletterHtml = async function () {
        const html = compileNewsletterHtml();
        try {
            await navigator.clipboard.writeText(html);
            showNlToast('✅ Clean HTML copied to clipboard (Ready for HubSpot/ESP)!', 'status-success');
        } catch (err) {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = html;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showNlToast('✅ Clean HTML copied to clipboard!', 'status-success');
        }
    };

    window.copyNewsletterRichText = async function () {
        const html = compileNewsletterHtml();
        try {
            if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
                const blobHtml = new Blob([html], { type: 'text/html' });
                const blobText = new Blob([stripHtml(html)], { type: 'text/plain' });
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': blobHtml,
                        'text/plain': blobText
                    })
                ]);
                showNlToast('🎉 Formatted email copied! Paste directly into Gmail or HubSpot WYSIWYG!', 'status-success');
            } else {
                await navigator.clipboard.writeText(html);
                showNlToast('✅ HTML copied to clipboard!', 'status-success');
            }
        } catch (err) {
            console.warn('Rich text copy fallback:', err);
            await navigator.clipboard.writeText(html);
            showNlToast('✅ Copied raw HTML (Rich text unsupported by browser)', 'status-success');
        }
    };

    window.downloadNewsletterHtml = function () {
        const html = compileNewsletterHtml();
        const dateStr = new Date().toISOString().substring(0, 10);
        const filename = `btmc-newsletter-${dateStr}.html`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNlToast(`📥 Downloaded ${filename}!`, 'status-success');
    };

    window.openNewsletterPreviewTab = function () {
        const html = compileNewsletterHtml();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    window.copySubjectLine = function () {
        const subj = document.getElementById('nl-subject')?.value || state.subject;
        navigator.clipboard.writeText(subj);
        showNlToast('📋 Subject line copied to clipboard!', 'status-success');
    };

    // --- Helper Utilities ---
    function stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showNlToast(msg, type = 'status-success') {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            const toast = document.getElementById('status-toast');
            if (toast) {
                toast.textContent = msg;
                toast.className = type;
                toast.style.display = 'block';
                setTimeout(() => { toast.style.display = 'none'; }, 3000);
            }
        }
    }

})();
