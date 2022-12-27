import type { CaughtObjectReportJson, CorjBuilderOptions } from './CorjBuilder';
import { CorjBuilder } from './CorjBuilder';

export const DEFAULT_CORJ_BUILDER_OPTIONS = {
  addJsonSchemaLink: false,
  onCaughtBuilding: (caught: unknown, { caughtDuring }) => {
    console.warn(
      `caught-object-report-json: ${caughtDuring}: Caught when building report json.`,
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
