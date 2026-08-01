/* Build du CSS : Tailwind + daisyUI -> inline dans le <style id="app-css"> de index.html.
   Le CSS est inline plutot que lie : index.html reste un fichier autonome, ouvrable en
   local et servable sans rien a cote, comme three.js qui y est deja embarque.

   Tailwind ne peut PAS scanner index.html directement : le CSS y est deja inline, et il
   y relirait ses propres noms de classes comme s'ils etaient utilises — chaque build
   ferait grossir le suivant. On lui donne donc une copie sans le bloc <style>. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const url = (p) => new URL(p, import.meta.url);
const HTML = url("../index.html");
const SCAN = url("../dist/scan.html");
const CSS = url("../dist/app.css");
const OPEN = '<style id="app-css">';
const CLOSE = "</style>";

const cut = (html) => {
  const start = html.indexOf(OPEN);
  if (start === -1) throw new Error(`marqueur ${OPEN} absent de index.html`);
  const end = html.indexOf(CLOSE, start);
  if (end === -1) throw new Error(`${CLOSE} manquant apres ${OPEN}`);
  return { head: html.slice(0, start + OPEN.length), tail: html.slice(end) };
};

const html = await readFile(HTML, "utf8");
const { head, tail } = cut(html);

await mkdir(url("../dist/"), { recursive: true });
await writeFile(SCAN, head + tail);

await run("npx", ["@tailwindcss/cli", "-i", "src/app.css", "-o", "dist/app.css", "--minify"], {
  cwd: url("../"),
});

const css = (await readFile(CSS, "utf8")).trim();
const banner = "\n/* Genere par `npm run css` depuis src/app.css — ne pas editer a la main. */\n";
await writeFile(HTML, head + banner + css + "\n" + tail);

console.log(`CSS inline : ${(css.length / 1024).toFixed(1)} ko`);
