# ME 3310 Interactive Explorers

Interactive web visualizations for **ME 3310 — Experimental Methods I**.

The repository is designed as one static Netlify site with multiple focused explorer pages. Each explorer can be embedded independently in Canvas using a stable Netlify URL.

## Current structure

```text
me3310-interactive/
├── index.html
├── netlify.toml
├── repeated-measurements/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── confidence-interval/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Explorer 01 — Repeated Measurements & Law of Large Numbers

Focuses on one conceptual question: **What becomes more stable as measurements are repeated—the individual measurements or our estimate of the mean?**

Students can use a fair-die example or a hypothetical road-test MPG example, add repeated measurements, view a histogram of individual observations, and watch the running sample mean stabilize.

## Explorer 02 — Confidence Interval & t-Distribution

Supports the statistical tools needed for Lab 01. Students can vary sample size, sample mean, and sample standard deviation and observe the resulting standard error and 95% t-confidence interval. An optional comparison shows the corresponding z-interval under the hypothetical assumption that the population standard deviation is known.

## Netlify

The production site is connected to the `main` branch and published as a static site. Commits to `main` automatically redeploy.

Current URLs:

```text
https://me3310-interactive.netlify.app/
https://me3310-interactive.netlify.app/repeated-measurements/
https://me3310-interactive.netlify.app/confidence-interval/
```

Each explorer URL can be embedded directly in Canvas using an iframe.
