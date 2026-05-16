import { loadStats, saveStats } from "../storage";
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
} from "../types";
import { AudioEngine } from "./audio";
import { difficultySpeeds, powerLabels, vectors } from "./constants";
import { createMissions, stepMissions } from "./missions";
import { spawnBurst, stepParticles, type Particle } from "./particles";
import { Renderer } from "./renderer";

type PowerUpPickup = Point & { type: PowerUpType };
type Subscriber = (snapshot: GameSnapshot) => void;

export class SnakeGameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private audio = new AudioEngine();
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
  private touchStart: Point | null = null;
  private countdownMs = 0;
  private countdownDigit = 0;

  readonly columns = 20;
  readonly rows = 20;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas rendering context is unavailable.");
    this.canvas = canvas;
    this.renderer = new Renderer(ctx, canvas, this.columns);
    this.resetRun(false);
    this.resize();
    this.rafId = window.requestAnimationFrame((time) => this.frame(time));
  }

  destroy(): void {
    window.cancelAnimationFrame(this.rafId);
    this.subscribers.clear();
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.snapshot());
    return () => this.subscribers.delete(subscriber);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.max(320, Math.min(rect.width || 640, 820));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.canvas.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.status === "running" || this.status === "countdown") return;
    if (this.status === "paused") { this.resume(); return; }
    if (this.status === "gameover") this.resetRun(false);
    this.status = "countdown";
    this.countdownMs = 0;
    this.countdownDigit = 3;
    this.message = "Get ready...";
    this.audio.ensure(this.stats.audioEnabled);
    this.notify();
  }

  pause(): void {
    if (this.status !== "running") return;
    this.status = "paused";
    this.message = "Paused. Resume when you are ready.";
    this.notify();
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = "running";
    this.message = "Back in motion.";
    this.notify();
  }

  reset(): void {
    this.resetRun(true);
  }

  setDifficulty(difficulty: Difficulty): void {
    this.stats = { ...this.stats, difficulty };
    saveStats(this.stats);
    if (this.status === "menu" || this.status === "gameover") this.resetRun(false);
    this.notify();
  }

  setDirection(direction: Direction): void {
    if (this.status === "menu") this.start();
    if (this.status === "countdown") {
      if (!this.isOpposite(direction, this.direction)) this.pendingDirection = direction;
      return;
    }
    if (this.status !== "running" || this.isOpposite(direction, this.direction)) return;
    this.pendingDirection = direction;
  }

  toggleAudio(): void {
    this.stats = { ...this.stats, audioEnabled: !this.stats.audioEnabled };
    saveStats(this.stats);
    if (this.stats.audioEnabled) {
      this.audio.ensure(true);
      this.audio.play(680, 0.06, "sine", true);
    }
    this.notify();
  }

  handleTouchStart(x: number, y: number): void {
    this.touchStart = { x, y };
  }

  handleTouchEnd(x: number, y: number): void {
    if (!this.touchStart) return;
    const dx = x - this.touchStart.x;
    const dy = y - this.touchStart.y;
    this.touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    this.setDirection(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up",
    );
  }

  private resetRun(announce: boolean): void {
    this.status = "menu";
    this.score = 0;
    this.level = 1;
    this.foodsEaten = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.direction = "right";
    this.pendingDirection = "right";
    this.countdownMs = 0;
    this.countdownDigit = 0;
    this.snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    this.activePowerUps.clear();
    this.obstacles = [];
    this.powerUp = null;
    this.particles = [];
    this.missions = createMissions();
    this.spawnFood();
    this.message = announce
      ? "Run reset. Start again when ready."
      : "Choose a difficulty and start your run.";
    this.notify();
  }

  private frame(time: number): void {
    const delta = Math.min(64, time - (this.lastTime || time));
    this.lastTime = time;

    if (this.status === "countdown") {
      this.countdownMs += delta;
      const digit = Math.max(1, 3 - Math.floor(this.countdownMs / 1000));
      if (digit !== this.countdownDigit) {
        this.countdownDigit = digit;
        this.audio.play(digit === 1 ? 880 : 660, 0.08, "sine", this.stats.audioEnabled);
        this.notify();
      }
      if (this.countdownMs >= 3000) {
        this.countdownDigit = 0;
        this.status = "running";
        this.accumulator = 0;
        this.message = "Arcade run in progress.";
        this.audio.play(1100, 0.12, "triangle", this.stats.audioEnabled);
        this.notify();
      }
    }

    if (this.status === "running") {
      this.accumulator += delta;
      this.updatePowerUps(delta);
      while (this.accumulator >= this.tickMs()) {
        this.accumulator -= this.tickMs();
        this.tick();
      }
    }

    this.particles = stepParticles(this.particles, delta);
    this.renderer.render(
      {
        snake: this.snake,
        food: this.food,
        powerUp: this.powerUp,
        obstacles: this.obstacles,
        particles: this.particles,
        status: this.status,
        countdownDigit: this.countdownDigit,
      },
      time,
    );

    this.rafId = window.requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  private tickMs(): number {
    const base = difficultySpeeds[this.stats.difficulty];
    const levelPace = Math.max(54, base - (this.level - 1) * 6);
    return this.activePowerUps.has("slow") ? levelPace + 48 : levelPace;
  }

  private tick(): void {
    this.direction = this.pendingDirection;
    const head = this.snake[0];
    const vector = vectors[this.direction];
    const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
    const eatsFood = this.samePoint(nextHead, this.food);
    const eatsPowerUp = this.powerUp && this.samePoint(nextHead, this.powerUp);

    if (
      this.isOutOfBounds(nextHead) ||
      this.collides(nextHead, eatsFood) ||
      this.obstacles.some((p) => this.samePoint(p, nextHead))
    ) {
      if (this.activePowerUps.has("shield")) {
        this.activePowerUps.delete("shield");
        this.combo = 0;
        this.message = "Shield absorbed a crash.";
        this.burst(head, "#67e8f9", 18);
        this.audio.play(240, 0.12, "triangle", this.stats.audioEnabled);
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
    this.advanceMissions();
    this.notify();
  }

  private eatFood(): void {
    this.foodsEaten += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const multiplier = this.activePowerUps.has("doubleScore") ? 2 : 1;
    this.score += (10 + Math.min(this.combo, 10) * 3) * multiplier;
    this.level = Math.max(1, Math.floor(this.score / 120) + 1);
    this.message = this.combo >= 4 ? `${this.combo}x combo streak.` : "Food collected.";
    this.burst(this.food, "#facc15", 22);
    this.audio.play(520 + this.combo * 28, 0.07, "square", this.stats.audioEnabled);
    this.spawnFood();
    if (this.foodsEaten % 4 === 2 && !this.powerUp) this.spawnPowerUp();
    if (this.level >= 3) this.syncObstacles();
  }

  private activatePowerUp(type: PowerUpType): void {
    this.activePowerUps.set(type, type === "shield" ? 9000 : 7000);
    this.message = `${powerLabels[type]} activated.`;
    this.burst(this.powerUp!, type === "doubleScore" ? "#f0abfc" : "#5eead4", 24);
    this.audio.play(820, 0.12, "sine", this.stats.audioEnabled);
  }

  private updatePowerUps(delta: number): void {
    let changed = false;
    for (const [type, remaining] of this.activePowerUps) {
      const next = remaining - delta;
      if (next <= 0) {
        this.activePowerUps.delete(type);
        changed = true;
      } else {
        if (Math.ceil(next / 1000) !== Math.ceil(remaining / 1000)) changed = true;
        this.activePowerUps.set(type, next);
      }
    }
    if (changed) this.notify();
  }

  private advanceMissions(): void {
    const { missions, completedCount } = stepMissions(this.missions, {
      foodsEaten: this.foodsEaten,
      level: this.level,
      maxCombo: this.maxCombo,
      score: this.score,
    });
    this.missions = missions;
    if (completedCount) {
      this.stats = { ...this.stats, missionTotal: this.stats.missionTotal + completedCount };
      saveStats(this.stats);
      this.message = "Mission complete.";
      this.audio.play(980, 0.16, "triangle", this.stats.audioEnabled);
    }
  }

  private finish(): void {
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
    this.audio.play(150, 0.22, "sawtooth", this.stats.audioEnabled);
    this.notify();
  }

  private spawnFood(): void {
    this.food = this.randomOpenPoint();
  }

  private spawnPowerUp(): void {
    const types: PowerUpType[] = ["slow", "doubleScore", "shield"];
    this.powerUp = {
      ...this.randomOpenPoint(),
      type: types[Math.floor(Math.random() * types.length)],
    };
  }

  private syncObstacles(): void {
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

  private isOpen(point: Point): boolean {
    return (
      !this.snake.some((s) => this.samePoint(s, point)) &&
      !this.obstacles.some((o) => this.samePoint(o, point)) &&
      !this.samePoint(this.food, point) &&
      (!this.powerUp || !this.samePoint(this.powerUp, point))
    );
  }

  private collides(point: Point, grows: boolean): boolean {
    const body = grows ? this.snake : this.snake.slice(0, -1);
    return body.some((s) => this.samePoint(s, point));
  }

  private isOutOfBounds(point: Point): boolean {
    return point.x < 0 || point.y < 0 || point.x >= this.columns || point.y >= this.rows;
  }

  private samePoint(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }

  private isOpposite(next: Direction, current: Direction): boolean {
    const a = vectors[next];
    const b = vectors[current];
    return a.x === -b.x && a.y === -b.y;
  }

  private burst(point: Point, color: string, count: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cellSize = this.canvas.width / dpr / this.columns;
    this.particles = [...this.particles, ...spawnBurst(point, color, count, cellSize)];
  }

  private snapshot(): GameSnapshot {
    const activePowerUps: ActivePowerUp[] = Array.from(this.activePowerUps).map(
      ([type, remainingMs]) => ({ type, label: powerLabels[type], remainingMs }),
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
      countdown: this.countdownDigit,
    };
  }

  private notify(): void {
    const snapshot = this.snapshot();
    this.subscribers.forEach((sub) => sub(snapshot));
  }
}
