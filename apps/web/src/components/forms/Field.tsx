import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../ui/cn';

export const inputClass =
  'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-red-100 disabled:bg-cream-200';

export function Field({ label, error, hint, required, children, htmlFor, className }: {
  label: string; error?: string; hint?: string; required?: boolean; children: ReactNode; htmlFor: string; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-brand-900">
        {label} {required && <span className="text-danger" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, 'h-auto min-h-32 py-2.5', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, className)} {...props} />;
}

export function FormAlert({ tone = 'danger', children }: { tone?: 'danger' | 'success' | 'info'; children: ReactNode }) {
  const tones = { danger: 'border-red-200 bg-red-50 text-danger', success: 'border-emerald-200 bg-emerald-50 text-success', info: 'border-gold-200 bg-gold-100/60 text-brand-900' };
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-md border px-4 py-3 text-sm', tones[tone])}>{children}</div>;
}
