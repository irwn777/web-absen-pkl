import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireCameraStream,
  buildCameraConstraintChain,
  mapCameraErrorToIndonesian,
} from './cameraHelpers';

test('buildCameraConstraintChain orders front-camera ideal -> front-camera basic -> any video', () => {
  const chain = buildCameraConstraintChain();
  assert.equal(chain.length, 3);
  assert.equal(chain[0].label, 'front-camera-ideal');
  assert.equal(chain[1].label, 'front-camera-basic');
  assert.equal(chain[2].label, 'any-camera');
  assert.deepEqual(chain[2].constraints, { video: true, audio: false });
});

test('acquireCameraStream falls back to generic video:true when OverconstrainedError occurs', async () => {
  let calls = 0;
  const fakeStream = {
    getVideoTracks: () => [{ id: 'track-1', stop: () => {} }],
    getTracks: () => [{ stop: () => {} }],
  } as unknown as MediaStream;

  const stream = await acquireCameraStream(async (constraints) => {
    calls += 1;
    if (constraints.video !== true) {
      const err = new Error('Overconstrained');
      err.name = 'OverconstrainedError';
      throw err;
    }
    return fakeStream;
  });

  assert.equal(calls, 3);
  assert.equal(stream, fakeStream);
});

test('acquireCameraStream aborts immediately on NotAllowedError without extra prompts', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      acquireCameraStream(async () => {
        calls += 1;
        const err = new Error('Permission denied');
        err.name = 'NotAllowedError';
        throw err;
      }),
    (err: Error) => err.name === 'NotAllowedError'
  );
  assert.equal(calls, 1);
});

test('mapCameraErrorToIndonesian gives actionable messages for secure context and DOM errors', () => {
  assert.ok(mapCameraErrorToIndonesian(new Error('x'), false).includes('HTTPS'));

  const denied = new Error('Denied');
  denied.name = 'NotAllowedError';
  assert.ok(mapCameraErrorToIndonesian(denied, true).includes('Izin kamera ditolak'));

  const inUse = new Error('Busy');
  inUse.name = 'NotReadableError';
  assert.ok(mapCameraErrorToIndonesian(inUse, true).includes('dipakai aplikasi'));
});
