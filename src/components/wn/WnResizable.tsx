import React, { useMemo, useRef, useState } from 'react';

export type WnResizableDirection = 'horizontal' | 'vertical';

export type WnResizableProps = {
  direction?: WnResizableDirection;
  sizePx: number;
  minPx: number;
  maxPx: number;
  invert?: boolean;
  isDisabled?: boolean;
  ariaLabel?: string;
  stepPx?: number;
  className?: string;
  onSizePxChange: (nextSizePx: number) => void;
};

type DragState = {
  pointerId: number;
  startClient: number;
  startSize: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Why: Provide a single, reusable resize-handle interaction (panels/splits) with
 * token-driven visuals and controlled sizing (state lives in the caller/store).
 */
export function WnResizable({
  direction = 'horizontal',
  sizePx,
  minPx,
  maxPx,
  invert = false,
  isDisabled = false,
  ariaLabel = 'Resize',
  stepPx = 16,
  className,
  onSizePxChange,
}: WnResizableProps) {
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const ariaOrientation = direction === 'vertical' ? 'vertical' : 'horizontal';
  const handleClass = useMemo(() => {
    const orientationClass = direction === 'vertical' ? 'wn-resize-handle--vertical' : '';
    const draggingClass = isDragging ? 'wn-resize-handle--dragging' : '';
    return ['wn-resize-handle', orientationClass, draggingClass, className].filter(Boolean).join(' ');
  }, [className, direction, isDragging]);

  const applyDelta = (delta: number) => {
    const signed = invert ? -delta : delta;
    const next = clamp(sizePx + signed, minPx, maxPx);
    onSizePxChange(next);
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (isDisabled) return;
    const startClient = direction === 'vertical' ? e.clientY : e.clientX;
    dragRef.current = { pointerId: e.pointerId, startClient, startSize: sizePx };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const current = direction === 'vertical' ? e.clientY : e.clientX;
    const delta = current - drag.startClient;
    const signed = invert ? -delta : delta;
    const next = clamp(drag.startSize + signed, minPx, maxPx);
    onSizePxChange(next);
  };

  const stopDrag: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore (best-effort)
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (isDisabled) return;
    if (direction === 'horizontal') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        applyDelta(-stepPx);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        applyDelta(stepPx);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      applyDelta(-stepPx);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      applyDelta(stepPx);
    }
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={ariaOrientation}
      tabIndex={isDisabled ? -1 : 0}
      className={handleClass}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onKeyDown={onKeyDown}
    />
  );
}

