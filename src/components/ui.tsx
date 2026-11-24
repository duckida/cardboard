import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── Buttons ────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-sm hover:bg-[#0b655c] active:bg-[#0a574f]',
  secondary:
    'border border-line bg-white text-ink hover:border-[#d6d0c2] hover:bg-[#fbfaf7] active:bg-[#f3f0e9]',
  ghost: 'text-muted hover:bg-[#f1eee7] hover:text-ink',
  danger:
    'border border-[#efd5ce] bg-[#fdf3f0] text-danger hover:bg-[#fbe8e3] active:bg-[#f8ddd5]',
  quiet: 'text-muted hover:text-ink',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-xl px-3 text-[13px]',
  md: 'h-11 gap-2 rounded-2xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-2xl px-5 text-[15px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors',
        'hover:bg-[#f1eee7] hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15',
        'disabled:pointer-events-none disabled:opacity-35',
        className,
      )}
      {...props}
    />
  );
}

// ── Form controls ──────────────────────────────────────────────────────────

const FIELD_BASE =
  'w-full rounded-xl border border-line bg-white text-ink outline-none transition placeholder:text-[#a9a79f] focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:opacity-60';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, 'h-11 px-3.5 text-sm', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_BASE, 'min-h-24 resize-y px-3.5 py-3 text-sm leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          FIELD_BASE,
          'h-11 cursor-pointer appearance-none py-0 pl-3.5 pr-9 text-sm',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      >
        <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15',
        checked ? 'bg-accent' : 'bg-[#dcd7cb]',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-6' : 'left-1',
        )}
      />
    </button>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {description ? <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function Field({
  label,
  help,
  children,
  className,
}: {
  label?: string;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <div className="text-[13px] font-semibold text-ink">{label}</div> : null}
      {children}
      {help ? <p className="text-[12px] leading-snug text-muted">{help}</p> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex gap-1 rounded-2xl border border-line bg-[#f4f1ea] p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition',
              active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="text-[13px] font-medium tabular-nums text-muted">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
      {help ? <p className="text-[12px] leading-snug text-muted">{help}</p> : null}
    </div>
  );
}

// ── Surfaces ───────────────────────────────────────────────────────────────

export function Panel({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}) {
  return (
    <Tag className={cn('rounded-3xl border border-line bg-white shadow-[0_1px_2px_rgba(32,37,31,0.04)]', className)}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'accent';
  className?: string;
}) {
  const tones = {
    neutral: 'border-line bg-[#f4f1ea] text-muted',
    green: 'border-[#c7e6d7] bg-[#eef8f2] text-[#246b4b]',
    amber: 'border-[#efdfb9] bg-[#fdf8ea] text-[#8a6516]',
    red: 'border-[#efd5ce] bg-[#fdf3f0] text-danger',
    blue: 'border-[#cfdef2] bg-[#f1f6fd] text-[#315f93]',
    accent: 'border-[#bfe2d8] bg-accent-soft text-[#0b655c]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-[#faf8f3] px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <div className="font-display text-lg font-semibold text-ink">{title}</div>
      {body ? <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-line', className)} />;
}

export function helpTextClass() {
  return 'text-[12px] leading-relaxed text-muted';
}

// ── Overlays ───────────────────────────────────────────────────────────────

function useLockedBody(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useLockedBody(open);
  useEscape(open, onClose);
  if (!open) return null;

  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return createPortal(
    <div className="cb-control fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-[#20251f]/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-white shadow-[0_24px_80px_rgba(32,37,31,0.22)] sm:rounded-[28px]',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X size={18} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-[#faf8f3] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useLockedBody(open);
  useEscape(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="cb-control fixed inset-0 z-[110] flex items-end sm:items-stretch sm:justify-end">
      <div
        className="absolute inset-0 bg-[#20251f]/30 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-white shadow-[0_-12px_50px_rgba(32,37,31,0.18)]',
          'sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-[28px] sm:shadow-[-16px_0_60px_rgba(32,37,31,0.14)]',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-1">
            <X size={18} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-line bg-[#faf8f3] px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
