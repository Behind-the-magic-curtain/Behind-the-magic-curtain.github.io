const MASTER_PIN = "3011";
let uploadedFiles = [];

/* --- 1. PIN & Session Security --- */
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

document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('unlock-btn');
    if (btn) btn.addEventListener('click', unlockStudio);
    
    const pinInput = document.getElementById('pin-input');
    if (pinInput) pinInput.addEventListener('keypress', function(e) { 
        if (e.key === 'Enter') unlockStudio(); 
    });

    if (sessionStorage.getItem('btmc_admin_auth') === 'true') {
        document.getElementById('pin-gate').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadSettings();
    }

    const dropArea = document.querySelector('.drop-zone');
    if (dropArea) {
        ['dragenter', 'dragover'].forEach(name => {
            dropArea.addEventListener(name, e => { e.preventDefault(); dropArea.style.background = '#edf7f8'; }, false);
        });
        ['dragleave', 'drop'].forEach(name => {
            dropArea.addEventListener(name, e => { e.preventDefault(); dropArea.style.background = '#f8fafb'; }, false);
        });
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

/* --- 2. Validation & Image Handling --- */
function syncReviewMeta() {
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
        const isMain = index === 0;
        container.innerHTML += `
            <div class="img-item">
                <div class="img-item-left">
                    <img src="${item.preview}" alt="Preview">
                    <div>
                        <span style="font-weight:600; font-size:0.9rem;">${item.name}</span>
                        ${isMain ? '<span class="main-badge" style="margin-left:8px;">Main Poster</span>' : ''}
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

/* --- 3. Settings Management --- */
function toggleSettingsModal() {
    const el = document.getElementById('settings-drawer');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function saveSettings() {
    localStorage.setItem('btmc_gh_owner', document.getElementById('gh-owner').value.trim());
    localStorage.setItem('btmc_gh_repo', document.getElementById('gh-repo').value.trim());
    localStorage.setItem('btmc_gh_token', document.getElementById('gh-token').value.trim());
    showToast('GitHub configuration saved locally in your browser!', 'status-success');
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

/* --- 4. Publishing & GitHub API --- */
async function publishReviewFlow() {
    const owner = localStorage.getItem('btmc_gh_owner');
    const repo = localStorage.getItem('btmc_gh_repo');
    const token = localStorage.getItem('btmc_gh_token');

    if (!owner || !repo || !token) {
        toggleSettingsModal();
        showToast('Please enter and save your GitHub Settings first.', 'status-error');
        return;
    }

    const title = document.getElementById('rev-title').value.trim();
    const slug = document.getElementById('rev-slug').value.trim();
    const subtitle = document.getElementById('rev-subtitle').value.trim();
    const ratingInput = document.getElementById('rev-rating');
    
    if (!validateStarRating(ratingInput)) return;
    const rating = ratingInput.value;

    const age = document.getElementById('rev-age').value;
    const adhd = document.getElementById('tag-adhd').checked;
    const sensory = document.getElementById('tag-sensory').checked;
    const mature = document.getElementById('tag-mature').checked;
    const alt = document.getElementById('rev-image-alt').value.trim();
    const summary = document.getElementById('rev-summary').value.trim();
    const bodyHtml = document.getElementById('wysiwyg-content').innerHTML;
    const tips = document.getElementById('rev-tips').value.trim();

    const destHome = document.getElementById('dest-home').checked;
    const destReviews = document.getElementById('dest-reviews').checked;
    const destWhatsOn = document.getElementById('dest-whatson').checked;

    const mainImageName = uploadedFiles.length > 0 ? uploadedFiles[0].name : 'placeholder.jpg';
    const galleryImageNames = uploadedFiles.slice(1).map(i => i.name);

    document.getElementById('loading-spinner').style.display = 'inline-block';
    showToast('Publishing review and updating all target pages...', 'status-loading');

    try {
        for (let item of uploadedFiles) {
            const base64 = await toBase64(item.file);
            await commitGitHubFile(owner, repo, token, `images/${item.name}`, base64.split(',')[1], `Upload photo: ${item.name}`);
        }

        const fullPageHtml = buildFullReviewPageCode({ title, subtitle, slug, rating, age, adhd, sensory, mature, mainImageName, galleryImageNames, alt, summary, bodyHtml, tips });
        await commitGitHubFile(owner, repo, token, slug, btoa(unescape(encodeURIComponent(fullPageHtml))), `Publish review page: ${title}`);

        const cardHtml = buildReviewCardCode({ title, slug, rating, age, adhd, sensory, mature, mainImageName, alt, summary });
        if (destHome) await injectCardToFile(owner, repo, token, 'index.html', cardHtml);
        if (destReviews) await injectCardToFile(owner, repo, token, 'reviews.html', cardHtml);
        if (destWhatsOn) await injectCardToFile(owner, repo, token, 'whats-on.html', cardHtml);

        document.getElementById('loading-spinner').style.display = 'none';
        showToast(`🎉 Success! "${title}" has been published and injected into your selected pages!`, 'status-success');
        document.getElementById('form-review').reset();
        uploadedFiles = [];
        renderImagePreviews();
        document.getElementById('wysiwyg-content').innerHTML = '<p>Write your detailed review here...</p>';
    } catch (err) {
        document.getElementById('loading-spinner').style.display = 'none';
        showToast(`Error publishing: ${err.message}`, 'status-error');
    }
}

async function publishTheatreFlow() {
    const owner = localStorage.getItem('btmc_gh_owner');
    const repo = localStorage.getItem('btmc_gh_repo');
    const token = localStorage.getItem('btmc_gh_token');
    if (!owner || !token) { toggleSettingsModal(); return; }

    const name = document.getElementById('th-name').value.trim();
    const location = document.getElementById('th-location').value.trim();
    const web = document.getElementById('th-website').value.trim();
    const access = document.getElementById('th-access').value.trim();
    const relaxed = document.getElementById('th-relaxed').value.trim();
    const picker = document.getElementById('th-image-picker');
    let imgName = document.getElementById('th-img-preview-name').value;

    showToast('Adding theatre to Theatre Guide...', 'status-loading');
    try {
        if (picker.files.length > 0) {
            const base64 = await toBase64(picker.files[0]);
            await commitGitHubFile(owner, repo, token, `images/${imgName}`, base64.split(',')[1], `Upload theatre image: ${imgName}`);
        }

        const theatreCardHtml = `\n<article class="theatre-card">
    <div class="theatre-img-container">
        <img src="images/${imgName}" alt="${name}" loading="lazy" decoding="async">
    </div>
    <div class="theatre-info">
        <h2>${name}</h2>
        <span class="theatre-location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${location}</span>
        <div class="theatre-meta">
            <p><strong>Accessibility:</strong> ${access}</p>
            <p><strong>Relaxed Performances:</strong> ${relaxed}</p>
        </div>
        ${web ? `<a href="${web}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Visit Theatre Website</a>` : ''}
    </div>
</article>`;

        await injectCardToFile(owner, repo, token, 'theatre-guide.html', theatreCardHtml, '<div class="container" id="theatre-list">');
        showToast(`✅ Successfully added "${name}" to the Theatre Guide!`, 'status-success');
        document.getElementById('form-theatre').reset();
    } catch (err) {
        showToast(`Error adding theatre: ${err.message}`, 'status-error');
    }
}

async function publishWhatsOnFlow() {
    const owner = localStorage.getItem('btmc_gh_owner');
    const repo = localStorage.getItem('btmc_gh_repo');
    const token = localStorage.getItem('btmc_gh_token');
    if (!owner || !token) { toggleSettingsModal(); return; }

    const title = document.getElementById('wo-title').value.trim();
    const venue = document.getElementById('wo-venue').value.trim();
    const dates = document.getElementById('wo-dates').value.trim();
    const runtime = document.getElementById('wo-runtime').value.trim();
    const age = document.getElementById('wo-age').value;
    const desc = document.getElementById('wo-desc').value.trim();
    const ticketLink = document.getElementById('wo-ticket-link').value.trim();
    const siteLink = document.getElementById('wo-site-link').value.trim();
    const picker = document.getElementById('wo-image-picker');
    let imgName = document.getElementById('wo-img-preview-name').value;

    showToast('Adding show to What\'s On...', 'status-loading');
    try {
        if (picker.files.length > 0) {
            const base64 = await toBase64(picker.files[0]);
            await commitGitHubFile(owner, repo, token, `images/${imgName}`, base64.split(',')[1], `Upload What's On poster: ${imgName}`);
        }

        const whatsOnCardHtml = `\n<article class="listing-card">
    <div class="listing-image">
        <img src="images/${imgName}" alt="${title}" loading="lazy" decoding="async">
    </div>
    <div class="listing-content">
        <h3>${title}</h3>
        <div class="listing-tags"><span class="tag tag-age">${age}</span></div>
        <ul class="listing-info">
            <li><i class="fa-solid fa-location-dot"></i> <span>${venue}</span></li>
            <li><i class="fa-solid fa-calendar-days"></i> <span>${dates}</span></li>
            ${runtime ? `<li><i class="fa-solid fa-clock"></i> <span>${runtime}</span></li>` : ''}
        </ul>
        <p>${desc}</p>
        <div class="listing-links">
            ${ticketLink ? `<a href="${ticketLink}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Book Tickets</a>` : ''}
            ${siteLink ? `<a href="${siteLink}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Production Website</a>` : ''}
        </div>
    </div>
</article>`;

        await injectCardToFile(owner, repo, token, 'whats-on.html', whatsOnCardHtml, '<section class="page-content">');
        showToast(`✅ Successfully added "${title}" to What's On!`, 'status-success');
        document.getElementById('form-whatson').reset();
    } catch (err) {
        showToast(`Error adding show: ${err.message}`, 'status-error');
    }
}

async function loadSiteContent() {
    const owner = localStorage.getItem('btmc_gh_owner');
    const repo = localStorage.getItem('btmc_gh_repo');
    const token = localStorage.getItem('btmc_gh_token');
    if (!owner || !token) return;

    try {
        const rootRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/`, { headers: { 'Authorization': `Bearer ${token}` } });
        const rootFiles = await rootRes.json();
        
        const systemPages = ['index.html', 'reviews.html', 'whats-on.html', 'theatre-guide.html', 'tips-for-parents.html', 'admin.html', 'create-review.html', 'review-template.html'];
        const reviewFiles = Array.isArray(rootFiles) ? rootFiles.filter(f => f.name.endsWith('.html') && !systemPages.includes(f.name)) : [];

        const revContainer = document.getElementById('reviews-list-container');
        revContainer.innerHTML = reviewFiles.length === 0 ? '<p style="color:#555;">No standalone review pages found.</p>' : reviewFiles.map(f => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#fff; border:1px solid #e0e0e0; border-radius:6px; margin-bottom:10px;">
                <span><i class="fa-solid fa-file-lines" style="color:#bd2419; margin-right:8px;"></i> ${f.name}</span>
                <button type="button" class="btn-delete" onclick="deleteReviewPage('${f.name}', '${f.sha}')"><i class="fa-solid fa-trash"></i> Delete Review</button>
            </div>
        `).join('');

        const imgRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/images`, { headers: { 'Authorization': `Bearer ${token}` } });
        const imgContainer = document.getElementById('images-list-container');
        if (imgRes.ok) {
            const imgFiles = await imgRes.json();
            imgContainer.innerHTML = Array.isArray(imgFiles) ? imgFiles.map(img => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#fff; border:1px solid #e0e0e0; border-radius:6px; margin-bottom:10px;">
                    <span><i class="fa-regular fa-image" style="color:#00838f; margin-right:8px;"></i> ${img.name}</span>
                    <button type="button" class="btn-delete" onclick="deleteFile('images/${img.name}', '${img.sha}', 'photo')"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            `).join('') : '<p style="color:#555;">No images found.</p>';
        }
    } catch (err) {
        showToast(`Failed to load content: ${err.message}`, 'status-error');
    }
}

async function deleteReviewPage(filename, sha) {
    if (!confirm(`Are you sure you want to permanently delete "${filename}" and strip its cards from the website?`)) return;
    const owner = localStorage.getItem('btmc_gh_owner');
    const repo = localStorage.getItem('btmc_gh_repo');
    const token = localStorage.getItem('btmc_gh_token');

    showToast(`Deleting ${filename}...`, 'status-loading');
    try {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Delete review page: ${filename}`, sha: sha })
        });

        await removeCardFromFile(owner, repo, token, 'reviews.html', filename);
        await removeCardFromFile(owner, repo, token, 'index.html', filename);
        await removeCardFromFile(owner, repo, token, 'whats-on.html', filename);

        showToast(`✅ Successfully deleted ${filename}!`, 'status-success');
        loadSiteContent();
    } catch (err) {
        showToast(`Error deleting review: ${err.message}`, 'status-error');
    }
}

async function deleteFile(path, sha, typeLabel) {
    if (!confirm(`Are you sure you want to delete "${path}"?`)) return;
    const owner = localStorage.getItem('btmc_gh_owner');
    const repo = localStorage.getItem('btmc_gh_repo');
    const token = localStorage.getItem('btmc_gh_token');

    try {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Delete ${typeLabel}: ${path}`, sha: sha })
        });
        showToast(`✅ Deleted ${path}!`, 'status-success');
        loadSiteContent();
    } catch (err) {
        showToast(`Error: ${err.message}`, 'status-error');
    }
}

async function commitGitHubFile(owner, repo, token, path, contentBase64, message) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    let sha = null;
    const getRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
    }

    const body = { message: message, content: contentBase64, ...(sha && { sha: sha }) };
    const putRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!putRes.ok) throw new Error('Failed to commit file to GitHub');
}

async function injectCardToFile(owner, repo, token, filePath, cardHtml, targetMarker = '<div class="card-grid">') {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;

    const data = await res.json();
    const content = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
    
    if (content.indexOf(targetMarker) !== -1) {
        const updatedContent = content.replace(targetMarker, `${targetMarker}\n${cardHtml}`);
        await commitGitHubFile(owner, repo, token, filePath, btoa(unescape(encodeURIComponent(updatedContent))), `Update ${filePath}`);
    }
}

async function removeCardFromFile(owner, repo, token, filePath, filename) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;

    const data = await res.json();
    const content = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
    const cardRegex = new RegExp(`<!--[\\s\\S]*?-->\\s*<article class="card">[\\s\\S]*?href="${filename}"[\\s\\S]*?<\\/article>`, 'gi');
    const updatedContent = content.replace(cardRegex, '');

    if (content !== updatedContent) {
        await commitGitHubFile(owner, repo, token, filePath, btoa(unescape(encodeURIComponent(updatedContent))), `Remove card (${filename}) from ${filePath}`);
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function buildReviewCardCode(d) {
    const ratingPercent = (parseFloat(d.rating) / 5) * 100;
    let tags = `<span class="tag tag-age">${d.age}</span>`;
    if (d.adhd) tags += `\n<span class="tag tag-adhd">ADHD-Friendly Guide</span>`;
    if (d.sensory) tags += `\n<span class="tag tag-sensory">Sensory Notes</span>`;
    if (d.mature) tags += `\n<span class="tag tag-mature">Mature themes</span>`;

    return `\n<!-- Review Card: ${d.title} -->\n<article class="card">\n    <img src="images/${d.mainImageName}" alt="${d.alt}" loading="lazy" decoding="async">\n    <div class="card-content">\n        <div class="card-star-rating" role="img" aria-label="Rated ${d.rating} out of 5 stars">\n            <div class="star-rating" style="display: inline-block;">\n                <div class="stars-empty"><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i></div>\n                <div class="stars-full" style="width: ${ratingPercent}%;"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>\n            </div>\n        </div>\n        <h3>${d.title}</h3>\n        <div class="card-tags">\n${tags}\n        </div>\n        <p>${d.summary}</p>\n        <a href="${d.slug}" class="btn btn-secondary">Read Full Review</a>\n    </div>\n</article>`;
}

function buildFullReviewPageCode(d) {
    const ratingPercent = (parseFloat(d.rating) / 5) * 100;
    let tags = `<span class="tag tag-age">${d.age}</span>`;
    if (d.adhd) tags += `\n<span class="tag tag-adhd">ADHD-Friendly Guide</span>`;
    if (d.sensory) tags += `\n<span class="tag tag-sensory">Sensory Notes</span>`;
    if (d.mature) tags += `\n<span class="tag tag-mature">Mature themes</span>`;

    let gallerySection = '';
    if (d.galleryImageNames && d.galleryImageNames.length > 0) {
        const slides = d.galleryImageNames.map(img => `
            <div class="swiper-slide">
                <img src="images/${img}" alt="Production Gallery" loading="lazy">
            </div>`).join('');
        gallerySection = `\n<div class="review-gallery">\n    <h2>Production Gallery</h2>\n    <div class="swiper">\n        <div class="swiper-wrapper">${slides}</div>\n        <div class="swiper-button-prev"></div>\n        <div class="swiper-button-next"></div>\n        <div class="swiper-pagination"></div>\n    </div>\n</div>`;
    }

    let tipsSection = '';
    if (d.tips) {
        const listItems = d.tips.split('\n').filter(t => t.trim()).map(t => `<li>${t.trim()}</li>`).join('\n');
        tipsSection = `<article>\n<h3>Key Info for Parents</h3>\n<ul>\n${listItems}\n</ul>\n</article>`;
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
    <meta property="og:image" content="images/${d.mainImageName}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Raleway:wght@500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
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
                <img src="images/${d.mainImageName}" alt="${d.alt}" class="review-main-image" loading="lazy" decoding="async">
                ${gallerySection}
                <h2>Our Family Verdict</h2>
                ${d.bodyHtml}
                ${tipsSection}
            </div>
        </section>
    </main>
    <footer class="site-footer">
        <div class="container">
            <p class="footer-social-tagline">Follow us on social media</p>
            <div class="footer-social-links">
                <a href="https://www.facebook.com/share/1GMtoVD5PB/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
                <a href="https://www.instagram.com/behind.the.magic.curtain" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            </div>
            <p class="footer-copyright">&copy; 2025 Behind the Magic Curtain. All rights reserved.</p>
        </div>
    </footer>
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"><\/script>
    <script src="script.js"><\/script>
</body>
</html>`;
}
