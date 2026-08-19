/*
 * BEHIND THE MAGIC CURTAIN - CORE JAVASCRIPT
 * Handles mobile navigation, image carousels, and client-side filtering.
 */

document.addEventListener('DOMContentLoaded', function () {

    /* -------------------------------------------------- */
    /* 1. Mobile Navigation & Accessibility Toggle        */
    /* -------------------------------------------------- */
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (navToggle && mainNav) {
        navToggle.setAttribute('aria-expanded', 'false');

        // Toggle menu open/close
        navToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = mainNav.classList.toggle('nav-open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (mainNav.classList.contains('nav-open') && !mainNav.contains(e.target)) {
                mainNav.classList.remove('nav-open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when clicking any nav link
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                mainNav.classList.remove('nav-open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* -------------------------------------------------- */
    /* 2. Swiper.js Carousel Initialization              */
    /* -------------------------------------------------- */
    const swiperElement = document.querySelector('.swiper');

    if (swiperElement && typeof Swiper !== 'undefined') {
        new Swiper('.swiper', {
            loop: true,
            speed: 500,
            grabCursor: true,
            keyboard: {
                enabled: true,
                onlyInViewport: true,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
    }

    /* -------------------------------------------------- */
    /* 3. Review Card Filtering System                    */
    /* -------------------------------------------------- */
    const filterButtons = document.querySelectorAll('.filter-btn');
    const reviewCards = document.querySelectorAll('.card-grid .card');

    if (filterButtons.length > 0 && reviewCards.length > 0) {
        filterButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                // Update active state on buttons
                filterButtons.forEach(function (btn) {
                    btn.classList.remove('active');
                });
                button.classList.add('active');

                const filterValue = button.getAttribute('data-filter') || 'all';

                // Show or hide matching cards
                reviewCards.forEach(function (card) {
                    if (filterValue === 'all') {
                        card.style.display = 'flex';
                    } else {
                        // Checks text inside badges (e.g., "Ages 4+", "ADHD")
                        const tagElements = card.querySelectorAll('.tag');
                        let matchFound = false;

                        tagElements.forEach(function (tag) {
                            if (tag.textContent.toLowerCase().includes(filterValue.toLowerCase())) {
                                matchFound = true;
                            }
                        });

                        card.style.display = matchFound ? 'flex' : 'none';
                    }
                });
            });
        });
    }

});

// Auto-update footer copyright year
document.addEventListener('DOMContentLoaded', () => {
    const copyrightElements = document.querySelectorAll('.footer-copyright');
    const currentYear = new Date().getFullYear();
    copyrightElements.forEach(el => {
        el.innerHTML = `&copy; ${currentYear} Behind the Magic Curtain. All rights reserved.`;
    });
});
