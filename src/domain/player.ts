import type { Player } from "./types";

export const CATEGORIES = ["Sub-14", "Sub-16", "Sub-18", "Adulto"] as const;
export type PlayerCategory = (typeof CATEGORIES)[number];

export const POSITIONS = ["Punta", "Opuesto", "Central", "Armadora", "Líbero"] as const;
export type PlayerPosition = (typeof POSITIONS)[number];

export type PlayerDraft = Omit<Player, "id" | "aliases">;

const YOUTH_CATEGORIES: readonly PlayerCategory[] = ["Sub-14", "Sub-16", "Sub-18"];

export function isYouth(player: Pick<Player, "category">): boolean {
  if (!player.category) return false;
  return YOUTH_CATEGORIES.includes(player.category);
}

export function assertValid(draft: PlayerDraft): void {
  if (draft.name.trim() === "") {
    throw new Error("El nombre es obligatorio.");
  }
  if (draft.number.trim() === "") {
    throw new Error("El número es obligatorio.");
  }
  if (isYouth(draft)) {
    if ((draft.guardianName ?? "").trim() === "") {
      throw new Error("Para un jugador Sub-18 el nombre del tutor es obligatorio.");
    }
    if ((draft.guardianPhone ?? "").trim() === "") {
      throw new Error("Para un jugador Sub-18 el teléfono del tutor es obligatorio.");
    }
  }
}
