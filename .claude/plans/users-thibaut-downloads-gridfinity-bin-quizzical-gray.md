# Passage du générateur au format Gridfinity à languettes

## Context

Le générateur produit aujourd'hui des étiquettes **ModuBOX** : une simple plaque rectangulaire
`W × 10,1 mm` à coins arrondis asymétriques (haut 1,85 / bas 0,65), épaisse de 0,32 mm, sans
chanfrein ni perçage.

Le fichier de référence `~/Downloads/gridfinity_bin_label.scad` (Laurens Guijt) utilise un profil
différent — c'est la « languette » demandée : le corps principal est doublé d'une **bande plus
étroite qui déborde de 1 mm de chaque côté**, et ce sont ces deux oreilles latérales qui viennent
se clipser dans les rails du bac. S'y ajoutent deux perçages Ø1,5 mm et des chanfreins haut/bas.

**Objectif** : adopter ce profil de plaque et les dimensions Gridfinity, **en conservant la
typographie actuelle** (aperçu police pleine / export monotrait Hershey) **et les icônes**.

### Décisions validées

| Sujet | Choix |
|---|---|
| Dimensions | Gridfinity : 35,8 / 77,8 / 119,8 mm × 11,5 mm |
| Profil | Corps + languettes latérales (+1 mm par côté, bande 5,7 mm de haut) |
| Perçages | Oui, 2 × Ø1,5 mm |
| Rayon de coin | 0,9 uniforme (remplace 1,85 / 0,65) |
| Chanfreins | Oui, 0,2 mm haut et bas |
| Mise en page | Côte à côte conservée, **icônes réduites** pour libérer de la place au texte |
| Typo + icônes | Inchangées |

### Conséquence importante : épaisseur de base

Les chanfreins imposent une base plus épaisse (0,2 + 0,2 = 0,4 mm de chanfrein).
La base passe donc de **0,32 → 0,8 mm** (valeur du SCAD).

L'alignement sur la grille de couches 0,08 mm — soigneusement réglé plus tôt — **est préservé** :

```
base   0,8  mm = 10 couches de 0,08   (dont chanfreins 0,2 bas + 0,2 haut)
texte  0,32 mm =  4 couches de 0,08
total  1,12 mm
```

---

## Fichier concerné

Tout tient dans **[index.html](../../index.html)** (application single-file).
⚠️ Les lignes **10** et **14** contiennent three.js / opentype.js minifiés — ne jamais les lire
ni grep dessus sans filtre.

---

## 1. Constantes et dimensions

**Globales (ligne ~328)** — remplacer :
```js
let W=52.9,H=10.1,T=0.32; const RTOP=1.85,RBOT=0.65;
```
par les valeurs Gridfinity + les nouvelles constantes de profil :
```js
let W=35.8,H=11.5,T=0.80;        // corps principal ; T inclut les chanfreins
const RADIUS=0.9;                 // rayon de coin du corps
const TAB_EXT=1.0;                // debord lateral par cote
const TAB_H=5.7;                  // hauteur de la bande a languettes
const TAB_R=0.2;                  // rayon de coin des languettes
const CHAMFER=0.2;                // chanfrein haut et bas
const HOLE_D=1.5, HOLE_INSET=0.5; // percages : centre a (W/2 - HOLE_INSET)
```
`RTOP` / `RBOT` disparaissent (seuls usages : `baseShape`).

**Champ caché `baseT` (ligne ~315)** : `value="0.32"` → `value="0.80"`.

**`LABEL_TABLE` + `dims()` (lignes ~749-762)** — remplacer la table ModuBOX par l'équivalent de
`getDimensions()` du SCAD :
```js
const LABEL_TABLE={1:35.8, 2:77.8, 3:119.8};
function dims(){
  const u=parseFloat(document.getElementById('lwidth').value);
  return [LABEL_TABLE[u]||LABEL_TABLE[1], 11.5];
}
```
→ supprime la lecture de `ltype` (ligne 756). Conserver l'input caché `#ltype` et son listener
(ligne 902) : inoffensifs, ils évitent de casser d'autres références.

---

## 2. Sélecteur de largeur → unités Y

- **HTML ligne ~213** : `min="0.5" max="8" step="0.5"` → `min="1" max="3" step="1"`.
- **`nudge()` (ligne ~904)** : bornes `Math.max(1, Math.min(3, ...))`, incrément `1`
  (les boutons ± passent de ±0.5 à ±1).
- **Libellé (`#lwidthVal`, ligne ~783)** : `'1 wide'` → `'1 unit'` / `'2 units'`.

---

## 3. `baseShape()` — le profil à languettes

Remplacer intégralement la fonction (lignes ~472-481). Elle doit continuer à retourner un
`THREE.Shape` **centré sur l'origine** (`x ∈ [-W/2, W/2]`) : tout le layout en dépend
(`shiftGeom` ligne 743, `gL` ligne 844).

Le contour est tracé **d'un seul trait**, en sens antihoraire, en contournant les deux languettes.
Seuls les coins **extérieurs** des languettes sont arrondis (les intérieurs sont noyés dans le corps) :

```
1.  départ (-W/2+RADIUS, -H/2)         puis bord bas → (W/2-RADIUS, -H/2)
2.  congé RADIUS → (W/2, -H/2+RADIUS)  puis bord droit → (W/2, -TAB_H/2)
3.  sortie sur la languette droite : → (W/2+TAB_EXT-TAB_R, -TAB_H/2)
4.  congé TAB_R → (W/2+TAB_EXT, -TAB_H/2+TAB_R) → montée → congé → (W/2+TAB_EXT-TAB_R, TAB_H/2)
5.  retour → (W/2, TAB_H/2)            puis bord droit → (W/2, H/2-RADIUS)
6.  congé RADIUS → bord haut → congé → (-W/2, H/2-RADIUS)
7.  bord gauche → (-W/2, TAB_H/2)      puis languette gauche (miroir des étapes 3-5)
8.  retour → (-W/2, -H/2+RADIUS)       puis congé de fermeture
```

Conserver les `quadraticCurveTo` (même style de congé que l'existant) et le clamp défensif
`Math.min(R, W/2, H/2)`.

**Perçages** — ajouter deux `THREE.Path` circulaires dans `shape.holes` :
```js
for(const sx of [-1,1]){
  const p=new THREE.Path();
  p.absarc(sx*(W/2-HOLE_INSET), 0, HOLE_D/2, 0, Math.PI*2, true);  // sens horaire = trou
  s.holes.push(p);
}
```

*Vérification géométrique (1 unité)* : trou centré à x = ±17,4, rayon 0,75 → s'étend jusqu'à
18,15. Le corps s'arrête à 17,9 mais la languette va jusqu'à 18,9 sur `|y| ≤ 2,85`, et le trou
reste dans `|y| ≤ 0,75`. Le perçage est donc **entièrement enfermé dans la matière**, à cheval
sur la jonction corps/languette — exactement comme dans le SCAD.

---

## 4. `buildBase()` — extrusion chanfreinée

Remplacer l'extrusion (lignes ~484-489). `ExtrudeGeometry` avec bevel produit exactement le
chanfrein du SCAD : contour rétréci de `bevelSize` aux deux extrémités, pleine section au milieu.

```js
baseGeom=new THREE.ExtrudeGeometry(baseShape(),{
  depth:T-2*CHAMFER, bevelEnabled:true,
  bevelThickness:CHAMFER, bevelSize:CHAMFER, bevelSegments:1, bevelOffset:0
});
baseGeom.translate(0,0,CHAMFER);   // z ∈ [-CHAMFER, depth+CHAMFER] → ramene a [0, T]
```

`bevelSegments:1` donne une facette plate (un vrai chanfrein, pas un congé).
Le reste de la fonction (matériau `matA`, `receiveShadow`, ajout à `model`) est inchangé.

---

## 5. Icônes réduites

**`BOLT_D` (ligne ~411)** : `8.12` → `5.5`.

Bilan sur une étiquette 1 unité : bloc icônes ≈ 5,5 + 1,6 + 7,6 = **14,7 mm**, ce qui laisse
`35,8 − 2,4 − 14,7 − 2 = 16,7 mm` au texte → hauteur de capitale effective ≈ **4 mm**,
soit très exactement le `text_size = 4.2` retenu par le SCAD.

**Généraliser l'ajustement automatique (lignes ~821-824)** : le code contient déjà une mise à
l'échelle du bloc d'icônes, mais conditionnée à `lwidth === 0.5` — une valeur qui **n'existe plus**
en Gridfinity. Supprimer la condition et appliquer la logique en permanence :
```js
const gTight=0.9, margin=0.9, natural=BOLT_D+gTight+headWfull;
const sc=Math.min(1,(W-2*margin)/natural); boltD=BOLT_D*sc; gapI=gTight*sc;
```
Les icônes ne rétrécissent alors que si la place manque vraiment.

**`applyTextPolicy()` (lignes ~763-779)** : toute la branche `bw===0.5` devient morte
(plus de 0,5 unité). La simplifier — plus de désactivation du champ texte, plus de `maxlength`,
plus de hint. La fonction et ses appels restent en place (elle gère aussi l'état du champ).
→ supprime au passage la seconde lecture de `ltype` (ligne 770).

**Hauteur de texte par défaut** : le champ `#textH` vaut `5.7` et son libellé annonce
« default 5.7 ». À cette valeur le texte sera systématiquement réduit automatiquement.
Passer la valeur et le libellé à **4.2** pour que l'affiché corresponde au réel.

---

## 6. Cadrage caméra

`fitCamera()` (lignes ~451-459) et `updateShadowCam()` (ligne ~443) bornent la vue sur `W` / `H`.
Avec les languettes, l'emprise réelle vaut `W + 2*TAB_EXT` — sans correction, les oreilles sont
rognées à l'écran. Utiliser la largeur totale :
```js
const hw=((W+2*TAB_EXT)/2)*margin, hh=(H/2)*margin;
```
(Les ombres sont désactivées — `renderer.shadowMap.enabled=false` — mais garder la cohérence.)

---

## 7. Points volontairement non modifiés

- **Typo et icônes** : `hersheyTextGeom` (export monotrait), `textGeomBuild` (aperçu police
  pleine), `ICON_DATA` — aucun changement.
- **Profil slicer X2D** : `PRINTER_PROFILES.x2d`, `layer_config_ranges.xml`, réglages par part
  (`textWall`, `iconFill`), `project` — inchangés. `T` étant lu dynamiquement, la plage du height
  range suivra automatiquement (`max_z` passera de 0,640 à **1,120**).
- **Branche `recessed`** (ligne ~861) : hérite du nouveau contour via `baseShape().getPoints(96)`
  (les trous sont ignorés par `getPoints`). Chemin **inatteignable** depuis l'UI — `#relmode` est
  caché et figé sur `raised`. Ne pas y toucher.
- **Titre « ModuBOX Label Generator »** : devient inexact en Gridfinity. Renommage cosmétique
  laissé de côté — à faire si tu le demandes.

---

## Verification

Serveur déjà actif sur `http://localhost:8712/index.html` (sinon `python3 -m http.server 8712`).
Recharger, puis dans la console du navigateur :

**1. Géométrie de la plaque**
```js
baseGeom.computeBoundingBox();
const b=baseGeom.boundingBox;
// attendu 1 unité : x ≈ ±18.9 (37.8 large), y ≈ ±5.75, z ∈ [0, 0.80]
```
- Emprise totale X = `W + 2` → **37,8 mm** (les languettes sont bien là)
- Z borné **exactement** à `[0, 0.80]` (le `translate(+CHAMFER)` a bien été appliqué)

**2. Contrôle visuel** — capture d'écran de l'aperçu :
- deux oreilles latérales à mi-hauteur, coins extérieurs légèrement arrondis
- deux perçages ronds visibles près de chaque extrémité
- arêtes chanfreinées (liseré incliné sur le pourtour)
- texte et icônes toujours centrés, texte lisible (≈ 4 mm)

**3. Sélecteur** : slider à 1/2/3 uniquement ; boutons ± bornés ; à 2 → `W=77,8`, à 3 → `W=119,8`.
La caméra doit cadrer sans rogner les languettes.

**4. Export 3MF** — capturer le blob sans télécharger :
```js
let cap=null; const oc=URL.createObjectURL, ck=HTMLAnchorElement.prototype.click;
URL.createObjectURL=b=>{cap=b;return 'blob:t';}; HTMLAnchorElement.prototype.click=()=>{};
build3MF(); URL.createObjectURL=oc; HTMLAnchorElement.prototype.click=ck;
const f=fflate.unzipSync(new Uint8Array(await cap.arrayBuffer()));
new TextDecoder().decode(f['Metadata/layer_config_ranges.xml']);
```
- `max_z` = **1.120** (0,80 + 0,32)
- les 3 parts `Base` / `Text` / `Icons` toujours présentes avec leurs réglages
- `project_settings.config` inchangé

**5. Cas limites** : texte vide, icônes décochées, texte long, catégorie « Nuts & Washers »
(la branche `nuts` utilise aussi `BOLT_D`, vérifier que l'icône reste proportionnée).

**6. Zéro erreur console.**

---

## Risques identifiés

- **Coins de languette + chanfrein** : `TAB_R` (0,2) égale `CHAMFER` (0,2) — sur la face
  chanfreinée le rayon tombe donc à 0 (le SCAD a exactement le même comportement, cf. `r1 =
  radius - size`). Si l'offset de bevel produit un artefact visuel sur ces petits congés, relever
  `TAB_R` à 0,3 ou abaisser `CHAMFER` à 0,15.
- **Chanfrein des perçages** : three.js chanfreine aussi les trous (léger fraisage aux deux
  faces), là où le SCAD soustrait un cylindre droit. Écart cosmétique et plutôt favorable —
  à signaler, pas à corriger.
- **Étiquettes 2 et 3 unités** : à 77,8 et 119,8 mm, le texte disposera de beaucoup d'espace ;
  vérifier qu'il ne devient pas disproportionné par rapport aux icônes réduites.
