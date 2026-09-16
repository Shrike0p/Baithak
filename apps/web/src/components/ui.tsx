import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** Rotated stamp tile + wordmark. Straightens slightly on hover. */
export function Logo({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} aria-label="Scene home" className="group flex items-center gap-2">
      <span className="flex size-9 rotate-[-3deg] items-center justify-center border-2 border-foreground bg-primary font-display text-xl shadow-stamp-sm transition-transform group-hover:rotate-2">
        S
      </span>
      {!compact && <span className="font-display text-xl">SCENE</span>}
    </Link>
  );
}

export function MetaLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`meta-label ${className}`}>{children}</span>;
}

/** Small outlined pill — category tags, trust signals, roles. */
export function Pill({
  children,
  tone = "plain",
  className = "",
}: {
  children: ReactNode;
  tone?: "plain" | "orange" | "purple" | "green" | "muted";
  className?: string;
}) {
  const tones = {
    plain: "bg-background",
    orange: "bg-primary text-primary-foreground",
    purple: "bg-secondary text-secondary-foreground",
    green: "bg-accent text-accent-foreground",
    muted: "bg-muted",
  };

  return (
    <span
      className={`meta-label inline-flex items-center gap-1 rounded-full border border-foreground px-2.5 py-1 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border-2 border-foreground font-bold uppercase cursor-pointer transition-[transform,box-shadow,background-color,color] duration-150 active:translate-x-0.5 active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const BUTTON_VARIANTS = {
  primary:
    "bg-primary text-primary-foreground shadow-stamp hover:-translate-y-0.5 hover:shadow-stamp-lg",
  secondary:
    "bg-secondary text-secondary-foreground shadow-stamp hover:-translate-y-0.5 hover:shadow-stamp-lg",
  outline: "bg-background shadow-stamp-sm hover:bg-muted",
};

const BUTTON_SIZES = {
  sm: "h-11 px-5 py-2 text-sm",
  md: "h-12 px-8 text-base",
  icon: "size-12",
};

export function Button({
  children,
  href,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
  disabled?: boolean;
}) {
  const classes = `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

/** Chunky bordered card with hard offset shadow. */
export function PaperCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`paper-card rounded-sm ${className}`}>{children}</div>;
}

export function SectionTitle({
  kicker,
  title,
  action,
  href,
}: {
  kicker?: string;
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {kicker && <p className="meta-label mb-2 text-primary">{kicker}</p>}
        <h2 className="text-2xl uppercase leading-none md:text-3xl">{title}</h2>
      </div>
      {action && (
        <Link
          href={href ?? "#"}
          className="meta-label flex shrink-0 items-center gap-1 border-b-2 border-foreground"
        >
          {action}
          <ChevronRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
