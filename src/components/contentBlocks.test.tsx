import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPreview } from './MapPreview';
import { LegendIconImages } from './LegendIconImages';
import { AdminLoginFields } from './AdminLoginFields';

test('map preview links the image to the editable interactive-map URL', () => {
  const html = renderToStaticMarkup(
    <MapPreview
      imageUrl="https://cdn.example.test/mapa.png"
      mapUrl="https://www.google.com/maps/d/viewer?mid=map-id&z=8"
      alt="Mapa míst v Událostech"
    />,
  );

  assert.match(html, /<a[^>]+href="https:\/\/www\.google\.com\/maps\/d\/viewer\?mid=map-id&amp;z=8"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer noopener"/);
  assert.match(html, /<img[^>]+src="https:\/\/cdn\.example\.test\/mapa\.png"/);
});

test('legend icon block renders Czech and Moravian coat images side by side', () => {
  const html = renderToStaticMarkup(
    <LegendIconImages
      imageUrl="https://cdn.example.test/cesko.png"
      imageUrl2="https://cdn.example.test/morava.png"
    />,
  );

  assert.equal((html.match(/<img/g) ?? []).length, 2);
  assert.match(html, /src="https:\/\/cdn\.example\.test\/cesko\.png"/);
  assert.match(html, /src="https:\/\/cdn\.example\.test\/morava\.png"/);
});

test('admin credentials ask for a username instead of requiring an email input', () => {
  const html = renderToStaticMarkup(
    <AdminLoginFields
      idPrefix="admin"
      identifier="romancuk"
      password="temporary"
      onIdentifierChange={() => undefined}
      onPasswordChange={() => undefined}
    />,
  );

  assert.match(html, /<label[^>]+for="admin-username"[^>]*>Uživatelské jméno<\/label>/);
  assert.match(html, /<input(?=[^>]*id="admin-username")(?=[^>]*type="text")[^>]*>/);
  assert.match(html, /autocomplete="username"/i);
  assert.match(html, /<input(?=[^>]*id="admin-password")(?=[^>]*type="password")[^>]*>/);
});
