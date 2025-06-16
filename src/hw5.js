import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

const COURT_LENGTH = 30;
const COURT_WIDTH = 15;

function addLine(start, end) {
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

function addThreePointArc(baselineZ, facingDirection = 1) {
  const arcRadius = 6.75;
  const arcPoints = [];

  let firstPoint = null;
  let lastPoint = null;

  for (let i = -65; i <= 65; i++) {
    const angle = THREE.MathUtils.degToRad(i);
    const z = Math.sin(angle) * arcRadius;
    const x = baselineZ - facingDirection * Math.cos(angle) * arcRadius;
    const point = new THREE.Vector3(x, 0.11, z);
    arcPoints.push(point);

    if (i === -65) firstPoint = point;
    if (i === 65) lastPoint = point;
  }

  const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arc = new THREE.Line(arcGeometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
  scene.add(arc);

  return { firstPoint, lastPoint };
}

function addBackboard(xPos) {
  const boardWidth = 1.8;
  const boardHeight = 1.05;
  const boardThickness = 0.05;
  const boardY = 3.05;
  const boardZ = 0;

  const geometry = new THREE.BoxGeometry(boardThickness, boardHeight, boardWidth);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
  });

  const backboard = new THREE.Mesh(geometry, material);
  backboard.position.set(xPos, boardY, boardZ);
  scene.add(backboard);
}

function addRim(xPos, isLeft = true) {
  const rimRadius = 0.23;
  const tubeRadius = 0.03;
  const rimY = 3.05;
  const rimZ = 0.0;

  const geometry = new THREE.TorusGeometry(rimRadius, tubeRadius, 16, 100);
  const material = new THREE.MeshPhongMaterial({ color: 0xff6600 });
  const rim = new THREE.Mesh(geometry, material);

  rim.rotation.x = Math.PI / 2;
  const offset = isLeft ? +0.3 : -0.3;
  rim.position.set(xPos + offset, rimY, rimZ);
  scene.add(rim);
}

function addSupportStructure(xPos, isLeft = true) {
  const poleHeight = 3.05;
  const poleGeometry = new THREE.CylinderGeometry(0.07, 0.07, poleHeight);
  const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  const offset = isLeft ? -0.5 : +0.5;
  pole.position.set(xPos + offset, poleHeight / 2, 0);
  scene.add(pole);
}

function addSupportArm(xPos, isLeft = true) {
  const boardY = 3.05;
  const boardZ = 0;

  const armLength = 0.5;
  const armRadius = 0.07;

  const geometry = new THREE.CylinderGeometry(armRadius, armRadius, armLength, 8);
  const material = new THREE.MeshPhongMaterial({ color: 0x999999 });
  const arm = new THREE.Mesh(geometry, material);

  arm.rotation.z = Math.PI / 2;

  const offset = isLeft ? -armLength / 2 : armLength / 2;
  arm.position.set(xPos + offset, boardY, boardZ);

  scene.add(arm);
}

function addNet(xPos, isLeft = true) {
  const rimY = 3.05;
  const rimZ = 0;
  const rimRadius = 0.23;
  const netLength = 0.4;
  const segments = 12;

  const netMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const rimX = xPos + (isLeft ? 0.3 : -0.3);

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const xOffset = Math.cos(angle) * rimRadius;
    const zOffset = Math.sin(angle) * rimRadius;

    const topPoint = new THREE.Vector3(rimX + xOffset, rimY, rimZ + zOffset);
    const bottomPoint = new THREE.Vector3(
      rimX + xOffset * 0.5,
      rimY - netLength,
      rimZ + zOffset * 0.5
    );

    const geometry = new THREE.BufferGeometry().setFromPoints([topPoint, bottomPoint]);
    const line = new THREE.Line(geometry, netMaterial);
    scene.add(line);
  }

  const rings = [
    { radius: rimRadius * 0.75, y: rimY - netLength * 0.5 },
    { radius: rimRadius * 0.45, y: rimY - netLength }
  ];

  for (const { radius, y } of rings) {
    const points = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const xOffset = Math.cos(angle) * radius;
      const zOffset = Math.sin(angle) * radius;

      points.push(new THREE.Vector3(rimX + xOffset, y, rimZ + zOffset));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const ring = new THREE.LineLoop(geometry, netMaterial);
    scene.add(ring);
  }
}

function addBasketball() {
  const ballRadius = 0.12;
  const segments = 32;
  const rings = 32;
  const geometry = new THREE.SphereGeometry(ballRadius, segments, rings);
  const material = new THREE.MeshPhongMaterial({
    color: 0xff8c00,
    shininess: 30
  });

  const ball = new THREE.Mesh(geometry, material);

  ball.position.set(0, ballRadius + 0.11, 0);
  ball.castShadow = true;
  scene.add(ball);

  addBallSeamRings(ball.position, ballRadius);
}

function addBallSeamRings(center, radius) {
  const segments = 64;
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  const ring1Points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    ring1Points.push(new THREE.Vector3(
      center.x + Math.cos(theta) * radius,
      center.y,
      center.z + Math.sin(theta) * radius
    ));
  }
  const ring1 = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(ring1Points),
    material
  );
  scene.add(ring1);

  const ring2Points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    ring2Points.push(new THREE.Vector3(
      center.x,
      center.y + Math.cos(theta) * radius,
      center.z + Math.sin(theta) * radius
    ));
  }
  const ring2 = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(ring2Points),
    material
  );
  scene.add(ring2);
}


// Create basketball court
function createBasketballCourt() {
  // Court floor - just a simple brown surface
  const courtGeometry = new THREE.BoxGeometry(COURT_LENGTH, 0.2, COURT_WIDTH);
  const courtMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xc68642,  // Brown wood color
    shininess: 50
  });
  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);

  //Center Line
  const LINE_Y = 0.11;
  addLine(
    new THREE.Vector3(0, LINE_Y, -COURT_WIDTH / 2),
    new THREE.Vector3(0, LINE_Y, COURT_WIDTH / 2)
  );
  
  // Center Circle
  const centerCircleRadius = 1.8;
  const centerCircleSegments = 64; 
  const circlePoints = [];
  for (let i = 0; i <= centerCircleSegments; i++) {
    const angle = (i / centerCircleSegments) * Math.PI * 2;
    const x = Math.cos(angle) * centerCircleRadius;
    const z = Math.sin(angle) * centerCircleRadius;
    circlePoints.push(new THREE.Vector3(x, 0.11, z));
  }
  const circleGeometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
  const circleMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const centerCircle = new THREE.LineLoop(circleGeometry, circleMaterial);
  scene.add(centerCircle);

  // Three Point Arcs
  const leftArc = addThreePointArc(-COURT_LENGTH / 2 + 1.575, -1);
  const rightArc = addThreePointArc(COURT_LENGTH / 2 - 1.575, 1);

  addLine(leftArc.firstPoint, new THREE.Vector3(-COURT_LENGTH / 2, 0.11, leftArc.firstPoint.z));
  addLine(leftArc.lastPoint, new THREE.Vector3(-COURT_LENGTH / 2, 0.11, leftArc.lastPoint.z));

  addLine(rightArc.firstPoint, new THREE.Vector3(COURT_LENGTH / 2, 0.11, rightArc.firstPoint.z));
  addLine(rightArc.lastPoint, new THREE.Vector3(COURT_LENGTH / 2, 0.11, rightArc.lastPoint.z));

  //Basketball Hoops
  //Left:
  const leftX = -COURT_LENGTH / 2 + 0.4;
  addBackboard(leftX);
  addRim(leftX, true);
  addSupportStructure(leftX, true);
  addSupportArm(leftX, true);
  addNet(leftX, true);
  //Right:
  const rightX = COURT_LENGTH / 2 - 0.4;
  addBackboard(rightX);
  addRim(rightX, false);
  addSupportStructure(rightX, false);
  addSupportArm(rightX, false);
  addNet(rightX, false);

  //Basketball
  addBasketball();
}

// Create all elements
createBasketballCourt();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;


// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();