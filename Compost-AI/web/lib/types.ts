// Shared types mirroring the inference backend's JSON contract (see
// Compost-AI/inference/app.py).

export type Pathway = "Recycling" | "Garbage" | "Compost";
export type PhysicalBin = "Garbage" | "Compost";

export interface PredictResult {
  prediction_id: string;
  item: string;
  item_label: string;
  pathway: Pathway;
  physical_bin: PhysicalBin;
  confidence: number; // 0..1
  low_confidence: boolean;
  corrected_by_memory: boolean;
  memory_similarity: number;
  model_item: string;
  model_item_label: string;
  gradcam: string; // base64 PNG (no data: prefix)
}

export interface FeedbackResult {
  status: string;
  correct_item: string;
  correct_item_label: string;
  pathway: Pathway;
  physical_bin: PhysicalBin;
  memory_size: number;
}
