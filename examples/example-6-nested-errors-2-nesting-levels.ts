import { makeCaughtObjectReportJson } from '../src';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const caught = new Error('lvl 0', {
  cause:
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Error('lvl 1; obj 0', {
      cause: [
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        new Error('lvl 2; obj 0.0', { cause: new Error('lvl 3; obj 0.0.0') }),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        new Error('lvl 2; obj 0.1'),
      ],
    }),
});
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
caught.nestedError = 'lvl 1; obj 1';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
caught.extraField = 'error info';
const report = makeCaughtObjectReportJson(caught, {
  maxChildrenLevel: 2,
  childrenSources: ['cause', 'errors', 'nestedError'],
  metadataFields: {
    $schema: false,
    as_json_format: false,
    as_string_format: false,
    v: false,
    children_sources: true,
  },
});
console.log(JSON.stringify(report, null, 2));
