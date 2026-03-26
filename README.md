# Golf Rules Adventure

Juego retro estilo aventura de texto para aprender las reglas de golf mientras completas una tarjeta de 9 o 18 hoyos.

## Idea

El jugador vive una primera vuelta de golf y se cruza con situaciones reales:

- bola perdida
- alivio sin penalidad
- penalty area
- bola injugable
- orden de juego
- practica antes o durante la vuelta
- dudas de scorecard y penalidades

La gracia no es solo "responder trivia", sino decidir, ejecutar el procedimiento correcto y ver las consecuencias en la tarjeta, el estado de la bola y la reaccion de otros personajes.

## Direccion tecnica

La mejor base para "terminal en web" hoy no es `ratatui` puro, sino `ratzilla`, que esta pensado para UI terminal-themed con Rust + WebAssembly y puede desplegarse como sitio estatico.

Arquitectura objetivo:

1. `content/` o `vault/`: reglas, definiciones, procedimientos y situaciones.
2. `engine/`: estado de ronda, resolucion de reglas, scorecard y progresion narrativa.
3. `ui-cli/`: interfaz de texto para explorar reglas y jugar escenarios.
4. `ui-web/`: misma experiencia sobre WASM para GitHub Pages.

## Primer vertical slice

El primer slice deberia ser pequeno y valioso:

1. Ingerir reglas y clarificaciones oficiales a un vault tipo Obsidian.
2. Exponer una CLI de consulta:
   - buscar por tema
   - listar opciones de alivio/procedimiento
   - abrir una regla resumida
   - saltar a escenarios relacionados
3. Implementar un solo hoyo tutorial con 3-5 situaciones.

## MVP Reducido

Hay un scope mas sano para arrancar:

1. importar las reglas y clarifications oficiales a un vault linkeado
2. exportar ese vault a JSON navegable
3. construir un navegador TUI estilo terminal para estudiar reglas en desktop o web

Eso deja el juego completo para una segunda etapa, pero ya produce una app util y publicable.

## Estado del Browser

Ya existe un MVP navegable en `site/`:

1. `npm run build:site`
2. `npm run serve:site`
3. `npm run tui`

El root de GitHub Pages ahora apunta a un browser ANSI en navegador, inspirado en terminal/BBS, con:

- busqueda
- filtros por tipo
- navegacion por teclado
- click en toolbar y paneles
- rueda del mouse para scroll en la nota
- paneles ANSI
- backlinks
- tabla de contenidos
- modo `play` con una aventura de 3 hoyos

El dataset exportado queda en `site/data/`.

Tambien hay un browser de terminal real:

```bash
npm run tui
```

Atajos principales:

- `tab`: cambiar foco entre paneles
- `/`: buscar
- `1/2/3/4`: cambiar tipo
- `l/b/t`: links, backlinks, toc
- `q`: salir

Mouse en terminal:

- click en `INDEX`, `NOTE` o `LINKS` para cambiar foco
- click en la barra superior para filtrar, buscar o cambiar el panel lateral
- click en items del indice o backlinks para abrir notas
- rueda del mouse sobre `NOTE` para hacer scroll

Para esto conviene usar una terminal con soporte de mouse tipo Windows Terminal, iTerm2, kitty o wezterm.

## Modo Juego

El browser web ahora tiene dos modos:

- `vault`: navegador de reglas
- `play`: aventura interactiva "Tu Primera Vuelta"

El sitio ahora abre directo en `play`.

En `play`:

- click o `enter` para elegir opciones
- `g` cambia a juego
- `v` vuelve al vault
- `r` reinicia la aventura
- `tab` cambia foco entre scorecard, escena y opciones
- la historia y el ASCII art van arriba
- las opciones aparecen abajo en una franja horizontal estilo terminal

La aventura actual cubre prologo + 3 hoyos y trackea:

- score por hoyo
- penalidades
- etiqueta
- reglas acertadas y erradas

## GitHub Pages

El repo ya queda listo para publicar con GitHub Pages usando GitHub Actions:

1. push a `main`
2. workflow `.github/workflows/pages.yml`
3. Pages despliega `site/`

Comando local equivalente:

```bash
npm run build:site
npm run serve:site
```

## Estado actual

En esta maquina todavia no estan instalados `cargo`, `rustup` ni `trunk`, asi que por ahora deje la planificacion y la estructura de contenido.

Ver:

- [docs/plan.md](C:\Users\mpodeley\Documents\Golf\docs\plan.md)
- [docs/mvp-browser.md](C:\Users\mpodeley\Documents\Golf\docs\mvp-browser.md)
- [docs/official-import.md](C:\Users\mpodeley\Documents\Golf\docs\official-import.md)
- [docs/browser-architecture.md](C:\Users\mpodeley\Documents\Golf\docs\browser-architecture.md)
- [vault/README.md](C:\Users\mpodeley\Documents\Golf\vault\README.md)
- [vault/Templates/Rule.md](C:\Users\mpodeley\Documents\Golf\vault\Templates\Rule.md)
- [vault/Templates/Scenario.md](C:\Users\mpodeley\Documents\Golf\vault\Templates\Scenario.md)
