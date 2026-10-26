# Every light is green

A plain-language, interactive explainer about how AI safety checks can keep showing green while the safety behind them wears away, without anyone lying, cheating or being careless.

Live site: https://prototypeversions.github.io/RSI2/

It is written for people with no background in AI. It takes about 20 minutes and walks through ten short parts:

1. AI is starting to help build AI
2. An alarm that never makes a mistake (and how a whole company misses the same thing)
3. You pick the winner (a game where choosing the best score quietly wears down safety)
4. The test-taker who knows it's a test
5. One reasonable step at a time (approve a series of sensible rule changes)
6. When it knows more than we do (checking an answer versus trusting whoever gave it)
7. Moving the goalposts
8. Can we still say stop?
9. Back to the dashboard
10. What would actually help, and what it costs

All numbers in the interactive parts are made up to show the shape of each problem. They are not predictions.

Based on the book *No Assurance for Free: Evaluation, Trust, and the Limits of Self-Improving AI*. A more detailed, chapter-by-chapter companion is at https://prototypeversions.github.io/RSI/.

## How it is built

One page of plain HTML, CSS and JavaScript, with no build step: `index.html`, `style.css`, `app.js`. To preview locally:

```
python3 -m http.server 8000
```

then open http://localhost:8000.
