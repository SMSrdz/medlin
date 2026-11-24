// ============================================================================
// Médellín — données des projets
// Coordonnées : x = est-ouest, z = nord-sud, y = altitude (unités du modèle)
// ============================================================================

export const OVERVIEW_VIEW = {
  pos: [74, 64, 90],
  target: [2, 10, 0],
};

export const projects = [
  {
    id: 'metrocable',
    num: '01',
    category: 'Mobilité',
    title: 'Metrocable — ligne K',
    short: 'Metrocable',
    year: '2004',
    tagline: 'Le premier téléphérique urbain pensé comme un transport public de masse.',
    summary:
      'Un téléphérique de 25 minutes relie Santo Domingo au métro et transforme la pente en accès à la ville.',
    body:
      "Accroché aux flancs de la vallée, le Metrocable relie les quartiers populaires de Santo Domingo " +
      "au réseau du métro. En 25 minutes, il remplace des heures de marche et ouvre l'accès à l'emploi, " +
      "à l'école et aux services du centre. Le trajet coûte 0,60 dollar, un tarif unique intégré au réseau.",
    stats: [
      { value: '553 000', label: 'passagers / jour' },
      { value: '25 min', label: 'de descente au lieu de plusieurs heures' },
      { value: '0,60 $', label: 'le trajet, tarif unique' },
    ],
    note: "La topographie n'est plus une barrière : elle devient le support du projet.",
    marker: [26, 21, 14],
    focus: [26, 14],
    view: { pos: [47, 30, 46], target: [26, 13, 14] },
  },
  {
    id: 'bibliotheque',
    num: '02',
    category: 'Culture',
    title: 'Parc Bibliothèque España',
    short: 'Parc Biblioteca',
    year: '2007',
    tagline: "L'architecture comme outil politique.",
    summary:
      'Trois monolithes sur la colline : la culture comme geste de dignité publique.',
    body:
      "Trois monolithes sombres posés sur la colline de Santo Domingo. Le parc bibliothèque n'est pas " +
      "seulement un équipement culturel : c'est un symbole adressé aux quartiers les plus pauvres. " +
      "Salles de lecture lumineuses, espaces de travail partagés, services pour les enfants : " +
      "la dignité se traduit dans l'espace public.",
    stats: [
      { value: '3', label: 'volumes monumentaux' },
      { value: '200+', label: 'projets dans le PUI' },
      { value: '1', label: 'place publique offerte' },
    ],
    note: 'Le message est explicite : les pauvres méritent le meilleur.',
    marker: [43, 34, 25],
    focus: [43, 25],
    view: { pos: [64, 41, 47], target: [42, 20, 25] },
  },
  {
    id: 'moravia',
    num: '03',
    category: 'Régénération',
    title: 'Centre culturel Moravia',
    short: 'Moravia',
    year: 'Années 2000',
    tagline: "D'une décharge à un centre de vie.",
    summary:
      "L'ancienne décharge devient un jardin et un centre culturel porté par les habitants.",
    body:
      "Moravia était la décharge de la ville. Le projet transforme ce territoire empoisonné en un jardin " +
      "et un centre culturel communautaire. Le sol est réhabilité, les habitants associés ; la friche " +
      "devient un lieu de mémoire, de rencontre et de fête.",
    stats: [
      { value: '1', label: 'décharge réhabilitée' },
      { value: '1', label: 'centre communautaire' },
      { value: '∞', label: 'jardins partagés' },
    ],
    note: "La régénération ne consiste pas à effacer le passé, mais à le transformer en ressource.",
    marker: [-12, 9, -30],
    focus: [-12, -30],
    view: { pos: [-36, 23, 4], target: [-12, 4, -30] },
  },
  {
    id: 'couloirs',
    num: '04',
    category: 'Environnement',
    title: 'Couloirs verts — Reverdecer 2030',
    short: 'Couloirs verts',
    year: '2030',
    tagline: 'Rafraîchir la ville par le végétal.',
    summary:
      'Un réseau de corridors végétalisés pour rafraîchir la ville de 2 °C et relier les parcs.',
    body:
      "Le plan Reverdecer 2030 tisse un réseau de corridors végétalisés le long des rues, des berges et " +
      "des places. Les arbres rafraîchissent l'air, captent les particules et relient les parcs entre eux. " +
      "Objectif : abaisser la température moyenne de la ville de 2 °C.",
    stats: [
      { value: '− 2 °C', label: 'de rafraîchissement' },
      { value: '175 000 t', label: 'de CO₂ évitées / an' },
      { value: '200+', label: 'projets intégrés' },
    ],
    note: 'Chaque rue plantée est un geste de santé publique.',
    marker: [30, 15, -6],
    focus: [30, -6],
    view: { pos: [40, 28, -26], target: [27, 8, -8] },
  },
  {
    id: 'parques',
    num: '05',
    category: 'Nature urbaine',
    title: 'Parques del Río',
    short: 'Parques del Río',
    year: '2016',
    tagline: 'Un parc linéaire au bord du fleuve — et un avertissement.',
    summary:
      'Un parc linéaire le long du fleuve, avec ses réussites et son risque de gentrification.',
    body:
      "Le long du Río Medellín, Parques del Río offre des promenades, des arbres et des espaces publics " +
      "de standard international. Mais le projet illustre aussi le revers de la médaille : sans politique " +
      "de logement, la hausse des valeurs foncières pousse les habitants hors des quartiers réhabilités, " +
      "comme à Sinaí.",
    stats: [
      { value: '1', label: 'parc linéaire' },
      { value: '1', label: 'fleuve reconnecté' },
      { value: '!', label: 'risque de gentrification' },
    ],
    note: "Un espace public de qualité ne suffit pas s'il exclut ceux qu'il devait servir.",
    marker: [1, 7, 38],
    focus: [1, 38],
    view: { pos: [28, 20, 58], target: [1, 3, 38] },
  },
  {
    id: 'culture-metro',
    num: '06',
    category: 'Immatériel',
    title: 'Culture Metro',
    short: 'Culture Metro',
    year: '1995',
    tagline: "L'infrastructure invisible : le civisme.",
    summary:
      "Un métro approprié par ses habitants, devenu école de civisme et de fierté partagée.",
    body:
      "L'innovation n'était pas seulement dans le béton. Elle était dans la manière dont les habitants " +
      "se sont approprié le métro. Campagnes d'éducation civique, fierté urbaine, respect du bien commun : " +
      "depuis son ouverture, le réseau n'a jamais subi de vandalisme majeur. « Notre métro est la maison " +
      "de tous », dit la campagne.",
    stats: [
      { value: '0', label: 'acte de vandalisme majeur' },
      { value: '1', label: 'culture partagée' },
      { value: '∞', label: 'trajets appropriés' },
    ],
    note: "La technologie ne crée pas l'appropriation. La pédagogie, si.",
    marker: [9, 10, 8],
    focus: [9, 8],
    view: { pos: [26, 16, 28], target: [9, 4, 8] },
  },
  {
    id: 'jardiniers',
    num: '07',
    category: 'Emploi & nature',
    title: 'Le bataillon des jardiniers',
    short: 'Jardiniers',
    year: 'Aujourd’hui',
    tagline: 'Des emplois locaux pour un patrimoine vivant.',
    summary:
      "Des centaines d'emplois locaux pour entretenir les arbres et les jardins de la ville.",
    body:
      "Des centaines d'habitants sont employés pour entretenir les arbres et les jardins de la ville. " +
      "Le « bataillon des jardiniers » relie fierté civique, revenus locaux et adaptation climatique. " +
      "Le végétal devient une infrastructure sociale autant qu'écologique.",
    stats: [
      { value: '100 %', label: 'emplois locaux' },
      { value: '1', label: 'réseau d’arbres entretenu' },
      { value: '1', label: 'fierté collective' },
    ],
    note: "Planter un arbre, c'est aussi planter une appartenance.",
    marker: [25, 12, -13],
    focus: [25, -13],
    view: { pos: [40, 24, -18], target: [25, 7, -13] },
  },
];

export const projectById = (id) => projects.find((p) => p.id === id) || null;
