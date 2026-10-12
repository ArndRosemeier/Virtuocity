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
      name: 'modules-only-use-core',
      comment:
        'Modules (skills, game modes, providers) may only depend on the core, never on each other or the app.',
      severity: 'error',
      from: { path: '^packages/(?!core/|app/)([^/]+)/' },
      to: { path: '^packages/(?!core/)(?!$1/)' },
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
