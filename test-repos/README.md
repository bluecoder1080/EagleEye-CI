# Test Broken Repos

Three controlled repos for local testing of the healing agent pipeline.

## Repo 1: Python Unused Import

- File: `src/utils.py` with `import os` (unused)
- Tests via `pytest`
- Expected: `LINTING` or `IMPORT` classification

## Repo 2: Python Missing Colon

- File: `src/calculator.py` with `def add(a, b)` (missing colon)
- Tests via `pytest`
- Expected: `SYNTAX` classification

## Repo 3: Node Missing Import

- File: `src/index.ts` uses `fs` without importing it
- Tests via `npm test`
- Expected: `IMPORT` or `TYPE_ERROR` classification

## Setup

```bash
cd test-repos
./setup.sh   # or manually push each to GitHub
```
