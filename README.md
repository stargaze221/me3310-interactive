# ME 3310 Interactive Explorers

Interactive web visualizations for **ME 3310 — Experimental Methods I**.

The repository is designed as one static Netlify site with multiple focused explorer pages. Each explorer can be embedded independently in Canvas using a stable Netlify URL.

## Current structure

```text
me3310-interactive/
├── index.html
├── netlify.toml
├── repeated-measurements/
├── binomial-normal/
├── sampling-distribution/
├── confidence-interval/
└── least-squares/
```

Each explorer directory contains its own `index.html`, `styles.css`, and `app.js`.

## Explorer 01 — Repeated Measurements & Law of Large Numbers

Focuses on the question: **What becomes more stable as measurements are repeated—the individual measurements or our estimate of the mean?** Students use a fair-die or hypothetical MPG example and watch the running sample mean stabilize.

## Explorer 02 — Coin Toss: Binomial → Normal

Uses a fair coin to show how the exact binomial distribution of the number of heads is increasingly well approximated by a normal distribution as the number of independent tosses increases. The normal approximation uses the same mean and variance and a continuity correction.

## Explorer 03 — Sampling Distribution of the Mean

Demonstrates the Central Limit Theorem by repeatedly drawing samples from either a discrete-uniform die population or a right-skewed exponential population. Students compare the original measurement distribution with the distribution of 3,000 sample means and the normal model `N(mu, sigma^2/n)`.

The page explicitly distinguishes the two ideas:
- **Law of Large Numbers:** the sample mean becomes concentrated near the population mean.
- **Central Limit Theorem:** the standardized sample mean approaches a standard normal distribution; equivalently, the sampling distribution of the mean is approximately normal with standard error `sigma/sqrt(n)` for sufficiently large `n` under the usual assumptions.

## Explorer 04 — Confidence Interval & t-Distribution

Supports the statistical tools needed for Lab 01. Students vary sample size, sample mean, and sample standard deviation and observe the standard error and 95% t-confidence interval. An optional comparison shows the corresponding z-interval when population standard deviation is assumed known.

## Explorer 05 — Least Squares Calibration

Supports Week 02 and Lab 02 sensor calibration. A simulated accelerator-pedal sensor follows a hidden linear model with Gaussian measurement noise. Students adjust the proposed offset and sensitivity manually, observe residuals and the live sum of squared errors, change sample size and noise level, regenerate experiments, and then reveal the least-squares fit and hidden true model. A short expandable section connects Gaussian errors with the maximum-likelihood interpretation of least squares.

## Netlify

Commits to `main` automatically redeploy.

Current URLs:

```text
https://me3310-interactive.netlify.app/
https://me3310-interactive.netlify.app/repeated-measurements/
https://me3310-interactive.netlify.app/binomial-normal/
https://me3310-interactive.netlify.app/sampling-distribution/
https://me3310-interactive.netlify.app/confidence-interval/
https://me3310-interactive.netlify.app/least-squares/
```

Each explorer URL can be embedded directly in Canvas using an iframe.
