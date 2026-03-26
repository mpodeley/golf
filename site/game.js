const RULE_LABELS = {
  '4.1b': 'Maximo 14 palos',
  '6.2b': 'Area de salida',
  '6.4a': 'Orden de salida en el tee',
  '6.4b': 'Orden por distancia al hoyo',
  '8.1a': 'No mejorar condiciones del golpe',
  '10.1a': 'El golpe se hace con la cabeza del palo',
  '11.1a': 'Bola contra bola en el green',
  '12.2b': 'No tocar arena en bunker antes del golpe',
  '13.1c': 'Reparar danos en el green',
  '14.1a': 'Marcar antes de levantar',
  '14.3': 'Drop desde altura de rodilla',
  '15.1': 'Impedimentos sueltos',
  '16.1': 'Alivio por obstruccion o GUR',
  '17.1': 'Penalty area',
  '18.1': 'Golpe y distancia',
  '18.2a': 'Bola perdida en 3 minutos',
  '18.2b': 'Toda la bola para OB',
  '18.3': 'Bola provisoria',
  '19.3': 'Injugable en bunker',
  '19': 'Bola injugable',
};

const TITLE_ART = [
  ' _______         _______        _                        _   _            ',
  '|__   __|       |__   __|      (_)                      | | (_)           ',
  '   | |_   _        | | ___ _ __ _ _ __ ___   ___ _ __  | |_ _  ___  _ __ ',
  "   | | | | |       | |/ _ \\ '__| | '_ ` _ \\/ _ \\ '__| | __| |/ _ \\| '_ \\",
  '   | | |_| |       | |  __/ |  | | | | | | |  __/ |    | |_| | (_) | | | |',
  '   |_|\\__,_|       |_|\\___|_|  |_|_| |_| |_|\\___|_|     \\__|_|\\___/|_| |_|',
  '',
  '                     Tu Primera Vuelta - aventura de reglas',
];

const SCENES = {
  intro: {
    title: 'BOOT',
    hole: '0',
    body: [
      ...TITLE_ART,
      '',
      'Club de Golf "Los Robles". Tee time 08:30.',
      'Objetivo: terminar 3 hoyos, aprender reglas y no quedar como un desastre social.',
      '',
      'Vas a jugar con Martin, Lucia y el Gordo Raul.',
      'Cada decision puede sumar penalidades reales o bajar tu etiqueta.',
    ],
    choices: [{ label: 'Empezar la vuelta', next: 'p1_parking', feedback: ['Respiras hondo y abris el baul.'] }],
  },
  p1_parking: {
    title: 'P1 Estacionamiento',
    hole: '0',
    body: [
      '08:15. Llegas al estacionamiento y abres la bolsa.',
      'Hay 16 palos adentro. Tu tee time sale en 15 minutos.',
      '',
      'Pregunta: tu bolsa tiene 16 palos. Esta todo bien?',
    ],
    choices: [
      {
        label: 'A) Si, cuantos mas palos mejor',
        next: 'p2_shop',
        flags: { tooManyClubs: true },
        wrongRules: ['4.1b'],
        feedback: [
          'No. El maximo permitido son 14 palos.',
          'Si sales asi, la penalidad puede costarte 2 golpes por hoyo jugado, hasta 4.',
          'No lo arreglaste a tiempo. Ojo con esto.',
        ],
      },
      {
        label: 'B) Para, creo que son demasiados. Cuantos puedo llevar?',
        next: 'p2_shop',
        correctRules: ['4.1b'],
        feedback: [
          'Exacto. La Regla 4.1b permite hasta 14 palos.',
          'Sacas un hierro 2 y un wedge repetido. La bolsa queda legal.',
        ],
      },
      {
        label: 'C) No tengo idea, voy asi',
        next: 'p2_shop',
        flags: { tooManyClubs: true },
        feedback: [
          'Decides no revisarlo. Esto huele a problema diferido.',
          'Martin aun no vio la bolsa, pero la regla no perdona.',
        ],
      },
    ],
  },
  p2_shop: {
    title: 'P2 Pro Shop',
    hole: '0',
    body: [
      'En el mostrador te entregan la tarjeta.',
      '',
      '+------+-----+-----+------+----------------------+',
      '| Hoyo | Par | HCP | Mts  | Notas                |',
      '+------+-----+-----+------+----------------------+',
      '|  1   |  4  |  7  | 350  | OB izq, lago der     |',
      '|  2   |  3  | 15  | 155  | Agua frente al green |',
      '|  3   |  5  |  3  | 480  | Arboles, cart path   |',
      '+------+-----+-----+------+----------------------+',
      '',
      'Pregunta: que significa HCP en esta tarjeta?',
    ],
    choices: [
      {
        label: 'A) Es el handicap del hoyo, su dificultad relativa',
        next: 'p3_starter',
        etiquette: 5,
        feedback: [
          'Correcto. HCP 1 suele ser el hoyo mas dificil y HCP 18 el mas accesible.',
          'Dato util cuando juegas con handicap.',
        ],
      },
      {
        label: 'B) Ni idea, pero no importa',
        next: 'p3_starter',
        feedback: [
          'Importa mas de lo que parece: HCP es la dificultad relativa del hoyo.',
          'No hay penalidad, pero te conviene mirar la tarjeta con mas cariño.',
        ],
      },
      {
        label: 'C) Es la distancia maxima de drive',
        next: 'p3_starter',
        feedback: [
          'No. La distancia esta en metros.',
          'HCP sirve para ordenar la dificultad del hoyo.',
        ],
      },
    ],
  },
  p3_starter: {
    title: 'P3 Starter',
    hole: '0',
    body: [
      '08:25. El starter los frena con autoridad amable.',
      '"Mantengan ritmo. Si pierden una bola, tienen 3 minutos para buscarla."',
      '',
      'Pregunta: cuanto tiempo tienes para buscar una bola perdida?',
    ],
    choices: [
      {
        label: 'A) 5 minutos',
        next: 'h1_order',
        wrongRules: ['18.2a'],
        feedback: ['Era asi antes de 2019. Hoy son 3 minutos: Regla 18.2a.'],
      },
      {
        label: 'B) 3 minutos',
        next: 'h1_order',
        correctRules: ['18.2a'],
        feedback: ['Correcto. Desde 2019 la busqueda es de 3 minutos.'],
      },
      {
        label: 'C) No hay limite',
        next: 'h1_order',
        wrongRules: ['18.2a'],
        feedback: ['Si no hubiera limite, el campo explotaria. Son 3 minutos.'],
      },
    ],
  },
  h1_order: {
    title: 'Hoyo 1 - Tee',
    hole: '1',
    body: [
      'Hoyo 1. Par 4 de 350 metros.',
      'Martin pregunta quien sale primero. Nadie conoce este campo.',
      '',
      'Pregunta: quien debe pegar primero en el hoyo 1?',
    ],
    choices: [
      {
        label: 'A) El de menor handicap',
        next: 'h1_tee_area',
        wrongRules: ['6.4a'],
        feedback: ['No es obligatorio. En el hoyo 1 se decide por acuerdo o sorteo.'],
      },
      {
        label: 'B) Se sortea o se acuerda entre el grupo',
        next: 'h1_tee_area',
        correctRules: ['6.4a'],
        feedback: ['Correcto. Regla 6.4a. Martin te sonrie: "Bueno, arrancas vos".'],
      },
      {
        label: 'C) El que llego primero al tee',
        next: 'h1_tee_area',
        wrongRules: ['6.4a'],
        feedback: ['No hay tal regla. Se acuerda o se sortea.'],
      },
    ],
  },
  h1_tee_area: {
    title: 'Hoyo 1 - Area de salida',
    hole: '1',
    body: [
      'A la izquierda ves estacas blancas de OB. A la derecha, mucho fairway.',
      'Te paras nervioso sobre el tee.',
      '',
      'Pregunta: donde puedes colocar la bola dentro del area de salida?',
    ],
    choices: [
      {
        label: 'A) Entre las marcas y hasta 2 largos de palo hacia atras',
        next: 'h1_provisional',
        correctRules: ['6.2b'],
        feedback: ['Perfecto. La Regla 6.2b define un rectangulo, no una linea.'],
      },
      {
        label: 'B) Solo exactamente entre las dos marcas',
        next: 'h1_provisional',
        wrongRules: ['6.2b'],
        feedback: ['Casi. Tambien puedes retroceder hasta 2 largos de palo.'],
      },
      {
        label: 'C) Donde quiera, total es el tee',
        next: 'h1_provisional',
        wrongRules: ['6.2b'],
        feedback: [
          'No. El area esta definida.',
          'En stroke play, jugar desde fuera del area puede costarte 2 golpes y repetir.',
        ],
      },
    ],
  },
  h1_provisional: {
    title: 'Hoyo 1 - Bola a la izquierda',
    hole: '1',
    body: [
      'Le pegas fuerte y la bola sale directo hacia las estacas blancas.',
      'No estas seguro de si quedo en juego o fuera de limites.',
      '',
      'Pregunta: cual es tu mejor opcion antes de caminar hasta alla?',
    ],
    choices: [
      {
        label: 'A) Voy a buscarla y si no aparece vuelvo al tee',
        next: 'h1_no_provisional',
        etiquette: -15,
        wrongRules: ['18.3'],
        flags: { noProvisionalH1: true },
        feedback: [
          'Eso es lo mas lento y doloroso.',
          'Si hay duda razonable, conviene jugar una provisoria antes de avanzar.',
        ],
      },
      {
        label: 'B) Declaro y juego una provisoria',
        next: 'h1_ob_line',
        correctRules: ['18.3'],
        feedback: [
          'Exacto. La provisoria es tu seguro de vida.',
          'La declaras en voz alta y pegas otra que vuela preciosa al fairway.',
        ],
      },
      {
        label: 'C) Tiro otra desde aca con penalidad y listo',
        next: 'h1_ob_line',
        wrongRules: ['18.3'],
        feedback: [
          'Casi, pero falta el detalle clave: debes declarar que es provisoria.',
          'Tu grupo entiende tu intencion y te hace repetir la frase correcta.',
        ],
      },
    ],
  },
  h1_no_provisional: {
    title: 'Hoyo 1 - La caminata del arrepentimiento',
    hole: '1',
    body: [
      'Caminas un monton, buscas 3 minutos y no aparece nada.',
      'El grupo de atras ya te esta radiografiando con la mirada.',
      '',
      'No te queda otra que volver al tee.',
    ],
    choices: [
      {
        label: 'Seguir, con la dignidad golpeada',
        next: 'h1_fairway_order',
        penalty: 2,
        penaltyHole: 1,
        etiquette: -20,
        correctRules: ['18.1'],
        feedback: [
          'Golpe y distancia: 1 golpe por la pelota perdida y vuelves a jugar desde el lugar anterior.',
          'Aprendizaje caro, pero memorable.',
        ],
      },
    ],
  },
  h1_ob_line: {
    title: 'Hoyo 1 - La linea de OB',
    hole: '1',
    body: [
      'Llegan a la zona y Lucia encuentra la bola pegada a una estaca blanca.',
      'Parte de la bola esta del lado del campo.',
      '',
      'Pregunta: esta fuera de limites?',
    ],
    choices: [
      {
        label: 'A) Si, si toca la linea ya es OB',
        next: 'h1_fairway_order',
        wrongRules: ['18.2b'],
        feedback: [
          'No. Una bola es OB solo si toda la bola esta mas alla del borde interno.',
          'Si una parte sigue adentro, la bola esta en juego.',
        ],
      },
      {
        label: 'B) No, sigue en juego porque una parte queda adentro',
        next: 'h1_fairway_order',
        correctRules: ['18.2b'],
        feedback: [
          'Bien. Regla 18.2b.',
          'Levantas la provisoria y juegas la original como si nada.',
        ],
      },
      {
        label: 'C) Hay que medirla con precision',
        next: 'h1_fairway_order',
        wrongRules: ['18.2b'],
        feedback: ['La referencia es visual: si cualquier parte queda del lado del campo, sigue en juego.'],
      },
    ],
  },
  h1_fairway_order: {
    title: 'Hoyo 1 - Segundo golpe',
    hole: '1',
    body: [
      'Tu bola queda a 170 metros. El Gordo Raul esta a 180, Lucia a 150 y Martin a 140.',
      '',
      'Pregunta: quien pega primero?',
    ],
    choices: [
      {
        label: 'A) Vos, porque sos el mas novato',
        next: 'h1_mark_ball',
        wrongRules: ['6.4b'],
        feedback: ['No. Fuera del tee, juega primero quien esta mas lejos del hoyo.'],
      },
      {
        label: 'B) El Gordo Raul, porque esta mas lejos del hoyo',
        next: 'h1_mark_ball',
        correctRules: ['6.4b'],
        feedback: ['Correcto. Regla 6.4b. En informal puede haber ready golf, pero la base es la distancia.'],
      },
      {
        label: 'C) Martin, porque tiene el honor',
        next: 'h1_mark_ball',
        wrongRules: ['6.4b'],
        feedback: ['El honor vale en el tee. Despues manda la distancia al hoyo.'],
      },
    ],
  },
  h1_mark_ball: {
    title: 'Hoyo 1 - Green',
    hole: '1',
    body: [
      'Llegas al green en regulacion discutible pero digna.',
      'Martin te dice: "Marca la bola".',
      '',
      'Pregunta: como se marca correctamente en el green?',
    ],
    choices: [
      {
        label: 'A) Pones una moneda justo detras y luego levantas la bola',
        next: 'h1_repair_green',
        correctRules: ['14.1a'],
        feedback: ['Perfecto. Primero marcas, luego levantas.'],
      },
      {
        label: 'B) La levanto y me acuerdo donde estaba',
        next: 'h1_repair_green',
        penalty: 1,
        penaltyHole: 1,
        wrongRules: ['14.1a'],
        feedback: [
          'No. Si levantas sin marcar, 1 golpe de penalidad.',
          'Martin pone cara de "esto ya lo vi".',
        ],
      },
      {
        label: 'C) No hace falta marcar salvo que moleste',
        next: 'h1_repair_green',
        feedback: [
          'Puedes dejarla, pero si molesta la linea de otro debes marcarla.',
          'Como costumbre, conviene marcar siempre.',
        ],
      },
    ],
  },
  h1_repair_green: {
    title: 'Hoyo 1 - Marca de pique',
    hole: '1',
    body: [
      'Ves una marca de pique justo en tu linea de putt.',
      '',
      'Pregunta: puedes repararla?',
    ],
    choices: [
      {
        label: 'A) Si, se pueden reparar danos en el green',
        next: 'h2_water',
        etiquette: 5,
        setHoleScore: { hole: 1, score: 5 },
        correctRules: ['13.1c'],
        feedback: [
          'Correcto. Puedes reparar danos en el green, no solo si estan en tu linea.',
          'Haces dos putts y sales con bogey. Primer hoyo superado.',
        ],
      },
      {
        label: 'B) Solo si esta en mi linea',
        next: 'h2_water',
        setHoleScore: { hole: 1, score: 5 },
        wrongRules: ['13.1c'],
        feedback: [
          'Desde 2019 la regla es mas amplia: puedes reparar danos en el green aunque no esten en tu linea.',
          'Igual cierras con bogey y cara de alumno aplicado.',
        ],
      },
      {
        label: 'C) No, eso mejora mi linea',
        next: 'h2_water',
        setHoleScore: { hole: 1, score: 5 },
        wrongRules: ['13.1c'],
        feedback: [
          'Si puedes. Reparar marcas de impacto y danos del green esta permitido.',
          'Te enteras justo antes de meter el segundo putt.',
        ],
      },
    ],
  },
  h2_water: {
    title: 'Hoyo 2 - Par 3 con agua',
    hole: '2',
    body: [
      'Par 3 de 155 metros. Tu tiro sale bajo y hace "plop" en el lago frontal.',
      '',
      'Pregunta: la bola entro en penalty area amarilla. Que opciones tienes?',
    ],
    choices: [
      {
        label: 'A) Jugarla como esta desde el agua, si puedo',
        next: 'h2_colors',
        correctRules: ['17.1'],
        feedback: [
          'Si, esa opcion existe y no lleva penalidad.',
          'Valiente, aunque poco higienica.',
        ],
      },
      {
        label: 'B) Tomar alivio con 1 golpe: golpe y distancia o atras en linea',
        next: 'h2_colors',
        correctRules: ['17.1'],
        feedback: [
          'Correcto. En amarillas tienes golpe y distancia o alivio atras en linea.',
        ],
      },
      {
        label: 'C) Drop sin penalidad porque el agua no es culpa mia',
        next: 'h2_colors',
        wrongRules: ['17.1'],
        feedback: ['No. El alivio en penalty area cuesta 1 golpe, salvo que juegues la bola como esta.'],
      },
    ],
  },
  h2_colors: {
    title: 'Hoyo 2 - Amarilla vs roja',
    hole: '2',
    body: [
      'Bonus del Gordo Raul: cual es la diferencia entre estacas amarillas y rojas?',
    ],
    choices: [
      {
        label: 'A) Las amarillas son mas profundas',
        next: 'h2_drop',
        wrongRules: ['17.1'],
        feedback: ['No tiene nada que ver con la profundidad.'],
      },
      {
        label: 'B) Las rojas permiten alivio lateral como opcion extra',
        next: 'h2_drop',
        correctRules: ['17.1'],
        feedback: ['Exacto. En rojas puedes dropear lateral dentro de 2 largos de palo.'],
      },
      {
        label: 'C) No hay diferencia real',
        next: 'h2_drop',
        wrongRules: ['17.1'],
        feedback: ['Si la hay. Las rojas agregan alivio lateral.'],
      },
    ],
  },
  h2_drop: {
    title: 'Hoyo 2 - Procedimiento de drop',
    hole: '2',
    body: [
      'Decides alivio atras en linea. Martin te observa con seriedad teatral.',
      '',
      'Pregunta: como se hace el drop correctamente?',
    ],
    choices: [
      {
        label: 'A) Tirando la bola al piso desde cualquier altura',
        next: 'h2_bunker_touch',
        wrongRules: ['14.3'],
        feedback: ['No. Hay una altura especifica.'],
      },
      {
        label: 'B) Soltandola desde la altura de la rodilla',
        next: 'h2_bunker_touch',
        correctRules: ['14.3'],
        feedback: ['Perfecto. Regla 14.3: desde la altura de la rodilla, hacia abajo.'],
      },
      {
        label: 'C) Colocandola con la mano en el piso',
        next: 'h2_bunker_touch',
        wrongRules: ['14.3'],
        feedback: ['Eso es colocar, no dropear. Aqui corresponde drop.'],
      },
    ],
  },
  h2_bunker_touch: {
    title: 'Hoyo 2 - Bunker',
    hole: '2',
    body: [
      'El approach termina en bunker. Antes del golpe apoyas el palo en la arena para equilibrarte.',
      'Martin grita desde afuera: "No toques la arena".',
      '',
      'Pregunta: que hiciste mal?',
    ],
    choices: [
      {
        label: 'A) Toque la arena con el palo antes del golpe',
        next: 'h2_bunker_unplayable',
        penalty: 2,
        penaltyHole: 2,
        correctRules: ['12.2b'],
        feedback: [
          'Exacto. En bunker no puedes apoyar el palo ni testear la arena antes del golpe.',
          'La penalidad ya cayo: 2 golpes.',
        ],
      },
      {
        label: 'B) No me di cuenta, pero algo hice mal',
        next: 'h2_bunker_unplayable',
        penalty: 2,
        penaltyHole: 2,
        wrongRules: ['12.2b'],
        feedback: [
          'La falta fue tocar la arena con el palo antes del golpe.',
          'Regla 12.2b. Igual: 2 golpes.',
        ],
      },
      {
        label: 'C) No puedo pisar el bunker antes de pegar',
        next: 'h2_bunker_unplayable',
        penalty: 2,
        penaltyHole: 2,
        wrongRules: ['12.2b'],
        feedback: [
          'Pisar si puedes. Lo prohibido era apoyar el palo y tocar la arena.',
          'La penalidad sigue siendo 2 golpes.',
        ],
      },
    ],
  },
  h2_bunker_unplayable: {
    title: 'Hoyo 2 - Bola injugable en bunker',
    hole: '2',
    body: [
      'La bola quedo contra el labio. Piensas declararla injugable.',
      '',
      'Pregunta: puedes declarar bola injugable en un bunker?',
    ],
    choices: [
      {
        label: 'A) Si, pero con 1 golpe debo quedarme dentro del bunker',
        next: 'h2_green_collision',
        etiquette: 5,
        correctRules: ['19.3'],
        feedback: [
          'Correcto. Con 1 golpe te quedas en el bunker.',
          'Salir del bunker atras en linea cuesta 2 golpes.',
          'Al final haces un buen splash y rastrillas como ciudadano ejemplar.',
        ],
      },
      {
        label: 'B) No, en bunker siempre hay que pegarle',
        next: 'h2_green_collision',
        wrongRules: ['19.3'],
        feedback: ['Si puedes declarar injugable en bunker. La regla especial es el costo y la zona de alivio.'],
      },
      {
        label: 'C) Si, la saco del bunker con 1 golpe',
        next: 'h2_green_collision',
        wrongRules: ['19.3'],
        feedback: ['Sacarla fuera del bunker atras en linea cuesta 2 golpes, no 1.'],
      },
    ],
  },
  h2_green_collision: {
    title: 'Hoyo 2 - Bola contra bola',
    hole: '2',
    body: [
      'Ya en el green, el Gordo Raul puttea y su bola viene directo hacia la tuya, que tambien esta en el green.',
      '',
      'Pregunta: que pasa si chocan?',
    ],
    choices: [
      {
        label: 'A) En stroke play, el Gordo recibe 2 golpes de penalidad',
        next: 'h3_trees',
        setHoleScore: { hole: 2, score: 4 },
        correctRules: ['11.1a'],
        feedback: [
          'Correcto. Si una bola jugada desde el green golpea otra bola en el green, hay 2 golpes de penalidad para quien pego.',
          'Tu hoyo termina en bogey sufrido, pero pedagogico.',
        ],
      },
      {
        label: 'B) No pasa nada, se juegan donde quedaron',
        next: 'h3_trees',
        setHoleScore: { hole: 2, score: 4 },
        wrongRules: ['11.1a'],
        feedback: [
          'Eso aplicaria fuera del green en muchos casos, pero no aqui.',
          'Desde el green, el choque trae 2 golpes de penalidad para quien golpeo.',
        ],
      },
      {
        label: 'C) Hay que repetir el golpe',
        next: 'h3_trees',
        setHoleScore: { hole: 2, score: 4 },
        wrongRules: ['11.1a'],
        feedback: ['No se repite. Hay penalidad y cada bola sigue segun la regla.'],
      },
    ],
  },
  h3_trees: {
    title: 'Hoyo 3 - Bosque a la derecha',
    hole: '3',
    body: [
      'Par 5. Tu drive entra en los arboles de la derecha.',
      '',
      'Pregunta: que haces antes de ir a buscarla?',
    ],
    choices: [
      {
        label: 'A) Jugar una provisoria por si no aparece',
        next: 'h3_unplayable',
        correctRules: ['18.3'],
        feedback: ['Aprendiste. Declaras "provisoria" y dejas otra en fairway.'],
      },
      {
        label: 'B) Voy directo a buscarla',
        next: 'h3_unplayable',
        wrongRules: ['18.3'],
        feedback: ['Misma leccion que en el 1: ante la duda, provisoria antes de avanzar.'],
      },
      {
        label: 'C) La doy por perdida y tiro otra',
        next: 'h3_unplayable',
        wrongRules: ['18.2a'],
        feedback: ['No puedes declararla perdida por intuicion. Primero la buscas o juegas provisoria.'],
      },
    ],
  },
  h3_unplayable: {
    title: 'Hoyo 3 - Lie imposible',
    hole: '3',
    body: [
      'Encuentras la bola en menos de 3 minutos, pero un tronco te bloquea el backswing.',
      '',
      'Pregunta: que haces?',
    ],
    choices: [
      {
        label: 'A) Declaro bola injugable',
        next: 'h3_loose_impediments',
        correctRules: ['19'],
        feedback: [
          'Correcto. Fuera de penalty area puedes declarar bola injugable y elegir alivio con penalidad.',
        ],
      },
      {
        label: 'B) Muevo las ramas vivas para hacer espacio',
        next: 'h3_loose_impediments',
        penalty: 2,
        penaltyHole: 3,
        wrongRules: ['8.1a'],
        feedback: [
          'No puedes mover ramas vivas para mejorar area de swing.',
          'Eso mejora tus condiciones de juego: 2 golpes.',
        ],
      },
      {
        label: 'C) La pateo para sacarla',
        next: 'h3_loose_impediments',
        penalty: 2,
        penaltyHole: 3,
        wrongRules: ['10.1a'],
        feedback: [
          'No. Un golpe debe hacerse con la cabeza del palo.',
          'Patear la bola te cuesta 2 golpes y reputacion.',
        ],
      },
    ],
  },
  h3_loose_impediments: {
    title: 'Hoyo 3 - Hojas y ramas caidas',
    hole: '3',
    body: [
      'Tras el alivio, la bola queda entre hojas y ramas caidas en el piso.',
      '',
      'Pregunta: puedes sacarlas?',
    ],
    choices: [
      {
        label: 'A) Si, son impedimentos sueltos',
        next: 'h3_cart_path',
        correctRules: ['15.1'],
        feedback: ['Correcto. Los impedimentos sueltos se pueden quitar sin penalidad.'],
      },
      {
        label: 'B) No, forman parte del campo',
        next: 'h3_cart_path',
        wrongRules: ['15.1'],
        feedback: ['No. Si son naturales y no estan fijos, se pueden quitar.'],
      },
      {
        label: 'C) Solo si estan a mas de un palo de distancia',
        next: 'h3_cart_path',
        wrongRules: ['15.1'],
        feedback: ['No hay restriccion de distancia para quitar impedimentos sueltos.'],
      },
    ],
  },
  h3_cart_path: {
    title: 'Hoyo 3 - Camino de carrito',
    hole: '3',
    body: [
      'Sales del bosque, pegas otro buen golpe y la bola termina justo sobre el camino asfaltado del carrito.',
      '',
      'Pregunta: que opciones tienes?',
    ],
    choices: [
      {
        label: 'A) Jugarla como esta sobre el asfalto',
        next: 'h3_gur',
        feedback: [
          'Es legal, pero poco romantico para el palo.',
          'Tambien tienes derecho a alivio gratuito.',
        ],
      },
      {
        label: 'B) Alivio gratis: punto mas cercano de alivio completo y 1 palo',
        next: 'h3_gur',
        correctRules: ['16.1'],
        feedback: ['Correcto. Ese es el procedimiento de alivio por obstruccion inamovible.'],
      },
      {
        label: 'C) Muevo la bola un palo hacia cualquier lado',
        next: 'h3_gur',
        wrongRules: ['16.1'],
        feedback: ['No es a cualquier lado. Debes usar el punto mas cercano de alivio completo, no mas cerca del hoyo.'],
      },
    ],
  },
  h3_gur: {
    title: 'Hoyo 3 - Ground Under Repair',
    hole: '3',
    body: [
      'Tu approach cae en una zona marcada con lineas azules y cartel GUR.',
      '',
      'Pregunta: que haces?',
    ],
    choices: [
      {
        label: 'A) Alivio gratuito obligatorio',
        next: 'ending',
        setHoleScore: { hole: 3, score: 5 },
        wrongRules: ['16.1'],
        feedback: [
          'El alivio es gratuito, pero no obligatorio.',
          'Si quieres, puedes jugarla como esta.',
        ],
      },
      {
        label: 'B) Puedo jugarla como esta o tomar alivio gratuito',
        next: 'ending',
        setHoleScore: { hole: 3, score: 5 },
        correctRules: ['16.1'],
        feedback: [
          'Exacto. Tomas alivio bien, chipeas y haces bogey.',
          'La vuelta termina con dignidad intacta o casi intacta.',
        ],
      },
      {
        label: 'C) Es decoracion del campo, no cambia nada',
        next: 'ending',
        setHoleScore: { hole: 3, score: 5 },
        wrongRules: ['16.1'],
        feedback: ['No. GUR otorga alivio gratuito bajo la Regla 16.1.'],
      },
    ],
  },
  ending: {
    title: 'Hoyo 19',
    hole: 'F',
    body: [
      'En el bar del club, Martin te pide la tarjeta.',
      'El Gordo Raul levanta una cerveza y declara que sobreviviste a tu primera vuelta.',
    ],
    choices: [],
  },
};

function addUnique(list, value) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

function applyRuleMarks(state, ruleIds = [], target) {
  for (const ruleId of ruleIds) {
    if (target === 'correct') {
      addUnique(state.correctRules, ruleId);
    } else {
      addUnique(state.wrongRules, ruleId);
    }
  }
}

function applyEffects(state, choice, scene) {
  if (choice.flags) {
    Object.assign(state.flags, choice.flags);
  }

  if (choice.penalty) {
    const hole = choice.penaltyHole ?? (scene.hole && /^[123]$/.test(scene.hole) ? Number(scene.hole) : null);
    state.penalties += choice.penalty;
    if (hole && state.holePenalties[hole] !== undefined) {
      state.holePenalties[hole] += choice.penalty;
    }
  }

  if (choice.etiquette) {
    state.etiquette = Math.max(0, Math.min(100, state.etiquette + choice.etiquette));
  }

  applyRuleMarks(state, choice.correctRules, 'correct');
  applyRuleMarks(state, choice.wrongRules, 'wrong');

  if (choice.setHoleScore) {
    state.holeScores[choice.setHoleScore.hole] = choice.setHoleScore.score;
  }
}

function sceneRuntimeNotice(state, sceneId) {
  if (sceneId === 'h2_water' && state.flags.tooManyClubs && !state.flags.clubPenaltyApplied) {
    state.flags.clubPenaltyApplied = true;
    state.penalties += 4;
    state.holePenalties[2] += 4;
    if (!state.correctRules.includes('4.1b')) {
      addUnique(state.wrongRules, '4.1b');
    }
    return [
      'Antes de pegar en el par 3, Lucia cuenta tus palos y te frena.',
      '"Che... tenes 16 palos". Penalidad: 4 golpes maximos por la Regla 4.1b.',
      'Leccion dolorosa: el chequeo del estacionamiento no era decorativo.',
      '',
    ];
  }

  return [];
}

function scoreTotal(state) {
  return [1, 2, 3].reduce((sum, hole) => sum + (state.holeScores[hole] ?? 0) + state.holePenalties[hole], 0);
}

function scoreRank(total) {
  if (total <= 14) {
    return ['Scratch de Reglas', 'Conoces las reglas mejor que muchisima gente que ya paga green fee hace anos.'];
  }
  if (total <= 17) {
    return ['Buen Alumno', 'Hubo errores, pero el caos estuvo bajo control.'];
  }
  if (total <= 21) {
    return ['En Progreso', 'Hay potencial. Agua, bunker y provisoria merecen otra vuelta.'];
  }
  return ['Necesitas el Reglamento', 'Sobreviviste. Eso ya cuenta como exito narrativo.'];
}

function etiquetteRank(value) {
  if (value >= 90) {
    return ['Gentleman Golfista', 'Tus companeros te volverian a invitar sin pensarlo mucho.'];
  }
  if (value >= 70) {
    return ['Correcto', 'Buena compania en cancha, con detalles para pulir.'];
  }
  if (value >= 50) {
    return ['Necesitas Practica Social', 'La etiqueta aun tiene margen amplio de mejora.'];
  }
  return ['Persona Non Grata', 'El starter te mira como si fueras una demora andante.'];
}

export function createGameState() {
  return {
    currentSceneId: 'intro',
    choiceIndex: 0,
    contentScroll: 0,
    feedback: null,
    pendingNextSceneId: null,
    etiquette: 75,
    penalties: 0,
    holeScores: { 1: null, 2: null, 3: null },
    holePenalties: { 1: 0, 2: 0, 3: 0 },
    correctRules: [],
    wrongRules: [],
    flags: {
      tooManyClubs: false,
      clubPenaltyApplied: false,
      noProvisionalH1: false,
    },
    history: ['intro'],
    notices: [],
  };
}

export function getGameScene(state) {
  return SCENES[state.currentSceneId] ?? SCENES.intro;
}

export function getGameChoiceItems(state) {
  if (state.feedback) {
    return [{ label: 'Continuar', kind: 'continue' }];
  }

  const scene = getGameScene(state);
  return scene.choices.map((choice) => ({ label: choice.label, kind: 'choice' }));
}

export function getGameBodyLines(state) {
  const scene = getGameScene(state);
  const lines = [...(state.notices ?? []), ...scene.body];

  if (state.feedback) {
    lines.push('');
    lines.push('Respuesta:');
    lines.push(...state.feedback);
  }

  if (scene.title === 'Hoyo 19') {
    const total = scoreTotal(state);
    const [scoreTitle, scoreMessage] = scoreRank(total);
    const [etiquetteTitle, etiquetteMessage] = etiquetteRank(state.etiquette);
    const reviewed = Array.from(new Set([...state.correctRules, ...state.wrongRules]));

    lines.push('');
    lines.push('Tarjeta final');
    lines.push('+------+-----+---------+');
    lines.push('| Hoyo | Base| Total   |');
    lines.push('+------+-----+---------+');
    for (const hole of [1, 2, 3]) {
      const base = state.holeScores[hole] ?? 0;
      const totalHole = base + state.holePenalties[hole];
      lines.push(`|  ${hole}   |  ${String(base).padEnd(2, ' ')} |  ${String(totalHole).padEnd(6, ' ')} |`);
    }
    lines.push('+------+-----+---------+');
    lines.push(`Penalidades acumuladas: ${state.penalties}`);
    lines.push(`Score total: ${total}`);
    lines.push(`Ranking score: ${scoreTitle}`);
    lines.push(scoreMessage);
    lines.push('');
    lines.push(`Etiqueta: ${state.etiquette}`);
    lines.push(`Ranking etiqueta: ${etiquetteTitle}`);
    lines.push(etiquetteMessage);
    lines.push('');
    lines.push('Resumen de aprendizaje');
    for (const ruleId of reviewed) {
      const marker = state.correctRules.includes(ruleId) ? '[OK]' : '[X]';
      lines.push(`${marker} Regla ${ruleId} - ${RULE_LABELS[ruleId] ?? 'Referencia'}`);
    }
    lines.push('');
    lines.push('Martin levanta la pinta: "No jugaste perfecto, pero ya no sos un peligro reglamentario".');
  }

  return lines;
}

export function getGameSidebarLines(state) {
  const total = scoreTotal(state);
  const history = state.history.slice(-8).map((sceneId) => {
    const scene = SCENES[sceneId];
    return `${scene.hole.padStart(2, ' ')} ${scene.title}`;
  });

  return [
    'SCORECARD',
    `H1  ${state.holeScores[1] ?? '-'} + ${state.holePenalties[1]}`,
    `H2  ${state.holeScores[2] ?? '-'} + ${state.holePenalties[2]}`,
    `H3  ${state.holeScores[3] ?? '-'} + ${state.holePenalties[3]}`,
    '',
    `Total      ${total}`,
    `Penalidad  ${state.penalties}`,
    `Etiqueta   ${state.etiquette}`,
    '',
    `Acertadas  ${state.correctRules.length}`,
    `Erradas    ${state.wrongRules.length}`,
    '',
    'BITACORA',
    ...history,
  ];
}

export function getGameStatus(state) {
  if (state.feedback) {
    return 'enter o click | continuar';
  }

  if (state.currentSceneId === 'ending') {
    return 'r restart | v vault | click en toolbar | rueda para scroll';
  }

  return 'j/k moverse | enter elegir | click elegir | tab foco | r restart | v vault';
}

export function stepGame(state, index) {
  if (state.feedback) {
    const nextSceneId = state.pendingNextSceneId;
    state.feedback = null;
    state.pendingNextSceneId = null;
    state.currentSceneId = nextSceneId;
    state.choiceIndex = 0;
    state.contentScroll = 0;
    state.notices = sceneRuntimeNotice(state, nextSceneId);
    addUnique(state.history, nextSceneId);
    return { action: 'advance' };
  }

  const scene = getGameScene(state);
  const choice = scene.choices[index];
  if (!choice) {
    return { action: 'noop' };
  }

  applyEffects(state, choice, scene);
  state.feedback = choice.feedback ?? [];
  state.pendingNextSceneId = choice.next;
  state.choiceIndex = 0;
  state.contentScroll = 0;
  return { action: 'choice' };
}

export function moveGameChoice(state, delta) {
  const items = getGameChoiceItems(state);
  if (!items.length) {
    state.choiceIndex = 0;
    return;
  }
  state.choiceIndex = Math.max(0, Math.min(items.length - 1, state.choiceIndex + delta));
}

export function gameScoreTotal(state) {
  return scoreTotal(state);
}

export function gameRuleLabel(ruleId) {
  return RULE_LABELS[ruleId] ?? ruleId;
}
