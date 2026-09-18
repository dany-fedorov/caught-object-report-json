// Declaration resolution: every supported moduleResolution mode must find the
// package's types through its published layout, with no path mapping.
import {
  CorjMaker,
  CorjRedactor,
  CORJ_DEFAULT_OPTIONS,
  CORJ_OMITTED_MARKER,
  CORJ_REDACTED_MARKER,
  makeCorj,
  makeCorjArray,
  resolveCorjRedactPolicy,
  restoreExpectedValues,
} from 'caught-object-report-json';
import type {
  CorjContext,
  CorjInspection,
  CorjOptionsInput,
  CorjRedactPolicyInput,
  CorjReport,
  CorjReportChild,
} from 'caught-object-report-json';

const inspection: CorjInspection = 'no-invoke';
const redact: CorjRedactPolicyInput = {
  keys: ['token', /secret/i],
  paths: ['$.cause'],
  patterns: [/sk-live-\w+/g],
  replacement: '[gone]',
  transform: (value) => value,
};
const options: CorjOptionsInput = { inspection, redact, maxDepth: 2 };

const warning: CorjContext = { stage: 'warning', path: '$', key: 'message' };

const resolved = resolveCorjRedactPolicy(redact);
const scrubbed: string =
  resolved === null
    ? 'no policy'
    : new CorjRedactor(resolved, () => undefined).text('sk-live-AAA', warning);

const report: CorjReport = makeCorj(new Error('typed'), options);
const rows: CorjReportChild[] = makeCorjArray(new Error('typed'), options);
const maker = new CorjMaker(options).with({ maxChildren: 3 });

export const surface = {
  report,
  rows,
  full: restoreExpectedValues(report),
  fromMaker: maker.makeReportObject('caught'),
  defaults: CORJ_DEFAULT_OPTIONS.inspection,
  markers: [CORJ_OMITTED_MARKER, CORJ_REDACTED_MARKER],
  scrubbed,
};
