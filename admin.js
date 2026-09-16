/*
 * BEHIND THE MAGIC CURTAIN - ADMIN ENGINE (V3.3)
 * Master PIN: 3011 | Auto WebP Compression, Live Draggable Reordering & Full Multi-Tab CRUD
 */

const MASTER_PIN = "3011";

let reviewImages = [];
let theatreImages = [];
let whatsonImages = [];
let newsImages = [];
let editMode = false;
let currentCache = { reviews: [], whatson: [], theatres: [], news: [], disneyland: [], nav: [] };
window.currentCache = currentCache;
let draggedRowIndex = null;
let toastTimeout = null;

/* --- 1. PIN Security, Navigation & Mobile Drawer --- */
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

function toggleSidebar(open) {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (open) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function switchAdminTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if (btn) btn.classList.add('active');
    
    toggleSidebar(false);
    const mainWrap = document.querySelector('.admin-main-wrap');
    if (mainWrap) mainWrap.scrollTop = 0;

    if (tabId === 'tab-newsletter' && window.initNewsletterTab) {
        window.initNewsletterTab();
    }
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

/* --- 2. Inline WYSIWYG Ribbon --- */
// Track selection and focused editor container so ribbon controls and dropdowns insert accurately
let lastActiveEditor = null;
let lastActiveRange = null;
let lastActiveSelectedText = '';
let lastSavedHighlightRange = null;
let lastSavedHighlightText = '';

function saveActiveEditorSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        const editor = container ? container.closest('.editor-content-area') : null;
        if (editor) {
            lastActiveEditor = editor;
            lastActiveRange = range.cloneRange();
            const text = sel.toString();
            if (text && text.trim() !== '') {
                lastActiveSelectedText = text;
                lastSavedHighlightText = text;
                lastSavedHighlightRange = range.cloneRange();
            }
        }
    }
}
window.saveActiveEditorSelection = saveActiveEditorSelection;

document.addEventListener('selectionchange', saveActiveEditorSelection);
document.addEventListener('mouseup', saveActiveEditorSelection);
document.addEventListener('keyup', saveActiveEditorSelection);
document.addEventListener('focusin', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('editor-content-area')) {
        lastActiveEditor = e.target;
        saveActiveEditorSelection();
    }
});
// Save selection on mousedown before ribbon controls (buttons or selects) take focus
document.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest && e.target.closest('.editor-ribbon')) {
        saveActiveEditorSelection();
    }
}, true);

function cleanEditorBlockElement(blockEl) {
    if (!blockEl) return;
    // Strip inline font-family, font-size, and color overrides so class styles apply uniformly
    blockEl.style.removeProperty('font-family');
    blockEl.style.removeProperty('font-size');
    blockEl.style.removeProperty('color');
    blockEl.style.removeProperty('line-height');
    blockEl.style.removeProperty('margin-top');
    blockEl.style.removeProperty('margin-bottom');
    if (blockEl.getAttribute('style') === '') blockEl.removeAttribute('style');

    // Remove any leading or trailing <br> elements or empty text nodes inside the heading
    while (blockEl.firstChild && (blockEl.firstChild.nodeName === 'BR' || (blockEl.firstChild.nodeType === 3 && !blockEl.firstChild.textContent.trim()))) {
        blockEl.removeChild(blockEl.firstChild);
    }
    while (blockEl.lastChild && (blockEl.lastChild.nodeName === 'BR' || (blockEl.lastChild.nodeType === 3 && !blockEl.lastChild.textContent.trim()))) {
        blockEl.removeChild(blockEl.lastChild);
    }

    // Clean child nodes inside the heading
    const children = Array.from(blockEl.querySelectorAll('*'));
    children.forEach(el => {
        el.style.removeProperty('font-family');
        el.style.removeProperty('font-size');
        el.style.removeProperty('color');
        el.style.removeProperty('line-height');
        el.style.removeProperty('background-color');
        if (el.getAttribute('style') === '') el.removeAttribute('style');

        // If span or font has no attributes, unwrap it
        if ((el.tagName === 'SPAN' || el.tagName === 'FONT') && el.attributes.length === 0) {
            const parent = el.parentNode;
            if (parent) {
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            }
        }
    });

    // If the entire heading is wrapped in a single <b> or <strong>, unwrap it since <h3> is already bold
    if (blockEl.tagName === 'H3' || blockEl.tagName === 'H2') {
        if (blockEl.childNodes.length === 1 && (blockEl.firstChild.nodeName === 'B' || blockEl.firstChild.nodeName === 'STRONG')) {
            const inner = blockEl.firstChild;
            while (inner.firstChild) blockEl.insertBefore(inner.firstChild, inner);
            blockEl.removeChild(inner);
        }
    }
}

function sanitizeEditorHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    const div = document.createElement('div');
    div.innerHTML = html.trim();

    // 1. Remove scraping/framework junk elements
    const junkSelectors = [
        'sources-carousel-inline',
        'source-inline-chip',
        'source-footnote',
        'sup.superscript'
    ];
    junkSelectors.forEach(sel => {
        div.querySelectorAll(sel).forEach(el => el.remove());
    });

    // 2. Remove Google/Angular attributes and junk styles
    const allElements = div.querySelectorAll('*');
    allElements.forEach(el => {
        const attrsToRemove = [];
        for (let i = 0; i < el.attributes.length; i++) {
            const attrName = el.attributes[i].name;
            if (
                attrName.startsWith('data-path-to-node') ||
                attrName.startsWith('data-index-in-node') ||
                attrName.startsWith('ng-') ||
                attrName.startsWith('_ng') ||
                attrName === 'ng-version' ||
                (attrName === 'id' && el.id.startsWith('p-rc_'))
            ) {
                attrsToRemove.push(attrName);
            }
        }
        attrsToRemove.forEach(a => el.removeAttribute(a));

        // Clean font overrides from style attribute
        if (el.hasAttribute('style')) {
            el.style.removeProperty('font-family');
            el.style.removeProperty('font-size');
            el.style.removeProperty('line-height');
            if (el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'P' || el.tagName === 'LI') {
                el.style.removeProperty('color');
            }
            if (!el.getAttribute('style') || el.getAttribute('style').trim() === '') {
                el.removeAttribute('style');
            }
        }

        // Unwrap deprecated <font> tags
        if (el.tagName === 'FONT') {
            const parent = el.parentNode;
            if (parent) {
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            }
            return;
        }

        // Unwrap span tags with no attributes
        if (el.tagName === 'SPAN' && el.attributes.length === 0) {
            const parent = el.parentNode;
            if (parent) {
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            }
            return;
        }

        // Clean heading internal junk
        if (el.tagName === 'H2' || el.tagName === 'H3') {
            while (el.firstChild && (el.firstChild.nodeName === 'BR' || (el.firstChild.nodeType === 3 && !el.firstChild.textContent.trim()))) {
                el.removeChild(el.firstChild);
            }
            while (el.lastChild && (el.lastChild.nodeName === 'BR' || (el.lastChild.nodeType === 3 && !el.lastChild.textContent.trim()))) {
                el.removeChild(el.lastChild);
            }
            if (el.childNodes.length === 1 && (el.firstChild.nodeName === 'B' || el.firstChild.nodeName === 'STRONG')) {
                const inner = el.firstChild;
                while (inner.firstChild) el.insertBefore(inner.firstChild, inner);
                el.removeChild(inner);
            }
        }
    });

    // 3. Remove completely empty headings
    div.querySelectorAll('h1, h2, h3, h4').forEach(h => {
        if (!h.textContent.trim()) {
            h.remove();
        }
    });

    // 4. Clean up redundant empty container divs/paragraphs directly adjacent to headings
    div.querySelectorAll('div, p').forEach(p => {
        if (!p.textContent.trim() && p.querySelectorAll('img, iframe, video').length === 0) {
            const prev = p.previousElementSibling;
            const next = p.nextElementSibling;
            if ((prev && /^H[1-6]$/.test(prev.tagName)) || (next && /^H[1-6]$/.test(next.tagName))) {
                p.remove();
            }
        }
    });

    return div.innerHTML.trim();
}

// Global paste listener for editor content areas to sanitize external clipboard markup
document.addEventListener('paste', (e) => {
    const editor = e.target && e.target.closest ? e.target.closest('.editor-content-area') : null;
    if (!editor) return;

    const htmlData = e.clipboardData ? e.clipboardData.getData('text/html') : '';
    if (htmlData) {
        e.preventDefault();
        const clean = sanitizeEditorHtml(htmlData);
        document.execCommand('insertHTML', false, clean);
    }
});

function applyInlineFormat(command, value = null) {
    if (command === 'formatBlock') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            document.execCommand('formatBlock', false, `<${value}>`);
            try {
                const range = selection.getRangeAt(0);
                let node = range.commonAncestorContainer;
                if (node && node.nodeType === 3) node = node.parentElement;
                const blockEl = node && node.closest ? node.closest(value) : null;
                if (blockEl) {
                    cleanEditorBlockElement(blockEl);
                }
            } catch (err) {
                console.warn('Formatting cleanup notice:', err);
            }
        }
    } else {
        document.execCommand(command, false, value);
    }
}

function insertInlineLink() {
    const url = prompt('Enter web link URL (https://...):');
    if (url) {
        document.execCommand('createLink', false, url);
    }
}

function escapeHtmlSnippet(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function applyBadgeLabel(type, triggerElement = null) {
    if (!type) return;

    // 1. Resolve target editor
    let targetEditor = null;
    if (triggerElement && triggerElement.closest) {
        const parentContainer = triggerElement.closest('.editor-container');
        if (parentContainer) {
            targetEditor = parentContainer.querySelector('.editor-content-area');
        }
    }
    if (!targetEditor && lastActiveEditor && document.body.contains(lastActiveEditor)) {
        targetEditor = lastActiveEditor;
    }
    if (!targetEditor) {
        const activeTab = Array.from(document.querySelectorAll('.tab-content')).find(t => t.style.display !== 'none');
        if (activeTab) {
            targetEditor = activeTab.querySelector('.editor-content-area');
        }
    }
    if (!targetEditor) {
        targetEditor = document.getElementById('wysiwyg-content');
    }
    if (!targetEditor) return;

    // 2. Resolve text and range
    let targetRange = null;
    let selectedText = '';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.toString().trim() !== '') {
        const testRange = sel.getRangeAt(0);
        let cont = testRange.commonAncestorContainer;
        if (cont.nodeType === Node.TEXT_NODE) cont = cont.parentElement;
        if (cont && cont.closest && cont.closest('.editor-content-area') === targetEditor) {
            targetRange = testRange;
            selectedText = sel.toString().trim();
        }
    }

    if (!selectedText && lastSavedHighlightText && lastSavedHighlightRange) {
        try {
            if (targetEditor.contains(lastSavedHighlightRange.commonAncestorContainer)) {
                targetRange = lastSavedHighlightRange;
                selectedText = lastSavedHighlightText.trim();
            }
        } catch (e) {}
    }

    if (!selectedText && lastActiveRange && lastActiveSelectedText) {
        try {
            if (targetEditor.contains(lastActiveRange.commonAncestorContainer)) {
                targetRange = lastActiveRange;
                selectedText = lastActiveSelectedText.trim();
            }
        } catch (e) {}
    }

    const isButton = type.startsWith('btn');

    // If no text was highlighted, prompt with safe fallback
    if (!selectedText) {
        let entered = null;
        try {
            const promptMsg = isButton ? 'Enter button text (e.g. Book Tickets, Official Site):' : 'Enter badge text (e.g. Ages 7+, Sensory Friendly):';
            entered = prompt(promptMsg);
        } catch (e) {
            console.warn('Prompt not available or cancelled:', e);
        }

        if (entered && entered.trim()) {
            selectedText = entered.trim();
        } else {
            if (isButton) {
                selectedText = type === 'btn-primary' ? 'Book Tickets' : 'Official Site';
            } else {
                const defaultBadges = {
                    'tag-age': 'Ages 7+',
                    'tag-adhd': 'Sensory Friendly',
                    'tag-sensory': 'Sensory Notes',
                    'tag-touring': 'UK Tour',
                    'tag-mature': 'Mature Themes'
                };
                selectedText = defaultBadges[type] || 'Label';
            }
        }
    }

    // 3. Construct HTML
    let snippetHtml = '';
    if (isButton) {
        let destUrl = 'https://';
        try {
            const promptedUrl = prompt('Enter button destination link URL (https://...):', 'https://');
            if (promptedUrl !== null && promptedUrl.trim() !== '') {
                destUrl = promptedUrl.trim();
            }
        } catch (e) {
            console.warn('URL prompt not available:', e);
        }
        if (!destUrl || destUrl === 'https://') destUrl = '#';
        snippetHtml = `<a href="${destUrl}" class="btn ${type}" target="_blank" rel="noopener noreferrer">${escapeHtmlSnippet(selectedText)}</a>&nbsp;`;
    } else {
        snippetHtml = `<span class="tag ${type}">${escapeHtmlSnippet(selectedText)}</span>&nbsp;`;
    }

    // 4. Focus and insert into the target editor
    targetEditor.focus();

    let inserted = false;
    if (targetRange && targetEditor.contains(targetRange.commonAncestorContainer)) {
        try {
            targetRange.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = snippetHtml;
            const frag = document.createDocumentFragment();
            let child, lastNode;
            while ((child = tempDiv.firstChild)) {
                lastNode = frag.appendChild(child);
            }
            targetRange.insertNode(frag);

            if (lastNode) {
                const newRange = document.createRange();
                newRange.setStartAfter(lastNode);
                newRange.collapse(true);
                const currentSel = window.getSelection();
                currentSel.removeAllRanges();
                currentSel.addRange(newRange);
                lastActiveRange = newRange.cloneRange();
                lastSavedHighlightRange = null;
                lastSavedHighlightText = '';
            }
            inserted = true;
        } catch (err) {
            console.warn('Direct range insertion failed:', err);
        }
    }

    if (!inserted) {
        try {
            inserted = document.execCommand('insertHTML', false, snippetHtml);
        } catch (e) {}
    }

    if (!inserted) {
        targetEditor.insertAdjacentHTML('beforeend', snippetHtml);
        inserted = true;
    }

    targetEditor.dispatchEvent(new Event('input', { bubbles: true }));
    showToast(`Inserted ${isButton ? 'Button' : 'Badge'}: "${selectedText}"`, 'status-success');
}

function insertInlineButton(triggerElement = null) {
    applyBadgeLabel('btn-primary', triggerElement);
}

// Global exposure for inline HTML event handlers
window.applyInlineFormat = applyInlineFormat;
window.insertInlineLink = insertInlineLink;
window.applyBadgeLabel = applyBadgeLabel;
window.insertInlineButton = insertInlineButton;

/* --- Video Embed Engine --- */

function parseVideoEmbedUrl(url) {
    if (!url) return null;
    const cleanUrl = url.trim();

    // YouTube: handles watch?v=, youtu.be/, shorts/, embed/
    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
        return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`;
    }

    // Vimeo: handles standard and channel URLs
    const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
    if (vimeoMatch && (vimeoMatch[3] || vimeoMatch[2])) {
        const id = vimeoMatch[3] || vimeoMatch[2];
        return `https://player.vimeo.com/video/${id}?color=bd2419&title=0&byline=0&portrait=0`;
    }

    return null;
}

function insertVideoEmbed(triggerElement = null) {
    const url = prompt('Enter a YouTube or Vimeo URL to embed:');
    if (!url) return;

    const embedUrl = parseVideoEmbedUrl(url);
    if (!embedUrl) {
        alert('Unrecognized link format. Please provide a standard YouTube or Vimeo URL.');
        return;
    }

    // Find the relevant editor container
    let targetEditor = null;
    if (triggerElement && triggerElement.closest) {
        const parentContainer = triggerElement.closest('.editor-container');
        if (parentContainer) {
            targetEditor = parentContainer.querySelector('.editor-content-area');
        }
    }

    if (!targetEditor && lastActiveEditor && document.body.contains(lastActiveEditor)) {
        targetEditor = lastActiveEditor;
    }

    if (!targetEditor) {
        const activeTab = Array.from(document.querySelectorAll('.tab-content')).find(t => t.style.display !== 'none');
        if (activeTab) {
            targetEditor = activeTab.querySelector('.editor-content-area');
        }
    }

    if (!targetEditor) {
        targetEditor = document.getElementById('wysiwyg-content');
    }

    // Responsive BTMC video container with clean fallback break
    const videoHtml = `<div class="btmc-video-container"><iframe src="${embedUrl}" title="Video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div><p><br></p>`;

    if (targetEditor) {
        targetEditor.focus();
        const success = document.execCommand('insertHTML', false, videoHtml);
        if (!success) {
            targetEditor.insertAdjacentHTML('beforeend', videoHtml);
        }
    } else {
        document.execCommand('insertHTML', false, videoHtml);
    }
}

/* --- 3. Seamless Auto-WebP Compression Engine --- */
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

                const webpBase64 = canvas.toDataURL('image/webp', 0.86);
                const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const cleanWebpName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '.webp';
                resolve({ base64: webpBase64.split(',')[1], preview: webpBase64, name: cleanWebpName });
            };
        };
    });
}

async function handleImageSelection(fileList, type) {
    if (!fileList || fileList.length === 0) return;
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : (type === 'whatson' ? whatsonImages : newsImages));

    showToast('⏳ Optimising images...', 'status-loading');

    for (let i = 0; i < fileList.length; i++) {
        if (fileList[i].type.startsWith('image/')) {
            const processed = await processAndCompressImage(fileList[i]);
            targetArray.push({ base64: processed.base64, name: processed.name, preview: processed.preview });
        }
    }
    renderImagePreviews(type);
    showToast('✨ Image ready!', 'status-success');
}

function renderImagePreviews(type) {
    const containerId = `${type}-image-list`;
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : (type === 'whatson' ? whatsonImages : newsImages));
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = targetArray.map((item, idx) => `
        <div class="img-item">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-weight:700; color:#888;">#${idx + 1}</span>
                <img src="${item.preview}">
                <span>${item.name}</span>
                ${idx === 0 
                    ? '<span class="img-queue-badge badge-main-img"><i class="fa-solid fa-star"></i> Primary Card Photo</span>' 
                    : '<span class="img-queue-badge badge-gallery-img"><i class="fa-solid fa-images"></i> Carousel Slide</span>'}
            </div>
            <div style="display:flex; gap:6px;">
                ${idx > 0 ? `<button type="button" onclick="moveImageInQueue('${type}', ${idx}, -1)" class="btn-edit" title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>` : ''}
                ${idx < targetArray.length - 1 ? `<button type="button" onclick="moveImageInQueue('${type}', ${idx}, 1)" class="btn-edit" title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>` : ''}
                <button type="button" onclick="removeImage('${type}', ${idx})" class="btn-delete"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function moveImageInQueue(type, idx, direction) {
    const targetArray = type === 'review' ? reviewImages : (type === 'theatre' ? theatreImages : (type === 'whatson' ? whatsonImages : newsImages));
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= targetArray.length) return;
    const [moved] = targetArray.splice(idx, 1);
    targetArray.splice(targetIdx, 0, moved);
    renderImagePreviews(type);
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

/* --- 4. Edit Mode Dispatchers --- */
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
    document.getElementById('rev-age').value = item.age || 'All Ages';
    document.getElementById('tag-adhd').checked = !!item.tags?.adhd;
    document.getElementById('tag-sensory').checked = !!item.tags?.sensory;
    document.getElementById('tag-mature').checked = !!item.tags?.mature;
    document.getElementById('rev-image-alt').value = item.altText || '';
    document.getElementById('rev-summary').value = item.summary || '';
    document.getElementById('wysiwyg-content').innerHTML = item.bodyHtml || '<p></p>';
    
    if (item.tipsHtml) {
        document.getElementById('rev-tips-wysiwyg').innerHTML = item.tipsHtml;
    } else if (Array.isArray(item.tips)) {
        document.getElementById('rev-tips-wysiwyg').innerHTML = `<ul>${item.tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
    } else {
        document.getElementById('rev-tips-wysiwyg').innerHTML = '';
    }

    const isDraft = item.status === 'draft';
    document.getElementById('rev-published').checked = !isDraft;
    document.getElementById('rev-submit-btn').innerHTML = isDraft 
        ? '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Publish Live' 
        : '<i class="fa-solid fa-floppy-disk"></i> Overwrite Review';
    const revDraftBtn = document.getElementById('rev-draft-btn');
    if (revDraftBtn) {
        revDraftBtn.innerHTML = isDraft ? '<i class="fa-solid fa-file-pen"></i> Update Draft' : '<i class="fa-solid fa-file-pen"></i> Save as Draft';
    }

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
    document.getElementById('wo-region').value = item.region || 'West Midlands';
    document.getElementById('wo-dates').value = item.dates || '';
    document.getElementById('wo-expiry').value = item.expiryDate || '';
    document.getElementById('wo-runtime').value = item.runtime || '';
    document.getElementById('wo-age').value = item.age || 'Ages 4+';
    document.getElementById('wo-category').value = item.category || 'theatre';
    document.getElementById('wo-is-touring').checked = !!item.isTouring;

    // Accessibility filter tags
    const descLower = (item.desc || '').toLowerCase();
    const relaxedCb = document.getElementById('wo-tag-relaxed');
    const bslCb = document.getElementById('wo-tag-bsl');
    const capCb = document.getElementById('wo-tag-captioned');
    const audioCb = document.getElementById('wo-tag-audio');
    if (relaxedCb) relaxedCb.checked = !!(item.tags?.relaxed || item.hasRelaxed || descLower.includes('relaxed'));
    if (bslCb) bslCb.checked = !!(item.tags?.bsl || descLower.includes('bsl'));
    if (capCb) capCb.checked = !!(item.tags?.captioned || descLower.includes('captioned'));
    if (audioCb) audioCb.checked = !!(item.tags?.audioDescribed || descLower.includes('audio described'));

    document.getElementById('wo-desc-wysiwyg').innerHTML = item.desc || '';
    document.getElementById('wo-ticket-link').value = item.ticketLink || '';
    document.getElementById('wo-site-link').value = item.siteLink || '';
    document.getElementById('wo-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Show';

    whatsonImages = [];
    if (item.image) whatsonImages.push({ base64: null, name: item.image, preview: `images/${item.image}` });
    renderImagePreviews('whatson');
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
    document.getElementById('th-access-wysiwyg').innerHTML = item.accessibility || '';
    document.getElementById('th-relaxed-wysiwyg').innerHTML = item.relaxed || '';
    document.getElementById('th-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Live Theatre';

    theatreImages = [];
    if (item.image) theatreImages.push({ base64: null, name: item.image, preview: `images/${item.image}` });
    renderImagePreviews('theatre');
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
    document.getElementById('news-body-wysiwyg').innerHTML = item.bodyHtml || '';
    document.getElementById('news-details-wysiwyg').innerHTML = item.detailsHtml || '';
    const isDraft = item.status === 'draft';
    document.getElementById('news-published').checked = !isDraft;
    document.getElementById('news-submit-btn').innerHTML = isDraft 
        ? '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Live' 
        : '<i class="fa-solid fa-floppy-disk"></i> Overwrite Story';
    const newsDraftBtn = document.getElementById('news-draft-btn');
    if (newsDraftBtn) {
        newsDraftBtn.innerHTML = isDraft ? '<i class="fa-solid fa-file-pen"></i> Update Draft' : '<i class="fa-solid fa-file-pen"></i> Save as Draft';
    }

    newsImages = [];
    if (item.mainImage) newsImages.push({ base64: null, name: item.mainImage, preview: `images/${item.mainImage}` });
    if (item.galleryImages && Array.isArray(item.galleryImages)) {
        item.galleryImages.forEach(gImg => newsImages.push({ base64: null, name: gImg, preview: `images/${gImg}` }));
    }
    renderImagePreviews('news');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterEditDisneyland(id) {
    const item = currentCache.disneyland.find(d => d.id === id);
    if (!item) return;

    editMode = true;
    document.getElementById('edit-banner').style.display = 'flex';
    document.getElementById('edit-item-title').textContent = `DLP Attraction: ${item.name}`;

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
    document.getElementById('dlp-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Overwrite Attraction Baseline';
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

    document.getElementById('rev-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Publish Live';
    const revDraftBtn = document.getElementById('rev-draft-btn');
    if (revDraftBtn) revDraftBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
    const revPubCb = document.getElementById('rev-published');
    if (revPubCb) revPubCb.checked = true;

    document.getElementById('wo-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save What\'s On Show';
    document.getElementById('th-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Theatre Entry';
    
    document.getElementById('news-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish News Story';
    const newsDraftBtn = document.getElementById('news-draft-btn');
    if (newsDraftBtn) newsDraftBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
    const newsPubCb = document.getElementById('news-published');
    if (newsPubCb) newsPubCb.checked = true;

    document.getElementById('dlp-submit-btn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Disneyland Baseline';

    document.getElementById('wysiwyg-content').innerHTML = '';
    document.getElementById('rev-tips-wysiwyg').innerHTML = '';
    document.getElementById('wo-desc-wysiwyg').innerHTML = '';
    document.getElementById('th-access-wysiwyg').innerHTML = '';
    document.getElementById('th-relaxed-wysiwyg').innerHTML = '';
    document.getElementById('news-body-wysiwyg').innerHTML = '';
    document.getElementById('news-details-wysiwyg').innerHTML = '';

    reviewImages = [];
    theatreImages = [];
    whatsonImages = [];
    newsImages = [];
    renderImagePreviews('review');
    renderImagePreviews('theatre');
    renderImagePreviews('whatson');
    renderImagePreviews('news');

    // Reset What's On specific tags
    ['wo-tag-relaxed', 'wo-tag-bsl', 'wo-tag-captioned', 'wo-tag-audio', 'wo-is-touring'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
}

/* --- 5. Publishing Handlers & Draft Architecture --- */
function handlePublishCheckboxToggle(type, isChecked) {
    if (type === 'review') {
        const submitBtn = document.getElementById('rev-submit-btn');
        const draftBtn = document.getElementById('rev-draft-btn');
        const isEditing = !!document.getElementById('rev-edit-id').value;
        if (isChecked) {
            submitBtn.innerHTML = isEditing ? '<i class="fa-solid fa-floppy-disk"></i> Overwrite Review' : '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Publish Live';
            if (draftBtn) draftBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
        } else {
            submitBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
            if (draftBtn) draftBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
        }
    } else if (type === 'news') {
        const submitBtn = document.getElementById('news-submit-btn');
        const draftBtn = document.getElementById('news-draft-btn');
        const isEditing = !!document.getElementById('news-edit-id').value;
        if (isChecked) {
            submitBtn.innerHTML = isEditing ? '<i class="fa-solid fa-floppy-disk"></i> Overwrite Story' : '<i class="fa-solid fa-cloud-arrow-up"></i> Publish News Story';
            if (draftBtn) draftBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
        } else {
            submitBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
            if (draftBtn) draftBtn.innerHTML = '<i class="fa-solid fa-file-pen"></i> Save as Draft';
        }
    }
}

async function saveReviewAsDraft() {
    const pubCb = document.getElementById('rev-published');
    if (pubCb) pubCb.checked = false;
    handlePublishCheckboxToggle('review', false);
    const title = document.getElementById('rev-title').value.trim();
    if (!title) {
        showToast('⚠️ Please enter a show title before saving as draft.', 'status-error');
        document.getElementById('rev-title').focus();
        return;
    }
    const slugInput = document.getElementById('rev-slug');
    if (!slugInput.value.trim()) {
        syncReviewSlug();
    }
    await handleReviewSubmit(true);
}

async function saveNewsAsDraft() {
    const pubCb = document.getElementById('news-published');
    if (pubCb) pubCb.checked = false;
    handlePublishCheckboxToggle('news', false);
    const title = document.getElementById('news-title').value.trim();
    if (!title) {
        showToast('⚠️ Please enter a headline before saving as draft.', 'status-error');
        document.getElementById('news-title').focus();
        return;
    }
    const slugInput = document.getElementById('news-slug');
    if (!slugInput.value.trim()) {
        syncNewsSlug();
    }
    await handleNewsSubmit(true);
}

async function handleReviewSubmit(forceDraft = false) {
    const creds = getCredentials();
    if (!creds) return;

    const title = document.getElementById('rev-title').value.trim();
    if (!title) {
        showToast('⚠️ Please enter a show title.', 'status-error');
        document.getElementById('rev-title').focus();
        return;
    }
    const slugInput = document.getElementById('rev-slug');
    if (!slugInput.value.trim()) {
        syncReviewSlug();
    }
    const slug = document.getElementById('rev-slug').value.trim() || 'review.html';
    const editId = document.getElementById('rev-edit-id').value;
    const isPublished = forceDraft ? false : document.getElementById('rev-published').checked;
    const nowIso = new Date().toISOString();

    showToast(isPublished ? '⏳ Uploading images and compiling live review...' : '⏳ Saving review draft...', 'status-loading');

    try {
        for (let item of reviewImages) {
            if (item.base64) {
                await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${item.name}`, item.base64, `Upload image: ${item.name}`);
            }
        }

        const reviews = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/reviews.json');
        const existingItem = editId ? reviews.find(r => r.id === editId) : null;
        
        const primaryImage = reviewImages.length > 0 ? reviewImages[0].name : (existingItem?.mainImage || 'placeholder.webp');
        const carouselImages = reviewImages.slice(1).map(img => img.name);
        const tipsHtmlContent = document.getElementById('rev-tips-wysiwyg') ? document.getElementById('rev-tips-wysiwyg').innerHTML : '';

        const reviewEntry = {
            id: editId || 'rev_' + Date.now(),
            title,
            slug,
            subtitle: document.getElementById('rev-subtitle').value.trim(),
            rating: parseFloat(document.getElementById('rev-rating').value) || 5.0,
            age: document.getElementById('rev-age').value.trim() || 'All Ages',
            tags: {
                adhd: document.getElementById('tag-adhd').checked,
                sensory: document.getElementById('tag-sensory').checked,
                mature: document.getElementById('tag-mature').checked
            },
            mainImage: primaryImage,
            galleryImages: carouselImages,
            altText: document.getElementById('rev-image-alt').value.trim() || title,
            summary: document.getElementById('rev-summary').value.trim(),
            bodyHtml: sanitizeEditorHtml(document.getElementById('wysiwyg-content').innerHTML),
            tipsHtml: sanitizeEditorHtml(tipsHtmlContent),
            order: existingItem && existingItem.order !== undefined ? existingItem.order : 1,
            rank: existingItem ? (Number(existingItem.rank) || 1) : 1,
            status: isPublished ? 'published' : 'draft',
            dateDrafted: existingItem?.dateDrafted || nowIso,
            dateModified: nowIso
        };

        const updatedReviews = editId ? reviews.map(r => r.id === editId ? reviewEntry : r) : [reviewEntry, ...reviews];
        
        // Re-calculate ranks and orders:
        // Published items receive consecutive ranks 1, 2, 3...
        // Draft items receive ranks 1000+ so they never displace published ranks 1 or 2!
        let publishedRank = 1;
        let draftRank = 1000;
        updatedReviews.forEach((r, idx) => {
            r.order = idx + 1;
            if (r.status === 'published') {
                r.rank = publishedRank++;
            } else {
                r.rank = draftRank++;
            }
        });

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/reviews.json', btoa(unescape(encodeURIComponent(JSON.stringify(updatedReviews, null, 2)))), `Update reviews (${title})`);

        const pageHtml = buildFullReviewPageHtml(reviewEntry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, slug, btoa(unescape(encodeURIComponent(pageHtml))), `Publish review page: ${title}`);

        showToast(isPublished ? `🎉 Successfully published "${title}" live!` : `💾 Saved draft for "${title}"! (Hidden from live site)`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'status-error');
    }
}

async function handleNewsSubmit(forceDraft = false) {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('news-edit-id').value;
    const title = document.getElementById('news-title').value.trim();
    if (!title) {
        showToast('⚠️ Please enter a headline.', 'status-error');
        document.getElementById('news-title').focus();
        return;
    }
    const slugInput = document.getElementById('news-slug');
    if (!slugInput.value.trim()) {
        syncNewsSlug();
    }
    const slug = document.getElementById('news-slug').value.trim() || 'news.html';
    const isPublished = forceDraft ? false : document.getElementById('news-published').checked;
    const nowIso = new Date().toISOString();

    showToast(isPublished ? '⏳ Uploading images and compiling news article...' : '⏳ Saving news story draft...', 'status-loading');
    try {
        for (let item of newsImages) {
            if (item.base64) {
                await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${item.name}`, item.base64, `Upload news image: ${item.name}`);
            }
        }

        const newsList = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/news.json');
        const existing = editId ? newsList.find(n => n.id === editId) : null;

        const primaryImage = newsImages.length > 0 ? newsImages[0].name : (existing?.mainImage || 'news-default.webp');
        const carouselImages = newsImages.slice(1).map(img => img.name);

        // Date logic:
        // On news stories the date shown on the HTML should be the date that it's published, not the draft date.
        // This is updated based on when it's published for the first time, as opposed to when it was drafted.
        let finalDatePublished = null;
        if (isPublished) {
            const wasAlreadyPublished = existing && existing.status === 'published' && existing.datePublished;
            if (wasAlreadyPublished) {
                finalDatePublished = existing.datePublished;
            } else {
                finalDatePublished = nowIso; // First time published live!
            }
        } else {
            // Draft status - datePublished remains null
            finalDatePublished = null;
        }

        const entry = {
            id: editId || 'news_' + Date.now(),
            title,
            slug,
            category: document.getElementById('news-category').value.trim() || 'Theatre News',
            author: document.getElementById('news-author').value.trim() || 'Katy Rose Meaney',
            summary: document.getElementById('news-summary').value.trim(),
            bodyHtml: sanitizeEditorHtml(document.getElementById('news-body-wysiwyg').innerHTML),
            detailsHtml: sanitizeEditorHtml(document.getElementById('news-details-wysiwyg').innerHTML),
            mainImage: primaryImage,
            galleryImages: carouselImages,
            dateDrafted: existing?.dateDrafted || (existing ? existing.datePublished : null) || nowIso,
            datePublished: finalDatePublished,
            dateModified: nowIso,
            status: isPublished ? 'published' : 'draft',
            order: existing && existing.order !== undefined ? existing.order : 1,
            rank: existing ? (Number(existing.rank) || 1) : 1
        };

        const updated = editId ? newsList.map(n => n.id === editId ? entry : n) : [entry, ...newsList];

        // Re-calculate ranks and orders:
        let publishedRank = 1;
        let draftRank = 1000;
        updated.forEach((n, idx) => {
            n.order = idx + 1;
            if (n.status === 'published') {
                n.rank = publishedRank++;
            } else {
                n.rank = draftRank++;
            }
        });

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/news.json', btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2)))), `Save news story: ${title}`);
        
        const pageHtml = buildFullNewsPageHtml(entry);
        await commitGitHubFile(creds.owner, creds.repo, creds.token, slug, btoa(unescape(encodeURIComponent(pageHtml))), `Publish news page: ${title}`);

        showToast(isPublished ? `🎉 News story published live!` : `💾 Saved news story as draft! (Hidden from live site)`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ News error: ${err.message}`, 'status-error');
    }
}

async function handleWhatsOnSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('wo-edit-id').value;
    const title = document.getElementById('wo-title').value.trim();

    showToast('⏳ Saving What\'s On show...', 'status-loading');
    try {
        for (let item of whatsonImages) {
            if (item.base64) {
                await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${item.name}`, item.base64, `Upload show image: ${item.name}`);
            }
        }

        const shows = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        const primaryImage = whatsonImages.length > 0 ? whatsonImages[0].name : (editId ? shows.find(w => w.id === editId)?.image || 'show-default.webp' : 'show-default.webp');

        const relaxedChecked = document.getElementById('wo-tag-relaxed')?.checked || false;
        const bslChecked = document.getElementById('wo-tag-bsl')?.checked || false;
        const capChecked = document.getElementById('wo-tag-captioned')?.checked || false;
        const audioChecked = document.getElementById('wo-tag-audio')?.checked || false;

        const entry = {
            id: editId || 'wo_' + Date.now(),
            title,
            venue: document.getElementById('wo-venue').value.trim(),
            region: document.getElementById('wo-region').value.trim() || 'West Midlands',
            dates: document.getElementById('wo-dates').value.trim(),
            expiryDate: document.getElementById('wo-expiry').value,
            runtime: document.getElementById('wo-runtime').value.trim(),
            age: document.getElementById('wo-age').value.trim() || 'Ages 4+',
            category: document.getElementById('wo-category').value,
            isTouring: document.getElementById('wo-is-touring').checked,
            tags: {
                relaxed: relaxedChecked,
                bsl: bslChecked,
                captioned: capChecked,
                audioDescribed: audioChecked
            },
            image: primaryImage,
            desc: sanitizeEditorHtml(document.getElementById('wo-desc-wysiwyg').innerHTML),
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
        for (let item of theatreImages) {
            if (item.base64) {
                await commitGitHubFile(creds.owner, creds.repo, creds.token, `images/${item.name}`, item.base64, `Upload theatre photo: ${item.name}`);
            }
        }

        const theatres = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/theatres.json');
        const primaryImage = theatreImages.length > 0 ? theatreImages[0].name : (editId ? theatres.find(t => t.id === editId)?.image || 'theatre-default.webp' : 'theatre-default.webp');

        const entry = {
            id: editId || 'th_' + Date.now(),
            name,
            location: document.getElementById('th-location').value.trim(),
            image: primaryImage,
            website: document.getElementById('th-website').value.trim(),
            accessibility: sanitizeEditorHtml(document.getElementById('th-access-wysiwyg').innerHTML),
            relaxed: sanitizeEditorHtml(document.getElementById('th-relaxed-wysiwyg').innerHTML),
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

async function handleDisneylandSubmit() {
    const creds = getCredentials();
    if (!creds) return;

    const editId = document.getElementById('dlp-edit-id').value;
    const name = document.getElementById('dlp-name').value.trim();
    const idSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '');

    showToast('⏳ Updating Disneyland baseline...', 'status-loading');
    try {
        const attractions = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/disneyland.json');
        
        const entry = {
            id: editId || `dlp_${idSlug}`,
            name,
            park: document.getElementById('dlp-park').value,
            land: document.getElementById('dlp-land').value.trim(),
            type: document.getElementById('dlp-type').value,
            minHeight: document.getElementById('dlp-height').value.trim() || 'None',
            thrillLevel: parseInt(document.getElementById('dlp-speed').value, 10) || 3,
            fearFactor: parseInt(document.getElementById('dlp-fear').value, 10) || 3,
            noiseLevel: parseInt(document.getElementById('dlp-noise').value, 10) || 3,
            darkness: parseInt(document.getElementById('dlp-darkness').value, 10) || 3,
            sensoryNotes: document.getElementById('dlp-notes').value.trim(),
            adhdTip: document.getElementById('dlp-adhd').value.trim()
        };

        const updated = editId ? attractions.map(d => d.id === editId ? entry : d) : [...attractions, entry];

        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/disneyland.json', btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2)))), `Update Disneyland: ${name}`);
        showToast(`✅ Attraction "${name}" saved!`, 'status-success');
        cancelEditMode();
        loadManagementDashboard();
    } catch (err) {
        showToast(`❌ DLP Error: ${err.message}`, 'status-error');
    }
}

/* --- 6. HTML Template Generators --- */
function buildFullNewsPageHtml(d) {
    const formattedDate = d.datePublished 
        ? new Date(d.datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Draft (Not Published)';
    
    let gallerySection = '';
    if (d.galleryImages && Array.isArray(d.galleryImages) && d.galleryImages.length > 0) {
        gallerySection = `
        <div class="review-gallery">
            <h2>Photo Gallery</h2>
            <div class="swiper btmc-swiper">
                <div class="swiper-wrapper">
                    ${d.galleryImages.map(imgName => `
                    <div class="swiper-slide">
                        <img src="images/${imgName}" alt="Gallery photo for ${d.title}" loading="lazy">
                    </div>`).join('\n')}
                </div>
                <div class="swiper-pagination"></div>
                <div class="swiper-button-prev" aria-label="Previous slide"></div>
                <div class="swiper-button-next" aria-label="Next slide"></div>
            </div>
        </div>`;
    }

    let detailsCardSection = '';
    if (d.detailsHtml && d.detailsHtml.trim()) {
        detailsCardSection = `
        <article class="news-details-box">
            ${d.detailsHtml}
        </article>`;
    }

    const newsSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": d.title,
        "image": [`https://behindthemagiccurtain.co.uk/images/${d.mainImage}`],
        "datePublished": d.datePublished,
        "dateModified": d.dateModified,
        "author": [{
            "@type": "Person",
            "name": d.author,
            "jobTitle": "Theatre Critic & Features Writer"
        }],
        "publisher": {
            "@type": "Organization",
            "name": "Behind the Magic Curtain",
            "logo": {
                "@type": "ImageObject",
                "url": "https://behindthemagiccurtain.co.uk/images/logo.webp"
            }
        },
        "description": d.summary
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${d.title} | Behind the Magic Curtain</title>
    
    <!-- BTMC Favicons -->
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512x512.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="icon" href="/favicon.ico">

    <meta name="description" content="${d.summary}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${d.title} | Behind the Magic Curtain">
    <meta property="og:description" content="${d.summary}">
    <meta property="og:image" content="images/${d.mainImage}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;500;600;700&family=Raleway:wght@500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
    <script type="application/ld+json">
    ${newsSchema}
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
        <section class="page-header">
            <div class="container" style="max-width: 820px;">
                <div style="display:flex; justify-content:center; gap:12px; align-items:center; margin-bottom:12px;">
                    <span class="tag" style="background:var(--color-accent);">${d.category || 'News'}</span>
                    <time datetime="${d.datePublished}" style="font-size:0.85rem; color:var(--color-text-light);"><i class="fa-regular fa-clock"></i> ${formattedDate}</time>
                </div>
                <h1>${d.title}</h1>
                <p style="font-size:1.15rem; color:var(--color-text-light); margin-top:12px;">By <strong>${d.author}</strong></p>
            </div>
        </section>
        <section class="page-content">
            <div class="container content-article">
                <img src="images/${d.mainImage}" alt="${d.title}" class="review-main-image" loading="lazy">
                ${d.bodyHtml}
                ${gallerySection}
                ${detailsCardSection}
                <div style="margin-top: 40px; text-align: center;">
                    <a href="news.html" class="btn btn-secondary"><i class="fa-solid fa-arrow-left"></i> Back to All News</a>
                </div>
            </div>
        </section>
    </main>
    <footer class="site-footer"><div class="container"></div></footer>
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"><\/script>
    <script src="script.js"><\/script>
</body>
</html>`;
}


function buildFullReviewPageHtml(d) {
    const ratingPercent = (parseFloat(d.rating) / 5) * 100;
    let tags = `<span class="tag tag-age">${d.age}</span>`;
    if (d.tags?.adhd) tags += `\n<span class="tag tag-adhd">Sensory Strategy</span>`;
    if (d.tags?.sensory) tags += `\n<span class="tag tag-sensory">Sensory Notes</span>`;
    if (d.tags?.mature) tags += `\n<span class="tag tag-mature">Mature themes</span>`;

    let tipsSection = '';
    if (d.tipsHtml && d.tipsHtml.trim()) {
        tipsSection = `<article>\n<h3>Sensory Strategies & Parent Insights</h3>\n${d.tipsHtml}\n</article>`;
    } else if (d.tips && d.tips.length > 0) {
        tipsSection = `<article>\n<h3>Sensory Strategies & Parent Insights</h3>\n<ul>\n${d.tips.map(t => `<li>${t}</li>`).join('\n')}\n</ul>\n</article>`;
    }

    let gallerySection = '';
    if (d.galleryImages && Array.isArray(d.galleryImages) && d.galleryImages.length > 0) {
        gallerySection = `
        <div class="review-gallery">
            <h2>Production Gallery</h2>
            <div class="swiper btmc-swiper">
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

    const accessFeatures = [];
    if (d.tags?.adhd) accessFeatures.push("RelaxedPerformance", "NeurodivergentAccessible");
    if (d.tags?.sensory) accessFeatures.push("SensoryFriendly");

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
            "name": d.title,
            "location": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressRegion": "West Midlands",
                    "addressCountry": "UK"
                }
            },
            ...(accessFeatures.length > 0 && { "accessibilityFeature": [...new Set(accessFeatures)] })
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
    
    <!-- BTMC Favicons -->
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512x512.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="icon" href="/favicon.ico">

    <meta name="description" content="${d.summary}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${d.title} Review & Sensory Guide | Behind the Magic Curtain">
    <meta property="og:description" content="${d.summary}">
    <meta property="og:image" content="images/${d.mainImage}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;500;600;700&family=Raleway:wght@500;700;800&display=swap" rel="stylesheet">
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
                <img src="images/${d.mainImage}" alt="${d.altText || d.title}" class="review-main-image" loading="lazy">
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
   
/* --- 7. Table Rendering & Drag/Drop Reordering --- */
async function loadManagementDashboard() {
    const creds = getCredentials();
    if (!creds) return;

    try {
        const reviews = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/reviews.json');
        currentCache.reviews = reviews.sort((a,b) => ((a.order !== undefined ? Number(a.order) : Number(a.rank)) || 0) - ((b.order !== undefined ? Number(b.order) : Number(b.rank)) || 0));
        renderDraggableTable('reviews', 'manage-reviews-table-container', currentCache.reviews);
    } catch (err) {}

    try {
        const whatson = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/whatson.json');
        currentCache.whatson = whatson.sort((a,b) => (Number(a.rank)||0) - (Number(b.rank)||0));
        renderDraggableTable('whatson', 'manage-whatson-table-container', currentCache.whatson);
    } catch (err) {}

    try {
        const theatres = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/theatres.json');
        currentCache.theatres = theatres.sort((a,b) => (Number(a.rank)||0) - (Number(b.rank)||0));
        renderDraggableTable('theatres', 'manage-theatres-table-container', currentCache.theatres);
    } catch (err) {}

    try {
        const news = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/news.json');
        currentCache.news = news.sort((a,b) => ((a.order !== undefined ? Number(a.order) : Number(a.rank)) || 0) - ((b.order !== undefined ? Number(b.order) : Number(b.rank)) || 0));
        renderDraggableTable('news', 'manage-news-table-container', currentCache.news);
    } catch (err) {}

    try {
        const dlp = await fetchJsonFile(creds.owner, creds.repo, creds.token, 'data/disneyland.json');
        currentCache.disneyland = dlp;
        renderDisneylandTable('manage-disneyland-table-container', currentCache.disneyland);
    } catch (err) {}

    loadNavToggles();
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
                    <th style="width: 85px;">Rank</th>
                    <th>${type === 'theatres' ? 'Theatre Name' : (type === 'whatson' ? 'Show Title' : 'Title')}</th>
                    ${(type === 'reviews' || type === 'whatson' || type === 'news') ? '<th style="width: 160px;">Slot</th>' : ''}
                    ${type === 'whatson' ? '<th>Venue</th><th style="min-width: 170px;">Filter Tags</th><th>End Date</th>' : ''}
                    ${type === 'theatres' ? '<th>Location</th>' : ''}
                    ${type === 'news' ? '<th>Category</th><th>Publication Date</th>' : ''}
                    <th style="width: 180px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    let publishedCount = 0;
    let whatsonActiveCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    items.forEach((item, index) => {
        const isDraft = item.status === 'draft';
        const isExpired = type === 'whatson' && !!(item.expiryDate && item.expiryDate < todayStr);

        let rankBadgeHtml = '';
        if (isDraft) {
            rankBadgeHtml = `<span class="rank-badge rank-badge-draft">Draft</span>`;
        } else {
            if (type === 'reviews' || type === 'news') {
                publishedCount++;
                rankBadgeHtml = `<span class="rank-badge">#${publishedCount}</span>`;
            } else {
                rankBadgeHtml = `<span class="rank-badge">#${index + 1}</span>`;
            }
        }

        if (type === 'whatson' && !isDraft && !isExpired) {
            whatsonActiveCount++;
        }

        let titleContent = `<strong>${item.title || item.name}</strong>`;
        if (isDraft) {
            titleContent += ` <span class="badge-status-draft"><i class="fa-solid fa-file-pen"></i> Draft</span>`;
        }

        let slotHtml = '';
        if (type === 'reviews' || type === 'news') {
            if (isDraft) {
                slotHtml = `<td><span class="badge-draft-slot"><i class="fa-solid fa-eye-slash"></i> Hidden (Draft)</span></td>`;
            } else {
                slotHtml = `<td>${publishedCount <= 3 ? `<span class="badge-featured">Homepage #${publishedCount}</span>` : '<span style="color:#888; font-size:0.85rem;">Directory</span>'}</td>`;
            }
        } else if (type === 'whatson') {
            if (isDraft) {
                slotHtml = `<td><span class="badge-draft-slot"><i class="fa-solid fa-eye-slash"></i> Hidden (Draft)</span></td>`;
            } else if (isExpired) {
                slotHtml = `<td><span class="badge-draft-slot" style="color:#b91c1c;"><i class="fa-solid fa-clock-rotate-left"></i> Expired (Hidden)</span></td>`;
            } else {
                slotHtml = `<td>${whatsonActiveCount <= 3 ? `<span class="badge-featured">Homepage #${whatsonActiveCount}</span>` : '<span style="color:#888; font-size:0.85rem;">Directory</span>'}</td>`;
            }
        }

        let newsMetaHtml = '';
        if (type === 'news') {
            const dateStr = item.datePublished 
                ? (item.datePublished.substring(0, 10)) 
                : '<span style="color:#64748b; font-style:italic; font-size:0.85rem;"><i class="fa-solid fa-clock"></i> Draft (Not Published)</span>';
            newsMetaHtml = `<td>${item.category || 'News'}</td><td>${dateStr}</td>`;
        }

        tableHtml += `
            <tr class="draggable-row" draggable="true" data-type="${type}" data-index="${index}">
                <td>
                    <span class="grab-handle"><i class="fa-solid fa-bars"></i></span>
                    ${rankBadgeHtml}
                </td>
                <td>${titleContent}</td>
                ${slotHtml}
                ${type === 'whatson' ? `
                    <td>${item.venue}</td>
                    <td>
                        <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                            <span class="tag" style="font-size:0.72rem; background:#f1f5f9; color:#334155; margin:0;">${item.category || 'theatre'}</span>
                            <span class="tag" style="font-size:0.72rem; background:#e0f2fe; color:#0369a1; margin:0;">${item.region || 'West Midlands'}</span>
                            <span class="tag tag-age" style="font-size:0.72rem; margin:0;">${item.age || 'All Ages'}</span>
                            ${item.isTouring ? '<span class="tag tag-touring" style="font-size:0.7rem; margin:0;"><i class="fa-solid fa-route"></i> Tour</span>' : ''}
                        </div>
                    </td>
                    <td>${item.expiryDate || '<span style="color:#aaa;">No Expiry</span>'}</td>
                ` : ''}
                ${type === 'theatres' ? `<td>${item.location}</td>` : ''}
                ${newsMetaHtml}
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

function renderDisneylandTable(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `<p style="color:#666; padding:15px 0;">No Disneyland attractions found.</p>`;
        return;
    }

    let tableHtml = `
        <table class="crud-table" id="table-disneyland">
            <thead>
                <tr>
                    <th>Attraction Name</th>
                    <th>Park</th>
                    <th>Land</th>
                    <th>Sensory (S / F / N / D)</th>
                    <th style="width: 160px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach((item) => {
        tableHtml += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.park}</td>
                <td>${item.land}</td>
                <td>${item.thrillLevel} / ${item.fearFactor} / ${item.noiseLevel} / ${item.darkness}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button type="button" class="btn-edit" onclick="enterEditDisneyland('${item.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button type="button" class="btn-delete" onclick="deleteItem('disneyland', '${item.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

function attachDragEventListeners(type) {
    const table = document.getElementById(`table-${type}`);
    if (!table) return;

    const rows = table.querySelectorAll('.draggable-row');
    rows.forEach(row => {
        row.addEventListener('dragstart', (e) => {
            draggedRowIndex = parseInt(row.getAttribute('data-index'), 10);
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            table.querySelectorAll('.draggable-row').forEach(r => r.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            row.classList.add('drag-over');
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over');
        });

        row.addEventListener('drop', async (e) => {
            e.preventDefault();
            row.classList.remove('drag-over');
            const targetIndex = parseInt(row.getAttribute('data-index'), 10);

            if (draggedRowIndex !== null && draggedRowIndex !== targetIndex) {
                const list = currentCache[type];
                const [movedItem] = list.splice(draggedRowIndex, 1);
                list.splice(targetIndex, 0, movedItem);

                if (type === 'reviews' || type === 'news') {
                    let publishedRank = 1;
                    let draftRank = 1000;
                    list.forEach((item, idx) => {
                        item.order = idx + 1;
                        if (item.status === 'published') {
                            item.rank = publishedRank++;
                        } else {
                            item.rank = draftRank++;
                        }
                    });
                } else {
                    list.forEach((item, idx) => item.rank = idx + 1);
                }
                
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
    if (type === 'reviews' || type === 'news') {
        let publishedRank = 1;
        let draftRank = 1000;
        data.forEach((item, idx) => {
            item.order = idx + 1;
            if (item.status === 'published') {
                item.rank = publishedRank++;
            } else {
                item.rank = draftRank++;
            }
        });
    } else if (type !== 'disneyland') {
        data.forEach((item, idx) => item.rank = idx + 1);
    }
    
    await commitGitHubFile(creds.owner, creds.repo, creds.token, file, btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))), `Delete from ${type}`);
    showToast('✅ Entry deleted successfully!', 'status-success');
    loadManagementDashboard();
}

/* --- 8. Nav Switchboard & GitHub Bridge --- */
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
                <div><strong>${item.title}</strong> <span style="font-size:0.8rem; color:#64748b;">(${item.url})</span></div>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="nav-toggle-${idx}" ${item.enabled ? 'checked' : ''}>
                    <span>Visible</span>
                </label>
            </div>
        `).join('');
    } catch (e) {}
}

async function saveNavToggles() {
    const creds = getCredentials();
    if (!creds) return;

    currentCache.nav.forEach((item, idx) => {
        const checkbox = document.getElementById(`nav-toggle-${idx}`);
        if (checkbox) item.enabled = checkbox.checked;
    });

    try {
        await commitGitHubFile(creds.owner, creds.repo, creds.token, 'data/navigation.json', btoa(unescape(encodeURIComponent(JSON.stringify({ items: currentCache.nav }, null, 2)))), 'Update Nav Toggles');
        showToast('✅ Navigation switchboard updated!', 'status-success');
    } catch (e) {
        showToast('❌ Failed to update navigation', 'status-error');
    }
}

function getCredentials() {
    const owner = (localStorage.getItem('btmc_gh_owner') || '').trim();
    const repo = (localStorage.getItem('btmc_gh_repo') || '').trim();
    const token = (localStorage.getItem('btmc_gh_token') || '').trim();
    if (!owner || !repo || !token) {
        toggleSettingsModal();
        showToast('⚠️ Configure GitHub token first.', 'status-error');
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
