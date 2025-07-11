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
let basketball;
const moveSpeed = 0.1;
const moveDirection = new THREE.Vector3(0, 0, 0);
let shotPower = 50;
const shotPowerStep = 1;
let isShotInProgress = false;
let ballVelocity = new THREE.Vector3();
let ballMesh;
let leftRim, rightRim;
const gravity = -9.8 * 0.01;
let totalScore = 0;
let shotAttempts = 0;
let shotsMade = 0;
let shotStartPosition = null;

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

  if (isLeft) leftRim = rim;
  else rightRim = rim;
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
  const ballGroup = new THREE.Group();

  const ball = new THREE.Mesh(geometry, material);
  ball.castShadow = true;

  ballGroup.add(ball);
  ballMesh = ball;
  addBallSeamRings(ballGroup, ballRadius);
  ball.position.set(0, 0, 0);

  return ballGroup;
}

function addBallSeamRings(group, radius) {
  const segments = 64;
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  const ring1Points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    ring1Points.push(new THREE.Vector3(
      Math.cos(theta) * radius,
      0,
      Math.sin(theta) * radius
    ));
  }
  const ring1 = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(ring1Points),
    material
  );
  group.add(ring1);

  const ring2Points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    ring2Points.push(new THREE.Vector3(
      0,
      Math.sin(theta) * radius,
      Math.cos(theta) * radius
    ));
  }
  const ring2 = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(ring2Points),
    material
  );
  group.add(ring2);
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
  basketball = addBasketball();
  basketball.position.y = 0.23;
  basketball.hasScored = false;
  scene.add(basketball);
}

let lastBallPosition = null;

// Create all elements
createBasketballCourt();
lastBallPosition = basketball.position.clone();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Handle key events
function handleKeyDown(e) {
  switch (e.key) {
    case "o": isOrbitEnabled = !isOrbitEnabled; break;
    case "ArrowLeft": moveDirection.x = -1; break;
    case "ArrowRight": moveDirection.x = 1; break;
    case "ArrowUp": moveDirection.z = -1; break;
    case "ArrowDown": moveDirection.z = 1; break;
    case "w": case "W": shotPower = Math.min(100, shotPower + shotPowerStep); updatePowerDisplay(); break;
    case "s": case "S": shotPower = Math.max(0, shotPower - shotPowerStep); updatePowerDisplay(); break;
    case "r": case "R": resetBasketball(); break;
    case " ":
      if (!isShotInProgress) {
        shotAttempts++;
        shootBall();
      } break;
  }
}

function handleKeyUp(e) {
  switch (e.key) {
    case "ArrowLeft": moveDirection.x = 0; break;
    case "ArrowRight": moveDirection.x = 0; break;
    case "ArrowUp": moveDirection.z = 0; break;
    case "ArrowDown": moveDirection.z = 0; break;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updatePowerDisplay();
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
});

function updatePowerDisplay() {
  const display = document.getElementById("power-display");
  if (display) {
    display.textContent = `Shot Power: ${shotPower}%`;
  }
}

function shootBall() {
  isShotInProgress = true;
  basketball.hasScored = false;
  shotStartPosition = basketball.position.clone();

  const leftHoopX = -COURT_LENGTH / 2 + 0.4 + 0.3;
  const rightHoopX = COURT_LENGTH / 2 - 0.4 - 0.3;
  const targetX = (basketball.position.x < 0) ? leftHoopX : rightHoopX;
  const target = new THREE.Vector3(targetX, 2.94, 0);
  const origin = basketball.position.clone();
  const direction = target.clone().sub(origin).normalize();

  ballVelocity.set(
    direction.x * (shotPower * 0.018),
    shotPower * 0.012 + 0.25,
    direction.z * (shotPower * 0.018)
  );
}

function checkScore() {
  const scoringRimX = basketball.position.x < 0 ? -COURT_LENGTH / 2 + 0.7 : COURT_LENGTH / 2 - 0.7;
  const rimCenter = new THREE.Vector3(scoringRimX, 3.05, 0);
  const rimRadius = 0.23;
  const ballRadius = 0.12;

  const startHorizontalDist = Math.sqrt(
    Math.pow(shotStartPosition.x - rimCenter.x, 2) +
    Math.pow(shotStartPosition.z - rimCenter.z, 2)
  );

  const isFromOutside = startHorizontalDist > 0.3; 

  const horizontalDist = Math.sqrt(
    Math.pow(basketball.position.x - rimCenter.x, 2) +
    Math.pow(basketball.position.z - rimCenter.z, 2)
  );
  const withinHoop = horizontalDist < (rimRadius - ballRadius * 0.8);

  const downward = ballVelocity.y < 0;
  const passedThrough = lastBallPosition.y > rimCenter.y && basketball.position.y < rimCenter.y;

  return withinHoop && downward && passedThrough && isFromOutside;
}

function registerSuccessfulShot() {
  totalScore += 2;
  shotsMade++;

  displayShotMessage("SHOT MADE!");
  updateScoreDisplay();
}

function updateScoreDisplay() {
  const scoreEl = document.getElementById("score-text");
  const attemptsEl = document.getElementById("attempts-text");
  const madeEl = document.getElementById("made-text");
  const accuracyEl = document.getElementById("accuracy-text");

  if (scoreEl && attemptsEl && madeEl && accuracyEl) {
    const percent = shotAttempts === 0 ? 0 : ((shotsMade / shotAttempts) * 100).toFixed(1);
    scoreEl.textContent = `Score: ${totalScore}`;
    attemptsEl.textContent = `Attempts: ${shotAttempts}`;
    madeEl.textContent = `Made: ${shotsMade}`;
    accuracyEl.textContent = `Accuracy: ${percent}%`;
  }
}

function displayShotMessage(message) {
  const messageBox = document.getElementById("shot-message");
  if (messageBox) {
    messageBox.textContent = message;
    messageBox.style.opacity = 1;
    setTimeout(() => { messageBox.style.opacity = 0; }, 1500);
  }
}

function resetBasketball() {
  basketball.position.set(0, 0.23, 0);
  ballVelocity.set(0, 0, 0);
  isShotInProgress = false;
  basketball.hasScored = false;
  lastBallPosition.copy(basketball.position);
  shotPower = 50;
  updatePowerDisplay();
  totalScore = 0;
  shotAttempts = 0;
  shotsMade = 0;
  shotStartPosition = null;
  updateScoreDisplay();
}

// Animation function
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();

  // Moving basketball around
  if (basketball && !isShotInProgress) {
  const newX = basketball.position.x + moveDirection.x * moveSpeed;
  const newZ = basketball.position.z + moveDirection.z * moveSpeed;

  const halfCourtLength = COURT_LENGTH / 2 - 0.7;
  const halfCourtWidth = COURT_WIDTH / 2 - 0.7;

  basketball.position.x = THREE.MathUtils.clamp(newX, -halfCourtLength, halfCourtLength);
  basketball.position.z = THREE.MathUtils.clamp(newZ, -halfCourtWidth, halfCourtWidth);
  }

if (isShotInProgress) {
  lastBallPosition.copy(basketball.position);
  basketball.position.add(ballVelocity);
  ballVelocity.y += gravity;

  if (!basketball.hasScored && checkScore()) {
    registerSuccessfulShot();
    basketball.hasScored = true;
  }

  const ballRadius = 0.12;
  const courtY = 0.11;
  const groundY = ballRadius + courtY;

  if (basketball.position.y <= groundY) {
    basketball.position.y = groundY;
    ballVelocity.y *= -0.5;
    ballVelocity.multiplyScalar(0.8);

    if (Math.abs(ballVelocity.y) < 0.15) {
      isShotInProgress = false;
      basketball.position.y = groundY;
      lastBallPosition.copy(basketball.position);

      if (!basketball.hasScored) {
        displayShotMessage("MISSED SHOT");
        updateScoreDisplay();
      }
      basketball.hasScored = false;
    }
  }

  // Rim Collusion 
  const ballBox = new THREE.Box3().setFromObject(basketball);

  if (leftRim && rightRim) {
    const leftRimBox = new THREE.Box3().setFromObject(leftRim);
    const rightRimBox = new THREE.Box3().setFromObject(rightRim);

    if (ballBox.intersectsBox(leftRimBox) || ballBox.intersectsBox(rightRimBox)) {
      ballVelocity.x *= -0.3;
      ballVelocity.z *= -0.3;
      ballVelocity.y *= 0.5;
    }
  }
}

// Ball Rotation
if (ballMesh && lastBallPosition) {
  const movementVector = new THREE.Vector3().subVectors(basketball.position, lastBallPosition);
  const movementDistance = movementVector.length();

  if (movementDistance > 0.0001) {
    const axis = new THREE.Vector3().crossVectors(movementVector, new THREE.Vector3(0, 1, 0)).normalize();
    const ballRadius = 0.12;
    const angle = movementDistance / ballRadius;
    basketball.rotateOnAxis(axis, angle);
  }

  lastBallPosition.copy(basketball.position);
}

  renderer.render(scene, camera);
}

animate();