# Refonte UI — branche `refonte-ui`

> Document de suivi de la migration UI vers la charte UA + Tailwind v4.
> Vivant : à mettre à jour à chaque jalon (nouveau template migré, changement de stack, piège découvert).

## Contexte projet

Fork personnel de `EsupPortail/esup-otp-manager` (Vue 3 + Express + Pug + Materialize d'origine). On migre l'interface vers la **charte UA (Université des Antilles)** sur **Tailwind CSS v4** sans casser la coexistence avec Materialize (legacy) ni la logique Vue.

- Remote `origin` : `git@github.com:tolobial/esup-otp-manager.git`
- Branche de travail : `refonte-ui`
- Branche de référence amont : `master` (suit `EsupPortail/esup-otp-manager`)

## Stack technique en place

- **Tailwind 4** via `@tailwindcss/cli` (devDep) — voir `package.json`
  - source : `src/styles/tailwind.css` (theme tokens UA, layers, mixins `[data-tw]`)
  - build : `npm run build:css` (minifié) ou `npm run watch:css`
  - sortie : `public/stylesheets/tailwind.css` — **committée** (NB : retirée de `.gitignore` pour que GitHub serve l'URL raw)
- **Wrapper legacy** : `public/stylesheets/legacy-wrapper.css` charge `materialize.min.css` + `style.css` dans `@layer(legacy)` → les utilitaires Tailwind unlayered gagnent la cascade sans toucher au legacy
- **`[data-tw]`** : marqueur sur les conteneurs refondus → CSS `:has([data-tw])` masque la sidebar Materialize legacy et neutralise les paddings

## Tokens UA (`@theme` dans `src/styles/tailwind.css`)

| Token | Valeur | Usage |
|---|---|---|
| `ua-blue` | `#00A0DC` | Accents, focus rings, markers de liste |
| `ua-navy` | `#202E56` | Titres, CTA primaire, fond sidebar |
| `ua-indigo` | `#1107A0` | Hover du CTA primaire |
| `ua-orange` | `#CC5717` | Conseils, avertissement doux |
| `ua-crimson` | `#9B1E21` | Erreurs, suppression |
| `font-display` | Barlow Condensed | Titres uppercase tracking-wide |
| `font-sans` | Open Sans | Texte courant |
| `--radius-*` | `2px` partout (sauf `full`) | Posture institutionnelle quasi-rectangulaire |

## Lancement local

Pas de CAS local. Il existe un stub `DEV_AUTH` (commit `54d6a91`) qui crée une session factice côté Express.

```bash
DEV_AUTH=true node run
# avec UID custom (utile pour tester manager/admin via esup.json) :
DEV_AUTH=true DEV_UID=devuser node run
```

Sans `DEV_AUTH=true`, le clic sur login redirige vers `http://localhost:4000/cas/login` → 404 (pas de vrai CAS).

L'app écoute sur `localhost:4000`. L'API OTP (autre repo `esup-otp-api`) est attendue sur `localhost:3000` (cf. `properties/esup.json`).

> ⚠️ Le code ne charge **pas** `dotenv` → un `.env` ne sera pas lu, il faut exporter `DEV_AUTH` dans l'environnement du shell.

## Historique des commits sur `refonte-ui` (depuis `master`)

```
6dd7748 feat(ui): migrate push-method template to UA design system
493b8ea feat(ui): migrate transportForm and random_code wrappers to UA design system
88c19eb feat(ui): migrate totp-method template to UA design system
03108e6 feat(ui): migrate bypass-method template to UA design system
b5d3323 fix(ui): make Home navigate accept events from new sidebar
5711f59 feat(ui): unlock manager/admin navigation in home sidebar
9971a18 fix(routes): catch fire-and-forget rejection in updateApiUser
0f2934f feat(ui): migrate index, home and root layout to UA design system
cea2d5a feat(ui): add UA design system primitives
0fcdf08 build(ui): set up Tailwind CSS 4 toolchain
38aba67 docs(mockups): add 6 missing mockups (layout, index, home, admin, stats, mfa-home)
115df85 docs(mockups): add 15 UI mockups (D + J style)
1bcb411 chore: add *.bak to .gitignore
f1bc264 config(dev): adapt esup.json for local autonomous dev environment
0f59993 Merge branch 'master' into refonte-ui
54d6a91 feat(dev): add DEV_AUTH stub for local UI development
```

## État de migration des vues

### Migrés (Tailwind + palette UA)

- `views/layout.pug` — charge tailwind.css, legacy-wrapper.css, fonts UA
- `views/index.pug` — page de login (CAS card UA)
- `views/layout-ua.pug`, `views/layout-ua-login.pug` — nouveaux layouts UA
- `views/mixins/ua-design-system.pug` — mixins (logo, etc.)
- `views/templates/home.pug` — dashboard avec sidebar rétractable CSS-only
- `views/templates/bypass-method.pug` — codes de secours
- `views/templates/totp-method.pug` — enrôlement TOTP (deuxième colonne validation)
- `views/templates/push-method.pug` — appairage Esup Auth
- `views/templates/transportForm.pug` — composant partagé SMS/Mail
- `views/templates/random_code-method.pug` — wrapper SMS + Mail
- `views/templates/random_code_mail-method.pug` — wrapper Mail seul

### Pas encore migrés (encore en Materialize)

| Fichier | Mockup de référence dispo |
|---|---|
| `views/templates/webauthn-method.pug` | `docs/mockups/method-webauthn.html` |
| `views/templates/passcode_grid-method.pug` | (aucun) |
| `views/templates/esupnfc-method.pug` | (aucun — fichier quasi-vide) |
| `views/templates/manager-dashboard.pug` | `docs/mockups/manager-dashboard.html` |
| `views/templates/admin-dashboard.pug` | `docs/mockups/admin-dashboard.html` |
| `views/templates/stats-dashboard.pug` | `docs/mockups/stats-dashboard.html` |
| `views/templates/user-dashboard.pug` | (aucun direct, voir `home.html`) |
| `views/templates/user-view.pug` | `docs/mockups/user-view.html` |
| `views/dashboard.pug` (root, Materialize) | `docs/mockups/layout.html` |

### Mockups disponibles non encore consommés

`docs/mockups/error-pages.html`, `mfa-home-ua.html`, `mfa-index-launcher.html`.

## Changements serveur / client JS

- `server/routes.js`
  - `/manager/infos` expose désormais `isManager` (bool) et `role` (string) — utilisés par la sidebar pour conditionner Statistiques / Manager / Administration
  - `updateApiUser` (fire-and-forget depuis `serializeUser`) : `.catch` ajouté pour éviter `unhandledRejection` qui tuait le process
- `public/javascripts/app.js`
  - `Home.methods.navigate` accepte string **ou** event DOM. Tente d'abord un clic sur une sidenav legacy (id matching), sinon délègue à `this.$root.navigate({ target: { name } })`. Indispensable depuis que la sidebar est *à l'intérieur* du composant Home.

## Workflow utilisé (à reproduire)

Pour chaque migration de template, l'utilisateur fournit le **contenu complet** du fichier Pug et demande :

1. **Drift check** : lire le fichier actuel — si Tailwind déjà présent, **stopper** et signaler
2. **Remplacement intégral** (pas de patch partiel)
3. Afficher `git diff <fichier>` et **rien d'autre**
4. **Pas de commit** — l'utilisateur relit, dit "commit et push"
5. Commits thématiques (`feat(ui): migrate X to UA design system`) avec `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
6. Après push, vérification que l'URL raw GitHub renvoie 200 (`raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/...`)

## Pièges connus / à garder en tête

1. **`public/stylesheets/tailwind.css` est committé** (38 KB, retiré du `.gitignore`). Si on touche `src/styles/tailwind.css` ou qu'on utilise de nouvelles classes utilitaires, il faut **rebuilder** (`npm run build:css`) et commiter le résultat — sinon les URLs raw seront décalées.
2. **Sidebar dans `home.pug`** : la sidebar UA vit *à l'intérieur* du composant Home (pas dans le layout). Le `currentView = 'manager'/'admin'/'stats'` est un switch client-side Vue, pas une vraie navigation — le composant `manager-dashboard.pug` ne fait pas d'appel API au mount (sauf si `?user=xxx` dans l'URL).
3. **Sidebar rétractable** : checkbox CSS-only via `:has(#sidebar-toggle:checked)` dans `src/styles/tailwind.css`. Pas de JS, pas de localStorage (état perdu au refresh).
4. **Le wrapper legacy** intercepte les fuites de `nav`, `header`, `footer`, `h1-h6` du legacy via `[data-tw] {...}` dans `@layer base`. Si une vue refondue casse visuellement, vérifier qu'elle est bien marquée `[data-tw]` quelque part au-dessus.
5. **Pas d'i18n sur le nouveau hardcoded** : certaines chaînes ajoutées dans les nouveaux templates (ex: "Pairer votre application Esup Auth", "Appareil pairé", labels de la sidebar) sont en dur en français. L'app supporte FR/EN via `properties/messages_*.json`. À nettoyer en fin de migration si le i18n complet est requis.
6. **`infos.isManager` / `infos.role`** ne sont pas dans le state initial Vue (`data() { return { infos: { ... } } }` côté `app.js` ligne ~1359). Ils arrivent via `getInfos()` (fetch `/manager/infos`). Au premier render avant fetch, `infos.isManager` est `undefined` → les entrées Manager/Stats/Admin sont absentes puis apparaissent. Pas un bug mais à savoir.
7. **`esup-otp-api` doit tourner** sur `localhost:3000` pour que `/manager/infos`, `/api/user`, etc. répondent. Sans ça, beaucoup de `fetchApi` redirigent vers `/login`.

## Référence rapide — URLs raw des fichiers clés (branche `refonte-ui`)

```
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/src/styles/tailwind.css
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/public/stylesheets/tailwind.css
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/public/stylesheets/legacy-wrapper.css
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/layout.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/index.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/templates/home.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/templates/bypass-method.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/templates/totp-method.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/templates/push-method.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/templates/transportForm.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/templates/random_code-method.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/views/templates/random_code_mail-method.pug
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/public/javascripts/app.js
https://raw.githubusercontent.com/tolobial/esup-otp-manager/refonte-ui/server/routes.js
```

## Prochaine étape proposée

Continuer la migration des templates de méthodes restants par ordre de complexité croissante :

1. **`webauthn-method.pug`** — mockup `method-webauthn.html` dispo, méthode autonome
2. **`passcode_grid-method.pug`** — pas de mockup, à concevoir en cohérence avec totp/bypass
3. **`esupnfc-method.pug`** — fichier quasi-vide, voir si à supprimer ou stub minimal
4. **Dashboards** (admin / manager / stats) — plus gros, fortes interactions
5. **`user-view.pug`** + **`user-dashboard.pug`** — surfaces partagées
6. **`views/dashboard.pug`** (la page racine encore Materialize) — fin de chantier
