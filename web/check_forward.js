// compare la passe avant du moteur JS a celle de PyTorch (memes poids, memes entrees)
const fs = require("fs");
const A = require("./archigan.js");
const model = JSON.parse(fs.readFileSync(process.argv[2]));
const t = JSON.parse(fs.readFileSync(process.argv[3]));
let maxErr = 0;
t.z.forEach((z, k) => {
  const o = A.generatorForward(model.weights, z, t.c[k]);
  o.forEach((v, i) => maxErr = Math.max(maxErr, Math.abs(v - t.out[k][i])));
});
console.log("ecart max JS / PyTorch :", maxErr.toExponential(2));
