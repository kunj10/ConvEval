"""
Data preprocessing module for ConvEval.

Loads the Facets Assignment CSV and engineers additional columns that support
the evaluation system. Also handles conversation turn preprocessing.
"""

from __future__ import annotations

import logging
import re
import hashlib
from pathlib import Path
from typing import Any

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# ── Complexity heuristics ──────────────────────────────────────────────────────

_SUBORDINATORS = re.compile(
    r"\b(because|although|since|while|if|unless|until|when|where|"
    r"whereas|after|before|once|though|even though|as long as)\b",
    re.IGNORECASE,
)
_DISCOURSE_MARKERS = re.compile(
    r"\b(however|therefore|furthermore|moreover|nevertheless|"
    r"consequently|thus|hence|otherwise|meanwhile|additionally)\b",
    re.IGNORECASE,
)
_HEDGE_WORDS = re.compile(
    r"\b(maybe|perhaps|possibly|probably|might|could|seems|appears|"
    r"apparently|arguably|arguably|roughly|approximately|suggest)\b",
    re.IGNORECASE,
)
_TECHNICAL_TERMS = re.compile(
    r"\b([A-Z]{2,}|[a-z]+(?:[A-Z][a-z]+)+|[a-z]+-[a-z]+-[a-z]+)\b"
)


def _word_count(text: str) -> int:
    return len(text.split())


def _sentence_count(text: str) -> int:
    return max(1, len(re.findall(r"[.!?]+", text)))


def _avg_word_length(text: str) -> float:
    words = text.split()
    if not words:
        return 0.0
    return round(sum(len(w.strip(".,!?;:")) for w in words) / len(words), 2)


def _type_token_ratio(text: str) -> float:
    tokens = re.findall(r"\b[a-z]+\b", text.lower())
    if not tokens:
        return 0.0
    return round(len(set(tokens)) / len(tokens), 3)


def _complexity_score(text: str) -> float:
    """Heuristic 0-1 complexity: subordinators + discourse markers + long words."""
    words = _word_count(text)
    if words == 0:
        return 0.0
    sub_density = len(_SUBORDINATORS.findall(text)) / words
    dm_density = len(_DISCOURSE_MARKERS.findall(text)) / words
    long_words = sum(1 for w in text.split() if len(w) > 8) / words
    raw = (sub_density * 10 + dm_density * 10 + long_words) / 3
    return round(min(1.0, raw), 3)


def _hedge_density(text: str) -> float:
    words = _word_count(text)
    if words == 0:
        return 0.0
    return round(len(_HEDGE_WORDS.findall(text)) / words, 4)


def _has_question(text: str) -> bool:
    return "?" in text


def _has_code_block(text: str) -> bool:
    return "```" in text or "`" in text


def _has_list(text: str) -> bool:
    return bool(re.search(r"^\s*[-*•]\s", text, re.MULTILINE) or
                re.search(r"^\s*\d+\.", text, re.MULTILINE))


def _sentiment_heuristic(text: str) -> str:
    """Crude keyword-based sentiment label."""
    pos = sum(1 for w in ["good", "great", "excellent", "happy", "thanks", "wonderful",
                          "amazing", "love", "perfect", "helpful"] if w in text.lower())
    neg = sum(1 for w in ["bad", "terrible", "awful", "hate", "useless", "broken",
                          "wrong", "frustrated", "angry", "disappointed"] if w in text.lower())
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _topic_category(conversation_type: str) -> str:
    mapping = {
        "customer_support": "service",
        "medical_advice": "health",
        "technical_help": "technology",
        "coding_help": "technology",
        "emotional_support": "wellbeing",
        "crisis": "wellbeing",
        "mental_health": "wellbeing",
        "educational": "knowledge",
        "trivia": "knowledge",
        "scientific_explanation": "knowledge",
        "history_discussion": "knowledge",
        "study_help": "knowledge",
        "financial_advice": "finance",
        "legal_query": "legal",
        "casual_chat": "social",
        "humor_exchange": "social",
        "debate": "discourse",
        "political_discussion": "discourse",
        "philosophical_discussion": "discourse",
        "creative_writing": "creative",
        "storytelling": "creative",
        "poetry_request": "creative",
    }
    return mapping.get(conversation_type, "general")


# ── Facet DataFrame enrichment ─────────────────────────────────────────────────

def load_and_preprocess_facets(csv_path: str | Path) -> pd.DataFrame:
    """
    Load Facets Assignment CSV and engineer additional columns.

    Added columns:
    - domain_code: integer encoding of domain (for model use)
    - question_length: number of words in evaluation_question
    - is_binary_facet: True if question implies binary judgment
    - requires_multi_turn: True if facet needs context beyond single turn
    - facet_group: sub-grouping within domain (first 2 chars of facet_id)
    - prompt_template: ready-to-use prompt string for LLM evaluation
    - aggregation_key: composite key for batch grouping
    - complexity_tier: low / medium / high based on question complexity
    - default_confidence_prior: prior confidence estimate by domain
    """
    df = pd.read_csv(csv_path)
    logger.info("Loaded %d facets from %s", len(df), csv_path)

    # Domain encoding
    domain_order = {"linguistic_quality": 0, "pragmatics": 1, "safety": 2, "emotion": 3}
    df["domain_code"] = df["domain"].map(domain_order).fillna(-1).astype(int)

    # Question properties
    df["question_length"] = df["evaluation_question"].apply(_word_count)
    df["is_binary_facet"] = df["evaluation_question"].str.contains(
        r"\bIs\b|\bDoes\b|\bAre\b", regex=True
    )
    df["requires_multi_turn"] = df.get("multi_turn", False)

    # Sub-grouping
    df["facet_group"] = df["facet_id"].str[:2]

    # Complexity tier
    df["complexity_tier"] = pd.cut(
        df["question_length"],
        bins=[0, 8, 14, 999],
        labels=["low", "medium", "high"],
    )

    # Default confidence prior by domain
    CONFIDENCE_PRIORS = {
        "linguistic_quality": 0.82,
        "pragmatics": 0.71,
        "safety": 0.88,
        "emotion": 0.68,
    }
    df["default_confidence_prior"] = df["domain"].map(CONFIDENCE_PRIORS).fillna(0.75)

    # Aggregation key
    df["aggregation_key"] = df["domain"] + "_" + df["facet_group"]

    # Prompt template
    df["prompt_template"] = df.apply(_build_prompt_template, axis=1)

    logger.info("Facet preprocessing complete — %d columns", len(df.columns))
    return df


def _build_prompt_template(row: pd.Series) -> str:
    """
    Build a structured evaluation prompt for a given facet.
    This is NOT a one-shot prompt — it relies on the model's instruction-tuning
    and the fine-tuned evaluation head, not in-context examples.
    """
    scale_desc = (
        "1 = Very Poor / Absent\n"
        "2 = Poor / Minimal\n"
        "3 = Moderate / Acceptable\n"
        "4 = Good / Adequate\n"
        "5 = Excellent / Optimal"
    )
    return (
        f"[EVAL_TASK]\n"
        f"Facet ID: {row['facet_id']}\n"
        f"Facet Name: {row['facet_name']}\n"
        f"Domain: {row['domain']}\n"
        f"Evaluation Question: {row['evaluation_question']}\n\n"
        f"Scoring Scale:\n{scale_desc}\n\n"
        f"[INSTRUCTION]\n"
        f"Evaluate the provided conversation turn on the facet described above. "
        f"Return a JSON object with keys 'score' (integer 1-5) and 'confidence' (float 0.0-1.0). "
        f"Base your judgment solely on linguistic and pragmatic evidence in the text. "
        f"Do not explain your reasoning — only return the JSON.\n\n"
        f"[TURN_TEXT]\n{{turn_text}}\n\n"
        f"[CONTEXT]\n{{context}}\n\n"
        f"[OUTPUT]\n"
    )


# ── Turn preprocessing ─────────────────────────────────────────────────────────

def preprocess_turn(
    text: str,
    turn_id: int,
    speaker: str,
    conversation_type: str = "unknown",
    prior_turns: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Preprocess a single conversation turn and extract features.

    Returns a dict with original text + engineered features.
    """
    prior_turns = prior_turns or []
    context_text = " ".join(t.get("text", "") for t in prior_turns[-3:])  # last 3 turns

    turn_hash = hashlib.md5(f"{text}{turn_id}{speaker}".encode()).hexdigest()[:8]

    return {
        "turn_id": turn_id,
        "speaker": speaker,
        "text": text,
        "turn_hash": turn_hash,
        "conversation_type": conversation_type,
        "topic_category": _topic_category(conversation_type),
        # Linguistic features
        "word_count": _word_count(text),
        "sentence_count": _sentence_count(text),
        "avg_word_length": _avg_word_length(text),
        "type_token_ratio": _type_token_ratio(text),
        "complexity_score": _complexity_score(text),
        "hedge_density": _hedge_density(text),
        # Structural features
        "has_question": _has_question(text),
        "has_code_block": _has_code_block(text),
        "has_list": _has_list(text),
        # Emotional / pragmatic
        "sentiment_heuristic": _sentiment_heuristic(text),
        "discourse_marker_count": len(_DISCOURSE_MARKERS.findall(text)),
        # Context
        "context_window": context_text,
        "context_turn_count": len(prior_turns),
        "is_first_turn": turn_id == 1,
        "is_user_turn": speaker.lower() == "user",
    }


def preprocess_conversation(conversation: dict[str, Any]) -> list[dict[str, Any]]:
    """Process all turns in a conversation, injecting context windows."""
    turns = conversation.get("turns", [])
    conv_type = conversation.get("conversation_type", "unknown")
    processed = []
    for i, turn in enumerate(turns):
        prior = turns[:i]
        processed.append(
            preprocess_turn(
                text=turn["text"],
                turn_id=turn["turn_id"],
                speaker=turn["speaker"],
                conversation_type=conv_type,
                prior_turns=prior,
            )
        )
    return processed
