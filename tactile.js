// Jouer au doigt : les commandes de course à l'écran, le plein écran et l'installation sur le téléphone.

// Vrai sur un téléphone ou une tablette ; devient vrai aussi dès qu'un doigt touche l'écran
let modeTactile = window.matchMedia("(pointer: coarse)").matches;

// ===== Les commandes de course à l'écran (seul au volant) =====

// Chaque bouton : ce qu'il fait, son milieu sur la toile, son rayon et son dessin.
// Pas de bouton pour accélérer : au doigt, la voiture accélère toute seule tant qu'on ne freine pas.
const COMMANDES_TACTILES = [
  { action: "gauche", x: 92, y: 508, rayon: 64, icone: "◀" },
  { action: "droite", x: 238, y: 508, rayon: 64, icone: "▶" },
  { action: "reculer", x: 738, y: 535, rayon: 46, icone: "▼" },
  { action: "nitro", x: 870, y: 492, rayon: 68, icone: "" },
];
const BOUTON_MENU = { x: 908, y: 0, largeur: 52, hauteur: 40 };   // en haut à droite de la toile (960 de large)

const doigts = {};                         // pour chaque doigt posé : l'action qu'il tient
const touchesTactiles = {};                // touchesTactiles["gauche"] vaut true tant qu'un doigt la tient

function commandesTactilesActives() {
  return modeTactile && joueurs().length === 1 && (etat === "depart" || etat === "course");
}

// Le bouton le plus proche du doigt, s'il est assez près (un peu plus loin que son bord, c'est permis)
function commandeSous(x, y) {
  let meilleure = null;
  let plusPetiteDistance = Infinity;
  for (const commande of COMMANDES_TACTILES) {
    const distance = Math.hypot(x - commande.x, y - commande.y);
    if (distance < commande.rayon * 1.4 && distance < plusPetiteDistance) {
      plusPetiteDistance = distance;
      meilleure = commande;
    }
  }
  return meilleure;
}

function recompterLesDoigts() {
  for (const commande of COMMANDES_TACTILES) {
    touchesTactiles[commande.action] = Object.values(doigts).includes(commande.action);
  }
}

// Un doigt se pose (nouveau) ou glisse : il tient le bouton qui est sous lui.
// Rend true si le doigt est pour les commandes.
function doigtSur(id, x, y, nouveau) {
  const commande = commandeSous(x, y);
  if (!nouveau && !(id in doigts)) {
    return false;                          // ce doigt ne s'occupe pas des commandes
  }
  if (nouveau && commande === null) {
    return false;
  }
  if (commande === null) {
    doigts[id] = null;                     // il a glissé hors des boutons : il ne tient plus rien
  } else {
    doigts[id] = commande.action;
  }
  recompterLesDoigts();
  return true;
}

function doigtLeve(id) {
  delete doigts[id];
  recompterLesDoigts();
}

function lacherTousLesDoigts() {
  for (const id in doigts) {
    delete doigts[id];
  }
  recompterLesDoigts();
}

function dessinerCommandesTactiles() {
  if (!modeTactile || (etat !== "depart" && etat !== "course")) {
    return;
  }
  if (joueurs().length === 1) {
    for (const commande of COMMANDES_TACTILES) {
      if (touchesTactiles[commande.action] === true) {
        pinceau.fillStyle = "rgba(255, 255, 255, 0.45)";   // tenu : plus clair
      } else {
        pinceau.fillStyle = "rgba(255, 255, 255, 0.18)";
      }
      pinceau.strokeStyle = "rgba(255, 255, 255, 0.7)";
      pinceau.lineWidth = 3;
      pinceau.beginPath();
      pinceau.arc(commande.x, commande.y, commande.rayon, 0, 2 * Math.PI);
      pinceau.fill();
      pinceau.stroke();
      if (commande.action === "nitro") {
        // Le bidon de nitro, et combien il en reste
        const nitro = voitures[0].nitro;
        if (nitro > 0) {
          pinceau.fillStyle = "#e3262f";
        } else {
          pinceau.fillStyle = "rgba(227, 38, 47, 0.35)";
        }
        pinceau.fillRect(commande.x - 16, commande.y - 22, 32, 44);
        pinceau.fillRect(commande.x - 6, commande.y - 30, 12, 8);
        ecrire("N", commande.x, commande.y + 10, 26, "white");
        ecrire(nitro, commande.x + 46, commande.y - 34, 26, "#ffd479");
      } else {
        ecrire(commande.icone, commande.x, commande.y + commande.rayon * 0.25, commande.rayon * 0.75, "rgba(255, 255, 255, 0.9)");
      }
    }
  }
  // Le bouton pour revenir au menu, en haut à droite
  ecrire("✕", BOUTON_MENU.x + BOUTON_MENU.largeur / 2, 30, 26, "white");
}

// ===== Le plein écran et l'installation sur l'écran d'accueil =====
// Le navigateur affiche un message à chaque passage en plein écran : on ne le demande que sur un bouton.
// Le jeu installé, lui, s'ouvre directement en plein écran, sans message.

const SUR_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let invitationInstallation = null;         // Chrome sur Android propose d'installer : on garde sa proposition pour un bouton

window.addEventListener("beforeinstallprompt", function (evenement) {
  evenement.preventDefault();
  invitationInstallation = evenement;
});
window.addEventListener("appinstalled", function () {
  invitationInstallation = null;
});

function estInstalle() {
  return window.matchMedia("(display-mode: fullscreen)").matches
    || window.matchMedia("(display-mode: standalone)").matches
    || navigator.standalone === true;
}

function peutPasserEnPleinEcran() {
  return !SUR_IOS && !estInstalle() && !document.fullscreenElement && document.documentElement.requestFullscreen !== undefined;
}

function pleinEcran() {
  document.documentElement.requestFullscreen({ navigationUI: "hide" }).then(function () {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(function () {});
    }
  }).catch(function () {});
}

function installer() {
  const invitation = invitationInstallation;
  invitationInstallation = null;
  invitation.prompt();
}

// Les boutons du bas du menu, sur téléphone : installer le jeu, ou passer en plein écran
function boutonsMobile() {
  const liste = [];
  if (!modeTactile || estInstalle()) {
    return liste;
  }
  if (invitationInstallation !== null) {
    liste.push({ texte: "📲 Installer le jeu", action: installer });
  }
  if (peutPasserEnPleinEcran()) {
    liste.push({ texte: "⛶ Plein écran", action: pleinEcran });
  }
  const largeur = 230;
  let x = LARGEUR / 2 - (liste.length * largeur + (liste.length - 1) * 16) / 2;
  for (const bouton of liste) {
    bouton.x = x;
    bouton.y = 540;
    bouton.largeur = largeur;
    bouton.hauteur = 44;
    x = x + largeur + 16;
  }
  return liste;
}

function dessinerBoutonsMobile() {
  const liste = boutonsMobile();
  if (liste.length === 0 && modeTactile && SUR_IOS && !estInstalle()) {
    ecrire("Pour le plein écran : Partager, puis « Sur l'écran d'accueil »", LARGEUR / 2, 572, 15, "#a49cb4");
  }
  for (const bouton of liste) {
    pinceau.fillStyle = "#2a2735";
    pinceau.beginPath();
    pinceau.roundRect(bouton.x, bouton.y, bouton.largeur, bouton.hauteur, 12);
    pinceau.fill();
    ecrire(bouton.texte, bouton.x + bouton.largeur / 2, bouton.y + 29, 18, "white");
  }
}
