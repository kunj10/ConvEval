"""
Comprehensive test suite for ConvEval pipeline.
Tests: preprocessing, heuristic scorer, pipeline evaluation, API endpoints.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent / "data"

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def facets_df():
    from backend.core.preprocessing import load_and_preprocess_facets
    return load_and_preprocess_facets(DATA_DIR / "Facets_Assignment.csv")

@pytest.fixture(scope="module")
def pipeline(facets_df):
    from backend.pipeline.evaluator import ConvEvalPipeline
    return ConvEvalPipeline(facets_df=facets_df, use_heuristic=True)

@pytest.fixture
def sample_conversation():
    return {
        "conversation_id": "TEST001",
        "conversation_type": "customer_support",
        "turns": [
            {"turn_id": 1, "speaker": "user", "text": "Hello, I have a problem with my order."},
            {"turn_id": 2, "speaker": "agent", "text": "I'm sorry to hear that! Please share your order number and I'll look into it right away."},
        ]
    }

# ── Preprocessing tests ───────────────────────────────────────────────────────

class TestPreprocessing:
    def test_facets_load(self, facets_df):
        assert len(facets_df) == 300
        assert "facet_id" in facets_df.columns
        assert "domain" in facets_df.columns

    def test_facets_domains(self, facets_df):
        domains = set(facets_df["domain"].unique())
        assert domains == {"linguistic_quality", "pragmatics", "safety", "emotion"}

    def test_engineered_columns(self, facets_df):
        for col in ["domain_code", "question_length", "complexity_tier",
                    "default_confidence_prior", "prompt_template", "aggregation_key"]:
            assert col in facets_df.columns, f"Missing column: {col}"

    def test_prompt_template_has_placeholders(self, facets_df):
        for _, row in facets_df.head(10).iterrows():
            assert "{turn_text}" in row["prompt_template"]
            assert "{context}" in row["prompt_template"]

    def test_turn_preprocessing(self):
        from backend.core.preprocessing import preprocess_turn
        result = preprocess_turn(
            text="Hello, how are you doing today?",
            turn_id=1, speaker="user", conversation_type="casual_chat"
        )
        assert result["word_count"] == 6
        assert result["has_question"] is True
        assert result["is_first_turn"] is True
        assert result["is_user_turn"] is True

    def test_turn_complexity_score(self):
        from backend.core.preprocessing import preprocess_turn
        simple = preprocess_turn("Hi", 1, "user")
        complex_ = preprocess_turn(
            "Although the system appears to be functioning correctly, "
            "the underlying infrastructure nevertheless requires substantial restructuring "
            "because the current architecture cannot accommodate the anticipated load.",
            1, "user"
        )
        assert complex_["complexity_score"] > simple["complexity_score"]

    def test_conversation_context_window(self):
        from backend.core.preprocessing import preprocess_conversation
        conv = {
            "conversation_id": "CTX001",
            "conversation_type": "general",
            "turns": [
                {"turn_id": 1, "speaker": "user", "text": "Turn one."},
                {"turn_id": 2, "speaker": "agent", "text": "Turn two."},
                {"turn_id": 3, "speaker": "user", "text": "Turn three."},
            ]
        }
        results = preprocess_conversation(conv)
        assert results[0]["context_window"] == ""
        assert "Turn one" in results[1]["context_window"]
        assert results[2]["context_turn_count"] == 2

# ── Heuristic scorer tests ────────────────────────────────────────────────────

class TestHeuristicScorer:
    def test_score_range(self):
        from backend.pipeline.evaluator import _heuristic_score
        for domain in ["linguistic_quality", "pragmatics", "safety", "emotion"]:
            score, conf = _heuristic_score("Test text for evaluation.", domain, "XX001")
            assert 1 <= score <= 5, f"Score {score} out of range for {domain}"
            assert 0.5 <= conf <= 1.0, f"Confidence {conf} out of range for {domain}"

    def test_deterministic(self):
        from backend.pipeline.evaluator import _heuristic_score
        s1, c1 = _heuristic_score("Some test text.", "safety", "SA001")
        s2, c2 = _heuristic_score("Some test text.", "safety", "SA001")
        assert s1 == s2
        assert c1 == c2

    def test_safety_risk_text_scores_lower(self):
        from backend.pipeline.evaluator import _heuristic_score
        safe_score, _ = _heuristic_score("Thank you, have a great day!", "safety", "SA001")
        risky_score, _ = _heuristic_score("I hate this and want to attack everything.", "safety", "SA001")
        assert safe_score >= risky_score

    def test_different_facets_differ(self):
        from backend.pipeline.evaluator import _heuristic_score
        results = set()
        for facet_id in ["LQ001", "PR001", "SA001", "EM001"]:
            score, conf = _heuristic_score("Hello world test.", "linguistic_quality", facet_id)
            results.add((score, round(conf, 2)))
        assert len(results) > 1  # Different facets produce different outputs

# ── Pipeline tests ────────────────────────────────────────────────────────────

class TestPipeline:
    def test_evaluate_returns_structure(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation)
        assert "conversation_id" in result
        assert "turn_results" in result
        assert "overall_summary" in result
        assert len(result["turn_results"]) == 2

    def test_turn_has_facet_results(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation)
        turn = result["turn_results"][0]
        assert "facet_results" in turn
        assert len(turn["facet_results"]) == 300  # all facets by default

    def test_facet_result_fields(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation)
        fr = result["turn_results"][0]["facet_results"][0]
        assert "facet_id" in fr
        assert "score" in fr
        assert "confidence" in fr
        assert 1 <= fr["score"] <= 5
        assert 0.5 <= fr["confidence"] <= 1.0

    def test_domain_filter(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation, domains=["safety"])
        turn = result["turn_results"][0]
        domains = {fr["domain"] for fr in turn["facet_results"]}
        assert domains == {"safety"}
        assert len(turn["facet_results"]) == 75

    def test_facet_id_filter(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation, facet_ids=["LQ001", "SA001", "EM001"])
        turn = result["turn_results"][0]
        assert len(turn["facet_results"]) == 3
        ids = {fr["facet_id"] for fr in turn["facet_results"]}
        assert ids == {"LQ001", "SA001", "EM001"}

    def test_domain_summaries_present(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation)
        summaries = result["turn_results"][0]["domain_summaries"]
        for domain in ["linguistic_quality", "pragmatics", "safety", "emotion"]:
            assert domain in summaries
            assert "mean" in summaries[domain]
            assert "std" in summaries[domain]

    def test_caching_works(self, pipeline, sample_conversation):
        # First call populates cache
        pipeline.evaluate(sample_conversation)
        cache_after_first = len(pipeline._cache)
        # Second call with identical input — cache size must NOT grow
        pipeline.evaluate(sample_conversation)
        cache_after_second = len(pipeline._cache)
        assert cache_after_second == cache_after_first

    def test_empty_turns(self, pipeline):
        conv = {"conversation_id": "EMPTY", "conversation_type": "general", "turns": []}
        result = pipeline.evaluate(conv)
        assert result["turn_results"] == []

    def test_single_turn(self, pipeline):
        conv = {
            "conversation_id": "SINGLE",
            "conversation_type": "general",
            "turns": [{"turn_id": 1, "speaker": "user", "text": "Just one turn."}]
        }
        result = pipeline.evaluate(conv)
        assert len(result["turn_results"]) == 1

    def test_overall_summary_fields(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation)
        summary = result["overall_summary"]
        assert "total_facet_evaluations" in summary
        assert "overall_mean_score" in summary
        assert "overall_mean_confidence" in summary
        assert "score_distribution" in summary
        dist = summary["score_distribution"]
        assert sum(dist.values()) == summary["total_facet_evaluations"]

    def test_score_distribution_valid(self, pipeline, sample_conversation):
        result = pipeline.evaluate(sample_conversation)
        dist = result["overall_summary"]["score_distribution"]
        for k, v in dist.items():
            assert k in ["1","2","3","4","5"]
            assert v >= 0

    def test_scales_to_many_facets(self, facets_df):
        """Verify architecture scales by doubling facets artificially."""
        from backend.pipeline.evaluator import ConvEvalPipeline
        import pandas as pd
        doubled = pd.concat([facets_df, facets_df.assign(
            facet_id=facets_df["facet_id"] + "_X"
        )], ignore_index=True)
        big_pipeline = ConvEvalPipeline(facets_df=doubled, use_heuristic=True)
        conv = {
            "conversation_id": "SCALE",
            "conversation_type": "general",
            "turns": [{"turn_id": 1, "speaker": "user", "text": "Scaling test."}]
        }
        result = big_pipeline.evaluate(conv)
        assert len(result["turn_results"][0]["facet_results"]) == 600

# ── Edge case tests ───────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_very_long_text(self, pipeline):
        long_text = "word " * 500
        conv = {
            "conversation_id": "LONG",
            "conversation_type": "general",
            "turns": [{"turn_id": 1, "speaker": "user", "text": long_text}]
        }
        result = pipeline.evaluate(conv, domains=["safety"])
        assert len(result["turn_results"]) == 1

    def test_special_characters(self, pipeline):
        conv = {
            "conversation_id": "SPEC",
            "conversation_type": "general",
            "turns": [{"turn_id": 1, "speaker": "user", "text": "Hello! @#$%^&*() — test 中文 العربية"}]
        }
        result = pipeline.evaluate(conv, domains=["emotion"])
        assert len(result["turn_results"]) == 1

    def test_empty_text(self, pipeline):
        conv = {
            "conversation_id": "EMPTY_TEXT",
            "conversation_type": "general",
            "turns": [{"turn_id": 1, "speaker": "user", "text": ""}]
        }
        result = pipeline.evaluate(conv, domains=["linguistic_quality"])
        assert len(result["turn_results"]) == 1

    def test_multi_turn_long_conversation(self, pipeline):
        conv = {
            "conversation_id": "MULTI",
            "conversation_type": "educational",
            "turns": [
                {"turn_id": i, "speaker": "user" if i % 2 == 1 else "agent",
                 "text": f"This is turn number {i} with some content to evaluate."}
                for i in range(1, 11)
            ]
        }
        result = pipeline.evaluate(conv, domains=["pragmatics"])
        assert len(result["turn_results"]) == 10

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
