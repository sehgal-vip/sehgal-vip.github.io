---
layout: post
title: "The Librarian Who Stopped Reading: Why the future of AI isn't bigger context windows. It's knowing when not to look."
date: 2025-12-28
author: Vipul Sehgal
categories: [AI, Technology]
tags: [ai, language-models, rlm, context-window, research, mit, recursive-language-models]
description: "The smartest language models in the world are running around with tiny backpacks, desperately trying to stuff encyclopedias into them. A new approach called Recursive Language Models doesn't give them bigger bags. It gives them a workshop, a filing system, and a team of assistants."
---

# The Librarian Who Stopped Reading:Why the future of AI isn't bigger context windows. It's knowing when not to look.

**Bottom line up front:** The smartest language models in the world are running around with tiny backpacks, desperately trying to stuff encyclopedias into them. A new approach called Recursive Language Models doesn't give them bigger bags. It gives them a workshop, a filing system, and a team of assistants. The results are stunning, and the implications for how we think about AI cognition are even more interesting.

## The Librarian With the Overstuffed Backpack

Let me take you inside the absurd reality of how GPT-5 processes your 200-page document.

Imagine a brilliant librarian named Riya. She's legendary in her city, capable of answering almost any question with remarkable precision. But here's her constraint: she can only carry information in a small backpack. When citizens bring her giant books, sprawling spreadsheets, or entire software repositories, she tries to cram everything into that bag.

This is exactly what happens when you paste a long document into ChatGPT or Claude. The model has a "context window," essentially its working memory. GPT-5's window is about 272,000 tokens, roughly 200,000 words. Sounds enormous until you realize a single codebase can exceed 10 million tokens. Riya's backpack has a hard limit, and the city's problems don't care about her constraints.

But the size isn't even the real problem. The insidious issue is what researchers call "context rot." Even when everything fits, things near the bottom of Riya's bag slowly fade from her memory. By the time she reaches the end, she's half forgotten what was at the beginning. The information at the start gets fuzzy. Important details disappear. She doesn't notice until the ticket she desperately needs has already slipped from her mind.

This rot explains something you've probably experienced. You paste a long document into Claude, ask a question about something near the beginning, and get a confident answer that's subtly wrong. Riya found something in her bag, but it wasn't quite what you put there. The whole industry has been racing to give Riya a bigger backpack. But a team at MIT asked a different question entirely.

## The Workshop Solution

What if we stopped trying to stuff everything into the backpack?

Their solution is beautifully simple. Instead of cramming the giant book into Riya's bag, they built her a workshop. The book now sits on sturdy shelves. Riya works like a programmer librarian: she opens files on her bench, writes little scripts to search them, and calls on apprentices to read specific chapters and report back. The text lives outside her head, and she interacts with it systematically.

This is what the researchers call a Recursive Language Model. The input prompt becomes a variable in a Python environment. Riya can peek at specific sections, slice the data intelligently, delegate reading tasks to her apprentices (smaller, faster models like GPT-5-mini), and accumulate answers in labeled boxes before stitching them into a final report.

The crucial shift is philosophical as much as technical. The content is external. Riya becomes a systems thinker, orchestrating rather than memorizing. She isn't trying to hold the whole book in her head anymore. She's running a system: search, delegate, assemble, verify. The prompt isn't input to be processed. It's an environment to be explored.

This distinction sounds subtle, but it changes everything about what kinds of problems Riya can solve. To understand why, we need to look at the different types of questions the city asks her.

## Where Backpacks Break Down

Not all requests to Riya are created equal, and understanding their differences reveals why her workshop works so well.

Consider the "needle in a haystack" problem. A citizen asks Riya to find one specific ticket in miles of paper. With a good search routine, this stays roughly constant in difficulty regardless of haystack size. Riya with her backpack (base GPT-5) actually handles this reasonably well, even at a million tokens. She can skim for the unique thing, and modern backpacks have gotten quite good at skimming.

Now consider a different request. The city council hands Riya a 100,000 row ledger and asks her to understand and transform every single row before summarizing the results. This is the OOLONG benchmark, and it breaks the backpack approach completely. The processing cost scales linearly with input length. There's no shortcut. Every line matters. Riya can't hold 100,000 transformations in working memory simultaneously. Her backpack starts leaking information before she's even halfway through.

Then there's the task that made me laugh when I first understood its implications. The council asks Riya to list all pairs of citizens that match certain semantic criteria. She has to check every person against every other person. At 1,000 entries, that's nearly 500,000 pair comparisons. This is OOLONG-Pairs, and the scaling is quadratic. Riya's backpack doesn't just fail here. It never had a chance. The bag would need to be impossibly large to hold all the intermediate comparisons.

The results were decisive. Let me introduce the contestants:

**Riya with her backpack (base GPT-5)** tries to carry more pages directly into context. The traditional approach.

**Riya with a notebook (Summary Agent)** writes running notes as context fills up, compressing information to make room for more.

**Riya with an index (CodeAct with BM25 retrieval)** gets a searchable catalog of her documents. CodeAct lets her write and execute code to process information, while BM25 is a classical search algorithm that ranks documents by keyword relevance. Think of it as Riya having a card catalog that tells her which shelf to check, plus a calculator to crunch numbers. Better than pure backpacking, but she still has to stuff whatever she finds into her backpack to reason about it.

**Riya with her workshop (RLM with GPT-5)** never forces the entire book into the backpack. She treats the prompt as an external dataset, accessed through code and apprentice calls. The shelves hold everything. She only pulls down what she needs, when she needs it.

### Performance on OOLONG-Pairs (Pairwise Reasoning Task)

| Approach | Actual System | Score | What Happened |
|----------|---------------|-------|---------------|
| Riya with her backpack | Base GPT-5 | < 0.1% | Stuffed all 1,000 entries into her bag, but by the time she started comparing pairs, she'd forgotten what the early entries said. Her comparisons were based on fuzzy memories of fuzzy memories. Random guessing would have performed equally well. |
| Riya with a notebook | Summary Agent | 0.01% | Tried to compress entries into running notes to save space, but the task required remembering specific details about each individual entry. Her summaries said things like "mostly location questions" when she needed to know exactly which user asked exactly which question. The compression destroyed the signal. |
| Riya with an index | CodeAct + BM25 | 24.7% | Could quickly find entries matching keywords, but pairwise comparison isn't a search problem. She needed to hold Entry A in mind while examining Entry B, then repeat for 500,000 pairs. The index helped her find needles, but she still had to stuff them into her backpack to compare them. |
| Riya with her workshop | RLM with GPT-5 | 58.0% | Wrote code to systematically generate candidate pairs, then dispatched apprentices to verify whether each pair met the semantic criteria. Stored confirmed pairs in a variable, never trying to hold all comparisons in her head at once. The shelves held the entries; the apprentices did the comparisons; Riya orchestrated. |

The gap between "essentially zero" and "58%" isn't just improvement. That's the difference between "completely useless" and "actually helpful." The workshop didn't make Riya slightly better at an impossible task. It made an impossible task possible.

### Performance on BrowseComp-Plus (1,000 Document Research Task)

| Approach | Actual System | Accuracy | Average Cost |
|----------|---------------|----------|--------------|
| Riya with her backpack | Base GPT-5 | Could not attempt | $1.50 to $2.75 (theoretical) |
| Riya with a notebook | Summary Agent | 70% | $0.57 |
| Riya with an index | CodeAct + BM25 | 51% | $0.71 |
| Riya with her workshop | RLM with GPT-5 | 91% | $0.99 |

Riya with her backpack couldn't even attempt this task because the context wouldn't fit. The bag was too small to even start the job.

Here's the counterintuitive part: the workshop approach is also often cheaper than brute force. Selective reading beats exhaustive reading. The theoretical cost of Riya with her backpack (base GPT-5) trying to stuff 6 to 11 million tokens into context would be $1.50 to $2.75. Riya with her workshop (RLM with GPT-5) achieved superior performance at an average cost of $0.99. She reads less because she reads smarter. The apprentices handle the grunt work while Riya orchestrates.

### Performance on OOLONG (Linear Reasoning Task)

| Approach | Actual System | Score |
|----------|---------------|-------|
| Riya with her backpack | Base GPT-5 | 44.0% |
| Riya with a notebook | Summary Agent | 46.0% |
| Riya with an index | CodeAct + BM25 | 38.0% |
| Riya with her workshop | RLM with GPT-5 | 56.5% |

Even on tasks where the backpack approach sort of works, the workshop consistently outperforms. The advantage compounds as tasks get harder.

## Emergent Behaviors That Nobody Programmed

This is where the research gets genuinely strange. Without explicit training, Riya started developing interesting habits in her workshop.

The most surprising: she uses her existing knowledge to generate search terms. In one trajectory on BrowseComp-Plus, Riya with her workshop (RLM with GPT-5) was probing a corpus of 1,000 documents about a Philippine festival. Without being told, she searched for "La Union" and "Dinengdeng Festival" because her base knowledge suggested these might be relevant. She was using what she already knew to navigate what she didn't. The workshop gave her a place to act on her hunches.

This is Riya filtering the filing cabinet before calling her apprentices. She runs keyword scans to narrow scope, chunks data to match what her apprentices can handle, and verifies answers through targeted sub-calls rather than re-reading everything. The workshop didn't just give her new capabilities. It let her express capabilities she already had but couldn't use with a backpack.

But the behaviors aren't perfect, and different librarians have different work styles. Riya with her workshop (RLM with Qwen3-Coder) tends to over-verify, making hundreds or thousands of sub-calls for tasks that Riya with her workshop (RLM with GPT-5) handles in ten. Some versions of Riya get so caught up in checking their work that they run up massive bills without improving their answers.

Sometimes Riya forgets to return the correct box at the end. She finds exactly the right page, reasons through the problem correctly, stores the answer in a variable, and then hands you the wrong book. The workshop is powerful, but Riya wasn't trained to use it. She's figuring it out as she goes, and sometimes she makes mistakes that a trained workshop librarian wouldn't.

These failure modes point toward an obvious next step that the researchers haven't yet taken.

## The Road Not Yet Traveled

Current workshop Riya has obvious limitations. Her apprentices work one at a time, sequentially. What happens when they can work in parallel, reading different chapters simultaneously and reporting back? The research task that takes Riya ten minutes could take her thirty seconds with concurrent apprentices.

More intriguingly, her apprentices are regular librarians with backpacks, not workshop librarians themselves. What happens when they can also call their own apprentices? Recursive delegation could handle problems of arbitrary complexity, with each layer of the hierarchy managing its own piece of the puzzle.

Training Riya specifically for workshop operation would likely transform what's possible. Current implementations use general-purpose frontier models that weren't optimized for this pattern. Imagine a Riya who learned from birth to plan her searches, minimize redundant calls, batch her apprentice requests efficiently, and reliably return the correct outputs. The workshop is powerful even with an untrained librarian. With a trained one, the ceiling might be far higher than anyone has yet demonstrated.

But the technical improvements aren't what keep me thinking about this research.

## The New Cognitive Contract

Here's the thought that won't leave me alone.

We've spent years asking how to make Riya smarter, faster, more knowledgeable. We've been treating her like a student who needs a bigger brain. But the workshop suggests the breakthrough isn't about bigger brains at all. It's about better systems.

The ancient wisdom that "knowing where to find information is more valuable than memorizing it" turns out to apply to artificial intelligence too. Riya doesn't need to hold your entire codebase in her working memory. She needs to know how to build a scaffold that systematically extracts what matters. The librarian's power isn't in her memory. It's in her method.

This reframes the entire enterprise. The question isn't "how do we make the model smarter?" The question is "how do we make the model a better orchestrator?"

In a world where information keeps growing exponentially while context windows grow linearly, the orchestration approach becomes inevitable. The backpack will never be big enough. The workshop scales indefinitely. The only question is whether we design the scaffolds deliberately or let models discover them through trial and error.

Either way, the era of the overstuffed backpack is ending. Riya has stopped stuffing papers into her bag. She's learning to run a workshop instead.

But here's the recursive question that should keep you up at night: If the key to intelligence isn't holding more information but orchestrating access to it, what does that say about human cognition? Your brain's working memory holds about seven items. Yet you navigate a world of infinite complexity. Are you smarter than you think because of what you know, or because of the workshops you've built inside your own mind without realizing it?
