import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testRegex: '/(tests|src)/.*.test(\\..+)?\\.ts$',
  'collectCoverageFrom': ['src/**/*.ts'],
  coverageReporters: ['json-summary', 'text', 'lcov'],
};

export default config;
