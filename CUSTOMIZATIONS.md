# Customisations UA

Personnalisations spécifiques à l'Université des Antilles, conçues pour être
**additives et isolées** (pas d'écrasement de clés i18n existantes, CSS regroupé
dans des blocs balisés « custom UA », nouveaux fichiers plutôt que réécriture)
afin de limiter les conflits lors des montées de version amont
(`upstream` = EsupPortail/esup-otp-manager).

Ce document sert de **carte de résolution** lors d'un rebase/merge du fork sur une
nouvelle version amont : pour chaque thème, il liste les fichiers touchés, les
classes / clés i18n ajoutées, et **signale les fichiers amont modifiés** (donc à
risque de conflit). Voir la procédure « Rejouer à l'upgrade » en fin de document.

## Baseline du fork

- **Remote amont** : `upstream` → `https://github.com/EsupPortail/esup-otp-manager.git`
  (configuration locale, non poussée — c'est normal).
- **Commit de base** (merge-base `upstream/master` ↔ `refonte-ui`) :
  `9631d30` — *build(deps): bump ws, engine.io, socket.io-adapter…* (2026-05-23).
- **Version amont estimée** : `git describe` = **`v2.0.1-31-g9631d30`** →
  dernier tag publié **v2.0.1**, plus 31 commits de `master`. Au moment de la
  bascule, `refonte-ui` était **0 commit en retard / 83 en avance** sur
  `upstream/master` (le fork part donc du sommet de `master`, pas d'un tag figé).

> À l'upgrade, la cible sera le prochain tag amont (ex. `v2.1.0`) ou le nouveau
> sommet de `upstream/master`. Comparer toujours avec `upstream/master...refonte-ui`.

## Inventaire des fichiers divergents

Distinction **fichiers ajoutés** (sûrs — aucun équivalent amont, pas de conflit
possible) vs **fichiers amont modifiés** (⚠ risque de conflit au merge).

### Fichiers ajoutés — sûrs

| Thème | Fichiers |
|---|---|
| Toolchain Tailwind | `src/styles/tailwind.css`, `public/stylesheets/tailwind.css` (build minifié), `.husky/pre-commit` |
| Design system UA | `views/mixins/ua-design-system.pug`, `views/layout-ua.pug`, `views/layout-ua-login.pug`, `public/stylesheets/legacy-wrapper.css`, `public/stylesheets/ua-cartes-methodes.css` |
| Marque | `public/images/logo_ua.png`, `public/images/ua-logo.png` |
| Config dev | `.env.example` |
| Docs | `CUSTOMIZATIONS.md`, `docs/REFONTE-UI.md`, `docs/cartes-methodes-ua-INTEGRATION.md`, `docs/mockups/*.html` (22 maquettes) |

### Fichiers amont modifiés — ⚠ conflit possible

| Thème | Fichiers | Nature du risque |
|---|---|---|
| Build | `package.json`, `package-lock.json` | scripts + devDeps ajoutés ; conflit si amont touche `scripts`/`devDependencies` |
| Wiring CSS | `views/layout.pug` | `<head>` réécrit (legacy-wrapper, polices, tailwind) |
| Cascade legacy | `public/stylesheets/style.css` | 1 ligne (`.flex` → `#slide-out .flex`) |
| **App Vue (cœur)** | `public/javascripts/app.js` | **très fort** — fichier monolithique que l'amont édite activement |
| Login | `views/index.pug` | `extends` changé + page entièrement refaite |
| Templates méthodes | `views/templates/{bypass,totp,push,webauthn,esupnfc,passcode_grid,random_code,random_code_mail}-method.pug`, `transportForm.pug` | x-templates réécrits au design system |
| Dashboards | `views/templates/{admin,manager,stats,user}-dashboard.pug`, `user-view.pug` | x-templates réécrits |
| Home | `views/templates/home.pug` | réécrit |
| i18n | `properties/messages_fr.json`, `properties/messages_en.json` | additif **sauf** 3 valeurs amont surchargées (rebranding) |
| Fix serveur | `server/routes.js`, `server/routes/pagesRoutes.js` | greffes ciblées (fire-and-forget, DEV_AUTH, isManager/role) |
| Config dev | `properties/esup.json` | valeurs de dev local — **ne pas remonter** |
| `.gitignore` | `.gitignore` | additif (fin de fichier) |

### Fichiers supprimés

- `public/stylesheets/style-print-bypass-method-codes.css`
- `public/stylesheets/style-print-passcode_grid-method-codes.css`
  (voir thème **Impression MFA** → « Legacy retiré »).

---

## Toolchain Tailwind CSS 4 + hook Husky

Mise en place d'une chaîne Tailwind CSS 4 (CLI standalone) pour produire les
utilitaires consommés par tous les templates refondus.

- **Source** : `src/styles/tailwind.css` (directives `@import`, thème UA, blocs
  `@media print` balisés). **Build servi** : `public/stylesheets/tailwind.css`
  (minifié) — **généré, ne pas éditer à la main**.
- **`package.json`** (⚠ amont) : scripts `build:css`, `watch:css`, `prepare: husky` ;
  devDeps `@tailwindcss/cli`, `tailwindcss` (^4.3.0), `husky` (^9.1.7).
- **`.husky/pre-commit`** : si un `*.pug` ou un `src/styles/*.css` est mis en stage,
  lance `npm run build:css` et **ajoute automatiquement** `public/stylesheets/tailwind.css`
  au commit → cohérence permanente source ↔ build. **Aucune compilation manuelle
  n'est nécessaire** : c'est le hook qui régénère le CSS.

## Isolation cascade (legacy ↔ Tailwind)

Materialize + `style.css` historiques entrent en collision avec les utilitaires
Tailwind (un sélecteur sans `@layer` l'emporte sur une couche). Solution :

- **`public/stylesheets/legacy-wrapper.css`** (ajouté) : importe Materialize +
  `style.css` dans `@layer(legacy)`, qui passe **avant** les utilitaires Tailwind.
- **`views/layout.pug`** (⚠ amont) : `<head>` modifié — remplace les `<link>`
  Materialize/style.css par `legacy-wrapper.css`, ajoute les polices Google
  (Open Sans, Barlow Condensed), `tailwind.css` et `ua-cartes-methodes.css`.
- **`public/stylesheets/style.css`** (⚠ amont, 1 ligne) : `.flex` global trop
  intrusif restreint à `#slide-out .flex` (sinon casse les `flex` Tailwind).

## Design system UA

Primitives et gabarits réutilisables (couleurs `ua-navy`/`ua-blue`/`ua-indigo`,
polices display, logos, composants).

- **`views/mixins/ua-design-system.pug`** (ajouté) : mixins Pug partagés
  (ex. `+ua-logo(size)`), réutilisés par les layouts et les templates.
- **`views/layout-ua.pug`** (ajouté) : gabarit principal des pages applicatives.
- **`views/layout-ua-login.pug`** (ajouté) : gabarit de la page de connexion.
- **`public/stylesheets/ua-cartes-methodes.css`** (ajouté) : styles des cartes de
  méthodes (vue éventail/bento) hors champ Tailwind.
- **`public/javascripts/app.js`** (⚠ amont, **cœur**) : tous les composants Vue
  (Home, méthodes, dashboards, sidebar, score…) ont été enrichis/restylés ici.
  C'est le **principal point de conflit** car l'amont y ajoute régulièrement de la
  logique. Voir conseils de résolution dans la procédure d'upgrade.

## Login

- **`views/index.pug`** (⚠ amont) : `extends layout-ua-login.pug` ; page refaite
  (bandeau institutionnel, logo en médaillon, carte de connexion, bouton CAS,
  note sécurité, pied DSIN). Bouton pointe vers `/login`. Titres via
  `messages.api.title` / `messages.api.index`.

## Topbar · Sidebar · Footer

Implémentés dans `public/javascripts/app.js` + `views/templates/home.pug` +
layouts. Points clés : topbar logo couleur seul (sans wordmark), sidebar
« drill-down » à rail repliable (hover-expand) propagée à user/manager/admin/stats,
footer combiné aide/assistance + bande institutionnelle UA + email support DSIN.

## Home

- **`views/templates/home.pug`** (⚠ amont) + logique dans `app.js`.
- Fonctions : **score de sécurité pondéré** (anneau/knob animé, bandeau), thème
  « Hero » avec méthodes groupées en 3 sections, **vue éventail « vitrine »**
  (alternative à la grille, défilement auto réglable) et **vue bento** avec aperçu
  modal, suggestion de prochaine étape (« 1-click » pour les méthodes simples),
  désactivation directe avec confirmation, **dock d'aide** par méthode.
- Textes externalisés en i18n (panneau score Hero, thèmes) — voir i18n.

## Templates de méthodes

Tous migrés au design system UA (⚠ tous amont) :
`bypass-method`, `totp-method`, `push-method`, `webauthn-method`,
`esupnfc-method`, `passcode_grid-method`, `random_code-method`,
`random_code_mail-method`, `transportForm`. Faits marquants : TOTP refait en
3 étapes claires (étape 1 conditionnelle), Push aligné sur le modèle stepper TOTP,
bypass en cartes KPI + liste verticale, erreurs internes `random_code`
centralisées dans un helper Swal.

## Dashboards

Migrés au design system (⚠ tous amont) : `admin-dashboard`, `manager-dashboard`,
`stats-dashboard`, `user-dashboard`, `user-view`. Props `infos`/`methods`/`user`
explicitées sur les composants ; titre de document interpolé avec
`messages.api.title`. Sidebar drill-down propagée à tous.

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
2. **Carte CR80** (grille **et** codes de secours) : 2ᵉ bouton « Carte » ; élément à
   dimensions fixes 85,6 × 54 mm (mini-branding + grille compacte ou 10 codes mono sur
   2 colonnes) imprimé sur page standard, à découper. Piloté par `printMode`
   (`'sheet'` | `'card'`) posé avant `window.print()`, sur `BypassMethod` et
   `PasscodeGridMethod`. La carte porte un **contour de découpe en pointillés** au bord
   exact + de discrets **repères de coupe** aux 4 coins (`.ua-print-cr80::after`,
   `@media print` uniquement — n'affecte pas l'A4).

### Fichiers touchés
- `views/templates/bypass-method.pug` — bloc `.ua-print-sheet` (sous-blocs `.ua-print-a4`
  + `.ua-print-cr80`) ; 2 boutons (`printAs('sheet'|'card')`) ; `print:hidden` sur les
  éléments écran (KPI, liste, date, bouton régénérer).
- `views/templates/passcode_grid-method.pug` — bloc `.ua-print-sheet` (sous-blocs
  `.ua-print-a4` + `.ua-print-cr80`) ; 2 boutons (`printAs('sheet'|'card')`) ;
  `print:hidden` sur les éléments écran.
- `public/javascripts/app.js` — `BypassMethod` et `PasscodeGridMethod` : `data.printMode`
  + méthode `printAs(mode)` (pose le mode puis `$nextTick(window.print)`).
- `src/styles/tailwind.css` — bloc **unique** `@media print` balisé « IMPRESSION MFA —
  custom UA » + `@page { size: A4; margin: 16mm 14mm }`. (Le CSS servi
  `public/stylesheets/tailwind.css` est régénéré par le hook de pré-commit ; ne pas le
  recompiler à la main.)
- `properties/messages_fr.json`, `properties/messages_en.json` — bloc additif
  `api.print`.
- `views/templates/user-dashboard.pug`, `views/templates/user-view.pug` — `print:hidden`
  sur l'en-tête méthode (titre / description / badge Activé / interrupteur) afin de ne
  garder que la feuille brandée à l'impression.

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
`ua-print-cr80-grid`, `ua-print-cr80-codes`.

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

## i18n (FR / EN)

`properties/messages_fr.json` et `properties/messages_en.json` (⚠ amont).
**+144 / −6 lignes** chacun. Quasi entièrement **additif** (panneau score Hero,
thèmes home, `api.print`, deeplink `%DEEPLINK%` aligné FR↔EN). **⚠ 3 valeurs amont
surchargées** (rebranding, à conserver côté UA au merge) :

| Clé | Amont | UA |
|---|---|---|
| `api.title` | `ESUP OTP Manager` | `Manager des Facteurs d'Authentification` |
| `api.index` | `Interface de gestion de l'authentification renforcée…` | `sécuriser l'accès à vos données.` |
| `*.esupnfc.name` | `EsupNFC` | `Ma carte UA` |

## Fixes serveur (Manager + DEV_AUTH)

- **`server/routes.js`** (⚠ amont) — 3 greffes ciblées :
  1. expose `isManager` + `role` dans le contexte de vue (`/preferences`) ;
  2. `updateApiUser` : `.catch()` sur l'appel **fire-and-forget** issu de
     `serializeUser` (un rejet non capté tuait le process) — loggue et continue ;
  3. branche **`DEV_AUTH`** : si `process.env.DEV_AUTH === 'true'` (et **hors
     production** — sinon `throw`), bypass le backend d'auth réel avec un stub `dev`.
- **`server/routes/pagesRoutes.js`** (⚠ amont) — sous l'auth `dev`, ajoute
  `/login` (connecte `DEV_UID` ou `devuser`) et `/logout`. Branche
  **additive** (`else if name == 'dev'`), n'altère pas les chemins CAS/autres.

## Config dev local (⚠ ne pas remonter upstream)

- **`properties/esup.json`** (⚠ amont) : valeurs de **développement local** —
  `casBaseURL` → `localhost:4000/cas`, secrets placeholders, `admins:["devuser"]`,
  `managers:[]`, `default_language: fr`, log `debug`. **Divergence volontaire à
  garder locale** : au merge, conserver soit ces valeurs de dev, soit celles
  d'amont selon l'environnement — ne jamais propager ces secrets en production.
- **`.env.example`** (ajouté) : modèle des variables d'env (dont `DEV_AUTH`,
  `DEV_UID`).
- **`.gitignore`** (⚠ amont, additif en fin de fichier) : `*.bak`, `*.pug.org`,
  `.claude/`, `*:Zone.Identifier`.

## Marque & docs

- **`public/images/logo_ua.png`**, **`public/images/ua-logo.png`** (ajoutés).
- **`docs/REFONTE-UI.md`**, **`docs/cartes-methodes-ua-INTEGRATION.md`**,
  **`docs/mockups/*.html`** (22 maquettes) — documentation de conception, sans
  impact runtime.

---

## Rejouer à l'upgrade (procédure)

But : rebaser/merger le fork sur une nouvelle version amont en minimisant les
régressions, guidé par l'inventaire ci-dessus.

1. **Récupérer l'amont**
   ```sh
   git fetch upstream --tags
   git log --oneline refonte-ui..upstream/master   # nouveautés amont
   ```
   Choisir la cible : prochain tag (`git tag -l 'v*' | sort -V | tail`) ou
   `upstream/master`.

2. **Brancher & fusionner** (jamais directement sur `refonte-ui`)
   ```sh
   git switch -c upgrade/<cible> refonte-ui
   git merge <cible>          # ou : git rebase <cible>
   ```

3. **Résoudre les conflits, par ordre de risque** (cf. tableau « amont modifiés ») :
   - **`public/javascripts/app.js`** (cœur) : conflit le plus probable. Garder la
     logique amont nouvelle **et** réappliquer les enrichissements UA (composants
     Home/score/sidebar, `printMode`/`printAs`). Comparer composant par composant.
   - **Templates `.pug`** réécrits : si l'amont change peu, garder la version UA ; s'il
     ajoute une fonctionnalité, la reporter dans le template UA.
   - **`messages_{fr,en}.json`** : garder tout l'additif UA + **les 3 surcharges**
     (`api.title`, `api.index`, `esupnfc.name`) ; intégrer les nouvelles clés amont.
   - **`server/routes.js` / `pagesRoutes.js`** : réappliquer les 3 greffes (catch
     fire-and-forget, `DEV_AUTH`, `isManager`/`role`) et la branche dev `/login`.
   - **`layout.pug`** : conserver le `<head>` UA (legacy-wrapper + tailwind + polices).
   - **`package.json`** : garder scripts `build:css`/`watch:css`/`prepare` + devDeps
     Tailwind/Husky ; fusionner les bumps de deps amont. Puis `npm install`.
   - **`esup.json`** : ne pas propager les secrets de dev ; réaligner sur l'env cible.

4. **Régénérer le CSS** : ne **pas** compiler à la main. Un commit touchant un `.pug`
   ou `src/styles/*.css` déclenche le **hook pre-commit** qui lance `npm run build:css`
   et ajoute `public/stylesheets/tailwind.css`. (En cas de hook absent : `npm run build:css`.)

5. **Vérifier** :
   ```sh
   node --check public/javascripts/app.js
   npm run build:css           # doit passer sans erreur
   ```
   Lancer l'appli (CAS réel ou `DEV_AUTH=true`), contrôler : login UA, home + score,
   chaque méthode, dashboards, **impression** (A4 + carte CR80, FR & EN),
   empty-state Manager.

6. **Finaliser** : `git switch refonte-ui && git merge --ff-only upgrade/<cible>`
   (ou PR). Mettre à jour la section **Baseline** de ce document (nouveau commit de
   base + version).
