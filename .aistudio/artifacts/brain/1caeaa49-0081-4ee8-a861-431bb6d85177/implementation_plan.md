# Implementation Plan: News Page 9-Tile Pagination & What's On Inclusive Age Filter Logic

Refactor the News directory to prevent page clutter using a 9-tile progressive disclosure grid with a "View More" button and compact filter bar, and overhaul the What's On age rating filter logic to use an inclusive child-suitability model that never omits valid shows.

---

## 1. Background & Discovered Issues

1. **News Page Cluttering**:
   - Currently, `news.html` dumps all published news articles onto the page at once without pagination or filtering.
   - Per your preference, we will implement the **9-tile grid layout** (3 rows of 3 on desktop) with a **"View More Stories"** button that reveals 9 more articles per click, combined with a **compact top filter bar** (Category pills, search query, and story count counter) for effortless navigation.

2. **What's On Age Filter Omissions**:
   - Analysis of `data/whatson.json` revealed 9 distinct age ratings across the 21 listings: `All Ages` (4 shows), `Ages 0+` (3 shows), `Ages 2+` (1 show), `Ages 3+` (2 shows), `Ages 4+` (6 shows), `Ages 5+` (2 shows), `Ages 6+` (1 show), `Ages 7+` (1 show), `Ages 10+` (1 show).
   - In `script.js`, the previous filter logic used narrow string matching:
     - `Under 5s` only checked `0+` and `all ages`, completely omitting `Ages 2+` (*Spot's Birthday Party*) and `Ages 3+` (*The Gingerbread Boy*, *One Tiny Penguin*).
     - `Ages 4–6` only checked `3+`, `4+`, and `6+`, completely omitting `Ages 5+` (*Swan Lake*, *The Nutcracker*).
     - `Ages 7+` matched only `7+` and `10+` (2 shows total), hiding general family shows rated `All Ages` or `0+` that older children can enjoy.
   - Following your confirmed preference, we will adopt an **Inclusive Child-Suitability Model**:
     - `All Ages`: Shows every listing without age filtering.
     - `Under 5s (0+)`: Shows with minimum age requirement $\le 4$ OR `All Ages` (includes `All Ages`, `0+`, `2+`, `3+`, `4+`).
     - `Ages 4–6`: Shows suitable for early primary children ($\le 6$ minimum age, or `All Ages` / `0+`).
     - `Ages 7+`: Shows suitable for older children ($\ge 7$, e.g., `7+`, `10+`) **plus** general family productions marked `All Ages` or `0+` (pantos, *Disney On Ice*, *The Snowman*).

---

## 2. Proposed Changes

### News Directory (`news.html` & `script.js`)
- **`news.html`**:
  - Add a compact filter bar above `#news-feed-list` with:
    - Search input (`#news-search-input`) to quickly find articles by headline/topic.
    - Category pills (`#news-category-pills`) generated dynamically from active news categories (e.g., *All Stories*, *Theatre News*, *Spotlight*, *Accessibility*, *Disneyland Paris*).
    - Status counter (`#news-results-count`) showing *"Showing 9 of X articles"*.
  - Add a "View More" pagination footer below `#news-feed-list`:
    - Button (`#news-view-more-btn`) with styled icon and loading state.
    - End-of-archive indicator when all articles are revealed.
- **`script.js` (`loadNewsDirectory`)**:
  - Store news items and state (`allNews`, `currentPage = 1`, `pageSize = 9`, `activeCategory = 'all'`, `searchQuery = ''`).
  - Implement progressive rendering: render the first 9 matching cards; clicking "View More" increments visible count by 9 and animates new cards in without re-rendering existing cards.
  - Automatically reset pagination to page 1 whenever category or search filter changes.

### What's On Age Filter Logic (`whats-on.html`, `script.js`, `admin.html`)
- **`whats-on.html`**:
  - Keep intuitive pill labels:
    - `All Ages` (`data-age="all"`)
    - `Under 5s (0–4)` (`data-age="under5"`)
    - `Ages 4–6` (`data-age="4to6"`)
    - `Ages 7+` (`data-age="7plus"`)
  - Update counter text and tooltips to clarify inclusive matching.
- **`script.js` (`loadWhatsOnDirectory`)**:
  - Refactor age parser helper function `parseMinimumAge(ageString)`:
    - Extracts numeric value if present (`/\d+/`).
    - Treats `All Ages` as 0.
  - Implement inclusive matching rules:
    - If `under5`: returns `true` if `ageStr.includes('all')` or `minAge <= 4`. (Matches `All Ages`, `0+`, `2+`, `3+`, `4+`).
    - If `4to6`: returns `true` if `ageStr.includes('all')` or `minAge <= 6`. (Matches `All Ages`, `0+`, `2+`, `3+`, `4+`, `5+`, `6+`).
    - If `7plus`: returns `true` if `minAge >= 7` OR `minAge === 0` OR `ageStr.includes('all')` OR `ageStr.includes('0+')`. (Includes `7+`, `10+`, plus family pantomimes, *Disney On Ice*, *The Snowman*).
- **`admin.html` & `admin.js`**:
  - Verify What's On age tags editor presets: include quick-select chips for `All Ages`, `Ages 0+`, `Ages 2+`, `Ages 3+`, `Ages 4+`, `Ages 5+`, `Ages 6+`, `Ages 7+`, `Ages 10+` so admins never type erratic tags that fall through the filter.

---

## 3. Verification & Testing

1. **News Page Verification**:
   - Initial load: exactly 9 cards displayed, with counter showing *"Showing 9 of 18 stories"* (or current total).
   - Click "View More": next 9 cards render smoothly, button hides if all stories are displayed.
   - Filter by category (e.g. *Accessibility Updates*): cards re-filter instantly and pagination resets.
   - Search input: typing keywords filters headlines and summaries in real-time.

2. **What's On Age Filter Verification**:
   - Filter by **Under 5s (0–4)**:
     - Verify *Spot's Birthday Party* (`Ages 2+`), *The Gingerbread Boy* (`Ages 3+`), and *One Tiny Penguin* (`Ages 3+`) appear.
     - Verify `All Ages` (*Disney On Ice*, *Freezin*) and `0+` (*Beauty and the Beast*) appear.
     - Verify `Ages 7+` (*Peter Pan*) and `Ages 10+` (*SYLVIA*) are excluded.
   - Filter by **Ages 4–6**:
     - Verify *Swan Lake* (`Ages 5+`), *The Nutcracker* (`Ages 5+`), and *Mrs. Doubtfire* (`Ages 6+`) appear.
     - Verify *Paddington* (`Ages 4+`) and pantos appear.
   - Filter by **Ages 7+**:
     - Verify *Peter Pan* (`Ages 7+`) and *SYLVIA* (`Ages 10+`) appear.
     - Verify general family `All Ages` and `0+` shows remain accessible.
     - Verify *Spot's Birthday Party* (`Ages 2+` toddler show) is excluded.

3. **Compilation**:
   - Run `compile_applet` to ensure zero syntax or build errors.
