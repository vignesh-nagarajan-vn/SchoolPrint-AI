"use client";

import * as React from "react";

import { CorrectionBox } from "@/components/correction-box";
import type { PredictResult, PhysicalBin } from "@/lib/types";

interface ResultViewProps {
  result: PredictResult;
  submitting: boolean;
  onSubmitCorrection: (item: string) => void;
  onActivity?: () => void;
}

const BIN_COLOR: Record<PhysicalBin, string> = {
  Garbage: "#5fa55a",
  Compost: "#826d4c",
};

export function ResultView({
  result,
  submitting,
  onSubmitCorrection,
  onActivity,
}: ResultViewProps) {
  const confidencePct = Math.round(result.confidence * 100);
  const heatmap = result.gradcam ? `data:image/png;base64,${result.gradcam}` : "";
  const binLabel = `${result.physical_bin.toUpperCase()} BIN`;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-background">
      {/* LEFT: full-bleed Grad-CAM heatmap */}
      <div className="relative h-full flex-1 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heatmap} alt="AI view" className="h-full w-full object-cover" />
      </div>

      {/* RIGHT: determination panel */}
      <div className="flex h-full w-[40%] min-w-[360px] max-w-[480px] flex-col border-l border-border p-8">
        {/* bin block — larger, no header above it */}
        <div
          className="flex flex-1 items-center justify-center rounded-xl"
          style={{ backgroundColor: BIN_COLOR[result.physical_bin], maxHeight: "20%" }}
        >
          <p className="text-4xl font-bold tracking-wide text-white">{binLabel}</p>
        </div>

        {/* item name */}
        <p className="mt-5 text-sm uppercase tracking-widest text-foreground">
          <span className="font-bold">Identified object:</span> {result.item_label}
        </p>

        {/* confidence progress bar */}
        <div className="mt-2">
          <div className="mb-1 flex justify-end">
            <span className="text-xs font-bold text-foreground">{confidencePct}% confident</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#d1d5db]">
            <div
              className="h-full rounded-full bg-black"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        {/* correction — pinned to the bottom */}
        <div className="mt-auto pt-6">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Compost AI boasts an accuracy of ~96%, but it can be wrong sometimes.
            If you believe Compost AI confused the item you disposed with something
            else, please correct us below. Your input teaches Compost AI not to
            make the same mistake again.
          </p>
          <CorrectionBox
            onSubmit={onSubmitCorrection}
            onActivity={onActivity}
            disabled={submitting}
          />
        </div>
      </div>
    </div>
  );
}
