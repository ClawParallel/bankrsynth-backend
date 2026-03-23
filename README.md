# BankrSynth

Autonomous execution agent built on top of Bankr.

BankrSynth turns ideas into on-chain actions.

---

## Overview

BankrSynth is not just another AI interface.

It is an execution layer that allows users (and agents) to move from:
idea → structured output → on-chain execution

without manual steps.

Instead of asking:
"what should I do?"

you can directly say:
"deploy this"

---

## What It Does

BankrSynth is designed to:

- analyze token ideas
- generate narratives and tickers
- structure execution-ready inputs
- deploy tokens via Bankr
- return real on-chain results (contract address, tx)

This removes the gap between thinking and doing.

---

## How It Works

1. User provides intent  
2. BankrSynth interprets it  
3. Generates structured output  
4. Executes via Bankr infrastructure  
5. Returns result  

No manual deployment steps.  
No switching tools.  
No fragmented workflow.

---

## Example

User:
"deploy a meme coin about frogs"

BankrSynth:
- generates name, ticker, narrative
- deploys via Bankr
- returns contract address

---

## Live Agent

https://bankrsynth-frontend.vercel.app/agent

---

## Skill

BankrSynth is packaged as a skill and can be used by other agents.

```bash
curl -s https://raw.githubusercontent.com/ClawParallel/bankrsynth-backend/main/SKILL.md
