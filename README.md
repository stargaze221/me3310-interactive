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
├── least-squares/
├── regression-confidence/
└── mohrs-circle/
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

## Explorer 06 — Regression Confidence

Extends the Week 02 calibration example from point estimation to inference. Students begin with only three calibration measurements and add evidence one point at a time. The explorer updates the least-squares sensitivity, residual standard deviation, Student-t critical value, 95% confidence interval for the slope, and the 95% confidence band for the mean calibration response. A second plot shows how the slope estimate and its confidence bounds evolve with sample size. The page emphasizes that confidence intervals do not have to shrink after every individual measurement and that a narrow interval does not prove that the assumed linear physical model is correct.

## Explorer 07 — Mohr's Circle for Strain

Supports Week 04 strain-gauge and rosette material. Students define a 2D strain state, rotate a virtual strain-gauge direction, and watch the corresponding point move around Mohr's circle. The explorer emphasizes the physical-angle / double-angle relationship, identifies principal strains and their orientation, and shows the readings that a 0°/45°/90° rectangular rosette would produce. It also verifies the rosette relation `gamma_xy = 2 epsilon_45 - epsilon_0 - epsilon_90`.

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
https://me3310-interactive.netlify.app/regression-confidence/
https://me3310-interactive.netlify.app/mohrs-circle/
```

Each explorer URL can be embedded directly in Canvas using an iframe.

## Explorer 11 — How a Linear Classifier Learns (Week 11)

Live: https://me3310-interactive.netlify.app/motion-classifier/

This visualization uses 140 **actual USC-HAD Upstairs and Downstairs
original trials** from 14 participants. The reproducible source-data
conversion is in motion-classifier/build_features.py. Only derived real
feature summaries are published, not simulated signals.

Training uses 10 development participants; the four held-out participants
have previously been inspected in the course and are diagnostic only,
not an untouched final test. Each point represents one original trial
after averaging 3-second, 0.5-second-hop window features within that trial.
Standardization is learned from development participants only.

Full-batch gradient descent optimizes logistic cross-entropy in JavaScript.
The course MATLAB fitglm uses IRLS for the same logistic model; intermediate
optimization paths are not identical.

The updated lesson covers the weighted linear score, sigmoid probability,
per-trial binary cross-entropy, and average training cross-entropy.
Students can choose a real trial in the dropdown or click a scatter point.
The selected trial's weighted feature contributions, bias, score,
probability, class prediction, and per-trial loss change with each step.
An additional theoretical loss curve explains the penalty for an
overconfident wrong prediction.

Training a simple 2D linear classifier longer does not guarantee
visible overfitting. Subject-to-subject differences are not automatically
evidence of overfitting either.

## Explorer 12 — Real USC-HAD Model Complexity & Generalization

**Live viewer:** https://me3310-interactive.netlify.app/motion-overfitting/

Compares four fixed nested feature sets (the FIRST 4, 8, 12, or 16
ME3310 MATLAB step03 features) using real 100-Hz USC-HAD six-axis
measurement records. The official 14-subject 140-original-trial
archive is processed by motion-classifier/build_features.py;
the verified derived data are at motion-overfitting/data/usc_had_16_features.json.
No synthetic sensor records are generated or substituted.

Each original trial contributes ONE sample after trial-wise averaging
of 3-second, 0.5-second-hop window feature vectors. The feature counts
are predeclared; there is NO Fisher feature ranking or tuning on held-out
people. The classifiers are logistic regression fitted using an identical
full-batch gradient descent procedure (900 iterations, learning rate .18,
no L2 penalty), with standardization fitted to training people only.

Two evaluation choices:
- Development leave-one-subject-out cross validation across 10 subjects:
  each model is trained on 9 subjects and evaluated on the remaining one.
  Each score is the equal-subject-weight average across these 10 folds;
  in-sample training results are from the matching folds.
- Four previously viewed diagnostic subjects: one model trained on
  all 10 development subjects and evaluated on the four excluded people.
  This is NOT an untouched final test set.

Choose accuracy or logistic cross-entropy, click feature counts to see
which measurement features are included, and inspect subject-by-subject
held-out classification errors. More features are NOT guaranteed to
lower held-out loss; the empirical results should guide interpretation.
Hold-out generalization gaps and overfitting are related concepts but
not identical proof of model overfitting.
