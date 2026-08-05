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

document.addEventListener('DOMContentLoaded', () => {
  const lock = document.getElementById('admin-lock');

  if (!lock) return;

  let adminToken = sessionStorage.getItem('adminToken');

  const api = async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      sessionStorage.removeItem('adminToken');
      adminToken = null;
      throw new Error('Unauthorized');
    }

    return response;
  };

  const escapeHTML = (value) => {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  };

  const createPanel = () => {
    const existing = document.getElementById('admin-panel');

    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');

    panel.id = 'admin-panel';

    panel.innerHTML = `
      <div class="admin-backdrop"></div>

      <div class="admin-window">
        <div class="admin-header">
          <div>
            <div class="admin-label">ADMIN MODE</div>
            <h2>Showcase Manager</h2>
          </div>

          <button id="admin-close" class="admin-close" type="button">
            ×
          </button>
        </div>

        <div class="admin-toolbar">
          <button id="admin-add" type="button">
            + Add Showcase Item
          </button>

          <button id="admin-refresh" type="button">
            Refresh
          </button>

          <button id="admin-logout" type="button">
            Lock Admin
          </button>
        </div>

        <div id="admin-items" class="admin-items">
          Loading showcase items...
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    addAdminStyles();

    document
      .getElementById('admin-close')
      .addEventListener('click', () => panel.remove());

    document
      .querySelector('.admin-backdrop')
      .addEventListener('click', () => panel.remove());

    document
      .getElementById('admin-refresh')
      .addEventListener('click', loadShowcase);

    document
      .getElementById('admin-add')
      .addEventListener('click', () => showEditor());

    document
      .getElementById('admin-logout')
      .addEventListener('click', () => {
        sessionStorage.removeItem('adminToken');
        adminToken = null;

        panel.remove();

        lock.textContent = '🔒';
        lock.title = 'Admin Mode';
      });

    loadShowcase();
  };

  const loadShowcase = async () => {
    const container = document.getElementById('admin-items');

    if (!container) return;

    container.innerHTML = 'Loading showcase items...';

    try {
      const response = await api('/api/admin/showcase');

      if (!response.ok) {
        throw new Error('Could not load showcase items.');
      }

      const items = await response.json();

      if (!items.length) {
        container.innerHTML = `
          <div class="admin-empty">
            No showcase items yet.
          </div>
        `;
        return;
      }

      container.innerHTML = items
        .map(
          (item, index) => `
            <div
              class="admin-item"
              draggable="true"
              data-id="${item.id}"
            >
              <div class="admin-drag">
                ☷
              </div>

              <div class="admin-item-number">
                ${index + 1}
              </div>

              <div class="admin-item-info">
                <strong>${escapeHTML(item.title)}</strong>

                <span>
                  ${escapeHTML(item.category)}
                </span>

                <small>
                  ${escapeHTML(item.description)}
                </small>
              </div>

              <div class="admin-item-actions">
                <button
                  type="button"
                  class="admin-edit"
                  data-id="${item.id}"
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="admin-delete"
                  data-id="${item.id}"
                >
                  Delete
                </button>
              </div>
            </div>
          `
        )
        .join('');

      container
        .querySelectorAll('.admin-edit')
        .forEach((button) => {
          button.addEventListener('click', () => {
            const item = items.find(
              (entry) => String(entry.id) === button.dataset.id
            );

            if (item) {
              showEditor(item);
            }
          });
        });

      container
        .querySelectorAll('.admin-delete')
        .forEach((button) => {
          button.addEventListener('click', () =>
            deleteItem(button.dataset.id)
          );
        });

      enableReordering(container);
    } catch (error) {
      console.error(error);

      container.innerHTML = `
        <div class="admin-error">
          Could not load showcase items.
        </div>
      `;
    }
  };

  const showEditor = (item = null) => {
    const existing = document.getElementById('admin-editor');

    if (existing) {
      existing.remove();
    }

    const editor = document.createElement('div');

    editor.id = 'admin-editor';

    editor.innerHTML = `
      <div class="admin-editor-backdrop"></div>

      <div class="admin-editor-window">
        <div class="admin-header">
          <div>
            <div class="admin-label">
              ${item ? 'EDIT ITEM' : 'NEW ITEM'}
            </div>

            <h2>
              ${item ? escapeHTML(item.title) : 'Add Showcase Item'}
            </h2>
          </div>

          <button id="editor-close" class="admin-close" type="button">
            ×
          </button>
        </div>

        <form id="showcase-form">

          <label>
            Title
            <input
              name="title"
              required
              value="${escapeHTML(item?.title || '')}"
            />
          </label>

          <label>
            Category
            <input
              name="category"
              value="${escapeHTML(item?.category || '')}"
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              rows="5"
            >${escapeHTML(item?.description || '')}</textarea>
          </label>

          <label>
            Image URL
            <input
              name="image"
              value="${escapeHTML(item?.image || '')}"
            />
          </label>

          <label>
            Link
            <input
              name="link"
              value="${escapeHTML(item?.link || '')}"
            />
          </label>

          <div class="admin-editor-actions">
            <button type="submit">
              Save
            </button>

            <button
              type="button"
              id="editor-cancel"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    `;

    document.body.appendChild(editor);

    document
      .getElementById('editor-close')
      .addEventListener('click', () => editor.remove());

    document
      .getElementById('editor-cancel')
      .addEventListener('click', () => editor.remove());

    document
      .querySelector('.admin-editor-backdrop')
      .addEventListener('click', () => editor.remove());

    document
      .getElementById('showcase-form')
      .addEventListener('submit', async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const data = new FormData(form);

        const payload = {
          title: data.get('title'),
          category: data.get('category'),
          description: data.get('description'),
          image: data.get('image'),
          link: data.get('link'),
        };

        try {
          const response = await api(
            item
              ? `/api/admin/showcase/${item.id}`
              : '/api/admin/showcase',
            {
              method: item ? 'PUT' : 'POST',
              body: JSON.stringify(payload),
            }
          );

          if (!response.ok) {
            throw new Error('Save failed.');
          }

          editor.remove();
          await loadShowcase();
        } catch (error) {
          console.error(error);
          alert('Could not save the showcase item.');
        }
      });
  };

  const deleteItem = async (id) => {
    const confirmed = confirm(
      'Delete this showcase item? This cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const response = await api(
        `/api/admin/showcase/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Delete failed.');
      }

      await loadShowcase();
    } catch (error) {
      console.error(error);
      alert('Could not delete the showcase item.');
    }
  };

  const enableReordering = (container) => {
    let dragged = null;

    container.querySelectorAll('.admin-item').forEach((item) => {
      item.addEventListener('dragstart', () => {
        dragged = item;
        item.classList.add('admin-dragging');
      });

      item.addEventListener('dragend', async () => {
        item.classList.remove('admin-dragging');

        if (!dragged) return;

        const ids = [...container.querySelectorAll('.admin-item')]
          .map((entry) => Number(entry.dataset.id));

        dragged = null;

        try {
          const response = await api(
            '/api/admin/showcase/reorder',
            {
              method: 'POST',
              body: JSON.stringify({ ids }),
            }
          );

          if (!response.ok) {
            throw new Error('Reorder failed.');
          }

          await loadShowcase();
        } catch (error) {
          console.error(error);
          alert('Could not save the new order.');
          await loadShowcase();
        }
      });

      item.addEventListener('dragover', (event) => {
        event.preventDefault();

        if (!dragged || dragged === item) return;

        const rect = item.getBoundingClientRect();

        const before =
          event.clientY < rect.top + rect.height / 2;

        if (before) {
          container.insertBefore(dragged, item);
        } else {
          container.insertBefore(
            dragged,
            item.nextSibling
          );
        }
      });
    });
  };

  const addAdminStyles = () => {
    if (document.getElementById('admin-panel-styles')) return;

    const style = document.createElement('style');

    style.id = 'admin-panel-styles';

    style.textContent = `
      #admin-panel,
      #admin-editor {
        position: fixed;
        inset: 0;
        z-index: 9999;
        font-family: monospace;
      }

      .admin-backdrop,
      .admin-editor-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, .82);
        backdrop-filter: blur(8px);
      }

      .admin-window {
        position: relative;
        z-index: 1;
        width: min(1000px, calc(100% - 32px));
        max-height: calc(100vh - 32px);
        overflow: auto;
        margin: 16px auto;
        padding: 24px;
        background: #0A0A0B;
        border: 1px solid rgba(255, 158, 0, .35);
        box-shadow: 0 20px 80px rgba(0, 0, 0, .7);
        color: white;
      }

      .admin-editor-window {
        position: relative;
        z-index: 1;
        width: min(600px, calc(100% - 32px));
        max-height: calc(100vh - 32px);
        overflow: auto;
        margin: 16px auto;
        padding: 24px;
        background: #0A0A0B;
        border: 1px solid rgba(255, 158, 0, .35);
        color: white;
      }

      .admin-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 24px;
      }

      .admin-header h2 {
        margin: 4px 0 0;
        font-size: 28px;
        color: white;
      }

      .admin-label {
        color: #FF9E00;
        font-size: 11px;
        letter-spacing: .2em;
      }

      .admin-close {
        border: 1px solid rgba(255,255,255,.15);
        background: transparent;
        color: rgba(255,255,255,.6);
        font-size: 24px;
        width: 40px;
        height: 40px;
        cursor: pointer;
      }

      .admin-close:hover {
        color: #FF9E00;
        border-color: #FF9E00;
      }

      .admin-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 20px;
      }

      .admin-toolbar button,
      .admin-item-actions button,
      .admin-editor-actions button {
        border: 1px solid rgba(255,255,255,.18);
        background: transparent;
        color: rgba(255,255,255,.7);
        padding: 10px 14px;
        font-family: monospace;
        cursor: pointer;
      }

      .admin-toolbar button:first-child,
      .admin-editor-actions button[type="submit"] {
        border-color: #FF9E00;
        color: #FF9E00;
      }

      .admin-toolbar button:hover,
      .admin-item-actions button:hover,
      .admin-editor-actions button:hover {
        border-color: #FF9E00;
        color: #FF9E00;
      }

      .admin-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .admin-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px;
        border: 1px solid rgba(255,255,255,.1);
        background: rgba(255,255,255,.025);
        cursor: grab;
      }

      .admin-item:hover {
        border-color: rgba(255,158,0,.35);
      }

      .admin-item.admin-dragging {
        opacity: .4;
      }

      .admin-drag {
        color: rgba(255,255,255,.25);
        font-size: 20px;
      }

      .admin-item-number {
        color: #FF9E00;
        width: 25px;
      }

      .admin-item-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .admin-item-info strong {
        color: white;
        font-size: 16px;
      }

      .admin-item-info span {
        color: #FF9E00;
        font-size: 11px;
        text-transform: uppercase;
      }

      .admin-item-info small {
        color: rgba(255,255,255,.4);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .admin-item-actions {
        display: flex;
        gap: 6px;
      }

      .admin-error {
        padding: 20px;
        border: 1px solid rgba(255,0,0,.3);
        color: #ff7777;
      }

      .admin-empty {
        padding: 30px;
        text-align: center;
        color: rgba(255,255,255,.4);
        border: 1px dashed rgba(255,255,255,.15);
      }

      .admin-editor-window form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .admin-editor-window label {
        display: flex;
        flex-direction: column;
        gap: 7px;
        color: rgba(255,255,255,.5);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .1em;
      }

      .admin-editor-window input,
      .admin-editor-window textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 12px;
        border: 1px solid rgba(255,255,255,.15);
        background: #111;
        color: white;
        font-family: monospace;
        outline: none;
      }

      .admin-editor-window input:focus,
      .admin-editor-window textarea:focus {
        border-color: #FF9E00;
      }

      .admin-editor-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      @media (max-width: 700px) {
        .admin-item {
          align-items: flex-start;
        }

        .admin-item-actions {
          flex-direction: column;
        }

        .admin-item-info small {
          white-space: normal;
        }
      }
    `;

    document.head.appendChild(style);
  };

  const login = async () => {
    const code = prompt('Enter your Authenticator code:');

    if (!code) return;

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim(),
        }),
      });

      const result = await response.json();

      if (!result.ok || !result.token) {
        alert('Invalid Authenticator code.');
        return;
      }

      adminToken = result.token;

      sessionStorage.setItem(
        'adminToken',
        adminToken
      );

      lock.textContent = '🔓';
      lock.title = 'Admin Mode Enabled';

      createPanel();
    } catch (error) {
      console.error(error);
      alert(
        'Could not connect to the authentication server.'
      );
    }
  };

  lock.addEventListener('click', async () => {
    if (adminToken) {
      createPanel();
      return;
    }

    await login();
  });

  if (adminToken) {
    lock.textContent = '🔓';
    lock.title = 'Admin Mode Enabled';
  }
});
