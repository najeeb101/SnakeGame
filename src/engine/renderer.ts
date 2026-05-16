import type { GameStatus, Point, PowerUpType } from "../types";
import type { Particle } from "./particles";

type PowerUpPickup = Point & { type: PowerUpType };

export type RenderState = {
  snake: Point[];
  food: Point;
  powerUp: PowerUpPickup | null;
  obstacles: Point[];
  particles: Particle[];
  status: GameStatus;
  countdownDigit: number;
};

export class Renderer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private canvas: HTMLCanvasElement,
    private columns: number,
  ) {}

  render(state: RenderState, time: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = this.canvas.width / dpr;
    const cell = size / this.columns;

    this.ctx.clearRect(0, 0, size, size);
    this.drawBackground(size);
    this.drawGrid(size, cell);
    this.drawObstacles(state.obstacles, cell);
    this.drawFood(state.food, cell, time);
    if (state.powerUp) this.drawPowerUp(state.powerUp, cell, time);
    this.drawSnake(state.snake, cell);
    this.drawParticles(state.particles);
    if (state.status === "countdown" && state.countdownDigit > 0) {
      this.drawCountdown(state.countdownDigit, size);
    }
  }

  private drawBackground(size: number): void {
    const bg = this.ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, "#12143c");
    bg.addColorStop(0.52, "#080a1f");
    bg.addColorStop(1, "#09041c");
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, size, size);
  }

  private drawGrid(size: number, cell: number): void {
    this.ctx.strokeStyle = "rgba(125, 211, 252, 0.08)";
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.columns; i++) {
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

  private drawSnake(snake: Point[], cell: number): void {
    snake.forEach((segment, index) => {
      const x = segment.x * cell + 3;
      const y = segment.y * cell + 3;
      const s = cell - 6;
      const gradient = this.ctx.createLinearGradient(x, y, x + s, y + s);
      gradient.addColorStop(0, index === 0 ? "#f7fee7" : "#86efac");
      gradient.addColorStop(1, index === 0 ? "#22c55e" : "#15803d");
      this.ctx.shadowColor = index === 0 ? "rgba(190, 242, 100, 0.65)" : "rgba(34, 197, 94, 0.22)";
      this.ctx.shadowBlur = index === 0 ? 20 : 8;
      this.ctx.fillStyle = gradient;
      this.roundRect(x, y, s, s, index === 0 ? 10 : 8);
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;
  }

  private drawFood(food: Point, cell: number, time: number): void {
    const pulse = 0.86 + Math.sin(time / 150) * 0.12;
    const x = food.x * cell + cell / 2;
    const y = food.y * cell + cell / 2;
    this.ctx.fillStyle = "#facc15";
    this.ctx.shadowColor = "rgba(250, 204, 21, 0.75)";
    this.ctx.shadowBlur = 22;
    this.ctx.beginPath();
    this.ctx.arc(x, y, (cell / 2 - 4) * pulse, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawPowerUp(powerUp: PowerUpPickup, cell: number, time: number): void {
    const x = powerUp.x * cell + cell / 2;
    const y = powerUp.y * cell + cell / 2;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(time / 200);
    const color = powerUp.type === "doubleScore" ? "#e879f9" : "#67e8f9";
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 24;
    this.roundRect(-cell * 0.3, -cell * 0.3, cell * 0.6, cell * 0.6, 7);
    this.ctx.fill();
    this.ctx.restore();
    this.ctx.shadowBlur = 0;
  }

  private drawObstacles(obstacles: Point[], cell: number): void {
    this.ctx.fillStyle = "rgba(251, 113, 133, 0.82)";
    this.ctx.shadowColor = "rgba(251, 113, 133, 0.38)";
    this.ctx.shadowBlur = 12;
    obstacles.forEach((obstacle) => {
      this.roundRect(obstacle.x * cell + 5, obstacle.y * cell + 5, cell - 10, cell - 10, 6);
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;
  }

  private drawParticles(particles: Particle[]): void {
    particles.forEach((p) => {
      this.ctx.globalAlpha = 1 - p.age / p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  private drawCountdown(digit: number, size: number): void {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(7, 8, 29, 0.65)";
    this.ctx.fillRect(0, 0, size, size);
    this.ctx.font = `700 ${Math.round(size * 0.38)}px "IBM Plex Mono", monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#9dff57";
    this.ctx.shadowColor = "rgba(157, 255, 87, 0.9)";
    this.ctx.shadowBlur = 48;
    this.ctx.fillText(String(digit), size / 2, size / 2);
    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.arcTo(x + width, y, x + width, y + height, radius);
    this.ctx.arcTo(x + width, y + height, x, y + height, radius);
    this.ctx.arcTo(x, y + height, x, y, radius);
    this.ctx.arcTo(x, y, x + width, y, radius);
    this.ctx.closePath();
  }
}
