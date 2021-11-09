import { init } from "./init"; init();
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import { AmmoPhysics, PhysicsLoader, ExtendedMesh } from '@enable3d/ammo-physics';

// 컨트롤을 위한 키보드 조작 상태
const keyStates = {};

// 스텝 속도 조절
const STEPS_PER_FRAME = 5;

let player, btsMeal;

let isModalOn: Boolean = false;

const targetIcon: any = document.querySelector(".target-icon");

const itemOrbitContainer: any = document.querySelector(".item-orbit");
const itemOrbit: any = document.querySelector(".item-orbit-canvas");

const loader = new GLTFLoader();

const clickableObjects: any[] = [];

const ThreeScene = () => {
  // scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // const axes = new THREE.AxesHelper(1000);
  // scene.add(axes);

  const playerVelocity = new THREE.Vector3();
  const playerDirection = new THREE.Vector3();

  // 카메라
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.rotation.order = "YXZ";

  // 렌더러
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const div = document.getElementById('three-scene');
  if (div) {
    div.appendChild(renderer.domElement);
  }
  else {
    console.error('404!');
  }

  // 조명
  scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
  scene.add(new THREE.AmbientLight(0x666666));
  const light = new THREE.DirectionalLight(0xdfebff, 1);
  light.position.set(50, 200, 100);
  light.position.multiplyScalar(1.3);

  // 물리엔진
  const physics = new AmmoPhysics(scene);
  // physics.debug?.enable();

  const addAllEventListeners = () => {
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
      if (event.code === "KeyF") {
        toggleFullScreen();
      }
      keyStates[event.code] = true;
    });

    const toggleFullScreen = () => {
      if (!document.fullscreenElement) {
        document.body.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    document.addEventListener("keyup", (event) => {
      keyStates[event.code] = false;
    });

    document.addEventListener("mousedown", (event) => {
      if (document.pointerLockElement) {
        catchObjectClick(event);
      } else if (isModalOn === false){
        document.body.requestPointerLock();
      }
    });

    document.addEventListener("mouseup", () => { });

    document.body.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement === document.body) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
      }
    });

    // 창 크기 재조정
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    })
  }

  const setModal = () => {
    const body: any = document.querySelector('body');
    const modal: any = document.querySelector('.modal');

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.requestPointerLock();
        modal.classList.toggle('show');
        isModalOn = false;

        if (!modal.classList.contains('show')) {
          body.style.overflow = 'auto';
        }
      }
    });
  }

  const addGallery = () => {
    loader.load('./assets/models/gallery/scene.gltf', (gltf) => {
      const gallery = gltf.scene.children[0];

      gallery.scale.set(1, 1, 1);
      gallery.name = 'gallery';
      scene.add(gallery);
      // @ts-ignore
      physics.add.existing(gallery, { shape: 'concaveMesh', collisionFlags: 2, mass: 100 });
      gallery.traverse(child => {
      });

      addPlayer();
    });
  }

  /**
   * bts meal 추가
   */
  const addBTSMeal = () => {
    loader.load('./assets/models/bts_meal/scene.gltf', (gltf) => {
      btsMeal = gltf.scene;

      btsMeal.name = 'btsMeal';
      btsMeal.scale.set(0.015, 0.015, 0.015);
      btsMeal.position.set(0, 8, 0);
      btsMeal.rotation.x = 0.45;
      btsMeal.rotation.y = -1;
      scene.add(btsMeal);

      btsMeal.traverse(child => {
      });
    });
  }

  const addBuyButton = () => {
    const textLoader = new FontLoader();
    textLoader.load( './assets/fonts/helvetiker_regular.typeface.json', function ( font ) {
      const geometry = new THREE.BoxGeometry(12, 2, 1);
      const material = new THREE.MeshBasicMaterial({ opacity: 0, transparent: true });
      const textWrapper = new THREE.Mesh(geometry, material);
      textWrapper.name = 'buyButton';
      textWrapper.position.set(0, 3.625, 10);

      const textGemoetry = new THREE.TextGeometry( 'Get BTS Meal !', {
        font: font,
        size: 80,
        height: 5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 10,
        bevelSize: 3,
        bevelOffset: 0,
        bevelSegments: 5
      } );
      textGemoetry.computeBoundingBox();

      const buyButton = new THREE.Mesh(
        textGemoetry,
        new THREE.MeshBasicMaterial( { color: 0xececec, opacity: 0.7, transparent: false } )
      );
      buyButton.position.set(-5.5, 3, 10);
      buyButton.scale.set(0.015, 0.015, 0.015);

      // textWrapper.add(buyButton);
      scene.add(buyButton);
      scene.add(textWrapper);
      clickableObjects.push(textWrapper);
    } );
  }

  // 그라운드 추가
  const addGround = () => {
    const geometry = new THREE.BoxBufferGeometry(20, 1, 20);
    const material = new THREE.MeshLambertMaterial({ color: 0xc4c4c4 });
    const ground = new ExtendedMesh(geometry, material);
    ground.name = 'ground';
    scene.add(ground);
    // @ts-ignore
    physics.add.existing(ground, { collisionFlags: 1, mass: 0 });
  }

  // 잔디 추가
  const addGrass = () => {
    const loader = new THREE.TextureLoader();
    const planeGeometry = new THREE.PlaneGeometry(100, 400, 1, 1);
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: loader.load("./assets/textures/grass.jpg"),
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.name = "grass";
    plane.receiveShadow = true;

    plane.rotation.x = -0.5 * Math.PI;
    plane.position.x = 0;
    plane.position.y = 0;
    plane.position.z = -100;

    scene.add(plane);
    // @ts-ignore
    physics.add.existing(plane, { shape: 'convexMesh', collisionFlags: 1, mass: 0 })
  }

  const addPlayer = () => {
    player = new THREE.Object3D();
    player.position.set(0, 3, 40);
    player.name = 'player';
    // player.add(camera) 이게 없어도 되네
    scene.add(player)
    // @ts-ignore
    physics.add.existing(player, {
      shape: 'capsule',
      radius: 2,
      height: 2,
      offset: { y: -0.55 },
      collisionFlags: 0
    });

    player.body.setGravity(0, -150, 0);

    animate();
  }

  const addBox = (x, y, z, color, isKinematic = false) => {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshLambertMaterial({ color });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(x, y, z);
    scene.add(box);
    // @ts-ignore
    physics.add.existing(box);
    if (isKinematic) box.body.setCollisionFlags(2);
    return box
  }

  const addYellowSphere = () => {
    const geometry = new THREE.SphereBufferGeometry();
    const material = new THREE.MeshLambertMaterial({ color: 'yellow' });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 2, 5);
    sphere.name = 'yelloSphere';
    scene.add(sphere);
    // @ts-ignore
    physics.add.existing(sphere);
    sphere.body.setCollisionFlags(0);
  }

  setModal();
  addAllEventListeners();
  addGallery();
  addBTSMeal();
  addBuyButton();
  // addGround();
  // addGrass();
  // addYellowSphere();

  /**
   * 객체 클릭 catch
   */
  const catchObjectClick = (event) => {
    let vector = new THREE.Vector3(
      0,
      0,
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
      doSomething(intersects[0].object.name);
    }
  }

  const doSomething = (objectName: string) => {
    switch (objectName) {
      case "buyButton":
        document.exitPointerLock();

        const body: any = document.querySelector('body');
        const modal: any = document.querySelector('.modal');

        modal.classList.toggle('show');
        isModalOn = true;
        model.rotation.x = 0.45;
        model.rotation.y = -1.5;

        if (modal.classList.contains('show')) {
          body.style.overflow = 'hidden';
        }
    }
  }

  /**
   * 전후면 벡터 계산
   */
  const getForwardVector = () => {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;
  }

  /**
   * 측면 벡터 계산
   */
  const getSideVector = () => {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);

    return playerDirection;
  }

  /**
   * 플레이어 조작
   */
  const controls = (deltaTime) => {
    const speedDelta = deltaTime * 4;

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

  /**
   * 플레이어 조정
   */
  const updatePlayer = (deltaTime) => {
    let damping = Math.exp(-4 * deltaTime) - 1;

    playerVelocity.addScaledVector(playerVelocity, damping);

    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);

    player.body.setVelocity(
      playerVelocity.x * 20,
      playerVelocity.y * 20,
      playerVelocity.z * 20
    );

    camera.position.set(player.position.x, player.position.y + 2, player.position.z);
  }

  // clock
  const clock = new THREE.Clock()

  let step = 0;
  /**
   * 렌더링 루프
   */
  const animate = () => {
    const deltaTime = clock.getDelta()

    physics.update(deltaTime * 1000);
    physics.updateDebugger();

    if (btsMeal) {
      step += 0.04;
      btsMeal.position.y = 8 + (0.5 * (Math.cos(step)));
    }

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      controls(Math.min(0.05, deltaTime) / STEPS_PER_FRAME);
      updatePlayer(Math.min(0.05, deltaTime) / STEPS_PER_FRAME);
    }

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }
}

let model;

let orbitRotation = true;

const ItemPage = () => {
  var scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  var webGLRenderer = new THREE.WebGLRenderer( { canvas: itemOrbit });
  webGLRenderer.setClearColor('white');
  webGLRenderer.setSize(378, 378);
  webGLRenderer.shadowMap.enabled = true;

  // const axes = new THREE.AxesHelper(1000);
  // scene.add(axes);

  new GLTFLoader().load('./assets/models/bts_meal/scene.gltf', (gltf) => {
    model = gltf.scene;

    model.name = 'btsMeal';
    model.scale.set(0.03, 0.03, 0.03);
    model.position.set(0, -1, 0);
    model.rotation.x = 0.45;
    model.rotation.y = -1;
    scene.add(model);

    model.traverse(child => {
    });

    scene.add(model);
  });

  // position and point the camera to the center of the scene
  camera.position.set(0, 0, 30);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  const trackballControls = new TrackballControls(camera, webGLRenderer.domElement);
  trackballControls.rotateSpeed = 1.0;
  trackballControls.zoomSpeed = 1.2;
  trackballControls.panSpeed = 0.8;
  const clock = new THREE.Clock();

  // var ambiLight = new THREE.AmbientLight(0x111111);
  // scene.add(ambiLight);
  // var spotLight = new THREE.DirectionalLight(0xffffff);
  // spotLight.position.set(-20, 30, 40);
  // spotLight.intensity = 1.5;
  // scene.add(spotLight);

  // const spotLight2 = new THREE.DirectionalLight(0xffffff);
  // spotLight2.position.set(20, -100, 40);
  // spotLight2.intensity = 0.5;
  // scene.add(spotLight2);

  scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
  scene.add(new THREE.AmbientLight(0x666666));

  // call the render function
  var step = 0;

  trackballControls.addEventListener('start', (event) => {
    orbitRotation = false;
  })
  trackballControls.addEventListener('end', (event) => {
    orbitRotation = true;
  })

  render();

  function render() {
    var delta = clock.getDelta();
    //sphere.rotation.y=step+=0.01;
    // var delta = clock.getDelta();
    // orbitControls.update(delta);

    trackballControls.handleResize(delta);
    trackballControls.update();

    if (model && orbitRotation) {
      model.rotation.y += 0.01;
    }

    // render using requestAnimationFrame
    requestAnimationFrame(render);
    webGLRenderer.render(scene, camera);
}
}

window.addEventListener('DOMContentLoaded', () => {
  PhysicsLoader('./assets/ammo', () => ThreeScene());
  ItemPage();
})
