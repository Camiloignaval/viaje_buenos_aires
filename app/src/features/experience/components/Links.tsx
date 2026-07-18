import { type ReactNode } from "react";
import type { PlaceLocation } from "@/features/story/engine/types";

// Glifos monocromáticos, integrados con el libro (no logos de marca): un auto
// para los servicios de viaje, un pin para el mapa, una flecha para el sitio.
// Se pintan en el dorado del capítulo, sin subrayado ni aspecto de enlace HTML.
const RideGlyph = (
  <svg className="link-glyph" viewBox="0 0 28 16" aria-hidden="true" focusable="false">
    <path d="M4.4 9.6 6.3 5.4C6.7 4.5 7.3 4.1 8.3 4.1H19.7C20.7 4.1 21.3 4.5 21.7 5.4L23.6 9.6Z" />
    <rect x="3" y="9.2" width="22" height="1.7" rx="0.85" />
    <circle cx="8.2" cy="12.1" r="2" />
    <circle cx="19.8" cy="12.1" r="2" />
  </svg>
);

const PinGlyph = (
  <svg className="link-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 1.6C5.4 1.6 3.4 3.6 3.4 6.2 3.4 9.6 8 14.4 8 14.4S12.6 9.6 12.6 6.2C12.6 3.6 10.6 1.6 8 1.6Z" />
    <circle cx="8" cy="6.1" r="1.7" fill="var(--paper)" />
  </svg>
);

const ArrowGlyph = (
  <svg className="link-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M5 11 11 5M6.4 4.6H11.4V9.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function BookLink({ href, glyph, label }: { href: string; glyph: ReactNode; label: string }) {
  return (
    <a className="book-link" href={href} target="_blank" rel="noopener">
      {glyph}
      <span className="book-link-label">{label}</span>
    </a>
  );
}

// Cómo llegar: los servicios como pequeñas marcas del libro. Uber/Cabify comparten
// el glifo del auto; el mapa, un pin; el sitio, una flecha. Sin "· " ni subrayado.
export function Links({
  location,
  websiteUrl,
  omitMap = false,
}: {
  location?: PlaceLocation | null;
  websiteUrl?: string | null;
  /** Cuando el mini-mapa ya abre Google Maps, se omite el enlace de texto "Mapa". */
  omitMap?: boolean;
}) {
  const links: ReactNode[] = [];
  if (!omitMap && location?.googleMapsUrl) {
    links.push(<BookLink key="map" href={location.googleMapsUrl} glyph={PinGlyph} label="Mapa" />);
  }
  if (location?.uberDeepLink) {
    links.push(<BookLink key="uber" href={location.uberDeepLink} glyph={RideGlyph} label="Uber" />);
  }
  if (location?.cabifyDeepLink) {
    links.push(<BookLink key="cabify" href={location.cabifyDeepLink} glyph={RideGlyph} label="Cabify" />);
  }
  if (websiteUrl) {
    links.push(<BookLink key="web" href={websiteUrl} glyph={ArrowGlyph} label="Sitio" />);
  }
  if (links.length === 0) {
    return null;
  }
  return <p className="links">{links}</p>;
}
