import { useEffect } from 'react';

interface SaveCelebrationProps {
  show: boolean;
  onDone: () => void;
}

export default function SaveCelebration({ show, onDone }: SaveCelebrationProps) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="save-celebration" aria-hidden>
      <div className="save-celebration-ring" />
      <span className="save-celebration-check">✓</span>
      {['', 'spark-1', 'spark-2', 'spark-3', 'spark-4', 'spark-5', 'spark-6'].map((cls, i) => (
        <span key={i} className={`save-spark ${cls}`} />
      ))}
    </div>
  );
}
