import { resolveHumorPolicy } from '@money-level/application';
import type { ProfileSettings } from '@money-level/contracts';

export function roastReportTitle(profile?: ProfileSettings): string {
  return resolveHumorPolicy(profile).profanity
    ? 'Разъеби мои финансы'
    : 'Разбор расходов';
}
