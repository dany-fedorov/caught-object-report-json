import { makeCorj } from '../src';

const report = makeCorj(
  { code: 'FETCH_FAILED', attempts: Array(100).fill('timeout') },
  {
    maxReportSize: 256,
    reportSizeUnit: 'utf8-bytes',
    metadata: false,
  },
);

const json = JSON.stringify(report);
console.log(json);
console.log(`UTF-8 bytes: ${Buffer.byteLength(json, 'utf8')}`);

// Use reportSizeUnit: 'utf16-code-units' to measure json.length instead.
