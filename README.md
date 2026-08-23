# ME 3310 Interactive Explorers

Interactive web visualizations for **ME 3310 — Experimental Methods I**.

The repository is organized as one static Netlify site with independent explorer pages that can be embedded in Canvas using stable URLs.

## Current structure

```text
me3310-interactive/
├── index.html
├── netlify.toml
└── repeated-measurements/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Repeated Measurements → Confidence

The first explorer supports the Week 01 progression from random variation to inference:

1. Repeat a fair-die experiment or a hypothetical road-test MPG measurement.
2. Observe individual variability and the running sample mean.
3. Connect repeated measurement to the Law of Large Numbers.
4. Compute sample mean, sample standard deviation, and standard error.
5. Construct a 95% confidence interval using the t-distribution.
6. Optionally compare against a z-interval in the hypothetical case where the population standard deviation is known.

The intended experimental-methods message is that individual measurements may remain variable even while the estimate of the mean becomes more stable.

## Netlify

Connect this repository to one Netlify site and publish the repository root.

- Build command: none
- Publish directory: `.`
- Production branch: `main`

After connection, pushes to `main` automatically redeploy the site.

Typical URLs will be:

```text
https://<site-name>.netlify.app/
https://<site-name>.netlify.app/repeated-measurements/
```

The explorer URL can be embedded directly in a Canvas iframe.
