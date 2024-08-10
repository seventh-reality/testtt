// ====== Imports ======
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import OnirixSDK from "https://unpkg.com/@onirix/ar-engine-sdk@1.8.1/dist/ox-sdk.esm.js";
import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";
import ThreeMeshUI from '../src/three-mesh-ui.js';
import VRControl from './utils/VRControl.js';
import ShadowedLight from './utils/ShadowedLight.js';

import FontJSON from './assets/Roboto-msdf.json';
import FontImage from './assets/Roboto-msdf.png';

// ====== ThreeJS ======

var renderer, scene, camera, floor, car, envMap;
var isCarPlaced = false;
const raycaster = new THREE.Raycaster();

const mouse = new THREE.Vector2();
mouse.x = mouse.y = null;

let selectState = false;

window.addEventListener( 'pointermove', ( event ) => {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
} );

window.addEventListener( 'pointerdown', () => {
	selectState = true;
} );

window.addEventListener( 'pointerup', () => {
	selectState = false;
} );

window.addEventListener( 'touchstart', ( event ) => {
	selectState = true;
	mouse.x = ( event.touches[ 0 ].clientX / window.innerWidth ) * 2 - 1;
	mouse.y = -( event.touches[ 0 ].clientY / window.innerHeight ) * 2 + 1;
} );

window.addEventListener( 'touchend', () => {
	selectState = false;
	mouse.x = null;
	mouse.y = null;
} );
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
  if (car && !isCarPlaced) {
    document.getElementById("transform-controls").style.display = "block";
    car.position.copy(hitResult.position);
  }
}

function placeCar() {
  isCarPlaced = true;
  OX.start();
}

function scaleCar(value) {
  car.scale.set(value, value, value);
}

function rotateCar(value) {
  car.rotation.y = value;
}

function changeCarColor(value) {
  car.traverse((child) => {
    if (child.material && child.material.name === "CarPaint") {
      child.material.color.setHex(value);
    }
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
    // Setup ThreeJS renderer
    setupRenderer(rendererCanvas);

    // Load car model
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("range_rover.glb", (gltf) => {
      car = gltf.scene;
      car.traverse((child) => {
        if (child.material) {
          console.log("updating material");
          child.material.envMap = envMap;
          child.material.needsUpdate = true;
        }
      });
      car.scale.set(0.5, 0.5, 0.5);
      scene.add(car);

      // All loaded, so hide loading screen
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

  document.getElementById("black").addEventListener("click", () => {
       // changeCarColor(0x111111);
	  
	 document.getElementById("audio").play()
	   const gltfLoader = new GLTFLoader();
    gltfLoader.load("C_ARM.glb", (gltf) => {
      car = gltf.scene;
      car.traverse((child) => {
        if (child.material) {
          console.log("updating material");
          child.material.envMap = envMap;
          child.material.needsUpdate = true;
        }
      });
      car.scale.set(0.5, 0.5, 0.5);
	  scene.clear()
      scene.add(car);

      // All loaded, so hide loading screen
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

    
    });
      });

      document.getElementById("silver").addEventListener("click", () => {
        //changeCarColor(0xffffff);
	      
	 document.getElementById("audio").play()
 
		const gltfLoader = new GLTFLoader();
    gltfLoader.load("VITAL SIGNS MONITOR.glb", (gltf) => {
      car = gltf.scene;
      car.traverse((child) => {
        if (child.material) {
          console.log("updating material");
          child.material.envMap = envMap;
          child.material.needsUpdate = true;
        }
      });
      car.scale.set(0.5, 0.5, 0.5);
	  scene.clear()
      scene.add(car);

      // All loaded, so hide loading screen
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

    
    });
      });

      document.getElementById("orange").addEventListener("click", () => {
       // changeCarColor(0xff2600);
	    
	 document.getElementById("audio").play()
	   const gltfLoader = new GLTFLoader();
    gltfLoader.load("ETHOSs.glb", (gltf) => {
      car = gltf.scene;
      car.traverse((child) => {
        if (child.material) {
          console.log("updating material");
          child.material.envMap = envMap;
          child.material.needsUpdate = true;
        }
      });
      car.scale.set(0.5, 0.5, 0.5);
	  scene.clear()
      scene.add(car);

      // All loaded, so hide loading screen
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

    
    });
      });

      document.getElementById("blue").addEventListener("click", () => {
        // changeCarColor(0x0011ff);
	     
		
	 document.getElementById("audio").play()
		const gltfLoader = new GLTFLoader();
		gltfLoader.load("bloodsny.glb", (gltf) => {
      car = gltf.scene;
      const animations = gltf.animations;		
      car.traverse((child) => {
        if (child.material) {
          console.log("updating material");
          child.material.envMap = envMap;
          child.material.needsUpdate = true;
        }
	const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(animations[0]);
      action.play();
      animationMixers.push(mixer);      
      });
      car.scale.set(0.5, 0.5, 0.5);
	  scene.clear();
	  
      scene.add(car);
  function loadModel(scene) {
  const loader = new GLTFLoader();
  loader.crossOrigin = "anonymous";
  loader.load('https://rawcdn.githack.com/mrdoob/three.js/76d16bd828c8d3e1870eac45aa466c20313cf944/examples/models/gltf/Nefertiti/Nefertiti.glb',(gltf) => {
    
    const model = gltf.scene.children[0]
    model.scale.multiplyScalar(0.1)
    model.position.y = - 1.5
    
    scene.add(model)
    
    createMarker(model, new Vector3(0,17,8))
    createMarker(model, new Vector3(4,15,1.7))
    createMarker(model, new Vector3(-6,0,4))

  })
  
  
}
function makePanel() {

	// Container block, in which we put the two buttons.
	// We don't define width and height, it will be set automatically from the children's dimensions
	// Note that we set contentDirection: "row-reverse", in order to orient the buttons horizontally

	const container = new ThreeMeshUI.Block( {
		justifyContent: 'center',
		contentDirection: 'row-reverse',
		fontFamily: FontJSON,
		fontTexture: FontImage,
		fontSize: 0.07,
		padding: 0.02,
		borderRadius: 0.11
	} );

	container.position.set( 0, 0.6, -1.2 );
	container.rotation.x = -0.55;
	scene.add( container );

	// BUTTONS

	// We start by creating objects containing options that we will use with the two buttons,
	// in order to write less code.

	const buttonOptions = {
		width: 0.4,
		height: 0.15,
		justifyContent: 'center',
		offset: 0.05,
		margin: 0.02,
		borderRadius: 0.075
	};

	// Options for component.setupState().
	// It must contain a 'state' parameter, which you will refer to with component.setState( 'name-of-the-state' ).

	const hoveredStateAttributes = {
		state: 'hovered',
		attributes: {
			offset: 0.035,
			backgroundColor: new THREE.Color( 0x999999 ),
			backgroundOpacity: 1,
			fontColor: new THREE.Color( 0xffffff )
		},
	};

	const idleStateAttributes = {
		state: 'idle',
		attributes: {
			offset: 0.035,
			backgroundColor: new THREE.Color( 0x666666 ),
			backgroundOpacity: 0.3,
			fontColor: new THREE.Color( 0xffffff )
		},
	};

	// Buttons creation, with the options objects passed in parameters.

	const buttonNext = new ThreeMeshUI.Block( buttonOptions );
	const buttonPrevious = new ThreeMeshUI.Block( buttonOptions );

	// Add text to buttons

	buttonNext.add(
		new ThreeMeshUI.Text( { content: 'next' } )
	);

	buttonPrevious.add(
		new ThreeMeshUI.Text( { content: 'previous' } )
	);

	// Create states for the buttons.
	// In the loop, we will call component.setState( 'state-name' ) when mouse hover or click

	const selectedAttributes = {
		offset: 0.02,
		backgroundColor: new THREE.Color( 0x777777 ),
		fontColor: new THREE.Color( 0x222222 )
	};

	buttonNext.setupState( {
		state: 'selected',
		attributes: selectedAttributes,
		onSet: () => {

			currentMesh = ( currentMesh + 1 ) % 3;
			showMesh( currentMesh );

		}
	} );
	buttonNext.setupState( hoveredStateAttributes );
	buttonNext.setupState( idleStateAttributes );

	//

	buttonPrevious.setupState( {
		state: 'selected',
		attributes: selectedAttributes,
		onSet: () => {

			currentMesh -= 1;
			if ( currentMesh < 0 ) currentMesh = 2;
			showMesh( currentMesh );

		}
	} );
	buttonPrevious.setupState( hoveredStateAttributes );
	buttonPrevious.setupState( idleStateAttributes );

	//

	container.add( buttonNext, buttonPrevious );
	objsToTest.push( buttonNext, buttonPrevious );
	
function loop() {

	// Don't forget, ThreeMeshUI must be updated manually.
	// This has been introduced in version 3.0.0 in order
	// to improve performance
	ThreeMeshUI.update();

	controls.update();

	meshContainer.rotation.z += 0.01;
	meshContainer.rotation.y += 0.01;

	renderer.render( scene, camera );

	updateButtons();

}

// Called in the loop, get intersection with either the mouse or the VR controllers,
// then update the buttons states according to result

function updateButtons() {

	// Find closest intersecting object

	let intersect;

	if ( renderer.xr.isPresenting ) {

		vrControl.setFromController( 0, raycaster.ray );

		intersect = raycast();

		// Position the little white dot at the end of the controller pointing ray
		if ( intersect ) vrControl.setPointerAt( 0, intersect.point );

	} else if ( mouse.x !== null && mouse.y !== null ) {

		raycaster.setFromCamera( mouse, camera );

		intersect = raycast();

	}

	// Update targeted button state (if any)

	if ( intersect && intersect.object.isUI ) {

		if ( selectState ) {

			// Component.setState internally call component.set with the options you defined in component.setupState
			intersect.object.setState( 'selected' );

		} else {

			// Component.setState internally call component.set with the options you defined in component.setupState
			intersect.object.setState( 'hovered' );

		}

	}

	// Update non-targeted buttons state

	objsToTest.forEach( ( obj ) => {

		if ( ( !intersect || obj !== intersect.object ) && obj.isUI ) {

			// Component.setState internally call component.set with the options you defined in component.setupState
			obj.setState( 'idle' );

		}

	} );

}

//

function createMarker(model, position) {
  const loader = new TextureLoader();
  loader.crossOrigin = "";
  const map = loader.load("https://i.imgur.com/EZynrrA.png");
  map.encoding = sRGBEncoding
  
  const spriteMaterialFront = new SpriteMaterial( { map } );
  
  const spriteFront = new Sprite( spriteMaterialFront );
  spriteFront.position.copy(position) 
  
  const spriteMaterialRear = new SpriteMaterial({ 
    map,
    opacity: 0.3, 
    transparent: true, 
    depthTest: false
  });
  
  const spriteRear = new Sprite( spriteMaterialRear );
  spriteRear.position.copy(position) 
  
  model.add(spriteFront, spriteRear)
}


      // All loaded, so hide loading screen
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

    
    });
		
      });
	 
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

    OX.subscribe(OnirixSDK.Events.OnFrame, function() {
      render();
    });

  })
  .catch((error) => {
    // An error ocurred, chech error type and display it
    document.getElementById("loading-screen").style.display = "none";

    switch (error.name) {
      case "INTERNAL_ERROR":
        document.getElementById("error-title").innerText = "Internal Error";
        document.getElementById("error-message").innerText =
          "An unespecified error has occurred. Your device might not be compatible with this experience.";
        break;

      case "CAMERA_ERROR":
        document.getElementById("error-title").innerText = "Camera Error";
        document.getElementById("error-message").innerText =
          "Could not access to your device's camera. Please, ensure you have given required permissions from your browser settings.";
        break;

      case "SENSORS_ERROR":
        document.getElementById("error-title").innerText = "Sensors Error";
        document.getElementById("error-message").innerText =
          "Could not access to your device's motion sensors. Please, ensure you have given required permissions from your browser settings.";
        break;

      case "LICENSE_ERROR":
        document.getElementById("error-title").innerText = "License Error";
        document.getElementById("error-message").innerText = "This experience does not exist or has been unpublished.";
        break;
    }
    document.getElementById("error-screen").style.display = "flex";
  });
