import { marked } from './vendor/marked.esm.js';

const data = window.GOLF_VAULT_DATA;
const notes = data?.notes ?? [];
const noteMap = new Map(notes.map((note) => [note.id, note]));

const state = {
  query: '',
  kind: 'all',
  selectedNoteId: notes[0]?.id ?? null,
  selectedAnchor: '',
};

const elements = {
  stats: document.getElementById('app-stats'),
  searchInput: document.getElementById('search-input'),
  kindFilters: document.getElementById('kind-filters'),
  noteList: document.getElementById('note-list'),
  contentTitle: document.getElementById('content-title'),
  contentBody: document.getElementById('content-body'),
  tocList: document.getElementById('toc-list'),
  outboundList: document.getElementById('outbound-list'),
  backlinkList: document.getElementById('backlink-list'),
  statusbar: document.getElementById('statusbar'),
};

elements.stats.textContent = `${data.stats.notes} notes | ${data.stats.edges} links`;

marked.setOptions({
  breaks: true,
});

function parseHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const note = params.get('note');
  const anchor = params.get('anchor') ?? '';
  if (!note) {
    return null;
  }
  return { note, anchor };
}

function updateHash() {
  const params = new URLSearchParams();
  if (state.selectedNoteId) {
    params.set('note', state.selectedNoteId);
  }
  if (state.selectedAnchor) {
    params.set('anchor', state.selectedAnchor);
  }
  const nextHash = params.toString();
  if (window.location.hash.slice(1) !== nextHash) {
    window.location.hash = nextHash;
  }
}

function toDisplayTitle(note) {
  return note.title.replace(/^Rule \d+(?: Clarifications)?: /, '');
}

function preprocessMarkdown(markdown) {
  return markdown.replace(
    /\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g,
    (_, note, anchor, label) => {
      const noteId = (note ?? '').trim();
      const anchorValue = (anchor ?? '').trim();
      const display = (label ?? noteId ?? anchorValue).trim();

      if (!noteId) {
        return display;
      }

      const params = new URLSearchParams();
      params.set('note', noteId);
      if (anchorValue) {
        params.set('anchor', anchorValue);
      }

      return `[${display}](#${params.toString()})`;
    },
  );
}

function filteredNotes() {
  const query = state.query.trim().toLowerCase();
  return notes.filter((note) => {
    if (state.kind !== 'all' && note.kind !== state.kind) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      note.id.toLowerCase().includes(query) ||
      note.title.toLowerCase().includes(query) ||
      note.searchText.toLowerCase().includes(query)
    );
  });
}

function scrollToAnchor(anchor) {
  if (!anchor) {
    elements.contentBody.scrollTop = 0;
    return;
  }

  const exact = elements.contentBody.querySelector(`[data-note-anchor="${CSS.escape(anchor)}"]`);
  if (exact) {
    exact.scrollIntoView({ block: 'start' });
    return;
  }

  const loose = [...elements.contentBody.querySelectorAll('[data-note-anchor]')].find((node) =>
    node.getAttribute('data-note-anchor')?.startsWith(anchor),
  );
  if (loose) {
    loose.scrollIntoView({ block: 'start' });
  }
}

function renderList() {
  const matches = filteredNotes();
  elements.noteList.innerHTML = '';

  if (matches.length === 0) {
    elements.noteList.innerHTML = '<div class="empty">No notes match the current filter.</div>';
    return;
  }

  for (const note of matches) {
    const button = document.createElement('button');
    button.className = `list-item${note.id === state.selectedNoteId ? ' active' : ''}`;
    button.innerHTML = `
      <span class="badge">${note.kind}</span>
      <strong>${note.id}</strong>
      <small>${toDisplayTitle(note)}</small>
    `;
    button.addEventListener('click', () => {
      state.selectedNoteId = note.id;
      state.selectedAnchor = '';
      updateHash();
      render();
    });
    elements.noteList.appendChild(button);
  }
}

function renderToc(note) {
  elements.tocList.innerHTML = '';
  const headings = note.headings.filter((heading) => heading.depth >= 2);

  if (headings.length === 0) {
    elements.tocList.innerHTML = '<div class="empty">No sections.</div>';
    return;
  }

  for (const heading of headings) {
    const button = document.createElement('button');
    button.className = `toc-button toc-depth-${heading.depth}`;
    button.textContent = heading.text;
    button.addEventListener('click', () => {
      state.selectedAnchor = heading.anchor;
      updateHash();
      scrollToAnchor(heading.anchor);
    });
    elements.tocList.appendChild(button);
  }
}

function renderLinkList(container, references, emptyText) {
  container.innerHTML = '';
  if (!references || references.length === 0) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  const unique = [];
  const seen = new Set();
  for (const reference of references) {
    const key = `${reference.note}#${reference.anchor ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(reference);
  }

  for (const reference of unique) {
    const target = noteMap.get(reference.note);
    if (!target) {
      continue;
    }
    const button = document.createElement('button');
    button.className = 'link-button';
    button.innerHTML = `
      <strong>${target.id}</strong>
      <small>${reference.anchor ? `#${reference.anchor}` : toDisplayTitle(target)}</small>
    `;
    button.addEventListener('click', () => {
      state.selectedNoteId = target.id;
      state.selectedAnchor = reference.anchor ?? '';
      updateHash();
      render();
    });
    container.appendChild(button);
  }
}

function renderContent(note) {
  elements.contentTitle.textContent = `${note.id} | ${note.kind}`;
  const html = marked.parse(preprocessMarkdown(note.body));
  elements.contentBody.innerHTML = html;

  const headingNodes = elements.contentBody.querySelectorAll('h1, h2, h3, h4, h5, h6');
  note.headings.forEach((heading, index) => {
    const node = headingNodes[index];
    if (!node) {
      return;
    }
    node.id = heading.anchor;
    node.setAttribute('data-note-anchor', heading.anchor);
  });

  elements.contentBody.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href') ?? '';
      const params = new URLSearchParams(href.slice(1));
      const noteId = params.get('note');
      if (!noteId) {
        return;
      }
      event.preventDefault();
      state.selectedNoteId = noteId;
      state.selectedAnchor = params.get('anchor') ?? '';
      updateHash();
      render();
    });
  });

  renderToc(note);
  renderLinkList(elements.outboundList, note.outbound, 'No outgoing links.');
  renderLinkList(elements.backlinkList, note.backlinks, 'No backlinks yet.');
  elements.statusbar.textContent = `${note.id} | ${note.path}${note.sourceUrl ? ` | source: ${note.sourceUrl}` : ''}`;

  requestAnimationFrame(() => scrollToAnchor(state.selectedAnchor));
}

function render() {
  renderList();
  const note = noteMap.get(state.selectedNoteId) ?? filteredNotes()[0] ?? notes[0];
  if (!note) {
    elements.contentTitle.textContent = 'No notes';
    elements.contentBody.innerHTML = '<div class="empty">Nothing exported yet.</div>';
    return;
  }

  state.selectedNoteId = note.id;
  renderContent(note);
}

elements.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  renderList();
});

elements.kindFilters.querySelectorAll('button').forEach((button) => {
  button.addEventListener('click', () => {
    state.kind = button.dataset.kind;
    elements.kindFilters.querySelectorAll('button').forEach((candidate) => {
      candidate.classList.toggle('active', candidate === button);
    });
    renderList();
  });
});

window.addEventListener('hashchange', () => {
  const hashState = parseHash();
  if (!hashState) {
    return;
  }
  state.selectedNoteId = hashState.note;
  state.selectedAnchor = hashState.anchor;
  render();
});

const initialHash = parseHash();
if (initialHash) {
  state.selectedNoteId = initialHash.note;
  state.selectedAnchor = initialHash.anchor;
}

render();
