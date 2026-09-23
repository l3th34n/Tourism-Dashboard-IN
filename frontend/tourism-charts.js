/* Charts consume one sourced snapshot. No external requests or chart library. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const data = window.TOURISM_DATA;
  const ids = [
    "#foreign-tourists",
    "#domestic-tourists",
    "#tourism-revenue",
    "#top-destination",
  ];
  const nf = (n, digits = 2) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(n);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const svgEl = (tag, attrs = {}, text) => {
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const finite = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
  const valid =
    data?.schemaVersion === 1 &&
    Array.isArray(data.availableYears) &&
    data.availableYears.length &&
    Array.isArray(data.annual) &&
    data.annual.length &&
    Array.isArray(data.states) &&
    data.states.length &&
    data.annual.every(
      (r) =>
        Number.isInteger(r.year) &&
        [
          "arrivalsMillion",
          "domesticVisits",
          "foreignVisits",
          "earningsCrore",
        ].every((k) => finite(r[k])),
    ) &&
    data.availableYears.every(
      (y) =>
        data.annual.some((r) => r.year === y) &&
        data.states.every(
          (s) =>
            typeof s.name === "string" &&
            ["domesticMillion", "foreignMillion"].every((k) =>
              finite(s.years?.[y]?.[k]),
            ),
        ),
    );
  if (!valid) {
    $("#data-status-text").textContent =
      "Tourism data could not be loaded. Check that tourism-data.js is included.";
    $("#data-status").dataset.state = "error";
    document
      .querySelectorAll(".chart-content")
      .forEach(
        (c) =>
          (c.textContent =
            "Statistics unavailable. Please see the official source."),
      );
    return;
  }
  let year = Math.max(...data.availableYears);
  const metrics = {
    arrivalsMillion: {
      title: "Foreign tourist arrivals",
      unit: "Million arrivals",
      value: (r) => r.arrivalsMillion,
      format: (v) => `${nf(v)} million arrivals`,
      note: "Foreign arrivals at India’s border; excludes non-resident Indian arrivals. Figures rounded to 0.01 million in the source.",
    },
    domesticVisits: {
      title: "Domestic tourist visits",
      unit: "Million visits",
      value: (r) => r.domesticVisits / 1e6,
      format: (v) => `${nf(v)} million visits`,
      note: "Visits recorded by states and union territories. Repeat visits are counted; this is not a count of unique people.",
    },
    earningsCrore: {
      title: "Foreign exchange earnings",
      unit: "₹ crore",
      value: (r) => r.earningsCrore,
      format: (v) => `₹${nf(v, 0)} crore`,
      note: "Tourism foreign exchange earnings in current rupees. The 2024 figure is a revised estimate.",
    },
  };
  const yearRow = () => data.annual.find((r) => r.year === year);
  const stateMarker = (s) =>
    year === 2024 && s.estimated2024
      ? " *"
      : year === 2023 && s.revised2023
        ? " †"
        : "";
  function stat(selector, value, unit, caption, title) {
    const node = $(selector);
    node.replaceChildren(el("span", "", value), el("span", "stat-unit", unit));
    node.classList.add("has-value");
    node.title = title;
    node.closest(".stat-card").querySelector(".stat-caption").textContent =
      caption;
  }
  function renderStats() {
    const r = yearRow();
    const top = [...data.states].sort(
      (a, b) => b.years[year].domesticMillion - a.years[year].domesticMillion,
    )[0];
    stat(
      ids[0],
      nf(r.arrivalsMillion),
      "million arrivals",
      `${year} · excludes NRI arrivals`,
      `${r.arrivalsMillion} million foreign arrivals (${year})`,
    );
    stat(
      ids[1],
      nf(r.domesticVisits / 1e7),
      "crore visits",
      `${year} · ${year === 2023 ? "revised total" : "state/UT visits"}`,
      `${nf(r.domesticVisits, 0)} domestic visits (${year})`,
    );
    stat(
      ids[2],
      `₹${nf(r.earningsCrore / 1e5)}`,
      "lakh crore",
      `${year} · ${year === 2024 ? "revised estimate" : "foreign exchange earnings"}`,
      `₹${nf(r.earningsCrore, 0)} crore (${year})`,
    );
    stat(
      ids[3],
      top.name,
      "by domestic visits",
      `${year} · ${nf(top.years[year].domesticMillion)} million visits`,
      "Highest domestic visits among all states and union territories",
    );
    $("#data-status-text").textContent =
      `Official published snapshot · ${year} · ${data.publication}`;
    $("#data-status").dataset.state = "connected";
    $("#data-status a").href = data.sourceUrl;
    document
      .querySelectorAll(".selected-year")
      .forEach((n) => (n.textContent = year));
  }
  function makeTable(container, headers, rows, caption) {
    const table = el("table");
    table.append(el("caption", "sr-only", caption));
    const head = el("thead"),
      hrow = el("tr");
    headers.forEach((h) => {
      const th = el("th", "", h);
      th.scope = "col";
      hrow.append(th);
    });
    head.append(hrow);
    table.append(head);
    const body = el("tbody");
    rows.forEach((row) => {
      const tr = el("tr");
      row.forEach((v, i) => {
        const cell = el(i === 0 ? "th" : "td", "", v);
        if (i === 0) cell.scope = "row";
        tr.append(cell);
      });
      body.append(tr);
    });
    table.append(body);
    container.replaceChildren(table);
  }
  function renderTrend() {
    const metric = metrics[$("#trend-metric").value];
    const rows = data.annual
      .filter((r) => r.year <= year)
      .sort((a, b) => a.year - b.year);
    $("#trend-title").textContent = metric.title;
    $("#trend-description").textContent =
      `${rows[0].year}–${year} · ${metric.unit}. ${metric.note}`;
    const container = $("#tourist-arrival-chart");
    const w = Math.max(280, Math.floor(container.clientWidth) - 20),
      h = 270,
      left = w < 450 ? 48 : 68,
      right = 24,
      top = 25,
      bottom = 35;
    const max = Math.max(...rows.map(metric.value), 1);
    const roughStep = max / 4;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const step =
      [1, 2, 2.5, 3, 5, 10].find((n) => n >= roughStep / magnitude) * magnitude;
    const ceiling = Math.ceil(max / step) * step;
    const x = (i) =>
      left + (i * (w - left - right)) / Math.max(rows.length - 1, 1);
    const y = (v) => h - bottom - (v / ceiling) * (h - top - bottom);
    const svg = svgEl("svg", {
      viewBox: `0 0 ${w} ${h}`,
      class: "trend-svg",
      role: "group",
      "aria-label": `${metric.title}, ${rows[0].year} to ${year}. Focus a point to hear its value.`,
    });
    svg.append(
      svgEl(
        "title",
        {},
        `${metric.title}: ${rows.map((r) => `${r.year}: ${metric.format(metric.value(r))}`).join("; ")}`,
      ),
    );
    for (let i = 0; i <= Math.round(ceiling / step); i++) {
      const v = step * i;
      svg.append(
        svgEl("line", {
          x1: left,
          x2: w - right,
          y1: y(v),
          y2: y(v),
          class: "trend-grid",
        }),
      );
      const label = v >= 1000 ? `${nf(v / 1000, 1)}k` : nf(v, 2);
      svg.append(
        svgEl(
          "text",
          {
            x: left - 10,
            y: y(v) + 4,
            "text-anchor": "end",
            class: "axis-label",
          },
          label,
        ),
      );
    }
    const points = rows.map((r, i) => `${x(i)},${y(metric.value(r))}`);
    const d = `M${points.join(" L")}`;
    svg.append(
      svgEl("path", {
        d: `${d} L${x(rows.length - 1)},${h - bottom} L${x(0)},${h - bottom} Z`,
        class: "trend-area",
      }),
    );
    svg.append(svgEl("path", { d, class: "trend-line" }));
    const readout = $("#trend-readout");
    const defaultText = `${year}: ${metric.format(metric.value(rows[rows.length - 1]))}`;
    readout.textContent = defaultText;
    rows.forEach((r, i) => {
      svg.append(
        svgEl(
          "text",
          { x: x(i), y: h - 9, "text-anchor": "middle", class: "axis-label" },
          r.year,
        ),
      );
      const label = `${r.year}: ${metric.format(metric.value(r))}`;
      const point = svgEl("circle", {
        cx: x(i),
        cy: y(metric.value(r)),
        r: 6,
        class: `trend-point${r.year === year ? " current" : ""}`,
        tabindex: 0,
        "aria-label": label,
      });
      point.append(svgEl("title", {}, label));
      ["mouseenter", "focus", "click"].forEach((event) =>
        point.addEventListener(event, () => (readout.textContent = label)),
      );
      point.addEventListener("mouseleave", () => {
        if (document.activeElement !== point) readout.textContent = defaultText;
      });
      point.addEventListener("blur", () => (readout.textContent = defaultText));
      svg.append(point);
    });
    container.replaceChildren(svg);
    makeTable(
      $("#trend-table"),
      ["Year", metric.unit],
      rows.map((r) => [
        r.year,
        nf(metric.value(r), metric === metrics.earningsCrore ? 0 : 3),
      ]),
      metric.title,
    );
  }
  function renderComposition() {
    const r = yearRow(),
      total = r.domesticVisits + r.foreignVisits,
      domestic = (r.domesticVisits / total) * 100;
    const wrap = el("div", "composition");
    const ring = el("div", "donut");
    ring.style.setProperty("--domestic-share", `${domestic}%`);
    ring.setAttribute("role", "img");
    ring.setAttribute(
      "aria-label",
      `${year}: domestic ${nf(domestic)}%, foreign ${nf(100 - domestic)}% of recorded state/UT visits`,
    );
    const center = el("div", "donut-center");
    center.append(
      el("strong", "", `${nf(domestic)}%`),
      el("span", "", "domestic visits"),
    );
    ring.append(center);
    wrap.append(ring);
    const legend = el("div", "composition-legend");
    [
      ["Domestic visits", r.domesticVisits, domestic, "domestic"],
      ["Foreign visits", r.foreignVisits, 100 - domestic, "foreign"],
    ].forEach(([label, value, share, cls]) => {
      const row = el("div", "legend-item");
      row.append(
        el("span", `legend-dot ${cls}`),
        el("span", "", label),
        el("strong", "", `${nf(share)}%`),
      );
      const count = el(
        "small",
        "",
        `${nf(value / 1e6, 3)} million · ${nf(value, 0)} visits`,
      );
      row.append(count);
      legend.append(row);
    });
    wrap.append(legend);
    $("#domestic-foreign-chart").replaceChildren(wrap);
  }
  function renderStates() {
    const key = $("#state-metric").value,
      query = $("#state-search").value.trim().toLocaleLowerCase();
    const matches = data.states
      .filter((s) => s.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => b.years[year][key] - a.years[year][key]);
    const rows = matches.slice(0, 10);
    const container = $("#state-tourism-chart");
    container.replaceChildren();
    $("#state-result").textContent =
      `${year} · ${key === "domesticMillion" ? "Domestic" : "Foreign"} visits · ${query ? `${matches.length} matching state/UT${matches.length === 1 ? "" : "s"}` : `Top 10 of ${data.states.length}`} · million visits`;
    if (!rows.length) {
      container.append(
        el(
          "p",
          "empty-state",
          "No matching state or union territory. Try another name.",
        ),
      );
      return;
    }
    const chart = el("ol", "state-bars");
    const max = rows[0].years[year][key] || 1;
    rows.forEach((s, i) => {
      const value = s.years[year][key];
      const row = el("li", "state-bar-row");
      const title = el("div", "state-bar-label");
      title.append(
        el(
          "span",
          "",
          `${String(i + 1).padStart(2, "0")}  ${s.name}${stateMarker(s)}`,
        ),
        el("strong", "", nf(value, 4)),
      );
      const track = el("div", "state-bar-track");
      track.setAttribute("aria-hidden", "true");
      const bar = el("div", "state-bar-fill");
      bar.style.width = `${(value / max) * 100}%`;
      track.append(bar);
      row.append(title, track);
      chart.append(row);
    });
    container.append(chart);
  }
  function renderStateTable() {
    makeTable(
      $("#all-states-table"),
      ["State / UT", "Domestic (million)", "Foreign (million)"],
      [...data.states]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => [
          s.name + stateMarker(s),
          nf(s.years[year].domesticMillion, 4),
          nf(s.years[year].foreignMillion, 4),
        ]),
      `All state/UT visits in ${year}`,
    );
  }
  function render() {
    renderStats();
    renderTrend();
    renderComposition();
    renderStates();
    renderStateTable();
  }
  const select = $("#report-year");
  select.replaceChildren();
  [...data.availableYears]
    .sort((a, b) => b - a)
    .forEach((y) => {
      const opt = el("option", "", y);
      opt.value = y;
      select.append(opt);
    });
  select.value = year;
  select.disabled = false;
  select.addEventListener("change", () => {
    year = Number(select.value);
    render();
  });
  $("#trend-metric").addEventListener("change", renderTrend);
  $("#state-metric").addEventListener("change", renderStates);
  $("#state-search").addEventListener("input", renderStates);
  data.notes.forEach((note) => $("#data-notes").append(el("li", "", note)));
  const download = $("#download-data");
  download.disabled = false;
  download.addEventListener("click", () => {
    const rows = [
      [
        "State / UT",
        "Year",
        "Domestic visits (million)",
        "Foreign visits (million)",
        "Status",
        "Source",
        "Source URL",
      ],
      ...data.states.map((s) => [
        s.name,
        year,
        s.years[year].domesticMillion,
        s.years[year].foreignMillion,
        year === 2024 && s.estimated2024
          ? "Estimate"
          : year === 2023 && s.revised2023
            ? "Revised"
            : "Published (rounded)",
        `${data.publication}, table 4.1.2`,
        data.sourceUrl,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = el("a");
    a.href = url;
    a.download = `india-tourism-states-${year}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
  let width = 0,
    frame = 0;
  if ("ResizeObserver" in window)
    new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      if (next === width) return;
      width = next;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(renderTrend);
    }).observe($("#tourist-arrival-chart"));
  else window.addEventListener("resize", renderTrend, { passive: true });
})();
