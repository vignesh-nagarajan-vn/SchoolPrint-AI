"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { searchClasses, resolveItem, pretty } from "@/lib/labels";

interface CorrectionBoxProps {
  /** Called with a resolved canonical class name when a valid item is submitted. */
  onSubmit: (item: string) => void;
  /** Bumped on any typing/selection so the kiosk's idle timer can restart. */
  onActivity?: () => void;
  disabled?: boolean;
}

export function CorrectionBox({
  onSubmit,
  onActivity,
  disabled = false,
}: CorrectionBoxProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const suggestions = React.useMemo(() => searchClasses(query, 6), [query]);
  const trimmed = query.trim();

  // Close the drop-up when clicking outside the box.
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setError(null);
    onActivity?.();
  }

  function select(item: string) {
    setQuery(pretty(item));
    setOpen(false);
    setError(null);
    onActivity?.();
  }

  function submit() {
    const resolved = resolveItem(query);
    if (resolved) {
      onSubmit(resolved);
    } else {
      setError("Error: No valid input class was entered.");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* drop-up list of matching classes */}
      {open && trimmed.length > 0 ? (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-50 max-h-60 overflow-auto rounded-lg border border-border bg-background shadow-lg">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <button
                key={item}
                type="button"
                // Keep input focus so the click registers before blur closes us.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-secondary"
              >
                {pretty(item)}
              </button>
            ))
          ) : (
            <p className="px-4 py-2.5 text-sm text-muted-foreground">
              The item could not be found
            </p>
          )}
        </div>
      ) : null}

      {/* textbox with embedded upload button */}
      <div className="relative">
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => trimmed.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled}
          placeholder="Enter the correct item…"
          className="h-14 w-full rounded-lg border-2 border-border bg-background pl-4 pr-16 text-base focus:border-black focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          aria-label="Submit correction"
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md bg-black text-white transition hover:bg-black/80 disabled:opacity-50"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
