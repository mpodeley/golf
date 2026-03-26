# Official Import Workflow

Este proyecto ya incluye un importador que descarga las paginas HTML oficiales de R&A y las convierte en notas Markdown para Obsidian.

## Que genera

- una nota por regla: `Rule 1.md`, `Rule 2.md`, etc.
- una nota por clarifications de cada regla
- una nota por definicion
- indices para navegar el vault

Los links internos se convierten a wikilinks de Obsidian siempre que apunten a:

- reglas
- subreglas o secciones
- definiciones

## Comando

```bash
npm install --prefix .
npm run import:randa
```

## Salida

Por defecto escribe en:

```text
vault/Official R&A/
```

## Notas

- El importador usa el JSON estructurado `__NEXT_DATA__` que sirve la propia web de R&A, en vez de parsear el DOM visible de forma fragil.
- Las reglas y las clarifications se separan en notas distintas para que el vault quede mas navegable.
- El contenido importado es referencia oficial. Para el juego conviene seguir escribiendo notas pedagogicas propias por separado.
