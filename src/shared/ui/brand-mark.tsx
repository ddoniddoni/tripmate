type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <span className="brand-mark" aria-label="TripMate">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="img">
          <path d="M7 7.5 16 4l9 3.5v14.8L16 28l-9-5.7V7.5Z" />
          <path d="m11 11 5 3 5-3M16 14v9" />
        </svg>
      </span>
      {compact ? null : <span>TripMate</span>}
    </span>
  );
}
