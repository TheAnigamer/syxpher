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
      hour12: false,
    }).format(now);

    clock.textContent = `${time} · UTC`;
  };

  updateClock();
  window.setInterval(updateClock, 1000);
})();


// ==========================================
// HELPERS
// ==========================================

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAdminToken() {
  return sessionStorage.getItem('adminToken') || '';
}

function adminHeaders(includeJson = false) {
  const headers = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAdminToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}


// ==========================================
// PUBLIC SHOWCASE LOADER
// ==========================================

async function loadPublicShowcase() {
  try {
    const response = await fetch('/api/showcase', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `Showcase API returned ${response.status}`
      );
    }

    const items = await response.json();

    if (!Array.isArray(items)) {
      throw new Error(
        'Invalid showcase API response'
      );
    }

    const stream = document.getElementById('stream');

    if (!stream) {
      console.warn(
        'Showcase stream element not found.'
      );
      return;
    }

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
        item.title || 'Untitled';

      const category =
        item.category || '';

      const description =
        item.description || '';

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

  } catch (error) {
    console.error(
      'Showcase loading failed:',
      error
    );
  }
}


// ==========================================
// ADMIN SHOWCASE PANEL
// ==========================================

let adminPanel = null;
let adminItems = [];

async function loadAdminShowcase() {
  const token = getAdminToken();

  if (!token) {
    alert('Admin session is missing. Please authenticate again.');
    return;
  }

  try {
    const response = await fetch(
      '/api/admin/showcase',
      {
        method: 'GET',
        headers: adminHeaders(),
        cache: 'no-store'
      }
    );

    if (response.status === 401) {
      sessionStorage.removeItem('adminAuthenticated');
      sessionStorage.removeItem('adminToken');

      alert('Admin session expired. Please authenticate again.');
      return;
    }

    if (!response.ok) {
      throw new Error(
        `Admin showcase API returned ${response.status}`
      );
    }

    const items = await response.json();

    if (!Array.isArray(items)) {
      throw new Error(
        'Invalid admin showcase response'
      );
    }

    adminItems = items;

    renderAdminPanel();

  } catch (error) {
    console.error(
      'Admin showcase loading failed:',
      error
    );

    alert(
      'Could not load the admin showcase.'
    );
  }
}


// ==========================================
// CREATE ADMIN PANEL
// ==========================================

function createAdminPanel() {
  if (adminPanel) return adminPanel;

  adminPanel = document.createElement('div');

  adminPanel.id = 'admin-showcase-panel';

  adminPanel.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: none;
    overflow-y: auto;
    background: rgba(5, 5, 6, 0.97);
    color: white;
    font-family: monospace;
    padding: 30px;
  `;

  document.body.appendChild(adminPanel);

  return adminPanel;
}


// ==========================================
// RENDER ADMIN PANEL
// ==========================================

function renderAdminPanel() {
  const panel = createAdminPanel();

  panel.innerHTML = `
    <div style="
      max-width: 1100px;
      margin: 0 auto;
    ">
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:20px;
        margin-bottom:30px;
        border-bottom:1px solid rgba(255,255,255,.12);
        padding-bottom:20px;
      ">
        <div>
          <div style="
            color:#00F5FF;
            font-size:12px;
            letter-spacing:.15em;
            text-transform:uppercase;
            margin-bottom:8px;
          ">
            / ADMIN MODE
          </div>

          <h2 style="
            margin:0;
            font-size:32px;
            color:white;
          ">
            Showcase Manager
          </h2>

          <div style="
            margin-top:8px;
            color:rgba(255,255,255,.4);
            font-size:12px;
          ">
            ${adminItems.length} showcase items
          </div>
        </div>

        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        ">
          <button
            type="button"
            id="admin-add-item"
            style="${adminButtonStyle('#FF9E00')}"
          >
            + ADD
          </button>

          <button
            type="button"
            id="admin-refresh"
            style="${adminButtonStyle('#00F5FF')}"
          >
            REFRESH
          </button>

          <button
            type="button"
            id="admin-close"
            style="${adminButtonStyle('#ffffff')}"
          >
            CLOSE
          </button>
        </div>
      </div>

      <div id="admin-items-list">
        ${adminItems.map((item, index) =>
          renderAdminItem(item, index)
        ).join('')}
      </div>
    </div>
  `;

  panel.style.display = 'block';

  document
    .getElementById('admin-close')
    ?.addEventListener(
      'click',
      closeAdminPanel
    );

  document
    .getElementById('admin-refresh')
    ?.addEventListener(
      'click',
      loadAdminShowcase
    );

  document
    .getElementById('admin-add-item')
    ?.addEventListener(
      'click',
      () => openItemEditor()
    );

  attachAdminItemEvents();
}


// ==========================================
// ADMIN ITEM HTML
// ==========================================

function renderAdminItem(item, index) {
  const image =
    item.image ||
    './assets/embedded-image-2.jpg';

  return `
    <div
      class="admin-showcase-item"
      data-id="${escapeHtml(item.id)}"
      data-index="${index}"
      style="
        display:grid;
        grid-template-columns:90px 1fr auto;
        gap:20px;
        align-items:center;
        padding:18px;
        margin-bottom:10px;
        border:1px solid rgba(255,255,255,.1);
        background:#111;
      "
    >

      <div style="
        width:90px;
        height:60px;
        overflow:hidden;
        background:#080808;
      ">
        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(item.title)}"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
          "
        />
      </div>

      <div style="min-width:0;">
        <div style="
          color:#FF9E00;
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.12em;
          margin-bottom:6px;
        ">
          ${escapeHtml(item.category || '')}
        </div>

        <div style="
          font-size:18px;
          font-weight:bold;
          margin-bottom:5px;
        ">
          ${escapeHtml(item.title || 'Untitled')}
        </div>

        <div style="
          color:rgba(255,255,255,.4);
          font-size:12px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        ">
          ${escapeHtml(item.description || '')}
        </div>

        <div style="
          color:rgba(255,255,255,.25);
          font-size:10px;
          margin-top:7px;
        ">
          ID: ${escapeHtml(item.id)}
          · ORDER: ${index + 1}
        </div>
      </div>

      <div style="
        display:flex;
        flex-direction:column;
        gap:5px;
      ">
        <button
          type="button"
          class="admin-up"
          data-id="${escapeHtml(item.id)}"
          ${index === 0 ? 'disabled' : ''}
          style="${adminSmallButtonStyle()}"
        >
          ↑
        </button>

        <button
          type="button"
          class="admin-down"
          data-id="${escapeHtml(item.id)}"
          ${index === adminItems.length - 1 ? 'disabled' : ''}
          style="${adminSmallButtonStyle()}"
        >
          ↓
        </button>

        <button
          type="button"
          class="admin-edit"
          data-id="${escapeHtml(item.id)}"
          style="${adminSmallButtonStyle()}"
        >
          EDIT
        </button>

        <button
          type="button"
          class="admin-delete"
          data-id="${escapeHtml(item.id)}"
          style="${adminSmallButtonStyle('#ff4444')}"
        >
          DELETE
        </button>
      </div>
    </div>
  `;
}


// ==========================================
// ADMIN BUTTON STYLES
// ==========================================

function adminButtonStyle(color) {
  return `
    background:transparent;
    border:1px solid ${color};
    color:${color};
    padding:10px 15px;
    cursor:pointer;
    font-family:monospace;
    font-size:11px;
    letter-spacing:.08em;
  `;
}

function adminSmallButtonStyle(color = '#ffffff') {
  return `
    background:transparent;
    border:1px solid rgba(255,255,255,.18);
    color:${color};
    min-width:70px;
    padding:6px 8px;
    cursor:pointer;
    font-family:monospace;
    font-size:10px;
  `;
}


// ==========================================
// ADMIN ITEM EVENTS
// ==========================================

function attachAdminItemEvents() {
  document
    .querySelectorAll('.admin-edit')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const id = Number(
            button.dataset.id
          );

          const item =
            adminItems.find(
              entry => Number(entry.id) === id
            );

          if (item) {
            openItemEditor(item);
          }
        }
      );
    });

  document
    .querySelectorAll('.admin-delete')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const id = Number(
            button.dataset.id
          );

          deleteShowcaseItem(id);
        }
      );
    });

  document
    .querySelectorAll('.admin-up')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const id = Number(
            button.dataset.id
          );

          moveShowcaseItem(id, -1);
        }
      );
    });

  document
    .querySelectorAll('.admin-down')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const id = Number(
            button.dataset.id
          );

          moveShowcaseItem(id, 1);
        }
      );
    });
}


// ==========================================
// ADD / EDIT ITEM
// ==========================================

function openItemEditor(item = null) {
  const editing = Boolean(item);

  const modal =
    document.createElement('div');

  modal.id = 'admin-editor-modal';

  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:10001;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:rgba(0,0,0,.8);
  `;

  modal.innerHTML = `
    <div style="
      width:min(600px,100%);
      max-height:90vh;
      overflow-y:auto;
      background:#111;
      border:1px solid rgba(255,255,255,.15);
      padding:25px;
      box-shadow:0 20px 80px rgba(0,0,0,.5);
    ">
      <div style="
        color:#00F5FF;
        font-size:11px;
        letter-spacing:.15em;
        margin-bottom:8px;
      ">
        ${editing ? '/ EDIT SHOWCASE' : '/ NEW SHOWCASE'}
      </div>

      <h3 style="
        margin:0 0 25px;
        font-size:25px;
      ">
        ${editing ? 'Edit Item' : 'Add Item'}
      </h3>

      <label style="${adminLabelStyle()}">
        TITLE
        <input
          id="admin-field-title"
          type="text"
          value="${escapeHtml(item?.title || '')}"
          style="${adminInputStyle()}"
        />
      </label>

      <label style="${adminLabelStyle()}">
        CATEGORY
        <input
          id="admin-field-category"
          type="text"
          value="${escapeHtml(item?.category || '')}"
          style="${adminInputStyle()}"
        />
      </label>

      <label style="${adminLabelStyle()}">
        DESCRIPTION
        <textarea
          id="admin-field-description"
          rows="4"
          style="${adminInputStyle()}resize:vertical;"
        >${escapeHtml(item?.description || '')}</textarea>
      </label>

      <label style="${adminLabelStyle()}">
        IMAGE URL
        <input
          id="admin-field-image"
          type="text"
          value="${escapeHtml(item?.image || '')}"
          placeholder="./assets/example.jpg"
          style="${adminInputStyle()}"
        />
      </label>

      <label style="${adminLabelStyle()}">
        LINK
        <input
          id="admin-field-link"
          type="text"
          value="${escapeHtml(item?.link || '')}"
          placeholder="https://..."
          style="${adminInputStyle()}"
        />
      </label>

      <div style="
        display:flex;
        justify-content:flex-end;
        gap:10px;
        margin-top:25px;
      ">
        <button
          type="button"
          id="admin-editor-cancel"
          style="${adminButtonStyle('#ffffff')}"
        >
          CANCEL
        </button>

        <button
          type="button"
          id="admin-editor-save"
          style="${adminButtonStyle('#FF9E00')}"
        >
          ${editing ? 'SAVE CHANGES' : 'ADD ITEM'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById('admin-editor-cancel')
    ?.addEventListener(
      'click',
      () => modal.remove()
    );

  document
    .getElementById('admin-editor-save')
    ?.addEventListener(
      'click',
      async () => {
        await saveShowcaseItem(
          item?.id || null,
          modal
        );
      }
    );
}

function adminLabelStyle() {
  return `
    display:block;
    color:rgba(255,255,255,.45);
    font-size:10px;
    letter-spacing:.1em;
    margin-bottom:15px;
  `;
}

function adminInputStyle() {
  return `
    display:block;
    width:100%;
    box-sizing:border-box;
    margin-top:7px;
    padding:11px;
    background:#080808;
    border:1px solid rgba(255,255,255,.12);
    color:white;
    outline:none;
    font-family:monospace;
    font-size:13px;
  `;
}


// ==========================================
// SAVE SHOWCASE ITEM
// ==========================================

async function saveShowcaseItem(id, modal) {
  const title =
    document.getElementById(
      'admin-field-title'
    )?.value.trim();

  const category =
    document.getElementById(
      'admin-field-category'
    )?.value.trim();

  const description =
    document.getElementById(
      'admin-field-description'
    )?.value.trim();

  const image =
    document.getElementById(
      'admin-field-image'
    )?.value.trim();

  const link =
    document.getElementById(
      'admin-field-link'
    )?.value.trim();

  if (!title) {
    alert('Title is required.');
    return;
  }

  const body = {
    title,
    category,
    description,
    image,
    link
  };

  try {
    const url = id
      ? `/api/admin/showcase/${encodeURIComponent(id)}`
      : '/api/admin/showcase';

    const response = await fetch(
      url,
      {
        method: id ? 'PUT' : 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify(body)
      }
    );

    if (response.status === 401) {
      alert('Unauthorized. Please authenticate again.');
      return;
    }

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        `Save failed (${response.status}): ${text}`
      );
    }

    modal.remove();

    await loadAdminShowcase();

    await loadPublicShowcase();

  } catch (error) {
    console.error(
      'Saving showcase item failed:',
      error
    );

    alert(
      'Could not save the showcase item.'
    );
  }
}


// ==========================================
// DELETE SHOWCASE ITEM
// ==========================================

async function deleteShowcaseItem(id) {
  const item =
    adminItems.find(
      entry => Number(entry.id) === Number(id)
    );

  if (!item) return;

  const confirmed =
    window.confirm(
      `Delete "${item.title}"?\n\nThis cannot be undone.`
    );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `/api/admin/showcase/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: adminHeaders()
      }
    );

    if (response.status === 401) {
      alert('Unauthorized. Please authenticate again.');
      return;
    }

    if (!response.ok) {
      throw new Error(
        `Delete returned ${response.status}`
      );
    }

    await loadAdminShowcase();

    await loadPublicShowcase();

  } catch (error) {
    console.error(
      'Delete showcase item failed:',
      error
    );

    alert(
      'Could not delete the showcase item.'
    );
  }
}


// ==========================================
// REORDER SHOWCASE ITEMS
// ==========================================

async function moveShowcaseItem(id, direction) {
  const currentIndex =
    adminItems.findIndex(
      item => Number(item.id) === Number(id)
    );

  if (currentIndex === -1) return;

  const newIndex =
    currentIndex + direction;

  if (
    newIndex < 0 ||
    newIndex >= adminItems.length
  ) {
    return;
  }

  const reordered =
    [...adminItems];

  const [moved] =
    reordered.splice(
      currentIndex,
      1
    );

  reordered.splice(
    newIndex,
    0,
    moved
  );

  const ids =
    reordered.map(
      item => item.id
    );

  try {
    const response = await fetch(
      '/api/admin/showcase/reorder',
      {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({
          ids
        })
      }
    );

    if (response.status === 401) {
      alert('Unauthorized. Please authenticate again.');
      return;
    }

    if (!response.ok) {
      throw new Error(
        `Reorder returned ${response.status}`
      );
    }

    await loadAdminShowcase();

    await loadPublicShowcase();

  } catch (error) {
    console.error(
      'Reordering showcase failed:',
      error
    );

    alert(
      'Could not reorder the showcase.'
    );
  }
}


// ==========================================
// CLOSE ADMIN PANEL
// ==========================================

function closeAdminPanel() {
  if (!adminPanel) return;

  adminPanel.style.display = 'none';
}


// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

document.addEventListener(
  'DOMContentLoaded',
  () => {
    const lock =
      document.getElementById(
        'admin-lock'
      );

    if (!lock) return;

    /*
     * Restore the visual admin state if the
     * current browser session is already
     * authenticated.
     */
    if (
      sessionStorage.getItem(
        'adminAuthenticated'
      ) === 'true' &&
      getAdminToken()
    ) {
      lock.textContent = '🔓';
      lock.title = 'Admin Mode Enabled';
    }

    lock.addEventListener(
      'click',
      async () => {

        /*
         * If already authenticated, open
         * the admin panel instead of asking
         * for the TOTP code again.
         */
        if (
          sessionStorage.getItem(
            'adminAuthenticated'
          ) === 'true' &&
          getAdminToken()
        ) {
          await loadAdminShowcase();
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
                body: JSON.stringify({
                  code: code.trim()
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

            alert(
              'Admin mode enabled.'
            );

            await loadAdminShowcase();

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
// INITIAL PUBLIC LOAD
// ==========================================

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    await loadPublicShowcase();
  }
);
