// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { makeCaughtObjectReportJson } from '../src';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const caught = new AggregateError(
  [
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Error('message from regular Error', {
      cause: new Error(`message from regular Error's cause`),
    }),
  ],
  'message from AggregateError',
);
console.log(
  JSON.stringify(
    makeCaughtObjectReportJson(caught, { metadataFields: false }),
    null,
    2,
  ),
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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
//               [new AggregateError([new Error('hey')], 'aggregat2')],
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
//     makeCaughtObjectReportJson(e, {
//       maxNestingLevels: 1,
//     }),
//     null,
//     2,
//   ),
// );
// console.log(e.errors);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// const e = new Error('hey10', {
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
// // const e = new Error("hey3", { cause: new Error("hey2", { cause: new Error("hey1", { cause: [1, 2, 3] }) }));
// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// // console.log(e.fileName);
// console.log(
//   JSON.stringify(
//     makeCaughtObjectReportJson(e, { maxNestedCauseLevels: 1 }),
//     null,
//     2,
//   ),
// );
