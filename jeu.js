// Ma course de voiture : la course, les écrans et la boucle de jeu.
console.log("Le jeu se charge.");

const toile = document.getElementById("toile");
const pinceau = toile.getContext("2d");    // le pinceau qui dessine sur la toile

const TOURS = 3;                           // les tours d'une course
const NOM_DU_JEU = "course-de-pixy";       // le début du nom de chaque sauvegarde

// Les rivaux de l'ordinateur. Leur niveau : 1, ils vont aussi vite qu'ils peuvent ; moins, ils
// lèvent le pied. Monte-le pour des courses plus dures !
const RIVAUX = [
  { nom: "Éclair", couleur: "#f4d03f" },
  { nom: "Fusée", couleur: "#9b6bff" },
  { nom: "Bolide", couleur: "#3ec46d" },
];
const NIVEAU_COURSE = 0.75;
const GRAND_PRIX = [0.7, 0.75, 0.8];     // le niveau des rivaux à chaque course du Grand Prix
const POINTS_GP = [10, 7, 5, 3];           // les points du 1er, du 2e, du 3e et du 4e

// Les touches de chaque joueur
const JOUEUR_1 = { avancer: "ArrowUp", reculer: "ArrowDown", gauche: "ArrowLeft", droite: "ArrowRight", nitro: "ShiftRight" };
const JOUEUR_SEUL = { avancer: "ArrowUp", reculer: "ArrowDown", gauche: "ArrowLeft", droite: "ArrowRight", nitro: "Space" };
const JOUEUR_2 = { avancer: "KeyW", reculer: "KeyS", gauche: "KeyA", droite: "KeyD", nitro: "Space" };

// Les sons
const sonBip = new Audio("sons/bip.wav");
sonBip.preservesPitch = false;             // joué plus vite, il est aussi plus aigu

// Les touches tenues en ce moment : touches["ArrowUp"] vaut true tant que la flèche est enfoncée
const touches = {};

// Le jeu : "menu", "depart", "course", "arrivee", "grandprix" (le classement entre deux courses) ou "editeur"
let etat = "menu";
let mode = "";                             // "chrono", "course", "duo" ou "grandprix"
let numeroCircuit = 0;                     // le circuit choisi dans le menu
let circuit = null;                        // le circuit de la course, prêt à courir
let voitures = [];
let classement = [];                       // les voitures, de la première à la dernière
let compteARebours = 0;
let tempsPrecedent = null;                 // l'heure de l'image d'avant, en millisecondes
let grandPrix = null;                      // la course où on en est, et les points de chacun

// Le record du circuit et son fantôme
let meilleurTour = null;
let fantome = [];
let fantomeIndex = 0;

// Les étincelles : la fumée des dérapages, les flammes de la nitro, les gerbes
const etincelles = [];

function etincelle(x, y, vx, vy, vie, couleur, taille) {
  etincelles.push({ x: x, y: y, vx: vx, vy: vy, vie: vie, vieDepart: vie, couleur: couleur, taille: taille });
}

// Une gerbe : douze étincelles qui partent dans tous les sens
function gerbe(x, y, couleur) {
  for (let k = 0; k < 12; k = k + 1) {
    const angle = Math.random() * 2 * Math.PI;
    const vitesse = 80 + Math.random() * 120;
    etincelle(x, y, Math.cos(angle) * vitesse, Math.sin(angle) * vitesse, 0.5, couleur, 5);
  }
}

function animerEtincelles(duree) {
  for (const e of etincelles) {
    e.x = e.x + e.vx * duree;
    e.y = e.y + e.vy * duree;
    e.vie = e.vie - duree;
  }
  // On ne garde que celles qui vivent encore
  for (let i = etincelles.length - 1; i >= 0; i = i - 1) {
    if (etincelles[i].vie <= 0) {
      etincelles.splice(i, 1);
    }
  }
}

function dessinerEtincelles() {
  for (const e of etincelles) {
    pinceau.globalAlpha = e.vie / e.vieDepart;   // elles s'effacent en vieillissant
    pinceau.fillStyle = e.couleur;
    pinceau.fillRect(e.x - e.taille / 2, e.y - e.taille / 2, e.taille, e.taille);
  }
  pinceau.globalAlpha = 1;
}

// ===== Les circuits : ceux du jeu, et celui que tu dessines =====

function circuitDessine() {
  const lu = localStorage.getItem(NOM_DU_JEU + "/points-du-circuit");
  if (lu === null) {
    return null;
  }
  return {
    id: "circuit-dessine",
    nom: "Mon circuit",
    largeur: MONDE_EDITEUR.largeur,
    hauteur: MONDE_EDITEUR.hauteur,
    points: JSON.parse(lu),
    bidons: [[0.3, 0], [0.7, 0]],
    fleches: [[0.1, 0]],
    huiles: [],
  };
}

function tousLesCircuits() {
  const liste = CIRCUITS.slice();          // une copie de la liste
  const dessine = circuitDessine();
  if (dessine !== null) {
    liste.push(dessine);
  }
  return liste;
}

function lireLeRecord(modele) {
  meilleurTour = null;
  fantome = [];
  const sauvegarde = localStorage.getItem(NOM_DU_JEU + "/" + modele.id);
  if (sauvegarde !== null) {
    const lu = JSON.parse(sauvegarde);
    meilleurTour = lu.temps;
    if (lu.fantome !== undefined) {
      fantome = lu.fantome;
    }
  }
}

// Joue un son depuis le début ; une vitesse plus grande que 1 le rend plus aigu
function jouer(son, vitesse) {
  son.playbackRate = vitesse;
  son.currentTime = 0;
  son.play();
}

// ===== La course =====

function commencer(nouveauMode, modele, niveau) {
  mode = nouveauMode;
  circuit = preparerCircuit(modele);
  lireLeRecord(modele);
  voitures = [];
  if (mode === "duo") {
    voitures.push(new Voiture("Joueur 1", "#ff7a1a", JOUEUR_1, 1));
    voitures.push(new Voiture("Joueur 2", "#7fd8e6", JOUEUR_2, 1));
  } else {
    voitures.push(new Voiture("Toi", "#ff7a1a", JOUEUR_SEUL, 1));
  }
  if (mode === "course" || mode === "grandprix") {
    for (const rival of RIVAUX) {
      voitures.push(new Voiture(rival.nom, rival.couleur, null, niveau));
    }
  }
  // La grille de départ : deux voitures par rangée
  for (let i = 0; i < voitures.length; i = i + 1) {
    let decalage = 0;
    if (voitures.length > 1) {
      decalage = 35 * (2 * (i % 2) - 1);   // à gauche, puis à droite
    }
    voitures[i].mettreAuDepart(decalage, Math.floor(i / 2));
  }
  for (const bidon of circuit.bidons) {
    bidon.attente = 0;
  }
  classement = voitures.slice();
  etincelles.length = 0;                   // on vide la liste
  fantomeIndex = 0;
  compteARebours = 3;
  etat = "depart";
  jouer(sonBip, 1);
  for (const voiture of voitures) {
    if (voiture.moteur !== undefined) {
      voiture.moteur.play();
    }
  }
}

function couperLesMoteurs() {
  for (const voiture of voitures) {
    if (voiture.moteur !== undefined) {
      voiture.moteur.pause();
    }
  }
}

function revenirAuMenu() {
  couperLesMoteurs();
  grandPrix = null;
  changerDeCircuit(0);                     // son record a peut-être changé
  etat = "menu";
}

// Les joueurs : les voitures qui ont des touches (même si l'ordinateur les conduit après l'arrivée)
function joueurs() {
  const liste = [];
  for (const voiture of voitures) {
    if (voiture.commandes !== null) {
      liste.push(voiture);
    }
  }
  return liste;
}

// Un tour fini : le record, le fantôme, et peut-être l'arrivée
function finirUnTour(voiture) {
  if (voiture.commandes !== null) {
    jouer(sonBip, 1.5);
  }
  if (mode === "chrono" && (meilleurTour === null || voiture.tempsTour < meilleurTour)) {
    meilleurTour = voiture.tempsTour;
    fantome = voiture.enregistrement;
    localStorage.setItem(NOM_DU_JEU + "/" + circuit.id, JSON.stringify({ temps: meilleurTour, fantome: fantome }));
  }
  if (voiture.tour === TOURS) {
    franchirLArrivee(voiture);
    return;
  }
  voiture.tour = voiture.tour + 1;
  voiture.tempsTour = 0;
  voiture.enregistrement = [];
  if (voiture.commandes !== null) {
    fantomeIndex = 0;
  }
}

// La voiture a fini sa course : elle prend sa place, et l'ordinateur la conduit jusqu'à la fin
function franchirLArrivee(voiture) {
  let arrivees = 0;
  for (const v of voitures) {
    if (v.fini) {
      arrivees = arrivees + 1;
    }
  }
  voiture.fini = true;
  voiture.place = arrivees + 1;
  voiture.ordinateur = true;
  voiture.niveau = 0.6;                    // elle finit au ralenti, comme un tour d'honneur
  // La course s'arrête quand tous les joueurs sont arrivés
  for (const joueur of joueurs()) {
    if (!joueur.fini) {
      return;
    }
  }
  etat = "arrivee";
  couperLesMoteurs();
}

// Le classement : d'abord les voitures arrivées, dans l'ordre, puis les autres selon leur chemin parcouru
function classer() {
  classement.sort(function (a, b) {
    if (a.fini && b.fini) {
      return a.place - b.place;
    }
    if (a.fini) {
      return -1;                           // a avant b
    }
    if (b.fini) {
      return 1;                            // b avant a
    }
    return b.progres - a.progres;          // celle qui a fait le plus de chemin passe devant
  });
}

// Deux voitures trop près l'une de l'autre se repoussent
function bousculer() {
  for (let i = 0; i < voitures.length; i = i + 1) {
    for (let j = i + 1; j < voitures.length; j = j + 1) {
      const a = voitures[i];
      const b = voitures[j];
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance > 0 && distance < 34) {
        const ux = (b.x - a.x) / distance; // la direction de a vers b, longue de 1
        const uy = (b.y - a.y) / distance;
        const pousse = (34 - distance) / 2;
        a.x = a.x - ux * pousse;
        a.y = a.y - uy * pousse;
        b.x = b.x + ux * pousse;
        b.y = b.y + uy * pousse;
        // Elles échangent la part de leur vitesse qui les rapproche
        const choc = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy;
        if (choc > 0) {
          a.vx = a.vx - ux * choc;
          a.vy = a.vy - uy * choc;
          b.vx = b.vx + ux * choc;
          b.vy = b.vy + uy * choc;
        }
      }
    }
  }
}

function mettreAJour(duree) {
  animerEtincelles(duree);
  if (etat === "depart") {
    const avant = Math.ceil(compteARebours);
    compteARebours = compteARebours - duree;
    if (compteARebours <= 0) {
      etat = "course";
      jouer(sonBip, 2);
    } else if (Math.ceil(compteARebours) !== avant) {
      jouer(sonBip, 1);
    }
  } else if (etat === "course") {
    for (const bidon of circuit.bidons) {
      bidon.attente = bidon.attente - duree;
    }
    for (const voiture of voitures) {
      voiture.conduire(duree);
      voiture.toucherLesObjets();
      if (voiture.aFiniUnTour()) {
        finirUnTour(voiture);
      }
      if (etat !== "course") {
        break;
      }
    }
    bousculer();
    classer();
    // Le fantôme avance jusqu'au moment du tour où en est la voiture
    if (mode === "chrono") {
      while (fantomeIndex < fantome.length - 1 && fantome[fantomeIndex + 1].t <= voitures[0].tempsTour) {
        fantomeIndex = fantomeIndex + 1;
      }
    }
  }
}

// ===== Le Grand Prix : une course sur chaque circuit, et des points à chaque arrivée =====

function commencerLeGrandPrix() {
  grandPrix = { course: 0, points: { Toi: 0 } };
  for (const rival of RIVAUX) {
    grandPrix.points[rival.nom] = 0;
  }
  commencer("grandprix", CIRCUITS[0], GRAND_PRIX[0]);
}

function compterLesPoints() {
  for (let i = 0; i < classement.length; i = i + 1) {
    const nom = classement[i].nom;
    grandPrix.points[nom] = grandPrix.points[nom] + POINTS_GP[i];
  }
}

// Les noms du Grand Prix, du plus de points au moins de points
function classementDuGrandPrix() {
  const noms = Object.keys(grandPrix.points);
  noms.sort(function (a, b) {
    return grandPrix.points[b] - grandPrix.points[a];
  });
  return noms;
}

function apresLArrivee() {
  if (mode !== "grandprix") {
    revenirAuMenu();
  } else if (etat === "arrivee") {
    compterLesPoints();
    etat = "grandprix";
  } else if (grandPrix.course < CIRCUITS.length - 1) {
    grandPrix.course = grandPrix.course + 1;
    commencer("grandprix", CIRCUITS[grandPrix.course], GRAND_PRIX[grandPrix.course]);
  } else {
    revenirAuMenu();
  }
}

// ===== L'éditeur : un circuit à toi, dessiné à la souris =====

const MONDE_EDITEUR = { largeur: 2600, hauteur: 1800 };
const POINTS_MAX = 10;                     // assez pour un beau circuit, pas trop pour s'y perdre
const ECHELLE_EDITEUR = 0.35;              // le monde, en petit sur la toile
let pointsEditeur = [];
let pointTenu = -1;                        // le numéro du point qu'on glisse, ou -1

function ouvrirLEditeur() {
  const dessine = circuitDessine();
  if (dessine !== null) {
    pointsEditeur = dessine.points;
  } else {
    pointsEditeur = [];
  }
  etat = "editeur";
}

// La souris sur la toile, en coordonnées du monde, sans sortir du monde ni coller à son bord
function versLeMonde(evenement) {
  const x = Math.round((evenement.offsetX - 25) / ECHELLE_EDITEUR);
  const y = Math.round((evenement.offsetY - 45) / ECHELLE_EDITEUR);
  return {
    x: Math.max(100, Math.min(x, MONDE_EDITEUR.largeur - 100)),
    y: Math.max(100, Math.min(y, MONDE_EDITEUR.hauteur - 100)),
  };
}

function pointSous(p) {
  for (let i = 0; i < pointsEditeur.length; i = i + 1) {
    if (Math.hypot(pointsEditeur[i].x - p.x, pointsEditeur[i].y - p.y) < 50) {
      return i;
    }
  }
  return -1;
}

function enregistrerLeCircuit() {
  if (pointsEditeur.length >= 4) {
    localStorage.setItem(NOM_DU_JEU + "/points-du-circuit", JSON.stringify(pointsEditeur));
    localStorage.removeItem(NOM_DU_JEU + "/circuit-dessine");   // un nouveau circuit : l'ancien record ne compte plus
    numeroCircuit = CIRCUITS.length;       // le menu le montre tout de suite
  }
  changerDeCircuit(0);
  etat = "menu";
}

function dessinerEditeur() {
  pinceau.fillStyle = "#1c1a25";
  pinceau.fillRect(0, 0, toile.width, toile.height);
  ecrire("Clic : un point (" + pointsEditeur.length + "/" + POINTS_MAX + ")   Glisser : le déplacer   Clic droit : l'enlever",
    toile.width / 2, 28, 15, "#e9e4f0");
  pinceau.save();
  pinceau.translate(25, 45);
  pinceau.scale(ECHELLE_EDITEUR, ECHELLE_EDITEUR);
  pinceau.fillStyle = "#3f8f3a";
  pinceau.fillRect(0, 0, MONDE_EDITEUR.largeur, MONDE_EDITEUR.hauteur);
  if (pointsEditeur.length >= 3) {
    const apercu = preparerCircuit({ id: "", nom: "", largeur: 0, hauteur: 0, points: pointsEditeur, bidons: [], fleches: [], huiles: [] });
    pinceau.lineJoin = "round";
    pinceau.lineWidth = LARGEUR_ROUTE;
    pinceau.strokeStyle = "#55535c";
    pinceau.stroke(apercu.route);
  }
  for (let i = 0; i < pointsEditeur.length; i = i + 1) {
    const p = pointsEditeur[i];
    pinceau.fillStyle = "#ff7a1a";
    pinceau.beginPath();
    pinceau.arc(p.x, p.y, 40, 0, 2 * Math.PI);
    pinceau.fill();
    ecrire(i + 1, p.x, p.y + 20, 56, "white");
  }
  pinceau.restore();
  let message = "Entrée : enregistrer et revenir au menu";
  if (pointsEditeur.length < 4) {
    message = "Il faut au moins 4 points (Entrée : revenir sans enregistrer)";
  }
  ecrire(message, toile.width / 2, toile.height - 8, 15, "#ffd479");
}

toile.addEventListener("mousedown", function (evenement) {
  if (etat === "menu") {
    sourisDuMenu("clic", evenement.offsetX, evenement.offsetY);
  }
  if (etat !== "editeur") {
    return;
  }
  const p = versLeMonde(evenement);
  const i = pointSous(p);
  if (evenement.button === 2) {            // le clic droit enlève le point
    if (i >= 0) {
      pointsEditeur.splice(i, 1);
    }
  } else if (i >= 0) {
    pointTenu = i;
  } else if (pointsEditeur.length < POINTS_MAX) {
    pointsEditeur.push(p);
    pointTenu = pointsEditeur.length - 1;
  }
});

toile.addEventListener("mousemove", function (evenement) {
  if (etat === "menu") {
    sourisDuMenu("passage", evenement.offsetX, evenement.offsetY);
  }
  if (etat === "editeur" && pointTenu >= 0) {
    pointsEditeur[pointTenu] = versLeMonde(evenement);
  }
});

toile.addEventListener("mouseup", function () {
  pointTenu = -1;
});

toile.addEventListener("contextmenu", function (evenement) {
  evenement.preventDefault();              // pas de menu du navigateur au clic droit
});

// ===== Le menu : un circuit à gauche, des boutons à droite =====

// Les boutons du menu : ce qu'on lit dessus, et ce qu'ils lancent
const MODES = [
  { id: "chrono", nom: "Contre la montre", aide: "Seul, contre le chrono et ton fantôme" },
  { id: "course", nom: "Contre l'ordinateur", aide: "Trois rivaux, trois tours" },
  { id: "duo", nom: "À deux", aide: "Sur le même clavier" },
  { id: "grandprix", nom: "Le Grand Prix", aide: "Tous les circuits, l'un après l'autre" },
  { id: "editeur", nom: "Dessiner ton circuit", aide: "À la souris, " + POINTS_MAX + " points au plus" },
];
let choix = 0;                             // le numéro du bouton choisi
let apercu = null;                         // le circuit choisi, prêt à dessiner en petit

// La place du bouton numéro i sur la toile
function boutonDuMenu(i) {
  return { x: 500, y: 112 + i * 80, largeur: 420, hauteur: 66 };
}

// Vrai si le point (x, y) est dans le rectangle
function dedans(x, y, rectangle) {
  return x >= rectangle.x && x <= rectangle.x + rectangle.largeur && y >= rectangle.y && y <= rectangle.y + rectangle.hauteur;
}

const FLECHE_GAUCHE = { x: 50, y: 440, largeur: 60, hauteur: 50 };
const FLECHE_DROITE = { x: 390, y: 440, largeur: 60, hauteur: 50 };

// sens : -1 pour le circuit d'avant, 1 pour le suivant, 0 pour relire celui-ci
function changerDeCircuit(sens) {
  const liste = tousLesCircuits();
  numeroCircuit = (numeroCircuit + sens + liste.length) % liste.length;
  apercu = preparerCircuit(liste[numeroCircuit]);
  lireLeRecord(liste[numeroCircuit]);
}

function lancerLeChoix() {
  const id = MODES[choix].id;
  const modele = tousLesCircuits()[numeroCircuit];
  if (id === "grandprix") {
    commencerLeGrandPrix();
  } else if (id === "editeur") {
    ouvrirLEditeur();
  } else if (id === "course") {
    commencer("course", modele, NIVEAU_COURSE);
  } else {
    commencer(id, modele, 1);
  }
}

function dessinerMenu() {
  pinceau.fillStyle = "#1c1a25";
  pinceau.fillRect(0, 0, toile.width, toile.height);
  dessinerVoiture(toile.width / 2 - 290, 58, 0, "#ff7a1a");
  ecrire("Ma course de voiture", toile.width / 2, 72, 40, "#ff7a1a");

  // La carte du circuit : son dessin en petit, son nom et son record
  pinceau.fillStyle = "#2a2735";
  pinceau.beginPath();
  pinceau.roundRect(40, 112, 420, 386, 16);  // un rectangle aux coins arrondis
  pinceau.fill();
  const echelle = Math.min(360 / apercu.largeur, 240 / apercu.hauteur);
  pinceau.save();
  pinceau.translate(250 - apercu.largeur * echelle / 2, 290 - apercu.hauteur * echelle / 2);
  pinceau.scale(echelle, echelle);
  pinceau.lineJoin = "round";
  pinceau.lineWidth = LARGEUR_ROUTE;
  pinceau.strokeStyle = "#55535c";
  pinceau.stroke(apercu.route);
  pinceau.restore();
  ecrire("Le circuit", 250, 145, 16, "#a49cb4");
  ecrire(apercu.nom, 250, 475, 24, "white");
  ecrire("◀", 80, 478, 30, "#ff7a1a");
  ecrire("▶", 420, 478, 30, "#ff7a1a");
  if (meilleurTour !== null) {
    ecrire("Record : " + chrono(meilleurTour), 250, 440, 16, "#ffd479");
  }

  // Les boutons : celui qui est choisi est orange
  for (let i = 0; i < MODES.length; i = i + 1) {
    const bouton = boutonDuMenu(i);
    let couleurTexte = "white";
    if (i === choix) {
      pinceau.fillStyle = "#ff7a1a";
      couleurTexte = "#1c1a25";
    } else {
      pinceau.fillStyle = "#2a2735";
    }
    pinceau.beginPath();
    pinceau.roundRect(bouton.x, bouton.y, bouton.largeur, bouton.hauteur, 12);
    pinceau.fill();
    ecrire(MODES[i].nom, bouton.x + bouton.largeur / 2, bouton.y + 30, 22, couleurTexte);
    ecrire(MODES[i].aide, bouton.x + bouton.largeur / 2, bouton.y + 52, 14, couleurTexte);
  }

  ecrire("↑ ↓ : choisir    ◀ ▶ : changer de circuit    Entrée : c'est parti !", toile.width / 2, 545, 16, "#e9e4f0");
  ecrire("Seul : les flèches, et Espace pour la nitro. À deux : Z Q S D et Espace, contre les flèches et Maj droite",
    toile.width / 2, 578, 13, "#a49cb4");
}

// Au menu, la souris choisit un bouton en passant dessus, et le lance d'un clic
function sourisDuMenu(type, x, y) {
  for (let i = 0; i < MODES.length; i = i + 1) {
    if (dedans(x, y, boutonDuMenu(i))) {
      choix = i;
      if (type === "clic") {
        lancerLeChoix();
      }
    }
  }
  if (type === "clic" && dedans(x, y, FLECHE_GAUCHE)) {
    changerDeCircuit(-1);
  }
  if (type === "clic" && dedans(x, y, FLECHE_DROITE)) {
    changerDeCircuit(1);
  }
}

// ===== Dessiner =====

// Un temps en secondes, écrit comme un chrono : 1:05.32
function chrono(secondes) {
  const minutes = Math.floor(secondes / 60);
  let reste = (secondes % 60).toFixed(2);
  if (reste.length < 5) {
    reste = "0" + reste;
  }
  return minutes + ":" + reste;
}

// 1er, 2e, 3e…
function rang(place) {
  if (place === 1) {
    return "1er";
  }
  return place + "e";
}

// La caméra : le milieu des joueurs au centre de la toile, et du recul quand ils s'éloignent
function placerLaCamera() {
  const suivies = joueurs();
  let centreX = 0;
  let centreY = 0;
  for (const voiture of suivies) {
    centreX = centreX + voiture.x / suivies.length;
    centreY = centreY + voiture.y / suivies.length;
  }
  let zoom = 1;
  if (suivies.length === 2) {
    const ecartX = Math.abs(suivies[0].x - suivies[1].x);
    const ecartY = Math.abs(suivies[0].y - suivies[1].y);
    zoom = Math.min(1, toile.width / (ecartX + 400), toile.height / (ecartY + 300));
    zoom = Math.max(zoom, 0.35);
  }
  pinceau.translate(toile.width / 2, toile.height / 2);
  pinceau.scale(zoom, zoom);
  pinceau.translate(-centreX, -centreY);
}

// Un texte centré sur (x, y)
function ecrire(texte, x, y, taille, couleur) {
  pinceau.font = "bold " + taille + "px Verdana";
  pinceau.fillStyle = couleur;
  pinceau.textAlign = "center";
  pinceau.fillText(texte, x, y);
}

// Les compteurs en haut : le tour, le chrono, la place et la nitro de chaque joueur
function dessinerCompteurs() {
  pinceau.fillStyle = "rgba(0, 0, 0, 0.5)";
  pinceau.fillRect(0, 0, toile.width, 40);
  pinceau.textAlign = "left";
  pinceau.font = "bold 18px Verdana";
  let x = 16;
  for (const voiture of joueurs()) {
    pinceau.fillStyle = voiture.couleur;
    let texte = "Tour " + voiture.tour + "/" + TOURS + "  " + chrono(voiture.tempsTour);
    if (voitures.length > 1) {
      texte = texte + "  " + rang(classement.indexOf(voiture) + 1) + "/" + voitures.length;
    }
    pinceau.fillText(texte, x, 27);
    for (let k = 0; k < NITRO_MAX; k = k + 1) {   // les bidons de nitro : pleins ou vides
      if (k < voiture.nitro) {
        pinceau.fillStyle = "#e3262f";
      } else {
        pinceau.fillStyle = "rgba(255, 255, 255, 0.2)";
      }
      pinceau.fillRect(x + 270 + k * 16, 12, 12, 18);
    }
    x = x + 340;
  }
  if (mode === "chrono" && meilleurTour !== null) {
    pinceau.fillStyle = "#ffd479";
    pinceau.fillText("Record : " + chrono(meilleurTour), x, 27);
  }
}

function dessinerArrivee() {
  pinceau.fillStyle = "rgba(0, 0, 0, 0.6)";
  pinceau.fillRect(0, 0, toile.width, toile.height);
  if (mode === "chrono") {
    ecrire("Arrivée !", toile.width / 2, 230, 60, "#ff7a1a");
    ecrire("Course en " + chrono(voitures[0].tempsTotal), toile.width / 2, 310, 28, "white");
    ecrire("Record du tour : " + chrono(meilleurTour), toile.width / 2, 360, 24, "#ffd479");
  } else {
    let titre = classement[0].nom + " gagne !";
    if (classement[0].nom === "Toi") {
      titre = "Tu gagnes !";
    }
    ecrire(titre, toile.width / 2, 150, 54, classement[0].couleur);
    for (let i = 0; i < classement.length; i = i + 1) {
      const voiture = classement[i];
      let temps = "en course";
      if (voiture.fini) {
        temps = chrono(voiture.tempsTotal);
      }
      ecrire((i + 1) + ". " + voiture.nom + "   " + temps, toile.width / 2, 220 + i * 40, 24, voiture.couleur);
    }
  }
  ecrire("Entrée : continuer", toile.width / 2, 520, 20, "#e9e4f0");
}

function dessinerGrandPrix() {
  pinceau.fillStyle = "#1c1a25";
  pinceau.fillRect(0, 0, toile.width, toile.height);
  const noms = classementDuGrandPrix();
  if (grandPrix.course < CIRCUITS.length - 1) {
    ecrire("Grand Prix : course " + (grandPrix.course + 1) + "/" + CIRCUITS.length, toile.width / 2, 110, 40, "#ff7a1a");
  } else {
    ecrire("🏆 " + noms[0] + " gagne le Grand Prix !", toile.width / 2, 110, 40, "#ffd479");
  }
  for (let i = 0; i < noms.length; i = i + 1) {
    ecrire((i + 1) + ". " + noms[i] + " : " + grandPrix.points[noms[i]] + " points", toile.width / 2, 200 + i * 45, 26, "white");
  }
  if (grandPrix.course < CIRCUITS.length - 1) {
    ecrire("Entrée : la course suivante, " + CIRCUITS[grandPrix.course + 1].nom, toile.width / 2, 470, 20, "#e9e4f0");
  } else {
    ecrire("Entrée : revenir au menu", toile.width / 2, 470, 20, "#e9e4f0");
  }
}

// Toute l'image : le circuit et les voitures vus par la caméra, puis les textes par-dessus
function dessiner() {
  pinceau.resetTransform();
  if (etat === "menu") {
    dessinerMenu();
    return;
  }
  if (etat === "editeur") {
    dessinerEditeur();
    return;
  }
  if (etat === "grandprix") {
    dessinerGrandPrix();
    return;
  }

  pinceau.save();
  placerLaCamera();
  dessinerCircuit();
  dessinerObjets();
  for (const voiture of voitures) {
    voiture.dessinerTraces();
  }
  if (mode === "chrono" && fantome.length > 0 && voitures[0].tempsTour < fantome[fantome.length - 1].t) {
    const ombre = fantome[fantomeIndex];
    pinceau.globalAlpha = 0.4;             // à moitié transparent : c'est un fantôme
    dessinerVoiture(ombre.x, ombre.y, ombre.angle, "white");
    pinceau.globalAlpha = 1;
  }
  for (const voiture of voitures) {
    voiture.dessiner();
  }
  dessinerEtincelles();
  pinceau.restore();

  dessinerCompteurs();
  if (etat === "depart") {
    ecrire(Math.ceil(compteARebours), toile.width / 2, toile.height / 2, 120, "white");
  } else if (etat === "arrivee") {
    dessinerArrivee();
  }
}

// La boucle de jeu : une image, puis on demande la suivante au navigateur
function boucle(temps) {
  let duree = 0;
  if (tempsPrecedent !== null) {
    duree = (temps - tempsPrecedent) / 1000;
  }
  tempsPrecedent = temps;
  duree = Math.min(duree, 0.05);           // après une pause, rien ne fait de bond
  mettreAJour(duree);
  dessiner();
  requestAnimationFrame(boucle);
}

document.addEventListener("keydown", function (evenement) {
  touches[evenement.code] = true;
  if (evenement.code.startsWith("Arrow") || evenement.code === "Space") {
    evenement.preventDefault();            // les flèches et Espace ne font pas défiler la page
  }
  const code = evenement.code;
  if (etat === "menu") {
    if (code === "ArrowUp") {
      choix = (choix - 1 + MODES.length) % MODES.length;
    } else if (code === "ArrowDown") {
      choix = (choix + 1) % MODES.length;
    } else if (code === "ArrowLeft") {
      changerDeCircuit(-1);
    } else if (code === "ArrowRight") {
      changerDeCircuit(1);
    } else if (code === "Enter") {
      lancerLeChoix();
    }
  } else if (etat === "editeur") {
    if (code === "Enter") {
      enregistrerLeCircuit();
    }
  } else if (code === "Enter") {
    if (etat === "arrivee" || etat === "grandprix") {
      apresLArrivee();
    } else {
      revenirAuMenu();
    }
  }
});

document.addEventListener("keyup", function (evenement) {
  touches[evenement.code] = false;
});

changerDeCircuit(0);
requestAnimationFrame(boucle);
