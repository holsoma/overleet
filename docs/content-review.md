# Question-bank reviews

## Full repository coverage: 16 October 2026

This revision contains 320 questions: 114 ML Theory, 96 Statistics, 45 A/B Testing, 42 LLMs, 13 Python and 10 SQL/database questions. CV/resume prompts are excluded as requested. Computer-vision theory is included. The [coverage table](repository-coverage.md) accounts for every collected heading, combines repeated prompts and records exclusions.

Following the earlier five additions in this PR, the author added 65 original questions and expanded six existing answers: `nonlinear-activation`, `autoencoder-reconstruction-representation`, `mini-batch-gradient-noise`, `boosting-shrinkage-depth`, `exponential-memorylessness` and `prediction-versus-mean-interval`. The other 249 records from the 255-question revision are unchanged. No IDs were removed. Several source prompts share one original question where they test the same concept.

An independent critic accepted all additions and revisions after mathematical, source, code and duplication checks. Corrections included the chord-sampling law, full CNN pipeline, gradient-descent variants, code edge cases and more precise primary references. Eight standard-library Python examples ran successfully; the maximum-product algorithm was also compared exhaustively with brute force over small inputs. Pandas examples and NumPy sampling checks passed. All nine SQL examples ran against temporary PostgreSQL tables with rolled-back transactions. Matplotlib rendering was not executed because the local runtime lacks the package; its documented API usage was checked.

The additive migration enables Python and SQL/database categories. Local synchronisation created 65 records across the two accepted batches, updated the six reviewed answers and left 249 unchanged. Repeated synchronisation changed nothing. Both existing Daily Question assignments were preserved. The local database has no account records; preservation of populated progress and votes was verified by disposable PostgreSQL integration tests. Production remains at 250 until maintainer review and an authorised release.

The candidate ledger records 76 drafted, 64 covered and no dismissed entry. This includes the earlier five drafted additions. A fresh live collection across the six reviewed documents must skip these recorded entries. Agent acceptance and passing checks do not replace the maintainer's review before merging.

## Repository collector batch: 15 October 2026

Five original additions bring this revision to 255 questions. All 250 previously published records are unchanged. Production remains at 250 until human review, merge and a separate production synchronisation.

| Question ID | Reviewed learning objective |
|---|---|
| `mini-batch-gradient-noise` | Gradient variance under independent sampling and finite-population limits |
| `active-learning-uncertainty-budget` | Label selection under a fixed annotation budget |
| `autoencoder-reconstruction-representation` | Reconstruction quality versus downstream usefulness |
| `depthwise-separable-convolution-cost` | Parameter counts, computation and factorisation limits |
| `uniform-endpoint-maximum-bias` | Maximum likelihood, unbiased estimation and mean squared error |

A source scout selected gaps from the upstream repository. A separate author wrote original scenarios, explanations and four rubric checkpoints per question. A separate critic checked mathematics, primary references, originality and overlap with the existing bank. The only requested correction was the Rossman, Short and Parks reference title, which was resolved before acceptance. Candidate records link to the resulting question IDs and remain available for deduplication. This agent review does not replace human approval before publication.

Live retrieval recognised 114 question headings across the four reviewed Markdown documents. The normal collector added ten candidates; interactive scouting added four more records to cover the selected topics. Five are marked drafted and nine await review. These are previously unseen entries, not evidence of recent upstream publication.

Validation passed for all 255 questions, source metadata, actual KaTeX rendering and candidate review links. Local synchronisation created five records and updated none; a second run changed nothing. Both existing Daily Question assignments were preserved. The local database had no user, progress or vote records; preservation of populated records is covered separately by PostgreSQL integration tests.

## Initial expansion to 250 questions

Reviewed on 15 October 2026. This expansion adds 225 original questions and retains all 25 published questions without changing their IDs or content. No questions were retired.

| Category | Easy | Medium | Hard | Total |
|---|---:|---:|---:|---:|
| ML Theory | 27 | 36 | 22 | 85 |
| Statistics | 24 | 37 | 19 | 80 |
| A/B Testing | 11 | 20 | 14 | 45 |
| LLMs | 10 | 21 | 9 | 40 |
| Total | 72 | 114 | 64 | 250 |

The source scout used the two requested interview collections to identify topic gaps. The author wrote new wording, examples and answers supported by primary references. No company provenance or interview frequency is claimed. The reuse boundaries are recorded in [ATTRIBUTION.md](../ATTRIBUTION.md) and each question's source metadata.

A separate critic read every added question, explanation, assumption, common mistake and rubric. The author resolved findings, and the critic checked the corrections. These included tree interpolation under feature transformations, quantile minimisers, independence assumptions in information and cluster-variance calculations, fitted-distribution goodness-of-fit tests, partial correlation, sequential testing and Bayesian stopping. The LLM review checked attention, memory calculations, decoding distributions, preference optimisation, retrieval and evaluation claims. No substantive findings remained at acceptance.

This was an agent-assisted content review. It does not replace the human review required before merging a question-content pull request.

Validation confirmed 250 active, unique IDs, unique titles, valid source metadata and actual Markdown/KaTeX rendering. All original records were compared against commit `3179e3c` and matched exactly after JSON parsing.

The local database synchronisation created 225 questions, updated none and retained the existing Daily Question assignment. A second synchronisation created and updated nothing. User, progress, vote and Daily Question records were compared before and after synchronisation; none changed. The local database had no account records, so preservation of non-empty progress and votes was additionally checked in the disposable PostgreSQL integration tests.
