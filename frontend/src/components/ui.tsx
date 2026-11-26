import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type AllHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ImageOff, LoaderCircle, MapPin, Star, X } from 'lucide-react';
import { avatarGradient, initials } from '../utils/format';

/* ───────────── Glass ───────────── */

type GlassProps = {
  as?: ElementType;
  strong?: boolean;
  lg?: boolean;
  interactive?: boolean;
  /** Repassado quando `as` é um Link do React Router. */
  to?: string;
} & AllHTMLAttributes<HTMLElement>;

/**
 * Superfície Liquid Glass. O brilho interno acompanha o ponteiro, como a luz
 * refletida numa lâmina de vidro que se move.
 */
export const Glass = forwardRef<HTMLElement, GlassProps>(function Glass(
  { as, strong, lg, interactive, className = '', onPointerMove, ...rest },
  ref,
) {
  const Tag = (as ?? 'div') as ElementType;
  const handleMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      onPointerMove?.(event);
    },
    [onPointerMove],
  );
  const classes = [
    'glass',
    strong && 'glass-strong',
    lg && 'glass-lg',
    interactive && 'glass-interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <Tag ref={ref} className={classes} onPointerMove={handleMove} {...rest} />;
});

/* ───────────── Spinner ───────────── */

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <span role="status" className="row gap-2 secondary">
      <LoaderCircle className="spinner" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="row" style={{ justifyContent: 'center', padding: '120px 0' }}>
      <Spinner />
    </div>
  );
}

/* ───────────── Sheet (modal) ───────────── */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Sheet({ open, onClose, title, subtitle, children, footer, wide }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      const alvo =
        panelRef.current?.querySelector<HTMLElement>('[autofocus], input, select, textarea') ??
        panelRef.current;
      alvo?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Glass
        strong
        lg
        ref={panelRef as React.Ref<HTMLElement>}
        className={`sheet ${wide ? 'sheet-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="sheet-header">
          <div className="stack gap-1">
            <h2 id={titleId} className="title-3">
              {title}
            </h2>
            {subtitle && <div className="subhead secondary">{subtitle}</div>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-footer">{footer}</footer>}
      </Glass>
    </div>,
    document.body,
  );
}

/* ───────────── Avatar ───────────── */

export function Avatar({
  name,
  seed,
  size = 36,
  title,
}: {
  name: string;
  seed: number | string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className="avatar"
      style={{ ['--size' as string]: `${size}px`, background: avatarGradient(seed) }}
      title={title ?? name}
      aria-hidden={title ? undefined : true}
    >
      {initials(name)}
    </span>
  );
}

/* ───────────── Foto com fallback ───────────── */

export function Photo({
  src,
  alt,
  className = '',
  style,
  eager,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`media ${className}`} style={style}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="media-fallback" role="img" aria-label={alt}>
          {src ? <ImageOff /> : <MapPin />}
        </div>
      )}
    </div>
  );
}

/* ───────────── Estrelas ───────────── */

export function Stars({ value, label }: { value: number; label?: string }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" role="img" aria-label={label ?? `${value.toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} fill={n <= rounded ? 'currentColor' : 'none'} strokeWidth={1.8} />
      ))}
    </span>
  );
}

export function StarsInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="stars-input row gap-1" role="radiogroup" aria-label="Nota">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(n)}
        >
          <Star fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}

/* ───────────── Campo ───────────── */

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
};

export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/* ───────────── Estado vazio ───────────── */

export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3 className="title-3">{title}</h3>
      {children && <p className="secondary" style={{ maxWidth: 420 }}>{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ───────────── Controle segmentado ───────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ───────────── Botão com carregamento ───────────── */

export const LoadingButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { loading?: boolean }
>(function LoadingButton({ loading, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <LoaderCircle className="spinner" aria-hidden />}
      {children}
    </button>
  );
});

/* ───────────── Popover com clique fora ───────────── */

export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onCloseRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return ref;
}
