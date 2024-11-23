// The code for the ring, each ring will have its own "page", ring files are stored in /generators

import Module from './node_modules/manifold-3d/manifold.js';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;

// var ringSize = 54;
var wallThickness = 2;
var segments = 256;
// var segments = 16;

// var seed = "#AC";
// var color = [3,4,15];

function ringGen(ringSize, color){
  console.time('Ring Generation');

// Ring body
const ringBody = Manifold.cylinder(30, ((ringSize / Math.PI) + wallThickness*2)/2, ((ringSize / Math.PI) + wallThickness)/2, segments, true).rotate([90,0,0]);
const ringInside = Manifold.cylinder(30, (ringSize / Math.PI)/2, (ringSize / Math.PI)/2, segments, true).rotate([90,0,0]);
const frontCut = Manifold.cube([150,40,150], true).translate([0, -28, 30]).rotate([15,0,0])
const backCut = Manifold.sphere(ringSize/2, segments).translate([0, ringSize*0.4, ringSize*-0.3]);

// const ringFrontSafeBand
const ringFrontSafe = Manifold.cube([150,40,150], true).translate([0, -28+wallThickness, 30]).rotate([15,0,0])
const ringFrontSafeBand = ringBody
                .subtract(ringInside)
                .subtract(frontCut)
                .subtract(backCut)
                .intersect(ringFrontSafe);
// const ringBackSafeBand
const ringBackSafe = Manifold.sphere(ringSize/2, segments).translate([0, ringSize*0.4-wallThickness, ringSize*-0.3]);
const ringBackSafeBand = ringBody
                .subtract(ringInside)
                .subtract(frontCut)
                .subtract(backCut)
                .intersect(ringBackSafe);

// Convert the seed into binary representation
//   var seedBin = ringSize.toString(2).padStart(8, '0') +
//   seed.charCodeAt(0).toString(2).padStart(8, '0') +
//   seed.charCodeAt(1).toString(2).padStart(8, '0') +
//   seed.charCodeAt(2).toString(2).padStart(8, '0');

  var seedBin = Number(ringSize).toString(2).padStart(8, '0') +
  Number(color[0]).toString(2).padStart(8, '0') +
  Number(color[1]).toString(2).padStart(8, '0') +
  Number(color[2]).toString(2).padStart(8, '0');

//   console.log(seedBin);

// Cut the code into the front of the ring
const codeCutter = Manifold.cube([1,1,ringSize/(2*Math.PI)+wallThickness/2],true).translate([0,0,(ringSize/(2*Math.PI)+wallThickness/2)/2]);
// const codeCutter = Manifold.cylinder(ringSize/(2*Math.PI)+wallThickness/2,1,1, segments, true).translate([0,0,(ringSize/(2*Math.PI)+wallThickness/2)/2]);
var code = Manifold.cylinder(1,1,1,6);
for(var bit = 0 ; bit < 32; bit++){
  if(seedBin.charAt(bit) == '1' ){
    code = code.add(codeCutter.rotate(0,bit*360/32,0));
  }
}
code = code.rotate([15,0,0]).translate([0, -8.5, 0]);

// // Convert seed to number
// var seedInt = Number(String(seed.charCodeAt(0)) + String(seed.charCodeAt(1)) + String(seed.charCodeAt(2)));

// // Decor, seed must be a positive number
// var seedArray = Array.apply(null, Array(16))
// for (var i in seedArray){
//   seedArray[i] = [0,0,0];
//   for (var j in seedArray[i]){
//       seedInt = seedInt * 16807 % 2147483647;
//       seedArray[i][j] = (seedInt-1) / 2147483646;
//   }
// }
// // A array of 3d vector seeds
// console.log(seedArray);

var numExtrusions = 18;
var cutCounter = 0;
var baseCube = Manifold.cylinder(1,1,1,6);
for (var pitch = 0; pitch < 360; pitch += 360/numExtrusions){
  for (var roll = 0; roll < 360; roll += 360/numExtrusions){
    if(pitch < 60 || pitch > 300){
    //   console.log(cutCounter + " " + seedBin.charCodeAt(cutCounter+8) + " " + seedBin[cutCounter+8]);
      cutCounter = (cutCounter+1) % 24;
      if(seedBin.charCodeAt(cutCounter+8) == 48){
        // = (cutCounter+1) % 32;
        if (roll % (360/numExtrusions*2) == 0){
          baseCube = baseCube.add(Manifold.cylinder(ringSize/Math.PI,0.1,3,6).rotate([pitch+360/numExtrusions/2,roll,0]));
        } else {
          baseCube = baseCube.add(Manifold.cylinder(ringSize/Math.PI,0.1,3,6).rotate([pitch,roll,0]));
        }
      }
    }
  }
}
// for (var index in seedArray){
//   baseCube = Manifold.cylinder(ringSize,2,2,6,true).add(baseCube.rotate([seedArray[index][0]*360,seedArray[index][1]*360,seedArray[index][2]*360]));
// }
// for (var index in seedArray){
//   baseCube = baseCube.add(Manifold.cylinder(ringSize/Math.PI,0.1,3.5,6).rotate([index * 22.5,0,0]));
// }
// baseCube = baseCube.add(baseCube.rotate([22.5/2,22.5,0]));
// baseCube = baseCube.add(baseCube.rotate([0,22.5*2,0]));
// baseCube = baseCube.add(baseCube.rotate([0,22.5*4,0]));

const finger = (Manifold.cylinder(50,18.1/2,18.1/2,segments,true).rotate([90,0,0]));

const ringMesh = ringBody
                .subtract(ringInside)
                .subtract(frontCut)
                .subtract(backCut)
                .subtract(baseCube)
                .add(ringFrontSafeBand)
                .add(ringBackSafeBand)
                .subtract(code);

// const result = ringBody
//                 .subtract(ringInside)
//                 .subtract(frontCut)
//                 .subtract(backCut)
//                 .subtract(baseCube);

console.timeEnd('Ring Generation');
return ringMesh;

}

export default ringGen;