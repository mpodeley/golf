import { marked } from './vendor/marked.esm.js';

const data = window.GOLF_VAULT_DATA;
const notes = data?.notes ?? [];
const noteMap = new Map(notes.map((note) => [note.id, note]));
const graphNodeMap = new Map((data?.graph?.nodes ?? []).map((node) => [node.id, node]));
const svgNamespace = 'http://www.w3.org/2000/svg';

const state = {
  query: '',
  kind: 'all',
  view: 'note',
  selectedNoteId: notes[0]?.id ?? null,
  selectedAnchor: '',
};

const elements = {
  stats: document.getElementById('app-stats'),
  searchInput: document.getElementById('search-input'),
  kindFilters: document.getElementById('kind-filters'),
  viewFilters: document.getElementById('view-filters'),
  noteList: document.getElementById('note-list'),
  contentTitle: document.getElementById('content-title'),
  contentBody: document.getElementById('content-body'),
  graphView: document.getElementById('graph-view'),
  graphSummary: document.getElementById('graph-summary'),
  graphSvg: document.getElementById('graph-svg'),
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
  const view = params.get('view') ?? 'note';
  if (!note) {
    return null;
  }
  return { note, anchor, view };
}

function updateHash() {
  const params = new URLSearchParams();
  if (state.selectedNoteId) {
    params.set('note', state.selectedNoteId);
  }
  if (state.selectedAnchor) {
    params.set('anchor', state.selectedAnchor);
  }
  if (state.view !== 'note') {
    params.set('view', state.view);
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

function kindColor(kind) {
  switch (kind) {
    case 'rule':
      return 'rgba(255, 227, 138, 0.95)';
    case 'clarification':
      return 'rgba(137, 200, 255, 0.95)';
    default:
      return 'rgba(116, 227, 153, 0.85)';
  }
}

function hashNumber(value) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function createSvgElement(name, attributes = {}) {
  const node = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function graphLayout(items, width, height) {
  const marginX = 90;
  const marginTop = 72;
  const innerWidth = width - marginX * 2;
  const innerHeight = height - marginTop * 2;
  const groups = [
    ['rule', items.filter((item) => item.kind === 'rule')],
    ['clarification', items.filter((item) => item.kind === 'clarification')],
    ['definition', items.filter((item) => item.kind === 'definition')],
  ];
  const layout = new Map();

  groups.forEach(([kind, group], groupIndex) => {
    const boxWidth = innerWidth / groups.length;
    const boxX = marginX + boxWidth * groupIndex;
    const cols = Math.max(1, Math.ceil(Math.sqrt(group.length / 2)));
    const rows = Math.max(1, Math.ceil(group.length / cols));
    const cellWidth = boxWidth / Math.max(cols, 1);
    const cellHeight = innerHeight / Math.max(rows, 1);

    const sorted = [...group].sort((left, right) => {
      const leftDegree = graphNodeMap.get(left.id)?.degree ?? 0;
      const rightDegree = graphNodeMap.get(right.id)?.degree ?? 0;
      return rightDegree - leftDegree || left.id.localeCompare(right.id);
    });

    sorted.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const hash = hashNumber(item.id);
      const jitterX = ((hash % 13) - 6) * 2.3;
      const jitterY = (((hash >> 4) % 13) - 6) * 2.1;
      layout.set(item.id, {
        x: boxX + cellWidth * (col + 0.5) + jitterX,
        y: marginTop + cellHeight * (row + 0.5) + jitterY,
        kind,
      });
    });
  });

  return layout;
}

function renderGraph(note, matches) {
  const width = 1000;
  const height = 720;
  const layout = graphLayout(notes, width, height);
  const selectedNoteId = note.id;
  const selectedNeighbors = new Set([selectedNoteId]);

  for (const reference of note.outbound) {
    selectedNeighbors.add(reference.note);
  }
  for (const reference of note.backlinks) {
    selectedNeighbors.add(reference.note);
  }

  elements.graphSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  elements.graphSvg.innerHTML = '';

  const edgesLayer = createSvgElement('g');
  const nodesLayer = createSvgElement('g');
  const labelsLayer = createSvgElement('g');

  for (const [kind, x] of [
    ['RULES', width * 0.17],
    ['CLARIFICATIONS', width * 0.5],
    ['DEFINITIONS', width * 0.83],
  ]) {
    labelsLayer.appendChild(
      createSvgElement('text', {
        x,
        y: 28,
        class: 'graph-cluster-label',
        'text-anchor': 'middle',
      }),
    ).textContent = kind;
  }

  for (const edge of data.graph.edges ?? []) {
    if (!selectedNeighbors.has(edge.source) || !selectedNeighbors.has(edge.target)) {
      continue;
    }
    const source = layout.get(edge.source);
    const target = layout.get(edge.target);
    if (!source || !target) {
      continue;
    }
    edgesLayer.appendChild(
      createSvgElement('line', {
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
        class: `graph-edge${edge.source === selectedNoteId || edge.target === selectedNoteId ? ' selected' : ''}`,
      }),
    );
  }

  const matchedIds = new Set(matches.map((item) => item.id));

  for (const item of notes) {
    const position = layout.get(item.id);
    if (!position) {
      continue;
    }
    const degree = graphNodeMap.get(item.id)?.degree ?? 0;
    const radius = 3 + Math.min(6, Math.sqrt(degree) * 0.45);
    const isSelected = item.id === selectedNoteId;
    const isNeighbor = selectedNeighbors.has(item.id);
    const isMatched = matchedIds.has(item.id);
    const dimmed = !isMatched && (state.query || state.kind !== 'all');

    const node = createSvgElement('circle', {
      cx: position.x,
      cy: position.y,
      r: isSelected ? radius + 2.4 : radius,
      class: `graph-node ${item.kind}${isSelected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`,
      fill: kindColor(item.kind),
      opacity: isNeighbor || isSelected ? 1 : dimmed ? 0.14 : 0.62,
    });
    node.addEventListener('click', () => {
      state.selectedNoteId = item.id;
      state.selectedAnchor = '';
      state.view = 'graph';
      updateHash();
      render();
    });
    const title = createSvgElement('title');
    title.textContent = `${item.id} (${item.kind})`;
    node.appendChild(title);
    nodesLayer.appendChild(node);

    if (isSelected || (isNeighbor && item.kind !== 'definition')) {
      const label = createSvgElement('text', {
        x: position.x + radius + 6,
        y: position.y + 4,
        class: 'graph-node-label',
        opacity: isSelected ? 1 : 0.78,
      });
      label.textContent = item.id;
      labelsLayer.appendChild(label);
    }
  }

  elements.graphSvg.append(edgesLayer, nodesLayer, labelsLayer);
  elements.graphSummary.innerHTML = `
    <span>selected: <strong>${note.id}</strong></span>
    <span>neighbors: <strong>${selectedNeighbors.size - 1}</strong></span>
    <span>visible notes: <strong>${matches.length}</strong></span>
    <span>hint: click any node to focus it</span>
  `;
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
  const matches = filteredNotes();
  elements.contentTitle.textContent =
    state.view === 'graph' ? `Graph | ${note.id}` : `${note.id} | ${note.kind}`;
  elements.contentBody.classList.toggle('hidden', state.view === 'graph');
  elements.graphView.classList.toggle('hidden', state.view !== 'graph');

  if (state.view === 'graph') {
    renderGraph(note, matches);
  } else {
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
  }

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

elements.viewFilters.querySelectorAll('button').forEach((button) => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    elements.viewFilters.querySelectorAll('button').forEach((candidate) => {
      candidate.classList.toggle('active', candidate === button);
    });
    updateHash();
    render();
  });
});

window.addEventListener('hashchange', () => {
  const hashState = parseHash();
  if (!hashState) {
    return;
  }
  state.selectedNoteId = hashState.note;
  state.selectedAnchor = hashState.anchor;
  state.view = hashState.view === 'graph' ? 'graph' : 'note';
  elements.viewFilters.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
  });
  render();
});

const initialHash = parseHash();
if (initialHash) {
  state.selectedNoteId = initialHash.note;
  state.selectedAnchor = initialHash.anchor;
  state.view = initialHash.view === 'graph' ? 'graph' : 'note';
}

elements.viewFilters.querySelectorAll('button').forEach((button) => {
  button.classList.toggle('active', button.dataset.view === state.view);
});

render();
