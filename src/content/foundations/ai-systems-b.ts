import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (formulas, tables). */
const txt = (code: string) => "~~~text\n" + code.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

const FAILURE_ITEMS = [
  { id: "never", text: "The right paragraph never reached the prompt" },
  { id: "rank", text: "The needed passage was ranked 14th and cut off by k = 5" },
  { id: "claim", text: "The answer states a 45-day window that no retrieved passage mentions" },
  { id: "price", text: "Asked about a price that is not in the handbook, the bot quoted one anyway" },
  { id: "hours", text: "The answer quotes last year’s opening hours" },
  { id: "rebuilt", text: "A policy page changed on Monday; the index was last rebuilt in June" },
];
const FAILURE_ANSWER = { never: "retrieval", rank: "retrieval", claim: "faithfulness", price: "faithfulness", hours: "freshness", rebuilt: "freshness" };

/** Lessons 5 to 7 of "Shipping AI features": RAG, hybrid search and reranking, evaluation. */
export const aiLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. RAG from question to answer ───────────────────────────────
  {
    id: "fnd-ai-5-rag",
    title: "RAG from question to answer",
    summary: "Give a language model the right passages to read. Embed, retrieve, assemble, answer, and how chunking decides what can be found.",
    minutes: 10,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "A model that has never read your handbook",
        body: P(
          "A language model knows a great deal about the public world up to the day it was trained. It has never read **your** library’s rules, your clinic’s opening hours or last week’s policy change.",
          "**Retrieval-augmented generation (RAG)** is the fix: before asking the model, **look up** the relevant passages in your own documents and put them in the prompt. The model then answers from text in front of it, and can point at where it came from.",
          "Step through it for a school library assistant. Then flip *Model alone* to see what happens without retrieval.",
        ),
        widget: { type: "ai-rag", props: {} },
      },
      {
        kind: "question",
        title: "Do it properly",
        body: "Run the pipeline **with retrieval** and **3 passages**, all the way to the answer.",
        widget: { type: "ai-rag", props: { k: 3 } },
        question: { type: "widget", goal: { retrieval: true, k: 3, finished: true, outcome: "complete" } },
        explanation: "Two of the three passages mattered: *Renewals* (the rule and its exception) and *Reservations* (what happens next). The third, *Loans*, is harmless extra context. The answer cites its sources, so a student or a librarian can check it.",
      },
      {
        kind: "question",
        title: "Confident and wrong",
        body: "Without retrieval, the model said reserved books can be renewed three times. Why did it answer at all, instead of saying it did not know?",
        question: {
          type: "choice",
          options: [
            "It continues text plausibly; with no passage to go on, a plausible rule beats an honest gap",
            "It looked the rule up in the library’s database and the database was wrong",
            "It is designed to lie when it is unsure",
            "It could not read the question",
          ],
          answer: 0,
        },
        explanation: "A language model produces the **most plausible continuation**, not a verified lookup. Most libraries do allow renewals, so that is the plausible shape of an answer. Retrieval, plus a rule to answer **only from the passages**, turns “plausible” into “supported”.",
      },
      {
        kind: "explain",
        title: "The unit of retrieval is a chunk",
        body: P(
          "You cannot embed a whole handbook as one vector; its meaning would be a blur of everything in it. You cut it into **chunks**, embed each one, and retrieve chunks.",
          "How you cut decides what can be found. **Too small** and a chunk loses the context that makes it make sense. **Too large** and one vector averages several topics, so it matches none of them well and fills the prompt with noise.",
          "Below, a bike shop’s handbook is cut into fixed windows of words. The retrieved chunk is the one that shares most words with the question (a stand-in for a real retriever). **Underlined** words are the answer. Is the answer in one piece?",
        ),
        widget: { type: "ai-chunker", props: { modes: ["fixed"], size: 20, overlap: 0, question: "q2", lockSize: true } },
      },
      {
        kind: "question",
        title: "Overlap rescues a cut",
        body: "Question 2 needs two neighbouring sentences, and a hard cut at 20 words splits them. Without changing the size, use **overlap** so that the retrieved chunk holds the whole answer.",
        widget: { type: "ai-chunker", props: { modes: ["fixed"], size: 20, overlap: 0, question: "q2", lockSize: true } },
        question: { type: "widget", goal: { mode: "fixed", question: "q2", size: 20, intact: true } },
        explanation: "With 5 words of overlap, each chunk repeats the end of the one before, so the boundary no longer slices the answer. Try 10 as well: more overlap is **not** automatically better. It makes more chunks and shifts the boundaries to somewhere else that can cut a different answer.",
      },
      {
        kind: "explain",
        title: "Cut where the text breaks",
        body: P(
          "Fixed windows are blind to meaning. Better chunkers cut at **natural boundaries**: sentences, paragraphs, headings. A chunk that is a few whole sentences, or one short section, reads like something a person wrote.",
          "Good chunks also carry **metadata**: the document and section they came from, a date or version, the language, the tenant, who may see it. Metadata powers filters (last lesson), citations (“from *Returns*, updated March”), and tells you which chunks to refresh when a page changes.",
          "Try the three modes. *By section* keeps each heading with its text and never crosses into the next topic.",
        ),
        widget: { type: "ai-chunker", props: { size: 30, overlap: 0, question: "q1" } },
      },
      {
        kind: "question",
        title: "Keep the sentences whole",
        body: "Question 1 needs the refund rule *and* its exception, which are two whole sentences (34 words). Use **whole sentences** and find a size of **40 or less** that keeps the answer together.",
        widget: { type: "ai-chunker", props: { modes: ["sentence"], size: 20, overlap: 0, question: "q1" } },
        question: { type: "widget", goal: { mode: "sentence", question: "q1", intact: true, maxSize: 40 } },
        explanation: "A size of 35 is the smallest that fits both sentences. Sentence-aware chunking never cuts a sentence in half, but it can still separate two *neighbouring* sentences, so the size still matters. Bigger is not free: notice how long the retrieved chunk gets.",
      },
      {
        kind: "code",
        title: "Write a chunker",
        body: P(
          "Write `chunk_words(text, size, overlap)`. Split the text into words, then return chunks of `size` words, where each chunk starts `size - overlap` words after the previous one. Stop as soon as a chunk reaches the end of the text. Join each chunk’s words with spaces.",
          "If `overlap >= size` the window would never move: raise `ValueError`.",
        ),
        language: "python",
        starter: "def chunk_words(text, size, overlap):\n    # words = text.split(); each chunk starts size - overlap words after the last\n    return [text]\n",
        solution:
          "def chunk_words(text, size, overlap):\n    if overlap >= size:\n        raise ValueError(\"overlap must be smaller than size\")\n    words = text.split()\n    step = size - overlap\n    chunks = []\n    for start in range(0, len(words), step):\n        chunks.append(\" \".join(words[start:start + size]))\n        if start + size >= len(words):\n            break\n    return chunks\n",
        tests: [
          { id: "overlap", description: "overlap repeats the boundary words", assertionCode: `assert chunk_words("a b c d e f g h", 4, 1) == ["a b c d", "d e f g", "g h"], f"got {chunk_words('a b c d e f g h', 4, 1)}"` },
          { id: "disjoint", description: "no overlap gives separate chunks", assertionCode: `assert chunk_words("a b c d e f g", 3, 0) == ["a b c", "d e f", "g"], f"got {chunk_words('a b c d e f g', 3, 0)}"` },
          { id: "short", description: "a short text is one chunk", assertionCode: `assert chunk_words("a b c d", 4, 1) == ["a b c d"], f"got {chunk_words('a b c d', 4, 1)}"` },
          {
            id: "bad",
            description: "overlap must be smaller than size",
            assertionCode: `try:\n    chunk_words("a b c", 2, 2)\n    raised = False\nexcept ValueError:\n    raised = True\nassert raised, "overlap >= size should raise ValueError"`,
          },
        ],
        hints: ["Loop with `for start in range(0, len(words), step)` and slice `words[start:start + size]`.", "After adding a chunk, `break` if `start + size >= len(words)` so you never emit a chunk made only of overlap."],
      },
      {
        kind: "question",
        title: "Diagnose it",
        body: P(
          "Users complain that the bot gets a rule right but always misses the *exception* that sits in the next paragraph. Retrieval does find the rule’s chunk. Which change is the best first move?",
        ),
        question: {
          type: "choice",
          options: [
            "Chunk by section or sentence group with some overlap so a rule and its exception stay together",
            "Switch to a bigger language model",
            "Lower the temperature so the model is less creative",
            "Retrieve k = 1 so there is less to read",
          ],
          answer: 0,
        },
        explanation: "The model can only use what is in the prompt. The exception was cut away from the rule at **indexing time**, long before any model ran. A bigger model cannot read a paragraph that was never retrieved. Fix the chunks, then check the fix on your regression questions (two lessons from now).",
      },
      {
        kind: "recap",
        points: [
          "**RAG** = embed the question, **retrieve** the nearest chunks, **assemble** a prompt, let the model **answer from them** and cite.",
          "Without retrieval the model produces a **plausible** answer, not a verified one.",
          "**Chunk size** is a trade-off: too small loses context, too large blurs topics and bloats the prompt.",
          "Cut at **natural boundaries**, use **overlap** with care, and attach **metadata** (source, section, date, tenant) to every chunk.",
          "Many “model” mistakes are really **indexing** mistakes made earlier.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Hybrid search and reranking ───────────────────────────────
  {
    id: "fnd-ai-6-hybrid",
    title: "Hybrid search and reranking",
    summary: "Keywords catch exact strings, vectors catch paraphrases. Combine them with rank fusion, then let a reranker read the top few.",
    minutes: 10,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Two kinds of eyes",
        body: P(
          "**Keyword search** (scoring methods like BM25) counts the exact words a document shares with the query and weighs rare words more. It is superb with **identifiers**: error codes, product numbers, names. It is blind to paraphrases.",
          "**Vector search** matches meaning. It handles “my bike loses power going uphill” finding an article about motors cutting out on hills. But embeddings blur precise strings: to a vector, **E-17** and **E-71** both mean “some error code”.",
          "A bike help desk has eight articles. Each has a keyword score and a meaning score for your query. Slide between *keywords only* and *meaning only* and watch where the article that really answers the question (the tick) lands. Try all three queries.",
        ),
        widget: { type: "ai-hybrid", props: { methods: ["weighted"], noRerank: true, query: "code" } },
      },
      {
        kind: "question",
        title: "A question with no shared words",
        body: "Pick **query 2** (*my bike loses power going uphill*). Slide until the answering article is **#1**.",
        widget: { type: "ai-hybrid", props: { methods: ["weighted"], noRerank: true } },
        question: { type: "widget", goal: { query: "paraphrase", goldRank: 1 } },
        explanation: "The right article shares **no words** with the question, so keywords score it zero and bury it at #7. Only the meaning half finds it. With any real weight on keywords, the near-miss articles that happen to share words (“bike”, “power”) float up instead.",
      },
      {
        kind: "question",
        title: "A code and a symptom",
        body: "**Query 3** has both an exact code (*E-71*) and a symptom (*only on hills*). With **Add scores**, find a mix where the answering article is #1.",
        widget: { type: "ai-hybrid", props: { methods: ["weighted"], noRerank: true, query: "mixed" } },
        question: { type: "widget", goal: { query: "mixed", method: "weighted", goldRank: 1 } },
        explanation: "Keywords alone prefer the *E-17* article (it shares “error”); meaning alone prefers the *hills* article. The right answer is **second** on both lists, so a mix puts it on top. That is the whole case for hybrid search: the two methods make *different* mistakes.",
      },
      {
        kind: "explain",
        title: "Mixing scores is awkward",
        body: P(
          "Adding the two scores has a catch: keyword scores can be 0 to 20 or more, cosine scores 0 to 1. You must **normalise** each list first, and the weights you pick depend on the shape of today’s scores.",
          "**Reciprocal rank fusion (RRF)** sidesteps the problem by ignoring scores and using only **ranks**. Each list gives a document `1 / (60 + rank)`, and you add up what each document earns:",
          txt(`
score(doc) = 1/(60 + rank in list A) + 1/(60 + rank in list B) + …
`),
          "The 60 is a conventional damping constant. It makes the first few ranks count most, without letting a single #1 dominate. A document that is near the top of **both** lists beats one that is first in one list and missing from the other.",
        ),
        widget: { type: "ai-hybrid", props: { methods: ["rrf"], noRerank: true, query: "mixed" } },
      },
      {
        kind: "question",
        title: "One fusion by hand",
        body: "A document is **#1** in the keyword list and **#3** in the vector list. With the constant 60, what is its RRF score? Give your answer ×1000, to one decimal place.",
        question: { type: "number", answer: 32.3, tolerance: 0.1 },
        explanation: "1/61 + 1/63 = 0.016393 + 0.015873 = 0.032266, which is **32.3** when multiplied by 1000. Compare a document that is #2 in both lists: 1/62 + 1/62 = 32.26 ×1000. The two come out almost identical: consistent mid-high placement is worth as much as one #1.",
      },
      {
        kind: "explain",
        title: "Let a reranker read the top few",
        body: P(
          "Both searches judge a document **without reading it next to the query**: the keyword score counts words, and the embedding was computed ahead of time. A **reranker** is a smaller model that takes the query and one candidate *together* and scores how well they fit. It is more accurate, and far slower.",
          "So you use it as a second stage: retrieve and fuse 20 to 50 candidates cheaply, then rerank only those and keep the best 3 to 5. Reranking a million documents would take forever; reranking a handful costs milliseconds.",
          "Switch **Rerank top 4** on and watch the order change; the small number is the reranker’s score.",
        ),
        widget: { type: "ai-hybrid", props: { methods: ["rrf"], query: "mixed" } },
      },
      {
        kind: "question",
        title: "Fuse, then rerank",
        body: "On **query 3**, using **Fuse ranks**, switch the reranker on so the answering article is **#1**.",
        widget: { type: "ai-hybrid", props: { methods: ["rrf"], query: "mixed" } },
        question: { type: "widget", goal: { query: "mixed", method: "rrf", rerank: true, goldRank: 1 } },
        explanation: "Rank fusion alone leaves the right article at #2, narrowly behind a near-miss. The reranker reads the query with each candidate and sees that *E-71 plus wheel sensor* is the better fit. Fusion decides **who gets into the room**; reranking decides **who sits at the head of the table**.",
      },
      {
        kind: "code",
        title: "Write rank fusion",
        body: P(
          "Write `rrf(rankings, k=60)`. `rankings` is a list of ranked lists of ids, best first. Return all ids ordered by their combined score, best first.",
          "Give each id `1 / (k + rank)` from every list it appears in (rank starts at 1) and add them up. Where two ids tie, keep the one seen first.",
        ),
        language: "python",
        starter: "def rrf(rankings, k=60):\n    # add 1 / (k + rank) for every list an id appears in\n    return []\n",
        solution:
          "def rrf(rankings, k=60):\n    scores = {}\n    for ranking in rankings:\n        for rank, doc in enumerate(ranking, start=1):\n            scores[doc] = scores.get(doc, 0) + 1 / (k + rank)\n    return sorted(scores, key=lambda d: scores[d], reverse=True)\n",
        tests: [
          { id: "agree", description: "two lists that disagree on the top two keep everything", assertionCode: `assert rrf([["a", "b", "c"], ["b", "a", "d"]]) == ["a", "b", "c", "d"], f"got {rrf([['a', 'b', 'c'], ['b', 'a', 'd']])}"` },
          { id: "consensus", description: "an id near the top of every list wins", assertionCode: `assert rrf([["x", "y"], ["y", "z"], ["y", "x"]])[0] == "y", "y is first or second everywhere"` },
          { id: "missing", description: "an id missing from one list still counts", assertionCode: `assert rrf([["a", "b"], ["c"]]) == ["a", "c", "b"], f"got {rrf([['a', 'b'], ['c']])}"` },
          { id: "k", description: "the damping constant k changes the order", assertionCode: `assert rrf([["p", "q"], ["r", "q"]]) == ["q", "p", "r"], f"got {rrf([['p', 'q'], ['r', 'q']])}"
assert rrf([["p", "q"], ["r", "q"]], k=0) == ["p", "q", "r"], f"k=0 gave {rrf([['p', 'q'], ['r', 'q']], k=0)}"` },
        ],
        hints: ["Keep a dict `scores`. For each list use `enumerate(ranking, start=1)` to get the rank.", "`sorted(scores, key=lambda d: scores[d], reverse=True)`; Python’s sort is stable, so ties keep the order they were first added."],
      },
      {
        kind: "question",
        title: "Order the pipeline",
        body: "Put the stages of a production search in a sensible order.",
        question: {
          type: "order",
          items: [
            "Apply hard filters: tenant, permissions, date range",
            "Run keyword search and vector search, each returning about 50 candidates",
            "Fuse the two ranked lists (for example with RRF)",
            "Rerank the top 20 to 50 with a cross-reading model",
            "Put the best 3 to 5 chunks into the prompt",
          ],
        },
        explanation: "Filters come first because they are rules, not suggestions. Cheap, broad retrieval comes before expensive, narrow reading. And the prompt gets only the **few** chunks that earned their place, because everything in it costs money and attention.",
      },
      {
        kind: "recap",
        points: [
          "**Keyword** search nails exact strings and rare words; **vector** search nails paraphrases. They make different mistakes.",
          "**Hybrid** search runs both and fuses the lists. Adding scores needs normalising; **RRF** fuses ranks instead: `1 / (60 + rank)` per list.",
          "A **reranker** reads query and candidate together: more accurate but slower, so it only sees the top 20 to 50.",
          "Order matters: **filter, retrieve (both), fuse, rerank, prompt**.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Evaluating RAG ───────────────────────────────
  {
    id: "fnd-ai-7-eval",
    title: "Evaluating RAG",
    summary: "Retrieval recall, faithfulness and freshness are different failures. Build a regression set so a change cannot quietly break an answer.",
    minutes: 9,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "“It looked fine in the demo”",
        body: P(
          "A RAG system can fail in three separate places, and a good-looking demo hides all of them:",
          "- **Retrieval**: the passage with the answer never reached the prompt.\n- **Faithfulness**: the answer says something the retrieved text does not support (the model filled a gap).\n- **Freshness**: the answer is faithful to a passage that is out of date.",
          "Each has a different fix, so you need to be able to tell them apart. That means **measuring them separately**, on a fixed set of questions, every time something changes.",
        ),
      },
      {
        kind: "question",
        title: "Which part broke?",
        body: "Tap a card, then tap the kind of failure it describes.",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "retrieval", label: "Retrieval", hint: "wrong or missing passage" },
              { id: "faithfulness", label: "Faithfulness", hint: "unsupported claim" },
              { id: "freshness", label: "Freshness", hint: "out of date" },
            ],
            items: FAILURE_ITEMS,
            answer: FAILURE_ANSWER,
          },
        },
        question: { type: "widget", goal: { placed: FAILURE_ANSWER } },
        explanation: "A passage that never arrived, or arrived too low to be kept, is **retrieval**. A claim with no support in the retrieved text is **faithfulness** (hallucination). An answer built from an old page is **freshness**, and the answer might be perfectly faithful to it. Different layers, different fixes.",
      },
      {
        kind: "explain",
        title: "A regression set",
        body: P(
          "A **regression set** is a fixed list of questions where you know what a good answer looks like. For each one, record the **gold source** (the chunk or page that holds the answer) and a short note of the facts that must appear. Run the whole set after every change.",
          "Below is one for a clinic’s booking assistant: eight questions run against four settings. Each question is scored on three things: was the right passage **found**, is the answer **supported**, is it **current**. Change the settings and watch the three bars.",
        ),
        widget: { type: "ai-eval", props: {} },
      },
      {
        kind: "question",
        title: "Hit the targets",
        body: "Set the four dials so that **retrieval recall is at least 85%**, **faithfulness is 100%** and **freshness is 100%**.",
        widget: { type: "ai-eval", props: {} },
        question: { type: "widget", goal: { minRecall: 0.85, minFaithful: 1, minFresh: 1 } },
        explanation: "**Hybrid** search finds the question with the product code; **rebuilding** the index fixes the two facts that changed; **Cite or decline** makes the model say “I don’t know” instead of inventing. Notice there is no setting that finds *everything*: small chunks split question 4’s answer, large chunks drown question 6’s tiny fact.",
      },
      {
        kind: "question",
        title: "Catch a regression",
        body: "Starting from the default settings, change **only the chunk size** to *Large*. A question that used to pass now fails. Find it.",
        widget: { type: "ai-eval", props: {} },
        question: { type: "widget", goal: { chunks: "large", minRegressions: 1 } },
        explanation: "Large chunks fixed question 4 (the cancellation answer now fits in one chunk) but broke question 6 (*Do you take card payments?* is one short fact buried inside a big chunk). The average barely moved. **Only a per-question set shows you what a change breaks.**",
      },
      {
        kind: "question",
        title: "Ship or not?",
        body: "After a retrieval change, overall accuracy rises from 78% to 83%. But one question about **medication allergies**, which used to pass, now fails. What do you do?",
        question: {
          type: "choice",
          options: [
            "Don’t ship yet: investigate that question first; some questions matter more than the average",
            "Ship: the average improved",
            "Delete the question from the set so the numbers look better",
            "Re-run until it passes",
          ],
          answer: 0,
        },
        explanation: "Averages hide the cases you cannot afford to lose. Mark the high-stakes questions, and gate releases on **no new failures there** as well as on the overall score. A flaky question that passes “sometimes” is a finding, not noise to re-roll away.",
      },
      {
        kind: "explain",
        title: "Measuring each one",
        body: P(
          "- **Retrieval**: cheap and exact. Does the gold chunk id appear in the top k? That is **recall@k**. Also look at the rank it landed on.\n- **Faithfulness**: harder. Sample answers and have people check each claim against the retrieved text, or use a second model as a judge that is asked to find unsupported claims. A judge is only trustworthy once you have compared it with human verdicts on the same answers.\n- **Freshness**: compare the version or date stored in the chunk’s metadata with the source of truth, and watch the age of your index.",
          "Include some questions the system **should refuse** (the answer is not in the documents), and add every bug that reaches a real user as a new case. Run the set automatically before each deploy, alongside latency and cost.",
        ),
      },
      {
        kind: "code",
        title: "Compute recall@k",
        body: P(
          "`results` maps each question to the ranked list of chunk ids retrieved for it. `gold` maps each question to the chunk id that holds the answer, or `None` when the question should be refused.",
          "Write `recall_at_k(results, gold, k)`: the fraction of answerable questions (gold is not `None`) whose gold id is in the first `k` results.",
        ),
        language: "python",
        starter: "def recall_at_k(results, gold, k):\n    # only questions with a gold id count; is it in the first k results?\n    return 0.0\n",
        solution:
          "def recall_at_k(results, gold, k):\n    answerable = [q for q, g in gold.items() if g is not None]\n    if not answerable:\n        return 0.0\n    hits = sum(1 for q in answerable if gold[q] in results[q][:k])\n    return hits / len(answerable)\n",
        tests: [
          {
            id: "k2",
            description: "counts only hits in the first k",
            assertionCode: `results = {"q1": ["a", "b", "c"], "q2": ["x", "y", "z"], "q3": ["m"]}\ngold = {"q1": "c", "q2": "x", "q3": None}\nassert recall_at_k(results, gold, 2) == 0.5, f"got {recall_at_k(results, gold, 2)}"`,
          },
          {
            id: "k3",
            description: "a larger k can only find more",
            assertionCode: `results = {"q1": ["a", "b", "c"], "q2": ["x", "y", "z"], "q3": ["m"]}\ngold = {"q1": "c", "q2": "x", "q3": None}\nassert recall_at_k(results, gold, 3) == 1.0, f"got {recall_at_k(results, gold, 3)}"`,
          },
          {
            id: "refuse",
            description: "unanswerable questions are ignored, not counted as misses",
            assertionCode: `assert recall_at_k({"q": ["a"]}, {"q": None}, 5) == 0.0\nassert recall_at_k({"q": ["a"], "r": ["b"]}, {"q": None, "r": "b"}, 1) == 1.0`,
          },
        ],
        hints: ["First collect the questions whose gold is not None.", "`hits = sum(1 for q in answerable if gold[q] in results[q][:k])`, then divide by `len(answerable)`."],
      },
      {
        kind: "question",
        title: "Read the number",
        body: "A regression set has **20** questions. **4** are unanswerable on purpose (the bot should decline). Of the other 16, the gold passage was in the top 3 for **12**. What is recall@3?",
        question: { type: "number", answer: 0.75, tolerance: 0.01 },
        explanation: "12 ÷ 16 = **0.75**. The four refusal questions test faithfulness (did the bot decline?), not retrieval, so they stay out of the recall denominator. Mixing them in would give 12 ÷ 20 = 0.6 and hide which part is actually weak.",
      },
      {
        kind: "recap",
        points: [
          "RAG fails in three places: **retrieval** (wrong passages), **faithfulness** (unsupported claims), **freshness** (stale sources). Measure them separately.",
          "A **regression set** is a fixed list of questions with gold sources, including questions the bot should **refuse**.",
          "Run it after every change to chunking, embeddings, search or prompts. **Per-question results** reveal regressions that averages hide.",
          "**Recall@k** is cheap to automate; faithfulness needs people or a judge that has itself been checked against people.",
          "Every real-world failure becomes a new test case.",
        ],
      },
    ],
  },
];
