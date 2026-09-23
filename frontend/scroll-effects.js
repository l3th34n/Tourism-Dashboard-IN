/* Scroll effects have one owner. Content is visible by default, including when
   scripts are unavailable or reduced motion is requested. */
(() => {
  "use strict";
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const section = document.querySelector(".photo-story");
  const image = section?.querySelector(".photo-story__image");
  let teardown = () => {};

  function initialize() {
    teardown();
    if (media.matches || !("IntersectionObserver" in window)) return;
    const targets = [
      ...document.querySelectorAll(
        ".photo-story__reveal, .stat-card, .chart-card, .experience-card, .about-section > div",
      ),
    ];
    let observer;
    let frame = 0;
    let inView = true;
    let photoObserver;
    const reveal = (el) => {
      el.classList.add("is-visible");
      el.classList.remove("reveal-pending");
      observer?.unobserve(el);
    };
    const cleanup = () => {
      observer?.disconnect();
      photoObserver?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      targets.forEach((el) => {
        el.classList.remove("reveal-pending", "reveal-ready", "is-visible");
        el.style.removeProperty("--reveal-delay");
      });
      if (image) image.style.removeProperty("transform");
    };
    function paint() {
      frame = 0;
      if (!image || !section || !inView) return;
      const rect = section.getBoundingClientRect();
      // Overscan in CSS reserves 14% on each side; never translate past it.
      const limit = Math.max(0, section.clientHeight * 0.12);
      const offset = Math.max(-limit, Math.min(limit, -rect.top * 0.19));
      image.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -16px 0px" },
      );
      targets.forEach((el, index) => {
        // Elements already above the viewport stay visible after restoring scroll.
        if (el.getBoundingClientRect().bottom <= 0) return;
        el.style.setProperty("--reveal-delay", `${(index % 4) * 85}ms`);
        el.classList.add("reveal-pending");
        // Commit the initial state before enabling its transition.
        void el.offsetHeight;
        el.classList.add("reveal-ready");
        observer.observe(el);
      });
      if (section && image) {
        photoObserver = new IntersectionObserver((entries) => {
          inView = entries[0].isIntersecting;
          if (inView) queue();
        });
        photoObserver.observe(section);
        window.addEventListener("scroll", queue, { passive: true });
        window.addEventListener("resize", queue, { passive: true });
        queue();
      }
      teardown = cleanup;
    } catch (error) {
      cleanup(); // Enhancement failures must never hide the page.
      console.warn("Scroll enhancement unavailable:", error);
    }
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
  media.addEventListener("change", initialize);
})();
