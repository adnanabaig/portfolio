---
date: '2025-09-15T08:00:00.000Z'
title: AI Agents, Actually — Building Systems That Do Real Work
tagline: Lessons from building agent pipelines that ship
preview: >-
  Everyone is building AI agents. Few of them work reliably in production.
  Here's what I've learned about building agents that actually do the job.
image: >-
  https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80
---

# Not Every LLM Call Is an Agent

The term "AI agent" has been stretched to cover everything from a single API call to a full autonomous system running unattended for hours. That ambiguity causes real problems. If you don't know what kind of system you're building, you can't design for its failure modes.

Here's the definition I work with: **an agent is a system that observes an environment, decides on actions, executes them, and uses the results to inform its next decision.** The loop is the thing. One LLM call with a structured output is not an agent — it's a smart function. An agent runs that loop repeatedly until a goal state is reached or a budget is exhausted.

## The Hard Part Is Not the Model

The LLM is the easiest part of an agent system. The hard parts are:

**Tool reliability.** Every tool your agent can call is a surface for failure. A flaky API, a malformed response, or a missing field will break the loop at exactly the wrong moment. Build all tool schemas defensively — typed inputs, typed outputs, explicit error cases the model can reason about and recover from.

**Context budget.** Agents that run many steps accumulate context fast. Past observations, tool results, intermediate reasoning — it adds up. You need a strategy for what to keep, what to summarize, and what to discard. There is no universal right answer; it depends on the task and the model's context window.

**Eval before deployment.** You cannot ship an agent without an eval suite. Not unit tests — evals. A set of task/expected-outcome pairs that let you measure whether a model change or tool change broke agent behavior. This is the step most demos skip and most production systems regret skipping.

## What I Use

My current reasoning layer is Claude (Anthropic's API). The tool-use implementation is clean — structured, predictable, and easy to test against. For orchestration I keep it as thin as possible. The most reliable agents I've shipped are ones where the orchestration layer does almost nothing except route tool calls and check stopping conditions.

## The Discipline

Building agents well is a software engineering discipline, not an AI research discipline. Model selection matters far less than loop design, error handling, and eval coverage. Treat it like any other system: specify the contract, test the edges, observe in production.
