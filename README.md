# ⚙ mlog Forge

A **free** Mindustry logic (mlog) code generator. Pick a goal, tweak a few options, copy
ready-to-paste processor code — no programming required. Built for players, not programmers.

![tests](https://img.shields.io/badge/tests-70%20passing-84f491) ![license](https://img.shields.io/badge/free-forever-ffd37f)

## What's inside

- **Describe It** — type what you want in plain words ("make my monos mine titanium",
  "turn off the reactor when cryofluid gets low") and get ready-to-paste code, a
  step-by-step setup guide, and a plain-language explanation of every part. The parser
  runs entirely in your browser — no AI service, no account, no cost. Tap the amber
  chips to correct anything it misread.
- **Template wizard** — 10 battle-tested templates (unit mining, turret ammo courier,
  reactor safety cutoff, enemy alarm, automatic gates, power saver, wave countdown,
  item flow control, resource monitors, display status bars). Fill in a friendly form,
  get correct mlog with explanatory comments.
- **Visual node editor** — see any wizard template as a node graph and learn how the
  logic works; build your own programs by wiring high-level blocks (the null checks,
  `printflush` and the unit-flag idiom are built into the nodes).
- **Validator** — paste any mlog and get friendly errors before you waste an in-game trip:
  unknown instructions, wrong argument counts, bad jump targets, missing flushes, more.
- **Display preview** — an approximate simulator that renders `draw` code on a virtual
  80×80 / 176×176 logic display, with frames per `drawflush` and an animate mode.
- **Reference** — searchable documentation for every instruction, operation, built-in
  variable and sensor property, plus processor stats.

## Run it locally (free, no backend)

```bash
npm install
npm run dev      # → http://localhost:5173
```

Static build (optional — host anywhere or open from disk):

```bash
npm run build    # outputs dist/ — relative paths, works from any static host
npm run preview  # serve the build locally
```

## Using the generated code in Mindustry

1. Click **copy code** in the wizard.
2. In game, place a processor (Micro/Logic/Hyper) and open its editor (pencil icon).
3. Choose **Import from clipboard**. Done.

If an older game version complains about comment lines, use **copy w/o comments** —
the jump targets are identical either way (the generator counts real instructions only).

## Tests

```bash
npm test
```

70 tests cover the emitter (label→numeric jump resolution, comment-safe indexing),
the validator rules, the graph compiler (branch lowering, cycle/dangling detection),
the display VM, and a regression net that requires every template's output to validate
with zero errors or warnings.

## Project layout

```
src/mlog/       engine: spec data, IR, emitter, tokenizer, validator, preview VM
src/graph/      node vocabulary + graph→IR compiler + auto-layout
src/templates/  the wizard templates (graph-based where possible) + explanations
src/nl/         plain-English parser: lexicon, slot extraction, intents, corpus
src/pages/      describe, gallery, wizard, editor, validator, reference, display
src/components/ code pane, param form, chips, lints, display canvas, flow nodes
```

The instruction spec in `src/mlog/spec/` is plain typed data verified against the
[Anuken/Mindustry](https://github.com/Anuken/Mindustry) source (`LStatements.java`,
`LogicOp.java`, `LAccess.java`) — it drives the validator, the reference page, the node
parameter dropdowns and the wizard forms from a single source of truth.

## License

Free to use, copy, and modify, forever.
