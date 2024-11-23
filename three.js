import * as three from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./OrbitControls.js";
import { RGBELoader } from "./RGBELoader.js";

import Module from './node_modules/manifold-3d/manifold.js';
import ringGen from './ring.js';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;

const brassMaterial = new three.ShaderMaterial({
  uniforms: {
    envMap: { value: null },
    roughness: { value: 0.4 },
    metalness: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vReflect;
    void main() {
      vec3 worldNormal = normalize(normalMatrix * normal);
      vec3 cameraToVertex = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
      vReflect = reflect(-cameraToVertex, worldNormal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform samplerCube envMap;
    uniform float roughness;
    uniform float metalness;
    varying vec3 vReflect;
    void main() {
      vec3 baseColor = vec3(0.78, 0.56, 0.12);
      vec3 reflection = textureCube(envMap, vReflect).rgb;
      vec3 finalColor = mix(baseColor, reflection, metalness);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

const silverMaterial = new three.ShaderMaterial({
  uniforms: {
    envMap: { value: null },
    roughness: { value: 0.1 },
    metalness: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vReflect;
    void main() {
      vec3 worldNormal = normalize(normalMatrix * normal);
      vec3 cameraToVertex = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
      vReflect = reflect(-cameraToVertex, worldNormal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform samplerCube envMap;
    uniform float roughness;
    uniform float metalness;
    varying vec3 vReflect;
    void main() {
      vec3 baseColor = vec3(0.8, 0.8, 0.8);
      vec3 reflection = textureCube(envMap, vReflect).rgb;
      vec3 finalColor = mix(baseColor, reflection, metalness);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

const steelMaterial = new three.ShaderMaterial({
  uniforms: {
    envMap: { value: null },
    roughness: { value: 0.6 },
    metalness: { value: 0.8 }
  },
  vertexShader: `
    varying vec3 vReflect;
    void main() {
      vec3 worldNormal = normalize(normalMatrix * normal);
      vec3 cameraToVertex = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
      vReflect = reflect(-cameraToVertex, worldNormal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform samplerCube envMap;
    uniform float roughness;
    uniform float metalness;
    varying vec3 vReflect;
    void main() {
      vec3 baseColor = vec3(0.5, 0.5, 0.6);
      vec3 reflection = textureCube(envMap, vReflect).rgb;
      vec3 finalColor = mix(baseColor, reflection, metalness);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

// Define our set of materials
const materials = [
  brassMaterial,
  silverMaterial,
  steelMaterial
];

var selectedMaterial = materials;
selectedMaterial.name = "Materials";

const result = new three.Mesh(undefined, materials);

// Set up Manifold IDs corresponding to materials
const firstID = Manifold.reserveIDs(materials.length);
// ids vector is parallel to materials vector - same indexing
const ids = Array.from({ length: materials.length }, (_, idx) => firstID + idx);
// Build a mapping to get back from ID to material index
const id2matIndex = new Map();
ids.forEach((id, idx) => id2matIndex.set(id, idx));

// Set up Three.js renderer
const output = document.querySelector('#output');
const renderer = new three.WebGLRenderer({ canvas: output, antialias: true });
renderer.setClearColor(0x404040);
const dim = output.getBoundingClientRect();
renderer.setSize(dim.width, dim.height);

// Load HDR environment map with PMREMGenerator
const pmremGenerator = new three.PMREMGenerator(renderer);
const hdrLoader = new RGBELoader();

hdrLoader.load('./frozen_lake_by_pine_trees_8k.hdr', (hdrTexture) => {
  hdrTexture.mapping = three.EquirectangularReflectionMapping;

  const hdrEnvMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;

  hdrTexture.dispose();
  pmremGenerator.dispose();

  scene.environment = hdrEnvMap;
  scene.background = hdrEnvMap;

  materials.forEach((material) => {
    material.uniforms.envMap.value = hdrEnvMap.clone();
  });

  updateRingSize(hdrEnvMap);
});

// Set up Three.js scene
const scene = new three.Scene();
const camera = new three.PerspectiveCamera(30, 1, 0.01, 1000);
camera.position.z = 80;
camera.add(new three.PointLight(0xffffff, 1));
scene.add(camera);
scene.add(result);

renderer.setAnimationLoop(function (time) {
  // result.position.x = time/ 100;
  result.rotation.x = time / 2000;
  result.rotation.y = time / 1000;
  renderer.render(scene, camera);
});

var controls = new OrbitControls(camera, renderer.domElement);
controls.target = new three.Vector3(0, 2.5, 0);
controls.update();


function updateRingSize(envMapIn) {

  console.time('Ring Update');
  const ringSize = document.getElementById("ringSize").value;
  const red = document.getElementById("red").value;
  const green = document.getElementById("green").value;
  const blue = document.getElementById("blue").value;
  document.getElementById("ringSizeNum").innerHTML = selectedMaterial.name + " Color [" + red + "," + green + "," + blue + "] in Size " + ringSize;

  console.time('Ringgen Call');
  var manifoldRing = ringGen(ringSize, [red, green, blue]);
  console.timeEnd('Ringgen Call');

  if (result.geometry) {
    result.geometry.dispose();
  }

  const testMaterial = new three.MeshStandardMaterial({
    envMap: envMapIn,
    metalness: 1.0,
    roughness: 0.0,
    flatShading: true
  });

  result.material = testMaterial;
  result.geometry = mesh2geometry(manifoldRing.getMesh()); //.rotate([-45,-45,-10])
  console.timeEnd('Ring Update');
}

// Attach the function to the onchange event
document.getElementById("ringSize").onchange = updateRingSize;
document.getElementById("red").onchange = updateRingSize;
document.getElementById("green").onchange = updateRingSize;
document.getElementById("blue").onchange = updateRingSize;

document.getElementById("brass").onclick = function () {
  selectedMaterial = brassMaterial;
  selectedMaterial.name = "Brass";
  updateRingSize();
}

document.getElementById("steel").onclick = function () {
  selectedMaterial = steelMaterial;
  selectedMaterial.name = "Steel"
  updateRingSize();
}

document.getElementById("silver").onclick = function () {
  selectedMaterial = silverMaterial;
  selectedMaterial.name = "Silver"
  updateRingSize();
}

document.getElementById("cadDraw").onclick = function () {
  selectedMaterial = cadDraw;
  selectedMaterial.name = "CadDraw"
  updateRingSize();
}



// csg('union');
// const selectElement = document.querySelector('select');
// selectElement.onchange = function () {
//   csg(selectElement.value);
// };

// Convert Manifold Mesh to Three.js BufferGeometry
function mesh2geometry(mesh) {
  const geometry = new three.BufferGeometry();
  geometry.setAttribute(
    'position', new three.BufferAttribute(mesh.vertProperties, 3)
  );
  geometry.setIndex(new three.BufferAttribute(mesh.triVerts, 1));

  // Compute normals for the geometry
  geometry.computeVertexNormals();

  // Create a group (material) for each ID. Note that there may be multiple
  // triangle runs returned with the same ID, though these will always be
  // sequential since they are sorted by ID. In this example there are two runs
  // for the MeshNormalMaterial, one corresponding to each input mesh that had
  // this ID. This allows runTransform to return the total transformation matrix
  // applied to each triangle run from its input mesh - even after many
  // consecutive operations.
  let id = mesh.runOriginalID[0];
  let start = mesh.runIndex[0];
  for (let run = 0; run < mesh.numRun; ++run) {
    const nextID = mesh.runOriginalID[run + 1];
    if (nextID !== id) {
      const end = mesh.runIndex[run + 1];
      geometry.addGroup(start, end - start, id2matIndex.get(id));
      id = nextID;
      start = end;
    }
  }

  return geometry;
}

// // Convert Three.js input meshes to Manifolds
// const manifoldCube = Manifold.cube([0.2, 0.2, 0.4], true);
// const manifoldCut = Manifold.cube([0.1, 0.3, 0.1], true);
// const manifoldRing = ringGen(54,[10,34,23]);

// // Set up UI for operations
// function csg(operation) {
//   result.geometry?.dispose();
//   result.geometry = mesh2geometry(manifoldRing.getMesh());
//   // result.geometry = mesh2geometry(
//   //   Manifold[operation](manifoldCube, manifoldRing).getMesh());
// }
