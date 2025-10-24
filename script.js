/*
 * SIMPLE MOBILE MENU SCRIPT
 *
 * This small script finds the mobile menu button (the "hamburger")
 * and adds a class to the navigation when it's clicked.
 * The CSS file (style.css) handles all the showing/hiding.
 *
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Find the button
    const navToggle = document.querySelector('.nav-toggle');
    
    // Find the navigation menu
    const mainNav = document.querySelector('.main-nav');

    if (navToggle && mainNav) {
        // Add a "click" listener to the button
        navToggle.addEventListener('click', function() {
            // When clicked, add/remove the "nav-open" class
            mainNav.classList.toggle('nav-open');
        });
    }

});


/*
 * SWIPER.JS CAROUSEL ACTIVATION
 *
 * This code finds the carousel we added and turns it on.
 *
 */

// Check if a swiper element exists on the page
if (document.querySelector('.swiper')) {

    const swiper = new Swiper('.swiper', {
        // This makes the carousel slide in a continuous loop
        loop: true,

        // This adds the little clickable dots at the bottom
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },

        // This enables the left and right arrows
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
}
