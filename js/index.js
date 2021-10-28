import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.133.1-a8rkd0QTHl2tMZXZJAEw/mode=imports,min/optimized/three.js';
import { FirstPersonControls } from "https://cdn.skypack.dev/pin/three@v0.133.1-a8rkd0QTHl2tMZXZJAEw/mode=imports,min/unoptimized/examples/jsm/controls/FirstPersonControls.js";

function main() {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas });

  const clock = new THREE.Clock();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 30, 100);
  camera.lookAt(0, 0, 0);
  camera.rotation.order = 'YXZ';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("white");

  scene.add(camera);

  var axes = new THREE.AxisHelper(100);
  scene.add(axes);

  // const camControls = new FirstPersonControls(camera);
  // camControls.lookSpeed = 0.2;
  // camControls.movementSpeed = 20;
  // camControls.autoForward = false;
  // camControls.noFly = true;
  // camControls.lookVertical = true;
  // camControls.constrainVertical = true;
  // camControls.verticalMin = 0.0;
  // camControls.verticalMax = 2.0;
  // camControls.lookAt(new THREE.Vector3(0, -100, 0));
  // camControls.heightMax = 0.1;
  // camControls.heightMin = 0.1;
  // camControls.lon = -150;
  // camControls.lat = 10;

  // 평면
  {
    const planeGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
  
    plane.rotation.x = -0.5 * Math.PI;
    plane.position.x = 0;
    plane.position.y = 0;
    plane.position.z = 0;
  
    scene.add(plane);
  }

  // 조명
  {
    const ambientLight = new THREE.AmbientLight(0x0c0c0c);
    scene.add(ambientLight);
  
    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-40, 60, -10);
    spotLight.castShadow = true;
    scene.add(spotLight);
  }

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
    var delta = clock.getDelta();

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    // console.log(camera.getWorldDirection)
    
    // camControls.update(delta);
    // renderer.clear();
    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
