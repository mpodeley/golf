(function () {
  const Phaser = window.Phaser;

  const TILE = 32;
  const MAP_ROWS = [
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    'rggggggggggggggggggggggggggr',
    'rgggpppppppppppppppppggggggr',
    'rgggpggggggggggggggppggggggr',
    'rgggpgghhhhhhhhhhggppggggggr',
    'rgggpgghhhhhhhhhhggppggggggr',
    'rgggpgghhhhhhhhhhggppfffftgr',
    'rgggpgghhhhhhhhhhggppfffffgr',
    'rgggpgghhhhhhhhhhggppfwwwfgr',
    'rgggpgghhhhhhhhhhggppfwwwfgr',
    'rgggppppppppppppppppfbbbfgr',
    'rgggggggggggggggggggfffffgr',
    'rgggggggggggggggggggggggggr',
    'rgggggggggggggggggggggggggr',
    'rgggggggggggggggggggggggggr',
    'rgggggggggggggggggggggggggr',
    'rgggggggggggggggggggggggggr',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrr',
  ];

  const TILE_COLORS = {
    g: 0x2b6a2f,
    r: 0x1f4d22,
    p: 0xa07c53,
    f: 0x5cae60,
    b: 0xd7bf84,
    w: 0x2f67c8,
    t: 0xd7f97d,
    h: 0xd7c19e,
  };

  const WALKABLE = new Set(['g', 'r', 'p', 'f', 'b', 't']);

  class GolfPrototypeScene extends Phaser.Scene {
    constructor() {
      super('golf-prototype');
      this.dialog = null;
      this.objective = 'Habla con Martin cerca del clubhouse.';
      this.etiquette = 75;
      this.penalties = 0;
      this.learnedRules = new Set();
      this.quest = {
        martinMet: false,
        luciaQuizDone: false,
        starterQuizDone: false,
        teeReached: false,
      };
      this.optionTexts = [];
      this.currentNpc = null;
    }

    preload() {
      this.load.image('player', './assets/player.svg');
      this.load.image('martin', './assets/martin.svg');
      this.load.image('lucia', './assets/lucia.svg');
      this.load.image('raul', './assets/raul.svg');
      this.load.image('starter', './assets/starter.svg');
      this.load.image('clubhouse', './assets/clubhouse.svg');
      this.load.image('flag', './assets/flag.svg');
    }

    create() {
      this.createRuntimeTextures();
      this.renderMap();
      this.createWorldBounds();
      this.createActors();
      this.createUi();
      this.createInputs();
      this.refreshHud();

      this.cameras.main.setBounds(0, 0, MAP_ROWS[0].length * TILE, MAP_ROWS.length * TILE);
      this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
      this.cameras.main.setZoom(1.42);
      this.cameras.main.roundPixels = true;

      this.time.delayedCall(300, () => {
        this.openDialog({
          speaker: 'Martin',
          pages: [
            {
              text:
                'Bienvenido al spike JRPG. Muevete con WASD o flechas, habla con la gente con E o SPACE. La idea es caminar por el club y aprender reglas sin que se sienta como un FAQ con patas.',
            },
          ],
          onClose: () => {
            this.quest.martinMet = true;
            this.objective = 'Habla con Lucia para revisar tu bolsa.';
            this.refreshHud();
          },
        });
      });
    }

    createRuntimeTextures() {
      const keys = Object.keys(TILE_COLORS);
      for (const key of keys) {
        const graphics = this.add.graphics();
        graphics.fillStyle(TILE_COLORS[key], 1);
        graphics.fillRect(0, 0, TILE, TILE);

        if (key === 'f') {
          graphics.lineStyle(2, 0x7bd27f, 0.45);
          graphics.lineBetween(0, 8, TILE, 8);
          graphics.lineBetween(0, 24, TILE, 24);
        }

        if (key === 'w') {
          graphics.lineStyle(2, 0x95c4ff, 0.45);
          graphics.lineBetween(0, 10, TILE, 6);
          graphics.lineBetween(0, 22, TILE, 18);
        }

        if (key === 'b') {
          graphics.fillStyle(0xf2e2aa, 0.2);
          graphics.fillEllipse(TILE / 2, TILE / 2, TILE - 8, TILE - 12);
        }

        if (key === 'p') {
          graphics.fillStyle(0x7f603f, 0.35);
          graphics.fillRect(6, 0, 4, TILE);
          graphics.fillRect(18, 0, 4, TILE);
        }

        graphics.generateTexture(`tile-${key}`, TILE, TILE);
        graphics.destroy();
      }

      const tree = this.add.graphics();
      tree.fillStyle(0x5b331f, 1);
      tree.fillRect(14, 20, 8, 14);
      tree.fillStyle(0x2f7e3b, 1);
      tree.fillCircle(18, 14, 14);
      tree.generateTexture('tree', 36, 40);
      tree.destroy();

      const stone = this.add.graphics();
      stone.fillStyle(0xc7d2d6, 1);
      stone.fillRoundedRect(0, 0, 64, 18, 6);
      stone.lineStyle(2, 0x6b7c81, 0.9);
      stone.strokeRoundedRect(0, 0, 64, 18, 6);
      stone.generateTexture('tee-marker', 64, 18);
      stone.destroy();
    }

    renderMap() {
      this.mapLayer = this.add.layer();

      MAP_ROWS.forEach((row, y) => {
        row.split('').forEach((tile, x) => {
          const image = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, `tile-${tile}`);
          image.setDepth(0);
          this.mapLayer.add(image);
        });
      });

      this.clubhouse = this.add.image(11 * TILE, 6.7 * TILE, 'clubhouse');
      this.clubhouse.setDepth(2);
      this.clubhouse.setScale(1.2);

      const teeMarker = this.add.image(25 * TILE, 6.2 * TILE, 'tee-marker');
      teeMarker.setDepth(1);

      const flag = this.add.image(25.5 * TILE, 5.6 * TILE, 'flag');
      flag.setDepth(3);
      flag.setScale(1.1);

      const propData = [
        [5, 12],
        [7, 13],
        [20, 13],
        [22, 12],
        [24, 11],
      ];

      propData.forEach(([x, y]) => {
        const tree = this.add.image(x * TILE + 16, y * TILE + 12, 'tree');
        tree.setDepth(2);
      });
    }

    createWorldBounds() {
      this.collisionBodies = this.physics.add.staticGroup();

      MAP_ROWS.forEach((row, y) => {
        row.split('').forEach((tile, x) => {
          if (WALKABLE.has(tile)) {
            return;
          }

          const body = this.add.rectangle(x * TILE + 16, y * TILE + 16, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(body, true);
          this.collisionBodies.add(body);
        });
      });

      const houseCollider = this.add.rectangle(11 * TILE, 6.3 * TILE, 9 * TILE, 6 * TILE, 0x000000, 0);
      this.physics.add.existing(houseCollider, true);
      this.collisionBodies.add(houseCollider);

      this.teeZone = this.add.rectangle(25.5 * TILE, 6.1 * TILE, 3 * TILE, 4 * TILE, 0x000000, 0);
      this.physics.add.existing(this.teeZone, true);
    }

    createActors() {
      this.player = this.physics.add.sprite(8 * TILE, 11 * TILE, 'player');
      this.player.setDepth(4);
      this.player.setScale(0.95);
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(20, 22).setOffset(6, 14);
      this.physics.add.collider(this.player, this.collisionBodies);

      this.npcs = [
        this.createNpc({
          key: 'martin',
          name: 'Martin',
          x: 10 * TILE,
          y: 11 * TILE,
          talk: () => this.talkMartin(),
        }),
        this.createNpc({
          key: 'lucia',
          name: 'Lucia',
          x: 13 * TILE,
          y: 11 * TILE,
          talk: () => this.talkLucia(),
        }),
        this.createNpc({
          key: 'raul',
          name: 'Gordo Raul',
          x: 15.5 * TILE,
          y: 11.2 * TILE,
          talk: () => this.talkRaul(),
        }),
        this.createNpc({
          key: 'starter',
          name: 'Starter',
          x: 23.5 * TILE,
          y: 7 * TILE,
          talk: () => this.talkStarter(),
        }),
      ];

      this.promptText = this.add
        .text(0, 0, 'E TALK', {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '10px',
          color: '#d7ffe2',
          backgroundColor: '#102117',
          padding: { x: 6, y: 3 },
        })
        .setDepth(20)
        .setVisible(false)
        .setScrollFactor(1);
    }

    createNpc({ key, name, x, y, talk }) {
      const sprite = this.physics.add.staticSprite(x, y, key);
      sprite.setDepth(4);
      sprite.setScale(key === 'raul' ? 1.05 : 0.95);
      sprite.nameLabel = this.add
        .text(x, y - 30, name, {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '10px',
          color: '#f5ffb3',
          stroke: '#102117',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(5);
      sprite.interact = talk;
      return sprite;
    }

    createUi() {
      this.hudPanel = this.add
        .rectangle(12, 12, 316, 86, 0x071108, 0.84)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(50)
        .setStrokeStyle(1, 0x87ffb2, 0.6);

      this.hudText = this.add
        .text(24, 22, '', {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '12px',
          color: '#d7ffe2',
          lineSpacing: 4,
        })
        .setScrollFactor(0)
        .setDepth(51);

      this.controlsText = this.add
        .text(24, 102, 'WASD/Flechas mover  E o SPACE hablar  Click elegir', {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '11px',
          color: '#c6d6cb',
        })
        .setScrollFactor(0)
        .setDepth(51);

      this.dialogBox = this.add
        .rectangle(28, 334, 904, 182, 0x071108, 0.92)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(60)
        .setStrokeStyle(2, 0x87ffb2, 0.7)
        .setVisible(false);

      this.dialogSpeaker = this.add
        .text(48, 352, '', {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '14px',
          color: '#fff6a8',
        })
        .setScrollFactor(0)
        .setDepth(61)
        .setVisible(false);

      this.dialogText = this.add
        .text(48, 378, '', {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '14px',
          color: '#d7ffe2',
          wordWrap: { width: 850 },
          lineSpacing: 4,
        })
        .setScrollFactor(0)
        .setDepth(61)
        .setVisible(false);

      this.dialogHint = this.add
        .text(48, 486, '', {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '11px',
          color: '#8be0a7',
        })
        .setScrollFactor(0)
        .setDepth(61)
        .setVisible(false);

      this.layoutUi();
      this.scale.on('resize', () => this.layoutUi());
    }

    layoutUi() {
      const width = this.scale.width;
      const height = this.scale.height;

      this.hudPanel.setSize(Math.min(336, width - 24), 86);
      this.hudText.setPosition(24, 22);
      this.controlsText.setPosition(24, 102);

      const dialogWidth = Math.max(720, width - 56);
      const dialogHeight = 188;
      const dialogX = (width - dialogWidth) / 2;
      const dialogY = height - dialogHeight - 24;

      this.dialogBox.setPosition(dialogX, dialogY);
      this.dialogBox.setSize(dialogWidth, dialogHeight);
      this.dialogSpeaker.setPosition(dialogX + 20, dialogY + 18);
      this.dialogText.setPosition(dialogX + 20, dialogY + 44);
      this.dialogText.setWordWrapWidth(dialogWidth - 40);
      this.dialogHint.setPosition(dialogX + 20, dialogY + dialogHeight - 26);

      this.optionTexts.forEach((text, index) => {
        text.setPosition(dialogX + 20, dialogY + 104 + index * 28);
      });
    }

    createInputs() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D',
        interact: 'E',
      });

      this.input.keyboard.on('keydown-E', () => this.handlePrimaryAction());
      this.input.keyboard.on('keydown-SPACE', () => this.handlePrimaryAction());
      this.input.keyboard.on('keydown-ENTER', () => this.handlePrimaryAction());
      this.input.keyboard.on('keydown-UP', () => this.moveDialogSelection(-1));
      this.input.keyboard.on('keydown-W', () => this.moveDialogSelection(-1));
      this.input.keyboard.on('keydown-DOWN', () => this.moveDialogSelection(1));
      this.input.keyboard.on('keydown-S', () => this.moveDialogSelection(1));
    }

    refreshHud() {
      this.hudText.setText(
        [
          `OBJ  ${this.objective}`,
          `ETQ  ${this.etiquette}    PEN  ${this.penalties}`,
          `RULES ${this.learnedRules.size} learned`,
        ],
      );
    }

    handlePrimaryAction() {
      if (this.dialog) {
        this.advanceDialog();
        return;
      }

      if (this.currentNpc) {
        this.currentNpc.interact();
      }
    }

    nearestNpc() {
      let nearest = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const npc of this.npcs) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
        if (distance < 52 && distance < nearestDistance) {
          nearest = npc;
          nearestDistance = distance;
        }
      }

      return nearest;
    }

    talkMartin() {
      const pages = this.quest.martinMet
        ? [
            {
              text:
                'La forma JRPG esta buena. Lo importante es que caminar, hablar y tomar decisiones se sienta natural, no como navegar menues con pasto.',
            },
          ]
        : [
            {
              text:
                'Primera vez por aca? En esta version quiero que explores el club, hables con nosotros y que las reglas aparezcan dentro de la vuelta, no aparte.',
            },
            {
              text: 'Arranca por Lucia. Si no revisas la bolsa, mas tarde la penalidad te cae como piano reglamentario.',
            },
          ];

      this.openDialog({
        speaker: 'Martin',
        pages,
        onClose: () => {
          this.quest.martinMet = true;
          this.objective = this.quest.luciaQuizDone
            ? 'Habla con el starter antes de ir al tee del 1.'
            : 'Habla con Lucia para revisar tu bolsa.';
          this.refreshHud();
        },
      });
    }

    talkLucia() {
      if (this.quest.luciaQuizDone) {
        this.openDialog({
          speaker: 'Lucia',
          pages: [
            {
              text: 'La bolsa ya esta revisada. Menos mal, porque cargar 16 palos tiene una energia muy de caos tempranero.',
            },
          ],
        });
        return;
      }

      this.openDialog({
        speaker: 'Lucia',
        pages: [
          {
            text: 'Antes de salir: conte tus palos. Cuantos puedes llevar como maximo al empezar la vuelta?',
            options: [
              {
                label: '14 palos',
                onSelect: () => {
                  this.learnedRules.add('4.1b');
                  this.etiquette += 5;
                  this.quest.luciaQuizDone = true;
                  this.objective = 'Habla con el starter cerca del tee del 1.';
                  this.refreshHud();
                  this.openDialog({
                    speaker: 'Lucia',
                    pages: [
                      {
                        text: 'Exacto. Regla 4.1b. Lo ideal es aprender esto aca y no despues de dos hoyos con cara de inocente.',
                      },
                    ],
                  });
                },
              },
              {
                label: '16, por si hace falta variedad',
                onSelect: () => {
                  this.penalties += 4;
                  this.quest.luciaQuizDone = true;
                  this.objective = 'Habla con el starter. Ya arrancaste debiendo favores al reglamento.';
                  this.refreshHud();
                  this.openDialog({
                    speaker: 'Lucia',
                    pages: [
                      {
                        text: 'No. El maximo son 14. Te salvo antes de salir, pero te llevo 4 golpes de penalidad simbólicos para que duela lo suficiente.',
                      },
                    ],
                  });
                },
              },
              {
                label: 'Depende del handicap',
                onSelect: () => {
                  this.penalties += 2;
                  this.quest.luciaQuizDone = true;
                  this.objective = 'Habla con el starter cerca del tee del 1.';
                  this.refreshHud();
                  this.openDialog({
                    speaker: 'Lucia',
                    pages: [
                      {
                        text: 'No depende del handicap. El tope es 14. Te dejo seguir, pero esta confusion no era gratis.',
                      },
                    ],
                  });
                },
              },
            ],
          },
        ],
      });
    }

    talkRaul() {
      this.openDialog({
        speaker: 'Gordo Raul',
        pages: [
          {
            text:
              'Consejo no solicitado: si la mandas al bosque, tira provisoria antes de salir caminando como si fueras a filmar una documental de fauna.',
          },
          {
            text: 'Cuando esto sea el juego completo, yo exijo dos cosas: un chiste por hoyo y un minijuego de bunker dramatico.',
          },
        ],
      });
    }

    talkStarter() {
      if (!this.quest.luciaQuizDone) {
        this.openDialog({
          speaker: 'Starter',
          pages: [
            {
              text: 'Antes de salir, revisa la bolsa con Lucia. No quiero otro debutante descubriendo la Regla 4.1b en publico.',
            },
          ],
        });
        return;
      }

      if (this.quest.starterQuizDone) {
        this.openDialog({
          speaker: 'Starter',
          pages: [
            {
              text: 'Todo listo. El tee del 1 esta ahi al lado. Camina hasta la bandera y ya tienes un loop JRPG bastante prometedor.',
            },
          ],
        });
        return;
      }

      this.openDialog({
        speaker: 'Starter',
        pages: [
          {
            text: 'Ultimo chequeo. Si pierdes una bola, cuanto tiempo tienes para buscarla segun la regla actual?',
            options: [
              {
                label: '3 minutos',
                onSelect: () => {
                  this.learnedRules.add('18.2a');
                  this.etiquette += 5;
                  this.quest.starterQuizDone = true;
                  this.objective = 'Camina hasta el tee del 1.';
                  this.refreshHud();
                  this.openDialog({
                    speaker: 'Starter',
                    pages: [
                      {
                        text: 'Correcto. Son 3 minutos. Ya puedes ir al tee del 1. Ahi empieza el hoyo y el juego de verdad.',
                      },
                    ],
                  });
                },
              },
              {
                label: '5 minutos',
                onSelect: () => {
                  this.penalties += 1;
                  this.quest.starterQuizDone = true;
                  this.objective = 'Camina hasta el tee del 1.';
                  this.refreshHud();
                  this.openDialog({
                    speaker: 'Starter',
                    pages: [
                      {
                        text: 'Era asi antes. Hoy son 3 minutos. Te dejo pasar con una penalidad leve por nostalgia reglamentaria.',
                      },
                    ],
                  });
                },
              },
              {
                label: 'Hasta que el grupo se harte',
                onSelect: () => {
                  this.penalties += 2;
                  this.etiquette -= 10;
                  this.quest.starterQuizDone = true;
                  this.objective = 'Camina hasta el tee del 1.';
                  this.refreshHud();
                  this.openDialog({
                    speaker: 'Starter',
                    pages: [
                      {
                        text: 'Respuesta honesta, pero catastrófica. Son 3 minutos. El grupo se harta mucho antes de eso.',
                      },
                    ],
                  });
                },
              },
            ],
          },
        ],
      });
    }

    openDialog({ speaker, pages, onClose }) {
      this.dialog = {
        speaker,
        pages,
        pageIndex: 0,
        optionIndex: 0,
        onClose,
      };
      this.renderDialogPage();
    }

    closeDialog() {
      this.dialog = null;
      this.dialogBox.setVisible(false);
      this.dialogSpeaker.setVisible(false);
      this.dialogText.setVisible(false);
      this.dialogHint.setVisible(false);

      this.optionTexts.forEach((text) => text.destroy());
      this.optionTexts = [];
    }

    renderDialogPage() {
      if (!this.dialog) {
        return;
      }

      const page = this.dialog.pages[this.dialog.pageIndex];
      this.dialogBox.setVisible(true);
      this.dialogSpeaker.setVisible(true).setText(this.dialog.speaker);
      this.dialogText.setVisible(true).setText(page.text);
      this.dialogHint.setVisible(true);

      this.optionTexts.forEach((text) => text.destroy());
      this.optionTexts = [];

      if (page.options?.length) {
        this.dialogHint.setText('UP/DOWN o click para elegir, ENTER para confirmar');
        page.options.forEach((option, index) => {
          const optionX = this.dialogBox.x + 20;
          const optionY = this.dialogBox.y + 104 + index * 28;
          const text = this.add
            .text(optionX, optionY, '', {
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '13px',
              color: '#d7ffe2',
              backgroundColor: '#102117',
              padding: { x: 8, y: 4 },
            })
            .setScrollFactor(0)
            .setDepth(62)
            .setInteractive({ useHandCursor: true });

          text.on('pointerover', () => {
            if (this.dialog) {
              this.dialog.optionIndex = index;
              this.refreshDialogOptions();
            }
          });
          text.on('pointerdown', () => {
            if (this.dialog) {
              this.dialog.optionIndex = index;
              this.advanceDialog();
            }
          });

          this.optionTexts.push(text);
        });

        this.refreshDialogOptions();
      } else {
        this.dialogHint.setText('SPACE / ENTER / click para seguir');
      }
    }

    refreshDialogOptions() {
      if (!this.dialog) {
        return;
      }

      const page = this.dialog.pages[this.dialog.pageIndex];
      if (!page.options?.length) {
        return;
      }

      page.options.forEach((option, index) => {
        const text = this.optionTexts[index];
        if (!text) {
          return;
        }

        const selected = index === this.dialog.optionIndex;
        text.setText(`${selected ? '>_' : '  '} ${option.label}`);
        text.setStyle({
          color: selected ? '#061108' : '#d7ffe2',
          backgroundColor: selected ? '#f5ffb3' : '#102117',
        });
      });
    }

    moveDialogSelection(delta) {
      if (!this.dialog) {
        return;
      }

      const page = this.dialog.pages[this.dialog.pageIndex];
      if (!page.options?.length) {
        return;
      }

      this.dialog.optionIndex = Phaser.Math.Wrap(this.dialog.optionIndex + delta, 0, page.options.length);
      this.refreshDialogOptions();
    }

    advanceDialog() {
      if (!this.dialog) {
        return;
      }

      const page = this.dialog.pages[this.dialog.pageIndex];
      if (page.options?.length) {
        const option = page.options[this.dialog.optionIndex];
        this.closeDialog();
        option.onSelect();
        return;
      }

      if (this.dialog.pageIndex < this.dialog.pages.length - 1) {
        this.dialog.pageIndex += 1;
        this.dialog.optionIndex = 0;
        this.renderDialogPage();
        return;
      }

      const onClose = this.dialog.onClose;
      this.closeDialog();
      if (onClose) {
        onClose();
      }
    }

    update() {
      this.updatePlayerMovement();
      this.updatePrompt();
      this.checkTeeArrival();
    }

    updatePlayerMovement() {
      if (this.dialog) {
        this.player.setVelocity(0);
        return;
      }

      const speed = 140;
      const moveX = (this.cursors.left.isDown || this.keys.left.isDown ? -1 : 0) + (this.cursors.right.isDown || this.keys.right.isDown ? 1 : 0);
      const moveY = (this.cursors.up.isDown || this.keys.up.isDown ? -1 : 0) + (this.cursors.down.isDown || this.keys.down.isDown ? 1 : 0);

      this.player.setVelocity(0);

      if (moveX !== 0 || moveY !== 0) {
        const vector = new Phaser.Math.Vector2(moveX, moveY).normalize().scale(speed);
        this.player.setVelocity(vector.x, vector.y);
      }
    }

    updatePrompt() {
      if (this.dialog) {
        this.currentNpc = null;
        this.promptText.setVisible(false);
        return;
      }

      this.currentNpc = this.nearestNpc();
      if (!this.currentNpc) {
        this.promptText.setVisible(false);
        return;
      }

      this.promptText
        .setPosition(this.currentNpc.x - 18, this.currentNpc.y - 48)
        .setText(`E ${this.currentNpc.nameLabel.text.toUpperCase()}`)
        .setVisible(true);
    }

    checkTeeArrival() {
      if (!this.quest.starterQuizDone || this.quest.teeReached || this.dialog) {
        return;
      }

      const zoneBounds = this.teeZone.getBounds();
      if (zoneBounds.contains(this.player.x, this.player.y)) {
        this.quest.teeReached = true;
        this.learnedRules.add('6.2b');
        this.objective = 'Vertical slice cumplido: ahora toca convertir esto en un hoyo completo.';
        this.refreshHud();
        this.openDialog({
          speaker: 'Narrador',
          pages: [
            {
              text:
                'Llegaste al tee del 1. La estructura JRPG ya tiene sentido: mapa, NPCs, objetivo, quiz y gating espacial. El siguiente paso es transformar este recorrido en el Hoyo 1 completo con swing, provisoria y OB.',
            },
          ],
        });
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: 960,
    height: 540,
    backgroundColor: '#061108',
    pixelArt: false,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GolfPrototypeScene],
  });

  window.addEventListener('resize', () => {
    game.scale.refresh();
  });
})();
