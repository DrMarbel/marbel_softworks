/*
    Developer: Martin Barry
    Date Started: 01.29.2026
    Date Modified: 01.29.2026

    nav.js
    - Simple, dependency-free hamburger toggle for the main navigation.
*/

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const btn = document.querySelector('.hamburger');
    const navlinks = document.getElementById('main-navlinks');

    if (!btn || !navbar || !navlinks) return;

    function setExpanded(expanded) {
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (expanded) navbar.classList.add('open'); else navbar.classList.remove('open');
    }

    btn.addEventListener('click', (e) => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        setExpanded(!expanded);
    });

    // Close menu when a link is clicked (mobile)
    navlinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') setExpanded(false);
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setExpanded(false);
    });

    // Close if clicking outside the nav on mobile
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) setExpanded(false);
    });
});
