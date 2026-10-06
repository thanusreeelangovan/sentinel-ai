from app.ml.baseline import load_training_transactions
from app.ml.features import FEATURE_NAMES
from app.ml.iforest import IsolationForestService
from app.schemas.transaction import Transaction


def test_tree_explainer_returns_isolation_forest_feature_contributions() -> None:
    service = IsolationForestService()
    transaction = Transaction.model_validate(load_training_transactions()[0])

    method, contributions = service.explain_features(transaction)

    assert method == "SHAP_TREE_EXPLAINER"
    assert 0 < len(contributions) <= 8
    assert all(
        {"feature_name", "feature_value", "model_contribution"} <= set(item)
        for item in contributions
    )
    assert all(item["feature_name"] in FEATURE_NAMES for item in contributions)


def test_failed_tree_explainer_uses_labeled_ablation_fallback() -> None:
    class BrokenExplainer:
        def shap_values(self, _features):
            raise RuntimeError("Tree SHAP is unavailable")

    service = IsolationForestService()
    service._tree_explainer = BrokenExplainer()
    transaction = Transaction.model_validate(load_training_transactions()[0])

    method, contributions = service.explain_features(transaction)

    assert method == "ABLATION_FALLBACK"
    assert 0 < len(contributions) <= 8
    assert all(
        {"feature_name", "feature_value", "model_contribution"} <= set(item)
        for item in contributions
    )
