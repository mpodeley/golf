# Plan

## Vision

Un juego humoristico y didactico donde aprender reglas de golf se parece mas a una aventura grafica de los 90 que a leer un reglamento.

El jugador:

- completa una tarjeta de score
- toma decisiones bajo incertidumbre
- aprende el procedimiento correcto, no solo la respuesta
- recibe feedback inmediato en tono diegetico

## Principios de diseno

1. Primero juego, despues enciclopedia.
2. Primero procedimientos, despues memorizacion.
3. Cada regla debe sentirse como una situacion humana en cancha.
4. El humor tiene que aliviar la densidad tecnica sin sacrificar precision.
5. El mismo motor debe servir para CLI, web y eventualmente modo "quiz".

## Bucle central

1. Entras a un hoyo.
2. Ocurre una situacion.
3. El juego te pide decidir o ejecutar un procedimiento.
4. El motor evalua la accion.
5. Se actualizan bola, lie, penalidad, scorecard y confianza del personaje.
6. Se destraba una breve explicacion y referencias.

## Modos

### 1. Adventure

Modo principal. Una ronda de 9 o 18 hoyos con narrativa ligera, personajes y situaciones encadenadas.

### 2. Rules CLI

Modo utilitario para estudiar:

- `find`: buscar por palabra clave o situacion
- `rule`: abrir una regla resumida
- `procedure`: ver pasos concretos
- `scenario`: listar casos donde aplica
- `glossary`: ver definiciones

### 3. Drill / Minigames

Micro-simuladores de procedimiento:

- dropear correctamente
- decidir nearest point of complete relief
- calcular penalidad
- cerrar una tarjeta sin errores

## Arquitectura

### Capa de contenido

Separar contenido de codigo desde el inicio.

Entidades principales:

- `RuleNote`
- `DefinitionNote`
- `ProcedureNote`
- `Scenario`
- `Character`
- `HoleTemplate`

Campos minimos sugeridos:

```yaml
id: rule-16-1
kind: rule
title: Relief from abnormal course conditions
source:
  authority: randa
  edition: 2023
  clarifications_updated: 2026-01-01
tags:
  - relief
  - ground-under-repair
summary: >
  Resumen propio y corto para juego/estudio.
procedures:
  - proc-free-relief-general-area
related_rules:
  - def-nearest-point-of-complete-relief
related_scenarios:
  - scen-bunker-sprinkler-head
difficulty: beginner
```

### Capa de dominio

Motor puro, sin UI:

- estado de la ronda
- hoyo actual
- lie de la bola
- stroke count
- penalidades
- acciones permitidas
- chequeos de consistencia

Tipos clave:

- `RoundState`
- `HoleState`
- `BallState`
- `Scorecard`
- `RulesOutcome`
- `Action`

### Capa de presentacion

Una sola logica de aplicacion con dos frentes:

- CLI nativa
- WebAssembly con look terminal

Recomendacion:

- empezar con una app Rust unica
- abstraer I/O y eventos
- luego montar la misma UI/pantallas sobre `ratzilla`

## Por que Obsidian al principio

Obsidian sirve bien como CMS humano:

- markdown simple
- backlinks entre reglas, definiciones y escenarios
- templates
- grafo de relaciones
- edicion comoda mientras aun estas descubriendo el modelo

No lo usaria como formato de runtime definitivo. Lo usaria como fuente editorial.

Pipeline recomendado:

1. notas Markdown en `vault/`
2. frontmatter estricto
3. validador/exportador
4. JSON compilado para el juego

## Pipeline de contenido

### Fuente oficial

No meter texto oficial completo en el juego sin revisar licencia/permisos. La mejor estrategia inicial es:

1. guardar referencia oficial
2. escribir resumen propio
3. extraer procedimientos y edge cases
4. enlazar clarificaciones oficiales

### Flujo de ingesta

1. elegir una regla o definicion
2. crear nota en el vault
3. agregar metadata
4. escribir resumen pedagogico
5. listar procedimientos y errores comunes
6. vincular escenarios
7. exportar a JSON

## Estructura sugerida

```text
Golf/
  README.md
  docs/
    plan.md
  vault/
    Rules/
    Definitions/
    Procedures/
    Scenarios/
    Characters/
    Templates/
  app/
    # futura app Rust
  exported/
    # JSON generado
```

## Primer roadmap

### Fase 0 - Content shell

Objetivo: tener una base consultable aunque todavia no exista el juego.

Entregables:

- vault con templates
- 15-25 notas semilla
- taxonomia de tags
- criterio de "resumen propio" vs "referencia oficial"

### Fase 1 - Rules CLI

Objetivo: navegar reglas desde terminal.

Entregables:

- cargar contenido exportado
- buscar por texto y tags
- abrir regla/procedimiento
- navegar relaciones

### Fase 2 - Primer hoyo jugable

Objetivo: probar que el loop sirve.

Entregables:

- scorecard
- una intro corta
- 3-5 escenarios
- feedback y explicacion

### Fase 3 - Campana de 9 hoyos

Objetivo: valor real de aprendizaje.

Entregables:

- progresion
- dificultad creciente
- personajes recurrentes
- persistencia

### Fase 4 - Publicacion web

Objetivo: deploy en GitHub Pages.

Entregables:

- build WASM
- assets estaticos
- deploy automatizado

## Vertical slice recomendado

Si quieres algo "simpatico" y corto para empezar, haria esto:

### Slice A

"El jugador llega al tee del hoyo 1, pega mal, la bola termina cerca de una condicion anormal del campo y luego duda como tomar alivio."

Este slice prueba:

- scorecard
- estados de bola
- consulta de reglas
- procedimiento guiado
- tono narrativo

## Riesgos

### Riesgo 1: exceso de ambicion

Mitigacion: hacer primero un "rules explorer con sabor de juego".

### Riesgo 2: contenido demasiado juridico

Mitigacion: cada nota debe tener:

- resumen simple
- procedimiento paso a paso
- errores comunes
- 1 escenario memorable

### Riesgo 3: copiar demasiado texto oficial

Mitigacion: referenciar fuente oficial y redactar material pedagogico propio.

### Riesgo 4: UI terminal linda pero poco legible

Mitigacion: usar layout sobrio, jerarquia clara, pocos colores y buen focus state.

## Decision tecnica recomendada

Si arrancaramos hoy:

1. usar `Obsidian + Markdown + frontmatter` como fuente editorial
2. exportar a JSON validado
3. construir primero una CLI de consulta
4. despues pasar al slice jugable
5. usar `ratzilla` al momento de llevarlo a web

## Siguiente paso concreto

El paso mas eficiente ahora es implementar uno de estos dos caminos:

1. `content-first`: crear 10 notas reales, exportarlas y hacer una pseudo-CLI aunque sea de lectura
2. `engine-first`: modelar scorecard, hole state y resolution engine con contenido mock

Para este proyecto recomiendo `content-first`, porque el valor diferencial esta en como traduces reglas complejas a situaciones memorables.
