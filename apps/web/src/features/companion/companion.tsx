import type { MemeEmotion } from '@money-level/meme-engine';
import { useState } from 'react';
import './companion.css';

export function Companion({
  emotion = 'idle',
  message = 'На связи. Что запишем?',
  fallback = 'Компаньон на связи.',
  asset,
}: {
  emotion?: MemeEmotion;
  message?: string;
  fallback?: string;
  asset?: string;
}) {
  const [broken, setBroken] = useState<string>();
  const useAsset = asset && broken !== asset;

  return (
    <figure className="companion" aria-label="Компаньон" data-emotion={emotion}>
      {useAsset ? (
        <img
          src={asset}
          alt=""
          width={84}
          height={84}
          onError={() => setBroken(asset)}
        />
      ) : (
        <span className="companion-shape" aria-hidden="true">
          <span className="companion-antenna" />
          <span className="companion-eyes">
            <i />
            <i />
          </span>
          <span className="companion-mouth" />
        </span>
      )}
      <figcaption>{asset && !useAsset ? fallback : message}</figcaption>
    </figure>
  );
}
