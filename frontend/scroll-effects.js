
/* ==========================================
   INDIA TOURISM DASHBOARD
   CINEMATIC SCROLL ANIMATIONS
========================================== */

(() => {
    "use strict";

    function initializeScrollEffects() {

        const root = document.documentElement;

        const photo = document.querySelector(
            ".photo-story"
        );

        // Avoid initializing animations twice.

        if (
            !photo ||
            root.classList.contains("has-scroll-motion")
        ) {
            return;
        }


        /* 1. ACCESSIBILITY */

        const prefersReducedMotion =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

        if (
            prefersReducedMotion ||
            !("IntersectionObserver" in window)
        ) {
            return;
        }


        /* 2. SELECT DASHBOARD CARDS */

        const cards = [
            ...document.querySelectorAll(
                ".stat-card, " +
                ".chart-container article, " +
                ".destination-container article"
            )
        ];


        /* 3. STAGGERED CARD ANIMATIONS */

        cards.forEach((card, index) => {

            card.classList.add("scroll-reveal");

            const delay = (index % 4) * 80;

            card.style.setProperty(
                "--reveal-delay",
                `${delay}ms`
            );

        });


        /* 4. DETECT WHEN ELEMENTS ENTER SCREEN */

        const observer = new IntersectionObserver(

            (entries) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "is-visible"
                        );

                        if (entry.target !== photo) {

                            observer.unobserve(
                                entry.target
                            );

                        }

                    }

                });

            },

            {
                threshold: 0.12,
                rootMargin: "0px 0px -25px 0px"
            }

        );


        /* 5. ACTIVATE SCROLL ANIMATIONS */

        root.classList.add(
            "has-scroll-motion"
        );

        observer.observe(photo);

        cards.forEach((card) => {

            observer.observe(card);

        });


        /* 6. TAJ MAHAL PARALLAX EFFECT */

        const image = photo.querySelector(
            ".photo-story__image"
        );

        if (!image) {
            return;
        }

        let queued = false;


        /* 7. MOVE IMAGE AS USER SCROLLS */

        function updateParallax() {

            queued = false;

            const rect =
                photo.getBoundingClientRect();

            const viewportHeight =
                window.innerHeight;


            // Skip if the photo isn't visible.

            if (
                rect.bottom <= 0 ||
                rect.top >= viewportHeight
            ) {
                return;
            }


            // Calculate distance from screen centre.

            const centerDifference =
                rect.top +
                rect.height / 2 -
                viewportHeight / 2;


            // Limit movement to avoid empty edges.

            const offset = Math.max(

                -75,

                Math.min(
                    75,
                    -centerDifference * 0.12
                )

            );


            // Apply smooth vertical movement.

            image.style.transform =
                `translate3d(0, ${offset}px, 0)`;

        }


        /* 8. OPTIMIZE SCROLL PERFORMANCE */

        function requestParallax() {

            if (!queued) {

                queued = true;

                window.requestAnimationFrame(
                    updateParallax
                );

            }

        }


        /* 9. SCROLL AND RESIZE LISTENERS */

        window.addEventListener(

            "scroll",
            requestParallax,

            {
                passive: true
            }

        );

        window.addEventListener(

            "resize",
            requestParallax,

            {
                passive: true
            }

        );


        // Initialize image position.

        requestParallax();

    }


    /* 10. START WHEN PAGE IS READY */

    if (document.readyState === "loading") {

        document.addEventListener(

            "DOMContentLoaded",
            initializeScrollEffects,

            {
                once: true
            }

        );

    } else {

        initializeScrollEffects();

    }

})();