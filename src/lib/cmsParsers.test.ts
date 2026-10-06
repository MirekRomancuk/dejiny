import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLegend, parsePopisSections } from './cmsParsers';

const LEGEND_HTML = `
  <table><tbody>
    <tr><td>Sloupec</td><td>Popis</td></tr>
    <tr><td>ROK</td><td>Rok události</td></tr>
    <tr><td>PANOVNÍK</td><td>Vládnoucí panovník</td></tr>
    <tr>
      <td><img src="znak-cesko.png"><img src="znak-morava.png"></td>
      <td>Významné státotvorné události českých dějin (moravských dějin)</td>
    </tr>
    <tr><td>ZAHRANIČÍ</td><td>Zahraniční události</td></tr>
    <tr><td>DOMÁCÍ</td><td>Domácí události</td></tr>
    <tr><td>MÍSTA</td><td>Historická místa</td></tr>
  </tbody></table>
  <table><tbody>
    <tr><td>Text</td><td>Kladná událost</td></tr>
    <tr><td>Text</td><td>Záporná událost</td></tr>
  </tbody></table>
  <table><tbody>
    <tr><td>I. - XII.</td><td>známý pouze kalendářní měsíc</td></tr>
    <tr><td>J;L;P;Z</td><td>známé pouze roční období</td></tr>
    <tr><td>1.-6.9.; III.-VI.; L-P; 1100-1101</td><td>intervaly období událostí</td></tr>
  </tbody></table>
  <table><tbody>
    <tr><td><img src="wikipedia.png"></td><td>Wikipedia</td></tr>
  </tbody></table>
`;

test('date notation rows stay in the date-format section even when they contain uppercase Roman numerals', () => {
  const legend = parseLegend(LEGEND_HTML);

  assert.ok(legend);
  assert.deepEqual(
    legend.dateFormats.map((item) => item.format),
    ['I. - XII.', 'J;L;P;Z', '1.-6.9.; III.-VI.; L-P; 1100-1101'],
  );
  assert.deepEqual(
    legend.columns.map((item) => item.term),
    ['ROK', 'PANOVNÍK', 'ZAHRANIČÍ', 'DOMÁCÍ', 'MÍSTA'],
  );
});

test('a ruler legend item preserves both Czech and Moravian coat images', () => {
  const legend = parseLegend(LEGEND_HTML);

  assert.ok(legend);
  assert.deepEqual(
    (legend.panovnikIcons[0] as unknown as { imageUrls?: string[] }).imageUrls,
    ['znak-cesko.png', 'znak-morava.png'],
  );
});

test('Popis map parsing keeps the interactive map URL and removes its duplicate heading from section copy', () => {
  const mapUrl = 'https://www.google.com/maps/d/viewer?mid=map-id&ll=49.8%2C15.2&z=8';
  const encodedMapUrl = mapUrl.replaceAll('&', '&amp;');
  const html = `
    <p>Vážený návštěvníku.</p>
    <p>PRVNÍ SEKCE</p>
    <p>První text.</p>
    <p>VYSVĚTLIVKY</p>
    <p>Text vysvětlivek.</p>
    <p>Mapa s místy uvedenými v Událostech</p>
    <p>(kliknutím na značky se zobrazí detaily)</p>
    <p><a href="${encodedMapUrl}"><img src="images/Popis/Mapa.png"></a></p>
  `;

  const parsed = parsePopisSections(html);

  assert.ok(parsed?.mapSection);
  assert.equal((parsed.mapSection as { mapUrl?: string }).mapUrl, mapUrl);
  assert.equal(parsed.sections.at(-1)?.bodyHtml.includes('Mapa s místy uvedenými v Událostech'), false);
  assert.match(parsed.mapSection.captionHtml, /kliknutím na značky/);
});
