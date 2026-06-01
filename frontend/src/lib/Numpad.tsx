import { memo, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Delete } from 'lucide-react';
import { applyNumpadKey, parseAmountNum } from './logAmount';

export interface NumpadHandle {
  getAmountNum: () => number;
  getAmountStr: () => string;
  clear: () => void;
  setAmount: (str: string) => void;
}

interface NumpadProps {
  onAmountChange: (amountStr: string, amountNum: number) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'] as const;

const Numpad = forwardRef<NumpadHandle, NumpadProps>(function Numpad({ onAmountChange }, ref) {
  const [amountStr, setAmountStr] = useState('');

  const emit = useCallback(
    (next: string) => {
      setAmountStr(next);
      onAmountChange(next, parseAmountNum(next));
    },
    [onAmountChange],
  );

  useImperativeHandle(ref, () => ({
    getAmountNum: () => parseAmountNum(amountStr),
    getAmountStr: () => amountStr,
    clear: () => emit(''),
    setAmount: (str: string) => emit(str),
  }));

  const handlePress = useCallback(
    (key: string) => {
      emit(applyNumpadKey(amountStr, key));
    },
    [amountStr, emit],
  );

  return (
    <div className="log-numpad relative z-20 shrink-0 select-none touch-none content-pad">
      <div className="log-numpad-handle" aria-hidden />
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`numpad-key text-white tabular-nums ${key === 'delete' ? 'numpad-key--action' : ''}`}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => handlePress(key)}
            aria-label={
              key === 'delete' ? 'Delete last digit' : key === '.' ? 'Decimal point' : `Digit ${key}`
            }
          >
            {key === 'delete' ? (
              <Delete className="w-[clamp(1rem,4.5vw,1.5rem)] h-[clamp(1rem,4.5vw,1.5rem)]" />
            ) : (
              key
            )}
          </button>
        ))}
      </div>
      {amountStr.length > 0 && (
        <button
          type="button"
          className="log-clear-btn"
          onClick={() => emit('')}
          aria-label="Clear amount"
        >
          Clear amount
        </button>
      )}
    </div>
  );
});

export default memo(Numpad);
