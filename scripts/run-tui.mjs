import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import blessed from 'blessed';

const dataPath = path.resolve(process.cwd(), 'site', 'data', 'content.json');
const payload = JSON.parse(await readFile(dataPath, 'utf8'));
const notes = payload.notes ?? [];
const noteMap = new Map(notes.map((note) => [note.id, note]));

const state = {
  query: '',
  kind: 'all',
  focus: 'list',
  selectedIndex: 0,
  currentNoteId: notes[0]?.id ?? '',
  sideMode: 'links',
};

const screen = blessed.screen({
  smartCSR: true,
  dockBorders: true,
  fullUnicode: true,
  title: 'Golf Rules TUI',
});

const colors = {
  panel: '#06100a',
  border: '#4eff89',
  text: '#c9ffd7',
  muted: '#6fa883',
  accent: '#d7ff89',
  warn: '#ffe38a',
};

const header = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  tags: true,
  border: 'line',
  style: {
    fg: colors.text,
    bg: colors.panel,
    border: { fg: colors.border },
  },
});

const footer = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  tags: true,
  border: 'line',
  style: {
    fg: colors.text,
    bg: colors.panel,
    border: { fg: colors.border },
  },
});

const listPanel = blessed.list({
  parent: screen,
  top: 3,
  left: 0,
  width: '28%',
  height: '100%-6',
  label: ' {yellow-fg}INDEX{/yellow-fg} ',
  border: 'line',
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  style: {
    fg: colors.text,
    bg: 'black',
    border: { fg: colors.border },
    selected: { fg: 'black', bg: colors.accent },
  },
  scrollbar: {
    ch: ' ',
    style: { bg: colors.border },
  },
});

const contentPanel = blessed.box({
  parent: screen,
  top: 3,
  left: '28%',
  width: '50%',
  height: '100%-6',
  label: ' {yellow-fg}NOTE{/yellow-fg} ',
  border: 'line',
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  style: {
    fg: colors.text,
    bg: 'black',
    border: { fg: colors.border },
  },
  scrollbar: {
    ch: ' ',
    style: { bg: colors.border },
  },
});

const sidePanel = blessed.list({
  parent: screen,
  top: 3,
  left: '78%',
  width: '22%',
  height: '100%-6',
  label: ' {yellow-fg}LINKS{/yellow-fg} ',
  border: 'line',
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  style: {
    fg: colors.text,
    bg: 'black',
    border: { fg: colors.border },
    selected: { fg: 'black', bg: colors.accent },
  },
  scrollbar: {
    ch: ' ',
    style: { bg: colors.border },
  },
});

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

function currentNote() {
  return noteMap.get(state.currentNoteId) ?? filteredNotes()[0] ?? notes[0];
}

function normalizeMarkdown(text) {
  return text
    .replace(/\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_, note, anchor, label) => {
      const target = label || note || anchor || '';
      return anchor ? `${target} <${anchor}>` : target;
    })
    .replace(/^>\s?/gm, '| ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function notePlainText(note) {
  return normalizeMarkdown(note.body);
}

function renderHeader() {
  header.setContent(
    `{green-fg}$ {/green-fg}{bold}Golf Rules TUI{/bold}  ` +
      `{gray-fg}query:{/gray-fg} ${state.query || '<none>'}  ` +
      `{gray-fg}kind:{/gray-fg} ${state.kind}  ` +
      `{gray-fg}results:{/gray-fg} ${filteredNotes().length}  ` +
      `{gray-fg}side:{/gray-fg} ${state.sideMode}`,
  );
}

function renderFooter() {
  footer.setContent(
    `{yellow-fg}tab{/yellow-fg} focus  ` +
      `{yellow-fg}/{/yellow-fg} search  ` +
      `{yellow-fg}1{/yellow-fg} all  ` +
      `{yellow-fg}2{/yellow-fg} rules  ` +
      `{yellow-fg}3{/yellow-fg} definitions  ` +
      `{yellow-fg}4{/yellow-fg} clarifications  ` +
      `{yellow-fg}l{/yellow-fg} links  ` +
      `{yellow-fg}b{/yellow-fg} backlinks  ` +
      `{yellow-fg}t{/yellow-fg} toc  ` +
      `{yellow-fg}q{/yellow-fg} quit`,
  );
}

function renderList() {
  const filtered = filteredNotes();
  const items = filtered.map((note) => {
    const kind = note.kind.padEnd(13, ' ');
    return `{gray-fg}${kind}{/gray-fg} ${note.id}`;
  });

  listPanel.setItems(items.length ? items : ['{gray-fg}No matches{/gray-fg}']);

  const selectedId = currentNote()?.id;
  const index = Math.max(0, filtered.findIndex((note) => note.id === selectedId));
  state.selectedIndex = index >= 0 ? index : 0;
  listPanel.select(state.selectedIndex);
}

function renderContent() {
  const note = currentNote();
  if (!note) {
    contentPanel.setContent('No note loaded.');
    return;
  }

  contentPanel.setLabel(` {yellow-fg}${note.id}{/yellow-fg} `);
  contentPanel.setContent(notePlainText(note));
  contentPanel.setScroll(0);
}

function renderSide() {
  const note = currentNote();
  if (!note) {
    sidePanel.setItems(['No data']);
    return;
  }

  let items = [];
  let label = 'LINKS';

  if (state.sideMode === 'links') {
    label = 'LINKS';
    items = note.outbound.map((entry) => `${entry.note}${entry.anchor ? ` <${entry.anchor}>` : ''}`);
  } else if (state.sideMode === 'backlinks') {
    label = 'BACKLINKS';
    items = note.backlinks.map((entry) => `${entry.note}${entry.anchor ? ` <${entry.anchor}>` : ''}`);
  } else {
    label = 'TOC';
    items = note.headings
      .filter((heading) => heading.depth >= 2)
      .map((heading) => `${' '.repeat(Math.max(0, heading.depth - 2) * 2)}${heading.text}`);
  }

  sidePanel.setLabel(` {yellow-fg}${label}{/yellow-fg} `);
  sidePanel.setItems(items.length ? items : ['{gray-fg}Empty{/gray-fg}']);
  sidePanel.select(0);
}

function refresh() {
  renderHeader();
  renderFooter();
  renderList();
  renderContent();
  renderSide();

  if (state.focus === 'list') {
    listPanel.focus();
  } else if (state.focus === 'content') {
    contentPanel.focus();
  } else {
    sidePanel.focus();
  }

  screen.render();
}

function setCurrentNoteFromList(index) {
  const note = filteredNotes()[index];
  if (!note) {
    return;
  }
  state.selectedIndex = index;
  state.currentNoteId = note.id;
}

function promptSearch() {
  const prompt = blessed.prompt({
    parent: screen,
    border: 'line',
    height: 9,
    width: '60%',
    top: 'center',
    left: 'center',
    label: ' {yellow-fg}SEARCH{/yellow-fg} ',
    tags: true,
    keys: true,
    vi: true,
    style: {
      fg: colors.text,
      bg: colors.panel,
      border: { fg: colors.border },
    },
  });

  prompt.input('find>', state.query, (_, value) => {
    state.query = value ?? '';
    state.selectedIndex = 0;
    const first = filteredNotes()[0];
    if (first) {
      state.currentNoteId = first.id;
    }
    prompt.destroy();
    refresh();
  });
}

listPanel.on('select item', (_, index) => {
  setCurrentNoteFromList(index);
  refresh();
});

sidePanel.on('select item', (_, index) => {
  const note = currentNote();
  if (!note) {
    return;
  }

  if (state.sideMode === 'links') {
    const target = note.outbound[index];
    if (target) {
      state.currentNoteId = target.note;
      refresh();
    }
  } else if (state.sideMode === 'backlinks') {
    const target = note.backlinks[index];
    if (target) {
      state.currentNoteId = target.note;
      refresh();
    }
  }
});

screen.key(['q', 'C-c'], () => {
  screen.destroy();
  process.exit(0);
});
screen.key(['tab'], () => {
  state.focus = state.focus === 'list' ? 'content' : state.focus === 'content' ? 'side' : 'list';
  refresh();
});

screen.key(['/'], () => promptSearch());
screen.key(['1'], () => {
  state.kind = 'all';
  const first = filteredNotes()[0];
  if (first) {
    state.currentNoteId = first.id;
  }
  refresh();
});
screen.key(['2'], () => {
  state.kind = 'rule';
  const first = filteredNotes()[0];
  if (first) {
    state.currentNoteId = first.id;
  }
  refresh();
});
screen.key(['3'], () => {
  state.kind = 'definition';
  const first = filteredNotes()[0];
  if (first) {
    state.currentNoteId = first.id;
  }
  refresh();
});
screen.key(['4'], () => {
  state.kind = 'clarification';
  const first = filteredNotes()[0];
  if (first) {
    state.currentNoteId = first.id;
  }
  refresh();
});
screen.key(['l'], () => {
  state.sideMode = 'links';
  refresh();
});
screen.key(['b'], () => {
  state.sideMode = 'backlinks';
  refresh();
});
screen.key(['t'], () => {
  state.sideMode = 'toc';
  refresh();
});

contentPanel.key(['j', 'down'], () => {
  contentPanel.scroll(2);
  screen.render();
});
contentPanel.key(['k', 'up'], () => {
  contentPanel.scroll(-2);
  screen.render();
});
contentPanel.key(['pagedown'], () => {
  contentPanel.scroll(contentPanel.height - 4);
  screen.render();
});
contentPanel.key(['pageup'], () => {
  contentPanel.scroll(-(contentPanel.height - 4));
  screen.render();
});

refresh();
