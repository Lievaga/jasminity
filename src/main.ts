import Phaser from "phaser";
import "./style.css";

type ArcadeCollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

type JasminPose = "idle" | "walk1" | "walk2" | "jump";

class ApartmentScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  private restartKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;

  private alarmClock!: Phaser.Physics.Arcade.Image;
  private coffee!: Phaser.Physics.Arcade.Image;
  private exitDoor!: Phaser.Physics.Arcade.Image;

  private urgency = 0;
  private urgencyMax = 100;
  private urgencySpeed = 4;

  private normalMoveSpeed = 220;
  private coffeeMoveSpeed = 360;
  private currentMoveSpeed = 220;

  private normalJumpVelocity = -430;
  private coffeeJumpVelocity = -540;
  private currentJumpVelocity = -430;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private levelComplete = false;
  private alarmDisabled = false;
  private coffeeCollected = false;
  private exitWarningActive = false;

  private triggeredObstacles = new Set<string>();

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private readonly gameHeight = 540;
  private readonly worldWidth = 3200;

  constructor() {
    super("ApartmentScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#87ceeb");

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.cameras.main.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.urgency = 0;
    this.urgencySpeed = 4;
    this.currentMoveSpeed = this.normalMoveSpeed;
    this.currentJumpVelocity = this.normalJumpVelocity;

    this.gameStarted = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.alarmDisabled = false;
    this.coffeeCollected = false;
    this.exitWarningActive = false;

    this.triggeredObstacles.clear();

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createPlayerTextures();
    this.createPlatformTexture();
    this.createAlarmClockTexture();
    this.createCoffeeTexture();
    this.createExitDoorTexture();

    this.createSlipperTexture();
    this.createLaundryBasketTexture();
    this.createStoolTexture();

    this.createBackground();
    this.createApartmentDecorations();
    this.createLevel();
    this.createPlayer();
    this.createAlarmClock();
    this.createCoffee();
    this.createObstacles();
    this.createExitDoor();
    this.createControls();
    this.createHud();
    this.createStartScreen();

    this.cameras.main.startFollow(
      this.player,
      true,
      0.08,
      0.08
    );

    this.cameras.main.setDeadzone(260, 180);
  }

  update(time: number, delta: number) {
    if (!this.gameStarted) {
      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.startGame();
      }

      return;
    }

    if (this.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }

      return;
    }

    if (this.levelComplete) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }

      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.scene.start("MetroScene", {
          urgency: this.urgency,
        });
      }

      return;
    }

    this.updatePlayerMovement();
    this.updatePlayerAppearance(time);
    this.updateUrgency(delta);
  }

  private createStartScreen() {
    const overlay = this.add
      .rectangle(480, 270, 960, 540, 0x0f172a, 0.88)
      .setScrollFactor(0)
      .setDepth(100);

    const smallTitle = this.add
      .text(480, 105, "JASMINITY PRESENTS", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const title = this.add
      .text(480, 165, "MORNING AT HOME", {
        fontFamily: "Arial",
        fontSize: "50px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const description = this.add
      .text(480, 235, "Coffee first. Metro next.", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#cbd5e1",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const instructions = this.add
      .text(
        480,
        285,
        "Turn off the alarm, drink coffee and reach the exit.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#94a3b8",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const startButton = this.add
      .rectangle(480, 370, 260, 70, 0x22c55e)
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    const startText = this.add
      .text(480, 370, "START", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    const keyboardText = this.add
      .text(480, 435, "Click START · Enter · Space", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#facc15",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const startObjects = [
      overlay,
      smallTitle,
      title,
      description,
      instructions,
      startButton,
      startText,
      keyboardText,
    ];

    startButton.on("pointerover", () => {
      startButton.setFillStyle(0x16a34a);
      startButton.setScale(1.04);
    });

    startButton.on("pointerout", () => {
      startButton.setFillStyle(0x22c55e);
      startButton.setScale(1);
    });

    startButton.on("pointerdown", () => {
      this.startGame();
    });

    this.events.once("start-game", () => {
      startObjects.forEach((gameObject) => {
        if (gameObject.active) {
          gameObject.destroy();
        }
      });
    });
  }

  private startGame() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-game");

    this.objectiveText.setText(
      "OBJECTIVE: TURN OFF THE ALARM"
    );

    this.cameras.main.flash(250, 255, 255, 255);

    const wakeUpText = this.add
      .text(480, 155, "WAKE UP!", {
        fontFamily: "Arial",
        fontSize: "42px",
        color: "#ffffff",
        backgroundColor: "#dc2626",
        fontStyle: "bold",
        padding: {
          x: 20,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    const instructionText = this.add
      .text(480, 215, "Turn off the alarm clock.", {
        fontFamily: "Arial",
        fontSize: "21px",
        color: "#1f2937",
        backgroundColor: "#ffffff",
        padding: {
          x: 14,
          y: 8,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.tweens.add({
      targets: wakeUpText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 350,
      yoyo: true,
      repeat: 3,
    });

    this.time.delayedCall(2200, () => {
      wakeUpText.destroy();
      instructionText.destroy();
    });
  }

  private createBackground() {
    this.add
      .rectangle(
        this.worldWidth / 2,
        250,
        this.worldWidth,
        500,
        0x87ceeb
      )
      .setDepth(-10);

    this.add
      .rectangle(
        this.worldWidth / 2,
        455,
        this.worldWidth,
        110,
        0xd6c6a8
      )
      .setDepth(-9);

    for (let x = 0; x < this.worldWidth; x += 160) {
      this.add
        .rectangle(
          x + 80,
          460,
          3,
          100,
          0xb8a98d,
          0.45
        )
        .setDepth(-8);
    }
  }

  private createApartmentDecorations() {
    this.add
      .text(100, 155, "MORNING AT HOME", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setDepth(1);

    this.add
      .rectangle(180, 390, 210, 90, 0x9f7aea)
      .setStrokeStyle(5, 0x6b46c1)
      .setDepth(-2);

    this.add
      .rectangle(180, 350, 180, 30, 0xc4b5fd)
      .setDepth(-1);

    this.add
      .rectangle(110, 438, 22, 45, 0x6b46c1)
      .setDepth(-1);

    this.add
      .rectangle(250, 438, 22, 45, 0x6b46c1)
      .setDepth(-1);

    this.add
      .text(180, 390, "BED", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .rectangle(500, 330, 170, 125, 0xf8fafc)
      .setStrokeStyle(8, 0x475569)
      .setDepth(-2);

    this.add
      .rectangle(500, 330, 6, 125, 0x475569)
      .setDepth(-1);

    this.add
      .rectangle(500, 330, 170, 6, 0x475569)
      .setDepth(-1);

    this.add
      .circle(475, 310, 28, 0xfacc15, 0.9)
      .setDepth(-3);

    this.add
      .rectangle(850, 400, 180, 45, 0x8b5e3c)
      .setDepth(-2);

    this.add
      .rectangle(800, 445, 15, 65, 0x5c3d2e)
      .setDepth(-2);

    this.add
      .rectangle(900, 445, 15, 65, 0x5c3d2e)
      .setDepth(-2);

    this.add
      .text(850, 370, "COFFEE TABLE", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(1220, 315, 240, 210, 0xf1f5f9)
      .setStrokeStyle(8, 0x64748b)
      .setDepth(-2);

    this.add
      .rectangle(1220, 315, 8, 210, 0x64748b)
      .setDepth(-1);

    this.add
      .rectangle(1220, 315, 240, 8, 0x64748b)
      .setDepth(-1);

    this.add
      .text(1220, 205, "THE LONG HALLWAY", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(1760, 350, 210, 180, 0xf59e0b)
      .setStrokeStyle(8, 0x92400e)
      .setDepth(-2);

    this.add
      .circle(1825, 355, 8, 0x78350f)
      .setDepth(-1);

    this.add
      .text(1760, 240, "KITCHEN", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(2180, 405, 280, 70, 0x38bdf8)
      .setStrokeStyle(6, 0x0369a1)
      .setDepth(-2);

    this.add
      .text(2180, 405, "SOFA OF PROCRASTINATION", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(2720, 325, 240, 270, 0xe2e8f0)
      .setStrokeStyle(10, 0x64748b)
      .setDepth(-2);

    this.add
      .text(2720, 175, "FRONT HALL", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(3030, 175, "EXIT", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#15803d",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private createLevel() {
    this.platforms = this.physics.add.staticGroup();

    this.platforms
      .create(this.worldWidth / 2, 515, "platform")
      .setScale(this.worldWidth / 40, 1)
      .refreshBody();

    this.createPlatform(430, 415, 3);
    this.createPlatform(650, 350, 3);
    this.createPlatform(890, 410, 4);

    this.createPlatform(1120, 360, 3);
    this.createPlatform(1370, 300, 3);
    this.createPlatform(1570, 395, 3);

    this.createPlatform(1880, 350, 4);
    this.createPlatform(2130, 285, 3);
    this.createPlatform(2370, 390, 4);

    this.createPlatform(2600, 330, 3);
    this.createPlatform(2860, 400, 4);

    this.add
      .text(70, 470, "START", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#166534",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(980, 455, "Mind the furniture.", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#334155",
      })
      .setOrigin(0.5);

    this.add
      .text(2020, 455, "No time to sit down.", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#334155",
      })
      .setOrigin(0.5);

    this.add
      .text(2660, 455, "The metro won't wait!", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#b91c1c",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private createPlatform(
    x: number,
    y: number,
    scaleX: number
  ) {
    this.platforms
      .create(x, y, "platform")
      .setScale(scaleX, 1)
      .refreshBody();
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(
      100,
      426,
      "jasmin-idle"
    );

    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);
    this.player.setDepth(5);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createAlarmClock() {
    this.alarmClock = this.physics.add.staticImage(
      300,
      455,
      "alarm-clock"
    );

    this.alarmClock.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.alarmClock,
      this.disableAlarmClock,
      undefined,
      this
    );

    this.add
      .text(300, 395, "ALARM!", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#b91c1c",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.alarmClock,
      angle: {
        from: -8,
        to: 8,
      },
      duration: 100,
      yoyo: true,
      repeat: -1,
    });
  }

  private disableAlarmClock(
    _playerObject: ArcadeCollisionObject,
    alarmObject: ArcadeCollisionObject
  ) {
    if (
      this.alarmDisabled ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const alarmClock =
      alarmObject as Phaser.Physics.Arcade.Image;

    this.alarmDisabled = true;

    this.objectiveText.setText(
      "OBJECTIVE: DRINK THE COFFEE"
    );

    this.tweens.killTweensOf(alarmClock);

    alarmClock.setAngle(0);
    alarmClock.disableBody(true, true);

    this.cameras.main.shake(180, 0.004);

    const awakeText = this.add
      .text(480, 155, "Fine. I'm awake.", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#ffffff",
        backgroundColor: "#334155",
        fontStyle: "bold",
        padding: {
          x: 18,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    const coffeeText = this.add
      .text(480, 210, "Now find the coffee.", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#7c2d12",
        backgroundColor: "#fde68a",
        padding: {
          x: 14,
          y: 8,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.time.delayedCall(1800, () => {
      awakeText.destroy();
      coffeeText.destroy();
    });
  }

  private createCoffee() {
    this.coffee = this.physics.add.staticImage(
      890,
      350,
      "coffee"
    );

    this.coffee.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.coffee,
      this.collectCoffee,
      undefined,
      this
    );

    this.add
      .text(890, 305, "COFFEE", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#7c2d12",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private createObstacles() {
    this.obstacles = this.physics.add.staticGroup();

    const slipper = this.obstacles
      .create(1260, 460, "slipper")
      .setDepth(4);

    slipper.setData("obstacleId", "slipper");
    slipper.setData(
      "message",
      "Who left that slipper there?!"
    );

    const laundryBasket = this.obstacles
      .create(1990, 438, "laundry-basket")
      .setDepth(4);

    laundryBasket.setData(
      "obstacleId",
      "laundry-basket"
    );

    laundryBasket.setData(
      "message",
      "Laundry attacks again!"
    );

    const stool = this.obstacles
      .create(2500, 442, "stool")
      .setDepth(4);

    stool.setData("obstacleId", "stool");
    stool.setData(
      "message",
      "The stool chose violence."
    );

    this.physics.add.overlap(
      this.player,
      this.obstacles,
      this.hitObstacle,
      undefined,
      this
    );

    this.add
      .text(1260, 415, "SLIPPER", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#7c2d12",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(1990, 370, "LAUNDRY", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#7c2d12",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(2500, 370, "STOOL", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#7c2d12",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private hitObstacle(
    _playerObject: ArcadeCollisionObject,
    obstacleObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const obstacle =
      obstacleObject as Phaser.Physics.Arcade.Image;

    const obstacleId =
      obstacle.getData("obstacleId") as string;

    const message =
      obstacle.getData("message") as string;

    if (this.triggeredObstacles.has(obstacleId)) {
      return;
    }

    this.triggeredObstacles.add(obstacleId);

    obstacle.disableBody(false, false);
    obstacle.setAlpha(0.45);

    this.urgency = Math.min(
      this.urgencyMax,
      this.urgency + 5
    );

    this.updateUrgencyDisplay();

    this.player.setVelocityX(-300);
    this.player.setVelocityY(-170);

    this.cameras.main.shake(220, 0.008);
    this.cameras.main.flash(120, 255, 80, 80);

    const hitText = this.add
      .text(480, 155, message, {
        fontFamily: "Arial",
        fontSize: "27px",
        color: "#ffffff",
        backgroundColor: "#b91c1c",
        fontStyle: "bold",
        padding: {
          x: 18,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    const penaltyText = this.add
      .text(480, 210, "+5% TOILET URGENCY", {
        fontFamily: "Arial",
        fontSize: "21px",
        color: "#7f1d1d",
        backgroundColor: "#fecaca",
        fontStyle: "bold",
        padding: {
          x: 14,
          y: 8,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    this.tweens.add({
      targets: obstacle,
      angle: 20,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });

    this.time.delayedCall(1400, () => {
      hitText.destroy();
      penaltyText.destroy();
    });

    if (this.urgency >= this.urgencyMax) {
      this.showGameOver();
    }
  }

  private createExitDoor() {
    this.exitDoor = this.physics.add.staticImage(
      3030,
      416,
      "exit-door"
    );

    this.exitDoor.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.exitDoor,
      this.reachExitDoor,
      undefined,
      this
    );

    this.add
      .text(3030, 300, "FRONT DOOR", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#166534",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private reachExitDoor() {
    if (this.gameOver || this.levelComplete) {
      return;
    }

    if (!this.coffeeCollected) {
      if (this.exitWarningActive) {
        return;
      }

      this.exitWarningActive = true;

      const coffeeFirstText = this.add
        .text(
          480,
          165,
          "You forgot the coffee!",
          {
            fontFamily: "Arial",
            fontSize: "30px",
            color: "#ffffff",
            backgroundColor: "#dc2626",
            fontStyle: "bold",
            padding: {
              x: 18,
              y: 10,
            },
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30);

      const returnText = this.add
        .text(
          480,
          220,
          "Go back before leaving home.",
          {
            fontFamily: "Arial",
            fontSize: "19px",
            color: "#1f2937",
            backgroundColor: "#ffffff",
            padding: {
              x: 14,
              y: 8,
            },
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30);

      this.cameras.main.shake(180, 0.004);

      this.time.delayedCall(1500, () => {
        coffeeFirstText.destroy();
        returnText.destroy();
        this.exitWarningActive = false;
      });

      return;
    }

    this.completeLevel();
  }

  private completeLevel() {
    this.levelComplete = true;

    this.objectiveText.setText(
      "LEVEL 1 COMPLETE"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.cameras.main.flash(
      400,
      255,
      255,
      255
    );

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        155,
        "LEVEL 1 COMPLETE",
        {
          fontFamily: "Arial",
          fontSize: "50px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        235,
        "Jasmin escaped the apartment.",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        290,
        `Urgency continues: ${Math.floor(
          this.urgency
        )}%`,
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        345,
        "NEXT STOP: THE METRO",
        {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    const continueButton = this.add
      .rectangle(
        480,
        410,
        360,
        64,
        0x2563eb
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({
        useHandCursor: true,
      });

    const continueText = this.add
      .text(
        480,
        410,
        "CONTINUE TO METRO",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(52);

    this.add
      .text(
        480,
        465,
        "Click · Enter · Space     |     R replay Level 1",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    continueButton.on("pointerover", () => {
      continueButton.setFillStyle(0x1d4ed8);
      continueButton.setScale(1.03);
      continueText.setScale(1.03);
    });

    continueButton.on("pointerout", () => {
      continueButton.setFillStyle(0x2563eb);
      continueButton.setScale(1);
      continueText.setScale(1);
    });

    continueButton.on("pointerdown", () => {
      this.scene.start("MetroScene", {
        urgency: this.urgency,
      });
    });
  }

  private createControls() {
    this.cursors =
      this.input.keyboard!.createCursorKeys();

    this.wasd = {
      left: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.A
      ),
      right: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.D
      ),
      up: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.W
      ),
    };

    this.restartKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );

    this.enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
  }

  private createHud() {
    this.add
      .rectangle(480, 48, 960, 96, 0x0f172a, 0.9)
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(20, 16, "JASMINITY", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(
        20,
        61,
        "A / D or arrows · Space / W / Up to jump",
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#cbd5e1",
        }
      )
      .setScrollFactor(0)
      .setDepth(21);

    this.objectiveText = this.add
      .text(
        250,
        24,
        "OBJECTIVE: TURN OFF THE ALARM",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.createUrgencyBar();
  }

  private updatePlayerMovement() {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const movingLeft =
      this.cursors.left.isDown ||
      this.wasd.left.isDown;

    const movingRight =
      this.cursors.right.isDown ||
      this.wasd.right.isDown;

    if (movingLeft) {
      this.player.setVelocityX(
        -this.currentMoveSpeed
      );

      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(
        this.currentMoveSpeed
      );

      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const wantsToJump =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.wasd.up.isDown;

    if (wantsToJump && body.blocked.down) {
      this.player.setVelocityY(
        this.currentJumpVelocity
      );
    }
  }

  private updatePlayerAppearance(time: number) {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const isGrounded =
      body.blocked.down || body.touching.down;

    if (!isGrounded) {
      this.setPlayerTexture("jasmin-jump");
      return;
    }

    if (Math.abs(body.velocity.x) > 10) {
      if (time - this.lastWalkFrameSwitch > 140) {
        this.walkFrame =
          this.walkFrame === 0 ? 1 : 0;

        this.lastWalkFrameSwitch = time;
      }

      this.setPlayerTexture(
        this.walkFrame === 0
          ? "jasmin-walk-1"
          : "jasmin-walk-2"
      );

      return;
    }

    this.walkFrame = 0;
    this.setPlayerTexture("jasmin-idle");
  }

  private setPlayerTexture(textureKey: string) {
    if (this.currentPlayerTexture === textureKey) {
      return;
    }

    this.currentPlayerTexture = textureKey;
    this.player.setTexture(textureKey);
  }

  private updateUrgency(delta: number) {
    this.urgency +=
      this.urgencySpeed * (delta / 1000);

    if (this.urgency >= this.urgencyMax) {
      this.urgency = this.urgencyMax;

      this.updateUrgencyDisplay();
      this.showGameOver();

      return;
    }

    this.updateUrgencyDisplay();
  }

  private updateUrgencyDisplay() {
    const percentage =
      this.urgency / this.urgencyMax;

    this.urgencyBar.width = 300 * percentage;

    this.urgencyText.setText(
      `TOILET URGENCY: ${Math.floor(
        this.urgency
      )}%`
    );

    if (percentage < 0.5) {
      this.urgencyBar.setFillStyle(0x22c55e);
    } else if (percentage < 0.8) {
      this.urgencyBar.setFillStyle(0xf59e0b);
    } else {
      this.urgencyBar.setFillStyle(0xef4444);
    }
  }

  private collectCoffee(
    _playerObject: ArcadeCollisionObject,
    coffeeObject: ArcadeCollisionObject
  ) {
    if (
      this.coffeeCollected ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    if (!this.alarmDisabled) {
      const alarmFirstText = this.add
        .text(
          480,
          165,
          "The alarm is still ringing!",
          {
            fontFamily: "Arial",
            fontSize: "28px",
            color: "#ffffff",
            backgroundColor: "#dc2626",
            fontStyle: "bold",
            padding: {
              x: 18,
              y: 10,
            },
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30);

      const goBackText = this.add
        .text(
          480,
          220,
          "Go back and turn it off.",
          {
            fontFamily: "Arial",
            fontSize: "19px",
            color: "#1f2937",
            backgroundColor: "#ffffff",
            padding: {
              x: 14,
              y: 8,
            },
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30);

      this.cameras.main.shake(150, 0.004);

      this.time.delayedCall(1400, () => {
        alarmFirstText.destroy();
        goBackText.destroy();
      });

      return;
    }

    const coffee =
      coffeeObject as Phaser.Physics.Arcade.Image;

    coffee.disableBody(true, true);

    this.coffeeCollected = true;

    this.objectiveText.setText(
      "OBJECTIVE: REACH THE EXIT"
    );

    this.currentMoveSpeed =
      this.coffeeMoveSpeed;

    this.currentJumpVelocity =
      this.coffeeJumpVelocity;

    this.urgencySpeed = 11;

    this.player.setTint(0xff7a00);
    this.player.setScale(1.15);

    const monsterText = this.add
      .text(480, 155, "COFFEE MONSTER MODE!", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#7c2d12",
        backgroundColor: "#fde68a",
        fontStyle: "bold",
        padding: {
          x: 18,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    const warningText = this.add
      .text(
        480,
        205,
        "Faster Jasmin. Higher jumps. Faster urgency.",
        {
          fontFamily: "Arial",
          fontSize: "19px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          padding: {
            x: 12,
            y: 6,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.cameras.main.shake(250, 0.006);

    this.time.delayedCall(6000, () => {
      if (this.gameOver || this.levelComplete) {
        return;
      }

      this.currentMoveSpeed =
        this.normalMoveSpeed;

      this.currentJumpVelocity =
        this.normalJumpVelocity;

      this.urgencySpeed = 4;

      this.player.clearTint();
      this.player.setScale(1);

      monsterText.destroy();
      warningText.destroy();

      const finishedText = this.add
        .text(
          480,
          155,
          "Coffee mode finished.",
          {
            fontFamily: "Arial",
            fontSize: "22px",
            color: "#ffffff",
            backgroundColor: "#1f2937",
            padding: {
              x: 14,
              y: 8,
            },
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30);

      this.time.delayedCall(1500, () => {
        finishedText.destroy();
      });
    });
  }

  private createUrgencyBar() {
    this.add
      .rectangle(
        710,
        62,
        310,
        34,
        0x111827
      )
      .setStrokeStyle(3, 0xffffff)
      .setScrollFactor(0)
      .setDepth(20);

    this.urgencyBar = this.add
      .rectangle(
        560,
        62,
        0,
        24,
        0x22c55e
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.urgencyText = this.add
      .text(
        710,
        62,
        "TOILET URGENCY: 0%",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22);
  }

  private showGameOver() {
    if (this.gameOver || this.levelComplete) {
      return;
    }

    this.gameOver = true;

    this.objectiveText.setText(
      "OBJECTIVE FAILED"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x111827,
        0.82
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(480, 220, "TOO LATE!", {
        fontFamily: "Arial",
        fontSize: "58px",
        color: "#ff6b6b",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        290,
        "Jasminity ran out of patience.",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        350,
        "Press R to restart",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private createPlayerTextures() {
    this.createSinglePlayerTexture(
      "jasmin-idle",
      "idle"
    );

    this.createSinglePlayerTexture(
      "jasmin-walk-1",
      "walk1"
    );

    this.createSinglePlayerTexture(
      "jasmin-walk-2",
      "walk2"
    );

    this.createSinglePlayerTexture(
      "jasmin-jump",
      "jump"
    );
  }

  private createSinglePlayerTexture(
    textureKey: string,
    pose: JasminPose
  ) {
    if (this.textures.exists(textureKey)) {
      this.textures.remove(textureKey);
    }

    const graphics = this.add.graphics();

    const skinColor = 0xf4bd94;
    const hairColor = 0x111111;
    const hairHighlight = 0x292524;
    const dressColor = 0x7c3aed;
    const dressDarkColor = 0x5b21b6;
    const tightsColor = 0x312e81;
    const shoeColor = 0x1f2937;
    const bowColor = 0xc084fc;

    const armLeft =
      pose === "walk1"
        ? { x: 10, y: 42, w: 6, h: 18 }
        : pose === "walk2"
          ? { x: 7, y: 34, w: 6, h: 17 }
          : pose === "jump"
            ? { x: 5, y: 27, w: 6, h: 18 }
            : { x: 9, y: 38, w: 6, h: 18 };

    const armRight =
      pose === "walk1"
        ? { x: 39, y: 34, w: 6, h: 17 }
        : pose === "walk2"
          ? { x: 42, y: 42, w: 6, h: 18 }
          : pose === "jump"
            ? { x: 44, y: 27, w: 6, h: 18 }
            : { x: 40, y: 38, w: 6, h: 18 };

    const legLeft =
      pose === "walk1"
        ? { x: 20, y: 61, w: 7, h: 15 }
        : pose === "walk2"
          ? { x: 16, y: 57, w: 7, h: 19 }
          : pose === "jump"
            ? { x: 18, y: 59, w: 7, h: 12 }
            : { x: 19, y: 60, w: 7, h: 16 };

    const legRight =
      pose === "walk1"
        ? { x: 31, y: 57, w: 7, h: 19 }
        : pose === "walk2"
          ? { x: 35, y: 61, w: 7, h: 15 }
          : pose === "jump"
            ? { x: 32, y: 59, w: 7, h: 12 }
            : { x: 31, y: 60, w: 7, h: 16 };

    const braidOffset =
      pose === "walk1"
        ? 2
        : pose === "walk2"
          ? -2
          : 0;

    const leftBraidX = 10 + braidOffset;
    const rightBraidX = 46 - braidOffset;

    graphics.fillStyle(hairColor);

    graphics.fillCircle(leftBraidX, 28, 6);
    graphics.fillCircle(leftBraidX - 1, 38, 6);
    graphics.fillCircle(leftBraidX, 48, 5);
    graphics.fillCircle(leftBraidX - 1, 57, 5);

    graphics.fillCircle(rightBraidX, 28, 6);
    graphics.fillCircle(rightBraidX + 1, 38, 6);
    graphics.fillCircle(rightBraidX, 48, 5);
    graphics.fillCircle(rightBraidX + 1, 57, 5);

    graphics.fillStyle(bowColor);

    graphics.fillTriangle(
      leftBraidX - 1,
      57,
      leftBraidX - 8,
      53,
      leftBraidX - 7,
      62
    );

    graphics.fillTriangle(
      leftBraidX + 1,
      57,
      leftBraidX + 8,
      53,
      leftBraidX + 7,
      62
    );

    graphics.fillCircle(leftBraidX, 57, 3);

    graphics.fillTriangle(
      rightBraidX - 1,
      57,
      rightBraidX - 8,
      53,
      rightBraidX - 7,
      62
    );

    graphics.fillTriangle(
      rightBraidX + 1,
      57,
      rightBraidX + 8,
      53,
      rightBraidX + 7,
      62
    );

    graphics.fillCircle(rightBraidX, 57, 3);

    graphics.fillStyle(skinColor);

    graphics.fillRoundedRect(
      armLeft.x,
      armLeft.y,
      armLeft.w,
      armLeft.h,
      3
    );

    graphics.fillRoundedRect(
      armRight.x,
      armRight.y,
      armRight.w,
      armRight.h,
      3
    );

    graphics.fillStyle(dressColor);
    graphics.fillRoundedRect(17, 38, 22, 18, 6);

    graphics.fillStyle(dressDarkColor);
    graphics.fillTriangle(14, 53, 42, 53, 28, 67);

    graphics.fillStyle(bowColor);
    graphics.fillCircle(28, 46, 3);

    graphics.fillTriangle(
      26,
      46,
      20,
      42,
      21,
      49
    );

    graphics.fillTriangle(
      30,
      46,
      36,
      42,
      35,
      49
    );

    graphics.fillStyle(tightsColor);

    graphics.fillRoundedRect(
      legLeft.x,
      legLeft.y,
      legLeft.w,
      legLeft.h,
      3
    );

    graphics.fillRoundedRect(
      legRight.x,
      legRight.y,
      legRight.w,
      legRight.h,
      3
    );

    graphics.fillStyle(shoeColor);

    graphics.fillRoundedRect(
      legLeft.x - 2,
      pose === "jump" ? 69 : 74,
      11,
      5,
      2
    );

    graphics.fillRoundedRect(
      legRight.x - 2,
      pose === "jump" ? 69 : 74,
      11,
      5,
      2
    );

    graphics.fillStyle(skinColor);
    graphics.fillCircle(28, 24, 14);

    graphics.fillStyle(hairColor);
    graphics.fillRoundedRect(13, 8, 30, 13, 8);
    graphics.fillCircle(17, 19, 7);
    graphics.fillCircle(39, 19, 7);

    graphics.fillStyle(hairHighlight);
    graphics.fillRoundedRect(17, 10, 7, 4, 2);
    graphics.fillRoundedRect(26, 9, 6, 4, 2);

    graphics.fillStyle(0xffffff);
    graphics.fillEllipse(22, 24, 9, 8);
    graphics.fillEllipse(34, 24, 9, 8);

    graphics.fillStyle(0x3f2d20);
    graphics.fillCircle(22, 24, 3);
    graphics.fillCircle(34, 24, 3);

    graphics.fillStyle(0x111111);
    graphics.fillCircle(22, 24, 1.5);
    graphics.fillCircle(34, 24, 1.5);

    graphics.fillStyle(0xffffff);
    graphics.fillCircle(21, 23, 1);
    graphics.fillCircle(33, 23, 1);

    graphics.lineStyle(1.5, 0x111111);

    graphics.beginPath();
    graphics.moveTo(18, 20);
    graphics.lineTo(16, 18);
    graphics.moveTo(20, 20);
    graphics.lineTo(19, 17);
    graphics.strokePath();

    graphics.beginPath();
    graphics.moveTo(38, 20);
    graphics.lineTo(40, 18);
    graphics.moveTo(36, 20);
    graphics.lineTo(37, 17);
    graphics.strokePath();

    graphics.lineStyle(2, 0x3f2d20);

    graphics.beginPath();
    graphics.moveTo(18, 17);
    graphics.lineTo(24, 16);
    graphics.strokePath();

    graphics.beginPath();
    graphics.moveTo(32, 16);
    graphics.lineTo(38, 17);
    graphics.strokePath();

    graphics.fillStyle(0xf472b6, 0.65);
    graphics.fillEllipse(17, 30, 6, 3);
    graphics.fillEllipse(39, 30, 6, 3);

    if (pose === "jump") {
      graphics.fillStyle(0xb91c1c);
      graphics.fillEllipse(28, 33, 6, 7);

      graphics.fillStyle(0xffffff);
      graphics.fillRect(25, 30, 6, 2);
    } else if (
      pose === "walk1" ||
      pose === "walk2"
    ) {
      graphics.lineStyle(2.5, 0x9f1239);

      graphics.beginPath();
      graphics.arc(
        28,
        30,
        6,
        0.2,
        2.9,
        false
      );
      graphics.strokePath();

      graphics.fillStyle(0xef4444);
      graphics.fillEllipse(28, 34, 7, 3);
    } else {
      graphics.lineStyle(2.5, 0x9f1239);

      graphics.beginPath();
      graphics.arc(
        28,
        30,
        5,
        0.2,
        2.9,
        false
      );
      graphics.strokePath();
    }

    graphics.generateTexture(
      textureKey,
      56,
      80
    );

    graphics.destroy();
  }

  private createPlatformTexture() {
    if (this.textures.exists("platform")) {
      this.textures.remove("platform");
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0x4f772d);
    graphics.fillRoundedRect(0, 0, 40, 30, 6);

    graphics.generateTexture(
      "platform",
      40,
      30
    );

    graphics.destroy();
  }

  private createAlarmClockTexture() {
    if (this.textures.exists("alarm-clock")) {
      this.textures.remove("alarm-clock");
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0xef4444);
    graphics.fillCircle(25, 25, 20);

    graphics.lineStyle(4, 0x7f1d1d);
    graphics.strokeCircle(25, 25, 20);

    graphics.fillStyle(0xffffff);
    graphics.fillCircle(25, 25, 14);

    graphics.lineStyle(3, 0x111827);

    graphics.beginPath();
    graphics.moveTo(25, 25);
    graphics.lineTo(25, 15);
    graphics.strokePath();

    graphics.beginPath();
    graphics.moveTo(25, 25);
    graphics.lineTo(34, 25);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillCircle(25, 25, 3);

    graphics.lineStyle(4, 0x7f1d1d);

    graphics.beginPath();
    graphics.moveTo(10, 8);
    graphics.lineTo(3, 1);
    graphics.strokePath();

    graphics.beginPath();
    graphics.moveTo(40, 8);
    graphics.lineTo(47, 1);
    graphics.strokePath();

    graphics.lineStyle(4, 0x111827);

    graphics.beginPath();
    graphics.moveTo(14, 43);
    graphics.lineTo(10, 49);
    graphics.strokePath();

    graphics.beginPath();
    graphics.moveTo(36, 43);
    graphics.lineTo(40, 49);
    graphics.strokePath();

    graphics.generateTexture(
      "alarm-clock",
      50,
      52
    );

    graphics.destroy();
  }

  private createCoffeeTexture() {
    if (this.textures.exists("coffee")) {
      this.textures.remove("coffee");
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0xffffff);
    graphics.fillRoundedRect(3, 8, 30, 27, 5);

    graphics.lineStyle(5, 0xffffff);
    graphics.strokeCircle(34, 21, 8);

    graphics.fillStyle(0x6f4e37);
    graphics.fillEllipse(18, 10, 25, 7);

    graphics.lineStyle(3, 0xf8fafc, 0.8);

    graphics.beginPath();

    graphics.moveTo(12, 3);
    graphics.lineTo(10, -5);

    graphics.moveTo(22, 3);
    graphics.lineTo(24, -5);

    graphics.strokePath();

    graphics.generateTexture(
      "coffee",
      45,
      42
    );

    graphics.destroy();
  }

  private createExitDoorTexture() {
    if (this.textures.exists("exit-door")) {
      this.textures.remove("exit-door");
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0x78350f);
    graphics.fillRoundedRect(4, 2, 72, 116, 6);

    graphics.fillStyle(0xb45309);
    graphics.fillRoundedRect(11, 9, 58, 102, 4);

    graphics.lineStyle(4, 0x5b2c0a);
    graphics.strokeRoundedRect(11, 9, 58, 102, 4);

    graphics.fillStyle(0xfacc15);
    graphics.fillCircle(58, 62, 5);

    graphics.fillStyle(0xfef3c7);
    graphics.fillRoundedRect(22, 19, 36, 24, 4);

    graphics.fillStyle(0x166534);
    graphics.fillTriangle(31, 26, 31, 36, 43, 31);
    graphics.fillRect(42, 29, 9, 5);

    graphics.generateTexture(
      "exit-door",
      80,
      120
    );

    graphics.destroy();
  }

  private createSlipperTexture() {
    if (this.textures.exists("slipper")) {
      this.textures.remove("slipper");
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0xf472b6);
    graphics.fillRoundedRect(2, 12, 62, 22, 11);

    graphics.fillStyle(0xbe185d);
    graphics.fillRoundedRect(28, 6, 27, 20, 9);

    graphics.lineStyle(3, 0x831843);
    graphics.strokeRoundedRect(2, 12, 62, 22, 11);

    graphics.generateTexture(
      "slipper",
      68,
      40
    );

    graphics.destroy();
  }

  private createLaundryBasketTexture() {
    if (this.textures.exists("laundry-basket")) {
      this.textures.remove("laundry-basket");
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0xf8fafc);
    graphics.fillRoundedRect(4, 8, 62, 58, 8);

    graphics.lineStyle(4, 0x64748b);
    graphics.strokeRoundedRect(4, 8, 62, 58, 8);

    graphics.fillStyle(0x60a5fa);
    graphics.fillCircle(20, 12, 12);

    graphics.fillStyle(0xf472b6);
    graphics.fillCircle(38, 10, 13);

    graphics.fillStyle(0xfacc15);
    graphics.fillCircle(54, 13, 11);

    graphics.fillStyle(0x94a3b8);

    for (let y = 29; y <= 53; y += 12) {
      for (let x = 18; x <= 54; x += 18) {
        graphics.fillCircle(x, y, 4);
      }
    }

    graphics.generateTexture(
      "laundry-basket",
      70,
      70
    );

    graphics.destroy();
  }

  private createStoolTexture() {
    if (this.textures.exists("stool")) {
      this.textures.remove("stool");
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0x92400e);
    graphics.fillRoundedRect(3, 3, 66, 20, 6);

    graphics.fillStyle(0x78350f);
    graphics.fillRect(10, 20, 10, 48);
    graphics.fillRect(52, 20, 10, 48);

    graphics.fillStyle(0xb45309);
    graphics.fillRect(18, 43, 36, 8);

    graphics.generateTexture(
      "stool",
      72,
      72
    );

    graphics.destroy();
  }
}


type MetroSceneData = {
  urgency?: number;
};

class MetroScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private passengers!: Phaser.Physics.Arcade.StaticGroup;
  private turnstiles!: Phaser.Physics.Arcade.StaticGroup;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  private restartKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private urgency = 0;
  private urgencyMax = 100;
  private urgencySpeed = 4.5;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private levelComplete = false;

  private trainArrived = false;
  private trainDeparted = false;

  private train!: Phaser.GameObjects.Container;
  private trainDoorZone!: Phaser.Physics.Arcade.Image;
  private trainStatusText!: Phaser.GameObjects.Text;

  private triggeredPassengers = new Set<string>();
  private triggeredTurnstiles = new Set<string>();

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private readonly gameHeight = 540;
  private readonly worldWidth = 3600;
  private readonly moveSpeed = 230;
  private readonly jumpVelocity = -440;

  constructor() {
    super("MetroScene");
  }

  init(_data: MetroSceneData) {
    this.urgency = 0;
  }

  create() {
    this.physics.world.resume();

    this.cameras.main.setBackgroundColor("#dbeafe");

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.cameras.main.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.gameStarted = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.trainArrived = false;
    this.trainDeparted = false;

    this.triggeredPassengers.clear();
    this.triggeredTurnstiles.clear();

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createMetroTextures();
    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.createPassengers();
    this.createTurnstiles();
    this.createTrain();
    this.createControls();
    this.createHud();
    this.createStartScreen();

    this.cameras.main.startFollow(
      this.player,
      true,
      0.08,
      0.08
    );

    this.cameras.main.setDeadzone(260, 180);

    this.time.delayedCall(6500, () => {
      this.arriveTrain();
    });
  }

  update(time: number, delta: number) {
    if (!this.gameStarted) {
      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.startMetro();
      }

      return;
    }

    if (this.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart({
          urgency: this.urgency,
        });
      }

      return;
    }

    if (this.levelComplete) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart({
          urgency: this.urgency,
        });
      }

      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.scene.start("SchoolScene");
      }

      return;
    }

    this.updatePlayerMovement();
    this.updatePlayerAppearance(time);
    this.updateUrgency(delta);
  }

  private createStartScreen() {
    const overlay = this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(100);

    const levelText = this.add
      .text(480, 95, "LEVEL 2", {
        fontFamily: "Arial",
        fontSize: "21px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const title = this.add
      .text(480, 155, "MITTERSENDLING", {
        fontFamily: "Arial",
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objective = this.add
      .text(
        480,
        220,
        "OBJECTIVE: CATCH THE TRAIN",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const urgencyText = this.add
      .text(
        480,
        270,
        `Starting urgency: ${Math.floor(
          this.urgency
        )}%`,
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const instruction = this.add
      .text(
        480,
        310,
        "Get past passengers, turnstiles and stairs.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const button = this.add
      .rectangle(
        480,
        400,
        300,
        68,
        0xdc2626
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({
        useHandCursor: true,
      });

    const buttonText = this.add
      .text(480, 400, "ENTER STATION", {
        fontFamily: "Arial",
        fontSize: "27px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    const keyboardText = this.add
      .text(
        480,
        465,
        "Click · Enter · Space",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objects = [
      overlay,
      levelText,
      title,
      objective,
      urgencyText,
      instruction,
      button,
      buttonText,
      keyboardText,
    ];

    button.on("pointerover", () => {
      button.setFillStyle(0xb91c1c);
      button.setScale(1.03);
      buttonText.setScale(1.03);
    });

    button.on("pointerout", () => {
      button.setFillStyle(0xdc2626);
      button.setScale(1);
      buttonText.setScale(1);
    });

    button.on("pointerdown", () => {
      this.startMetro();
    });

    this.events.once("start-metro", () => {
      objects.forEach((object) => {
        if (object.active) {
          object.destroy();
        }
      });
    });
  }

  private startMetro() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-metro");

    this.cameras.main.flash(
      250,
      255,
      255,
      255
    );

    const title = this.add
      .text(480, 155, "MOVE, JASMIN, MOVE!", {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#ffffff",
        backgroundColor: "#dc2626",
        fontStyle: "bold",
        padding: {
          x: 18,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    const subtitle = this.add
      .text(
        480,
        210,
        "The train is coming soon.",
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          padding: {
            x: 14,
            y: 8,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.time.delayedCall(1800, () => {
      title.destroy();
      subtitle.destroy();
    });
  }

  private createBackground() {
    this.add
      .rectangle(
        this.worldWidth / 2,
        250,
        this.worldWidth,
        500,
        0xdbeafe
      )
      .setDepth(-10);

    this.add
      .rectangle(
        this.worldWidth / 2,
        260,
        this.worldWidth,
        300,
        0xe2e8f0
      )
      .setDepth(-9);

    for (let x = 0; x < this.worldWidth; x += 180) {
      this.add
        .rectangle(
          x + 90,
          260,
          4,
          295,
          0x94a3b8,
          0.5
        )
        .setDepth(-8);
    }

    this.add
      .rectangle(
        this.worldWidth / 2,
        455,
        this.worldWidth,
        110,
        0x64748b
      )
      .setDepth(-7);

    this.add
      .rectangle(
        this.worldWidth / 2,
        505,
        this.worldWidth,
        18,
        0xfacc15
      )
      .setDepth(-6);

    this.add
      .text(190, 150, "MITTERSENDLING", {
        fontFamily: "Arial",
        fontSize: "38px",
        color: "#1e3a8a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(190, 200, "S-BAHN", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#16a34a",
        fontStyle: "bold",
        padding: {
          x: 12,
          y: 6,
        },
      })
      .setOrigin(0.5);

    this.add
      .rectangle(805, 340, 190, 160, 0xf8fafc)
      .setStrokeStyle(8, 0x64748b)
      .setDepth(-3);

    this.add
      .text(805, 235, "TICKET HALL", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(1580, 350, 300, 220, 0xcbd5e1)
      .setStrokeStyle(8, 0x64748b)
      .setDepth(-3);

    this.add
      .text(1580, 205, "STAIRS TO PLATFORM 1", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(2550, 325, 300, 250, 0xf8fafc)
      .setStrokeStyle(8, 0x64748b)
      .setDepth(-3);

    this.add
      .text(2550, 170, "PLATFORM 1", {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#1e3a8a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(3310, 170, "TRAIN TO SCHOOL", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#b91c1c",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private createLevel() {
    this.platforms = this.physics.add.staticGroup();

    this.platforms
      .create(
        this.worldWidth / 2,
        515,
        "platform"
      )
      .setScale(
        this.worldWidth / 40,
        1
      )
      .refreshBody();

    this.createPlatform(520, 420, 3);
    this.createPlatform(760, 360, 3);
    this.createPlatform(1040, 410, 3);

    this.createPlatform(1290, 370, 3);
    this.createPlatform(1510, 325, 3);
    this.createPlatform(1730, 280, 3);

    this.createPlatform(1980, 340, 3);
    this.createPlatform(2230, 390, 4);
    this.createPlatform(2500, 340, 3);

    this.createPlatform(2770, 390, 3);
    this.createPlatform(3020, 340, 3);

    this.add
      .text(110, 470, "STATION ENTRANCE", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#166534",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(
        1470,
        455,
        "Up the stairs. No elevator today.",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2860,
        455,
        "The train will not wait forever.",
        {
          fontFamily: "Arial",
          fontSize: "19px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private createPlatform(
    x: number,
    y: number,
    scaleX: number
  ) {
    this.platforms
      .create(x, y, "platform")
      .setScale(scaleX, 1)
      .refreshBody();
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(
      100,
      426,
      "jasmin-idle"
    );

    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);
    this.player.setDepth(5);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createPassengers() {
    this.passengers =
      this.physics.add.staticGroup();

    const passengerData = [
      {
        x: 1180,
        key: "metro-passenger-blue",
        id: "passenger-1",
        message:
          "Excuse me! Important walking happening.",
      },
      {
        x: 1440,
        key: "metro-passenger-red",
        id: "passenger-2",
        message:
          "A backpack entered the boss fight.",
      },
      {
        x: 2070,
        key: "metro-passenger-blue",
        id: "passenger-3",
        message:
          "Platform traffic jam!",
      },
      {
        x: 2350,
        key: "metro-passenger-red",
        id: "passenger-4",
        message:
          "Someone stopped exactly in the middle.",
      },
      {
        x: 2790,
        key: "metro-passenger-blue",
        id: "passenger-5",
        message:
          "Why is everyone walking slowly today?!",
      },
    ];

    passengerData.forEach((item) => {
      const passenger = this.passengers
        .create(
          item.x,
          446,
          item.key
        )
        .setDepth(4);

      passenger.setData(
        "passengerId",
        item.id
      );

      passenger.setData(
        "message",
        item.message
      );
    });

    this.physics.add.overlap(
      this.player,
      this.passengers,
      this.hitPassenger,
      undefined,
      this
    );
  }

  private hitPassenger(
    _playerObject: ArcadeCollisionObject,
    passengerObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const passenger =
      passengerObject as Phaser.Physics.Arcade.Image;

    const passengerId =
      passenger.getData("passengerId") as string;

    const message =
      passenger.getData("message") as string;

    if (
      this.triggeredPassengers.has(passengerId)
    ) {
      return;
    }

    this.triggeredPassengers.add(passengerId);

    passenger.disableBody(false, false);
    passenger.setAlpha(0.45);

    this.addUrgency(4);

    this.player.setVelocityX(-290);
    this.player.setVelocityY(-170);

    this.cameras.main.shake(
      200,
      0.008
    );

    this.cameras.main.flash(
      100,
      255,
      140,
      80
    );

    this.showMetroMessage(
      message,
      "+4% TOILET URGENCY",
      0xb45309
    );
  }

  private createTurnstiles() {
    this.turnstiles =
      this.physics.add.staticGroup();

    [720, 930].forEach((x, index) => {
      const turnstile = this.turnstiles
        .create(
          x,
          435,
          "metro-turnstile"
        )
        .setDepth(4);

      turnstile.setData(
        "turnstileId",
        `turnstile-${index}`
      );
    });

    this.physics.add.overlap(
      this.player,
      this.turnstiles,
      this.hitTurnstile,
      undefined,
      this
    );

    this.add
      .text(825, 360, "TICKET GATES", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private hitTurnstile(
    _playerObject: ArcadeCollisionObject,
    turnstileObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const turnstile =
      turnstileObject as Phaser.Physics.Arcade.Image;

    const turnstileId =
      turnstile.getData("turnstileId") as string;

    if (
      this.triggeredTurnstiles.has(turnstileId)
    ) {
      return;
    }

    this.triggeredTurnstiles.add(turnstileId);

    turnstile.disableBody(false, false);
    turnstile.setAlpha(0.5);

    this.addUrgency(3);

    this.player.setVelocityX(-260);
    this.player.setVelocityY(-150);

    this.cameras.main.shake(
      170,
      0.006
    );

    this.showMetroMessage(
      "The gate says: NEIN.",
      "+3% urgency. Jump with confidence.",
      0x475569
    );
  }

  private createTrain() {
    const trainBody = this.add
      .rectangle(
        0,
        0,
        620,
        230,
        0xdc2626
      )
      .setStrokeStyle(8, 0x7f1d1d);

    const roof = this.add
      .rectangle(
        0,
        -112,
        640,
        20,
        0x991b1b
      );

    const windows = [
      -215,
      -100,
      100,
      215,
    ].map((x) => {
      return this.add
        .rectangle(
          x,
          -45,
          100,
          70,
          0xbfe8ff
        )
        .setStrokeStyle(5, 0xffffff);
    });

    const leftDoor = this.add
      .rectangle(
        -20,
        35,
        85,
        130,
        0xfca5a5
      )
      .setStrokeStyle(5, 0xffffff);

    const rightDoor = this.add
      .rectangle(
        70,
        35,
        85,
        130,
        0xfca5a5
      )
      .setStrokeStyle(5, 0xffffff);

    const lineText = this.add
      .text(-235, 55, "S7", {
        fontFamily: "Arial",
        fontSize: "35px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.train = this.add.container(
      3900,
      365,
      [
        trainBody,
        roof,
        ...windows,
        leftDoor,
        rightDoor,
        lineText,
      ]
    );

    this.train.setDepth(3);

    this.trainDoorZone =
      this.physics.add.staticImage(
        3300,
        405,
        "metro-train-zone"
      );

    this.trainDoorZone
      .setVisible(false)
      .disableBody(true, true);

    this.physics.add.overlap(
      this.player,
      this.trainDoorZone,
      this.enterTrain,
      undefined,
      this
    );

    this.trainStatusText = this.add
      .text(
        3300,
        250,
        "TRAIN APPROACHING...",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private arriveTrain() {
    if (
      this.gameOver ||
      this.levelComplete ||
      this.trainArrived
    ) {
      return;
    }

    this.trainArrived = true;

    this.tweens.add({
      targets: this.train,
      x: 3300,
      duration: 1800,
      ease: "Cubic.Out",

      onStart: () => {
        this.cameras.main.shake(
          500,
          0.003
        );
      },

      onComplete: () => {
        this.trainDoorZone.enableBody(
          false,
          3300,
          405,
          true,
          true
        );

        this.trainStatusText.setText(
          "TRAIN HERE — GET IN!"
        );

        this.showMetroMessage(
          "THE TRAIN HAS ARRIVED!",
          "Reach the open doors before it leaves.",
          0xdc2626
        );

        this.time.delayedCall(9000, () => {
          this.departTrain();
        });
      },
    });
  }

  private departTrain() {
    if (
      this.gameOver ||
      this.levelComplete ||
      this.trainDeparted ||
      !this.trainArrived
    ) {
      return;
    }

    this.trainDeparted = true;

    this.trainDoorZone.disableBody(
      true,
      true
    );

    this.trainStatusText.setText(
      "OH NO. THE TRAIN IS LEAVING!"
    );

    this.tweens.add({
      targets: this.train,
      x: 4050,
      duration: 1600,
      ease: "Cubic.In",

      onComplete: () => {
        if (
          this.levelComplete ||
          this.gameOver
        ) {
          return;
        }

        this.addUrgency(12);

        this.showMetroMessage(
          "MISSED THE TRAIN!",
          "+12% urgency. Press R to retry.",
          0x991b1b
        );

        this.time.delayedCall(900, () => {
          if (
            !this.levelComplete &&
            !this.gameOver
          ) {
            this.showGameOver();
          }
        });
      },
    });
  }

  private enterTrain(
    _playerObject: ArcadeCollisionObject,
    _trainObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete ||
      !this.trainArrived ||
      this.trainDeparted
    ) {
      return;
    }

    this.levelComplete = true;

    this.player.setVelocity(0, 0);
    this.player.setVisible(false);

    this.physics.pause();

    this.objectiveText.setText(
      "LEVEL 2 COMPLETE"
    );

    this.cameras.main.flash(
      400,
      255,
      255,
      255
    );

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.91
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        145,
        "LEVEL 2 COMPLETE",
        {
          fontFamily: "Arial",
          fontSize: "49px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        225,
        "Jasmin caught the train.",
        {
          fontFamily: "Arial",
          fontSize: "26px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        280,
        `Urgency continues: ${Math.floor(
          this.urgency
        )}%`,
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        340,
        "NEXT STOP: SCHOOL",
        {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    const schoolButton = this.add
      .rectangle(
        480,
        405,
        350,
        62,
        0x7c3aed
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({
        useHandCursor: true,
      });

    const schoolButtonText = this.add
      .text(
        480,
        405,
        "CONTINUE TO SCHOOL",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(52);

    this.add
      .text(
        480,
        465,
        "Click · Enter · Space     |     R replay metro",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    schoolButton.on("pointerover", () => {
      schoolButton.setFillStyle(0x6d28d9);
      schoolButton.setScale(1.03);
      schoolButtonText.setScale(1.03);
    });

    schoolButton.on("pointerout", () => {
      schoolButton.setFillStyle(0x7c3aed);
      schoolButton.setScale(1);
      schoolButtonText.setScale(1);
    });

    schoolButton.on("pointerdown", () => {
      this.scene.start("SchoolScene");
    });
  }

  private createControls() {
    this.cursors =
      this.input.keyboard!.createCursorKeys();

    this.wasd = {
      left: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.A
      ),
      right: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.D
      ),
      up: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.W
      ),
    };

    this.restartKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.R
      );

    this.enterKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.ENTER
      );
  }

  private createHud() {
    this.add
      .rectangle(
        480,
        48,
        960,
        96,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(20, 16, "JASMINITY", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(
        20,
        61,
        "A / D or arrows · Space / W / Up to jump",
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#cbd5e1",
        }
      )
      .setScrollFactor(0)
      .setDepth(21);

    this.objectiveText = this.add
      .text(
        250,
        24,
        "OBJECTIVE: CATCH THE TRAIN",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.add
      .rectangle(
        710,
        62,
        310,
        34,
        0x111827
      )
      .setStrokeStyle(3, 0xffffff)
      .setScrollFactor(0)
      .setDepth(20);

    this.urgencyBar = this.add
      .rectangle(
        560,
        62,
        0,
        24,
        0x22c55e
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.urgencyText = this.add
      .text(
        710,
        62,
        "TOILET URGENCY: 0%",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.updateUrgencyDisplay();
  }

  private updatePlayerMovement() {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const movingLeft =
      this.cursors.left.isDown ||
      this.wasd.left.isDown;

    const movingRight =
      this.cursors.right.isDown ||
      this.wasd.right.isDown;

    if (movingLeft) {
      this.player.setVelocityX(
        -this.moveSpeed
      );

      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(
        this.moveSpeed
      );

      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const wantsToJump =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.wasd.up.isDown;

    if (
      wantsToJump &&
      body.blocked.down
    ) {
      this.player.setVelocityY(
        this.jumpVelocity
      );
    }
  }

  private updatePlayerAppearance(time: number) {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const isGrounded =
      body.blocked.down ||
      body.touching.down;

    if (!isGrounded) {
      this.setPlayerTexture(
        "jasmin-jump"
      );

      return;
    }

    if (Math.abs(body.velocity.x) > 10) {
      if (
        time -
          this.lastWalkFrameSwitch >
        140
      ) {
        this.walkFrame =
          this.walkFrame === 0
            ? 1
            : 0;

        this.lastWalkFrameSwitch =
          time;
      }

      this.setPlayerTexture(
        this.walkFrame === 0
          ? "jasmin-walk-1"
          : "jasmin-walk-2"
      );

      return;
    }

    this.walkFrame = 0;

    this.setPlayerTexture(
      "jasmin-idle"
    );
  }

  private setPlayerTexture(
    textureKey: string
  ) {
    if (
      this.currentPlayerTexture ===
      textureKey
    ) {
      return;
    }

    this.currentPlayerTexture =
      textureKey;

    this.player.setTexture(
      textureKey
    );
  }

  private updateUrgency(delta: number) {
    this.urgency +=
      this.urgencySpeed *
      (delta / 1000);

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.urgency =
        this.urgencyMax;

      this.updateUrgencyDisplay();
      this.showGameOver();

      return;
    }

    this.updateUrgencyDisplay();
  }

  private addUrgency(amount: number) {
    this.urgency = Math.min(
      this.urgencyMax,
      this.urgency + amount
    );

    this.updateUrgencyDisplay();

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.showGameOver();
    }
  }

  private updateUrgencyDisplay() {
    const percentage =
      this.urgency /
      this.urgencyMax;

    this.urgencyBar.width =
      300 * percentage;

    this.urgencyText.setText(
      `TOILET URGENCY: ${Math.floor(
        this.urgency
      )}%`
    );

    if (percentage < 0.5) {
      this.urgencyBar.setFillStyle(
        0x22c55e
      );
    } else if (percentage < 0.8) {
      this.urgencyBar.setFillStyle(
        0xf59e0b
      );
    } else {
      this.urgencyBar.setFillStyle(
        0xef4444
      );
    }
  }

  private showMetroMessage(
    title: string,
    subtitle: string,
    backgroundColor: number
  ) {
    const titleText = this.add
      .text(480, 155, title, {
        fontFamily: "Arial",
        fontSize: "27px",
        color: "#ffffff",
        backgroundColor:
          `#${backgroundColor
            .toString(16)
            .padStart(6, "0")}`,
        fontStyle: "bold",
        padding: {
          x: 18,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    const subtitleText = this.add
      .text(480, 210, subtitle, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#1f2937",
        backgroundColor: "#ffffff",
        fontStyle: "bold",
        padding: {
          x: 14,
          y: 8,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    this.time.delayedCall(1500, () => {
      titleText.destroy();
      subtitleText.destroy();
    });
  }

  private showGameOver() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    this.gameOver = true;

    this.objectiveText.setText(
      "OBJECTIVE FAILED"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x111827,
        0.84
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        210,
        "TOO LATE!",
        {
          fontFamily: "Arial",
          fontSize: "58px",
          color: "#ff6b6b",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        285,
        "Jasmin missed the train.",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        350,
        "Press R to restart the metro",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private createMetroTextures() {
    this.createPassengerTexture(
      "metro-passenger-blue",
      0x2563eb,
      0xe5b48c
    );

    this.createPassengerTexture(
      "metro-passenger-red",
      0xdc2626,
      0x9a6546
    );

    if (
      this.textures.exists(
        "metro-turnstile"
      )
    ) {
      this.textures.remove(
        "metro-turnstile"
      );
    }

    const turnstileGraphics =
      this.add.graphics();

    turnstileGraphics.fillStyle(
      0x64748b
    );

    turnstileGraphics.fillRoundedRect(
      8,
      10,
      28,
      72,
      5
    );

    turnstileGraphics.fillRoundedRect(
      48,
      10,
      28,
      72,
      5
    );

    turnstileGraphics.fillStyle(
      0x22c55e
    );

    turnstileGraphics.fillRect(
      14,
      18,
      16,
      12
    );

    turnstileGraphics.lineStyle(
      5,
      0x334155
    );

    turnstileGraphics.beginPath();
    turnstileGraphics.moveTo(42, 42);
    turnstileGraphics.lineTo(42, 78);
    turnstileGraphics.moveTo(42, 50);
    turnstileGraphics.lineTo(18, 62);
    turnstileGraphics.moveTo(42, 50);
    turnstileGraphics.lineTo(66, 62);
    turnstileGraphics.strokePath();

    turnstileGraphics.generateTexture(
      "metro-turnstile",
      84,
      86
    );

    turnstileGraphics.destroy();

    if (
      this.textures.exists(
        "metro-train-zone"
      )
    ) {
      this.textures.remove(
        "metro-train-zone"
      );
    }

    const trainZoneGraphics =
      this.add.graphics();

    trainZoneGraphics.fillStyle(
      0xffffff,
      0.01
    );

    trainZoneGraphics.fillRect(
      0,
      0,
      90,
      150
    );

    trainZoneGraphics.generateTexture(
      "metro-train-zone",
      90,
      150
    );

    trainZoneGraphics.destroy();
  }

  private createPassengerTexture(
    textureKey: string,
    jacketColor: number,
    skinColor: number
  ) {
    if (
      this.textures.exists(textureKey)
    ) {
      this.textures.remove(textureKey);
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(skinColor);
    graphics.fillCircle(24, 14, 11);

    graphics.fillStyle(0x1f2937);
    graphics.fillRoundedRect(
      14,
      3,
      20,
      8,
      5
    );

    graphics.fillStyle(jacketColor);
    graphics.fillRoundedRect(
      11,
      25,
      26,
      35,
      6
    );

    graphics.lineStyle(
      5,
      skinColor
    );

    graphics.beginPath();
    graphics.moveTo(14, 31);
    graphics.lineTo(5, 49);
    graphics.moveTo(34, 31);
    graphics.lineTo(43, 49);
    graphics.strokePath();

    graphics.lineStyle(
      6,
      0x1f2937
    );

    graphics.beginPath();
    graphics.moveTo(18, 58);
    graphics.lineTo(16, 75);
    graphics.moveTo(30, 58);
    graphics.lineTo(32, 75);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillRoundedRect(
      4,
      32,
      12,
      28,
      4
    );

    graphics.generateTexture(
      textureKey,
      48,
      78
    );

    graphics.destroy();
  }
}


class SchoolScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private schoolChildren!: Phaser.Physics.Arcade.StaticGroup;
  private schoolObstacles!: Phaser.Physics.Arcade.StaticGroup;
  private classroomDoor!: Phaser.Physics.Arcade.Image;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  private restartKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private urgency = 0;
  private urgencyMax = 100;
  private urgencySpeed = 4;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private levelComplete = false;
  private teacherMode = false;
  private doorWarningActive = false;

  private triggeredChildren = new Set<string>();
  private triggeredObstacles = new Set<string>();

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private readonly gameHeight = 540;
  private readonly worldWidth = 3400;
  private readonly moveSpeed = 225;
  private readonly jumpVelocity = -435;

  constructor() {
    super("SchoolScene");
  }

  create() {
    this.physics.world.resume();

    this.cameras.main.setBackgroundColor("#fef3c7");

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.cameras.main.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.urgency = 0;
    this.urgencySpeed = 4;

    this.gameStarted = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.teacherMode = false;
    this.doorWarningActive = false;

    this.triggeredChildren.clear();
    this.triggeredObstacles.clear();

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createSchoolTextures();
    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.createChildren();
    this.createSchoolObstacles();
    this.createClassroomDoor();
    this.createControls();
    this.createHud();
    this.createStartScreen();

    this.cameras.main.startFollow(
      this.player,
      true,
      0.08,
      0.08
    );

    this.cameras.main.setDeadzone(260, 180);

    this.time.delayedCall(1800, () => {
      this.activateTeacherMode();
    });
  }

  update(time: number, delta: number) {
    if (!this.gameStarted) {
      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.startSchool();
      }

      return;
    }

    if (this.gameOver) {
      if (
        Phaser.Input.Keyboard.JustDown(this.restartKey)
      ) {
        this.scene.restart();
      }

      return;
    }

    if (this.levelComplete) {
      if (
        Phaser.Input.Keyboard.JustDown(this.restartKey)
      ) {
        this.scene.restart();
      }

      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.scene.start("BunScene");
      }

      return;
    }

    this.updatePlayerMovement();
    this.updatePlayerAppearance(time);
    this.updateUrgency(delta);
  }

  private createStartScreen() {
    const overlay = this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(100);

    const levelText = this.add
      .text(480, 90, "LEVEL 3", {
        fontFamily: "Arial",
        fontSize: "21px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const title = this.add
      .text(480, 150, "SCHOOL CHAOS", {
        fontFamily: "Arial",
        fontSize: "50px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objective = this.add
      .text(
        480,
        215,
        "OBJECTIVE: REACH THE CLASSROOM",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const urgencyText = this.add
      .text(
        480,
        265,
        "Starting urgency: 0%",
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const instruction = this.add
      .text(
        480,
        310,
        "Avoid children, backpacks, balls and books.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const button = this.add
      .rectangle(
        480,
        400,
        320,
        68,
        0x7c3aed
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({
        useHandCursor: true,
      });

    const buttonText = this.add
      .text(
        480,
        400,
        "ENTER SCHOOL",
        {
          fontFamily: "Arial",
          fontSize: "27px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    const keyboardText = this.add
      .text(
        480,
        465,
        "Click · Enter · Space",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objects = [
      overlay,
      levelText,
      title,
      objective,
      urgencyText,
      instruction,
      button,
      buttonText,
      keyboardText,
    ];

    button.on("pointerover", () => {
      button.setFillStyle(0x6d28d9);
      button.setScale(1.03);
      buttonText.setScale(1.03);
    });

    button.on("pointerout", () => {
      button.setFillStyle(0x7c3aed);
      button.setScale(1);
      buttonText.setScale(1);
    });

    button.on("pointerdown", () => {
      this.startSchool();
    });

    this.events.once("start-school", () => {
      objects.forEach((object) => {
        if (object.active) {
          object.destroy();
        }
      });
    });
  }

  private startSchool() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-school");

    this.cameras.main.flash(
      250,
      255,
      255,
      255
    );

    const title = this.add
      .text(
        480,
        155,
        "WELCOME TO SCHOOL!",
        {
          fontFamily: "Arial",
          fontSize: "34px",
          color: "#ffffff",
          backgroundColor: "#7c3aed",
          fontStyle: "bold",
          padding: {
            x: 18,
            y: 10,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    const subtitle = this.add
      .text(
        480,
        210,
        "Try to look professional.",
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          padding: {
            x: 14,
            y: 8,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.time.delayedCall(1800, () => {
      title.destroy();
      subtitle.destroy();
    });
  }

  private activateTeacherMode() {
    if (
      this.teacherMode ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    this.teacherMode = true;
    this.player.setTint(0xe9d5ff);

    const title = this.add
      .text(
        480,
        155,
        "TEACHER MODE!",
        {
          fontFamily: "Arial",
          fontSize: "32px",
          color: "#4c1d95",
          backgroundColor: "#e9d5ff",
          fontStyle: "bold",
          padding: {
            x: 18,
            y: 10,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    const subtitle = this.add
      .text(
        480,
        205,
        "Serious face. Same emergency.",
        {
          fontFamily: "Arial",
          fontSize: "19px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          padding: {
            x: 12,
            y: 6,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.time.delayedCall(1700, () => {
      title.destroy();
      subtitle.destroy();
    });
  }

  private createBackground() {
    this.add
      .rectangle(
        this.worldWidth / 2,
        250,
        this.worldWidth,
        500,
        0xfef3c7
      )
      .setDepth(-10);

    this.add
      .rectangle(
        this.worldWidth / 2,
        455,
        this.worldWidth,
        110,
        0xd6c6a8
      )
      .setDepth(-9);

    for (
      let x = 0;
      x < this.worldWidth;
      x += 180
    ) {
      this.add
        .rectangle(
          x + 90,
          460,
          3,
          100,
          0xb8a98d,
          0.45
        )
        .setDepth(-8);
    }

    this.add
      .text(
        150,
        150,
        "MORNING SCHOOL",
        {
          fontFamily: "Arial",
          fontSize: "34px",
          color: "#7c3aed",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .rectangle(
        540,
        320,
        260,
        220,
        0xf8fafc
      )
      .setStrokeStyle(8, 0x64748b)
      .setDepth(-3);

    this.add
      .text(540, 185, "LOCKERS", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    for (let i = -2; i <= 2; i += 1) {
      this.add
        .rectangle(
          540 + i * 45,
          325,
          38,
          185,
          i % 2 === 0
            ? 0x93c5fd
            : 0xbfdbfe
        )
        .setStrokeStyle(3, 0x1d4ed8)
        .setDepth(-2);

      this.add
        .circle(
          540 + i * 45 + 11,
          322,
          3,
          0x1e3a8a
        )
        .setDepth(-1);
    }

    this.add
      .rectangle(
        1370,
        335,
        260,
        200,
        0x14532d
      )
      .setStrokeStyle(10, 0x78350f)
      .setDepth(-3);

    this.add
      .text(
        1370,
        320,
        "NO RUNNING\nIN THE HALLWAY",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
          fontStyle: "bold",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setDepth(-2);

    this.add
      .rectangle(
        2210,
        330,
        260,
        210,
        0xf8fafc
      )
      .setStrokeStyle(8, 0x64748b)
      .setDepth(-3);

    this.add
      .text(2210, 190, "TEACHERS' ROOM", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#334155",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(
        2760,
        385,
        280,
        85,
        0x38bdf8
      )
      .setStrokeStyle(6, 0x0369a1)
      .setDepth(-3);

    this.add
      .text(
        2760,
        385,
        "BENCH OF EXHAUSTION",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(3220, 165, "CLASSROOM", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#166534",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private createLevel() {
    this.platforms = this.physics.add.staticGroup();

    this.platforms
      .create(
        this.worldWidth / 2,
        515,
        "platform"
      )
      .setScale(
        this.worldWidth / 40,
        1
      )
      .refreshBody();

    this.createPlatform(420, 415, 3);
    this.createPlatform(670, 350, 3);
    this.createPlatform(920, 410, 4);

    this.createPlatform(1160, 360, 3);
    this.createPlatform(1410, 300, 3);
    this.createPlatform(1660, 390, 3);

    this.createPlatform(1900, 340, 4);
    this.createPlatform(2160, 285, 3);
    this.createPlatform(2420, 390, 4);

    this.createPlatform(2680, 335, 3);
    this.createPlatform(2940, 390, 3);

    this.add
      .text(90, 470, "SCHOOL ENTRANCE", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#166534",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(
        1510,
        455,
        "Please walk calmly. Impossible.",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2720,
        455,
        "The classroom is almost there!",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private createPlatform(
    x: number,
    y: number,
    scaleX: number
  ) {
    this.platforms
      .create(x, y, "platform")
      .setScale(scaleX, 1)
      .refreshBody();
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(
      100,
      426,
      "jasmin-idle"
    );

    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);
    this.player.setDepth(5);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createChildren() {
    this.schoolChildren =
      this.physics.add.staticGroup();

    const childData = [
      {
        x: 760,
        key: "school-child-blue",
        id: "child-1",
        message:
          "A child appeared at full speed!",
      },
      {
        x: 1110,
        key: "school-child-red",
        id: "child-2",
        message:
          "Running in the hallway, naturally.",
      },
      {
        x: 1530,
        key: "school-child-blue",
        id: "child-3",
        message:
          "Why is everyone screaming?",
      },
      {
        x: 2040,
        key: "school-child-red",
        id: "child-4",
        message:
          "A tiny human collision!",
      },
      {
        x: 2530,
        key: "school-child-blue",
        id: "child-5",
        message:
          "The hallway has become a racetrack.",
      },
    ];

    childData.forEach((item) => {
      const child = this.schoolChildren
        .create(
          item.x,
          448,
          item.key
        )
        .setDepth(4);

      child.setData(
        "childId",
        item.id
      );

      child.setData(
        "message",
        item.message
      );
    });

    this.physics.add.overlap(
      this.player,
      this.schoolChildren,
      this.hitChild,
      undefined,
      this
    );
  }

  private hitChild(
    _playerObject: ArcadeCollisionObject,
    childObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const child =
      childObject as Phaser.Physics.Arcade.Image;

    const childId =
      child.getData("childId") as string;

    const message =
      child.getData("message") as string;

    if (
      this.triggeredChildren.has(childId)
    ) {
      return;
    }

    this.triggeredChildren.add(childId);

    child.disableBody(false, false);
    child.setAlpha(0.45);

    this.addUrgency(4);

    this.player.setVelocityX(-290);
    this.player.setVelocityY(-170);

    this.cameras.main.shake(
      210,
      0.008
    );

    this.cameras.main.flash(
      100,
      255,
      140,
      80
    );

    this.showSchoolMessage(
      message,
      "+4% TOILET URGENCY",
      0xb45309
    );
  }

  private createSchoolObstacles() {
    this.schoolObstacles =
      this.physics.add.staticGroup();

    const obstacleData = [
      {
        x: 1260,
        y: 455,
        key: "school-backpack",
        id: "backpack",
        label: "BACKPACK",
        message:
          "A backpack blocked the entire school.",
      },
      {
        x: 1810,
        y: 458,
        key: "school-ball",
        id: "ball",
        label: "BALL",
        message:
          "The ball chose the worst possible moment.",
      },
      {
        x: 2890,
        y: 445,
        key: "school-books",
        id: "books",
        label: "BOOKS",
        message:
          "A mountain of homework attacks!",
      },
    ];

    obstacleData.forEach((item) => {
      const obstacle =
        this.schoolObstacles
          .create(
            item.x,
            item.y,
            item.key
          )
          .setDepth(4);

      obstacle.setData(
        "obstacleId",
        item.id
      );

      obstacle.setData(
        "message",
        item.message
      );

      this.add
        .text(
          item.x,
          item.y - 65,
          item.label,
          {
            fontFamily: "Arial",
            fontSize: "15px",
            color: "#7c2d12",
            fontStyle: "bold",
          }
        )
        .setOrigin(0.5);
    });

    this.physics.add.overlap(
      this.player,
      this.schoolObstacles,
      this.hitSchoolObstacle,
      undefined,
      this
    );
  }

  private hitSchoolObstacle(
    _playerObject: ArcadeCollisionObject,
    obstacleObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const obstacle =
      obstacleObject as Phaser.Physics.Arcade.Image;

    const obstacleId =
      obstacle.getData("obstacleId") as string;

    const message =
      obstacle.getData("message") as string;

    if (
      this.triggeredObstacles.has(obstacleId)
    ) {
      return;
    }

    this.triggeredObstacles.add(obstacleId);

    obstacle.disableBody(false, false);
    obstacle.setAlpha(0.45);

    this.addUrgency(5);

    this.player.setVelocityX(-300);
    this.player.setVelocityY(-170);

    this.cameras.main.shake(
      220,
      0.008
    );

    this.cameras.main.flash(
      120,
      255,
      80,
      80
    );

    this.showSchoolMessage(
      message,
      "+5% TOILET URGENCY",
      0xb91c1c
    );
  }

  private createClassroomDoor() {
    this.classroomDoor =
      this.physics.add.staticImage(
        3250,
        416,
        "school-door"
      );

    this.classroomDoor.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.classroomDoor,
      this.reachClassroomDoor,
      undefined,
      this
    );

    this.add
      .text(
        3250,
        300,
        "CLASSROOM DOOR",
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private reachClassroomDoor() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    if (!this.teacherMode) {
      if (this.doorWarningActive) {
        return;
      }

      this.doorWarningActive = true;

      this.showSchoolMessage(
        "Not ready yet!",
        "Activate teacher mode first.",
        0xdc2626
      );

      this.time.delayedCall(1500, () => {
        this.doorWarningActive = false;
      });

      return;
    }

    this.completeLevel();
  }

  private completeLevel() {
    this.levelComplete = true;

    this.objectiveText.setText(
      "LEVEL 3 COMPLETE"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.cameras.main.flash(
      400,
      255,
      255,
      255
    );

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.91
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        145,
        "LEVEL 3 COMPLETE",
        {
          fontFamily: "Arial",
          fontSize: "49px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        225,
        "Teacher Jasmin reached the classroom.",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        280,
        `Urgency: ${Math.floor(
          this.urgency
        )}%`,
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        340,
        "NEXT: FIND THE BUN",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    const bunButton = this.add
      .rectangle(
        480,
        405,
        350,
        62,
        0xf59e0b
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({
        useHandCursor: true,
      });

    const bunButtonText = this.add
      .text(
        480,
        405,
        "CONTINUE TO THE BUN",
        {
          fontFamily: "Arial",
          fontSize: "23px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(52);

    this.add
      .text(
        480,
        465,
        "Click · Enter · Space     |     R replay school",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    bunButton.on("pointerover", () => {
      bunButton.setFillStyle(0xd97706);
      bunButton.setScale(1.03);
      bunButtonText.setScale(1.03);
    });

    bunButton.on("pointerout", () => {
      bunButton.setFillStyle(0xf59e0b);
      bunButton.setScale(1);
      bunButtonText.setScale(1);
    });

    bunButton.on("pointerdown", () => {
      this.scene.start("BunScene");
    });
  }

  private createControls() {
    this.cursors =
      this.input.keyboard!.createCursorKeys();

    this.wasd = {
      left: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.A
      ),
      right: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.D
      ),
      up: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.W
      ),
    };

    this.restartKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.R
      );

    this.enterKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.ENTER
      );
  }

  private createHud() {
    this.add
      .rectangle(
        480,
        48,
        960,
        96,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(20, 16, "JASMINITY", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(
        20,
        61,
        "A / D or arrows · Space / W / Up to jump",
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#cbd5e1",
        }
      )
      .setScrollFactor(0)
      .setDepth(21);

    this.objectiveText = this.add
      .text(
        250,
        24,
        "OBJECTIVE: REACH THE CLASSROOM",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.add
      .rectangle(
        710,
        62,
        310,
        34,
        0x111827
      )
      .setStrokeStyle(3, 0xffffff)
      .setScrollFactor(0)
      .setDepth(20);

    this.urgencyBar = this.add
      .rectangle(
        560,
        62,
        0,
        24,
        0x22c55e
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.urgencyText = this.add
      .text(
        710,
        62,
        "TOILET URGENCY: 0%",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.updateUrgencyDisplay();
  }

  private updatePlayerMovement() {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const movingLeft =
      this.cursors.left.isDown ||
      this.wasd.left.isDown;

    const movingRight =
      this.cursors.right.isDown ||
      this.wasd.right.isDown;

    if (movingLeft) {
      this.player.setVelocityX(
        -this.moveSpeed
      );

      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(
        this.moveSpeed
      );

      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const wantsToJump =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.wasd.up.isDown;

    if (
      wantsToJump &&
      body.blocked.down
    ) {
      this.player.setVelocityY(
        this.jumpVelocity
      );
    }
  }

  private updatePlayerAppearance(time: number) {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const isGrounded =
      body.blocked.down ||
      body.touching.down;

    if (!isGrounded) {
      this.setPlayerTexture(
        "jasmin-jump"
      );

      return;
    }

    if (
      Math.abs(body.velocity.x) > 10
    ) {
      if (
        time -
          this.lastWalkFrameSwitch >
        140
      ) {
        this.walkFrame =
          this.walkFrame === 0
            ? 1
            : 0;

        this.lastWalkFrameSwitch =
          time;
      }

      this.setPlayerTexture(
        this.walkFrame === 0
          ? "jasmin-walk-1"
          : "jasmin-walk-2"
      );

      return;
    }

    this.walkFrame = 0;

    this.setPlayerTexture(
      "jasmin-idle"
    );
  }

  private setPlayerTexture(
    textureKey: string
  ) {
    if (
      this.currentPlayerTexture ===
      textureKey
    ) {
      return;
    }

    this.currentPlayerTexture =
      textureKey;

    this.player.setTexture(
      textureKey
    );
  }

  private updateUrgency(delta: number) {
    this.urgency +=
      this.urgencySpeed *
      (delta / 1000);

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.urgency =
        this.urgencyMax;

      this.updateUrgencyDisplay();
      this.showGameOver();

      return;
    }

    this.updateUrgencyDisplay();
  }

  private addUrgency(amount: number) {
    this.urgency = Math.min(
      this.urgencyMax,
      this.urgency + amount
    );

    this.updateUrgencyDisplay();

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.showGameOver();
    }
  }

  private updateUrgencyDisplay() {
    const percentage =
      this.urgency /
      this.urgencyMax;

    this.urgencyBar.width =
      300 * percentage;

    this.urgencyText.setText(
      `TOILET URGENCY: ${Math.floor(
        this.urgency
      )}%`
    );

    if (percentage < 0.5) {
      this.urgencyBar.setFillStyle(
        0x22c55e
      );
    } else if (percentage < 0.8) {
      this.urgencyBar.setFillStyle(
        0xf59e0b
      );
    } else {
      this.urgencyBar.setFillStyle(
        0xef4444
      );
    }
  }

  private showSchoolMessage(
    title: string,
    subtitle: string,
    backgroundColor: number
  ) {
    const titleText = this.add
      .text(480, 155, title, {
        fontFamily: "Arial",
        fontSize: "27px",
        color: "#ffffff",
        backgroundColor:
          `#${backgroundColor
            .toString(16)
            .padStart(6, "0")}`,
        fontStyle: "bold",
        padding: {
          x: 18,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    const subtitleText = this.add
      .text(
        480,
        210,
        subtitle,
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          fontStyle: "bold",
          padding: {
            x: 14,
            y: 8,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    this.time.delayedCall(1500, () => {
      titleText.destroy();
      subtitleText.destroy();
    });
  }

  private showGameOver() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    this.gameOver = true;

    this.objectiveText.setText(
      "OBJECTIVE FAILED"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x111827,
        0.84
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        210,
        "TOO LATE!",
        {
          fontFamily: "Arial",
          fontSize: "58px",
          color: "#ff6b6b",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        285,
        "The school day won.",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        350,
        "Press R to restart the school",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private createSchoolTextures() {
    this.createChildTexture(
      "school-child-blue",
      0x2563eb,
      0xf4bd94
    );

    this.createChildTexture(
      "school-child-red",
      0xdc2626,
      0x9a6546
    );

    this.createBackpackTexture();
    this.createBallTexture();
    this.createBooksTexture();
    this.createSchoolDoorTexture();
  }

  private createChildTexture(
    textureKey: string,
    shirtColor: number,
    skinColor: number
  ) {
    if (
      this.textures.exists(textureKey)
    ) {
      this.textures.remove(textureKey);
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(skinColor);
    graphics.fillCircle(24, 14, 10);

    graphics.fillStyle(0x1f2937);
    graphics.fillRoundedRect(
      15,
      4,
      18,
      7,
      4
    );

    graphics.fillStyle(shirtColor);
    graphics.fillRoundedRect(
      12,
      25,
      24,
      30,
      6
    );

    graphics.lineStyle(
      5,
      skinColor
    );

    graphics.beginPath();
    graphics.moveTo(14, 30);
    graphics.lineTo(5, 45);
    graphics.moveTo(34, 30);
    graphics.lineTo(43, 45);
    graphics.strokePath();

    graphics.lineStyle(
      6,
      0x1f2937
    );

    graphics.beginPath();
    graphics.moveTo(18, 53);
    graphics.lineTo(14, 72);
    graphics.moveTo(30, 53);
    graphics.lineTo(34, 72);
    graphics.strokePath();

    graphics.fillStyle(0xfacc15);
    graphics.fillCircle(24, 36, 4);

    graphics.generateTexture(
      textureKey,
      48,
      76
    );

    graphics.destroy();
  }

  private createBackpackTexture() {
    if (
      this.textures.exists(
        "school-backpack"
      )
    ) {
      this.textures.remove(
        "school-backpack"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0x7c3aed);
    graphics.fillRoundedRect(
      8,
      10,
      50,
      55,
      10
    );

    graphics.lineStyle(
      5,
      0x4c1d95
    );

    graphics.strokeRoundedRect(
      8,
      10,
      50,
      55,
      10
    );

    graphics.beginPath();
    graphics.moveTo(18, 12);
    graphics.lineTo(20, 2);
    graphics.lineTo(46, 2);
    graphics.lineTo(48, 12);
    graphics.strokePath();

    graphics.fillStyle(0xc4b5fd);
    graphics.fillRoundedRect(
      16,
      40,
      34,
      16,
      5
    );

    graphics.generateTexture(
      "school-backpack",
      66,
      70
    );

    graphics.destroy();
  }

  private createBallTexture() {
    if (
      this.textures.exists(
        "school-ball"
      )
    ) {
      this.textures.remove(
        "school-ball"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xf97316);
    graphics.fillCircle(
      28,
      28,
      24
    );

    graphics.lineStyle(
      4,
      0x9a3412
    );

    graphics.strokeCircle(
      28,
      28,
      24
    );

    graphics.beginPath();
    graphics.arc(
      28,
      28,
      13,
      0,
      Math.PI * 2
    );
    graphics.strokePath();

    graphics.beginPath();
    graphics.moveTo(4, 28);
    graphics.lineTo(52, 28);
    graphics.moveTo(28, 4);
    graphics.lineTo(28, 52);
    graphics.strokePath();

    graphics.generateTexture(
      "school-ball",
      56,
      56
    );

    graphics.destroy();
  }

  private createBooksTexture() {
    if (
      this.textures.exists(
        "school-books"
      )
    ) {
      this.textures.remove(
        "school-books"
      );
    }

    const graphics =
      this.add.graphics();

    const colors = [
      0x2563eb,
      0xdc2626,
      0x16a34a,
      0xf59e0b,
    ];

    colors.forEach((color, index) => {
      graphics.fillStyle(color);

      graphics.fillRoundedRect(
        4 + index * 2,
        46 - index * 12,
        66 - index * 4,
        12,
        3
      );
    });

    graphics.generateTexture(
      "school-books",
      74,
      62
    );

    graphics.destroy();
  }

  private createSchoolDoorTexture() {
    if (
      this.textures.exists(
        "school-door"
      )
    ) {
      this.textures.remove(
        "school-door"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0x78350f);
    graphics.fillRoundedRect(
      4,
      2,
      72,
      116,
      6
    );

    graphics.fillStyle(0xb45309);
    graphics.fillRoundedRect(
      11,
      9,
      58,
      102,
      4
    );

    graphics.lineStyle(
      4,
      0x5b2c0a
    );

    graphics.strokeRoundedRect(
      11,
      9,
      58,
      102,
      4
    );

    graphics.fillStyle(0xfacc15);
    graphics.fillCircle(
      58,
      62,
      5
    );

    graphics.fillStyle(0xfef3c7);
    graphics.fillRoundedRect(
      18,
      18,
      44,
      28,
      4
    );

    graphics.fillStyle(0x166534);

    graphics.fillTriangle(
      28,
      27,
      28,
      38,
      42,
      32
    );

    graphics.fillRect(
      41,
      30,
      11,
      5
    );

    graphics.generateTexture(
      "school-door",
      80,
      120
    );

    graphics.destroy();
  }
}


class BunScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private queuePeople!: Phaser.Physics.Arcade.StaticGroup;
  private bunObstacles!: Phaser.Physics.Arcade.StaticGroup;

  private bun!: Phaser.Physics.Arcade.Image;
  private schoolExit!: Phaser.Physics.Arcade.Image;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  private restartKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private urgency = 0;
  private urgencyMax = 100;
  private urgencySpeed = 4;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private levelComplete = false;
  private bunCollected = false;
  private exitWarningActive = false;

  private triggeredPeople = new Set<string>();
  private triggeredObstacles = new Set<string>();

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private currentMoveSpeed = 225;
  private currentJumpVelocity = -435;

  private readonly normalMoveSpeed = 225;
  private readonly bunMoveSpeed = 285;
  private readonly normalJumpVelocity = -435;
  private readonly bunJumpVelocity = -475;

  private readonly gameHeight = 540;
  private readonly worldWidth = 3200;

  constructor() {
    super("BunScene");
  }

  create() {
    this.physics.world.resume();

    this.cameras.main.setBackgroundColor("#fff7ed");

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.cameras.main.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.urgency = 0;
    this.urgencySpeed = 4;

    this.currentMoveSpeed =
      this.normalMoveSpeed;

    this.currentJumpVelocity =
      this.normalJumpVelocity;

    this.gameStarted = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.bunCollected = false;
    this.exitWarningActive = false;

    this.triggeredPeople.clear();
    this.triggeredObstacles.clear();

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createBunTextures();
    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.createQueuePeople();
    this.createObstacles();
    this.createBun();
    this.createSchoolExit();
    this.createControls();
    this.createHud();
    this.createStartScreen();

    this.cameras.main.startFollow(
      this.player,
      true,
      0.08,
      0.08
    );

    this.cameras.main.setDeadzone(260, 180);
  }

  update(time: number, delta: number) {
    if (!this.gameStarted) {
      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.startBunLevel();
      }

      return;
    }

    if (this.gameOver) {
      if (
        Phaser.Input.Keyboard.JustDown(this.restartKey)
      ) {
        this.scene.restart();
      }

      return;
    }

    if (this.levelComplete) {
      if (
        Phaser.Input.Keyboard.JustDown(this.restartKey)
      ) {
        this.scene.restart();
      }

      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.scene.start("TrainHomeScene");
      }

      return;
    }

    this.updatePlayerMovement();
    this.updatePlayerAppearance(time);
    this.updateUrgency(delta);
  }

  private createStartScreen() {
    const overlay = this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(100);

    const levelText = this.add
      .text(480, 90, "LEVEL 4", {
        fontFamily: "Arial",
        fontSize: "21px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const title = this.add
      .text(
        480,
        150,
        "THE BUN BREAK",
        {
          fontFamily: "Arial",
          fontSize: "50px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objective = this.add
      .text(
        480,
        215,
        "OBJECTIVE: FIND THE BUN",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const urgencyText = this.add
      .text(
        480,
        265,
        "Starting urgency: 0%",
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const instruction = this.add
      .text(
        480,
        310,
        "Get through the queue and buy something delicious.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const button = this.add
      .rectangle(
        480,
        400,
        320,
        68,
        0xf59e0b
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({
        useHandCursor: true,
      });

    const buttonText = this.add
      .text(
        480,
        400,
        "GO TO THE KIOSK",
        {
          fontFamily: "Arial",
          fontSize: "26px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    const keyboardText = this.add
      .text(
        480,
        465,
        "Click · Enter · Space",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objects = [
      overlay,
      levelText,
      title,
      objective,
      urgencyText,
      instruction,
      button,
      buttonText,
      keyboardText,
    ];

    button.on("pointerover", () => {
      button.setFillStyle(0xd97706);
      button.setScale(1.03);
      buttonText.setScale(1.03);
    });

    button.on("pointerout", () => {
      button.setFillStyle(0xf59e0b);
      button.setScale(1);
      buttonText.setScale(1);
    });

    button.on("pointerdown", () => {
      this.startBunLevel();
    });

    this.events.once("start-bun", () => {
      objects.forEach((object) => {
        if (object.active) {
          object.destroy();
        }
      });
    });
  }

  private startBunLevel() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-bun");

    this.cameras.main.flash(
      250,
      255,
      255,
      255
    );

    this.showMessage(
      "LUNCH BREAK!",
      "One bun. Maximum happiness.",
      0xf59e0b
    );
  }

  private createBackground() {
    this.add
      .rectangle(
        this.worldWidth / 2,
        250,
        this.worldWidth,
        500,
        0xfff7ed
      )
      .setDepth(-10);

    this.add
      .rectangle(
        this.worldWidth / 2,
        455,
        this.worldWidth,
        110,
        0xd6c6a8
      )
      .setDepth(-9);

    for (
      let x = 0;
      x < this.worldWidth;
      x += 160
    ) {
      this.add
        .rectangle(
          x + 80,
          460,
          3,
          100,
          0xb8a98d,
          0.45
        )
        .setDepth(-8);
    }

    this.add
      .text(
        145,
        150,
        "SCHOOL KIOSK",
        {
          fontFamily: "Arial",
          fontSize: "34px",
          color: "#9a3412",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .rectangle(
        610,
        345,
        360,
        180,
        0xfed7aa
      )
      .setStrokeStyle(8, 0x9a3412)
      .setDepth(-3);

    this.add
      .rectangle(
        610,
        270,
        380,
        35,
        0xea580c
      )
      .setDepth(-2);

    this.add
      .text(
        610,
        270,
        "SNACKS · BUNS · JUICE",
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setDepth(-1);

    this.add
      .text(
        1330,
        185,
        "THE QUEUE",
        {
          fontFamily: "Arial",
          fontSize: "27px",
          color: "#7c2d12",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .rectangle(
        2100,
        350,
        270,
        190,
        0xf8fafc
      )
      .setStrokeStyle(8, 0x64748b)
      .setDepth(-3);

    this.add
      .text(
        2100,
        225,
        "CAFETERIA",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#334155",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .rectangle(
        2610,
        395,
        280,
        70,
        0x38bdf8
      )
      .setStrokeStyle(6, 0x0369a1)
      .setDepth(-3);

    this.add
      .text(
        2610,
        395,
        "BENCH OF SNACKING",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        3060,
        165,
        "SCHOOL EXIT",
        {
          fontFamily: "Arial",
          fontSize: "30px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private createLevel() {
    this.platforms =
      this.physics.add.staticGroup();

    this.platforms
      .create(
        this.worldWidth / 2,
        515,
        "platform"
      )
      .setScale(
        this.worldWidth / 40,
        1
      )
      .refreshBody();

    this.createPlatform(420, 415, 3);
    this.createPlatform(660, 350, 3);
    this.createPlatform(900, 410, 4);

    this.createPlatform(1160, 360, 3);
    this.createPlatform(1410, 300, 3);
    this.createPlatform(1660, 390, 3);

    this.createPlatform(1900, 340, 4);
    this.createPlatform(2170, 285, 3);
    this.createPlatform(2420, 390, 4);

    this.createPlatform(2700, 335, 3);
    this.createPlatform(2940, 390, 3);

    this.add
      .text(
        90,
        470,
        "START",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1450,
        455,
        "The queue has no end.",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2730,
        455,
        "Eat first. Escape second.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private createPlatform(
    x: number,
    y: number,
    scaleX: number
  ) {
    this.platforms
      .create(x, y, "platform")
      .setScale(scaleX, 1)
      .refreshBody();
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(
      100,
      426,
      "jasmin-idle"
    );

    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);
    this.player.setDepth(5);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createQueuePeople() {
    this.queuePeople =
      this.physics.add.staticGroup();

    const people = [
      {
        x: 980,
        key: "bun-person-green",
        id: "queue-1",
        message: "Someone ordered twelve sandwiches.",
      },
      {
        x: 1270,
        key: "bun-person-blue",
        id: "queue-2",
        message: "The queue moved backwards somehow.",
      },
      {
        x: 1510,
        key: "bun-person-green",
        id: "queue-3",
        message: "Exact change is being counted.",
      },
      {
        x: 1810,
        key: "bun-person-blue",
        id: "queue-4",
        message: "A menu decision takes forever.",
      },
    ];

    people.forEach((item) => {
      const person = this.queuePeople
        .create(
          item.x,
          447,
          item.key
        )
        .setDepth(4);

      person.setData(
        "personId",
        item.id
      );

      person.setData(
        "message",
        item.message
      );
    });

    this.physics.add.overlap(
      this.player,
      this.queuePeople,
      this.hitQueuePerson,
      undefined,
      this
    );
  }

  private hitQueuePerson(
    _playerObject: ArcadeCollisionObject,
    personObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const person =
      personObject as Phaser.Physics.Arcade.Image;

    const personId =
      person.getData("personId") as string;

    const message =
      person.getData("message") as string;

    if (
      this.triggeredPeople.has(personId)
    ) {
      return;
    }

    this.triggeredPeople.add(personId);

    person.disableBody(false, false);
    person.setAlpha(0.45);

    this.addUrgency(4);

    this.player.setVelocityX(-285);
    this.player.setVelocityY(-165);

    this.cameras.main.shake(
      190,
      0.007
    );

    this.showMessage(
      message,
      "+4% TOILET URGENCY",
      0xb45309
    );
  }

  private createObstacles() {
    this.bunObstacles =
      this.physics.add.staticGroup();

    const obstacles = [
      {
        x: 1130,
        y: 458,
        key: "bun-juice",
        id: "juice",
        label: "SPILLED JUICE",
        message: "Sticky floor. Perfect.",
      },
      {
        x: 2020,
        y: 450,
        key: "bun-tray",
        id: "tray",
        label: "TRAY",
        message: "The tray escaped the cafeteria.",
      },
      {
        x: 2540,
        y: 446,
        key: "bun-chair",
        id: "chair",
        label: "CHAIR",
        message: "A chair has entered the hallway.",
      },
    ];

    obstacles.forEach((item) => {
      const obstacle =
        this.bunObstacles
          .create(
            item.x,
            item.y,
            item.key
          )
          .setDepth(4);

      obstacle.setData(
        "obstacleId",
        item.id
      );

      obstacle.setData(
        "message",
        item.message
      );

      this.add
        .text(
          item.x,
          item.y - 63,
          item.label,
          {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#7c2d12",
            fontStyle: "bold",
          }
        )
        .setOrigin(0.5);
    });

    this.physics.add.overlap(
      this.player,
      this.bunObstacles,
      this.hitObstacle,
      undefined,
      this
    );
  }

  private hitObstacle(
    _playerObject: ArcadeCollisionObject,
    obstacleObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const obstacle =
      obstacleObject as Phaser.Physics.Arcade.Image;

    const obstacleId =
      obstacle.getData("obstacleId") as string;

    const message =
      obstacle.getData("message") as string;

    if (
      this.triggeredObstacles.has(obstacleId)
    ) {
      return;
    }

    this.triggeredObstacles.add(obstacleId);

    obstacle.disableBody(false, false);
    obstacle.setAlpha(0.45);

    this.addUrgency(5);

    this.player.setVelocityX(-300);
    this.player.setVelocityY(-170);

    this.cameras.main.shake(
      220,
      0.008
    );

    this.cameras.main.flash(
      120,
      255,
      80,
      80
    );

    this.showMessage(
      message,
      "+5% TOILET URGENCY",
      0xb91c1c
    );
  }

  private createBun() {
    this.bun =
      this.physics.add.staticImage(
        2280,
        432,
        "golden-bun"
      );

    this.bun.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.bun,
      this.collectBun,
      undefined,
      this
    );

    this.add
      .text(
        2280,
        370,
        "THE BUN",
        {
          fontFamily: "Arial",
          fontSize: "19px",
          color: "#9a3412",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.bun,
      y: 420,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private collectBun(
    _playerObject: ArcadeCollisionObject,
    bunObject: ArcadeCollisionObject
  ) {
    if (
      this.bunCollected ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const bun =
      bunObject as Phaser.Physics.Arcade.Image;

    this.bunCollected = true;

    this.tweens.killTweensOf(bun);
    bun.disableBody(true, true);

    this.objectiveText.setText(
      "OBJECTIVE: LEAVE THE SCHOOL"
    );

    this.urgency = Math.max(
      0,
      this.urgency - 15
    );

    this.updateUrgencyDisplay();

    this.currentMoveSpeed =
      this.bunMoveSpeed;

    this.currentJumpVelocity =
      this.bunJumpVelocity;

    this.player.clearTint();
    this.player.setTint(0xffd166);
    this.player.setScale(1.08);

    this.cameras.main.flash(
      300,
      255,
      220,
      120
    );

    this.cameras.main.shake(
      220,
      0.005
    );

    const title = this.add
      .text(
        480,
        150,
        "BUN TRANSFORMATION!",
        {
          fontFamily: "Arial",
          fontSize: "32px",
          color: "#7c2d12",
          backgroundColor: "#fde68a",
          fontStyle: "bold",
          padding: {
            x: 18,
            y: 10,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    const subtitle = this.add
      .text(
        480,
        205,
        "Normal Jasmin restored. -15% urgency.",
        {
          fontFamily: "Arial",
          fontSize: "19px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          fontStyle: "bold",
          padding: {
            x: 12,
            y: 7,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    this.time.delayedCall(1900, () => {
      title.destroy();
      subtitle.destroy();
    });
  }

  private createSchoolExit() {
    this.schoolExit =
      this.physics.add.staticImage(
        3060,
        416,
        "bun-exit-door"
      );

    this.schoolExit.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.schoolExit,
      this.reachExit,
      undefined,
      this
    );

    this.add
      .text(
        3060,
        300,
        "GO HOME",
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private reachExit() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    if (!this.bunCollected) {
      if (this.exitWarningActive) {
        return;
      }

      this.exitWarningActive = true;

      this.showMessage(
        "No bun, no departure!",
        "Go back and find the bun.",
        0xdc2626
      );

      this.time.delayedCall(1500, () => {
        this.exitWarningActive = false;
      });

      return;
    }

    this.completeLevel();
  }

  private completeLevel() {
    this.levelComplete = true;

    this.objectiveText.setText(
      "LEVEL 4 COMPLETE"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.cameras.main.flash(
      400,
      255,
      255,
      255
    );

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.91
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        140,
        "LEVEL 4 COMPLETE",
        {
          fontFamily: "Arial",
          fontSize: "49px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        220,
        "Jasmin ate the bun and left school.",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        275,
        `Urgency: ${Math.floor(
          this.urgency
        )}%`,
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        335,
        "NEXT STOP: THE TRAIN HOME",
        {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    const trainButton = this.add
      .rectangle(
        480,
        405,
        370,
        62,
        0xdc2626
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({
        useHandCursor: true,
      });

    const trainButtonText = this.add
      .text(
        480,
        405,
        "CONTINUE TO TRAIN HOME",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(52);

    this.add
      .text(
        480,
        465,
        "Click · Enter · Space     |     R replay bun level",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    trainButton.on("pointerover", () => {
      trainButton.setFillStyle(0xb91c1c);
      trainButton.setScale(1.03);
      trainButtonText.setScale(1.03);
    });

    trainButton.on("pointerout", () => {
      trainButton.setFillStyle(0xdc2626);
      trainButton.setScale(1);
      trainButtonText.setScale(1);
    });

    trainButton.on("pointerdown", () => {
      this.scene.start("TrainHomeScene");
    });
  }

  private createControls() {
    this.cursors =
      this.input.keyboard!.createCursorKeys();

    this.wasd = {
      left: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.A
      ),
      right: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.D
      ),
      up: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.W
      ),
    };

    this.restartKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.R
      );

    this.enterKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.ENTER
      );
  }

  private createHud() {
    this.add
      .rectangle(
        480,
        48,
        960,
        96,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(20, 16, "JASMINITY", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(
        20,
        61,
        "A / D or arrows · Space / W / Up to jump",
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#cbd5e1",
        }
      )
      .setScrollFactor(0)
      .setDepth(21);

    this.objectiveText = this.add
      .text(
        250,
        24,
        "OBJECTIVE: FIND THE BUN",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.add
      .rectangle(
        710,
        62,
        310,
        34,
        0x111827
      )
      .setStrokeStyle(3, 0xffffff)
      .setScrollFactor(0)
      .setDepth(20);

    this.urgencyBar = this.add
      .rectangle(
        560,
        62,
        0,
        24,
        0x22c55e
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.urgencyText = this.add
      .text(
        710,
        62,
        "TOILET URGENCY: 0%",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.updateUrgencyDisplay();
  }

  private updatePlayerMovement() {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const movingLeft =
      this.cursors.left.isDown ||
      this.wasd.left.isDown;

    const movingRight =
      this.cursors.right.isDown ||
      this.wasd.right.isDown;

    if (movingLeft) {
      this.player.setVelocityX(
        -this.currentMoveSpeed
      );

      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(
        this.currentMoveSpeed
      );

      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const wantsToJump =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.wasd.up.isDown;

    if (
      wantsToJump &&
      body.blocked.down
    ) {
      this.player.setVelocityY(
        this.currentJumpVelocity
      );
    }
  }

  private updatePlayerAppearance(time: number) {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const isGrounded =
      body.blocked.down ||
      body.touching.down;

    if (!isGrounded) {
      this.setPlayerTexture(
        "jasmin-jump"
      );

      return;
    }

    if (
      Math.abs(body.velocity.x) > 10
    ) {
      if (
        time -
          this.lastWalkFrameSwitch >
        140
      ) {
        this.walkFrame =
          this.walkFrame === 0
            ? 1
            : 0;

        this.lastWalkFrameSwitch =
          time;
      }

      this.setPlayerTexture(
        this.walkFrame === 0
          ? "jasmin-walk-1"
          : "jasmin-walk-2"
      );

      return;
    }

    this.walkFrame = 0;

    this.setPlayerTexture(
      "jasmin-idle"
    );
  }

  private setPlayerTexture(
    textureKey: string
  ) {
    if (
      this.currentPlayerTexture ===
      textureKey
    ) {
      return;
    }

    this.currentPlayerTexture =
      textureKey;

    this.player.setTexture(
      textureKey
    );
  }

  private updateUrgency(delta: number) {
    this.urgency +=
      this.urgencySpeed *
      (delta / 1000);

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.urgency =
        this.urgencyMax;

      this.updateUrgencyDisplay();
      this.showGameOver();

      return;
    }

    this.updateUrgencyDisplay();
  }

  private addUrgency(amount: number) {
    this.urgency = Math.min(
      this.urgencyMax,
      this.urgency + amount
    );

    this.updateUrgencyDisplay();

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.showGameOver();
    }
  }

  private updateUrgencyDisplay() {
    const percentage =
      this.urgency /
      this.urgencyMax;

    this.urgencyBar.width =
      300 * percentage;

    this.urgencyText.setText(
      `TOILET URGENCY: ${Math.floor(
        this.urgency
      )}%`
    );

    if (percentage < 0.5) {
      this.urgencyBar.setFillStyle(
        0x22c55e
      );
    } else if (percentage < 0.8) {
      this.urgencyBar.setFillStyle(
        0xf59e0b
      );
    } else {
      this.urgencyBar.setFillStyle(
        0xef4444
      );
    }
  }

  private showMessage(
    title: string,
    subtitle: string,
    backgroundColor: number
  ) {
    const titleText = this.add
      .text(
        480,
        155,
        title,
        {
          fontFamily: "Arial",
          fontSize: "27px",
          color: "#ffffff",
          backgroundColor:
            `#${backgroundColor
              .toString(16)
              .padStart(6, "0")}`,
          fontStyle: "bold",
          padding: {
            x: 18,
            y: 10,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    const subtitleText = this.add
      .text(
        480,
        210,
        subtitle,
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          fontStyle: "bold",
          padding: {
            x: 14,
            y: 8,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    this.time.delayedCall(1500, () => {
      titleText.destroy();
      subtitleText.destroy();
    });
  }

  private showGameOver() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    this.gameOver = true;

    this.objectiveText.setText(
      "OBJECTIVE FAILED"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x111827,
        0.84
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        210,
        "TOO LATE!",
        {
          fontFamily: "Arial",
          fontSize: "58px",
          color: "#ff6b6b",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        285,
        "The bun remained uneaten.",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        350,
        "Press R to restart the bun level",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private createBunTextures() {
    this.createPersonTexture(
      "bun-person-green",
      0x16a34a,
      0xf4bd94
    );

    this.createPersonTexture(
      "bun-person-blue",
      0x2563eb,
      0x9a6546
    );

    this.createGoldenBunTexture();
    this.createJuiceTexture();
    this.createTrayTexture();
    this.createChairTexture();
    this.createExitDoorTexture();
  }

  private createPersonTexture(
    textureKey: string,
    shirtColor: number,
    skinColor: number
  ) {
    if (
      this.textures.exists(textureKey)
    ) {
      this.textures.remove(textureKey);
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(skinColor);
    graphics.fillCircle(24, 14, 10);

    graphics.fillStyle(0x1f2937);
    graphics.fillRoundedRect(
      15,
      4,
      18,
      7,
      4
    );

    graphics.fillStyle(shirtColor);
    graphics.fillRoundedRect(
      12,
      25,
      24,
      32,
      6
    );

    graphics.lineStyle(
      5,
      skinColor
    );

    graphics.beginPath();
    graphics.moveTo(14, 30);
    graphics.lineTo(5, 46);
    graphics.moveTo(34, 30);
    graphics.lineTo(43, 46);
    graphics.strokePath();

    graphics.lineStyle(
      6,
      0x1f2937
    );

    graphics.beginPath();
    graphics.moveTo(18, 55);
    graphics.lineTo(15, 74);
    graphics.moveTo(30, 55);
    graphics.lineTo(33, 74);
    graphics.strokePath();

    graphics.generateTexture(
      textureKey,
      48,
      78
    );

    graphics.destroy();
  }

  private createGoldenBunTexture() {
    if (
      this.textures.exists(
        "golden-bun"
      )
    ) {
      this.textures.remove(
        "golden-bun"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xf59e0b);
    graphics.fillEllipse(
      38,
      28,
      68,
      44
    );

    graphics.lineStyle(
      4,
      0x92400e
    );

    graphics.strokeEllipse(
      38,
      28,
      68,
      44
    );

    graphics.lineStyle(
      3,
      0xfde68a
    );

    graphics.beginPath();
    graphics.arc(
      25,
      25,
      9,
      3.5,
      5.8
    );
    graphics.strokePath();

    graphics.beginPath();
    graphics.arc(
      43,
      22,
      9,
      3.5,
      5.8
    );
    graphics.strokePath();

    graphics.fillStyle(0xffffff);
    graphics.fillCircle(26, 25, 3);
    graphics.fillCircle(48, 25, 3);

    graphics.fillStyle(0x111827);
    graphics.fillCircle(26, 25, 1.5);
    graphics.fillCircle(48, 25, 1.5);

    graphics.lineStyle(
      2,
      0x7c2d12
    );

    graphics.beginPath();
    graphics.arc(
      37,
      31,
      8,
      0.2,
      2.9
    );
    graphics.strokePath();

    graphics.generateTexture(
      "golden-bun",
      76,
      56
    );

    graphics.destroy();
  }

  private createJuiceTexture() {
    if (
      this.textures.exists(
        "bun-juice"
      )
    ) {
      this.textures.remove(
        "bun-juice"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(
      0xf97316,
      0.75
    );

    graphics.fillEllipse(
      35,
      22,
      66,
      28
    );

    graphics.fillCircle(
      12,
      16,
      8
    );

    graphics.fillCircle(
      55,
      18,
      10
    );

    graphics.generateTexture(
      "bun-juice",
      72,
      40
    );

    graphics.destroy();
  }

  private createTrayTexture() {
    if (
      this.textures.exists(
        "bun-tray"
      )
    ) {
      this.textures.remove(
        "bun-tray"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0x64748b);
    graphics.fillRoundedRect(
      3,
      10,
      72,
      26,
      6
    );

    graphics.lineStyle(
      4,
      0x334155
    );

    graphics.strokeRoundedRect(
      3,
      10,
      72,
      26,
      6
    );

    graphics.fillStyle(0xf8fafc);
    graphics.fillCircle(
      25,
      22,
      8
    );

    graphics.fillStyle(0xfacc15);
    graphics.fillRoundedRect(
      45,
      15,
      20,
      13,
      3
    );

    graphics.generateTexture(
      "bun-tray",
      78,
      46
    );

    graphics.destroy();
  }

  private createChairTexture() {
    if (
      this.textures.exists(
        "bun-chair"
      )
    ) {
      this.textures.remove(
        "bun-chair"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0x92400e);
    graphics.fillRoundedRect(
      6,
      5,
      54,
      19,
      5
    );

    graphics.fillRect(
      10,
      21,
      9,
      49
    );

    graphics.fillRect(
      48,
      21,
      9,
      49
    );

    graphics.fillRect(
      7,
      2,
      9,
      43
    );

    graphics.generateTexture(
      "bun-chair",
      68,
      74
    );

    graphics.destroy();
  }

  private createExitDoorTexture() {
    if (
      this.textures.exists(
        "bun-exit-door"
      )
    ) {
      this.textures.remove(
        "bun-exit-door"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0x78350f);
    graphics.fillRoundedRect(
      4,
      2,
      72,
      116,
      6
    );

    graphics.fillStyle(0xb45309);
    graphics.fillRoundedRect(
      11,
      9,
      58,
      102,
      4
    );

    graphics.lineStyle(
      4,
      0x5b2c0a
    );

    graphics.strokeRoundedRect(
      11,
      9,
      58,
      102,
      4
    );

    graphics.fillStyle(0xfacc15);
    graphics.fillCircle(
      58,
      62,
      5
    );

    graphics.fillStyle(0xfef3c7);
    graphics.fillRoundedRect(
      18,
      18,
      44,
      28,
      4
    );

    graphics.fillStyle(0x166534);
    graphics.fillTriangle(
      28,
      27,
      28,
      38,
      42,
      32
    );

    graphics.fillRect(
      41,
      30,
      11,
      5
    );

    graphics.generateTexture(
      "bun-exit-door",
      80,
      120
    );

    graphics.destroy();
  }
}


class TrainHomeScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private trainPassengers!: Phaser.Physics.Arcade.StaticGroup;
  private trainObstacles!: Phaser.Physics.Arcade.StaticGroup;
  private brokenDoor!: Phaser.Physics.Arcade.Image;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  private restartKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private urgency = 0;
  private urgencyMax = 100;
  private urgencySpeed = 4.2;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private levelComplete = false;
  private trainBroken = false;
  private exitWarningActive = false;

  private triggeredPassengers = new Set<string>();
  private triggeredObstacles = new Set<string>();

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private readonly gameHeight = 540;
  private readonly worldWidth = 3400;
  private readonly moveSpeed = 225;
  private readonly jumpVelocity = -435;

  constructor() {
    super("TrainHomeScene");
  }

  create() {
    this.physics.world.resume();

    this.cameras.main.setBackgroundColor("#e2e8f0");

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.cameras.main.setBounds(
      0,
      0,
      this.worldWidth,
      this.gameHeight
    );

    this.urgency = 0;
    this.urgencySpeed = 4.2;

    this.gameStarted = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.trainBroken = false;
    this.exitWarningActive = false;

    this.triggeredPassengers.clear();
    this.triggeredObstacles.clear();

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createTrainHomeTextures();
    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.createPassengers();
    this.createObstacles();
    this.createBrokenDoor();
    this.createControls();
    this.createHud();
    this.createStartScreen();

    this.cameras.main.startFollow(
      this.player,
      true,
      0.08,
      0.08
    );

    this.cameras.main.setDeadzone(260, 180);

    this.time.delayedCall(6500, () => {
      this.breakTrain();
    });
  }

  update(time: number, delta: number) {
    if (!this.gameStarted) {
      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        this.startTrain();
      }

      return;
    }

    if (
      this.gameOver ||
      this.levelComplete
    ) {
      if (
        Phaser.Input.Keyboard.JustDown(this.restartKey)
      ) {
        this.scene.restart();
      }

      return;
    }

    this.updatePlayerMovement();
    this.updatePlayerAppearance(time);
    this.updateUrgency(delta);
  }

  private createStartScreen() {
    const overlay = this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(100);

    const levelText = this.add
      .text(480, 90, "LEVEL 5", {
        fontFamily: "Arial",
        fontSize: "21px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const title = this.add
      .text(
        480,
        150,
        "THE TRAIN HOME",
        {
          fontFamily: "Arial",
          fontSize: "50px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objective = this.add
      .text(
        480,
        215,
        "OBJECTIVE: REACH THE LAST CARRIAGE",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const urgencyText = this.add
      .text(
        480,
        265,
        "Starting urgency: 0%",
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const instruction = this.add
      .text(
        480,
        310,
        "Move through passengers and luggage.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const button = this.add
      .rectangle(
        480,
        400,
        320,
        68,
        0xdc2626
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({
        useHandCursor: true,
      });

    const buttonText = this.add
      .text(
        480,
        400,
        "BOARD THE TRAIN",
        {
          fontFamily: "Arial",
          fontSize: "26px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    const keyboardText = this.add
      .text(
        480,
        465,
        "Click · Enter · Space",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const objects = [
      overlay,
      levelText,
      title,
      objective,
      urgencyText,
      instruction,
      button,
      buttonText,
      keyboardText,
    ];

    button.on("pointerover", () => {
      button.setFillStyle(0xb91c1c);
      button.setScale(1.03);
      buttonText.setScale(1.03);
    });

    button.on("pointerout", () => {
      button.setFillStyle(0xdc2626);
      button.setScale(1);
      buttonText.setScale(1);
    });

    button.on("pointerdown", () => {
      this.startTrain();
    });

    this.events.once("start-train-home", () => {
      objects.forEach((object) => {
        if (object.active) {
          object.destroy();
        }
      });
    });
  }

  private startTrain() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-train-home");

    this.cameras.main.flash(
      250,
      255,
      255,
      255
    );

    this.showMessage(
      "HOMEWARD BOUND!",
      "Surely nothing will go wrong.",
      0xdc2626
    );
  }

  private breakTrain() {
    if (
      this.trainBroken ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    this.trainBroken = true;

    this.objectiveText.setText(
      "OBJECTIVE: EXIT THE BROKEN TRAIN"
    );

    this.cameras.main.shake(
      900,
      0.012
    );

    this.cameras.main.flash(
      250,
      255,
      80,
      80
    );

    this.showMessage(
      "THE TRAIN BROKE DOWN!",
      "Of course it did. Reach the emergency exit.",
      0x991b1b
    );
  }

  private createBackground() {
    this.add
      .rectangle(
        this.worldWidth / 2,
        250,
        this.worldWidth,
        500,
        0xe2e8f0
      )
      .setDepth(-10);

    this.add
      .rectangle(
        this.worldWidth / 2,
        455,
        this.worldWidth,
        110,
        0x94a3b8
      )
      .setDepth(-9);

    this.add
      .rectangle(
        this.worldWidth / 2,
        135,
        this.worldWidth,
        18,
        0xdc2626
      )
      .setDepth(-8);

    for (
      let x = 0;
      x < this.worldWidth;
      x += 310
    ) {
      this.add
        .rectangle(
          x + 155,
          255,
          205,
          120,
          0xbfe8ff
        )
        .setStrokeStyle(
          7,
          0x475569
        )
        .setDepth(-6);

      this.add
        .rectangle(
          x + 155,
          255,
          8,
          120,
          0x475569
        )
        .setDepth(-5);

      this.add
        .rectangle(
          x + 20,
          330,
          90,
          85,
          0xdc2626
        )
        .setStrokeStyle(
          5,
          0x7f1d1d
        )
        .setDepth(-4);

      this.add
        .rectangle(
          x + 290,
          330,
          90,
          85,
          0xdc2626
        )
        .setStrokeStyle(
          5,
          0x7f1d1d
        )
        .setDepth(-4);
    }

    this.add
      .text(
        160,
        165,
        "S7 · HOME",
        {
          fontFamily: "Arial",
          fontSize: "30px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        980,
        165,
        "CARRIAGE 1",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#334155",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1900,
        165,
        "CARRIAGE 2",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#334155",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2800,
        165,
        "LAST CARRIAGE",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#334155",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        3240,
        165,
        "EMERGENCY EXIT",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private createLevel() {
    this.platforms =
      this.physics.add.staticGroup();

    this.platforms
      .create(
        this.worldWidth / 2,
        515,
        "platform"
      )
      .setScale(
        this.worldWidth / 40,
        1
      )
      .refreshBody();

    this.createPlatform(430, 415, 3);
    this.createPlatform(680, 350, 3);
    this.createPlatform(930, 410, 4);

    this.createPlatform(1180, 360, 3);
    this.createPlatform(1430, 300, 3);
    this.createPlatform(1680, 390, 3);

    this.createPlatform(1930, 340, 4);
    this.createPlatform(2190, 285, 3);
    this.createPlatform(2440, 390, 4);

    this.createPlatform(2700, 335, 3);
    this.createPlatform(2970, 390, 3);

    this.add
      .text(
        90,
        470,
        "BOARDING",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1500,
        455,
        "Why is every seat occupied?",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2770,
        455,
        "Something sounds expensive.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private createPlatform(
    x: number,
    y: number,
    scaleX: number
  ) {
    this.platforms
      .create(x, y, "platform")
      .setScale(scaleX, 1)
      .refreshBody();
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(
      100,
      426,
      "jasmin-idle"
    );

    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);
    this.player.setDepth(5);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createPassengers() {
    this.trainPassengers =
      this.physics.add.staticGroup();

    const data = [
      {
        x: 790,
        key: "train-passenger-blue",
        id: "train-passenger-1",
        message:
          "A passenger is blocking both directions.",
      },
      {
        x: 1220,
        key: "train-passenger-green",
        id: "train-passenger-2",
        message:
          "Someone is standing directly at the door.",
      },
      {
        x: 1740,
        key: "train-passenger-blue",
        id: "train-passenger-3",
        message:
          "A backpack needs its own ticket.",
      },
      {
        x: 2260,
        key: "train-passenger-green",
        id: "train-passenger-4",
        message:
          "The aisle has become a meeting room.",
      },
      {
        x: 2780,
        key: "train-passenger-blue",
        id: "train-passenger-5",
        message:
          "Nobody knows where to stand.",
      },
    ];

    data.forEach((item) => {
      const passenger =
        this.trainPassengers
          .create(
            item.x,
            447,
            item.key
          )
          .setDepth(4);

      passenger.setData(
        "passengerId",
        item.id
      );

      passenger.setData(
        "message",
        item.message
      );
    });

    this.physics.add.overlap(
      this.player,
      this.trainPassengers,
      this.hitPassenger,
      undefined,
      this
    );
  }

  private hitPassenger(
    _playerObject: ArcadeCollisionObject,
    passengerObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const passenger =
      passengerObject as Phaser.Physics.Arcade.Image;

    const passengerId =
      passenger.getData("passengerId") as string;

    const message =
      passenger.getData("message") as string;

    if (
      this.triggeredPassengers.has(passengerId)
    ) {
      return;
    }

    this.triggeredPassengers.add(passengerId);

    passenger.disableBody(false, false);
    passenger.setAlpha(0.45);

    this.addUrgency(4);

    this.player.setVelocityX(-285);
    this.player.setVelocityY(-165);

    this.cameras.main.shake(
      190,
      0.007
    );

    this.showMessage(
      message,
      "+4% TOILET URGENCY",
      0xb45309
    );
  }

  private createObstacles() {
    this.trainObstacles =
      this.physics.add.staticGroup();

    const data = [
      {
        x: 1030,
        y: 450,
        key: "train-suitcase",
        id: "suitcase",
        label: "SUITCASE",
        message:
          "A suitcase occupies the entire aisle.",
      },
      {
        x: 2020,
        y: 452,
        key: "train-coffee",
        id: "train-coffee",
        label: "SPILLED COFFEE",
        message:
          "Not your coffee. Still your problem.",
      },
      {
        x: 2520,
        y: 447,
        key: "train-newspaper",
        id: "newspaper",
        label: "NEWSPAPER",
        message:
          "Breaking news: floor still slippery.",
      },
    ];

    data.forEach((item) => {
      const obstacle =
        this.trainObstacles
          .create(
            item.x,
            item.y,
            item.key
          )
          .setDepth(4);

      obstacle.setData(
        "obstacleId",
        item.id
      );

      obstacle.setData(
        "message",
        item.message
      );

      this.add
        .text(
          item.x,
          item.y - 62,
          item.label,
          {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#7c2d12",
            fontStyle: "bold",
          }
        )
        .setOrigin(0.5);
    });

    this.physics.add.overlap(
      this.player,
      this.trainObstacles,
      this.hitObstacle,
      undefined,
      this
    );
  }

  private hitObstacle(
    _playerObject: ArcadeCollisionObject,
    obstacleObject: ArcadeCollisionObject
  ) {
    if (
      !this.gameStarted ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const obstacle =
      obstacleObject as Phaser.Physics.Arcade.Image;

    const obstacleId =
      obstacle.getData("obstacleId") as string;

    const message =
      obstacle.getData("message") as string;

    if (
      this.triggeredObstacles.has(obstacleId)
    ) {
      return;
    }

    this.triggeredObstacles.add(obstacleId);

    obstacle.disableBody(false, false);
    obstacle.setAlpha(0.45);

    this.addUrgency(5);

    this.player.setVelocityX(-300);
    this.player.setVelocityY(-170);

    this.cameras.main.shake(
      220,
      0.008
    );

    this.cameras.main.flash(
      120,
      255,
      80,
      80
    );

    this.showMessage(
      message,
      "+5% TOILET URGENCY",
      0xb91c1c
    );
  }

  private createBrokenDoor() {
    this.brokenDoor =
      this.physics.add.staticImage(
        3240,
        416,
        "broken-train-door"
      );

    this.brokenDoor.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.brokenDoor,
      this.reachBrokenDoor,
      undefined,
      this
    );

    this.add
      .text(
        3240,
        300,
        "EMERGENCY DOOR",
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#b91c1c",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private reachBrokenDoor() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    if (!this.trainBroken) {
      if (this.exitWarningActive) {
        return;
      }

      this.exitWarningActive = true;

      this.showMessage(
        "The train is still moving!",
        "Wait for something to go wrong.",
        0x475569
      );

      this.time.delayedCall(1500, () => {
        this.exitWarningActive = false;
      });

      return;
    }

    this.completeLevel();
  }

  private completeLevel() {
    this.levelComplete = true;

    this.objectiveText.setText(
      "LEVEL 5 COMPLETE"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.cameras.main.flash(
      400,
      255,
      255,
      255
    );

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x0f172a,
        0.91
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        140,
        "LEVEL 5 COMPLETE",
        {
          fontFamily: "Arial",
          fontSize: "49px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        220,
        "The train broke down. Jasmin escaped.",
        {
          fontFamily: "Arial",
          fontSize: "25px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        275,
        `Urgency: ${Math.floor(
          this.urgency
        )}%`,
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#fca5a5",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        335,
        "NEXT: FIND A BICYCLE",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        405,
        "The bicycle ride comes next.",
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        455,
        "Press R to replay the train level",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private createControls() {
    this.cursors =
      this.input.keyboard!.createCursorKeys();

    this.wasd = {
      left: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.A
      ),
      right: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.D
      ),
      up: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.W
      ),
    };

    this.restartKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.R
      );

    this.enterKey =
      this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.ENTER
      );
  }

  private createHud() {
    this.add
      .rectangle(
        480,
        48,
        960,
        96,
        0x0f172a,
        0.9
      )
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(20, 16, "JASMINITY", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(
        20,
        61,
        "A / D or arrows · Space / W / Up to jump",
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#cbd5e1",
        }
      )
      .setScrollFactor(0)
      .setDepth(21);

    this.objectiveText = this.add
      .text(
        250,
        24,
        "OBJECTIVE: REACH THE LAST CARRIAGE",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.add
      .rectangle(
        710,
        62,
        310,
        34,
        0x111827
      )
      .setStrokeStyle(3, 0xffffff)
      .setScrollFactor(0)
      .setDepth(20);

    this.urgencyBar = this.add
      .rectangle(
        560,
        62,
        0,
        24,
        0x22c55e
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.urgencyText = this.add
      .text(
        710,
        62,
        "TOILET URGENCY: 0%",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.updateUrgencyDisplay();
  }

  private updatePlayerMovement() {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const movingLeft =
      this.cursors.left.isDown ||
      this.wasd.left.isDown;

    const movingRight =
      this.cursors.right.isDown ||
      this.wasd.right.isDown;

    if (movingLeft) {
      this.player.setVelocityX(
        -this.moveSpeed
      );

      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(
        this.moveSpeed
      );

      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const wantsToJump =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.wasd.up.isDown;

    if (
      wantsToJump &&
      body.blocked.down
    ) {
      this.player.setVelocityY(
        this.jumpVelocity
      );
    }
  }

  private updatePlayerAppearance(time: number) {
    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    const isGrounded =
      body.blocked.down ||
      body.touching.down;

    if (!isGrounded) {
      this.setPlayerTexture(
        "jasmin-jump"
      );

      return;
    }

    if (
      Math.abs(body.velocity.x) > 10
    ) {
      if (
        time -
          this.lastWalkFrameSwitch >
        140
      ) {
        this.walkFrame =
          this.walkFrame === 0
            ? 1
            : 0;

        this.lastWalkFrameSwitch =
          time;
      }

      this.setPlayerTexture(
        this.walkFrame === 0
          ? "jasmin-walk-1"
          : "jasmin-walk-2"
      );

      return;
    }

    this.walkFrame = 0;

    this.setPlayerTexture(
      "jasmin-idle"
    );
  }

  private setPlayerTexture(
    textureKey: string
  ) {
    if (
      this.currentPlayerTexture ===
      textureKey
    ) {
      return;
    }

    this.currentPlayerTexture =
      textureKey;

    this.player.setTexture(
      textureKey
    );
  }

  private updateUrgency(delta: number) {
    this.urgency +=
      this.urgencySpeed *
      (delta / 1000);

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.urgency =
        this.urgencyMax;

      this.updateUrgencyDisplay();
      this.showGameOver();

      return;
    }

    this.updateUrgencyDisplay();
  }

  private addUrgency(amount: number) {
    this.urgency = Math.min(
      this.urgencyMax,
      this.urgency + amount
    );

    this.updateUrgencyDisplay();

    if (
      this.urgency >=
      this.urgencyMax
    ) {
      this.showGameOver();
    }
  }

  private updateUrgencyDisplay() {
    const percentage =
      this.urgency /
      this.urgencyMax;

    this.urgencyBar.width =
      300 * percentage;

    this.urgencyText.setText(
      `TOILET URGENCY: ${Math.floor(
        this.urgency
      )}%`
    );

    if (percentage < 0.5) {
      this.urgencyBar.setFillStyle(
        0x22c55e
      );
    } else if (percentage < 0.8) {
      this.urgencyBar.setFillStyle(
        0xf59e0b
      );
    } else {
      this.urgencyBar.setFillStyle(
        0xef4444
      );
    }
  }

  private showMessage(
    title: string,
    subtitle: string,
    backgroundColor: number
  ) {
    const titleText = this.add
      .text(
        480,
        155,
        title,
        {
          fontFamily: "Arial",
          fontSize: "27px",
          color: "#ffffff",
          backgroundColor:
            `#${backgroundColor
              .toString(16)
              .padStart(6, "0")}`,
          fontStyle: "bold",
          padding: {
            x: 18,
            y: 10,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    const subtitleText = this.add
      .text(
        480,
        210,
        subtitle,
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#1f2937",
          backgroundColor: "#ffffff",
          fontStyle: "bold",
          padding: {
            x: 14,
            y: 8,
          },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    this.time.delayedCall(1600, () => {
      titleText.destroy();
      subtitleText.destroy();
    });
  }

  private showGameOver() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    this.gameOver = true;

    this.objectiveText.setText(
      "OBJECTIVE FAILED"
    );

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x111827,
        0.84
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        210,
        "TOO LATE!",
        {
          fontFamily: "Arial",
          fontSize: "58px",
          color: "#ff6b6b",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        285,
        "The train journey took too long.",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    this.add
      .text(
        480,
        350,
        "Press R to restart the train level",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private createTrainHomeTextures() {
    this.createPassengerTexture(
      "train-passenger-blue",
      0x2563eb,
      0xf4bd94
    );

    this.createPassengerTexture(
      "train-passenger-green",
      0x16a34a,
      0x9a6546
    );

    this.createSuitcaseTexture();
    this.createCoffeeSpillTexture();
    this.createNewspaperTexture();
    this.createBrokenDoorTexture();
  }

  private createPassengerTexture(
    textureKey: string,
    shirtColor: number,
    skinColor: number
  ) {
    if (
      this.textures.exists(textureKey)
    ) {
      this.textures.remove(textureKey);
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(skinColor);
    graphics.fillCircle(
      24,
      14,
      10
    );

    graphics.fillStyle(0x1f2937);
    graphics.fillRoundedRect(
      15,
      4,
      18,
      7,
      4
    );

    graphics.fillStyle(shirtColor);
    graphics.fillRoundedRect(
      12,
      25,
      24,
      32,
      6
    );

    graphics.lineStyle(
      5,
      skinColor
    );

    graphics.beginPath();
    graphics.moveTo(14, 30);
    graphics.lineTo(5, 46);
    graphics.moveTo(34, 30);
    graphics.lineTo(43, 46);
    graphics.strokePath();

    graphics.lineStyle(
      6,
      0x1f2937
    );

    graphics.beginPath();
    graphics.moveTo(18, 55);
    graphics.lineTo(15, 74);
    graphics.moveTo(30, 55);
    graphics.lineTo(33, 74);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillRoundedRect(
      35,
      32,
      10,
      28,
      4
    );

    graphics.generateTexture(
      textureKey,
      48,
      78
    );

    graphics.destroy();
  }

  private createSuitcaseTexture() {
    if (
      this.textures.exists(
        "train-suitcase"
      )
    ) {
      this.textures.remove(
        "train-suitcase"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0x7c3aed);
    graphics.fillRoundedRect(
      7,
      15,
      58,
      50,
      8
    );

    graphics.lineStyle(
      5,
      0x4c1d95
    );

    graphics.strokeRoundedRect(
      7,
      15,
      58,
      50,
      8
    );

    graphics.beginPath();
    graphics.moveTo(24, 15);
    graphics.lineTo(24, 5);
    graphics.lineTo(48, 5);
    graphics.lineTo(48, 15);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillCircle(
      20,
      68,
      5
    );

    graphics.fillCircle(
      52,
      68,
      5
    );

    graphics.generateTexture(
      "train-suitcase",
      72,
      74
    );

    graphics.destroy();
  }

  private createCoffeeSpillTexture() {
    if (
      this.textures.exists(
        "train-coffee"
      )
    ) {
      this.textures.remove(
        "train-coffee"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(
      0x78350f,
      0.75
    );

    graphics.fillEllipse(
      35,
      22,
      66,
      28
    );

    graphics.fillCircle(
      12,
      16,
      8
    );

    graphics.fillCircle(
      55,
      18,
      10
    );

    graphics.generateTexture(
      "train-coffee",
      72,
      40
    );

    graphics.destroy();
  }

  private createNewspaperTexture() {
    if (
      this.textures.exists(
        "train-newspaper"
      )
    ) {
      this.textures.remove(
        "train-newspaper"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xf8fafc);
    graphics.fillRoundedRect(
      4,
      5,
      68,
      45,
      3
    );

    graphics.lineStyle(
      3,
      0x475569
    );

    graphics.strokeRoundedRect(
      4,
      5,
      68,
      45,
      3
    );

    graphics.fillStyle(0x111827);
    graphics.fillRect(
      10,
      11,
      56,
      7
    );

    graphics.fillStyle(0x94a3b8);

    for (
      let y = 24;
      y <= 42;
      y += 8
    ) {
      graphics.fillRect(
        10,
        y,
        24,
        3
      );

      graphics.fillRect(
        40,
        y,
        26,
        3
      );
    }

    graphics.generateTexture(
      "train-newspaper",
      76,
      56
    );

    graphics.destroy();
  }

  private createBrokenDoorTexture() {
    if (
      this.textures.exists(
        "broken-train-door"
      )
    ) {
      this.textures.remove(
        "broken-train-door"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xdc2626);
    graphics.fillRoundedRect(
      4,
      2,
      72,
      116,
      6
    );

    graphics.lineStyle(
      5,
      0x7f1d1d
    );

    graphics.strokeRoundedRect(
      4,
      2,
      72,
      116,
      6
    );

    graphics.fillStyle(0xbfe8ff);
    graphics.fillRoundedRect(
      15,
      12,
      50,
      42,
      4
    );

    graphics.lineStyle(
      4,
      0xffffff
    );

    graphics.beginPath();
    graphics.moveTo(40, 58);
    graphics.lineTo(40, 108);
    graphics.strokePath();

    graphics.fillStyle(0xfacc15);
    graphics.fillTriangle(
      16,
      70,
      30,
      96,
      2,
      96
    );

    graphics.fillStyle(0x111827);
    graphics.fillRect(
      14,
      82,
      4,
      8
    );

    graphics.fillCircle(
      16,
      94,
      2
    );

    graphics.generateTexture(
      "broken-train-door",
      80,
      120
    );

    graphics.destroy();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: "app",
  backgroundColor: "#87ceeb",

  physics: {
    default: "arcade",

    arcade: {
      gravity: {
        x: 0,
        y: 900,
      },

      debug: false,
    },
  },

  scene: [
    ApartmentScene,
    MetroScene,
    SchoolScene,
    BunScene,
    TrainHomeScene,
  ],
};

new Phaser.Game(config);
