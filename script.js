const projectsGrid = document.getElementById("projects-grid");
const languageTrigger = document.getElementById("language-trigger");
const languagePopup = document.getElementById("language-popup");
const themeToggle = document.getElementById("theme-toggle");
const topbar = document.querySelector(".topbar");

const githubUser = "fut0r";
const repoEndpoint = `https://api.github.com/users/${githubUser}/repos?per_page=100&sort=updated`;
const repoCacheKey = "fut0r:repos";
const repoCacheTtl = 30 * 60 * 1000;
const projectCount = 5;

const pageLanguage = document.documentElement.lang === "ar" ? "ar" : "en";

const uiText = {
  en: {
    empty: "No public repositories to show right now.",
    error: "Unable to load GitHub projects right now.",
    unspecified: "Unspecified",
    fallbackDescription: "No description added. The work is in the code.",
    openRepo: (name) => `Open ${name} on GitHub`,
    stars: (count) => `${count} ${count === 1 ? "star" : "stars"}`,
    updated: "Updated",
    toDark: "Switch to dark theme",
    toLight: "Switch to light theme"
  },
  ar: {
    empty: "لا توجد مستودعات عامة للعرض الآن.",
    error: "تعذر تحميل مشاريع GitHub الآن.",
    unspecified: "غير محدد",
    fallbackDescription: "لا يوجد وصف. العمل موجود داخل الكود.",
    openRepo: (name) => `افتح ${name} على GitHub`,
    stars: (count) => `${count} نجمة`,
    updated: "آخر تحديث",
    toDark: "التبديل إلى الوضع الداكن",
    toLight: "التبديل إلى الوضع الفاتح"
  }
};

const text = uiText[pageLanguage];

const languageColors = {
  Python: "#3572a5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  Kotlin: "#a97bff",
  PHP: "#4f5d95",
  Ruby: "#701516",
  Lua: "#000080",
  Dart: "#00b4ab",
  Vue: "#41b883",
  Svelte: "#ff3e00"
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    };

    return entities[char];
  });
}

function formatRelativeDate(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime()) || typeof Intl.RelativeTimeFormat !== "function") {
    return "";
  }

  const formatter = new Intl.RelativeTimeFormat(pageLanguage, { numeric: "auto" });
  const seconds = (date.getTime() - Date.now()) / 1000;
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return formatter.format(0, "minute");
}

function createProjectMarkup(repo) {
  const description = repo.description
    ? escapeHtml(repo.description)
    : text.fallbackDescription;
  const language = repo.language ? escapeHtml(repo.language) : text.unspecified;
  const languageColor = languageColors[repo.language] || "#8d8e86";
  const name = escapeHtml(repo.name);
  const stars = Number(repo.stargazers_count) || 0;
  const updated = formatRelativeDate(repo.pushed_at || repo.updated_at);

  const starsMarkup = stars
    ? `<span class="project-stars" title="${text.stars(stars)}">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .67.42l1.88 3.8 4.2.61a.75.75 0 0 1 .41 1.28l-3.04 2.96.72 4.18a.75.75 0 0 1-1.09.79L8 12.32l-3.75 1.97a.75.75 0 0 1-1.09-.79l.72-4.18L.84 6.36a.75.75 0 0 1 .41-1.28l4.2-.61L7.33.67A.75.75 0 0 1 8 .25Z"/></svg>
        <span class="sr-only">${text.stars(stars)}</span><span aria-hidden="true">${stars}</span>
      </span>`
    : "";

  const updatedMarkup = updated
    ? `<span class="project-updated" title="${text.updated}">${escapeHtml(updated)}</span>`
    : "";

  return `
    <a
      class="project-row"
      href="${escapeHtml(repo.html_url)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${text.openRepo(name)}"
    >
      <div class="project-name">
        <h3 class="project-title">${name}</h3>
        <span class="project-arrow" aria-hidden="true">↗</span>
      </div>
      <p class="project-description" dir="auto">${description}</p>
      <div class="project-meta">
        <span class="project-language" style="--lang-color: ${languageColor}">${language}</span>
        ${starsMarkup}
        ${updatedMarkup}
      </div>
    </a>
  `;
}

function renderStatus(message) {
  projectsGrid.innerHTML = `
    <article class="project-row project-row--status">
      <p>${message}</p>
    </article>
  `;
}

function renderSkeleton() {
  const row = `
    <div class="project-row project-row--skeleton" aria-hidden="true">
      <span class="skeleton-bar" style="width: 70%"></span>
      <div>
        <span class="skeleton-bar" style="width: 92%"></span>
        <span class="skeleton-bar" style="width: 64%"></span>
      </div>
      <span class="skeleton-bar" style="width: 72px"></span>
    </div>
  `;

  projectsGrid.setAttribute("aria-busy", "true");
  projectsGrid.innerHTML = row.repeat(3);
}

function readRepoCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(repoCacheKey));

    if (cached && Date.now() - cached.savedAt < repoCacheTtl && Array.isArray(cached.repos)) {
      return cached.repos;
    }
  } catch (error) {
    // Storage can be unavailable (private mode, blocked cookies); fall through to the network.
  }

  return null;
}

function writeRepoCache(repos) {
  try {
    sessionStorage.setItem(repoCacheKey, JSON.stringify({ savedAt: Date.now(), repos }));
  } catch (error) {
    // Caching is a nice-to-have; ignore quota or privacy errors.
  }
}

async function fetchRepositories() {
  const response = await fetch(repoEndpoint, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub responded with ${response.status}`);
  }

  const repos = await response.json();

  return repos
    .filter((repo) => !repo.fork && !repo.archived && repo.name !== githubUser)
    .slice(0, projectCount)
    .map(({ name, description, html_url, language, stargazers_count, pushed_at, updated_at }) => ({
      name,
      description,
      html_url,
      language,
      stargazers_count,
      pushed_at,
      updated_at
    }));
}

async function loadRepositories() {
  if (!projectsGrid) {
    return;
  }

  let repos = readRepoCache();

  try {
    if (!repos) {
      renderSkeleton();
      repos = await fetchRepositories();
      writeRepoCache(repos);
    }

    if (!repos.length) {
      renderStatus(text.empty);
      return;
    }

    projectsGrid.innerHTML = repos.map(createProjectMarkup).join("");
  } catch (error) {
    renderStatus(text.error);
    console.error("Failed to fetch repositories:", error);
  } finally {
    projectsGrid.removeAttribute("aria-busy");
  }
}

/* Language popup */

function closeLanguagePopup({ restoreFocus = false } = {}) {
  if (!languagePopup || !languageTrigger || languagePopup.hidden) {
    return;
  }

  languagePopup.hidden = true;
  languageTrigger.setAttribute("aria-expanded", "false");

  if (restoreFocus) {
    languageTrigger.focus();
  }
}

function openLanguagePopup() {
  if (!languagePopup || !languageTrigger) {
    return;
  }

  languagePopup.hidden = false;
  languageTrigger.setAttribute("aria-expanded", "true");
  languagePopup.querySelector(".language-option.is-active, .language-option")?.focus();
}

languageTrigger?.addEventListener("click", () => {
  if (languagePopup.hidden) {
    openLanguagePopup();
  } else {
    closeLanguagePopup();
  }
});

document.addEventListener("click", (event) => {
  if (
    languagePopup &&
    languageTrigger &&
    !languagePopup.hidden &&
    !languagePopup.contains(event.target) &&
    !languageTrigger.contains(event.target)
  ) {
    closeLanguagePopup();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLanguagePopup({ restoreFocus: true });
  }
});

languagePopup?.addEventListener("focusout", (event) => {
  if (!languagePopup.contains(event.relatedTarget) && event.relatedTarget !== languageTrigger) {
    closeLanguagePopup();
  }
});

/* Theme */

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function currentTheme() {
  return document.documentElement.dataset.theme || (darkQuery.matches ? "dark" : "light");
}

function syncThemeControls() {
  const theme = currentTheme();
  const label = theme === "dark" ? text.toLight : text.toDark;

  themeToggle?.setAttribute("aria-label", label);
  themeToggle?.setAttribute("title", label);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", theme === "dark" ? "#12110f" : "#eeede8"));
}

themeToggle?.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";

  document.documentElement.dataset.theme = next;

  try {
    localStorage.setItem("theme", next);
  } catch (error) {
    // The choice still applies for this visit.
  }

  syncThemeControls();
});

darkQuery.addEventListener?.("change", syncThemeControls);
syncThemeControls();

/* Sticky header + active section */

const navLinks = [...document.querySelectorAll('.topnav a[href^="#"]')];
const navTargets = navLinks
  .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
  .filter(Boolean);

function updateHeader() {
  topbar?.classList.toggle("is-stuck", window.scrollY > 24);

  const marker = window.innerHeight * 0.35;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  let activeId = navTargets[0]?.id;

  for (const target of navTargets) {
    if (target.getBoundingClientRect().top <= marker) {
      activeId = target.id;
    }
  }

  if (atBottom && navTargets.length) {
    activeId = navTargets[navTargets.length - 1].id;
  }

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === `#${activeId}`) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

let headerFrame = 0;

window.addEventListener(
  "scroll",
  () => {
    if (!headerFrame) {
      headerFrame = requestAnimationFrame(() => {
        headerFrame = 0;
        updateHeader();
      });
    }
  },
  { passive: true }
);

window.addEventListener("resize", updateHeader);
updateHeader();

/* Reveal sections as they scroll into view */

const revealTargets = document.querySelectorAll("main .section:not(.hero), .footer");

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  revealTargets.forEach((target) => {
    if (target.getBoundingClientRect().top > window.innerHeight) {
      target.classList.add("reveal");
      revealObserver.observe(target);
    }
  });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

loadRepositories();
