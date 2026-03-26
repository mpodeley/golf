import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const BASE_URL = 'https://www.randa.org';
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'vault', 'Official R&A');
const IMPORT_DATE = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    output: DEFAULT_OUTPUT,
    clean: true,
    rules: null,
  };

  for (const arg of argv) {
    if (arg === '--no-clean') {
      args.clean = false;
      continue;
    }
    if (arg.startsWith('--output=')) {
      args.output = path.resolve(process.cwd(), arg.slice('--output='.length));
      continue;
    }
    if (arg.startsWith('--rules=')) {
      args.rules = new Set(
        arg
          .slice('--rules='.length)
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      );
    }
  }

  return args;
}

function isFilled(field) {
  if (field == null) {
    return false;
  }
  if (typeof field === 'string') {
    return field.trim().length > 0;
  }
  if (typeof field === 'object' && 'isEmpty' in field) {
    return !field.isEmpty;
  }
  return true;
}

function textValue(field, fallback = '') {
  if (!isFilled(field)) {
    return fallback;
  }
  if (typeof field === 'string') {
    return field;
  }
  if (typeof field === 'object' && 'value' in field) {
    return field.value ?? fallback;
  }
  return fallback;
}

function slugValue(field) {
  if (!isFilled(field) || typeof field !== 'object') {
    return '';
  }
  return field.slug ?? '';
}

function sanitizeFileName(input) {
  return input
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
}

function noteNameToFile(noteName) {
  return `${sanitizeFileName(noteName)}.md`;
}

function anchorFromTag(rawTag) {
  if (!rawTag) {
    return '';
  }
  const parts = rawTag.split('_').filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  if (parts.length === 3) {
    return `${parts[0]}.${parts[1]}/${parts[2]}`;
  }
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}(${parts[2]})/${parts[3]}`;
  }
  return `${parts[0]}.${parts.slice(1).join('.')}`;
}

function slugToRuleLink(urlSlug) {
  if (!urlSlug) {
    return null;
  }

  const [rawPath, rawHash] = urlSlug.split('#');
  const pathParts = rawPath.split('/').filter(Boolean);
  const ruleSegment = pathParts.find((part) => /^rule-\d+$/i.test(part));

  if (!ruleSegment) {
    return null;
  }

  const ruleNumber = ruleSegment.replace(/^rule-/i, '');
  if (!rawHash) {
    return `[[Rule ${ruleNumber}]]`;
  }

  const hashParts = rawHash.split('_').filter(Boolean);
  const noteName = hashParts.length <= 2 ? `Rule ${ruleNumber}` : `Rule ${ruleNumber} Clarifications`;
  return `[[${noteName}#${anchorFromTag(rawHash)}]]`;
}

function frontmatter(value) {
  return `---\n${value.join('\n')}\n---\n`;
}

function createTurndown() {
  const service = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    headingStyle: 'atx',
  });

  service.addRule('obsidian-link', {
    filter(node) {
      return node.nodeName === 'A';
    },
    replacement(content, node) {
      const obsidianLink = node.getAttribute('data-obsidian-link');
      const href = node.getAttribute('href');
      const label = content.trim() || href || '';

      if (obsidianLink) {
        return obsidianLink;
      }
      if (href) {
        return `[${label}](${href})`;
      }
      return label;
    },
  });

  service.addRule('empty-span', {
    filter(node) {
      return node.nodeName === 'SPAN';
    },
    replacement(content) {
      return content;
    },
  });

  return service;
}

function absolutizeUrl(url) {
  if (!url) {
    return '';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }
  return `${BASE_URL}/${url}`;
}

async function fetchNextData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error(`Missing __NEXT_DATA__ in ${url}`);
  }

  return JSON.parse(match[1]);
}

function flattenDefinitions(rulesSummary) {
  const grouped = rulesSummary?.definitions ?? {};
  return Object.values(grouped).flat();
}

function buildDefinitionTargets(definitions) {
  const byId = new Map();
  const byNavigationId = new Map();
  const indexItems = [];

  for (const definition of definitions) {
    const term = textValue(definition.term);
    if (!term) {
      continue;
    }

    const noteName = term;
    const fileName = noteNameToFile(noteName);
    const link = `[[${noteName}]]`;
    const target = {
      noteName,
      fileName,
      link,
      navigationId: definition.navigationId,
      id: definition.system?.id ?? definition.key,
    };

    if (target.id) {
      byId.set(target.id, target);
      byId.set(definition.key, target);
    }
    if (definition.navigationId) {
      byNavigationId.set(definition.navigationId, target);
    }
    indexItems.push(target);
  }

  indexItems.sort((a, b) => a.noteName.localeCompare(b.noteName));

  return { byId, byNavigationId, indexItems };
}

function buildRuleTargets(rules) {
  const byId = new Map();
  const indexItems = [];

  for (const rule of rules) {
    const ruleNumber = textValue(rule.number);
    if (!ruleNumber) {
      continue;
    }

    const noteName = `Rule ${ruleNumber}`;
    const fileName = noteNameToFile(noteName);
    const link = `[[${noteName}]]`;
    const target = {
      ruleNumber,
      noteName,
      fileName,
      link,
      url: absolutizeUrl(textValue(rule.url)),
      id: rule.system?.id,
    };

    if (target.id) {
      byId.set(target.id, target);
    }
    indexItems.push(target);
  }

  indexItems.sort((a, b) => Number(a.ruleNumber) - Number(b.ruleNumber));

  return { byId, indexItems };
}

function buildClarificationTargets(ruleTargets) {
  const byRuleNumber = new Map();
  const indexItems = [];

  for (const rule of ruleTargets.indexItems) {
    const noteName = `Rule ${rule.ruleNumber} Clarifications`;
    const fileName = noteNameToFile(noteName);
    const link = `[[${noteName}]]`;
    const target = {
      ruleNumber: rule.ruleNumber,
      noteName,
      fileName,
      link,
    };
    byRuleNumber.set(rule.ruleNumber, target);
    indexItems.push(target);
  }

  return { byRuleNumber, indexItems };
}

function buildComponentMap(linkedItems) {
  const map = new Map();
  for (const item of linkedItems ?? []) {
    const codename = item?.system?.codename;
    if (codename) {
      map.set(codename, item);
    }
  }
  return map;
}

function componentToMarkdown(component) {
  if (!component || !Array.isArray(component.diagrams) || component.diagrams.length === 0) {
    return '';
  }

  const blocks = component.diagrams.map((diagram) => {
    const title = textValue(diagram.title);
    const description = textValue(diagram.description);
    const imageUrl = diagram.diagramImage?.url ?? '';
    const lines = ['> [!info] Official Diagram'];

    if (title) {
      lines.push(`> ${title}`);
    }
    if (imageUrl) {
      lines.push(`> ![](${imageUrl})`);
    }
    if (description) {
      const compact = description.replace(/\s+/g, ' ').trim();
      lines.push(`> ${compact}`);
    }

    return lines.join('\n');
  });

  return blocks.join('\n\n');
}

function resolveRandaLink(link, definitionTargets) {
  if (!link) {
    return null;
  }

  if (link.type === 'rules_definition') {
    return definitionTargets.byId.get(link.itemId)?.link ?? null;
  }

  if (link.urlSlug) {
    if (link.urlSlug.includes('/rog/definitions') || link.urlSlug.includes('/en/rog/definitions')) {
      const [, hash = ''] = link.urlSlug.split('#');
      return definitionTargets.byNavigationId.get(hash)?.link ?? null;
    }
    return slugToRuleLink(link.urlSlug);
  }

  return null;
}

function htmlToMarkdown(html, availableInternalLinks, componentMap, definitionTargets, turndown) {
  if (!html) {
    return '';
  }

  const dom = new JSDOM(`<body>${html}</body>`);
  const { document } = dom.window;
  const linkMap = new Map(
    (availableInternalLinks ?? [])
      .map((link) => [link.itemId, resolveRandaLink(link, definitionTargets)])
      .filter(([, value]) => Boolean(value)),
  );

  document.querySelectorAll('a').forEach((anchor) => {
    const itemId = anchor.getAttribute('data-item-id');
    const obsidianLink = itemId ? linkMap.get(itemId) : null;

    if (obsidianLink) {
      anchor.setAttribute('data-obsidian-link', obsidianLink);
      anchor.removeAttribute('href');
      return;
    }

    const href = anchor.getAttribute('href');
    if (href) {
      anchor.setAttribute('href', absolutizeUrl(href));
    } else {
      anchor.removeAttribute('href');
    }
  });

  let componentIndex = 0;
  const componentTokens = new Map();
  document.querySelectorAll('object[type="application/kenticocloud"]').forEach((node) => {
    const codename = node.getAttribute('data-codename') ?? '';
    const component = componentMap.get(codename);
    const markdown = componentToMarkdown(component);
    const token = `COMPONENTTOKEN${componentIndex++}`;
    componentTokens.set(token, markdown);
    node.replaceWith(document.createTextNode(`\n\n${token}\n\n`));
  });

  const markdown = turndown.turndown(document.body.innerHTML);
  let cleaned = markdown
    .replace(/\u00A0/g, ' ')
    .replaceAll('â€™', "'")
    .replaceAll('â€œ', '"')
    .replaceAll('â€', '"')
    .replaceAll('â€"','-')
    .replaceAll('â€“', '-')
    .replaceAll('â€”', '-')
    .replaceAll('Â ', ' ')
    .replaceAll('Â', '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  for (const [token, replacement] of componentTokens) {
    cleaned = cleaned.replace(token, replacement);
  }

  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

function sectionHeading(level, number, title) {
  const prefix = '#'.repeat(level);
  const pieces = [number, title].filter(Boolean);
  return `${prefix} ${pieces.join(' ').trim()}`;
}

function renderRichTextSection({
  level,
  number,
  title,
  purpose,
  description,
  componentMap,
  definitionTargets,
  turndown,
  includePurpose = true,
}) {
  const parts = [];
  const heading = sectionHeading(level, number, title);
  parts.push(heading);

  const purposeMarkdown = includePurpose
    ? htmlToMarkdown(
        textValue(purpose),
        purpose?.availableInternalLinks,
        componentMap,
        definitionTargets,
        turndown,
      )
    : '';

  if (purposeMarkdown) {
    parts.push(purposeMarkdown);
  }

  const descriptionMarkdown = htmlToMarkdown(
    textValue(description),
    description?.availableInternalLinks,
    componentMap,
    definitionTargets,
    turndown,
  );

  if (descriptionMarkdown) {
    parts.push(descriptionMarkdown);
  }

  return parts.filter(Boolean).join('\n\n');
}

function renderRuleMarkdown(ruleData, definitionTargets, clarificationTarget, turndown) {
  const ruleNumber = textValue(ruleData.number);
  const title = textValue(ruleData.title);
  const componentMap = buildComponentMap(ruleData.linkedItems);
  const sourceUrl = absolutizeUrl(textValue(ruleData.url));

  const body = [];
  body.push(
    frontmatter([
      `id: official-rule-${ruleNumber}`,
      'kind: official-rule',
      'source: randa',
      'edition: "2023 Rules of Golf"',
      `rule_number: "${ruleNumber}"`,
      `title: "${title.replaceAll('"', '\\"')}"`,
      `source_url: "${sourceUrl}"`,
      `imported_at: "${IMPORT_DATE}"`,
    ]),
  );
  body.push(`# Rule ${ruleNumber}: ${title}`);

  if (clarificationTarget) {
    body.push(`Related note: ${clarificationTarget.link}`);
  }

  const rulePurpose = htmlToMarkdown(
    textValue(ruleData.purposeStatement),
    ruleData.purposeStatement?.availableInternalLinks,
    componentMap,
    definitionTargets,
    turndown,
  );
  if (rulePurpose) {
    body.push('## Purpose');
    body.push(rulePurpose);
  }

  const ruleDescription = htmlToMarkdown(
    textValue(ruleData.description),
    ruleData.description?.availableInternalLinks,
    componentMap,
    definitionTargets,
    turndown,
  );
  if (ruleDescription) {
    body.push('## Overview');
    body.push(ruleDescription);
  }

  for (const subRule of ruleData.subRules ?? []) {
    body.push(
      renderRichTextSection({
        level: 2,
        number: textValue(subRule.number),
        title: textValue(subRule.title),
        purpose: subRule.displaySubRulePurpose ? subRule.purposeStatement : null,
        description: subRule.displaySubRuleDescription ? subRule.description : null,
        componentMap,
        definitionTargets,
        turndown,
      }),
    );

    for (const section of subRule.sections ?? []) {
      body.push(
        renderRichTextSection({
          level: 3,
          number: textValue(section.number),
          title: section.shouldDisplayTitle ? textValue(section.title) : '',
          purpose: null,
          description: section.shouldDisplayDescription ? section.description : null,
          componentMap,
          definitionTargets,
          turndown,
          includePurpose: false,
        }),
      );
    }
  }

  body.push('## Source');
  body.push(`- Official rule page: [R&A Rule ${ruleNumber}](${sourceUrl})`);

  return body.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function renderClarificationsMarkdown(ruleData, definitionTargets, turndown) {
  const ruleNumber = textValue(ruleData.number);
  const title = textValue(ruleData.title);
  const componentMap = buildComponentMap(ruleData.linkedItems);
  const sourceUrl = `${BASE_URL}/rog/clarifications/rule-${ruleNumber}`;

  const body = [];
  body.push(
    frontmatter([
      `id: official-clarifications-${ruleNumber}`,
      'kind: official-clarifications',
      'source: randa',
      'edition: "2023 Rules of Golf"',
      `rule_number: "${ruleNumber}"`,
      `title: "${title.replaceAll('"', '\\"')}"`,
      `source_url: "${sourceUrl}"`,
      `imported_at: "${IMPORT_DATE}"`,
    ]),
  );
  body.push(`# Rule ${ruleNumber} Clarifications: ${title}`);
  body.push(`Related note: [[Rule ${ruleNumber}]]`);

  let hasClarifications = false;

  const topLevelInterpretations = ruleData.generalInterpretations ?? [];
  if (topLevelInterpretations.length > 0) {
    hasClarifications = true;
    body.push('## General Clarifications');
    for (const interpretation of topLevelInterpretations) {
      body.push(
        renderRichTextSection({
          level: 3,
          number: textValue(interpretation.number),
          title: textValue(interpretation.title),
          purpose: null,
          description: interpretation.description,
          componentMap,
          definitionTargets,
          turndown,
          includePurpose: false,
        }),
      );
    }
  }

  for (const subRule of ruleData.subRules ?? []) {
    const sectionInterpretations = [];

    for (const interpretation of subRule.generalInterpretations ?? []) {
      sectionInterpretations.push({
        number: textValue(interpretation.number),
        title: textValue(interpretation.title),
        description: interpretation.description,
      });
    }

    for (const section of subRule.sections ?? []) {
      for (const interpretation of section.interpretations ?? []) {
        sectionInterpretations.push({
          parentNumber: textValue(section.number),
          parentTitle: section.shouldDisplayTitle ? textValue(section.title) : '',
          number: textValue(interpretation.number),
          title: textValue(interpretation.title),
          description: interpretation.description,
        });
      }
    }

    if (sectionInterpretations.length === 0) {
      continue;
    }

    hasClarifications = true;
    body.push(sectionHeading(2, textValue(subRule.number), textValue(subRule.title)));

    for (const interpretation of sectionInterpretations) {
      if (interpretation.parentNumber) {
        body.push(`Context: [[Rule ${ruleNumber}#${interpretation.parentNumber}]]`);
      }
      body.push(
        renderRichTextSection({
          level: 3,
          number: interpretation.number,
          title: interpretation.title,
          purpose: null,
          description: interpretation.description,
          componentMap,
          definitionTargets,
          turndown,
          includePurpose: false,
        }),
      );
    }
  }

  if (!hasClarifications) {
    body.push('No clarifications were published for this rule at import time.');
  }

  body.push('## Source');
  body.push(`- Official clarifications page: [R&A Clarifications for Rule ${ruleNumber}](${sourceUrl})`);

  return body.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function renderDefinitionMarkdown(definition, definitionTargets, turndown) {
  const title = textValue(definition.term);
  const componentMap = new Map();
  const sourceUrl = absolutizeUrl(`/en/rog/definitions#${definition.navigationId}`);
  const description = htmlToMarkdown(
    textValue(definition.definitionText),
    definition.definitionText?.availableInternalLinks,
    componentMap,
    definitionTargets,
    turndown,
  );

  const body = [];
  body.push(
    frontmatter([
      `id: official-definition-${definition.navigationId}`,
      'kind: official-definition',
      'source: randa',
      'edition: "2023 Rules of Golf"',
      `title: "${title.replaceAll('"', '\\"')}"`,
      `navigation_id: "${definition.navigationId}"`,
      `source_url: "${sourceUrl}"`,
      `imported_at: "${IMPORT_DATE}"`,
    ]),
  );
  body.push(`# ${title}`);

  if (description) {
    body.push('## Official Definition');
    body.push(description);
  }

  body.push('## Source');
  body.push(`- Official definitions page: [R&A Definitions](${sourceUrl})`);

  return body.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function writeIndex(filePath, title, items) {
  const lines = [`# ${title}`, ''];
  for (const item of items) {
    lines.push(`- ${item.link}`);
  }
  lines.push('');
  await writeFile(filePath, lines.join('\n'), 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const turndown = createTurndown();

  if (args.clean) {
    await rm(args.output, { recursive: true, force: true });
  }

  const rulesDir = path.join(args.output, 'Rules');
  const clarificationsDir = path.join(args.output, 'Clarifications');
  const definitionsDir = path.join(args.output, 'Definitions');
  const metaDir = path.join(args.output, '_meta');

  await Promise.all([
    mkdir(rulesDir, { recursive: true }),
    mkdir(clarificationsDir, { recursive: true }),
    mkdir(definitionsDir, { recursive: true }),
    mkdir(metaDir, { recursive: true }),
  ]);

  const [ruleIndexData, definitionsPageData] = await Promise.all([
    fetchNextData(`${BASE_URL}/en/rog/the-rules-of-golf/rule-1`),
    fetchNextData(`${BASE_URL}/en/rog/definitions`),
  ]);

  const allRules = ruleIndexData.props.pageProps.rulesSummary.rulesOfGolf ?? [];
  const filteredRules = args.rules
    ? allRules.filter((rule) => args.rules.has(textValue(rule.number)))
    : allRules;

  const definitions = flattenDefinitions(definitionsPageData.props.pageProps.rulesSummary);
  const definitionTargets = buildDefinitionTargets(definitions);
  const ruleTargets = buildRuleTargets(filteredRules);
  const clarificationTargets = buildClarificationTargets(ruleTargets);

  const rulePages = await Promise.all(
    filteredRules.map(async (rule) => {
      const ruleNumber = textValue(rule.number);
      const rulePage = await fetchNextData(`${BASE_URL}/en/rog/the-rules-of-golf/rule-${ruleNumber}`);
      return rulePage.props.pageProps.ruleOfGolf;
    }),
  );

  for (const ruleData of rulePages) {
    const ruleNumber = textValue(ruleData.number);
    const ruleTarget = ruleTargets.indexItems.find((item) => item.ruleNumber === ruleNumber);
    const clarificationTarget = clarificationTargets.byRuleNumber.get(ruleNumber);

    await writeFile(
      path.join(rulesDir, ruleTarget.fileName),
      renderRuleMarkdown(ruleData, definitionTargets, clarificationTarget, turndown),
      'utf8',
    );

    await writeFile(
      path.join(clarificationsDir, clarificationTarget.fileName),
      renderClarificationsMarkdown(ruleData, definitionTargets, turndown),
      'utf8',
    );
  }

  for (const definition of definitions) {
    const target = definitionTargets.byId.get(definition.system?.id ?? definition.key);
    await writeFile(
      path.join(definitionsDir, target.fileName),
      renderDefinitionMarkdown(definition, definitionTargets, turndown),
      'utf8',
    );
  }

  await Promise.all([
    writeIndex(path.join(args.output, 'Rules Index.md'), 'Rules Index', ruleTargets.indexItems),
    writeIndex(
      path.join(args.output, 'Clarifications Index.md'),
      'Clarifications Index',
      clarificationTargets.indexItems,
    ),
    writeIndex(
      path.join(args.output, 'Definitions Index.md'),
      'Definitions Index',
      definitionTargets.indexItems,
    ),
    writeFile(
      path.join(metaDir, 'manifest.json'),
      JSON.stringify(
        {
          source: 'randa',
          importedAt: IMPORT_DATE,
          output: args.output,
          ruleCount: filteredRules.length,
          definitionCount: definitions.length,
          selectedRules: filteredRules.map((rule) => textValue(rule.number)),
        },
        null,
        2,
      ),
      'utf8',
    ),
  ]);

  console.log(`Imported ${filteredRules.length} rules and ${definitions.length} definitions into ${args.output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
