/* global process, console */
// Render sacred-text cards as transparent PNGs using the BROWSER's text engine.
//
// Pillow is not an option and fails silently: without libraqm it does not place
// Arabic harakat, it drops them. Verified — the same phrase rendered voweled and
// stripped produced byte-identical images. A browser shapes Arabic properly.
//
//   node rendercards.mjs cards.json [outdir]
//
// cards.json: [{ "id","ar","en","start","end" }, ...]
import pkg from "/Users/oldmac/Claude/Projects/AI-MOS-VID/node_modules/@playwright/test/index.js";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
const { chromium } = pkg;

const cardsPath = process.argv[2] || "cards.json";
const outDir = process.argv[3] || ".";
const cards = JSON.parse(readFileSync(cardsPath, "utf8"));
const W = Number(process.env.CARD_W || 1080);
const H = Number(process.env.CARD_H || 1920);
// Keep the block clear of the bottom fifth: Reels and Stories draw their own UI there.
const BOTTOM = Number(process.env.CARD_BOTTOM || 400);
const AR_SIZE = Number(process.env.CARD_AR_SIZE || 66);
const EN_SIZE = Number(process.env.CARD_EN_SIZE || 35);

mkdirSync(outDir, { recursive: true });

const html = (a) => `<html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;background:transparent}
  .wrap{position:absolute;left:0;right:0;bottom:0;height:${Math.round(H * 0.56)}px;
        background:linear-gradient(to bottom, rgba(8,26,19,0) 0%, rgba(8,26,19,.62) 38%,
                   rgba(8,26,19,.90) 72%, rgba(8,26,19,.94) 100%)}
  .box{position:absolute;left:60px;right:60px;bottom:${BOTTOM}px;text-align:center}
  .ar{font-family:'Geeza Pro',serif;font-size:${AR_SIZE}px;line-height:2.05;color:#f7f4ec;
      direction:rtl;text-shadow:0 3px 16px rgba(0,0,0,.8);margin-bottom:34px}
  .en{font-family:'Georgia',serif;font-size:${EN_SIZE}px;line-height:1.55;color:#deb876;
      text-shadow:0 2px 12px rgba(0,0,0,.85)}
</style></head><body>
  <div class="wrap"></div>
  <div class="box">${a.ar ? `<div class="ar">${a.ar}</div>` : ""}${a.en ? `<div class="en">${a.en}</div>` : ""}</div>
</body></html>`;

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: W, height: H } });
for (const a of cards) {
  const tmp = `${outDir}/_${a.id}.html`;
  writeFileSync(tmp, html(a));
  await pg.goto("file://" + process.cwd() + "/" + tmp);
  await pg.waitForTimeout(250);
  await pg.screenshot({ path: `${outDir}/card-${a.id}.png`, omitBackground: true });
  rmSync(tmp);
  console.log(`  card-${a.id}.png  ${a.start}s -> ${a.end}s`);
}
await b.close();
