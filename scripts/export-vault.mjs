import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_VAULT = path.resolve(process.cwd(), 'vault', 'Official R&A');
const DEFAULT_SITE_DATA = path.resolve(process.cwd(), 'site', 'data');

function parseArgs(argv) {
  const args = {
    vault: DEFAULT_VAULT,
    out: DEFAULT_SITE_DATA,
  };

  for (const arg of argv) {
    if (arg.startsWith('--vault=')) {
      args.vault = path.resolve(process.cwd(), arg.slice('--vault='.length));
      continue;
    }
    if (arg.startsWith('--out=')) {
      args.out = path.resolve(process.cwd(), arg.slice('--out='.length));
    }
  }

  return args;
}

async function walkMarkdownFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_meta') {
        continue;
      }
      files.push(...(await walkMarkdownFiles(fullPath)));
      continue;
    }
    if (!entry.name.endsWith('.md')) {
      continue;
    }
    if (entry.name.endsWith('Index.md')) {
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, body: content.trim() };
  }

  const lines = match[1].split(/\r?\n/);
  const data = {};

  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator < 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }

  return { data, body: content.slice(match[0].length).trim() };
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9./()# -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function deriveHeadingAnchor(text) {
  const trimmed = text.trim();
  const ruleMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?[a-z]?(?:\([0-9]+\))?(?:\/[0-9]+)?)/i);
  if (ruleMatch) {
    return ruleMatch[1];
  }
  return slugify(trimmed);
}

function extractHeadings(markdown) {
  const headings = [];
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) {
      continue;
    }
    const depth = match[1].length;
    const text = match[2].trim();
    headings.push({
      depth,
      text,
      anchor: deriveHeadingAnchor(text),
    });
  }

  return headings;
}

function extractWikiLinks(markdown) {
  const pattern = /\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
  const links = [];

  for (const match of markdown.matchAll(pattern)) {
    const note = (match[1] ?? '').trim();
    const anchor = (match[2] ?? '').trim();
    const label = (match[3] ?? '').trim();

    if (!note && !anchor) {
      continue;
    }

    links.push({
      raw: match[0],
      note,
      anchor,
      label,
    });
  }

  return links;
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_, note, anchor, label) => {
      return label || note || anchor || ' ';
    })
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKind(rawKind) {
  switch (rawKind) {
    case 'official-rule':
      return 'rule';
    case 'official-clarifications':
      return 'clarification';
    case 'official-definition':
      return 'definition';
    default:
      return 'note';
  }
}

function fileNameToNoteId(filePath) {
  return path.basename(filePath, '.md');
}

async function readNotes(vaultDir) {
  const files = await walkMarkdownFiles(vaultDir);
  const notes = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const noteId = fileNameToNoteId(filePath);
    const relativePath = path.relative(vaultDir, filePath).replaceAll('\\', '/');
    const headings = extractHeadings(body);
    const links = extractWikiLinks(body);
    const titleHeading = headings.find((heading) => heading.depth === 1);
    const displayTitle = titleHeading?.text ?? data.title ?? noteId;

    notes.push({
      id: noteId,
      title: displayTitle,
      kind: normalizeKind(data.kind),
      rawKind: data.kind ?? 'note',
      path: relativePath,
      sourceUrl: data.source_url ?? '',
      importedAt: data.imported_at ?? '',
      body,
      headings,
      links,
      outbound: [],
      backlinks: [],
      searchText: stripMarkdown(body),
    });
  }

  notes.sort((a, b) => a.id.localeCompare(b.id));
  return notes;
}

function buildGraph(notes) {
  const noteMap = new Map(notes.map((note) => [note.id, note]));
  const edges = [];

  for (const note of notes) {
    const outbound = [];
    for (const link of note.links) {
      if (!link.note) {
        continue;
      }
      const target = noteMap.get(link.note);
      if (!target) {
        continue;
      }
      outbound.push({
        note: target.id,
        anchor: link.anchor,
        label: link.label,
      });
      target.backlinks.push({
        note: note.id,
        anchor: link.anchor,
      });
      edges.push({
        source: note.id,
        target: target.id,
        anchor: link.anchor,
      });
    }
    note.outbound = outbound;
  }

  for (const note of notes) {
    note.backlinks.sort((a, b) => a.note.localeCompare(b.note));
    note.outbound.sort((a, b) => a.note.localeCompare(b.note));
  }

  return {
    nodes: notes.map((note) => ({
      id: note.id,
      kind: note.kind,
      degree: note.outbound.length + note.backlinks.length,
    })),
    edges,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const notes = await readNotes(args.vault);
  const graph = buildGraph(notes);

  const payload = {
    generatedAt: new Date().toISOString(),
    vault: path.basename(args.vault),
    stats: {
      notes: notes.length,
      rules: notes.filter((note) => note.kind === 'rule').length,
      clarifications: notes.filter((note) => note.kind === 'clarification').length,
      definitions: notes.filter((note) => note.kind === 'definition').length,
      edges: graph.edges.length,
    },
    notes,
    graph,
  };

  await mkdir(args.out, { recursive: true });
  await Promise.all([
    writeFile(path.join(args.out, 'content.json'), JSON.stringify(payload, null, 2), 'utf8'),
    writeFile(
      path.join(args.out, 'content.js'),
      `window.GOLF_VAULT_DATA = ${JSON.stringify(payload, null, 2)};\n`,
      'utf8',
    ),
  ]);

  console.log(`Exported ${notes.length} notes to ${args.out}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
