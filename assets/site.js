// ==========================================
// SYXPHER SITE JS
// ==========================================


// ==========================================
// LOADING SCREEN
// ==========================================

(() => {
  const loadingScreen = document.createElement('div');

  loadingScreen.id = 'syx-loading-screen';

  loadingScreen.innerHTML = `
    <div class="syx-loading-inner">
      <div class="syx-loading-logo">
        SYXPHER
      </div>

      <div class="syx-loading-line">
        <div class="syx-loading-progress"></div>
      </div>

      <div class="syx-loading-status">
        INITIALIZING...
      </div>
    </div>
  `;

  const style = document.createElement('style');

  style.id = 'syx-loading-styles';

  style.textContent = `
    #syx-loading-screen {
      position: fixed;
      inset: 0;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0A0A0B;
      color: white;
      opacity: 1;
      visibility: visible;
      transition:
        opacity .5s ease,
        visibility .5s ease;
    }

    #syx-loading-screen.syx-loading-hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .syx-loading-inner {
      width: min(420px, calc(100vw - 50px));
      text-align: center;
    }

    .syx-loading-logo {
      margin-bottom: 24px;
      color: white;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: .18em;
    }

    .syx-loading-line {
      position: relative;
      width: 100%;
      height: 2px;
      overflow: hidden;
      background: rgba(255,255,255,.12);
    }

    .syx-loading-progress {
      width: 35%;
      height: 100%;
      background: #FF9E00;
      box-shadow:
        0 0 12px rgba(255,158,0,.7);
      animation:
        syxLoadingProgress
        1.2s
        ease-in-out
        infinite;
    }

    .syx-loading-status {
      margin-top: 14px;
      color: rgba(255,255,255,.4);
      font-family: monospace;
      font-size: 10px;
      letter-spacing: .18em;
    }

    @keyframes syxLoadingProgress {
      0% {
        transform: translateX(-130%);
      }

      50% {
        transform: translateX(170%);
      }

      100% {
        transform: translateX(300%);
      }
    }
  `;

  document.head.appendChild(style);
  document.documentElement.appendChild(loadingScreen);

  window.syxHideLoadingScreen = () => {
    const screen =
      document.getElementById(
        'syx-loading-screen'
      );

    if (!screen) return;

    screen.classList.add(
      'syx-loading-hidden'
    );

    window.setTimeout(() => {
      screen.remove();

      const loadingStyles =
        document.getElementById(
          'syx-loading-styles'
        );

      if (loadingStyles) {
        loadingStyles.remove();
      }
    }, 600);
  };
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
// GLOBAL STATE
// ==========================================

let siteSettings = {};


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


      <div class="syx-admin-content">

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
            Footer
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

          <button
            type="button"
            id="syx-admin-logout"
            class="syx-admin-secondary"
          >
            Log Out
          </button>

        </div>


        <div
          id="syx-admin-status"
          class="syx-admin-status"
        ></div>

      </div>
    </div>
  `;

  document.body.appendChild(
    panel
  );

  injectAdminStyles();

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

  document
    .getElementById(
      'syx-admin-save'
    )
    .addEventListener(
      'click',
      saveSiteSettings
    );

  document
    .getElementById(
      'syx-admin-logout'
    )
    .addEventListener(
      'click',
      logoutAdmin
    );

  populateAdminFields();
}


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
  }
}


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
      'syx-admin-status'
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

  for (const key of keys) {

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
            JSON.stringify(data)
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

    console.error(error);

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
      background: rgba(0, 0, 0, .78);
      backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity .2s ease;
    }

    #syxpher-admin-panel.open
    .syx-admin-overlay {
      opacity: 1;
    }

    .syx-admin-window {
      position: absolute;
      top: 50%;
      left: 50%;
      width: min(760px, calc(100vw - 30px));
      max-height: calc(100vh - 30px);
      transform:
        translate(-50%, -46%);
      opacity: 0;
      overflow: hidden;
      background: #0d0d0f;
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
      padding: 22px 24px;
      border-bottom:
        1px solid
        rgba(255,255,255,.1);
      background: #111114;
    }

    .syx-admin-kicker {
      color: #00f5ff;
      font-size: 10px;
      letter-spacing: .2em;
      margin-bottom: 6px;
    }

    .syx-admin-header h2 {
      margin: 0;
      color: white;
      font-family: sans-serif;
      font-size: 28px;
    }

    .syx-admin-close {
      width: 38px;
      height: 38px;
      border:
        1px solid
        rgba(255,255,255,.15);
      background: transparent;
      color:
        rgba(255,255,255,.6);
      font-size: 25px;
      cursor: pointer;
    }

    .syx-admin-close:hover {
      color: #ff9e00;
      border-color: #ff9e00;
    }

    .syx-admin-content {
      padding: 24px;
      overflow-y: auto;
      max-height:
        calc(100vh - 110px);
    }

    .syx-admin-section {
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom:
        1px solid
        rgba(255,255,255,.08);
    }

    .syx-admin-section-title {
      color: #ff9e00;
      font-size: 12px;
      letter-spacing: .18em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }

    .syx-admin-section label {
      display: block;
      margin-bottom: 15px;
      color:
        rgba(255,255,255,.55);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .syx-admin-section input,
    .syx-admin-section textarea {
      display: block;
      box-sizing: border-box;
      width: 100%;
      margin-top: 7px;
      padding: 11px 12px;
      border:
        1px solid
        rgba(255,255,255,.12);
      outline: none;
      background: #151518;
      color: white;
      font: inherit;
      font-size: 13px;
    }

    .syx-admin-section textarea {
      resize: vertical;
      min-height: 80px;
    }

    .syx-admin-section input:focus,
    .syx-admin-section textarea:focus {
      border-color: #ff9e00;
    }

    .syx-admin-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .syx-admin-actions button {
      border: 1px solid;
      padding: 13px 18px;
      cursor: pointer;
      font: inherit;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 11px;
    }

    .syx-admin-save {
      border-color:
        #ff9e00 !important;
      background: #ff9e00;
      color: #0a0a0b;
    }

    .syx-admin-save:hover {
      background: #ffb133;
    }

    .syx-admin-save:disabled {
      opacity: .6;
      cursor: wait;
    }

    .syx-admin-secondary {
      border-color:
        rgba(255,255,255,.15);
      background: transparent;
      color:
        rgba(255,255,255,.65);
    }

    .syx-admin-secondary:hover {
      color: white;
      border-color:
        rgba(255,255,255,.4);
    }

    .syx-admin-status {
      min-height: 20px;
      margin-top: 14px;
      font-size: 11px;
    }

    .syx-admin-status.success {
      color: #00f5ff;
    }

    .syx-admin-status.error {
      color: #ff5c5c;
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
  async () => {

    /*
     * Load both major pieces of
     * dynamic site content before
     * removing the loading screen.
     */
    await Promise.all([
      loadSiteSettings(),
      loadShowcase()
    ]);

    /*
     * Give the browser one frame to
     * render the loaded content before
     * fading out the loading screen.
     */
    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        if (
          typeof window.syxHideLoadingScreen ===
          'function'
        ) {
          window.syxHideLoadingScreen();
        }

      });

    });
  }
);


// ==========================================
// LOADING SCREEN SAFETY FALLBACK
// ==========================================

/*
 * If an API ever hangs or the site has
 * another unexpected loading problem, do
 * not leave visitors stuck forever.
 */
window.setTimeout(() => {

  if (
    typeof window.syxHideLoadingScreen ===
    'function'
  ) {
    window.syxHideLoadingScreen();
  }

}, 10000);
