# inbox — drop new story requests here

This is the entry point. Write or paste a brief as a markdown file in this
folder and tell me to produce it. Any filename is fine — spaces, quotes and
long titles are OK **here**, because the intake step renames everything.

```
inbox/
  my next video idea.md      ← just drop it
  README.md                  (this file, ignored by intake)
```

## What happens next

When I pick it up, or when you run:

```bash
python3 scripts/social/productions.py --intake
```

each brief in this folder is:

1. assigned the next production number
2. moved to `productions/NNNN-slug/00-REQUEST.md`
3. registered in `productions/registry.json`
4. added to `productions/INDEX.md`

The inbox goes back to empty. **An empty inbox means nothing is waiting.**

## This is not where inputs go

| You have                                                          | Put it                       |
| ----------------------------------------------------------------- | ---------------------------- |
| A story/brief to produce                                          | **here** (`inbox/`)          |
| Brand assets reused everywhere — logo, character reference photos | `suppliedMedia/`             |
| A supplied video/photo for one specific job                       | `productions/NNNN-*/source/` |
| A reference doc or plan, not a thing to produce                   | `library/`                   |
