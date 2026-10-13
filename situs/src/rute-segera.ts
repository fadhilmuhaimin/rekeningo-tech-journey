// Route middleware Starlight (keputusan 450): butir sidebar untuk halaman yang belum ditulis (data-nav="menyusul",
// badge "segera" dari tools/sidebar.mjs) dirender tanpa href. `<a>` tanpa href adalah placeholder link (HTML Living
// Standard, elemen a): tidak bisa difokus dan tidak dibacakan sebagai tautan, jadi pembaca tidak dibawa ke 404.
// Config sidebar Starlight mewajibkan `link`; href baru dicabut di sini, sesudah Starlight menyusun entri sidebar.
import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

type Entri = { type: "link"; href?: string; attrs: Record<string, unknown> } | { type: "group"; entries: Entri[] };

function cabut(entri: Entri[]) {
  for (const e of entri) {
    if (e.type === "group") cabut(e.entries);
    else if (String(e.attrs["data-nav"] ?? "").split(" ").includes("menyusul")) delete e.href;
  }
}

export const onRequest = defineRouteMiddleware((context) => {
  cabut(context.locals.starlightRoute.sidebar as Entri[]);
});
