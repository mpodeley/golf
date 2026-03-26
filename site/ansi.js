import { Terminal } from './vendor/xterm.mjs';
import { FitAddon } from './vendor/addon-fit.mjs';

const payload = await fetch('./data/content.json').then((response) => response.json());
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
  sideIndex: 0,
  inputMode: 'normal',
  searchDraft: '',
};

const terminal = new Terminal({
  convertEol: true,
  cursorBlink: true,
  fontFamily: '"IBM Plex Mono", "Cascadia Code", monospace',
  fontSize: 16,
  theme: {
    background: '#020603',
    foreground: '#c9ffd7',
    cursor: '#d7ff89',
    selectionBackground: '#29573a',
    black: '#020603',
    red: '#ff7a7a',
    green: '#67ff97',
    yellow: '#ffe38a',
    blue: '#86c8ff',
    magenta: '#ff9ff1',
    cyan: '#8cf6ff',
    white: '#e8fff0',
    brightBlack: '#4c6f56',
    brightRed: '#ff9b9b',
    brightGreen: '#b9ff8a',
    brightYellow: '#fff4b6',
    brightBlue: '#b6deff',
    brightMagenta: '#ffc2f7',
    brightCyan: '#c8fbff',
    brightWhite: '#ffffff',
  },
});

const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(document.getElementById('terminal'));
fitAddon.fit();

window.addEventListener('resize', () => {
  fitAddon.fit();
  render();
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

function sideItems(note) {
  if (!note) {
    return [];
  }
  if (state.sideMode === 'links') {
    return note.outbound.map((entry) => `${entry.note}${entry.anchor ? ` <${entry.anchor}>` : ''}`);
  }
  if (state.sideMode === 'backlinks') {
    return note.backlinks.map((entry) => `${entry.note}${entry.anchor ? ` <${entry.anchor}>` : ''}`);
  }
  return note.headings
    .filter((heading) => heading.depth >= 2)
    .map((heading) => `${' '.repeat(Math.max(0, heading.depth - 2) * 2)}${heading.text}`);
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

function wrapText(text, width) {
  const safeWidth = Math.max(10, width);
  const lines = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '  ');
    if (!line) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of line.split(' ')) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= safeWidth) {
        current = candidate;
        continue;
      }
      if (current) {
        lines.push(current);
      }
      if (word.length <= safeWidth) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += safeWidth) {
          lines.push(word.slice(i, i + safeWidth));
        }
        current = '';
      }
    }
    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

function pad(text, width) {
  return text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length);
}

function drawBox(width, height, title, bodyLines, selectedIndex = -1, focus = false) {
  const innerWidth = Math.max(1, width - 2);
  const visibleLines = Math.max(0, height - 2);
  const topTitle = title ? ` ${title} ` : '';
  const top = `┌${pad(topTitle, innerWidth).replace(/ /g, '─')}┐`.slice(0, width);
  const lines = [top];

  for (let i = 0; i < visibleLines; i += 1) {
    const raw = bodyLines[i] ?? '';
    let content = pad(raw, innerWidth);
    if (i === selectedIndex) {
      content = `\x1b[30;103m${content}\x1b[0m`;
    } else if (focus && raw) {
      content = `\x1b[38;2;201;255;215m${content}\x1b[0m`;
    }
    lines.push(`│${content}│`);
  }

  lines.push(`└${'─'.repeat(innerWidth)}┘`);
  return lines.slice(0, height);
}

function render() {
  const cols = terminal.cols || 80;
  const rows = terminal.rows || 24;
  const note = currentNote();
  const filtered = filteredNotes();

  const leftWidth = Math.max(22, Math.floor(cols * 0.28));
  const rightWidth = Math.max(20, Math.floor(cols * 0.22));
  const centerWidth = cols - leftWidth - rightWidth;
  const mainHeight = rows - 4;

  const listLines = filtered.map((item) => {
    const prefix = item.kind[0].toUpperCase();
    return `${prefix} ${item.id}`;
  });
  const listBox = drawBox(
    leftWidth,
    mainHeight,
    `INDEX ${state.kind.toUpperCase()}`,
    listLines,
    state.focus === 'list' ? state.selectedIndex : -1,
    state.focus === 'list',
  );

  const contentLines = wrapText(normalizeMarkdown(note?.body ?? 'No note.'), centerWidth - 2);
  const visibleContentLines = contentLines.slice(state.contentScroll, state.contentScroll + mainHeight - 2);
  const contentBox = drawBox(
    centerWidth,
    mainHeight,
    note?.id ?? 'NOTE',
    visibleContentLines,
    -1,
    state.focus === 'content',
  );

  const sideData = sideItems(note);
  const sideBox = drawBox(
    rightWidth,
    mainHeight,
    state.sideMode.toUpperCase(),
    sideData,
    state.focus === 'side' ? state.sideIndex : -1,
    state.focus === 'side',
  );

  const header = pad(
    `$ golf ansi browser | query:${state.query || '<none>'} | focus:${state.focus} | side:${state.sideMode} | notes:${filtered.length}`,
    cols,
  );

  const status =
    state.inputMode === 'search'
      ? pad(`search> ${state.searchDraft}`, cols)
      : pad('tab focus | / search | 1/2/3/4 kind | l/b/t side | enter open | arrows/jk move | q quit', cols);

  const frame = [];
  frame.push(`\x1b[38;2;215;255;137m${header}\x1b[0m`);
  for (let row = 0; row < mainHeight; row += 1) {
    frame.push(`${listBox[row] ?? ''}${contentBox[row] ?? ''}${sideBox[row] ?? ''}`);
  }
  frame.push(`\x1b[38;2;111;168;131m${status}\x1b[0m`);
  frame.push(`\x1b[38;2;111;168;131m${pad(note?.sourceUrl ?? '', cols)}\x1b[0m`);

  terminal.write('\x1b[2J\x1b[H');
  terminal.write(frame.join('\r\n'));
}

function selectFromList(index) {
  const filtered = filteredNotes();
  if (!filtered.length) {
    return;
  }
  state.selectedIndex = Math.max(0, Math.min(index, filtered.length - 1));
  state.currentNoteId = filtered[state.selectedIndex].id;
  state.contentScroll = 0;
  state.sideIndex = 0;
}

function openSideSelection() {
  const note = currentNote();
  if (!note) {
    return;
  }
  if (state.sideMode === 'links') {
    const item = note.outbound[state.sideIndex];
    if (item) {
      state.currentNoteId = item.note;
      state.contentScroll = 0;
      state.sideIndex = 0;
    }
  } else if (state.sideMode === 'backlinks') {
    const item = note.backlinks[state.sideIndex];
    if (item) {
      state.currentNoteId = item.note;
      state.contentScroll = 0;
      state.sideIndex = 0;
    }
  }
}

function cycleFocus() {
  state.focus = state.focus === 'list' ? 'content' : state.focus === 'content' ? 'side' : 'list';
}

function setKind(kind) {
  state.kind = kind;
  state.selectedIndex = 0;
  const first = filteredNotes()[0];
  if (first) {
    state.currentNoteId = first.id;
  }
  state.contentScroll = 0;
  state.sideIndex = 0;
}

terminal.onData((data) => {
  if (state.inputMode === 'search') {
    if (data === '\r') {
      state.query = state.searchDraft;
      state.inputMode = 'normal';
      selectFromList(0);
      render();
      return;
    }
    if (data === '\u001b') {
      state.inputMode = 'normal';
      state.searchDraft = state.query;
      render();
      return;
    }
    if (data === '\u007f') {
      state.searchDraft = state.searchDraft.slice(0, -1);
      render();
      return;
    }
    if (data >= ' ' && data <= '~') {
      state.searchDraft += data;
      render();
    }
    return;
  }

  if (data === '\u0003' || data === 'q') {
    terminal.dispose();
    return;
  }
  if (data === '\t') {
    cycleFocus();
    render();
    return;
  }
  if (data === '/') {
    state.inputMode = 'search';
    state.searchDraft = state.query;
    render();
    return;
  }
  if (data === '1') {
    setKind('all');
    render();
    return;
  }
  if (data === '2') {
    setKind('rule');
    render();
    return;
  }
  if (data === '3') {
    setKind('definition');
    render();
    return;
  }
  if (data === '4') {
    setKind('clarification');
    render();
    return;
  }
  if (data === 'l') {
    state.sideMode = 'links';
    state.sideIndex = 0;
    render();
    return;
  }
  if (data === 'b') {
    state.sideMode = 'backlinks';
    state.sideIndex = 0;
    render();
    return;
  }
  if (data === 't') {
    state.sideMode = 'toc';
    state.sideIndex = 0;
    render();
    return;
  }
  if (data === '\r') {
    if (state.focus === 'list') {
      selectFromList(state.selectedIndex);
    } else if (state.focus === 'side') {
      openSideSelection();
    }
    render();
    return;
  }

  const up = data === '\u001b[A' || data === 'k';
  const down = data === '\u001b[B' || data === 'j';
  const pageUp = data === '\u001b[5~';
  const pageDown = data === '\u001b[6~';

  if (state.focus === 'list') {
    if (up) {
      selectFromList(state.selectedIndex - 1);
      render();
    } else if (down) {
      selectFromList(state.selectedIndex + 1);
      render();
    }
    return;
  }

  if (state.focus === 'content') {
    const note = currentNote();
    const wrapped = wrapText(normalizeMarkdown(note?.body ?? ''), centerWidthGuess() - 2);
    const maxScroll = Math.max(0, wrapped.length - (terminal.rows - 6));
    if (up) {
      state.contentScroll = Math.max(0, state.contentScroll - 1);
      render();
    } else if (down) {
      state.contentScroll = Math.min(maxScroll, state.contentScroll + 1);
      render();
    } else if (pageUp) {
      state.contentScroll = Math.max(0, state.contentScroll - 10);
      render();
    } else if (pageDown) {
      state.contentScroll = Math.min(maxScroll, state.contentScroll + 10);
      render();
    }
    return;
  }

  if (state.focus === 'side') {
    const items = sideItems(currentNote());
    if (up) {
      state.sideIndex = Math.max(0, state.sideIndex - 1);
      render();
    } else if (down) {
      state.sideIndex = Math.min(Math.max(0, items.length - 1), state.sideIndex + 1);
      render();
    }
  }
});

function centerWidthGuess() {
  const cols = terminal.cols || 80;
  const leftWidth = Math.max(22, Math.floor(cols * 0.28));
  const rightWidth = Math.max(20, Math.floor(cols * 0.22));
  return cols - leftWidth - rightWidth;
}

selectFromList(0);
render();
