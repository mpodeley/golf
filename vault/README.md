# Vault

Este vault esta pensado como fuente editorial para el juego.

## Objetivo

Capturar reglas, definiciones, procedimientos y escenarios en Markdown con frontmatter estricto para despues exportarlos a JSON.

## Carpetas

- `Rules/`: notas por regla o subregla
- `Definitions/`: terminos clave
- `Procedures/`: pasos accionables
- `Scenarios/`: situaciones jugables
- `Characters/`: personajes y voces
- `Templates/`: plantillas

## Convenciones

### 1. Un concepto por nota

No mezclar regla, definicion y escenario en el mismo archivo.

### 2. Resumen propio

La nota debe contener un resumen pedagogico propio. El texto oficial queda como referencia externa, no como copia extensa.

### 3. Backlinks utiles

Cada nota deberia enlazar:

- reglas relacionadas
- definiciones relacionadas
- procedimientos relacionados
- escenarios donde aparece

### 4. Tags consistentes

Ejemplos:

- `teeing-area`
- `general-area`
- `bunker`
- `penalty-area`
- `putting-green`
- `free-relief`
- `wrong-place`
- `scorecard`

## Flujo editorial sugerido

1. leer la fuente oficial
2. escribir resumen corto
3. extraer pasos operativos
4. listar errores comunes
5. conectar escenarios
6. marcar dificultad

## Export futuro

Mas adelante conviene un script que:

1. recorra el vault
2. valide frontmatter
3. genere `exported/content.json`
4. detecte ids duplicados o links rotos
