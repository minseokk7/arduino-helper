const { execSync } = require('child_process');
const out = execSync('arduino-cli compile --fqbn arduino:renesas_uno:minima --dump-profile --build-path test_sketch/.vscode/build test_sketch', { encoding: 'utf8' });
console.log("Output Length:", out.length);
const hasMemory = out.includes('스케치') || out.includes('Sketch');
console.log("Has memory output:", hasMemory);
