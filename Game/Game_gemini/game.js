/** --- AUDIO SYSTEM --- */
const AudioSys = {
    ctx: null,
    init() { if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(type) {
        if(!this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        const now = this.ctx.currentTime;
        if(type === 'click') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if(type === 'spawn') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if(type === 'hit') {
            osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if(type === 'baseHit') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        }
    }
};
document.addEventListener('click', () => { AudioSys.init(); AudioSys.play('click'); });

/** --- CONSTANTS & CONFIG --- */
const CANVAS_W = 800;
const CANVAS_H = 400;
const GROUND_Y = 320;

const PLAYER_UNITS = [
    { id: 'u1', name: 'Rogue', cost: 15, hp: 80, dmg: 10, spd: 80, rng: 30, cd: 0.8, color: '#00f3ff', icon: '⚡' },
    { id: 'u2', name: 'Knight', cost: 25, hp: 250, dmg: 15, spd: 40, rng: 35, cd: 1.5, color: '#008cff', icon: '🛡️' },
    { id: 'u3', name: 'Archer', cost: 20, hp: 60, dmg: 18, spd: 50, rng: 150, cd: 1.2, color: '#00ff88', icon: '🏹', ranged: true },
    { id: 'u4', name: 'Mage', cost: 40, hp: 100, dmg: 40, spd: 40, rng: 120, cd: 2.0, color: '#b200ff', icon: '🔥', ranged: true, aoe: true }
];

const ENEMY_TYPES = [
    { name: 'Goblin', hp: 50, dmg: 5, spd: 60, rng: 30, cd: 1.0, color: '#ff3366', size: 20 },
    { name: 'Orc', hp: 200, dmg: 15, spd: 30, rng: 35, cd: 1.8, color: '#ff0000', size: 30 },
    { name: 'Troll', hp: 400, dmg: 30, spd: 20, rng: 40, cd: 2.5, color: '#990000', size: 40 },
    { name: 'Shaman', hp: 80, dmg: 12, spd: 40, rng: 140, cd: 1.5, color: '#ff00ff', size: 25, ranged: true }
];

/** --- SCENE MANAGER --- */
const sceneManager = {
    current: 'scene-lobby',
    switchScene(id) {
        document.getElementById(this.current).classList.remove('active');
        document.getElementById(id).classList.add('active');
        this.current = id;
        if(id !== 'scene-game' && game) game.stop();
    }
};

/** --- UTILS --- */
function drawRect(ctx, x, y, w, h, color, radius=4) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = color;
    ctx.fill();
}

/** --- CLASSES --- */
class Particle {
    constructor(x, y, color, speed, size=3) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed - 1;
        this.color = color;
        this.life = 1.0;
        this.size = size;
    }
    update(dt) {
        this.x += this.vx * (dt/16);
        this.y += this.vy * (dt/16);
        this.vy += 0.1; // gravity
        this.life -= dt * 0.002;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        drawRect(ctx, this.x, this.y, this.size, this.size, this.color, 1);
        ctx.globalAlpha = 1.0;
    }
}

class Projectile {
    constructor(x, y, target, dmg, color, isPlayer, aoe=false) {
        this.x = x; this.y = y;
        this.target = target;
        this.dmg = dmg;
        this.color = color;
        this.speed = 250;
        this.isPlayer = isPlayer;
        this.aoe = aoe;
        this.active = true;
    }
    update(dt, game) {
        if(!this.active) return;
        if(!this.target.active && this.target.hp <= 0 && this.target.maxHp !== undefined) {
            this.active = false; return; // Target died
        }
        
        let tx = this.target.x + (this.target.width||0)/2;
        let ty = this.target.y - (this.target.height||0)/2;
        
        let dx = tx - this.x;
        let dy = ty - this.y;
        let dist = Math.hypot(dx, dy);
        
        if(dist < 10) {
            if(this.aoe) {
                let targets = this.isPlayer ? game.enemies : game.players;
                targets.forEach(t => {
                    if(Math.abs(t.x - tx) < 60) t.takeDamage(this.dmg, game);
                });
                game.spawnParticles(tx, ty, this.color, 15, 6);
            } else {
                this.target.takeDamage(this.dmg, game);
                game.spawnParticles(tx, ty, this.color, 5, 4);
            }
            this.active = false;
        } else {
            this.x += (dx/dist) * this.speed * (dt/1000);
            this.y += (dy/dist) * this.speed * (dt/1000);
        }
    }
    draw(ctx) {
        if(!this.active) return;
        drawRect(ctx, this.x-4, this.y-4, 8, 8, this.color, 4);
    }
}

class Base {
    constructor(isPlayer) {
        this.isPlayer = isPlayer;
        this.maxHp = 1000;
        this.hp = 1000;
        this.width = 60;
        this.height = 120;
        this.x = isPlayer ? 20 : CANVAS_W - 80;
        this.y = GROUND_Y;
        this.active = true;
    }
    takeDamage(amount, game) {
        this.hp -= amount;
        AudioSys.play('baseHit');
        game.shake = 10;
        if(this.hp <= 0) {
            this.hp = 0;
            this.active = false;
        }
        game.ui.updateBaseHP();
    }
    draw(ctx) {
        let color = this.isPlayer ? '#00f3ff' : '#ff3366';
        let glow = this.isPlayer ? 'rgba(0, 243, 255, 0.3)' : 'rgba(255, 51, 102, 0.3)';
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = glow;
        drawRect(ctx, this.x, this.y - this.height, this.width, this.height, '#1a1a2e', 8);
        ctx.shadowBlur = 0;
        
        drawRect(ctx, this.x + 5, this.y - this.height + 5, this.width - 10, this.height - 10, '#2a2a40', 4);
        
        // Core crystal
        let cy = this.y - this.height/2 + Math.sin(Date.now()/300)*5;
        drawRect(ctx, this.x + 15, cy - 15, 30, 30, color, 8);
    }
}

class Unit {
    constructor(data, isPlayer, x) {
        this.isPlayer = isPlayer;
        this.x = x;
        this.width = data.size || 25;
        this.height = this.width * 1.5;
        this.y = GROUND_Y;
        
        this.maxHp = data.hp;
        this.hp = data.hp;
        this.dmg = data.dmg;
        this.speed = data.spd;
        this.range = data.rng;
        this.cd = data.cd;
        this.color = data.color;
        this.ranged = data.ranged || false;
        this.aoe = data.aoe || false;
        
        this.attackTimer = 0;
        this.active = true;
        this.state = 'walk'; // walk, attack
        this.animOffset = 0;
    }

    takeDamage(amount, game) {
        this.hp -= amount;
        AudioSys.play('hit');
        game.spawnParticles(this.x + this.width/2, this.y - this.height/2, '#fff', 3, 2);
        if(this.hp <= 0) {
            this.active = false;
            game.spawnParticles(this.x + this.width/2, this.y - this.height/2, this.color, 10, 4);
        }
    }

    update(dt, game) {
        if(!this.active) return;
        
        this.animOffset = (this.state === 'walk') ? Math.sin(Date.now()/100) * 3 : 0;
        if(this.attackTimer > 0) this.attackTimer -= dt/1000;

        let targets = this.isPlayer ? game.enemies : game.players;
        let enemyBase = this.isPlayer ? game.enemyBase : game.playerBase;
        
        let nearestTarget = null;
        let nearestDist = Infinity;
        let dir = this.isPlayer ? 1 : -1;
        let myCenter = this.x + this.width/2;

        // Find nearest unit
        for(let t of targets) {
            let tCenter = t.x + t.width/2;
            // Only care about targets in front
            if((this.isPlayer && tCenter > myCenter) || (!this.isPlayer && tCenter < myCenter)) {
                let dist = Math.abs(tCenter - myCenter);
                if(dist < nearestDist) { nearestDist = dist; nearestTarget = t; }
            }
        }

        // Check base distance
        let baseDist = Math.abs((enemyBase.x + enemyBase.width/2) - myCenter);
        if(baseDist < nearestDist) {
            nearestDist = baseDist;
            nearestTarget = enemyBase;
        }

        let attackRange = this.range + this.width/2 + (nearestTarget.width||0)/2;

        if(nearestDist <= attackRange) {
            this.state = 'attack';
            if(this.attackTimer <= 0) {
                this.attackTimer = this.cd;
                // Attack action
                if(this.ranged) {
                    game.projectiles.push(new Projectile(myCenter, this.y - this.height*0.7, nearestTarget, this.dmg, this.color, this.isPlayer, this.aoe));
                } else {
                    nearestTarget.takeDamage(this.dmg, game);
                    let hitX = this.isPlayer ? this.x + this.width : this.x;
                    game.spawnParticles(hitX, this.y - this.height/2, this.color, 5, 3);
                }
                
                // Attack animation bump
                this.x += dir * 5; 
                setTimeout(() => { if(this.active) this.x -= dir * 5; }, 100);
            }
        } else {
            this.state = 'walk';
            // Simple clumping prevention logic (stop if ally is right in front)
            let blocked = false;
            let allies = this.isPlayer ? game.players : game.enemies;
            for(let a of allies) {
                if(a === this) continue;
                let aCenter = a.x + a.width/2;
                if((this.isPlayer && aCenter > myCenter && aCenter - myCenter < this.width*0.8) || 
                   (!this.isPlayer && aCenter < myCenter && myCenter - aCenter < this.width*0.8)) {
                    blocked = true; break;
                }
            }
            if(!blocked) {
                this.x += dir * this.speed * (dt/1000);
            } else {
                this.state = 'idle';
            }
        }
    }

    draw(ctx) {
        let drawY = this.y - this.height + this.animOffset;
        
        // Body
        drawRect(ctx, this.x, drawY, this.width, this.height, this.color, 6);
        
        // Eye / Visor
        let eyeX = this.isPlayer ? this.x + this.width - 8 : this.x + 2;
        drawRect(ctx, eyeX, drawY + 8, 6, 6, '#fff', 2);
        
        // Weapon
        if(!this.ranged) {
            let wpX = this.isPlayer ? this.x + this.width - 2 : this.x - 8;
            drawRect(ctx, wpX, drawY + this.height/2, 10, 4, '#ddd', 2);
        } else {
            let wpX = this.isPlayer ? this.x + this.width - 2 : this.x - 4;
            drawRect(ctx, wpX, drawY + 10, 6, 4, '#ffdd00', 2);
        }

        // HP Bar
        let hpPct = this.hp / this.maxHp;
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x, drawY - 8, this.width, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, drawY - 8, this.width * hpPct, 4);
    }
}

/** --- UIMANAGER --- */
class UIManager {
    constructor(game) {
        this.game = game;
        this.rosterEl = document.getElementById('unit-roster');
        this.energyValEl = document.getElementById('energy-val');
        this.energyBarEl = document.getElementById('energy-bar');
        this.btnElements = [];
        this.cooldowns = [0,0,0,0];

        this.initButtons();
    }
    initButtons() {
        this.rosterEl.innerHTML = '';
        PLAYER_UNITS.forEach((unit, idx) => {
            let btn = document.createElement('div');
            btn.className = 'unit-btn disabled';
            btn.innerHTML = `
                <div class="unit-icon" style="color:${unit.color}">${unit.icon}</div>
                <div class="unit-cost">${unit.cost}</div>
                <div class="cooldown-overlay" id="cd-${idx}"></div>
            `;
            btn.onclick = () => {
                if(this.game.energy >= unit.cost && this.cooldowns[idx] <= 0) {
                    this.game.energy -= unit.cost;
                    this.cooldowns[idx] = unit.cd;
                    this.game.players.push(new Unit(unit, true, this.game.playerBase.x + 50));
                    AudioSys.play('spawn');
                }
            };
            this.rosterEl.appendChild(btn);
            this.btnElements.push(btn);
        });
    }
    update(dt) {
        this.energyValEl.innerText = Math.floor(this.game.energy);
        this.energyBarEl.style.width = `${(this.game.energy / this.game.maxEnergy) * 100}%`;

        PLAYER_UNITS.forEach((unit, idx) => {
            if(this.cooldowns[idx] > 0) this.cooldowns[idx] -= dt/1000;
            
            let cdOverlay = document.getElementById(`cd-${idx}`);
            let cdPct = this.cooldowns[idx] > 0 ? (this.cooldowns[idx] / unit.cd) * 100 : 0;
            cdOverlay.style.height = `${cdPct}%`;

            if(this.game.energy >= unit.cost && this.cooldowns[idx] <= 0) {
                this.btnElements[idx].classList.remove('disabled');
                this.btnElements[idx].style.borderColor = unit.color;
            } else {
                this.btnElements[idx].classList.add('disabled');
                this.btnElements[idx].style.borderColor = '#444';
            }
        });
    }
    updateBaseHP() {
        let pPct = Math.max(0, this.game.playerBase.hp / this.game.playerBase.maxHp) * 100;
        let ePct = Math.max(0, this.game.enemyBase.hp / this.game.enemyBase.maxHp) * 100;
        document.getElementById('player-hp-bar').style.width = pPct + '%';
        document.getElementById('enemy-hp-bar').style.width = ePct + '%';
        document.getElementById('player-hp-text').innerText = `${Math.floor(this.game.playerBase.hp)}/${this.game.playerBase.maxHp}`;
        document.getElementById('enemy-hp-text').innerText = `${Math.floor(this.game.enemyBase.hp)}/${this.game.enemyBase.maxHp}`;
    }
}

/** --- MAIN GAME CLASS --- */
class Game {
    constructor(difficulty) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.players = [];
        this.enemies = [];
        this.particles = [];
        this.projectiles = [];
        
        this.playerBase = new Base(true);
        this.enemyBase = new Base(false);
        
        this.energy = 50;
        this.maxEnergy = 100;
        this.energyRegen = 5; // per second
        
        this.difficulty = difficulty;
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 3 : 2;
        this.timeElapsed = 0;
        
        this.ui = new UIManager(this);
        this.ui.updateBaseHP();
        
        this.shake = 0;
        this.running = false;
        this.lastTime = 0;
        
        // Background elements
        this.stars = Array.from({length: 50}, () => ({
            x: Math.random() * CANVAS_W, y: Math.random() * GROUND_Y,
            s: Math.random() * 2 + 1, v: Math.random() * 0.5 + 0.1
        }));
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
        this.running = false;
    }

    spawnParticles(x, y, color, count, speed) {
        for(let i=0; i<count; i++) {
            this.particles.push(new Particle(x, y, color, speed));
        }
    }

    spawnEnemy() {
        let typeIdx = Math.floor(Math.random() * Math.min(ENEMY_TYPES.length, 1 + Math.floor(this.timeElapsed/30)));
        let enemyData = ENEMY_TYPES[typeIdx];
        
        // Scale enemy HP slightly over time
        let scale = 1 + (this.timeElapsed / 120);
        let scaledData = {...enemyData, hp: enemyData.hp * scale};
        
        this.enemies.push(new Unit(scaledData, false, this.enemyBase.x - 30));
    }

    update(dt) {
        this.timeElapsed += dt/1000;
        
        // Energy Regen
        if(this.energy < this.maxEnergy) {
            this.energy += this.energyRegen * (dt/1000);
            if(this.energy > this.maxEnergy) this.energy = this.maxEnergy;
        }

        // Enemy Spawning
        this.enemySpawnTimer += dt/1000;
        let currentSpawnRate = Math.max(1, this.enemySpawnRate - (this.timeElapsed/60) * 0.5); // Gets faster
        if(this.enemySpawnTimer >= currentSpawnRate) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
        }

        // Update Entities
        this.players.forEach(p => p.update(dt, this));
        this.enemies.forEach(e => e.update(dt, this));
        this.projectiles.forEach(p => p.update(dt, this));
        this.particles.forEach(p => p.update(dt));

        // Cleanup Dead
        this.players = this.players.filter(p => p.active);
        this.enemies = this.enemies.filter(e => e.active);
        this.projectiles = this.projectiles.filter(p => p.active);
        this.particles = this.particles.filter(p => p.life > 0);

        this.ui.update(dt);
        if(this.shake > 0) this.shake -= dt/16;

        // Win/Lose condition
        if(!this.playerBase.active || !this.enemyBase.active) {
            this.stop();
            setTimeout(() => {
                document.getElementById('gameover-title').innerText = this.playerBase.active ? "VICTORY" : "DEFEAT";
                document.getElementById('gameover-title').style.color = this.playerBase.active ? "#00f3ff" : "#ff3366";
                document.getElementById('gameover-stats').innerText = `Time: ${Math.floor(this.timeElapsed)}s`;
                sceneManager.switchScene('scene-gameover');
            }, 1000);
        }
    }

    draw() {
        this.ctx.fillStyle = '#0a0a12';
        this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        this.ctx.save();
        if(this.shake > 0) {
            let dx = (Math.random()-0.5) * this.shake;
            let dy = (Math.random()-0.5) * this.shake;
            this.ctx.translate(dx, dy);
        }

        // Draw Parallax Stars
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            this.ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            this.ctx.fillRect(s.x, s.y, s.s, s.s);
            s.x -= s.v;
            if(s.x < 0) s.x = CANVAS_W;
        });
        this.ctx.globalAlpha = 1.0;

        // Draw Ground Grid
        this.ctx.strokeStyle = '#2a2a40';
        this.ctx.lineWidth = 1;
        for(let i=0; i<CANVAS_W; i+=40) {
            this.ctx.beginPath(); this.ctx.moveTo(i, GROUND_Y); this.ctx.lineTo(i-20, CANVAS_H); this.ctx.stroke();
        }
        for(let i=GROUND_Y; i<CANVAS_H; i+=15) {
            this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(CANVAS_W, i); this.ctx.stroke();
        }
        
        // Ground line
        this.ctx.strokeStyle = '#00f3ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath(); this.ctx.moveTo(0, GROUND_Y); this.ctx.lineTo(CANVAS_W, GROUND_Y); this.ctx.stroke();

        // Draw Bases
        this.playerBase.draw(this.ctx);
        this.enemyBase.draw(this.ctx);

        // Sort by Y for slight fake depth
        let entities = [...this.players, ...this.enemies];
        entities.forEach(e => e.draw(this.ctx));
        
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));

        this.ctx.restore();
    }

    loop(timestamp) {
        if(!this.running) return;
        let dt = timestamp - this.lastTime;
        if(dt > 100) dt = 16; // Prevent huge jumps if tab was inactive
        this.lastTime = timestamp;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

let game = null;

function startGame(diff) {
    sceneManager.switchScene('scene-game');
    game = new Game(diff);
    game.start();
}
