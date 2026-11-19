import { systemClock } from '@money-level/contracts';
import type { Clock } from '@money-level/contracts';
import type {
  DomainEvent,
  ProfileSettings,
  RandomSource,
} from '@money-level/contracts';
import type { MemePack, MemeRule } from './pack.js';

export interface ShownReaction {
  packId: string;
  ruleId: string;
  shownAt: string;
  sessionId: string;
  rarity: MemeRule['rarity'];
}

interface Evaluation {
  sessionId?: string;
  rareChance?: number;
  frequency?: ProfileSettings['humorFrequency'];
  history?: readonly ShownReaction[];
  clock?: Clock;
  event: DomainEvent;
  mode: ProfileSettings['humorMode'];
  profanity: boolean;
  locale: 'ru-RU' | 'en-US';
  random: RandomSource;
}

export interface MemeReaction {
  packId: string;
  packVersion: string;
  ruleId: string;
  text: string;
  fallbackText: string;
  emotion: MemeRule['emotion'];
  rarity: MemeRule['rarity'];
  displayMs: number;
  assetKey?: string;
}

function matches(rule: MemeRule, input: Evaluation): boolean {
  const { event, mode, profanity } = input;
  if (
    mode === 'off' ||
    !rule.modes.includes(mode) ||
    !rule.triggers.includes(event.type)
  )
    return false;
  if (rule.profanity && !profanity) return false;
  const { categoryIds, amountBand } = rule.predicates ?? {};
  if (
    categoryIds &&
    (!event.payload.categoryId ||
      !categoryIds.includes(event.payload.categoryId))
  )
    return false;
  return !amountBand || amountBand === event.payload.amountBand;
}

function draw(random: RandomSource): number {
  const value = random.next();
  if (!(value >= 0 && value < 1))
    throw new RangeError('RandomSource must yield a value in [0, 1).');
  return value;
}

function choose(
  rules: readonly MemeRule[],
  random: RandomSource,
): MemeRule | undefined {
  if (!rules.length) return undefined;
  let cursor = draw(random) * rules.reduce((sum, rule) => sum + rule.weight, 0);
  for (const rule of rules) {
    cursor -= rule.weight;
    if (cursor < 0) return rule;
  }
  return rules.at(-1);
}

export function evaluateMeme(
  pack: MemePack,
  input: Evaluation,
): MemeReaction | undefined {
  const frequency = input.frequency ?? 'usual';
  if (frequency === 'off' || input.mode === 'off') return undefined;
  const history = input.history ?? [];
  const now = (input.clock ?? systemClock).now().getTime();
  const globalDelay = frequency === 'rare' ? 300_000 : 90_000;
  if (history.some((item) => now - Date.parse(item.shownAt) < globalDelay))
    return undefined;

  const eligible = pack.rules.filter(
    (rule) =>
      matches(rule, input) &&
      !history.some(
        (item) =>
          item.packId === pack.id &&
          item.ruleId === rule.id &&
          now - Date.parse(item.shownAt) < rule.cooldownMs,
      ),
  );
  if (eligible.length > 0 && frequency === 'rare' && draw(input.random) >= 0.25)
    return undefined;

  const rareChance = input.rareChance ?? 0.01;
  if (!(rareChance >= 0 && rareChance <= 1))
    throw new RangeError('The rare chance must be in [0, 1].');
  const rare = eligible.filter((rule) => rule.rarity === 'rare');
  const canShowRare =
    input.sessionId &&
    rare.length > 0 &&
    !history.some(
      (item) => item.rarity === 'rare' && item.sessionId === input.sessionId,
    );
  const selected =
    canShowRare && draw(input.random) < rareChance
      ? choose(rare, input.random)
      : choose(
          eligible.filter((rule) => rule.rarity === 'normal'),
          input.random,
        );
  if (!selected) return undefined;
  return {
    packId: pack.id,
    packVersion: pack.version,
    ruleId: selected.id,
    text: selected.text[input.locale] ?? selected.fallbackText,
    fallbackText: selected.fallbackText,
    emotion: selected.emotion,
    rarity: selected.rarity,
    displayMs: selected.displayMs,
    ...(selected.assetKey ? { assetKey: selected.assetKey } : {}),
  };
}
