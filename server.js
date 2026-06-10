const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ============================================================
// DONNÉES DU JEU — RÈGLES ET CONFIGURATION
// ============================================================

const REGLES = {
  compteur_anarchie_max: 10,
  tours_anarchie_min: 4,
  main_max: 7,
  main_depart: 4,
  ressources_depart: 5,
  emplacements_quartier: 6,
  seuil_emprisonnement_totalitarisme: 3,
  duree_emprisonnement: 5,
  seuil_prison_1: 10,
  seuil_prison_2: 18,
  cout_de_par_evasion: 2,
  cout_revolution_bourgeoise: 8,
  seuil_vote_oligarchie: 8,
  cout_de_defense_oligarchie: 2,
  cout_embargo_installation: 5,
  cout_embargo_maintien: 3,
  cout_desautomatisation: 5,
  perte_influence_putsch: 0.5,
  perte_influence_refus_echange: 5,
  bonus_mobilisation_populaire: 3,
  bonus_benediction: 3,
  duree_benediction: 2,
  duree_panne_systemique: 2,
  duree_corruption: 2,
  duree_coalition: 3,
  fragments_assassinat: 2,
  fragments_assassinat_espion: 1,
  seuil_protection_1: '2_casernes_2',
  seuil_protection_2: '3_casernes_3',
  impot_joueur_pouvoir: 1,
  impot_republique_par_joueur: 1,
  impot_president_republique_bonus: 1,
  impot_theocrate: 1,
};

const BATIMENTS = {
  caserne: {
    nom: 'Caserne',
    couleur: '#E57373',
    emoji: '🏰',
    cout_construction: 2,
    niveaux_max: 3,
    amelioration: [
      { or: 4, influence: 2 },
      { or: 5, influence: 4 }
    ],
    production: [
      { influence: 1 },
      { influence: 1 },
      { influence: 2, auto: true }
    ],
    militaire: [1, 2, 3]
  },
  usine: {
    nom: 'Usine',
    couleur: '#81C784',
    emoji: '🏭',
    cout_construction: 2,
    niveaux_max: 3,
    amelioration: [
      { or: 5 },
      { or: 8 }
    ],
    production: [
      { or: 2 },
      { or: 3 },
      { or: 4, auto: true }
    ],
    militaire: [0, 0, 0]
  },
  bibliotheque: {
    nom: 'Bibliothèque',
    couleur: '#64B5F6',
    emoji: '📚',
    cout_construction: 2,
    niveaux_max: 3,
    amelioration: [
      { or: 1, influence: 1 },
      { or: 3, influence: 3 }
    ],
    production: [
      { influence: 1 },
      { influence: 2 },
      { influence: 3, auto: true }
    ],
    militaire: [0, 0, 0]
  },
  temple: {
    nom: 'Temple',
    couleur: '#CE93D8',
    emoji: '⛪',
    cout_construction: 3,
    niveaux_max: 2,
    amelioration: [
      { or: 3, influence: 4 }
    ],
    production: [
      { influence: 1 },
      { influence: 1, or: 1 }
    ],
    militaire: [0, 0]
  },
  prison: {
    nom: 'Prison',
    couleur: '#90A4AE',
    emoji: '⛓',
    cout_construction: 3,
    niveaux_max: 2,
    amelioration: [
      { or: 4, influence: 4 }
    ],
    production: [
      { influence: 2 },
      { influence: 3 }
    ],
    militaire: [0, 0]
  }
};

const ROLES = {
  seigneur_de_guerre: {
    nom: 'Seigneur de guerre',
    emoji: '⚔️',
    description: 'Détruit un bâtiment adverse sans dépenser d\'or.',
    capacite: 'Destruction gratuite d\'un bâtiment adverse.',
    avantage: 'Bonus naturel Révolte populaire et Révolution bourgeoise. Assassinat en 2 fragments.',
    fragments_assassinat: 2
  },
  politicien: {
    nom: 'Politicien',
    emoji: '🎭',
    description: '1 fois par régime : force un échange entre 2 joueurs.',
    capacite: 'Force un échange entre 2 joueurs. Pas d\'accord = les deux perdent 5 influence.',
    avantage: 'Bonus négociation.',
    fragments_assassinat: 2
  },
  journaliste: {
    nom: 'Journaliste',
    emoji: '📰',
    description: '1 fois par régime : regarde 1 carte au hasard dans la main d\'un joueur et peut mentir sur ce qu\'il a vu.',
    capacite: 'Regarde une carte adverse et peut mentir lors de la révélation.',
    avantage: 'Portée scandales illimitée.',
    fragments_assassinat: 2
  },
  marchand: {
    nom: 'Marchand',
    emoji: '💰',
    description: '2 échanges commerciaux par tour. Convertit or en influence à taux préférentiel.',
    capacite: 'Double échange commercial. Taux préférentiel or/influence.',
    avantage: 'Bonus Révolution bourgeoise.',
    fragments_assassinat: 2
  },
  clerc: {
    nom: 'Clerc',
    emoji: '✝️',
    description: 'Annule l\'action d\'un joueur une fois par partie. Célèbre un mariage forcé 1 fois par partie.',
    capacite: 'Annulation d\'action (1×/partie). Mariage forcé (1×/partie).',
    avantage: 'Génère influence pour ses alliés déclarés.',
    fragments_assassinat: 2
  },
  ingenieur: {
    nom: 'Ingénieur',
    emoji: '⚙️',
    description: 'Construit ou améliore gratuitement une fois par partie.',
    capacite: 'Construction/amélioration gratuite (1×/partie).',
    avantage: 'Réparations à coût réduit. Synergie forte Technocratie.',
    fragments_assassinat: 2
  },
  espion: {
    nom: 'Espion',
    emoji: '🕵️',
    description: 'Vole la capacité spéciale d\'un joueur adjacent 1 fois par partie.',
    capacite: 'Vol de capacité spéciale (1×/partie). Sabotage anonyme.',
    avantage: 'Assassinat en 1 fragment seulement.',
    fragments_assassinat: 1
  }
};

const REGIMES_CONFIG = {
  anarchie: {
    nom: 'Anarchie',
    emoji: '🔥',
    couleur: '#FF7043',
    prerequis: {},
    victoire: { type: 'aucune' },
    impot: 0
  },
  monarchie: {
    nom: 'Monarchie',
    emoji: '👑',
    couleur: '#FFA726',
    prerequis: { temple: 1, caserne: 1, prison: 1 },
    victoire: { type: 'tours_au_pouvoir', valeur: 7 },
    impot: 1
  },
  republique: {
    nom: 'République',
    emoji: '🏛️',
    couleur: '#42A5F5',
    prerequis: { prison: 1, caserne: 1, bibliotheque: 1, usine: 1 },
    victoire: { type: 'influence', valeur: 20, tours_consecutifs: 2 },
    impot: 'par_joueur'
  },
  oligarchie: {
    nom: 'Oligarchie',
    emoji: '💎',
    couleur: '#66BB6A',
    prerequis: { usine: 2, or_min: 8 },
    victoire: { type: 'or', valeur: 20, tours_consecutifs: 2 },
    impot: 0
  },
  theocratie: {
    nom: 'Théocratie',
    emoji: '⛪',
    couleur: '#AB47BC',
    prerequis: { temple: 2, bibliotheque: 1 },
    victoire: { type: 'temples_converts', tours_consecutifs: 2 },
    impot: 1
  },
  technocratie: {
    nom: 'Technocratie',
    emoji: '⚙️',
    couleur: '#26A69A',
    prerequis: { usine_niveau: 2, bibliotheque_niveau: 2, prison: 1 },
    victoire: { type: 'batiments_automatises', valeur: 3, tours_consecutifs: 2 },
    impot: 0
  },
  totalitarisme: {
    nom: 'Totalitarisme',
    emoji: '⛓',
    couleur: '#EF5350',
    prerequis: { caserne: 2, prison_niveau: 2 },
    victoire: { type: 'emprisonne_ou_mort', valeur: 'moitie_plus_1' },
    impot: 0
  }
};

// ============================================================
// ÉTAT DES PARTIES EN COURS
// ============================================================

const parties = {};

function creerPartie(id) {
  return {
    id,
    phase: 'attente',
    joueurs: {},
    ordre_joueurs: [],
    regime_actuel: 'anarchie',
    joueur_au_pouvoir: null,
    compteur_anarchie: 0,
    tour: 0,
    tours_regime_actuel: 0,
    tours_consecutifs_victoire: 0,
    etape_tour: 'revenus',
    actions_tour: {},
    deck_generique: initialiserDeckGenerique(),
    deck_regime: [],
    defausse: [],
    journal: [],
    regles: { ...REGLES },
    config_cartes: initialiserConfigCartes(),
    embargo_actif: null,
    heresy_action: null,
    panne_systemique_tours: 0,
    mariage_actif: [],
  };
}

function creerJoueur(nom, socketId) {
  return {
    id: socketId,
    nom,
    or: 0,
    influence: 0,
    quartier: [],
    main: [],
    face_cachee: [],
    role: null,
    emprisonne: false,
    tours_prison: 0,
    mort: false,
    jeton_protection: 0,
    mariage_avec: null,
    capacite_utilisee: false,
    fragments_complot: 0,
    automatisations: [],
    tours_au_pouvoir: 0,
    victoire_consecutifs: 0,
  };
}

function initialiserDeckGenerique() {
  const cartes = [];
  const generiques = [
    { id: 'alliance_secrete', nom: 'Alliance secrète', type: 'opportunite', exemplaires: 2, description: 'Formalise un accord de protection mutuelle.', effet: 'alliance' },
    { id: 'vol', nom: 'Vol', type: 'opportunite', exemplaires: 2, description: 'Vole 2 or à un joueur adverse.', effet: 'vol', valeur: 2 },
    { id: 'amelioration_gratuite', nom: 'Amélioration gratuite', type: 'opportunite', exemplaires: 2, description: 'Améliore un bâtiment d\'un niveau gratuitement.', effet: 'amelioration_gratuite' },
    { id: 'espionnage', nom: 'Espionnage', type: 'opportunite', exemplaires: 2, description: 'Regarde les cartes face cachée d\'un joueur.', effet: 'espionnage' },
    { id: 'sabotage_mineur', nom: 'Sabotage mineur', type: 'opportunite', exemplaires: 2, description: 'Rétrograde un bâtiment adverse d\'un niveau. Coût : 1 or.', effet: 'sabotage', cout: { or: 1 } },
    { id: 'propagande', nom: 'Propagande', type: 'opportunite', exemplaires: 2, description: 'Baisse l\'influence d\'un joueur.', effet: 'baisse_influence', valeur: 3 },
    { id: 'coup_de_chance', nom: 'Coup de chance', type: 'opportunite', exemplaires: 2, description: 'Gagne 5 or OU 5 influence au choix.', effet: 'coup_de_chance', valeur: 5 },
    { id: 'chantage', nom: 'Chantage', type: 'opportunite', exemplaires: 2, description: 'Échange une information contre des ressources.', effet: 'chantage' },
    { id: 'mobilisation_populaire', nom: 'Mobilisation populaire', type: 'opportunite', exemplaires: 2, description: 'Gagne 3 influence par joueur qui te soutient.', effet: 'mobilisation', valeur: 3 },
    { id: 'fragment_complot', nom: 'Fragment de complot', type: 'mecanique', exemplaires: 3, description: 'Pose face cachée. 2 fragments = assassinat (Espion : 1).', effet: 'fragment_complot' },
    { id: 'revolte_populaire', nom: 'Révolte populaire', type: 'renversement_destructif', exemplaires: 2, description: 'Les 2 joueurs les plus influents dépassent le joueur au pouvoir. Majorité requise.', effet: 'revolte_populaire' },
    { id: 'revolution_bourgeoise', nom: 'Révolution bourgeoise', type: 'renversement_constructif', exemplaires: 2, description: 'Coûte 8 or. Achat de soutiens négociés. Majorité = renversement.', effet: 'revolution_bourgeoise', cout: { or: 8 } },
    { id: 'mariage', nom: 'Mariage', type: 'mecanique', exemplaires: 2, description: 'Lien entre deux joueurs adjacents. 1 seul par joueur par partie.', effet: 'mariage' },
    { id: 'divorce', nom: 'Divorce', type: 'mecanique', exemplaires: 2, description: 'Casse un mariage existant.', effet: 'divorce' },
    { id: 'coup_etat', nom: 'Coup d\'état', type: 'renversement_destructif', exemplaires: 2, description: 'Tentative de renversement militaire. Défaite : tous perdent de l\'or sauf l\'attaquant.', effet: 'coup_etat' },
    { id: 'corruption', nom: 'Corruption', type: 'opportunite', exemplaires: 2, description: 'Accède à un bâtiment adverse pendant 2 tours.', effet: 'corruption' },
    { id: 'embuscade', nom: 'Embuscade', type: 'reaction', exemplaires: 2, description: 'Coût 1 or. Contre toute attaque directe.', effet: 'embuscade', cout: { or: 1 } },
    { id: 'tremblement_de_terre', nom: 'Tremblement de terre', type: 'evenement', exemplaires: 1, description: 'OBLIGATOIRE. Deux joueurs contigus perdent 1 bâtiment.', effet: 'tremblement_de_terre', obligatoire: true },
    { id: 'mort_subite', nom: 'Mort subite', type: 'evenement', exemplaires: 1, description: 'OBLIGATOIRE. Un joueur désigné meurt.', effet: 'mort_subite', obligatoire: true },
    { id: 'scandale_a', nom: 'Scandale', type: 'scandale', exemplaires: 1, description: 'Baisse l\'influence de la cible (voisin direct).', effet: 'scandale', portee: 'voisin' },
    { id: 'scandale_b', nom: 'Scandale', type: 'scandale', exemplaires: 1, description: 'Baisse l\'influence de la cible (voisin direct).', effet: 'scandale', portee: 'voisin' },
    { id: 'scandale_c', nom: 'Scandale', type: 'scandale', exemplaires: 1, description: 'Baisse l\'influence de la cible (voisin direct).', effet: 'scandale', portee: 'voisin' },
    { id: 'prise_de_pouvoir', nom: 'Prise de pouvoir', type: 'prise_de_pouvoir', exemplaires: 'par_joueur', description: 'Installe ton régime si les prérequis sont remplis.', effet: 'prise_de_pouvoir' },
  ];

  generiques.forEach(carte => {
    const n = typeof carte.exemplaires === 'number' ? carte.exemplaires : 5;
    for (let i = 0; i < n; i++) {
      cartes.push({ ...carte, uid: `${carte.id}_${i}` });
    }
  });

  return melangerDeck(cartes);
}

function initialiserDeckRegime(regime) {
  const cartes_regime = {
    monarchie: [
      { id: 'heritier', nom: 'Héritier', exemplaires: 2, description: 'Monarque : protège succession. Adversaire : baisse influence du Monarque.', effet: 'heritier' },
      { id: 'droit_divin', nom: 'Droit divin', exemplaires: 2, description: 'Si temples ★★ : protège contre attaques religieuses. Réduit coût croisade.', effet: 'droit_divin' },
      { id: 'contestation', nom: 'Contestation de légitimité', exemplaires: 2, description: 'Affecte l\'héritier selon son statut.', effet: 'contestation_legitimite' },
      { id: 'revolte_cour', nom: 'Révolte de la cour', exemplaires: 3, description: 'Bloque l\'action principale du Monarque 1 tour par carte simultanée.', effet: 'revolte_cour' },
      { id: 'croisade', nom: 'Appel à la croisade', exemplaires: 1, description: 'OBLIGATOIRE. Combat coûteux. Score = 15 + tours au pouvoir.', effet: 'croisade', obligatoire: true },
    ],
    republique: [
      { id: 'pandemie', nom: 'Pandémie', exemplaires: 2, description: 'Bloque les échanges. Vol/Intimidation : duel 1d si cible a prison.', effet: 'pandemie' },
      { id: 'scandal_pol', nom: 'Scandales politiques', exemplaires: 3, description: 'Président : perdre (différence influence) OU avancer élections d\'1 tour.', effet: 'scandal_politique' },
      { id: 'coalition', nom: 'Coalition', exemplaires: 2, description: 'Joueurs avec cette carte gagnent +3 influence. Dure 3 tours.', effet: 'coalition' },
    ],
    oligarchie: [
      { id: 'casino', nom: 'Casino', exemplaires: 2, description: '3 dés vs 3 dés banque. Gains selon chiffres identiques.', effet: 'casino' },
      { id: 'espionnage_masses', nom: 'Espionnage des masses', exemplaires: 2, description: 'Joueurs >8 or voient une carte adverse (2 or). Espion : gratuit.', effet: 'espionnage_masses' },
      { id: 'monopole', nom: 'Monopole', exemplaires: 2, description: 'Nécessite bâtiment ★★★. Contrôle une ressource.', effet: 'monopole' },
      { id: 'embargo', nom: 'Embargo', exemplaires: 2, description: '5 or installation, 3 or/tour. Cible ne peut plus commercer.', effet: 'embargo' },
      { id: 'krach', nom: 'Krach boursier', exemplaires: 2, description: 'Or de tous divisé par 2. Impair → +1 or.', effet: 'krach' },
    ],
    theocratie: [
      { id: 'conversion_forcee', nom: 'Conversion forcée', exemplaires: 2, description: 'Joueur sans temple doit construire temple ★.', effet: 'conversion_forcee' },
      { id: 'benediction', nom: 'Bénédiction', exemplaires: 2, description: 'Joueurs avec temple gagnent +3 influence. 2 tours.', effet: 'benediction' },
      { id: 'excommunication', nom: 'Excommunication', exemplaires: 2, description: 'Baisse temple cible -1. Monte temple lanceur +1.', effet: 'excommunication' },
      { id: 'plaie_divine', nom: 'Plaie divine', exemplaires: 1, description: 'OBLIGATOIRE. Blasphémateurs perdent 1 inf + 1 temple + 1 caserne.', effet: 'plaie_divine', obligatoire: true },
      { id: 'tag_blasph', nom: 'Tag blasphématoire', exemplaires: 2, description: 'Duel au dé. Sacrifier 1 inf = 1 dé bonus. Perdant perd 1 niveau temple.', effet: 'tag_blasphematoire' },
    ],
    technocratie: [
      { id: 'optimisation', nom: 'Optimisation', exemplaires: 2, description: 'Améliore un bâtiment d\'un niveau gratuitement.', effet: 'optimisation' },
      { id: 'automatisation', nom: 'Automatisation', exemplaires: 2, description: 'Un bâtiment produit auto indéfiniment.', effet: 'automatisation' },
      { id: 'desautomatisation', nom: 'Désautomatisation', exemplaires: 2, description: 'Enlève automatisation d\'un bâtiment adverse. Coût : 5 or.', effet: 'desautomatisation' },
      { id: 'calcul_efficacite', nom: 'Calcul d\'efficacité', exemplaires: 2, description: 'Choisit un bâtiment. Joueur niveau le plus bas perd influence.', effet: 'calcul_efficacite' },
      { id: 'panne', nom: 'Panne systémique', exemplaires: 1, description: 'OBLIGATOIRE. Tous bâtiments auto en panne 2 tours.', effet: 'panne_systemique', obligatoire: true },
    ],
    totalitarisme: [
      { id: 'purge', nom: 'Purge', exemplaires: 2, description: 'Choisit un bâtiment. Les 2 joueurs niveau le plus bas : duel à mort.', effet: 'purge' },
      { id: 'propagande_res', nom: 'Propagande / Résistance', exemplaires: 2, description: 'Dictateur : baisse influence adverse. Adversaire : baisse influence dictateur.', effet: 'propagande_resistance' },
      { id: 'guerre_totale', nom: 'Guerre totale', exemplaires: 1, description: 'OBLIGATOIRE. Coalition Résistances vs Totalitaire. Duel collectif.', effet: 'guerre_totale', obligatoire: true },
      { id: 'resistance', nom: 'Résistance', exemplaires: 3, description: 'Utilisée dans Guerre totale ou comme Propagande/Résistance.', effet: 'resistance' },
      { id: 'deportation', nom: 'Déportation', exemplaires: 2, description: 'Échange position de deux joueurs. Liens restent en place.', effet: 'deportation' },
      { id: 'putsch', nom: 'Putsch', exemplaires: 2, description: 'Les 2 joueurs les plus influents : s\'allier OU s\'affronter.', effet: 'putsch' },
    ]
  };

  const cartes = [];
  (cartes_regime[regime] || []).forEach(carte => {
    for (let i = 0; i < carte.exemplaires; i++) {
      cartes.push({ ...carte, uid: `${carte.id}_${i}`, regime });
    }
  });
  return melangerDeck(cartes);
}

function initialiserConfigCartes() {
  return {
    regles: { ...REGLES },
    batiments: { ...BATIMENTS },
    roles: { ...ROLES },
    regimes: { ...REGIMES_CONFIG }
  };
}

function melangerDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function calculerNiveauMilitaire(joueur) {
  return joueur.quartier
    .filter(b => b.type === 'caserne')
    .reduce((sum, b) => sum + b.niveau, 0);
}

function verifierPrerequisRegime(joueur, regime) {
  const config = REGIMES_CONFIG[regime];
  if (!config) return false;
  const prereq = config.prerequis;

  for (const [type, valeur] of Object.entries(prereq)) {
    if (type === 'or_min') {
      if (joueur.or < valeur) return false;
    } else if (type.endsWith('_niveau')) {
      const bat_type = type.replace('_niveau', '');
      const bat = joueur.quartier.find(b => b.type === bat_type);
      if (!bat || bat.niveau < valeur) return false;
    } else {
      const count = joueur.quartier.filter(b => b.type === type).length;
      if (count < valeur) return false;
    }
  }
  return true;
}

function journaliser(partie, message, type = 'info') {
  const entree = { tour: partie.tour, message, type, ts: Date.now() };
  partie.journal.push(entree);
  io.to(partie.id).emit('journal', entree);
}

// ============================================================
// SOCKET.IO — GESTION DES CONNEXIONS
// ============================================================

io.on('connection', (socket) => {
  console.log(`Connexion : ${socket.id}`);

  socket.on('rejoindre_partie', ({ partie_id, nom_joueur }) => {
    let partie = parties[partie_id];
    if (!partie) {
      partie = creerPartie(partie_id);
      parties[partie_id] = partie;
    }

    if (partie.phase !== 'attente') {
      socket.emit('erreur', 'Partie déjà en cours.');
      return;
    }

    const joueur = creerJoueur(nom_joueur, socket.id);
    joueur.or = 3;
    joueur.influence = 2;
    partie.joueurs[socket.id] = joueur;
    partie.ordre_joueurs.push(socket.id);

    socket.join(partie_id);
    socket.data.partie_id = partie_id;
    socket.data.joueur_id = socket.id;

    io.to(partie_id).emit('etat_partie', serialiserPartie(partie));
    journaliser(partie, `${nom_joueur} a rejoint la partie.`);
    socket.emit('vous_etes', socket.id);
  });

  socket.on('demarrer_partie', ({ partie_id }) => {
    const partie = parties[partie_id];
    if (!partie) return;

    const nb = partie.ordre_joueurs.length;
    if (nb < 4 || nb > 6) {
      socket.emit('erreur', `Il faut entre 4 et 6 joueurs (actuellement ${nb}).`);
      return;
    }

    // Distribution cartes de départ
    partie.ordre_joueurs.forEach(jid => {
      const joueur = partie.joueurs[jid];
      for (let i = 0; i < partie.regles.main_depart; i++) {
        const carte = partie.deck_generique.shift();
        if (carte) joueur.main.push(carte);
      }
      // Cartes Prise de pouvoir = 1 par joueur
      joueur.main.push({
        id: 'prise_de_pouvoir', nom: 'Prise de pouvoir', type: 'prise_de_pouvoir',
        uid: `prise_${jid}`, description: 'Installe ton régime si les prérequis sont remplis.', effet: 'prise_de_pouvoir'
      });
    });

    partie.phase = 'jeu';
    partie.etape_tour = 'revenus';
    partie.tour = 1;

    journaliser(partie, `La partie commence ! ${nb} joueurs — Anarchie initiale.`, 'systeme');
    io.to(partie_id).emit('etat_partie', serialiserPartie(partie));
    io.to(partie_id).emit('debut_partie');
  });

  socket.on('action', ({ partie_id, type_action, donnees }) => {
    const partie = parties[partie_id];
    if (!partie) return;
    const joueur = partie.joueurs[socket.id];
    if (!joueur) return;

    traiterAction(partie, joueur, socket.id, type_action, donnees, socket);
    io.to(partie_id).emit('etat_partie', serialiserPartie(partie));
  });

  socket.on('passer_etape', ({ partie_id }) => {
    const partie = parties[partie_id];
    if (!partie) return;
    avancerEtape(partie);
    io.to(partie_id).emit('etat_partie', serialiserPartie(partie));
  });

  socket.on('message_chat', ({ partie_id, message }) => {
    const partie = parties[partie_id];
    if (!partie) return;
    const joueur = partie.joueurs[socket.id];
    io.to(partie_id).emit('chat', {
      joueur: joueur?.nom || 'Inconnu',
      message,
      ts: Date.now()
    });
  });

  // Admin — modifier les règles en direct
  socket.on('modifier_regle', ({ partie_id, cle, valeur }) => {
    const partie = parties[partie_id];
    if (!partie) return;
    partie.regles[cle] = valeur;
    journaliser(partie, `Règle modifiée : ${cle} = ${valeur}`, 'admin');
    io.to(partie_id).emit('etat_partie', serialiserPartie(partie));
  });

  socket.on('disconnect', () => {
    const partie_id = socket.data.partie_id;
    if (!partie_id || !parties[partie_id]) return;
    const partie = parties[partie_id];
    const joueur = partie.joueurs[socket.id];
    if (joueur) journaliser(partie, `${joueur.nom} s'est déconnecté.`, 'alerte');
  });
});

// ============================================================
// LOGIQUE DE JEU
// ============================================================

function traiterAction(partie, joueur, joueur_id, type_action, donnees, socket) {
  if (joueur.emprisonne && type_action !== 'negocier' && type_action !== 'evasion') {
    socket.emit('erreur', 'Vous êtes emprisonné — action impossible.');
    return;
  }

  switch (type_action) {
    case 'construire': {
      const { type_batiment } = donnees;
      const bat_config = BATIMENTS[type_batiment];
      if (!bat_config) return socket.emit('erreur', 'Bâtiment inconnu.');
      if (joueur.quartier.length >= partie.regles.emplacements_quartier) return socket.emit('erreur', 'Quartier plein — détruire un bâtiment d\'abord.');
      if (joueur.or < bat_config.cout_construction) return socket.emit('erreur', 'Or insuffisant.');

      // En anarchie, usines et prisons ne fonctionnent pas
      if (partie.regime_actuel === 'anarchie' && (type_batiment === 'usine' || type_batiment === 'prison')) {
        socket.emit('erreur', 'En anarchie, les usines et prisons ne peuvent pas être construites.');
        return;
      }

      joueur.or -= bat_config.cout_construction;
      joueur.quartier.push({ type: type_batiment, niveau: 1, automatise: false, uid: `${joueur_id}_${type_batiment}_${Date.now()}` });
      journaliser(partie, `${joueur.nom} construit ${bat_config.nom} ★.`);

      // Déclencher draft si 2ème bâtiment et pas encore de rôle
      const nb_bat = joueur.quartier.length;
      if (nb_bat === 2 && !joueur.role && !partie.draft_commence) {
        partie.draft_commence = true;
        journaliser(partie, `${joueur.nom} a 2 bâtiments — draft des rôles déclenché !`, 'systeme');
        io.to(partie.id).emit('draft_roles', { roles: Object.keys(ROLES) });
      }
      break;
    }

    case 'ameliorer': {
      const { bat_uid } = donnees;
      const bat = joueur.quartier.find(b => b.uid === bat_uid);
      if (!bat) return socket.emit('erreur', 'Bâtiment introuvable.');
      const bat_config = BATIMENTS[bat.type];
      if (bat.niveau >= bat_config.niveaux_max) return socket.emit('erreur', 'Niveau maximum atteint.');

      const cout = bat_config.amelioration[bat.niveau - 1];
      if (joueur.or < (cout.or || 0)) return socket.emit('erreur', 'Or insuffisant.');
      if (joueur.influence < (cout.influence || 0)) return socket.emit('erreur', 'Influence insuffisante.');

      joueur.or -= (cout.or || 0);
      joueur.influence -= (cout.influence || 0);
      bat.niveau += 1;
      if (bat.niveau === bat_config.niveaux_max) bat.auto_production = true;
      journaliser(partie, `${joueur.nom} améliore ${bat_config.nom} → ${'★'.repeat(bat.niveau)}.`);
      break;
    }

    case 'activer': {
      const { bat_uid } = donnees;
      const bat = joueur.quartier.find(b => b.uid === bat_uid);
      if (!bat) return socket.emit('erreur', 'Bâtiment introuvable.');

      const production = BATIMENTS[bat.type].production[bat.niveau - 1];
      joueur.or += (production.or || 0);
      joueur.influence += (production.influence || 0);
      journaliser(partie, `${joueur.nom} active ${BATIMENTS[bat.type].nom} → +${production.or || 0} or, +${production.influence || 0} influence.`);
      break;
    }

    case 'jouer_carte': {
      const { carte_uid, cible_id, choix } = donnees;
      const idx = joueur.main.findIndex(c => c.uid === carte_uid);
      if (idx === -1) return socket.emit('erreur', 'Carte introuvable dans votre main.');
      const carte = joueur.main.splice(idx, 1)[0];
      appliquerEffetCarte(partie, joueur, joueur_id, carte, cible_id, choix, socket);
      // Remettre dans la défausse sauf si retirée du jeu
      if (!carte.hors_jeu) partie.defausse.push(carte);
      break;
    }

    case 'poser_face_cachee': {
      const { carte_uid } = donnees;
      const idx = joueur.main.findIndex(c => c.uid === carte_uid);
      if (idx === -1) return socket.emit('erreur', 'Carte introuvable.');
      const carte = joueur.main.splice(idx, 1)[0];

      // Vérifier limite Totalitarisme
      const max_fc = partie.regime_actuel === 'totalitarisme'
        ? partie.ordre_joueurs.length * 2
        : Infinity;
      const total_fc = Object.values(partie.joueurs).reduce((s, j) => s + j.face_cachee.length, 0);
      if (total_fc >= max_fc) return socket.emit('erreur', 'Limite de cartes face cachée atteinte sous Totalitarisme.');

      joueur.face_cachee.push(carte);
      journaliser(partie, `${joueur.nom} pose une carte face cachée.`);

      // Fragment de complot
      if (carte.effet === 'fragment_complot') {
        joueur.fragments_complot += 1;
        const seuil = joueur.role === 'espion' ? 1 : 2;
        if (joueur.fragments_complot >= seuil) {
          journaliser(partie, `⚠️ ${joueur.nom} a complété son complot — assassinat disponible !`, 'alerte');
          io.to(partie.id).emit('complot_complet', { joueur_id });
        }
      }
      break;
    }

    case 'assassiner': {
      const { cible_id } = donnees;
      const seuil = joueur.role === 'espion' ? 1 : 2;
      if (joueur.fragments_complot < seuil) return socket.emit('erreur', 'Complot incomplet.');
      const cible = partie.joueurs[cible_id];
      if (!cible) return socket.emit('erreur', 'Cible introuvable.');

      joueur.fragments_complot = 0;
      appliquerMort(partie, cible, cible_id, joueur.nom);
      journaliser(partie, `☠️ ${joueur.nom} assassine ${cible.nom} !`, 'combat');
      break;
    }

    case 'choisir_role': {
      const { role } = donnees;
      if (!ROLES[role]) return socket.emit('erreur', 'Rôle invalide.');
      joueur.role = role;
      journaliser(partie, `${joueur.nom} a choisi son rôle.`);
      socket.emit('role_attribue', { role, config: ROLES[role] });
      break;
    }

    case 'prise_de_pouvoir': {
      const { regime } = donnees;
      if (partie.tour < partie.regles.tours_anarchie_min) {
        return socket.emit('erreur', `Impossible avant le tour ${partie.regles.tours_anarchie_min}.`);
      }
      if (!verifierPrerequisRegime(joueur, regime)) {
        return socket.emit('erreur', 'Prérequis non remplis pour ce régime.');
      }

      // Retirer carte prise de pouvoir de la main
      const idx = joueur.main.findIndex(c => c.effet === 'prise_de_pouvoir');
      if (idx === -1) return socket.emit('erreur', 'Carte Prise de pouvoir requise.');
      joueur.main.splice(idx, 1);

      installerRegime(partie, joueur_id, regime);
      break;
    }

    case 'sabotage': {
      const { cible_id, bat_uid } = donnees;
      if (cible_id === joueur_id) {
        // Sabotage sur soi
        const bat = joueur.quartier.find(b => b.uid === bat_uid);
        if (!bat) return socket.emit('erreur', 'Bâtiment introuvable.');
        bat.niveau = Math.max(1, bat.niveau - 1);
        journaliser(partie, `${joueur.nom} sabote son propre ${BATIMENTS[bat.type].nom}.`);
      } else {
        // Sabotage sur adversaire
        if (joueur.or < 1) return socket.emit('erreur', '1 or requis pour saboter.');
        const cible = partie.joueurs[cible_id];
        if (!cible) return socket.emit('erreur', 'Cible introuvable.');

        // Vérifier influence supérieure
        if (joueur.influence <= cible.influence) return socket.emit('erreur', 'Influence insuffisante — doit être supérieure à la cible.');

        joueur.or -= 1;
        const bat = cible.quartier.find(b => b.uid === bat_uid);
        if (!bat) return socket.emit('erreur', 'Bâtiment cible introuvable.');
        bat.niveau = Math.max(1, bat.niveau - 1);
        journaliser(partie, `${joueur.nom} sabote ${BATIMENTS[bat.type].nom} de ${cible.nom}.`, 'combat');
      }
      break;
    }

    case 'evasion': {
      const { contribution } = donnees;
      if (!joueur.emprisonne) return socket.emit('erreur', 'Vous n\'êtes pas emprisonné.');
      if (joueur.or < contribution * partie.regles.cout_de_par_evasion) return socket.emit('erreur', 'Or insuffisant pour cette contribution.');

      joueur.or -= contribution * partie.regles.cout_de_par_evasion;
      // Le jet sera résolu lors de la validation collective
      journaliser(partie, `${joueur.nom} tente une évasion avec ${contribution} contribution(s).`);
      break;
    }

    case 'fin_action':
      partie.actions_tour[joueur_id] = true;
      const tous_joue = partie.ordre_joueurs
        .filter(jid => !partie.joueurs[jid]?.emprisonne)
        .every(jid => partie.actions_tour[jid]);
      if (tous_joue) {
        avancerTour(partie);
      }
      break;
  }
}

function appliquerEffetCarte(partie, joueur, joueur_id, carte, cible_id, choix, socket) {
  const cible = cible_id ? partie.joueurs[cible_id] : null;

  switch (carte.effet) {
    case 'vol':
      if (!cible) return socket.emit('erreur', 'Cible requise.');
      if (partie.regime_actuel !== 'anarchie' && cible.influence > joueur.influence) {
        socket.emit('erreur', 'Influence insuffisante pour voler.');
        return;
      }
      const vol_montant = Math.min(2, cible.or);
      cible.or -= vol_montant;
      joueur.or += vol_montant;
      journaliser(partie, `${joueur.nom} vole ${vol_montant} or à ${cible.nom}.`);
      break;

    case 'amelioration_gratuite': {
      const bat = joueur.quartier.find(b => b.uid === choix?.bat_uid);
      if (!bat) return socket.emit('erreur', 'Bâtiment introuvable.');
      const bat_config = BATIMENTS[bat.type];
      if (bat.niveau >= bat_config.niveaux_max) return socket.emit('erreur', 'Niveau maximum.');
      bat.niveau += 1;
      journaliser(partie, `${joueur.nom} améliore gratuitement ${bat_config.nom}.`);
      break;
    }

    case 'baisse_influence':
      if (!cible) return socket.emit('erreur', 'Cible requise.');
      cible.influence = Math.max(0, cible.influence - (carte.valeur || 3));
      journaliser(partie, `${joueur.nom} baisse l\'influence de ${cible.nom} de ${carte.valeur || 3}.`);
      break;

    case 'coup_de_chance':
      if (choix === 'or') {
        joueur.or += carte.valeur || 5;
        journaliser(partie, `${joueur.nom} gagne ${carte.valeur || 5} or (coup de chance).`);
      } else {
        joueur.influence += carte.valeur || 5;
        journaliser(partie, `${joueur.nom} gagne ${carte.valeur || 5} influence (coup de chance).`);
      }
      break;

    case 'scandale':
      if (!cible) return socket.emit('erreur', 'Cible requise.');
      cible.influence = Math.max(0, cible.influence - 3);
      journaliser(partie, `📰 Scandale ! ${cible.nom} perd 3 influence.`, 'evenement');
      break;

    case 'revolte_populaire':
      traiterRevoltePopulaire(partie, joueur, joueur_id, socket);
      break;

    case 'revolution_bourgeoise':
      if (joueur.or < 8) return socket.emit('erreur', '8 or requis pour la Révolution bourgeoise.');
      joueur.or -= 8;
      journaliser(partie, `${joueur.nom} déclenche une Révolution bourgeoise !`, 'evenement');
      io.to(partie.id).emit('revolution_bourgeoise', { joueur_id, joueur_nom: joueur.nom });
      break;

    case 'prise_de_pouvoir':
      socket.emit('erreur', 'Utilisez l\'action prise_de_pouvoir directement.');
      break;

    case 'krach':
      Object.values(partie.joueurs).forEach(j => {
        const avant = j.or;
        j.or = Math.floor(j.or / 2);
        if (avant % 2 === 1) j.or += 1;
      });
      journaliser(partie, `💥 Krach boursier ! L\'or de tous est divisé par 2.`, 'evenement');
      break;

    case 'benediction':
      Object.values(partie.joueurs).forEach(j => {
        const a_temple = j.quartier.some(b => b.type === 'temple');
        if (a_temple) j.influence += 3;
      });
      journaliser(partie, `✨ Bénédiction ! Les convertis gagnent +3 influence.`, 'evenement');
      break;

    case 'tremblement_de_terre': {
      const ordre = partie.ordre_joueurs;
      const idx_joueur = ordre.indexOf(joueur_id);
      const voisin1_id = ordre[(idx_joueur + 1) % ordre.length];
      const voisin2_id = ordre[(idx_joueur - 1 + ordre.length) % ordre.length];
      [voisin1_id, voisin2_id].forEach(vid => {
        const v = partie.joueurs[vid];
        if (v && v.quartier.length > 0) {
          const bat = v.quartier.pop();
          journaliser(partie, `🌍 Tremblement de terre ! ${v.nom} perd ${BATIMENTS[bat.type]?.nom}.`, 'evenement');
        }
      });
      break;
    }

    case 'casino': {
      // 3 dés joueur vs 3 dés banque
      const des_joueur = [de(), de(), de()];
      const des_banque = [de(), de(), de()];
      let gain = 0;
      let identiques = 0;
      let ordre_identique = true;

      // Compter chiffres identiques (peu importe l'ordre)
      const joueur_sorted = [...des_joueur].sort();
      const banque_sorted = [...des_banque].sort();
      for (let i = 0; i < 3; i++) {
        if (joueur_sorted[i] === banque_sorted[i]) identiques++;
      }

      // Vérifier ordre identique
      for (let i = 0; i < 3; i++) {
        if (des_joueur[i] !== des_banque[i]) { ordre_identique = false; break; }
      }

      if (ordre_identique) gain = 10;
      else if (identiques === 3) gain = 6;
      else if (identiques === 2) gain = 4;
      else if (identiques === 1) gain = 2;

      joueur.or += gain;
      journaliser(partie, `🎲 Casino ! ${joueur.nom} [${des_joueur.join('-')}] vs banque [${des_banque.join('-')}] → +${gain} or.`, 'evenement');
      break;
    }

    case 'coup_etat': {
      if (!partie.joueur_au_pouvoir) return socket.emit('erreur', 'Aucun régime en place.');
      const pouvoir = partie.joueurs[partie.joueur_au_pouvoir];
      // Duel militaire : attaquant lance dés selon pts caserne, défenseur a pts garantis + dés
      const pts_attaquant = calculerNiveauMilitaire(joueur);
      const pts_defenseur = calculerNiveauMilitaire(pouvoir);
      const { attaquant_total, defenseur_total, log } = duelMilitaire(pts_attaquant, pts_defenseur, joueur.nom, pouvoir.nom);

      journaliser(partie, `⚔️ Coup d'état ! ${log}`, 'combat');

      if (attaquant_total > defenseur_total) {
        // Victoire attaquant — renversement destructif, tous perdent de l'or sauf lui
        Object.entries(partie.joueurs).forEach(([jid, j]) => {
          if (jid !== joueur_id && !j.mort) {
            const perte = Math.min(3, j.or);
            j.or -= perte;
            journaliser(partie, `${j.nom} perd ${perte} or (instabilité).`);
          }
        });
        journaliser(partie, `${joueur.nom} renverse le régime par la force !`, 'combat');
        retournerAnarchie(partie, 'destructif');
      } else {
        journaliser(partie, `Le coup d'état échoue. ${pouvoir.nom} se maintient au pouvoir.`, 'combat');
      }
      break;
    }

    case 'automatisation': {
      // Choisir un bâtiment à automatiser
      if (!choix?.bat_uid) return socket.emit('erreur', 'Bâtiment requis.');
      const bat = joueur.quartier.find(b => b.uid === choix.bat_uid);
      if (!bat) return socket.emit('erreur', 'Bâtiment introuvable.');
      bat.automatise = true;
      journaliser(partie, `⚡ ${joueur.nom} automatise ${BATIMENTS[bat.type]?.nom}. Production permanente.`);
      break;
    }

    case 'desautomatisation': {
      if (!cible) return socket.emit('erreur', 'Cible requise.');
      if (joueur.or < partie.regles.cout_desautomatisation) return socket.emit('erreur', `${partie.regles.cout_desautomatisation} or requis.`);
      const bat_auto = cible.quartier.find(b => b.automatise || b.auto_production);
      if (!bat_auto) return socket.emit('erreur', 'Aucun bâtiment automatisé chez cette cible.');
      joueur.or -= partie.regles.cout_desautomatisation;
      bat_auto.automatise = false;
      bat_auto.auto_production = false;
      journaliser(partie, `🔧 ${joueur.nom} désautomatise ${BATIMENTS[bat_auto.type]?.nom} de ${cible.nom}.`);
      break;
    }

    case 'purge': {
      if (!partie.joueur_au_pouvoir || partie.regime_actuel !== 'totalitarisme') return;
      if (!choix?.type_batiment) return socket.emit('erreur', 'Type de bâtiment requis.');
      const type_bat = choix.type_batiment;
      // Trouver les 2 joueurs avec le niveau le plus bas dans ce bâtiment
      const niveaux = partie.ordre_joueurs
        .filter(jid => jid !== partie.joueur_au_pouvoir && !partie.joueurs[jid]?.mort)
        .map(jid => {
          const j = partie.joueurs[jid];
          const bat = j.quartier.filter(b => b.type === type_bat).reduce((max, b) => Math.max(max, b.niveau), 0);
          return { jid, niveau: bat, nom: j.nom };
        })
        .sort((a, b) => a.niveau - b.niveau);

      if (niveaux.length < 2) return socket.emit('erreur', 'Pas assez de joueurs.');
      const j1 = partie.joueurs[niveaux[0].jid];
      const j2 = partie.joueurs[niveaux[1].jid];
      const pts1 = calculerNiveauMilitaire(j1);
      const pts2 = calculerNiveauMilitaire(j2);
      const { attaquant_total, defenseur_total, log } = duelMilitaire(pts1, pts2, j1.nom, j2.nom);
      journaliser(partie, `🔪 Purge ! ${BATIMENTS[type_bat]?.nom} — ${log}`, 'combat');
      const perdant = attaquant_total <= defenseur_total ? j1 : j2;
      const perdant_id = attaquant_total <= defenseur_total ? niveaux[0].jid : niveaux[1].jid;
      appliquerMort(partie, perdant, perdant_id, 'la Purge');
      break;
    }

    case 'guerre_totale': {
      if (!partie.joueur_au_pouvoir || partie.regime_actuel !== 'totalitarisme') return;
      const totalitaire = partie.joueurs[partie.joueur_au_pouvoir];
      // Coalition = joueurs avec cartes Résistance en main
      const coalition = partie.ordre_joueurs
        .filter(jid => {
          if (jid === partie.joueur_au_pouvoir) return false;
          const j = partie.joueurs[jid];
          return j && !j.mort && j.main.some(c => c.effet === 'resistance');
        });

      if (coalition.length === 0) {
        journaliser(partie, `Guerre totale — aucune résistance organisée. ${totalitaire.nom} se maintient.`, 'combat');
        break;
      }

      // Dés coalition : somme des pts militaires de tous les résistants
      const pts_coalition = coalition.reduce((sum, jid) => sum + calculerNiveauMilitaire(partie.joueurs[jid]), 0);
      const des_coalition = Math.max(1, pts_coalition);
      const des_totalitaire = Math.max(1, calculerNiveauMilitaire(totalitaire));

      // Bonus totalitaire : +1 dé par opposant emprisonné
      const emprisonnes = partie.ordre_joueurs.filter(jid => partie.joueurs[jid]?.emprisonne && jid !== partie.joueur_au_pouvoir).length;
      const total_coalition = lancerDes(des_coalition);
      const total_totalitaire = lancerDes(des_totalitaire + emprisonnes);

      journaliser(partie, `⚡ Guerre totale ! Coalition [${des_coalition} dés] = ${total_coalition} vs ${totalitaire.nom} [${des_totalitaire + emprisonnes} dés] = ${total_totalitaire}`, 'combat');

      // Retirer cartes Résistance des mains
      coalition.forEach(jid => {
        const j = partie.joueurs[jid];
        const idx = j.main.findIndex(c => c.effet === 'resistance');
        if (idx !== -1) {
          const carte_res = j.main.splice(idx, 1)[0];
          partie.deck_regime.push(carte_res); // Remise dans le deck
          partie.deck_regime = melangerDeck(partie.deck_regime);
        }
      });

      if (total_coalition > total_totalitaire) {
        journaliser(partie, `La coalition l'emporte ! Retour à l'anarchie.`, 'combat');
        retournerAnarchie(partie, 'destructif');
      } else {
        // Le plus faible résistant meurt
        const plus_faible_id = coalition.sort((a, b) =>
          calculerNiveauMilitaire(partie.joueurs[a]) - calculerNiveauMilitaire(partie.joueurs[b])
        )[0];
        const plus_faible = partie.joueurs[plus_faible_id];
        journaliser(partie, `${totalitaire.nom} écrase la résistance ! ${plus_faible.nom} meurt.`, 'combat');
        appliquerMort(partie, plus_faible, plus_faible_id, totalitaire.nom);
      }
      break;
    }

    case 'panne_systemique': {
      partie.panne_systemique_tours = partie.regles.duree_panne_systemique;
      journaliser(partie, `💥 Panne systémique ! Tous les bâtiments automatisés sont hors service pendant ${partie.regles.duree_panne_systemique} tours.`, 'evenement');
      break;
    }

    case 'calcul_efficacite': {
      if (!choix?.type_batiment) return socket.emit('erreur', 'Type de bâtiment requis.');
      const type = choix.type_batiment;
      // Trouver le joueur avec le niveau le plus bas
      let min_niveau = Infinity;
      let perdant_eff = null;
      partie.ordre_joueurs.forEach(jid => {
        const j = partie.joueurs[jid];
        if (!j || j.mort) return;
        const niv = j.quartier.filter(b => b.type === type).reduce((max, b) => Math.max(max, b.niveau), 0);
        if (niv < min_niveau) { min_niveau = niv; perdant_eff = j; }
      });
      if (perdant_eff) {
        perdant_eff.influence = Math.max(0, perdant_eff.influence - 3);
        journaliser(partie, `📊 Calcul d'efficacité (${BATIMENTS[type]?.nom}) — ${perdant_eff.nom} perd 3 influence.`);
      }
      break;
    }

    case 'putsch': {
      if (partie.regime_actuel !== 'totalitarisme') return;
      // Les 2 joueurs les plus influents hors dictateur
      const candidats = partie.ordre_joueurs
        .filter(jid => jid !== partie.joueur_au_pouvoir && !partie.joueurs[jid]?.mort)
        .sort((a, b) => partie.joueurs[b].influence - partie.joueurs[a].influence)
        .slice(0, 2);
      if (candidats.length < 2) return;

      if (choix === 'affronter') {
        const j1 = partie.joueurs[candidats[0]];
        const j2 = partie.joueurs[candidats[1]];
        const des1 = Math.max(1, Math.ceil(j1.influence / 5));
        const des2 = Math.max(1, Math.ceil(j2.influence / 5));
        const t1 = lancerDes(des1);
        const t2 = lancerDes(des2);
        journaliser(partie, `⚔️ Putsch — duel ! ${j1.nom} [${des1}d] = ${t1} vs ${j2.nom} [${des2}d] = ${t2}`, 'combat');
        if (t1 <= t2) {
          j1.influence = Math.floor(j1.influence / 2);
          journaliser(partie, `${j1.nom} perd la moitié de son influence.`);
        } else {
          j2.influence = Math.floor(j2.influence / 2);
          journaliser(partie, `${j2.nom} perd la moitié de son influence.`);
        }
      } else {
        // S'allier contre le dictateur
        journaliser(partie, `${partie.joueurs[candidats[0]].nom} et ${partie.joueurs[candidats[1]].nom} s'allient contre le dictateur !`, 'evenement');
        io.to(partie.id).emit('alliance_putsch', { joueurs: candidats });
      }
      break;
    }

    case 'excommunication': {
      if (!cible) return socket.emit('erreur', 'Cible requise.');
      const temple_cible = cible.quartier.find(b => b.type === 'temple');
      if (!temple_cible) return socket.emit('erreur', 'La cible n\'a pas de temple.');
      temple_cible.niveau = Math.max(1, temple_cible.niveau - 1);
      // Monter temple lanceur
      const temple_lanceur = joueur.quartier.find(b => b.type === 'temple');
      if (temple_lanceur && temple_lanceur.niveau < BATIMENTS.temple.niveaux_max) {
        temple_lanceur.niveau += 1;
        journaliser(partie, `✝️ Excommunication ! Temple de ${cible.nom} -1. Temple de ${joueur.nom} +1.`);
      } else {
        journaliser(partie, `✝️ Excommunication ! Temple de ${cible.nom} -1.`);
      }
      break;
    }

    case 'tag_blasphematoire': {
      if (!cible) return socket.emit('erreur', 'Cible requise.');
      // Duel de base 1 dé chacun + possibilité sacrifice influence
      const sacrifice_joueur = choix?.sacrifice_joueur || 0;
      const sacrifice_cible = choix?.sacrifice_cible || 0;
      joueur.influence = Math.max(0, joueur.influence - sacrifice_joueur);
      cible.influence = Math.max(0, cible.influence - sacrifice_cible);
      const d1 = lancerDes(1 + sacrifice_joueur);
      const d2 = lancerDes(1 + sacrifice_cible);
      journaliser(partie, `⚡ Tag blasphématoire ! ${joueur.nom} [${d1}] vs ${cible.nom} [${d2}]`, 'combat');
      const perdant_tag = d1 >= d2 ? cible : joueur;
      const temple_perdant = perdant_tag.quartier.find(b => b.type === 'temple');
      if (temple_perdant) {
        temple_perdant.niveau = Math.max(1, temple_perdant.niveau - 1);
        journaliser(partie, `${perdant_tag.nom} perd 1 niveau de temple.`);
      } else {
        perdant_tag.influence = Math.max(0, perdant_tag.influence - 2);
        journaliser(partie, `${perdant_tag.nom} perd 2 influence (pas de temple).`);
      }
      break;
    }

    case 'conversion_forcee': {
      if (!cible) return socket.emit('erreur', 'Cible requise.');
      const a_temple = cible.quartier.some(b => b.type === 'temple');
      if (a_temple) return socket.emit('erreur', `${cible.nom} a déjà un temple.`);
      if (cible.quartier.length >= partie.regles.emplacements_quartier) return socket.emit('erreur', 'Quartier de la cible plein.');
      cible.quartier.push({ type: 'temple', niveau: 1, automatise: false, uid: `${cible_id}_temple_${Date.now()}` });
      journaliser(partie, `⛪ Conversion forcée ! ${cible.nom} doit construire un temple.`, 'evenement');
      break;
    }

    case 'monopole': {
      if (!choix?.type_ressource) return socket.emit('erreur', 'Type de ressource requis.');
      partie.monopole_actif = { joueur_id, type: choix.type_ressource };
      journaliser(partie, `💎 Monopole ! ${joueur.nom} contrôle la ressource : ${choix.type_ressource}.`, 'evenement');
      break;
    }

    case 'embargo': {
      if (!cible_id) return socket.emit('erreur', 'Cible requise.');
      if (joueur.or < partie.regles.cout_embargo_installation) return socket.emit('erreur', `${partie.regles.cout_embargo_installation} or requis.`);
      joueur.or -= partie.regles.cout_embargo_installation;
      partie.embargo_actif = { source_id: joueur_id, cible_id, tours_restants: 999 };
      journaliser(partie, `🚫 Embargo ! ${joueur.nom} isole ${cible.nom}. Coût : ${partie.regles.cout_embargo_maintien} or/tour.`, 'evenement');
      break;
    }

    case 'plaie_divine': {
      // Pénalise les joueurs ayant commis un acte blasphématoire ce tour
      // Hérésie = l'action désignée au début de la Théocratie
      const heresie = partie.heresy_action;
      journaliser(partie, `☁️ Plaie divine ! Tous les blasphémateurs sont punis.`, 'evenement');
      // Sans tracking fin d'action, on applique une pénalité générale aux non-convertis
      partie.ordre_joueurs.forEach(jid => {
        const j = partie.joueurs[jid];
        if (!j || j.mort || jid === partie.joueur_au_pouvoir) return;
        const a_temple = j.quartier.some(b => b.type === 'temple');
        if (!a_temple) {
          j.influence = Math.max(0, j.influence - 1);
          const bat_caserne = j.quartier.find(b => b.type === 'caserne');
          if (bat_caserne) bat_caserne.niveau = Math.max(1, bat_caserne.niveau - 1);
          journaliser(partie, `${j.nom} est puni (1 inf, 1 niveau caserne).`);
        }
      });
      break;
    }

    case 'coalition': {
      // Joueurs avec carte Coalition gagnent +3 influence
      const bonus = partie.regles.bonus_benediction || 3;
      joueur.influence += bonus;
      journaliser(partie, `🤝 Coalition ! ${joueur.nom} gagne +${bonus} influence.`);
      break;
    }

    case 'revolt_cour': {
      // Blocage action principale du Monarque
      if (!partie.joueur_au_pouvoir || partie.regime_actuel !== 'monarchie') return;
      const pouvoir_m = partie.joueurs[partie.joueur_au_pouvoir];
      partie.monarque_bloque = (partie.monarque_bloque || 0) + 1;
      journaliser(partie, `⚔️ Révolte de la cour ! ${pouvoir_m.nom} perd ${partie.monarque_bloque} action(s) principale(s).`, 'evenement');
      break;
    }

    case 'droit_divin': {
      joueur.droit_divin = true;
      journaliser(partie, `✝️ ${joueur.nom} invoque le Droit divin. Protégé contre les attaques religieuses.`);
      break;
    }

    case 'heritier': {
      if (joueur_id === partie.joueur_au_pouvoir && partie.regime_actuel === 'monarchie') {
        joueur.a_heritier = true;
        journaliser(partie, `👑 ${joueur.nom} établit sa succession. Le régime survivra à sa mort.`);
      } else if (cible_id === partie.joueur_au_pouvoir) {
        const monarque = partie.joueurs[partie.joueur_au_pouvoir];
        monarque.influence = Math.max(0, monarque.influence - 4);
        journaliser(partie, `${joueur.nom} conteste la légitimité du Monarque. -4 influence.`);
      }
      break;
    }

    default:
      journaliser(partie, `Carte jouée : ${carte.nom}.`);
  }
}

// ============================================================
// UTILITAIRES DUEL
// ============================================================
function de() {
  return Math.floor(Math.random() * 6) + 1;
}

function lancerDes(nb) {
  let total = 0;
  for (let i = 0; i < Math.max(1, nb); i++) total += de();
  return total;
}

function duelMilitaire(pts_attaquant, pts_defenseur, nom_att, nom_def) {
  // Attaquant : lance pts_attaquant dés
  const des_att = Math.max(1, pts_attaquant);
  const res_att = lancerDes(des_att);

  // Défenseur : pts garantis + lance des dés
  const pts_garantis = pts_defenseur;
  const des_def = Math.max(1, pts_defenseur);
  const res_def_lance = lancerDes(des_def);
  const res_def = pts_garantis + res_def_lance;

  const log = `${nom_att} [${des_att}d = ${res_att}] vs ${nom_def} [${pts_garantis} garantis + ${res_def_lance} lancés = ${res_def}]`;
  return { attaquant_total: res_att, defenseur_total: res_def, log };
}

function traiterRevoltePopulaire(partie, joueur, joueur_id, socket) {
  if (!partie.joueur_au_pouvoir) return socket.emit('erreur', 'Aucun régime en place.');

  const joueurs_actifs = partie.ordre_joueurs
    .filter(jid => !partie.joueurs[jid]?.mort)
    .map(jid => partie.joueurs[jid]);

  const sorted = [...joueurs_actifs].sort((a, b) => b.influence - a.influence);
  const pouvoir = partie.joueurs[partie.joueur_au_pouvoir];
  const top2 = sorted.filter(j => j.id !== partie.joueur_au_pouvoir).slice(0, 2);

  if (top2.length < 2 || top2.some(j => j.influence <= pouvoir.influence)) {
    socket.emit('erreur', 'Conditions de Révolte populaire non remplies.');
    return;
  }

  journaliser(partie, `⚡ Révolte populaire ! ${joueur.nom} renverse le régime.`, 'evenement');
  retournerAnarchie(partie, 'destructif');
}

function installerRegime(partie, joueur_id, regime) {
  const joueur = partie.joueurs[joueur_id];
  partie.regime_precedent = partie.regime_actuel;
  partie.deck_regime = initialiserDeckRegime(regime);
  partie.deck_generique = [...partie.deck_generique, ...partie.defausse];
  partie.deck_generique = melangerDeck(partie.deck_generique);
  partie.defausse = [];
  partie.regime_actuel = regime;
  partie.joueur_au_pouvoir = joueur_id;
  partie.tours_regime_actuel = 0;
  partie.tours_consecutifs_victoire = 0;
  journaliser(partie, `👑 ${joueur.nom} installe la ${REGIMES_CONFIG[regime].nom} !`, 'systeme');
  io.to(partie.id).emit('nouveau_regime', { regime, joueur_nom: joueur.nom });
}

function retournerAnarchie(partie, type_renversement) {
  if (type_renversement === 'destructif') {
    partie.compteur_anarchie += 1;
    journaliser(partie, `📊 Compteur anarchie : ${partie.compteur_anarchie}/${partie.regles.compteur_anarchie_max}`, 'systeme');
  }
  partie.regime_actuel = 'anarchie';
  partie.joueur_au_pouvoir = null;
  partie.tours_regime_actuel = 0;
  io.to(partie.id).emit('anarchie', { compteur: partie.compteur_anarchie });

  if (partie.compteur_anarchie >= partie.regles.compteur_anarchie_max) {
    terminerPartie(partie, null, 'anarchie');
  }
}

function appliquerMort(partie, joueur, joueur_id, tueur_nom) {
  joueur.role = null;
  const nb_bat = joueur.quartier.length;
  const a_perdre = Math.floor(nb_bat / 2);
  joueur.quartier = joueur.quartier.slice(a_perdre);
  joueur.mort = true;
  journaliser(partie, `☠️ ${joueur.nom} est mort. ${a_perdre} bâtiments perdus.`, 'alerte');
  io.to(partie.id).emit('mort_joueur', { joueur_id, joueur_nom: joueur.nom });
}

function avancerTour(partie) {
  // Revenus automatiques
  partie.ordre_joueurs.forEach(jid => {
    const j = partie.joueurs[jid];
    if (!j || j.mort) return;

    // Bâtiments auto
    j.quartier.forEach(bat => {
      const prod = BATIMENTS[bat.type]?.production[bat.niveau - 1];
      if ((bat.auto_production || bat.automatise) && prod && partie.panne_systemique_tours === 0) {
        j.or += (prod.or || 0);
        j.influence += (prod.influence || 0);
      }
    });

    // Impôt joueur au pouvoir
    if (jid === partie.joueur_au_pouvoir && partie.regime_actuel !== 'anarchie') {
      if (partie.regime_actuel === 'republique') {
        const nb_joueurs = partie.ordre_joueurs.filter(id => !partie.joueurs[id]?.mort).length;
        j.or += nb_joueurs + 1;
        partie.ordre_joueurs.forEach(id => {
          if (id !== jid && !partie.joueurs[id]?.mort) {
            partie.joueurs[id].or = Math.max(0, partie.joueurs[id].or - 1);
          }
        });
      } else if (partie.regime_actuel === 'theocratie') {
        j.or += partie.regles.impot_joueur_pouvoir;
      } else {
        j.or += partie.regles.impot_joueur_pouvoir;
      }
    }

    // Emprisonnement auto Totalitarisme
    if (partie.regime_actuel === 'totalitarisme' && jid !== partie.joueur_au_pouvoir) {
      if (j.influence < partie.regles.seuil_emprisonnement_totalitarisme && !j.emprisonne) {
        j.emprisonne = true;
        j.tours_prison = partie.regles.duree_emprisonnement;
        journaliser(partie, `⛓ ${j.nom} est emprisonné automatiquement (influence < ${partie.regles.seuil_emprisonnement_totalitarisme}).`, 'alerte');
      }
    }

    // Décompter prison
    if (j.emprisonne) {
      j.tours_prison -= 1;
      if (j.tours_prison <= 0) {
        j.emprisonne = false;
        j.tours_prison = 0;
        journaliser(partie, `${j.nom} est libéré.`);
      }
    }
  });

  // Pioche automatique
  partie.ordre_joueurs.forEach(jid => {
    const j = partie.joueurs[jid];
    if (!j || j.mort) return;
    if (j.main.length < partie.regles.main_max) {
      const src = partie.deck_regime.length > 0 && Math.random() < 0.3
        ? partie.deck_regime
        : partie.deck_generique;
      const carte = src.shift();
      if (carte) {
        j.main.push(carte);
        if (carte.obligatoire) {
          journaliser(partie, `⚠️ ${j.nom} tire ${carte.nom} — OBLIGATOIRE.`, 'alerte');
        }
      }
    }
  });

  // Panne systémique
  if (partie.panne_systemique_tours > 0) partie.panne_systemique_tours -= 1;

  // Avancer tour
  partie.tour += 1;
  partie.tours_regime_actuel += 1;
  partie.actions_tour = {};

  // Vérifier victoire
  verifierVictoire(partie);

  // Élections républicaines automatiques
  if (partie.regime_actuel === 'republique' && partie.tours_regime_actuel > 0 && partie.tours_regime_actuel % 5 === 0) {
    const president = partie.joueurs[partie.joueur_au_pouvoir];
    const challengers = partie.ordre_joueurs
      .filter(jid => jid !== partie.joueur_au_pouvoir && !partie.joueurs[jid]?.mort)
      .map(jid => ({ jid, influence: partie.joueurs[jid].influence }))
      .sort((a, b) => b.influence - a.influence);
    const top = challengers[0];
    if (top && top.influence > president.influence) {
      const nouveau = partie.joueurs[top.jid];
      journaliser(partie, `🗳️ Élections ! ${nouveau.nom} (${top.influence} inf) dépasse ${president.nom} — nouveau président !`, 'systeme');
      partie.joueur_au_pouvoir = top.jid;
      partie.tours_regime_actuel = 0;
      io.to(partie.id).emit('elections_resultat', { gagnant: nouveau.nom, perdant: president.nom });
    } else {
      journaliser(partie, `🗳️ Élections ! ${president.nom} se maintient au pouvoir.`, 'systeme');
      partie.tours_regime_actuel = 0;
    }
  }

  // Embargo — maintien
  if (partie.embargo_actif) {
    const source = partie.joueurs[partie.embargo_actif.source_id];
    if (source && source.or >= partie.regles.cout_embargo_maintien) {
      source.or -= partie.regles.cout_embargo_maintien;
    } else {
      journaliser(partie, `🚫 Embargo levé — ${source?.nom} ne peut plus payer.`);
      partie.embargo_actif = null;
    }
  }

  journaliser(partie, `--- Tour ${partie.tour} ---`, 'systeme');
  io.to(partie.id).emit('nouveau_tour', { tour: partie.tour });
}

function avancerEtape(partie) {
  const etapes = ['revenus', 'pioche', 'negociation', 'action', 'verification'];
  const idx = etapes.indexOf(partie.etape_tour);
  if (idx < etapes.length - 1) {
    partie.etape_tour = etapes[idx + 1];
    if (partie.etape_tour === 'verification') avancerTour(partie);
  }
}

function verifierVictoire(partie) {
  if (!partie.joueur_au_pouvoir) return;
  const joueur = partie.joueurs[partie.joueur_au_pouvoir];
  if (!joueur) return;
  const config = REGIMES_CONFIG[partie.regime_actuel];
  if (!config) return;
  const v = config.victoire;

  let victoire = false;

  switch (v.type) {
    case 'tours_au_pouvoir':
      if (partie.tours_regime_actuel >= v.valeur) victoire = true;
      break;
    case 'influence':
      if (joueur.influence >= v.valeur) {
        partie.tours_consecutifs_victoire += 1;
        if (partie.tours_consecutifs_victoire >= v.tours_consecutifs) victoire = true;
      } else {
        partie.tours_consecutifs_victoire = 0;
      }
      break;
    case 'or':
      const joueurs_actifs = partie.ordre_joueurs.filter(jid => !partie.joueurs[jid]?.mort);
      const any_over = joueurs_actifs.some(jid => partie.joueurs[jid].or >= v.valeur);
      if (any_over) {
        partie.tours_consecutifs_victoire += 1;
        if (partie.tours_consecutifs_victoire >= v.tours_consecutifs) victoire = true;
      } else {
        partie.tours_consecutifs_victoire = 0;
      }
      break;
    case 'batiments_automatises': {
      const nb_auto = joueur.quartier.filter(b => b.automatise || b.auto_production).length;
      if (nb_auto >= v.valeur) {
        partie.tours_consecutifs_victoire += 1;
        if (partie.tours_consecutifs_victoire >= v.tours_consecutifs) victoire = true;
      } else {
        partie.tours_consecutifs_victoire = 0;
      }
      break;
    }
    case 'emprisonne_ou_mort': {
      const total_joueurs = partie.ordre_joueurs.length;
      const seuil = Math.ceil(total_joueurs / 2) + 1;
      const emprisonnes_morts = partie.ordre_joueurs.filter(jid => {
        const j = partie.joueurs[jid];
        return jid !== partie.joueur_au_pouvoir && (j?.emprisonne || j?.mort);
      }).length;
      if (emprisonnes_morts >= seuil) victoire = true;
      break;
    }
  }

  if (victoire) terminerPartie(partie, partie.joueur_au_pouvoir, 'victoire');
}

function terminerPartie(partie, vainqueur_id, raison) {
  partie.phase = 'terminee';
  const msg = raison === 'victoire'
    ? `🏆 ${partie.joueurs[vainqueur_id]?.nom} remporte la partie avec la ${REGIMES_CONFIG[partie.regime_actuel]?.nom} !`
    : `💀 Effondrement collectif — personne ne gagne. ${partie.compteur_anarchie} tours d'anarchie cumulés.`;
  journaliser(partie, msg, 'systeme');
  io.to(partie.id).emit('fin_partie', { vainqueur_id, raison, message: msg });
}

function serialiserPartie(partie) {
  return {
    id: partie.id,
    phase: partie.phase,
    tour: partie.tour,
    regime_actuel: partie.regime_actuel,
    regime_config: REGIMES_CONFIG[partie.regime_actuel],
    joueur_au_pouvoir: partie.joueur_au_pouvoir,
    compteur_anarchie: partie.compteur_anarchie,
    compteur_anarchie_max: partie.regles.compteur_anarchie_max,
    tours_regime: partie.tours_regime_actuel,
    etape_tour: partie.etape_tour,
    joueurs: Object.fromEntries(
      Object.entries(partie.joueurs).map(([id, j]) => [id, {
        id: j.id,
        nom: j.nom,
        or: j.or,
        influence: j.influence,
        quartier: j.quartier,
        role: j.role,
        role_config: j.role ? ROLES[j.role] : null,
        nb_cartes_main: j.main.length,
        nb_face_cachee: j.face_cachee.length,
        emprisonne: j.emprisonne,
        tours_prison: j.tours_prison,
        mort: j.mort,
        jeton_protection: j.jeton_protection,
        fragments_complot: j.fragments_complot,
      }])
    ),
    ordre_joueurs: partie.ordre_joueurs,
    journal: partie.journal.slice(-30),
    regles: partie.regles,
    batiments_config: BATIMENTS,
    regimes_config: REGIMES_CONFIG,
    roles_config: ROLES,
  };
}

function serialiserJoueurPrive(partie, joueur_id) {
  const j = partie.joueurs[joueur_id];
  if (!j) return null;
  return {
    main: j.main,
    face_cachee: j.face_cachee,
  };
}

// Route pour les données privées d'un joueur
app.get('/api/joueur/:partie_id/:joueur_id', (req, res) => {
  const partie = parties[req.params.partie_id];
  if (!partie) return res.status(404).json({ erreur: 'Partie introuvable.' });
  const prive = serialiserJoueurPrive(partie, req.params.joueur_id);
  if (!prive) return res.status(404).json({ erreur: 'Joueur introuvable.' });
  res.json(prive);
});

// Route admin pour modifier les règles
app.post('/api/admin/regle', (req, res) => {
  const { partie_id, cle, valeur } = req.body;
  const partie = parties[partie_id];
  if (!partie) return res.status(404).json({ erreur: 'Partie introuvable.' });
  partie.regles[cle] = valeur;
  io.to(partie_id).emit('etat_partie', serialiserPartie(partie));
  res.json({ ok: true, cle, valeur });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Régimes — serveur démarré sur port ${PORT}`));
