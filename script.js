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
