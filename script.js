/*
 * BEHIND THE MAGIC CURTAIN - CORE SITE ENGINE
 * Handles Mobile Nav, Dynamic JSON Renderers, WebP Support, Global Footer & Mailing List Form
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initGlobalFooter();
    initDynamicPages();
});

/* --- 1. Mobile Navigation --- */
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

/* --- 2. Global Toast Messenger --- */
let siteToastTimeout = null;
function triggerGlobalToast(msg, isSuccess = true) {
    let toast = document.getElementById('global-site-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-site-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #ffffff;
            color: #222222;
            padding: 16px 24px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            border-left: 5px solid ${isSuccess ? '#2e7d32' : '#bd2419'};
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px);
            transition: opacity 0.35s ease, transform 0.35s ease;
            z-index: 100000;
            max-width: 420px;
        `;
        document.body.appendChild(toast);
    }

    if (siteToastTimeout) clearTimeout(siteToastTimeout);

    toast.style.borderLeftColor = isSuccess ? '#2e7d32' : '#bd2419';
    toast.innerHTML = `<i class="fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'}" style="color: ${isSuccess ? '#2e7d32' : '#bd2419'};"></i> <span>${msg}</span>`;
    
    toast.style.opacity = '1';
    toast.style.pointerEvents = 'auto';
    toast.style.transform = 'translateY(0)';

    siteToastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
        toast.style.transform = 'translateY(20px)';
    }, 4000);
}

/* --- 3. Global Footer Controller (Mailing List + Domain + Mailto + Copyright) --- */
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
            <p style="color: #cccccc; font-size: 0.92rem; margin-bottom: 20px; line-height: 1.5;">
                Get our latest family theatre reviews, sensory insights, and Disneyland tips delivered straight to your inbox.
            </p>
            <form id="footer-newsletter-form" onsubmit="event.preventDefault(); handleFooterNewsletterSubmit();" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: 520px; margin: 0 auto;">
                <input type="text" id="footer-user-name" placeholder="Your Name" style="flex: 1 1 140px; min-width: 130px; padding: 12px 14px; border-radius: 50px; border: 1.5px solid rgba(255, 255, 255, 0.2); background: #ffffff; color: #222222; font-size: 0.9rem; font-family: var(--font-body, 'Poppins', sans-serif); outline: none;">
                <input type="email" id="footer-user-email" placeholder="Email Address *" required style="flex: 1 1 180px; min-width: 170px; padding: 12px 14px; border-radius: 50px; border: 1.5px solid rgba(255, 255, 255, 0.2); background: #ffffff; color: #222222; font-size: 0.9rem; font-family: var(--font-body, 'Poppins', sans-serif); outline: none;">
                <button type="submit" class="btn btn-primary" style="padding: 12px 24px; font-size: 0.92rem; border-radius: 50px; cursor: pointer; border: none; font-weight: 700; white-space: nowrap;">
                    Join Club
                </button>
            </form>
            <p style="font-size: 0.78rem; color: #999999; margin: 12px 0 0 0;">
                🔒 Zero spam. <a href="unsubscribe.html" style="color: #bbbbbb; text-decoration: underline;">Unsubscribe or delete your data</a> anytime.
            </p>
        </div>

        <!-- Hidden Native Form Bridge for Footer Submission -->
        <iframe name="footer_submit_target_iframe" id="footer_submit_target_iframe" style="display:none;"></iframe>
        <form id="native_footer_form" action="https://docs.google.com/forms/d/e/1FAIpQLScODeuHl2_gKBfoitmXdtpmIavjbk3pKyVq3ctHFOnhsgdObg/formResponse" method="POST" target="footer_submit_target_iframe" style="display:none;">
            <input type="hidden" name="entry.1934084784" id="footer_gform_optin">
            <input type="hidden" name="entry.1983797623" id="footer_gform_contact">
            <input type="hidden" name="entry.266837979" id="footer_gform_diary">
        </form>

        <div style="margin-bottom: 12px; font-size: 0.95rem;">
            <a href="mailto:${emailAddress}" style="color: #ffffff; text-decoration: none; font-weight: 600; margin-right: 20px; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-envelope" style="color: var(--color-secondary, #ffd700);"></i> ${emailAddress}
            </a>
            <a href="${domainUrl}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-globe" style="color: var(--color-secondary, #ffd700);"></i> behindthemagiccurtain.co.uk
            </a>
        </div>
        <div style="font-size: 0.85rem; color: #777777;">&copy; ${currentYear} Behind the Magic Curtain. All rights reserved.</div>
    `;
}

/* --- 4. Background Newsletter Form Submitter --- */
function handleFooterNewsletterSubmit() {
    const nameInput = document.getElementById('footer-user-name');
    const emailInput = document.getElementById('footer-user-email');
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if (!email || !email.includes('@')) {
        triggerGlobalToast('Please enter a valid email address.', false);
        return;
    }

    const optInStatus = "Yes - Join Club";
    const contactInfo = `${name || 'Friend'} (${email})`;
    const payloadText = "General Website Footer Signup";

    const optinField = document.getElementById('footer_gform_optin');
    const contactField = document.getElementById('footer_gform_contact');
    const diaryField = document.getElementById('footer_gform_diary');
    const nativeForm = document.getElementById('native_footer_form');

    if (optinField && contactField && diaryField && nativeForm) {
        optinField.value = optInStatus;
        contactField.value = contactInfo;
        diaryField.value = payloadText;
        nativeForm.submit();
    }

    nameInput.value = '';
    emailInput.value = '';

    triggerGlobalToast(`🎉 Welcome ${name || ''}! Check your inbox for a welcome email.`, true);
}

/* --- 5. Dynamic JSON Page Renderers --- */
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

async function loadFeaturedReviews() {
    const container = document.querySelector('.home-featured .card-grid');
    if (!container) return;

    try {
        const res = await fetch('data/reviews.json');
        if (!res.ok) throw new Error('Could not load reviews data');
        const reviews = await res.json();

        const featured = reviews
            .filter(r => r.status === 'published')
            .sort((a, b) => (a.rank || 0) - (b.rank || 0))
            .slice(0, 3);

        container.innerHTML = featured.map(r => buildReviewCardHTML(r)).join('');
    } catch (err) {
        console.warn('Dynamic load fallback:', err);
    }
}

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

/* --- Card HTML Builders --- */
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
