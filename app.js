import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.8.1/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/controls/OrbitControls.js";

// ====== ThreeJS ======
var renderer, scene, camera, floor, envMap;
var models = []; // Array to hold multiple models
var currentModelIndex = 0; // Track the current model index
var currentModel = null; // Reference to the currently loaded model 
var isCarPlaced = false;




// For pinch-to-zoom and pinch rotation
var initialPinchDistance = null;
var initialPinchScale = 1;
var initialPinchAngle = null;
var initialModelRotation = null;

// For single-finger drag
var dragging = false;
var dragStartPosition = new THREE.Vector2();
var dragObjectOffset = new THREE.Vector3();
var modelWorldMatrix = new THREE.Matrix4();

// Orbit Controls
var controls;

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
  scene.add(floor);

  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;

  // Add touch event listeners for pinch-to-zoom, pinch rotation, and drag
  renderer.domElement.addEventListener('touchstart', handleTouchStart, false);
  renderer.domElement.addEventListener('touchmove', handleTouchMove, false);
  renderer.domElement.addEventListener('touchend', handleTouchEnd, false);
}

function handleTouchStart(event) {
  if (event.touches.length === 2) {
    // Pinch-to-zoom and pinch rotation
    initialPinchDistance = calculateDistance(event.touches[0], event.touches[1]);
    initialPinchScale = currentModel ? currentModel.scale.x : 1;
    initialPinchAngle = calculateAngle(event.touches[0], event.touches[1]);
    initialModelRotation = currentModel ? currentModel.rotation.y : 0;
  } else if (event.touches.length === 1) {
    // Start drag
    dragging = false;
    const touch = event.touches[0];
    dragStartPosition.set(touch.clientX, touch.clientY);
    if (currentModel) {
      // Calculate offset
      modelWorldMatrix.copy(currentModel.matrixWorld);
      dragObjectOffset.copy(currentModel.position);
    }
  }
}

function handleTouchMove(event) {
  if (event.touches.length === 2 && initialPinchDistance !== null) {
    // Pinch-to-zoom
    const currentPinchDistance = calculateDistance(event.touches[0], event.touches[1]);
    const scaleFactor = currentPinchDistance / initialPinchDistance;
    if (currentModel) {
      currentModel.scale.set(initialPinchScale * scaleFactor, initialPinchScale * scaleFactor, initialPinchScale * scaleFactor);
    }

    // Pinch rotation
    const currentPinchAngle = calculateAngle(event.touches[0], event.touches[1]);
    const angleDifference = currentPinchAngle - initialPinchAngle;
    if (currentModel) {
      currentModel.rotation.y = initialModelRotation + angleDifference;
    }
  } else if (event.touches.length === 1 && dragging) {
    const touch = event.touches[0];
    const currentTouchPosition = new THREE.Vector2(touch.clientX, touch.clientY);
    const delta = new THREE.Vector2().subVectors(currentTouchPosition, dragStartPosition);

    // Move model based on drag delta
    if (currentModel) {
      const deltaPosition = new THREE.Vector3(
        delta.x / window.innerWidth * 2,
        -delta.y / window.innerHeight * 2,
        0
      ).applyMatrix4(modelWorldMatrix);
      currentModel.position.copy(dragObjectOffset).add(deltaPosition);

      // Update start position
      dragStartPosition.copy(currentTouchPosition);
    }
  }
}

function handleTouchEnd(event) {
  if (event.touches.length < 2) {
    initialPinchDistance = null;
    initialPinchScale = 1;
    initialPinchAngle = null;
    initialModelRotation = null;
    dragging = false;
  }
}

function calculateDistance(touch1, touch2) {
  const dx = touch1.pageX - touch2.pageX;
  const dy = touch1.pageY - touch2.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateAngle(touch1, touch2) {
  const dx = touch2.pageX - touch1.pageX;
  const dy = touch2.pageY - touch1.pageY;
  return Math.atan2(dy, dx);
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
  controls.update(); // Update controls on resize
}

function render() {
  controls.update(); // Update controls on each frame
  renderer.render(scene, camera);
}

function onHitResult(hitResult) {
  if (currentModel && !isCarPlaced) {
    document.getElementById("transform-controls").style.display = "block";
    currentModel.position.copy(hitResult.position);
  }
}

function placeCar() {
  isCarPlaced = true;
  document.getElementById("tap-to-place").disabled = true; // Disable the button after placing
  OX.start();
}

function scaleCar(value) {
  if (currentModel) {
    currentModel.scale.set(value, value, value);
  }
}

function rotateCar(value) {
  if (currentModel) {
    currentModel.rotation.y = value;
  }
}

function changeCarColor(value) {
  if (currentModel) {
    currentModel.traverse((child) => {
      if (child.material && child.material.name === "CarPaint") {
        child.material.color.setHex(value);
      }
    });
  }
}

function loadModel(modelPath) {
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(modelPath, (gltf) => {
    const newModel = gltf.scene;
    newModel.traverse((child) => {
      if (child.material) {
        child.material.envMap = envMap;
        child.material.needsUpdate = true;
      }
    });
    newModel.scale.set(0.5, 0.5, 0.5);

    // Remove the current model if it exists
  if (currentModel) {
     scene.remove(currentModel);
      // Reset dragging state
      dragging = false;
    }
   currentModel = newModel;
   scene.add(currentModel);
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

    // Initial model load
 

// Example usage
  loadModel("Steerad.glb");
   
   

    // Hide loading screen once the model is loaded
    document.getElementById("loading-screen").style.display = "none";
    document.getElementById("initializing").style.display = "block";

    document.getElementById("tap-to-place").addEventListener("click", () => {
      placeCar();
      document.getElementById("transform-controls").style.display = "block";
      document.getElementById("color-controls").style.display = "block";
      document.getElementById("tap-to-place").style.display = "none";
    });

    // Event listeners for the buttons
    document.getElementById("black").addEventListener("click", () => {
      document.getElementById("audio").play();
      loadModel1("Steerad.glb");
    });

    document.getElementById("silver").addEventListener("click", () => {
      document.getElementById("audio").play();
      loadModel("Steerad.glb");
    });

    document.getElementById("orange").addEventListener("click", () => {
      document.getElementById("audio").play();
      loadModel2("Steeradtext.glb");
    });

    document.getElementById("blue").addEventListener("click", () => {
      document.getElementById("audio").play();
      loadModel("sterrad_anim.glb");
    });

    // Subscribe to events
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

    OX.subscribe(OnirixSDK.Events.OnFrame, function () {
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
          "Could not access your device's camera. Please ensure you have given required permissions from your browser settings.";
        break;
      case "SENSORS_ERROR":
        document.getElementById("error-title").innerText = "Sensors Error";
        document.getElementById("error-message").innerText =
          "Could not access your device's motion sensors. Please ensure you have given required permissions from your browser settings.";
        break;
      case "LICENSE_ERROR":
        document.getElementById("error-title").innerText = "License Error";
        document.getElementById("error-message").innerText =
          "This experience does not exist or has been unpublished.";
        break;
    }
    document.getElementById("error-screen").style.display = "flex";
  });
