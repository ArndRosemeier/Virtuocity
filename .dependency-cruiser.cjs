/** Architectural boundaries. See docs/architecture.md. */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-is-standalone',
      comment: 'The core depends on no other Virtuocity package.',
      severity: 'error',
      from: { path: '^packages/core/' },
      to: { path: '^packages/(?!core/)' },
    },
    {
      name: 'modules-only-use-core-ui-and-contracts',
      comment:
        'Modules (skills, game modes, providers) may only depend on the core, the UI kit and contract packages, never on each other or the app.',
      severity: 'error',
      from: { path: '^packages/(?!core/|app/)([^/]+)/' },
      to: { path: '^packages/(?!core/|ui/|contract-)(?!$1/)' },
    },
    {
      name: 'contracts-only-use-core-and-contracts',
      comment:
        'Contracts are pure interfaces: they may depend on the core and on parent contracts in other contract packages, nothing else.',
      severity: 'error',
      from: { path: '^packages/contract-' },
      to: { path: '^packages/(?!core/|contract-)' },
    },
    {
      name: 'ui-kit-only-uses-core',
      comment: 'The UI kit is shared by every module, so it may only depend on the core.',
      severity: 'error',
      from: { path: '^packages/ui/' },
      to: { path: '^packages/(?!core/|ui/)' },
    },
    {
      name: 'nothing-depends-on-app',
      severity: 'error',
      from: { path: '^packages/(?!app/)' },
      to: { path: '^packages/app/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|dist)' },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    preserveSymlinks: false,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
