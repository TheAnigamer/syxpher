(() => {
  const API_URL = '/api/levels';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const STAR_PATH =
    'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';
  const FLAME_PATH =
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z';
  const GEAR_PATH =
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z';
  const EXTERNAL_LINK_PATHS = ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'];

  function makeIcon(paths, extraClass, circle) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', `lucide w-4 h-4${extraClass ? ' ' + extraClass : ''}`);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('height', '24');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    paths.forEach((d) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    if (circle) {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', String(circle.cx));
      c.setAttribute('cy', String(circle.cy));
      c.setAttribute('r', String(circle.r));
      svg.appendChild(c);
    }
    return svg;
  }

  function difficultyTier(stars) {
    if (stars >= 10) return 'Demon';
    if (stars >= 8) return 'Insane';
    if (stars >= 6) return 'Harder';
    if (stars >= 4) return 'Hard';
    if (stars === 3) return 'Normal';
    if (stars === 2) return 'Easy';
    return 'Auto';
  }

  function buildDifficultyCell(level) {
    const td = document.createElement('td');
    td.className = 'py-4 px-4';
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center gap-2';

    const stars = (level.difficulty && level.difficulty.stars) || 0;
    const demon = !!(level.difficulty && level.difficulty.demon);

    let icon;
    let label;
    if (stars <= 0) {
      icon = makeIcon([GEAR_PATH], 'text-white/30', { cx: 12, cy: 12, r: 3 });
      label = 'Unrated';
    } else if (demon || stars >= 10) {
      icon = makeIcon([FLAME_PATH], 'text-[#FF9E00]');
      label = `${stars} Stars (Demon)`;
    } else {
      icon = makeIcon([STAR_PATH], 'text-[#00F5FF]');
      label = `${stars} Stars (${difficultyTier(stars)})`;
    }

    const span = document.createElement('span');
    span.className = 'text-sm text-white/60';
    span.textContent = label;

    wrap.appendChild(icon);
    wrap.appendChild(span);
    td.appendChild(wrap);
    return td;
  }

  function buildStatusCell(ratings) {
    const td = document.createElement('td');
    td.className = 'py-4 px-4';
    const span = document.createElement('span');
    span.className = 'inline-block px-3 py-1 font-mono-tech text-xs uppercase tracking-wider border';

    let text, rgb, bgAlpha;
    if (ratings && ratings.epic) {
      text = 'Epic'; rgb = '255, 158, 0'; bgAlpha = 0.12;
    } else if (ratings && ratings.featured) {
      text = 'Featured'; rgb = '255, 158, 0'; bgAlpha = 0.08;
    } else if (ratings && ratings.rated) {
      text = 'Rated'; rgb = '0, 245, 255'; bgAlpha = 0.08;
    } else {
      text = 'Unrated'; rgb = '136, 136, 136'; bgAlpha = 0.08;
    }

    span.style.color = `rgb(${rgb})`;
    span.style.borderColor = `rgba(${rgb}, 0.25)`;
    span.style.backgroundColor = `rgba(${rgb}, ${bgAlpha})`;
    span.textContent = text;
    td.appendChild(span);
    return td;
  }

  function categoryLabel(level) {
    const type = String(level.sourceType || '').toLowerCase();
    const key = String(level.sourceKey || '').toLowerCase();
    const author = String(level.author || level.creator || '').toLowerCase();

    if ((type === 'profile' && key === 'syxpher') || author === 'syxpher') {
      return 'Levels On My Account';
    }

    if (type === 'profile' || type === 'list' || (author && author !== 'syxpher')) {
      return 'Levels On Other Accounts';
    }

    return "Levels I've Built On";
  }

  function extractStars(level) {
    const candidates = [
      level?.stars,
      level?.star_count,
      level?.difficulty?.stars,
      level?.difficulty
    ];

    for (const val of candidates) {
      if (val !== null && val !== undefined) {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) return num;

        if (typeof val === 'string') {
          const match = val.match(/\d+/);
          if (match) return parseInt(match[0], 10);
        }
      }
    }
    return 0;
  }

  function isTruthyFlag(val) {
    if (!val) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val > 0;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'true' || s === '1' || (Number(s) > 0);
    }
    return false;
  }

  function normalizeLevel(level) {
    const parsedStars = extractStars(level);
    const statusStr = String(level?.status || level?.rating || '').toLowerCase();

    const isEpic = isTruthyFlag(level?.epic) || isTruthyFlag(level?.ratings?.epic) || statusStr.includes('epic');
    const isFeatured = isTruthyFlag(level?.featured) || isTruthyFlag(level?.ratings?.featured) || statusStr.includes('feature');
    const isRated = isTruthyFlag(level?.rated) || isTruthyFlag(level?.ratings?.rated) || parsedStars > 0 || isFeatured || isEpic || statusStr.includes('rate');

    return {
      ...level,
      id: String(level?.id || level?.level_id || ''),
      name: String(level?.name || level?.title || 'Untitled'),
      author: String(level?.author || level?.creator || ''),
      downloads: Number.isFinite(Number(level?.downloads)) ? Number(level.downloads) : 0,
      likes: Number.isFinite(Number(level?.likes)) ? Number(level.likes) : 0,
      difficulty: {
        stars: parsedStars,
        coins: Number.isFinite(Number(level?.coins || level?.difficulty?.coins)) ? Number(level?.coins || level?.difficulty?.coins) : 0,
        demon: isTruthyFlag(level?.isDemon) || isTruthyFlag(level?.difficulty?.demon) || parsedStars >= 10,
        auto: isTruthyFlag(level?.auto) || isTruthyFlag(level?.difficulty?.auto)
      },
      ratings: {
        rated: isRated,
        featured: isFeatured,
        epic: isEpic
      },
      song: String(level?.song || ''),
      sourceType: String(level?.sourceType || ''),
      sourceKey: String(level?.sourceKey || '')
    };
  }

  function buildRow(level, index) {
    const tr = document.createElement('tr');
    tr.className = 'group border-b border-white/5 hover:bg-[#1A1A1C] transition-colors';

    const indexTd = document.createElement('td');
    indexTd.className = 'py-4 px-4 font-mono-tech text-xs text-white/20';
    indexTd.textContent = String(index + 1).padStart(2, '0');
    tr.appendChild(indexTd);

    const nameTd = document.createElement('td');
    nameTd.className = 'py-4 px-4';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-heading font-bold text-lg text-white group-hover:text-[#FF9E00] transition-colors';
    nameSpan.textContent = level.name || 'Untitled';
    nameTd.appendChild(nameSpan);
    tr.appendChild(nameTd);

    const idTd = document.createElement('td');
    idTd.className = 'py-4 px-4';
    const idSpan = document.createElement('span');
    idSpan.className = 'font-mono-tech text-sm text-[#00F5FF]/80';
    idSpan.textContent = level.id;
    idTd.appendChild(idSpan);
    tr.appendChild(idTd);

    const authorTd = document.createElement('td');
    authorTd.className = 'py-4 px-4';
    if (level.author) {
      const authorLink = document.createElement('a');
      authorLink.className =
        'author-link inline-flex max-w-[14rem] items-center rounded-sm font-mono-tech text-sm text-white/55 hover:text-[#00F5FF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F5FF]';
      authorLink.href = `https://gdbrowser.com/u/${encodeURIComponent(level.author)}`;
      authorLink.target = '_blank';
      authorLink.rel = 'noopener noreferrer';
      authorLink.title = `View ${level.author} on GD Browser`;
      authorLink.textContent = level.author;
      authorTd.appendChild(authorLink);
    } else {
      const authorSpan = document.createElement('span');
      authorSpan.className = 'font-mono-tech text-sm text-white/25';
      authorSpan.textContent = 'Unknown';
      authorTd.appendChild(authorSpan);
    }
    tr.appendChild(authorTd);

    tr.appendChild(buildDifficultyCell(level));
    tr.appendChild(buildStatusCell(level.ratings));

    const categoryTd = document.createElement('td');
    categoryTd.className = 'py-4 px-4';
    const categorySpan = document.createElement('span');
    categorySpan.className = 'text-xs text-white/40';
    categorySpan.textContent = categoryLabel(level);
    categoryTd.appendChild(categorySpan);
    tr.appendChild(categoryTd);

    const linkTd = document.createElement('td');
    linkTd.className = 'py-4 px-4 text-right';
    const a = document.createElement('a');
    a.className =
      'inline-flex items-center justify-center w-9 h-9 text-white/30 hover:text-[#FF9E00] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9E00]';
    a.setAttribute('aria-label', `View ${level.name || 'level'} details`);
    a.href = `https://gdbrowser.com/${encodeURIComponent(level.id)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.appendChild(makeIcon(EXTERNAL_LINK_PATHS));
    linkTd.appendChild(a);
    tr.appendChild(linkTd);

    return tr;
  }

  function renderMessage(tbody, text) {
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'py-6 px-4 font-mono-tech text-xs text-white/40';
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function updateFilterButtonStates(activeFilter, buttons) {
    buttons.forEach((button) => {
      const isActive = button.dataset.levelFilter === activeFilter;
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('border-[#FF9E00]', isActive);
      button.classList.toggle('text-[#FF9E00]', isActive);
      button.classList.toggle('border-white/10', !isActive);
      button.classList.toggle('text-white/40', !isActive);
      button.classList.toggle('hover:text-white/70', !isActive);
      button.classList.toggle('hover:border-white/30', !isActive);
      if (isActive) {
        button.style.backgroundColor = 'rgba(136, 136, 136, 0.08)';
      } else {
        button.style.backgroundColor = '';
      }
    });
  }

  function matchesFilter(level, filter) {
    switch (filter) {
      case 'featured':
        return level.ratings.featured;
      case 'unrated':
        return !level.ratings.rated;
      case 'rated':
        return level.ratings.rated;
      case 'epic':
        return level.ratings.epic;
      case 'all':
      default:
        return true;
    }
  }

  function matchesSearch(level, searchTerm) {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return level.name.toLowerCase().includes(query) || level.id.toLowerCase().includes(query);
  }

  function renderLevels({ tbody, levels, filteredLevels, totalLoaded }) {
    if (!filteredLevels.length) {
      renderMessage(tbody, levels.length ? 'No levels match your search or filter.' : 'No levels found.');
    } else {
      tbody.innerHTML = '';
      filteredLevels.forEach((level, i) => tbody.appendChild(buildRow(level, i)));
    }

    const countEl = document.getElementById('levels-count');
    if (countEl) {
      countEl.textContent = `Showing ${filteredLevels.length} of ${totalLoaded} levels`;
    }
  }

  function setupLevelControls(levels) {
    const tbody = document.getElementById('levels-tbody');
    const searchInput = document.getElementById('level-search');
    const filterButtons = Array.from(document.querySelectorAll('[data-level-filter]'));
    const topCountEl = document.getElementById('gd-level-count');

    if (!tbody) return;

    if (topCountEl) {
      topCountEl.textContent = String(levels.length);
    }

    let activeFilter = 'all';

    const render = () => {
      const searchTerm = searchInput ? searchInput.value.trim() : '';
      const filteredLevels = levels.filter((level) => (
        matchesFilter(level, activeFilter) && matchesSearch(level, searchTerm)
      ));

      renderLevels({
        tbody,
        levels,
        filteredLevels,
        totalLoaded: levels.length
      });
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.levelFilter || 'all';
        updateFilterButtonStates(activeFilter, filterButtons);
        render();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', render);
    }

    updateFilterButtonStates(activeFilter, filterButtons);
    render();
  }

  async function loadLevels() {
    const tbody = document.getElementById('levels-tbody');
    const countEl = document.getElementById('levels-count');
    const topCountEl = document.getElementById('gd-level-count');
    if (!tbody) return;

    renderMessage(tbody, 'Loading levels…');
    if (countEl) countEl.textContent = 'Loading levels…';
    if (topCountEl) topCountEl.textContent = 'Loading…';

    try {
      const res = await fetch(API_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      const rawLevels = Array.isArray(data) ? data : (data?.levels || []);

      if (!Array.isArray(rawLevels)) {
        throw new Error('The levels API response is missing the expected levels array.');
      }

      const levels = rawLevels.map(normalizeLevel);
      setupLevelControls(levels);
    } catch (err) {
      console.error('Failed to load Geometry Dash levels:', err);
      renderMessage(tbody, 'Unable to load levels right now. Check the browser console for the API error.');
      if (countEl) countEl.textContent = 'Showing 0 of 0 levels';
      if (topCountEl) topCountEl.textContent = '0';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLevels);
  } else {
    loadLevels();
  }
})();
