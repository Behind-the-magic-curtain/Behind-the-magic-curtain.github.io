/*
 * BEHIND THE MAGIC CURTAIN - ADMIN ENGINE (V2.0)
 * Drag & Drop Tables, News Engine, Dynamic Nav Toggles & WebP Compressor
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

function showToast(msg, isSuccess = true) {
    const toast = document.getElementById('status-toast');
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.style.display = 'block';
    toast.style.background = isSuccess ? '#e8f5e9' : '#ffebee';
    toast.style.color = isSuccess ? '#2e7d32' : '#c62828';
    toast.style.border = `1px solid ${isSuccess ? '#a5d6a7' : '#ef9a9a'}`;
    toast.innerHTML = msg;
    toastTimeout = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

/* --- WebP Compressor --- */
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

/* --- What's On Submission with Touring & Region --- */
async function handleWhatsOnSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('wo-edit-id').value;
    const title = document.getElementById('wo-title').value.trim();

    try {
        if (whatsonImages.length > 0 && whatsonImages[0].base64) {
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${whatsonImages[0].name}`, whatsonImages[0].base64, `Upload What's On image: ${whatsonImages[0].name}`);
        }

        const shows = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        const entry = {
            id: editId || 'wo_' + Date.now(),
            title,
            venue: document.getElementById('wo-venue').value.trim(),
            region: document.getElementById('wo-region').value.trim() || 'West Midlands',
            dates: document.getElementById('wo-dates').value.trim(),
            expiryDate: document.getElementById('wo-expiry').value,
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
        showToast(`✅ Successfully saved "${title}"!`);
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, false);
    }
}

/* --- News Engine with Schema.org & Discover Optimization --- */
async function handleNewsSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('news-edit-id').value;
    const title = document.getElementById('news-title').value.trim();
    const slug = document.getElementById('news-slug').value.trim();
    const nowIso = new Date().toISOString();

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

        const pageHtml = buildFullNewsArticleHtml(entry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, slug, btoa(unescape(encodeURIComponent(pageHtml))), `Publish news article page: ${title}`);

        showToast(`🎉 News story published and indexed for Discover!`);
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ News error: ${err.message}`, false);
    }
}

function buildFullNewsArticleHtml(n) {
    const formattedDate = new Date(n.datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": n.title,
        "image": [`https://behindthemagiccurtain.co.uk/images/${n.mainImage}`],
        "datePublished": n.datePublished,
        "dateModified": n.dateModified,
        "author": [{
            "@type": "Person",
            "name": n.author,
            "url": "https://behindthemagiccurtain.co.uk"
        }],
        "publisher": {
            "@type": "Organization",
            "name": "Behind the Magic Curtain",
            "logo": {
                "@type": "ImageObject",
                "url": "https://behindthemagiccurtain.co.uk/images/logo.png"
            }
        },
        "description": n.summary
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${n.title} | Behind the Magic Curtain News</title>
    <meta name="description" content="${n.summary}">
    <meta name="robots" content="max-image-preview:large">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${n.title}">
    <meta property="og:description" content="${n.summary}">
    <meta property="og:image" content="images/${n.mainImage}">
    <link rel="canonical" href="https://behindthemagiccurtain.co.uk/${n.slug}">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <script type="application/ld+json">
    ${schemaJson}
    <\/script>
</head>
<body>
    <header class="site-header">
        <div class="container">
            <div class="logo"><a href="index.html">Behind the Magic Curtain</a></div>
            <nav class="main-nav">
                <button class="nav-toggle" aria-label="toggle navigation"><span class="hamburger"></span></button>
                <ul></ul>
            </nav>
        </div>
    </header>
    <main>
        <section class="page-header">
            <div class="container">
                <span class="tag" style="background:var(--color-accent); margin-bottom:12px; display:inline-block;">${n.category}</span>
                <h1>${n.title}</h1>
                <p style="font-size:0.95rem; color:#666; margin-top:10px;">By <strong>${n.author}</strong> • <time datetime="${n.datePublished}">${formattedDate}</time></p>
            </div>
        </section>
        <section class="page-content">
            <div class="container content-article">
                <img src="images/${n.mainImage}" alt="${n.title}" class="review-main-image" loading="lazy">
                <p class="review-subtitle" style="font-size:1.2rem; font-weight:600; color:#333; margin-bottom:25px;">${n.summary}</p>
                ${n.bodyHtml}
                <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e0e0e0;">
                    <a href="news.html" class="btn btn-secondary"><i class="fa-solid fa-arrow-left"></i> Back to News Feed</a>
                </div>
            </div>
        </section>
    </main>
    <footer class="site-footer"><div class="container"></div></footer>
    <script src="script.js"><\/script>
</body>
</html>`;
}

/* --- Nav Switchboard --- */
async function loadNavToggles() {
    const creds = getCredentials();
    if (!creds) return;
    try {
        const navData = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/navigation.json');
        currentCache.nav = navData.items || [];
        const container = document.getElementById('nav-toggle-list');
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
        showToast('✅ Navigation switchboard updated live!');
    } catch (e) {
        showToast('❌ Failed to update navigation', false);
    }
}

/* --- Settings, Fetch & Commit Bridges --- */
function getCredentials() {
    const owner = (localStorage.getItem('btmc_gh_owner') || '').trim();
    const repo = (localStorage.getItem('btmc_gh_repo') || '').trim();
    const token = (localStorage.getItem('btmc_gh_token') || '').trim();
    if (!owner || !repo || !token) {
        toggleSettingsModal();
        showToast('⚠️ Configure GitHub token settings first.', false);
        return null;
    }
    return { owner, repo, token };
}

function saveSettings() {
    localStorage.setItem('btmc_gh_owner', document.getElementById('gh-owner').value.trim());
    localStorage.setItem('btmc_gh_repo', document.getElementById('gh-repo').value.trim());
    localStorage.setItem('btmc_gh_token', document.getElementById('gh-token').value.trim());
    showToast('✅ Configuration saved!');
    toggleSettingsModal();
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
    if (!res.ok) throw new Error(`Could not load ${path}`);
    const data = await res.json();
    return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\s/g, '')))));
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
    if (!res.ok) throw new Error(`GitHub commit error: ${res.statusText}`);
}

async function loadManagementDashboard() {
    loadNavToggles();
}

function cancelEditMode() {
    editMode = false;
    document.getElementById('edit-banner').style.display = 'none';
    document.querySelectorAll('form').forEach(f => f.reset());
}
