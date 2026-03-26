# Browser Architecture

## Decision

No usar una CLI de terceros como motor del producto.

### Por que no

- la app final necesita correr en web estatico
- necesitas control total sobre links, headings, backlinks y search
- una CLI externa te serviria para desarrollo, no para runtime

## Pipeline

1. `scripts/import-randa.mjs`
   - trae contenido oficial R&A HTML
   - lo convierte a Markdown tipo vault
2. `scripts/export-vault.mjs`
   - parsea el vault
   - extrae headings, wikilinks y backlinks
   - genera `site/data/content.json`
   - genera `site/data/content.js`
3. `site/`
   - navegador terminal web estatico

## Graph / GUI

Hay tres niveles posibles:

### Nivel 1

Usar el graph view nativo de Obsidian sobre el vault.

### Nivel 2

Usar el grafo exportado por `export-vault.mjs` para una vista custom en web.

### Nivel 3

Construir una visualizacion interactiva con fuerza dirigida usando D3 o Cytoscape.

Para ahora, el browser ya deja listo el dataset correcto para eso.
