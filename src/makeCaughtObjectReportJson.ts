import type { CaughtObjectReportJson, CorjMakerOptions } from './CorjMaker';
import { CorjMaker } from './CorjMaker';

export const CORJ_MAKER_OPTIONS_DEFAULTS = {
  addJsonSchemaLink: false,
  onCaughtMaking: (caught: unknown, { caughtDuring }) => {
    console.warn(
      `caught-object-report-json: ${caughtDuring}: Caught when building report json.`,
      caught,
    );
  },
} as CorjMakerOptions;

/**
 * Wrapper for {@link CorjMaker.make | CorjMaker.build} with default options specified in {@link CORJ_MAKER_OPTIONS_DEFAULTS}.
 */
export function makeCaughtObjectReportJson(
  caught: unknown,
  options?: Partial<CorjMakerOptions>,
): CaughtObjectReportJson {
  const effectiveOptions = {
    ...CORJ_MAKER_OPTIONS_DEFAULTS,
    ...(options ?? {}),
  };
  const builder = new CorjMaker(effectiveOptions);
  return builder.make(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJson}.
 */
export const bakeCorj = makeCaughtObjectReportJson;
