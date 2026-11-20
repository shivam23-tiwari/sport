import { useEffect, useRef, useState } from 'react';

export function useScoreFlash(value?: string): boolean {
  const prevRef = useRef<string | undefined>(value);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (
      prevRef.current !== undefined &&
      value !== undefined &&
      prevRef.current !== value
    ) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 1250);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  return flashing;
}
