import { COUNTRIES, COUNTRY_MAP } from "@/data/countries";
import { WATERS, WATER_MAP, isWater } from "@/data/waters";

/** Anything you can type in: a country, or (with ocean crossings on) a sea/ocean. */
export interface GuessOption {
  code: string;
  name: string;
  aliases?: string[];
  water?: boolean;
}

export const COUNTRY_OPTIONS: GuessOption[] = COUNTRIES.map((c) => ({ code: c.code, name: c.name }));
export const WATER_OPTIONS: GuessOption[] = WATERS.map((w) => ({
  code: w.code,
  name: w.name,
  aliases: w.aliases,
  water: true,
}));

export function guessOptions(ocean: boolean): GuessOption[] {
  return ocean ? [...COUNTRY_OPTIONS, ...WATER_OPTIONS] : COUNTRY_OPTIONS;
}

export function nodeName(code: string): string {
  return COUNTRY_MAP.get(code)?.name ?? WATER_MAP.get(code)?.name ?? code;
}

export { isWater };
