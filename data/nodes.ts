import { COUNTRIES, COUNTRY_MAP } from "@/data/countries";
import { WATERS, WATER_MAP, isWater } from "@/data/waters";
import { CAPITALS } from "@/data/capitals";

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

/** Capitals mode: type the capital, it stands for its country. Other capitals count too. */
export const CAPITAL_OPTIONS: GuessOption[] = COUNTRIES.filter((c) => CAPITALS[c.code]).map((c) => ({
  code: c.code,
  name: CAPITALS[c.code].capital,
  aliases: CAPITALS[c.code].aliases,
}));

export function guessOptions(ocean: boolean, capitals = false): GuessOption[] {
  const land = capitals ? CAPITAL_OPTIONS : COUNTRY_OPTIONS;
  return ocean ? [...land, ...WATER_OPTIONS] : land;
}

export function nodeName(code: string): string {
  return COUNTRY_MAP.get(code)?.name ?? WATER_MAP.get(code)?.name ?? code;
}

/** What a stop is called in the current mode: its capital in capitals mode (seas keep their names). */
export function displayName(code: string, capitals: boolean): string {
  if (capitals && CAPITALS[code]) return CAPITALS[code].capital;
  return nodeName(code);
}

export { isWater };
