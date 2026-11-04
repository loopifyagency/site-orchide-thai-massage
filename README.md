# Orchidée Thai Massage — site vitrine

Site one-page du salon de massage thaïlandais **Orchidée Thai Massage** (4 Rpe du Vieux Bourg, 29200 Brest).
Objectif : faire prendre rendez-vous (appel au 06 08 42 74 92).

Site statique, sans étape de build : HTML + CSS + JS. GSAP, ScrollTrigger, Lenis et les polices
(Fraunces, Figtree) sont **auto-hébergés** dans `assets/` : aucun CDN, aucun appel à Google Fonts
(plus rapide, et pas de transfert de données vers Google au chargement de la page).

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>. Le site se déploie tel quel sur n'importe quel hébergement statique
(GitHub Pages, Netlify, OVH, etc.).

## Structure

```
index.html              contenu, SEO, données structurées LocalBusiness
assets/css/style.css    direction artistique (palette, typo, sections, responsive)
assets/js/main.js       loader, Lenis, GSAP/ScrollTrigger, carrousel, menu, FAQ, statut « ouvert »
assets/img/             photos du salon (WebP)
assets/fonts/           Fraunces + Figtree (woff2, latin)
assets/vendor/          gsap, ScrollTrigger, lenis
```

## Direction artistique

- **Idée** : « la fleur qui s'ouvre ». Fil rouge : le pétale d'orchidée (cadres, boutons, séparateurs,
  curseur) et la *sen*, ligne d'énergie du massage thaï, qui sert de barre de progression.
- **Palette** : crème frangipanier `#FBF3E4`, prune `#2A0F33`, orchidée `#C2358F` / `#A3226F`,
  or thaï `#E8A927`, vert pomme `#B9D93C` (la table de soin), rouge soie `#B02347`.
- **Typographies** : Fraunces (titres, axes SOFT/WONK) + Figtree (texte).
- **Mouvement** : préchargeur (l'orchidée s'ouvre), hero parallax multicouche, bandeaux dont la vitesse
  suit le scroll, rituel pinné en 4 étapes, soins en défilement horizontal, compteurs, galerie à masques,
  carrousel d'avis, boutons magnétiques, cartes 3D avec reflet, curseur pétale.
- Mobile : animations lourdes remplacées par des mises en page empilées / balayage tactile.
- `prefers-reduced-motion` : pas de loader, pas de smooth scroll, pas d'animation, mêmes contenus.

## Modifier le contenu

- **Textes, horaires, téléphone** : `index.html` (chercher `06 08 42 74 92` / `tel:+33608427492`).
  Les horaires sont aussi dans `SCHEDULE` en haut de `assets/js/main.js` (statut « Ouvert maintenant »)
  et dans le JSON-LD du `<head>`.
- **Photos** : remplacer les fichiers de `assets/img/` en gardant les mêmes noms.
- **Avis** : section `#avis`, texte repris mot pour mot des avis fournis.

## À compléter / à valider

- **Photos en meilleure résolution** : les photos fournies sont très petites (~200 × 300 px). Elles sont
  agrandies et cadrées en conséquence, mais des originaux (≥ 1600 px de large) amélioreraient
  nettement le rendu.
- **Soins** : les 4 soins présentés (massage thaïlandais, détente, pochons de plantes, pieds) sont déduits
  des photos et du métier. Aucun tarif ni durée n'est affiché. À confirmer / compléter.
- **Réseaux sociaux** : aucun lien fourni, emplacement prévu dans le footer (commentaire HTML).
- **Image de partage (Open Graph)** et **URL canonique** : à ajouter une fois le nom de domaine connu.
- **Adresse** : conservée telle que fournie (« 4 Rpe du Vieux Bourg »).
