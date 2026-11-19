import type { CurrencyCode } from '@money-level/contracts';
import { formatMoney } from '@money-level/finance-core';
import type { RoastCard } from '@money-level/meme-engine';

export function roastCardCaption(
  card: RoastCard,
  currency: CurrencyCode,
  showFigures: boolean,
): string {
  switch (card.kind) {
    case 'total':
      return showFigures
        ? formatMoney(card.amountMinor, currency)
        : 'Итоги расходов';
    case 'frequency':
      return showFigures
        ? new Intl.NumberFormat('ru-RU').format(card.count)
        : 'Записи в журнале';
    case 'category':
      return showFigures
        ? card.category + ' · ' + formatMoney(card.amountMinor, currency)
        : 'Категория с наибольшими расходами';
    case 'comparison':
      return showFigures
        ? formatMoney(card.currentMinor, currency) +
            ' сейчас · ' +
            formatMoney(card.priorMinor, currency) +
            ' ранее'
        : 'Сравнение расходов по периодам';
    default:
      return 'Разбор расходов';
  }
}

function drawLines(
  context: CanvasRenderingContext2D,
  text: string,
  top: number,
  lineHeight: number,
): void {
  const width = 840;
  let line = '';
  let y = top;
  for (const word of text.split(/ +/u)) {
    const next = line ? line + ' ' + word : word;
    if (line && context.measureText(next).width > width) {
      context.fillText(line, 120, y, width);
      y += lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) context.fillText(line, 120, y, width);
}

export function createRoastPng(title: string, caption: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Canvas is unavailable.'));
      return;
    }
    context.fillStyle = '#181524';
    context.fillRect(0, 0, 1080, 1080);
    context.strokeStyle = '#a391e0';
    context.lineWidth = 3;
    context.strokeRect(60, 60, 960, 960);
    context.fillStyle = '#cdbfff';
    context.fillRect(120, 215, 110, 8);
    context.font = 'bold 45px system-ui, sans-serif';
    context.fillText('Money Level', 120, 170);
    context.fillStyle = '#f8f5ff';
    context.font = 'bold 74px system-ui, sans-serif';
    drawLines(context, title, 425, 91);
    context.fillStyle = '#e2d8ff';
    context.font = '46px system-ui, sans-serif';
    drawLines(context, caption, 815, 59);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not generate PNG.'));
    }, 'image/png');
  });
}
