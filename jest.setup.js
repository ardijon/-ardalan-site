/**
 * Runs before every test file, before any module is imported.
 *
 * Point the storage layer's file driver at a scratch directory. Without this,
 * the order tests write to src/data/orders.json — the file the live site reads —
 * and their `beforeEach` truncation wipes real orders on every `npm test`.
 */
const path = require('path')

// One directory per jest worker so parallel test files never share a data file.
process.env.DATA_DIR = path.join('.jest-data', `worker-${process.env.JEST_WORKER_ID || '1'}`)
