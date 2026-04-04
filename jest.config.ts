import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Next.js @/* 경로 별칭 → src/*
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
      },
    }],
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
};

export default config;
