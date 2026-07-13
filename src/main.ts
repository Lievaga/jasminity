import Phaser from "phaser";
import "./style.css";

type ArcadeCollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  private restartKey!: Phaser.Input.Keyboard.Key;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coffee!: Phaser.Physics.Arcade.Image;
  private toilet!: Phaser.Physics.Arcade.Image;

  private urgency = 0;
  private urgencyMax = 100;
  private urgencySpeed = 4;

  private normalMoveSpeed = 220;
  private coffeeMoveSpeed = 360;
  private currentMoveSpeed = 220;

  private urgencyBar!: Phaser.GameObjects.Rectangle;
  private urgencyText!: Phaser.GameObjects.Text;

  private gameOver = false;
  private gameWon = false;
  private coffeeMode = false;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#87ceeb");

    this.urgency = 0;
    this.urgencySpeed = 4;
    this.currentMoveSpeed = this.normalMoveSpeed;

    this.gameOver = false;
    this.gameWon = false;
    this.coffeeMode = false;

    this.add
      .text(20, 20, "JASMINITY", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setDepth(10);

    this.add
      .text(480, 95, "Coffee first. Toilet later.", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#1f2937",
      })
      .setOrigin(0.5);

    this.createUrgencyBar();
    this.createPlayerTexture();
    this.createPlatformTexture();
    this.createCoffeeTexture();
    this.createToiletTexture();

    this.platforms = this.physics.add.staticGroup();

    this.platforms
      .create(480, 510, "platform")
      .setScale(24, 1)
      .refreshBody();

    this.platforms
      .create(310, 410, "platform")
      .setScale(4, 1)
      .refreshBody();

    this.platforms
      .create(525, 335, "platform")
      .setScale(4, 1)
      .refreshBody();

    this.platforms
      .create(730, 420, "platform")
      .setScale(3, 1)
      .refreshBody();

    this.player = this.physics.add.sprite(100, 440, "jasmin");

    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);

    this.physics.add.collider(this.player, this.platforms);

    this.coffee = this.physics.add.staticImage(525, 290, "coffee");

    this.physics.add.overlap(
      this.player,
      this.coffee,
      this.collectCoffee,
      undefined,
      this
    );

    this.toilet = this.physics.add.staticImage(890, 445, "toilet");

    this.physics.add.overlap(
      this.player,
      this.toilet,
      this.reachToilet,
      undefined,
      this
    );

    this.cursors = this.input.keyboard!.createCursorKeys();

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

    this.add
      .text(
        480,
        125,
        "A / D or arrows · Space / W / Up to jump",
        {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#1f2937",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(890, 380, "GOAL", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#1f2937",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number) {
    if (this.gameOver || this.gameWon) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }

      return;
    }

    this.updatePlayerMovement();
    this.updateUrgency(delta);
  }

  private updatePlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    const movingLeft =
      this.cursors.left.isDown || this.wasd.left.isDown;

    const movingRight =
      this.cursors.right.isDown || this.wasd.right.isDown;

    if (movingLeft) {
      this.player.setVelocityX(-this.currentMoveSpeed);
      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(this.currentMoveSpeed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const wantsToJump =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.wasd.up.isDown;

    if (wantsToJump && body.blocked.down) {
      this.player.setVelocityY(-430);
    }
  }

  private updateUrgency(delta: number) {
    this.urgency += this.urgencySpeed * (delta / 1000);

    if (this.urgency >= this.urgencyMax) {
      this.urgency = this.urgencyMax;

      this.updateUrgencyDisplay();
      this.showGameOver();

      return;
    }

    this.updateUrgencyDisplay();
  }

  private updateUrgencyDisplay() {
    const percentage = this.urgency / this.urgencyMax;

    this.urgencyBar.width = 300 * percentage;

    this.urgencyText.setText(
      `TOILET URGENCY: ${Math.floor(this.urgency)}%`
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
    if (this.coffeeMode || this.gameOver || this.gameWon) {
      return;
    }

    const coffee = coffeeObject as Phaser.Physics.Arcade.Image;

    coffee.disableBody(true, true);

    this.coffeeMode = true;
    this.currentMoveSpeed = this.coffeeMoveSpeed;
    this.urgencySpeed = 11;

    this.player.setTint(0xff7a00);
    this.player.setScale(1.15);

    const monsterText = this.add
      .text(480, 185, "COFFEE MONSTER MODE!", {
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
      .setDepth(30);

    const warningText = this.add
      .text(480, 235, "Faster Jasmin. Faster urgency.", {
        fontFamily: "Arial",
        fontSize: "19px",
        color: "#1f2937",
        backgroundColor: "#ffffff",

        padding: {
          x: 12,
          y: 6,
        },
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.cameras.main.shake(250, 0.006);

    this.time.delayedCall(6000, () => {
      if (this.gameOver || this.gameWon) {
        return;
      }

      this.coffeeMode = false;
      this.currentMoveSpeed = this.normalMoveSpeed;
      this.urgencySpeed = 4;

      this.player.clearTint();
      this.player.setScale(1);

      monsterText.destroy();
      warningText.destroy();

      const finishedText = this.add
        .text(480, 185, "Coffee mode finished.", {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#ffffff",
          backgroundColor: "#1f2937",

          padding: {
            x: 14,
            y: 8,
          },
        })
        .setOrigin(0.5)
        .setDepth(30);

      this.time.delayedCall(1500, () => {
        finishedText.destroy();
      });
    });
  }

  private reachToilet() {
    if (this.gameOver || this.gameWon) {
      return;
    }

    this.gameWon = true;
    this.urgency = 0;

    this.updateUrgencyDisplay();

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.cameras.main.flash(400, 255, 255, 255);

    this.add
      .rectangle(480, 270, 960, 540, 0x0f172a, 0.82)
      .setDepth(50);

    this.add
      .text(480, 190, "MISSION COMPLETE", {
        fontFamily: "Arial",
        fontSize: "54px",
        color: "#86efac",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(480, 270, "You survived another school day.", {
        fontFamily: "Arial",
        fontSize: "25px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(480, 325, "The toilet urgency is finally zero.", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#cbd5e1",
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(480, 390, "Press R to play again", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51);
  }

  private createUrgencyBar() {
    this.add
      .rectangle(480, 45, 310, 34, 0x111827)
      .setStrokeStyle(3, 0xffffff)
      .setDepth(20);

    this.urgencyBar = this.add
      .rectangle(330, 45, 0, 24, 0x22c55e)
      .setOrigin(0, 0.5)
      .setDepth(21);

    this.urgencyText = this.add
      .text(480, 45, "TOILET URGENCY: 0%", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(22);
  }

  private showGameOver() {
    this.gameOver = true;

    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.add
      .rectangle(480, 270, 960, 540, 0x111827, 0.75)
      .setDepth(50);

    this.add
      .text(480, 220, "TOO LATE!", {
        fontFamily: "Arial",
        fontSize: "58px",
        color: "#ff6b6b",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(480, 290, "Jasminity ran out of patience.", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(480, 350, "Press R to restart", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#facc15",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51);
  }

  private createPlayerTexture() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0xff69b4);
    graphics.fillRoundedRect(0, 0, 40, 60, 8);

    graphics.fillStyle(0xffffff);
    graphics.fillCircle(12, 18, 5);
    graphics.fillCircle(28, 18, 5);

    graphics.fillStyle(0x111827);
    graphics.fillCircle(12, 18, 2);
    graphics.fillCircle(28, 18, 2);

    graphics.fillRect(13, 40, 14, 3);

    graphics.generateTexture("jasmin", 40, 60);
    graphics.destroy();
  }

  private createPlatformTexture() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x4f772d);
    graphics.fillRoundedRect(0, 0, 40, 30, 6);

    graphics.generateTexture("platform", 40, 30);
    graphics.destroy();
  }

  private createCoffeeTexture() {
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

    graphics.generateTexture("coffee", 45, 42);
    graphics.destroy();
  }

  private createToiletTexture() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0xf8fafc);
    graphics.fillRoundedRect(7, 0, 38, 34, 7);

    graphics.fillStyle(0xe2e8f0);
    graphics.fillRoundedRect(3, 28, 46, 22, 8);

    graphics.fillStyle(0xffffff);
    graphics.fillEllipse(26, 40, 40, 20);

    graphics.fillStyle(0x93c5fd);
    graphics.fillEllipse(26, 40, 25, 10);

    graphics.fillStyle(0xf8fafc);
    graphics.fillRoundedRect(16, 46, 22, 24, 5);

    graphics.generateTexture("toilet", 52, 72);
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