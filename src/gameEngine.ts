import { loadStats, saveStats } from "./storage";
import type {
  ActivePowerUp,
  Difficulty,
  Direction,
  GameSnapshot,
  GameStatus,
  Mission,
  PersistedStats,
  Point,
  PowerUpType,
} from "./types";

const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const difficultySpeeds: Record<Difficulty, number> = {
  chill: 160,
  classic: 118,
  arcade: 88,
};

const powerLabels: Record<PowerUpType, string> = {
  slow: "Slow Time",
  doubleScore: "2x Score",
  shield: "Shield",
};

const missionPool = [
  { id: "food", label: "Eat 8 food", target: 8 },
  { id: "level", label: "Reach level 4", target: 4 },
  { id: "combo", label: "Build a 5x combo", target: 5 },
  { id: "score", label: "Score 300", target: 300 },
];

type Particle = Point & {
  vx: number;
  vy: number;
  life: number;
  age: number;
  color: string;
  radius: number;
};

type PowerUpPickup = Point & {
  type: PowerUpType;
};

type Subscriber = (snapshot: GameSnapshot) => void;

export class SnakeGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private subscribers = new Set<Subscriber>();
  private stats: PersistedStats = loadStats();
  private status: GameStatus = "menu";
  private score = 0;
  private level = 1;
  private foodsEaten = 0;
  private combo = 0;
  private maxCombo = 0;
  private message = "Choose a difficulty and start your run.";
  private snake: Point[] = [];
  private direction: Direction = "right";
  private pendingDirection: Direction = "right";
  private food: Point = { x: 14, y: 10 };
  private powerUp: PowerUpPickup | null = null;
  private obstacles: Point[] = [];
  private missions: Mission[] = [];
  private activePowerUps = new Map<PowerUpType, number>();
  private particles: Particle[] = [];
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private audioContext: AudioContext | null = null;
  private touchStart: Point | null = null;

  readonly columns = 20;
  readonly rows = 20;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas rendering context is unavailable.");
    }

    this.canvas = canvas;
    this.ctx = context;
    this.resetRun(false);
    this.resize();
    this.rafId = window.requestAnimationFrame((time) => this.frame(time));
  }

  destroy() {
    window.cancelAnimationFrame(this.rafId);
    this.subscribers.clear();
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);
    subscriber(this.snapshot());
    return () => this.subscribers.delete(subscriber);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.max(320, Math.min(rect.width || 640, 820));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.status === "gameover") {
      this.resetRun(false);
    }
    this.status = "running";
    this.message = "Arcade run in progress.";
    this.ensureAudio();
    this.notify();
  }

  pause() {
    if (this.status !== "running") {
      return;
    }
    this.status = "paused";
    this.message = "Paused. Resume when you are ready.";
    this.notify();
  }

  resume() {
    if (this.status !== "paused") {
      return;
    }
    this.status = "running";
    this.message = "Back in motion.";
    this.notify();
  }

  reset() {
    this.resetRun(true);
  }

  setDifficulty(difficulty: Difficulty) {
    this.stats = { ...this.stats, difficulty };
    saveStats(this.stats);
    if (this.status !== "running") {
      this.resetRun(false);
    }
    this.notify();
  }

  setDirection(direction: Direction) {
    if (this.status === "menu") {
      this.start();
    }
    if (this.status !== "running" || this.isOpposite(direction, this.direction)) {
      return;
    }
    this.pendingDirection = direction;
  }

  toggleAudio() {
    this.stats = { ...this.stats, audioEnabled: !this.stats.audioEnabled };
    saveStats(this.stats);
    if (this.stats.audioEnabled) {
      this.ensureAudio();
      this.playTone(680, 0.06, "sine");
    }
    this.notify();
  }

  handleTouchStart(x: number, y: number) {
    this.touchStart = { x, y };
  }

  handleTouchEnd(x: number, y: number) {
    if (!this.touchStart) {
      return;
    }
    const dx = x - this.touchStart.x;
    const dy = y - this.touchStart.y;
    this.touchStart = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      return;
    }
    this.setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  private resetRun(announce: boolean) {
    this.status = "menu";
    this.score = 0;
    this.level = 1;
    this.foodsEaten = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.direction = "right";
    this.pendingDirection = "right";
    this.snake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    this.activePowerUps.clear();
    this.obstacles = [];
    this.powerUp = null;
    this.particles = [];
    this.missions = this.createMissions();
    this.spawnFood();
    this.message = announce
      ? "Run reset. Start again when ready."
      : "Choose a difficulty and start your run.";
    this.notify();
  }

  private createMissions(): Mission[] {
    const offset = Math.floor(Math.random() * missionPool.length);
    return [0, 1, 2].map((index) => {
      const mission = missionPool[(offset + index) % missionPool.length];
      return { ...mission, progress: 0, complete: false };
    });
  }

  private frame(time: number) {
    const delta = Math.min(64, time - (this.lastTime || time));
    this.lastTime = time;

    if (this.status === "running") {
      this.accumulator += delta;
      this.updatePowerUps(delta);
      while (this.accumulator >= this.tickMs()) {
        this.accumulator -= this.tickMs();
        this.tick();
      }
    }

    this.updateParticles(delta);
    this.render(time);
    this.rafId = window.requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  private tickMs() {
    const base = difficultySpeeds[this.stats.difficulty];
    const levelPace = Math.max(54, base - (this.level - 1) * 6);
    return this.activePowerUps.has("slow") ? levelPace + 48 : levelPace;
  }

  private tick() {
    this.direction = this.pendingDirection;
    const head = this.snake[0];
    const vector = vectors[this.direction];
    const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
    const eatsFood = this.samePoint(nextHead, this.food);
    const eatsPowerUp = this.powerUp && this.samePoint(nextHead, this.powerUp);

    if (
      this.isOutOfBounds(nextHead) ||
      this.collides(nextHead, eatsFood) ||
      this.obstacles.some((point) => this.samePoint(point, nextHead))
    ) {
      if (this.activePowerUps.has("shield")) {
        this.activePowerUps.delete("shield");
        this.combo = 0;
        this.message = "Shield absorbed a crash.";
        this.burst(head, "#67e8f9", 18);
        this.playTone(240, 0.12, "triangle");
        this.notify();
        return;
      }
      this.finish();
      return;
    }

    this.snake.unshift(nextHead);

    if (eatsPowerUp) {
      this.activatePowerUp(this.powerUp!.type);
      this.powerUp = null;
    }

    if (eatsFood) {
      this.eatFood();
    } else {
      this.snake.pop();
    }

    this.updateMissions();
    this.notify();
  }

  private eatFood() {
    this.foodsEaten += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const multiplier = this.activePowerUps.has("doubleScore") ? 2 : 1;
    this.score += (10 + Math.min(this.combo, 10) * 3) * multiplier;
    this.level = Math.max(1, Math.floor(this.score / 120) + 1);
    this.message = this.combo >= 4 ? `${this.combo}x combo streak.` : "Food collected.";
    this.burst(this.food, "#facc15", 22);
    this.playTone(520 + this.combo * 28, 0.07, "square");
    this.spawnFood();

    if (this.foodsEaten % 4 === 2 && !this.powerUp) {
      this.spawnPowerUp();
    }
    if (this.level >= 3) {
      this.syncObstacles();
    }
  }

  private activatePowerUp(type: PowerUpType) {
    this.activePowerUps.set(type, type === "shield" ? 9000 : 7000);
    this.message = `${powerLabels[type]} activated.`;
    this.burst(this.powerUp!, type === "doubleScore" ? "#f0abfc" : "#5eead4", 24);
    this.playTone(820, 0.12, "sine");
  }

  private updatePowerUps(delta: number) {
    let changed = false;
    for (const [type, remaining] of this.activePowerUps) {
      const next = remaining - delta;
      if (next <= 0) {
        this.activePowerUps.delete(type);
      } else {
        this.activePowerUps.set(type, next);
      }
      changed = true;
    }
    if (changed) {
      this.notify();
    }
  }

  private updateMissions() {
    let completedNow = 0;
    this.missions = this.missions.map((mission) => {
      const progress =
        mission.id === "food"
          ? this.foodsEaten
          : mission.id === "level"
            ? this.level
            : mission.id === "combo"
              ? this.maxCombo
              : this.score;
      const complete = progress >= mission.target;
      if (complete && !mission.complete) {
        completedNow += 1;
      }
      return { ...mission, progress: Math.min(progress, mission.target), complete };
    });

    if (completedNow) {
      this.stats = {
        ...this.stats,
        missionTotal: this.stats.missionTotal + completedNow,
      };
      saveStats(this.stats);
      this.message = "Mission complete.";
      this.playTone(980, 0.16, "triangle");
    }
  }

  private finish() {
    this.status = "gameover";
    this.combo = 0;
    this.message = "Run ended. Review your stats and try again.";
    this.stats = {
      ...this.stats,
      bestScore: Math.max(this.stats.bestScore, this.score),
      bestLevel: Math.max(this.stats.bestLevel, this.level),
      bestCombo: Math.max(this.stats.bestCombo, this.maxCombo),
    };
    saveStats(this.stats);
    this.burst(this.snake[0], "#fb7185", 34);
    this.playTone(150, 0.22, "sawtooth");
    this.notify();
  }

  private spawnFood() {
    this.food = this.randomOpenPoint();
  }

  private spawnPowerUp() {
    const types: PowerUpType[] = ["slow", "doubleScore", "shield"];
    this.powerUp = {
      ...this.randomOpenPoint(),
      type: types[Math.floor(Math.random() * types.length)],
    };
  }

  private syncObstacles() {
    const target = Math.min(18, this.level * 2 - 4);
    while (this.obstacles.length < target) {
      this.obstacles.push(this.randomOpenPoint());
    }
  }

  private randomOpenPoint(): Point {
    let point: Point;
    do {
      point = {
        x: Math.floor(Math.random() * this.columns),
        y: Math.floor(Math.random() * this.rows),
      };
    } while (!this.isOpen(point));
    return point;
  }

  private isOpen(point: Point) {
    return (
      !this.snake.some((segment) => this.samePoint(segment, point)) &&
      !this.obstacles.some((obstacle) => this.samePoint(obstacle, point)) &&
      !this.samePoint(this.food, point) &&
      (!this.powerUp || !this.samePoint(this.powerUp, point))
    );
  }

  private collides(point: Point, grows: boolean) {
    const body = grows ? this.snake : this.snake.slice(0, -1);
    return body.some((segment) => this.samePoint(segment, point));
  }

  private isOutOfBounds(point: Point) {
    return point.x < 0 || point.y < 0 || point.x >= this.columns || point.y >= this.rows;
  }

  private samePoint(a: Point, b: Point) {
    return a.x === b.x && a.y === b.y;
  }

  private isOpposite(next: Direction, current: Direction) {
    const a = vectors[next];
    const b = vectors[current];
    return a.x === -b.x && a.y === -b.y;
  }

  private burst(point: Point, color: string, count: number) {
    const cell = this.cellSize();
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.06 + Math.random() * 0.18;
      this.particles.push({
        x: point.x * cell + cell / 2,
        y: point.y * cell + cell / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 420 + Math.random() * 360,
        age: 0,
        color,
        radius: 2 + Math.random() * 4,
      });
    }
  }

  private updateParticles(delta: number) {
    this.particles = this.particles
      .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx * delta,
        y: particle.y + particle.vy * delta,
        age: particle.age + delta,
      }))
      .filter((particle) => particle.age < particle.life);
  }

  private render(time: number) {
    const size = this.canvas.width / Math.min(window.devicePixelRatio || 1, 2);
    const cell = this.cellSize();
    this.ctx.clearRect(0, 0, size, size);

    const bg = this.ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, "#12143c");
    bg.addColorStop(0.52, "#080a1f");
    bg.addColorStop(1, "#09041c");
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, size, size);

    this.drawGrid(size, cell);
    this.drawObstacles(cell);
    this.drawFood(cell, time);
    this.drawPowerUp(cell, time);
    this.drawSnake(cell);
    this.drawParticles();
  }

  private drawGrid(size: number, cell: number) {
    this.ctx.strokeStyle = "rgba(125, 211, 252, 0.08)";
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.columns; i += 1) {
      const p = i * cell + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(p, 0);
      this.ctx.lineTo(p, size);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, p);
      this.ctx.lineTo(size, p);
      this.ctx.stroke();
    }
  }

  private drawSnake(cell: number) {
    this.snake.forEach((segment, index) => {
      const x = segment.x * cell + 3;
      const y = segment.y * cell + 3;
      const size = cell - 6;
      const gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
      gradient.addColorStop(0, index === 0 ? "#f7fee7" : "#86efac");
      gradient.addColorStop(1, index === 0 ? "#22c55e" : "#15803d");
      this.ctx.shadowColor = index === 0 ? "rgba(190, 242, 100, 0.65)" : "rgba(34, 197, 94, 0.22)";
      this.ctx.shadowBlur = index === 0 ? 20 : 8;
      this.ctx.fillStyle = gradient;
      this.roundRect(x, y, size, size, index === 0 ? 10 : 8);
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;
  }

  private drawFood(cell: number, time: number) {
    const pulse = 0.86 + Math.sin(time / 150) * 0.12;
    const x = this.food.x * cell + cell / 2;
    const y = this.food.y * cell + cell / 2;
    this.ctx.fillStyle = "#facc15";
    this.ctx.shadowColor = "rgba(250, 204, 21, 0.75)";
    this.ctx.shadowBlur = 22;
    this.ctx.beginPath();
    this.ctx.arc(x, y, (cell / 2 - 4) * pulse, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawPowerUp(cell: number, time: number) {
    if (!this.powerUp) {
      return;
    }
    const x = this.powerUp.x * cell + cell / 2;
    const y = this.powerUp.y * cell + cell / 2;
    const spin = time / 200;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(spin);
    const color = this.powerUp.type === "doubleScore" ? "#e879f9" : "#67e8f9";
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 24;
    this.roundRect(-cell * 0.3, -cell * 0.3, cell * 0.6, cell * 0.6, 7);
    this.ctx.fill();
    this.ctx.restore();
    this.ctx.shadowBlur = 0;
  }

  private drawObstacles(cell: number) {
    this.ctx.fillStyle = "rgba(251, 113, 133, 0.82)";
    this.ctx.shadowColor = "rgba(251, 113, 133, 0.38)";
    this.ctx.shadowBlur = 12;
    this.obstacles.forEach((obstacle) => {
      this.roundRect(obstacle.x * cell + 5, obstacle.y * cell + 5, cell - 10, cell - 10, 6);
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;
  }

  private drawParticles() {
    this.particles.forEach((particle) => {
      const alpha = 1 - particle.age / particle.life;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.arcTo(x + width, y, x + width, y + height, radius);
    this.ctx.arcTo(x + width, y + height, x, y + height, radius);
    this.ctx.arcTo(x, y + height, x, y, radius);
    this.ctx.arcTo(x, y, x + width, y, radius);
    this.ctx.closePath();
  }

  private cellSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return this.canvas.width / dpr / this.columns;
  }

  private ensureAudio() {
    if (!this.stats.audioEnabled || this.audioContext) {
      return;
    }
    this.audioContext = new AudioContext();
  }

  private playTone(frequency: number, duration: number, type: OscillatorType) {
    if (!this.stats.audioEnabled) {
      return;
    }
    this.ensureAudio();
    if (!this.audioContext) {
      return;
    }
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(0.0001, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, this.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private snapshot(): GameSnapshot {
    const activePowerUps: ActivePowerUp[] = Array.from(this.activePowerUps).map(
      ([type, remainingMs]) => ({
        type,
        label: powerLabels[type],
        remainingMs,
      }),
    );

    return {
      ...this.stats,
      status: this.status,
      score: this.score,
      level: this.level,
      foodsEaten: this.foodsEaten,
      combo: this.combo,
      maxCombo: this.maxCombo,
      missions: this.missions,
      activePowerUps,
      message: this.message,
    };
  }

  private notify() {
    const snapshot = this.snapshot();
    this.subscribers.forEach((subscriber) => subscriber(snapshot));
  }
}
