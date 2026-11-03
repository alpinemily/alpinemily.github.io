async function loadSite() {
  const res = await fetch("/data/site.json");
  const site = await res.json();
  document.querySelectorAll("[data-site-name]").forEach((el) => {
    el.textContent = site.name;
  });
  document.title = document.title.replace("Your Name", site.name);
  return site;
}

loadSite();

// --- Site search: a small search box in the header that searches projects,
// shop items and the About text, showing matches in a dropdown as you type. ---

(function setUpSearch() {
  const header = document.querySelector("header");
  if (!header) return;

  const form = document.createElement("form");
  form.className = "site-search";
  form.setAttribute("role", "search");
  form.innerHTML = `
    <label class="sr-only" for="site-search-input">Search this site</label>
    <svg class="site-search-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" stroke-width="1.6" />
      <line x1="10.3" y1="10.3" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
    <input type="search" id="site-search-input" placeholder="Search" autocomplete="off"
      aria-controls="site-search-results" aria-expanded="false" />
    <ul class="site-search-results" id="site-search-results" role="listbox" hidden></ul>
  `;
  header.appendChild(form);

  const input = form.querySelector("input");
  const results = form.querySelector("ul");
  let index = null;
  let indexPromise = null;
  let matches = [];
  let active = -1;

  const plain = (text) =>
    String(text || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const escapeHtml = (text) =>
    String(text || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function buildIndex() {
    indexPromise =
      indexPromise ||
      Promise.all(
        ["/data/projects.json", "/data/products.json", "/data/site.json"].map((url) =>
          fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ),
      ).then(([projects, products, site]) => {
        const items = [];
        for (const p of projects || []) {
          if (p.hidden) continue;
          const gallery = (p.images || []).filter((img) => !img.hidden);
          items.push({
            title: p.title,
            kind: (p.page || "photoblog") === "misc" ? "Misc" : "Photoblog",
            url: p.link || `/projects/${encodeURIComponent(p.slug || p.id)}/`,
            image: p.image,
            text: [p.title, (p.tags || []).join(" "), String(p.year || ""), p.description, p.gridTitle, p.gridText]
              .concat(gallery.map((img) => `${img.caption || ""} ${img.alt || ""}`))
              .map(plain)
              .join(" ")
              .toLowerCase(),
          });
        }
        for (const p of products || []) {
          if (p.hidden) continue;
          items.push({
            title: p.title,
            kind: "Shop",
            url: `/shop/${encodeURIComponent(p.slug || p.id)}/`,
            image: p.image,
            text: [p.title, p.description, ...(p.sizes || []).map((s) => s.label)].map(plain).join(" ").toLowerCase(),
          });
        }
        if (site) {
          items.push({
            title: "About",
            kind: "Page",
            url: "/about",
            image: (site.aboutPhotos && site.aboutPhotos[0]) || site.photo,
            text: `about bio ${plain(site.name)} ${plain(site.about)}`.toLowerCase(),
          });
        }
        index = items;
        return items;
      });
    return indexPromise;
  }

  function search(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length || !index) return [];
    return index
      .filter((item) => words.every((w) => item.text.includes(w)))
      .map((item) => {
        const title = item.title.toLowerCase();
        const score = words.reduce((s, w) => s + (title.startsWith(w) ? 4 : title.includes(w) ? 2 : 0), 0);
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((m) => m.item);
  }

  function render() {
    const query = input.value.trim();
    if (!query) {
      close();
      return;
    }
    matches = search(query);
    active = -1;
    results.innerHTML = matches.length
      ? matches
          .map(
            (m, i) => `
        <li role="option" id="site-search-option-${i}">
          <a href="${m.url}">
            ${m.image ? `<img src="/${m.image}" alt="" loading="lazy" />` : ""}
            <span class="site-search-title">${escapeHtml(m.title)}</span>
            <span class="site-search-kind">${m.kind}</span>
          </a>
        </li>`,
          )
          .join("")
      : `<li class="site-search-empty">No results</li>`;
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function close() {
    results.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function highlight(i) {
    const options = results.querySelectorAll("li[role=option]");
    if (!options.length) return;
    active = (i + options.length) % options.length;
    options.forEach((el, n) => el.classList.toggle("active", n === active));
    input.setAttribute("aria-activedescendant", options[active].id);
  }

  input.addEventListener("focus", buildIndex, { once: true });
  input.addEventListener("input", () => {
    if (index) render();
    else buildIndex().then(render);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight(active - 1);
    } else if (e.key === "Escape") {
      close();
      input.blur();
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const target = matches[active >= 0 ? active : 0];
    if (target) window.location.href = target.url;
  });
  document.addEventListener("click", (e) => {
    if (!form.contains(e.target)) close();
  });
})();
