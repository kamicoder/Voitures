// Une voiture : conduite par un joueur, ou par l'ordinateur.

// Les réglages de la conduite : change-les, relance, et sens la différence au volant
const ACCELERATION = 380;                  // pixels par seconde gagnés chaque seconde où on accélère
const FREIN = 700;                         // pixels par seconde perdus chaque seconde où on freine
const VITESSE_MAX = 520;
const MARCHE_ARRIERE = 160;                // la vitesse la plus grande en reculant
const VIRAGE = 2.6;                        // de combien la voiture tourne, en radians par seconde
const FROTTEMENT = 0.5;                    // la route freine un peu la voiture
const FROTTEMENT_HERBE = 2.5;              // l'herbe la freine beaucoup
const ADHERENCE = 5;                       // les pneus collent à la route : moins, et la voiture glisse
const ADHERENCE_HERBE = 1.5;

// La nitro et les pièges
const VITESSE_NITRO = 760;                 // la vitesse la plus grande pendant la nitro
const DUREE_NITRO = 1.5;                   // secondes de nitro par bidon
const NITRO_MAX = 3;                       // les bidons qu'on peut garder
const DUREE_FLECHE = 0.6;                  // une flèche au sol : une petite nitro gratuite
const DUREE_HUILE = 1.2;                   // une flaque d'huile : les pneus ne tiennent plus
const ADHERENCE_HUILE = 0.3;
const RETOUR_BIDON = 5;                    // secondes avant qu'un bidon ramassé revienne

// L'aide : une voiture presque arrêtée hors de la route y est remise après ce temps (en secondes)
const REMISE_SUR_LA_ROUTE = 1.5;

class Voiture {
  // commandes : ses touches (avancer, reculer, gauche, droite, nitro), ou null pour l'ordinateur
  constructor(nom, couleur, commandes, niveau) {
    this.nom = nom;
    this.couleur = couleur;
    this.commandes = commandes;
    this.ordinateur = commandes === null;  // pas de touches : c'est l'ordinateur qui conduit
    this.niveau = niveau;                  // 1 : aussi vite qu'il peut ; moins, il lève le pied
    this.entrees = { avancer: false, reculer: false, gauche: false, droite: false, nitro: false };
    if (!this.ordinateur) {
      this.moteur = new Audio("sons/moteur.wav");
      this.moteur.loop = true;             // le son recommence sans fin
      this.moteur.volume = 0.25;
      this.moteur.preservesPitch = false;
    }
  }

  // Sur la grille de départ, derrière la porte 0 : decalage la pousse sur le côté, rangee vers l'arrière
  mettreAuDepart(decalage, rangee) {
    this.angle = circuit.angleDepart;
    const recul = 70 + rangee * 80;
    this.x = circuit.portes[0].x - Math.cos(this.angle) * recul - Math.sin(this.angle) * decalage;
    this.y = circuit.portes[0].y - Math.sin(this.angle) * recul + Math.cos(this.angle) * decalage;
    this.couloir = decalage / 2;           // l'ordinateur garde son côté de la route
    this.vx = 0;                           // sa vitesse en deux morceaux : vers la droite…
    this.vy = 0;                           // … et vers le bas
    this.vitesse = 0;                      // sa vitesse vers l'avant (négative en reculant)
    this.tour = 1;
    this.tempsTour = 0;
    this.tempsTotal = 0;
    this.enregistrement = [];              // où elle était pendant ce tour, pour le fantôme
    this.traces = [];                      // les marques de pneus quand elle dérape
    this.nitro = 0;                        // ses bidons
    this.turbo = 0;                        // les secondes de nitro qui restent
    this.huile = 0;                        // les secondes de glissade qui restent
    this.coincee = 0;                      // depuis combien de temps elle est arrêtée dans l'herbe
    this.fini = false;
    this.place = 0;
    // Où elle en est : son point sur la trace, et le chemin parcouru depuis la ligne
    this.indice = plusProche(circuit, this.x, this.y, 0);
    this.progres = -recul;
  }

  // Ce que veut le conducteur : les touches du joueur, ou les idées de l'ordinateur
  lireLesEntrees() {
    if (this.ordinateur) {
      this.penser();
      return;
    }
    this.entrees.avancer = touches[this.commandes.avancer] === true;
    this.entrees.reculer = touches[this.commandes.reculer] === true;
    this.entrees.gauche = touches[this.commandes.gauche] === true;
    this.entrees.droite = touches[this.commandes.droite] === true;
    this.entrees.nitro = touches[this.commandes.nitro] === true;
    // Seul au doigt : les boutons de l'écran comptent aussi, et la voiture accélère tant qu'on ne freine pas
    if (modeTactile && joueurs().length === 1) {
      this.entrees.gauche = this.entrees.gauche || touchesTactiles.gauche === true;
      this.entrees.droite = this.entrees.droite || touchesTactiles.droite === true;
      this.entrees.reculer = this.entrees.reculer || touchesTactiles.reculer === true;
      this.entrees.nitro = this.entrees.nitro || touchesTactiles.nitro === true;
      this.entrees.avancer = !this.entrees.reculer;
    }
  }

  // Le cerveau de l'ordinateur : il vise un point de la trace un peu devant lui
  penser() {
    const trace = circuit.trace;
    const vite = Math.max(0, this.vitesse);
    const devant = 10 + Math.round(vite / 35);   // plus il va vite, plus il regarde loin
    const cible = trace[(this.indice + devant) % trace.length];
    const cibleX = cible.x - Math.sin(cible.angle) * this.couloir;
    const cibleY = cible.y + Math.cos(cible.angle) * this.couloir;
    const ecart = angleEntre(Math.atan2(cibleY - this.y, cibleX - this.x), this.angle);

    // Un virage arrive : la route tourne entre ici et un peu plus loin. Plus il est serré, plus il ralentit.
    const loin = trace[(this.indice + devant + 25) % trace.length];
    const virage = Math.abs(angleEntre(loin.angle, trace[this.indice].angle));
    const vitesseVoulue = VITESSE_MAX * this.niveau * (1 - Math.min(0.45, virage * 0.3));

    this.entrees.gauche = ecart < -0.05;
    this.entrees.droite = ecart > 0.05;
    this.entrees.avancer = vite < vitesseVoulue || vite < 100;   // presque arrêté : il repart
    this.entrees.reculer = vite > vitesseVoulue + 60;
    this.entrees.nitro = virage < 0.2 && Math.abs(ecart) < 0.1;   // la nitro, dans une ligne droite
  }

  conduire(duree) {
    this.lireLesEntrees();
    if (this.entrees.nitro && this.nitro > 0 && this.turbo <= 0) {
      this.nitro = this.nitro - 1;
      this.turbo = DUREE_NITRO;
    }
    const enTurbo = this.turbo > 0;
    this.turbo = Math.max(0, this.turbo - duree);
    this.huile = Math.max(0, this.huile - duree);

    let frottement = FROTTEMENT;
    let adherence = ADHERENCE;
    const dansLHerbe = !surLaRoute(this.x, this.y);
    if (dansLHerbe) {
      frottement = FROTTEMENT_HERBE;
      adherence = ADHERENCE_HERBE;
    }
    if (this.huile > 0) {
      adherence = ADHERENCE_HUILE;
    }

    // Devant : la direction du nez. Côté : la direction de la portière droite.
    const devantX = Math.cos(this.angle);
    const devantY = Math.sin(this.angle);
    let avant = this.vx * devantX + this.vy * devantY;   // la part de la vitesse qui va devant
    let cote = -this.vx * devantY + this.vy * devantX;   // la part qui glisse sur le côté

    let vitesseMax = VITESSE_MAX * this.niveau;
    if (enTurbo) {
      vitesseMax = VITESSE_NITRO;
      avant = avant + ACCELERATION * 2 * duree;           // la nitro pousse fort
    }
    if (this.entrees.avancer) {
      avant = avant + ACCELERATION * duree;
    }
    if (this.entrees.reculer) {
      if (avant > 0) {
        avant = avant - FREIN * duree;
      } else {
        avant = avant - ACCELERATION * duree;
      }
    }
    avant = avant - avant * frottement * duree;
    if (avant > vitesseMax) {
      avant = Math.max(vitesseMax, avant - 900 * duree);  // après la nitro, elle ralentit en douceur
    }
    avant = Math.max(-MARCHE_ARRIERE, avant);
    cote = cote - cote * Math.min(1, adherence * duree);  // les pneus retiennent la glissade

    // Tourner : seulement en roulant, et à l'envers en marche arrière
    const roule = Math.min(1, Math.abs(avant) / 150);
    let sens = 1;
    if (avant < 0) {
      sens = -1;
    }
    if (this.entrees.gauche) {
      this.angle = this.angle - VIRAGE * roule * sens * duree;
    }
    if (this.entrees.droite) {
      this.angle = this.angle + VIRAGE * roule * sens * duree;
    }

    // On recolle les deux parts, puis on avance
    this.vx = avant * devantX - cote * devantY;
    this.vy = avant * devantY + cote * devantX;
    this.x = this.x + this.vx * duree;
    this.y = this.y + this.vy * duree;
    // Au bord du monde, elle s'arrête net : sa vitesse vers le bord disparaît
    if (this.x < 0 || this.x > circuit.largeur) {
      this.vx = 0;
    }
    if (this.y < 0 || this.y > circuit.hauteur) {
      this.vy = 0;
    }
    this.x = Math.max(0, Math.min(this.x, circuit.largeur));
    this.y = Math.max(0, Math.min(this.y, circuit.hauteur));
    this.vitesse = avant;
    this.suivreLaTrace(Math.hypot(this.vx, this.vy) * duree, dansLHerbe);

    // Coincée dans l'herbe ? Au bout d'un moment, on la remet sur la route
    if (dansLHerbe && Math.abs(avant) < 60) {
      this.coincee = this.coincee + duree;
    } else {
      this.coincee = 0;
    }
    if (this.coincee > REMISE_SUR_LA_ROUTE) {
      this.remettreSurLaRoute();
    }

    // Une glissade laisse des marques de pneus, et un peu de fumée
    if (Math.abs(cote) > 90) {
      this.traces.push({ x: this.x, y: this.y });
      if (this.traces.length > 300) {
        this.traces.shift();               // les plus vieilles s'effacent
      }
      etincelle(this.x, this.y, 0, 0, 0.6, "rgba(220, 220, 220, 0.5)", 8);
    }
    // La nitro crache des flammes par l'arrière
    if (enTurbo) {
      const arriereX = this.x - devantX * 22;
      const arriereY = this.y - devantY * 22;
      etincelle(arriereX, arriereY, -devantX * 200, -devantY * 200, 0.25, "#ffb02e", 6);
    }

    // Le moteur monte dans les aigus avec la vitesse
    if (this.moteur !== undefined) {
      this.moteur.playbackRate = 0.6 + Math.abs(avant) / VITESSE_NITRO * 1.6;
    }

    if (!this.fini) {
      this.tempsTour = this.tempsTour + duree;
      this.tempsTotal = this.tempsTotal + duree;
      this.enregistrement.push({
        t: this.tempsTour,
        x: Math.round(this.x),
        y: Math.round(this.y),
        angle: Math.round(this.angle * 100) / 100,
      });
    }
  }

  // Son point sur la trace, et le chemin parcouru le long de la route depuis la ligne.
  // Dans l'herbe, seul compte ce qu'elle a vraiment roulé : un raccourci ne fait pas gagner de chemin.
  suivreLaTrace(roule, dansLHerbe) {
    const i = plusProche(circuit, this.x, this.y, this.indice);
    let chemin = circuit.trace[i].d - circuit.trace[this.indice].d;
    if (chemin > circuit.longueur / 2) {
      chemin = chemin - circuit.longueur;  // elle a reculé en passant la ligne
    }
    if (chemin < -circuit.longueur / 2) {
      chemin = chemin + circuit.longueur;  // elle a passé la ligne
    }
    if (dansLHerbe) {
      chemin = Math.min(chemin, roule);
    }
    this.progres = this.progres + chemin;
    this.indice = i;
  }

  // Au milieu de la route, sur son point de la trace, tournée dans le sens de la course
  remettreSurLaRoute() {
    const point = circuit.trace[this.indice];
    this.x = point.x;
    this.y = point.y;
    this.angle = point.angle;
    this.vx = 0;
    this.vy = 0;
    this.coincee = 0;
    gerbe(this.x, this.y, "white");
  }

  // Les bidons, les flèches et les flaques qu'elle touche
  toucherLesObjets() {
    for (const bidon of circuit.bidons) {
      if (bidon.attente <= 0 && Math.hypot(this.x - bidon.x, this.y - bidon.y) < 35) {
        bidon.attente = RETOUR_BIDON;
        this.nitro = Math.min(NITRO_MAX, this.nitro + 1);
        gerbe(bidon.x, bidon.y, "#ffd23f");
        if (!this.ordinateur) {
          jouer(sonBip, 2.5);
        }
      }
    }
    for (const fleche of circuit.fleches) {
      if (Math.hypot(this.x - fleche.x, this.y - fleche.y) < 45) {
        this.turbo = Math.max(this.turbo, DUREE_FLECHE);
      }
    }
    for (const huile of circuit.huiles) {
      if (this.huile <= 0 && Math.hypot(this.x - huile.x, this.y - huile.y) < 32) {
        this.huile = DUREE_HUILE;
        gerbe(this.x, this.y, "#16141a");
      }
    }
  }

  // Vrai si elle vient de finir un tour : son chemin parcouru dépasse un tour de circuit de plus
  aFiniUnTour() {
    return !this.fini && this.progres >= this.tour * circuit.longueur;
  }

  dessinerTraces() {
    pinceau.fillStyle = "rgba(30, 30, 30, 0.35)";
    for (const trace of this.traces) {
      pinceau.fillRect(trace.x - 3, trace.y - 3, 6, 6);
    }
  }

  dessiner() {
    dessinerVoiture(this.x, this.y, this.angle, this.couleur);
  }
}

// Une voiture vue de dessus : dessinée le nez vers la droite, puis tournée
function dessinerVoiture(x, y, angle, couleur) {
  pinceau.save();
  pinceau.translate(x, y);                 // le milieu de la voiture devient le point (0, 0)
  pinceau.rotate(angle);                   // et tout ce qu'on dessine ensuite est tourné
  pinceau.fillStyle = "#111";
  pinceau.fillRect(-16, -14, 10, 5);       // les quatre roues
  pinceau.fillRect(8, -14, 10, 5);
  pinceau.fillRect(-16, 9, 10, 5);
  pinceau.fillRect(8, 9, 10, 5);
  pinceau.fillStyle = couleur;
  pinceau.fillRect(-20, -10, 40, 20);      // la carrosserie
  pinceau.fillStyle = "#2a3a4a";
  pinceau.fillRect(2, -8, 8, 16);          // le pare-brise, à l'avant
  pinceau.restore();
}
