# Customisations UA

Personnalisations spécifiques à l'Université des Antilles, conçues pour être
**additives et isolées** (pas d'écrasement de clés i18n existantes, CSS regroupé
dans des blocs balisés « custom UA ») afin de limiter les conflits lors des
montées de version amont (`upstream` = EsupPortail/esup-otp-manager).

## Impression MFA

Refonte de l'impression des **codes de secours** (bypass) et de la **grille de
codes** (passcode_grid) en documents A4 brandés UA, plus une variante **carte
CR80** pour la grille.

### Mécanisme
- Bouton « Imprimer » → `window.print()` sur la vue en place (pas de fenêtre/route
  dédiée). Un bloc imprimable dédié (`.ua-print-sheet`, rendu `hidden print:block`)
  est ajouté dans chaque template ; le CSS `@media print` masque tout le reste
  (chrome applicatif + contenu écran marqué `print:hidden`) et ne révèle que ce bloc.
- Les libellés du document viennent de l'i18n (`messages.api.print.*`) et suivent la
  langue sélectionnée (DOM vivant, aucune perte de contexte).
- **Aucun identifiant de compte** n'est imprimé.

### Deux formats
1. **A4 brandé** (codes de secours + grille) : en-tête logo couleur + « Université des
   Antilles / Direction du Numérique — DSIN » + tag « MFA · {titre} » ; titre + mode
   d'emploi ; codes (mono, 2 colonnes, cases à cocher) ou grille (tableau en-tête navy,
   lignes alternées) ; encart sécurité ; pied « … · Document confidentiel ».
2. **Carte CR80** (grille uniquement) : 2ᵉ bouton « Carte » ; élément à dimensions fixes
   85,6 × 54 mm (mini-branding + grille compacte) imprimé sur page standard, à découper.
   Piloté par `printMode` (`'sheet'` | `'card'`) posé avant `window.print()`.

### Fichiers touchés
- `views/templates/bypass-method.pug` — bloc `.ua-print-sheet` A4 ; `print:hidden` sur
  les éléments écran (KPI, liste, date, bouton régénérer).
- `views/templates/passcode_grid-method.pug` — bloc `.ua-print-sheet` (sous-blocs
  `.ua-print-a4` + `.ua-print-cr80`) ; 2 boutons (`printAs('sheet'|'card')`) ;
  `print:hidden` sur les éléments écran.
- `public/javascripts/app.js` — `PasscodeGridMethod` : `data.printMode` + méthode
  `printAs(mode)` (pose le mode puis `$nextTick(window.print)`).
- `src/styles/tailwind.css` — bloc **unique** `@media print` balisé « IMPRESSION MFA —
  custom UA » + `@page { size: A4; margin: 16mm 14mm }`. (Le CSS servi
  `public/stylesheets/tailwind.css` est régénéré par le hook de pré-commit ; ne pas le
  recompiler à la main.)
- `properties/messages_fr.json`, `properties/messages_en.json` — bloc additif
  `api.print`.

### Clés i18n ajoutées (additives, sous `api.print`)
`codes_title`, `codes_intro`, `grid_title`, `grid_intro`, `security`, `footer`
(FR et EN).

### Classes CSS ajoutées (toutes en `@media print`)
`ua-print-sheet`, `ua-print-head`, `ua-print-logo`, `ua-print-org`,
`ua-print-org-name`, `ua-print-org-sub`, `ua-print-tag`, `ua-print-title`,
`ua-print-intro`, `ua-print-codes`, `ua-print-check`, `ua-print-code`,
`ua-print-grid`, `ua-print-security`, `ua-print-foot` ; variante carte :
`ua-print--sheet`/`ua-print--card`, `ua-print-a4`, `ua-print-cr80`,
`ua-print-cr80-head`, `ua-print-cr80-logo`, `ua-print-cr80-tag`,
`ua-print-cr80-grid`.

### Legacy retiré
- `<link rel="stylesheet" media="print">` supprimés des 2 templates.
- Fichiers supprimés : `public/stylesheets/style-print-bypass-method-codes.css`,
  `public/stylesheets/style-print-passcode_grid-method-codes.css`
  (utilisaient `visibility:hidden` + `position:absolute` → source de conflits ; plus
  aucune référence).

### Vérification
Rendu SSR (Vue + `@vue/server-renderer`) des deux x-templates en FR et EN : bloc print
présent, en-tête/logo, codes & grille rendus, encart sécurité + pied, bascule
A4 ↔ carte CR80, 0 erreur / 0 warning ; `node --check` sur `app.js`.
