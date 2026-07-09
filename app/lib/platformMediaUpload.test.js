import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  cloudinaryUploadOptions,
  createMediaAssetDocument,
  normalizeMediaUploadInput,
  publicMediaAsset,
  userMediaFolder,
} from './platformMedia.js';

test('normalizeMediaUploadInput acepta imágenes dataUrl y memoryLegacyId opcional', () => {
  const input = normalizeMediaUploadInput({ type: 'image', dataUrl: 'data:image/jpeg;base64,abc', memoryLegacyId: ' m1 ' });

  assert.deepEqual(input, { type: 'image', dataUrl: 'data:image/jpeg;base64,abc', memoryLegacyId: 'm1' });
});

test('normalizeMediaUploadInput acepta videos dataUrl para MVP', () => {
  const input = normalizeMediaUploadInput({ type: 'video', dataUrl: 'data:video/mp4;base64,abc' });

  assert.equal(input.type, 'video');
  assert.equal(input.memoryLegacyId, null);
});

test('normalizeMediaUploadInput rechaza type o dataUrl inconsistentes', () => {
  assert.throws(() => normalizeMediaUploadInput({ type: 'audio', dataUrl: 'data:audio/mp3;base64,abc' }), /image o video/);
  assert.throws(() => normalizeMediaUploadInput({ type: 'image', dataUrl: 'data:video/mp4;base64,abc' }), /Imagen inv.lida/);
});

test('cloudinaryUploadOptions usa carpeta aurora/trips/{tripId}', () => {
  assert.deepEqual(cloudinaryUploadOptions({ tripId: 'trip-1', type: 'video' }), {
    folder: userMediaFolder('trip-1'),
    resource_type: 'video',
  });
});

test('createMediaAssetDocument crea contrato MediaAsset persistible', () => {
  const tripId = new ObjectId();
  const userId = new ObjectId();
  const doc = createMediaAssetDocument({
    tripId,
    userId,
    input: { type: 'image', memoryLegacyId: 'm1' },
    uploadResult: { secure_url: 'https://cdn/img.jpg', public_id: 'aurora/trips/x/img', resource_type: 'image', format: 'jpg', bytes: 123, width: 10, height: 20 },
    now: '2026-01-01T00:00:00.000Z',
  });

  assert.equal(String(doc.tripId), String(tripId));
  assert.equal(String(doc.uploadedByUserId), String(userId));
  assert.equal(doc.memoryLegacyId, 'm1');
  assert.equal(doc.url, 'https://cdn/img.jpg');
  assert.equal(doc.provider, 'cloudinary');
});

test('publicMediaAsset serializa ObjectId sin exponer campos internos extra', () => {
  const id = new ObjectId();
  const tripId = new ObjectId();
  const userId = new ObjectId();
  const asset = publicMediaAsset({
    _id: id,
    tripId,
    uploadedByUserId: userId,
    memoryLegacyId: null,
    type: 'video',
    url: 'https://cdn/video.mp4',
    publicId: 'p1',
    provider: 'cloudinary',
    resourceType: 'video',
    format: 'mp4',
    bytes: 456,
    width: 1920,
    height: 1080,
    duration: 3.2,
    createdAt: 'now',
    updatedAt: 'now',
  });

  assert.equal(asset.id, String(id));
  assert.equal(asset.tripId, String(tripId));
  assert.equal(asset.uploadedByUserId, String(userId));
});

