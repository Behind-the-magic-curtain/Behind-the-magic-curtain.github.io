const MASTER_PIN = "3011";

// Multi-section state cache
let reviewImages = [];
let theatreImages = [];
let whatsonImages = [];
let editMode = false;
let currentCache = { reviews: [], whatson: [], theatres: [] };

/* --- 1. PIN Security & Initialization --- */
function unlockStudio() {
    const pin = document.getElementById('pin-input').value.trim();
    if (pin === MASTER_PIN) {
        sessionStorage.setItem('btmc_admin_auth', 'true');
        document.getElementById('pin-gate').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadSettings();
    } else {
        document.getElementById('pin-error').style.display = 'block';
        document.getElementById('pin-input').value = '';
    }
}

function lockStudio() {
    sessionStorage.removeItem('btmc_admin_auth');
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('unlock-btn');
    if (btn) btn.addEventListener('click', unlockStudio);
    
    const pinInput = document.getElementById('pin-input');
    if (pinInput) pinInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') unlockStudio(); 
    });

    if (sessionStorage.getItem('btmc_admin_auth') === 'true') {
        document.getElementById('pin-gate').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadSettings();
    }

    // Attach drag & drop listeners to all drop zones
    setupDropZones();
});

function setupDropZones() {
    const zones = [
        { el: document.querySelector('#tab-reviews .drop-zone'), type: 'review' },
        { el: document.querySelector('#tab-theatres .drop-zone'), type: 'theatre' },
        { el: document.querySelector('#tab-whatson .drop-zone'), type: 'whatson' }
    ];

    zones.forEach(({ el, type }) => {
        if (!el) return;
        ['dragenter', 'dragover'].forEach(n => el.addEventListener(n, e => { e.preventDefault(); el.style.background = '#edf7f8'; }, false));
        ['dragleave', 'drop'].forEach(n => el.addEventListener(n, e => { e.preventDefault(); el.style.background = '#f8fafb'; }, false));
        el.addEventListener('drop', e => {
            e.preventDefault();
            handleImageSelection(e.dataTransfer.files, type);
        }, false);
    });
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');
}

/* --- 2. Validation & Unified Image Handling --- */
function syncReviewMeta() {
    if (editMode) return;
    const title = document.getElementById('rev-title').value;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    document.getElementById('rev-slug').value = slug ? slug + '.html' : '';
}

function validateStarRating(input) {
    const val = parseFloat(input.value);
    const err = document.getElementById('star-err');
    if (isNaN(val) || val < 0 || val > 5) {
        err.style.display = 'block';
        input.value = '5.0';
        return false;
    }
    err.style.display = 'none';
    input.value = val.toFixed(1);
    return true;
}

function handleImageSelection(fileList, type) {
    let targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : whatsonImages);
    
    // For Theatre and What's On, enforce single image
    if (type !== 'review') targetArray.length = 0;

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type.startsWith('image/')) {
            const cleanName = file.name.toLowerCase().replace(/\s+/g, '-');
            targetArray.push({ file: file, name: cleanName, preview: URL.createObjectURL(file) });
        }
    }
    renderImagePreviews(type);
}

function renderImagePreviews(type) {
    const containerId = type === 'review' ? 'review-image-list' : (type === 'theatre' ? 'theatre-image-list' : 'whatson-image-list');
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : whatsonImages);
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    targetArray.forEach((item, index) => {
        container.innerHTML += `
            <div class="img-item">
                <div class="img-item-left">
                    <img src="${item.preview}" alt="Preview">
                    <div>
                        <span style="font-weight:600; font-size:0.9rem;">${item.name}</span>
                        ${index === 0 ? '<span class="main-badge" style="margin-left:8px;">Main Photo</span>' : ''}
                    </div>
                </div>
                <div class="img-controls">
                    ${type === 'review' && index > 0 ? `<button type="button" onclick="moveImage('review', ${index}, -1)" title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>` : ''}
                    ${type === 'review' && index < targetArray.length - 1 ? `<button type="button" onclick="moveImage('review', ${index}, 1)" title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>` : ''}
                    <button type="button" onclick="removeImage('${type}', ${index})" title="Remove"><i class="fa-solid fa-trash" style="color:#bd2419;"></i></button>
                </div>
            </div>
        `;
    });
}

function moveImage(type, index, dir) {
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : whatsonImages);
    const target = index + dir;
    if (target >= 0 && target < targetArray.length) {
        const temp = targetArray[index];
        targetArray[index] = targetArray[target];
        targetArray[target] = temp;
        renderImagePreviews(type);
    }
}

function removeImage(type, index) {
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : whatsonImages);
    targetArray.splice(index, 1);
    renderImagePreviews(type);
}

function formatDoc(cmd, val = null) {
    if (cmd === 'createLink') {
        const url = prompt('Enter link URL:');
        if (url) document.execCommand(cmd, false, url);
    } else {
        document.execCommand(cmd, false, val);
    }
    document.getElementById('wysiwyg-content').focus();
}

/* --- 3. Settings & Feedback --- */
function toggleSettingsModal() {
    const el = document.getElementById('settings-drawer');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function saveSettings() {
    localStorage.setItem('btmc_gh_owner', document.getElementById('gh-owner').value.trim());
    localStorage.setItem('btmc_gh_repo', document.getElementById('gh-repo').value.trim());
    localStorage.setItem('btmc_gh_token', document.getElementById('gh-token').value.trim());
    showToast('✅ GitHub configuration saved!', 'status-success');
    toggleSettingsModal();
}

function loadSettings() {
    document.getElementById('gh-owner').value = localStorage.getItem('btmc_gh_owner') || '';
    document.getElementById('gh-repo').value = localStorage.getItem('btmc_gh_repo') || '';
    document.getElementById('gh-token').value = localStorage.getItem('btmc_gh_token') || '';
}

function showToast(msg, type) {
    const toast = document.getElementById('status-toast');
    toast.className = type;
    toast.innerHTML = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.scrollIntoView({ behavior: 'smooth' }); }, 100);
}

/* --- 4. Clean Edit Mode Dispatcher --- */
function enterEditReview(id) {
    const item = currentCache.reviews.find(r => r.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `Review: ${item.title}`;

    switchTab('tab-reviews', document.querySelector('.tab-btn:nth-child(1)'));
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
    document.getElementById('rev-featured').checked = !!item.featured;
    document.getElementById('rev-published').checked = item.status === 'published';
    document.getElementById('rev-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Review';

    if (item.mainImage) {
        reviewImages = [{ file: null, name: item.mainImage, preview: `images/${item.mainImage}` }];
        renderImagePreviews('review');
    }
}

function enterEditWhatsOn(id) {
    const item = currentCache.whatson.find(w => w.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `What's On: ${item.title}`;

    switchTab('tab-whatson', document.querySelector('.tab-btn:nth-child(3)'));
    document.getElementById('wo-edit-id').value = item.id;
    document.getElementById('wo-title').value = item.title || '';
    document.getElementById('wo-venue').value = item.venue || '';
    document.getElementById('wo-dates').value = item.dates || '';
    document.getElementById('wo-expiry').value = item.expiryDate || '';
    document.getElementById('wo-runtime').value = item.runtime || '';
    document.getElementById('wo-age').value = item.age || 'Ages 4+';
    document.getElementById('wo-desc').value = item.desc || '';
    document.getElementById('wo-ticket-link').value = item.ticketLink || '';
    document.getElementById('wo-site-link').value = item.siteLink || '';
    document.getElementById('wo-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Show';

    if (item.image) {
        whatsonImages = [{ file: null, name: item.image, preview: `images/${item.image}` }];
        renderImagePreviews('whatson');
    }
}

function enterEditTheatre(id) {
    const item = currentCache.theatres.find(t => t.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `Theatre: ${item.name}`;

    switchTab('tab-theatres', document.querySelector('.tab-btn:nth-child(2)'));
    document.getElementById('th-edit-id').value = item.id;
    document.getElementById('th-name').value = item.name || '';
    document.getElementById('th-location').value = item.location || '';
    document.getElementById('th-website').value = item.website || '';
    document.getElementById('th-access').value = item.accessibility || '';
    document.getElementById('th-relaxed').value = item.relaxed || '';
    document.getElementById('th-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Theatre';

    if (item.image) {
        theatreImages = [{ file: null, name: item.image, preview: `images/${item.image}` }];
        renderImagePreviews('theatre');
    }
}

function cancelEditMode() {
    editMode = false;
    document.getElementById('edit-banner').style.display = 'none';
    document.getElementById('form-review').reset();
    document.getElementById('form-whatson').reset();
    document.getElementById('form-theatre').reset();
    
    document.getElementById('rev-edit-id').value = '';
    document.getElementById('wo-edit-id').value = '';
    document.getElementById('th-edit-id').value = '';

    document.getElementById('rev-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Review to Website';
    document.getElementById('wo-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save What\'s On Show';
    document.getElementById('th-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Theatre Entry';

    document.getElementById('wysiwyg-content').innerHTML = '<p>Write your review here...</p>';
    reviewImages = [];
    theatreImages = [];
    whatsonImages = [];
    renderImagePreviews('review');
    renderImagePreviews('theatre');
    renderImagePreviews('whatson');
}

/* --- 5. Data Flow: Reviews --- */
async function handleReviewSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const title = document.getElementById('rev-title').value.trim();
    const slug = document.getElementById('rev-slug').value.trim();
    const subtitle = document.getElementById('rev-subtitle').value.trim();
    const ratingInput = document.getElementById('rev-rating');
    if (!validateStarRating(ratingInput)) return;

    const editId = document.getElementById('rev-edit-id').value;
    const isFeatured = document.getElementById('rev-featured').checked;
    const isPublished = document.getElementById('rev-published').checked;
    
    showToast('⏳ Updating reviews data...', 'status-loading');

    try {
        for (let item of reviewImages) {
            if (item.file) {
                const base64 = await toBase64(item.file);
                await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${item.name}`, base64.split(',')[1], `Upload image: ${item.name}`);
            }
        }

        const reviews = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/reviews.json');
        
        const reviewEntry = {
            id: editId || 'rev_' + Date.now(),
            title,
            slug,
            subtitle,
            rating: parseFloat(ratingInput.value),
            age: document.getElementById('rev-age').value,
            tags: {
                adhd: document.getElementById('tag-adhd').checked,
                sensory: document.getElementById('tag-sensory').checked,
                mature: document.getElementById('tag-mature').checked
            },
            mainImage: reviewImages.length > 0 ? reviewImages[0].name : (editId ? reviews.find(r => r.id === editId)?.mainImage || 'placeholder.jpg' : 'placeholder.jpg'),
            altText: document.getElementById('rev-image-alt').value.trim(),
            summary: document.getElementById('rev-summary').value.trim(),
            bodyHtml: document.getElementById('wysiwyg-content').innerHTML,
            tips: document.getElementById('rev-tips').value.split('\n').filter(t => t.trim()),
            featured: isFeatured,
            rank: editId ? (reviews.find(r => r.id === editId)?.rank || 1) : 1,
            status: isPublished ? 'published' : 'draft'
        };

        let updatedReviews = reviews;
        if (editId) {
            updatedReviews = reviews.map(r => r.id === editId ? reviewEntry : r);
        } else {
            updatedReviews.forEach(r => r.rank = (r.rank || 1) + 1);
            updatedReviews.unshift(reviewEntry);
        }

        if (isFeatured) {
            let featuredCount = 0;
            updatedReviews.forEach(r => {
                if (r.featured && r.id !== reviewEntry.id) {
                    featuredCount++;
                    if (featuredCount >= 2) r.featured = false;
                }
            });
        }

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/reviews.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedReviews, null, 2)))), `Update reviews data (${title})`);

        const pageHtml = buildFullReviewPageHtml(reviewEntry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, slug, btoa(unescape(encodeURIComponent(pageHtml))), `Publish review page: ${title}`);

        showToast(`🎉 Success! "${title}" is published!`, 'status-success');
        cancelEditMode();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

/* --- 6. Data Flow: Theatres & What's On --- */
async function handleTheatreSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('th-edit-id').value;
    const name = document.getElementById('th-name').value.trim();

    showToast('⏳ Saving Theatre Guide...', 'status-loading');
    try {
        if (theatreImages.length > 0 && theatreImages[0].file) {
            const base64 = await toBase64(theatreImages[0].file);
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${theatreImages[0].name}`, base64.split(',')[1], `Upload theatre image: ${theatreImages[0].name}`);
        }

        const theatres = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/theatres.json');
        const entry = {
            id: editId || 'th_' + Date.now(),
            name,
            location: document.getElementById('th-location').value.trim(),
            image: theatreImages.length > 0 ? theatreImages[0].name : (editId ? theatres.find(t => t.id === editId)?.image || 'theatre-default.jpg' : 'theatre-default.jpg'),
            website: document.getElementById('th-website').value.trim(),
            accessibility: document.getElementById('th-access').value.trim(),
            relaxed: document.getElementById('th-relaxed').value.trim(),
            rank: editId ? (theatres.find(t => t.id === editId)?.rank || 1) : theatres.length + 1
        };

        const updatedTheatres = editId ? theatres.map(t => t.id === editId ? entry : t) : [...theatres, entry];

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/theatres.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedTheatres, null, 2)))), `Save theatre: ${name}`);
        showToast(`✅ Successfully saved "${name}" to Theatre Guide!`, 'status-success');
        cancelEditMode();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

async function handleWhatsOnSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('wo-edit-id').value;
    const title = document.getElementById('wo-title').value.trim();

    showToast('⏳ Saving What\'s On entry...', 'status-loading');
    try {
        if (whatsonImages.length > 0 && whatsonImages[0].file) {
            const base64 = await toBase64(whatsonImages[0].file);
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${whatsonImages[0].name}`, base64.split(',')[1], `Upload show poster: ${whatsonImages[0].name}`);
        }

        const shows = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        const entry = {
            id: editId || 'wo_' + Date.now(),
            title,
            venue: document.getElementById('wo-venue').value.trim(),
            dates: document.getElementById('wo-dates').value.trim(),
            expiryDate: document.getElementById('wo-expiry').value,
            runtime: document.getElementById('wo-runtime').value.trim(),
            age: document.getElementById('wo-age').value,
            image: whatsonImages.length > 0 ? whatsonImages[0].name : (editId ? shows.find(w => w.id === editId)?.image || 'show-default.jpg' : 'show-default.jpg'),
            desc: document.getElementById('wo-desc').value.trim(),
            ticketLink: document.getElementById('wo-ticket-link').value.trim(),
            siteLink: document.getElementById('wo-site-link').value.trim(),
            rank: editId ? (shows.find(w => w.id === editId)?.rank || 1) : shows.length + 1
        };

        const updatedShows = editId ? shows.map(w => w.id === editId ? entry : w) : [...shows, entry];

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/whatson.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedShows, null, 2)))), `Save What's On: ${title}`);
        showToast(`✅ Successfully saved "${title}" to What's On!`, 'status-success');
        cancelEditMode();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

/* --- 7. Full Management Dashboard Loader --- */
async function loadManagementDashboard() {
    const creds = getCredentials();
    if (!creds) return;

    // Load Reviews
    try {
        const reviews = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/reviews.json');
        currentCache.reviews = reviews;
        const revContainer = document.getElementById('manage-reviews-table-container');
        
        revContainer.innerHTML = `
            <table class="crud-table">
                <thead>
                    <tr>
                        <th style="width: 90px;">Rank</th>
                        <th>Show Title</th>
                        <th style="width: 140px;">Featured</th>
                        <th style="width: 110px;">Status</th>
                        <th style="width: 180px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reviews.sort((a,b) => (a.rank||0) - (b.rank||0)).map((r, i) => `
                        <tr>
                            <td>
                                <div class="rank-cell">
                                    <span class="rank-badge">#${i+1}</span>
                                    <div class="rank-btns">
                                        <button type="button" class="rank-btn" onclick="reorderRank('reviews', ${i}, -1)" title="Move Up">▲</button>
                                        <button type="button" class="rank-btn" onclick="reorderRank('reviews', ${i}, 1)" title="Move Down">▼</button>
                                    </div>
                                </div>
                            </td>
                            <td><strong>${r.title}</strong></td>
                            <td>${r.featured ? `<span class="badge-featured">Homepage #${i+1}</span>` : '<span style="color:#aaa;">—</span>'}</td>
                            <td><span class="badge-status" style="background:${r.status==='published'?'#2e7d32':'#757575'}">${r.status}</span></td>
                            <td>
                                <div class="action-btns">
                                    <button type="button" class="btn-edit" onclick="enterEditReview('${r.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                    <button type="button" class="btn-delete" onclick="deleteItem('reviews', '${r.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        document.getElementById('manage-reviews-table-container').innerHTML = `<p style="color:#bd2419;">Error loading reviews: ${err.message}</p>`;
    }

    // Load What's On
    try {
        const whatson = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        currentCache.whatson = whatson;
        const woContainer = document.getElementById('manage-whatson-table-container');
        
        woContainer.innerHTML = whatson.length === 0 ? '<p style="color:#555;">No What\'s On listings found.</p>' : `
            <table class="crud-table">
                <thead>
                    <tr>
                        <th style="width: 90px;">Rank</th>
                        <th>Show Title</th>
                        <th>Venue</th>
                        <th>End Date</th>
                        <th style="width: 180px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${whatson.sort((a,b) => (a.rank||0) - (b.rank||0)).map((w, i) => `
                        <tr>
                            <td>
                                <div class="rank-cell">
                                    <span class="rank-badge">#${i+1}</span>
                                    <div class="rank-btns">
                                        <button type="button" class="rank-btn" onclick="reorderRank('whatson', ${i}, -1)" title="Move Up">▲</button>
                                        <button type="button" class="rank-btn" onclick="reorderRank('whatson', ${i}, 1)" title="Move Down">▼</button>
                                    </div>
                                </div>
                            </td>
                            <td><strong>${w.title}</strong></td>
                            <td>${w.venue}</td>
                            <td>${w.expiryDate ? `<span style="font-size:0.85rem; color:#555;">${w.expiryDate}</span>` : '<span style="color:#aaa;">No Expiry</span>'}</td>
                            <td>
                                <div class="action-btns">
                                    <button type="button" class="btn-edit" onclick="enterEditWhatsOn('${w.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                    <button type="button" class="btn-delete" onclick="deleteItem('whatson', '${w.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        document.getElementById('manage-whatson-table-container').innerHTML = `<p style="color:#bd2419;">Error loading What's On: ${err.message}</p>`;
    }

    // Load Theatre Guide
    try {
        const theatres = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/theatres.json');
        currentCache.theatres = theatres;
        const thContainer = document.getElementById('manage-theatres-table-container');
        
        thContainer.innerHTML = theatres.length === 0 ? '<p style="color:#555;">No theatres found.</p>' : `
            <table class="crud-table">
                <thead>
                    <tr>
                        <th style="width: 90px;">Rank</th>
                        <th>Theatre Name</th>
                        <th>City / Location</th>
                        <th style="width: 180px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${theatres.sort((a,b) => (a.rank||0) - (b.rank||0)).map((t, i) => `
                        <tr>
                            <td>
                                <div class="rank-cell">
                                    <span class="rank-badge">#${i+1}</span>
                                    <div class="rank-btns">
                                        <button type="button" class="rank-btn" onclick="reorderRank('theatres', ${i}, -1)" title="Move Up">▲</button>
                                        <button type="button" class="rank-btn" onclick="reorderRank('theatres', ${i}, 1)" title="Move Down">▼</button>
                                    </div>
                                </div>
                            </td>
                            <td><strong>${t.name}</strong></td>
                            <td>${t.location}</td>
                            <td>
                                <div class="action-btns">
                                    <button type="button" class="btn-edit" onclick="enterEditTheatre('${t.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                    <button type="button" class="btn-delete" onclick="deleteItem('theatres', '${t.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        document.getElementById('manage-theatres-table-container').innerHTML = `<p style="color:#bd2419;">Error loading Theatre Guide: ${err.message}</p>`;
    }
}

async function reorderRank(type, index, dir) {
    const creds = getCredentials();
    const file = `data/${type}.json`;
    const data = await fetchJsonFile(creds.owner, creds.repo, creds.token, file);
    
    const target = index + dir;
    if (target >= 0 && target < data.length) {
        const temp = data[index];
        data[index] = data[target];
        data[target] = temp;

        data.forEach((item, idx) => item.rank = idx + 1);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, file, btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))), `Re-order ${type}`);
        loadManagementDashboard();
    }
}

async function deleteItem(type, id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const creds = getCredentials();
    const file = `data/${type}.json`;
    let data = await fetchJsonFile(creds.owner, creds.repo, creds.token, file);
    data = data.filter(item => item.id !== id);
    
    await commitGitHubFile(creds.owner, creds.repo, creds.token, file, btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))), `Delete from ${type}`);
    showToast('✅ Entry deleted successfully!', 'status-success');
    loadManagementDashboard();
}

/* --- 8. Helper API Utilities --- */
function getCredentials() {
    const owner = (localStorage.getItem('btmc_gh_owner') || '').trim();
    const repo = (localStorage.getItem('btmc_gh_repo') || '').trim();
    const token = (localStorage.getItem('btmc_gh_token') || '').trim();
    if (!owner || !repo || !token) {
        toggleSettingsModal();
        showToast('⚠️ Please configure GitHub token settings first.', 'status-error');
        return null;
    }
    return { owner, repo, token };
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
    if (!res.ok) throw new Error(`GitHub error: ${res.statusText}`);
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function buildFullReviewPageHtml(d) {
    const ratingPercent = (parseFloat(d.rating) / 5) * 100;
    let tags = `<span class="tag tag-age">${d.age}</span>`;
    if (d.tags?.adhd) tags += `\n<span class="tag tag-adhd">ADHD-Friendly Guide</span>`;
    if (d.tags?.sensory) tags += `\n<span class="tag tag-sensory">Sensory Notes</span>`;
    if (d.tags?.mature) tags += `\n<span class="tag tag-mature">Mature themes</span>`;

    let tipsSection = '';
    if (d.tips && d.tips.length > 0) {
        tipsSection = `<article>\n<h3>Key Info for Parents</h3>\n<ul>\n${d.tips.map(t => `<li>${t}</li>`).join('\n')}\n</ul>\n</article>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review: ${d.title} | Behind the Magic Curtain</title>
    <meta name="description" content="${d.summary}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="Review: ${d.title} | Behind the Magic Curtain">
    <meta property="og:description" content="${d.summary}">
    <meta property="og:image" content="images/${d.mainImage}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Raleway:wght@500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
</head>
<body>
    <header class="site-header">
        <div class="container">
            <div class="logo"><a href="index.html">Behind the Magic Curtain</a></div>
            <nav class="main-nav"><button class="nav-toggle" aria-label="toggle navigation"><span class="hamburger"></span></button>
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="whats-on.html">What's On</a></li>
                    <li><a href="theatre-guide.html">Theatre Guide</a></li>
                    <li><a href="tips-for-parents.html">Tips for Parents</a></li>
                    <li><a href="reviews.html" class="active">Reviews</a></li>
                </ul>
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
                <div class="card-tags">
                    ${tags}
                </div>
            </div>
        </section>
        <section class="page-content">
            <div class="container content-article">
                <img src="images/${d.mainImage}" alt="${d.altText}" class="review-main-image" loading="lazy" decoding="async">
                <h2>Our Family Verdict</h2>
                ${d.bodyHtml}
                ${tipsSection}
            </div>
        </section>
    </main>
    <footer class="site-footer">
        <div class="container">
            <p class="footer-copyright">&copy; 2026 Behind the Magic Curtain. All rights reserved.</p>
        </div>
    </footer>
    <script src="script.js"><\/script>
</body>
</html>`;
}
