'use client';

interface Props {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PixelPanel({ title, children, className = '' }: Props) {
  return (
    <div className={`pixel-panel ${className}`}>
      {title && <div className="pixel-panel-title">{title}</div>}
      {children}
    </div>
  );
}
