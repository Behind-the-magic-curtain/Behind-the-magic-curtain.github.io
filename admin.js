const MASTER_PIN = "3011";
let uploadedFiles = [];
let editMode = false;

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

    const dropArea = document.querySelector('.drop-zone');
    if (dropArea) {
        ['dragenter', 'dragover'].forEach(n => dropArea.addEventListener(n, e => { e.preventDefault(); dropArea.style.background = '#edf7f8'; }, false));
        ['dragleave', 'drop'].forEach(n => dropArea.addEventListener(n, e => { e.preventDefault(); dropArea.style.background = '#f8fafb'; }, false));
        dropArea.addEventListener('drop', e => {
            e.preventDefault();
            handleImageSelection(e.dataTransfer.files);
        }, false);
    }
});

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');
}

/* --- 2. Validation & Image Helpers --- */
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

function handleImageSelection(fileList) {
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type.startsWith('image/')) {
            const cleanName = file.name.toLowerCase().replace(/\s+/g, '-');
            uploadedFiles.push({ file: file, name: cleanName, preview: URL.createObjectURL(file) });
        }
    }
    renderImagePreviews();
}

function renderImagePreviews() {
    const container = document.getElementById('image-list-container');
    container.innerHTML = '';
    uploadedFiles.forEach((item, index) => {
        container.innerHTML += `
            <div class="img-item">
                <div class="img-item-left">
                    <img src="${item.preview}" alt="Preview">
                    <div>
                        <span style="font-weight:600; font-size:0.9rem;">${item.name}</span>
                        ${index === 0 ? '<span class="main-badge" style="margin-left:8px;">Main Poster</span>' : ''}
                    </div>
                </div>
                <div class="img-controls">
                    ${index > 0 ? `<button type="button" onclick="moveImage(${index}, -1)" title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>` : ''}
                    ${index < uploadedFiles.length - 1 ? `<button type="button" onclick="moveImage(${index}, 1)" title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>` : ''}
                    <button type="button" onclick="removeImage(${index})" title="Remove"><i class="fa-solid fa-trash" style="color:#bd2419;"></i></button>
                </div>
            </div>
        `;
    });
}

function moveImage(index, dir) {
    const target = index + dir;
    if (target >= 0 && target < uploadedFiles.length) {
        const temp = uploadedFiles[index];
        uploadedFiles[index] = uploadedFiles[target];
        uploadedFiles[target] = temp;
        renderImagePreviews();
    }
}

function removeImage(index) {
    uploadedFiles.splice(index, 1);
    renderImagePreviews();
}

function previewSingleImage(input, hiddenId) {
    if (input.files && input.files[0]) {
        const cleanName = input.files[0].name.toLowerCase().replace(/\s+/g, '-');
        document.getElementById(hiddenId).value = cleanName;
    }
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

/* --- 3. Settings & Feedback Toast --- */
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

/* --- 4. Edit Mode Handling --- */
function enterEditMode(type, item) {
    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `${type}: ${item.title || item.name}`;

    if (type === 'Review') {
        switchTab('tab-reviews', document.querySelector('.tab-btn:nth-child(1)'));
        document.getElementById('rev-edit-id').value = item.id;
        document.getElementById('rev-title').value = item.title;
        document.getElementById('rev-slug').value = item.slug;
        document.getElementById('rev-subtitle').value = item.subtitle;
        document.getElementById('rev-rating').value = item.rating;
        document.getElementById('rev-age').value = item.age;
        document.getElementById('tag-adhd').checked = !!item.tags?.adhd;
        document.getElementById('tag-sensory').checked = !!item.tags?.sensory;
        document.getElementById('tag-mature').checked = !!item.tags?.mature;
        document.getElementById('rev-image-alt').value = item.altText || '';
        document.getElementById('rev-summary').value = item.summary || '';
        document.getElementById('wysiwyg-content').innerHTML = item.bodyHtml || '';
        document.getElementById('rev-tips').value = (item.tips || []).join('\n');
        document.getElementById('rev-featured').checked = !!item.featured;
        document.getElementById('rev-published').checked = item.status === 'published';
        document.getElementById('rev-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Review';
    }
}

function cancelEditMode() {
    editMode = false;
    document.getElementById('edit-banner').style.display = 'none';
    document.getElementById('form-review').reset();
    document.getElementById('rev-edit-id').value = '';
    document.getElementById('rev-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Review to Website';
    document.getElementById('wysiwyg-content').innerHTML = '<p>Write your review here...</p>';
    uploadedFiles = [];
    renderImagePreviews();
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
        // Upload images
        for (let item of uploadedFiles) {
            const base64 = await toBase64(item.file);
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${item.name}`, base64.split(',')[1], `Upload image: ${item.name}`);
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
            mainImage: uploadedFiles.length > 0 ? uploadedFiles[0].name : (editId ? reviews.find(r => r.id === editId)?.mainImage || 'placeholder.jpg' : 'placeholder.jpg'),
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
            // New entry takes #1 rank, shifts rest down
            updatedReviews.forEach(r => r.rank = (r.rank || 1) + 1);
            updatedReviews.unshift(reviewEntry);
        }

        // Apply FIFO Queue (Rule of 3 for Featured)
        if (isFeatured) {
            let featuredCount = 0;
            updatedReviews.forEach(r => {
                if (r.featured && r.id !== reviewEntry.id) {
                    featuredCount++;
                    if (featuredCount >= 2) r.featured = false; // Only keep 2 other items featured
                }
            });
        }

        // Save JSON data
        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/reviews.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedReviews, null, 2)))), `Update reviews data (${title})`);

        // Generate Standalone Review Page
        const pageHtml = buildFullReviewPageHtml(reviewEntry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, slug, btoa(unescape(encodeURIComponent(pageHtml))), `Publish review page: ${title}`);

        showToast(`🎉 Success! "${title}" is published to the site!`, 'status-success');
        cancelEditMode();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

/* --- 6. Data Flow: Theatres & What's On --- */
async function handleTheatreSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const name = document.getElementById('th-name').value.trim();
    const picker = document.getElementById('th-image-picker');
    let imgName = document.getElementById('th-img-name').value;

    showToast('⏳ Saving Theatre Guide...', 'status-loading');
    try {
        if (picker.files.length > 0) {
            const base64 = await toBase64(picker.files[0]);
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${imgName}`, base64.split(',')[1], `Upload theatre image: ${imgName}`);
        }

        const theatres = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/theatres.json');
        const entry = {
            id: 'th_' + Date.now(),
            name,
            location: document.getElementById('th-location').value.trim(),
            image: imgName,
            website: document.getElementById('th-website').value.trim(),
            accessibility: document.getElementById('th-access').value.trim(),
            relaxed: document.getElementById('th-relaxed').value.trim(),
            rank: theatres.length + 1
        };

        theatres.push(entry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/theatres.json', btoa(unescape(encodeURIComponent(JSON.stringify(theatres, null, 2)))), `Add theatre: ${name}`);
        showToast(`✅ Successfully saved "${name}" to Theatre Guide!`, 'status-success');
        document.getElementById('form-theatre').reset();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

async function handleWhatsOnSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const title = document.getElementById('wo-title').value.trim();
    const picker = document.getElementById('wo-image-picker');
    let imgName = document.getElementById('wo-img-name').value;

    showToast('⏳ Saving What\'s On entry...', 'status-loading');
    try {
        if (picker.files.length > 0) {
            const base64 = await toBase64(picker.files[0]);
            await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${imgName}`, base64.split(',')[1], `Upload show poster: ${imgName}`);
        }

        const shows = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        const entry = {
            id: 'wo_' + Date.now(),
            title,
            venue: document.getElementById('wo-venue').value.trim(),
            dates: document.getElementById('wo-dates').value.trim(),
            expiryDate: document.getElementById('wo-expiry').value,
            runtime: document.getElementById('wo-runtime').value.trim(),
            age: document.getElementById('wo-age').value,
            image: imgName,
            desc: document.getElementById('wo-desc').value.trim(),
            ticketLink: document.getElementById('wo-ticket-link').value.trim(),
            siteLink: document.getElementById('wo-site-link').value.trim(),
            rank: shows.length + 1
        };

        shows.push(entry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/whatson.json', btoa(unescape(encodeURIComponent(JSON.stringify(shows, null, 2)))), `Add What's On: ${title}`);
        showToast(`✅ Successfully saved "${title}" to What's On!`, 'status-success');
        document.getElementById('form-whatson').reset();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

/* --- 7. Management Dashboard & Up/Down Sorting --- */
async function loadManagementDashboard() {
    const creds = getCredentials();
    if (!creds) return;

    try {
        const reviews = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/reviews.json');
        const revContainer = document.getElementById('manage-reviews-table-container');
        
        revContainer.innerHTML = `
            <table class="crud-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Show Title</th>
                        <th>Featured</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reviews.sort((a,b) => (a.rank||0) - (b.rank||0)).map((r, i) => `
                        <tr>
                            <td>
                                <strong>#${i+1}</strong>
                                <button type="button" class="rank-btn" onclick="reorderRank('reviews', ${i}, -1)">▲</button>
                                <button type="button" class="rank-btn" onclick="reorderRank('reviews', ${i}, 1)">▼</button>
                            </td>
                            <td><strong>${r.title}</strong></td>
                            <td>${r.featured ? '<span class="main-badge">Homepage #'+(i+1)+'</span>' : '—'}</td>
                            <td><span class="tag" style="background:${r.status==='published'?'#2e7d32':'#777'}">${r.status}</span></td>
                            <td>
                                <button type="button" class="btn-edit" onclick='enterEditMode("Review", ${JSON.stringify(r)})'>Edit</button>
                                <button type="button" class="btn-delete" onclick="deleteItem('reviews', '${r.id}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        showToast(`Error loading dashboard: ${err.message}`, 'status-error');
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

/* --- 8. Helper Functions --- */
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
