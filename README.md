# Ma course de voiture 🏎️

Un mini jeu de course de voitures vue de dessus.
Tout tourne dans le navigateur : ouvrir `index.html`, rien à installer.
En ligne : https://kamicoder.github.io/Voitures/ (sur téléphone, il s'installe sur l'écran d'accueil).

- **Contre la montre** : record et fantôme par circuit
- **Contre l'ordinateur** : trois rivaux, trois tours
- **À deux** : sur le même clavier (pas sur téléphone)
- **Le Grand Prix** : tous les circuits l'un après l'autre, avec des points
- **Dessiner ton circuit** : à la souris ou au doigt, 10 points au plus

## Commandes

| | Seul | Joueur 1 (à deux) | Joueur 2 (à deux) |
|---|---|---|---|
| Accélérer, freiner | ↑ ↓ | ↑ ↓ | Z S |
| Tourner | ← → | ← → | Q D |
| Nitro | Espace | Maj droite | Espace |

Entrée : revenir au menu.

Sur téléphone : ◀ ▶ pour tourner, ▼ pour freiner, le bidon pour la nitro ; la voiture accélère toute seule.
✕ en haut à droite : revenir au menu.

## Le code

| Fichier | Contenu |
|---|---|
| `circuits.js` | Les circuits : leurs points, leur route, leur trace, leurs objets |
| `voiture.js` | Une voiture : conduite, pilote de l'ordinateur, nitro et pièges |
| `tactile.js` | Les commandes au doigt, le plein écran, l'installation |
| `jeu.js` | La course, le menu, l'éditeur, le Grand Prix, la boucle de jeu |
| `mise-a-jour.js` | Le jeu se recharge tout seul au menu quand une nouvelle version est en ligne |
| `sw.js` | Le service worker : le jeu marche aussi sans réseau |
