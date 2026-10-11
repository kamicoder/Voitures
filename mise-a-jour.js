// La mise à jour automatique : quand une nouvelle version du jeu est en ligne, il se recharge tout seul,
// mais seulement au menu (jamais en pleine course ni au milieu d'un Grand Prix).

// Les fichiers du jeu : ceux de la page, plus le service worker, le manifeste et la feuille de style
function fichiersDuJeu() {
  const fichiers = ["./", "sw.js", "manifest.webmanifest", "style.css"];
  for (const script of document.scripts) {
    if (script.src) {
      fichiers.push(script.src);
    }
  }
  return fichiers;
}

// L'empreinte de la version en ligne : l'étiquette (ETag) que le serveur donne à chaque fichier,
// et qui change dès que le fichier change
function empreinteEnLigne() {
  const questions = fichiersDuJeu().map(function (fichier) {
    return fetch(fichier, { method: "HEAD", cache: "no-store" }).then(function (reponse) {
      return reponse.headers.get("ETag") || reponse.headers.get("Last-Modified") || "";
    });
  });
  return Promise.all(questions).then(function (etiquettes) {
    return etiquettes.join("|");
  });
}

let empreinteDuJeu = null;                 // la version qui tourne en ce moment
let nouvelleVersion = false;

function verifierLaVersion() {
  empreinteEnLigne().then(function (empreinte) {
    if (empreinte === "") {
      return;                              // le serveur ne donne pas d'étiquettes : on ne peut pas comparer
    }
    if (empreinteDuJeu === null) {
      empreinteDuJeu = empreinte;
    } else if (empreinte !== empreinteDuJeu) {
      nouvelleVersion = true;
    }
  }).catch(function () {
    // pas de réseau : on réessaiera plus tard
  });
}

// Appelée à chaque image : on recharge dès qu'on est au menu, là où rien ne se perd
function rechargerSiNouvelleVersion() {
  if (!nouvelleVersion || etat !== "menu") {
    return;
  }
  // Jamais deux rechargements en moins d'une minute, au cas où le serveur hésiterait entre deux versions
  let dernier = 0;
  try {
    dernier = Number(sessionStorage.getItem(NOM_DU_JEU + "/recharge")) || 0;
  } catch (erreur) {
    // tant pis
  }
  if (Date.now() - dernier < 60000) {
    return;
  }
  try {
    sessionStorage.setItem(NOM_DU_JEU + "/recharge", String(Date.now()));
  } catch (erreur) {
    // tant pis
  }
  nouvelleVersion = false;
  location.reload();
}

// Seulement sur le vrai site (pas en ouvrant le fichier depuis l'ordinateur)
if (location.protocol.startsWith("http")) {
  verifierLaVersion();
  setInterval(verifierLaVersion, 2 * 60 * 1000);   // toutes les deux minutes
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      verifierLaVersion();
    }
  });
}
