import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm?module";
import jostBold from "./fonts/Jost-Bold.ttf?inline";
import jostMedium from "./fonts/Jost-Medium.ttf?inline";
import limelight from "./fonts/Limelight-Regular.ttf?inline";

/** Rasterize a card SVG to PNG with resvg (WASM). Fonts are bundled OFL TTFs (see fonts/). */

let ready: Promise<void> | null = null;
let fonts: Uint8Array[] | null = null;

function dataUriBytes(uri: string): Uint8Array {
  const b64 = uri.slice(uri.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function renderPng(svg: string, width: number): Promise<Uint8Array> {
  ready ??= initWasm(resvgWasm);
  await ready;
  fonts ??= [limelight, jostMedium, jostBold].map(dataUriBytes);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontBuffers: fonts, loadSystemFonts: false, defaultFontFamily: "Jost" },
  });
  const png = resvg.render().asPng();
  resvg.free();
  return png;
}
