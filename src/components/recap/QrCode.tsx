import type { JSX } from 'react';
import { encode } from 'uqr';

interface QrCodeProps {
  value: string;
  size: number;
  title?: string | undefined;
}

/**
 * Code QR en SVG, sans état ni hook : sert dans la page comme dans l'image à partager
 * (`next/og` ne connaît pas les hooks). Un seul tracé, une case par module noir.
 */
export function QrCode({ value, size, title }: QrCodeProps): JSX.Element {
  const { data, size: modules } = encode(value, { ecc: 'M', border: 2 });
  const path = data
    .flatMap((row, y) =>
      row.flatMap((dark, x) => (dark ? [`M${String(x)} ${String(y)}h1v1h-1z`] : [])),
    )
    .join('');
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(modules)} ${String(modules)}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      shapeRendering="crispEdges"
    >
      <rect width={modules} height={modules} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
