// Declaration resolution: every supported moduleResolution mode must find the
// package's types through its published layout, with no path mapping.
import {
  CorjMaker,
  CORJ_DEFAULT_OPTIONS,
  CORJ_OMITTED_MARKER,
  CORJ_REDACTED_MARKER,
  makeReport,
  makeReportArray,
  resolveCorjRedactPolicy,
  restoreExpectedValues,
} from 'caught-object-report-json';
import type {
  CorjContext,
  CorjInspection,
  CorjOptionsInput,
  CorjRedactPolicyInput,
  CorjReport,
  CorjReportInput,
  CorjReportNode,
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

const warning: CorjContext = {
  stage: 'warning',
  path: '$',
  reportKey: 'message',
};

const resolved = resolveCorjRedactPolicy(redact);
const scrubbed: string =
  resolved === null
    ? 'no policy'
    : new CorjMaker({ redact: resolved }).scrubText('sk-live-AAA', warning);

const input: CorjReportInput = { ...options, context: { runId: 'typed' } };
const report: CorjReport = makeReport(new Error('typed'), input);
const rows: CorjReportNode[] = makeReportArray(new Error('typed'), options);
const maker = new CorjMaker(options).withOptions({ maxChildren: 3 });

export const surface = {
  report,
  rows,
  full: restoreExpectedValues(report),
  fromMaker: maker.makeReport('caught'),
  defaults: CORJ_DEFAULT_OPTIONS.inspection,
  markers: [CORJ_OMITTED_MARKER, CORJ_REDACTED_MARKER],
  scrubbed,
};
