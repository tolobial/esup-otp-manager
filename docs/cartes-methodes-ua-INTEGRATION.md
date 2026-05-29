# Intégration « Cartes méthodes UA » — vue éventail

Objectif : ajouter une **2ᵉ vue** de la page d'accueil (un éventail vitrine avec spot
lumineux) **à côté** de ta grille actuelle, avec un sélecteur pour basculer de l'une à
l'autre et la mémorisation du choix. La grille reste la vue par défaut (gestion) ;
l'éventail est la vue vitrine.

Trois fichiers concernés, dans cet ordre :

1. `public/stylesheets/ua-cartes-methodes.css` (fourni) — le style.
2. `public/javascripts/app.js` — la logique (composant `Home`).
3. `views/templates/home.pug` — le balisage (template `#home-dashboard`).

---

## Étape 1 — Charger la feuille de style

Copie `ua-cartes-methodes.css` dans `public/stylesheets/`, puis ajoute le lien dans ta
mise en page (ex. `views/layout.pug` / `layout.jade`), **après** les CSS existants :

```html
link(rel="stylesheet" href="/stylesheets/ua-cartes-methodes.css")
```

> Tout y est préfixé `.ua-`, donc aucun risque de collision avec Materialize ou Tailwind.

---

## Étape 2 — Ajouter la logique au composant `Home` (`app.js`)

Ton composant actuel ressemble à ceci :

```js
var Home = Vue.extend({
    props: { messages: Object, 'methods': Object /*, user, infos ... */ },
    methods: {
        navigate: function (name) { document.getElementById(name).click(); }
    },
    template: '#home-dashboard'
});
```

Ajoute **`data`** et **`computed`**, et **fusionne** les nouvelles fonctions dans le
`methods` existant (ne crée pas un 2ᵉ bloc `methods:` — Vue n'en garde qu'un).

```js
var Home = Vue.extend({
    props: { messages: Object, 'methods': Object /*, user, infos ... */ },

    data: function () {
        return {
            // 'grid' (gestion, défaut) | 'fan' (vitrine)
            homeView: (function () { try { return localStorage.getItem('ua-home-view') || 'grid'; } catch (e) { return 'grid'; } })(),
            fanActive: 0,
            fanMode: 'fan',     // 'fan' | 'pairs'
            _fanIdle: null
        };
    },

    computed: {
        // méthodes visibles, sous forme de tableau (indices stables pour l'éventail)
        visibleMethods: function () {
            var m = this.methods;
            return Object.keys(m)
                .filter(function (k) { return m[k].activate && m[k].authorize; })
                .map(function (k) { return m[k]; });
        }
    },

    methods: {
        // --- TON EXISTANT : garde-le tel quel ---
        navigate: function (name) { document.getElementById(name).click(); },

        // --- NOUVEAU : vue éventail ---
        setHomeView: function (v) {
            this.homeView = v;
            try { localStorage.setItem('ua-home-view', v); } catch (e) {}
        },
        fanColor: function (i) { return ['bleu', 'navy', 'warm'][i % 3]; },
        fanOff: function (i) {
            var n = this.visibleMethods.length;
            var r = i - this.fanActive;
            var alt = r > 0 ? r - n : r + n;
            return Math.abs(alt) < Math.abs(r) ? alt : r;
        },
        fanSlotStyle: function (i) {
            var W = 360, H = 168, maxOff = 2, spacing = 152, step = 10, depth = 140;
            if (this.fanMode === 'pairs') {
                var n = this.visibleMethods.length, rows = Math.ceil(n / 2);
                var r = Math.floor(i / 2), c = i % 2, last = (i === n - 1 && n % 2 === 1);
                var x = last ? 0 : (c === 0 ? -(W / 2 + 11) : (W / 2 + 11));
                var y = (r - (rows - 1) / 2) * (H + 22);
                return { transform: 'translate(-50%,-50%) translateX(' + x + 'px) translateY(' + y + 'px) scale(1)', opacity: 1, zIndex: 10, pointerEvents: 'auto' };
            }
            var o = this.fanOff(i), a = Math.abs(o), vis = a <= maxOff, lift = o === 0 ? -14 : 0;
            return {
                transform: 'translate(-50%,-50%) translateX(' + (o * spacing) + 'px) translateY(' + (a * 8 + lift) + 'px) translateZ(' + (-a * depth) + 'px) rotateZ(' + (o * step) + 'deg) scale(' + (o === 0 ? 1 : 0.9) + ')',
                opacity: vis ? 1 : 0,
                zIndex: 100 - a,
                pointerEvents: vis ? 'auto' : 'none'
            };
        },
        fanGo: function (i) { if (this.fanMode === 'fan') this.fanActive = i; },
        fanPrev: function () { if (this.fanMode === 'fan') { var n = this.visibleMethods.length; this.fanActive = (this.fanActive - 1 + n) % n; } },
        fanNext: function () { if (this.fanMode === 'fan') { var n = this.visibleMethods.length; this.fanActive = (this.fanActive + 1) % n; } },
        onCardClick: function (i, method) {
            // carte centrale (ou mode "par 2") => on ouvre la méthode ; sinon on la met au centre
            if (this.fanMode === 'pairs' || this.fanOff(i) === 0) this.navigate(method.name);
            else this.fanGo(i);
        },
        fanToggleMode: function () { this.fanClearIdle(); this.fanMode = this.fanMode === 'fan' ? 'pairs' : 'fan'; },
        fanStartIdle: function () { this.fanClearIdle(); if (this.fanMode === 'fan') { var self = this; this._fanIdle = setTimeout(function () { self.fanMode = 'pairs'; }, 5000); } },
        fanClearIdle: function () { if (this._fanIdle) { clearTimeout(this._fanIdle); this._fanIdle = null; } },
        fanLeave: function () { this.fanClearIdle(); if (this.fanMode === 'pairs') this.fanMode = 'fan'; }
    },

    template: '#home-dashboard'
});
```

---

## Étape 3 — Balisage dans `home.pug` (`#home-dashboard`)

Dans le template, repère ta grille :

```html
<!-- Grille des méthodes : 2 colonnes, cartes rectangulaires -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  ...
</div>
```

**3a.** Juste **avant** cette grille, ajoute le sélecteur de vue :

```html
<!-- Sélecteur de vue : grille (gestion) / éventail (vitrine) -->
<div class="ua-view-switch">
  <button type="button" @click="setHomeView('grid')" :class="{active: homeView === 'grid'}">Grille</button>
  <button type="button" @click="setHomeView('fan')"  :class="{active: homeView === 'fan'}">Éventail</button>
</div>
```

**3b.** Ajoute `v-if="homeView === 'grid'"` sur le `<div>` de ta grille :

```html
<div v-if="homeView === 'grid'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
  ...   <!-- ta grille existante, inchangée -->
</div>
```

**3c.** Juste **après** la balise fermante de cette grille, ajoute le modèle éventail :

```html
<!-- Modèle 2 : éventail vitrine -->
<div v-else class="ua-fan-zone">

  <div class="ua-fan-controls">
    <button type="button" class="ua-fan-btn" @click="fanToggleMode">
      {{ fanMode === 'fan' ? 'Aligner par 2' : "Revenir à l'éventail" }}
    </button>
  </div>

  <div class="ua-fan-stage" :class="{pairs: fanMode === 'pairs'}"
       @mouseenter="fanStartIdle" @mouseleave="fanLeave">
    <div class="ua-fan">
      <div v-for="(method, i) in visibleMethods" :key="method.name"
           class="ua-slot" :style="fanSlotStyle(i)">
        <div class="ua-inner">
          <span class="ua-spot"></span>
          <div class="ua-card" :class="'g-' + fanColor(i)" @click="onCardClick(i, method)">
            <div class="ua-ic"><method-icon :name="method.name" :size="'8'"></method-icon></div>
            <div class="ua-meta">
              <h3>{{ method.label || method.name }}</h3>
              <p>{{ messages.api.home[method.name] }}</p>
            </div>
            <span class="ua-badge"
                  :class="{ on: user.methods[method.name] && user.methods[method.name].active }">
              {{ (user.methods[method.name] && user.methods[method.name].active)
                  ? messages.api.home.activated : messages.api.home.deactivated }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="ua-fan-nav">
    <button type="button" @click="fanPrev" aria-label="Précédent">‹</button>
    <span class="ua-fan-dots">
      <button v-for="(method, i) in visibleMethods" :key="'dot-' + method.name"
              type="button" :class="{ on: fanOff(i) === 0 }"
              @click="fanGo(i)" :aria-label="method.label || method.name"></button>
    </span>
    <button type="button" @click="fanNext" aria-label="Suivant">›</button>
  </div>

</div>
```

C'est tout. Le bandeau « Score de sécurité » et le dock de tutos restent où ils sont.

---

## Comment ça marche (résumé)

- `homeView` décide quel modèle s'affiche (`v-if` / `v-else`). Le choix est mémorisé
  dans `localStorage` → il persiste d'une visite à l'autre, par navigateur.
- L'éventail réutilise **tes données existantes** : `visibleMethods` (dérivé de
  `methods`), `user.methods[...].active`, `navigate(method.name)`, et ton composant
  `method-icon`. Rien de neuf côté API.
- Survol = spot blanc + relief. Hors survol, les cartes **défilent automatiquement**
  (~3 s/carte) ; le survol met le défilement en pause. **10 s** de survol sans clic =
  alignement par 2. Clic sur la carte centrale = ouvrir la méthode (comme dans la grille).

## Régler la vitesse et les minuteurs

Tout se règle dans `public/javascripts/app.js`, dans le `data()` du composant `Home` —
de simples nombres en millisecondes, modifiables sans rien casser :

- `fanInterval: 3000` → vitesse du défilement automatique (ms entre deux cartes).
- `fanIdleDelay: 10000` → délai de survol avant le passage en 2 colonnes.

Pour que le second soit éditable au même endroit, déclare `fanIdleDelay: 10000` dans
`data()` et utilise `this.fanIdleDelay` (au lieu du `10000` en dur) dans `fanStartIdle`.

La vitesse de rotation du spot lumineux est, elle, dans
`public/stylesheets/ua-cartes-methodes.css` : `animation: ua-rotbd 3.5s` (baisse la
valeur pour un spot plus rapide).

Après modification : redémarre le serveur Node et fais un rechargement forcé du
navigateur (Ctrl+Shift+R).

## Ajouter un 3ᵉ modèle plus tard

C'est la force de cette structure : un nouveau modèle = une valeur de plus pour
`homeView` (`'classic'`…), un bouton de plus dans `.ua-view-switch`, et un bloc
`v-else-if="homeView === 'classic'"` avec son balisage. La logique et les données
restent partagées.

---

## Points de vigilance (honnêtes)

- **Icônes** : ton `method-icon` rend des SVG aux couleurs « en dur » (bleu `#63AFDB`,
  gris `#707384`). Sur les cartes sombres elles restent lisibles mais ne reprennent pas
  la teinte de la carte. Si tu veux des icônes blanches uniformes sur l'éventail, il
  faudra des SVG monochromes dédiés (ou les recolorer en CSS via `mask`).
- **`@property`** : géré par Chrome/Edge/Safari et Firefox ≥ 128. Sur un très vieux
  navigateur, le spot s'affiche fixe au lieu de tourner — non bloquant.
- **Largeur** : l'éventail est pensé pour le desktop. Sur mobile, garde la **grille**
  comme vue par défaut (elle s'empile proprement) ; l'éventail reste une option.
- **Ergonomie** : l'éventail est une vitrine. Pour la gestion quotidienne (voir/activer
  vite toutes les méthodes), la grille reste la plus efficace — d'où le choix par défaut
  sur `'grid'`.
