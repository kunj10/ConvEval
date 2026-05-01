"""
CLI script to run ConvEval on a JSON file of conversations.
Usage: python scripts/run_evaluation.py --input data/sample_conversations.json --output results.csv
"""
import argparse, json, sys, os, pandas as pd
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.core.preprocessing import load_and_preprocess_facets
from backend.pipeline.evaluator import ConvEvalPipeline

def main():
    parser = argparse.ArgumentParser(description="Run ConvEval evaluation pipeline")
    parser.add_argument("--input", required=True, help="Path to JSON conversations file")
    parser.add_argument("--output", default="results.csv", help="Output CSV path")
    parser.add_argument("--domains", nargs="+", help="Domains to evaluate (default: all)")
    parser.add_argument("--facets", nargs="+", help="Specific facet IDs (default: all)")
    parser.add_argument("--model", default="", help="HuggingFace model name (leave empty for heuristic mode)")
    args = parser.parse_args()

    facets_df = load_and_preprocess_facets("data/Facets_Assignment.csv")
    pipeline = ConvEvalPipeline(facets_df=facets_df, model_name=args.model or None,
                                use_heuristic=not args.model)

    with open(args.input) as f:
        conversations = json.load(f)

    if not isinstance(conversations, list):
        conversations = [conversations]

    records = []
    for i, conv in enumerate(conversations):
        print(f"Evaluating {i+1}/{len(conversations)}: {conv.get('conversation_id', '?')}")
        result = pipeline.evaluate(conv, facet_ids=args.facets, domains=args.domains)
        for turn in result["turn_results"]:
            for fr in turn["facet_results"]:
                records.append({
                    "conversation_id": result["conversation_id"],
                    "conversation_type": result["conversation_type"],
                    "turn_id": turn["turn_id"],
                    "speaker": turn["speaker"],
                    "facet_id": fr["facet_id"],
                    "facet_name": fr["facet_name"],
                    "domain": fr["domain"],
                    "score": fr["score"],
                    "confidence": fr["confidence"],
                })

    df = pd.DataFrame(records)
    df.to_csv(args.output, index=False)
    print(f"\nSaved {len(df)} records to {args.output}")
    print(f"Mean score: {df['score'].mean():.3f}")
    print(f"Mean confidence: {df['confidence'].mean():.3f}")

if __name__ == "__main__":
    main()
