// ====== Imports ======

import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.6.5/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js";

class OxExperience {

    _renderer = null;
    _camera = null;
    _scenes = {};  // Object to hold multiple scenes
    _activeScene = null;
    _model = null;
    _envMap = null;
    _clock = null;
    _animationMixers = [];
    _carPlaced = false;

    oxSDK;

    async init() {
        this._raycaster = new THREE.Raycaster();
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
            this._animationMixers.forEach((mixer) => mixer.update(delta));
            this.render();
        });

        this.oxSDK.subscribe(OnirixSDK.Events.OnPose, (pose) => {
            this.updatePose(pose);
        });

        this.oxSDK.subscribe(OnirixSDK.Events.OnResize, () => {
            this.onResize();
        });

        this.oxSDK.subscribe(OnirixSDK.Events.OnHitTestResult, (hitResult) => {
            if (this._model && !this.isCarPlaced()) {
                this._model.position.copy(hitResult.position);
            }
        });

        await this.loadScenes();
        this.setActiveScene('default');  // Set initial scene
    }

    async initSDK() {
        this.oxSDK = new OnirixSDK("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUyMDIsInByb2plY3RJZCI6MTQ0MjgsInJvbGUiOjMsImlhdCI6MTYxNjc1ODY5NX0.8F5eAPcBGaHzSSLuQAEgpdja9aEZ6Ca_Ll9wg84Rp5k");  // Replace with your API key
        const config = {
            mode: OnirixSDK.TrackingMode.Surface,
        };
        return this.oxSDK.init(config);
    }

    async loadScenes() {
        const loader = new GLTFLoader();

        // Define models for each scene
        const models = {
            'blue': "Steerad.glb",
            'orange': "Steeradtext.glb",
            'black': "sterrad_anim.glb",
            'silver': "range_rover.glb"
        };

        // Load and create scenes for each model
        for (const [sceneName, modelPath] of Object.entries(models)) {
            this._scenes[sceneName] = new THREE.Scene();
            const model = await loader.loadAsync(modelPath);
            model.traverse((child) => {
                if (child.material) {
                    child.material.envMap = this._envMap;
                    child.material.needsUpdate = true;
                }
            });
            model.scale.set(0.5, 0.5, 0.5);
            this._scenes[sceneName].add(model);
        }

        // Initially hide all scenes
        for (const scene of Object.values(this._scenes)) {
            scene.visible = false;
        }
    }

    setActiveScene(sceneName) {
        if (this._activeScene) {
            this._activeScene.visible = false;
        }
        this._activeScene = this._scenes[sceneName];
        if (this._activeScene) {
            this._activeScene.visible = true;
        }
    }

    placeCar() {
        this._carPlaced = true;
        this.oxSDK.start();
    }

    isCarPlaced() {
        return this._carPlaced;
    }

    onHitTest(listener) {
        this.oxSDK.subscribe(OnirixSDK.Events.OnHitTestResult, listener);
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

        this._scene = new THREE.Scene();
        this._renderer.domElement.appendChild(this._scene);

        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this._scene.add(ambientLight);
        const hemisphereLight = new THREE.HemisphereLight(0xbbbbff, 0x444422);
        this._scene.add(hemisphereLight);
    }

    render() {
        this._renderer.render(this._activeScene || this._scene, this._camera);
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

    scaleCar(value) {
        if (this._model) {
            this._model.scale.set(value, value, value);
        }
    }

    rotateCar(value) {
        if (this._model) {
            this._model.rotation.y = value;
        }
    }
}

class OxExperienceUI {

    _loadingScreen = null;
    _errorScreen = null;
    _transformControls = null;
    _colorControls = null;
    _placeButton = null;
    _scaleSlider = null;
    _rotationSlider = null;
    _sceneButtons = {};

    init() {
        this._loadingScreen = document.querySelector("#loading-screen");
        this._errorScreen = document.querySelector("#error-screen");

        this._transformControls = document.querySelector("#transform-controls");
        this._placeButton = document.querySelector("#tap-to-place");
        this._scaleSlider = document.querySelector("#scale-slider");
        this._rotationSlider = document.querySelector("#rotation-slider");

        this._sceneButtons['blue'] = document.querySelector("#blue-button");
        this._sceneButtons['orange'] = document.querySelector("#orange-button");
        this._sceneButtons['black'] = document.querySelector("#black-button");
        this._sceneButtons['silver'] = document.querySelector("#silver-button");
    }

    showControls() {
        this._transformControls.style.display = "block";
    }

    showSceneSelector() {
        Object.values(this._sceneButtons).forEach(button => button.style.display = "block");
        this._transformControls.style.display = "none";
    }

    onPlace(listener) {
        this._placeButton.addEventListener('click', listener);
    }

    onScaleChange(listener) {
        this._scaleSlider.addEventListener('input', () => { listener(this._scaleSlider.value / 100) });
    }

    onRotationChange(listener) {
        this._rotationSlider.addEventListener('input', () => { listener(this._rotationSlider.value * Math.PI / 180) });
    }

    onSceneChange(listener) {
        Object.entries(this._sceneButtons).forEach(([sceneName, button]) => {
            button.addEventListener('click', () => listener(sceneName));
        });
    }

    hideLoadingScreen() {
        this._loadingScreen.style.display = 'none';
    }

    showError(errorTitle, errorMessage) {
        document.querySelector("#error-title").innerText = errorTitle;
        document.querySelector("#error-message").innerText = errorMessage;
        this._errorScreen.style.display = 'flex';
    }
}

const oxExp = new OxExperience();
const oxUI = new OxExperienceUI();

oxUI.init();
try {
    await oxExp.init();

    oxUI.onPlace(() => { 
        oxExp.placeCar();
        oxUI.showSceneSelector();
    });

    oxExp.onHitTest(() => { 
        if (!oxExp.isCarPlaced()) {
            oxUI.showControls();
        }
    });

    oxUI.onRotationChange((value) => { oxExp.rotateCar(value) });
    oxUI.onScaleChange((value) => { oxExp.scaleCar(value) });

    oxUI.onSceneChange((sceneName) => oxExp.setActiveScene(sceneName));

    oxUI.hideLoadingScreen();

} catch (error) {
    switch (error.name) {
        case 'INTERNAL_ERROR':
            oxUI.showError('Internal Error', 'An unspecified error has occurred. Your device might not be compatible with this experience.');
            break;
        case 'CAMERA_ERROR':
            oxUI.showError('Camera Error', 'Could not access your device\'s camera. Please ensure you have given required permissions from your browser settings.');
            break;
        case 'SENSORS_ERROR':
            oxUI.showError('Sensors Error', 'Could not access your device\'s motion sensors. Please ensure you have given required permissions from your browser settings.');
            break;
        case 'LICENSE_ERROR':
            oxUI.showError('License Error', 'This experience does not exist or has been unpublished.');
            break;
    }
}
