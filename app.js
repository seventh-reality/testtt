import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.8.1/dist/ox-sdk.esm.js"; 
import * as THREE from "https://cdn.skypack.dev/three@0.127.0"; 
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js"; 
import { OrbitControls } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/controls/OrbitControls.js"; 

// ====== ThreeJS ======
var renderer, scene, camera, floor, envMap; 
var models = []; // Array to hold all loaded models
var currentModelIndex = 0; 
var currentModel = null; 
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

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); 
    directionalLight.position.set(0, 10, 0); 
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
            side: THREE.DoubleSide 
        }) 
    ); 
    floor.rotateX(Math.PI / 2); 
    scene.add(floor); 

    controls = new OrbitControls(camera, renderer.domElement); 
    controls.enableDamping = true; 
    controls.dampingFactor = 0.25; 
    controls.enableZoom = true; 
}

function loadModels(modelPaths) { 
    const gltfLoader = new GLTFLoader(); 
    modelPaths.forEach((modelPath) => { 
        gltfLoader.load(modelPath, (gltf) => { 
            const newModel = gltf.scene; 
            newModel.traverse((child) => { 
                if (child.material) { 
                    child.material.envMap = envMap; 
                    child.material.needsUpdate = true; 
                } 
            }); 
            newModel.scale.set(0.5, 0.5, 0.5); 
            models.push(newModel); 
            scene.add(newModel); // Add all models to the scene
        }); 
    }); 
}

function toggleModel(index) { 
    if (models.length > 0) { 
        if (currentModel) { 
            scene.remove(currentModel); 
        } 
        currentModelIndex = index; 
        currentModel = models[currentModelIndex]; 
        scene.add(currentModel); 
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
        const modelPaths = ["Steerad.glb", "Steeradtext.glb", "sterrad_anim.glb"]; 
        loadModels(modelPaths); 

        document.getElementById("loading-screen").style.display = "none"; 
        document.getElementById("initializing").style.display = "block"; 

        document.getElementById("tap-to-place").addEventListener("click", () => { 
            placeCar(); 
            document.getElementById("transform-controls").style.display = "block"; 
            document.getElementById("color-controls").style.display = "block"; 
            document.getElementById("tap-to-place").style.display = "none"; 
        }); 

        // Event listeners for color buttons to toggle models
        document.getElementById("black").addEventListener("click", () => { 
            toggleModel(0); // Load black model
        }); 

        document.getElementById("silver").addEventListener("click", () => { 
            toggleModel(1); // Load silver model
        }); 

        document.getElementById("orange").addEventListener("click", () => { 
            toggleModel(2); // Load orange model
        }); 

        document.getElementById("blue").addEventListener("click", () => { 
            toggleModel(3); // Load blue model
        }); 

        OX.subscribe(OnirixSDK.Events.OnPose, updatePose); 
        OX.subscribe(OnirixSDK.Events.OnResize, onResize); 
        OX.subscribe(OnirixSDK.Events.OnTouch, onTouch); 
        OX.subscribe(OnirixSDK.Events.OnHitTestResult, onHitResult); 
        OX.subscribe(OnirixSDK.Events.OnFrame, render); 
    }) 
    .catch((error) => { 
        document.getElementById("loading-screen").style.display = "none"; 
        switch (error.name) { 
            case "INTERNAL_ERROR": 
                document.getElementById("error-title").innerText = "Internal Error"; 
                document.getElementById("error-message").innerText = "An unspecified error has occurred. Your device might not be compatible with this experience."; 
                break; 
            case "CAMERA_ERROR": 
                document.getElementById("error-title").innerText = "Camera Error"; 
                document.getElementById("error-message").innerText = "Could not access your device's camera. Please ensure you have given required permissions from your browser settings."; 
                break; 
            case "SENSORS_ERROR": 
                document.getElementById("error-title").innerText = "Sensors Error"; 
                document.getElementById("error-message").innerText = "Could not access your device's motion sensors. Please ensure you have given required permissions from your browser settings."; 
                break; 
            case "LICENSE_ERROR": 
                document.getElementById("error-title").innerText = "License Error"; 
                document.getElementById("error-message").innerText = "This experience does not exist or has been unpublished."; 
                break; 
        } 
        document.getElementById("error-screen").style.display = "flex"; 
    });
