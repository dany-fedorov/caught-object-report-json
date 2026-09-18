// A deep import must not type-check either: the exports map hides every
// internal module from the declaration resolver as well as from Node's.
// The driver asserts that compiling this file fails.
import { limitReportSize } from 'caught-object-report-json/report-size';

export const deep = limitReportSize;
