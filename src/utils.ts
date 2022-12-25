import { configure } from 'safe-stable-stringify';

const stringify = configure({
  circularValue: '[_corj_jsonStringifySafe: Circular]',
  deterministic: false,
});

type StringifyAsSafeJsonValueOptions = {
  replacer?: (this: any, key: string, value: any) => any;
  indent?: string | number;
};

export function _corj_jsonStringifySafe(
  value: unknown,
  options?: StringifyAsSafeJsonValueOptions,
): string {
  return String(stringify(value, options?.replacer, options?.indent));
}
