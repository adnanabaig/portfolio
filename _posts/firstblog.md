---
date: '2025-12-15T08:00:00.000Z'
title: What It's Like to Build Teleop UIs for Real-Time Robotics
tagline: Operating at Meta Reality Labs with Sigma Design
preview: >-
  Building operator interfaces for remote robotics is a different discipline
  entirely. The feedback loops are tight, the stakes are real, and the UI has
  to be as reliable as the hardware it drives.
image: >-
  https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=60
---

# The Interface Is the Robot

When most people think about robotics, they picture the hardware — the arms, the sensors, the motors. But for a teleoperator, the robot *is* the UI. If the interface lags, hesitates, or misrepresents state, the human in the loop loses confidence. And in real-time remote robotics, lost confidence costs you the operation.

Working on teleops support at Meta Reality Labs via Sigma Design, I've had to think hard about what it means to build interfaces that operate at hardware speeds.

## What Makes Teleop UIs Hard

A standard web UI can afford to be async. You submit a form, wait 200ms, get a response. Nobody dies. Teleop UIs don't have that contract. The operator's perception of the robot's state must stay synchronized with actual robot state. Any drift — even perceptual drift — erodes the operator's mental model.

The core challenges:

- **Latency budgets are non-negotiable.** Your UI thread cannot block. Every render cycle needs to complete before the next telemetry packet arrives.
- **State is always stale.** By the time a frame hits the operator's screen, the robot has already moved. Good UI design acknowledges this and helps the operator reason about *expected* state, not just *last known* state.
- **Feedback loops must close.** If the operator issues a command, they need confirmation — not eventually, but immediately. Optimistic UI patterns matter here.

## The Stack

The front-end work I do is React-based — TypeScript all the way down, strict mode on. The component model maps well to the kinds of modular control surfaces teleop needs. Each widget in the operator UI owns its own state slice and renders at the rate its data feed allows.

GSAP handles animated transitions — not for aesthetic reasons, but because CSS transitions can't be programmatically interrupted mid-frame the way GSAP tweens can. When a robot arm snaps to a new pose, you want the UI indicator to *track* that, not ease into it on its own schedule.

## What I've Taken Away

The discipline of building for real-time feedback has made me a better web engineer broadly. When you've had to optimize a React component tree to render at 60fps against a live telemetry stream, you start seeing every web UI differently — as a system with timing constraints, not just a form on a page.

More on this as the project evolves.
