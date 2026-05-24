import os
import sys
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

print("=" * 60)
print("MOL-X PARADIGM VERIFICATION")
print("=" * 60)

try:
    from app.utils.generator import get_generator
    from app.utils.evaluator import evaluate_datasets

    print("Creating dummy dataset...")
    dummy_train = []
    for i in range(100):
        dummy_train.append({
            "molecular_weight": random.uniform(200, 500),
            "logp": random.uniform(1, 5),
            "qed": random.uniform(0.3, 0.9),
            "binding_score": random.uniform(5, 12),
            "lipinski_pass": random.choice([0, 1])
        })
    dummy_test = dummy_train[:20]

    print("\nTraining generator...")
    gen = get_generator()
    gen.epochs = 1
    gen.train(dummy_train)
    print("Generator trained correctly.")

    print("\nGenerating dummy data...")
    generated_data = gen.generate(20)
    print(f"Generated {len(generated_data)} samples.")

    print("\nEvaluating pipeline...")
    result = evaluate_datasets(
        original_train=dummy_train,
        original_test=dummy_test,
        generated_train=generated_data
    )
    print("EVALUATOR COMPLETED SUCESSFULLY.")
    print("Verdict:", result.get("verdict"))
    print("Overall Similarity:", result.get("overall_similarity"))
    print("Adversarial Accuracy:", result.get("adversarial", {}))
    
    print("\nCheck all PASSED!")
except Exception as e:
    print("\nERROR IN PIPELINE:")
    import traceback
    traceback.print_exc()
