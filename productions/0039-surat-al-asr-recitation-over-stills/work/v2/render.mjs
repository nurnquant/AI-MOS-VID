/* global process, console */
// Render each ayah card as a transparent PNG using the browser's text engine.
// Pillow cannot do this: without libraqm it silently DROPS every harakat, which
// on Qur'anic text is not a cosmetic failure. A browser shapes Arabic properly.
import pkg from "/Users/oldmac/Claude/Projects/AI-MOS-VID/node_modules/@playwright/test/index.js";
import { readFileSync, writeFileSync } from "fs";
const { chromium } = pkg;
const ayahs = JSON.parse(readFileSync("ayahs.json", "utf8"));
const W = 1080,
  H = 1920;

const page_html = (a) => `<html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;background:transparent}
  .wrap{position:absolute;left:0;right:0;bottom:0;height:${Math.round(H * 0.56)}px;
        background:linear-gradient(to bottom, rgba(8,26,19,0) 0%, rgba(8,26,19,.62) 38%,
                   rgba(8,26,19,.90) 72%, rgba(8,26,19,.94) 100%)}
  .box{position:absolute;left:60px;right:60px;bottom:400px;text-align:center}
  .ar{font-family:'Geeza Pro',serif;font-size:66px;line-height:2.05;color:#f7f4ec;
      direction:rtl;text-shadow:0 3px 16px rgba(0,0,0,.8);margin-bottom:34px}
  .en{font-family:'Georgia',serif;font-size:35px;line-height:1.55;color:#deb876;
      text-shadow:0 2px 12px rgba(0,0,0,.85)}
</style></head><body>
  <div class="wrap"></div>
  <div class="box"><div class="ar">${a.ar}</div><div class="en">${a.en}</div></div>
</body></html>`;

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: W, height: H } });
for (const a of ayahs) {
  writeFileSync(`_${a.id}.html`, page_html(a));
  await pg.goto("file://" + process.cwd() + `/_${a.id}.html`);
  await pg.waitForTimeout(250);
  await pg.screenshot({ path: `card-${a.id}.png`, omitBackground: true });
  console.log(`  card-${a.id}.png  ${a.start}s -> ${a.end}s`);
}
await b.close();
