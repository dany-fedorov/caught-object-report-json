import type {
  CorjContext,
  CorjErrorContext,
  CorjErrorStage,
  CorjRedactContext,
  CorjRedactStage,
  CorjStage,
} from '../src/index';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;
const assertType = <T extends true>(): T => true as T;

describe('shared context types', () => {
  test('the four old names are aliases of the two new ones', () => {
    assertType<Equal<CorjRedactStage, CorjStage>>();
    assertType<Equal<CorjErrorStage, CorjStage>>();
    assertType<Equal<CorjRedactContext, CorjContext>>();
    assertType<Equal<CorjErrorContext, CorjContext>>();
  });

  test('one value is a valid context for a transform and for a handler', () => {
    const context: CorjContext = {
      stage: 'as_json',
      path: '$context.user',
      key: 'as_json',
      prop: 'user',
    };
    const forTransform: CorjRedactContext = context;
    const forHandler: CorjErrorContext = context;
    expect(forTransform).toBe(forHandler);
  });

  test('every stage of the old two enums is a CorjStage', () => {
    const stages: CorjStage[] = [
      'prop-access',
      'as_string',
      'as_json',
      'children',
      'limit',
      'redact',
      'warning',
      'other',
    ];
    expect(stages).toHaveLength(8);
  });
});
