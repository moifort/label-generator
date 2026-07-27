# X2D printer profile + smart 3MF export — Design

**Date:** 2026-07-24
**Fichier cible:** `index.html` (application single-file, ModuBOX Label Generator v1.0.0)

## Contexte

L'app génère des étiquettes 2 couleurs pour boîtes ModuBOX et exporte en STL et 3MF.
Le 3MF actuel ([`build3MF`](../../../index.html)) produit déjà un projet Bambu Studio valide :
2 objets (Base = extrudeur 1, Text+icons = extrudeur 2), assemblés en un objet imprimable,
avec `Metadata/model_settings.config` (noms + extrudeurs) et `Metadata/project_settings.config`
(seulement `filament_colour` + `filament_type`).

But : quand l'utilisateur clique **Download 3MF**, embarquer automatiquement les réglages slicer
pertinents pour la **bande colorée du haut** (le texte), ciblés imprimante **X2D (dual-nozzle)**.

## Décisions (validées)

- **Cible :** X2D dual-nozzle uniquement pour l'instant. Champ extensible.
- **Portée d'embarquement :** height range modifier + overrides per-objet (approche robuste,
  qui s'applique même hors « ouvrir en tant que projet »). Hors périmètre : flush volumes
  (inutile en dual-nozzle, buses séparées), prime tower, wipe, Z-hop → gérés par le preset X2D.
- **Bande colorée :** hauteur de couche **0.08 mm**, **2 couches** → texte = **0.16 mm**.
- **Auto-sync :** sélectionner X2D force la hauteur du texte (`relief`) à `colorLayers × colorLayerHeight`
  (= 0.16 mm) pour que l'aperçu 3D corresponde à l'impression.

## Architecture

### 1. Champ UI « Printer type »

- `<select id="printer">` (cohérent avec les selects Drive/Head existants), label **« Printer type »**,
  placé en haut du panneau (sous « Box type » / au-dessus de « Category »).
- Une option : `<option value="x2d">X2D (dual-nozzle)</option>`, sélectionnée par défaut.
- Un `change` handler : applique l'auto-sync du profil (met `relief` = 0.16, déclenche `rebuild()`).

### 2. Objet profil (JS)

```js
const PRINTER_PROFILES = {
  x2d: {
    label: 'X2D (dual-nozzle)',
    colorLayers: 2,
    colorLayerHeight: 0.08,   // mm, bande du haut
    outerWallSpeed: 40,       // 30–50 mm/s
    topOneWall: 'all top',    // "One wall on top surface"
    ironing: 'no ironing',    // pas d'ironing (2 couleurs)
    syncTextHeight: true      // force relief = colorLayers*colorLayerHeight
  }
};
```

### 3. Export 3MF enrichi (quand profil actif)

Uniquement pour le style **raised** (texte en relief). Recessed → fallback comportement actuel
(pas de bande colorée en surface, l'approche 2-couches-du-haut ne s'applique pas).

Ajout d'un nouveau fichier au zip : **`Metadata/layer_config_ranges.xml`**.

Schéma authentifié depuis `bbs_3mf.cpp` / `PrintConfig.cpp` (BambuStudio) :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<objects>
 <object id="1">
  <range min_z="MIN_Z" max_z="MAX_Z">
   <option opt_key="layer_height">0.08</option>
   <option opt_key="top_one_wall_type">all top</option>
   <option opt_key="ironing_type">no ironing</option>
   <option opt_key="outer_wall_speed">40</option>
  </range>
 </object>
</objects>
```

**Points de correction critiques (vérifiés dans la source Bambu) :**

- L'`id` de `<object>` est **l'index 1-based de l'objet modèle**, PAS l'`objectid` de ressource 3MF.
  Notre 3MF assemble Base+Text en un seul objet imprimable → **`id="1"`**.
  (Exporteur: `obj_tree.put("<xmlattr>.id", object_cnt)` ; importeur: `find(object.second + 1)`.)
- Bornes Z dynamiques : `MIN_Z = baseT`, `MAX_Z = baseT + colorLayers*colorLayerHeight`
  (défauts : 0.30 et 0.46). Recalculées à l'export selon les valeurs réelles.
- Enums exactes confirmées : `top_one_wall_type` ∈ {`not apply`,`all top`,`topmost`} →
  on utilise `all top`. `ironing_type` ∈ {`no ironing`,`top`,`topmost`,`solid`} → `no ironing`.
- `outer_wall_speed` est de type `coFloats` (tableau per-extrudeur) : override dans une range
  = best-effort ; s'il est ignoré par le slicer, aucun effet néfaste.

**`[Content_Types].xml` :** ajouter `<Default Extension="xml" ContentType="application/xml"/>`
pour la validité OPC (le nouveau fichier a l'extension `.xml`). Pas de relationship nécessaire
(comme les `.config` actuels, trouvés par convention de chemin).

### 4. Non touché

- Export **STL** inchangé.
- Branche 3MF « sans relief » (pas de texte) inchangée.
- Si aucun profil ne correspond → comportement 3MF actuel (fallback).

## Flux de données

`printer select` → `PRINTER_PROFILES[value]` → (à l'export) bornes Z calculées depuis
`baseT` + profil → `layer_config_ranges.xml` injecté dans le zip fflate aux côtés des
fichiers existants.

## Tests / vérification

- **Structure zip :** dézipper le 3MF exporté, confirmer présence + contenu de
  `Metadata/layer_config_ranges.xml` (id, min_z/max_z, 4 options).
- **XML valide :** parse sans erreur.
- **Bornes dynamiques :** changer `baseT` → min_z/max_z suivent.
- **Auto-sync :** sélectionner X2D → `relief` passe à 0.16, aperçu 3D mis à jour.
- **Non-régression :** STL et 3MF « sans relief » inchangés ; ouverture du 3MF sans erreur.
- **Validation manuelle (utilisateur) :** ouvrir le 3MF dans Bambu Studio, vérifier que le
  height range modifier apparaît sur la bande du texte à 0.08 mm.

## Hors périmètre (assumé)

Flush volumes, prime tower, wipe, Z-hop, vitesses globales, sélection de preset imprimante/filament.
Ajout d'autres imprimantes que X2D.
