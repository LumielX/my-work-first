import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const state = {
  revenue: [12000, 13500, 14200, 16600, 17400, 18200, 19600, 21000, 22300, 23800, 24500, 26100],
  users: 12840,
  conversion: 4.7
};

const refs = {
  revenueValue: document.getElementById("revenueValue"),
  usersValue: document.getElementById("usersValue"),
  conversionValue: document.getElementById("conversionValue"),
  refreshBtn: document.getElementById("refreshBtn"),
  threeRoot: document.getElementById("threeRoot")
};

const chart = new Chart(document.getElementById("salesChart"), {
  type: "line",
  data: {
    labels: monthLabels,
    datasets: [
      {
        label: "Revenue",
        data: state.revenue,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.18)",
        fill: true,
        tension: 0.36,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e6f6ff"
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#9fc3d6" },
        grid: { color: "rgba(159, 195, 214, 0.2)" }
      },
      y: {
        ticks: {
          color: "#9fc3d6",
          callback: (value) => `$${value / 1000}k`
        },
        grid: { color: "rgba(159, 195, 214, 0.2)" }
      }
    }
  }
});

function updateKpis() {
  const currentRevenue = state.revenue[state.revenue.length - 1];
  refs.revenueValue.textContent = `$${currentRevenue.toLocaleString()}`;
  refs.usersValue.textContent = state.users.toLocaleString();
  refs.conversionValue.textContent = `${state.conversion.toFixed(1)}%`;
}

function jitter(value, ratio = 0.08) {
  const delta = value * ratio;
  return Math.round(value + (Math.random() * delta * 2 - delta));
}

function refreshData() {
  state.revenue = state.revenue.map((item) => jitter(item, 0.06));
  state.users = jitter(state.users, 0.03);
  state.conversion = Math.max(1.2, Math.min(12, state.conversion + (Math.random() * 0.8 - 0.4)));

  chart.data.datasets[0].data = state.revenue;
  chart.update();
  updateKpis();
  updateBars();
}

refs.refreshBtn.addEventListener("click", refreshData);
updateKpis();

const scene = new THREE.Scene();
scene.background = new THREE.Color("#062233");

const camera = new THREE.PerspectiveCamera(45, refs.threeRoot.clientWidth / refs.threeRoot.clientHeight, 0.1, 1000);
camera.position.set(4.5, 4.8, 8.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(refs.threeRoot.clientWidth, refs.threeRoot.clientHeight);
refs.threeRoot.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x67e8f9, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.25);
directionalLight.position.set(7, 10, 5);
scene.add(directionalLight);

const bars = [];
const barMaterial = new THREE.MeshStandardMaterial({
  color: 0x22d3ee,
  roughness: 0.25,
  metalness: 0.45
});

function createBars() {
  const group = new THREE.Group();
  state.revenue.slice(-6).forEach((value, index) => {
    const height = value / 9000;
    const geometry = new THREE.BoxGeometry(0.6, height, 0.6);
    const mesh = new THREE.Mesh(geometry, barMaterial.clone());
    mesh.position.set(index * 0.9 - 2.25, height / 2, 0);
    mesh.material.color.setHSL(0.52 + index * 0.03, 0.78, 0.55);
    bars.push(mesh);
    group.add(mesh);
  });
  return group;
}

const barGroup = createBars();
scene.add(barGroup);

const gridHelper = new THREE.GridHelper(8, 12, 0x1d4ed8, 0x0e7490);
gridHelper.position.y = -0.01;
scene.add(gridHelper);

function updateBars() {
  const recent = state.revenue.slice(-6);
  recent.forEach((value, index) => {
    const nextHeight = value / 9000;
    const bar = bars[index];
    bar.scale.y = nextHeight / bar.geometry.parameters.height;
    bar.position.y = nextHeight / 2;
  });
}

function animate() {
  requestAnimationFrame(animate);
  barGroup.rotation.y += 0.0045;
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  const width = refs.threeRoot.clientWidth;
  const height = refs.threeRoot.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
