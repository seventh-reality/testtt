// ====== Imports ======

import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.8.1/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";

// ====== ThreeJS ======

var renderer, scene, camera, floor, model, envMap;
var isModelPlaced = false;

function setupRenderer(rendererCanvas) {
  const width = rendererCanvas.width;
  const height = rendererCanvas.height;

  // Initialize renderer with rendererCanvas provided by Onirix SDK
  renderer = new THREE.WebGLRenderer({ canvas: rendererCanvas, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Ask Onirix SDK for camera parameters to create a 3D camera that fits with the AR projection.
  const cameraParams = OX.getCameraParameters();
  camera = new THREE.PerspectiveCamera(cameraParams.fov, cameraParams.aspect, 0.1, 1000);
  camera.matrixAutoUpdate = false;

  // Create an empty scene
  scene = new THREE.Scene();
function turnOnOff() {
            let image = document.getElementById('Image');
            if (image.src.match("ONbulb"))
                image.src =
"https://media.geeksforgeeks.org/wp-content/uploads/OFFbulb.jpg";
            else
                image.src =
"https://media.geeksforgeeks.org/wp-content/uploads/ONbulb.jpg";
        }
  // Add some lights
  const hemisphereLight = new THREE.HemisphereLight(0xbbbbff, 0x444422);
  scene.add(hemisphereLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 10, 0);
  scene.add(directionalLight);

  // Load env map
  const textureLoader = new THREE.TextureLoader();
  envMap = textureLoader.load("envmap.jpg");
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.encoding = THREE.sRGBEncoding;

  // Add transparent floor to generate shadows
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    })
  );

  // Rotate floor to be horizontal
  floor.rotateX(Math.PI / 2);
}

function updatePose(pose) {
  // When a new pose is detected, update the 3D camera
  let modelViewMatrix = new THREE.Matrix4();
  modelViewMatrix = modelViewMatrix.fromArray(pose);
  camera.matrix = modelViewMatrix;
  camera.matrixWorldNeedsUpdate = true;
}

function onResize() {
  // When device orientation changes, it is required to update camera params.
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const cameraParams = OX.getCameraParameters();
  camera.fov = cameraParams.fov;
  camera.aspect = cameraParams.aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function render() {
  // Just render the scene
  renderer.render(scene, camera);
}

function onHitResult(hitResult) {
  if (model && !isModelPlaced) {
    document.getElementById("transform-controls").style.display = "block";
    model.position.copy(hitResult.position);
  }
}

function placeModel() {
  isModelPlaced = true;
  OX.start();
}

function scaleModel(value) {
  model.scale.set(value, value, value);
}

function rotateModel(value) {
  model.rotation.y = value;
}

// ====== Change Model ======
function loadNewModel(url) {
  document.getElementById("audio").play();
  scene.clear();
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(url, (gltf) => {
    model = gltf.scene;
    const animations = gltf.animations;
    if (animations && animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      animations.forEach((clip) => mixer.clipAction(clip).play());
      animationMixers.push(mixer);
    }
    model.traverse((child) => {
      if (child.material) {
        child.material.envMap = envMap;
        child.material.needsUpdate = true;
      }
    });
    model.scale.set(0.5, 0.5, 0.5);
    scene.add(model);
  });
}

// ====== Onirix SDK ======

const OX = new OnirixSDK(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUyMDIsInByb2plY3RJZCI6MTQ0MjgsInJvbGUiOjMsImlhdCI6MTYxNjc1ODY5NX0.8F5eAPcBGaHzSSLuQAEgpdja9aEZ6Ca_Ll9wg84Rp5k"
);

const config = {
  mode: OnirixSDK.TrackingMode.Surface,
};

OX.init(config)
  .then((rendererCanvas) => {
    setupRenderer(rendererCanvas);

    loadNewModel("Steerad.glb");

    document.getElementById("tap-to-place").addEventListener("click", () => {
      placeModel();
      document.getElementById("transform-controls").style.display = "none";
      document.getElementById("color-controls").style.display = "block";
    });

    const scaleSlider = document.getElementById("scale-slider");
    scaleSlider.addEventListener("input", () => {
      scaleModel(scaleSlider.value / 100);
    });

    const rotationSlider = document.getElementById("rotation-slider");
    rotationSlider.addEventListener("input", () => {
      rotateModel((rotationSlider.value * Math.PI) / 180);
    });

    document.getElementById("black").addEventListener("click", () => loadNewModel("Steeradtext.glb"));
    document.getElementById("silver").addEventListener("click", () => loadNewModel("sterrad_anim.glb"));
    document.getElementById("orange").addEventListener("click", () => loadNewModel("ETHOSs.glb"));
    document.getElementById("blue").addEventListener("click", () => loadNewModel("bloodsny.glb"));

    OX.subscribe(OnirixSDK.Events.OnPose, updatePose);
    OX.subscribe(OnirixSDK.Events.OnResize, onResize);
    OX.subscribe(OnirixSDK.Events.OnTouch, onTouch);
    OX.subscribe(OnirixSDK.Events.OnHitTestResult, onHitResult);
    OX.subscribe(OnirixSDK.Events.OnFrame, render);
  })
  .catch((error) => {
    document.getElementById("loading-screen").style.display = "none";
    let errorMessage = "An unspecified error has occurred.";
    switch (error.name) {
      case "INTERNAL_ERROR":
        errorMessage = "Internal Error: Your device might not be compatible.";
        break;
      case "CAMERA_ERROR":
        errorMessage = "Camera Error: Ensure you have granted camera permissions.";
        break;
      case "SENSORS_ERROR":
        errorMessage = "Sensors Error: Ensure you have granted sensor permissions.";
        break;
      case "LICENSE_ERROR":
        errorMessage = "License Error: This experience does not exist or has been unpublished.";
        break;
    }
    document.getElementById("error-title").innerText = errorMessage;
    document.getElementById("error-screen").style.display = "flex";
  });

