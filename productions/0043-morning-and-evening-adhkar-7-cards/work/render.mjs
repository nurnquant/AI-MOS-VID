/* global process, console, document */ // document runs inside pg.evaluate
// 0043 — seven adhkar cards, 1080x1350, rendered through the BROWSER.
//
// Arabic never goes near an image model and never through Pillow: models invent
// pseudo-Arabic on Islamic settings, and Pillow on this machine has no libraqm,
// so it silently drops every harakat. A browser shapes and places them properly.
//
// Type sizes adapt to length — post 7 is ten times post 1.
import pkg from "/Users/oldmac/Claude/Projects/AI-MOS-VID/node_modules/@playwright/test/index.js";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
const { chromium } = pkg;

const cards = JSON.parse(readFileSync("work/cards.json", "utf8"));
const W = 1080,
  H = 1350;
mkdirSync("OUTPUT", { recursive: true });

// Arabic shrinks as it grows; the longest is Sayyid al-Istighfar at 293 chars
const arSize = (n) => (n < 40 ? 92 : n < 80 ? 76 : n < 130 ? 62 : n < 180 ? 54 : 40);
const tlSize = (n) => (n < 40 ? 36 : n < 110 ? 32 : n < 200 ? 27 : 23);
const enSize = (n) => (n < 60 ? 36 : n < 140 ? 32 : n < 250 ? 28 : 24);

const html = (c) => `<html><head><meta charset="utf-8"><style>
  @page{margin:0}
  html,body{margin:0;width:${W}px;height:${H}px;background:#0c2019;
    font-family:Georgia,serif;-webkit-font-smoothing:antialiased}
  /* soft light from the top, so the card is not a flat slab */
  .glow{position:absolute;inset:0;background:
     radial-gradient(120% 70% at 50% -10%, rgba(222,184,118,.16), rgba(12,32,25,0) 60%),
     radial-gradient(90% 50% at 50% 110%, rgba(127,201,164,.10), rgba(12,32,25,0) 60%)}
  .frame{position:absolute;inset:34px;border:1px solid rgba(222,184,118,.34);border-radius:10px}
  .corner{position:absolute;width:26px;height:26px;border:2px solid rgba(222,184,118,.75)}
  .tl{top:34px;left:34px;border-right:0;border-bottom:0;border-radius:10px 0 0 0}
  .tr{top:34px;right:34px;border-left:0;border-bottom:0;border-radius:0 10px 0 0}
  .bl{bottom:34px;left:34px;border-right:0;border-top:0;border-radius:0 0 0 10px}
  .br{bottom:34px;right:34px;border-left:0;border-top:0;border-radius:0 0 10px 0}
  .wrap{position:absolute;inset:34px;padding:44px 62px 150px;box-sizing:border-box;
        display:flex;flex-direction:column;align-items:center;justify-content:center}
  .kicker{font:600 20px/1 Georgia,serif;letter-spacing:.16em;text-transform:uppercase;
          color:#deb876;margin-bottom:6px}
  .day{font:700 15px/1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.2em;
       color:rgba(247,244,236,.55);margin-bottom:30px}
  .rule{width:64px;height:2px;background:#deb876;opacity:.85;margin:0 0 34px}
  .ar{font-family:'Geeza Pro',serif;direction:rtl;color:#f7f4ec;text-align:center;
      font-size:${arSize(c.ar.length)}px;line-height:2.0;margin-bottom:30px}
  .tl{font-style:italic;color:#deb876;text-align:center;
      font-size:${tlSize(c.tl.length)}px;line-height:1.6;margin-bottom:22px}
  .en{color:rgba(247,244,236,.93);text-align:center;
      font-size:${enSize(c.en.length)}px;line-height:1.62}
  .head{position:absolute;top:44px;left:0;right:0;text-align:center}
  .foot{position:absolute;bottom:44px;left:62px;right:62px;text-align:center}
  .src{font:400 16px/1.5 Georgia,serif;color:rgba(247,244,236,.5);margin-bottom:16px}
  .brand{font:700 22px/1 Georgia,serif;color:#f7f4ec;letter-spacing:.02em}
  .sig{font-size:19px;margin-top:9px}
</style></head><body>
  <div class="glow"></div><div class="frame"></div>
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>
  <div class="head">
    <div class="kicker">Morning &amp; Evening Adhkār</div>
    <div class="day">${c.day} / 7</div>
  </div>
  <div class="wrap">
    <div class="rule"></div>
    <div class="ar">${c.ar}</div>
    <div class="tl">${c.tl}</div>
    <div class="en">${c.en}</div>
    </div>
  <div class="foot">
      <div class="src">${c.src}</div>
      <div class="brand">Riwaq Al Ilm</div>
      <div class="sig">🌿📖🌙✨</div>
  </div>
</body></html>`;

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const c of cards) {
  const tmp = `work/_d${c.day}.html`;
  writeFileSync(tmp, html(c));
  await pg.goto("file://" + process.cwd() + "/" + tmp);
  await pg.waitForTimeout(280);
  // does the content overflow the card?
  const over = await pg.evaluate(() => {
    const w = document.querySelector(".wrap");
    return w.scrollHeight - w.clientHeight;
  });
  await pg.screenshot({ path: `OUTPUT/0043-adhkar-${c.day}-of-7-4x5.png` });
  rmSync(tmp);
  console.log(
    `  ${c.day}/7  ar ${c.ar.length} chars  overflow ${over}px ${over > 0 ? "<-- TOO LONG" : "ok"}`,
  );
}
await b.close();
