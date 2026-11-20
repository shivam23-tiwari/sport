import { useScoreFlash } from '../hooks/useScoreFlash';

interface ScoreFlashProps {
  value?: string;
  className?: string;
  placeholder?: string;
}

export default function ScoreFlash({ value, className = '', placeholder = '-' }: ScoreFlashProps) {
  const flashing = useScoreFlash(value);

  return (
    <span
      className={`font-mono tabular-nums inline-block px-1 transition-colors duration-200 ${
        flashing ? 'animate-score-flash text-rose-500 dark:text-rose-400' : ''
      } ${className}`}
    >
      {value ?? placeholder}
    </span>
  );
}
