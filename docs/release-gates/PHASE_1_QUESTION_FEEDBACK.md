# Phase 1 Question Feedback

Date: 2026-07-01

This step improved the math-question encounter so correct and wrong answers
feel like game events instead of plain form feedback.

## Added

- correct-answer glow and pop state
- wrong-answer and timeout shake state
- feedback badge styling that stays inside the mobile viewport
- local verification hooks for Playwright under `?verify`
- Phase 1 Playwright checks for correct and wrong answer feedback

## Why

The question panel is part of the core loop. It should be readable, responsive,
and satisfying on a phone, while still staying accessible and predictable for
kids answering quickly.

## Gate

The Phase 1 vertical-slice test now verifies:

- a question can be opened through the local verification path
- correct answers set and clear the `correct` feedback state
- wrong answers set and clear the `wrong` feedback state
- feedback stays unclipped in the mobile viewport
- runtime errors stay empty

The verification hooks are available only on local `localhost`/`127.0.0.1`
runs with a `verify` query parameter.
