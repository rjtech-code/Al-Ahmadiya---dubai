'use client';

import { UploadCloud } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';

/** Drag-and-drop (or click) file picker. */
export function DropZone({ accept, onFile, label, hint, children, className, disabled }: {
  accept: string; onFile: (f: File) => void; label: string; hint?: string; children?: ReactNode; className?: string; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = (f?: File | null) => { if (f && !disabled) onFile(f); };
  return (
    <div
      role="button" tabIndex={0} aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
      className={cn('flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-5 text-center text-sm transition',
        over ? 'border-brand-700 bg-brand-50' : 'border-gold-300 bg-white hover:border-gold-500', disabled && 'cursor-not-allowed opacity-50', className)}>
      {children ?? <UploadCloud className="size-7 text-gold-600" aria-hidden />}
      <span className="font-semibold text-brand-900">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
