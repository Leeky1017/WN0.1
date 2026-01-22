/**
 * This file can be edited to customize webpack configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-check
const configs = require('./gen-webpack.config.js');
const nodeConfig = require('./gen-webpack.node.config.js');

/**
 * Why: Phase 0 PoC needs to validate native Node modules (better-sqlite3 + sqlite-vec) in the Theia backend.
 * Webpack-bundling these modules breaks native addon resolution (e.g. `better_sqlite3.node` via `bindings`),
 * so we treat them as CommonJS externals and let Node resolve them from `node_modules` at runtime.
 */
nodeConfig.config.externals = {
    ...(nodeConfig.config.externals || {}),
    'better-sqlite3': 'commonjs2 better-sqlite3',
    'sqlite-vec': 'commonjs2 sqlite-vec'
};

module.exports = [
    ...configs,
    nodeConfig.config
];

