export const USER_MEDIA_FOLDER_PREFIX = 'alaia/trips';
export const STORY_MEDIA_FOLDER_PREFIX = 'alaia/stories';

export const STORY_MEDIA_SOURCES = Object.freeze({
  adminUpload: 'admin_upload',
  licensed: 'licensed',
  aiGenerated: 'ai_generated',
  placeholder: 'placeholder',
});

export const STORY_MEDIA_STATUSES = Object.freeze({
  ready: 'ready',
  needsReview: 'needs_review',
});

export const STORY_MEDIA_LINK_TARGETS = Object.freeze({
  cover: 'cover',
  chapter: 'chapter',
  activity: 'activity',
  texture: 'texture',
  postcard: 'postcard',
});

const STORY_MEDIA_SOURCE_VALUES = new Set(Object.values(STORY_MEDIA_SOURCES));
const STORY_MEDIA_STATUS_VALUES = new Set(Object.values(STORY_MEDIA_STATUSES));
const STORY_MEDIA_LINK_TARGET_VALUES = new Set(Object.values(STORY_MEDIA_LINK_TARGETS));

export function userMediaFolder(tripId) {
  if (!tripId) {
    throw new Error('userMediaFolder requiere tripId.');
  }
  return `${USER_MEDIA_FOLDER_PREFIX}/${tripId}`;
}

export function storyMediaFolder(storyId) {
  if (!storyId) {
    throw new Error('storyMediaFolder requiere storyId.');
  }
  return `${STORY_MEDIA_FOLDER_PREFIX}/${storyId}`;
}

export function normalizeStoryMedia(input) {
  const media = {
    url: input?.url,
    alt: input?.alt,
    source: input?.source,
    status: input?.status,
    credit: input?.credit ?? null,
    linkedTo: input?.linkedTo,
  };

  if (!media.url || typeof media.url !== 'string') {
    throw new Error('Story Media requiere url.');
  }
  if (!media.alt || typeof media.alt !== 'string') {
    throw new Error('Story Media requiere alt.');
  }
  if (!STORY_MEDIA_SOURCE_VALUES.has(media.source)) {
    throw new Error('Story Media source inválido.');
  }
  if (!STORY_MEDIA_STATUS_VALUES.has(media.status)) {
    throw new Error('Story Media status inválido.');
  }
  if (!STORY_MEDIA_LINK_TARGET_VALUES.has(media.linkedTo)) {
    throw new Error('Story Media linkedTo inválido.');
  }
  if (media.credit !== null && typeof media.credit !== 'string') {
    throw new Error('Story Media credit debe ser string o null.');
  }

  return media;
}

export function assertStoryMediaPublishable(storyMediaList) {
  const blocked = storyMediaList.filter((media) => normalizeStoryMedia(media).status !== STORY_MEDIA_STATUSES.ready);
  if (blocked.length > 0) {
    throw new Error('Una historia publicada solo puede usar Story Media con status ready.');
  }
  return true;
}

export function resolveAiGeneratedPlaceStatus({ representsRealPlace } = {}) {
  return representsRealPlace ? STORY_MEDIA_STATUSES.needsReview : STORY_MEDIA_STATUSES.ready;
}


export const USER_MEDIA_TYPES = Object.freeze({
  image: 'image',
  video: 'video',
});

const USER_MEDIA_TYPE_VALUES = new Set(Object.values(USER_MEDIA_TYPES));

export function normalizeMediaUploadInput(input = {}) {
  const type = String(input.type ?? '').trim();
  const dataUrl = String(input.dataUrl ?? input.image ?? input.video ?? '').trim();
  const memoryLegacyId = input.memoryLegacyId == null ? null : String(input.memoryLegacyId).trim() || null;

  if (!USER_MEDIA_TYPE_VALUES.has(type)) {
    throw new Error('MediaAsset type debe ser image o video.');
  }
  if (!dataUrl.startsWith(`data:${type}/`)) {
    throw new Error(type === USER_MEDIA_TYPES.image ? 'Imagen inv?lida o faltante.' : 'Video inv?lido o faltante.');
  }

  return { type, dataUrl, memoryLegacyId };
}

export function cloudinaryUploadOptions({ tripId, type }) {
  return {
    folder: userMediaFolder(tripId),
    resource_type: type,
  };
}

export function createMediaAssetDocument({ tripId, userId, input, uploadResult, now = new Date().toISOString() }) {
  return {
    tripId,
    uploadedByUserId: userId,
    memoryLegacyId: input.memoryLegacyId,
    type: input.type,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    provider: 'cloudinary',
    resourceType: uploadResult.resource_type ?? input.type,
    format: uploadResult.format ?? null,
    bytes: uploadResult.bytes ?? null,
    width: uploadResult.width ?? null,
    height: uploadResult.height ?? null,
    duration: uploadResult.duration ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function publicMediaAsset(asset) {
  return {
    id: String(asset._id),
    tripId: String(asset.tripId),
    uploadedByUserId: String(asset.uploadedByUserId),
    memoryLegacyId: asset.memoryLegacyId ?? null,
    type: asset.type,
    url: asset.url,
    publicId: asset.publicId,
    provider: asset.provider,
    resourceType: asset.resourceType,
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}
