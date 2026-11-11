import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** The follow-up to the language-model primer: what happens inside the model, as animated explainers. */
export const aiLessonsD: ConceptLesson[] = [
  // ─────────────────────────────── 0b. Inside a language model ───────────────────────────────
  {
    id: "fnd-ai-0b-inside",
    title: "Inside a language model",
    summary: "Watch a model work: words become numbers, layers mix them, training nudges them and one word is picked at a time.",
    minutes: 8,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "The whole machine in four scenes",
        body: P(
          "The primer said a language model *continues text*. Here is how, in four short scenes. Press **Play**, or step through with the arrows, and read the caption under each picture.",
          "Real models have billions of numbers inside, so this is a toy at toy scale. The moves are the real ones.",
        ),
        widget: { type: "ex-llm", props: {} },
      },
      {
        kind: "explain",
        title: "Words become numbers",
        body: P(
          "A computer cannot do anything with the letters in *cat*, so the first job is to turn each token into a **vector**: a short list of numbers. This list is called an **embedding**, and the next lesson goes much deeper into it.",
          "The numbers are not picked by hand. They are learned, so that words used in similar ways get similar numbers. Watch the words settle on the map.",
        ),
        widget: { type: "ex-llm", props: { scenes: ["embeddings"] } },
      },
      {
        kind: "question",
        title: "Who sits together?",
        body: "On the meaning map, “kitten” lands right next to “cat”. Why do those two end up close together?",
        question: {
          type: "choice",
          options: [
            "They share most of their letters",
            "Someone sorted the words into groups by hand",
            "They are used in similar ways, so the model gave them similar numbers",
            "The model looked them up in a dictionary",
          ],
          answer: 2,
          feedback: {
            0: "“Cat” and “car” share letters too, yet they land far apart. Closeness comes from how a word is used, not how it is spelled.",
            1: "Nobody sorts them. The numbers are learned from huge amounts of text during training.",
            3: "A model has no dictionary to consult. Its sense of a word comes entirely from patterns in the text it was trained on.",
          },
          hint: "Think about what the words around “cat” and “kitten” tend to be in real sentences.",
        },
        explanation: "Words that appear in similar sentences (*the kitten purred*, *the cat purred*) get similar vectors, so they sit close together on the map. That is also why “car” and “cat” are far apart even though they look alike: they are used nothing alike.",
      },
      {
        kind: "explain",
        title: "Layers and attention",
        body: P(
          "Meaning depends on the other words. In *“The cat sat on the …”*, the word *sat* needs to know **who** sat and **where**. The model handles this with a stack of **layers**.",
          "In every layer each word may **look at the other words** and pull in what is useful. That looking is called **attention**. Thicker line means more attention. After each layer the vectors change (the colour shifts), now carrying a little more of the sentence.",
        ),
        widget: { type: "ex-llm", props: { scenes: ["transformer"] } },
      },
      {
        kind: "question",
        title: "What is attention for?",
        body: "In the animation, “sat” sends the thickest line to “cat”. What is attention doing there?",
        question: {
          type: "choice",
          options: [
            "Letting “sat” pull in information from the words that matter most to it, like who did the sitting",
            "Deleting the words that are not needed",
            "Checking each word for spelling mistakes",
            "Counting how many words the sentence has",
          ],
          answer: 0,
          feedback: {
            1: "Nothing is deleted. Every word stays; attention only decides how much each one is mixed into the others.",
            2: "Spelling is not the point. Attention is about meaning: which other words help to understand this one.",
            3: "Counting is not what the lines do. Their thickness says how much one word draws on another.",
          },
          hint: "The thickness of a line says how strongly one word draws on another word.",
        },
        explanation: "Attention is a **weighted mix**: “sat” borrows a lot from “cat” (who sat) and a little from “The”. That is how a word’s vector becomes aware of its context, and it is the trick that made modern language models work so well.",
      },
      {
        kind: "explain",
        title: "Where the numbers come from: training",
        body: P(
          "At the start the model’s numbers (its **weights**) are random, and its guesses are nonsense. **Training** fixes that with one small loop, repeated an enormous number of times:",
          "1. **Predict** the next word of a real text.\n2. **Compare** with the word that actually came next.\n3. **Nudge** the weights a tiny bit so that guess would have been better.",
          "The score for how wrong the guesses are is the **loss**. Watch it fall.",
        ),
        widget: { type: "ex-llm", props: { scenes: ["training"] } },
      },
      {
        kind: "question",
        title: "Reading the loss curve",
        body: "The loss curve falls steeply, then flattens out. What does a lower loss mean?",
        question: {
          type: "choice",
          options: [
            "The model is running faster",
            "The model has memorised the dictionary",
            "The model is getting more random",
            "The model’s guesses at the real next word are getting closer to right",
          ],
          answer: 3,
          feedback: {
            0: "Loss is not about speed. It measures how wrong the predictions are, not how quickly they are made.",
            1: "It is not about a dictionary. Loss is the average error of its next-word guesses on the training text.",
            2: "The opposite: as the loss falls, the model’s guesses become less random and more accurate.",
          },
          hint: "Loss is a score for how wrong the guesses are, so think about what a smaller score means.",
        },
        explanation: "Loss is the model’s **error score**, so lower is better. It falls fast early on, when there is a lot to learn, then flattens: the easy gains are used up and each further improvement costs far more training. The wobble is real too, because each step only sees a small batch of text.",
      },
      {
        kind: "explain",
        title: "One word at a time",
        body: P(
          "A trained model does one thing: given the text so far, it scores **every possible next token**, and the scores become probabilities. One is picked and added to the text. Then the whole process runs again.",
          "That loop, repeated, is how a whole answer gets written.",
        ),
        widget: { type: "ex-llm", props: { scenes: ["next-token"] } },
      },
      {
        kind: "question",
        title: "Why is it not always “mat”?",
        body: "“mat” has the highest probability, yet the same prompt can end with a different word on another run. What controls that, from the primer?",
        question: {
          type: "choice",
          options: [
            "The context window getting full",
            "Temperature: a higher setting sometimes picks a less likely word such as “floor”",
            "The number of layers changing between runs",
            "The model forgetting what it learned",
          ],
          answer: 1,
          feedback: {
            0: "The context window limits how much text the model can see. It does not make the choice of the next word vary.",
            2: "The layers are fixed once training is over. The variation comes after them, in how the pick is made.",
            3: "The weights do not change when you chat. What changes is how adventurous the pick from the probabilities is.",
          },
          hint: "Which dial from the primer makes the same prompt give different answers?",
        },
        explanation: "At **temperature 0** the model always takes the top word, “mat”. At a **higher temperature** it sometimes takes “floor” or “sofa”, in proportion to their chances, so the same prompt can go different ways. Each pick also changes every word that follows, which is why one early difference can lead to a very different answer.",
      },
      {
        kind: "recap",
        points: [
          "Tokens become **vectors**; words used in similar ways get nearby numbers.",
          "**Layers** let every word draw on the others through **attention**, so each vector carries its context.",
          "**Training** is a loop: predict, compare with the real next word, nudge the weights. The **loss** falling means the guesses are improving.",
          "The finished model scores every candidate next token, **picks one** (temperature sets how adventurous), adds it and repeats.",
        ],
      },
    ],
  },
];
