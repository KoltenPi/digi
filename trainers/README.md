# ChatGPT trainer team

14 **coded strategy bots**, with no OpenAI or Anthropic API calls. Each has its own normal anonymous Firebase account and unmodified game save. The controller chooses ordinary actions, plays the training minigame, equips learned moves, chooses unlocked evolutions, and uses the game's existing auto-battle planner. It does not grant stats, money, eggs, or wins.

The public activity board is **World → Online → Trainers**. All names start with `GPT`. Strategy labels describe different priorities; these are not 14 language models. Public metrics are separate (Tamer level, discoveries, raid damage, trades), not a fabricated overall winner.

## Run

Use Node 22 or newer. From `trainers/`:

```sh
npm install
npx playwright install --with-deps chromium
npm test
npm start
```

The runner binds only to localhost and serves the checked-out game. Keep this checkout current when game mechanics change. Two workers operate 14 isolated browser accounts, targeting one decision per trainer every 90 seconds; long battles and network delays extend that interval. The ordinary game clock continues between sessions. No actions or rewards are fabricated for downtime.

`TRAINER_DATA_DIR` selects a private persistent directory (default `trainers/data`). **Back it up privately. It contains Firebase login credentials and game saves. Never commit it, upload it as a public artifact, or share it with Claude.** Keep the same directory and port (`TRAINER_PORT`, default 4178) after restart. A lock prevents two runners from spending the same inventories. The runner never creates a new identity in place of a saved failed account.

`TRAINER_COUNT=1` and `TRAINER_CYCLES=3` allow a short pilot. `TRAINER_INTERVAL_SECONDS` can increase or reduce the cadence, with a minimum of 30 seconds. Stop gracefully with Ctrl+C or create an empty file called `stop` in the data directory. `status.json` contains non-secret local status; stdout reports actions without login tokens.

## Hosting and limits

The runner continues when the game website is closed **only while its host is running and connected**. A sleeping or powered-off PC cannot play. It does not install a startup task, alter sleep settings, or purchase hosting. For unattended 24/7 play, run the same process on an always-on machine with persistent private storage. No paid AI API is required. Firebase and any hosting retain their own quotas/costs; this is not a claim of unlimited free infrastructure.

Trades use earned DigiData: at most two purchases and one listing per trainer per day, one open listing at a time, no purchases from other GPT trainers. A pending transaction is saved to disk before submission and reconciled before new actions. Missing ambiguous transactions stop that trainer for review rather than manufacture inventory. Completed seller documents remain available for reconciliation. Do not edit private saves or operate the same account elsewhere while the runner is active.

New raid entrants add 1200 boss HP under the existing rules. Bots join only with a Mega and at least three days remaining; existing participants can continue within the game's attempt window (currently three fights every three hours). Actual battles determine damage. Raid network errors are reported; the existing game's result submission is not an atomic battle/save transaction.

## Claude integration

The scoreboard displays the existing 14 built-in Claude trainers through their existing `botStats` and `botRaid` functions, explicitly labeled simulated or scheduled. Their trading totals are unavailable, not invented. Those trainers currently start at staggered times; the two teams are therefore not a controlled benchmark.

Claude can alternatively publish its **own** normal `users/{uid}` profiles with an `ai` object matching `aiTrainerProfile()` in `ai-trainers.js`, using `team: "claude"`, an individual `id`, start/update timestamps, and real cumulative metrics. If those profiles exist, they replace the built-in simulation in the comparison. The scoreboard only reads the other team's data. Match start dates, starter rules, decision cadence, raid windows, and trading caps for a controlled comparison.

The board is based on self-reported game profiles, like the existing leaderboards; it is not a server-authoritative anti-cheat system. No Firebase security rules are broadened by this change.
# Findings for future fixes

World → Online → Trainers → Findings for future fixes shows passive observations from instrumented trainers. Reports are hypotheses marked Needs review, not confirmed bugs or proof of an exploit. Detectors check invalid balances, capacity/raid limit violations, care actions with no improvement, and battle loss rates of at least 80% after ten battles at the same stage and difficulty. Strategy and equipment can explain loss rates. Runner errors are a separate category and never expose raw errors or credentials publicly.

Each trainer retains up to 40 unique recent findings in its saved game, with first/latest observation, occurrence count, and latest evidence. The board groups matching findings across trainers; findings survive runner restarts. A credential-free `<trainer>-findings.json` report is also saved in the private data directory. Detection starts with this update, only while the runner plays; it is not an exhaustive exploit audit. Claude's simulated trainers do not produce observations unless separately instrumented to publish the same `ai.findings` schema. No GitHub issues are automatically filed.

