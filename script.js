const projectsGrid = document.getElementById("projects-grid");
const languageTrigger = document.getElementById("language-trigger");
const languagePopup = document.getElementById("language-popup");

const repoEndpoint =
  "https://api.github.com/users/fut0r/repos?per_page=100&sort=updated";

const pageLanguage = document.documentElement.lang === "ar" ? "ar" : "en";

const uiText = {
  en: {
    loading: "Loading repositories...",
    empty: "No public repositories to show right now.",
    error: "Unable to load GitHub projects right now.",
    kind: "GitHub",
    unspecified: "Unspecified",
    fallbackDescription: "No description added. The work is in the code."
  },
  ar: {
    loading: "جار تحميل المستودعات...",
    empty: "لا توجد مستودعات عامة للعرض الآن.",
    error: "تعذر تحميل مشاريع GitHub الآن.",
    kind: "GitHub",
    unspecified: "غير محدد",
    fallbackDescription: "لا يوجد وصف. العمل موجود داخل الكود."
  }
};

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => {
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

function createProjectMarkup(repo) {
  const description = repo.description
    ? escapeHtml(repo.description)
    : uiText[pageLanguage].fallbackDescription;
  const language = repo.language
    ? escapeHtml(repo.language)
    : uiText[pageLanguage].unspecified;
  const name = escapeHtml(repo.name);

  return `
    <a
      class="project-row"
      href="${repo.html_url}"
      target="_blank"
      rel="noreferrer"
      aria-label="Open ${name} on GitHub"
    >
      <div class="project-name">
        <h3 class="project-title">${name}</h3>
        <span class="project-arrow" aria-hidden="true">/</span>
      </div>
      <p class="project-description">${description}</p>
      <div class="project-meta">
        <span class="project-language">${language}</span>
        <span class="project-kind">${uiText[pageLanguage].kind}</span>
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

async function loadRepositories() {
  renderStatus(uiText[pageLanguage].loading);

  try {
    const response = await fetch(repoEndpoint, {
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub responded with ${response.status}`);
    }

    const repos = await response.json();
    const selectedRepos = repos
      .filter((repo) => !repo.fork && !repo.archived)
      .slice(0, 5);

    if (!selectedRepos.length) {
      renderStatus(uiText[pageLanguage].empty);
      return;
    }

    projectsGrid.innerHTML = selectedRepos.map(createProjectMarkup).join("");
  } catch (error) {
    renderStatus(uiText[pageLanguage].error);
    console.error("Failed to fetch repositories:", error);
  }
}

function closeLanguagePopup() {
  if (!languagePopup || !languageTrigger) {
    return;
  }

  languagePopup.hidden = true;
  languageTrigger.setAttribute("aria-expanded", "false");
}

function openLanguagePopup() {
  if (!languagePopup || !languageTrigger) {
    return;
  }

  languagePopup.hidden = false;
  languageTrigger.setAttribute("aria-expanded", "true");
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
    closeLanguagePopup();
  }
});

loadRepositories();
