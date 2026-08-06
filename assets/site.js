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
        transition:
          opacity 0.7s ease,
          visibility 0.7s ease;
      }

      #syx-loading-screen.complete {
        opacity: 0;
        visibility: hidden;
      }

      .syx-loading-inner {
        width:
          min(320px, calc(100vw - 40px));

        text-align:
          center;
      }

      .syx-loading-logo {
        color:
          white;

        font-family:
          sans-serif;

        font-weight:
          700;

        font-size:
          24px;

        letter-spacing:
          0.25em;

        margin-bottom:
          8px;
      }

      .syx-loading-status {
        color:
          #00f5ff;

        font-size:
          10px;

        letter-spacing:
          0.2em;

        margin-bottom:
          24px;
      }

      .syx-loading-bar {
        width:
          100%;

        height:
          2px;

        background:
          rgba(255,255,255,0.1);

        overflow:
          hidden;

        position:
          relative;

        margin-bottom:
          12px;
      }

      .syx-loading-progress {
        position:
          absolute;

        top:
          0;

        left:
          0;

        bottom:
          0;

        width:
          0%;

        background:
          #ff9e00;

        transition:
          width 0.1s linear;
      }

      .syx-loading-percent {
        color:
          rgba(255,255,255,0.4);

        font-size:
          11px;

        letter-spacing:
          0.1em;
      }
    `;

    document.head.appendChild(style);
  }

  createLoadingScreen();

  window.addEventListener(
    "load",
    () => {
      finishLoadingScreen();
    }
  );
})();


// ==========================================
// UTC CLOCK
// ==========================================

(() => {
  const clock =
    document.getElementById('utc-clock');

  if (!clock) return;

  const updateClock = () => {
    const now = new Date();

    const time =
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

    clock.textContent =
      `${time} · UTC`;
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
// SHOWCASE LAYOUT
// ==========================================

function getShowcaseLayout() {
  return (
    siteSettings.showcase_layout ||
    'list'
  );
}


function applyShowcaseLayout() {

  const stream =
    document.getElementById(
      'stream'
    );

  if (!stream) return;

  const articles =
    stream.querySelectorAll(
      'article'
    );

  if (!articles.length) return;

  const container =
    articles[0].parentElement;

  if (!container) return;

  container.classList.remove(
    'syx-showcase-grid'
  );

  container.classList.remove(
    'syx-showcase-list'
  );

  if (
    getShowcaseLayout() ===
    'grid'
  ) {
    container.classList.add(
      'syx-showcase-grid'
    );
  } else {
    container.classList.add(
      'syx-showcase-list'
    );
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
          'group relative overflow-hidden cursor-pointer bg-[#111]';

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

    applyShowcaseLayout();

    console.log(
      `Loaded ${items.length} showcase items from D1.`
    );

  } catch (error) {

    console.error(
      'Showcase loading failed:',
      error
    );
  }
}


// ==========================================
// ADMIN PANEL
// ==========================================

/*
 * The rest of the file contains the admin
 * site editor, showcase editor, layout switcher,
 * admin styles, and save/delete/reorder logic.
 *
 * Your current file is approximately 77 KB.
 */
