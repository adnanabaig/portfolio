DRAFT: Adnan to edit and approve before publishing

---
date: ''
title: How I Built This Site
tagline: A pixel-art robot workcell on top of a plain resume
preview: >-
  adnanbaig.com looks like a pixel-art robot station. Under that it is a fast,
  plain resume. Here is how I built it, and why the little teleop game follows
  the same safety rules as the real thing.
---

I build software for robots. Control apps, fleet dashboards, data tools. I wanted my site to feel like that work. I did not want it to get in the way.

## The idea

The site is Station AB-01. It looks like a pixel-art robotics workcell. A small robot called AB-01 walks a track at the top of the page as you scroll. Sections are bays. Projects are modules and rigs on a rack.

I kept one rule above the rest. A recruiter should see my name, my role, my key work, and my resume link in the first screen. No clicks. No loading screen. Everything playful sits on top of that, and none of it is a gate.

## The teleop cell

The home page has a small robot arm cell. You can take control with the keyboard or the touch pads, pick up skill blocks, and sort them into bins. There is one block for every skill on the site.

I wanted it to act like the teleop systems I work on, not like a toy. So it borrows their safety ideas:

- **Latched stop.** A stop stays latched until you clear it. The cell refuses to clear while the site-wide E-STOP in the header is still on.
- **Deadman.** With deadman mode on, letting go of the hold while the arm is moving latches a stop.
- **Watchdog.** After 20 seconds with no input, the arm parks itself.
- **Latency.** Commands wait in a buffer before the arm sees them. In the console you can set the delay from 0 to 300 ms and feel what lag does to fine control. It is labeled SIM, because it is.
- **Episodes.** You can record a demonstration. The cell saves your commands at 30 Hz, up to 60 seconds, and replays them through the same pipeline, latency included. The last three stay in your browser for the session.

These come from my real work: latched stops that need manual clearance, deadman and watchdog supervision, a live network-latency view, and demonstration recording with episode tracking. The game is a small version. The rules have the same shape.

There is also an AUTO DEMO that drives the arm for you through the same latency link and limits, an OPS console you can open with `/`, and a 404 page with a tiny level where you drive AB-01 home. All of it is optional.

## Facts come from data

Every fact on the site lives in one JSON file. The cards, the project pages, the console, the skill index, and the sitemap all read from it.

Numbers are never typed into a component. A small module pulls each one out of the sentence it comes from, like the issue count or the test count. If that sentence changes shape, it throws, and the build fails instead of shipping a stale number.

Checks run before every commit:

- One scans all copy for em dashes, emoji, and words that should not be public.
- One runs every console command in Node and checks that each number it prints is a real fact, or is clearly marked as yours, like your ping.
- One reads the built HTML and confirms the name, role, resume link, and every project field are in the server-rendered page, before the game.
- One checks the system sketch on each project page. Every box in a sketch has to be named in that project's own copy.

## Access and motion

The page is complete without JavaScript, in Text mode, and in print. The content is HTML. The canvas only repeats labels that are already on the page, and screen readers skip it.

Everything works from the keyboard. Arrow keys only drive the arm while the cell has focus. Esc lets go. Dialogs keep focus inside and hand it back when they close.

If your system asks for reduced motion, the site listens. No walking robot, no typing effect, no particles, no shake. The header E-STOP freezes every animation on the site and mutes sound. Sound is off by default and only starts after you turn it on.

## Performance budget

The home page has a JavaScript budget: 110 kB on first load as the target, 130 kB as the hard ceiling. It is under the target today.

A few things keep it there. The pixel art is SVG drawn on the server from JSON, so the sprite data stays out of the main bundle. The teleop engine, the console, the sound, and the 404 level load only when you ask for them. There are no animation, UI, or audio libraries. The fonts are self-hosted.

## How I built it

I built it with a multi-agent AI workflow that I directed. I set the concept and the rules: facts only from my resume, a recruiter path that never depends on the game, the budgets, and the accessibility contract. Agents did much of the implementation, often in parallel. Every change ran against the same checks and the same build, and was checked with screenshots at phone, tablet, and desktop sizes before it was committed.

The checks are what made that work. An agent can write a lot of code fast. The guards make sure it does not invent a number, leak something private, or break the first screen.

The stack is plain: Next.js, React, TypeScript, and Tailwind CSS, with static pages deployed on Vercel.
