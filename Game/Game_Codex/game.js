(() => {
"use strict";

const LEVELS = {
easy: {
label: "Easy",
playerBaseHp: 1600,
enemyBaseHp: 1450,
energyRegen: 21,
enemySpawnInterval: 2.2,
enemySpawnMin: 0.95,
enemyHpMult: 0.92,
enemyDamageMult: 0.9,
difficultyRamp: 0.02
},
medium: {
label: "Medium",
playerBaseHp: 1500,
enemyBaseHp: 1600,
energyRegen: 18,
enemySpawnInterval: 1.9,
enemySpawnMin: 0.78,
enemyHpMult: 1,
enemyDamageMult: 1,
difficultyRamp: 0.028
},
hard: {
label: "Hard",
playerBaseHp: 1420,
enemyBaseHp: 1760,
energyRegen: 16,
enemySpawnInterval: 1.68,
enemySpawnMin: 0.6,
enemyHpMult: 1.15,
enemyDamageMult: 1.14,
difficultyRamp: 0.037
}
};

const PLAYER_UNIT_DEFS = {
tank: {
id: "tank",
name: "Tank",
role: "Frontline",
cost: 40,
maxHp: 420,
damage: 24,
speed: 52,
range: 34,
cooldown: 2.8,
size: 20,
body: "#4ad4b9",
accent: "#1f8a79",
atkColor: "#80ffd8"
},
striker: {
id: "striker",
name: "DPS",
role: "Burst",
cost: 30,
maxHp: 240,
damage: 46,
speed: 68,
range: 36,
cooldown: 1.05,
size: 16,
body: "#65b5ff",
accent: "#2b68ce",
atkColor: "#a8d1ff"
},
scout: {
id: "scout",
name: "Fast",
role: "Rush",
cost: 22,
maxHp: 160,
damage: 22,
speed: 120,
range: 30,
cooldown: 0.72,
size: 13,
body: "#ffd166",
accent: "#d28c28",
atkColor: "#ffe7b1"
},
ranger: {
id: "ranger",
name: "Ranged",
role: "Backline",
cost: 36,
maxHp: 180,
damage: 30,
speed: 64,
range: 165,
cooldown: 1.38,
size: 15,
body: "#cc8bff",
accent: "#7b47d5",
atkColor: "#eed0ff",
projectile: true
}
};

const ENEMY_UNIT_DEFS = {
brute: {
id: "brute",
name: "Brute",
maxHp: 340,
damage: 24,
speed: 54,
range: 34,
cooldown: 1.55,
size: 19,
body: "#ff7f8a",
accent: "#c23f67",
atkColor: "#ffd2d8"
},
raider: {
id: "raider",
name: "Raider",
maxHp: 210,
damage: 34,
speed: 88,
range: 32,
cooldown: 1,
size: 15,
body: "#ffb85a",
accent: "#d87826",
atkColor: "#ffe0b0"
},
sniper: {
id: "sniper",
name: "Sniper",
maxHp: 170,
damage: 30,
speed: 62,
range: 170,
cooldown: 1.45,
size: 14,
body: "#f59fff",
accent: "#ac5ad3",
atkColor: "#ffd8ff",
projectile: true
},
crusher: {
id: "crusher",
name: "Crusher",
maxHp: 520,
damage: 52,
speed: 40,
range: 40,
cooldown: 1.9,
size: 24,
body: "#ff6b51",
accent: "#cb2f1a",
atkColor: "#ffd9cc"
}
};

class SceneManager {
constructor() {
this.scenes = {
lobby: document.getElementById("scene-lobby"),
levels: document.getElementById("scene-levels"),
gameplay: document.getElementById("scene-gameplay"),
gameover: document.getElementById("scene-gameover")
};
this.current = "lobby";
}

show(name) {
  Object.entries(this.scenes).forEach(([sceneName, el]) => {
    el.classList.toggle("active", sceneName === name);
  });
  this.current = name;
}
}

class AudioManager {
constructor() {
this.ctx = null;
this.enabled = true;
}

unlock() {
  if (!this.enabled) {
    return;
  }
  if (!this.ctx) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) {
      this.enabled = false;
      return;
    }
    this.ctx = new Context();
  }
  if (this.ctx.state === "suspended") {
    this.ctx.resume();
  }
}

tone(freq, duration, type, volume) {
  if (!this.ctx || !this.enabled) {
    return;
  }
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const gain = this.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(this.ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

click() {
  this.tone(620, 0.06, "triangle", 0.05);
  this.tone(830, 0.03, "triangle", 0.025);
}

attack(isHeavy = false) {
  if (isHeavy) {
    this.tone(140, 0.11, "square", 0.045);
  } else {
    this.tone(280, 0.05, "sawtooth", 0.025);
  }
}
}

class Particle {
constructor(x, y, config = {}) {
this.x = x;
this.y = y;
this.vx = config.vx ?? (Math.random() - 0.5) * 150;
this.vy = config.vy ?? (Math.random() - 0.5) * 150;
this.life = config.life ?? 0.45;
this.maxLife = this.life;
this.size = config.size ?? (2 + Math.random() * 3);
this.color = config.color ?? "rgba(255,255,255,0.9)";
this.gravity = config.gravity ?? 240;
this.drag = config.drag ?? 0.98;
this.shape = config.shape ?? "circle";
}

update(dt) {
  this.vx *= Math.pow(this.drag, dt * 60);
  this.vy += this.gravity * dt;
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  this.life -= dt;
}

draw(ctx) {
  const alpha = Math.max(this.life / this.maxLife, 0);
  if (alpha <= 0) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = this.color;
  if (this.shape === "square") {
    ctx.fillRect(this.x, this.y, this.size, this.size);
  } else {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
}

class Base {
constructor(side, x, y, width, height, maxHp) {
this.side = side;
this.x = x;
this.y = y;
this.width = width;
this.height = height;
this.maxHp = maxHp;
this.hp = maxHp;
this.hitFlash = 0;
this.pulse = Math.random() * Math.PI;
}

takeDamage(amount) {
  this.hp = Math.max(0, this.hp - amount);
  this.hitFlash = 0.14;
}

update(dt) {
  this.hitFlash = Math.max(0, this.hitFlash - dt);
  this.pulse += dt * 2.2;
}

draw(ctx) {
  const towerX = this.x;
  const towerY = this.y;
  const radius = this.side === "player" ? 18 : 20;

  ctx.save();

  const bodyGradient = ctx.createLinearGradient(towerX, towerY, towerX, towerY + this.height);
  if (this.side === "player") {
    bodyGradient.addColorStop(0, "#46e4b2");
    bodyGradient.addColorStop(1, "#1a8a6a");
  } else {
    bodyGradient.addColorStop(0, "#ff8396");
    bodyGradient.addColorStop(1, "#b52c51");
  }

  drawRoundedRect(ctx, towerX, towerY, this.width, this.height, 18);
  ctx.fillStyle = bodyGradient;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.stroke();

  const coreX = this.side === "player" ? towerX + this.width * 0.64 : towerX + this.width * 0.36;
  const coreY = towerY + this.height * 0.36;
  const pulse = 1 + Math.sin(this.pulse * 2) * 0.08;
  const flash = this.hitFlash > 0 ? 0.42 : 0;

  const coreGradient = ctx.createRadialGradient(coreX, coreY, 2, coreX, coreY, radius * pulse);
  coreGradient.addColorStop(0, this.side === "player" ? "#dbfff2" : "#fff0f5");
  coreGradient.addColorStop(0.5, this.side === "player" ? "#89ffd3" : "#ff9bb2");
  coreGradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(coreX, coreY, radius * pulse, 0, Math.PI * 2);
  ctx.fill();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    drawRoundedRect(ctx, towerX, towerY, this.width, this.height, 18);
    ctx.fill();
  }
  ctx.restore();
}
}

class Unit {
constructor(team, def, x, y) {
this.team = team;
this.def = def;
this.x = x;
this.y = y;
this.size = def.size;
this.maxHp = def.maxHp;
this.hp = def.maxHp;
this.damage = def.damage;
this.speed = def.speed;
this.range = def.range;
this.cooldown = def.cooldown;
this.attackTimer = 0.2 + Math.random() * 0.15;
this.attackBurst = 0;
this.flash = 0;
this.dead = false;
this.direction = this.team === "player" ? 1 : -1;
this.target = null;
this.moveBob = Math.random() * Math.PI * 2;
this.projectile = Boolean(def.projectile);
this.trailTimer = 0;
}

takeDamage(amount) {
  this.hp -= amount;
  this.flash = 0.12;
  if (this.hp <= 0) {
    this.dead = true;
  }
}

isInRange(targetX, targetRadius = 0) {
  const dist = Math.abs(targetX - this.x);
  return dist <= this.range + this.size + targetRadius;
}

update(dt, game) {
  if (this.dead) {
    return;
  }

  this.flash = Math.max(0, this.flash - dt);
  this.attackBurst = Math.max(0, this.attackBurst - dt * 3.4);
  this.moveBob += dt * (this.speed / 42);

  const enemies = this.team === "player" ? game.enemyUnits : game.playerUnits;
  const allied = this.team === "player" ? game.playerUnits : game.enemyUnits;
  const opposingBase = this.team === "player" ? game.enemyBase : game.playerBase;

  let closest = null;
  let closestDist = Infinity;
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    if (e.dead) {
      continue;
    }
    const dist = Math.abs(e.x - this.x);
    if (dist < closestDist) {
      closestDist = dist;
      closest = e;
    }
  }

  this.attackTimer -= dt;
  const enemyInRange = closest && this.isInRange(closest.x, closest.size);

  if (enemyInRange) {
    if (this.attackTimer <= 0) {
      this.performAttack(game, closest);
    }
    return;
  }

  const baseEdge = this.team === "player" ? opposingBase.x : (opposingBase.x + opposingBase.width);
  if (this.isInRange(baseEdge, 0)) {
    if (this.attackTimer <= 0) {
      this.performAttack(game, opposingBase);
    }
    return;
  }

  let blocked = false;
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    if (e.dead) {
      continue;
    }
    const forwardDist = (e.x - this.x) * this.direction;
    if (forwardDist >= 0 && forwardDist < this.size + e.size + 4) {
      blocked = true;
      break;
    }
  }

  if (!blocked) {
    const nextX = this.x + this.direction * this.speed * dt;
    const leftBound = game.playerBase.x + game.playerBase.width + this.size + 2;
    const rightBound = game.enemyBase.x - this.size - 2;
    this.x = clamp(nextX, leftBound, rightBound);
  }

  this.avoidAllyOverlap(allied);
  this.spawnTrail(dt, game);
}

avoidAllyOverlap(allies) {
  for (let i = 0; i < allies.length; i += 1) {
    const a = allies[i];
    if (a === this || a.dead) {
      continue;
    }
    const dx = this.x - a.x;
    const dist = Math.abs(dx);
    const minDist = this.size + a.size - 1;
    if (dist > 0 && dist < minDist) {
      const push = (minDist - dist) * 0.4 * Math.sign(dx);
      this.x += push;
    }
  }
}

spawnTrail(dt, game) {
  this.trailTimer -= dt;
  if (this.trailTimer > 0) {
    return;
  }
  this.trailTimer = 0.07 + Math.random() * 0.08;
  game.particles.push(new Particle(this.x - this.direction * this.size * 0.4, this.y + this.size * 0.72, {
    vx: -this.direction * (20 + Math.random() * 40),
    vy: -20 - Math.random() * 15,
    life: 0.28,
    size: 1.8 + Math.random() * 1.4,
    color: this.team === "player" ? "rgba(93, 248, 215, 0.75)" : "rgba(255, 138, 159, 0.75)",
    gravity: 150,
    drag: 0.9
  }));
}

performAttack(game, target) {
  this.attackTimer = this.cooldown;
  this.attackBurst = 1;

  if (this.projectile) {
    game.spawnProjectile(this, target);
  } else {
    target.takeDamage(this.damage);
    game.spawnHitBurst(this, target, this.def.atkColor);
  }

  const heavy = this.damage >= 40;
  game.audio.attack(heavy);
  game.addShake(heavy ? 5 : 2.5, heavy ? 0.12 : 0.08);
}

draw(ctx) {
  if (this.dead) {
    return;
  }

  const healthRatio = clamp(this.hp / this.maxHp, 0, 1);
  const bob = Math.sin(this.moveBob) * 2.2;
  const bounce = this.attackBurst > 0 ? this.attackBurst * 4 : 0;
  const bodyY = this.y + bob - bounce;

  ctx.save();
  ctx.translate(this.x, bodyY);

  if (this.team === "enemy") {
    ctx.scale(-1, 1);
  }

  const bodyGradient = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
  bodyGradient.addColorStop(0, this.def.body);
  bodyGradient.addColorStop(1, this.def.accent);

  ctx.fillStyle = bodyGradient;
  drawRoundedRect(ctx, -this.size, -this.size * 0.95, this.size * 2, this.size * 1.85, this.size * 0.55);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  drawRoundedRect(ctx, -this.size * 0.55, -this.size * 0.6, this.size * 1.12, this.size * 0.52, this.size * 0.25);
  ctx.fill();

  ctx.fillStyle = "rgba(12,20,42,0.55)";
  ctx.beginPath();
  ctx.ellipse(this.size * 0.35, this.size * 0.05, this.size * 0.22, this.size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = "rgba(8,15,34,0.6)";
  ctx.beginPath();
  ctx.ellipse(this.x, this.y + this.size * 0.88, this.size * 0.86, this.size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const hpBarW = this.size * 2.1;
  const hpX = this.x - hpBarW / 2;
  const hpY = this.y - this.size - 10;

  ctx.fillStyle = "rgba(8,15,34,0.65)";
  drawRoundedRect(ctx, hpX, hpY, hpBarW, 5, 4);
  ctx.fill();

  const hpGradient = ctx.createLinearGradient(hpX, hpY, hpX + hpBarW, hpY);
  if (this.team === "player") {
    hpGradient.addColorStop(0, "#6ef6c0");
    hpGradient.addColorStop(1, "#2acf8b");
  } else {
    hpGradient.addColorStop(0, "#ffab9a");
    hpGradient.addColorStop(1, "#ff678d");
  }
  ctx.fillStyle = hpGradient;
  drawRoundedRect(ctx, hpX, hpY, hpBarW * healthRatio, 5, 4);
  ctx.fill();

  if (this.flash > 0) {
    ctx.save();
    ctx.globalAlpha = this.flash * 1.8;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y - this.size * 0.1, this.size * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
}

class Enemy extends Unit {
constructor(def, x, y) {
super("enemy", def, x, y);
}
}

class Projectile {
constructor(fromUnit, target, color) {
this.team = fromUnit.team;
this.x = fromUnit.x + fromUnit.direction * (fromUnit.size * 0.75);
this.y = fromUnit.y - fromUnit.size * 0.2;
this.target = target;
this.speed = 360;
this.damage = fromUnit.damage;
this.color = color;
this.dead = false;
this.size = 4;
}

update(dt, game) {
  if (this.dead) {
    return;
  }
  if (!this.target || this.target.dead || this.target.hp <= 0) {
    this.dead = true;
    return;
  }

  let tx;
  let ty;
  if (this.target instanceof Base) {
    tx = this.target.side === "player" ? this.target.x + this.target.width : this.target.x;
    ty = this.target.y + this.target.height * 0.3;
  } else {
    tx = this.target.x;
    ty = this.target.y;
  }

  const dx = tx - this.x;
  const dy = ty - this.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 8) {
    this.target.takeDamage(this.damage);
    game.spawnHitBurst({ x: this.x, y: this.y, team: this.team }, this.target, this.color);
    game.addShake(this.damage >= 40 ? 4 : 2, 0.08);
    this.dead = true;
    return;
  }

  this.x += (dx / dist) * this.speed * dt;
  this.y += (dy / dist) * this.speed * dt;

  if (Math.random() < 0.5) {
    game.particles.push(new Particle(this.x, this.y, {
      vx: (Math.random() - 0.5) * 28,
      vy: (Math.random() - 0.5) * 28,
      life: 0.18,
      size: 1.8,
      color: this.color,
      gravity: 0,
      drag: 0.9
    }));
  }
}

draw(ctx) {
  if (this.dead) {
    return;
  }
  ctx.save();
  const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 11);
  glow.addColorStop(0, this.color);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
}

class UIManager {
constructor(game) {
this.game = game;
this.playerHpFill = document.getElementById("player-base-hp-fill");
this.enemyHpFill = document.getElementById("enemy-base-hp-fill");
this.playerHpText = document.getElementById("player-base-hp-text");
this.enemyHpText = document.getElementById("enemy-base-hp-text");
this.energyFill = document.getElementById("energy-fill");
this.energyText = document.getElementById("energy-text");
this.levelChip = document.getElementById("level-chip");
this.unitButtonsWrap = document.getElementById("unit-buttons");
this.gameOverTitle = document.getElementById("gameover-title");
this.gameOverSubtitle = document.getElementById("gameover-subtitle");
this.unitButtons = new Map();
}

initUnitButtons() {
  this.unitButtonsWrap.innerHTML = "";
  this.unitButtons.clear();

  Object.values(PLAYER_UNIT_DEFS).forEach((def) => {
    const button = document.createElement("button");
    button.className = "unit-btn";
    button.dataset.unitId = def.id;

    button.innerHTML = `
      <div class="unit-name">${def.name}</div>
      <div class="unit-meta">${def.role} | <span class="unit-cost">${def.cost} EN</span></div>
      <div class="cooldown-mask"></div>
      <div class="cooldown-text">0.0s</div>
    `;

    button.addEventListener("click", () => this.game.trySummon(def.id));
    this.unitButtonsWrap.appendChild(button);
    this.unitButtons.set(def.id, {
      button,
      mask: button.querySelector(".cooldown-mask"),
      text: button.querySelector(".cooldown-text")
    });
  });
}

updateLevelLabel(levelLabel) {
  this.levelChip.textContent = `Level: ${levelLabel}`;
}

updateHud() {
  const game = this.game;
  const playerRatio = game.playerBase ? game.playerBase.hp / game.playerBase.maxHp : 1;
  const enemyRatio = game.enemyBase ? game.enemyBase.hp / game.enemyBase.maxHp : 1;
  const energyRatio = game.maxEnergy > 0 ? game.energy / game.maxEnergy : 0;

  this.playerHpFill.style.width = `${(playerRatio * 100).toFixed(2)}%`;
  this.enemyHpFill.style.width = `${(enemyRatio * 100).toFixed(2)}%`;
  this.playerHpText.textContent = `${Math.ceil(game.playerBase.hp)} / ${game.playerBase.maxHp}`;
  this.enemyHpText.textContent = `${Math.ceil(game.enemyBase.hp)} / ${game.enemyBase.maxHp}`;
  this.energyFill.style.width = `${(energyRatio * 100).toFixed(2)}%`;
  this.energyText.textContent = `${Math.floor(game.energy)} / ${game.maxEnergy}`;

  Object.values(PLAYER_UNIT_DEFS).forEach((def) => {
    const ui = this.unitButtons.get(def.id);
    if (!ui) {
      return;
    }
    const remaining = game.summonCooldowns[def.id] || 0;
    const progress = clamp(remaining / def.cooldown, 0, 1);
    ui.mask.style.transform = `scaleY(${progress})`;
    ui.text.style.opacity = remaining > 0 ? "1" : "0";
    ui.text.textContent = `${remaining.toFixed(1)}s`;

    const insufficient = game.energy < def.cost;
    const locked = remaining > 0 || insufficient;
    ui.button.classList.toggle("locked", locked);
  });
}

flashInsufficient(unitId) {
  const ui = this.unitButtons.get(unitId);
  if (!ui) {
    return;
  }
  ui.button.classList.remove("insufficient");
  void ui.button.offsetWidth;
  ui.button.classList.add("insufficient");
}

showGameOver(isVictory) {
  this.gameOverTitle.textContent = isVictory ? "Victory" : "Defeat";
  this.gameOverSubtitle.textContent = isVictory
    ? "Enemy base destroyed. Skyline is secure."
    : "Your base fell. Rally again and push harder.";
}
}

class Game {
constructor(sceneManager) {
this.sceneManager = sceneManager;
this.canvas = document.getElementById("game-canvas");
this.ctx = this.canvas.getContext("2d");

  this.width = 1280;
  this.height = 540;
  this.canvas.width = this.width;
  this.canvas.height = this.height;

  this.audio = new AudioManager();
  this.ui = new UIManager(this);
  this.ui.initUnitButtons();

  this.level = LEVELS.easy;
  this.levelKey = "easy";
  this.running = false;
  this.lastTs = 0;

  this.playerBase = null;
  this.enemyBase = null;
  this.playerUnits = [];
  this.enemyUnits = [];
  this.projectiles = [];
  this.particles = [];

  this.energy = 0;
  this.maxEnergy = 100;
  this.energyRegen = this.level.energyRegen;
  this.summonCooldowns = {
    tank: 0,
    striker: 0,
    scout: 0,
    ranger: 0
  };

  this.enemySpawnTimer = 0;
  this.elapsed = 0;
  this.groundY = 418;

  this.shakeTime = 0;
  this.shakePower = 0;
  this.shakeX = 0;
  this.shakeY = 0;

  this.waveTicker = 0;
  this.cloudOffset = 0;

  this.loop = this.loop.bind(this);
  window.addEventListener("resize", () => this.resizeCanvas());
  this.resizeCanvas();
}

resizeCanvas() {
  const rect = this.canvas.getBoundingClientRect();
  const ratio = this.width / this.height;
  let drawWidth = rect.width;
  let drawHeight = drawWidth / ratio;
  const maxHeight = Math.min(window.innerHeight * 0.62, 540);
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight * ratio;
  }
  this.canvas.style.width = `${drawWidth}px`;
  this.canvas.style.height = `${drawHeight}px`;
}

start(levelKey) {
  this.levelKey = levelKey;
  this.level = LEVELS[levelKey];
  this.ui.updateLevelLabel(this.level.label);

  this.playerBase = new Base("player", 54, this.groundY - 188, 86, 188, this.level.playerBaseHp);
  this.enemyBase = new Base("enemy", this.width - 54 - 86, this.groundY - 188, 86, 188, this.level.enemyBaseHp);

  this.playerUnits = [];
  this.enemyUnits = [];
  this.projectiles = [];
  this.particles = [];
  this.elapsed = 0;
  this.waveTicker = 0;
  this.cloudOffset = Math.random() * 1000;
  this.shakeTime = 0;
  this.shakePower = 0;
  this.shakeX = 0;
  this.shakeY = 0;

  this.energy = 40;
  this.energyRegen = this.level.energyRegen;
  this.enemySpawnTimer = this.level.enemySpawnInterval;

  Object.keys(this.summonCooldowns).forEach((id) => {
    this.summonCooldowns[id] = 0;
  });

  this.running = true;
  this.lastTs = performance.now();
  this.ui.updateHud();
  requestAnimationFrame(this.loop);
}

stop() {
  this.running = false;
}

loop(ts) {
  if (!this.running) {
    return;
  }

  const dt = Math.min((ts - this.lastTs) / 1000, 0.033);
  this.lastTs = ts;

  this.update(dt);
  this.render();
  this.ui.updateHud();

  requestAnimationFrame(this.loop);
}

update(dt) {
  this.elapsed += dt;
  this.waveTicker += dt;

  this.playerBase.update(dt);
  this.enemyBase.update(dt);

  this.energy = clamp(this.energy + this.energyRegen * dt, 0, this.maxEnergy);
  Object.keys(this.summonCooldowns).forEach((id) => {
    this.summonCooldowns[id] = Math.max(0, this.summonCooldowns[id] - dt);
  });

  this.enemySpawnTimer -= dt;
  if (this.enemySpawnTimer <= 0) {
    this.spawnEnemy();
    const dynamicInterval = Math.max(
      this.level.enemySpawnMin,
      this.level.enemySpawnInterval - this.elapsed * this.level.difficultyRamp
    );
    this.enemySpawnTimer = dynamicInterval * (0.82 + Math.random() * 0.46);
  }

  this.playerUnits.forEach((u) => u.update(dt, this));
  this.enemyUnits.forEach((u) => u.update(dt, this));
  this.projectiles.forEach((p) => p.update(dt, this));
  this.particles.forEach((p) => p.update(dt));

  this.handleDeaths();
  this.updateShake(dt);

  if (this.playerBase.hp <= 0 || this.enemyBase.hp <= 0) {
    this.finishRound(this.enemyBase.hp <= 0);
  }
}

updateShake(dt) {
  this.shakeTime = Math.max(0, this.shakeTime - dt);
  if (this.shakeTime <= 0) {
    this.shakePower = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    return;
  }
  this.shakeX = (Math.random() * 2 - 1) * this.shakePower;
  this.shakeY = (Math.random() * 2 - 1) * this.shakePower;
}

addShake(intensity, time) {
  this.shakePower = Math.max(this.shakePower, intensity);
  this.shakeTime = Math.max(this.shakeTime, time);
}

finishRound(victory) {
  this.stop();
  this.ui.showGameOver(victory);
  this.sceneManager.show("gameover");
}

spawnEnemy() {
  const t = this.elapsed;
  let pool;
  if (t < 22) {
    pool = ["brute", "raider", "sniper"];
  } else if (t < 48) {
    pool = ["brute", "raider", "sniper", "crusher", "raider"];
  } else {
    pool = ["brute", "raider", "sniper", "crusher", "crusher", "raider"];
  }

  const key = pool[Math.floor(Math.random() * pool.length)];
  const baseDef = ENEMY_UNIT_DEFS[key];
  const def = {
    ...baseDef,
    maxHp: Math.round(baseDef.maxHp * this.level.enemyHpMult * (1 + this.elapsed * 0.006)),
    damage: Math.round(baseDef.damage * this.level.enemyDamageMult * (1 + this.elapsed * 0.0038))
  };
  const yVariance = (Math.random() - 0.5) * 14;
  const enemy = new Enemy(def, this.enemyBase.x - 28 - Math.random() * 8, this.groundY + yVariance);
  this.enemyUnits.push(enemy);

  for (let i = 0; i < 5; i += 1) {
    this.particles.push(new Particle(enemy.x, enemy.y - 4, {
      vx: -10 - Math.random() * 60,
      vy: -100 - Math.random() * 70,
      life: 0.5,
      size: 2 + Math.random() * 2,
      color: "rgba(255, 150, 170, 0.8)",
      gravity: 180
    }));
  }
}

trySummon(unitId) {
  if (!this.running) {
    return;
  }
  const def = PLAYER_UNIT_DEFS[unitId];
  if (!def) {
    return;
  }

  if (this.summonCooldowns[unitId] > 0) {
    this.ui.flashInsufficient(unitId);
    return;
  }

  if (this.energy < def.cost) {
    this.ui.flashInsufficient(unitId);
    this.addShake(1.4, 0.05);
    return;
  }

  this.energy -= def.cost;
  this.summonCooldowns[unitId] = def.cooldown;
  const yVariance = (Math.random() - 0.5) * 12;
  const unit = new Unit("player", def, this.playerBase.x + this.playerBase.width + 30 + Math.random() * 8, this.groundY + yVariance);
  this.playerUnits.push(unit);

  this.audio.click();
  this.spawnSummonPulse(unit);
}

spawnSummonPulse(unit) {
  for (let i = 0; i < 10; i += 1) {
    this.particles.push(new Particle(unit.x, unit.y - 2, {
      vx: (Math.random() - 0.5) * 140,
      vy: -70 - Math.random() * 130,
      life: 0.45,
      size: 2 + Math.random() * 2,
      color: "rgba(124, 245, 255, 0.8)",
      gravity: 170
    }));
  }
}

spawnProjectile(attacker, target) {
  this.projectiles.push(new Projectile(attacker, target, attacker.def.atkColor || "rgba(255,255,255,0.85)"));
}

spawnHitBurst(attacker, target, color) {
  const tx = target instanceof Base
    ? (target.side === "player" ? target.x + target.width : target.x)
    : target.x;
  const ty = target instanceof Base
    ? target.y + target.height * 0.35
    : target.y;

  for (let i = 0; i < 8; i += 1) {
    this.particles.push(new Particle(tx, ty, {
      vx: (Math.random() - 0.5) * 180,
      vy: -80 - Math.random() * 130,
      life: 0.28 + Math.random() * 0.2,
      size: 1.8 + Math.random() * 2.4,
      color,
      gravity: 260,
      drag: 0.9,
      shape: i % 2 === 0 ? "circle" : "square"
    }));
  }

  if (target instanceof Base) {
    for (let i = 0; i < 10; i += 1) {
      this.particles.push(new Particle(tx, ty + 16, {
        vx: (Math.random() - 0.5) * 190,
        vy: -130 - Math.random() * 140,
        life: 0.45,
        size: 2 + Math.random() * 2,
        color: "rgba(255,255,255,0.85)",
        gravity: 220
      }));
    }
  }

  const ax = attacker.x ?? tx;
  for (let i = 0; i < 2; i += 1) {
    this.particles.push(new Particle(ax, (attacker.y ?? ty) - 4, {
      vx: (Math.random() - 0.5) * 40,
      vy: -40 - Math.random() * 20,
      life: 0.16,
      size: 1.6,
      color: "rgba(255,255,255,0.65)",
      gravity: 80,
      drag: 0.8
    }));
  }
}

handleDeaths() {
  this.playerUnits = this.playerUnits.filter((unit) => {
    if (!unit.dead) {
      return true;
    }
    this.spawnDeathBurst(unit);
    return false;
  });

  this.enemyUnits = this.enemyUnits.filter((unit) => {
    if (!unit.dead) {
      return true;
    }
    this.spawnDeathBurst(unit);
    return false;
  });

  this.projectiles = this.projectiles.filter((p) => !p.dead);
  this.particles = this.particles.filter((p) => p.life > 0);
}

spawnDeathBurst(unit) {
  for (let i = 0; i < 12; i += 1) {
    this.particles.push(new Particle(unit.x, unit.y - 3, {
      vx: (Math.random() - 0.5) * 170,
      vy: -70 - Math.random() * 150,
      life: 0.38 + Math.random() * 0.3,
      size: 2 + Math.random() * 2.8,
      color: unit.team === "player" ? "rgba(113, 245, 220, 0.78)" : "rgba(255, 136, 160, 0.78)",
      gravity: 230,
      drag: 0.91
    }));
  }
  this.addShake(2.1, 0.08);
}

render() {
  const ctx = this.ctx;
  ctx.clearRect(0, 0, this.width, this.height);
  this.drawBackground(ctx);

  ctx.save();
  ctx.translate(this.shakeX, this.shakeY);

  this.playerBase.draw(ctx);
  this.enemyBase.draw(ctx);

  this.playerUnits.forEach((u) => u.draw(ctx));
  this.enemyUnits.forEach((u) => u.draw(ctx));
  this.projectiles.forEach((p) => p.draw(ctx));
  this.particles.forEach((p) => p.draw(ctx));

  ctx.restore();

  this.drawWaveIndicator(ctx);
}

drawBackground(ctx) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
  skyGrad.addColorStop(0, "#8edbff");
  skyGrad.addColorStop(0.55, "#9ad4ff");
  skyGrad.addColorStop(1, "#6db3f0");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, this.width, this.groundY + 30);

  this.cloudOffset += 0.28;
  this.drawCloud(ctx, (120 + this.cloudOffset * 0.35) % (this.width + 260) - 130, 72, 1.1);
  this.drawCloud(ctx, (580 + this.cloudOffset * 0.25) % (this.width + 320) - 160, 122, 0.85);
  this.drawCloud(ctx, (960 + this.cloudOffset * 0.18) % (this.width + 280) - 140, 95, 0.95);

  ctx.fillStyle = "rgba(35, 89, 146, 0.55)";
  for (let i = 0; i < 9; i += 1) {
    const x = i * 170 + (this.cloudOffset * 0.62) % 170;
    const h = 70 + Math.sin(i * 0.9 + this.elapsed) * 24;
    ctx.fillRect(x - 40, this.groundY - 46 - h, 120, h);
  }

  const groundGradient = ctx.createLinearGradient(0, this.groundY - 22, 0, this.height);
  groundGradient.addColorStop(0, "#56b66e");
  groundGradient.addColorStop(0.45, "#3f9154");
  groundGradient.addColorStop(1, "#235a35");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, this.groundY - 20, this.width, this.height - this.groundY + 20);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < this.width; i += 45) {
    const sway = Math.sin((i + this.elapsed * 180) * 0.012) * 1.8;
    ctx.fillRect(i, this.groundY - 21 + sway, 26, 2);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, this.groundY - 20);
  ctx.lineTo(this.width, this.groundY - 20);
  ctx.stroke();
}

drawCloud(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.beginPath();
  ctx.arc(0, 16, 20, 0, Math.PI * 2);
  ctx.arc(18, 8, 27, 0, Math.PI * 2);
  ctx.arc(44, 15, 21, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

drawWaveIndicator(ctx) {
  const phase = (Math.sin(this.waveTicker * 2.2) + 1) * 0.5;
  const intensity = Math.min(1, this.elapsed / 72);
  const width = 220;
  const x = this.width * 0.5 - width * 0.5;
  const y = 12;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(8,18,42,0.6)";
  drawRoundedRect(ctx, x, y, width, 22, 12);
  ctx.fill();

  const fill = width * (0.15 + intensity * 0.85 * (0.5 + phase * 0.5));
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, "#6ad8ff");
  grad.addColorStop(1, "#ff85a1");
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, x + 2, y + 2, Math.max(8, fill - 4), 18, 9);
  ctx.fill();

  ctx.fillStyle = "#eaf4ff";
  ctx.font = "700 12px Exo 2";
  ctx.textAlign = "center";
  ctx.fillText("Enemy Pressure", this.width / 2, y + 15);
  ctx.restore();
}
}

function drawRoundedRect(ctx, x, y, w, h, r) {
const radius = Math.min(r, w / 2, h / 2);
ctx.beginPath();
ctx.moveTo(x + radius, y);
ctx.lineTo(x + w - radius, y);
ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
ctx.lineTo(x + w, y + h - radius);
ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
ctx.lineTo(x + radius, y + h);
ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
ctx.lineTo(x, y + radius);
ctx.quadraticCurveTo(x, y, x + radius, y);
ctx.closePath();
}

function clamp(v, min, max) {
return Math.max(min, Math.min(max, v));
}

function setupApp() {
const sceneManager = new SceneManager();
const game = new Game(sceneManager);

const selectedLevelLabel = document.getElementById("selected-level-label");
const levelCards = Array.from(document.querySelectorAll(".level-card"));
const btnStart = document.getElementById("btn-start");
const btnLevels = document.getElementById("btn-levels");
const btnLevelBack = document.getElementById("btn-level-back");
const btnRestart = document.getElementById("btn-restart");
const btnBackLobby = document.getElementById("btn-back-lobby");
const btnGameMenu = document.getElementById("btn-game-menu");

let selectedLevelKey = "easy";

const setLevel = (key) => {
  selectedLevelKey = key;
  selectedLevelLabel.textContent = LEVELS[key].label;
  levelCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.level === key);
  });
};

const openGameplay = () => {
  game.audio.unlock();
  sceneManager.show("gameplay");
  game.start(selectedLevelKey);
};

setLevel(selectedLevelKey);

btnStart.addEventListener("click", () => {
  game.audio.unlock();
  game.audio.click();
  openGameplay();
});

btnLevels.addEventListener("click", () => {
  game.audio.unlock();
  game.audio.click();
  sceneManager.show("levels");
});

btnLevelBack.addEventListener("click", () => {
  game.audio.click();
  sceneManager.show("lobby");
});

levelCards.forEach((card) => {
  card.addEventListener("click", () => {
    game.audio.unlock();
    game.audio.click();
    setLevel(card.dataset.level);
    sceneManager.show("lobby");
  });
});

btnRestart.addEventListener("click", () => {
  game.audio.unlock();
  game.audio.click();
  openGameplay();
});

btnBackLobby.addEventListener("click", () => {
  game.audio.click();
  game.stop();
  sceneManager.show("lobby");
});

btnGameMenu.addEventListener("click", () => {
  game.audio.click();
  game.stop();
  sceneManager.show("lobby");
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.lastTs = performance.now();
  }
});
}

window.addEventListener("DOMContentLoaded", setupApp);
})();
