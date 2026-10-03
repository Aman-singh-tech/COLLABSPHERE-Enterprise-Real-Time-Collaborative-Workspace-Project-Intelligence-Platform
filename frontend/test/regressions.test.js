import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentContentHtml } from '../src/utils/documentContent.js';
import { requestCallMedia } from '../src/utils/media.js';

test('legacy document text/marks are retained and escaped', () => {
  assert.equal(documentContentHtml({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>', marks: [{ type: 'bold' }] }] }] }), '<p><strong>&lt;script&gt;</strong></p>');
  assert.equal(documentContentHtml('<p>Existing HTML</p>'), '<p>Existing HTML</p>');
  assert.equal(documentContentHtml(''), '');
});
test('camera permission timeout rejects and stops late-arriving tracks', async () => {
  let grant;
  let stopped = 0;
  const media = { getUserMedia: () => new Promise((resolve) => { grant = resolve; }) };
  await assert.rejects(requestCallMedia(media, { video: true }, 5), { name: 'TimeoutError' });
  grant({ getTracks: () => [{ stop: () => { stopped += 1; } }] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stopped, 1);
});
test('media errors and successful streams settle without hanging', async () => {
  await assert.rejects(requestCallMedia(null, {}), /supported browser/);
  const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
  await assert.rejects(requestCallMedia({ getUserMedia: () => Promise.reject(denied) }, {}), { name: 'NotAllowedError' });
  const stream = {};
  assert.equal(await requestCallMedia({ getUserMedia: () => Promise.resolve(stream) }, {}), stream);
});
