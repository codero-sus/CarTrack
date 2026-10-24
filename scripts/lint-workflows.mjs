#!/usr/bin/env node
/**
 * Lint GitHub Actions workflows with actionlint (WASM build).
 *
 * The npm `actionlint` package ships no CLI binary, only a Node API, so this
 * wrapper exists to give the project a real workflow check. It lives inside
 * the project so that `actionlint` resolves from node_modules.
 *
 * Usage: node scripts/lint-workflows.mjs [file...]
 * Exits non-zero if any workflow has a problem.
 */
import { createLinter } from "actionlint";
import { readFile } from "node:fs/promises";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/lint-workflows.mjs <workflow.yml> [...]");
  process.exit(2);
}

const lint = await createLinter();
let problems = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const results = lint(source, file);
  if (results.length === 0) {
    console.log(`ok    ${file}`);
    continue;
  }
  for (const r of results) {
    console.log(`${r.file}:${r.line}:${r.column}: [${r.kind}] ${r.message}`);
    problems++;
  }
}

console.log(
  problems === 0
    ? `\n${files.length} workflow(s) clean`
    : `\n${problems} problem(s) in ${files.length} workflow(s)`,
);
process.exit(problems === 0 ? 0 : 1);
