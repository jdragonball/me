import { init } from "./init.js";
init();
import * as THREE from "three";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon-es";
import { PointerLockControlsCannon } from "./PointerLockControlsCannon.js";

function main() {

  /**
   * Example of a really barebones version of a fps game.
   */

  // three.js variables
  let camera, scene, renderer;
  let material;

  // cannon.js variables
  let world;
  let controls;
  const timeStep = 1 / 60;
  let lastCallTime = performance.now();
  let sphereShape;
  let sphereBody;
  let physicsMaterial;
  const balls = [];
  const ballMeshes = [];
  const boxes = [];
  const boxMeshes = [];

  const instructions = document.getElementById("instructions");

  initThree();
  initCannon();
  initPointerLock();
  animate();

  function initThree() {
    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 0, 500);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const spotlight = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 4, 1);
    spotlight.position.set(10, 30, 20);
    spotlight.target.position.set(0, 0, 0);

    spotlight.castShadow = true;

    spotlight.shadow.camera.near = 10;
    spotlight.shadow.camera.far = 100;
    spotlight.shadow.camera.fov = 30;

    // spotlight.shadow.bias = -0.0001
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;

    scene.add(spotlight);

    // Generic material
    material = new THREE.MeshLambertMaterial({ color: 0xdddddd });

    // Floor
    const floorGeometry = new THREE.PlaneBufferGeometry(300, 300, 100, 100);
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeometry, material);
    floor.receiveShadow = true;
    scene.add(floor);

    window.addEventListener("resize", onWindowResize);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function initCannon() {
    world = new CANNON.World();

    // Tweak contact properties.
    // Contact stiffness - use to make softer/harder contacts
    world.defaultContactMaterial.contactEquationStiffness = 1e9;

    // Stabilization time in number of timesteps
    world.defaultContactMaterial.contactEquationRelaxation = 4;

    const solver = new CANNON.GSSolver();
    solver.iterations = 7;
    solver.tolerance = 0.1;
    world.solver = new CANNON.SplitSolver(solver);
    // use this to test non-split solver
    // world.solver = solver

    world.gravity.set(0, -20, 0);

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("physics");
    const physics_physics = new CANNON.ContactMaterial(
      physicsMaterial,
      physicsMaterial,
      {
        friction: 0.0,
        restitution: 0.3,
      }
    );

    // We must add the contact materials to the world
    world.addContactMaterial(physics_physics);

    // Create the user collision sphere
    const radius = 1.3;
    sphereShape = new CANNON.Sphere(radius);
    sphereBody = new CANNON.Body({ mass: 5, material: physicsMaterial });
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(0, 5, 0);
    sphereBody.linearDamping = 0.9;
    world.addBody(sphereBody);

    // Create the ground plane
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Add boxes both in cannon.js and three.js
    const halfExtents = new CANNON.Vec3(1, 1, 1);
    const boxShape = new CANNON.Box(halfExtents);
    const boxGeometry = new THREE.BoxBufferGeometry(
      halfExtents.x * 2,
      halfExtents.y * 2,
      halfExtents.z * 2
    );

    for (let i = 0; i < 7; i++) {
      const boxBody = new CANNON.Body({ mass: 5 });
      boxBody.addShape(boxShape);
      const boxMesh = new THREE.Mesh(boxGeometry, material);

      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 1 + 1;
      const z = (Math.random() - 0.5) * 20;

      boxBody.position.set(x, y, z);
      boxMesh.position.copy(boxBody.position);

      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;

      world.addBody(boxBody);
      scene.add(boxMesh);
      boxes.push(boxBody);
      boxMeshes.push(boxMesh);
    }

    // The shooting balls
    const shootVelocity = 15;
    const ballShape = new CANNON.Sphere(0.2);
    const ballGeometry = new THREE.SphereBufferGeometry(
      ballShape.radius,
      32,
      32
    );

    // Returns a vector pointing the the diretion the camera is at
    function getShootDirection() {
      const vector = new THREE.Vector3(0, 0, 1);
      vector.unproject(camera);
      const ray = new THREE.Ray(
        sphereBody.position,
        vector.sub(sphereBody.position).normalize()
      );
      return ray.direction;
    }

    window.addEventListener("click", (event) => {
      if (!controls.enabled) {
        return;
      }

      const ballBody = new CANNON.Body({ mass: 1 });
      ballBody.addShape(ballShape);
      const ballMesh = new THREE.Mesh(ballGeometry, material);

      ballMesh.castShadow = true;
      ballMesh.receiveShadow = true;

      world.addBody(ballBody);
      scene.add(ballMesh);
      balls.push(ballBody);
      ballMeshes.push(ballMesh);

      const shootDirection = getShootDirection();
      ballBody.velocity.set(
        shootDirection.x * shootVelocity,
        shootDirection.y * shootVelocity,
        shootDirection.z * shootVelocity
      );

      // Move the ball outside the player sphere
      const x =
        sphereBody.position.x +
        shootDirection.x * (sphereShape.radius * 1.02 + ballShape.radius);
      const y =
        sphereBody.position.y +
        shootDirection.y * (sphereShape.radius * 1.02 + ballShape.radius);
      const z =
        sphereBody.position.z +
        shootDirection.z * (sphereShape.radius * 1.02 + ballShape.radius);
      ballBody.position.set(x, y, z);
      ballMesh.position.copy(ballBody.position);
    });
  }

  function initPointerLock() {
    const targetIcon = document.querySelector(".target-icon");

    controls = new PointerLockControlsCannon(camera, sphereBody);
    scene.add(controls.getObject());

    instructions.addEventListener("click", () => {
      controls.lock();
    });

    controls.addEventListener("lock", () => {
      controls.enabled = true;
      instructions.style.display = "none";
      targetIcon.style.visibility = "visible";
    });

    controls.addEventListener("unlock", () => {
      controls.enabled = false;
      instructions.style.display = null;
      targetIcon.style.visibility = "hidden";
    });

    // document.addEventListener(
    //   "pointerlockchange",
    //   (event) => {
    //     if (!document.pointerLockElement) {
    //       targetIcon.style.visibility = "hidden";
    //     } else {
    //       targetIcon.style.visibility = "visible";
    //     }
    //   },
    //   false
    // );
  }

  function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() / 1000;
    const dt = time - lastCallTime;
    lastCallTime = time;

    if (controls.enabled) {
      world.step(timeStep, dt);

      // Update ball positions
      for (let i = 0; i < balls.length; i++) {
        ballMeshes[i].position.copy(balls[i].position);
        ballMeshes[i].quaternion.copy(balls[i].quaternion);
      }

      // Update box positions
      for (let i = 0; i < boxes.length; i++) {
        boxMeshes[i].position.copy(boxes[i].position);
        boxMeshes[i].quaternion.copy(boxes[i].quaternion);
      }
    }

    controls.update(dt);
    renderer.render(scene, camera);
  }
}

main();
