import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.8.1/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/controls/OrbitControls.js";

// ====== ThreeJS ======

var renderer, scene, camera, floor, envMap;
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
  renderer.setClearColor(0x000000, 0);var renderer, scene, camera, floor, envMap;
var currentModel = null; // Reference to the currently loaded model
var isCarPlaced = false;
var models = {}; // Store models by their names
var currentModelName = ""; // Track the name of the currently active model

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
    // ... Existing setup code ...

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

// Load model function with visibility toggle
function loadModel(modelPath, modelName) {
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
        newModel.name = modelName;

        // Store model in the dictionary
        models[modelName] = newModel;

        // Hide all other models
        Object.keys(models).forEach((name) => {
            if (name !== modelName) {
                models[name].visible = false;
            }
        });

        // If a model with the same name is already loaded, just toggle visibility
        if (currentModelName === modelName) {
            newModel.visible = !newModel.visible;
        } else {
            // Remove the current model if it exists
            if (currentModel) {
                currentModel.visible = false;
            }

            // Set the new model as the current model
            currentModel = newModel;
            currentModelName = modelName;
            currentModel.visible = true;
            scene.add(currentModel);
        }

        // Play animation if available
        if (modelName === "sterrad_anim" || modelName === "Steeradtext") {
            gltf.animations.forEach((clip) => {
                const mixer = new THREE.AnimationMixer(newModel);
                const action = mixer.clipAction(clip);
                action.play();
                // Update animation mixer in the render loop
                function animate() {
                    requestAnimationFrame(animate);
                    mixer.update(0.01);
                    render();
                }
                animate();
            });
        }
    });
}

// Event listeners for the buttons
document.getElementById("black").addEventListener("click", () => {
    document.getElementById("audio").play();
    loadModel("Steerad.glb", "Steerad");
});

document.getElementById("silver").addEventListener("click", () => {
    document.getElementById("audio").play();
    loadModel("Steerad.glb", "Steerad");
});

document.getElementById("orange").addEventListener("click", () => {
    document.getElementById("audio").play();
    loadModel("Steeradtext.glb", "Steeradtext");
});

document.getElementById("blue").addEventListener("click", () => {
    document.getElementById("audio").play();
    loadModel("sterrad_anim.glb", "sterrad_anim");
});
