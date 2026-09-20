import type { CorjContext, CorjStage } from '../src/index';

describe('shared context types', () => {
  test('one value is a valid context for a transform and for a handler', () => {
    const context: CorjContext = {
      stage: 'as_json',
      path: '$context.user',
      reportKey: 'as_json',
      sourceProperty: 'user',
    };
    const forTransform: CorjContext = context;
    const forHandler: CorjContext = context;
    expect(forTransform).toBe(forHandler);
  });

  test('every reporting stage is a CorjStage', () => {
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
