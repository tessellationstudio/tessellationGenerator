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

import { EdgesGeometry, LineSegments,LineBasicMaterial, BoxGeometry, BufferAttribute, BufferGeometry, IcosahedronGeometry, Mesh as ThreeMesh, MeshLambertMaterial, MeshNormalMaterial, MeshBasicMaterial, PerspectiveCamera, PointLight, Scene, WebGLRenderer } from "./node_modules/three/build/three.module.js"
// import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';

import Module from './node_modules/manifold-3d/manifold.js';
import ringGen from './ring.js';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;

// Define our set of materials
const materials = [
  new MeshNormalMaterial({ flatShading: true }),
  new MeshLambertMaterial({ color: 'red', flatShading: true }),
  new MeshLambertMaterial({ color: 'blue', flatShading: true })
];

const brass = new MeshBasicMaterial({
  color: 0xf75c03,
  wireframe: true //set's the wireframe
});

const steel = new MeshBasicMaterial({
  color: 0xAAAAAA
});

const silver = new MeshBasicMaterial({
  color: 0xFFFFFF,
  wireframe: true //set's the wireframe
});
var selectedMaterial = materials;
selectedMaterial.name = "Materials";

const result = new ThreeMesh(undefined, materials);
// const edges = new EdgesGeometry( result ); 
// const line = new LineSegments(edges, new LineBasicMaterial( { color: 0xffffff } ) ); 

// Set up Manifold IDs corresponding to materials
const firstID = Manifold.reserveIDs(materials.length);
// ids vector is parallel to materials vector - same indexing
const ids = Array.from({ length: materials.length }, (_, idx) => firstID + idx);
// Build a mapping to get back from ID to material index
const id2matIndex = new Map();
ids.forEach((id, idx) => id2matIndex.set(id, idx));

// Set up Three.js scene
const scene = new Scene();
const camera = new PerspectiveCamera(30, 1, 0.01, 100);
camera.position.z = 80;
camera.add(new PointLight(0xffffff, 1));
scene.add(camera);
scene.add(result);
// const controls = new OrbitControls( camera, renderer.domElement );
// controls.update();
// scene.add(line);

// Set up Three.js renderer
const output = document.querySelector('#output');
const renderer = new WebGLRenderer({ canvas: output, antialias: true });
const dim = output.getBoundingClientRect();
renderer.setSize(dim.width, dim.height);
renderer.setAnimationLoop(function (time) {
  // controls.update();
  result.rotation.x = time / 2000;
  result.rotation.y = time / 1000;
  renderer.render(scene, camera);
});

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
console.log(selectedMaterial);
  var manifoldRing = ringGen(ringSize, [red, green, blue]);
  
  if (result.geometry) {
    result.geometry.dispose();
  }

  result.material = selectedMaterial;
  result.geometry = mesh2geometry(manifoldRing.getMesh());
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

updateRingSize();



// csg('union');
// const selectElement = document.querySelector('select');
// selectElement.onchange = function () {
//   csg(selectElement.value);
// };

// Convert Manifold Mesh to Three.js BufferGeometry
function mesh2geometry(mesh) {
  const geometry = new BufferGeometry();
  // Assign buffers
  geometry.setAttribute(
    'position', new BufferAttribute(mesh.vertProperties, 3));
  geometry.setIndex(new BufferAttribute(mesh.triVerts, 1));
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

