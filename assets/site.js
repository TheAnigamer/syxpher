// ==========================================
// SYXPHER SITE.JS
// ==========================================


// ==========================================
// LOADING SCREEN
// ==========================================

(() => {
  const loadingStart = performance.now();

  const MIN_LOADING_TIME = 1500;
  const FADE_DURATION = 700;

  function createLoadingScreen() {
    if (document.getElementById("syx-loading-screen")) {
      return;
    }

    const loading = document.createElement("div");

    loading.id = "syx-loading-screen";

    loading.innerHTML = `
      <div class="syx-loading-inner">

        <div class="syx-loading-logo">
          SYXPHER
        </div>

        <div class="syx-loading-status">
          INITIALIZING SYSTEM
        </div>

        <div class="syx-loading-bar">
          <div class="syx-loading-progress"></div>
        </div>

        <div class="syx-loading-percent">
          0%
        </div>

      </div>
    `;

    document.body.appendChild(loading);

    injectLoadingStyles();

    const progress =
      loading.querySelector(
        ".syx-loading-progress"
      );

    const percent =
      loading.querySelector(
        ".syx-loading-percent"
      );

    let currentProgress = 0;

    const progressInterval =
      window.setInterval(() => {

        if (
          currentProgress >= 90
        ) {
          window.clearInterval(
            progressInterval
          );

          return;
        }

        currentProgress +=
          Math.random() * 5 + 1;

        if (
          currentProgress > 90
        ) {
          currentProgress = 90;
        }

        progress.style.width =
          `${currentProgress}%`;

        percent.textContent =
          `${Math.floor(currentProgress)}%`;

      }, 80);
  }


  function finishLoadingScreen() {
    const loading =
      document.getElementById(
        "syx-loading-screen"
      );

    if (!loading) return;

    const elapsed =
      performance.now() -
      loadingStart;

    const remaining =
      Math.max(
        0,
        MIN_LOADING_TIME - elapsed
      );

    window.setTimeout(() => {

      const progress =
        loading.querySelector(
          ".syx-loading-progress"
        );

      const percent =
        loading.querySelector(
          ".syx-loading-percent"
        );

      if (progress) {
        progress.style.width =
          "100%";
      }

      if (percent) {
        percent.textContent =
          "100%";
      }

      loading.classList.add(
        "complete"
      );

      window.setTimeout(() => {
        loading.remove();
      }, FADE_DURATION);

    }, remaining);
  }


  function injectLoadingStyles() {
    if (
      document.getElementById(
        "syx-loading-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "syx-loading-styles";

    style.textContent = `
      #syx-loading-screen {
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: #0a0a0b;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        transition: opacity 0.7s ease, visibility 0.7s ease;
      }

      #syx-loading-screen.complete {
        opacity: 0;
        visibility: hidden;
      }

      .syx-loading-inner {
        width: min(320px, calc(100vw - 40px));
        text-align: center;
      }

      .syx-loading-logo {
        color: white;
        font-family: sans-serif;
        font-weight: 700;
        font-size: 24px;
        letter-spacing: 0.25em;
        margin-bottom: 8px;
      }

      .syx-loading-status {
        color: #00f5ff;
        font-size: 10px;
        letter-spacing: 0.2em;
        margin-bottom: 24px;
      }

      .syx-loading-bar {
        width: 100%;
        height: 2px;
        background: rgba(255, 255, 255, 0.1);
        overflow: hidden;
        position: relative;
        margin-bottom: 12px;
      }

      .syx-loading-progress {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 0%;
        background: #ff9e00;
        transition: width 0.1s linear;
      }

      .syx-loading-percent {
        color: rgba(255, 255, 255, 0.4);
        font-size: 11px;
        letter-spacing: 0.1em;
      }
    `;

    document.head.appendChild(style);
  }

  createLoadingScreen();

  window.addEventListener("load", () => {
    finishLoadingScreen();
  });
})();


// ==========================================
// CLIENT TIMEZONE & LOCAL CLOCK
// ==========================================

(() => {
  const clock =
    document.getElementById('utc-clock');

  if (!clock) return;

  const updateClock = () => {
    const now = new Date();

    const time =
      new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

    const timeZoneName =
      new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short'
      }).formatToParts(now)
        .find(part => part.type === 'timeZoneName')?.value || 'LOCAL';

    clock.textContent =
      `${time} · ${timeZoneName}`;
  };

  updateClock();

  window.setInterval(
    updateClock,
    1000
  );
})();


// ==========================================
// ALWAYS START PAGE AT TOP
// ==========================================

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener(
  'beforeunload',
  () => {
    window.scrollTo(0, 0);
  }
);

window.addEventListener(
  'load',
  () => {
    window.scrollTo(0, 0);

    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);

    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 250);
  }
);


// ==========================================
// GLOBAL STATE
// ==========================================

let siteSettings = {};

let showcaseItems = [];

let gdLevelItems = [];


// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ==========================================
// ADMIN TOKEN
// ==========================================

function getAdminToken() {
  return sessionStorage.getItem(
    'adminToken'
  );
}


function isAdminAuthenticated() {
  return Boolean(
    sessionStorage.getItem(
      'adminAuthenticated'
    ) &&
    getAdminToken()
  );
}


// ==========================================
// ADMIN API
// ==========================================

async function adminFetch(
  url,
  options = {}
) {
  const token =
    getAdminToken();

  if (!token) {
    throw new Error(
      'You are not authenticated.'
    );
  }

  const headers = {
    ...(options.headers || {}),
    Authorization:
      `Bearer ${token}`
  };

  return fetch(
    url,
    {
      ...options,
      headers
    }
  );
}


// ==========================================
// AUTHENTICATION
// ==========================================

document.addEventListener(
  'DOMContentLoaded',
  () => {
    const lock =
      document.getElementById(
        'admin-lock'
      );

    if (!lock) return;

    if (
      isAdminAuthenticated()
    ) {
      lock.textContent =
        '🔓';

      lock.title =
        'Admin Mode Enabled';

      createAdminPanel();
    }

    lock.addEventListener(
      'click',
      async () => {

        if (
          isAdminAuthenticated()
        ) {
          openAdminPanel();
          return;
        }

        const code =
          prompt(
            'Enter your Authenticator code:'
          );

        if (!code) return;

        try {
          const response =
            await fetch(
              '/api/verify',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json'
                },
                body:
                  JSON.stringify({
                    code:
                      code.trim()
                  })
              }
            );

          const result =
            await response.json();

          if (result.ok) {

            sessionStorage.setItem(
              'adminAuthenticated',
              'true'
            );

            if (result.token) {
              sessionStorage.setItem(
                'adminToken',
                result.token
              );
            }

            lock.textContent =
              '🔓';

            lock.title =
              'Admin Mode Enabled';

            createAdminPanel();

            alert(
              'Admin mode enabled.'
            );

            openAdminPanel();

          } else {
            alert(
              'Invalid Authenticator code.'
            );
          }

        } catch (error) {

          console.error(
            'Authentication error:',
            error
          );

          alert(
            'Could not connect to the authentication server.'
          );
        }
      }
    );
  }
);


// ==========================================
// LOAD PUBLIC SITE SETTINGS
// ==========================================

async function loadSiteSettings() {
  try {
    const response =
      await fetch(
        '/api/site-settings',
        {
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `Settings API returned ${response.status}`
      );
    }

    const settings =
      await response.json();

    if (
      !settings ||
      typeof settings !== 'object'
    ) {
      throw new Error(
        'Invalid settings response'
      );
    }

    siteSettings =
      settings;

    applySiteSettings();

  } catch (error) {
    console.error(
      'Site settings loading failed:',
      error
    );
  }
}


// ==========================================
// APPLY SITE SETTINGS
// ==========================================

function applySiteSettings() {

  const heroTitle =
    document.querySelector(
      'h1.font-heading'
    );

  if (heroTitle) {

    const spans =
      heroTitle.querySelectorAll(
        ':scope > span'
      );

    if (spans[0]) {
      spans[0].textContent =
        siteSettings.hero_title_1 ||
        spans[0].textContent;
    }

    if (spans[1]) {
      spans[1].textContent =
        siteSettings.hero_title_2 ||
        spans[1].textContent;
    }

    if (spans[2]) {
      spans[2].textContent =
        siteSettings.hero_title_3 ||
        spans[2].textContent;
    }
  }


  const heroDescription =
    document.querySelector(
      'section:first-of-type p.text-white\\/60'
    );

  if (heroDescription) {
    heroDescription.textContent =
      siteSettings.hero_subtitle ||
      heroDescription.textContent;
  }


  const stream =
    document.getElementById(
      'stream'
    );

  if (stream) {

    const label =
      stream.querySelector(
        ':scope > div:first-child span.font-mono-tech'
      );

    if (label) {
      label.textContent =
        siteSettings.stream_label ||
        label.textContent;
    }

    const title =
      stream.querySelector(
        'h2.font-heading'
      );

    if (title) {

      const spans =
        title.querySelectorAll(
          ':scope > span'
        );

      const textNodes =
        Array.from(
          title.childNodes
        ).filter(
          node =>
            node.nodeType ===
            Node.TEXT_NODE &&
            node.textContent.trim()
        );

      if (
        textNodes[0] &&
        siteSettings.stream_title_1
      ) {
        textNodes[0].textContent =
          `\n          ${siteSettings.stream_title_1}\n          `;
      }

      if (spans[0]) {
        spans[0].textContent =
          siteSettings.stream_title_2 ||
          spans[0].textContent;
      }
    }

    const description =
      stream.querySelector(
        ':scope > div:first-child p'
      );

    if (description) {
      description.textContent =
        siteSettings.stream_description ||
        description.textContent;
    }
  }


  const archive =
    document.getElementById(
      'archive'
    );

  if (archive) {

    const label =
      archive.querySelector(
        ':scope > div:first-child span.font-mono-tech'
      );

    if (label) {
      label.textContent =
        siteSettings.archive_label ||
        label.textContent;
    }

    const title =
      archive.querySelector(
        'h2.font-heading'
      );

    if (title) {

      const spans =
        title.querySelectorAll(
          ':scope > span'
        );

      const textNodes =
        Array.from(
          title.childNodes
        ).filter(
          node =>
            node.nodeType ===
            Node.TEXT_NODE &&
            node.textContent.trim()
        );

      if (
        textNodes[0] &&
        siteSettings.archive_title_1
      ) {
        textNodes[0].textContent =
          `\n         ${siteSettings.archive_title_1}\n         `;
      }

      if (spans[0]) {
        spans[0].textContent =
          siteSettings.archive_title_2 ||
          spans[0].textContent;
      }
    }

    const description =
      archive.querySelector(
        ':scope > div:first-child p'
      );

    if (description) {
      description.textContent =
        siteSettings.archive_description ||
        description.textContent;
    }
  }


  const contact =
    document.getElementById(
      'contact'
    );

  if (contact) {

    const label =
      contact.querySelector(
        ':scope > div span.font-mono-tech'
      );

    if (label) {
      label.textContent =
        siteSettings.contact_label ||
        label.textContent;
    }

    const title =
      contact.querySelector(
        'h2.font-heading'
      );

    if (title) {

      const spans =
        title.querySelectorAll(
          ':scope > span'
        );

      const textNodes =
        Array.from(
          title.childNodes
        ).filter(
          node =>
            node.nodeType ===
            Node.TEXT_NODE &&
            node.textContent.trim()
        );

      if (
        textNodes[0] &&
        siteSettings.contact_title_1
      ) {
        textNodes[0].textContent =
          `\n        ${siteSettings.contact_title_1}\n        `;
      }

      if (spans[0]) {
        spans[0].textContent =
          siteSettings.contact_title_2 ||
          spans[0].textContent;
      }
    }
  }


  const footer =
    document.querySelector(
      'footer'
    );

  if (footer) {

    const footerTexts =
      footer.querySelectorAll(
        'div.relative.z-10.mt-20 span'
      );

    if (footerTexts[0]) {
      footerTexts[0].textContent =
        siteSettings.copyright_text ||
        footerTexts[0].textContent;
    }

    if (footerTexts[1]) {
      footerTexts[1].textContent =
        siteSettings.footer_text ||
        footerTexts[1].textContent;
    }


    const links =
      footer.querySelectorAll(
        'a.group'
      );

    if (links[0]) {

      links[0].href =
        siteSettings.discord_url ||
        links[0].href;

      const label =
        links[0].querySelector(
          'span.font-mono-tech'
        );

      if (label) {
        label.textContent =
          siteSettings.discord_label ||
          label.textContent;
      }
    }


    if (links[1]) {

      links[1].href =
        siteSettings.youtube_url ||
        links[1].href;

      const label =
        links[1].querySelector(
          'span.font-mono-tech'
        );

      if (label) {
        label.textContent =
          siteSettings.youtube_label ||
          label.textContent;
      }
    }


    if (links[2]) {

      links[2].href =
        siteSettings.newgrounds_url ||
        links[2].href;

      const label =
        links[2].querySelector(
          'span.font-mono-tech'
        );

      if (label) {
        label.textContent =
          siteSettings.newgrounds_label ||
          label.textContent;
      }
    }
  }
}


// ==========================================
// PUBLIC SHOWCASE LOADER
// ==========================================

async function loadShowcase() {

  try {

    const response =
      await fetch(
        '/api/showcase',
        {
          method: 'GET',
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `Showcase API returned ${response.status}`
      );
    }

    const items =
      await response.json();

    if (!Array.isArray(items)) {
      throw new Error(
        'Invalid showcase API response'
      );
    }

    showcaseItems =
      items;

    renderPublicShowcase(
      items
    );

  } catch (error) {

    console.error(
      'Showcase loading failed:',
      error
    );
  }
}


// ==========================================
// RENDER PUBLIC SHOWCASE
// ==========================================

function renderPublicShowcase(
  items
) {

  const worksCountEl =
    document.getElementById(
      'works-count'
    );

  if (worksCountEl) {
    worksCountEl.textContent =
      items ? items.length : 0;
  }

  const stream =
    document.getElementById(
      'stream'
    );

  if (!stream) return;

  const articles =
    stream.querySelectorAll(
      'article'
    );

  if (!articles.length) {
    console.warn(
      'No showcase articles found.'
    );

    return;
  }

  const container =
    articles[0].parentElement;

  if (!container) return;

  container.innerHTML = '';

  items.forEach(
    (item, index) => {

      const article =
        document.createElement(
          'article'
        );

      article.className =
        'group relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden cursor-pointer bg-[#111]';

      const image =
        item.image ||
        './assets/embedded-image-2.jpg';

      const title =
        item.title ||
        'Untitled';

      const category =
        item.category ||
        '';

      const description =
        item.description ||
        '';

      article.innerHTML = `
        <img
          alt="${escapeHtml(title)}"
          class="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700 ease-out"
          src="${escapeHtml(image)}"
        />

        <div
          class="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/40 to-transparent"
        ></div>

        <div
          class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        >
          <div
            class="absolute -inset-20 bg-[#FF9E00]/10 blur-[80px]"
          ></div>
        </div>

        <span
          class="absolute top-4 left-4 md:top-6 md:left-6 font-mono-tech text-xs text-white/30"
        >
          ${String(index + 1).padStart(2, '0')}
        </span>

        <div
          class="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border border-white/20 rounded-full text-white/60 group-hover:border-[#FF9E00] group-hover:text-[#FF9E00] transition-colors"
        >
          <svg
            class="lucide lucide-play w-4 h-4 md:w-5 md:h-5"
            fill="none"
            height="24"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
        </div>

        <div
          class="absolute bottom-0 left-0 right-0 p-6 md:p-10"
        >
          <div class="overflow-hidden">
            <span
              class="font-mono-tech text-xs uppercase tracking-widest text-[#FF9E00] block mb-2"
            >
              ${escapeHtml(category)}
            </span>
          </div>

          <h3
            class="font-heading font-bold text-3xl md:text-5xl text-white tracking-tight"
          >
            ${escapeHtml(title)}
          </h3>

          <p
            class="text-white/40 mt-2 max-w-lg text-sm md:text-base line-clamp-2 group-hover:line-clamp-none transition-all"
          >
            ${escapeHtml(description)}
          </p>
        </div>
      `;

      if (item.link) {

        article.addEventListener(
          'click',
          () => {

            window.open(
              item.link,
              '_blank',
              'noopener,noreferrer'
            );

          }
        );
      }

      container.appendChild(
        article
      );
    }
  );

  console.log(
    `Loaded ${items.length} showcase items from D1.`
  );
}


// ==========================================
// PUBLIC GD LEVELS LOADER
// ==========================================

async function loadGdLevels() {
  try {
    // Change '/api/gd-levels' to '/tracked-levels.json?_t=' + Date.now()
    const response = await fetch(`/tracked-levels.json?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`tracked-levels.json returned ${response.status}`);
    }

    const items = await response.json();

    if (!Array.isArray(items)) {
      throw new Error('Invalid tracked levels JSON response');
    }

    gdLevelItems = items;
    renderPublicGdLevels(items);

  } catch (error) {
    console.error('GD Levels loading failed:', error);
  }
}

// ==========================================
// RENDER PUBLIC GD LEVELS
// ==========================================

function renderPublicGdLevels(items) {
  const container = document.getElementById('gd-levels-container') || document.getElementById('levels-grid');
  
  if (!container) {
    console.error('Could not find level container element in DOM.');
    return;
  }

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="no-levels">No Geometry Dash levels found.</p>';
    return;
  }

  // Normalize and render level cards directly into the container
  container.innerHTML = items.map(l => {
    const id = l.id || l.level_id || '';
    const name = l.name || l.title || 'Unnamed Level';
    const author = l.author || l.creator || 'Unknown';
    const stars = l.difficulty?.stars ?? l.stars ?? 0;
    const downloads = Number(l.downloads || 0).toLocaleString();
    const likes = Number(l.likes || 0).toLocaleString();
    const song = l.song || 'Unknown Song';

    return `
      <div class="level-card" data-level-id="${id}">
        <div class="level-header">
          <h3>${name}</h3>
          <span class="level-id">#${id}</span>
        </div>
        <p class="author">By <strong>${author}</strong></p>
        <div class="level-stats">
          <span>⭐ ${stars}</span>
          <span>📥 ${downloads}</span>
          <span>❤️ ${likes}</span>
        </div>
        <p class="song-info">🎵 ${song}</p>
      </div>
    `;
  }).join('');
}

// yes
// RENDER CATEGORY CONTAINER
// =====================================

function renderCategoryContainer(containerId, levelArray) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!levelArray || levelArray.length === 0) {
    container.innerHTML = '<p class="no-levels">No levels found in this category.</p>';
    return;
  }

  container.innerHTML = levelArray.map(level => `
    <div class="level-card" data-level-id="${level.id}">
      <div class="level-header">
        <h3>${level.name}</h3>
        <span class="level-id">#${level.id}</span>
      </div>
      <p class="author">By <strong>${level.author}</strong></p>
      <div class="level-stats">
        <span>⭐ ${level.stars}</span>
        <span>📥 ${Number(level.downloads).toLocaleString()}</span>
        <span>❤️ ${Number(level.likes).toLocaleString()}</span>
      </div>
      <p class="song-info">🎵 ${level.song}</p>
    </div>
  `).join('');
}

// ==========================================
// CREATE ADMIN PANEL
// ==========================================

function createAdminPanel() {

  if (
    document.getElementById(
      'syxpher-admin-panel'
    )
  ) {
    return;
  }

  const panel =
    document.createElement(
      'div'
    );

  panel.id =
    'syxpher-admin-panel';

  panel.innerHTML = `

    <div
      class="syx-admin-overlay"
      id="syx-admin-overlay"
    ></div>


    <div class="syx-admin-window">

      <div class="syx-admin-header">

        <div>

          <div class="syx-admin-kicker">
            ADMIN CONTROL
          </div>

          <h2>
            Site Editor
          </h2>

        </div>


        <button
          type="button"
          id="syx-admin-close"
          class="syx-admin-close"
        >
          ×
        </button>

      </div>


      <div class="syx-admin-tabs">

        <button
          type="button"
          class="syx-admin-tab active"
          data-admin-tab="site"
        >
          Site Editor
        </button>

        <button
          type="button"
          class="syx-admin-tab"
          data-admin-tab="showcase"
        >
          Showcase
        </button>

        <button
          type="button"
          class="syx-admin-tab"
          data-admin-tab="gd-levels"
        >
          GD Levels
        </button>

      </div>


      <div class="syx-admin-content">

        <!-- ================================= -->
        <!-- SITE EDITOR -->
        <!-- ================================= -->

        <div
          id="syx-admin-site-tab"
          class="syx-admin-tab-content active"
        >

          <section class="syx-admin-section">

            <div class="syx-admin-section-title">
              Hero
            </div>


            <label>
              First title line

              <input
                id="setting-hero_title_1"
                type="text"
              >
            </label>


            <label>
              Outlined title line

              <input
                id="setting-hero_title_2"
                type="text"
              >
            </label>


            <label>
              Third title line

              <input
                id="setting-hero_title_3"
                type="text"
              >
            </label>


            <label>
              Hero description

              <textarea
                id="setting-hero_subtitle"
                rows="4"
              ></textarea>
            </label>

          </section>


          <section class="syx-admin-section">

            <div class="syx-admin-section-title">
              Stream
            </div>


            <label>
              Section label

              <input
                id="setting-stream_label"
                type="text"
              >
            </label>


            <label>
              Main title

              <input
                id="setting-stream_title_1"
                type="text"
              >
            </label>


            <label>
              Faded title

              <input
                id="setting-stream_title_2"
                type="text"
              >
            </label>


            <label>
              Description

              <textarea
                id="setting-stream_description"
                rows="3"
              ></textarea>
            </label>

          </section>


          <section class="syx-admin-section">

            <div class="syx-admin-section-title">
              Geometry Dash Archive
            </div>


            <label>
              Section label

              <input
                id="setting-archive_label"
                type="text"
              >
            </label>


            <label>
              Main title

              <input
                id="setting-archive_title_1"
                type="text"
              >
            </label>


            <label>
              Faded title

              <input
                id="setting-archive_title_2"
                type="text"
              >
            </label>


            <label>
              Description

              <textarea
                id="setting-archive_description"
                rows="3"
              ></textarea>
            </label>

          </section>


          <section class="syx-admin-section">

            <div class="syx-admin-section-title">
              Contact
            </div>


            <label>
              Section label

              <input
                id="setting-contact_label"
                type="text"
              >
            </label>


            <label>
              Main title

              <input
                id="setting-contact_title_1"
                type="text"
              >
            </label>


            <label>
              Faded title

              <input
                id="setting-contact_title_2"
                type="text"
              >
            </label>

          </section>


          <section class="syx-admin-section">

            <div class="syx-admin-section-title">
              Footer
            </div>


            <label>
              Copyright

              <input
                id="setting-copyright_text"
                type="text"
              >
            </label>


            <label>
              Bottom text

              <input
                id="setting-footer_text"
                type="text"
              >
            </label>

          </section>


          <section class="syx-admin-section">

            <div class="syx-admin-section-title">
              Footer Links
            </div>


            <label>
              Discord label

              <input
                id="setting-discord_label"
                type="text"
              >
            </label>


            <label>
              Discord URL

              <input
                id="setting-discord_url"
                type="url"
              >
            </label>


            <label>
              YouTube label

              <input
                id="setting-youtube_label"
                type="text"
              >
            </label>


            <label>
              YouTube URL

              <input
                id="setting-youtube_url"
                type="url"
              >
            </label>


            <label>
              Newgrounds label

              <input
                id="setting-newgrounds_label"
                type="text"
              >
            </label>


            <label>
              Newgrounds URL

              <input
                id="setting-newgrounds_url"
                type="url"
              >
            </label>

          </section>


          <div class="syx-admin-actions">

            <button
              type="button"
              id="syx-admin-save"
              class="syx-admin-save"
            >
              Save Site Changes
            </button>

          </div>


          <div
            id="syx-admin-site-status"
            class="syx-admin-status"
          ></div>

        </div>


        <!-- ================================= -->
        <!-- SHOWCASE EDITOR -->
        <!-- ================================= -->

        <div
          id="syx-admin-showcase-tab"
          class="syx-admin-tab-content"
        >

          <div class="syx-showcase-toolbar">

            <div>
              <div class="syx-admin-section-title">
                Showcase Editor
              </div>

              <div class="syx-showcase-help">
                Add, edit, delete, and reorder portfolio items.
              </div>
            </div>


            <button
              type="button"
              id="syx-showcase-add"
              class="syx-admin-save"
            >
              + Add Item
            </button>

          </div>


          <div
            id="syx-showcase-list"
            class="syx-showcase-list"
          ></div>


          <div
            id="syx-showcase-status"
            class="syx-admin-status"
          ></div>

        </div>


        <!-- ================================= -->
        <!-- GD LEVELS EDITOR -->
        <!-- ================================= -->

        <div
          id="syx-admin-gd-levels-tab"
          class="syx-admin-tab-content"
        >

          <div class="syx-showcase-toolbar">

            <div>
              <div class="syx-admin-section-title">
                GD Levels Editor
              </div>

              <div class="syx-showcase-help">
                Add, edit, delete, and reorder Geometry Dash archive levels.
              </div>
            </div>


            <button
              type="button"
              id="syx-gd-level-add"
              class="syx-admin-save"
            >
              + Add Level
            </button>

          </div>


          <div
            id="syx-gd-level-list"
            class="syx-showcase-list"
          ></div>


          <div
            id="syx-gd-level-status"
            class="syx-admin-status"
          ></div>

        </div>


        <!-- ================================= -->
        <!-- BOTTOM ACTIONS -->
        <!-- ================================= -->

        <div class="syx-admin-bottom-actions">

          <button
            type="button"
            id="syx-admin-logout"
            class="syx-admin-secondary"
          >
            Log Out
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(
    panel
  );

  injectAdminStyles();


  // ========================================
  // CLOSE
  // ========================================

  document
    .getElementById(
      'syx-admin-close'
    )
    .addEventListener(
      'click',
      closeAdminPanel
    );


  document
    .getElementById(
      'syx-admin-overlay'
    )
    .addEventListener(
      'click',
      closeAdminPanel
    );


  // ========================================
  // SITE SAVE
  // ========================================

  document
    .getElementById(
      'syx-admin-save'
    )
    .addEventListener(
      'click',
      saveSiteSettings
    );


  // ========================================
  // LOGOUT
  // ========================================

  document
    .getElementById(
      'syx-admin-logout'
    )
    .addEventListener(
      'click',
      logoutAdmin
    );


  // ========================================
  // TABS
  // ========================================

  const tabs =
    panel.querySelectorAll(
      '.syx-admin-tab'
    );

  tabs.forEach(
    tab => {

      tab.addEventListener(
        'click',
        () => {

          const target =
            tab.dataset.adminTab;

          switchAdminTab(
            target
          );

        }
      );

    }
  );


  // ========================================
  // SHOWCASE ADD
  // ========================================

  document
    .getElementById(
      'syx-showcase-add'
    )
    .addEventListener(
      'click',
      () => {
        openShowcaseEditor();
      }
    );


  // ========================================
  // GD LEVELS ADD
  // ========================================

  document
    .getElementById(
      'syx-gd-level-add'
    )
    .addEventListener(
      'click',
      () => {
        openGdLevelEditor();
      }
    );


  populateAdminFields();
}


// ==========================================
// OPEN ADMIN PANEL
// ==========================================

function openAdminPanel() {

  createAdminPanel();

  populateAdminFields();

  const panel =
    document.getElementById(
      'syxpher-admin-panel'
    );

  if (panel) {

    panel.classList.add(
      'open'
    );

    switchAdminTab(
      'site'
    );
  }
}


// ==========================================
// CLOSE ADMIN PANEL
// ==========================================

function closeAdminPanel() {

  const panel =
    document.getElementById(
      'syxpher-admin-panel'
    );

  if (panel) {

    panel.classList.remove(
      'open'
    );
  }
}


// ==========================================
// SWITCH ADMIN TAB
// ==========================================

function switchAdminTab(
  tabName
) {

  const panel =
    document.getElementById(
      'syxpher-admin-panel'
    );

  if (!panel) return;


  const tabs =
    panel.querySelectorAll(
      '.syx-admin-tab'
    );

  tabs.forEach(
    tab => {

      tab.classList.toggle(
        'active',
        tab.dataset.adminTab ===
          tabName
      );

    }
  );


  const contents =
    panel.querySelectorAll(
      '.syx-admin-tab-content'
    );

  contents.forEach(
    content => {
      content.classList.remove(
        'active'
      );
    }
  );


  if (
    tabName === 'site'
  ) {

    const siteTab =
      document.getElementById(
        'syx-admin-site-tab'
      );

    if (siteTab) {
      siteTab.classList.add(
        'active'
      );
    }

    return;
  }


  if (
    tabName === 'showcase'
  ) {

    const showcaseTab =
      document.getElementById(
        'syx-admin-showcase-tab'
      );

    if (showcaseTab) {
      showcaseTab.classList.add(
        'active'
      );
    }

    loadAdminShowcase();
    return;
  }


  if (
    tabName === 'gd-levels'
  ) {

    const gdLevelsTab =
      document.getElementById(
        'syx-admin-gd-levels-tab'
      );

    if (gdLevelsTab) {
      gdLevelsTab.classList.add(
        'active'
      );
    }

    loadAdminGdLevels();
  }
}


// ==========================================
// POPULATE ADMIN FIELDS
// ==========================================

function populateAdminFields() {

  Object.entries(
    siteSettings
  ).forEach(
    ([key, value]) => {

      const input =
        document.getElementById(
          `setting-${key}`
        );

      if (input) {
        input.value =
          value ?? '';
      }
    }
  );
}


// ==========================================
// SAVE SITE SETTINGS
// ==========================================

async function saveSiteSettings() {

  const button =
    document.getElementById(
      'syx-admin-save'
    );

  const status =
    document.getElementById(
      'syx-admin-site-status'
    );

  if (!button || !status) {
    return;
  }


  const keys = [

    'hero_title_1',
    'hero_title_2',
    'hero_title_3',
    'hero_subtitle',

    'stream_label',
    'stream_title_1',
    'stream_title_2',
    'stream_description',

    'archive_label',
    'archive_title_1',
    'archive_title_2',
    'archive_description',

    'contact_label',
    'contact_title_1',
    'contact_title_2',

    'copyright_text',
    'footer_text',

    'discord_label',
    'discord_url',

    'youtube_label',
    'youtube_url',

    'newgrounds_label',
    'newgrounds_url'

  ];


  const data = {};


  for (
    const key of keys
  ) {

    const input =
      document.getElementById(
        `setting-${key}`
      );

    if (input) {

      data[key] =
        input.value;
    }
  }


  button.disabled =
    true;

  button.textContent =
    'Saving...';

  status.textContent =
    '';


  try {

    const response =
      await adminFetch(
        '/api/admin/site-settings',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(
              data
            )
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      if (
        response.status ===
        401
      ) {

        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }


      throw new Error(
        result.error ||
        'Could not save settings.'
      );
    }


    siteSettings =
      {
        ...siteSettings,
        ...data
      };


    applySiteSettings();


    status.textContent =
      'Changes saved successfully.';

    status.className =
      'syx-admin-status success';


  } catch (error) {

    console.error(
      error
    );

    status.textContent =
      error.message;

    status.className =
      'syx-admin-status error';


  } finally {

    button.disabled =
      false;

    button.textContent =
      'Save Site Changes';
  }
}


// ==========================================
// LOAD ADMIN SHOWCASE
// ==========================================

async function loadAdminShowcase() {

  const list =
    document.getElementById(
      'syx-showcase-list'
    );

  const status =
    document.getElementById(
      'syx-showcase-status'
    );

  if (!list) return;


  list.innerHTML = `
    <div class="syx-showcase-loading">
      Loading showcase...
    </div>
  `;


  try {

    const response =
      await adminFetch(
        '/api/admin/showcase',
        {
          method: 'GET',
          cache: 'no-store'
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      if (
        response.status ===
        401
      ) {

        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }


      throw new Error(
        result.error ||
        'Could not load showcase.'
      );
    }


    if (
      !Array.isArray(result)
    ) {

      throw new Error(
        'Invalid showcase response.'
      );
    }


    showcaseItems =
      result;


    renderAdminShowcase();


    if (status) {

      status.textContent =
        `${result.length} showcase item${result.length === 1 ? '' : 's'} loaded.`;

      status.className =
        'syx-admin-status success';
    }


  } catch (error) {

    console.error(
      'Admin showcase loading failed:',
      error
    );


    list.innerHTML = `
      <div class="syx-showcase-empty">
        ${escapeHtml(error.message)}
      </div>
    `;


    if (status) {

      status.textContent =
        error.message;

      status.className =
        'syx-admin-status error';
    }
  }
}


// ==========================================
// RENDER ADMIN SHOWCASE
// ==========================================

function renderAdminShowcase() {

  const list =
    document.getElementById(
      'syx-showcase-list'
    );

  if (!list) return;


  list.innerHTML = '';


  if (
    !showcaseItems.length
  ) {

    list.innerHTML = `
      <div class="syx-showcase-empty">
        No showcase items yet.
        Click "+ Add Item" to create one.
      </div>
    `;

    return;
  }


  showcaseItems.forEach(
    (item, index) => {

      const card =
        document.createElement(
          'div'
        );

      card.className =
        'syx-showcase-admin-card';


      const image =
        item.image ||
        '';


      card.innerHTML = `

        <div class="syx-showcase-admin-number">
          ${String(index + 1).padStart(2, '0')}
        </div>


        <div class="syx-showcase-admin-preview">

          ${
            image
              ? `
                <img
                  src="${escapeHtml(image)}"
                  alt="${escapeHtml(item.title || '')}"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >

                <div
                  class="syx-showcase-image-fallback"
                  style="display:none;"
                >
                  IMAGE ERROR
                </div>
              `
              : `
                <div class="syx-showcase-image-fallback">
                  NO IMAGE
                </div>
              `
          }

        </div>


        <div class="syx-showcase-admin-info">

          <div class="syx-showcase-admin-title">
            ${escapeHtml(item.title || 'Untitled')}
          </div>


          <div class="syx-showcase-admin-category">
            ${escapeHtml(item.category || 'No category')}
          </div>


          <div class="syx-showcase-admin-description">
            ${escapeHtml(item.description || 'No description')}
          </div>

        </div>


        <div class="syx-showcase-admin-controls">

          <button
            type="button"
            class="syx-mini-button"
            data-action="up"
            title="Move up"
            ${index === 0 ? 'disabled' : ''}
          >
            ↑
          </button>


          <button
            type="button"
            class="syx-mini-button"
            data-action="down"
            title="Move down"
            ${index === showcaseItems.length - 1 ? 'disabled' : ''}
          >
            ↓
          </button>


          <button
            type="button"
            class="syx-mini-button"
            data-action="edit"
          >
            Edit
          </button>


          <button
            type="button"
            class="syx-mini-button danger"
            data-action="delete"
          >
            Delete
          </button>

        </div>

      `;


      const buttons =
        card.querySelectorAll(
          '[data-action]'
        );


      buttons.forEach(
        button => {

          button.addEventListener(
            'click',
            () => {

              const action =
                button.dataset.action;


              if (
                action === 'up'
              ) {

                moveShowcaseItem(
                  index,
                  -1
                );

              }


              if (
                action === 'down'
              ) {

                moveShowcaseItem(
                  index,
                  1
                );

              }


              if (
                action === 'edit'
              ) {

                openShowcaseEditor(
                  item
                );

              }


              if (
                action === 'delete'
              ) {

                deleteShowcaseItem(
                  item
                );

              }

            }
          );

        }
      );


      list.appendChild(
        card
      );
    }
  );
}


// ==========================================
// SHOWCASE EDITOR
// ==========================================

function openShowcaseEditor(
  item = null
) {

  const existing =
    document.getElementById(
      'syx-showcase-editor'
    );

  if (existing) {
    existing.remove();
  }


  const isEditing =
    Boolean(item);


  const editor =
    document.createElement(
      'div'
    );

  editor.id =
    'syx-showcase-editor';

  editor.className =
    'syx-showcase-editor-overlay';


  editor.innerHTML = `

    <div class="syx-showcase-editor-window">

      <div class="syx-showcase-editor-header">

        <div>

          <div class="syx-admin-kicker">
            SHOWCASE
          </div>

          <h3>
            ${isEditing ? 'Edit Item' : 'Add Item'}
          </h3>

        </div>


        <button
          type="button"
          id="syx-showcase-editor-close"
          class="syx-admin-close"
        >
          ×
        </button>

      </div>


      <div class="syx-showcase-editor-content">

        <label>
          Title

          <input
            id="showcase-edit-title"
            type="text"
            value="${escapeHtml(item?.title || '')}"
            placeholder="Project title"
          >
        </label>


        <label>
          Category

          <input
            id="showcase-edit-category"
            type="text"
            value="${escapeHtml(item?.category || '')}"
            placeholder="Motion Graphics"
          >
        </label>


        <label>
          Description

          <textarea
            id="showcase-edit-description"
            rows="5"
            placeholder="Describe the project..."
          >${escapeHtml(item?.description || '')}</textarea>
        </label>


        <label>
          Image URL

          <input
            id="showcase-edit-image"
            type="url"
            value="${escapeHtml(item?.image || '')}"
            placeholder="https://example.com/image.jpg"
          >
        </label>


        <div class="syx-showcase-image-note">
          You can use a direct image URL here. You do not need to upload the image to your assets folder.
        </div>


        <label>
          Project Link

          <input
            id="showcase-edit-link"
            type="url"
            value="${escapeHtml(item?.link || '')}"
            placeholder="https://example.com/project"
          >
        </label>


        <div
          id="syx-showcase-editor-status"
          class="syx-admin-status"
        ></div>


        <div class="syx-admin-actions">

          <button
            type="button"
            id="syx-showcase-editor-save"
            class="syx-admin-save"
          >
            ${isEditing ? 'Save Changes' : 'Add Item'}
          </button>


          <button
            type="button"
            id="syx-showcase-editor-cancel"
            class="syx-admin-secondary"
          >
            Cancel
          </button>

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    editor
  );


  document
    .getElementById(
      'syx-showcase-editor-close'
    )
    .addEventListener(
      'click',
      closeShowcaseEditor
    );


  document
    .getElementById(
      'syx-showcase-editor-cancel'
    )
    .addEventListener(
      'click',
      closeShowcaseEditor
    );


  document
    .getElementById(
      'syx-showcase-editor-save'
    )
    .addEventListener(
      'click',
      () => {

        saveShowcaseItem(
          item
        );

      }
    );


  editor.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        editor
      ) {
        closeShowcaseEditor();
      }

    }
  );


  setTimeout(
    () => {

      editor.classList.add(
        'open'
      );

    },
    10
  );
}


// ==========================================
// CLOSE SHOWCASE EDITOR
// ==========================================

function closeShowcaseEditor() {

  const editor =
    document.getElementById(
      'syx-showcase-editor'
    );

  if (!editor) return;

  editor.classList.remove(
    'open'
  );


  setTimeout(
    () => {

      editor.remove();

    },
    200
  );
}


// ==========================================
// SAVE SHOWCASE ITEM
// ==========================================

async function saveShowcaseItem(
  existingItem
) {

  const button =
    document.getElementById(
      'syx-showcase-editor-save'
    );

  const status =
    document.getElementById(
      'syx-showcase-editor-status'
    );


  const title =
    document.getElementById(
      'showcase-edit-title'
    )?.value.trim();


  const category =
    document.getElementById(
      'showcase-edit-category'
    )?.value.trim();


  const description =
    document.getElementById(
      'showcase-edit-description'
    )?.value.trim();


  const image =
    document.getElementById(
      'showcase-edit-image'
    )?.value.trim();


  const link =
    document.getElementById(
      'showcase-edit-link'
    )?.value.trim();


  if (!title) {

    if (status) {

      status.textContent =
        'Title is required.';

      status.className =
        'syx-admin-status error';
    }

    return;
  }


  const data = {

    title,

    category:
      category || '',

    description:
      description || '',

    image:
      image || '',

    link:
      link || ''

  };


  if (button) {

    button.disabled =
      true;

    button.textContent =
      existingItem
        ? 'Saving...'
        : 'Adding...';
  }


  if (status) {

    status.textContent =
      '';

    status.className =
      'syx-admin-status';
  }


  try {

    let response;


    if (existingItem) {

      response =
        await adminFetch(
          `/api/admin/showcase/${existingItem.id}`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(
                data
              )
          }
        );

    } else {

      response =
        await adminFetch(
          '/api/admin/showcase',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(
                data
              )
          }
        );
    }


    const result =
      await response.json();


    if (!response.ok) {

      if (
        response.status ===
        401
      ) {

        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }


      throw new Error(
        result.error ||
        'Could not save showcase item.'
      );
    }


    closeShowcaseEditor();


    await loadShowcase();


    await loadAdminShowcase();


    const statusElement =
      document.getElementById(
        'syx-showcase-status'
      );


    if (statusElement) {

      statusElement.textContent =
        existingItem
          ? 'Showcase item updated successfully.'
          : 'Showcase item added successfully.';

      statusElement.className =
        'syx-admin-status success';
    }


  } catch (error) {

    console.error(
      'Showcase save failed:',
      error
    );


    if (status) {

      status.textContent =
        error.message;

      status.className =
        'syx-admin-status error';
    }


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        existingItem
          ? 'Save Changes'
          : 'Add Item';
    }
  }
}


// ==========================================
// DELETE SHOWCASE ITEM
// ==========================================

async function deleteShowcaseItem(
  item
) {

  const title =
    item.title ||
    'this item';


  const confirmed =
    window.confirm(
      `Delete "${title}"?\n\nThis cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  const status =
    document.getElementById(
      'syx-showcase-status'
    );


  try {

    const response =
      await adminFetch(
        `/api/admin/showcase/${item.id}`,
        {
          method: 'DELETE'
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      if (
        response.status ===
        401
      ) {

        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }


      throw new Error(
        result.error ||
        'Could not delete item.'
      );
    }


    showcaseItems =
      showcaseItems.filter(
        current =>
          current.id !==
          item.id
      );


    await loadShowcase();


    renderAdminShowcase();


    if (status) {

      status.textContent =
        'Showcase item deleted successfully.';

      status.className =
        'syx-admin-status success';
    }


  } catch (error) {

    console.error(
      'Showcase delete failed:',
      error
    );


    if (status) {

      status.textContent =
        error.message;

      status.className =
        'syx-admin-status error';
    }
  }
}


// ==========================================
// MOVE SHOWCASE ITEM
// ==========================================

async function moveShowcaseItem(
  index,
  direction
) {

  const newIndex =
    index + direction;


  if (
    newIndex < 0 ||
    newIndex >=
      showcaseItems.length
  ) {
    return;
  }


  const newItems =
    [...showcaseItems];


  const current =
    newItems[index];


  const target =
    newItems[newIndex];


  newItems[index] =
    target;

  newItems[newIndex] =
    current;


  const ids =
    newItems.map(
      item =>
        item.id
    );


  const status =
    document.getElementById(
      'syx-showcase-status'
    );


  try {

    const response =
      await adminFetch(
        '/api/admin/showcase/reorder',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              ids
            })
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      if (
        response.status ===
        401
      ) {

        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }


      throw new Error(
        result.error ||
        'Could not reorder items.'
      );
    }


    showcaseItems =
      newItems;


    renderAdminShowcase();


    await loadShowcase();


    if (status) {

      status.textContent =
        'Showcase order saved.';

      status.className =
        'syx-admin-status success';
    }


  } catch (error) {

    console.error(
      'Showcase reorder failed:',
      error
    );


    if (status) {

      status.textContent =
        error.message;

      status.className =
        'syx-admin-status error';
    }
  }
}


// ==========================================
// LOAD ADMIN GD LEVELS
// ==========================================

async function loadAdminGdLevels() {
  const list = document.getElementById('syx-gd-level-list');
  const status = document.getElementById('syx-gd-level-status');

  if (!list) return;

  list.innerHTML = `
    <div class="syx-showcase-loading">
      Loading GD levels...
    </div>
  `;

  try {
    const response = await adminFetch('/api/admin/gd-levels', {
      method: 'GET',
      cache: 'no-store'
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logoutAdmin();
        throw new Error('Admin session expired.');
      }
      throw new Error(result.error || 'Could not load GD levels.');
    }

    if (!Array.isArray(result)) {
      throw new Error('Invalid GD levels response.');
    }

    gdLevelItems = result;
    renderAdminGdLevels();

    if (status) {
      status.textContent = `${result.length} level${result.length === 1 ? '' : 's'} loaded.`;
      status.className = 'syx-admin-status success';
    }

  } catch (error) {
    console.error('Admin GD levels loading failed:', error);
    list.innerHTML = `
      <div class="syx-showcase-empty">
        ${escapeHtml(error.message)}
      </div>
    `;

    if (status) {
      status.textContent = error.message;
      status.className = 'syx-admin-status error';
    }
  }
}


// ==========================================
// RENDER ADMIN GD LEVELS
// ==========================================

function renderAdminGdLevels() {
  const list = document.getElementById('syx-gd-level-list');
  if (!list) return;

  list.innerHTML = '';

  if (!gdLevelItems.length) {
    list.innerHTML = `
      <div class="syx-showcase-empty">
        No GD levels added yet. Click "+ Add Level" to create one.
      </div>
    `;
    return;
  }

  gdLevelItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'syx-showcase-admin-card';

    const image = item.image || '';

    card.innerHTML = `
      <div class="syx-showcase-admin-number">
        ${String(index + 1).padStart(2, '0')}
      </div>

      <div class="syx-showcase-admin-preview">
        ${
          image
            ? `
              <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(item.title || '')}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              >
              <div class="syx-showcase-image-fallback" style="display:none;">
                IMAGE ERROR
              </div>
            `
            : `
              <div class="syx-showcase-image-fallback">
                NO IMAGE
              </div>
            `
        }
      </div>

      <div class="syx-showcase-admin-info">
        <div class="syx-showcase-admin-title">
          ${escapeHtml(item.title || 'Untitled Level')}
        </div>

        <div class="syx-showcase-admin-category">
          ${escapeHtml(item.difficulty || 'Featured')} ${item.level_id ? `· ID: ${escapeHtml(item.level_id)}` : ''}
        </div>

        <div class="syx-showcase-admin-description">
          ${escapeHtml(item.description || 'No description')}
        </div>
      </div>

      <div class="syx-showcase-admin-controls">
        <button
          type="button"
          class="syx-mini-button"
          data-action="up"
          title="Move up"
          ${index === 0 ? 'disabled' : ''}
        >
          ↑
        </button>

        <button
          type="button"
          class="syx-mini-button"
          data-action="down"
          title="Move down"
          ${index === gdLevelItems.length - 1 ? 'disabled' : ''}
        >
          ↓
        </button>

        <button
          type="button"
          class="syx-mini-button"
          data-action="edit"
        >
          Edit
        </button>

        <button
          type="button"
          class="syx-mini-button danger"
          data-action="delete"
        >
          Delete
        </button>
      </div>
    `;

    const buttons = card.querySelectorAll('[data-action]');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;

        if (action === 'up') moveGdLevelItem(index, -1);
        if (action === 'down') moveGdLevelItem(index, 1);
        if (action === 'edit') openGdLevelEditor(item);
        if (action === 'delete') deleteGdLevelItem(item);
      });
    });

    list.appendChild(card);
  });
}


// ==========================================
// GD LEVEL EDITOR MODAL
// ==========================================

function openGdLevelEditor(item = null) {
  const existing = document.getElementById('syx-gd-level-editor');
  if (existing) existing.remove();

  const isEditing = Boolean(item);

  const editor = document.createElement('div');
  editor.id = 'syx-gd-level-editor';
  editor.className = 'syx-showcase-editor-overlay';

  editor.innerHTML = `
    <div class="syx-showcase-editor-window">

      <div class="syx-showcase-editor-header">
        <div>
          <div class="syx-admin-kicker">GD ARCHIVE</div>
          <h3>${isEditing ? 'Edit Level' : 'Add Level'}</h3>
        </div>

        <button type="button" id="syx-gd-editor-close" class="syx-admin-close">×</button>
      </div>

      <div class="syx-showcase-editor-content">

        <label>
          Level Title
          <input
            id="gd-edit-title"
            type="text"
            value="${escapeHtml(item?.title || '')}"
            placeholder="Level Name"
          >
        </label>

        <label>
          Level ID
          <input
            id="gd-edit-level-id"
            type="text"
            value="${escapeHtml(item?.level_id || '')}"
            placeholder="e.g. 104928475"
          >
        </label>

        <label>
          Difficulty / Status
          <input
            id="gd-edit-difficulty"
            type="text"
            value="${escapeHtml(item?.difficulty || '')}"
            placeholder="Extreme Demon / Unrated / Featured"
          >
        </label>

        <label>
          Description
          <textarea
            id="gd-edit-description"
            rows="4"
            placeholder="Level description, song details, or notes..."
          >${escapeHtml(item?.description || '')}</textarea>
        </label>

        <label>
          Thumbnail / Image URL
          <input
            id="gd-edit-image"
            type="url"
            value="${escapeHtml(item?.image || '')}"
            placeholder="https://example.com/level-thumb.jpg"
          >
        </label>

        <label>
          Video / Showcase Link
          <input
            id="gd-edit-link"
            type="url"
            value="${escapeHtml(item?.link || '')}"
            placeholder="https://youtube.com/watch?v=..."
          >
        </label>

        <div id="syx-gd-editor-status" class="syx-admin-status"></div>

        <div class="syx-admin-actions">
          <button type="button" id="syx-gd-editor-save" class="syx-admin-save">
            ${isEditing ? 'Save Changes' : 'Add Level'}
          </button>

          <button type="button" id="syx-gd-editor-cancel" class="syx-admin-secondary">
            Cancel
          </button>
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(editor);

  document.getElementById('syx-gd-editor-close').addEventListener('click', closeGdLevelEditor);
  document.getElementById('syx-gd-editor-cancel').addEventListener('click', closeGdLevelEditor);
  document.getElementById('syx-gd-editor-save').addEventListener('click', () => saveGdLevelItem(item));

  editor.addEventListener('click', event => {
    if (event.target === editor) closeGdLevelEditor();
  });

  setTimeout(() => {
    editor.classList.add('open');
  }, 10);
}


// ==========================================
// CLOSE GD LEVEL EDITOR
// ==========================================

function closeGdLevelEditor() {
  const editor = document.getElementById('syx-gd-level-editor');
  if (!editor) return;

  editor.classList.remove('open');
  setTimeout(() => {
    editor.remove();
  }, 200);
}


// ==========================================
// SAVE GD LEVEL ITEM
// ==========================================

async function saveGdLevelItem(existingItem) {
  const button = document.getElementById('syx-gd-editor-save');
  const status = document.getElementById('syx-gd-editor-status');

  const title = document.getElementById('gd-edit-title')?.value.trim();
  const level_id = document.getElementById('gd-edit-level-id')?.value.trim();
  const difficulty = document.getElementById('gd-edit-difficulty')?.value.trim();
  const description = document.getElementById('gd-edit-description')?.value.trim();
  const image = document.getElementById('gd-edit-image')?.value.trim();
  const link = document.getElementById('gd-edit-link')?.value.trim();

  if (!title) {
    if (status) {
      status.textContent = 'Level Title is required.';
      status.className = 'syx-admin-status error';
    }
    return;
  }

  const data = {
    title,
    level_id: level_id || '',
    difficulty: difficulty || '',
    description: description || '',
    image: image || '',
    link: link || ''
  };

  if (button) {
    button.disabled = true;
    button.textContent = existingItem ? 'Saving...' : 'Adding...';
  }

  if (status) {
    status.textContent = '';
    status.className = 'syx-admin-status';
  }

  try {
    let response;

    if (existingItem) {
      response = await adminFetch(`/api/admin/gd-levels/${existingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      response = await adminFetch('/api/admin/gd-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logoutAdmin();
        throw new Error('Admin session expired.');
      }
      throw new Error(result.error || 'Could not save level.');
    }

    closeGdLevelEditor();

    await loadGdLevels();
    await loadAdminGdLevels();

    const statusElement = document.getElementById('syx-gd-level-status');
    if (statusElement) {
      statusElement.textContent = existingItem ? 'GD Level updated successfully.' : 'GD Level added successfully.';
      statusElement.className = 'syx-admin-status success';
    }

  } catch (error) {
    console.error('GD level save failed:', error);
    if (status) {
      status.textContent = error.message;
      status.className = 'syx-admin-status error';
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = existingItem ? 'Save Changes' : 'Add Level';
    }
  }
}


// ==========================================
// DELETE GD LEVEL ITEM
// ==========================================

async function deleteGdLevelItem(item) {
  const title = item.title || 'this level';
  const confirmed = window.confirm(`Delete level "${title}"?\n\nThis cannot be undone.`);

  if (!confirmed) return;

  const status = document.getElementById('syx-gd-level-status');

  try {
    const response = await adminFetch(`/api/admin/gd-levels/${item.id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logoutAdmin();
        throw new Error('Admin session expired.');
      }
      throw new Error(result.error || 'Could not delete level.');
    }

    gdLevelItems = gdLevelItems.filter(current => current.id !== item.id);

    await loadGdLevels();
    renderAdminGdLevels();

    if (status) {
      status.textContent = 'GD level deleted successfully.';
      status.className = 'syx-admin-status success';
    }

  } catch (error) {
    console.error('GD level delete failed:', error);
    if (status) {
      status.textContent = error.message;
      status.className = 'syx-admin-status error';
    }
  }
}


// ==========================================
// MOVE GD LEVEL ITEM
// ==========================================

async function moveGdLevelItem(index, direction) {
  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= gdLevelItems.length) return;

  const newItems = [...gdLevelItems];
  const current = newItems[index];
  const target = newItems[newIndex];

  newItems[index] = target;
  newItems[newIndex] = current;

  const ids = newItems.map(item => item.id);
  const status = document.getElementById('syx-gd-level-status');

  try {
    const response = await adminFetch('/api/admin/gd-levels/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logoutAdmin();
        throw new Error('Admin session expired.');
      }
      throw new Error(result.error || 'Could not reorder levels.');
    }

    gdLevelItems = newItems;

    renderAdminGdLevels();
    await loadGdLevels();

    if (status) {
      status.textContent = 'GD levels order saved.';
      status.className = 'syx-admin-status success';
    }

  } catch (error) {
    console.error('GD levels reorder failed:', error);
    if (status) {
      status.textContent = error.message;
      status.className = 'syx-admin-status error';
    }
  }
}


// ==========================================
// LOG OUT
// ==========================================

function logoutAdmin() {

  sessionStorage.removeItem(
    'adminAuthenticated'
  );

  sessionStorage.removeItem(
    'adminToken'
  );


  closeAdminPanel();


  const showcaseEditor =
    document.getElementById(
      'syx-showcase-editor'
    );

  if (showcaseEditor) {
    showcaseEditor.remove();
  }


  const gdEditor =
    document.getElementById(
      'syx-gd-level-editor'
    );

  if (gdEditor) {
    gdEditor.remove();
  }


  const lock =
    document.getElementById(
      'admin-lock'
    );


  if (lock) {

    lock.textContent =
      '🔒';

    lock.title =
      'Admin Mode';
  }
}


// ==========================================
// ADMIN STYLES
// ==========================================

function injectAdminStyles() {

  if (
    document.getElementById(
      'syx-admin-styles'
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      'style'
    );


  style.id =
    'syx-admin-styles';


  style.textContent = `

    /* =====================================
       ADMIN PANEL
       ===================================== */

    #syxpher-admin-panel {

      position: fixed;

      inset: 0;

      z-index: 99999;

      pointer-events: none;

      font-family: monospace;

    }


    #syxpher-admin-panel.open {

      pointer-events: auto;

    }


    .syx-admin-overlay {

      position: absolute;

      inset: 0;

      background:
        rgba(0, 0, 0, .78);

      backdrop-filter:
        blur(8px);

      opacity: 0;

      transition:
        opacity .2s ease;

    }


    #syxpher-admin-panel.open
    .syx-admin-overlay {

      opacity: 1;

    }


    .syx-admin-window {

      position: absolute;

      top: 50%;

      left: 50%;

      width:
        min(900px, calc(100vw - 30px));

      max-height:
        calc(100vh - 30px);

      transform:
        translate(-50%, -46%);

      opacity: 0;

      overflow: hidden;

      background:
        #0d0d0f;

      border:
        1px solid
        rgba(255, 158, 0, .35);

      box-shadow:
        0 30px 100px
        rgba(0,0,0,.65);

      transition:
        opacity .2s ease,
        transform .2s ease;

    }


    #syxpher-admin-panel.open
    .syx-admin-window {

      opacity: 1;

      transform:
        translate(-50%, -50%);

    }


    .syx-admin-header {

      display: flex;

      align-items: center;

      justify-content: space-between;

      padding:
        22px 24px;

      border-bottom:
        1px solid
        rgba(255,255,255,.1);

      background:
        #111114;

    }


    .syx-admin-kicker {

      color:
        #00f5ff;

      font-size:
        10px;

      letter-spacing:
        .2em;

      margin-bottom:
        6px;

    }


    .syx-admin-header h2 {

      margin:
        0;

      color:
        white;

      font-family:
        sans-serif;

      font-size:
        28px;

    }


    .syx-admin-close {

      width:
        38px;

      height:
        38px;

      border:
        1px solid
        rgba(255,255,255,.15);

      background:
        transparent;

      color:
        rgba(255,255,255,.6);

      font-size:
        25px;

      cursor:
        pointer;

    }


    .syx-admin-close:hover {

      color:
        #ff9e00;

      border-color:
        #ff9e00;

    }


    /* =====================================
       TABS
       ===================================== */

    .syx-admin-tabs {

      display:
        flex;

      border-bottom:
        1px solid
        rgba(255,255,255,.1);

      background:
        #0a0a0c;

    }


    .syx-admin-tab {

      flex:
        1;

      padding:
        15px 18px;

      border:
        0;

      border-right:
        1px solid
        rgba(255,255,255,.06);

      background:
        transparent;

      color:
        rgba(255,255,255,.4);

      cursor:
        pointer;

      font:
        inherit;

      font-size:
        11px;

      letter-spacing:
        .1em;

      text-transform:
        uppercase;

      transition:
        background .2s ease,
        color .2s ease;

    }


    .syx-admin-tab:hover {

      color:
        white;

      background:
        rgba(255,255,255,.04);

    }


    .syx-admin-tab.active {

      color:
        #ff9e00;

      background:
        rgba(255,158,0,.08);

      box-shadow:
        inset 0 -2px 0
        #ff9e00;

    }


    /* =====================================
       CONTENT
       ===================================== */

    .syx-admin-content {

      padding:
        24px;

      overflow-y:
        auto;

      max-height:
        calc(100vh - 165px);

    }


    .syx-admin-tab-content {

      display:
        none;

    }


    .syx-admin-tab-content.active {

      display:
        block;

    }


    .syx-admin-section {

      margin-bottom:
        28px;

      padding-bottom:
        24px;

      border-bottom:
        1px solid
        rgba(255,255,255,.08);

    }


    .syx-admin-section-title {

      color:
        #ff9e00;

      font-size:
        12px;

      letter-spacing:
        .18em;

      text-transform:
        uppercase;

      margin-bottom:
        18px;

    }


    .syx-admin-section label,
    .syx-showcase-editor-content label {

      display:
        block;

      margin-bottom:
        15px;

      color:
        rgba(255,255,255,.55);

      font-size:
        11px;

      text-transform:
        uppercase;

      letter-spacing:
        .08em;

    }


    .syx-admin-section input,
    .syx-admin-section textarea,
    .syx-showcase-editor-content input,
    .syx-showcase-editor-content textarea {

      display:
        block;

      box-sizing:
        border-box;

      width:
        100%;

      margin-top:
        7px;

      padding:
        11px 12px;

      border:
        1px solid
        rgba(255,255,255,.12);

      outline:
        none;

      background:
        #151518;

      color:
        white;

      font:
        inherit;

      font-size:
        13px;

    }


    .syx-admin-section textarea,
    .syx-showcase-editor-content textarea {

      resize:
        vertical;

      min-height:
        80px;

    }


    .syx-admin-section input:focus,
    .syx-admin-section textarea:focus,
    .syx-showcase-editor-content input:focus,
    .syx-showcase-editor-content textarea:focus {

      border-color:
        #ff9e00;

    }


    /* =====================================
       BUTTONS
       ===================================== */

    .syx-admin-actions {

      display:
        flex;

      gap:
        10px;

      flex-wrap:
        wrap;

    }


    .syx-admin-actions button,
    .syx-admin-bottom-actions button {

      border:
        1px solid;

      padding:
        13px 18px;

      cursor:
        pointer;

      font:
        inherit;

      text-transform:
        uppercase;

      letter-spacing:
        .08em;

      font-size:
        11px;

    }


    .syx-admin-save {

      border-color:
        #ff9e00 !important;

      background:
        #ff9e00;

      color:
        #0a0a0b;

      padding:
        12px 16px;

      border:
        1px solid
        #ff9e00;

      cursor:
        pointer;

      font:
        inherit;

      font-size:
        11px;

      text-transform:
        uppercase;

      letter-spacing:
        .08em;

    }


    .syx-admin-save:hover {

      background:
        #ffb133;

    }


    .syx-admin-save:disabled {

      opacity:
        .6;

      cursor:
        wait;

    }


    .syx-admin-secondary {

      border-color:
        rgba(255,255,255,.15);

      background:
        transparent;

      color:
        rgba(255,255,255,.65);

    }


    .syx-admin-secondary:hover {

      color:
        white;

      border-color:
        rgba(255,255,255,.4);

    }


    .syx-admin-bottom-actions {

      margin-top:
        25px;

      padding-top:
        20px;

      border-top:
        1px solid
        rgba(255,255,255,.08);

    }


    /* =====================================
       STATUS
       ===================================== */

    .syx-admin-status {

      min-height:
        20px;

      margin-top:
        14px;

      font-size:
        11px;

    }


    .syx-admin-status.success {

      color:
        #00f5ff;

    }


    .syx-admin-status.error {

      color:
        #ff5c5c;

    }


    /* =====================================
       SHOWCASE TOOLBAR
       ===================================== */

    .syx-showcase-toolbar {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        20px;

      margin-bottom:
        20px;

      padding-bottom:
        20px;

      border-bottom:
        1px solid
        rgba(255,255,255,.08);

    }


    .syx-showcase-toolbar
    .syx-admin-section-title {

      margin-bottom:
        5px;

    }


    .syx-showcase-help {

      color:
        rgba(255,255,255,.35);

      font-size:
        11px;

    }


    /* =====================================
       SHOWCASE LIST
       ===================================== */

    .syx-showcase-list {

      display:
        flex;

      flex-direction:
        column;

      gap:
        10px;

    }


    .syx-showcase-loading,
    .syx-showcase-empty {

      padding:
        35px 20px;

      border:
        1px solid
        rgba(255,255,255,.08);

      background:
        rgba(255,255,255,.02);

      color:
        rgba(255,255,255,.4);

      text-align:
        center;

      font-size:
        12px;

    }


    .syx-showcase-admin-card {

      display:
        grid;

      grid-template-columns:
        32px 110px 1fr auto;

      align-items:
        center;

      gap:
        14px;

      padding:
        12px;

      border:
        1px solid
        rgba(255,255,255,.08);

      background:
        #111114;

      transition:
        border-color .2s ease,
        background .2s ease;

    }


    .syx-showcase-admin-card:hover {

      border-color:
        rgba(255,158,0,.25);

      background:
        #151518;

    }


    .syx-showcase-admin-number {

      color:
        rgba(255,255,255,.25);

      font-size:
        11px;

      text-align:
        center;

    }


    .syx-showcase-admin-preview {

      width:
        110px;

      height:
        65px;

      overflow:
        hidden;

      background:
        #09090a;

      border:
        1px solid
        rgba(255,255,255,.08);

    }


    .syx-showcase-admin-preview img {

      width:
        100%;

      height:
        100%;

      object-fit:
        cover;

      display:
        block;

    }


    .syx-showcase-image-fallback {

      width:
        100%;

      height:
        100%;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      color:
        rgba(255,255,255,.25);

      font-size:
        9px;

    }


    .syx-showcase-admin-info {

      min-width:
        0;

    }


    .syx-showcase-admin-title {

      color:
        white;

      font-family:
        sans-serif;

      font-weight:
        700;

      font-size:
        16px;

      white-space:
        nowrap;

      overflow:
        hidden;

      text-overflow:
        ellipsis;

    }


    .syx-showcase-admin-category {

      margin-top:
        4px;

      color:
        #ff9e00;

      font-size:
        10px;

      text-transform:
        uppercase;

      letter-spacing:
        .08em;

    }


    .syx-showcase-admin-description {

      margin-top:
        6px;

      color:
        rgba(255,255,255,.35);

      font-size:
        11px;

      line-height:
        1.4;

      display:
        -webkit-box;

      -webkit-line-clamp:
        2;

      -webkit-box-orient:
        vertical;

      overflow:
        hidden;

    }


    .syx-showcase-admin-controls {

      display:
        flex;

      align-items:
        center;

      justify-content:
        flex-end;

      gap:
        5px;

      flex-wrap:
        wrap;

      max-width:
        210px;

    }


    .syx-mini-button {

      min-width:
        32px;

      height:
        32px;

      padding:
        0 8px;

      border:
        1px solid
        rgba(255,255,255,.12);

      background:
        transparent;

      color:
        rgba(255,255,255,.6);

      cursor:
        pointer;

      font:
        inherit;

      font-size:
        10px;

      text-transform:
        uppercase;

    }


    .syx-mini-button:hover {

      border-color:
        #ff9e00;

      color:
        #ff9e00;

    }


    .syx-mini-button:disabled {

      opacity:
        .2;

      cursor:
        not-allowed;

    }


    .syx-mini-button.danger:hover {

      border-color:
        #ff5c5c;

      color:
        #ff5c5c;

    }


    /* =====================================
       SHOWCASE EDITOR MODAL
       ===================================== */

    .syx-showcase-editor-overlay {

      position:
        fixed;

      inset:
        0;

      z-index:
        100000;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      padding:
        15px;

      background:
        rgba(0,0,0,.82);

      backdrop-filter:
        blur(8px);

      opacity:
        0;

      transition:
        opacity .2s ease;

    }


    .syx-showcase-editor-overlay.open {

      opacity:
        1;

    }


    .syx-showcase-editor-window {

      width:
        min(650px, 100%);

      max-height:
        calc(100vh - 30px);

      overflow:
        hidden;

      background:
        #0d0d0f;

      border:
        1px solid
        rgba(255,158,0,.35);

      box-shadow:
        0 30px 100px
        rgba(0,0,0,.7);

      transform:
        translateY(15px);

      transition:
        transform .2s ease;

    }


    .syx-showcase-editor-overlay.open
    .syx-showcase-editor-window {

      transform:
        translateY(0);

    }


    .syx-showcase-editor-header {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      padding:
        20px 22px;

      border-bottom:
        1px solid
        rgba(255,255,255,.1);

      background:
        #111114;

    }


    .syx-showcase-editor-header h3 {

      margin:
        0;

      color:
        white;

      font-family:
        sans-serif;

      font-size:
        24px;

    }


    .syx-showcase-editor-content {

      padding:
        22px;

      overflow-y:
        auto;

      max-height:
        calc(100vh - 130px);

    }


    .syx-showcase-image-note {

      margin:
        -5px 0 18px;

      color:
        rgba(255,255,255,.3);

      font-size:
        10px;

      line-height:
        1.5;

    }


    /* =====================================
       MOBILE
       ===================================== */

    @media (max-width: 700px) {

      .syx-admin-window {

        width:
          calc(100vw - 16px);

        max-height:
          calc(100vh - 16px);

      }


      .syx-admin-content {

        padding:
          16px;

        max-height:
          calc(100vh - 145px);

      }


      .syx-showcase-toolbar {

        align-items:
          flex-start;

        flex-direction:
          column;

      }


      .syx-showcase-admin-card {

        grid-template-columns:
          28px 80px 1fr;

      }


      .syx-showcase-admin-preview {

        width:
          80px;

        height:
          55px;

      }


      .syx-showcase-admin-controls {

        grid-column:
          2 / -1;

        justify-content:
          flex-start;

        max-width:
          none;

      }


      .syx-showcase-admin-description {

        display:
          none;

      }

    }

  `;


  document.head.appendChild(
    style
  );
}


// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    loadSiteSettings();

    loadShowcase();

    loadGdLevels();

  }
);
