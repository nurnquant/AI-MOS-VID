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
// Scrim strength. A long verse needs a tall block, and a heavy scrim behind a
// tall block erases the picture entirely — 0040 came back with nothing visible
// but ceilings. Lighter scrim plus a stronger text shadow keeps both.
const SCRIM = Number(process.env.CARD_SCRIM || 1.0);
const SHADOW = Number(process.env.CARD_SHADOW || 1.0);
const SCRIM_H = Number(process.env.CARD_SCRIM_H || 0.56);
// Gold reads as "translation, secondary" beneath Arabic. Used alone as a
// standalone caption over a light subject it is weak — 0041 needed cream.
const EN_COLOR = process.env.CARD_EN_COLOR || "#deb876";

mkdirSync(outDir, { recursive: true });

const html = (a) => `<html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;background:transparent}
  .wrap{position:absolute;left:0;right:0;bottom:0;height:${Math.round(H * SCRIM_H)}px;
        background:linear-gradient(to bottom, rgba(8,26,19,0) 0%,
                   rgba(8,26,19,${(0.62 * SCRIM).toFixed(2)}) 38%,
                   rgba(8,26,19,${(0.9 * SCRIM).toFixed(2)}) 72%,
                   rgba(8,26,19,${(0.94 * SCRIM).toFixed(2)}) 100%)}
  .box{position:absolute;left:60px;right:60px;bottom:${BOTTOM}px;text-align:center}
  .ar{font-family:'Geeza Pro',serif;font-size:${AR_SIZE}px;line-height:2.05;color:#f7f4ec;
      direction:rtl;text-shadow:0 2px 5px rgba(0,0,0,${(0.95 * SHADOW).toFixed(2)}), 0 3px 18px rgba(0,0,0,${(0.9 * SHADOW).toFixed(2)});margin-bottom:34px}
  .en{font-family:'Georgia',serif;font-size:${EN_SIZE}px;line-height:1.55;color:${EN_COLOR};
      text-shadow:0 2px 5px rgba(0,0,0,${(0.95 * SHADOW).toFixed(2)}), 0 2px 14px rgba(0,0,0,${(0.9 * SHADOW).toFixed(2)})}
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
