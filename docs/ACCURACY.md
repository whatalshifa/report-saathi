# The accuracy test

ReportSaathi is only useful if it reads reports correctly. This test measures that on real lab reports,
against answers a person checked by hand. Results are published in [RESULTS.md](RESULTS.md) and on the
website's "How accurate is it?" page.

## What is measured

For every value printed on a report:

| Measure | Question it answers |
|---|---|
| Values found | Of the values on the paper, how many did ReportSaathi read at all? |
| Values invented | Of the values it reported, how many aren't on the paper? |
| Number read right | Is `11.2` read as `11.2`, not `11.7`? (`2,50,000` and `250000` count as the same) |
| Unit read right | `g/dL`, not `mg/dL`? (spelling variants like `gm/dl` count as the same) |
| Flag right | Is it marked low, high or normal the same way a careful person would? |

Plus, per report: is the lab name right, and is the date right. Everything is split into PDFs and phone
photos, because photos are harder.

"Flag right" tests the whole pipeline: Claude reading the value and range, then our code comparing them.

## Running it

You need `ANTHROPIC_API_KEY` set, and the reports themselves. Aim for 50, from several labs, with at
least 20 phone photos (some at an angle, some in poor light).

```bash
cd backend
mkdir -p accuracy/data          # git-ignored: real reports never go in the repository
# copy the report files into accuracy/data/

python -m accuracy.run draft accuracy/data
```

`draft` reads each report once and writes `<file>.label.json` next to it, so you don't have to type
every value from scratch. **Then check every draft against the paper**, value by value:

- fix any wrong number, unit or flag, add values it missed, delete values it invented,
- the flag is what *you* decide by comparing the value with the range printed on the report:
  `low`, `high`, `normal`, `abnormal` (a word like "Positive" where "Negative" is expected) or
  `unknown` (no range printed),
- set `"reviewed": true` when the file is done.

Checking against the paper matters: a draft accepted without checking would only measure itself.

```bash
python -m accuracy.run score accuracy/data
```

`score` reads every reviewed report **again from scratch**, compares with the answer keys, and writes:

- `backend/accuracy/results.json` and `frontend/src/data/accuracy.json` (the website's results page),
- `docs/RESULTS.md`.

These contain only totals and test names (like "TSH missed 2 times"), never a name, a value or a
report. The fresh readings are saved under `accuracy/data/runs/`, and
`python -m accuracy.run score accuracy/data --reuse <run folder>` re-scores one without calling Claude.

## Privacy

Use reports from people who agreed to it. Everything stays on your computer except the call to Claude
that reads each report, the same call the app makes.
