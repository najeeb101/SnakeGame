(() => {
  class SnakeGame {
    constructor() {
      this.canvas = document.getElementById("gameCanvas");
      this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

      if (!this.canvas || !this.ctx) {
        console.error("SnakeGame: canvas context is unavailable.");
        return;
      }

      this.canvas.width = 480;
      this.canvas.height = 480;
      this.ctx.imageSmoothingEnabled = true;

      this.gridSize = 24;
      this.columns = Math.floor(this.canvas.width / this.gridSize);
      this.rows = Math.floor(this.canvas.height / this.gridSize);
      this.minSpeed = 55;
      this.speedStep = 6;
      this.levelStep = 50;
      this.scorePerFood = 10;
      this.difficultySpeeds = {
        chill: 155,
        classic: 120,
        arcade: 90,
      };
      this.directionVectors = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };

      this.status = "idle";
      this.difficulty = "classic";
      this.score = 0;
      this.level = 1;
      this.foodsEaten = 0;
      this.highScore = this.loadHighScore();
      this.direction = { x: 1, y: 0 };
      this.pendingDirection = { x: 1, y: 0 };
      this.speed = this.difficultySpeeds[this.difficulty];
      this.loopId = null;
      this.touchStart = null;

      this.elements = this.collectElements();
      if (!this.elements) {
        return;
      }

      this.difficulty = this.elements.difficultySelect.value || this.difficulty;
      this.bindEvents();
      this.resetBoard(true);
    }

    collectElements() {
      const requiredIds = {
        score: "score",
        highScore: "high-score",
        level: "level",
        foodsEaten: "foods-eaten",
        statusBadge: "statusBadge",
        boardOverlay: "boardOverlay",
        overlayKicker: "overlayKicker",
        overlayTitle: "overlayTitle",
        overlayText: "overlayText",
        startBtn: "startBtn",
        pauseBtn: "pauseBtn",
        resetBtn: "resetBtn",
        difficultySelect: "difficultySelect",
        modal: "gameOverModal",
        gameOverReason: "gameOverReason",
        gameOverTitle: "gameOverTitle",
        gameOverMessage: "gameOverMessage",
        finalScore: "finalScore",
        finalLevel: "finalLevel",
        finalFoods: "finalFoods",
        restartBtn: "restartBtn",
      };

      const elements = {};

      for (const [key, id] of Object.entries(requiredIds)) {
        const element = document.getElementById(id);
        if (!element) {
          console.error(`SnakeGame: missing required element #${id}`);
          return null;
        }
        elements[key] = element;
      }

      elements.dpadButtons = Array.from(document.querySelectorAll(".dpad-btn"));
      return elements;
    }

    bindEvents() {
      this.elements.startBtn.addEventListener("click", () => this.startGame());
      this.elements.pauseBtn.addEventListener("click", () =>
        this.togglePause(),
      );
      this.elements.resetBtn.addEventListener("click", () =>
        this.resetBoard(true),
      );
      this.elements.restartBtn.addEventListener("click", () =>
        this.restartGame(),
      );
      this.elements.difficultySelect.addEventListener("change", (event) => {
        this.handleDifficultyChange(event.target.value);
      });

      this.elements.dpadButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.handlePadAction(button.dataset.direction, button.dataset.action);
        });
      });

      document.addEventListener("keydown", (event) =>
        this.handleKeyDown(event),
      );

      window.addEventListener("blur", () => {
        if (this.status === "running") {
          this.pauseGame("Focus lost - game paused.");
        }
      });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.status === "running") {
          this.pauseGame("Tab hidden - game paused.");
        }
      });

      this.canvas.addEventListener(
        "touchstart",
        (event) => {
          if (!event.touches.length) {
            return;
          }

          const touch = event.touches[0];
          this.touchStart = {
            x: touch.clientX,
            y: touch.clientY,
          };
        },
        { passive: true },
      );

      this.canvas.addEventListener("touchend", (event) => {
        if (!this.touchStart) {
          return;
        }

        const touch = event.changedTouches[0];
        if (!touch) {
          this.touchStart = null;
          return;
        }

        const deltaX = touch.clientX - this.touchStart.x;
        const deltaY = touch.clientY - this.touchStart.y;
        const minimumSwipeDistance = 26;

        if (
          Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= minimumSwipeDistance
        ) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            this.handleDirectionInput(
              deltaX > 0
                ? this.directionVectors.right
                : this.directionVectors.left,
            );
          } else {
            this.handleDirectionInput(
              deltaY > 0
                ? this.directionVectors.down
                : this.directionVectors.up,
            );
          }
        }

        this.touchStart = null;
      });
    }

    loadHighScore() {
      try {
        const storedValue = Number(
          window.localStorage.getItem("snakeHighScore"),
        );
        return Number.isFinite(storedValue) ? storedValue : 0;
      } catch (error) {
        return 0;
      }
    }

    saveHighScore(value) {
      try {
        window.localStorage.setItem("snakeHighScore", String(value));
      } catch (error) {
        // ignore storage failures
      }
    }

    resetBoard(showOverlay = true) {
      this.clearLoop();
      this.hideModal();

      this.status = "idle";
      this.score = 0;
      this.level = 1;
      this.foodsEaten = 0;
      this.direction = { x: 1, y: 0 };
      this.pendingDirection = { x: 1, y: 0 };
      this.snake = [
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 },
      ];
      this.food = null;
      this.spawnFood();
      this.syncSpeed();

      if (showOverlay) {
        this.showOverlay(
          "Press Start",
          "Get ready to move",
          "Use arrows, WASD, touch swipes, or the buttons on the right.",
        );
      } else {
        this.hideOverlay();
      }

      this.updateHud();
      this.updateButtons();
      this.updateStatusBadge();
      this.render();
    }

    startGame() {
      if (this.status === "running") {
        return;
      }

      if (this.status === "gameover" || this.status === "won") {
        this.resetBoard(false);
      }

      this.status = "running";
      this.hideOverlay();
      this.hideModal();
      this.syncSpeed();
      this.scheduleLoop();
      this.updateButtons();
      this.updateStatusBadge();
      this.render();
    }

    pauseGame(message) {
      if (this.status !== "running") {
        return;
      }

      this.status = "paused";
      this.clearLoop();
      this.updateButtons();
      this.updateStatusBadge();
      this.showOverlay(
        "Paused",
        "Snake is frozen",
        message || "Press Resume, Space, or the Pause button to continue.",
      );
    }

    togglePause() {
      if (this.status === "running") {
        this.pauseGame();
        return;
      }

      if (this.status === "paused") {
        this.startGame();
      }
    }

    restartGame() {
      this.resetBoard(false);
      this.startGame();
    }

    handleDifficultyChange(value) {
      this.difficulty = value;
      this.syncSpeed();
      this.updateHud();
      this.render();
    }

    handlePadAction(direction, action) {
      if (action === "pause") {
        this.togglePause();
        return;
      }

      if (direction && this.directionVectors[direction]) {
        this.handleDirectionInput(this.directionVectors[direction]);
      }
    }

    handleKeyDown(event) {
      const target = event.target;
      const tagName =
        target && target.tagName ? target.tagName.toLowerCase() : "";
      if (["input", "textarea", "select"].includes(tagName)) {
        return;
      }

      const key = event.key.toLowerCase();
      const directionMap = {
        arrowup: this.directionVectors.up,
        w: this.directionVectors.up,
        arrowdown: this.directionVectors.down,
        s: this.directionVectors.down,
        arrowleft: this.directionVectors.left,
        a: this.directionVectors.left,
        arrowright: this.directionVectors.right,
        d: this.directionVectors.right,
      };

      if (directionMap[key]) {
        event.preventDefault();
        this.handleDirectionInput(directionMap[key]);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        this.togglePause();
        return;
      }

      if (key === "enter") {
        event.preventDefault();
        if (this.status === "gameover" || this.status === "won") {
          this.restartGame();
        } else {
          this.startGame();
        }
        return;
      }

      if (key === "r") {
        event.preventDefault();
        this.resetBoard(true);
      }
    }

    handleDirectionInput(direction) {
      if (this.status === "idle") {
        this.startGame();
      }

      if (this.status !== "running") {
        return;
      }

      if (
        this.isOppositeDirection(direction, this.pendingDirection) ||
        this.isOppositeDirection(direction, this.direction)
      ) {
        return;
      }

      this.pendingDirection = { ...direction };
    }

    isOppositeDirection(first, second) {
      return first.x === -second.x && first.y === -second.y;
    }

    syncSpeed() {
      const baseSpeed =
        this.difficultySpeeds[this.difficulty] || this.difficultySpeeds.classic;
      this.level = Math.max(1, Math.floor(this.score / this.levelStep) + 1);
      this.speed = Math.max(
        this.minSpeed,
        baseSpeed - (this.level - 1) * this.speedStep,
      );

      if (this.status === "running") {
        this.scheduleLoop();
      }
    }

    scheduleLoop() {
      this.clearLoop();
      this.loopId = window.setInterval(() => this.tick(), this.speed);
    }

    clearLoop() {
      if (this.loopId !== null) {
        window.clearInterval(this.loopId);
        this.loopId = null;
      }
    }

    tick() {
      if (this.status !== "running") {
        return;
      }

      this.direction = { ...this.pendingDirection };

      const head = this.snake[0];
      const nextHead = {
        x: head.x + this.direction.x,
        y: head.y + this.direction.y,
      };
      const willEat = Boolean(
        this.food && nextHead.x === this.food.x && nextHead.y === this.food.y,
      );

      if (this.isOutOfBounds(nextHead) || this.willCollide(nextHead, willEat)) {
        this.finishRun(
          "gameover",
          "Snake crashed",
          "The snake collided with a wall or its own body.",
        );
        return;
      }

      this.snake.unshift(nextHead);

      if (willEat) {
        if (!this.handleFoodEaten()) {
          return;
        }
      } else {
        this.snake.pop();
      }

      this.updateHud();
      this.render();
    }

    handleFoodEaten() {
      this.score += this.scorePerFood;
      this.foodsEaten += 1;
      this.refreshHighScore();
      this.level = Math.max(1, Math.floor(this.score / this.levelStep) + 1);

      if (this.isBoardFull()) {
        this.food = null;
        this.finishRun(
          "won",
          "Board cleared",
          "You filled every tile on the board.",
        );
        return false;
      }

      this.spawnFood();
      this.syncSpeed();
      return true;
    }

    refreshHighScore() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore(this.highScore);
      }
    }

    isOutOfBounds(position) {
      return (
        position.x < 0 ||
        position.x >= this.columns ||
        position.y < 0 ||
        position.y >= this.rows
      );
    }

    willCollide(nextHead, willEat) {
      const body = willEat ? this.snake : this.snake.slice(0, -1);
      return body.some(
        (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
      );
    }

    isBoardFull() {
      return this.snake.length >= this.columns * this.rows;
    }

    spawnFood() {
      if (this.isBoardFull()) {
        this.food = null;
        return;
      }

      let nextFood = null;
      while (!nextFood) {
        const candidate = {
          x: Math.floor(Math.random() * this.columns),
          y: Math.floor(Math.random() * this.rows),
        };

        const overlapsSnake = this.snake.some(
          (segment) => segment.x === candidate.x && segment.y === candidate.y,
        );
        if (!overlapsSnake) {
          nextFood = candidate;
        }
      }

      this.food = nextFood;
    }

    finishRun(state, title, message) {
      this.status = state;
      this.clearLoop();
      this.updateHud();
      this.updateButtons();
      this.updateStatusBadge();
      this.hideOverlay();
      this.render();
      this.showModal(state, title, message);
    }

    showModal(state, title, message) {
      this.elements.gameOverReason.textContent =
        state === "won" ? "Victory" : "Game Over";
      this.elements.gameOverTitle.textContent = title;
      this.elements.gameOverMessage.textContent = message;
      this.elements.finalScore.textContent = String(this.score);
      this.elements.finalLevel.textContent = String(this.level);
      this.elements.finalFoods.textContent = String(this.foodsEaten);
      this.elements.modal.hidden = false;
      this.elements.modal.setAttribute("aria-hidden", "false");
    }

    hideModal() {
      this.elements.modal.hidden = true;
      this.elements.modal.setAttribute("aria-hidden", "true");
    }

    showOverlay(kicker, title, text) {
      this.elements.overlayKicker.textContent = kicker;
      this.elements.overlayTitle.textContent = title;
      this.elements.overlayText.textContent = text;
      this.elements.boardOverlay.classList.remove("hidden");
      this.elements.boardOverlay.setAttribute("aria-hidden", "false");
    }

    hideOverlay() {
      this.elements.boardOverlay.classList.add("hidden");
      this.elements.boardOverlay.setAttribute("aria-hidden", "true");
    }

    updateButtons() {
      const isRunning = this.status === "running";
      const isPaused = this.status === "paused";
      const isIdle = this.status === "idle";
      const isFinished = this.status === "gameover" || this.status === "won";

      if (isRunning) {
        this.elements.startBtn.textContent = "Running";
      } else if (isPaused) {
        this.elements.startBtn.textContent = "Resume Game";
      } else if (isFinished) {
        this.elements.startBtn.textContent = "Play Again";
      } else {
        this.elements.startBtn.textContent = "Start Game";
      }

      this.elements.startBtn.disabled = isRunning;
      this.elements.pauseBtn.disabled = !(isRunning || isPaused);
      this.elements.pauseBtn.textContent = isPaused ? "Resume" : "Pause";
      this.elements.resetBtn.disabled = false;

      if (isIdle) {
        this.elements.pauseBtn.textContent = "Pause";
      }
    }

    updateStatusBadge() {
      const labels = {
        idle: "Ready",
        running: "Running",
        paused: "Paused",
        gameover: "Game Over",
        won: "Board Cleared",
      };

      this.elements.statusBadge.dataset.state = this.status;
      this.elements.statusBadge.textContent = labels[this.status] || "Ready";
    }

    updateHud() {
      this.elements.score.textContent = String(this.score);
      this.elements.highScore.textContent = String(this.highScore);
      this.elements.level.textContent = String(this.level);
      this.elements.foodsEaten.textContent = String(this.foodsEaten);
    }

    render() {
      if (!this.ctx) {
        return;
      }

      const width = this.canvas.width;
      const height = this.canvas.height;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#071821");
      background.addColorStop(0.5, "#051217");
      background.addColorStop(1, "#030b10");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(132, 204, 22, 0.04)";
      ctx.fillRect(0, 0, width, height);

      this.drawGrid();
      this.drawFood();
      this.drawSnake();
      this.drawBorder();
    }

    drawGrid() {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = "rgba(173, 255, 154, 0.08)";
      ctx.lineWidth = 1;

      for (let index = 0; index <= this.columns; index += 1) {
        const coordinate = index * this.gridSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(coordinate, 0);
        ctx.lineTo(coordinate, this.canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, coordinate);
        ctx.lineTo(this.canvas.width, coordinate);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawBorder() {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = "rgba(132, 204, 22, 0.22)";
      ctx.lineWidth = 2;
      this.roundRect(1, 1, this.canvas.width - 2, this.canvas.height - 2, 18);
      ctx.stroke();
      ctx.restore();
    }

    drawSnake() {
      const ctx = this.ctx;

      this.snake.forEach((segment, index) => {
        const x = segment.x * this.gridSize + 2;
        const y = segment.y * this.gridSize + 2;
        const size = this.gridSize - 4;
        const cornerRadius = index === 0 ? 10 : 8;
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);

        if (index === 0) {
          gradient.addColorStop(0, "#ecfccb");
          gradient.addColorStop(1, "#84cc16");
          ctx.shadowColor = "rgba(132, 204, 22, 0.45)";
          ctx.shadowBlur = 18;
        } else {
          const tint = Math.max(118, 146 - index * 2);
          gradient.addColorStop(0, `hsl(${tint}, 66%, 60%)`);
          gradient.addColorStop(1, `hsl(${tint - 10}, 58%, 35%)`);
          ctx.shadowColor = "rgba(22, 163, 74, 0.2)";
          ctx.shadowBlur = 8;
        }

        ctx.fillStyle = gradient;
        this.roundRect(x, y, size, size, cornerRadius);
        ctx.fill();

        if (index === 0) {
          this.drawEyes(x, y, size);
        }
      });

      ctx.shadowBlur = 0;
    }

    drawEyes(x, y, size) {
      const ctx = this.ctx;
      const eyeSize = 3;
      const eyeOffset = 6;

      ctx.fillStyle = "#08111a";

      if (this.direction.x === 1) {
        ctx.fillRect(
          x + size - eyeOffset - eyeSize,
          y + eyeOffset - 1,
          eyeSize,
          eyeSize,
        );
        ctx.fillRect(
          x + size - eyeOffset - eyeSize,
          y + size - eyeOffset - eyeSize + 1,
          eyeSize,
          eyeSize,
        );
      } else if (this.direction.x === -1) {
        ctx.fillRect(x + eyeOffset, y + eyeOffset - 1, eyeSize, eyeSize);
        ctx.fillRect(
          x + eyeOffset,
          y + size - eyeOffset - eyeSize + 1,
          eyeSize,
          eyeSize,
        );
      } else if (this.direction.y === -1) {
        ctx.fillRect(x + eyeOffset - 1, y + eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(
          x + size - eyeOffset - eyeSize + 1,
          y + eyeOffset,
          eyeSize,
          eyeSize,
        );
      } else {
        ctx.fillRect(
          x + eyeOffset - 1,
          y + size - eyeOffset - eyeSize,
          eyeSize,
          eyeSize,
        );
        ctx.fillRect(
          x + size - eyeOffset - eyeSize + 1,
          y + size - eyeOffset - eyeSize,
          eyeSize,
          eyeSize,
        );
      }
    }

    drawFood() {
      if (!this.food) {
        return;
      }

      const ctx = this.ctx;
      const centerX = this.food.x * this.gridSize + this.gridSize / 2;
      const centerY = this.food.y * this.gridSize + this.gridSize / 2;
      const pulse = 0.85 + Math.sin(Date.now() / 180) * 0.08;
      const glow = ctx.createRadialGradient(
        centerX - 3,
        centerY - 3,
        3,
        centerX,
        centerY,
        this.gridSize / 2,
      );

      glow.addColorStop(0, `rgba(255, 255, 214, ${0.95 * pulse})`);
      glow.addColorStop(0.35, "#fde047");
      glow.addColorStop(1, "#f97316");

      ctx.save();
      ctx.shadowColor = "rgba(253, 224, 71, 0.55)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, this.gridSize / 2 - 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
      ctx.beginPath();
      ctx.arc(centerX - 4, centerY - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    roundRect(x, y, width, height, radius) {
      const ctx = this.ctx;
      const cornerRadius = Math.min(radius, width / 2, height / 2);

      ctx.beginPath();
      ctx.moveTo(x + cornerRadius, y);
      ctx.arcTo(x + width, y, x + width, y + height, cornerRadius);
      ctx.arcTo(x + width, y + height, x, y + height, cornerRadius);
      ctx.arcTo(x, y + height, x, y, cornerRadius);
      ctx.arcTo(x, y, x + width, y, cornerRadius);
      ctx.closePath();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    new SnakeGame();
  });
})();
