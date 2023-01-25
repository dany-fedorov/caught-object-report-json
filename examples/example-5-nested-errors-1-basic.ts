// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { makeCaughtObjectReportJson } from '../src';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const caught = new AggregateError(
  [
    new Error('AggregateError child 0'),
    'AggregateError child 1 (not an Error object)',
  ],
  'AggregateError message',
  { cause: new Error('Cause Error object') },
);
const report = makeCaughtObjectReportJson(caught, {
  metadataFields: {
    $schema: false,
    as_json_format: false,
    as_string_format: false,
    v: false,
    children_sources: true,
  },
});
console.log(JSON.stringify(report, null, 2));

// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// const caught = new AggregateError(
//   [
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     // @ts-ignore
//     new Error('message from regular Error', {
//       cause: new Error(`message from regular Error's cause`),
//     }),
//   ],
//   'message from AggregateError',
// );
// console.log(
//   JSON.stringify(
//     makeCaughtObjectReportJson(caught, { metadataFields: false }),
//     null,
//     2,
//   ),
// );

// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// const ee = new Error('hey10', {
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   // @ts-ignore
//   cause: new Error('hey9', {
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     // @ts-ignore
//     cause: new Error('hey8', {
//       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//       // @ts-ignore
//       cause: new Error('hey7', {
//         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//         // @ts-ignore
//         cause: new Error('hey6', {
//           // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//           // @ts-ignore
//           cause: new Error('hey5', {
//             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//             // @ts-ignore
//             cause: new Error('hey4', {
//               // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//               // @ts-ignore
//               cause: new Error('hey3', {
//                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                 // @ts-ignore
//                 cause: new Error('hey2', {
//                   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                   // @ts-ignore
//                   cause: new Error('hey1', { cause: [1, 2, 3] }),
//                 }),
//               }),
//             }),
//           }),
//         }),
//       }),
//     }),
//   }),
// });
//
// const e = new Error("hey3", { cause: new Error("hey2", { cause: new Error("hey1", { cause: [1, 2, 3] }) }));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// console.log(e.fileName);
/*console.log(
  JSON.stringify(
    makeCaughtObjectReportJson(ee, { maxNestingLevels: 1 }),
    null,
    2,
  ),
);*/

// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// const e = new AggregateError(
//   [
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     // @ts-ignore
//     new AggregateError(
//       [
//         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//         // @ts-ignore
//         new AggregateError(
//           [
//             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//             // @ts-ignore
//             new AggregateError(
//               // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//               // @ts-ignore
//               [new AggregateError([new Error('hey'), ee, ee], 'aggregat2')],
//               'aggregat1',
//             ),
//           ],
//           'aggregat2',
//         ),
//       ],
//       'aggregat1',
//     ),
//   ],
//   'aggregat',
// );
// console.log(
//   JSON.stringify(
//     // CorjMaker.withDefaults().entries(e),
//     makeCaughtObjectReportJson(e, {
//       maxChildrenLevel: 2,
//       childrenSources: ['heh', ...CORJ_MAKER_DEFAULT_OPTIONS.childrenSources],
//     }),
//     null,
//     2,
//   ),
// );
// console.log(e.errors);
