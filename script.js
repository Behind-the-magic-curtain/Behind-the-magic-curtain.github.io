/*
 * BEHIND THE MAGIC CURTAIN - CORE SITE ENGINE
 * Handles Mobile Nav, Swiper Carousels, Auto Copyright & Dynamic JSON Renderers
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCopyrightFooter();
    initDynamicPages();
});

/* --- 1. Mobile Navigation & Touch Handler --- */
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (navToggle && mainNav) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mainNav.classList.toggle('nav-open');
        });

        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('nav-open') && !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
                mainNav.classList.remove('nav-open');
            }
        });
    }
}

/* --- 2. Dynamic Footer Copyright & Domain Link --- */
function initCopyrightFooter() {
    const copyrightElements = document.querySelectorAll('.footer-copyright');
    const currentYear = new Date().getFullYear();
    const domainUrl = "https://behindthemagiccurtain.co.uk";
    const brandName = "Behind the Magic Curtain";

    copyrightElements.forEach(el => {
        el.innerHTML = `&copy; ${currentYear} <a href="${domainUrl}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 600;"><i class="fa-solid fa-globe" style="margin-right: 4px; color: var(--color-secondary, #ffd700);"></i>${brandName}</a>. All rights reserved.`;
    });
}

/* --- 3. Dynamic JSON Page Renderers --- */
function initDynamicPages() {
    const isHomePage = document.querySelector('.home-featured .card-grid');
    const isReviewsPage = document.querySelector('#all-reviews-grid');
    const isWhatsOnPage = document.querySelector('#whatson-list');
    const isTheatrePage = document.querySelector('#theatre-list');

    if (isHomePage) loadFeaturedReviews();
    if (isReviewsPage) loadReviewsDirectory();
    if (isWhatsOnPage) loadWhatsOnDirectory();
    if (isTheatrePage) loadTheatreGuideDirectory();
}

/* --- Dynamic Loader: Homepage (Takes Exact Top 3 Published Reviews) --- */
async function loadFeaturedReviews() {
    const container = document.querySelector('.home-featured .card-grid');
    if (!container) return;

    try {
        const res = await fetch('data/reviews.json');
        if (!res.ok) throw new Error('Could not load reviews data');
        const reviews = await res.json();

        // Sort by numerical rank and take the top 3 published items
        const featured = reviews
            .filter(r => r.status === 'published')
            .sort((a, b) => (a.rank || 0) - (b.rank || 0))
            .slice(0, 3);

        container.innerHTML = featured.map(r => buildReviewCardHTML(r)).join('');
    } catch (err) {
        console.warn('Dynamic load fallback:', err);
    }
}

/* --- Dynamic Loader: All Reviews Directory + Live Filter --- */
async function loadReviewsDirectory() {
    const container = document.getElementById('all-reviews-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (!container) return;

    try {
        const res = await fetch('data/reviews.json');
        if (!res.ok) throw new Error('Could not load reviews data');
        let allReviews = await res.json();

        allReviews = allReviews
            .filter(r => r.status === 'published')
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));

        const render = (filter = 'all') => {
            const filtered = allReviews.filter(r => {
                if (filter === 'all') return true;
                if (filter === 'adhd') return r.tags && r.tags.adhd;
                if (filter === 'sensory') return r.tags && r.tags.sensory;
                if (filter === 'under5') return ['Ages 0+', 'Ages 1+', 'Ages 2+', 'Ages 3+', 'Ages 4+'].includes(r.age);
                if (filter === '5plus') return ['Ages 5+', 'Ages 6+', 'Ages 7+', 'Ages 8+'].includes(r.age);
                if (filter === 'older') return ['Ages 9+', 'Ages 10+', 'Ages 11+', 'Ages 12+', 'Ages 13+', 'Grown ups'].includes(r.age);
                return true;
            });

            container.innerHTML = filtered.length > 0
                ? filtered.map(r => buildReviewCardHTML(r)).join('')
                : '<p style="grid-column: 1/-1; text-align: center; color: var(--color-text-light);">No reviews match this filter category.</p>';
        };

        render('all');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                render(btn.getAttribute('data-filter'));
            });
        });

    } catch (err) {
        console.warn('Reviews directory fallback:', err);
    }
}

/* --- Dynamic Loader: What\'s On Listings + Auto Expiry --- */
async function loadWhatsOnDirectory() {
    const container = document.getElementById('whatson-list');
    if (!container) return;

    try {
        const res = await fetch('data/whatson.json');
        if (!res.ok) throw new Error('Could not load What\'s On data');
        const shows = await res.json();
        const today = new Date().toISOString().split('T')[0];

        const activeShows = shows
            .filter(s => !s.expiryDate || s.expiryDate >= today)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));

        container.innerHTML = activeShows.length > 0
            ? activeShows.map(s => buildWhatsOnCardHTML(s)).join('')
            : '<p style="text-align: center; color: var(--color-text-light);">No active listings scheduled right now. Check back soon!</p>';
    } catch (err) {
        console.warn('What\'s On fallback:', err);
    }
}

/* --- Dynamic Loader: Theatre Guide --- */
async function loadTheatreGuideDirectory() {
    const container = document.getElementById('theatre-list');
    if (!container) return;

    try {
        const res = await fetch('data/theatres.json');
        if (!res.ok) throw new Error('Could not load Theatre Guide data');
        const theatres = await res.json();

        const sortedTheatres = theatres.sort((a, b) => (a.rank || 0) - (b.rank || 0));

        container.innerHTML = sortedTheatres.map(t => buildTheatreCardHTML(t)).join('');
    } catch (err) {
        console.warn('Theatre guide fallback:', err);
    }
}

/* --- Card HTML Template Generators --- */
function buildReviewCardHTML(r) {
    const ratingPercent = Math.min(100, Math.max(0, ((parseFloat(r.rating) || 5) / 5) * 100));
    
    let tagsHTML = `<span class="tag tag-age">${r.age || 'All Ages'}</span>`;
    if (r.tags?.adhd) tagsHTML += `\n<span class="tag tag-adhd">ADHD-Friendly Guide</span>`;
    if (r.tags?.sensory) tagsHTML += `\n<span class="tag tag-sensory">Sensory Notes</span>`;
    if (r.tags?.mature) tagsHTML += `\n<span class="tag tag-mature">Mature themes</span>`;

    return `
    <article class="card">
        <img src="images/${r.mainImage}" alt="${r.altText || r.title}" loading="lazy" decoding="async">
        <div class="card-content">
            <div class="card-star-rating" role="img" aria-label="Rated ${r.rating} out of 5 stars">
                <div class="star-rating" style="display: inline-block;">
                    <div class="stars-empty">
                        <i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>
                    </div>
                    <div class="stars-full" style="width: ${ratingPercent}%;">
                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                    </div>
                </div>
            </div>
            <h3>${r.title}</h3>
            <div class="card-tags">
                ${tagsHTML}
            </div>
            <p>${r.summary}</p>
            <a href="${r.slug}" class="btn btn-secondary">Read Full Review</a>
        </div>
    </article>`;
}

function buildWhatsOnCardHTML(s) {
    return `
    <article class="listing-card">
        <div class="listing-image">
            <img src="images/${s.image}" alt="${s.title}" loading="lazy" decoding="async">
        </div>
        <div class="listing-content">
            <h3>${s.title}</h3>
            <div class="card-tags"><span class="tag tag-age">${s.age}</span></div>
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

/* --- 4. Swiper Carousel Auto-Initializer (Review Detail Pages) --- */
window.addEventListener('load', () => {
    if (typeof Swiper !== 'undefined' && document.querySelector('.swiper')) {
        new Swiper('.swiper', {
            loop: true,
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            keyboard: { enabled: true }
        });
    }
});
