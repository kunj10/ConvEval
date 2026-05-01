"""
Fine-tuning module for ConvEval.
Uses LoRA/QLoRA via PEFT for parameter-efficient fine-tuning of the base LLM.
Fine-tuning is OPTIONAL — the instruction-tuned base model is used by default.

Usage:
    python -m backend.models.finetune \
        --model Qwen/Qwen2-7B-Instruct \
        --data data/sample_scores.csv \
        --output checkpoints/conveval-lora

Scalability: Adding facets does NOT require retraining. The model learns a
general evaluation skill; new facets are handled via prompt routing at inference.
"""
from __future__ import annotations
import argparse, json, logging, os, random
from pathlib import Path
from dataclasses import dataclass, field

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class FinetuneArgs:
    model_name: str = "Qwen/Qwen2-7B-Instruct"
    data_path: str = "data/sample_scores.csv"
    output_dir: str = "checkpoints/conveval-lora"
    max_seq_length: int = 512
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 4
    gradient_accumulation_steps: int = 4
    learning_rate: float = 2e-4
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    seed: int = 42
    val_split: float = 0.1


def build_training_examples(df: pd.DataFrame, facets_df: pd.DataFrame) -> list[dict]:
    """Convert scored conversations into instruction fine-tuning format."""
    facet_map = facets_df.set_index("facet_id").to_dict("index")
    examples = []
    for _, row in df.iterrows():
        facet = facet_map.get(row["facet_id"], {})
        if not facet:
            continue
        prompt = (
            f"<|im_start|>system\nYou are a conversation quality evaluator. "
            f"Score the turn on the given facet and return JSON.<|im_end|>\n"
            f"<|im_start|>user\n"
            f"Facet: {facet.get('facet_name', '')} [{facet.get('domain', '')}]\n"
            f"Question: {facet.get('evaluation_question', '')}\n"
            f"Turn ({row.get('speaker','?')}): {row.get('text','')[:600]}<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )
        target = json.dumps({"score": int(row["score"]), "confidence": float(row["confidence"])})
        examples.append({"prompt": prompt, "target": target, "full": prompt + target + "<|im_end|>"})
    return examples


def train(args: FinetuneArgs):
    """
    Fine-tune with LoRA. Requires: peft, transformers, trl, bitsandbytes (optional).
    """
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments
        from peft import LoraConfig, get_peft_model, TaskType
        from trl import SFTTrainer
    except ImportError as e:
        logger.error("Fine-tuning deps missing: %s\nInstall: pip install peft trl bitsandbytes", e)
        return

    random.seed(args.seed)
    facets_df = pd.read_csv("data/Facets_Assignment.csv")
    scores_df = pd.read_csv(args.data_path)

    examples = build_training_examples(scores_df, facets_df)
    random.shuffle(examples)
    n_val = max(1, int(len(examples) * args.val_split))
    train_examples = examples[n_val:]
    val_examples = examples[:n_val]

    logger.info("Train: %d examples, Val: %d examples", len(train_examples), len(val_examples))

    tokenizer = AutoTokenizer.from_pretrained(args.model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.model_name,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
        task_type=TaskType.CAUSAL_LM,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    from datasets import Dataset
    train_dataset = Dataset.from_list([{"text": e["full"]} for e in train_examples])
    val_dataset = Dataset.from_list([{"text": e["full"]} for e in val_examples])

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.num_train_epochs,
        per_device_train_batch_size=args.per_device_train_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        learning_rate=args.learning_rate,
        fp16=True,
        logging_steps=50,
        save_strategy="epoch",
        evaluation_strategy="epoch",
        seed=args.seed,
        report_to="none",
        dataloader_num_workers=0,
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
    )

    logger.info("Starting fine-tuning...")
    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    logger.info("Saved fine-tuned model to %s", args.output_dir)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen2-7B-Instruct")
    parser.add_argument("--data", default="data/sample_scores.csv")
    parser.add_argument("--output", default="checkpoints/conveval-lora")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    parsed = parser.parse_args()
    train(FinetuneArgs(
        model_name=parsed.model,
        data_path=parsed.data,
        output_dir=parsed.output,
        num_train_epochs=parsed.epochs,
        seed=parsed.seed,
    ))
