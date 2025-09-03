/* ==========================
   Lost & Found – Vanilla JS
   LocalStorage-based portal
   ========================== */
(function () {
  const LS_KEY = 'lf_items_v1';

  // Utilities
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmtDate = (str) => {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    if (Number.isNaN(d)) return str;
    return d.toLocaleDateString();
  };
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const placeholderDataURL = () => {
    // Subtle SVG placeholder (dark theme), 4:3
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
      <defs>
        <linearGradient id='g' x1='0' x2='1'>
          <stop offset='0' stop-color='#0a101d'/>
          <stop offset='1' stop-color='#111827'/>
        </linearGradient>
      </defs>
      <rect fill='url(#g)' width='400' height='300'/>
      <g fill='#94a3b8' font-family='sans-serif'>
        <text x='200' y='150' font-size='22' text-anchor='middle' dominant-baseline='middle'>No Image</text>
      </g>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  };

  const readImageAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadItems = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  };
  const saveItems = (items) => localStorage.setItem(LS_KEY, JSON.stringify(items));

  // Submission handling (lost.html & found.html)
  const initFormPage = () => {
    const form = $('#itemForm');
    if (!form) return;

    const imgInput = form.image;
    const preview = $('#imgPreview');

    imgInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) { preview.style.backgroundImage = ''; preview.setAttribute('aria-hidden', 'true'); return; }
      if (!file.type.startsWith('image/')) return;
      const url = await readImageAsDataURL(file);
      preview.style.backgroundImage = `url(${url})`;
      preview.removeAttribute('aria-hidden');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const type = fd.get('type') || 'lost';
      const item = {
        id: uid(),
        type: String(type), // 'lost' | 'found'
        name: String(fd.get('name') || '').trim(),
        category: String(fd.get('category') || ''),
        description: String(fd.get('description') || '').trim(),
        location: String(fd.get('location') || '').trim(),
        date: String(fd.get('date') || ''),
        contact: String(fd.get('contact') || '').trim(),
        image: null,
        resolved: false,
        createdAt: Date.now(),
      };

      // Basic validation
      const required = ['name','category','location','date','contact'];
      for (const key of required) {
        if (!item[key]) {
          alert(`Please provide ${key}.`);
          return;
        }
      }

      // Optional image
      const file = form.image?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        try { item.image = await readImageAsDataURL(file); } catch {}
      }

      const items = loadItems();
      items.push(item);
      saveItems(items);

      // Reset and redirect
      form.reset();
      preview.style.backgroundImage = '';
      preview.setAttribute('aria-hidden', 'true');
      alert(`${item.type === 'lost' ? 'Lost' : 'Found'} item submitted!`);
      window.location.href = 'list.html';
    });
  };

  // List page
  const initListPage = () => {
    const grid = $('#itemsGrid');
    if (!grid) return;

    const searchInput = $('#searchInput');
    const categoryFilter = $('#categoryFilter');
    const typeFilter = $('#typeFilter');
    const sortBy = $('#sortBy');
    const emptyState = $('#emptyState');
    const tpl = $('#cardTemplate');

    const render = () => {
      const q = searchInput.value.toLowerCase().trim();
      const cat = categoryFilter.value;
      const typ = typeFilter.value;
      const sort = sortBy.value;

      let items = loadItems();

      // Filter
      items = items.filter(it => {
        if (cat && it.category !== cat) return false;
        if (typ && it.type !== typ) return false;
        if (q) {
          const hay = `${it.name} ${it.description} ${it.location} ${it.category} ${it.contact}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      // Sort
      items.sort((a, b) => {
        if (sort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
        if (sort === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
        if (sort === 'az') return a.name.localeCompare(b.name);
        if (sort === 'za') return b.name.localeCompare(a.name);
        return 0;
      });

      grid.innerHTML = '';

      if (!items.length) {
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;

      for (const it of items) {
        const node = tpl.content.firstElementChild.cloneNode(true);
        const badge = $('.badge', node);
        const thumb = $('.thumb', node);
        const name = $('.item-name', node);
        const desc = $('.item-desc', node);
        const cat = $('.item-category', node);
        const loc = $('.item-location', node);
        const date = $('.item-date', node);
        const contact = $('.item-contact', node);
        const btnResolve = $('.mark-resolved', node);
        const btnDelete = $('.delete-item', node);

        badge.textContent = it.type === 'lost' ? 'LOST' : 'FOUND';
        badge.style.background = it.type === 'lost' ? 'var(--danger)' : 'var(--accent)';
        thumb.style.backgroundImage = `url(${it.image || placeholderDataURL()})`;
        name.textContent = it.name;
        desc.textContent = it.description || '—';
        cat.textContent = it.category;
        loc.textContent = it.location;
        date.textContent = fmtDate(it.date);
        contact.textContent = it.contact;

        if (it.resolved) {
          node.classList.add('is-resolved');
          btnResolve.textContent = 'Resolved';
          btnResolve.disabled = true;
        }

        btnResolve.addEventListener('click', () => {
          const all = loadItems();
          const idx = all.findIndex(x => x.id === it.id);
          if (idx > -1) {
            all[idx].resolved = true;
            saveItems(all);
            render();
          }
        });

        btnDelete.addEventListener('click', () => {
          if (!confirm('Delete this item?')) return;
          const all = loadItems();
          saveItems(all.filter(x => x.id !== it.id));
          render();
        });

        grid.appendChild(node);
      }
    };

    // Wire filters
    [searchInput, categoryFilter, typeFilter, sortBy].forEach(el => el.addEventListener('input', render));

    // Initial
    render();
  };

  // Highlight current nav link (progressive enhancement)
  const enhanceActiveNav = () => {
    const page = document.body.dataset.page;
    if (!page) return;
    $$('.navbar nav a').forEach(a => {
      if (a.getAttribute('href').includes(page)) a.classList.add('active');
    });
  };

  // Kick off per-page logic
  document.addEventListener('DOMContentLoaded', () => {
    enhanceActiveNav();
    initFormPage();
    initListPage();
  });
})();