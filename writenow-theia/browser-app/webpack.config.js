/**
 * This file customizes the generated webpack configuration.
 *
 * Why: WriteNow's Theia backend must load native Node modules (`better-sqlite3`, `sqlite-vec`) at runtime.
 * Webpack-bundling these modules breaks native addon resolution (e.g. `.node` files via `bindings`),
 * so we treat them as CommonJS externals and let Node resolve them from `node_modules`.
 */
// @ts-check
const configs = require('./gen-webpack.config.js');
const nodeConfig = require('./gen-webpack.node.config.js');

nodeConfig.config.externals = {
    ...(nodeConfig.config.externals || {}),
    'better-sqlite3': 'commonjs2 better-sqlite3',
    'sqlite-vec': 'commonjs2 sqlite-vec'
};

// Why: The backend embedding service spawns a Node worker thread by resolving `embedding-worker.js`
// relative to the backend bundle directory. Ensure webpack emits that worker entry so runtime
// indexing does not crash in Electron/standalone mode.
nodeConfig.config.entry = {
    ...(nodeConfig.config.entry || {}),
    'embedding-worker': require.resolve('writenow-core/lib/node/embedding/embedding-worker'),
};

module.exports = [
    ...configs,
    nodeConfig.config
];
