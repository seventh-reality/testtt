import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.6.5/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js";

class OxExperience {
    _renderer = null;
    _scenes = {};
    _currentScene = null;
    _camera = null;
    _models = {};
    oxSDK;
    _carPlaced = false;

    async init() {
        this._raycaster = new THREE.Raycaster();
        this._animationMixers = [];
        this._clock = new THREE.Clock(true);

        const renderCanvas = await this.initSDK();
        this.setupRenderer(renderCanvas);

        // Load env map
        const textureLoader = new THREE.TextureLoader();
        this._envMap = textureLoader.load("envmap.jpg");
        this._envMap.mapping = THREE.EquirectangularReflectionMapping;
        this._envMap.encoding = THREE.sRGBEncoding;

        this.oxSDK.subscribe(OnirixSDK.Events.OnFrame, () => {
            const delta = this._clock.getDelta();
            this._animationMixers.forEach(mixer => mixer.update(delta));
            this.render();
        });

        this.oxSDK.subscribe(OnirixSDK.Events.OnPose, pose => {
            this.updatePose(pose);
        });

        this.oxSDK.subscribe(OnirixSDK.Events.OnResize, () => {
            this.onResize();
        });

        this.oxSDK.subscribe(OnirixSDK.Events.OnHitTestResult, hitResult => {
            if (this._carPlaced && this._currentScene) {
                this._models[this._currentScene].position.copy(hitResult.position);
            }
        });

        await this.loadModels();
        this.setScene("scene1"); // Load the initial scene
    }

    async initSDK() {
        this.oxSDK = new OnirixSDK("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUyMDIsInByb2plY3RJZCI6MTQ0MjgsInJvbGUiOjMsImlhdCI6MTYxNjc1ODY5NX0.8F5eAPcBGaHzSSLuQAEgpdja9aEZ6Ca_Ll9wg84Rp5k");
        const config = {
            mode: OnirixSDK.TrackingMode.Surface,
        };
        return this.oxSDK.init(config);
    }

    setupRenderer(renderCanvas) {
        const width = renderCanvas.width;
        const height = renderCanvas.height;

        this._renderer = new THREE.WebGLRenderer({ canvas: renderCanvas, alpha: true });
        this._renderer.setClearColor(0x000000, 0);
        this._renderer.setSize(width, height);
        this._renderer.outputEncoding = THREE.sRGBEncoding;

        const cameraParams = this.oxSDK.getCameraParameters();
        this._camera = new THREE.PerspectiveCamera(cameraParams.fov, cameraParams.aspect, 0.1, 1000);
        this._camera.matrixAutoUpdate = false;

        // Create an empty scene
        this._scene = new THREE.Scene();

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this._scene.add(ambientLight);
        const hemisphereLight = new THREE.HemisphereLight(0xbbbbff, 0x444422);
        this._scene.add(hemisphereLight);
    }

    async loadModels() {
        const gltfLoader = new GLTFLoader();
        
        // Load each model into its scene
        this._scenes = {
            scene1: new THREE.Scene(),
            scene2: new THREE.Scene(),
            scene3: new THREE.Scene(),
            scene4: new THREE.Scene()
        };
        
        this._models.scene1 = await this.loadModel(gltfLoader, "Steeradtext.glb");
        this._models.scene2 = await this.loadModel(gltfLoader, "sterrad_anim.glb");
        this._models.scene3 = await this.loadModel(gltfLoader, "Steerad.glb");
        this._models.scene4 = await this.loadModel(gltfLoader, "silver_model.glb"); // Replace with actual model path
        
        // Set up initial scene
        this._currentScene = "scene1";
        this._scene.add(this._models[this._currentScene]);
    }

    async loadModel(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(path, gltf => {
                const model = gltf.scene;
                model.traverse(child => {
                    if (child.material) {
                        child.material.envMap = this._envMap;
                        child.material.needsUpdate = true;
                    }
                });
                model.scale.set(0.5, 0.5, 0.5);
                resolve(model);
            }, undefined, reject);
        });
    }

    setScene(sceneName) {
        if (this._currentScene && this._models[this._currentScene]) {
            this._scene.remove(this._models[this._currentScene]);
        }
        if (this._models[sceneName]) {
            this._scene.add(this._models[sceneName]);
            this._currentScene = sceneName;
        }
    }

    render() {
        this._renderer.render(this._scene, this._camera);
    }

    updatePose(pose) {
        let modelViewMatrix = new THREE.Matrix4();
        modelViewMatrix = modelViewMatrix.fromArray(pose);
        this._camera.matrix = modelViewMatrix;
        this._camera.matrixWorldNeedsUpdate = true;
    }

    onResize() {
        const width = this._renderer.domElement.width;
        const height = this._renderer.domElement.height;
        const cameraParams = this.oxSDK.getCameraParameters();
        this._camera.fov = cameraParams.fov;
        this._camera.aspect = cameraParams.aspect;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(width, height);
    }

    placeCar() {
        this._carPlaced = true;
        this.oxSDK.start();
    }

    isCarPlaced() {
        return this._carPlaced;
    }
}

const oxExp = new OxExperience();

document.addEventListener("DOMContentLoaded", () => {
    const modelButtons = {
        'Load Model 1': 'scene1',
        'Load Model 2': 'scene2',
        'Load Model 3': 'scene3',
        'Load Model 4': 'scene4'
    };

    const buttonElements = document.querySelectorAll("#buttons button");
    buttonElements.forEach(button => {
        button.addEventListener('click', () => {
            const sceneKey = modelButtons[button.innerText];
            if (sceneKey) {
                oxExp.setScene(sceneKey);
            } else if (button.innerText === 'Play/Pause Audio') {
                toggleAudio();
            } else if (button.innerText === 'AR View') {
                oxExp.placeCar();
            }
        });
    });

    async function init() {
        try {
            await oxExp.init();
        } catch (error) {
            console.error(error);
        }
    }

    init();
});
