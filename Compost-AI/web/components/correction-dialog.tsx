"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resolveItem, searchClasses, pretty } from "@/lib/labels";

interface CorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (correctItem: string) => void;
  submitting?: boolean;
}

export function CorrectionDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
}: CorrectionDialogProps) {
  const [text, setText] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset and focus whenever the dialog reopens.
  React.useEffect(() => {
    if (open) {
      setText("");
      // Focus after the dialog's open animation so the caret lands correctly.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const resolved = resolveItem(text);
  const suggestions = resolved ? [] : searchClasses(text);
  const showInvalid = text.trim().length > 0 && !resolved && suggestions.length === 0;

  function submit() {
    if (resolved && !submitting) onConfirm(resolved);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>What was it actually?</DialogTitle>
          <DialogDescription>
            Type the correct item. It must be one of the 30 known classes — the
            bin remembers it and won&apos;t repeat the mistake.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (resolved) submit();
                else if (suggestions.length === 1) setText(pretty(suggestions[0]));
              }
            }}
            placeholder="e.g. Steel Food Cans"
            aria-invalid={showInvalid}
          />

          {/* Inline typing hints (tap to fill) — not a dropdown selector. */}
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setText(pretty(c))}
                  className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {pretty(c)}
                </button>
              ))}
            </div>
          ) : null}

          {resolved ? (
            <p className="pt-1 text-sm text-primary">
              ✓ {pretty(resolved)}
            </p>
          ) : null}
          {showInvalid ? (
            <p className="pt-1 text-sm text-destructive">
              Not a known class. Keep typing or check the spelling.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!resolved || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Teach the bin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
