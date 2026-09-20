import { Corj } from '../src';

const report = Corj.makeReport(
  { code: 'FETCH_FAILED', attempts: Array(100).fill('timeout') },
  {
    maxReportSize: 512,
    reportSizeUnit: 'utf8-bytes',
    metadata: false,
  },
);

const json = JSON.stringify(report);
console.log(json);
console.log(`UTF-8 bytes: ${Buffer.byteLength(json, 'utf8')}`);

// Use reportSizeUnit: 'utf16-code-units' to measure json.length instead.
