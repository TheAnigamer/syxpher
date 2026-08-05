// ==========================================
// UTC CLOCK
// ==========================================

(() => {
  const clock = document.getElementById('utc-clock');

  if (!clock) return;

  const updateClock = () => {
    const now = new Date();

    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    clock.textContent = `${time} · UTC`;
  };

  updateClock();
  window.setInterval(updateClock, 1000);
})();


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
  return sessionStorage.getItem('adminToken');
}


function isAdminAuthenticated() {
  return Boolean(
    sessionStorage.getItem('adminAuthenticated') &&
    getAdminToken()
  );
}


// ==========================================
// ADMIN API
// ==========================================

async function adminFetch(url, options = {}) {
  const token = getAdminToken();

  if (!token) {
    throw new Error('You are not authenticated.');
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  return fetch(url, {
    ...options,
    headers
  });
}


// ==========================================
// AUTHENTICATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const lock = document.getElementById('admin-lock');

  if (!lock) return;

  if (isAdminAuthenticated()) {
    lock.textContent = '🔓';
    lock.title = 'Admin Mode Enabled';

    createAdminPanel();
  }

  lock.addEventListener('click', async () => {
    if (isAdminAuthenticated()) {
      openAdminPanel();
      return;
    }

    const code = prompt('Enter your Authenticator code:');

    if (!code) return;

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code.trim()
        })
      });

      const result = await response.json();

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

        lock.textContent = '🔓';
        lock.title = 'Admin Mode Enabled';

        createAdminPanel();

        alert('Admin mode enabled.');

        openAdminPanel();
      } else {
        alert('Invalid Authenticator code.');
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
  });
});


// ==========================================
// LOAD PUBLIC SITE SETTINGS
// ==========================================

async function loadSiteSettings() {
  try {
    const response = await fetch(
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

    const settings = await response.json();

    if (
      !settings ||
      typeof settings !== 'object'
    ) {
      throw new Error(
        'Invalid settings response'
      );
    }

    siteSettings = settings;

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
  // ----------------------------------------
  // HERO
  // ----------------------------------------

  const heroTitle =
    document.querySelector('h1.font-heading');

  if (heroTitle) {
    const spans =
      heroTitle.querySelectorAll(':scope > span');

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


  // ----------------------------------------
  // STREAM
  // ----------------------------------------

  const stream =
    document.getElementById('stream');

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
      stream.querySelector('h2.font-heading');

    if (title) {
      const spans =
        title.querySelectorAll(
          ':scope > span'
        );

      const textNodes =
        Array.from(title.childNodes)
          .filter(
            node =>
              node.nodeType === Node.TEXT_NODE &&
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


  // ----------------------------------------
  // ARCHIVE
  // ----------------------------------------

  const archive =
    document.getElementById('archive');

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
      archive.querySelector('h2.font-heading');

    if (title) {
      const spans =
        title.querySelectorAll(
          ':scope > span'
        );

      const textNodes =
        Array.from(title.childNodes)
          .filter(
            node =>
              node.nodeType === Node.TEXT_NODE &&
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


  // ----------------------------------------
  // CONTACT
  // ----------------------------------------

  const contact =
    document.getElementById('contact');

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
      contact.querySelector('h2.font-heading');

    if (title) {
      const spans =
        title.querySelectorAll(
          ':scope > span'
        );

      const textNodes =
        Array.from(title.childNodes)
          .filter(
            node =>
              node.nodeType === Node.TEXT_NODE &&
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


  // ----------------------------------------
  // FOOTER
  // ----------------------------------------

  const footer =
    document.querySelector('footer');

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
      footer.querySelectorAll('a.group');

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

    showcaseItems = items;

    renderPublicShowcase(items);

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

function renderPublicShowcase(items) {
  const stream =
    document.getElementById('stream');

  if (!stream) return;

  const articles =
    stream.querySelectorAll('article');

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

  items.forEach((item, index) => {
    const article =
      document.createElement('article');

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

    container.appendChild(article);
  });

  console.log(
    `Loaded ${items.length} showcase items from D1.`
  );
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
    document.createElement('div');

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
          Showcase Editor
        </button>

      </div>


      <div class="syx-admin-content">

        <!-- ================================= -->
        <!-- SITE EDITOR TAB -->
        <!-- ================================= -->

        <div
          id="syx-admin-tab-site"
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

        </div>


        <!-- ================================= -->
        <!-- SHOWCASE EDITOR TAB -->
        <!-- ================================= -->

        <div
          id="syx-admin-tab-showcase"
          class="syx-admin-tab-content"
        >

          <div class="syx-showcase-toolbar">

            <div>
              <div class="syx-admin-section-title">
                Showcase Items
              </div>

              <div class="syx-showcase-help">
                Add, edit, delete, or reorder the projects
                shown on your site.
              </div>
            </div>

            <button
              type="button"
              id="syx-showcase-add"
              class="syx-admin-save"
            >
              + Add Project
            </button>

          </div>


          <div
            id="syx-showcase-list"
            class="syx-showcase-list"
          ></div>


          <div
            id="syx-showcase-empty"
            class="syx-showcase-empty"
          >
            No showcase items found.
          </div>


          <div
            id="syx-showcase-status"
            class="syx-admin-status"
          ></div>

        </div>


        <!-- ================================= -->
        <!-- LOGOUT -->
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


    <!-- ===================================== -->
    <!-- SHOWCASE EDITOR MODAL -->
    <!-- ===================================== -->

    <div
      id="syx-showcase-editor"
      class="syx-showcase-editor"
    >

      <div class="syx-showcase-editor-box">

        <div class="syx-showcase-editor-header">

          <div>
            <div class="syx-admin-kicker">
              SHOWCASE
            </div>

            <h3 id="syx-showcase-editor-title">
              Add Project
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

          <input
            id="showcase-edit-id"
            type="hidden"
          >

          <label>
            Title
            <input
              id="showcase-title"
              type="text"
              placeholder="Project title"
            >
          </label>

          <label>
            Category
            <input
              id="showcase-category"
              type="text"
              placeholder="Motion Graphics"
            >
          </label>

          <label>
            Description
            <textarea
              id="showcase-description"
              rows="5"
              placeholder="Project description"
            ></textarea>
          </label>

          <label>
            Image URL
            <input
              id="showcase-image"
              type="text"
              placeholder="./assets/example.jpg"
            >
          </label>

          <label>
            Project Link
            <input
              id="showcase-link"
              type="url"
              placeholder="https://example.com"
            >
          </label>


          <div class="syx-admin-actions">

            <button
              type="button"
              id="syx-showcase-save"
              class="syx-admin-save"
            >
              Save Project
            </button>

            <button
              type="button"
              id="syx-showcase-cancel"
              class="syx-admin-secondary"
            >
              Cancel
            </button>

          </div>


          <div
            id="syx-showcase-editor-status"
            class="syx-admin-status"
          ></div>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(panel);

  injectAdminStyles();

  // ----------------------------------------
  // CLOSE
  // ----------------------------------------

  document
    .getElementById('syx-admin-close')
    .addEventListener(
      'click',
      closeAdminPanel
    );

  document
    .getElementById('syx-admin-overlay')
    .addEventListener(
      'click',
      closeAdminPanel
    );


  // ----------------------------------------
  // TABS
  // ----------------------------------------

  document
    .querySelectorAll('.syx-admin-tab')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          switchAdminTab(
            button.dataset.adminTab
          );
        }
      );
    });


  // ----------------------------------------
  // SITE SAVE
  // ----------------------------------------

  document
    .getElementById('syx-admin-save')
    .addEventListener(
      'click',
      saveSiteSettings
    );


  // ----------------------------------------
  // LOGOUT
  // ----------------------------------------

  document
    .getElementById('syx-admin-logout')
    .addEventListener(
      'click',
      logoutAdmin
    );


  // ----------------------------------------
  // ADD SHOWCASE
  // ----------------------------------------

  document
    .getElementById('syx-showcase-add')
    .addEventListener(
      'click',
      () => {
        openShowcaseEditor();
      }
    );


  // ----------------------------------------
  // SHOWCASE MODAL
  // ----------------------------------------

  document
    .getElementById('syx-showcase-editor-close')
    .addEventListener(
      'click',
      closeShowcaseEditor
    );

  document
    .getElementById('syx-showcase-cancel')
    .addEventListener(
      'click',
      closeShowcaseEditor
    );

  document
    .getElementById('syx-showcase-save')
    .addEventListener(
      'click',
      saveShowcaseItem
    );


  populateAdminFields();
}


// ==========================================
// ADMIN TAB SWITCHING
// ==========================================

function switchAdminTab(tab) {
  document
    .querySelectorAll('.syx-admin-tab')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.adminTab === tab
      );
    });

  document
    .querySelectorAll('.syx-admin-tab-content')
    .forEach(content => {
      content.classList.remove('active');
    });

  const selected =
    document.getElementById(
      `syx-admin-tab-${tab}`
    );

  if (selected) {
    selected.classList.add('active');
  }

  if (tab === 'showcase') {
    loadAdminShowcase();
  }
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
    panel.classList.add('open');
  }

  switchAdminTab('site');
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
    panel.classList.remove('open');
  }

  closeShowcaseEditor();
}


// ==========================================
// POPULATE ADMIN FIELDS
// ==========================================

function populateAdminFields() {
  Object.entries(siteSettings).forEach(
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

  if (!button) return;

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

  button.disabled = true;
  button.textContent =
    'Saving...';

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
      if (response.status === 401) {
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

    siteSettings = {
      ...siteSettings,
      ...data
    };

    applySiteSettings();

    showAdminStatus(
      'Changes saved successfully.',
      'success'
    );

  } catch (error) {
    console.error(error);

    showAdminStatus(
      error.message,
      'error'
    );

  } finally {
    button.disabled = false;
    button.textContent =
      'Save Site Changes';
  }
}


// ==========================================
// SHOW ADMIN STATUS
// ==========================================

function showAdminStatus(
  message,
  type = ''
) {
  const status =
    document.getElementById(
      'syx-admin-status'
    );

  if (!status) return;

  status.textContent =
    message;

  status.className =
    `syx-admin-status ${type}`;
}


// ==========================================
// LOAD ADMIN SHOWCASE
// ==========================================

async function loadAdminShowcase() {
  const list =
    document.getElementById(
      'syx-showcase-list'
    );

  const empty =
    document.getElementById(
      'syx-showcase-empty'
    );

  if (!list) return;

  list.innerHTML =
    '<div class="syx-showcase-loading">Loading showcase...</div>';

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
      if (response.status === 401) {
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

    showcaseItems =
      Array.isArray(result)
        ? result
        : [];

    renderAdminShowcase();

  } catch (error) {
    console.error(error);

    list.innerHTML = `
      <div class="syx-showcase-error">
        ${escapeHtml(error.message)}
      </div>
    `;

    if (empty) {
      empty.style.display =
        'none';
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

  const empty =
    document.getElementById(
      'syx-showcase-empty'
    );

  if (!list) return;

  list.innerHTML = '';

  if (!showcaseItems.length) {
    if (empty) {
      empty.style.display =
        'block';
    }

    return;
  }

  if (empty) {
    empty.style.display =
      'none';
  }

  showcaseItems.forEach(
    (item, index) => {
      const row =
        document.createElement('div');

      row.className =
        'syx-showcase-item';

      row.dataset.id =
        item.id;

      const image =
        item.image ||
        './assets/embedded-image-2.jpg';

      row.innerHTML = `
        <div class="syx-showcase-number">
          ${String(index + 1).padStart(2, '0')}
        </div>

        <img
          class="syx-showcase-thumb"
          src="${escapeHtml(image)}"
          alt="${escapeHtml(item.title || '')}"
          onerror="this.style.opacity='.2'"
        >

        <div class="syx-showcase-info">

          <div class="syx-showcase-title">
            ${escapeHtml(item.title || 'Untitled')}
          </div>

          <div class="syx-showcase-category">
            ${escapeHtml(item.category || '')}
          </div>

          <div class="syx-showcase-description">
            ${escapeHtml(item.description || '')}
          </div>

        </div>

        <div class="syx-showcase-controls">

          <button
            type="button"
            class="syx-move-button"
            data-action="up"
            ${index === 0 ? 'disabled' : ''}
            title="Move up"
          >
            ↑
          </button>

          <button
            type="button"
            class="syx-move-button"
            data-action="down"
            ${index === showcaseItems.length - 1 ? 'disabled' : ''}
            title="Move down"
          >
            ↓
          </button>

          <button
            type="button"
            class="syx-edit-button"
            data-action="edit"
          >
            Edit
          </button>

          <button
            type="button"
            class="syx-delete-button"
            data-action="delete"
          >
            Delete
          </button>

        </div>
      `;

      row
        .querySelectorAll('button')
        .forEach(button => {
          button.addEventListener(
            'click',
            () => {
              handleShowcaseAction(
                button.dataset.action,
                item.id
              );
            }
          );
        });

      list.appendChild(row);
    }
  );
}


// ==========================================
// SHOWCASE ACTIONS
// ==========================================

async function handleShowcaseAction(
  action,
  id
) {
  if (action === 'edit') {
    const item =
      showcaseItems.find(
        entry =>
          String(entry.id) ===
          String(id)
      );

    if (item) {
      openShowcaseEditor(item);
    }

    return;
  }

  if (action === 'delete') {
    await deleteShowcaseItem(id);
    return;
  }

  if (action === 'up') {
    await moveShowcaseItem(
      id,
      -1
    );

    return;
  }

  if (action === 'down') {
    await moveShowcaseItem(
      id,
      1
    );
  }
}


// ==========================================
// OPEN SHOWCASE EDITOR
// ==========================================

function openShowcaseEditor(item = null) {
  const editor =
    document.getElementById(
      'syx-showcase-editor'
    );

  if (!editor) return;

  const title =
    document.getElementById(
      'syx-showcase-editor-title'
    );

  const idInput =
    document.getElementById(
      'showcase-edit-id'
    );

  const titleInput =
    document.getElementById(
      'showcase-title'
    );

  const categoryInput =
    document.getElementById(
      'showcase-category'
    );

  const descriptionInput =
    document.getElementById(
      'showcase-description'
    );

  const imageInput =
    document.getElementById(
      'showcase-image'
    );

  const linkInput =
    document.getElementById(
      'showcase-link'
    );

  const status =
    document.getElementById(
      'syx-showcase-editor-status'
    );

  if (item) {
    title.textContent =
      'Edit Project';

    idInput.value =
      item.id;

    titleInput.value =
      item.title || '';

    categoryInput.value =
      item.category || '';

    descriptionInput.value =
      item.description || '';

    imageInput.value =
      item.image || '';

    linkInput.value =
      item.link || '';

  } else {
    title.textContent =
      'Add Project';

    idInput.value =
      '';

    titleInput.value =
      '';

    categoryInput.value =
      '';

    descriptionInput.value =
      '';

    imageInput.value =
      '';

    linkInput.value =
      '';
  }

  if (status) {
    status.textContent =
      '';

    status.className =
      'syx-admin-status';
  }

  editor.classList.add('open');

  setTimeout(() => {
    titleInput.focus();
  }, 50);
}


// ==========================================
// CLOSE SHOWCASE EDITOR
// ==========================================

function closeShowcaseEditor() {
  const editor =
    document.getElementById(
      'syx-showcase-editor'
    );

  if (editor) {
    editor.classList.remove(
      'open'
    );
  }
}


// ==========================================
// SAVE SHOWCASE ITEM
// ==========================================

async function saveShowcaseItem() {
  const saveButton =
    document.getElementById(
      'syx-showcase-save'
    );

  const status =
    document.getElementById(
      'syx-showcase-editor-status'
    );

  const id =
    document.getElementById(
      'showcase-edit-id'
    ).value;

  const title =
    document.getElementById(
      'showcase-title'
    ).value.trim();

  const category =
    document.getElementById(
      'showcase-category'
    ).value.trim();

  const description =
    document.getElementById(
      'showcase-description'
    ).value.trim();

  const image =
    document.getElementById(
      'showcase-image'
    ).value.trim();

  const link =
    document.getElementById(
      'showcase-link'
    ).value.trim();

  if (!title) {
    status.textContent =
      'Title is required.';

    status.className =
      'syx-admin-status error';

    return;
  }

  const data = {
    title,
    category,
    description,
    image,
    link
  };

  saveButton.disabled =
    true;

  saveButton.textContent =
    'Saving...';

  status.textContent =
    '';

  try {
    let response;

    if (id) {
      response =
        await adminFetch(
          `/api/admin/showcase/${encodeURIComponent(id)}`,
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
              JSON.stringify(data)
          }
        );
    }

    const result =
      await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }

      throw new Error(
        result.error ||
        'Could not save project.'
      );
    }

    closeShowcaseEditor();

    await loadAdminShowcase();

    await loadShowcase();

    showShowcaseStatus(
      id
        ? 'Project updated successfully.'
        : 'Project added successfully.',
      'success'
    );

  } catch (error) {
    console.error(error);

    status.textContent =
      error.message;

    status.className =
      'syx-admin-status error';

  } finally {
    saveButton.disabled =
      false;

    saveButton.textContent =
      'Save Project';
  }
}


// ==========================================
// DELETE SHOWCASE ITEM
// ==========================================

async function deleteShowcaseItem(id) {
  const item =
    showcaseItems.find(
      entry =>
        String(entry.id) ===
        String(id)
    );

  const name =
    item?.title ||
    'this project';

  const confirmed =
    confirm(
      `Delete "${name}"?\n\nThis cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await adminFetch(
        `/api/admin/showcase/${encodeURIComponent(id)}`,
        {
          method: 'DELETE'
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }

      throw new Error(
        result.error ||
        'Could not delete project.'
      );
    }

    await loadAdminShowcase();

    await loadShowcase();

    showShowcaseStatus(
      'Project deleted successfully.',
      'success'
    );

  } catch (error) {
    console.error(error);

    showShowcaseStatus(
      error.message,
      'error'
    );
  }
}


// ==========================================
// MOVE SHOWCASE ITEM
// ==========================================

async function moveShowcaseItem(
  id,
  direction
) {
  const index =
    showcaseItems.findIndex(
      item =>
        String(item.id) ===
        String(id)
    );

  if (index === -1) return;

  const newIndex =
    index + direction;

  if (
    newIndex < 0 ||
    newIndex >= showcaseItems.length
  ) {
    return;
  }

  const reordered =
    [...showcaseItems];

  const current =
    reordered[index];

  reordered[index] =
    reordered[newIndex];

  reordered[newIndex] =
    current;

  const ids =
    reordered.map(
      item => item.id
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
      if (response.status === 401) {
        logoutAdmin();

        throw new Error(
          'Admin session expired.'
        );
      }

      throw new Error(
        result.error ||
        'Could not reorder projects.'
      );
    }

    showcaseItems =
      reordered;

    renderAdminShowcase();

    await loadShowcase();

    showShowcaseStatus(
      'Showcase order updated.',
      'success'
    );

  } catch (error) {
    console.error(error);

    showShowcaseStatus(
      error.message,
      'error'
    );
  }
}


// ==========================================
// SHOWCASE STATUS
// ==========================================

function showShowcaseStatus(
  message,
  type = ''
) {
  const status =
    document.getElementById(
      'syx-showcase-status'
    );

  if (!status) return;

  status.textContent =
    message;

  status.className =
    `syx-admin-status ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      if (
        status.textContent ===
        message
      ) {
        status.textContent =
          '';
      }
    }, 3000);
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
    document.createElement('style');

  style.id =
    'syx-admin-styles';

  style.textContent = `
    /* =====================================
       ADMIN ROOT
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


    /* =====================================
       OVERLAY
       ===================================== */

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


    /* =====================================
       MAIN WINDOW
       ===================================== */

    .syx-admin-window {
      position: absolute;
      top: 50%;
      left: 50%;
      width: min(900px, calc(100vw - 30px));
      max-height: calc(100vh - 30px);
      transform: translate(-50%, -46%);
      opacity: 0;
      overflow: hidden;
      background: #0d0d0f;
      border: 1px solid rgba(255, 158, 0, .35);
      box-shadow:
        0 30px 100px rgba(0,0,0,.65);
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


    /* =====================================
       HEADER
       ===================================== */

    .syx-admin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 22px 24px;
      border-bottom:
        1px solid rgba(255,255,255,.1);
      background: #111114;
    }

    .syx-admin-kicker {
      color: #00f5ff;
      font-size: 10px;
      letter-spacing: .2em;
      margin-bottom: 6px;
    }

    .syx-admin-header h2,
    .syx-showcase-editor-header h3 {
      margin: 0;
      color: white;
      font-family: sans-serif;
      font-size: 28px;
    }

    .syx-showcase-editor-header h3 {
      font-size: 22px;
    }

    .syx-admin-close {
      width: 38px;
      height: 38px;
      border:
        1px solid rgba(255,255,255,.15);
      background: transparent;
      color: rgba(255,255,255,.6);
      font-size: 25px;
      cursor: pointer;
    }

    .syx-admin-close:hover {
      color: #ff9e00;
      border-color: #ff9e00;
    }


    /* =====================================
       TABS
       ===================================== */

    .syx-admin-tabs {
      display: flex;
      border-bottom:
        1px solid rgba(255,255,255,.1);
      background: #0a0a0c;
    }

    .syx-admin-tab {
      flex: 1;
      padding: 15px 18px;
      border: 0;
      border-right:
        1px solid rgba(255,255,255,.08);
      background: transparent;
      color: rgba(255,255,255,.45);
      cursor: pointer;
      font-family: monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .1em;
      transition:
        color .2s ease,
        background .2s ease;
    }

    .syx-admin-tab:hover {
      color: white;
      background: #111114;
    }

    .syx-admin-tab.active {
      color: #ff9e00;
      background: #151518;
      box-shadow:
        inset 0 -2px 0 #ff9e00;
    }


    /* =====================================
       CONTENT
       ===================================== */

    .syx-admin-content {
      padding: 24px;
      overflow-y: auto;
      max-height:
        calc(100vh - 170px);
    }

    .syx-admin-tab-content {
      display: none;
    }

    .syx-admin-tab-content.active {
      display: block;
    }


    /* =====================================
       SECTIONS
       ===================================== */

    .syx-admin-section {
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom:
        1px solid rgba(255,255,255,.08);
    }

    .syx-admin-section-title {
      color: #ff9e00;
      font-size: 12px;
      letter-spacing: .18em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }

    .syx-admin-section label,
    .syx-showcase-editor-content label {
      display: block;
      margin-bottom: 15px;
      color: rgba(255,255,255,.55);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .syx-admin-section input,
    .syx-admin-section textarea,
    .syx-showcase-editor-content input,
    .syx-showcase-editor-content textarea {
      display: block;
      box-sizing: border-box;
      width: 100%;
      margin-top: 7px;
      padding: 11px 12px;
      border:
        1px solid rgba(255,255,255,.12);
      outline: none;
      background: #151518;
      color: white;
      font: inherit;
      font-size: 13px;
    }

    .syx-admin-section textarea,
    .syx-showcase-editor-content textarea {
      resize: vertical;
      min-height: 80px;
    }

    .syx-admin-section input:focus,
    .syx-admin-section textarea:focus,
    .syx-showcase-editor-content input:focus,
    .syx-showcase-editor-content textarea:focus {
      border-color: #ff9e00;
    }


    /* =====================================
       BUTTONS
       ===================================== */

    .syx-admin-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .syx-admin-actions button,
    .syx-showcase-toolbar button {
      border: 1px solid;
      padding: 13px 18px;
      cursor: pointer;
      font: inherit;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 11px;
    }

    .syx-admin-save {
      border-color: #ff9e00 !important;
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
      border:
        1px solid rgba(255,255,255,.15);
      background: transparent;
      color: rgba(255,255,255,.65);
      padding: 13px 18px;
      cursor: pointer;
      font: inherit;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 11px;
    }

    .syx-admin-secondary:hover {
      color: white;
      border-color:
        rgba(255,255,255,.4);
    }


    /* =====================================
       STATUS
       ===================================== */

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


    /* =====================================
       SHOWCASE TOOLBAR
       ===================================== */

    .syx-showcase-toolbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 20px;
      padding-bottom: 18px;
      border-bottom:
        1px solid rgba(255,255,255,.08);
    }

    .syx-showcase-toolbar
    .syx-admin-section-title {
      margin-bottom: 6px;
    }

    .syx-showcase-help {
      color: rgba(255,255,255,.4);
      font-size: 11px;
      line-height: 1.6;
      max-width: 450px;
    }


    /* =====================================
       SHOWCASE LIST
       ===================================== */

    .syx-showcase-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .syx-showcase-item {
      display: grid;
      grid-template-columns:
        34px 72px 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 12px;
      border:
        1px solid rgba(255,255,255,.08);
      background: #111114;
      transition:
        border-color .2s ease,
        background .2s ease;
    }

    .syx-showcase-item:hover {
      border-color:
        rgba(255,158,0,.3);
      background: #151518;
    }

    .syx-showcase-number {
      color: #ff9e00;
      font-size: 11px;
      text-align: center;
    }

    .syx-showcase-thumb {
      width: 72px;
      height: 48px;
      object-fit: cover;
      background: #09090a;
      border:
        1px solid rgba(255,255,255,.1);
    }

    .syx-showcase-info {
      min-width: 0;
    }

    .syx-showcase-title {
      color: white;
      font-family: sans-serif;
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .syx-showcase-category {
      color: #ff9e00;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 5px;
    }

    .syx-showcase-description {
      color: rgba(255,255,255,.35);
      font-size: 10px;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .syx-showcase-controls {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .syx-showcase-controls button {
      border:
        1px solid rgba(255,255,255,.12);
      background: transparent;
      color: rgba(255,255,255,.6);
      padding: 8px 9px;
      cursor: pointer;
      font-family: monospace;
      font-size: 10px;
      text-transform: uppercase;
    }

    .syx-showcase-controls button:hover {
      color: white;
      border-color:
        rgba(255,255,255,.35);
    }

    .syx-showcase-controls
    .syx-move-button:hover {
      color: #ff9e00;
      border-color: #ff9e00;
    }

    .syx-showcase-controls
    .syx-move-button:disabled {
      opacity: .2;
      cursor: not-allowed;
    }

    .syx-showcase-controls
    .syx-edit-button:hover {
      color: #00f5ff;
      border-color: #00f5ff;
    }

    .syx-showcase-controls
    .syx-delete-button:hover {
      color: #ff5c5c;
      border-color: #ff5c5c;
    }

    .syx-showcase-empty,
    .syx-showcase-loading,
    .syx-showcase-error {
      padding: 35px 20px;
      text-align: center;
      color: rgba(255,255,255,.35);
      border:
        1px dashed rgba(255,255,255,.1);
      font-size: 11px;
    }

    .syx-showcase-error {
      color: #ff5c5c;
    }


    /* =====================================
       BOTTOM ACTIONS
       ===================================== */

    .syx-admin-bottom-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 25px;
      padding-top: 20px;
      border-top:
        1px solid rgba(255,255,255,.08);
    }


    /* =====================================
       SHOWCASE EDITOR MODAL
       ===================================== */

    .syx-showcase-editor {
      position: fixed;
      inset: 0;
      z-index: 100001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0,0,0,.75);
      backdrop-filter: blur(8px);
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
    }

    .syx-showcase-editor.open {
      opacity: 1;
      pointer-events: auto;
    }

    .syx-showcase-editor-box {
      width: min(620px, 100%);
      max-height: 90vh;
      overflow-y: auto;
      background: #0d0d0f;
      border:
        1px solid rgba(255,158,0,.35);
      box-shadow:
        0 30px 100px rgba(0,0,0,.7);
      transform: translateY(15px);
      transition: transform .2s ease;
    }

    .syx-showcase-editor.open
    .syx-showcase-editor-box {
      transform: translateY(0);
    }

    .syx-showcase-editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 22px;
      border-bottom:
        1px solid rgba(255,255,255,.1);
      background: #111114;
    }

    .syx-showcase-editor-content {
      padding: 22px;
    }


    /* =====================================
       MOBILE
       ===================================== */

    @media (max-width: 700px) {

      .syx-admin-content {
        padding: 18px;
      }

      .syx-admin-header {
        padding: 18px;
      }

      .syx-admin-header h2 {
        font-size: 22px;
      }

      .syx-showcase-toolbar {
        flex-direction: column;
      }

      .syx-showcase-toolbar button {
        width: 100%;
      }

      .syx-showcase-item {
        grid-template-columns:
          28px 55px 1fr;
      }

      .syx-showcase-thumb {
        width: 55px;
        height: 40px;
      }

      .syx-showcase-controls {
        grid-column: 1 / -1;
        justify-content: flex-end;
        padding-top: 8px;
        border-top:
          1px solid rgba(255,255,255,.06);
      }

      .syx-showcase-description {
        display: none;
      }

      .syx-admin-tab {
        padding: 13px 8px;
        font-size: 9px;
      }
    }
  `;

  document.head.appendChild(style);
}


// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener(
  'DOMContentLoaded',
  () => {
    loadSiteSettings();
    loadShowcase();
  }
);
