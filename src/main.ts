import Phaser from "phaser";
import "./style.css";

type ArcadeCollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

type JasminPose = "idle" | "walk1" | "walk2" | "jump";

class GameScene extends Phaser.Scene {
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
    super("GameScene");
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

    if (this.gameOver || this.levelComplete) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
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

    this.add
      .text(
        480,
        410,
        "Press R to replay Level 1",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
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

  scene: GameScene,
};

new Phaser.Game(config);