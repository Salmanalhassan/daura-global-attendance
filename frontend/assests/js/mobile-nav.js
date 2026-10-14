/* =========================================================
   DAURA GLOBAL — MOBILE NAVIGATION DRAWER
   File: frontend/assests/js/mobile-nav.js

   Turns the page's existing <aside> sidebar into a slide-in
   drawer on screens up to 768px wide. It does not change any
   links, IDs, classes or event listeners that already exist:
   it only adds a menu bar, a backdrop and a few helper classes
   (rn-*). The styling lives in assests/css/responsive.css.

   Does nothing when:
   - the page has no sidebar (login pages, landing page), or
   - the page already ships its own menu button
     (#mobileMenuButton on admin/dashboard.html).
   ========================================================= */

(function () {

    "use strict";

    var MOBILE_QUERY = "(max-width: 768px)";

    function init() {

        var sidebar = document.querySelector(
            "aside.dashboard-sidebar, aside.student-sidebar, aside.sidebar"
        );

        if (!sidebar) {
            return;
        }

        // admin/dashboard.html already has its own working drawer
        if (document.getElementById("mobileMenuButton")) {
            return;
        }

        var media = window.matchMedia(MOBILE_QUERY);

        /* ---------- build the menu bar + backdrop ---------- */

        if (!sidebar.id) {
            sidebar.id = "rnSidebar";
        }

        var bar = document.createElement("div");
        bar.className = "rn-bar";

        var button = document.createElement("button");
        button.type = "button";
        button.className = "rn-menu-btn";
        button.setAttribute("aria-label", "Open navigation");
        button.setAttribute("aria-controls", sidebar.id);
        button.setAttribute("aria-expanded", "false");
        button.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
            '<path d="M4 6h16M4 12h16M4 18h16"/></svg>';

        var title = document.createElement("span");
        title.className = "rn-bar-title";
        title.textContent = pageTitle();

        bar.appendChild(button);
        bar.appendChild(title);

        var overlay = document.createElement("div");
        overlay.className = "rn-overlay";
        overlay.setAttribute("aria-hidden", "true");

        document.body.appendChild(bar);
        document.body.appendChild(overlay);

        sidebar.classList.add("rn-drawer");
        document.body.classList.add("rn-has-drawer");

        /* ---------- open / close ---------- */

        function isOpen() {
            return sidebar.classList.contains("rn-open");
        }

        function open() {
            sidebar.classList.add("rn-open");
            overlay.classList.add("rn-open");
            document.body.classList.add("rn-lock");
            button.setAttribute("aria-expanded", "true");
            button.setAttribute("aria-label", "Close navigation");

            var first = sidebar.querySelector("a[href], button");
            if (first) {
                // wait for the drawer to become visible before focusing
                window.setTimeout(function () { first.focus(); }, 60);
            }
        }

        function close(returnFocus) {
            sidebar.classList.remove("rn-open");
            overlay.classList.remove("rn-open");
            document.body.classList.remove("rn-lock");
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-label", "Open navigation");

            if (returnFocus) {
                button.focus();
            }
        }

        button.addEventListener("click", function () {
            if (isOpen()) {
                close(true);
            } else {
                open();
            }
        });

        overlay.addEventListener("click", function () {
            close(true);
        });

        document.addEventListener("keydown", function (event) {

            if (event.key === "Escape" && isOpen()) {
                close(true);
                return;
            }

            // keep Tab inside the open drawer
            if (event.key === "Tab" && isOpen()) {

                var focusable = sidebar.querySelectorAll(
                    "a[href], button:not([disabled])"
                );

                if (!focusable.length) {
                    return;
                }

                var firstEl = focusable[0];
                var lastEl = focusable[focusable.length - 1];

                if (event.shiftKey && document.activeElement === firstEl) {
                    event.preventDefault();
                    lastEl.focus();
                } else if (!event.shiftKey && document.activeElement === lastEl) {
                    event.preventDefault();
                    firstEl.focus();
                }

            }

        });

        // close after choosing a page (same-page links included)
        sidebar.addEventListener("click", function (event) {
            if (event.target.closest("a[href]")) {
                close(false);
            }
        });

        // leaving mobile width: reset everything
        function onChange() {
            if (!media.matches) {
                close(false);
            }
        }

        if (media.addEventListener) {
            media.addEventListener("change", onChange);
        } else if (media.addListener) {
            media.addListener(onChange);
        }

    }

    // The bar shows the brand (taken from the sidebar) so the page's own
    // heading is not repeated right underneath it.
    function pageTitle() {

        var brand = document.querySelector(
            "aside .sidebar-brand strong, aside .student-sidebar-header strong, " +
            "aside .sidebar-header h1, aside .sidebar-header h2, aside strong, aside h2"
        );

        if (brand && brand.textContent.trim()) {
            return brand.textContent.trim();
        }

        return "Daura Global";

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
