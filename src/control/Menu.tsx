import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

const CloseContext = createContext<() => void>(() => {});
const MenuContext = createContext<() => void>(() => {});

export function MenuButton({
  label = 'More options',
  children,
  icon,
  className,
  align = 'right',
}: {
  label?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition',
          'hover:bg-[#efece4] hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15',
          open && 'bg-[#efece4] text-ink',
        )}
      >
        {icon ?? <MoreHorizontal size={18} />}
      </button>
      {open ? (
        <MenuContext.Provider value={() => setOpen(false)}>
          <div
            role="menu"
            className={cn(
              'absolute top-full z-50 mt-1.5 min-w-52 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_18px_50px_rgba(32,37,31,0.16)]',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {children}
          </div>
        </MenuContext.Provider>
      ) : null}
    </div>
  );
}

export function MenuItem({
  children,
  icon,
  onSelect,
  danger,
  disabled,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        close();
        onSelect();
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition',
        danger ? 'text-danger hover:bg-[#fdf3f0]' : 'text-ink hover:bg-[#f4f1ea]',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-line" />;
}
