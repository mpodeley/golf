import { Terminal } from './vendor/xterm.mjs';
import { FitAddon } from './vendor/addon-fit.mjs';
import {
  createGameState,
  getGameArtLines,
  getGameBodyLines,
  getGameChoiceItems,
  getGameScene,
  getGameSidebarLines,
  getGameStatus,
  gameScoreTotal,
  stepGame,
} from './game.js';

const payload = await fetch('./data/content.json').then((response) => response.json());
const notes = payload.notes ?? [];
const noteMap = new Map(notes.map((note) => [note.id, note]));
const terminalElement = document.getElementById('terminal');
const interactiveZones = [];

const state = {
  mode: 'play',
  query: '',
  kind: 'all',
  focus: 'side',
  selectedIndex: 0,
  currentNoteId: notes[0]?.id ?? '',
  sideMode: 'links',
  contentScroll: 0,
  sideIndex: 0,
  inputMode: 'normal',
  searchDraft: '',
  game: createGameState(),
};

const terminal = new Terminal({
  convertEol: true,
  cursorBlink: true,
  cursorStyle: 'block',
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
terminal.open(terminalElement);
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

function getLayout() {
  const cols = terminal.cols || 80;
  const rows = terminal.rows || 24;
  const leftWidth = Math.max(22, Math.floor(cols * 0.28));
  const rightWidth = Math.max(20, Math.floor(cols * 0.22));
  const centerWidth = cols - leftWidth - rightWidth;
  const mainHeight = Math.max(8, rows - 4);

  return {
    cols,
    rows,
    leftWidth,
    rightWidth,
    centerWidth,
    mainHeight,
    mainTop: 2,
  };
}

function addInteractiveZone(zone) {
  interactiveZones.push(zone);
}

function zoneAtCell(cell) {
  for (let index = interactiveZones.length - 1; index >= 0; index -= 1) {
    const zone = interactiveZones[index];
    if (
      cell.col >= zone.x1 &&
      cell.col < zone.x2 &&
      cell.row >= zone.y1 &&
      cell.row < zone.y2
    ) {
      return zone;
    }
  }

  return null;
}

function eventToCell(event) {
  const rect = terminalElement.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  const col = Math.max(
    0,
    Math.min(
      (terminal.cols || 80) - 1,
      Math.floor(((event.clientX - rect.left) / rect.width) * (terminal.cols || 80)),
    ),
  );
  const row = Math.max(
    0,
    Math.min(
      (terminal.rows || 24) - 1,
      Math.floor(((event.clientY - rect.top) / rect.height) * (terminal.rows || 24)),
    ),
  );

  return { col, row };
}

function setCurrentNoteId(noteId) {
  if (!noteId || !noteMap.has(noteId)) {
    return;
  }

  state.currentNoteId = noteId;
  state.contentScroll = 0;
  state.sideIndex = 0;
}

function selectFirstFilteredNote() {
  state.selectedIndex = 0;
  const first = filteredNotes()[0];
  if (first) {
    setCurrentNoteId(first.id);
  }
}

function setSideMode(mode) {
  state.sideMode = mode;
  state.sideIndex = 0;
  state.focus = 'side';
}

function startSearch() {
  state.inputMode = 'search';
  state.searchDraft = state.query;
}

function setMode(mode) {
  state.mode = mode;
  state.inputMode = 'normal';
  if (mode === 'play') {
    state.focus = 'side';
  } else {
    state.focus = 'list';
  }
}

function restartGame() {
  state.game = createGameState();
  state.focus = 'side';
  state.inputMode = 'normal';
}

function playChoiceItems() {
  const items = getGameChoiceItems(state.game);
  if (items.length) {
    return items;
  }

  if (getGameScene(state.game).title === 'Hoyo 19') {
    return [
      { label: 'Reiniciar aventura', kind: 'restart' },
      { label: 'Volver al vault', kind: 'vault' },
    ];
  }

  return [];
}

function activatePlayChoice(index) {
  const items = playChoiceItems();
  const item = items[index];
  if (!item) {
    return;
  }

  if (item.kind === 'restart') {
    restartGame();
    return;
  }

  if (item.kind === 'vault') {
    setMode('library');
    return;
  }

  stepGame(state.game, index);
}

function moveActivePlayChoice(delta) {
  const items = playChoiceItems();
  if (!items.length) {
    state.game.choiceIndex = 0;
    return;
  }

  state.game.choiceIndex = Math.max(0, Math.min(items.length - 1, state.game.choiceIndex + delta));
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

function scrollContent(delta) {
  const note = currentNote();
  const layout = getLayout();
  const wrapped = wrapText(normalizeMarkdown(note?.body ?? ''), layout.centerWidth - 2);
  const maxScroll = Math.max(0, wrapped.length - (layout.mainHeight - 2));
  state.contentScroll = Math.max(0, Math.min(maxScroll, state.contentScroll + delta));
}

function scrollToHeading(index) {
  const note = currentNote();
  if (!note) {
    return;
  }

  const headings = note.headings.filter((heading) => heading.depth >= 2);
  const target = headings[index];
  if (!target) {
    return;
  }

  const layout = getLayout();
  const wrapped = wrapText(normalizeMarkdown(note.body), layout.centerWidth - 2);
  const lineIndex = wrapped.findIndex((line) => line.trim().includes(target.text));
  if (lineIndex >= 0) {
    state.contentScroll = lineIndex;
  }
  state.focus = 'content';
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

function makePlayOptionLines(items, width, selectedIndex) {
  const innerWidth = Math.max(10, width);
  const lines = [];
  const zones = [];
  let currentLine = '';
  let currentLength = 0;
  let currentRow = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const selected = index === selectedIndex;
    const token = `${selected ? '>_' : '  '} ${item.label}`;
    const separator = currentLength === 0 ? '' : '   ';
    const nextLength = currentLength + separator.length + token.length;

    if (currentLength !== 0 && nextLength > innerWidth) {
      lines.push(pad(currentLine, innerWidth));
      currentLine = token;
      currentLength = token.length;
      currentRow += 1;
      zones.push({
        index,
        row: currentRow,
        x1: 0,
        x2: token.length,
      });
      continue;
    }

    const start = currentLength + separator.length;
    currentLine += `${separator}${token}`;
    currentLength += separator.length + token.length;
    zones.push({
      index,
      row: currentRow,
      x1: start,
      x2: start + token.length,
    });
  }

  if (currentLine || !lines.length) {
    lines.push(pad(currentLine, innerWidth));
  }

  return { lines, zones };
}

function render() {
  const { cols, leftWidth, rightWidth, centerWidth, mainHeight, mainTop } = getLayout();
  interactiveZones.length = 0;

  if (state.mode === 'play') {
    const scene = getGameScene(state.game);
    const optionHeight = Math.min(8, Math.max(6, Math.floor(mainHeight * 0.28)));
    const topHeight = mainHeight - optionHeight;
    const textWidth = Math.max(44, Math.floor(cols * 0.62));
    const artWidth = Math.max(26, cols - textWidth);
    const contentLines = wrapText(getGameBodyLines(state.game).join('\n'), textWidth - 2);
    const maxGameScroll = Math.max(0, contentLines.length - (topHeight - 2));
    state.game.contentScroll = Math.max(0, Math.min(maxGameScroll, state.game.contentScroll));
    const visibleContentLines = contentLines.slice(
      state.game.contentScroll,
      state.game.contentScroll + topHeight - 2,
    );
    const choiceItems = playChoiceItems();
    const artLines = [...getGameArtLines(state.game), '', ...getGameSidebarLines(state.game)];
    const artBox = drawBox(
      artWidth,
      topHeight,
      `HUD H${scene.hole}`,
      artLines,
      -1,
      state.focus === 'list',
    );
    const contentBox = drawBox(
      textWidth,
      topHeight,
      scene.title.toUpperCase(),
      visibleContentLines,
      -1,
      state.focus === 'content',
    );
    const optionLayout = makePlayOptionLines(choiceItems, cols - 2, state.game.choiceIndex);
    const optionsBox = drawBox(
      cols,
      optionHeight,
      state.game.feedback ? 'CONTINUE' : 'COMMAND',
      optionLayout.lines.length ? optionLayout.lines : [pad('Sin opciones', cols - 2)],
      -1,
      state.focus === 'side',
    );

    const header = pad(
      `$ golf ansi adventure | scene:${scene.title} | total:${gameScoreTotal(state.game)} | etiqueta:${state.game.etiquette}`,
      cols,
    );

    const toolbarSpecs = [
      { label: 'vault', active: false, onClick: () => setMode('library') },
      { label: 'play', active: true, onClick: () => setMode('play') },
      { label: 'restart', active: false, onClick: () => restartGame() },
    ];
    const toolbar = [];
    let toolbarColumn = 0;

    for (const spec of toolbarSpecs) {
      const visibleLabel = `[${spec.label}]`;
      if (toolbarColumn + visibleLabel.length > cols) {
        break;
      }

      addInteractiveZone({
        x1: toolbarColumn,
        x2: Math.min(cols, toolbarColumn + visibleLabel.length),
        y1: 1,
        y2: 2,
        onClick: spec.onClick,
      });

      toolbar.push(
        spec.active
          ? `\x1b[30;103m${visibleLabel}\x1b[0m`
          : `\x1b[38;2;201;255;215m${visibleLabel}\x1b[0m`,
      );
      toolbarColumn += visibleLabel.length;

      if (toolbarColumn < cols) {
        toolbar.push(' ');
        toolbarColumn += 1;
      }
    }

    addInteractiveZone({
      x1: 0,
      x2: textWidth,
      y1: mainTop,
      y2: mainTop + topHeight,
      onClick: () => {
        state.focus = 'content';
      },
    });
    addInteractiveZone({
      x1: textWidth,
      x2: cols,
      y1: mainTop,
      y2: mainTop + topHeight,
      onClick: () => {
        state.focus = 'list';
      },
    });
    addInteractiveZone({
      x1: 0,
      x2: cols,
      y1: mainTop + topHeight,
      y2: mainTop + mainHeight,
      onClick: () => {
        state.focus = 'side';
      },
    });

    for (const zone of optionLayout.zones) {
      addInteractiveZone({
        x1: 1 + zone.x1,
        x2: 1 + zone.x2,
        y1: mainTop + topHeight + 1 + zone.row,
        y2: mainTop + topHeight + 2 + zone.row,
        onClick: () => {
          state.game.choiceIndex = zone.index;
          activatePlayChoice(zone.index);
        },
      });
    }

    const frame = [];
    frame.push(`\x1b[38;2;215;255;137m${header}\x1b[0m`);
    frame.push(toolbar.join(''));
    for (let row = 0; row < topHeight; row += 1) {
      frame.push(`${contentBox[row] ?? ''}${artBox[row] ?? ''}`);
    }
    for (let row = 0; row < optionHeight; row += 1) {
      frame.push(optionsBox[row] ?? '');
    }
    frame.push(`\x1b[38;2;111;168;131m${pad(getGameStatus(state.game), cols)}\x1b[0m`);
    frame.push(`\x1b[38;2;111;168;131m${pad('Tu Primera Vuelta | click o teclado para elegir', cols)}\x1b[0m`);

    terminal.write('\x1b[2J\x1b[H');
    terminal.write(frame.join('\r\n'));
    return;
  }

  const note = currentNote();
  const filtered = filteredNotes();

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
  const toolbarSpecs = [
    {
      label: 'vault',
      active: true,
      onClick: () => setMode('library'),
    },
    {
      label: 'play',
      active: false,
      onClick: () => setMode('play'),
    },
    {
      label: state.query ? `find:${state.query.slice(0, 8)}` : 'find',
      active: state.inputMode === 'search',
      onClick: () => startSearch(),
    },
    {
      label: 'all',
      active: state.kind === 'all',
      onClick: () => setKind('all'),
    },
    {
      label: 'rules',
      active: state.kind === 'rule',
      onClick: () => setKind('rule'),
    },
    {
      label: 'defs',
      active: state.kind === 'definition',
      onClick: () => setKind('definition'),
    },
    {
      label: 'clar',
      active: state.kind === 'clarification',
      onClick: () => setKind('clarification'),
    },
    {
      label: 'links',
      active: state.sideMode === 'links',
      onClick: () => setSideMode('links'),
    },
    {
      label: 'back',
      active: state.sideMode === 'backlinks',
      onClick: () => setSideMode('backlinks'),
    },
    {
      label: 'toc',
      active: state.sideMode === 'toc',
      onClick: () => setSideMode('toc'),
    },
    {
      label: 'restart',
      active: false,
      onClick: () => restartGame(),
    },
  ];
  const toolbar = [];
  let toolbarColumn = 0;

  for (const spec of toolbarSpecs) {
    const visibleLabel = `[${spec.label}]`;
    if (toolbarColumn + visibleLabel.length > cols) {
      break;
    }

    addInteractiveZone({
      x1: toolbarColumn,
      x2: Math.min(cols, toolbarColumn + visibleLabel.length),
      y1: 1,
      y2: 2,
      onClick: spec.onClick,
    });

    toolbar.push(
      spec.active
        ? `\x1b[30;103m${visibleLabel}\x1b[0m`
        : `\x1b[38;2;201;255;215m${visibleLabel}\x1b[0m`,
    );
    toolbarColumn += visibleLabel.length;

    if (toolbarColumn < cols) {
      toolbar.push(' ');
      toolbarColumn += 1;
    }
  }

  const status =
    state.inputMode === 'search'
      ? pad(`search> ${state.searchDraft}`, cols)
      : pad(
          'g play | click panels | wheel note | tab focus | / search | 1/2/3/4 kind | l/b/t side | enter open | q quit',
          cols,
        );

  addInteractiveZone({
    x1: 0,
    x2: leftWidth,
    y1: mainTop,
    y2: mainTop + mainHeight,
    onClick: () => {
      state.focus = 'list';
    },
  });
  addInteractiveZone({
    x1: leftWidth,
    x2: leftWidth + centerWidth,
    y1: mainTop,
    y2: mainTop + mainHeight,
    onClick: () => {
      state.focus = 'content';
    },
  });
  addInteractiveZone({
    x1: leftWidth + centerWidth,
    x2: cols,
    y1: mainTop,
    y2: mainTop + mainHeight,
    onClick: () => {
      state.focus = 'side';
    },
  });

  for (let index = 0; index < Math.min(listLines.length, mainHeight - 2); index += 1) {
    addInteractiveZone({
      x1: 1,
      x2: Math.max(1, leftWidth - 1),
      y1: mainTop + 1 + index,
      y2: mainTop + 2 + index,
      onClick: () => {
        selectFromList(index);
        state.focus = 'content';
      },
    });
  }

  for (let index = 0; index < Math.min(sideData.length, mainHeight - 2); index += 1) {
    addInteractiveZone({
      x1: leftWidth + centerWidth + 1,
      x2: Math.max(leftWidth + centerWidth + 1, cols - 1),
      y1: mainTop + 1 + index,
      y2: mainTop + 2 + index,
      onClick: () => {
        state.sideIndex = index;
        openSideSelection();
      },
    });
  }

  const frame = [];
  frame.push(`\x1b[38;2;215;255;137m${header}\x1b[0m`);
  frame.push(toolbar.join(''));
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
  setCurrentNoteId(filtered[state.selectedIndex].id);
}

function openSideSelection() {
  const note = currentNote();
  if (!note) {
    return;
  }
  if (state.sideMode === 'links') {
    const item = note.outbound[state.sideIndex];
    if (item) {
      setCurrentNoteId(item.note);
      state.focus = 'content';
    }
  } else if (state.sideMode === 'backlinks') {
    const item = note.backlinks[state.sideIndex];
    if (item) {
      setCurrentNoteId(item.note);
      state.focus = 'content';
    }
  } else {
    scrollToHeading(state.sideIndex);
  }
}

function cycleFocus() {
  state.focus = state.focus === 'list' ? 'content' : state.focus === 'content' ? 'side' : 'list';
}

function setKind(kind) {
  state.kind = kind;
  state.focus = 'list';
  selectFirstFilteredNote();
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

  if (state.mode === 'play') {
    if (data === '\u0003' || data === 'q') {
      terminal.dispose();
      return;
    }
    if (data === 'v') {
      setMode('library');
      render();
      return;
    }
    if (data === 'g') {
      setMode('play');
      render();
      return;
    }
    if (data === 'r') {
      restartGame();
      render();
      return;
    }
    if (data === '\t') {
      state.focus = state.focus === 'list' ? 'content' : state.focus === 'content' ? 'side' : 'list';
      render();
      return;
    }
    if (data === '\r') {
      if (state.focus === 'side') {
        activatePlayChoice(state.game.choiceIndex);
      }
      render();
      return;
    }

    const up = data === '\u001b[A' || data === 'k';
    const down = data === '\u001b[B' || data === 'j';
    const pageUp = data === '\u001b[5~';
    const pageDown = data === '\u001b[6~';

    if (state.focus === 'content') {
      if (up) {
        state.game.contentScroll = Math.max(0, state.game.contentScroll - 1);
        render();
      } else if (down) {
        state.game.contentScroll += 1;
        render();
      } else if (pageUp) {
        state.game.contentScroll = Math.max(0, state.game.contentScroll - 10);
        render();
      } else if (pageDown) {
        state.game.contentScroll += 10;
        render();
      }
      return;
    }

    if (state.focus === 'side') {
      if (up) {
        moveActivePlayChoice(-1);
        render();
      } else if (down) {
        moveActivePlayChoice(1);
        render();
      }
      return;
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
    startSearch();
    render();
    return;
  }
  if (data === 'g') {
    setMode('play');
    render();
    return;
  }
  if (data === 'v') {
    setMode('library');
    render();
    return;
  }
  if (data === 'r') {
    restartGame();
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
    setSideMode('links');
    render();
    return;
  }
  if (data === 'b') {
    setSideMode('backlinks');
    render();
    return;
  }
  if (data === 't') {
    setSideMode('toc');
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
    if (up) {
      scrollContent(-1);
      render();
    } else if (down) {
      scrollContent(1);
      render();
    } else if (pageUp) {
      scrollContent(-10);
      render();
    } else if (pageDown) {
      scrollContent(10);
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

terminalElement.addEventListener('click', (event) => {
  const cell = eventToCell(event);
  const zone = cell ? zoneAtCell(cell) : null;
  if (!zone) {
    return;
  }

  event.preventDefault();
  zone.onClick();
  terminal.focus();
  render();
});

terminalElement.addEventListener(
  'wheel',
  (event) => {
    const cell = eventToCell(event);
    if (!cell) {
      return;
    }

    const { cols, mainTop, mainHeight } = getLayout();
    let overContent = false;

    if (state.mode === 'play') {
      const optionHeight = Math.min(8, Math.max(6, Math.floor(mainHeight * 0.28)));
      const topHeight = mainHeight - optionHeight;
      const textWidth = Math.max(44, Math.floor(cols * 0.62));
      overContent =
        cell.row >= mainTop &&
        cell.row < mainTop + topHeight &&
        cell.col >= 0 &&
        cell.col < textWidth;
    } else {
      const { leftWidth, centerWidth } = getLayout();
      overContent =
        cell.row >= mainTop &&
        cell.row < mainTop + mainHeight &&
        cell.col >= leftWidth &&
        cell.col < leftWidth + centerWidth;
    }

    if (!overContent) {
      return;
    }

    event.preventDefault();
    state.focus = 'content';
    if (state.mode === 'play') {
      state.game.contentScroll = Math.max(0, state.game.contentScroll + (event.deltaY > 0 ? 3 : -3));
    } else {
      scrollContent(event.deltaY > 0 ? 3 : -3);
    }
    terminal.focus();
    render();
  },
  { passive: false },
);

selectFromList(0);
render();
