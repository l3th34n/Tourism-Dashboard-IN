/* Navigation and contact interactions. Data rendering lives in tourism-charts.js. */
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = $(".menu-toggle");
  const nav = $("#main-nav");
  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeMenu();
      toggle.focus();
    }
  });
  nav
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  const navObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              nav.querySelectorAll("a").forEach((link) => {
                if (link.hash === `#${entry.target.id}`)
                  link.setAttribute("aria-current", "location");
                else link.removeAttribute("aria-current");
              });
            });
          },
          { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
        )
      : null;
  nav.querySelectorAll("a").forEach((link) => {
    const section = $(link.hash);
    if (section) navObserver?.observe(section);
  });
  document.querySelectorAll("[data-chart]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-chart]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      document
        .querySelectorAll(".chart-card")
        .forEach((card) => card.classList.remove("is-selected"));
      const card = document
        .getElementById(button.dataset.chart)
        .closest(".chart-card");
      card.classList.add("is-selected");
      card.scrollIntoView({
        behavior: motion.matches ? "instant" : "smooth",
        block: "start",
      });
    }),
  );
  $("#contact form").addEventListener("submit", (event) => {
    event.preventDefault();
    $("#contact-status").textContent =
      "Message delivery is not connected yet. Your message has not been sent.";
  });
})();
