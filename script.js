/*
 * BEHIND THE MAGIC CURTAIN - CORE ENGINE (V2.2)
 * Smooth Drop-Down Search Tray, Dynamic Nav Switchboard, Multi-Filters & Footer Ingestion
 */

document.addEventListener('DOMContentLoaded', () => {
    initDynamicNavigation();
    initGlobalSearchTray();
    initGlobalFooter();
    initDynamicPages();
});

/* --- 1. Dynamic Nav Controller (Admin Toggleable) --- */
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
            // Close search bar if opening mobile menu
            const tray = document.getElementById('btmc-search-tray');
            if (tray && tray.classList.contains('active')) {
                toggleSearchTray(false);
            }
            mainNav.classList.toggle('nav-open');
        });

        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('nav-open') && !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
                mainNav.classList.remove('nav-open');
            }
        });
    }
}

/* --- 2. Drop-Down Search Tray Controller --- */
function initGlobalSearchTray() {
    const siteHeader = document.querySelector('.site-header');
    if (!siteHeader) return;

    // Inject Trigger Button into Header if not in HTML
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

    // Build the Drop-Down Search Tray directly beneath the header
    if (!document.getElementById('btmc-search-tray')) {
        const trayHtml = `
            <div id="btmc-search-tray" class="search-dropdown-tray">
                <div class="container">
                    <div class="search-tray-inner">
                        <div class="search-input-wrap">
                            <i class="fa-solid fa-magnifying-glass search-field-icon"></i>
                            <input type="search" id="global-search-input" placeholder="Search shows, venues, reviews, sensory guides..." autocomplete="off">
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
            const isOpen = tray.classList.contains('active');
            toggleSearchTray(!isOpen);
        });

        document.getElementById('close-search-tray-btn').addEventListener('click', () => toggleSearchTray(false));

        document.getElementById('global-search-input').addEventListener('input', debounceSearch(handleGlobalSearchInput, 250));

        // Click outside or press Esc to close
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
        if (mainNav && mainNav.classList.contains('nav-open')) {
            mainNav.classList.remove('nav-open');
        }
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
            fetch('data/disneyland.json').then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        let matches = [];

        reviews.forEach(r => {
            if (`${r.title} ${r.summary} ${r.subtitle || ''}`.toLowerCase().includes(query)) {
                matches.push({ type: 'Review', title: r.title, desc: r.summary, url: r.slug, badge: `${r.rating}★ Review` });
            }
        });

        whatson.forEach(w => {
            if (`${w.title} ${w.venue} ${w.desc}`.toLowerCase().includes(query)) {
                matches.push({ type: "What's On", title: w.title, desc: `${w.venue} • ${w.dates}`, url: w.ticketLink || 'whats-on.html', badge: 'Live Show' });
            }
        });

        theatres.forEach(t => {
            if (`${t.name} ${t.location} ${t.accessibility}`.toLowerCase().includes(query)) {
                matches.push({ type: 'Theatre Guide', title: t.name, desc: `${t.location} - ${t.accessibility.substring(0, 80)}...`, url: 'theatre-guide.html', badge: 'Venue' });
            }
        });

        news.forEach(n => {
            if (`${n.title} ${n.summary} ${n.category || ''}`.toLowerCase().includes(query)) {
                matches.push({ type: 'News', title: n.title, desc: n.summary, url: n.slug, badge: n.category || 'News' });
            }
        });

        dlp.forEach(d => {
            if (`${d.name} ${d.land} ${d.sensoryNotes || ''}`.toLowerCase().includes(query)) {
                matches.push({ type: 'Disneyland Paris', title: d.name, desc: `${d.park} (${d.land}) - ${d.sensoryNotes || ''}`, url: 'disneyland-paris.html', badge: 'DLP Sensory' });
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
        resultsContainer.innerHTML = `<p class="search-msg" style="color:var(--color-primary);">Search encountered an error. Please try again.</p>`;
    }
}

/* --- 3. Dynamic Page Switcher --- */
function initDynamicPages() {
    if (document.querySelector('.home-featured .card-grid')) loadFeaturedReviews();
    if (document.querySelector('#all-reviews-grid')) loadReviewsDirectory();
    if (document.querySelector('#whatson-list')) loadWhatsOnDirectory();
    if (document.querySelector('#theatre-list')) loadTheatreGuideDirectory();
    if (document.querySelector('#news-feed-list')) loadNewsDirectory();
    if (document.querySelector('#panto-list')) loadPantomimeDirectory();
}

/* --- 4. Theatres Guide with Search & Location Grouping --- */
async function loadTheatreGuideDirectory() {
    const container = document.getElementById('theatre-list');
    const searchInput = document.getElementById('theatre-search-input');
    const locationSelect = document.getElementById('theatre-location-filter');
    if (!container) return;

    try {
        const res = await fetch('data/theatres.json');
        if (!res.ok) throw new Error('Could not load Theatres');
        const theatres = await res.json();
        theatres.sort((a, b) => (a.rank || 0) - (b.rank || 0));

        if (locationSelect) {
            const locations = [...new Set(theatres.map(t => t.location).filter(Boolean))].sort();
            locationSelect.innerHTML = '<option value="all">All Locations</option>' + locations.map(l => `<option value="${l}">${l}</option>`).join('');
        }

        const render = () => {
            const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const loc = locationSelect ? locationSelect.value : 'all';

            const filtered = theatres.filter(t => {
                const matchesText = `${t.name} ${t.location} ${t.accessibility}`.toLowerCase().includes(q);
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

/* --- 5. What's On with Search, Touring Badge & Filtering --- */
async function loadWhatsOnDirectory() {
    const container = document.getElementById('whatson-list');
    const searchInput = document.getElementById('whatson-search-input');
    const typeFilter = document.getElementById('whatson-type-filter');
    if (!container) return;

    try {
        const res = await fetch('data/whatson.json');
        if (!res.ok) throw new Error('Could not load What\'s On');
        const shows = await res.json();
        const today = new Date().toISOString().split('T')[0];

        const activeShows = shows
            .filter(s => !s.expiryDate || s.expiryDate >= today)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));

        const render = () => {
            const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const filterType = typeFilter ? typeFilter.value : 'all';

            const filtered = activeShows.filter(s => {
                const matchesText = `${s.title} ${s.venue} ${s.desc}`.toLowerCase().includes(q);
                let matchesType = true;
                if (filterType === 'touring') matchesType = !!s.isTouring;
                if (filterType === 'west-midlands') matchesType = (s.region || '').toLowerCase().includes('midlands') || (s.venue || '').toLowerCase().includes('birmingham') || (s.venue || '').toLowerCase().includes('wolverhampton');
                if (filterType === 'london') matchesType = (s.region || '').toLowerCase().includes('london') || (s.venue || '').toLowerCase().includes('london');
                if (filterType === 'panto') matchesType = (s.category || '').toLowerCase() === 'panto';
                return matchesText && matchesType;
            });

            container.innerHTML = filtered.length > 0
                ? filtered.map(s => buildWhatsOnCardHTML(s)).join('')
                : '<p style="text-align:center; color:#777; margin:30px 0;">No shows match your search criteria. Check back soon!</p>';
        };

        render();

        if (searchInput) searchInput.addEventListener('input', render);
        if (typeFilter) typeFilter.addEventListener('change', render);

    } catch (e) {
        console.warn('What\'s On fallback:', e);
    }
}

/* --- 6. News Feed Renderer --- */
async function loadNewsDirectory() {
    const container = document.getElementById('news-feed-list');
    if (!container) return;

    try {
        const res = await fetch('data/news.json');
        if (!res.ok) throw new Error('Could not load News');
        const news = await res.json();

        const published = news
            .filter(n => n.status === 'published')
            .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));

        container.innerHTML = published.length > 0
            ? published.map(n => buildNewsCardHTML(n)).join('')
            : '<p style="text-align:center; color:#777; margin:30px 0;">No news stories published yet. Check back soon!</p>';
    } catch (e) {
        console.warn('News load failure:', e);
    }
}

/* --- 7. Seasonal Pantomime Feed Renderer --- */
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

/* --- 8. HTML Builders --- */
function buildWhatsOnCardHTML(s) {
    return `
    <article class="listing-card">
        <div class="listing-image">
            <img src="images/${s.image}" alt="${s.title}" loading="lazy" decoding="async">
        </div>
        <div class="listing-content">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <h3 style="margin:0;">${s.title}</h3>
                ${s.isTouring ? '<span class="tag tag-touring"><i class="fa-solid fa-route"></i> UK Tour</span>' : ''}
            </div>
            <div class="card-tags" style="margin:8px 0 12px 0;">
                <span class="tag tag-age">${s.age}</span>
                ${s.category === 'panto' ? '<span class="tag tag-mature" style="background:#d81b60;">Pantomime</span>' : ''}
            </div>
            <ul class="listing-info">
                <li><i class="fa-solid fa-location-dot"></i> <span>${s.venue}</span></li>
                <li><i class="fa-solid fa-calendar-days"></i> <span>${s.dates}</span></li>
                ${s.runtime ? `<li><i class="fa-solid fa-clock"></i> <span>${s.runtime}</span></li>` : ''}
            </ul>
            <p>${s.desc}</p>
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
    <article class="card news-card">
        <img src="images/${n.mainImage}" alt="${n.altText || n.title}" loading="lazy" decoding="async">
        <div class="card-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="tag" style="background:var(--color-accent);">${n.category || 'News'}</span>
                <time datetime="${n.datePublished}" style="font-size:0.8rem; color:#777;"><i class="fa-regular fa-clock"></i> ${formattedDate}</time>
            </div>
            <h3>${n.title}</h3>
            <p>${n.summary}</p>
            <a href="${n.slug}" class="btn btn-secondary">Read Full Story</a>
        </div>
    </article>`;
}

function buildTheatreCardHTML(t) {
    return `
    <article class="theatre-card">
        <div class="theatre-img-container">
            <img src="images/${t.image}" alt="${t.name}" loading="lazy" decoding="async">
        </div>
        <div class="theatre-info">
            <h2>${t.name}</h2>
            <span class="theatre-location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${t.location}</span>
            <div class="theatre-meta">
                <p><strong>Accessibility:</strong> ${t.accessibility}</p>
                <p><strong>Relaxed Performances:</strong> ${t.relaxed}</p>
            </div>
            ${t.website ? `<a href="${t.website}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Visit Theatre Website</a>` : ''}
        </div>
    </article>`;
}

function buildReviewCardHTML(r) {
    const ratingPercent = Math.min(100, Math.max(0, ((parseFloat(r.rating) || 5) / 5) * 100));
    let tagsHTML = `<span class="tag tag-age">${r.age || 'All Ages'}</span>`;
    if (r.tags?.adhd) tagsHTML += `\n<span class="tag tag-adhd">ADHD-Friendly Guide</span>`;
    if (r.tags?.sensory) tagsHTML += `\n<span class="tag tag-sensory">Sensory Notes</span>`;

    return `
    <article class="card">
        <img src="images/${r.mainImage}" alt="${r.altText || r.title}" loading="lazy" decoding="async">
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
            <a href="${r.slug}" class="btn btn-secondary">Read Full Review</a>
        </div>
    </article>`;
}

async function loadFeaturedReviews() {
    const container = document.querySelector('.home-featured .card-grid');
    if (!container) return;
    try {
        const res = await fetch('data/reviews.json');
        if (!res.ok) return;
        const reviews = await res.json();
        const featured = reviews.filter(r => r.status === 'published').sort((a, b) => (a.rank || 0) - (b.rank || 0)).slice(0, 3);
        container.innerHTML = featured.map(r => buildReviewCardHTML(r)).join('');
    } catch (e) {}
}

async function loadReviewsDirectory() {
    const container = document.getElementById('all-reviews-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (!container) return;
    try {
        const res = await fetch('data/reviews.json');
        if (!res.ok) return;
        let allReviews = await res.json();
        allReviews = allReviews.filter(r => r.status === 'published').sort((a, b) => (a.rank || 0) - (b.rank || 0));

        const render = (filter = 'all') => {
            const filtered = allReviews.filter(r => {
                if (filter === 'all') return true;
                if (filter === 'adhd') return r.tags && r.tags.adhd;
                if (filter === 'sensory') return r.tags && r.tags.sensory;
                if (filter === 'under5') return ['Ages 0+', 'Ages 1+', 'Ages 2+', 'Ages 3+', 'Ages 4+'].includes(r.age);
                if (filter === '5plus') return ['Ages 5+', 'Ages 6+', 'Ages 7+', 'Ages 8+'].includes(r.age);
                return true;
            });
            container.innerHTML = filtered.length > 0 ? filtered.map(r => buildReviewCardHTML(r)).join('') : '<p style="text-align: center; color: var(--color-text-light);">No reviews match this filter.</p>';
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
            <p style="color: #cccccc; font-size: 0.92rem; margin-bottom: 20px; line-height: 1.5;">Get our latest family theatre reviews, sensory insights, and Disneyland tips delivered straight to your inbox.</p>
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
        <div style="font-size: 0.85rem; color: #777777;">&copy; ${currentYear} Behind the Magic Curtain. All rights reserved.</div>
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
    alert(`🎉 Welcome ${name || ''}! Check your inbox for a welcome email.`);
}
