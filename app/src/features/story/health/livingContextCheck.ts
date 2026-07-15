import type { StoryPackage } from "@/features/story/engine/types";
import { currencyForCountry, isSupportedCurrency } from "@/features/context-engine/currencyCatalog";
import type { HealthCheckContext, HealthFinding } from "./types";

const REQUIRED_FIELDS = ["countryCode", "locale", "timezone", "currency"] as const;

function missing(field: (typeof REQUIRED_FIELDS)[number]): HealthFinding {
  return {
    category: "context",
    severity: "warning",
    code: `living-context.missing-${field === "countryCode" ? "country-code" : field}`,
    path: `metadata.livingContext.${field}`,
    message: "Falta metadata curada requerida para Living Context.",
    suggestion: "Completar el campo con un valor curado verificable.",
  };
}

function mismatch(code: string, path: string, message: string): HealthFinding {
  return { category: "context", severity: "warning", code, path, message };
}

function invalid(field: (typeof REQUIRED_FIELDS)[number]): HealthFinding {
  return mismatch(
    `living-context.invalid-${field === "countryCode" ? "country-code" : field}`,
    `metadata.livingContext.${field}`,
    "El campo de Living Context no puede resolverse con los catálogos locales.",
  );
}

function validLocale(value: string): boolean {
  try { return Intl.getCanonicalLocales(value).length === 1; } catch { return false; }
}

function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true; } catch { return false; }
}

function weatherFinding(
  severity: "warning" | "info",
  code: string,
  path: "$context.weather.providerStatus" | "$context.weather.snapshotStatus",
): HealthFinding {
  return {
    category: "context",
    severity,
    code,
    path,
    message: "El estado local de Weather no es utilizable por Living Context.",
  };
}

export function checkLivingContext(pkg: StoryPackage, ctx: HealthCheckContext): HealthFinding[] {
  const findings: HealthFinding[] = [];
  const metadata = pkg.metadata.livingContext;
  if (metadata) {
    for (const field of REQUIRED_FIELDS) {
      if (typeof metadata[field] !== "string" || metadata[field]!.trim().length === 0) findings.push(missing(field));
    }
    if (metadata.countryCode?.trim() && !currencyForCountry(metadata.countryCode)) findings.push(invalid("countryCode"));
    if (metadata.locale?.trim() && !validLocale(metadata.locale)) findings.push(invalid("locale"));
    if (metadata.timezone?.trim() && !validTimezone(metadata.timezone)) findings.push(invalid("timezone"));
    if (metadata.currency?.trim() && !isSupportedCurrency(metadata.currency)) findings.push(invalid("currency"));
  }

  const requested = ctx.livingContext?.baseStoryId;
  const loaded = ctx.livingContext?.loadedStoryBaseStoryId;
  if (requested && loaded && requested !== loaded) {
    findings.push(
      mismatch("living-context.story-identity-mismatch", "$context.baseStoryId", "La Story cargada no corresponde a la identidad solicitada."),
      mismatch("living-context.story-identity-mismatch", "$context.loadedStoryBaseStoryId", "La identidad externa cargada no corresponde al viaje."),
    );
  }

  const runtimeDestination = ctx.livingContext?.destination;
  if (metadata && runtimeDestination) {
    if (metadata.countryCode && runtimeDestination.countryCode && metadata.countryCode !== runtimeDestination.countryCode) {
      findings.push(mismatch("living-context.destination-mismatch", "metadata.livingContext.countryCode", "El país curado contradice el destino efectivo."));
    }
    if (metadata.timezone && runtimeDestination.timezone && metadata.timezone !== runtimeDestination.timezone) {
      findings.push(mismatch("living-context.timezone-mismatch", "metadata.livingContext.timezone", "La timezone curada contradice el destino efectivo."));
    }
    if (metadata.locale && runtimeDestination.locale && metadata.locale !== runtimeDestination.locale) {
      findings.push(mismatch("living-context.locale-mismatch", "metadata.livingContext.locale", "El locale curado contradice el destino efectivo."));
    }
  }

  const runtimeWeather = ctx.livingContext?.weather;
  if (runtimeWeather) {
    if (runtimeWeather.providerStatus === "unconfigured") {
      findings.push(weatherFinding(
        "info",
        "living-context.weather-provider-unconfigured",
        "$context.weather.providerStatus",
      ));
    } else if (runtimeWeather.providerStatus !== undefined && runtimeWeather.providerStatus !== "configured") {
      findings.push(weatherFinding(
        "warning",
        "living-context.invalid-weather-provider-status",
        "$context.weather.providerStatus",
      ));
    }
    if (runtimeWeather.snapshotStatus !== undefined && runtimeWeather.snapshotStatus !== "valid") {
      findings.push(weatherFinding(
        "warning",
        "living-context.invalid-weather-snapshot",
        "$context.weather.snapshotStatus",
      ));
    }
  }
  return findings;
}
