import { init } from "./init.js";
init();
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon-es";

const keyStates = {};

const STEPS_PER_FRAME = 1;

const clickableObjects = [];

let mouseTime = 0;

function main() {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas });

  const targetIcon = document.querySelector(".target-icon");

  const clock = new THREE.Clock();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 20, 100);
  camera.lookAt(0, 0, 0);
  camera.rotation.order = "YXZ";

  const scene = new THREE.Scene();
  // const scene = new Physijs.Scene;
  // console.log(scene);
  scene.background = new THREE.Color("white");
  // scene.setGravity(new THREE.Vector3(0, -50, 0));

  scene.add(camera);

  const axes = new THREE.AxesHelper(1000);
  scene.add(axes);

  let world = new CANNON.World();

  let sphereShape
  let sphereBody
  let physicsMaterial

  let material = new THREE.MeshLambertMaterial({ color: 0xdddddd });

  const boxes = [];
  const boxMeshes = [];

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

  world.gravity.set(0, -100, 0);

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
    halfExtents.x * 50,
    halfExtents.y * 50,
    halfExtents.z * 50
  );

  const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x44aa88 });
  const boxBody = new CANNON.Body({ mass: 5 });
  boxBody.addShape(boxShape);
  const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

  boxBody.position.set(0, 40, -50);
  boxMesh.position.copy(boxBody.position);

  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;

  world.addBody(boxBody);
  scene.add(boxMesh);
  boxes.push(boxBody);
  boxMeshes.push(boxMesh);

  const playerVelocity = new THREE.Vector3();
  const playerDirection = new THREE.Vector3();

  document.addEventListener(
    "pointerlockchange",
    (event) => {
      if (!document.pointerLockElement) {
        targetIcon.style.visibility = "hidden";
      } else {
        targetIcon.style.visibility = "visible";
      }
    },
    false
  );

  document.addEventListener("keydown", (event) => {
    keyStates[event.code] = true;
  });

  document.addEventListener("keyup", (event) => {
    keyStates[event.code] = false;
  });

  document.addEventListener("mousedown", (event) => {
    if (document.pointerLockElement) {
      catchObjectClick(event);
    }

    document.body.requestPointerLock();

    mouseTime = performance.now();
  });

  document.addEventListener("mouseup", () => {});

  document.body.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= event.movementX / 500;
      camera.rotation.x -= event.movementY / 500;
    }
  });

  // 평면
  {
    const loader = new THREE.TextureLoader();
    // const planeGeometry = new THREE.PlaneGeometry(100, 400, 1, 1);
    // const planeMaterial = new THREE.MeshBasicMaterial({
    //   map: loader.load("./assets/textures/grass.jpg"),
    // });
    // const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    // plane.name = "grass";
    // plane.receiveShadow = true;

    // plane.rotation.x = -0.5 * Math.PI;
    // plane.position.x = 0;
    // plane.position.y = 0;
    // plane.position.z = -100;

    // scene.add(plane);
    // clickableObjects.push(plane);

    const floorMaterial = new THREE.MeshBasicMaterial({
      map: loader.load("./assets/textures/grass.jpg"),
    });
    const floorGeometry = new THREE.PlaneBufferGeometry(300, 300, 100, 100);
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.receiveShadow = true;
    scene.add(floor);

    // Create the ground plane
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
  }

  // 박스
  // {
  //   const boxWidth = 1;
  //   const boxHeight = 1;
  //   const boxDepth = 1;
  //   const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  //   const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 }); // greenish blue

  //   const cube = new THREE.Mesh(geometry, material);
  //   cube.scale.set(30, 30, 30);
  //   cube.position.set(0, 40, -50);
  //   scene.add(cube);
  //   clickableObjects.push(cube);
  // }

  // 바위
  {
    const loader = new GLTFLoader().setPath("./assets/models/rock/");
    loader.load("scene.gltf", (gltf) => {
      gltf.scene.name = "rock";
      gltf.scene.scale.set(30, 30, 30);
      gltf.scene.position.set(0, 30, 0);

      gltf.scene.traverse((child) => {
        clickableObjects.push(child);
      });

      scene.add(gltf.scene);
      clickableObjects.push(gltf.scene);
    });
  }

  // 콩맨 oversize
  // {
  //   const loader = new GLTFLoader().setPath("./assets/models/");
  //   loader.load("beanman.glb", (gltf) => {
  //     gltf.scene.name = "rock";
  //     gltf.scene.scale.set(30, 30, 30);
  //     gltf.scene.position.set(-70, 30, -100);

  //     const newMaterial = new THREE.MeshToonMaterial();
  //     newMaterial.color.setHex("0xff0077");

  //     gltf.scene.traverse((child) => {
  //       clickableObjects.push(child);
  //       if (child.isMesh) child.material = newMaterial;
  //     });

  //     scene.add(gltf.scene);
  //     clickableObjects.push(gltf.scene);
  //   });
  // }

  // 조명
  {
    const ambientLight = new THREE.AmbientLight(0x0c0c0c);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-40, 60, -10);
    spotLight.castShadow = true;
    scene.add(spotLight);
  }

  function catchObjectClick(event) {
    let vector = new THREE.Vector3(
      (window.innerWidth / 2 / window.innerWidth) * 2 - 1,
      -(window.innerHeight / 2 / window.innerHeight) * 2 + 1,
      0.5
    );
    vector = vector.unproject(camera);

    const raycaster = new THREE.Raycaster(
      camera.position,
      vector.sub(camera.position).normalize()
    );

    const intersects = raycaster.intersectObjects(clickableObjects);

    if (intersects.length > 0) {
      console.log(`${intersects[0].object.name} clicked`);

      intersects[0].object.material.transparent = true;
      intersects[0].object.material.opacity =
        intersects[0].object.material.opacity !== 0.1 ? 0.1 : 1;
    }
  }

  function getForwardVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;
  }

  function getSideVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);

    return playerDirection;
  }

  function controls(deltaTime) {
    // gives a bit of air control
    const speedDelta = deltaTime * 8;

    if (keyStates["KeyW"]) {
      playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
    }

    if (keyStates["KeyS"]) {
      playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
    }

    if (keyStates["KeyA"]) {
      playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
    }

    if (keyStates["KeyD"]) {
      playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
    }
  }

  function updatePlayer(deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1;

    playerVelocity.addScaledVector(playerVelocity, damping);

    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);

    camera.position.x += deltaPosition.x * 50;
    camera.position.z += deltaPosition.z * 50;
  }

  function initCannon() {}

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render() {
    const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      controls(deltaTime);
      updatePlayer(deltaTime);
    }

    renderer.render(scene, camera);

    requestAnimationFrame(render);

    world.step(1 / 60, deltaTime);

    // Update box positions
    for (let i = 0; i < boxes.length; i++) {
      boxMeshes[i].position.copy(boxes[i].position);
      boxMeshes[i].quaternion.copy(boxes[i].quaternion);
    }

    // scene.simulate(undefined, 1);
  }

  render();
}

main();
