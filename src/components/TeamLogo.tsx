import { useState } from 'react';

interface TeamLogoProps {
  src?: string;
  name: string;
  shortName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-sm',
};

const BG_PALETTE = [
  'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
];

function getInitials(name: string, shortName?: string): string {
  if (shortName && shortName.length <= 4) return shortName.toUpperCase();
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 3).toUpperCase() || 'TM';
}

export default function TeamLogo({ src, name, shortName, size = 'sm' }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const idx = name.length % BG_PALETTE.length;
    return (
      <div
        className={`${SIZE_CLASSES[size]} ${BG_PALETTE[idx]} rounded-lg flex items-center justify-center font-mono font-bold shrink-0 border border-slate-300/70 dark:border-slate-700/70 select-none`}
        title={name}
      >
        {getInitials(name, shortName)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${SIZE_CLASSES[size]} object-contain shrink-0 rounded-sm`}
    />
  );
}
