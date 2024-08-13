// ====== Imports ======
import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.8.1/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";

// ====== ThreeJS ======
var renderer, scene, camera, car, model, floor, envMap;
var models = {}; // Store references to car models
var isCarPlaced = false;

function setupRenderer(rendererCanvas) {
  const width = rendererCanvas.width;
  const height = rendererCanvas.height;

  renderer = new THREE.WebGLRenderer({ canvas: rendererCanvas, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const cameraParams = OX.getCameraParameters();
  camera = new THREE.PerspectiveCamera(cameraParams.fov, cameraParams.aspect, 0.1, 1000);
  camera.matrixAutoUpdate = false;

  scene = new THREE.Scene();

  const hemisphereLight = new THREE.HemisphereLight(0xbbbbff, 0x444422);
  scene.add(hemisphereLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 15);
  directionalLight.position.set(0, 10, 0);
  directionalLight.rotation.set(0, 45, 0);  
  scene.add(directionalLight);

  const textureLoader = new THREE.TextureLoader();
  envMap = textureLoader.load("envmap.jpg");
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.encoding = THREE.sRGBEncoding;

  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    })
  );
  floor.rotateX(Math.PI / 2);
}

function updatePose(pose) {
  let modelViewMatrix = new THREE.Matrix4();
  modelViewMatrix = modelViewMatrix.fromArray(pose);
  camera.matrix = modelViewMatrix;
  camera.matrixWorldNeedsUpdate = true;
}

function onResize() {
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const cameraParams = OX.getCameraParameters();
  camera.fov = cameraParams.fov;
  camera.aspect = cameraParams.aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function render() {
  renderer.render(scene, camera);
}

function onHitResult(hitResult) {
  if (!isCarPlaced) {
    document.getElementById("transform-controls").style.display = "block";
    Object.values(models).forEach(model => {
      model.position.copy(hitResult.position);
    });
  }
}

function placeCar() {
  isCarPlaced = true;
  OX.start();
}

function scaleCar(value) {
  Object.values(models).forEach(model => {
    model.scale.set(value, value, value);
  });
}

function rotateCar(value) {
  Object.values(models).forEach(model => {
    model.rotation.y = value;
  });
}

function loadModel(url) {
  const gltfLoader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, (gltf) => {
      resolve(gltf.scene);
    }, undefined, reject);
  });
}

async function loadAllModels() {
  // Define model URLs for different colors
  const modelUrls = {
    black: "Steeradtext.glb",
    orange: "Steerad.glb",
    blue: "sterrad_anim.glb",
  };

  // Load all models
  for (const [color, url] of Object.entries(modelUrls)) {
    models[color] = await loadModel(url);
    models[color].traverse((child) => {
      if (child.material) {
        child.material.envMap = envMap;
        child.material.needsUpdate = true;
      }
    });
    models[color].scale.set(0.5, 0.5, 0.5);
    scene.add(models[color]);
    models[color].visible = false; // Hide all models initially
  }
  
  // Show the black model by default
  models.black.visible = true;

  document.getElementById("loading-screen").style.display = "none";
  document.getElementById("initializing").style.display = "block";
  
  document.getElementById("tap-to-place").addEventListener("click", () => {
    placeCar();
    document.getElementById("transform-controls").style.display = "none";
    document.getElementById("color-controls").style.display = "block";
  });

  const scaleSlider = document.getElementById("scale-slider");
  scaleSlider.addEventListener("input", () => {
    scaleCar(scaleSlider.value / 100);
  });

  const rotationSlider = document.getElementById("rotation-slider");
  rotationSlider.addEventListener("input", () => {
    rotateCar((rotationSlider.value * Math.PI) / 180);
  });
}

function showModel(color) {
  // Hide all models
  Object.values(models).forEach(model => model.visible = false);
  
  // Show the selected model
  if (models[color]) {
    models[color].visible = true;
  }
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

    loadAllModels(); // Load all models initially

    document.getElementById("black").addEventListener("click", () => {
      document.getElementById("audio").play();
      showModel("black");
    });

    document.getElementById("orange").addEventListener("click", () => {
      document.getElementById("audio").play();
      showModel("orange");
    });

    document.getElementById("blue").addEventListener("click", () => {
      document.getElementById("audio").play();
      showModel("blue");
    });

    OX.subscribe(OnirixSDK.Events.OnPose, function (pose) {
      updatePose(pose);
    });

    OX.subscribe(OnirixSDK.Events.OnResize, function () {
      onResize();
    });

    OX.subscribe(OnirixSDK.Events.OnTouch, function (touchPos) {
      onTouch(touchPos);
    });

    OX.subscribe(OnirixSDK.Events.OnHitTestResult, function (hitResult) {
      document.getElementById("initializing").style.display = "none";
      onHitResult(hitResult);
    });

    OX.subscribe(OnirixSDK.Events.OnFrame, function() {
      render();
    });

  })
  .catch((error) => {
    document.getElementById("loading-screen").style.display = "none";

    switch (error.name) {
      case "INTERNAL_ERROR":
        document.getElementById("error-title").innerText = "Internal Error";
        document.getElementById("error-message").innerText =
          "An unspecified error has occurred. Your device might not be compatible with this experience.";
        break;
      case "CAMERA_ERROR":
        document.getElementById("error-title").innerText = "Camera Error";
        document.getElementById("error-message").innerText =
          "Could not access your device's camera. Please, ensure you have given required permissions from your browser settings.";
        break;
      case "SENSORS_ERROR":
        document.getElementById("error-title").innerText = "Sensors Error";
        document.getElementById("error-message").innerText =
          "Could not access your device's motion sensors. Please, ensure you have given required permissions from your browser settings.";
        break;
      case "LICENSE_ERROR":
        document.getElementById("error-title").innerText = "License Error";
        document.getElementById("error-message").innerText = "This experience does not exist or has been unpublished.";
        break;
    }
    document.getElementById("error-screen").style.display = "flex";
  });
