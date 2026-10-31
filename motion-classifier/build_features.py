#!/usr/bin/env python3
"""Export REAL USC-HAD original-trial mean features for ME 3310's interactive classifier.

Original dataset: https://sipi.usc.edu/had/USC-HAD.zip
Citation: M. Zhang and A. Sawchuk, USC-HAD, SAGAware (UbiComp), 2012.
Output: a small derived-feature JSON; NEVER raw measurements or synthetic data.
Requires: numpy scipy; Python 3.10+.
Usage:
  python motion-classifier/build_features.py
  python motion-classifier/build_features.py /absolute/path/USC-HAD.zip
If the official download is not reachable, supply an authentic USC-HAD.zip.
"""
import io
import json
import re
import sys
import zipfile
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
from scipy.io import loadmat
from scipy.signal import welch

URL = "https://sipi.usc.edu/had/USC-HAD.zip"
OUTPUT = Path(__file__).with_name("data").joinpath("usc_had_up_down_trials.json")
OUTPUT_16 = Path(__file__).parent.parent.joinpath(
    "motion-overfitting", "data", "usc_had_16_features.json"
)
# Exact ordering matches step03_extract_window_features.m in the course repo.
EXTRA_BANDS = [(0.3, 0.8), (0.8, 1.5), (1.5, 3.0), (3.0, 5.0),
               (5.0, 8.0), (8.0, 12.0), (12.0, 20.0), (20.0, 40.0)]
FEATURE_NAMES_16 = [
    "Acceleration magnitude STD (g)",
    "Acceleration PSD power 0.8–3.0 Hz (g²)",
    "Gyroscope X RMS (deg/s)",
    "Gyroscope Y RMS (deg/s)",
    "Gyroscope Z RMS (deg/s)",
    "Gyroscope X mean (deg/s)",
    "Gyroscope Y mean (deg/s)",
    "Gyroscope Z mean (deg/s)",
] + [f"Acceleration PSD {lo:.1f}–{hi:.1f} Hz power (g²)"
     for lo, hi in EXTRA_BANDS]
FS, N, H = 100, 300, 50  # 100 Hz, 3-s feature windows, 0.5-s hop
F1, F2 = 0.8, 3.0
# Same participant split as the course demonstrations; diagnostic subjects
# have already been inspected, so this is NOT an untouched final test.
DEV = {2, 3, 4, 7, 8, 9, 10, 11, 12, 14}
DIAGNOSTIC = {1, 5, 6, 13}


def load_zip(filename):
    if filename:
        candidate = Path(filename)
        if not candidate.is_file():
            raise FileNotFoundError(f"USC-HAD archive does not exist: {candidate}")
        print(f"Reading locally supplied original archive: {candidate}")
        return candidate.read_bytes()
    print(f"Downloading official USC-HAD archive: {URL}")
    req = Request(URL, headers={"User-Agent": "ME3310-educational-research/1.0"})
    with urlopen(req, timeout=180) as response:
        return response.read()


def extract_trial_features(six_axis):
    if six_axis.ndim != 2 or six_axis.shape[1] < 6 or six_axis.shape[0] < N:
        return None
    if not np.isfinite(six_axis[:, :6]).all():
        return None
    a = six_axis[:, :3]  # acceleration measured in g
    magnitude = np.linalg.norm(a, axis=1)
    gyro = six_axis[:, 3:6]   # recorded angular rate, deg/s
    features = []
    # MATLAB step03: 3 s windows, hop 0.5 s; mean features over windows
    for start in range(0, len(magnitude) - N + 1, H):
        v = magnitude[start:start + N]
        std = float(np.std(v, ddof=1))  # MATLAB std() sample STD
        centered = v - v.mean()
        # MATLAB pwelch: 2-s symmetric Hamming segment, 50% overlap,
        # nfft = max(512, 2**nextpow2(200)) = 512.
        f, pxx = welch(
            centered, fs=FS, window=np.hamming(200),
            nperseg=200, noverlap=100, nfft=512,
            detrend=False, scaling="density", return_onesided=True,
        )
        band = (f >= F1) & (f <= F2)
        power = float(np.trapezoid(pxx[band], f[band]))
        gy = gyro[start:start + N, :]
        gyro_rms = np.sqrt(np.mean(gy * gy, axis=0)).tolist()
        gyro_mean = np.mean(gy, axis=0).tolist()
        extras = []
        for lower, upper in EXTRA_BANDS:
            include = (f >= lower) & (f <= upper)
            extras.append(float(np.trapezoid(pxx[include], f[include])))
        features.append([std, power] + gyro_rms + gyro_mean + extras)
    if not features:
        return None
    averaged = np.mean(np.asarray(features), axis=0)
    if len(averaged) != 16 or not np.isfinite(averaged).all():
        raise ValueError("Incomplete 16-feature measurement extraction.")
    return [round(float(x), 9) for x in averaged], len(features)


def main():
    payload = load_zip(sys.argv[1] if len(sys.argv) > 1 else None)
    if not zipfile.is_zipfile(io.BytesIO(payload)):
        raise ValueError("Source is not a valid ZIP containing official USC-HAD MAT files.")
    rows = []
    full_rows = []
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        for entry in archive.namelist():
            norm = entry.replace("\\", "/")
            match = re.search(
                r"(?:^|/)Subject(\d+)/(a([45])t(\d+)\.mat)$", norm, re.I
            )
            if match is None:
                continue
            subject, activity, trial = map(int, (match.group(1), match.group(3), match.group(4)))
            arr = loadmat(io.BytesIO(archive.read(entry)))
            if "sensor_readings" not in arr:
                raise ValueError(f"Missing original six-axis measurements: {entry}")
            readings = np.asarray(arr["sensor_readings"], dtype=np.float64)
            summary = extract_trial_features(readings)
            if summary is None:
                raise ValueError(f"Invalid or too-short real original trial: {entry}")
            vals, n_windows = summary
            full_rows.append({
                "subject": subject, "trial": trial,
                "classId": int(activity == 5),
                "motion": "Downstairs" if activity == 5 else "Upstairs",
                "features": vals,
                "windowCount": n_windows,
                "split": "development" if subject in DEV else "diagnostic",
                "source": f"Subject{subject}/a{activity}t{trial}.mat",
            })
            rows.append({
                "subject": subject, "trial": trial,
                "classId": int(activity == 5),
                "motion": "Downstairs" if activity == 5 else "Upstairs",
                "feature1": vals[0], "feature2": vals[1],
                "windowCount": n_windows,
                "split": "development" if subject in DEV else "diagnostic",
                "source": f"Subject{subject}/a{activity}t{trial}.mat",
            })
    rows.sort(key=lambda row: (row["subject"], row["classId"], row["trial"]))
    full_rows.sort(key=lambda row: (row["subject"], row["classId"], row["trial"]))
    classes = {row["classId"] for row in rows}
    subjects = {row["subject"] for row in rows}
    assert classes == {0, 1} and len(subjects) == 14, (
        f"Expected two activities and 14 subjects, got {classes}, {subjects}"
    )
    assert all(row["split"] in {"development", "diagnostic"} for row in rows)
    assert len({(r["subject"], r["classId"], r["trial"]) for r in rows}) == len(rows)
    assert len(rows) == 140, f"Expected 14*2*5=140 real trials, found {len(rows)}"
    result = {
        "source": URL,
        "citation": "Mi Zhang and Alexander A. Sawchuk, USC-HAD, SAGAware (UbiComp), 2012",
        "dataset": "USC-HAD original recorded trials (no simulated signals)",
        "generatedDate": date.today().isoformat(),
        "fsHz": FS, "windowSeconds": 3.0, "hopSeconds": 0.5,
        "originalTrialCount": len(rows),
        "featureNames": [
            "Acceleration magnitude STD (g)",
            "Acceleration magnitude Welch PSD 0.8–3 Hz band power (g²)",
        ],
        "featureMethod": (
            "3-second sliding windows (0.5-second hop); within each window sample "
            "STD of acceleration magnitude and 0.8–3Hz band power from 2-second "
            "50%-overlap Hamming Welch PSD, averaged over windows in each original trial; "
            "SciPy equivalent of course MATLAB procedure (small implementation differences possible)."
        ),
        "splitNote": (
            "10 development subjects and 4 previously inspected diagnostic subjects; "
            "diagnostic results are for visualization, NOT untouched final test performance."
        ),
        "rows": rows,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(f"Wrote {len(rows)} REAL original USC-HAD trials to {OUTPUT}")
    assert len(full_rows) == 140
    assert len(FEATURE_NAMES_16) == 16
    result16 = {
        "dataset": "USC-HAD actual original recordings, no synthetic signals",
        "source": URL,
        "citation": "M. Zhang and A. A. Sawchuk, USC-HAD, SAGAware, 2012",
        "generatedDate": date.today().isoformat(),
        "fsHz": FS, "windowSeconds": 3.0, "hopSeconds": 0.5,
        "originalTrialCount": len(full_rows),
        "featureNames": FEATURE_NAMES_16,
        "fixedFeatureSets": [4, 8, 12, 16],
        "featureSelection": (
            "PREDECLARED nested sets: columns 1–4, 1–8, 1–12, 1–16 "
            "in the existing ME3310 extraction order. No test-set ranking."
        ),
        "featureMethod": (
            "3-s feature windows, 0.5-s hop. MATLAB step03 feature ordering: "
            "acc magnitude STD, Welch 0.8–3Hz power, gyro XYZ RMS, gyro XYZ mean, "
            "8 more accel PSD-band powers. Welch 2-s symmetric Hamming, "
            "50% overlap, 512-point FFT, 100Hz. Independent units are "
            "original trials; their window features are averaged."
        ),
        "splitNote": (
            "10 training/development subjects; 4 previously inspected "
            "diagnostic subjects. Diagnostic comparisons are not pristine "
            "final test performance. Subject-wise LOSO also available."
        ),
        "rows": full_rows,
    }
    OUTPUT_16.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_16.write_text(
        json.dumps(result16, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf8"
    )
    print(f"Wrote {len(full_rows)} REAL 16-feature trial vectors to {OUTPUT_16}")


if __name__ == "__main__":
    main()
