const testLengthCalculations = () => {
  const s = require('./src/safe-stable-stringify');
  const jsonStringify = s.configure({
    lengthLimit: 10,
  });
  const obj = {
    a: 1,
    aa: [2],
    b: { c: 2, d: 3 },
    e: 4,
    ee: [1, 2, 'eee'],
    f: [{ fe: 'fe' }, { 'hop': 'hey' }],
    g: [null, undefined, new Map(), new Set(), Buffer.from('123')],
  };
  const r = jsonStringify(obj);
  // console.log(r.length, r);
};

testLengthCalculations();
