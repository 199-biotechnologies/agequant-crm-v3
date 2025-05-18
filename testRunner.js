#!/usr/bin/env node

/**
 * Simple test runner to make it easier to run a single test file
 * 
 * Usage:
 *   node testRunner.js <test-file-path>
 * 
 * Example:
 *   node testRunner.js __tests__/lib/utils.test.ts
 */

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Error: Please provide a test file path');
  console.log('Usage: node testRunner.js <test-file-path>');
  console.log('Example: node testRunner.js __tests__/lib/utils.test.ts');
  process.exit(1);
}

const testFilePath = args[0];
const absolutePath = path.resolve(process.cwd(), testFilePath);

console.log(`Running test: ${testFilePath}`);

// Run Jest with the specified test file
const result = spawnSync('pnpm', ['jest', absolutePath, '--colors'], { 
  stdio: 'inherit',
  shell: true
});

process.exit(result.status);