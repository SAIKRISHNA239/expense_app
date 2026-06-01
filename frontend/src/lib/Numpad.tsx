import { memo, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Delete } from 'lucide-react';

export interface NumpadHandle {
  getAmountNum: () => number;
  clear: () => void;
}

interface NumpadProps {
  onAmountChange: (amountStr: string, amountNum: number) => void;
}

const Numpad = forwardRef<NumpadHandle, NumpadProps>(function Numpad({ onAmountChange }, ref) {
  const [amountStr, setAmountStr] = useState('');

  useImperativeHandle(ref, () => ({
    getAmountNum: () => parseFloat(amountStr) || 0,
    clear: () => {
      setAmountStr('');
      onAmountChange('', 0);
    },
  }));

  const update = useCallback(
    (next: string) => {
      setAmountStr(next);
      onAmountChange(next, parseFloat(next) || 0);
    },
    [onAmountChange],
  );

  const handlePress = useCallback(
    (key: string) => {
      if (key === 'delete') {
        update(amountStr.slice(0, -1));
      } else if (key === '.') {
        if (amountStr.includes('.')) return;
        update(amountStr === '' ? '0.' : amountStr + '.');
      } else {
        update(amountStr === '0' ? key : amountStr + key);
      }
    },
    [amountStr, update],
  );

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'] as const;

  return (
    <div className="log-numpad relative z-20 shrink-0 select-none touch-none content-pad pt-2 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className="numpad-key text-white tabular-nums"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => handlePress(key)}
          >
            {key === 'delete' ? (
              <Delete className="w-[clamp(1rem,4.5vw,1.5rem)] h-[clamp(1rem,4.5vw,1.5rem)] text-zinc-400" />
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </div>
  );
});

export default memo(Numpad);
