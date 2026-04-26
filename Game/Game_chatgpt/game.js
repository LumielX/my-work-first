// ==========================
// CORE GAME CLASSES
// ==========================

class SceneManager {
    constructor(game) {
        this.game = game;
        this.current = "lobby";
    }

    change(scene) {
        this.current = scene;
        this.game.ui.render();
    }
}

// ==========================

class Base {
    constructor(x, hp, side) {
        this.x = x;
        this.hp = hp;
        this.maxHp = hp;
        this.side = side;
    }

    draw(ctx) {
        ctx.fillStyle = this.side === "player" ? "#22c55e" : "#ef4444";
        ctx.fillRect(this.x, 300, 60, 120);
    }
}

// ==========================

class Unit {
    constructor(x, side, config) {
        Object.assign(this, config);
        this.x = x;
        this.y = 350;
        this.side = side;
        this.hp = this.maxHp;
        this.cool = 0;
    }

    update(game) {
        this.cool -= 1;

        let target = game.units.find(u => u.side !== this.side && Math.abs(u.x - this.x) < this.range);

        if (target) {
            if (this.cool <= 0) {
                target.hp -= this.damage;
                this.cool = this.attackSpeed;
                game.spawnParticles(this.x, this.y);
                game.shake = 6;
            }
        } else {
            this.x += this.side === "player" ? this.speed : -this.speed;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.side === "player" ? "#60a5fa" : "#f87171";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==========================

class Game {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.scene = new SceneManager(this);
        this.ui = new UIManager(this);

        this.units = [];
        this.particles = [];

        this.playerBase = new Base(50, 1000, "player");
        this.enemyBase = new Base(this.canvas.width - 110, 1000, "enemy");

        this.energy = 50;
        this.maxEnergy = 100;

        this.shake = 0;

        this.lastTime = 0;

        requestAnimationFrame(this.loop.bind(this));
    }

    spawnUnit(type) {
        const configs = {
            tank: { maxHp: 200, damage: 5, speed: 0.5, range: 20, attackSpeed: 60, cost: 30 },
            dps: { maxHp: 100, damage: 10, speed: 1, range: 25, attackSpeed: 40, cost: 25 },
            fast: { maxHp: 60, damage: 6, speed: 2, range: 20, attackSpeed: 30, cost: 20 },
            ranged: { maxHp: 80, damage: 8, speed: 1, range: 100, attackSpeed: 70, cost: 35 }
        };

        let c = configs[type];
        if (this.energy >= c.cost) {
            this.energy -= c.cost;
            this.units.push(new Unit(120, "player", c));
        }
    }

    spawnEnemy() {
        let types = ["tank", "dps", "fast", "ranged"];
        let t = types[Math.floor(Math.random() * types.length)];
        let c = {
            maxHp: 80 + Math.random() * 50,
            damage: 5 + Math.random() * 5,
            speed: 0.5 + Math.random(),
            range: 30,
            attackSpeed: 50
        };
        this.units.push(new Unit(this.canvas.width - 120, "enemy", c));
    }

    spawnParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30
            });
        }
    }

    update() {
        this.energy = Math.min(this.maxEnergy, this.energy + 0.05);

        if (Math.random() < 0.02) this.spawnEnemy();

        this.units.forEach(u => u.update(this));

        this.units = this.units.filter(u => u.hp > 0);

        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });

        this.particles = this.particles.filter(p => p.life > 0);

        if (this.shake > 0) this.shake--;
    }

    draw() {
        this.ctx.save();

        if (this.shake > 0) {
            this.ctx.translate(Math.random() * 5, Math.random() * 5);
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.playerBase.draw(this.ctx);
        this.enemyBase.draw(this.ctx);

        this.units.forEach(u => u.draw(this.ctx));

        this.particles.forEach(p => {
            this.ctx.fillStyle = "orange";
            this.ctx.fillRect(p.x, p.y, 3, 3);
        });

        this.ctx.restore();
    }

    loop(time) {
        let dt = time - this.lastTime;
        this.lastTime = time;

        if (this.scene.current === "game") {
            this.update();
            this.draw();
        }

        requestAnimationFrame(this.loop.bind(this));
    }
}

// ==========================

class UIManager {
    constructor(game) {
        this.game = game;
        this.root = document.getElementById("ui-root");
        this.render();
    }

    clear() {
        this.root.innerHTML = "";
    }

    render() {
        this.clear();

        if (this.game.scene.current === "lobby") this.lobby();
        if (this.game.scene.current === "levels") this.levels();
        if (this.game.scene.current === "game") this.gameUI();
        if (this.game.scene.current === "gameover") this.gameover();
    }

    button(text, onClick) {
        let btn = document.createElement("button");
        btn.className = "ui-btn";
        btn.innerText = text;
        btn.onclick = onClick;
        return btn;
    }

    lobby() {
        let panel = document.createElement("div");
        panel.className = "panel";

        panel.appendChild(this.button("Start Game", () => {
            this.game.scene.change("game");
        }));

        panel.appendChild(this.button("Level Select", () => {
            this.game.scene.change("levels");
        }));

        this.root.appendChild(panel);
    }

    levels() {
        let panel = document.createElement("div");
        panel.className = "panel";

        ["Easy", "Medium", "Hard"].forEach(lvl => {
            panel.appendChild(this.button(lvl, () => {
                this.game.scene.change("game");
            }));
        });

        panel.appendChild(this.button("Back", () => {
            this.game.scene.change("lobby");
        }));

        this.root.appendChild(panel);
    }

    gameUI() {
        // ENERGY
        let bar = document.createElement("div");
        bar.className = "energy-bar";

        let fill = document.createElement("div");
        fill.className = "energy-fill";
        fill.style.width = (this.game.energy / this.game.maxEnergy * 100) + "%";

        bar.appendChild(fill);
        this.root.appendChild(bar);

        // UNIT BUTTONS
        let unitBar = document.createElement("div");
        unitBar.className = "unit-bar";

        ["tank", "dps", "fast", "ranged"].forEach(type => {
            let btn = document.createElement("div");
            btn.className = "unit-btn";
            btn.innerText = type;
            btn.onclick = () => this.game.spawnUnit(type);
            unitBar.appendChild(btn);
        });

        this.root.appendChild(unitBar);

        requestAnimationFrame(() => this.render());
    }

    gameover() {
        let panel = document.createElement("div");
        panel.className = "panel";

        panel.appendChild(this.button("Restart", () => location.reload()));
        panel.appendChild(this.button("Menu", () => location.reload()));

        this.root.appendChild(panel);
    }
}

// ==========================

new Game();
