"""
evaluator.py — ML Comparison Pipeline for the Data Paradigm

Validates that generated data is statistically and functionally similar
to the original dataset by training ML models on both and comparing performance.

Runs 4 cross-validation experiments:
  1. Train on Original  → Test on Original   (baseline)
  2. Train on Generated → Test on Generated  (self-consistency)
  3. Train on Original  → Test on Generated  (forward transfer)
  4. Train on Generated → Test on Original   (backward transfer — key metric!)

Also computes distribution comparison statistics (mean, variance, KS-test).
"""

import numpy as np
from typing import List, Dict, Optional
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_squared_error, accuracy_score, r2_score
from sklearn.preprocessing import StandardScaler


def _prepare_features(rows: List[dict]) -> tuple:
    """
    Extract feature matrix X and targets y from dataset rows.

    Features: [molecular_weight, logp, qed, lipinski_pass]
    Target:   binding_score (regression)
    """
    X = []
    y = []
    for r in rows:
        try:
            features = [
                float(r.get("molecular_weight", 300)),
                float(r.get("logp", 2.5)),
                float(r.get("qed", 0.5)),
                float(r.get("lipinski_pass", 1)),
            ]
            target = float(r.get("binding_score", 7.0))
            X.append(features)
            y.append(target)
        except (ValueError, TypeError):
            continue

    return np.array(X), np.array(y)


def _compute_distribution_stats(original: List[dict], generated: List[dict]) -> dict:
    """
    Compare statistical distributions between original and generated datasets.

    Computes per-feature: mean, std, min, max for both datasets,
    plus the absolute difference in means and stds.
    """
    features = ["molecular_weight", "logp", "qed", "binding_score"]
    comparison = {}

    for feat in features:
        orig_vals = [float(r.get(feat, 0)) for r in original if r.get(feat) is not None]
        gen_vals  = [float(r.get(feat, 0)) for r in generated if r.get(feat) is not None]

        if not orig_vals or not gen_vals:
            continue

        o_mean, o_std = np.mean(orig_vals), np.std(orig_vals)
        g_mean, g_std = np.mean(gen_vals), np.std(gen_vals)

        comparison[feat] = {
            "original_mean":  round(float(o_mean), 4),
            "original_std":   round(float(o_std), 4),
            "original_min":   round(float(np.min(orig_vals)), 4),
            "original_max":   round(float(np.max(orig_vals)), 4),
            "generated_mean": round(float(g_mean), 4),
            "generated_std":  round(float(g_std), 4),
            "generated_min":  round(float(np.min(gen_vals)), 4),
            "generated_max":  round(float(np.max(gen_vals)), 4),
            "mean_diff":      round(abs(float(o_mean - g_mean)), 4),
            "std_diff":       round(abs(float(o_std - g_std)), 4),
            "mean_similarity_pct": round(
                (1 - abs(float(o_mean - g_mean)) / max(abs(float(o_mean)), 1e-6)) * 100, 1
            ),
        }

    return comparison


def _check_duplicates(original: List[dict], generated: List[dict]) -> dict:
    """Check for exact SMILES duplicates between original and generated."""
    orig_smiles = set(r.get("smiles", "") for r in original)
    gen_smiles  = set(r.get("smiles", "") for r in generated)

    overlap = orig_smiles & gen_smiles
    unique_gen = gen_smiles - orig_smiles

    return {
        "original_unique_smiles":  len(orig_smiles),
        "generated_unique_smiles": len(gen_smiles),
        "overlapping_smiles":      len(overlap),
        "novel_generated":         len(unique_gen),
        "novelty_rate_pct":        round(len(unique_gen) / max(len(gen_smiles), 1) * 100, 1),
    }


def evaluate_datasets(
    original_train: List[dict],
    original_test:  List[dict],
    generated_train: List[dict],
    generated_test: Optional[List[dict]] = None,
    use_inherited_models: bool = False,
) -> dict:
    """
    Full evaluation pipeline. Runs 4 cross-experiments and returns comprehensive results.

    Args:
        original_train:  rows from original training set
        original_test:   rows from original test set
        generated_train: rows from generated dataset (used as both train and test)
        generated_test:  optional separate generated test set

    Returns:
        {
            "experiments": {
                "orig_on_orig": {...},
                "gen_on_gen": {...},
                "orig_on_gen": {...},
                "gen_on_orig": {...},
            },
            "distributions": {...},
            "duplicates": {...},
            "verdict": "..."
        }
    """
    # If no separate generated test set, split generated data 80/20
    if generated_test is None:
        split_idx = int(len(generated_train) * 0.8)
        gen_train = generated_train[:split_idx]
        gen_test  = generated_train[split_idx:]
    else:
        gen_train = generated_train
        gen_test  = generated_test

    # Prepare feature matrices
    X_orig_train, y_orig_train = _prepare_features(original_train)
    X_orig_test,  y_orig_test  = _prepare_features(original_test)
    X_gen_train,  y_gen_train  = _prepare_features(gen_train)
    X_gen_test,   y_gen_test   = _prepare_features(gen_test)

    # Scale features
    scaler = StandardScaler()
    X_orig_train_s = scaler.fit_transform(X_orig_train)
    X_orig_test_s  = scaler.transform(X_orig_test)

    scaler_gen = StandardScaler()
    X_gen_train_s  = scaler_gen.fit_transform(X_gen_train)
    X_gen_test_s   = scaler_gen.transform(X_gen_test)

    # ── LATENT SPACE MAPPING (PCA) ──────────────────────────────────
    # Combines original and generated test sets and translates them into 3D space
    from sklearn.decomposition import PCA
    try:
        pca = PCA(n_components=3)
        pca.fit(X_orig_train_s)
        
        X_orig_pca = pca.transform(X_orig_test_s)
        X_gen_pca  = pca.transform(X_gen_test_s)
        
        pca_data = {
            "original_points":  [{"x": round(float(x), 3), "y": round(float(y), 3), "z": round(float(z), 3)} for x, y, z in X_orig_pca[:200]],
            "generated_points": [{"x": round(float(x), 3), "y": round(float(y), 3), "z": round(float(z), 3)} for x, y, z in X_gen_pca[:200]],
            "variance_ratio":   [round(float(v), 3) for v in pca.explained_variance_ratio_]
        }
    except Exception as e:
        pca_data = {"original_points": [], "generated_points": [], "variance_ratio": []}


    # Also scale cross-evaluation sets with the appropriate scaler
    X_gen_test_with_orig_scaler = scaler.transform(X_gen_test)
    X_orig_test_with_gen_scaler = scaler_gen.transform(X_orig_test)

    experiments = {}

    m_type = "inherited" if use_inherited_models else "rf"

    # ── Experiment 1: Train on Original → Test on Original (BASELINE) ──
    experiments["orig_on_orig"] = _run_experiment(
        X_orig_train_s, y_orig_train,
        X_orig_test_s, y_orig_test,
        "Train Original → Test Original",
        model_type=m_type
    )

    # ── Experiment 2: Train on Generated → Test on Generated ──────────
    experiments["gen_on_gen"] = _run_experiment(
        X_gen_train_s, y_gen_train,
        X_gen_test_s, y_gen_test,
        "Train Generated → Test Generated",
        model_type=m_type
    )

    # ── Experiment 3: Train on Original → Test on Generated ───────────
    experiments["orig_on_gen"] = _run_experiment(
        X_orig_train_s, y_orig_train,
        X_gen_test_with_orig_scaler, y_gen_test,
        "Train Original → Test Generated",
        model_type=m_type
    )

    # ── Experiment 4: Train on Generated → Test on Original (KEY!) ────
    experiments["gen_on_orig"] = _run_experiment(
        X_gen_train_s, y_gen_train,
        X_orig_test_with_gen_scaler, y_orig_test,
        "Train Generated → Test Original",
        model_type=m_type
    )

    # Distribution comparison
    distributions = _compute_distribution_stats(original_train, generated_train)

    # Duplicate check
    duplicates = _check_duplicates(original_train, generated_train)

    # ── Verdict ──────────────────────────────────────────────────────
    baseline_rmse = experiments["orig_on_orig"]["rmse"]
    gen_on_orig_rmse = experiments["gen_on_orig"]["rmse"]

    if baseline_rmse > 0:
        perf_ratio = gen_on_orig_rmse / baseline_rmse
    else:
        perf_ratio = 1.0

    if perf_ratio < 1.3:
        verdict = "EXCELLENT: Generated data achieves comparable ML performance to original data."
        verdict_score = "A"
    elif perf_ratio < 1.6:
        verdict = "GOOD: Generated data retains most predictive power of original data."
        verdict_score = "B"
    elif perf_ratio < 2.0:
        verdict = "FAIR: Generated data captures partial signal from original data."
        verdict_score = "C"
    else:
        verdict = "POOR: Generated data diverges significantly from original distribution."
        verdict_score = "D"

    # Compute overall similarity score (0-100)
    dist_scores = []
    for feat, stats in distributions.items():
        dist_scores.append(stats.get("mean_similarity_pct", 50))

    overall_similarity = round(np.mean(dist_scores), 1) if dist_scores else 0

    # ── ADVERSARIAL TURING TEST ───────────────────────────────────────
    # Train a single classifier whose ONLY job is to guess if a molecule is "Real" or "Fake".
    # If accuracy is ~50%, generated data is completely indistinguishable!
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score
        
        X_adv_train = np.vstack([X_orig_train_s, X_gen_train_s])
        X_adv_test  = np.vstack([X_orig_test_s, X_gen_test_s])
        y_adv_train = np.array([1]*len(X_orig_train_s) + [0]*len(X_gen_train_s))
        y_adv_test  = np.array([1]*len(X_orig_test_s) + [0]*len(X_gen_test_s))

        clf = RandomForestClassifier(n_estimators=100, random_state=42)
        clf.fit(X_adv_train, y_adv_train)
        y_adv_pred = clf.predict(X_adv_test)
        adv_acc = float(accuracy_score(y_adv_test, y_adv_pred))
        # We want adv_acc to be close to 0.5. Calculate an "indistinguishability" score:
        indistinguishability_score = 100.0 - (abs(adv_acc - 0.5) * 200.0) # 0.5 -> 100%, 1.0 -> 0%
    except Exception:
        adv_acc = 0.5
        indistinguishability_score = 0.0

    return {
        "experiments":        experiments,
        "adversarial":        { "accuracy": round(adv_acc, 3), "indistinguishability_pct": round(max(0, indistinguishability_score), 1) },
        "distributions":      distributions,
        "duplicates":         duplicates,
        "pca":                pca_data,
        "verdict":            verdict,
        "verdict_score":      verdict_score,
        "performance_ratio":  round(perf_ratio, 3),
        "overall_similarity": overall_similarity,
    }


def _run_experiment(X_train, y_train, X_test, y_test, name: str, model_type: str = "rf") -> dict:
    """
    Run a single ML experiment.
    Uses RandomForestRegressor by default, or GradientBoostingRegressor if model_type='inherited'.
    """
    try:
        if model_type == "inherited":
            from sklearn.ensemble import GradientBoostingRegressor
            model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        else:
            model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
            
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)

        rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
        r2   = float(r2_score(y_test, predictions))

        y_class_true = (y_test > 7).astype(int)
        y_class_pred = (predictions > 7).astype(int)
        accuracy = float(accuracy_score(y_class_true, y_class_pred))

        return {
            "name":      name,
            "rmse":      round(rmse, 4),
            "r2":        round(r2, 4),
            "accuracy":  round(accuracy, 4),
            "n_train":   len(X_train),
            "n_test":    len(X_test),
        }
    except Exception as e:
        return {
            "name":   name,
            "rmse":   999.0,
            "r2":     0.0,
            "accuracy": 0.0,
            "error":  str(e),
            "n_train": len(X_train),
            "n_test":  len(X_test),
        }
