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
// ADMIN AUTHENTICATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const lock = document.getElementById('admin-lock');

  if (!lock) return;

  lock.addEventListener('click', async () => {
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

        alert('Admin mode enabled.');
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
// PUBLIC SHOWCASE LOADER
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
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

    /*
     * Find the existing showcase articles.
     *
     * Your HTML currently has five <article> elements
     * inside the showcase section.
     */
    const articles =
      stream.querySelectorAll('article');

    if (!articles.length) {
      console.warn(
        'No showcase articles found.'
      );
      return;
    }

    /*
     * All five existing articles share the same
     * parent container.
     */
    const container =
      articles[0].parentElement;

    if (!container) return;

    /*
     * Remove the hard-coded showcase cards.
     */
    container.innerHTML = '';

    /*
     * Build the cards from D1.
     */
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

      /*
       * If an item has a link, make the card clickable.
       */
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
});


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
