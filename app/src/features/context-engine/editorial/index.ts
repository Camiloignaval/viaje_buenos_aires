export { EDITORIAL_V1_CATALOG } from "./catalog";
export type {
  EditorialActionRef,
  EditorialCatalog,
  EditorialCatalogVersion,
  EditorialChannel,
  EditorialDecisionKind,
  EditorialErrorCode,
  EditorialLocale,
  EditorialMessage,
  EditorialVariant,
  EditorialVariantId,
} from "./contracts";
export { EditorialContractError } from "./contracts";
export { createEditorialMessage, type EditorialCompanionAction } from "./editorialVoice";
export {
  emitEditorialObservation,
  sanitizeEditorialDuration,
  type EditorialDependencies,
  type EditorialObservation,
  type EditorialObserver,
} from "./observer";
