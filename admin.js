/*
 * BEHIND THE MAGIC CURTAIN - ADMIN ENGINE (V2.8)
 * Resilient API Bridge, Drag-and-Drop Ordering, WebP Compression & Sensory Strategy Handlers
 */

const MASTER_PIN = "3011";

let reviewImages = [];
let theatreImages = [];
let whatsonImages = [];
let newsImages = [];
let editMode = false;
let currentCache = { reviews: [], whatson: [], theatres: [], news: [], disneyland: [], nav: [] };
let draggedRowIndex = null;
let toastTimeout = null;

/* --- 1. PIN Security & Initialization --- */
function unlockStudio() {
    const pin = document.getElementById('pin-input').value.trim();
    if (pin === MASTER_PIN) {
        sessionStorage.setItem('btmc_admin_auth', 'true');
        document.getElementById('pin-gate').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        loadSettings();
        loadManagementDashboard();
    } else {
        document.getElementById('pin-error').style.display = 'block';
        document.getElementById('pin-input').value = '';
    }
}

function lockStudio() {
    sessionStorage.removeItem('btmc_admin_auth');
    location.reload();
}

function toggleSidebar() {
    document.getElementById('admin-sidebar').classList.toggle('open');
}

function switchAdminTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if (btn) btn.classList.add('active');
    if (window.innerWidth <= 850) toggleSidebar();
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('unlock-btn');
    if (btn) btn.addEventListener('click', unlockStudio);
    const pinInput = document.getElementById('pin-input');
    if (pinInput) pinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') unlockStudio(); });

    if (sessionStorage.getItem('btmc_admin_auth') === 'true') {
        document.getElementById('pin-gate').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        loadSettings();
        loadManagementDashboard();
    }
    setupDropZones();
});

function setupDropZones() {
    const zones = [
        { el: document.querySelector('#tab-reviews .drop-zone'), type: 'review' },
        { el: document.querySelector('#tab-theatres .drop-zone'), type: 'theatre' },
        { el: document.querySelector('#tab-whatson .drop-zone'), type: 'whatson' },
        { el: document.querySelector('#tab-news .drop-zone'), type: 'news' }
    ];

    zones.forEach(({ el, type }) => {
        if (!el) return;
        ['dragenter', 'dragover'].forEach(n => el.addEventListener(n, e => { e.preventDefault(); el.style.background = '#edf7f8'; }, false));
        ['dragleave', 'drop'].forEach(n => el.addEventListener(n, e => { e.preventDefault(); el.style.background = '#f8fafc'; }, false));
        el.addEventListener('drop', e => {
            e.preventDefault();
            handleImageSelection(e.dataTransfer.files, type);
        }, false);
    });
}

function showToast(msg, type = 'status-success') {
    const toast = document.getElementById('status-toast');
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.className = type;
    toast.innerHTML = msg;
    if (type !== 'status-loading') {
        toastTimeout = setTimeout(() => { toast.className = ''; toast.style.display = 'none'; }, 3500);
    }
}

/* --- 2. WebP Image Compressor --- */
async function processAndCompressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxDim = 1200;
                let width = img.width, height = img.height;
                if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
                else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const webpBase64 = canvas.toDataURL('image/webp', 0.85);
                const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const cleanWebpName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.webp';
                resolve({ base64: webpBase64.split(',')[1], preview: webpBase64, name: cleanWebpName });
            };
        };
    });
}

async function handleImageSelection(fileList, type) {
    let targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : (type === 'whatson' ? whatsonImages : newsImages));
    if (type !== 'review') targetArray.length = 0;

    for (let i = 0; i < fileList.length; i++) {
        if (fileList[i].type.startsWith('image/')) {
            const processed = await processAndCompressImage(fileList[i]);
            targetArray.push({ base64: processed.base64, name: processed.name, preview: processed.preview });
        }
    }
    renderImagePreviews(type);
}

function renderImagePreviews(type) {
    const containerId = `${type}-image-list`;
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : (type === 'whatson' ? whatsonImages : newsImages));
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = targetArray.map((item, idx) => `
        <div class="img-item">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${item.preview}">
                <span>${item.name}</span>
                <span style="font-size:0.75rem; color:#00838f; font-weight:700;">WEBP OPTIMIZED</span>
            </div>
            <button type="button" onclick="removeImage('${type}', ${idx})" class="btn-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');
}

function removeImage(type, idx) {
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : (type === 'whatson' ? whatsonImages : newsImages));
    targetArray.splice(idx, 1);
    renderImagePreviews(type);
}

function syncReviewMeta() {
    if (editMode) return;
    const title = document.getElementById('rev-title').value;
    document.getElementById('rev-slug').value = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '.html';
}

function syncNewsSlug() {
    if (editMode) return;
    const title = document.getElementById('news-title').value;
    document.getElementById('news-slug').value = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '.html';
}

/* --- 3. Edit Dispatchers --- */
function enterEditReview(id) {
    const item = currentCache.reviews.find(r => r.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `Review: ${item.title}`;

    switchAdminTab('tab-reviews', document.querySelector('.admin-nav-tabs button:nth-child(1)'));
    document.getElementById('rev-edit-id').value = item.id;
    document.getElementById('rev-title').value = item.title || '';
    document.getElementById('rev-slug').value = item.slug || '';
    document.getElementById('rev-subtitle').value = item.subtitle || '';
    document.getElementById('rev-rating').value = item.rating || '5.0';
    document.getElementById('rev-age').value = item.age || 'Ages 7+';
    document.getElementById('tag-adhd').checked = !!item.tags?.adhd;
    document.getElementById('tag-sensory').checked = !!item.tags?.sensory;
    document.getElementById('tag-mature').checked = !!item.tags?.mature;
    document.getElementById('rev-image-alt').value = item.altText || '';
    document.getElementById('rev-summary').value = item.summary || '';
    document.getElementById('wysiwyg-content').innerHTML = item.bodyHtml || '<p></p>';
    document.getElementById('rev-tips').value = (item.tips || []).join('\n');
    document.getElementById('rev-published').checked = item.status === 'published';
    document.getElementById('rev-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Review';

    reviewImages = [];
    if (item.mainImage) reviewImages.push({ base64: null, name: item.mainImage, preview: `images/${item.mainImage}` });
    if (item.galleryImages && Array.isArray(item.galleryImages)) {
        item.galleryImages.forEach(gImg => reviewImages.push({ base64: null, name: gImg, preview: `images/${gImg}` }));
    }
    renderImagePreviews('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterEditWhatsOn(id) {
    const item = currentCache.whatson.find(w => w.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `What's On: ${item.title}`;

    switchAdminTab('tab-whatson', document.querySelectorAll('.admin-nav-tabs button')[1]);
    document.getElementById('wo-edit-id').value = item.id;
    document.getElementById('wo-title').value = item.title || '';
    document.getElementById('wo-venue').value = item.venue || '';
    document.getElementById('wo-region').value = item.region || '';
    document.getElementById('wo-dates').value = item.dates || '';
    document.getElementById('wo-expiry').value = item.expiryDate || '';
    document.getElementById('wo-runtime').value = item.runtime || '';
    document.getElementById('wo-age').value = item.age || 'Ages 4+';
    document.getElementById('wo-category').value = item.category || 'theatre';
    document.getElementById('wo-is-touring').checked = !!item.isTouring;
    document.getElementById('wo-desc').value = item.desc || '';
    document.getElementById('wo-ticket-link').value = item.ticketLink || '';
    document.getElementById('wo-site-link').value = item.siteLink || '';
    document.getElementById('wo-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Show';

    if (item.image) {
        whatsonImages = [{ base64: null, name: item.image, preview: `images/${item.image}` }];
        renderImagePreviews('whatson');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterEditTheatre(id) {
    const item = currentCache.theatres.find(t => t.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `Theatre: ${item.name}`;

    switchAdminTab('tab-theatres', document.querySelectorAll('.admin-nav-tabs button')[2]);
    document.getElementById('th-edit-id').value = item.id;
    document.getElementById('th-name').value = item.name || '';
    document.getElementById('th-location').value = item.location || '';
    document.getElementById('th-website').value = item.website || '';
    document.getElementById('th-access').value = item.accessibility || '';
    document.getElementById('th-relaxed').value = item.relaxed || '';
    document.getElementById('th-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Theatre';

    if (item.image) {
        theatreImages = [{ base64: null, name: item.image, preview: `images/${item.image}` }];
        renderImagePreviews('theatre');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterEditNews(id) {
    const item = currentCache.news.find(n => n.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `News: ${item.title}`;

    switchAdminTab('tab-news', document.querySelectorAll('.admin-nav-tabs button')[3]);
    document.getElementById('news-edit-id').value = item.id;
    document.getElementById('news-title').value = item.title || '';
    document.getElementById('news-slug').value = item.slug || '';
    document.getElementById('news-category').value = item.category || 'Theatre News';
    document.getElementById('news-author').value = item.author || 'Katy Rose Meaney';
    document.getElementById('news-summary').value = item.summary || '';
    document.getElementById('news-body').value = item.bodyHtml || '';
    document.getElementById('news-published').checked = item.status === 'published';
    document.getElementById('news-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Story';

    if (item.mainImage) {
        newsImages = [{ base64: null, name: item.mainImage, preview: `images/${item.mainImage}` }];
        renderImagePreviews('news');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterEditDisneyland(id) {
    const item = currentCache.disneyland.find(d => d.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `Disneyland: ${item.name}`;

    switchAdminTab('tab-disneyland', document.querySelectorAll('.admin-nav-tabs button')[4]);
    document.getElementById('dlp-edit-id').value = item.id;
    document.getElementById('dlp-name').value = item.name || '';
    document.getElementById('dlp-park').value = item.park || 'Disneyland Park';
    document.getElementById('dlp-land').value = item.land || '';
    document.getElementById('dlp-type').value = item.type || 'Ride';
    document.getElementById('dlp-height').value = item.minHeight || 'None';
    document.getElementById('dlp-speed').value = item.thrillLevel || 3;
    document.getElementById('dlp-fear').value = item.fearFactor || 3;
    document.getElementById('dlp-noise').value = item.noiseLevel || 3;
    document.getElementById('dlp-darkness').value = item.darkness || 3;
    document.getElementById('dlp-notes').value = item.sensoryNotes || '';
    document.getElementById('dlp-adhd').value = item.adhdTip || '';
    document.getElementById('dlp-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Baseline';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditMode() {
    editMode = false;
    document.getElementById('edit-banner').style.display = 'none';
    document.querySelectorAll('form').forEach(f => f.reset());

    document.getElementById('rev-edit-id').value = '';
    document.getElementById('wo-edit-id').value = '';
    document.getElementById('th-edit-id').value = '';
    document.getElementById('news-edit-id').value = '';
    document.getElementById('dlp-edit-id').value = '';

    document.getElementById('rev-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Review';
    document.getElementById('wo-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save What\'s On Show';
    document.getElementById('th-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Theatre Entry';
    document.getElementById('news-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish News Story';
    document.getElementById('dlp-submit-btn').innerHTML = 'Save Disneyland Baseline';

    document.getElementById('wysiwyg-content').innerHTML = '';
    reviewImages = [];
    theatreImages = [];
    whatsonImages = [];
    newsImages = [];
    renderImagePreviews('review');
    renderImagePreviews('theatre');
    renderImagePreviews('whatson');
    renderImagePreviews('news');
}

/* --- 4. Submissions --- */
async function handleReviewSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const title = document.getElementById('rev-title').value.trim();
    const slug = document.getElementById('rev-slug').value.trim();
    const editId = document.getElementById('rev-edit-id').value;
    const isPublished = document.getElementById('rev-published').checked;

    showToast('⏳ Uploading and saving review...', 'status-loading');

    try {
        for (let item of reviewImages) {
            if (item.base64) {
                await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${item.name}`, item.base64, `Upload image: ${item.name}`);
            }
        }

        const reviews = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/reviews.json');
        const galleryList = reviewImages.slice(1).map(img => img.name);

        const reviewEntry = {
            id: editId || 'rev_' + Date.now(),
            title,
            slug,
            subtitle: document.getElementById('rev-subtitle').value.trim(),
            rating: parseFloat(document.getElementById('rev-rating').value) || 5.0,
            age: document.getElementById('rev-age').value,
            tags: {
                adhd: document.getElementById('tag-adhd').checked,
                sensory: document.getElementById('tag-sensory').checked,
                mature: document.getElementById('tag-mature').checked
            },
            mainImage: reviewImages.length > 0 ? reviewImages[0].name : (editId ? reviews.find(r => r.id === editId)?.mainImage || 'placeholder.webp' : 'placeholder.webp'),
            galleryImages: galleryList,
            altText: document.getElementById('rev-image-alt').value.trim(),
            summary: document.getElementById('rev-summary').value.trim(),
            bodyHtml: document.getElementById('wysiwyg-content').innerHTML,
            tips: document.getElementById('rev-tips').value.split('\n').filter(t => t.trim()),
            rank: editId ? (reviews.find(r => r.id === editId)?.rank || 1) : 1,
            status: isPublished ? 'published' : 'draft'
        };

        const updatedReviews = editId ? reviews.map(r => r.id === editId ? reviewEntry : r) : [reviewEntry, ...reviews];
        updatedReviews.forEach((r, idx) => r.rank = idx + 1);

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/reviews.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedReviews, null, 2)))), `Update reviews (${title})`);

        const pageHtml = buildFullReviewPageHtml(reviewEntry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, slug, btoa(unescape(encodeURIComponent(pageHtml))), `Publish page: ${title}`);

        showToast(`🎉 Successfully saved "${title}"!`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

async function handleWhatsOnSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('wo-edit-id').value;
    const title = document.getElementById('wo-title').value.trim();

    showToast('⏳ Saving What\'s On show...', 'status-loading');
    try {
        if (whatsonImages.length > 0 && whatsonImages[0].base64) {
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${whatsonImages[0].name}`, whatsonImages[0].base64, `Upload show image: ${whatsonImages[0].name}`);
        }

        const shows = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        const entry = {
            id: editId || 'wo_' + Date.now(),
            title,
            venue: document.getElementById('wo-venue').value.trim(),
            region: document.getElementById('wo-region').value.trim() || 'West Midlands',
            dates: document.getElementById('wo-dates').value.trim(),
            expiryDate: document.getElementById('wo-expiry').value,
            runtime: document.getElementById('wo-runtime').value.trim(),
            age: document.getElementById('wo-age').value,
            category: document.getElementById('wo-category').value,
            isTouring: document.getElementById('wo-is-touring').checked,
            image: whatsonImages.length > 0 ? whatsonImages[0].name : (editId ? shows.find(w => w.id === editId)?.image || 'show-default.webp' : 'show-default.webp'),
            desc: document.getElementById('wo-desc').value.trim(),
            ticketLink: document.getElementById('wo-ticket-link').value.trim(),
            siteLink: document.getElementById('wo-site-link').value.trim(),
            rank: editId ? (shows.find(w => w.id === editId)?.rank || 1) : shows.length + 1
        };

        const updated = editId ? shows.map(w => w.id === editId ? entry : w) : [...shows, entry];
        updated.forEach((w, idx) => w.rank = idx + 1);

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/whatson.json', btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2)))), `Save What's On: ${title}`);
        showToast(`✅ Successfully saved "${title}"!`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

async function handleTheatreSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('th-edit-id').value;
    const name = document.getElementById('th-name').value.trim();

    showToast('⏳ Saving Theatre Guide...', 'status-loading');
    try {
        if (theatreImages.length > 0 && theatreImages[0].base64) {
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${theatreImages[0].name}`, theatreImages[0].base64, `Upload theatre photo: ${theatreImages[0].name}`);
        }

        const theatres = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/theatres.json');
        const entry = {
            id: editId || 'th_' + Date.now(),
            name,
            location: document.getElementById('th-location').value.trim(),
            image: theatreImages.length > 0 ? theatreImages[0].name : (editId ? theatres.find(t => t.id === editId)?.image || 'theatre-default.webp' : 'theatre-default.webp'),
            website: document.getElementById('th-website').value.trim(),
            accessibility: document.getElementById('th-access').value.trim(),
            relaxed: document.getElementById('th-relaxed').value.trim(),
            rank: editId ? (theatres.find(t => t.id === editId)?.rank || 1) : theatres.length + 1
        };

        const updatedTheatres = editId ? theatres.map(t => t.id === editId ? entry : t) : [...theatres, entry];
        updatedTheatres.forEach((t, idx) => t.rank = idx + 1);

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/theatres.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedTheatres, null, 2)))), `Save theatre: ${name}`);
        showToast(`✅ Successfully saved "${name}"!`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

async function handleNewsSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('news-edit-id').value;
    const title = document.getElementById('news-title').value.trim();
    const slug = document.getElementById('news-slug').value.trim();
    const nowIso = new Date().toISOString();

    showToast('⏳ Publishing News Story...', 'status-loading');
    try {
        if (newsImages.length > 0 && newsImages[0].base64) {
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${newsImages[0].name}`, newsImages[0].base64, `Upload news image: ${newsImages[0].name}`);
        }

        const newsList = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/news.json');
        const existing = editId ? newsList.find(n => n.id === editId) : null;

        const entry = {
            id: editId || 'news_' + Date.now(),
            title,
            slug,
            category: document.getElementById('news-category').value.trim(),
            author: document.getElementById('news-author').value.trim() || 'Katy Rose Meaney',
            summary: document.getElementById('news-summary').value.trim(),
            bodyHtml: document.getElementById('news-body').value.trim(),
            mainImage: newsImages.length > 0 ? newsImages[0].name : (existing?.mainImage || 'news-default.webp'),
            datePublished: existing ? existing.datePublished : nowIso,
            dateModified: nowIso,
            status: document.getElementById('news-published').checked ? 'published' : 'draft',
            rank: editId ? existing.rank : 1
        };

        const updated = editId ? newsList.map(n => n.id === editId ? entry : n) : [entry, ...newsList];
        updated.forEach((n, idx) => n.rank = idx + 1);

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/news.json', btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2)))), `Save news story: ${title}`);
        showToast(`🎉 News story published!`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ News error: ${err.message}`, 'status-error');
    }
}

async function handleDisneylandSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('dlp-edit-id').value;
    const name = document.getElementById('dlp-name').value.trim();

    showToast('⏳ Saving Disneyland Baseline...', 'status-loading');
    try {
        const dlpData = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/disneyland.json');
        const entry = {
            id: editId || 'dlp_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            name,
            park: document.getElementById('dlp-park').value,
            land: document.getElementById('dlp-land').value.trim(),
            type: document.getElementById('dlp-type').value,
            minHeight: document.getElementById('dlp-height').value.trim() || 'None',
            thrillLevel: parseInt(document.getElementById('dlp-speed').value),
            fearFactor: parseInt(document.getElementById('dlp-fear').value),
            noiseLevel: parseInt(document.getElementById('dlp-noise').value),
            darkness: parseInt(document.getElementById('dlp-darkness').value),
            sensoryNotes: document.getElementById('dlp-notes').value.trim(),
            adhdTip: document.getElementById('dlp-adhd').value.trim()
        };

        const updatedDlp = editId ? dlpData.map(d => d.id === editId ? entry : d) : [...dlpData, entry];

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/disneyland.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedDlp, null, 2)))), `Save Disneyland Baseline: ${name}`);
        showToast(`✅ Updated "${name}" in Disneyland Database!`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

/* --- 5. Dashboard Table Managers --- */
async function loadManagementDashboard() {
    const creds = getCredentials();
    if (!creds) return;

    try {
        const reviews = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/reviews.json');
        currentCache.reviews = reviews.sort((a,b) => (a.rank||0) - (b.rank||0));
        renderDraggableTable('reviews', 'manage-reviews-table-container', currentCache.reviews);
    } catch (err) {
        const c = document.getElementById('manage-reviews-table-container');
        if (c) c.innerHTML = `<p style="color:#bd2419;">Error: ${err.message}</p>`;
    }

    try {
        const whatson = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        currentCache.whatson = whatson.sort((a,b) => (a.rank||0) - (b.rank||0));
        renderDraggableTable('whatson', 'manage-whatson-table-container', currentCache.whatson);
    } catch (err) {
        const c = document.getElementById('manage-whatson-table-container');
        if (c) c.innerHTML = `<p style="color:#bd2419;">Error: ${err.message}</p>`;
    }

    try {
        const theatres = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/theatres.json');
        currentCache.theatres = theatres.sort((a,b) => (a.rank||0) - (b.rank||0));
        renderDraggableTable('theatres', 'manage-theatres-table-container', currentCache.theatres);
    } catch (err) {
        const c = document.getElementById('manage-theatres-table-container');
        if (c) c.innerHTML = `<p style="color:#bd2419;">Error: ${err.message}</p>`;
    }

    try {
        const news = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/news.json');
        currentCache.news = news.sort((a,b) => (a.rank||0) - (b.rank||0));
        renderDraggableTable('news', 'manage-news-table-container', currentCache.news);
    } catch (err) {
        const c = document.getElementById('manage-news-table-container');
        if (c) c.innerHTML = `<p style="color:#666;">No news data found.</p>`;
    }

    try {
        const dlp = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/disneyland.json');
        currentCache.disneyland = dlp;
        renderDisneylandTable(currentCache.disneyland);
    } catch (err) {
        const c = document.getElementById('manage-disneyland-table-container');
        if (c) c.innerHTML = `<p style="color:#bd2419;">Error: ${err.message}</p>`;
    }

    loadNavToggles();
}

function renderDisneylandTable(items) {
    const container = document.getElementById('manage-disneyland-table-container');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `<p style="color:#666;">No Disneyland Paris entries found.</p>`;
        return;
    }

    let html = `
        <table class="crud-table">
            <thead>
                <tr>
                    <th>Attraction / Show</th>
                    <th>Park & Land</th>
                    <th>Scores (Speed / Fear / Noise / Dark)</th>
                    <th style="width: 140px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach((item) => {
        html += `
            <tr>
                <td><strong>${item.name}</strong> <span style="font-size:0.8rem; color:#888;">(${item.type || 'Ride'})</span></td>
                <td>${item.park} - ${item.land}</td>
                <td>
                    <span style="font-size:0.85rem; color:#444; font-weight:600;">
                        🚀 ${item.thrillLevel || 1}/5 &nbsp;|&nbsp; 👻 ${item.fearFactor || 1}/5 &nbsp;|&nbsp; 🔊 ${item.noiseLevel || 1}/5 &nbsp;|&nbsp; 🌑 ${item.darkness || 1}/5
                    </span>
                </td>
                <td>
                    <button type="button" class="btn-edit" onclick="enterEditDisneyland('${item.id}')">
                        <i class="fa-solid fa-pen"></i> Edit Baseline
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderDraggableTable(type, containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `<p style="color:#666; padding:15px 0;">No ${type} entries found.</p>`;
        return;
    }

    let tableHtml = `
        <table class="crud-table" id="table-${type}">
            <thead>
                <tr>
                    <th style="width: 80px;">Rank</th>
                    <th>${type === 'theatres' ? 'Theatre Name' : (type === 'whatson' ? 'Show Title' : 'Title')}</th>
                    ${type === 'reviews' ? '<th style="width: 160px;">Position / Slot</th>' : ''}
                    ${type === 'whatson' ? '<th>Venue</th><th>End Date</th>' : ''}
                    ${type === 'theatres' ? '<th>City / Location</th>' : ''}
                    ${type === 'news' ? '<th>Category</th><th>Date</th>' : ''}
                    ${type === 'reviews' || type === 'news' ? '<th style="width: 110px;">Status</th>' : ''}
                    <th style="width: 180px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach((item, index) => {
        tableHtml += `
            <tr class="draggable-row" draggable="true" data-type="${type}" data-index="${index}">
                <td>
                    <span class="grab-handle"><i class="fa-solid fa-bars"></i></span>
                    <span class="rank-badge">#${index + 1}</span>
                </td>
                <td><strong>${item.title || item.name}</strong></td>
                ${type === 'reviews' ? `<td>${index < 3 ? `<span class="badge-featured">Homepage #${index+1}</span>` : '<span style="color:#888; font-size:0.85rem;">Directory only</span>'}</td>` : ''}
                ${type === 'whatson' ? `<td>${item.venue}</td><td>${item.expiryDate || '<span style="color:#aaa;">No Expiry</span>'}</td>` : ''}
                ${type === 'theatres' ? `<td>${item.location}</td>` : ''}
                ${type === 'news' ? `<td>${item.category || 'News'}</td><td>${(item.datePublished || '').substring(0, 10)}</td>` : ''}
                ${type === 'reviews' || type === 'news' ? `<td><span class="badge-status" style="background:${item.status==='published'?'#2e7d32':'#757575'}">${item.status}</span></td>` : ''}
                <td>
                    <div style="display:flex; gap:6px;">
                        <button type="button" class="btn-edit" onclick="${type === 'reviews' ? `enterEditReview('${item.id}')` : (type === 'whatson' ? `enterEditWhatsOn('${item.id}')` : (type === 'theatres' ? `enterEditTheatre('${item.id}')` : `enterEditNews('${item.id}')`))}"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button type="button" class="btn-delete" onclick="deleteItem('${type}', '${item.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;

    attachDragEventListeners(type);
}

function attachDragEventListeners(type) {
    const table = document.getElementById(`table-${type}`);
    if (!table) return;

    const rows = table.querySelectorAll('.draggable-row');
    rows.forEach(row => {
        row.addEventListener('dragstart', (e) => {
            draggedRowIndex = parseInt(row.getAttribute('data-index'));
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            table.querySelectorAll('.draggable-row').forEach(r => r.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            row.classList.add('drag-over');
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over');
        });

        row.addEventListener('drop', async (e) => {
            e.preventDefault();
            row.classList.remove('drag-over');
            const targetIndex = parseInt(row.getAttribute('data-index'));

            if (draggedRowIndex !== null && draggedRowIndex !== targetIndex) {
                const list = currentCache[type];
                const [movedItem] = list.splice(draggedRowIndex, 1);
                list.splice(targetIndex, 0, movedItem);

                list.forEach((item, idx) => item.rank = idx + 1);
                
                showToast(`⏳ Saving new ${type} order...`, 'status-loading');
                const creds = getCredentials();
                await commitGitHubFile(creds.owner, creds.repo, creds.token, `data/${type}.json`, btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2)))), `Re-order ${type}`);
                showToast(`✅ ${type} order updated!`, 'status-success');
                loadManagementDashboard();
            }
        });
    });
}

async function deleteItem(type, id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const creds = getCredentials();
    const file = `data/${type}.json`;
    let data = await fetchJsonFile(creds.owner, creds.repo, creds.token, file);
    data = data.filter(item => item.id !== id);
    data.forEach((item, idx) => item.rank = idx + 1);
    
    await commitGitHubFile(creds.owner, creds.repo, creds.token, file, btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))), `Delete from ${type}`);
    showToast('✅ Entry deleted successfully!', 'status-success');
    loadManagementDashboard();
}

/* --- 6. Navigation Switchboard --- */
async function loadNavToggles() {
    const creds = getCredentials();
    if (!creds) return;
    try {
        const navData = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/navigation.json');
        currentCache.nav = navData.items || [];
        const container = document.getElementById('nav-toggle-list');
        if (!container) return;
        container.innerHTML = currentCache.nav.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                <div>
                    <strong>${item.title}</strong>
                    <span style="font-size:0.8rem; color:#64748b; margin-left:8px;">(${item.url})</span>
                </div>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="nav-toggle-${idx}" ${item.enabled ? 'checked' : ''}>
                    <span>Visible in Nav</span>
                </label>
            </div>
        `).join('');
    } catch (e) {
        console.warn('Nav toggle error:', e);
    }
}

async function saveNavToggles() {
    const creds = getCredentials();
    if (!creds) return;

    currentCache.nav.forEach((item, idx) => {
        const checkbox = document.getElementById(`nav-toggle-${idx}`);
        if (checkbox) item.enabled = checkbox.checked;
    });

    try {
        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/navigation.json', btoa(unescape(encodeURIComponent(JSON.stringify({ items: currentCache.nav }, null, 2)))), 'Update Header Navigation Toggles');
        showToast('✅ Navigation switchboard updated live!', 'status-success');
    } catch (e) {
        showToast('❌ Failed to update navigation', 'status-error');
    }
}

/* --- 7. Settings & GitHub REST Bridge --- */
function getCredentials() {
    const owner = (localStorage.getItem('btmc_gh_owner') || '').trim();
    const repo = (localStorage.getItem('btmc_gh_repo') || '').trim();
    const token = (localStorage.getItem('btmc_gh_token') || '').trim();
    if (!owner || !repo || !token) {
        toggleSettingsModal();
        showToast('⚠️ Configure GitHub token settings first.', 'status-error');
        return null;
    }
    return { owner, repo, token };
}

function saveSettings() {
    localStorage.setItem('btmc_gh_owner', document.getElementById('gh-owner').value.trim());
    localStorage.setItem('btmc_gh_repo', document.getElementById('gh-repo').value.trim());
    localStorage.setItem('btmc_gh_token', document.getElementById('gh-token').value.trim());
    showToast('✅ GitHub configuration saved!', 'status-success');
    toggleSettingsModal();
    loadManagementDashboard();
}

function loadSettings() {
    document.getElementById('gh-owner').value = localStorage.getItem('btmc_gh_owner') || '';
    document.getElementById('gh-repo').value = localStorage.getItem('btmc_gh_repo') || '';
    document.getElementById('gh-token').value = localStorage.getItem('btmc_gh_token') || '';
}

function toggleSettingsModal() {
    const el = document.getElementById('settings-drawer');
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

async function fetchJsonFile(owner, repo, token, path) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Could not load ${path} (Status: ${res.status})`);
    const data = await res.json();
    const binaryString = atob(data.content.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8').decode(bytes) || '[]');
}

async function commitGitHubFile(owner, repo, token, path, contentBase64, message) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    let sha = null;
    try {
        const getRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }
    } catch(e) {}

    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ message, content: contentBase64, ...(sha && { sha }) })
    });
    if (!res.ok) throw new Error(`GitHub error: ${res.statusText}`);
}

function buildFullReviewPageHtml(d) {
    const ratingPercent = (parseFloat(d.rating) / 5) * 100;
    let tags = `<span class="tag tag-age">${d.age}</span>`;
    if (d.tags?.adhd) tags += `\n<span class="tag tag-adhd">Sensory Strategy</span>`;
    if (d.tags?.sensory) tags += `\n<span class="tag tag-sensory">Sensory Notes</span>`;
    if (d.tags?.mature) tags += `\n<span class="tag tag-mature">Mature themes</span>`;

    let tipsSection = '';
    if (d.tips && d.tips.length > 0) {
        tipsSection = `<article>\n<h3>Sensory Strategies & Parent Insights</h3>\n<ul>\n${d.tips.map(t => `<li>${t}</li>`).join('\n')}\n</ul>\n</article>`;
    }

    let gallerySection = '';
    if (d.galleryImages && Array.isArray(d.galleryImages) && d.galleryImages.length > 0) {
        gallerySection = `
        <div class="review-gallery">
            <h2>Production Gallery</h2>
            <div class="swiper review-swiper">
                <div class="swiper-wrapper">
                    ${d.galleryImages.map(imgName => `
                    <div class="swiper-slide">
                        <img src="images/${imgName}" alt="Production scene from ${d.title}" loading="lazy">
                    </div>`).join('\n')}
                </div>
                <div class="swiper-pagination"></div>
                <div class="swiper-button-prev" aria-label="Previous slide"></div>
                <div class="swiper-button-next" aria-label="Next slide"></div>
            </div>
        </div>`;
    }

    const reviewSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Review",
        "name": `${d.title} Sensory Review`,
        "reviewBody": d.summary,
        "author": {
            "@type": "Person",
            "name": "Katy Rose Meaney",
            "jobTitle": "Theatre Critic & Features Writer"
        },
        "itemReviewed": {
            "@type": "TheaterEvent",
            "name": d.title
        },
        "reviewRating": {
            "@type": "Rating",
            "ratingValue": d.rating,
            "bestRating": "5"
        }
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${d.title} Review & Sensory Guide | Behind the Magic Curtain</title>
    <meta name="description" content="${d.summary}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${d.title} Review & Sensory Guide | Behind the Magic Curtain">
    <meta property="og:description" content="${d.summary}">
    <meta property="og:image" content="images/${d.mainImage}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Raleway:wght@500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
    <script type="application/ld+json">
    ${reviewSchema}
    <\/script>
</head>
<body>
    <header class="site-header">
        <div class="container">
            <div class="logo"><a href="index.html">Behind the Magic Curtain</a></div>
            <nav class="main-nav"><button class="nav-toggle" aria-label="toggle navigation"><span class="hamburger"></span></button>
                <ul></ul>
            </nav>
        </div>
    </header>
    <main>
        <section class="review-header page-header">
            <div class="container">
                <h1>${d.title}</h1>
                <p class="review-subtitle">${d.subtitle}</p>
                <div class="star-rating" role="img" aria-label="Rated ${d.rating} out of 5 stars">
                    <div class="stars-empty"><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i></div>
                    <div class="stars-full" style="width: ${ratingPercent}%;"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>
                </div>
                <div class="card-tags">${tags}</div>
            </div>
        </section>
        <section class="page-content">
            <div class="container content-article">
                <img src="images/${d.mainImage}" alt="${d.altText}" class="review-main-image" loading="lazy">
                <h2>Our Family Verdict</h2>
                ${d.bodyHtml}
                ${gallerySection}
                ${tipsSection}
            </div>
        </section>
    </main>
    <footer class="site-footer"><div class="container"></div></footer>
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"><\/script>
    <script src="script.js"><\/script>
</body>
</html>`;
}
