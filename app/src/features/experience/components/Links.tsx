import { Fragment, type ReactNode } from "react";
import type { PlaceLocation } from "@/features/story/engine/types";

// Espejo de renderLinks(location, websiteUrl). Mapa · Uber · Cabify · Sitio web,
// unidos por " · " (mismo separador con espacios que el vanilla).
export function Links({
  location,
  websiteUrl,
}: {
  location?: PlaceLocation | null;
  websiteUrl?: string | null;
}) {
  const links: ReactNode[] = [];
  if (location?.googleMapsUrl) {
    links.push(
      <a key="map" href={location.googleMapsUrl} target="_blank" rel="noopener">
        Mapa
      </a>,
    );
  }
  if (location?.uberDeepLink) {
    links.push(
      <a key="uber" href={location.uberDeepLink} target="_blank" rel="noopener">
        Uber
      </a>,
    );
  }
  if (location?.cabifyDeepLink) {
    links.push(
      <a key="cabify" href={location.cabifyDeepLink} target="_blank" rel="noopener">
        Cabify
      </a>,
    );
  }
  if (websiteUrl) {
    links.push(
      <a key="web" href={websiteUrl} target="_blank" rel="noopener">
        Sitio web
      </a>,
    );
  }
  if (links.length === 0) {
    return null;
  }
  return (
    <p className="links">
      {links.map((link, index) => (
        <Fragment key={index}>
          {index > 0 ? " · " : null}
          {link}
        </Fragment>
      ))}
    </p>
  );
}
