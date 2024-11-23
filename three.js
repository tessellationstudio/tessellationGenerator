// Copyright 2024 The Manifold Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as three from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./OrbitControls.js";

import Module from './node_modules/manifold-3d/manifold.js';
import ringGen from './ring.js';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;

// Define our set of materials
const materials = [
  new three.MeshNormalMaterial({ flatShading: true }),
  new three.MeshLambertMaterial({ color: 'red', flatShading: true }),
  new three.MeshLambertMaterial({ color: 'blue', flatShading: true })
];

const brass = new three.MeshBasicMaterial({
  color: 0xf75c03,
  wireframe: true //set's the wireframe
});

const steel = new three.MeshBasicMaterial({
  color: 0xAAAAAA
});

const silver = new three.MeshBasicMaterial({
  color: 0xFFFFFF,
  wireframe: true //set's the wireframe
});

var vertexShader = `
    varying vec3 vUv; 

    void main() {
      vUv = position; 

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition; 
    }
`;
var fragmentShader = `
      uniform vec3 colorA; 
      uniform vec3 colorB; 
      varying vec3 vUv;

      void main() {
        gl_FragColor = vec4(mix(colorA, colorB, vUv.z), 1.0);
      }
`;

var  uniforms = {
  colorB: {type: 'vec3', value: new three.Color(0xACB6E5)},
  colorA: {type: 'vec3', value: new three.Color(0x74ebd5)},
  thickness: {value: 1.5}
}

var cadDraw = new three.ShaderMaterial({
  uniforms,
  vertexShader: vertexShader,
  fragmentShader: fragmentShader
});

var selectedMaterial = materials;
selectedMaterial.name = "Materials";

var edges;
var line;

const result = new three.Mesh(undefined, materials);


// Set up Manifold IDs corresponding to materials
const firstID = Manifold.reserveIDs(materials.length);
// ids vector is parallel to materials vector - same indexing
const ids = Array.from({ length: materials.length }, (_, idx) => firstID + idx);
// Build a mapping to get back from ID to material index
const id2matIndex = new Map();
ids.forEach((id, idx) => id2matIndex.set(id, idx));

// Set up Three.js scene
const scene = new three.Scene();
const camera = new three.PerspectiveCamera(30, 1, 0.01, 1000);
camera.position.z = 80;
camera.add(new three.PointLight(0xffffff, 1));
scene.add(camera);
scene.add(result);

// Set up Three.js renderer
const output = document.querySelector('#output');
const renderer = new three.WebGLRenderer({ canvas: output, antialias: true });
renderer.setClearColor(0x404040);
const dim = output.getBoundingClientRect();
renderer.setSize(dim.width, dim.height);
renderer.setAnimationLoop(function (time) {
  // result.position.x = time/ 100;
  result.rotation.x = time / 2000;
  result.rotation.y = time / 1000;
  renderer.render(scene, camera);
});

var controls = new OrbitControls(camera, renderer.domElement);
controls.target = new three.Vector3(0, 2.5, 0);
controls.update();

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

function updateRingSize() {
  const ringSize = document.getElementById("ringSize").value;
  const red = document.getElementById("red").value;
  const green = document.getElementById("green").value;
  const blue = document.getElementById("blue").value;
  document.getElementById("ringSizeNum").innerHTML = selectedMaterial.name + " Color [" + red + "," + green + "," + blue + "] in Size " + ringSize;
  var manifoldRing = ringGen(ringSize, [red, green, blue]);
  
  if (result.geometry) {
    result.geometry.dispose();
  }
  // Dispose and remove old edges and line from the scene
  if (edges) edges.dispose();
  if (line) scene.remove(line);

  result.material = selectedMaterial;
  result.geometry = mesh2geometry(manifoldRing.getMesh()); //.rotate([-45,-45,-10])
  edges = new three.EdgesGeometry( result.geometry, 20 ); 
  line = new three.LineSegments(edges, new three.LineBasicMaterial( { color: 0xffffff } ) ); 
  // scene.add(line);

}

// Attach the function to the onchange event
document.getElementById("ringSize").onchange = updateRingSize;
document.getElementById("red").onchange = updateRingSize;
document.getElementById("green").onchange = updateRingSize;
document.getElementById("blue").onchange = updateRingSize;

document.getElementById("brass").onclick = function(){
  selectedMaterial = brass;
  selectedMaterial.name = "Brass";
  updateRingSize();
}

document.getElementById("steel").onclick = function(){
  selectedMaterial = steel;
  selectedMaterial.name = "Steel"
  updateRingSize();
}

document.getElementById("silver").onclick = function(){
  selectedMaterial = silver;
  selectedMaterial.name = "Silver"
  updateRingSize();
}

document.getElementById("cadDraw").onclick = function(){
  selectedMaterial = cadDraw;
  selectedMaterial.name = "CadDraw"
  updateRingSize();
}

updateRingSize();



// csg('union');
// const selectElement = document.querySelector('select');
// selectElement.onchange = function () {
//   csg(selectElement.value);
// };

// Convert Manifold Mesh to Three.js BufferGeometry
function mesh2geometry(mesh) {
  const geometry = new three.BufferGeometry();
  // Assign buffers
  geometry.setAttribute(
    'position', new three.BufferAttribute(mesh.vertProperties, 3));
  geometry.setIndex(new three.BufferAttribute(mesh.triVerts, 1));
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

