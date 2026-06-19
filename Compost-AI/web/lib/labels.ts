// Mirror of the backend's 30 classes + disposal map, used to populate the
// "pick the correct item" dialog when a user marks a prediction wrong.
// Keep in sync with Compost-AI/inference/labels.py.

import type { Pathway } from "./types";

export const DISPOSAL_MAP: Record<string, Pathway> = {
  aerosol_cans: "Recycling",
  aluminum_soda_cans: "Recycling",
  aluminum_food_cans: "Recycling",
  steel_food_cans: "Recycling",
  cardboard_boxes: "Recycling",
  cardboard_packaging: "Recycling",
  glass_beverage_bottles: "Recycling",
  glass_cosmetic_containers: "Recycling",
  glass_food_jars: "Recycling",
  plastic_detergent_bottles: "Recycling",
  plastic_soda_bottles: "Recycling",
  plastic_water_bottles: "Recycling",
  plastic_food_containers: "Recycling",
  newspaper: "Recycling",
  office_paper: "Recycling",
  magazines: "Recycling",
  paper_cups: "Recycling",
  styrofoam_cups: "Garbage",
  styrofoam_food_containers: "Garbage",
  plastic_shopping_bags: "Garbage",
  plastic_straws: "Garbage",
  plastic_cup_lids: "Garbage",
  plastic_trash_bags: "Garbage",
  disposable_plastic_cutlery: "Garbage",
  clothing: "Garbage",
  shoes: "Garbage",
  food_waste: "Compost",
  coffee_grounds: "Compost",
  eggshells: "Compost",
  tea_bags: "Compost",
};

export const CLASS_NAMES = Object.keys(DISPOSAL_MAP).sort();

export function pretty(item: string): string {
  return item
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Class names grouped by pathway, for a tidy grouped <Select>.
export const CLASSES_BY_PATHWAY: Record<Pathway, string[]> = {
  Compost: CLASS_NAMES.filter((c) => DISPOSAL_MAP[c] === "Compost"),
  Recycling: CLASS_NAMES.filter((c) => DISPOSAL_MAP[c] === "Recycling"),
  Garbage: CLASS_NAMES.filter((c) => DISPOSAL_MAP[c] === "Garbage"),
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_]+/g, " ").trim();
}

// Resolve free-typed text to a canonical class name, or null if it doesn't
// match one of the 30 classes. Matches against both the raw snake_case name and
// the pretty form, case- and separator-insensitive.
export function resolveItem(input: string): string | null {
  const q = normalize(input);
  if (!q) return null;
  return (
    CLASS_NAMES.find(
      (c) => normalize(c) === q || normalize(pretty(c)) === q
    ) ?? null
  );
}

// Up to `limit` class names whose pretty form contains the query — used to show
// inline typing hints (not a dropdown selection widget).
export function searchClasses(query: string, limit = 6): string[] {
  const q = normalize(query);
  if (!q) return [];
  const starts = CLASS_NAMES.filter((c) => normalize(pretty(c)).startsWith(q));
  const contains = CLASS_NAMES.filter(
    (c) => !starts.includes(c) && normalize(pretty(c)).includes(q)
  );
  return [...starts, ...contains].slice(0, limit);
}
