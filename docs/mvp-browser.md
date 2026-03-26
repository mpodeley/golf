# Reduced MVP: TUI Vault Browser

## New Scope

Bajar el scope tiene sentido.

En vez de arrancar por:

- motor completo de ronda
- scorecard jugable
- sistema de decisiones
- humor narrativo

el MVP puede ser:

"un navegador TUI de reglas de golf, alimentado por un vault linkeado, publicable en web".

## Why This Is Better

1. Ya entrega valor real de estudio.
2. Obliga a ordenar bien el contenido y los links.
3. Reusa casi todo cuando mas adelante quieras agregar juego.
4. Reduce muchisimo el riesgo de quedarte a mitad de camino.

## Product Shape

La app se siente como una terminal retro, pero funcional:

- panel izquierdo: indice o resultados de busqueda
- panel central: nota actual
- panel derecho: backlinks, definiciones relacionadas o secciones hijas
- barra inferior: comandos y atajos

## MVP Features

### Core

- abrir una nota
- navegar wikilinks
- volver/adelante
- busqueda por texto
- filtros por tipo: rule, clarification, definition
- tabla de contenidos de la nota actual

### Nice to Have

- breadcrumbs
- historial reciente
- favoritos
- vista "linked mentions"
- tema CRT/terminal opcional

## Data Flow

1. Import oficial R&A HTML a vault Markdown.
2. Export del vault a un indice JSON.
3. UI TUI/web que consume ese JSON.

## Suggested App Model

Entidades minimas:

```ts
type NoteKind = 'rule' | 'clarification' | 'definition';

type NoteRecord = {
  id: string;
  title: string;
  kind: NoteKind;
  path: string;
  tags: string[];
  links: string[];
  headings: { depth: number; text: string; anchor: string }[];
  body: string;
};
```

## MVP Commands

- `search abnormal course condition`
- `open Rule 16`
- `open Abnormal Course Condition`
- `links`
- `back`
- `toc`
- `kind definitions`

## UI Recommendation

Si quieres publicar rapido en web, haria:

1. contenido y exportador primero
2. navegador TUI despues
3. look terminal desde el inicio
4. gameplay recien cuando la navegacion sea buena

## Suggested Roadmap

### Step 1

Dejar perfecto el importador oficial y generar el vault base.

### Step 2

Crear un exportador que compile Markdown + frontmatter a JSON navegable.

### Step 3

Construir el browser con:

- lista
- preview
- search
- navigation stack

### Step 4

Publicarlo como sitio estatico.

## Decision

Este deberia ser el MVP:

"Rules Terminal Browser" antes de cualquier aventura jugable.
