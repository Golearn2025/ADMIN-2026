import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseConfig: {
    extends: ['next/core-web-vitals', 'next/typescript'],
  },
});

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
];
