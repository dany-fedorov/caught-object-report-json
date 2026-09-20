// A default import of the CommonJS build. Node's ESM interop and every bundler
// give it the module namespace at runtime; whether TypeScript accepts it
// depends on the resolution mode, which the driver asserts explicitly.
import corj from 'caught-object-report-json';

export const viaDefault = corj.Corj.makeReport(new Error('default import'));
export const makerViaDefault = new corj.CorjMaker({ maxDepth: 1 });
