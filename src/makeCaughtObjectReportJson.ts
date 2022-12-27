import type { CaughtObjectReportJson, CorjBuilderOptions } from './CorjBuilder';
import { CorjBuilder } from './CorjBuilder';

export const DEFAULT_CORJ_BUILDER_OPTIONS = {
  addJsonSchemaLink: false,
  onCaughtBuilding: (caught: unknown) => {
    console.warn(
      'caught-object-report-json: Caught when converting caught object to json',
      caught,
    );
  },
} as CorjBuilderOptions;

/**
 * Wrapper for {@link CorjBuilder.build | CorjBuilder.build} with default options specified in {@link DEFAULT_CORJ_BUILDER_OPTIONS}.
 */
export function makeCaughtObjectReportJson(
  caught: unknown,
  options?: Partial<CorjBuilderOptions>,
): CaughtObjectReportJson {
  const effectiveOptions = {
    ...DEFAULT_CORJ_BUILDER_OPTIONS,
    ...(options ?? {}),
  };
  const builder = new CorjBuilder(effectiveOptions);
  return builder.build(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJson}.
 */
export const bakeCorj = makeCaughtObjectReportJson;
