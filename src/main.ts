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
        this.scene.start("BicycleScene");
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

    const bicycleButton = this.add
      .rectangle(
        480,
        405,
        350,
        62,
        0x16a34a
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({
        useHandCursor: true,
      });

    const bicycleButtonText = this.add
      .text(
        480,
        405,
        "CONTINUE TO BICYCLE",
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
        "Click · Enter · Space     |     R replay train",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    bicycleButton.on("pointerover", () => {
      bicycleButton.setFillStyle(0x15803d);
      bicycleButton.setScale(1.03);
      bicycleButtonText.setScale(1.03);
    });

    bicycleButton.on("pointerout", () => {
      bicycleButton.setFillStyle(0x16a34a);
      bicycleButton.setScale(1);
      bicycleButtonText.setScale(1);
    });

    bicycleButton.on("pointerdown", () => {
      this.scene.start("BicycleScene");
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


class BicycleScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private bicycle!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private roadObstacles!: Phaser.Physics.Arcade.StaticGroup;
  private homeDoor!: Phaser.Physics.Arcade.Image;

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
  private urgencySpeed = 4.4;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private levelComplete = false;
  private bicycleCollected = false;
  private homeWarningActive = false;

  private triggeredObstacles = new Set<string>();

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private currentMoveSpeed = 225;
  private currentJumpVelocity = -435;

  private readonly normalMoveSpeed = 225;
  private readonly bicycleMoveSpeed = 390;
  private readonly normalJumpVelocity = -435;
  private readonly bicycleJumpVelocity = -500;

  private readonly gameHeight = 540;
  private readonly worldWidth = 3800;

  constructor() {
    super("BicycleScene");
  }

  create() {
    this.physics.world.resume();

    this.cameras.main.setBackgroundColor("#bfdbfe");

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
    this.urgencySpeed = 4.4;

    this.currentMoveSpeed =
      this.normalMoveSpeed;

    this.currentJumpVelocity =
      this.normalJumpVelocity;

    this.gameStarted = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.bicycleCollected = false;
    this.homeWarningActive = false;

    this.triggeredObstacles.clear();

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createBicycleTextures();
    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.createBicycle();
    this.createObstacles();
    this.createHomeDoor();
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
        this.startBicycleLevel();
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
        this.scene.start("StairsScene");
      }

      return;
    }

    this.updatePlayerMovement();
    this.updatePlayerAppearance(time);
    this.updateBicyclePosition();
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
      .text(480, 90, "LEVEL 6", {
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
        "BICYCLE RIDE HOME",
        {
          fontFamily: "Arial",
          fontSize: "48px",
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
        "OBJECTIVE: FIND A BICYCLE",
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
        "Find the BikeBnD community bike, then race through the city.",
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
        0x16a34a
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
        "START THE RIDE",
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
      button.setFillStyle(0x15803d);
      button.setScale(1.03);
      buttonText.setScale(1.03);
    });

    button.on("pointerout", () => {
      button.setFillStyle(0x16a34a);
      button.setScale(1);
      buttonText.setScale(1);
    });

    button.on("pointerdown", () => {
      this.startBicycleLevel();
    });

    this.events.once("start-bicycle", () => {
      objects.forEach((object) => {
        if (object.active) {
          object.destroy();
        }
      });
    });
  }

  private startBicycleLevel() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-bicycle");

    this.cameras.main.flash(
      250,
      255,
      255,
      255
    );

    this.showMessage(
      "NO TRAIN? NO PROBLEM!",
      "Find a bicycle and keep moving.",
      0x16a34a
    );
  }

  private createBackground() {
    this.add
      .rectangle(
        this.worldWidth / 2,
        250,
        this.worldWidth,
        500,
        0xbfdbfe
      )
      .setDepth(-10);

    this.add
      .rectangle(
        this.worldWidth / 2,
        455,
        this.worldWidth,
        110,
        0x64748b
      )
      .setDepth(-9);

    this.add
      .rectangle(
        this.worldWidth / 2,
        505,
        this.worldWidth,
        18,
        0xfacc15
      )
      .setDepth(-8);

    for (
      let x = 0;
      x < this.worldWidth;
      x += 380
    ) {
      this.add
        .rectangle(
          x + 190,
          300,
          240,
          250,
          x % 760 === 0
            ? 0xf8fafc
            : 0xe2e8f0
        )
        .setStrokeStyle(
          7,
          0x64748b
        )
        .setDepth(-6);

      for (
        let windowX = -70;
        windowX <= 70;
        windowX += 70
      ) {
        this.add
          .rectangle(
            x + 190 + windowX,
            265,
            38,
            55,
            0x93c5fd
          )
          .setStrokeStyle(
            3,
            0x475569
          )
          .setDepth(-5);

        this.add
          .rectangle(
            x + 190 + windowX,
            350,
            38,
            55,
            0x93c5fd
          )
          .setStrokeStyle(
            3,
            0x475569
          )
          .setDepth(-5);
      }
    }

    this.add
      .text(
        170,
        150,
        "TRAIN BREAKDOWN",
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
        1000,
        150,
        "CITY CENTER",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#1e3a8a",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2100,
        150,
        "BIKE LANE",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        3150,
        150,
        "ALMOST HOME",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#7c3aed",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        3650,
        150,
        "HOME",
        {
          fontFamily: "Arial",
          fontSize: "32px",
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

    this.createPlatform(430, 415, 3);
    this.createPlatform(700, 350, 3);
    this.createPlatform(980, 410, 4);

    this.createPlatform(1260, 360, 3);
    this.createPlatform(1510, 300, 3);
    this.createPlatform(1770, 390, 3);

    this.createPlatform(2030, 340, 4);
    this.createPlatform(2310, 285, 3);
    this.createPlatform(2580, 390, 4);

    this.createPlatform(2860, 335, 3);
    this.createPlatform(3140, 390, 3);
    this.createPlatform(3390, 335, 3);

    this.add
      .text(
        100,
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
        1470,
        455,
        "Traffic has no sympathy.",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2760,
        455,
        "Pedal faster!",
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
    this.player.setDepth(6);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createBicycle() {
    this.bicycle =
      this.physics.add.sprite(
        520,
        449,
        "city-bicycle"
      );

    this.bicycle.setDepth(5);
    this.bicycle.setImmovable(true);

    const bicycleBody =
      this.bicycle.body as Phaser.Physics.Arcade.Body;

    bicycleBody.setAllowGravity(false);

    this.physics.add.overlap(
      this.player,
      this.bicycle,
      this.collectBicycle,
      undefined,
      this
    );

    this.add
      .text(
        520,
        370,
        "BikeBnD COMMUNITY BIKE",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.bicycle,
      y: 440,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private collectBicycle(
    _playerObject: ArcadeCollisionObject,
    bicycleObject: ArcadeCollisionObject
  ) {
    if (
      this.bicycleCollected ||
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    const bicycle =
      bicycleObject as Phaser.Physics.Arcade.Sprite;

    this.bicycleCollected = true;

    this.tweens.killTweensOf(bicycle);

    const collectedBicycleBody =
      bicycle.body as Phaser.Physics.Arcade.Body;

    collectedBicycleBody.enable = false;

    this.currentMoveSpeed =
      this.bicycleMoveSpeed;

    this.currentJumpVelocity =
      this.bicycleJumpVelocity;

    this.urgencySpeed = 5.2;

    this.objectiveText.setText(
      "OBJECTIVE: RIDE HOME"
    );

    this.player.setScale(1.05);
    this.player.setTint(0x86efac);

    this.cameras.main.flash(
      250,
      120,
      255,
      120
    );

    this.cameras.main.shake(
      220,
      0.005
    );

    this.showMessage(
      "BIKEBND BIKE FOUND!",
      "Community bike unlocked. Faster speed and higher jumps.",
      0x16a34a
    );
  }

  private updateBicyclePosition() {
    if (!this.bicycleCollected) {
      return;
    }

    this.bicycle.setVisible(true);

    const direction =
      this.player.flipX
        ? -1
        : 1;

    this.bicycle.setFlipX(
      this.player.flipX
    );

    this.bicycle.setPosition(
      this.player.x +
        direction * 2,
      this.player.y + 25
    );
  }

  private createObstacles() {
    this.roadObstacles =
      this.physics.add.staticGroup();

    const data = [
      {
        x: 950,
        y: 454,
        key: "road-cone",
        id: "cone",
        label: "ROAD CONE",
        message:
          "A cone protects absolutely nothing.",
      },
      {
        x: 1370,
        y: 449,
        key: "road-puddle",
        id: "puddle",
        label: "PUDDLE",
        message:
          "Munich weather says hello.",
      },
      {
        x: 1880,
        y: 445,
        key: "road-box",
        id: "box",
        label: "BOX",
        message:
          "A delivery chose the bike lane.",
      },
      {
        x: 2380,
        y: 447,
        key: "road-dog",
        id: "dog",
        label: "DOG",
        message:
          "The dog has urgent plans too.",
      },
      {
        x: 2940,
        y: 447,
        key: "road-scooter",
        id: "scooter",
        label: "SCOOTER",
        message:
          "A scooter lies exactly where expected.",
      },
    ];

    data.forEach((item) => {
      const obstacle =
        this.roadObstacles
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
          item.y - 64,
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
      this.roadObstacles,
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

    this.addUrgency(
      this.bicycleCollected
        ? 6
        : 4
    );

    this.player.setVelocityX(-330);
    this.player.setVelocityY(-185);

    this.cameras.main.shake(
      230,
      0.009
    );

    this.cameras.main.flash(
      130,
      255,
      80,
      80
    );

    this.showMessage(
      message,
      this.bicycleCollected
        ? "+6% TOILET URGENCY"
        : "+4% TOILET URGENCY",
      0xb91c1c
    );
  }

  private createHomeDoor() {
    this.homeDoor =
      this.physics.add.staticImage(
        3650,
        416,
        "home-door"
      );

    this.homeDoor.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.homeDoor,
      this.reachHome,
      undefined,
      this
    );

    this.add
      .text(
        3650,
        300,
        "HOME",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private reachHome() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    if (!this.bicycleCollected) {
      if (this.homeWarningActive) {
        return;
      }

      this.homeWarningActive = true;

      this.showMessage(
        "Too far to walk!",
        "Go back and take the bicycle.",
        0xdc2626
      );

      this.time.delayedCall(1500, () => {
        this.homeWarningActive = false;
      });

      return;
    }

    this.completeLevel();
  }

  private completeLevel() {
    this.levelComplete = true;

    this.objectiveText.setText(
      "LEVEL 6 COMPLETE"
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
        "LEVEL 6 COMPLETE",
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
        "Jasmin cycled all the way home.",
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
        "NEXT: CLIMB THE STAIRS",
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

    const stairsButton = this.add
      .rectangle(
        480,
        405,
        360,
        62,
        0x7c3aed
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({
        useHandCursor: true,
      });

    const stairsButtonText = this.add
      .text(
        480,
        405,
        "CONTINUE TO THE STAIRS",
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
        "Click · Enter · Space     |     R replay bicycle",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    stairsButton.on("pointerover", () => {
      stairsButton.setFillStyle(0x6d28d9);
      stairsButton.setScale(1.03);
      stairsButtonText.setScale(1.03);
    });

    stairsButton.on("pointerout", () => {
      stairsButton.setFillStyle(0x7c3aed);
      stairsButton.setScale(1);
      stairsButtonText.setScale(1);
    });

    stairsButton.on("pointerdown", () => {
      this.scene.start("StairsScene");
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
        "OBJECTIVE: FIND A BICYCLE",
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
        110
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
        "The bicycle ride took too long.",
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
        "Press R to restart the bicycle level",
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

  private createBicycleTextures() {
    this.createCityBicycleTexture();
    this.createConeTexture();
    this.createPuddleTexture();
    this.createBoxTexture();
    this.createDogTexture();
    this.createScooterTexture();
    this.createHomeDoorTexture();
  }

  private createCityBicycleTexture() {
    if (
      this.textures.exists(
        "city-bicycle"
      )
    ) {
      this.textures.remove(
        "city-bicycle"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.lineStyle(
      5,
      0x111827
    );

    graphics.strokeCircle(
      18,
      44,
      15
    );

    graphics.strokeCircle(
      65,
      44,
      15
    );

    graphics.lineStyle(
      5,
      0x16a34a
    );

    graphics.beginPath();
    graphics.moveTo(18, 44);
    graphics.lineTo(35, 22);
    graphics.lineTo(48, 44);
    graphics.lineTo(18, 44);
    graphics.lineTo(42, 44);
    graphics.lineTo(58, 20);
    graphics.lineTo(65, 44);
    graphics.strokePath();

    graphics.lineStyle(
      4,
      0x111827
    );

    graphics.beginPath();
    graphics.moveTo(32, 19);
    graphics.lineTo(43, 19);
    graphics.moveTo(56, 18);
    graphics.lineTo(68, 13);
    graphics.strokePath();

    graphics.fillStyle(0xfacc15);
    graphics.fillCircle(
      42,
      44,
      5
    );

    graphics.generateTexture(
      "city-bicycle",
      84,
      64
    );

    graphics.destroy();
  }

  private createConeTexture() {
    if (
      this.textures.exists(
        "road-cone"
      )
    ) {
      this.textures.remove(
        "road-cone"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xf97316);
    graphics.fillTriangle(
      28,
      4,
      8,
      58,
      48,
      58
    );

    graphics.fillStyle(0xffffff);
    graphics.fillRect(
      14,
      33,
      28,
      8
    );

    graphics.fillStyle(0x9a3412);
    graphics.fillRoundedRect(
      3,
      55,
      50,
      10,
      3
    );

    graphics.generateTexture(
      "road-cone",
      56,
      68
    );

    graphics.destroy();
  }

  private createPuddleTexture() {
    if (
      this.textures.exists(
        "road-puddle"
      )
    ) {
      this.textures.remove(
        "road-puddle"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(
      0x38bdf8,
      0.75
    );

    graphics.fillEllipse(
      40,
      20,
      76,
      30
    );

    graphics.fillCircle(
      15,
      14,
      8
    );

    graphics.fillCircle(
      64,
      16,
      10
    );

    graphics.generateTexture(
      "road-puddle",
      82,
      42
    );

    graphics.destroy();
  }

  private createBoxTexture() {
    if (
      this.textures.exists(
        "road-box"
      )
    ) {
      this.textures.remove(
        "road-box"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xb45309);
    graphics.fillRoundedRect(
      5,
      5,
      62,
      58,
      5
    );

    graphics.lineStyle(
      4,
      0x78350f
    );

    graphics.strokeRoundedRect(
      5,
      5,
      62,
      58,
      5
    );

    graphics.beginPath();
    graphics.moveTo(36, 5);
    graphics.lineTo(36, 63);
    graphics.moveTo(5, 25);
    graphics.lineTo(67, 25);
    graphics.strokePath();

    graphics.fillStyle(0xfef3c7);
    graphics.fillRect(
      20,
      32,
      32,
      13
    );

    graphics.generateTexture(
      "road-box",
      72,
      68
    );

    graphics.destroy();
  }

  private createDogTexture() {
    if (
      this.textures.exists(
        "road-dog"
      )
    ) {
      this.textures.remove(
        "road-dog"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0x92400e);
    graphics.fillEllipse(
      37,
      36,
      52,
      28
    );

    graphics.fillCircle(
      62,
      27,
      15
    );

    graphics.fillTriangle(
      52,
      16,
      58,
      4,
      63,
      18
    );

    graphics.fillTriangle(
      66,
      16,
      76,
      7,
      73,
      22
    );

    graphics.lineStyle(
      6,
      0x78350f
    );

    graphics.beginPath();
    graphics.moveTo(19, 45);
    graphics.lineTo(16, 65);
    graphics.moveTo(34, 46);
    graphics.lineTo(32, 65);
    graphics.moveTo(50, 45);
    graphics.lineTo(49, 65);
    graphics.moveTo(64, 41);
    graphics.lineTo(67, 62);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillCircle(
      67,
      26,
      2
    );

    graphics.fillCircle(
      76,
      31,
      3
    );

    graphics.lineStyle(
      4,
      0x92400e
    );

    graphics.beginPath();
    graphics.moveTo(12, 35);
    graphics.lineTo(2, 24);
    graphics.strokePath();

    graphics.generateTexture(
      "road-dog",
      82,
      70
    );

    graphics.destroy();
  }

  private createScooterTexture() {
    if (
      this.textures.exists(
        "road-scooter"
      )
    ) {
      this.textures.remove(
        "road-scooter"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.lineStyle(
      5,
      0x111827
    );

    graphics.strokeCircle(
      18,
      55,
      10
    );

    graphics.strokeCircle(
      60,
      55,
      10
    );

    graphics.lineStyle(
      6,
      0x7c3aed
    );

    graphics.beginPath();
    graphics.moveTo(18, 48);
    graphics.lineTo(53, 48);
    graphics.lineTo(58, 15);
    graphics.lineTo(70, 15);
    graphics.strokePath();

    graphics.fillStyle(0x7c3aed);
    graphics.fillRoundedRect(
      20,
      42,
      35,
      9,
      3
    );

    graphics.generateTexture(
      "road-scooter",
      80,
      68
    );

    graphics.destroy();
  }

  private createHomeDoorTexture() {
    if (
      this.textures.exists(
        "home-door"
      )
    ) {
      this.textures.remove(
        "home-door"
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
      "home-door",
      80,
      120
    );

    graphics.destroy();
  }
}


class StairsScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private stairObstacles!: Phaser.Physics.Arcade.StaticGroup;
  private apartmentDoor!: Phaser.Physics.Arcade.Image;

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
  private urgencySpeed = 4.6;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private levelComplete = false;

  private triggeredObstacles = new Set<string>();

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private readonly gameHeight = 540;
  private readonly worldWidth = 2700;
  private readonly moveSpeed = 225;
  private readonly jumpVelocity = -445;

  constructor() {
    super("StairsScene");
  }

  create() {
    this.physics.world.resume();

    this.cameras.main.setBackgroundColor("#f5f3ff");

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
    this.urgencySpeed = 4.6;

    this.gameStarted = false;
    this.gameOver = false;
    this.levelComplete = false;

    this.triggeredObstacles.clear();

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createStairsTextures();
    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.createObstacles();
    this.createApartmentDoor();
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
        this.startStairsLevel();
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
        this.scene.start("FinalApartmentScene");
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
      .text(480, 90, "LEVEL 7", {
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
        "THE FINAL STAIRS",
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
        "OBJECTIVE: REACH THE APARTMENT",
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
        "Get past the strollers, cat and dog.",
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
        "ENTER THE BUILDING",
        {
          fontFamily: "Arial",
          fontSize: "25px",
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
      this.startStairsLevel();
    });

    this.events.once("start-stairs", () => {
      objects.forEach((object) => {
        if (object.active) {
          object.destroy();
        }
      });
    });
  }

  private startStairsLevel() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-stairs");

    this.cameras.main.flash(
      250,
      255,
      255,
      255
    );

    this.showMessage(
      "HOME AT LAST!",
      "Two floors and one final door.",
      0x7c3aed
    );
  }

  private createBackground() {
    this.add
      .rectangle(
        this.worldWidth / 2,
        250,
        this.worldWidth,
        500,
        0xf5f3ff
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
      x += 240
    ) {
      this.add
        .rectangle(
          x + 120,
          300,
          210,
          270,
          x % 480 === 0
            ? 0xede9fe
            : 0xf8fafc
        )
        .setStrokeStyle(
          7,
          0x64748b
        )
        .setDepth(-6);
    }

    this.add
      .text(
        180,
        150,
        "BUILDING ENTRANCE",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#334155",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1050,
        150,
        "FLOOR 1",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#7c3aed",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1850,
        150,
        "FLOOR 2",
        {
          fontFamily: "Arial",
          fontSize: "29px",
          color: "#7c3aed",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2520,
        150,
        "APARTMENT",
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

    const stairs = [
      [480, 420, 2],
      [640, 370, 2],
      [800, 320, 2],
      [960, 270, 2],

      [1220, 390, 3],
      [1400, 340, 2],
      [1560, 290, 2],
      [1720, 240, 2],

      [1980, 390, 3],
      [2160, 340, 2],
      [2320, 290, 2],
    ];

    stairs.forEach(([x, y, scale]) => {
      this.createPlatform(x, y, scale);
    });

    this.add
      .text(
        100,
        470,
        "ENTRANCE",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1110,
        455,
        "The cat owns this floor.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1890,
        455,
        "The white dog is watching.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        2420,
        455,
        "One final door!",
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
    this.player.setDepth(6);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createObstacles() {
    this.stairObstacles =
      this.physics.add.staticGroup();

    const data = [
      {
        x: 300,
        y: 448,
        key: "stairs-stroller-purple",
        id: "stroller-1",
        label: "STROLLER",
        message:
          "One stroller blocks half the entrance.",
      },
      {
        x: 430,
        y: 448,
        key: "stairs-stroller-blue",
        id: "stroller-2",
        label: "STROLLER",
        message:
          "The second stroller blocks the other half.",
      },
      {
        x: 1110,
        y: 452,
        key: "stairs-cat",
        id: "cat",
        label: "CAT",
        message:
          "The cat refuses to move.",
      },
      {
        x: 1900,
        y: 446,
        key: "stairs-white-dog",
        id: "white-dog",
        label: "WHITE DOG",
        message:
          "The white dog wants to say hello.",
      },
    ];

    data.forEach((item) => {
      const obstacle =
        this.stairObstacles
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
          item.y - 68,
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
      this.stairObstacles,
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
    this.player.setVelocityY(-180);

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

  private createApartmentDoor() {
    this.apartmentDoor =
      this.physics.add.staticImage(
        2520,
        416,
        "apartment-door"
      );

    this.apartmentDoor.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.apartmentDoor,
      this.reachApartment,
      undefined,
      this
    );

    this.add
      .text(
        2520,
        300,
        "JASMIN'S APARTMENT",
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private reachApartment() {
    if (
      this.gameOver ||
      this.levelComplete
    ) {
      return;
    }

    this.completeLevel();
  }

  private completeLevel() {
    this.levelComplete = true;

    this.objectiveText.setText(
      "LEVEL 7 COMPLETE"
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
        "LEVEL 7 COMPLETE",
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
        "Jasmin reached her apartment.",
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
        "FINAL LEVEL: THE TOILET",
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

    const finalButton = this.add
      .rectangle(
        480,
        405,
        370,
        62,
        0xf59e0b
      )
      .setStrokeStyle(4, 0xffffff)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({
        useHandCursor: true,
      });

    const finalButtonText = this.add
      .text(
        480,
        405,
        "ENTER KETTENSTOCK",
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
        "Click · Enter · Space     |     R replay stairs",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);

    finalButton.on("pointerover", () => {
      finalButton.setFillStyle(0xd97706);
      finalButton.setScale(1.03);
      finalButtonText.setScale(1.03);
    });

    finalButton.on("pointerout", () => {
      finalButton.setFillStyle(0xf59e0b);
      finalButton.setScale(1);
      finalButtonText.setScale(1);
    });

    finalButton.on("pointerdown", () => {
      this.scene.start("FinalApartmentScene");
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
        "OBJECTIVE: REACH THE APARTMENT",
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
        "The stairs were stronger than Jasmin.",
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
        "Press R to restart the stairs level",
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

  private createStairsTextures() {
    this.createStrollerTexture(
      "stairs-stroller-purple",
      0x7c3aed
    );

    this.createStrollerTexture(
      "stairs-stroller-blue",
      0x2563eb
    );

    this.createCatTexture();
    this.createWhiteDogTexture();
    this.createApartmentDoorTexture();
  }

  private createStrollerTexture(
    textureKey: string,
    bodyColor: number
  ) {
    if (
      this.textures.exists(textureKey)
    ) {
      this.textures.remove(textureKey);
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(bodyColor);
    graphics.fillRoundedRect(
      12,
      22,
      54,
      35,
      10
    );

    graphics.fillStyle(0xc4b5fd);
    graphics.fillTriangle(
      16,
      24,
      42,
      4,
      59,
      24
    );

    graphics.lineStyle(
      5,
      0x334155
    );

    graphics.beginPath();
    graphics.moveTo(58, 24);
    graphics.lineTo(73, 7);
    graphics.lineTo(82, 7);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillCircle(
      24,
      64,
      10
    );

    graphics.fillCircle(
      59,
      64,
      10
    );

    graphics.fillStyle(0x94a3b8);
    graphics.fillCircle(
      24,
      64,
      4
    );

    graphics.fillCircle(
      59,
      64,
      4
    );

    graphics.generateTexture(
      textureKey,
      88,
      76
    );

    graphics.destroy();
  }

  private createCatTexture() {
    if (
      this.textures.exists(
        "stairs-cat"
      )
    ) {
      this.textures.remove(
        "stairs-cat"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xf59e0b);
    graphics.fillEllipse(
      36,
      42,
      52,
      30
    );

    graphics.fillCircle(
      62,
      30,
      16
    );

    graphics.fillTriangle(
      51,
      20,
      55,
      6,
      63,
      20
    );

    graphics.fillTriangle(
      64,
      19,
      74,
      7,
      76,
      24
    );

    graphics.lineStyle(
      5,
      0xd97706
    );

    graphics.beginPath();
    graphics.moveTo(14, 41);
    graphics.lineTo(3, 30);
    graphics.lineTo(7, 18);
    graphics.strokePath();

    graphics.lineStyle(
      5,
      0x92400e
    );

    graphics.beginPath();
    graphics.moveTo(24, 51);
    graphics.lineTo(22, 68);
    graphics.moveTo(48, 51);
    graphics.lineTo(49, 68);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillCircle(
      58,
      29,
      2
    );

    graphics.fillCircle(
      68,
      29,
      2
    );

    graphics.fillStyle(0xf472b6);
    graphics.fillTriangle(
      61,
      34,
      65,
      34,
      63,
      38
    );

    graphics.generateTexture(
      "stairs-cat",
      82,
      72
    );

    graphics.destroy();
  }

  private createWhiteDogTexture() {
    if (
      this.textures.exists(
        "stairs-white-dog"
      )
    ) {
      this.textures.remove(
        "stairs-white-dog"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(0xf8fafc);
    graphics.fillEllipse(
      37,
      39,
      54,
      31
    );

    graphics.fillCircle(
      64,
      27,
      17
    );

    graphics.fillStyle(0xe2e8f0);
    graphics.fillTriangle(
      53,
      17,
      57,
      3,
      64,
      18
    );

    graphics.fillTriangle(
      67,
      17,
      78,
      6,
      76,
      23
    );

    graphics.lineStyle(
      6,
      0xcbd5e1
    );

    graphics.beginPath();
    graphics.moveTo(20, 49);
    graphics.lineTo(18, 68);
    graphics.moveTo(35, 50);
    graphics.lineTo(34, 68);
    graphics.moveTo(51, 49);
    graphics.lineTo(51, 68);
    graphics.moveTo(64, 45);
    graphics.lineTo(67, 66);
    graphics.strokePath();

    graphics.lineStyle(
      4,
      0xf8fafc
    );

    graphics.beginPath();
    graphics.moveTo(12, 38);
    graphics.lineTo(2, 26);
    graphics.strokePath();

    graphics.fillStyle(0x111827);
    graphics.fillCircle(
      61,
      26,
      2
    );

    graphics.fillCircle(
      72,
      31,
      3
    );

    graphics.generateTexture(
      "stairs-white-dog",
      84,
      72
    );

    graphics.destroy();
  }

  private createApartmentDoorTexture() {
    if (
      this.textures.exists(
        "apartment-door"
      )
    ) {
      this.textures.remove(
        "apartment-door"
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

    graphics.fillStyle(0x7c3aed);
    graphics.fillCircle(
      40,
      32,
      8
    );

    graphics.generateTexture(
      "apartment-door",
      80,
      120
    );

    graphics.destroy();
  }
}


class FinalApartmentScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coatSpot!: Phaser.Physics.Arcade.Image;
  private toilet!: Phaser.Physics.Arcade.Image;

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
  private urgencySpeed = 6.5;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;

  private gameStarted = false;
  private gameOver = false;
  private finaleStarted = false;
  private clothesRemoved = false;
  private toiletWarningActive = false;

  private currentPlayerTexture = "jasmin-idle";
  private walkFrame = 0;
  private lastWalkFrameSwitch = 0;

  private readonly gameHeight = 540;
  private readonly worldWidth = 1500;
  private readonly moveSpeed = 240;
  private readonly jumpVelocity = -455;

  constructor() {
    super("FinalApartmentScene");
  }

  create() {
    this.physics.world.resume();

    this.cameras.main.setBackgroundColor("#fde68a");

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
    this.urgencySpeed = 6.5;

    this.gameStarted = false;
    this.gameOver = false;
    this.finaleStarted = false;
    this.clothesRemoved = false;
    this.toiletWarningActive = false;

    this.currentPlayerTexture = "jasmin-idle";
    this.walkFrame = 0;
    this.lastWalkFrameSwitch = 0;

    this.createFinalTextures();
    this.createBackground();
    this.createLevel();
    this.createPlayer();
    this.createCoatSpot();
    this.createToilet();
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
        this.startFinalLevel();
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

    if (this.finaleStarted) {
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
        0.92
      )
      .setScrollFactor(0)
      .setDepth(100);

    const levelText = this.add
      .text(
        480,
        88,
        "FINAL LEVEL",
        {
          fontFamily: "Arial",
          fontSize: "21px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const title = this.add
      .text(
        480,
        148,
        "KETTENSTOCK APARTMENT",
        {
          fontFamily: "Arial",
          fontSize: "43px",
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
        "OBJECTIVE: REACH THE TOILET",
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
        "Drop the outer clothes, then make the final jump.",
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
        "FINAL SPRINT",
        {
          fontFamily: "Arial",
          fontSize: "28px",
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
      this.startFinalLevel();
    });

    this.events.once("start-final", () => {
      objects.forEach((object) => {
        if (object.active) {
          object.destroy();
        }
      });
    });
  }

  private startFinalLevel() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;
    this.events.emit("start-final");

    this.cameras.main.flash(
      250,
      255,
      255,
      255
    );

    this.showMessage(
      "THE FINAL SPRINT!",
      "Nothing can stop Jasmin now.",
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
        170,
        150,
        "KETTENSTOCK",
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
        470,
        350,
        260,
        210,
        0xf8fafc
      )
      .setStrokeStyle(
        8,
        0x64748b
      )
      .setDepth(-3);

    this.add
      .text(
        470,
        215,
        "ENTRANCE HALL",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#334155",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .rectangle(
        890,
        380,
        250,
        105,
        0x38bdf8
      )
      .setStrokeStyle(
        6,
        0x0369a1
      )
      .setDepth(-3);

    this.add
      .text(
        890,
        380,
        "SOFA — IGNORE IT",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.add
      .rectangle(
        1260,
        335,
        260,
        225,
        0xe0f2fe
      )
      .setStrokeStyle(
        8,
        0x64748b
      )
      .setDepth(-3);

    this.add
      .text(
        1260,
        190,
        "BATHROOM",
        {
          fontFamily: "Arial",
          fontSize: "28px",
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

    this.createPlatform(
      560,
      390,
      3
    );

    this.createPlatform(
      840,
      340,
      3
    );

    this.createPlatform(
      1080,
      395,
      3
    );

    this.createPlatform(
      1260,
      335,
      2
    );

    this.add
      .text(
        90,
        470,
        "HOME",
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
        780,
        455,
        "No distractions. No delays.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#475569",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        1160,
        455,
        "FINAL JUMP!",
        {
          fontFamily: "Arial",
          fontSize: "21px",
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
    this.player.setDepth(6);

    this.physics.add.collider(
      this.player,
      this.platforms
    );

    const body =
      this.player.body as Phaser.Physics.Arcade.Body;

    body.setSize(30, 60);
    body.setOffset(13, 12);
  }

  private createCoatSpot() {
    this.coatSpot =
      this.physics.add.staticImage(
        520,
        438,
        "coat-rack"
      );

    this.coatSpot.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.coatSpot,
      this.removeOuterClothes,
      undefined,
      this
    );

    this.add
      .text(
        520,
        355,
        "DROP OUTER CLOTHES",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#7c3aed",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);
  }

  private removeOuterClothes(
    _playerObject: ArcadeCollisionObject,
    coatObject: ArcadeCollisionObject
  ) {
    if (
      this.clothesRemoved ||
      this.gameOver ||
      this.finaleStarted
    ) {
      return;
    }

    const coatSpot =
      coatObject as Phaser.Physics.Arcade.Image;

    this.clothesRemoved = true;

    coatSpot.disableBody(
      true,
      true
    );

    this.objectiveText.setText(
      "OBJECTIVE: JUMP ON THE TOILET"
    );

    this.player.setTint(
      0xf9a8d4
    );

    const clothesPile =
      this.add.image(
        555,
        465,
        "clothes-pile"
      );

    clothesPile.setDepth(4);

    this.cameras.main.flash(
      180,
      255,
      200,
      230
    );

    this.showMessage(
      "OUTER CLOTHES OFF!",
      "The final route is clear.",
      0xdb2777
    );
  }

  private createToilet() {
    this.toilet =
      this.physics.add.staticImage(
        1280,
        420,
        "final-toilet"
      );

    this.toilet.setDepth(4);

    this.physics.add.overlap(
      this.player,
      this.toilet,
      this.reachToilet,
      undefined,
      this
    );

    this.add
      .text(
        1280,
        300,
        "THE TOILET",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#166534",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.toilet,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private reachToilet() {
    if (
      this.gameOver ||
      this.finaleStarted
    ) {
      return;
    }

    if (!this.clothesRemoved) {
      if (this.toiletWarningActive) {
        return;
      }

      this.toiletWarningActive = true;

      this.showMessage(
        "Too many layers!",
        "Drop the outer clothes first.",
        0xdc2626
      );

      this.time.delayedCall(
        1500,
        () => {
          this.toiletWarningActive = false;
        }
      );

      return;
    }

    this.startFinale();
  }

  private startFinale() {
    this.finaleStarted = true;

    this.player.setVelocity(
      0,
      0
    );

    this.physics.pause();

    this.objectiveText.setText(
      "MISSION COMPLETE"
    );

    this.urgency = 0;
    this.updateUrgencyDisplay();

    this.tweens.killTweensOf(
      this.toilet
    );

    this.player.setVisible(false);

    this.cameras.main.flash(
      700,
      255,
      255,
      255
    );

    this.cameras.main.shake(
      350,
      0.008
    );

    this.createCelebration();
  }

  private createCelebration() {
    const overlay = this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x020617,
        0.96
      )
      .setScrollFactor(0)
      .setDepth(100);

    const stars: Phaser.GameObjects.Arc[] = [];

    for (
      let index = 0;
      index < 90;
      index += 1
    ) {
      const star = this.add
        .circle(
          Phaser.Math.Between(
            0,
            960
          ),
          Phaser.Math.Between(
            0,
            540
          ),
          Phaser.Math.Between(
            1,
            3
          ),
          0xffffff,
          Phaser.Math.FloatBetween(
            0.45,
            1
          )
        )
        .setScrollFactor(0)
        .setDepth(101);

      stars.push(star);

      this.tweens.add({
        targets: star,
        alpha: {
          from: 0.25,
          to: 1,
        },
        duration:
          Phaser.Math.Between(
            500,
            1400
          ),
        yoyo: true,
        repeat: -1,
      });
    }

    const title = this.add
      .text(
        480,
        95,
        "JASMINITY COMPLETE!",
        {
          fontFamily: "Arial",
          fontSize: "48px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(105);

    const relief = this.add
      .text(
        480,
        158,
        "THE TOILET HAS BEEN REACHED",
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#86efac",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(105);

    const toilet = this.add
      .image(
        480,
        250,
        "final-toilet"
      )
      .setScale(1.5)
      .setScrollFactor(0)
      .setDepth(105);

    this.tweens.add({
      targets: toilet,
      angle: {
        from: -4,
        to: 4,
      },
      scaleX: {
        from: 1.45,
        to: 1.6,
      },
      scaleY: {
        from: 1.45,
        to: 1.6,
      },
      duration: 450,
      yoyo: true,
      repeat: 5,
    });

    const confettiColors = [
      0xfacc15,
      0x22c55e,
      0x3b82f6,
      0xec4899,
      0xa855f7,
      0xf97316,
    ];

    for (
      let index = 0;
      index < 80;
      index += 1
    ) {
      const confetti = this.add
        .rectangle(
          Phaser.Math.Between(
            60,
            900
          ),
          Phaser.Math.Between(
            -220,
            -20
          ),
          Phaser.Math.Between(
            5,
            11
          ),
          Phaser.Math.Between(
            10,
            22
          ),
          Phaser.Utils.Array.GetRandom(
            confettiColors
          )
        )
        .setScrollFactor(0)
        .setDepth(106);

      this.tweens.add({
        targets: confetti,
        y: Phaser.Math.Between(
          560,
          760
        ),
        angle:
          Phaser.Math.Between(
            -540,
            540
          ),
        duration:
          Phaser.Math.Between(
            2200,
            4200
          ),
        delay:
          Phaser.Math.Between(
            0,
            1800
          ),
        repeat: 1,
      });
    }

    const creditsText = [
      "A LONG DAY AGO,",
      "IN A CITY NOT SO FAR AWAY...",
      "",
      "JASMINITY",
      "",
      "Jasmin survived the alarm.",
      "She conquered the coffee.",
      "She caught the metro.",
      "She faced the school.",
      "She found the legendary bun.",
      "She escaped the broken train.",
      "She rode a BikeBnD community bike.",
      "She climbed past two strollers,",
      "a cat and one white dog.",
      "",
      "At last, in Kettenstock,",
      "the final toilet was reached.",
      "",
      "PEACE RETURNED TO THE GALAXY.",
      "",
      "THE END",
      "",
      "Created by Agamir",
      "Starring Jasmin",
      "Powered by Phaser.js",
      "Featuring BikeBnD",
    ].join("\n");

    const crawl = this.add
      .text(
        480,
        710,
        creditsText,
        {
          fontFamily: "Arial",
          fontSize: "26px",
          color: "#facc15",
          fontStyle: "bold",
          align: "center",
          lineSpacing: 12,
          wordWrap: {
            width: 700,
          },
        }
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(104);

    crawl.setScale(
      1,
      0.78
    );

    this.tweens.add({
      targets: crawl,
      y: -980,
      scaleX: 0.35,
      scaleY: 0.24,
      alpha: {
        from: 1,
        to: 0.65,
      },
      duration: 26000,
      ease: "Linear",
    });

    const replayButton = this.add
      .rectangle(
        480,
        485,
        290,
        54,
        0x7c3aed,
        0.95
      )
      .setStrokeStyle(
        3,
        0xffffff
      )
      .setScrollFactor(0)
      .setDepth(110)
      .setInteractive({
        useHandCursor: true,
      });

    const replayText = this.add
      .text(
        480,
        485,
        "PLAY AGAIN",
        {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111);

    replayButton.on(
      "pointerover",
      () => {
        replayButton.setFillStyle(
          0x6d28d9
        );

        replayButton.setScale(
          1.04
        );

        replayText.setScale(
          1.04
        );
      }
    );

    replayButton.on(
      "pointerout",
      () => {
        replayButton.setFillStyle(
          0x7c3aed
        );

        replayButton.setScale(
          1
        );

        replayText.setScale(
          1
        );
      }
    );

    replayButton.on(
      "pointerdown",
      () => {
        this.scene.start(
          "ApartmentScene"
        );
      }
    );

    this.time.delayedCall(
      2800,
      () => {
        title.destroy();
        relief.destroy();
        toilet.destroy();
      }
    );

    overlay.setInteractive();
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
      .text(
        20,
        16,
        "JASMINITY",
        {
          fontFamily: "Arial",
          fontSize: "26px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
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
        "OBJECTIVE: DROP OUTER CLOTHES",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#facc15",
          fontStyle: "bold",
        }
      )
      .setOrigin(
        0,
        0.5
      )
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
      .setStrokeStyle(
        3,
        0xffffff
      )
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
      .setOrigin(
        0,
        0.5
      )
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

  private updatePlayerAppearance(
    time: number
  ) {
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
      Math.abs(
        body.velocity.x
      ) > 10
    ) {
      if (
        time -
          this.lastWalkFrameSwitch >
        130
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

  private updateUrgency(
    delta: number
  ) {
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
    } else if (
      percentage < 0.8
    ) {
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

    this.time.delayedCall(
      1600,
      () => {
        titleText.destroy();
        subtitleText.destroy();
      }
    );
  }

  private showGameOver() {
    if (
      this.gameOver ||
      this.finaleStarted
    ) {
      return;
    }

    this.gameOver = true;

    this.objectiveText.setText(
      "OBJECTIVE FAILED"
    );

    this.player.setVelocity(
      0,
      0
    );

    this.physics.pause();

    this.add
      .rectangle(
        480,
        270,
        960,
        540,
        0x111827,
        0.86
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        480,
        210,
        "SO CLOSE!",
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
        "The final hallway took too long.",
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
        "Press R to restart the final level",
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

  private createFinalTextures() {
    this.createCoatRackTexture();
    this.createClothesPileTexture();
    this.createToiletTexture();
  }

  private createCoatRackTexture() {
    if (
      this.textures.exists(
        "coat-rack"
      )
    ) {
      this.textures.remove(
        "coat-rack"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.lineStyle(
      7,
      0x78350f
    );

    graphics.beginPath();
    graphics.moveTo(40, 5);
    graphics.lineTo(40, 72);
    graphics.moveTo(18, 72);
    graphics.lineTo(62, 72);
    graphics.moveTo(40, 16);
    graphics.lineTo(20, 29);
    graphics.moveTo(40, 16);
    graphics.lineTo(60, 29);
    graphics.strokePath();

    graphics.fillStyle(
      0x7c3aed
    );

    graphics.fillRoundedRect(
      15,
      27,
      28,
      42,
      7
    );

    graphics.fillStyle(
      0x2563eb
    );

    graphics.fillRoundedRect(
      42,
      27,
      25,
      37,
      7
    );

    graphics.generateTexture(
      "coat-rack",
      80,
      80
    );

    graphics.destroy();
  }

  private createClothesPileTexture() {
    if (
      this.textures.exists(
        "clothes-pile"
      )
    ) {
      this.textures.remove(
        "clothes-pile"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(
      0x7c3aed
    );

    graphics.fillEllipse(
      35,
      24,
      58,
      25
    );

    graphics.fillStyle(
      0x2563eb
    );

    graphics.fillEllipse(
      50,
      18,
      44,
      20
    );

    graphics.fillStyle(
      0xec4899
    );

    graphics.fillEllipse(
      22,
      15,
      34,
      18
    );

    graphics.generateTexture(
      "clothes-pile",
      76,
      42
    );

    graphics.destroy();
  }

  private createToiletTexture() {
    if (
      this.textures.exists(
        "final-toilet"
      )
    ) {
      this.textures.remove(
        "final-toilet"
      );
    }

    const graphics =
      this.add.graphics();

    graphics.fillStyle(
      0xffffff
    );

    graphics.fillRoundedRect(
      18,
      2,
      56,
      46,
      8
    );

    graphics.lineStyle(
      4,
      0x94a3b8
    );

    graphics.strokeRoundedRect(
      18,
      2,
      56,
      46,
      8
    );

    graphics.fillStyle(
      0xe0f2fe
    );

    graphics.fillEllipse(
      44,
      55,
      70,
      36
    );

    graphics.lineStyle(
      5,
      0x94a3b8
    );

    graphics.strokeEllipse(
      44,
      55,
      70,
      36
    );

    graphics.fillStyle(
      0xffffff
    );

    graphics.fillRoundedRect(
      22,
      61,
      45,
      28,
      10
    );

    graphics.fillRoundedRect(
      30,
      82,
      28,
      20,
      6
    );

    graphics.fillStyle(
      0x22c55e
    );

    graphics.fillCircle(
      62,
      18,
      5
    );

    graphics.generateTexture(
      "final-toilet",
      90,
      106
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
    BicycleScene,
    StairsScene,
    FinalApartmentScene,
  ],
};

new Phaser.Game(config);
