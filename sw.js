// Le service worker : il garde une copie du jeu pour y jouer sans réseau.
// Il redemande toujours chaque fichier au serveur d'abord (en revalidant, sans se fier au cache du
// navigateur) : une nouvelle version arrive dès qu'il y a du réseau.

const CACHE = "course-de-voiture";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (evenement) {
  evenement.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (evenement) {
  if (evenement.request.method !== "GET") {
    return;
  }
  // Une page qu'on ouvre ne peut pas être recopiée telle quelle avec d'autres réglages : on repart de son adresse
  let requete;
  if (evenement.request.mode === "navigate") {
    requete = new Request(evenement.request.url, { cache: "no-cache", credentials: "same-origin" });
  } else {
    requete = new Request(evenement.request, { cache: "no-cache" });
  }
  evenement.respondWith(
    fetch(requete).then(function (reponse) {
      if (reponse.ok && reponse.status === 200) {   // pas les morceaux de son (206) : on garde les fichiers entiers
        const copie = reponse.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(evenement.request, copie);
        });
      }
      return reponse;
    }).catch(function () {
      return caches.match(evenement.request, { ignoreSearch: true });
    })
  );
});
