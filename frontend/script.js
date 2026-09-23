/* Set window.TOURISM_API_URL before this script loads to connect your JSON API.
Expected response:
{ source: 'Source name', updatedAt: 'YYYY-MM-DD',
  stats: { foreignTourists: { value: 123, unit: 'visits', year: 2025 },
    domesticTourists: {...}, tourismRevenue: {...}, topDestination: {...} },
  arrivals: [{ year: 2025, value: 123 }],
  comparison: [{ label: 'Domestic', value: 123 }],
  states: [{ label: 'State name', value: 123 }] }
Numbers above illustrate the format only, not official statistics. */
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stats = {
    foreignTourists: $("#foreign-tourists"),
    domesticTourists: $("#domestic-tourists"),
    tourismRevenue: $("#tourism-revenue"),
    topDestination: $("#top-destination"),
  };
  function status(text, state) {
    $("#data-status-text").textContent = text;
    $("#data-status").dataset.state = state;
  }
  function formatStat(item) {
    if (item?.value === undefined || item?.value === null)
      return "Not available";
    const value =
      typeof item.value === "number"
        ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
            item.value,
          )
        : String(item.value);
    return [value, item.unit, item.year ? `(${item.year})` : ""]
      .filter(Boolean)
      .join(" ");
  }
  function chart(id, records) {
    const container = document.getElementById(id);
    if (!container) return;
    const rows = (Array.isArray(records) ? records : [])
      .filter(
        (r) => r && r.value !== null && r.value !== "" && r.value !== undefined,
      )
      .map((r) => ({
        label: String(r.label ?? r.year ?? ""),
        value: Number(r.value),
      }))
      .filter((r) => r.label && Number.isFinite(r.value) && r.value >= 0)
      .slice(0, 20);
    container.replaceChildren();
    if (!rows.length) {
      const note = document.createElement("p");
      note.className = "empty-state";
      note.textContent = "No data is available for this view yet.";
      container.append(note);
      return;
    }
    const max = Math.max(...rows.map((r) => r.value), 1);
    const graphic = document.createElement("div");
    graphic.className = "js-chart";
    graphic.setAttribute("role", "list");
    graphic.setAttribute("aria-label", "Tourism figures");
    rows.forEach(({ label, value }) => {
      const row = document.createElement("div");
      row.className = "chart-row";
      row.setAttribute("role", "listitem");
      const name = document.createElement("span");
      name.textContent = label;
      const track = document.createElement("div");
      track.className = "chart-track";
      track.setAttribute("aria-hidden", "true");
      const bar = document.createElement("div");
      bar.className = "chart-bar";
      bar.style.width = `${(value / max) * 100}%`;
      track.append(bar);
      const amount = document.createElement("strong");
      amount.textContent = new Intl.NumberFormat("en-IN").format(value);
      row.append(name, track, amount);
      graphic.append(row);
    });
    container.append(graphic);
  }
  async function loadData() {
    if (!window.TOURISM_API_URL) return;
    status("Loading tourism data…", "loading");
    try {
      const response = await fetch(window.TOURISM_API_URL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data.stats !== "object" || !data.stats)
        throw new Error("Unexpected API response");
      Object.entries(stats).forEach(([key, el]) => {
        el.textContent = formatStat(data.stats[key]);
        el.classList.add("has-value");
      });
      chart("tourist-arrival-chart", data.arrivals);
      chart("domestic-foreign-chart", data.comparison);
      chart("state-tourism-chart", data.states);
      status(
        [
          data.source ? `Source: ${data.source}` : "Data source connected",
          data.updatedAt ? `Updated ${data.updatedAt}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        "connected",
      );
    } catch (error) {
      status(
        "Tourism data is temporarily unavailable. Please try again later.",
        "error",
      );
      Object.values(stats).forEach((el) => {
        el.textContent = "—";
      });
      document.querySelectorAll(".empty-state p").forEach((el) => {
        el.textContent =
          "We couldn’t load this view. Please try again later or visit the official data source.";
      });
      console.error("Tourism API error:", error);
    }
  }
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
  loadData();
})();
