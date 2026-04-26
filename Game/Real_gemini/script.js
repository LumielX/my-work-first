// --- Scene Setup ---
const scene = new THREE.Scene();
let isNight = true;

scene.background = new THREE.Color(0x1a1a2e); 
scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Dim for night
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3); // Moon light
directionalLight.position.set(100, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

// --- Procedural Textures (No CORS issues) ---
function createCheckerboard() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f1a0f'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = '#152b15';
    ctx.fillRect(0,0,128,128); ctx.fillRect(128,128,128,128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(200, 200);
    return tex;
}

function createAsphalt() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,512,512);
    for(let i=0; i<1000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#222' : '#111';
        ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 400);
    return tex;
}

// --- Environment ---
const groundMat = new THREE.MeshStandardMaterial({ map: createCheckerboard(), roughness: 0.8 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const roadMat = new THREE.MeshStandardMaterial({ map: createAsphalt(), roughness: 0.9 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 4000), roadMat);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.01;
road.receiveShadow = true;
scene.add(road);

// Road Lines
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for(let i=-2000; i<2000; i+=10) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 5), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.02, i);
    scene.add(line);
}

// --- Car Setup ---
const car = new THREE.Group();

// Body
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x004444 });
const carBody = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), bodyMat);
carBody.position.y = 0.75;
carBody.castShadow = true;
car.add(carBody);

// Brake Lights (Left & Right)
const brakeMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
const leftBrake = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), brakeMat);
leftBrake.position.set(-0.7, 0.8, 2.01);
car.add(leftBrake);

const rightBrake = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), brakeMat);
rightBrake.position.set(0.7, 0.8, 2.01);
car.add(rightBrake);

// Exhaust Flame
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
const exhaustFlame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 8), flameMat);
exhaustFlame.position.set(0.6, 0.3, 2.3);
exhaustFlame.rotation.x = -Math.PI / 2;
exhaustFlame.visible = false;
car.add(exhaustFlame);

// Headlights (Spotlights)
const leftHeadlight = new THREE.SpotLight(0xffffee, 2, 150, Math.PI / 6, 0.5, 1);
leftHeadlight.position.set(-0.7, 0.8, -2);
leftHeadlight.target.position.set(-0.7, 0.8, -10);
leftHeadlight.castShadow = true;
car.add(leftHeadlight);
car.add(leftHeadlight.target);

const rightHeadlight = new THREE.SpotLight(0xffffee, 2, 150, Math.PI / 6, 0.5, 1);
rightHeadlight.position.set(0.7, 0.8, -2);
rightHeadlight.target.position.set(0.7, 0.8, -10);
rightHeadlight.castShadow = true;
car.add(rightHeadlight);
car.add(rightHeadlight.target);

scene.add(car);

// --- Physics & Game State ---
const state = {
    velocity: new THREE.Vector3(),
    speedKMH: 0,
    mass: 1200,
    drag: 0.015,
    baseGrip: 0.08,
    rpm: 800,
    maxRpm: 8000,
    gear: 1,
    gears: [
        { maxKMH: 0, torque: 0 },
        { maxKMH: 40, torque: 6000 },
        { maxKMH: 80, torque: 4000 },
        { maxKMH: 130, torque: 2500 },
        { maxKMH: 180, torque: 1500 },
        { maxKMH: 240, torque: 1000 }
    ]
};

const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => { 
    const k = e.key.toLowerCase();
    if(keys.hasOwnProperty(k)) keys[k] = true; 
    
    // Day/Night Toggle
    if(k === 't') toggleDayNight();
});
window.addEventListener('keyup', (e) => { 
    const k = e.key.toLowerCase();
    if(keys.hasOwnProperty(k)) keys[k] = false; 
});
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Elements
const speedUI = document.getElementById('speedDisplay');
const gearUI = document.getElementById('gearDisplay');
const rpmBarUI = document.getElementById('rpmBar');

function toggleDayNight() {
    isNight = !isNight;
    if (isNight) {
        scene.background.setHex(0x1a1a2e);
        scene.fog.color.setHex(0x1a1a2e);
        ambientLight.intensity = 0.2;
        directionalLight.intensity = 0.3;
        carBody.material.emissiveIntensity = 1;
        leftHeadlight.intensity = 2;
        rightHeadlight.intensity = 2;
    } else {
        scene.background.setHex(0x87CEEB);
        scene.fog.color.setHex(0x87CEEB);
        ambientLight.intensity = 0.8;
        directionalLight.intensity = 1.0;
        carBody.material.emissiveIntensity = 0;
        leftHeadlight.intensity = 0;
        rightHeadlight.intensity = 0;
    }
}

// --- Main Loop ---
function animate() {
    requestAnimationFrame(animate);

    const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    let speedUnits = state.velocity.length();
    state.speedKMH = Math.round(speedUnits * 216);
    let movementDirection = state.velocity.dot(forwardVec);
    let isReversing = movementDirection < -0.01;

    // Automatic Gear System
    if (isReversing) {
        state.gear = 'R';
    } else {
        if (state.gear === 'R') state.gear = 1;
        if (state.gear < 5 && state.speedKMH > state.gears[state.gear].maxKMH) state.gear++;
        if (state.gear > 1 && state.speedKMH < state.gears[state.gear - 1].maxKMH - 10) state.gear--;
    }

    // Engine RPM Calculation
    let prevMax = state.gear > 1 && state.gear !== 'R' ? state.gears[state.gear - 1].maxKMH : 0;
    let currentMax = state.gear === 'R' ? 40 : state.gears[state.gear].maxKMH;
    let speedInGear = Math.max(0, state.speedKMH - prevMax);
    let rpmPercent = Math.min(1, speedInGear / (currentMax - prevMax));
    
    let minRpm = (state.gear === 1 || state.gear === 'R') ? 800 : 4500;
    let targetRpm = minRpm + (state.maxRpm - minRpm) * rpmPercent;

    if (keys.w && state.speedKMH < 2) targetRpm = 4000;
    if (!keys.w && state.speedKMH > 5) targetRpm *= 0.8; 

    state.rpm += (targetRpm - state.rpm) * 0.15;

    // Engine Force
    let engineForce = 0;
    if (keys.w) {
        if (isReversing && speedUnits > 0.05) engineForce = 8000;
        else engineForce = state.gears[state.gear === 'R' ? 1 : state.gear].torque;
    }
    
    // Braking Force & Brake Lights
    if (keys.s) {
        engineForce = (!isReversing && speedUnits > 0.05) ? -12000 : -3000;
        brakeMat.color.setHex(0xff0000); // Bright Red
    } else {
        brakeMat.color.setHex(isNight ? 0x660000 : 0x220000); // Dim Red
    }

    // Exhaust Flame Logic (Backfire on throttle release at high RPM, or max RPM limit)
    if (state.rpm > 6500 && !keys.w) {
        exhaustFlame.visible = Math.random() > 0.4;
        exhaustFlame.scale.setScalar(Math.random() * 1.5 + 0.5);
    } else if (state.rpm > 7800) {
        exhaustFlame.visible = Math.random() > 0.7; // Limiter bounce
    } else {
        exhaustFlame.visible = false;
    }

    // Apply Forces
    let accelerationMag = engineForce / state.mass;
    let accelVec = forwardVec.clone().multiplyScalar(accelerationMag * (1/60));
    state.velocity.add(accelVec);
    state.velocity.multiplyScalar(1 - state.drag);

    if (speedUnits < 0.005 && !keys.w && !keys.s) {
        state.velocity.set(0, 0, 0);
        state.speedKMH = 0;
    }

    speedUnits = state.velocity.length();

    // Steering & Drift
    if (speedUnits > 0.01) {
        let sensitivity = 1 / (1 + (state.speedKMH / 80)); 
        let turnSpeed = 0.05 * sensitivity;
        let directionMult = movementDirection >= 0 ? 1 : -1;

        if (keys.a) car.rotation.y += turnSpeed * directionMult;
        if (keys.d) car.rotation.y -= turnSpeed * directionMult;

        forwardVec.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);

        let idealDirection = forwardVec.clone();
        if (movementDirection < 0) idealDirection.negate();
        
        let idealVelocity = idealDirection.multiplyScalar(speedUnits);
        let currentGrip = state.baseGrip;
        if ((keys.a || keys.d) && state.speedKMH > 60) currentGrip *= 0.5;

        state.velocity.lerp(idealVelocity, currentGrip);
    }

    car.position.add(state.velocity);

    // Infinite Road Logic (Loops the track to keep the car centered roughly)
    if (car.position.z < -2000) {
        car.position.z += 2000;
    } else if (car.position.z > 2000) {
        car.position.z -= 2000;
    }

    // Camera follow
    const relativeCameraOffset = new THREE.Vector3(0, 4, 10);
    const cameraTargetPosition = relativeCameraOffset.applyMatrix4(car.matrixWorld);
    camera.position.lerp(cameraTargetPosition, 0.15);
    camera.lookAt(car.position);

    // UI Updates
    speedUI.innerText = state.speedKMH;
    gearUI.innerText = state.gear;
    
    let rpmFillPercent = Math.max(0, Math.min(100, (state.rpm / state.maxRpm) * 100));
    rpmBarUI.style.width = `${rpmFillPercent}%`;
    
    if (state.rpm > 7000) {
        rpmBarUI.style.background = '#ff0055'; 
        rpmBarUI.style.boxShadow = '0 0 15px #ff0055';
    } else if (state.rpm > 5000) {
        rpmBarUI.style.background = '#ffea00'; 
        rpmBarUI.style.boxShadow = '0 0 15px #ffea00';
    } else {
        rpmBarUI.style.background = '#00ff00'; 
        rpmBarUI.style.boxShadow = '0 0 15px #00ff00';
    }

    renderer.render(scene, camera);
}

// Start Game
animate();
