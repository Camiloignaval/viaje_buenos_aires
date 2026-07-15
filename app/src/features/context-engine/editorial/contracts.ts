export type EditorialLocale = "es-CL";
export type EditorialCatalogVersion = "editorial-v1";
export type EditorialDecisionKind =
  | "trip_start_tomorrow"
  | "trip_start_today"
  | "trip_last_day"
  | "weather_attention_candidate"
  | "light_moment_candidate";
export type EditorialChannel = "push" | "in_app" | "timeline" | "memory" | "editorial";
export type EditorialVariantId =
  | "tomorrow-01"
  | "tomorrow-02"
  | "today-01"
  | "today-02"
  | "last-day-01"
  | "last-day-02"
  | "weather-01"
  | "weather-02"
  | "light-01"
  | "light-02";
export type EditorialErrorCode =
  | "INVALID_ACTION"
  | "UNSUPPORTED_KIND"
  | "INVALID_CHANNEL"
  | "INVALID_CATALOG"
  | "INVALID_LOCALE"
  | "MISSING_KIND"
  | "DUPLICATE_VARIANT_ID"
  | "INVALID_TEXT"
  | "TEXT_TOO_LONG"
  | "FORBIDDEN_TEXT"
  | "PLACEHOLDER_NOT_ALLOWED";

export interface EditorialActionRef {
  readonly actionId: string;
  readonly decisionId: string;
  readonly kind: EditorialDecisionKind;
}

export interface EditorialMessage {
  readonly locale: EditorialLocale;
  readonly catalogVersion: EditorialCatalogVersion;
  readonly variantId: EditorialVariantId;
  readonly text: string;
  readonly actionRef: EditorialActionRef;
  readonly channel: EditorialChannel;
}

export interface EditorialVariant {
  readonly id: EditorialVariantId;
  readonly text: string;
}

export interface EditorialCatalog {
  readonly version: EditorialCatalogVersion;
  readonly locale: EditorialLocale;
  readonly entries: Readonly<Record<EditorialDecisionKind, readonly EditorialVariant[]>>;
}

export class EditorialContractError extends Error {
  readonly name = "EditorialContractError";

  constructor(readonly code: EditorialErrorCode) {
    super(code);
  }
}
