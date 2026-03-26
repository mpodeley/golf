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
  contentScroll: 0,
};

const screen = blessed.screen({
  smartCSR: true,
  dockBorders: true,
  fullUnicode: true,
  mouse: true,
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

const toolbar = blessed.box({
  parent: screen,
  top: 3,
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
  top: 6,
  left: 0,
  width: '28%',
  height: '100%-9',
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
  top: 6,
  left: '28%',
  width: '50%',
  height: '100%-9',
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
  top: 6,
  left: '78%',
  width: '22%',
  height: '100%-9',
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

function makeToolbarButton({ left, width, onPress }) {
  const button = blessed.button({
    parent: toolbar,
    mouse: true,
    keys: false,
    shrink: true,
    top: 0,
    left,
    width,
    height: 1,
    content: '',
    tags: true,
    padding: {
      left: 1,
      right: 1,
    },
    style: {
      fg: colors.text,
      bg: 'black',
      focus: {
        fg: 'black',
        bg: colors.accent,
      },
      hover: {
        fg: 'black',
        bg: colors.accent,
      },
    },
  });

  button.on('press', () => {
    onPress();
  });

  return button;
}

const toolbarButtons = {
  search: makeToolbarButton({ left: 1, width: 16, onPress: () => promptSearch() }),
  all: makeToolbarButton({ left: 17, width: 8, onPress: () => applyKind('all') }),
  rules: makeToolbarButton({ left: 25, width: 10, onPress: () => applyKind('rule') }),
  definitions: makeToolbarButton({ left: 35, width: 9, onPress: () => applyKind('definition') }),
  clarifications: makeToolbarButton({ left: 44, width: 10, onPress: () => applyKind('clarification') }),
  links: makeToolbarButton({ left: 54, width: 9, onPress: () => applySideMode('links') }),
  backlinks: makeToolbarButton({ left: 63, width: 8, onPress: () => applySideMode('backlinks') }),
  toc: makeToolbarButton({ left: 71, width: 6, onPress: () => applySideMode('toc') }),
  quit: makeToolbarButton({
    left: 77,
    width: 7,
    onPress: () => {
      screen.destroy();
      process.exit(0);
    },
  }),
};

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

function focusPanel(panel) {
  state.focus = panel;
}

function setCurrentNoteId(noteId) {
  if (!noteId || !noteMap.has(noteId)) {
    return;
  }

  state.currentNoteId = noteId;
  state.contentScroll = 0;
}

function selectFirstFilteredNote() {
  state.selectedIndex = 0;
  const first = filteredNotes()[0];
  if (first) {
    setCurrentNoteId(first.id);
  }
}

function applyKind(kind) {
  state.kind = kind;
  focusPanel('list');
  selectFirstFilteredNote();
  refresh();
}

function applySideMode(mode) {
  state.sideMode = mode;
  focusPanel('side');
  refresh();
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

function setButtonContent(button, label, active = false) {
  button.setContent(` ${label} `);
  button.style.fg = active ? 'black' : colors.text;
  button.style.bg = active ? colors.accent : 'black';
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

function renderToolbar() {
  setButtonContent(
    toolbarButtons.search,
    state.query ? `find:${state.query.slice(0, 8)}` : 'find',
  );
  setButtonContent(toolbarButtons.all, 'all', state.kind === 'all');
  setButtonContent(toolbarButtons.rules, 'rules', state.kind === 'rule');
  setButtonContent(toolbarButtons.definitions, 'defs', state.kind === 'definition');
  setButtonContent(toolbarButtons.clarifications, 'clar', state.kind === 'clarification');
  setButtonContent(toolbarButtons.links, 'links', state.sideMode === 'links');
  setButtonContent(toolbarButtons.backlinks, 'back', state.sideMode === 'backlinks');
  setButtonContent(toolbarButtons.toc, 'toc', state.sideMode === 'toc');
  setButtonContent(toolbarButtons.quit, 'quit');
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
  contentPanel.setScroll(state.contentScroll);
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
  renderToolbar();
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
  setCurrentNoteId(note.id);
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
    selectFirstFilteredNote();
    focusPanel('list');
    prompt.destroy();
    refresh();
  });
}

listPanel.on('click', () => {
  focusPanel('list');
  refresh();
});

listPanel.on('select item', (_, index) => {
  setCurrentNoteFromList(index);
  focusPanel('content');
  refresh();
});

contentPanel.on('click', () => {
  focusPanel('content');
  refresh();
});

contentPanel.on('wheeldown', () => {
  focusPanel('content');
  contentPanel.scroll(4);
  state.contentScroll = contentPanel.getScroll();
  screen.render();
});

contentPanel.on('wheelup', () => {
  focusPanel('content');
  contentPanel.scroll(-4);
  state.contentScroll = contentPanel.getScroll();
  screen.render();
});

sidePanel.on('click', () => {
  focusPanel('side');
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
      setCurrentNoteId(target.note);
      focusPanel('content');
      refresh();
    }
  } else if (state.sideMode === 'backlinks') {
    const target = note.backlinks[index];
    if (target) {
      setCurrentNoteId(target.note);
      focusPanel('content');
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
screen.key(['1'], () => applyKind('all'));
screen.key(['2'], () => applyKind('rule'));
screen.key(['3'], () => applyKind('definition'));
screen.key(['4'], () => applyKind('clarification'));
screen.key(['l'], () => applySideMode('links'));
screen.key(['b'], () => applySideMode('backlinks'));
screen.key(['t'], () => applySideMode('toc'));

contentPanel.key(['j', 'down'], () => {
  contentPanel.scroll(2);
  state.contentScroll = contentPanel.getScroll();
  screen.render();
});
contentPanel.key(['k', 'up'], () => {
  contentPanel.scroll(-2);
  state.contentScroll = contentPanel.getScroll();
  screen.render();
});
contentPanel.key(['pagedown'], () => {
  contentPanel.scroll(contentPanel.height - 4);
  state.contentScroll = contentPanel.getScroll();
  screen.render();
});
contentPanel.key(['pageup'], () => {
  contentPanel.scroll(-(contentPanel.height - 4));
  state.contentScroll = contentPanel.getScroll();
  screen.render();
});

refresh();
