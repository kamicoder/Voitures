// Les circuits : leurs points, leur route, leur trace, et ce qu'on trouve dessus.

const LARGEUR_ROUTE = 150;

// La route passe près de ces points, dans l'ordre, puis revient au premier.
// Sur la route, chaque objet a sa place le long du tour (0 : la ligne d'arrivée, 0.5 : la moitié)
// et un décalage sur le côté (0 : au milieu de la route).
const CIRCUITS = [
  {
    id: "mon-premier-circuit",               // le nom de sa sauvegarde : ton record d'avant reste
    nom: "Le Vallon",
    largeur: 2600,
    hauteur: 1800,
    points: [
      { x: 400, y: 1100 }, { x: 400, y: 450 }, { x: 550, y: 250 }, { x: 950, y: 250 },
      { x: 1150, y: 500 }, { x: 1300, y: 800 }, { x: 1500, y: 500 }, { x: 1700, y: 280 },
      { x: 2200, y: 280 }, { x: 2380, y: 500 }, { x: 2380, y: 950 }, { x: 2150, y: 1100 },
      { x: 1650, y: 1100 }, { x: 1300, y: 1250 }, { x: 1100, y: 1600 }, { x: 600, y: 1650 },
      { x: 400, y: 1450 },
    ],
    bidons: [[0.2, -30], [0.2, 30], [0.65, 0]],
    fleches: [[0.08, 0], [0.55, 0]],
    huiles: [[0.35, -35], [0.85, 35]],
  },
  {
    id: "grande-boucle",
    nom: "La Grande Boucle",
    largeur: 2600,
    hauteur: 1500,
    points: [
      { x: 500, y: 1150 }, { x: 350, y: 750 }, { x: 500, y: 350 }, { x: 1000, y: 250 },
      { x: 1400, y: 450 }, { x: 1800, y: 250 }, { x: 2200, y: 350 }, { x: 2300, y: 750 },
      { x: 2150, y: 1150 }, { x: 1700, y: 1250 }, { x: 1300, y: 1050 }, { x: 900, y: 1250 },
    ],
    bidons: [[0.3, 0], [0.75, -30], [0.75, 30]],
    fleches: [[0.12, 0], [0.45, 0], [0.9, 0]],
    huiles: [[0.6, 0]],
  },
  {
    id: "huit",
    nom: "Le Huit",
    largeur: 2600,
    hauteur: 1800,
    points: [
      { x: 2350, y: 900 }, { x: 2150, y: 1450 }, { x: 1790, y: 1500 }, { x: 1520, y: 1240 },
      { x: 1300, y: 900 }, { x: 1080, y: 560 }, { x: 810, y: 300 }, { x: 450, y: 350 },
      { x: 250, y: 900 }, { x: 450, y: 1450 }, { x: 810, y: 1500 }, { x: 1080, y: 1240 },
      { x: 1300, y: 900 }, { x: 1520, y: 560 }, { x: 1790, y: 310 }, { x: 2150, y: 350 },
    ],
    bidons: [[0.15, 0], [0.5, -30], [0.5, 30], [0.85, 0]],
    fleches: [[0.05, 0], [0.4, 0], [0.7, 0]],
    huiles: [[0.25, 35], [0.62, -35], [0.95, 0]],
  },
];

// Le milieu de deux points
function milieu(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// La différence entre deux angles, ramenée entre -π et π : de combien tourner, et de quel côté
function angleEntre(a, b) {
  let ecart = a - b;
  while (ecart > Math.PI) {
    ecart = ecart - 2 * Math.PI;
  }
  while (ecart < -Math.PI) {
    ecart = ecart + 2 * Math.PI;
  }
  return ecart;
}

// Un circuit prêt à courir : ses portes, sa route, sa trace et ses objets
function preparerCircuit(modele) {
  const points = modele.points;
  const c = {
    id: modele.id,
    nom: modele.nom,
    largeur: modele.largeur,
    hauteur: modele.hauteur,
    points: points,
    portes: [],
  };

  // Les portes : une au milieu de chaque côté ; un tour, c'est les passer toutes dans l'ordre
  for (let i = 0; i < points.length; i = i + 1) {
    c.portes.push(milieu(points[i], points[(i + 1) % points.length]));
  }

  // La route : une courbe qui va de porte en porte, tirée vers chaque point
  c.route = new Path2D();
  const derniere = c.portes[points.length - 1];
  c.route.moveTo(derniere.x, derniere.y);
  for (let i = 0; i < points.length; i = i + 1) {
    c.route.quadraticCurveTo(points[i].x, points[i].y, c.portes[i].x, c.portes[i].y);
  }

  // Le départ : sur la porte 0, tourné vers le point 1
  c.angleDepart = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);

  tracer(c);
  c.bidons = placer(c, modele.bidons);
  c.fleches = placer(c, modele.fleches);
  c.huiles = placer(c, modele.huiles);
  return c;
}

// La trace : des points tous les 10 pixels environ, au milieu de la route, depuis la ligne
// d'arrivée. Chacun connaît sa distance depuis la ligne (d) et la direction de la route (angle).
function tracer(c) {
  const n = c.points.length;
  c.trace = [];
  for (let i = 1; i <= n; i = i + 1) {
    // La même courbe que quadraticCurveTo : de la porte a à la porte b, tirée vers le point k
    const a = c.portes[i - 1];
    const k = c.points[i % n];
    const b = c.portes[i % n];
    const longueur = Math.hypot(k.x - a.x, k.y - a.y) + Math.hypot(b.x - k.x, b.y - k.y);
    const pas = Math.ceil(longueur / 10);
    for (let j = 0; j < pas; j = j + 1) {
      const t = j / pas;                     // de 0 (en a) à presque 1 (en b)
      const u = 1 - t;
      c.trace.push({
        x: u * u * a.x + 2 * u * t * k.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * k.y + t * t * b.y,
      });
    }
  }
  const total = c.trace.length;
  let d = 0;
  for (let i = 0; i < total; i = i + 1) {
    const point = c.trace[i];
    const avant = c.trace[(i - 1 + total) % total];
    const apres = c.trace[(i + 1) % total];
    if (i > 0) {
      d = d + Math.hypot(point.x - avant.x, point.y - avant.y);
    }
    point.d = d;
    point.angle = Math.atan2(apres.y - avant.y, apres.x - avant.x);
  }
  c.longueur = d + Math.hypot(c.trace[0].x - c.trace[total - 1].x, c.trace[0].y - c.trace[total - 1].y);
}

// Le numéro du point de la trace le plus proche de (x, y). On ne cherche qu'autour de celui
// d'avant : au croisement du Huit, on reste ainsi sur sa branche.
function plusProche(c, x, y, autour) {
  const total = c.trace.length;
  let meilleur = autour;
  let distanceMin = Infinity;
  for (let k = -40; k <= 40; k = k + 1) {
    const i = (autour + k + total) % total;
    const distance = Math.hypot(c.trace[i].x - x, c.trace[i].y - y);
    if (distance < distanceMin) {
      distanceMin = distance;
      meilleur = i;
    }
  }
  return meilleur;
}

// Une place le long du tour et un décalage sur le côté, en un point du circuit
function surLaTrace(c, place, decalage) {
  const point = c.trace[Math.floor(place * c.trace.length) % c.trace.length];
  return {
    x: point.x - Math.sin(point.angle) * decalage,   // le côté : la direction de la route, tournée d'un quart de tour
    y: point.y + Math.cos(point.angle) * decalage,
    angle: point.angle,
    attente: 0,                              // un bidon ramassé attend avant de revenir
  };
}

function placer(c, liste) {
  const objets = [];
  for (const objet of liste) {
    objets.push(surLaTrace(c, objet[0], objet[1]));
  }
  return objets;
}

// Vrai si le point (x, y) est sur la route
function surLaRoute(x, y) {
  pinceau.save();
  pinceau.resetTransform();                // la question se pose sur le circuit, sans la caméra
  pinceau.lineWidth = LARGEUR_ROUTE;
  const dessus = pinceau.isPointInStroke(circuit.route, x, y);
  pinceau.restore();
  return dessus;
}

function dessinerCircuit() {
  pinceau.fillStyle = "#0c1a10";           // le noir autour du monde
  pinceau.fillRect(-2000, -2000, circuit.largeur + 4000, circuit.hauteur + 4000);
  pinceau.fillStyle = "#3f8f3a";           // l'herbe
  pinceau.fillRect(0, 0, circuit.largeur, circuit.hauteur);

  pinceau.lineJoin = "round";
  pinceau.lineCap = "round";
  pinceau.lineWidth = LARGEUR_ROUTE + 20;  // les bordures, rouges et blanches
  pinceau.strokeStyle = "#d8322e";
  pinceau.stroke(circuit.route);
  pinceau.setLineDash([30, 30]);
  pinceau.lineCap = "butt";                // des bouts carrés, sinon le blanc boucherait le rouge
  pinceau.strokeStyle = "white";
  pinceau.stroke(circuit.route);
  pinceau.setLineDash([]);
  pinceau.lineCap = "round";
  pinceau.lineWidth = LARGEUR_ROUTE;       // le goudron
  pinceau.strokeStyle = "#55535c";
  pinceau.stroke(circuit.route);
  pinceau.lineWidth = 4;                   // la ligne du milieu, en pointillés
  pinceau.setLineDash([24, 24]);
  pinceau.strokeStyle = "rgba(255, 255, 255, 0.6)";
  pinceau.stroke(circuit.route);
  pinceau.setLineDash([]);

  // La ligne d'arrivée : un damier en travers de la route, sur la porte 0
  pinceau.save();
  pinceau.translate(circuit.portes[0].x, circuit.portes[0].y);
  pinceau.rotate(circuit.angleDepart);
  const carre = LARGEUR_ROUTE / 10;
  for (let rangee = 0; rangee < 2; rangee = rangee + 1) {
    for (let colonne = 0; colonne < 10; colonne = colonne + 1) {
      if ((rangee + colonne) % 2 === 0) {
        pinceau.fillStyle = "white";
      } else {
        pinceau.fillStyle = "black";
      }
      pinceau.fillRect(rangee * carre - carre, colonne * carre - LARGEUR_ROUTE / 2, carre, carre);
    }
  }
  pinceau.restore();
}

// Les objets de la route : les flaques d'huile, les flèches, puis les bidons de nitro
function dessinerObjets() {
  for (const huile of circuit.huiles) {
    pinceau.fillStyle = "#16141a";
    pinceau.beginPath();
    pinceau.ellipse(huile.x, huile.y, 34, 22, huile.angle, 0, 2 * Math.PI);
    pinceau.fill();
    pinceau.fillStyle = "rgba(140, 120, 255, 0.35)";   // un reflet violet, comme sur l'huile
    pinceau.beginPath();
    pinceau.ellipse(huile.x - 6, huile.y - 5, 12, 6, huile.angle, 0, 2 * Math.PI);
    pinceau.fill();
  }
  for (const fleche of circuit.fleches) {
    pinceau.save();
    pinceau.translate(fleche.x, fleche.y);
    pinceau.rotate(fleche.angle);
    pinceau.fillStyle = "#ffd23f";
    for (let k = -1; k <= 1; k = k + 1) {   // trois chevrons, la pointe vers l'avant
      pinceau.beginPath();
      pinceau.moveTo(k * 22 - 8, -24);
      pinceau.lineTo(k * 22 + 10, 0);
      pinceau.lineTo(k * 22 - 8, 24);
      pinceau.lineTo(k * 22 - 2, 0);
      pinceau.closePath();
      pinceau.fill();
    }
    pinceau.restore();
  }
  for (const bidon of circuit.bidons) {
    if (bidon.attente > 0) {
      continue;                            // ramassé : il reviendra plus tard
    }
    pinceau.fillStyle = "#e3262f";
    pinceau.fillRect(bidon.x - 10, bidon.y - 13, 20, 26);
    pinceau.fillStyle = "#111";
    pinceau.fillRect(bidon.x - 4, bidon.y - 17, 8, 5);   // le bouchon
    pinceau.fillStyle = "white";
    pinceau.font = "bold 14px Verdana";
    pinceau.textAlign = "center";
    pinceau.fillText("N", bidon.x, bidon.y + 5);
  }
}
