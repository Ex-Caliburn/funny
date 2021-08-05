const { performance } = require('perf_hooks');

let number = 1e7;

const a = 1;
const b = 1;

const add = (a, b) => a + b;

performance.mark('start');

while (number --) {
	add(a, b);
}

performance.mark('end');

performance.measure('performance test', 'start', 'end');

// const measure = performance.getEntriesByName('performance test');

console.log(performance);

// node version v8.11.3
// node v8/addFunction.js
// node --trace-opt addFunction.js