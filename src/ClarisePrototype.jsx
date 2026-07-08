import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import {
  Search, NotebookPen, MessageCircle, Navigation, ArrowLeft, Send, Bookmark, AlertTriangle, Phone, Settings, ChevronRight, Hand, Heart, EyeOff, ArrowDown, ArrowLeftRight, Eye, MessageSquare, Repeat, Shrink, Droplet, Link2, RefreshCw, Moon, UserMinus, Lock, BellOff, Brain, User, Anchor, Sparkles, Target, Scale, Battery, Check, Plus, LogOut, Tag as TagIcon, Award, Frown, VolumeX, Users, DoorOpen, Zap, HelpCircle, Smile, Clock, Repeat2, Layers, Quote, ThumbsUp, Crown, Hourglass, TrendingDown
} from "lucide-react";

// Adresse du serveur Clarisé (le backend qui parle à l'IA en gardant la clé secrète).
// Pour changer de serveur, il suffit de modifier cette ligne.
const BACKEND_URL = "https://clarise-backend.onrender.com";

// Contexte global : affichage des textes d'aide (sous-titres)
const HelpContext = createContext(true);

/* ============================================================
   CLARISÉ — Prototype cliquable
   4 écrans : Analyser · Journal · Coach IA · Se repérer
   Analyse réelle branchée sur l'API Claude
   ============================================================ */

// ---- Design tokens (gamme rose framboise dérivée de #C87483) ----
const T = {
  bg: "#FBEDF0",        // fond global, rose très clair (framboise pâle)
  text: "#3A3A3A",
  textSoft: "#6B6B6B",
  white: "#FFF6F8",     // cartes / zones blanches légèrement rosées
  pink: "#C87483",      // couleur principale
  pinkDark: "#A85667",  // appui / pressé
  pinkSoft: "#E3A9B4",  // version douce (désactivé, contours)
  pink100: "#F6E0E6",   // pastel clair (puces d'icônes, bulles, sélecteur)
  pink50: "#FBEDF0",    // le plus clair
  pinkBar: "#F2D7DD",   // fond barre du bas
  pinkBorder: "#EBC4CD",// bordures douces
  radius: 16,
  // 4 niveaux de danger (signaux sémantiques — harmonisés avec la gamme douce)
  levels: {
    ok:          { label: "Sain",        bg: "#E6F2EA", text: "#2F6B4F", dot: "#3E8E63" },
    preoccupant: { label: "Préoccupant", bg: "#F7ECD8", text: "#8A5310", dot: "#EC9A3A" },
    toxique:     { label: "Toxique",     bg: "#FBE6D7", text: "#974A16", dot: "#E08338" },
    dangereux:   { label: "Dangereux",   bg: "#F6DDDF", text: "#A33843", dot: "#D06A70" },
  },
};

// Teintes des cartes d'analyse : en-tête (head), corps doux (body),
// et couleur du titre dans l'en-tête (headText) pour la lisibilité.
const CARD_TINT = {
  ok:          { head: "#9CCBB0", body: "#E6F2EA", headText: "#1F5238" },
  preoccupant: { head: "#EC9A3A", body: "#F7ECD8", headText: "#FFFFFF" },
  toxique:     { head: "#E08338", body: "#FBE6D7", headText: "#FFFFFF" },
  dangereux:   { head: "#D98A8F", body: "#F6DDDF", headText: "#FFFFFF" },
};

// Charge jsPDF à la volée (une seule fois)
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF) return resolve(window.jspdf.jsPDF);
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    sc.onload = () => resolve(window.jspdf.jsPDF);
    sc.onerror = () => reject(new Error("Impossible de charger le générateur PDF."));
    document.body.appendChild(sc);
  });
}

// Exporte le journal en PDF téléchargeable, mis en page aux couleurs de Clarisé
async function exportJournal(journal) {
  let jsPDF;
  try {
    jsPDF = await loadJsPDF();
  } catch (e) {
    alert("L'export PDF n'a pas pu démarrer (connexion requise). Réessayez en ligne.");
    return;
  }
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;               // marge
  let y = M;

  // couleurs
  const pink = [200, 116, 131];
  const dark = [90, 42, 54];
  const soft = [120, 110, 110];

  // En-tête
  doc.setFillColor(251, 237, 240);
  doc.rect(0, 0, W, 92, "F");
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text("Clarisé — Mon journal", M, 54);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.setTextColor(...soft);
  doc.text("Exporté le " + new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }), M, 74);
  y = 124;

  if (!journal || journal.length === 0) {
    doc.setTextColor(...soft); doc.setFontSize(12);
    doc.text("Aucune note pour le moment.", M, y);
  } else {
    journal.forEach(e => {
      // saut de page si besoin
      if (y > H - 120) { doc.addPage(); y = M; }
      // date + auteur
      doc.setTextColor(...pink); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text((e.date || "") + (e.author ? "   ·   " + e.author : ""), M, y);
      y += 18;
      // message
      doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "normal"); doc.setFontSize(13);
      const lines = doc.splitTextToSize(e.message || "", W - M * 2);
      doc.text(lines, M, y);
      y += lines.length * 17 + 4;
      // mécanismes
      if (e.tags && e.tags.length) {
        doc.setTextColor(...soft); doc.setFontSize(10.5);
        const tagline = doc.splitTextToSize("Mécanismes : " + e.tags.join(", "), W - M * 2);
        doc.text(tagline, M, y);
        y += tagline.length * 14;
      }
      // séparateur
      y += 10;
      doc.setDrawColor(235, 196, 205);
      doc.line(M, y, W - M, y);
      y += 22;
    });
  }

  // pied de page discret
  doc.setTextColor(...soft); doc.setFontSize(9);
  doc.text("Clarisé — document personnel et confidentiel.", M, H - 28);

  doc.save("clarise-journal.pdf");
}

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Icône composée : cœur qui irradie (love bombing, façon 💗)
function RadiatingHeart({ size = 20, color = "currentColor", strokeWidth = 2, style }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, alignItems: "center", justifyContent: "center", ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0 }}>
        {rays.map((deg, i) => {
          const a = (deg * Math.PI) / 180;
          const x1 = 12 + Math.cos(a) * 9.5, y1 = 12 + Math.sin(a) * 9.5;
          const x2 = 12 + Math.cos(a) * 11.2, y2 = 12 + Math.sin(a) * 11.2;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.6} strokeLinecap="round" />;
        })}
      </svg>
      <Heart size={size * 0.6} color={color} strokeWidth={strokeWidth} fill={color} />
    </span>
  );
}

// Icône composée : cerveau en surchauffe (gaslighting, façon 🤯)
function OverheatBrain({ size = 20, color = "currentColor", strokeWidth = 2, style }) {
  const bursts = [
    { x: 4.5, y: 5 }, { x: 12, y: 3 }, { x: 19.5, y: 5 },
    { x: 3.5, y: 12 }, { x: 20.5, y: 12 },
  ];
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, alignItems: "center", justifyContent: "center", ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0 }}>
        {bursts.map((b, i) => (
          <g key={i} stroke={color} strokeWidth={1.5} strokeLinecap="round">
            <line x1={b.x} y1={b.y - 1.5} x2={b.x} y2={b.y + 1.5} />
            <line x1={b.x - 1.5} y1={b.y} x2={b.x + 1.5} y2={b.y} />
          </g>
        ))}
      </svg>
      <Brain size={size * 0.62} color={color} strokeWidth={strokeWidth} />
    </span>
  );
}

// Petite animation « en train de réfléchir » : trois points qui pulsent
function ThinkingDots({ color = "#fff" }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <style>{`@keyframes clariseBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}`}</style>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: color,
          display: "inline-block", animation: "clariseBlink 1.2s infinite both",
          animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  );
}

// Effet d'appui réutilisable pour les boutons pleins (assombrit au clic)
function pressFx(base = T.pink, dark = T.pinkDark) {
  const set = c => e => { e.currentTarget.style.background = c; };
  return {
    onMouseDown: set(dark), onMouseUp: set(base), onMouseLeave: set(base),
    onTouchStart: set(dark), onTouchEnd: set(base),
  };
}

// ---- Seed data for the journal ----
const SEED_JOURNAL = [
  {
    id: 1, author: "Julien", date: "24 avr. 2025",
    message: "Si tu fais ça, c'est terminé entre nous !",
    tags: ["Chantage affectif", "Menace"], level: "dangereux",
  },
  {
    id: 2, author: "Marc", date: "26 avr. 2025",
    message: "Tu me fatigues avec tes demandes, je suis en dépression à cause de toi",
    tags: ["Culpabilisation", "Renversement de responsabilité"], level: "toxique",
  },
];

// ---- QCM modules (Partie 7.5) — questions + bilans ----
// sense "difficulte" : Oui=2, Parfois=1, Non=0 (plus de Oui => niveau monte)
// sense "ressource"  : Non=2, Parfois=1, Oui=0 (moins de soutien => niveau monte)
const QCM_MODULES = [
  {
    title: "Mon climat relationnel",
    sub: "Comprendre comment je me sens près des autres.",
    sense: "difficulte",
    questions: [
      "Avez-vous peur de sa réaction si vous ne répondez pas ou si vous dites non ?",
      "Vous sentez-vous obligé·e de vous justifier régulièrement ?",
      "Avez-vous l'impression de « marcher sur des œufs » en sa présence ?",
      "Vos paroles ou vos intentions sont-elles souvent déformées ou retournées contre vous ?",
      "Renoncez-vous à voir certaines personnes pour éviter les tensions ?",
      "Après un échange, repartez-vous souvent avec un sentiment de confusion ou de culpabilité ?",
    ],
    green: "Vos relations proches semblent reposer sur le respect et la sécurité. Vous vous sentez globalement libre d'être vous-même.",
    yellow: "Certains échanges génèrent de la tension ou de la culpabilité. Ce ne sont pas forcément des signes graves, mais ils méritent attention. En parler à une personne de confiance peut aider à y voir clair.",
    red: "Plusieurs réponses décrivent un climat de peur, de justification permanente ou de confusion. Ce sont des signaux importants. Vous n'avez pas à porter ça seul·e : parlez-en à un professionnel ou à un proche de confiance.",
  },
  {
    title: "Ma charge intérieure",
    sub: "Ce qui pèse, fatigue ou tend sans bruit.",
    sense: "difficulte",
    questions: [
      "Vous sentez-vous fatigué·e même après avoir dormi ou vous être reposé·e ?",
      "Avez-vous du mal à « débrancher » et à penser à autre chose ?",
      "Avez-vous l'impression de tout porter ou de devoir tout gérer seul·e ?",
      "Des tensions physiques (gorge serrée, ventre noué, dos…) reviennent-elles souvent ?",
      "Remettez-vous à plus tard des choses qui comptent pour vous, faute d'énergie ?",
      "Avez-vous le sentiment d'être au bord de la surcharge ?",
    ],
    green: "Votre charge intérieure paraît gérable en ce moment. Vous gardez de l'espace pour souffler.",
    yellow: "Plusieurs signaux de fatigue ou de tension reviennent. Ce n'est pas rien : votre corps et votre esprit demandent peut-être un peu de répit. Pensez à alléger ce qui peut l'être et à demander de l'aide.",
    red: "Les réponses décrivent une surcharge installée. À ce niveau, le repos seul ne suffit souvent plus. Parlez-en à un professionnel : il peut vous aider à reprendre du souffle et à répartir la charge.",
  },
  {
    title: "Comment je me parle",
    sub: "Observer la façon dont je me traite au quotidien.",
    sense: "difficulte",
    questions: [
      "Vous reprochez-vous fréquemment vos erreurs, même petites ?",
      "Vous comparez-vous souvent aux autres à votre désavantage ?",
      "Vous arrive-t-il de vous dire des choses dures, que vous ne diriez jamais à un ami ?",
      "Avez-vous du mal à reconnaître vos réussites ou à vous féliciter ?",
      "Pensez-vous souvent que vous « n'en faites pas assez » ou que vous « n'êtes pas à la hauteur » ?",
      "Vous sentez-vous coupable de prendre du temps pour vous ?",
    ],
    green: "Vous semblez vous traiter avec une bienveillance plutôt stable. Vous laissez de la place à l'erreur sans vous accabler.",
    yellow: "Votre voix intérieure se fait parfois dure. Ce n'est pas une fatalité : la façon dont on se parle s'apprend et se rééduque. Y prêter attention est déjà un premier pas.",
    red: "Les réponses décrivent une autocritique forte et fréquente. Cette dureté envers soi pèse lourd avec le temps. Un professionnel (psychologue) peut vous aider à apaiser ce dialogue intérieur — vous le méritez.",
  },
  {
    title: "Mon entourage intérieur",
    sub: "Comment je me sens entouré·e.",
    sense: "ressource",
    questions: [
      "Avez-vous au moins une personne à qui parler librement de ce que vous vivez ?",
      "Vous sentez-vous écouté·e sans être jugé·e quand vous vous confiez ?",
      "Pouvez-vous demander de l'aide quand vous en avez besoin ?",
      "Vous sentez-vous relié·e à des gens qui comptent pour vous ?",
      "Avez-vous le sentiment de pouvoir compter sur quelqu'un en cas de coup dur ?",
      "Vous sentez-vous à votre place dans au moins un groupe ou un lien ?",
    ],
    green: "Vous semblez bien entouré·e et capable de vous appuyer sur d'autres. C'est une ressource précieuse — prenez-en soin.",
    yellow: "Le soutien autour de vous existe mais reste fragile ou limité. Renforcer un ou deux liens de confiance peut faire une vraie différence. Vous n'êtes pas obligé·e d'avancer seul·e.",
    red: "Les réponses pointent un sentiment d'isolement. Se sentir seul·e rend tout plus lourd, et c'est souvent le premier point sur lequel agir. Renouer un lien, ou parler à un professionnel ou une ligne d'écoute, peut beaucoup aider.",
  },
  {
    title: "Ma météo intérieure",
    sub: "Faire le point sur ce qui se passe en moi en ce moment.",
    sense: "difficulte",
    questions: [
      "Vous sentez-vous anxieux·se ou tendu·e une bonne partie de la journée ?",
      "Avez-vous du mal à ressentir de la joie ou de l'envie en ce moment ?",
      "Vos émotions vous semblent-elles difficiles à contenir (larmes, colère, vide) ?",
      "Avez-vous l'impression de fonctionner « en pilote automatique » ?",
      "Le sommeil ou l'appétit sont-ils perturbés depuis quelque temps ?",
      "Avez-vous le sentiment d'avoir perdu votre élan habituel ?",
    ],
    green: "Votre météo intérieure paraît plutôt clémente en ce moment. Vous gardez accès à vos émotions et à votre énergie.",
    yellow: "Le ciel intérieur est un peu chargé. Ces signaux passagers méritent d'être écoutés sans dramatiser. Accordez-vous de la douceur, et surveillez si cela s'installe.",
    red: "Plusieurs signaux d'un mal-être qui dure se cumulent. Quand l'anxiété, le vide ou la perte d'élan s'installent, en parler à un professionnel est important. Si vous traversez un moment très difficile, la page « Obtenir de l'aide » réunit des contacts immédiats.",
  },
  {
    title: "Mes ressources pour aller mieux",
    sub: "Ce que je sais faire pour me soutenir.",
    sense: "ressource",
    questions: [
      "Avez-vous des activités qui vous font du bien et que vous pratiquez vraiment ?",
      "Savez-vous repérer quand vous avez besoin de souffler ?",
      "Arrivez-vous à poser des limites pour vous protéger ?",
      "Avez-vous des moments rien qu'à vous dans la semaine ?",
      "Connaissez-vous ce qui vous apaise quand ça ne va pas ?",
      "Vous autorisez-vous à demander de l'aide sans culpabiliser ?",
    ],
    green: "Vous disposez de vraies ressources pour prendre soin de vous. Continuez à vous appuyer dessus, surtout dans les moments tendus.",
    yellow: "Vous avez quelques appuis, mais ils restent à consolider. Identifier deux ou trois gestes simples qui vous font du bien — et les protéger — renforcera votre équilibre.",
    red: "Les réponses montrent peu de ressources mobilisables aujourd'hui. Ce n'est pas un manque de volonté : ces appuis se construisent, souvent avec de l'aide. Un professionnel peut vous accompagner pour les retrouver pas à pas.",
  },
];

const QCM_OPTIONS = [
  { label: "Oui", v: 2 },
  { label: "Parfois", v: 1 },
  { label: "Non", v: 0 },
];

// niveau de bilan à partir du score /12, selon le sens du module
function qcmResult(module, rawScore) {
  // pour "ressource", on inverse : un Oui (2) compte comme 0
  const score = module.sense === "ressource" ? (12 - rawScore) : rawScore;
  if (score <= 3) return { key: "green", level: "ok", title: "Bonnes conditions", text: module.green };
  if (score <= 7) return { key: "yellow", level: "preoccupant", title: "Attention — quelques signaux", text: module.yellow };
  return { key: "red", level: "dangereux", title: "Situation préoccupante", text: module.red };
}

// ---- Mécanismes : mot + définition (ton factuel, non jugeant) ----
// ---- Glossaire : familles + termes (mot, court, def, effet, exemple) ----
const MECA_CATS = [
  "Manipulation & communication",
  "Emprise & pouvoir",
  "Effets sur soi & santé mentale",
  "Biais cognitifs",
];

const MECANISMES = [
  // --- Manipulation & communication ---
  { cat: "Manipulation & communication", mot: "Gaslighting", icon: OverheatBrain, court: "Faire douter de sa propre perception.",
    def: "Le gaslighting consiste à amener une personne à douter de sa mémoire, de son ressenti ou de sa perception des faits. Les phrases typiques nient une réalité pourtant vécue.",
    effet: "Avec le temps, on peut finir par ne plus se fier à son propre jugement et chercher constamment une validation extérieure.",
    exemple: "« Tu exagères, je n'ai jamais dit ça — tu te fais des films. »" },
  { cat: "Manipulation & communication", mot: "Culpabilisation", icon: Hand, court: "Faire porter la faute à l'autre.",
    def: "La culpabilisation rend une personne responsable de la situation, des émotions ou des choix de l'autre, même quand ce n'est pas justifié.",
    effet: "On se sent obligé de se justifier, de réparer, ou de céder pour faire retomber la tension.",
    exemple: "« Si tu m'aimais vraiment, tu ne me ferais pas ça. »" },
  { cat: "Manipulation & communication", mot: "Chantage affectif", icon: Heart, court: "Conditionner l'amour ou l'affection.",
    def: "Le chantage affectif lie l'affection, la relation ou l'approbation à un comportement attendu. L'amour devient une récompense ou une menace selon ce que l'on fait.",
    effet: "On agit par peur de perdre le lien plutôt que par choix libre.",
    exemple: "« Si tu pars ce soir, c'est fini entre nous. »" },
  { cat: "Manipulation & communication", mot: "Menace", icon: AlertTriangle, court: "Faire peur pour obtenir quelque chose.",
    def: "La menace, explicite ou implicite, cherche à obtenir une réaction par la peur des conséquences plutôt que par l'échange.",
    effet: "Elle installe un climat d'insécurité où l'on agit pour éviter le danger annoncé.",
    exemple: "« Tu vas le regretter si tu fais ça. »" },
  { cat: "Manipulation & communication", mot: "Dévalorisation", icon: ArrowDown, court: "Attaquer l'estime de soi.",
    def: "La dévalorisation rabaisse une personne par des critiques répétées, des moqueries ou des comparaisons défavorables.",
    effet: "À force, on peut douter de soi, de sa valeur et de sa légitimité à exister tel qu'on est.",
    exemple: "« De toute façon, tu es incapable de comprendre. »" },
  { cat: "Manipulation & communication", mot: "Contrôle / Intrusion", icon: Eye, court: "Surveiller ou envahir l'espace personnel.",
    def: "Le contrôle cherche à surveiller, limiter ou diriger les faits et gestes d'une personne : ses sorties, ses contacts, son téléphone, son temps.",
    effet: "On perd en autonomie et en liberté de mouvement, parfois sans s'en rendre compte au début.",
    exemple: "« Montre-moi ton téléphone, je veux savoir à qui tu parles. »" },
  { cat: "Manipulation & communication", mot: "Injonction paradoxale", icon: ArrowLeftRight, court: "Donner deux consignes incompatibles.",
    def: "L'injonction paradoxale enferme dans une situation où, quoi qu'on fasse, c'est perdant : deux demandes contradictoires sont posées en même temps.",
    effet: "On se sent piégé, confus, et fautif quelle que soit la réponse choisie.",
    exemple: "« Sois plus spontané·e — mais ne fais jamais rien sans me demander. »" },
  { cat: "Manipulation & communication", mot: "Passif-agressif", icon: MessageSquare, court: "Une agressivité déguisée.",
    def: "Le comportement passif-agressif exprime l'hostilité de façon indirecte : sous-entendus, silences, reproches déguisés, ironie.",
    effet: "On ressent une tension réelle sans pouvoir la nommer, ce qui rend le dialogue difficile.",
    exemple: "« Non non, tout va bien… fais comme tu veux, comme d'habitude. »" },
  { cat: "Manipulation & communication", mot: "Love bombing", icon: RadiatingHeart, court: "Submerger d'attentions au début.",
    def: "Le love bombing est une avalanche de compliments, cadeaux et déclarations en début de relation, souvent disproportionnée, qui crée une dépendance rapide.",
    effet: "On se sent unique et redevable, ce qui rend plus difficile de voir les comportements problématiques ensuite.",
    exemple: "« Tu es la personne de ma vie, je ne peux plus me passer de toi. » (après quelques jours)" },
  { cat: "Manipulation & communication", mot: "Projection", icon: Repeat, court: "Attribuer à l'autre ses propres torts.",
    def: "La projection consiste à reprocher à l'autre exactement ce que l'on fait soi-même, renversant les rôles.",
    effet: "On finit par se défendre d'accusations qui décrivent en réalité le comportement de l'autre.",
    exemple: "« C'est toi qui es jaloux et contrôlant. » (de la part de celui qui contrôle)" },
  { cat: "Manipulation & communication", mot: "Triangulation", icon: Target, court: "Faire intervenir un tiers.",
    def: "La triangulation introduit une troisième personne (réelle ou évoquée) pour créer de la rivalité, de la jalousie ou valider son point de vue.",
    effet: "On se sent en compétition et insécurisé, et le lien direct devient impossible.",
    exemple: "« Mon ex, elle, ne m'aurait jamais parlé comme ça. »" },
  { cat: "Manipulation & communication", mot: "Mensonge & déni", icon: EyeOff, court: "Nier l'évidence.",
    def: "Le déni nie des faits pourtant établis, parfois avec aplomb, pour réécrire la réalité partagée.",
    effet: "On doute de ce qu'on a vu ou entendu, et la confiance dans l'échange s'érode.",
    exemple: "« Je n'ai jamais promis ça, tu confonds. »" },
  { cat: "Manipulation & communication", mot: "Minimisation", icon: Shrink, court: "Réduire la portée de ses actes.",
    def: "La minimisation consiste à présenter un comportement blessant comme anodin, exagéré par l'autre, ou sans importance.",
    effet: "On finit par taire ce qu'on ressent, croyant réagir de façon disproportionnée.",
    exemple: "« C'était une blague, tu prends tout au sérieux. »" },
  { cat: "Manipulation & communication", mot: "Victimisation", icon: Droplet, court: "Se poser en victime pour désarmer.",
    def: "La victimisation renverse la situation : la personne qui blesse se présente comme celle qui souffre, pour éviter toute remise en question.",
    effet: "On s'occupe de ses émotions à elle, en oubliant ce que l'on vit soi-même.",
    exemple: "« Après tout ce que je fais, c'est moi qu'on accuse… »" },
  { cat: "Manipulation & communication", mot: "Renversement de responsabilité", icon: Repeat, court: "Retourner la faute vers vous.",
    def: "Le renversement de responsabilité consiste à vous attribuer la cause de ses propres comportements ou émotions, pour que vous vous sentiez coupable à sa place.",
    effet: "On finit par s'excuser et porter un poids qui ne nous revient pas.",
    exemple: "« Si je m'énerve, c'est parce que tu me pousses à bout. »" },

  // --- Emprise & pouvoir ---
  { cat: "Emprise & pouvoir", mot: "Emprise", icon: Link2, court: "Une domination progressive.",
    def: "L'emprise est une prise de pouvoir psychologique progressive sur une personne, qui réduit peu à peu sa liberté de penser et d'agir.",
    effet: "On perd en autonomie et on en vient à organiser sa vie autour de l'autre, souvent sans s'en apercevoir.",
    exemple: "Renoncer à ses amis, ses goûts, ses décisions pour éviter les conflits." },
  { cat: "Emprise & pouvoir", mot: "Cycle de la violence", icon: RefreshCw, court: "Tension, crise, réconciliation, répétition.",
    def: "La violence relationnelle suit souvent un cycle : montée de tension, explosion, justification, puis phase d'apaisement (« lune de miel ») avant que tout recommence.",
    effet: "La phase d'apaisement entretient l'espoir que « ça va changer », ce qui rend le départ plus difficile.",
    exemple: "Une dispute violente suivie d'excuses et de promesses, puis d'une nouvelle montée de tension." },
  { cat: "Emprise & pouvoir", mot: "Lune de miel", icon: Moon, court: "L'accalmie qui fait rester.",
    def: "Phase du cycle où la personne redevient attentionnée et promet de changer, juste après un épisode difficile.",
    effet: "On se raccroche à ces moments doux, en espérant qu'ils reviennent durablement.",
    exemple: "« Pardonne-moi, ça n'arrivera plus jamais, tu comptes tellement pour moi. »" },
  { cat: "Emprise & pouvoir", mot: "Isolement", icon: UserMinus, court: "Couper des autres.",
    def: "L'isolement consiste à éloigner peu à peu une personne de son entourage (amis, famille, collègues), souvent sous couvert d'amour ou de protection.",
    effet: "Privé de regards extérieurs, on perd les repères qui permettraient de nommer la situation.",
    exemple: "« Tes amis ne t'apportent rien, on est tellement mieux tous les deux. »" },
  { cat: "Emprise & pouvoir", mot: "Contrôle coercitif", icon: Lock, court: "Un système de domination quotidien.",
    def: "Le contrôle coercitif est un ensemble de comportements (surveillance, règles, menaces, contrôle de l'argent) qui restreignent durablement la liberté d'une personne.",
    effet: "La vie quotidienne se réorganise autour des exigences de l'autre, par peur des conséquences.",
    exemple: "Devoir justifier chaque dépense, chaque sortie, chaque message." },
  { cat: "Emprise & pouvoir", mot: "DARVO", icon: ArrowLeftRight, court: "Nier, attaquer, inverser les rôles.",
    def: "DARVO décrit une réaction face à une mise en cause : Nier les faits, Attaquer la personne qui les soulève, et Renverser les rôles victime/responsable.",
    effet: "On se retrouve à se défendre et à culpabiliser, alors qu'on signalait un tort subi.",
    exemple: "« Ça n'est jamais arrivé, tu es manipulateur, et en plus tu me fais du mal. »" },
  { cat: "Emprise & pouvoir", mot: "Silence punitif", icon: BellOff, court: "Punir par le retrait.",
    def: "Le silence punitif (ou « traitement par le silence ») consiste à ignorer délibérément une personne pour la punir ou la contraindre.",
    effet: "On ressent un rejet anxiogène et on cherche à apaiser l'autre à tout prix.",
    exemple: "Ne plus adresser la parole pendant des jours après un désaccord." },
  { cat: "Emprise & pouvoir", mot: "Dépendance affective", icon: Heart, court: "Un besoin qui enferme.",
    def: "La dépendance affective est un besoin intense de l'autre et de son approbation, qui peut être entretenu et exploité dans une relation déséquilibrée.",
    effet: "On accepte l'inacceptable par peur du manque ou de l'abandon.",
    exemple: "Rester malgré la souffrance, parce que l'idée de la séparation paraît insupportable." },

  // --- Effets sur soi & santé mentale ---
  { cat: "Effets sur soi & santé mentale", mot: "Dissonance cognitive", icon: Brain, court: "Quand deux vérités s'opposent.",
    def: "La dissonance cognitive est l'inconfort ressenti quand nos actes et nos valeurs (ou deux croyances) se contredisent. On cherche alors à réduire cet écart.",
    effet: "Pour apaiser le malaise, on peut minimiser ce qu'on vit ou trouver des excuses à l'autre.",
    exemple: "« Il me blesse, mais je sais qu'au fond il m'aime. »" },
  { cat: "Effets sur soi & santé mentale", mot: "Lien traumatique", icon: Heart, court: "S'attacher à qui nous blesse.",
    def: "Le lien traumatique (trauma bonding) est un attachement puissant qui se forme dans l'alternance de violence et de réconfort, renforcé par les phases d'apaisement.",
    effet: "On reste très attaché malgré la souffrance, et la séparation paraît presque impossible.",
    exemple: "Se sentir incapable de partir, même en reconnaissant que la relation fait mal." },
  { cat: "Effets sur soi & santé mentale", mot: "Hypervigilance", icon: Eye, court: "Être en alerte permanente.",
    def: "L'hypervigilance est un état de vigilance extrême où l'on guette en continu les signes de danger ou de changement d'humeur de l'autre.",
    effet: "On vit dans la tension, épuisé·e d'anticiper les réactions.",
    exemple: "Scruter le ton d'un message pour deviner si « ça va aller » ce soir." },
  { cat: "Effets sur soi & santé mentale", mot: "Charge mentale", icon: Brain, court: "Tout porter en silence.",
    def: "La charge mentale est le poids invisible de devoir penser, organiser et anticiper en permanence, souvent seul·e.",
    effet: "Elle épuise sans être visible, et le repos seul ne suffit plus à la soulager.",
    exemple: "Avoir l'esprit constamment occupé par ce qu'il faut gérer pour tout le monde." },
  { cat: "Effets sur soi & santé mentale", mot: "Sentiment d'impuissance", icon: Battery, court: "Croire qu'on ne peut rien changer.",
    def: "À force de tentatives sans effet, on peut finir par croire qu'aucune action ne changera la situation — un sentiment d'impuissance acquise.",
    effet: "On cesse d'essayer, même quand des solutions existent réellement.",
    exemple: "« De toute façon, quoi que je dise, ça ne sert à rien. »" },
  { cat: "Effets sur soi & santé mentale", mot: "Perte d'estime de soi", icon: User, court: "Ne plus se reconnaître de valeur.",
    def: "L'exposition répétée à la critique et au dénigrement peut éroder l'image qu'on a de soi et de ses capacités.",
    effet: "On doute de ses choix, on s'excuse beaucoup, on n'ose plus prendre de place.",
    exemple: "Penser systématiquement que les problèmes viennent de soi." },

  // --- Biais cognitifs ---
  { cat: "Biais cognitifs", mot: "Biais de confirmation", icon: Check, court: "Ne voir que ce qui confirme.",
    def: "Le biais de confirmation pousse à remarquer surtout les informations qui confortent ce qu'on croit déjà, et à écarter le reste.",
    effet: "On peut s'accrocher à l'image positive de l'autre en ignorant les signaux qui dérangent.",
    exemple: "Retenir les gestes tendres et oublier les épisodes blessants." },
  { cat: "Biais cognitifs", mot: "Biais d'engagement", icon: Anchor, court: "Continuer parce qu'on a déjà investi.",
    def: "Le biais d'engagement (coûts irrécupérables) pousse à poursuivre une situation parce qu'on y a déjà mis du temps, de l'énergie ou de l'amour.",
    effet: "On reste « parce qu'on a déjà tant donné », même quand cela coûte plus que ça ne rapporte.",
    exemple: "« Après toutes ces années, je ne peux pas tout arrêter maintenant. »" },
  { cat: "Biais cognitifs", mot: "Effet de halo", icon: Sparkles, court: "Une qualité en masque le reste.",
    def: "L'effet de halo fait qu'une impression positive (charme, réussite) déteint sur tout le reste, au point d'excuser des comportements problématiques.",
    effet: "On a du mal à croire que quelqu'un d'apprécié de tous puisse faire du mal en privé.",
    exemple: "« Il est si gentil avec les autres, le souci vient sûrement de moi. »" },
  { cat: "Biais cognitifs", mot: "Biais d'optimisme", icon: Sparkles, court: "Croire que ça va s'arranger.",
    def: "Le biais d'optimisme conduit à surestimer la probabilité que les choses s'améliorent d'elles-mêmes.",
    effet: "On reporte les décisions, en attendant un changement qui ne vient pas.",
    exemple: "« Ça va se calmer, c'est juste une période difficile. »" },
  { cat: "Biais cognitifs", mot: "Ancrage", icon: Anchor, court: "Rester fixé sur la première impression.",
    def: "L'ancrage fait que la première information reçue (le « vrai » début de la relation, une promesse) sert de référence et pèse trop lourd dans le jugement.",
    effet: "On compare sans cesse au « début », en espérant retrouver cette version idéalisée.",
    exemple: "« Au début il était parfait, je sais qu'il peut redevenir comme ça. »" },

  // --- Nouveaux mécanismes (taxonomie enrichie) ---
  { cat: "Manipulation & communication", mot: "Étiquetage", icon: TagIcon, court: "Décréter qui tu es, pas ce que tu fais.",
    def: "L'étiquetage consiste à coller une définition négative sur ta personne même (« tu es… »), et non sur un comportement. Sous emprise, à force de l'entendre, on finit par le croire et se définir soi-même par ce que l'autre a décidé.",
    effet: "L'image de soi se déforme peu à peu pour épouser l'étiquette imposée.",
    exemple: "« De toute façon, toi, t'es quelqu'un qui ment. »" },
  { cat: "Manipulation & communication", mot: "Intermittence (chaud-froid)", icon: Repeat2, court: "Alterner tendresse et attaques.",
    def: "L'alternance imprévisible entre gestes doux (compliments, affection) et attaques (reproches, froideur) crée confusion et dépendance. Un compliment glissé au milieu de reproches n'est pas un moment sain : il entretient l'espoir et brouille le jugement.",
    effet: "On reste accroché·e en espérant le retour des bons moments, ce qui rend le départ plus difficile.",
    exemple: "« Tu es insupportable… mais bon, t'es vraiment quelqu'un de bien quand même. »" },
  { cat: "Manipulation & communication", mot: "Flatterie intéressée", icon: Award, court: "Complimenter pour mieux obtenir.",
    def: "La flatterie intéressée utilise le compliment non pas pour faire plaisir, mais pour désarmer la vigilance et obtenir quelque chose en retour.",
    effet: "On se sent redevable ou spécial·e, et on cède plus facilement.",
    exemple: "« Toi tu es tellement plus compréhensive que les autres, tu peux bien me prêter cet argent. »" },
  { cat: "Manipulation & communication", mot: "Honte", icon: Frown, court: "Créer un sentiment d'indignité.",
    def: "Provoquer la honte vise à faire sentir à l'autre qu'il ou elle est indigne, mauvais·e ou ridicule, pour l'affaiblir et le·la contrôler.",
    effet: "On se recroqueville, on n'ose plus s'affirmer ni demander.",
    exemple: "« Tu n'as pas honte de te comporter comme ça ? »" },
  { cat: "Manipulation & communication", mot: "Généralisation", icon: Repeat, court: "« Toujours », « jamais ».",
    def: "La généralisation exagère un comportement ponctuel en le présentant comme systématique (« tu fais toujours… », « tu ne fais jamais… »).",
    effet: "On se sent enfermé·e dans un défaut et jugé·e sur l'ensemble plutôt que sur un fait précis.",
    exemple: "« Tu fais toujours tout de travers. »" },
  { cat: "Manipulation & communication", mot: "Présupposé", icon: HelpCircle, court: "Glisser une accusation cachée.",
    def: "Le présupposé insère une affirmation non prouvée dans la formulation, comme si elle était déjà admise, ce qui rend difficile de la contester.",
    effet: "On se retrouve à devoir se défendre d'une accusation jamais posée clairement.",
    exemple: "« Depuis que tu es devenue agressive, on ne peut plus rien te dire. »" },
  { cat: "Manipulation & communication", mot: "Recadrage", icon: RefreshCw, court: "Redéfinir la réalité à son avantage.",
    def: "Le recadrage réécrit le sens d'un événement pour effacer la responsabilité de son auteur (« ce n'était pas méchant, c'était de l'humour »).",
    effet: "On finit par douter de sa propre lecture des faits.",
    exemple: "« Ce n'était pas une insulte, c'était une blague, tu ne comprends rien. »" },
  { cat: "Manipulation & communication", mot: "Confusion", icon: Layers, court: "Multiplier les versions pour désorienter.",
    def: "La confusion accumule contradictions, demi-vérités et changements de version pour empêcher de penser clairement et de se positionner.",
    effet: "On ne sait plus quoi croire, on perd ses repères et sa capacité à décider.",
    exemple: "« Je n'ai jamais dit ça… enfin si, mais pas comme ça, et de toute façon c'est toi qui as commencé. »" },
  { cat: "Manipulation & communication", mot: "Humiliation", icon: TrendingDown, court: "Rabaisser, souvent en public.",
    def: "L'humiliation cherche à rabaisser une personne, fréquemment devant d'autres, pour l'atteindre dans sa dignité.",
    effet: "On se sent petit·e, exposé·e, et on n'ose plus prendre sa place.",
    exemple: "« Regarde-toi, tu es ridicule devant tout le monde. »" },
  { cat: "Manipulation & communication", mot: "Sarcasme / mépris", icon: Quote, court: "Attaquer sous couvert d'ironie.",
    def: "Le sarcasme déguise une attaque en trait d'humour, ce qui permet de blesser tout en niant l'intention (« c'était pour rire »).",
    effet: "On encaisse la pique sans pouvoir vraiment répondre, sous peine de « ne pas avoir d'humour ».",
    exemple: "« Bravo, encore une idée de génie de ta part… »" },
  { cat: "Manipulation & communication", mot: "Ferrage", icon: Clock, court: "Resserrer le contrôle une fois attaché·e.",
    def: "Le ferrage désigne le resserrement progressif du contrôle une fois l'attachement installé : les exigences augmentent petit à petit.",
    effet: "On accepte peu à peu ce qu'on aurait refusé au début, sans voir la ligne se déplacer.",
    exemple: "« Maintenant qu'on est ensemble, envoie-moi ta localisation en permanence. »" },

  // --- Leviers d'influence (Cialdini) ---
  { cat: "Leviers d'influence", mot: "Réciprocité", icon: RefreshCw, court: "Se sentir obligé·e de rendre.",
    def: "Le principe de réciprocité fait qu'on se sent redevable après avoir reçu un cadeau, une faveur ou une confidence — même non sollicités.",
    effet: "On dit oui par obligation ressentie plutôt que par choix.",
    exemple: "« Je t'ai payé le restaurant, tu peux bien me rendre ce service. »" },
  { cat: "Leviers d'influence", mot: "Preuve sociale", icon: Users, court: "Suivre ce que fait la majorité.",
    def: "La preuve sociale pousse à s'aligner sur ce que « tout le monde » ferait ou penserait, surtout dans le doute.",
    effet: "On doute de son propre ressenti face à une prétendue majorité.",
    exemple: "« Tout le monde trouve que tu exagères. »" },
  { cat: "Leviers d'influence", mot: "Autorité", icon: Crown, court: "Obéir à une figure de pouvoir.",
    def: "Le principe d'autorité fait céder plus facilement face à quelqu'un qui affiche expertise, statut ou position de pouvoir, réels ou prétendus.",
    effet: "On s'incline sans vérifier, par respect ou crainte de l'autorité.",
    exemple: "« Je suis ton père, tu me dois le respect quoi qu'il arrive. »" },
  { cat: "Leviers d'influence", mot: "Rareté / peur de perdre", icon: Hourglass, court: "Créer l'urgence de ne pas rater.",
    def: "La rareté donne de la valeur à ce qui est présenté comme rare ou sur le point de disparaître, et active la peur de perdre.",
    effet: "On agit dans la précipitation pour ne pas « rater sa chance ».",
    exemple: "« C'est ta dernière chance, après je m'en vais pour de bon. »" },
  { cat: "Leviers d'influence", mot: "Pied dans la porte", icon: DoorOpen, court: "Petite demande d'abord, grande ensuite.",
    def: "La technique du pied dans la porte obtient un accord sur une petite demande facile à accepter, puis élargit progressivement jusqu'à une demande qu'on aurait refusée d'emblée.",
    effet: "On se retrouve engagé·e bien plus loin qu'on ne l'aurait voulu, par souci de cohérence.",
    exemple: "« On va juste boire un verre pour en parler » → « on serait mieux chez moi »…" },
  { cat: "Leviers d'influence", mot: "Sympathie", icon: Smile, court: "On dit oui à qui nous plaît.",
    def: "On accède plus facilement aux demandes des personnes qui nous plaisent, nous ressemblent ou nous complimentent.",
    effet: "Le lien de sympathie abaisse la vigilance.",
    exemple: "« On se ressemble tellement, toi et moi, tu vas bien me comprendre. »" },

  // --- Biais & conditionnement ---
  { cat: "Biais cognitifs", mot: "Aversion à la perte", icon: Hourglass, court: "La peur de perdre pèse très lourd.",
    def: "L'aversion à la perte fait que la crainte de perdre quelque chose pèse plus lourd, dans nos décisions, que l'envie de gagner l'équivalent.",
    effet: "On reste ou on cède pour ne pas perdre ce qu'on a déjà investi.",
    exemple: "« Si tu pars, tu perdras tout ce qu'on a construit ensemble. »" },
  { cat: "Biais cognitifs", mot: "Cadrage", icon: RefreshCw, court: "La formulation change la décision.",
    def: "Le cadrage présente la même réalité sous un angle choisi pour orienter la décision (« ce n'est pas du contrôle, c'est de l'attention »).",
    effet: "On accepte une chose formulée joliment qu'on aurait refusée dite crûment.",
    exemple: "« Ce n'est pas de la jalousie, c'est parce que je t'aime. »" },
  { cat: "Biais cognitifs", mot: "Habituation", icon: Repeat, court: "L'anormal devient « normal ».",
    def: "À force de répétition, des comportements anormaux finissent par sembler ordinaires : le seuil de tolérance monte sans qu'on s'en aperçoive.",
    effet: "On minimise des faits graves parce qu'ils sont devenus habituels.",
    exemple: "« C'est rien, on se dispute comme ça tous les jours, c'est normal. »" },

  // --- Mécanismes ajoutés (taxonomie 40) ---
  { cat: "Biais cognitifs", mot: "Coûts irrécupérables", icon: Hourglass, court: "Rester à cause de ce qu'on a investi.",
    def: "Le biais des coûts irrécupérables pousse à continuer une relation parce qu'on y a déjà consacré beaucoup de temps, d'énergie ou d'amour — comme si partir « gâchait » cet investissement.",
    effet: "On reste pour ne pas « avoir tout fait pour rien », même quand la relation fait souffrir.",
    exemple: "« Après dix ans ensemble, je ne peux pas partir maintenant. »" },
  { cat: "Biais cognitifs", mot: "Illusion de contrôle", icon: Target, court: "Croire qu'être parfaite fera changer l'autre.",
    def: "L'illusion de contrôle fait croire que si l'on se comporte parfaitement, l'autre finira par changer ou par arrêter ses comportements blessants.",
    effet: "On s'épuise à « bien faire », en portant une responsabilité qui n'est pas la sienne.",
    exemple: "« Si je fais tout ce qu'il me demande bien comme il faut, il arrêtera. »" },
  { cat: "Mécanismes psychologiques", mot: "Normalisation progressive", icon: ArrowDown, court: "S'habituer peu à peu à l'inacceptable.",
    def: "La normalisation progressive fait accepter, petit à petit, des comportements qu'on aurait refusés au début. Le seuil de ce qui est « tolérable » se déplace sans qu'on le voie.",
    effet: "Des faits graves finissent par paraître ordinaires.",
    exemple: "Les insultes, d'abord choquantes, deviennent « juste sa façon de parler »." },
  { cat: "Manipulation & communication", mot: "Porte-au-nez", icon: DoorOpen, court: "Grosse demande, puis une plus petite.",
    def: "La technique de la porte-au-nez consiste à formuler une demande énorme (vouée au refus), pour qu'ensuite une demande plus petite paraisse raisonnable, presque un soulagement.",
    effet: "On accepte la seconde demande par contraste, sans la remettre en question.",
    exemple: "« Tu ne veux pas emménager ? Bon, alors laisse-moi au moins une clé de chez toi. »" },
  { cat: "Manipulation & communication", mot: "Amorçage", icon: RefreshCw, court: "Changer les règles après l'accord.",
    def: "L'amorçage (low-ball) consiste à obtenir un accord sur des conditions attirantes, puis à en changer les termes une fois l'engagement pris.",
    effet: "On se sent tenu·e par l'accord initial et on accepte des conditions qu'on aurait refusées d'emblée.",
    exemple: "« Tu avais dit oui pour ce week-end… en fait ce sera toute la semaine chez mes parents. »" },
  { cat: "Manipulation & communication", mot: "Double contrainte", icon: ArrowLeftRight, court: "Quoi que tu fasses, tu as tort.",
    def: "La double contrainte enferme dans deux options qui mènent toutes deux à un reproche : il n'existe aucune « bonne » réponse possible.",
    effet: "On se sent paralysé·e et coupable quel que soit son choix.",
    exemple: "« Si tu pars, tu m'abandonnes ; si tu restes, tu m'étouffes. »" },
  { cat: "Manipulation & communication", mot: "Future faking", icon: Sparkles, court: "Promettre un avenir pour retenir.",
    def: "Le future faking consiste à faire miroiter des promesses d'avenir (mariage, enfant, changement) sans intention réelle de les tenir, pour apaiser ou retenir la personne.",
    effet: "On reste dans l'espoir d'un futur qui ne vient jamais.",
    exemple: "« On se mariera l'an prochain, je te le promets, ne pars pas. »" },
  { cat: "Manipulation & communication", mot: "Hoovering", icon: RefreshCw, court: "Faire revenir après une rupture.",
    def: "Le hoovering (de « Hoover », aspirateur) désigne les tentatives de « ré-aspirer » la personne après une séparation, par de grandes excuses, des promesses ou des cadeaux.",
    effet: "On retombe dans le cycle, en croyant que cette fois sera différente.",
    exemple: "Après la rupture : « J'ai compris mes erreurs, je ne peux pas vivre sans toi. »" },
  { cat: "Manipulation & communication", mot: "Stonewalling", icon: VolumeX, court: "Refuser toute discussion.",
    def: "Le stonewalling (mur du silence) consiste à refuser tout échange : quitter la pièce, se fermer, ignorer, pour empêcher toute résolution du conflit.",
    effet: "On reste seul·e avec le problème, sans jamais pouvoir en parler.",
    exemple: "Dès qu'un sujet gêne, l'autre quitte la conversation ou fait comme s'il n'entendait pas." },
  { cat: "Manipulation & communication", mot: "Campagne de diffamation", icon: Users, court: "Salir ton image auprès des autres.",
    def: "La campagne de diffamation vise à dégrader l'image de la personne auprès de l'entourage, souvent en la faisant passer pour instable, menteuse ou « folle », pour l'isoler et se protéger.",
    effet: "On se retrouve isolé·e, et on n'ose plus se confier de peur de ne pas être cru·e.",
    exemple: "Il raconte à tout le monde qu'« elle est instable et qu'elle invente tout »." },
  { cat: "Mécanismes psychologiques", mot: "Rationalisation", icon: Brain, court: "Excuser l'autre pour tenir.",
    def: "La rationalisation consiste à trouver des explications rassurantes aux comportements blessants de l'autre, pour rendre la situation supportable.",
    effet: "On excuse l'inexcusable et on reporte le moment de se protéger.",
    exemple: "« Il est stressé en ce moment, ça ira mieux quand il sera moins stressé, je comprends qu'il réagisse comme ça vu ce qu'il vit. »" },
  { cat: "Mécanismes psychologiques", mot: "Dissociation", icon: EyeOff, court: "Se couper de ses émotions.",
    def: "La dissociation est un mécanisme de survie : face à un stress intense, l'esprit se « déconnecte » des émotions ou de la scène, comme pour se protéger.",
    effet: "On se sent spectateur·rice de sa propre vie, anesthésié·e.",
    exemple: "Pendant une dispute violente, se sentir « à côté », comme si ça arrivait à quelqu'un d'autre." },
  { cat: "Mécanismes psychologiques", mot: "Identification à l'agresseur", icon: User, court: "Adopter le point de vue de l'autre.",
    def: "L'identification à l'agresseur amène la personne à épouser le regard de celui qui la blesse, jusqu'à défendre ses comportements.",
    effet: "On justifie l'autre et on retourne la faute contre soi.",
    exemple: "« Au fond il a raison de s'énerver, c'est moi qui le pousse à bout. »" },
  { cat: "Mécanismes psychologiques", mot: "Sidération", icon: AlertTriangle, court: "Être figé·e face au choc.",
    def: "La sidération est un blocage psychologique face à un choc : le cerveau, submergé, empêche momentanément de réagir, de parler ou de fuir.",
    effet: "On « n'a rien pu dire ni faire » sur le moment — ce n'est pas de la faiblesse, c'est une réaction de survie.",
    exemple: "Rester figée, incapable de répondre, pendant une scène violente." },
  { cat: "Biais cognitifs", mot: "Conformisme", icon: Users, court: "Suivre le groupe.",
    def: "Le conformisme pousse à s'aligner sur le groupe, à ne pas contredire, surtout quand l'entourage soutient la personne qui manipule.",
    effet: "On tait ses doutes et on se sent seul·e à voir le problème.",
    exemple: "Ne pas oser critiquer devant les amis communs qui « l'adorent »." },
  { cat: "Biais cognitifs", mot: "Croyance en un monde juste", icon: Scale, court: "Penser que chacun mérite son sort.",
    def: "Ce biais fait croire que le monde est juste et que, si quelqu'un souffre, c'est qu'il ou elle l'a « mérité » — ce qui conduit à blâmer les victimes.",
    effet: "On se blâme soi-même pour ce qu'on subit.",
    exemple: "« Si ça m'arrive, c'est peut-être que je l'ai cherché. »" },
  { cat: "Biais cognitifs", mot: "Erreur d'attribution", icon: User, court: "Juger l'être, pas le contexte.",
    def: "L'erreur fondamentale d'attribution consiste à expliquer les actes d'une personne par sa personnalité plutôt que par la situation (« elle est faible » plutôt que « elle est prise dans une emprise »).",
    effet: "On juge durement les victimes au lieu de comprendre le mécanisme qui les piège.",
    exemple: "« Si elle reste, c'est qu'elle est faible. » (alors que l'emprise explique tout autrement)" },
];

// Retrouve l'icône d'un mécanisme à partir de son nom (pour les cartes d'analyse générées par l'IA)
function iconForCategory(name) {
  if (!name) return AlertTriangle;
  const n = name.toLowerCase().trim();
  const hit = MECANISMES.find(m => m.mot.toLowerCase() === n)
           || MECANISMES.find(m => n.includes(m.mot.toLowerCase()) || m.mot.toLowerCase().includes(n));
  return hit ? hit.icon : AlertTriangle;
}

// ---- Ressources d'aide (numéros vérifiés, France) ----
const RESSOURCES = [
  {
    titre: "Urgences",
    court: "Danger immédiat",
    tel: "112",
    appelLabel: "Appeler le 112",
    desc: "En cas de danger immédiat, appelez les secours. Le 112 est le numéro d'urgence européen, gratuit, joignable partout dans l'Union européenne.",
    autres: [
      { label: "Police / Gendarmerie", tel: "17" },
      { label: "Pompiers", tel: "18" },
      { label: "Urgence par SMS (sourd·e, malentendant·e, ou sans pouvoir parler)", tel: "114" },
    ],
  },
  {
    titre: "Violences Femmes Info",
    court: "Écoute & orientation",
    tel: "3919",
    appelLabel: "Appeler le 3919",
    desc: "Le 3919 est le numéro national d'écoute, d'information et d'orientation pour les femmes victimes de violences. Gratuit, anonyme, accessible 24h/24 et 7j/7. Ce n'est pas un numéro d'urgence : en cas de danger immédiat, composez le 17.",
    autres: [],
  },
  {
    titre: "SOS Amitié",
    court: "Soutien psychologique",
    tel: "0972394050",
    appelLabel: "Appeler SOS Amitié",
    desc: "SOS Amitié offre une écoute anonyme et bienveillante, jour et nuit, pour toute personne en souffrance ou en situation de détresse.",
    autres: [
      { label: "France Victimes (aide aux victimes)", tel: "116006" },
    ],
  },
  {
    titre: "Trouver un lieu d'accueil",
    court: "Près de chez vous",
    tel: null,
    appelLabel: null,
    desc: "Les CIDFF (Centres d'information sur les droits des femmes et des familles) accueillent, informent et accompagnent gratuitement, partout en France. Pour trouver le centre le plus proche, le 3919 peut vous orienter.",
    autres: [],
  },
  {
    titre: "Trouver un psychologue",
    court: "Près de chez vous",
    tel: null,
    appelLabel: null,
    desc: "Parler à un professionnel peut aider à y voir plus clair, à son rythme. Le bouton ci-dessous ouvre une recherche de psychologues autour de votre position, dans votre application de cartes. Votre position n'est ni enregistrée ni partagée par Clarisé.",
    autres: [],
    lien: "https://www.google.com/maps/search/psychologue+près+de+moi",
    lienLabel: "Chercher autour de moi",
  },
];

// numéro affichable joliment pour l'appel
function telHref(num) { return "tel:" + num.replace(/\s/g, ""); }

// ============================================================
//  Shared UI bits
// ============================================================
function Header({ title, sub }) {
  const showHelp = useContext(HelpContext);
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#5A2A24", margin: 0, letterSpacing: -0.3 }}>{title}</h1>
      {sub && showHelp && <p style={{ fontSize: 14.5, color: T.textSoft, margin: "8px 0 0", lineHeight: 1.4 }}>{sub}</p>}
    </div>
  );
}

function LevelBadge({ level }) {
  const l = T.levels[level] || T.levels.preoccupant;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: l.bg, color: l.text,
      padding: "10px 22px", borderRadius: 999, fontWeight: 700, fontSize: 17 }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: l.dot }} />
      {l.label}
    </div>
  );
}

// Retrouve la définition courte d'un mécanisme à partir de son nom (pour les tags du journal)
function defForLabel(label) {
  if (!label) return null;
  const n = label.toLowerCase().trim();
  const hit = MECANISMES.find(m => m.mot.toLowerCase() === n)
           || MECANISMES.find(m => n.includes(m.mot.toLowerCase()) || m.mot.toLowerCase().includes(n));
  return hit ? hit.def : null;
}

function Tag({ children, level }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ side: "bottom", left: 0 }); // placement calculé
  const touchedRef = useRef(false);
  const wrapRef = useRef(null);
  const def = defForLabel(typeof children === "string" ? children : "");
  const POP_W = 240;
  // Couleur du tag selon le niveau de l'analyse (sain/préoccupant/toxique/dangereux).
  // Sans niveau, on garde l'orange par défaut.
  const TAG_COLORS = {
    ok:          "#3E8E63",
    preoccupant: "#EC9A3A",
    toxique:     "#E08338",
    dangereux:   "#D06A70",
  };
  const tagBg = TAG_COLORS[level] || "#E08338";

  function place() {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // bornes de la fenêtre visible de l'app (le cadre téléphone)
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // horizontal : par défaut aligné au mot, mais recalé si ça dépasse à droite
    let left = 0; // décalage par rapport au bord gauche du tag
    const overflowRight = (r.left + POP_W) - (vw - margin);
    if (overflowRight > 0) left = -overflowRight;
    if (r.left + left < margin) left = margin - r.left;
    // vertical : en dessous si la place suffit, sinon au-dessus
    const side = (vh - r.bottom) < 150 ? "top" : "bottom";
    setPos({ side, left });
  }

  function toggle() {
    if (!def) return;
    if (!open) place();
    setOpen(o => !o);
  }

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <span
        onTouchStart={(e) => { if (def) { e.preventDefault(); touchedRef.current = true; toggle(); } }}
        onClick={() => { if (!touchedRef.current) toggle(); touchedRef.current = false; }}
        onMouseEnter={() => { if (def && !touchedRef.current) { place(); setOpen(true); } }}
        onMouseLeave={() => { if (!touchedRef.current) setOpen(false); }}
        style={{ background: tagBg, color: "#FFFFFF", padding: "7px 13px", borderRadius: 10,
          fontSize: 13.5, fontWeight: 600, display: "inline-block", cursor: def ? "pointer" : "default",
          WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
        {children}
      </span>
      {open && def && (
        <span style={{ position: "absolute", left: pos.left, zIndex: 20,
          ...(pos.side === "bottom" ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }),
          width: POP_W, maxWidth: "calc(100vw - 24px)", background: "#fff", color: T.text,
          border: `1px solid ${T.pinkBorder}`, borderRadius: 12, padding: "11px 13px",
          fontSize: 13, fontWeight: 400, lineHeight: 1.45, boxShadow: "0 4px 16px rgba(120,60,70,0.18)" }}>
          {def}
        </span>
      )}
    </span>
  );
}

// ============================================================
//  Mode démo — analyses pré-calculées (sans IA)
//  Sert d'exemple instantané et de repli si l'IA est indisponible.
// ============================================================
const DEMO_BANK = [
  {
    match: ["ta faute", "problèmes", "tu vas avoir"],
    level: "dangereux",
    summary: "Ce message mêle une accusation et une menace pour obtenir une réaction.",
    cards: [
      { category: "Culpabilisation", quote: "c'est de ta faute", explanation: "Le message vous fait porter la responsabilité de la situation." },
      { category: "Menace", quote: "tu vas avoir des problèmes", explanation: "Cette formulation installe une pression par la peur plutôt qu'un échange." },
    ],
    replies: [
      "Je ne suis pas d'accord avec cette accusation.",
      "Je veux bien en discuter, mais pas sous la menace.",
      "J'ai besoin de prendre du recul avant de répondre.",
    ],
  },
  {
    match: ["c'est terminé", "si tu fais ça", "entre nous"],
    level: "toxique",
    summary: "Ce message conditionne la relation à votre comportement.",
    cards: [
      { category: "Chantage affectif", quote: "c'est terminé entre nous", explanation: "La relation est présentée comme une récompense ou une punition selon ce que vous faites." },
    ],
    replies: [
      "J'entends que tu es en colère, mais cette décision m'appartient.",
      "On peut en reparler calmement quand tu veux.",
    ],
  },
  {
    match: ["tu exagères", "tu inventes", "jamais dit", "ça n'est jamais"],
    level: "toxique",
    summary: "Ce message remet en cause votre perception des faits.",
    cards: [
      { category: "Gaslighting", quote: "tu exagères toujours", explanation: "Le message vous pousse à douter de votre propre mémoire ou ressenti." },
    ],
    replies: [
      "Ce que j'ai vécu est réel pour moi.",
      "Je préfère qu'on s'en tienne aux faits.",
    ],
  },
  {
    match: ["en parler", "j'aimerais", "un peu triste", "ce soir"],
    level: "ok",
    summary: "Ce message exprime un besoin ou une émotion avec respect, sans pression.",
    cards: [],
    replies: [
      "Merci de me le dire, ça me touche.",
      "D'accord, on en parle ce soir.",
    ],
  },
];

function demoAnalyze(message) {
  const low = message.toLowerCase();
  const hit = DEMO_BANK.find(d => d.match.some(m => low.includes(m)));
  if (hit) {
    const { match, ...rest } = hit;
    return rest;
  }
  // repli générique
  return {
    level: "preoccupant",
    summary: "Ce message contient une formulation ambiguë qui peut créer un malaise.",
    cards: [
      { category: "Culpabilisation", quote: message.slice(0, 40) + (message.length > 40 ? "…" : ""), explanation: "Cette tournure peut induire un sentiment d'obligation ou de faute." },
    ],
    replies: [
      "J'ai besoin d'y réfléchir avant de répondre.",
      "Peux-tu me dire ce que tu attends concrètement ?",
    ],
  };
}

// ============================================================
//  Analyse — call to Claude
// ============================================================
async function analyzeMessage(message, author) {
  // L'app n'appelle plus l'IA directement : elle appelle le serveur Clarisé,
  // qui garde la clé secrète et interroge l'IA d'Infomaniak/Euria.
  const res = await fetch(`${BACKEND_URL}/api/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, author }),
  });
  if (!res.ok) throw new Error("Analyse indisponible");
  return await res.json();
}

// ============================================================
//  Screen: Analyser
// ============================================================
const MAX_MSG = 2000; // limite de caractères pour l'analyse

function AnalyserScreen({ onResult }) {
  const [msg, setMsg] = useState("");
  const [author, setAuthor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { titre, texte } ou null

  const tooLong = msg.length > MAX_MSG;

  async function run() {
    // Champ vide
    if (!msg.trim()) {
      setError({
        titre: "Aucun message à analyser",
        texte: "Colle d'abord un message dans la zone au-dessus, puis appuie sur Analyser.",
      });
      return;
    }
    if (tooLong) return;
    setError(null);

    // Vérifier la connexion avant d'essayer
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError({
        titre: "Pas de connexion",
        texte: "L'analyse a besoin d'Internet pour fonctionner. Vérifie ta connexion, puis réessaie.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeMessage(msg.trim(), author.trim());
      // Texte incompréhensible détecté par l'IA
      if (result && result.level === "invalide") {
        setError({
          titre: "Je ne peux pas analyser ce message",
          texte: "Ce texte ne semble pas être un vrai message. Essaie de coller un message que tu as reçu.",
        });
        return;
      }
      onResult({ message: msg.trim(), author: author.trim(), ...result });
    } catch (e) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (offline) {
        setError({
          titre: "Connexion perdue",
          texte: "La connexion s'est interrompue pendant l'analyse. Réessaie quand tu seras de nouveau en ligne.",
        });
      } else {
        setError({
          titre: "L'analyse n'a pas abouti",
          texte: "Quelque chose n'a pas fonctionné de notre côté. L'application n'est pas cassée : réessaie dans un instant.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Analyser un message" sub="Colle un message pour détecter s'il contient des signes de manipulation" />

      <textarea
        value={msg} onChange={e => { setMsg(e.target.value); if (error) setError(null); }}
        placeholder={'Ex : "Si tu ne comprends pas que c\'est de ta faute, tu vas avoir des problèmes…"'}
        style={{ width: "100%", minHeight: 180, background: T.white,
          border: tooLong ? "1.5px solid #D06A70" : "none", borderRadius: 12,
          padding: 20, fontSize: 16.5, lineHeight: 1.45, color: T.text, resize: "none", boxSizing: "border-box",
          fontFamily: font, outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      />
      {/* compteur de caractères */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <span style={{ fontSize: 12.5, color: tooLong ? "#B42318" : T.textSoft, fontWeight: tooLong ? 700 : 400 }}>
          {msg.length} / {MAX_MSG}
        </span>
      </div>
      {tooLong && (
        <p style={{ fontSize: 13, color: "#B42318", margin: "8px 0 0", lineHeight: 1.4 }}>
          Ce message est un peu trop long pour être analysé d'un coup. Essaie de le raccourcir, ou de coller seulement le passage qui t'interroge.
        </p>
      )}

      <p style={{ textAlign: "center", fontSize: 16, color: T.text, margin: "24px 0 8px", fontWeight: 500 }}>
        Qui t'a écrit ce message ?
      </p>
      <input
        value={author} onChange={e => setAuthor(e.target.value)}
        placeholder="ex : ta mère, Marc, ton patron…"
        style={{ width: "100%", background: T.white, border: "none", borderRadius: 12, padding: "16px 18px",
          fontSize: 15.5, color: T.text, boxSizing: "border-box", fontFamily: font, outline: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      />
      <button onClick={run} disabled={loading || tooLong}
        onMouseDown={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pinkDark; }}
        onMouseUp={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pink; }}
        onMouseLeave={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pink; }}
        onTouchStart={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pinkDark; }}
        onTouchEnd={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pink; }}
        style={{ width: "100%", marginTop: 24, background: (loading || tooLong) ? T.pinkSoft : T.pink, color: "#fff",
          border: "none", borderRadius: T.radius, padding: "18px", fontSize: 19, fontWeight: 700,
          fontFamily: font, cursor: (loading || tooLong) ? "default" : "pointer", transition: "background .15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {loading ? <>Analyse en cours <ThinkingDots /></> : "Analyser"}
      </button>

      <p style={{ fontSize: 12.5, color: T.textSoft, textAlign: "center", marginTop: 16, lineHeight: 1.4 }}>
        Cette analyse n'est pas un diagnostic, elle t'aide à prendre du recul.
      </p>

      {/* Message d'erreur doux et clair */}
      {error && (
        <div style={{ marginTop: 24, background: "#FBE3E8", border: "1px solid #EBC4CD", borderRadius: T.radius,
          padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertTriangle size={20} color="#B42318" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#B42318" }}>{error.titre}</p>
            <p style={{ margin: 0, fontSize: 14, color: "#7A4540", lineHeight: 1.45 }}>{error.texte}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  Carte d'analyse — définition dépliable au tap sur l'en-tête (test)
// ============================================================
function AnalysisCard({ card, level }) {
  const [open, setOpen] = useState(false);
  const ct = CARD_TINT[level] || CARD_TINT.preoccupant;
  const CardIcon = iconForCategory(card.category);
  const def = defForLabel(card.category);
  const canOpen = !!def;
  return (
    <div style={{ borderRadius: T.radius, overflow: "hidden", marginBottom: 16, border: `1px solid ${ct.head}` }}>
      <div onClick={() => canOpen && setOpen(o => !o)}
        style={{ background: ct.head, color: ct.headText, padding: "12px 16px", display: "flex",
          alignItems: "center", gap: 9, fontWeight: 600, fontSize: 16,
          cursor: canOpen ? "pointer" : "default", WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
        <CardIcon size={19} strokeWidth={2} />
        <span style={{ flex: 1 }}>{card.category}</span>
        {canOpen && (
          <ChevronRight size={18} strokeWidth={2.5}
            style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .25s" }} />
        )}
      </div>
      {/* définition générale dépliable */}
      {open && def && (
        <div style={{ background: "#FFFFFF", padding: "12px 16px", borderBottom: `1px solid ${ct.head}`,
          fontSize: 13.5, lineHeight: 1.5, color: T.textSoft }}>
          {def}
        </div>
      )}
      <div style={{ background: ct.body, padding: "14px 16px" }}>
        {card.quote && <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15.5 }}>"{card.quote}"</p>}
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "#3A3A3A" }}>{card.explanation}</p>
      </div>
    </div>
  );
}

// ============================================================
//  Screen: Analyse (result)
// ============================================================
function AnalyseScreen({ result, onSave, onNew, saved }) {
  const tint = CARD_TINT[result.level] || CARD_TINT.preoccupant;
  const [showReplies, setShowReplies] = useState(false);
  return (
    <div>
      <Header title="Analyse" sub="Résultat de ton analyse" />
      <div style={{ background: T.white, borderRadius: T.radius, padding: "26px 20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}><LevelBadge level={result.level} /></div>
        <p style={{ fontSize: 17, lineHeight: 1.5, color: T.text, margin: "0 0 24px", textAlign: "center" }}>
          {result.message}
        </p>

        {result.cards && result.cards.length > 0 ? result.cards.map((c, i) => (
          <AnalysisCard key={i} card={c} level={result.level} />
        )) : (
          <div style={{ background: CARD_TINT.ok.body, borderRadius: T.radius, padding: 18, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.45 }}>{result.summary}</p>
          </div>
        )}

        {result.replies && result.replies.length > 0 && (
          <div style={{ marginTop: 24 }}>
            {!showReplies ? (
              <div style={{ background: "#fff", border: `1px solid ${T.pinkSoft}`, borderRadius: T.radius,
                padding: "16px 18px" }}>
                <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.45, color: T.text }}>
                  Veux-tu que je te propose des pistes pour répondre ?
                </p>
                <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.4, color: T.textSoft }}>
                  Tu n'es pas obligée de répondre à ce message. Tu peux aussi prendre ton temps, ou ne rien faire.
                </p>
                <button onClick={() => setShowReplies(true)}
                  style={{ background: T.pink, color: "#fff", border: "none", borderRadius: 999,
                    padding: "10px 18px", fontSize: 14.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                  Oui, montre-moi des pistes
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#5A2A24", margin: "0 0 4px" }}>Des pistes possibles</p>
                <p style={{ fontSize: 12.5, color: T.textSoft, margin: "0 0 10px", lineHeight: 1.4 }}>
                  Ce sont des idées parmi d'autres — tu restes libre, y compris de ne pas répondre.
                </p>
                {result.replies.map((r, i) => (
                  <div key={i} style={{ background: "#fff", border: `1px solid ${T.pinkSoft}`, borderRadius: 12,
                    padding: "11px 14px", marginBottom: 8, fontSize: 14.5, lineHeight: 1.4, color: T.text }}>
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={onSave} disabled={saved}
          onMouseDown={e => { if (!saved) e.currentTarget.style.background = T.pinkDark; }}
          onMouseUp={e => { if (!saved) e.currentTarget.style.background = T.pink; }}
          onMouseLeave={e => { if (!saved) e.currentTarget.style.background = T.pink; }}
          onTouchStart={e => { if (!saved) e.currentTarget.style.background = T.pinkDark; }}
          onTouchEnd={e => { if (!saved) e.currentTarget.style.background = T.pink; }}
          style={{ width: "100%", marginTop: 24, background: saved ? "#B7CBB8" : T.pink, color: "#fff", border: "none",
            borderRadius: T.radius, padding: 16, fontSize: 16.5, fontWeight: 700, fontFamily: font, cursor: saved ? "default" : "pointer",
            transition: "background .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Bookmark size={18} /> {saved ? "Enregistré dans le journal" : "Sauvegarder cette analyse"}
        </button>
        <button onClick={onNew}
          style={{ width: "100%", marginTop: 16, background: "transparent", color: T.pink, border: `1.5px solid ${T.pink}`,
            borderRadius: T.radius, padding: 15, fontSize: 16, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
          Nouvelle analyse
        </button>
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 24, lineHeight: 1.4 }}>
        Cette analyse n'est pas un diagnostic, elle vous aide à prendre du recul.
      </p>
    </div>
  );
}

// ============================================================
//  Screen: Journal
// ============================================================
function JournalCard({ entry }) {
  // Couleur du badge selon le type d'entrée :
  // - expéditeur nommé (Marc, Julien…) → rose framboise
  // - note personnelle → taupe doux
  // - conseil du coach → vert sauge
  let badgeBg = T.pink, badgeColor = "#fff";
  if (entry.author === "Note") { badgeBg = "#B7A9A2"; badgeColor = "#fff"; }
  else if (entry.author === "Conseil du coach") { badgeBg = "#9CB89A"; badgeColor = "#1F3D27"; }
  // Niveau de toxicité (présent seulement pour une analyse sauvegardée)
  const lvl = entry.level && T.levels[entry.level] ? T.levels[entry.level] : null;
  return (
    <div style={{ position: "relative", background: T.white, borderRadius: 18, padding: "22px 20px 20px",
      marginBottom: 24, boxShadow: "0 1px 5px rgba(0,0,0,0.05)" }}>
      <div style={{ position: "absolute", top: -12, right: -4, background: badgeBg, color: badgeColor,
        padding: "8px 16px", borderRadius: 12, fontSize: 15, fontWeight: 600 }}>{entry.author}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 13.5, color: "#9C5B4E", fontWeight: 500 }}>{entry.date}</p>
        {lvl && (
          <span style={{ background: lvl.bg, color: lvl.text, fontSize: 12.5, fontWeight: 700,
            padding: "3px 10px", borderRadius: 999 }}>{lvl.label}</span>
        )}
      </div>
      {entry.author === "Conseil du coach"
        ? <div style={{ margin: "0 0 16px", fontSize: 16, lineHeight: 1.5, color: T.text }}><RichText text={entry.message} /></div>
        : <p style={{ margin: "0 0 16px", fontSize: 17, lineHeight: 1.45, color: T.text, whiteSpace: "pre-wrap" }}>{entry.message}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {entry.tags.map((t, i) => <Tag key={i} level={entry.level}>{t}</Tag>)}
      </div>
    </div>
  );
}

function JournalScreen({ entries, onAddNote }) {
  const [note, setNote] = useState("");
  const canAdd = note.trim().length > 0;
  function addNote() {
    if (!canAdd) return;
    onAddNote(note.trim());
    setNote("");
  }
  return (
    <div>
      <Header title="Journal" sub="Gardez une trace de vos ressentis et analyses" />

      {/* Zone d'écriture en haut : accessible tout de suite, sans scroller */}
      <div style={{ background: T.white, borderRadius: T.radius, padding: 14, marginBottom: 24,
        boxShadow: "0 1px 5px rgba(0,0,0,0.05)" }}>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Écrire une note…"
          style={{ width: "100%", minHeight: 64, background: "transparent", border: "none",
            padding: "4px 4px 10px", fontSize: 15.5, color: T.text, resize: "none", boxSizing: "border-box",
            fontFamily: font, outline: "none" }} />
        <button onClick={addNote} disabled={!canAdd}
          style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: canAdd ? T.pink : T.pinkSoft, color: "#fff", fontSize: 16, fontWeight: 700,
            fontFamily: font, cursor: canAdd ? "pointer" : "default", transition: "background 0.2s",
            opacity: canAdd ? 1 : 0.7 }}>
          Ajouter au journal
        </button>
      </div>

      {entries.length === 0 ? (
        <p style={{ fontSize: 14.5, color: T.textSoft, textAlign: "center", marginTop: 24, lineHeight: 1.5 }}>
          Vos notes et analyses enregistrées apparaîtront ici, de la plus récente à la plus ancienne.
        </p>
      ) : (
        entries.map(e => <JournalCard key={e.id} entry={e} />)
      )}

      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 24 }}>
        Chaque note est datée et sécurisée, pour suivre votre évolution.
      </p>
    </div>
  );
}

// ============================================================
//  Code PIN du journal — le code n'est jamais stocké en clair :
//  on garde seulement une empreinte. Déverrouillage valable
//  jusqu'à la fermeture / rechargement de l'app.
// ============================================================
function pinHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return "p" + h.toString(36);
}

function PinLockScreen({ onUnlock, onForgot }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  function tryPin(v) {
    setPin(v); setErr(false);
    if (v.length === 4) {
      if (onUnlock(v)) return;
      setErr(true); setPin("");
    }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "14vh", textAlign: "center" }}>
      <span style={{ width: 72, height: 72, borderRadius: 22, background: T.pink, display: "flex",
        alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Lock size={32} color="#fff" strokeWidth={2} />
      </span>
      <h1 style={{ fontSize: 21, fontWeight: 700, color: "#5A2A24", margin: "0 0 6px" }}>Journal verrouillé</h1>
      <p style={{ fontSize: 14.5, color: T.textSoft, margin: "0 0 22px", maxWidth: 260, lineHeight: 1.45 }}>
        Entre ton code à 4 chiffres pour accéder à ton journal.
      </p>
      <input value={pin} onChange={e => tryPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        type="password" inputMode="numeric" autoFocus placeholder="••••"
        style={{ width: 150, textAlign: "center", fontSize: 28, letterSpacing: 12, background: T.white,
          border: err ? "1.5px solid #D06A70" : "none", borderRadius: 14, padding: "14px 0",
          fontFamily: font, outline: "none", boxSizing: "border-box" }} />
      {err && <p style={{ fontSize: 13.5, color: "#B42318", margin: "10px 0 0", fontWeight: 600 }}>Code incorrect, réessaie.</p>}
      <button onClick={onForgot} style={{ marginTop: 26, background: "transparent", border: "none",
        color: T.textSoft, fontSize: 13.5, fontFamily: font, cursor: "pointer", textDecoration: "underline" }}>
        Code oublié ?
      </button>
    </div>
  );
}

// ============================================================
//  Rendu enrichi des réponses du coach : sauts de ligne, gras (**…**),
//  puces (- …) — pensé pour une lecture facile (dyslexie).
// ============================================================
function renderInline(text, keyBase) {
  // Découpe sur **gras** et met en gras les portions entre **
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return <strong key={`${keyBase}-b${i}`}>{p.slice(2, -2)}</strong>;
    }
    return <span key={`${keyBase}-t${i}`}>{p}</span>;
  });
}

function RichText({ text }) {
  // On retire la balise [URGENCE] du texte affiché (gérée à part).
  const clean = text.replace(/\[URGENCE\]/g, "").trimEnd();
  const lines = clean.split("\n");
  const blocks = [];
  let bullets = null;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const isBullet = /^[-•]\s+/.test(trimmed);
    if (isBullet) {
      if (!bullets) bullets = [];
      bullets.push(trimmed.replace(/^[-•]\s+/, ""));
    } else {
      if (bullets) {
        blocks.push(
          <ul key={`ul${i}`} style={{ margin: "4px 0 8px", paddingLeft: 20 }}>
            {bullets.map((b, j) => (
              <li key={j} style={{ marginBottom: 4, lineHeight: 1.5 }}>{renderInline(b, `b${i}-${j}`)}</li>
            ))}
          </ul>
        );
        bullets = null;
      }
      if (trimmed === "") {
        blocks.push(<div key={`sp${i}`} style={{ height: 8 }} />);
      } else {
        blocks.push(
          <p key={`p${i}`} style={{ margin: "0 0 6px", lineHeight: 1.55 }}>{renderInline(line, `p${i}`)}</p>
        );
      }
    }
  });
  if (bullets) {
    blocks.push(
      <ul key="ul-last" style={{ margin: "4px 0 8px", paddingLeft: 20 }}>
        {bullets.map((b, j) => (
          <li key={j} style={{ marginBottom: 4, lineHeight: 1.5 }}>{renderInline(b, `bl-${j}`)}</li>
        ))}
      </ul>
    );
  }
  return <>{blocks}</>;
}

// Boutons d'appel d'urgence cliquables (affichés quand le coach renvoie [URGENCE]).
const URGENCE_NUMEROS = [
  { label: "3919 — Violences faites aux femmes", tel: "3919" },
  { label: "3114 — Prévention du suicide", tel: "3114" },
  { label: "17 — Police (danger immédiat)", tel: "17" },
  { label: "112 — Urgences européennes", tel: "112" },
];
function EmergencyButtons() {
  return (
    <div style={{ marginTop: 10, width: "85%", alignSelf: "flex-end" }}>
      {URGENCE_NUMEROS.map((u, i) => (
        <a key={i} href={`tel:${u.tel}`}
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
            background: "#FFD8D8", color: "#B42318", border: "1px solid #F0B4B4",
            borderRadius: 12, padding: "12px 14px", marginBottom: 8, fontSize: 14.5, fontWeight: 700,
            fontFamily: font }}>
          <Phone size={17} strokeWidth={2.4} /> {u.label}
        </a>
      ))}
    </div>
  );
}

// ============================================================
//  Screen: Coach IA
// ============================================================
function CoachScreen({ onAddToJournal, journal }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Bonjour, je suis Clarisse. Je suis là pour t'écouter. Raconte-moi ce qui se passe, et prends tout le temps qu'il te faut." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState({}); // index -> true quand ajouté au journal
  const scrollRef = useRef(null);

  function addToJournal(i, text) {
    if (added[i]) return;
    onAddToJournal && onAddToJournal(text);
    setAdded(a => ({ ...a, [i]: true }));
  }

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", text }];

    // Pas de connexion : on prévient clairement que l'app n'est pas cassée.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessages([...next, { role: "assistant", text: "Je n'ai pas de connexion Internet pour le moment. L'application fonctionne bien, mais le coach a besoin d'être en ligne pour vous répondre. Vérifiez votre connexion, puis réessayez." }]);
      setInput("");
      return;
    }

    setMessages(next); setInput(""); setLoading(true);
    try {
      // On envoie l'historique au serveur Clarisé, qui ajoute le prompt du coach
      // et la clé secrète, puis interroge l'IA d'Infomaniak/Euria.
      // On joint aussi les notes récentes du journal, pour que Clarisse puisse
      // en tenir compte (ex. messages passés d'une même personne).
      const apiMsgs = next.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      const journalNotes = (journal || []).slice(0, 10).map(e => {
        const lvl = e.level && T.levels[e.level] ? ` (niveau : ${T.levels[e.level].label})` : "";
        const tags = e.tags && e.tags.length ? ` [${e.tags.join(", ")}]` : "";
        return `- ${e.date} — ${e.author}${lvl} : "${e.message}"${tags}`;
      }).join("\n");
      const res = await fetch(`${BACKEND_URL}/api/coach`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMsgs, journalNotes }),
      });
      if (!res.ok) throw new Error("coach indisponible");
      const data = await res.json();
      const reply = (data.reply || "").trim();
      // addable: true => c'est une vraie réponse, qu'on peut joindre au journal
      setMessages([...next, { role: "assistant", text: reply, addable: true }]);
    } catch {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const msg = offline
        ? "La connexion s'est interrompue. L'application n'est pas en cause : le coach a juste besoin d'Internet. Réessayez une fois reconnecté."
        : "Je n'ai pas pu répondre à l'instant. Réessayez dans un moment.";
      setMessages([...next, { role: "assistant", text: msg }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Header title="Clarisse" sub="Clarisse, à ton écoute" />
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-start" : "flex-end", marginBottom: 14 }}>
            <div style={{ maxWidth: "85%", background: m.role === "user" ? T.white : "#E7BFC8", color: T.text,
              padding: "14px 16px", borderRadius: 18, fontSize: 16, lineHeight: 1.5,
              whiteSpace: m.role === "user" ? "pre-wrap" : "normal",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              {m.role === "user" ? m.text : <RichText text={m.text} />}
            </div>
            {m.role !== "user" && /\[URGENCE\]/.test(m.text) && <EmergencyButtons />}
            {m.addable && (
              <button onClick={() => addToJournal(i, m.text)} disabled={added[i]}
                style={{ marginTop: 6, marginRight: 4, background: "transparent", border: "none",
                  color: added[i] ? "#3E8E63" : T.pink, fontSize: 13.5, fontWeight: 700, fontFamily: font,
                  cursor: added[i] ? "default" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                {added[i]
                  ? <><Check size={15} strokeWidth={2.5} /> Ajouté au journal</>
                  : <><Plus size={15} /> Ajouter au journal</>}
              </button>
            )}
          </div>
        ))}
        {loading && <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, color: T.textSoft, fontSize: 14, paddingRight: 8, marginBottom: 14 }}><ThinkingDots color={T.pink} /> Clarisse écrit…</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 24, alignItems: "flex-end" }}>
        <textarea value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
          }}
          onFocus={e => {
            // Quand le clavier s'ouvre, on ramène la zone de saisie et les
            // derniers messages dans la partie visible (évite l'écran vide).
            setTimeout(() => {
              try { e.target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 300);
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écrire à Clarisse…"
          rows={1}
          style={{ flex: 1, background: T.white, border: "none", borderRadius: 16, padding: "14px 16px",
            fontSize: 15.5, color: T.text, resize: "none", boxSizing: "border-box", fontFamily: font,
            outline: "none", maxHeight: 160, lineHeight: 1.4, overflowY: "auto" }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ background: T.pink, color: "#fff", border: "none", borderRadius: 999, width: 48, height: 48,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
//  Screen: QCM runner (questions one by one + bilan)
// ============================================================
function QcmRunner({ module, onBack }) {
  const [step, setStep] = useState(0);          // 0..5 questions, 6 = bilan
  const [answers, setAnswers] = useState([]);   // valeurs choisies

  const total = module.questions.length;
  const done = step >= total;

  function choose(v) {
    const next = [...answers, v];
    setAnswers(next);
    setStep(step + 1);
  }
  function restart() { setStep(0); setAnswers([]); }

  if (done) {
    const raw = answers.reduce((a, b) => a + b, 0);
    const res = qcmResult(module, raw);
    const l = T.levels[res.level];
    return (
      <div>
        <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> Tous les thèmes</button>
        <Header title={module.title} sub="Votre bilan" />
        <div style={{ background: l.bg, borderRadius: T.radius, padding: "22px 20px", marginBottom: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 11, height: 11, borderRadius: 999, background: l.dot }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: l.text }}>{res.title}</span>
          </div>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "#3A3A3A" }}>{res.text}</p>
        </div>
        <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginBottom: 24 }}>
          Ce test ne remplace pas un avis professionnel.
        </p>
        <button onClick={restart} style={secondaryBtnStyle}>Refaire ce test</button>
        <button onClick={onBack} style={{ ...secondaryBtnStyle, marginTop: 16, background: T.pink, color: "#fff", border: "none" }}>
          Explorer un autre thème
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> Tous les thèmes</button>
      <Header title={module.title} sub={module.sub} />
      {/* progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {module.questions.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= step ? T.pink : "#EAD3CD" }} />
        ))}
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 8px", fontWeight: 600 }}>Question {step + 1} / {total}</p>
      <p style={{ fontSize: 19, lineHeight: 1.45, color: T.text, margin: "0 0 28px", minHeight: 90 }}>
        {module.questions[step]}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {QCM_OPTIONS.map(opt => (
          <button key={opt.label} onClick={() => choose(opt.v)}
            style={{ width: "100%", background: T.white, border: `1.5px solid ${T.pinkSoft}`, borderRadius: T.radius,
              padding: "16px", fontSize: 17, fontWeight: 600, color: T.text, fontFamily: font, cursor: "pointer",
              textAlign: "left", transition: "background .15s" }}
            onMouseDown={e => e.currentTarget.style.background = T.pink100}
            onMouseUp={e => e.currentTarget.style.background = T.white}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const backBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none",
  color: T.pink, fontSize: 14.5, fontWeight: 600, fontFamily: font, cursor: "pointer", padding: 0, marginBottom: 14,
};
const secondaryBtnStyle = {
  width: "100%", background: "transparent", color: T.pink, border: `1.5px solid ${T.pink}`,
  borderRadius: 16, padding: 15, fontSize: 16, fontWeight: 700, fontFamily: font, cursor: "pointer",
};

// ============================================================
//  Screen: Tous les QCM (liste verticale, pleine page)
// ============================================================
function QcmListScreen({ onOpenQcm, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> Repérer</button>
      <Header title="Comprendre ce que je vis" sub="Choisissez un thème pour explorer comment vous vous sentez." />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {QCM_MODULES.map((m, i) => (
          <button key={i} onClick={() => onOpenQcm(i)}
            style={{ width: "100%", textAlign: "left", background: "#fff", borderRadius: T.radius, padding: "18px 20px",
              border: "none", cursor: "pointer", fontFamily: font, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ margin: "0 0 5px", fontWeight: 700, fontSize: 16.5, color: T.text }}>{m.title}</p>
                <p style={{ margin: 0, fontSize: 14, color: T.textSoft, lineHeight: 1.4 }}>{m.sub}</p>
              </div>
              <span style={{ color: T.pink, fontSize: 22, fontWeight: 700, flexShrink: 0 }}>›</span>
            </div>
          </button>
        ))}
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 24 }}>
        Chaque thème est un court test indépendant. Faites-en un seul, plusieurs, ou revenez plus tard.
      </p>
    </div>
  );
}

// ============================================================
//  Screen: Définition d'un mécanisme
// ============================================================
function DefinitionScreen({ item, onBack, backLabel }) {
  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> {backLabel}</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, background: T.pink, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {React.createElement(item.icon, { size: 20, color: "#fff", strokeWidth: 2 })}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#9C5B4E", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.cat}</span>
      </div>
      <Header title={item.mot} sub={item.court} />
      <div style={{ background: T.white, borderRadius: T.radius, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: T.text }}>{item.def}</p>

        <p style={{ margin: "24px 0 8px", fontSize: 14, fontWeight: 700, color: "#5A2A24" }}>Son effet probable</p>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: T.text }}>{item.effet}</p>

        <p style={{ margin: "24px 0 8px", fontSize: 14, fontWeight: 700, color: "#5A2A24" }}>Exemple</p>
        <div style={{ background: T.pink100, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ margin: 0, fontSize: 15.5, fontStyle: "italic", lineHeight: 1.45, color: T.text }}>{item.exemple}</p>
        </div>
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 24, lineHeight: 1.4 }}>
        Repérer un mécanisme aide à mettre des mots sur ce qu'on ressent — sans juger la personne.
      </p>
    </div>
  );
}

// ============================================================
//  Screen: Tous les mécanismes (liste verticale, pleine page)
// ============================================================
function MecaListScreen({ onOpenMeca, onBack }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tout");

  const q = query.trim().toLowerCase();
  // index filtré : on garde l'index d'origine pour onOpenMeca
  const filtered = MECANISMES
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => (cat === "Tout" || m.cat === cat))
    .filter(({ m }) => !q || m.mot.toLowerCase().includes(q) || m.court.toLowerCase().includes(q) || m.def.toLowerCase().includes(q));

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> Repérer</button>
      <Header title="Comprendre les mécanismes" sub="Des définitions claires pour décrypter les comportements toxiques." />

      {/* Barre de recherche */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.white, borderRadius: T.radius,
        padding: "12px 16px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <Search size={18} color={T.textSoft} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un mot…"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15.5,
            color: T.text, fontFamily: font }} />
        {query && <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent",
          color: T.textSoft, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>}
      </div>

      {/* Filtres par famille */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 24 }}>
        {["Tout", ...MECA_CATS].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ flexShrink: 0, border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 13,
              fontWeight: 700, fontFamily: font, cursor: "pointer",
              background: cat === c ? T.pink : T.pink100, color: cat === c ? "#fff" : "#8A726E" }}>
            {c === "Tout" ? "Tout" : c.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: 14.5, color: T.textSoft, textAlign: "center", padding: "20px 0" }}>
            Aucun mot ne correspond à « {query} ».
          </p>
        )}
        {filtered.map(({ m, i }) => (
          <button key={i} onClick={() => onOpenMeca(i)}
            style={{ width: "100%", textAlign: "left", background: "#fff", borderRadius: T.radius, padding: "18px 20px",
              border: "none", cursor: "pointer", fontFamily: font, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: T.pink100, display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {React.createElement(m.icon, { size: 20, color: T.pink, strokeWidth: 2 })}
                </span>
                <div>
                  <p style={{ margin: "0 0 5px", fontWeight: 700, fontSize: 16.5, color: T.text }}>{m.mot}</p>
                  <p style={{ margin: 0, fontSize: 14, color: T.textSoft, lineHeight: 1.4 }}>{m.court}</p>
                </div>
              </div>
              <span style={{ color: T.pink, fontSize: 22, fontWeight: 700, flexShrink: 0 }}>›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
//  Screen: Détail d'une ressource d'aide (avec appel direct)
// ============================================================
function callBtn(label, num, key) {
  return (
    <a key={key} href={telHref(num)} {...pressFx()}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        background: T.pink, color: "#fff", borderRadius: T.radius, padding: "15px 18px", marginBottom: 12,
        textDecoration: "none", fontFamily: font, transition: "background .15s" }}>
      <span style={{ fontSize: 15.5, fontWeight: 600 }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 17, fontWeight: 700 }}>
        <Phone size={18} /> {num}
      </span>
    </a>
  );
}

function RessourceScreen({ item, onBack, backLabel }) {
  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> {backLabel}</button>
      <Header title={item.titre} sub={item.court} />
      <div style={{ background: T.white, borderRadius: T.radius, padding: 20, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: T.text }}>{item.desc}</p>
      </div>
      {item.tel && callBtn(item.appelLabel || `Appeler ${item.titre}`, item.tel, "main")}
      {item.autres.map((a, i) => callBtn(a.label, a.tel, i))}
      {item.lien && (
        <a href={item.lien} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none",
            background: T.pink, color: "#fff", borderRadius: T.radius, padding: "15px 18px",
            fontSize: 16, fontWeight: 700, fontFamily: font }}>
          <Navigation size={18} /> {item.lienLabel || "Chercher autour de moi"}
        </a>
      )}
      {!item.tel && item.autres.length === 0 && !item.lien && (
        <p style={{ fontSize: 14, color: T.textSoft, textAlign: "center" }}>
          Aucun numéro direct — passez par le 3919 pour être orienté·e.
        </p>
      )}
      <p style={{ fontSize: 12.5, color: T.textSoft, textAlign: "center", marginTop: 24, lineHeight: 1.4 }}>
        En cas de danger immédiat, composez le 17 (police) ou le 112.
      </p>
    </div>
  );
}

// ============================================================
//  Screen: Se repérer
// ============================================================
function CarouselRow({ items, render }) {
  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, margin: "0 -22px", padding: "0 22px 8px" }}>
      {items.map((it, i) => <div key={i} style={{ flexShrink: 0 }}>{render(it, i)}</div>)}
    </div>
  );
}

// ============================================================
//  Violentomètre — d'après l'outil officiel de sensibilisation
//  (Centre Hubertine Auclert / Région Île-de-France), réédité
//  dans le style doux de Clarisé.
// ============================================================
const VIOLENTOMETRE = [
  {
    zone: "Profite",
    intro: "Ta relation est saine quand l'autre…",
    level: "ok",
    items: [
      "Respecte tes décisions, tes désirs et tes goûts",
      "Accepte tes amies, tes amis et ta famille",
      "A confiance en toi",
      "Est content quand tu te sens épanouie",
      "S'assure de ton accord pour ce que vous faites ensemble",
    ],
  },
  {
    zone: "Vigilance, dis stop !",
    intro: "Sois vigilante si l'autre…",
    level: "toxique",
    items: [
      "Te fait du chantage si tu refuses de faire quelque chose",
      "Rabaisse tes opinions et tes projets",
      "Se moque de toi en public",
      "Est jaloux et possessif en permanence",
      "Te manipule",
      "Contrôle tes sorties, habits, maquillage",
      "Fouille tes textos, mails, applis",
      "Insiste pour que tu lui envoies des photos intimes",
      "T'isole de ta famille et de tes proches",
      "T'oblige à regarder des films pornos",
    ],
  },
  {
    zone: "Protège-toi, demande de l'aide",
    intro: "Tu es en danger si l'autre…",
    level: "dangereux",
    items: [
      "T'humilie et te traite de folle quand tu lui fais des reproches",
      "« Pète les plombs » lorsque quelque chose lui déplaît",
      "Menace de se suicider à cause de toi",
      "Menace de diffuser des photos intimes de toi",
      "Te pousse, te tire, te gifle, te secoue, te frappe",
      "Te touche les parties intimes sans ton consentement",
      "T'oblige à avoir des relations sexuelles",
      "Te menace avec une arme",
    ],
  },
];

function ViolentometreScreen({ onBack }) {
  let num = 0;
  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.pink,
        fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={18} /> Retour
      </button>
      <Header title="Le violentomètre" sub="Un repère simple pour évaluer comment l'autre se comporte avec toi." />

      {VIOLENTOMETRE.map((z, zi) => {
        const lv = T.levels[z.level];
        return (
          <div key={zi} style={{ marginBottom: 24 }}>
            <div style={{ background: lv.dot, borderRadius: "16px 16px 0 0", padding: "14px 18px" }}>
              <p style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#fff" }}>{z.zone}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{z.intro}</p>
            </div>
            <div style={{ background: lv.bg, borderRadius: "0 0 16px 16px", padding: "6px 14px 12px" }}>
              {z.items.map((it, ii) => {
                num += 1;
                return (
                  <div key={ii} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 2px",
                    borderBottom: ii < z.items.length - 1 ? `1px solid rgba(255,255,255,0.55)` : "none" }}>
                    <span style={{ width: 26, height: 26, borderRadius: 999, background: "#fff", color: lv.text,
                      fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1 }}>{num}</span>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.45, color: lv.text, fontWeight: 500 }}>{it}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ background: T.white, borderRadius: T.radius, padding: "16px 18px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 10px", fontSize: 14.5, lineHeight: 1.5, color: T.text }}>
          Si tu te reconnais dans la zone rouge — ou même orange — tu n'es pas seule.
          Tu peux en parler et trouver de l'aide, gratuitement et anonymement.
        </p>
        {URGENCE_NUMEROS.map((u, i) => (
          <a key={i} href={`tel:${u.tel}`}
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
              background: "#FFD8D8", color: "#B42318", border: "1px solid #F0B4B4",
              borderRadius: 12, padding: "12px 14px", marginBottom: 8, fontSize: 14.5, fontWeight: 700,
              fontFamily: font }}>
            <Phone size={17} strokeWidth={2.4} /> {u.label}
          </a>
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: T.textSoft, lineHeight: 1.4, margin: "0 0 8px" }}>
        D'après le Violentomètre, outil de sensibilisation diffusé par le Centre Hubertine Auclert
        et la Région Île-de-France.
      </p>
    </div>
  );
}

function ReperScreen({ onOpenQcm, onSeeAllQcm, onOpenMeca, onSeeAllMeca, onOpenAide, onOpenViolento }) {
  return (
    <div>
      <Header title="Repérer" sub="Comprendre. Évaluer. Trouver de l'aide." />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: "#5A2A24", margin: "0 0 4px" }}>Évaluer ma situation</h2>
        <button onClick={onSeeAllQcm} style={{ background: "transparent", border: "none", color: T.pink,
          fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer", padding: 0 }}>
          Tout explorer ›
        </button>
      </div>
      <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>Des QCM pour vous auto-évaluer</p>
      <CarouselRow items={QCM_MODULES} render={(m, i) => (
        <button onClick={() => onOpenQcm(i)}
          style={{ width: 210, height: 132, boxSizing: "border-box", textAlign: "left", background: "#fff",
            borderRadius: T.radius, padding: 18, border: "none", cursor: "pointer", fontFamily: font,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 16, color: T.text }}>{m.title}</p>
          <p style={{ margin: 0, fontSize: 13.5, color: T.textSoft, lineHeight: 1.4 }}>{m.sub}</p>
          <span style={{ marginTop: "auto", fontSize: 13.5, color: T.pink, fontWeight: 700 }}>Commencer ›</span>
        </button>
      )} />

      {/* Violentomètre */}
      <button onClick={onOpenViolento}
        style={{ width: "100%", marginTop: 20, background: "#fff", border: "none", borderRadius: T.radius,
          padding: 18, textAlign: "left", cursor: "pointer", fontFamily: font,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16.5, color: T.text }}>Le violentomètre</p>
          <span style={{ fontSize: 14, color: T.pink, fontWeight: 700 }}>Découvrir ›</span>
        </div>
        <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
          <span style={{ flex: 1, background: T.levels.ok.dot }} />
          <span style={{ flex: 2, background: T.levels.toxique.dot }} />
          <span style={{ flex: 1.6, background: T.levels.dangereux.dot }} />
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: T.textSoft, lineHeight: 1.4 }}>
          Un repère simple, en trois zones, pour évaluer comment l'autre se comporte avec toi.
        </p>
      </button>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "32px 0 4px" }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: "#5A2A24", margin: 0 }}>Comprendre les mécanismes</h2>
        <button onClick={onSeeAllMeca} style={{ background: "transparent", border: "none", color: T.pink,
          fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer", padding: 0, flexShrink: 0 }}>
          Tout explorer ›
        </button>
      </div>
      <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>Définitions pour décrypter les comportements toxiques</p>
      <CarouselRow items={MECANISMES} render={(m, i) => (
        <button onClick={() => onOpenMeca(i)}
          style={{ width: 170, minHeight: 138, background: "#fff", borderRadius: T.radius, display: "flex",
            flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left",
            padding: 16, border: "none", cursor: "pointer", fontFamily: font, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: T.pink100, display: "flex",
            alignItems: "center", justifyContent: "center", marginBottom: 8, flexShrink: 0 }}>
            {React.createElement(m.icon, { size: 20, color: T.pink, strokeWidth: 2 })}
          </span>
          <span style={{ fontWeight: 700, fontSize: 15.5, color: T.text, marginBottom: 3 }}>{m.mot}</span>
          <span style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.3 }}>{m.court}</span>
        </button>
      )} />

      <div style={{ background: T.pink, borderRadius: 20, padding: "20px 18px", margin: "32px -4px 0" }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Obtenir de l'aide</h2>
        <p style={{ fontSize: 14, color: T.pink100, margin: "0 0 16px" }}>Ressources d'urgence et soutien</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {RESSOURCES.map((r, i) => (
            <button key={i} onClick={() => onOpenAide(i)}
              style={{ background: T.white, borderRadius: T.radius, padding: 16, border: "none", textAlign: "left",
                cursor: "pointer", fontFamily: font }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: T.text }}>{r.titre}</p>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: T.textSoft, lineHeight: 1.35 }}>{r.court}</p>
              <span style={{ fontSize: 13.5, color: T.pink, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
                {r.tel ? <><Phone size={13} /> {r.tel}</> : "Voir ›"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Screen: Paramètres
// ============================================================
function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
      background: "#fff", borderRadius: T.radius, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 3px", fontSize: 15.5, fontWeight: 600, color: T.text }}>{label}</p>
        {desc && <p style={{ margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.4 }}>{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)} aria-label={label}
        style={{ width: 50, height: 30, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
          background: value ? T.pink : "#E0C3CA", position: "relative", transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 24, height: 24, borderRadius: 999,
          background: "#fff", transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

function StaticRow({ label, onClick }) {
  return (
    <div onClick={onClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#fff", borderRadius: T.radius, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      cursor: onClick ? "pointer" : "default", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ fontSize: 15.5, color: T.text }}>{label}</span>
      <ChevronRight size={18} color={T.textSoft} />
    </div>
  );
}

function SectionLabel({ children }) {
  return <p style={{ fontSize: 13, fontWeight: 700, color: "#5A2A24", textTransform: "uppercase",
    letterSpacing: 0.4, margin: "22px 0 10px" }}>{children}</p>;
}

// Contenu des pages d'information (versions de base, à relire/compléter)
const INFO_PAGES = {
  apropos: {
    titre: "À propos de Clarisé",
    corps: [
      "Clarisé est une application pensée pour aider à y voir clair face aux messages qui sèment le doute, la confusion ou la culpabilité.",
      "Elle met des mots simples sur les mécanismes de manipulation, sans jamais juger ni poser de diagnostic. Son but : rendre visible l'invisible et redonner du recul.",
      "Clarisé ne remplace pas l'avis d'un professionnel. En cas de danger, la page « Se repérer » regroupe des ressources et numéros d'aide.",
    ],
  },
  mentions: {
    titre: "Mentions légales",
    corps: [
      "Éditeur : (à compléter — nom du porteur de projet ou de la structure).",
      "Contact : (à compléter — adresse e-mail).",
      "Hébergement : (à compléter — nom et adresse de l'hébergeur).",
      "Clarisé est un outil d'information et d'accompagnement. Il ne fournit ni diagnostic médical ou psychologique, ni conseil juridique.",
    ],
  },
  confidentialite: {
    titre: "Confidentialité",
    corps: [
      "Votre vie privée est une priorité. Les messages que vous analysez et vos notes de journal vous appartiennent.",
      "Dans la version complète, le journal pourra rester chiffré sur votre appareil, et l'analyse pourra fonctionner sans conserver vos messages.",
      "Aucune donnée n'est vendue ni utilisée à des fins publicitaires. Vous pouvez exporter ou effacer vos données à tout moment depuis cette page.",
      "(Texte de base — à faire valider avant publication.)",
    ],
  },
  sources: {
    titre: "Sources & inspirations",
    corps: [
      "Clarisé s'appuie sur des travaux de recherche et de clinique en psychologie. Cette page rend hommage aux autrices et auteurs dont les concepts nourrissent l'application.",
      "• Gaslighting — terme né de la pièce « Gas Light » de Patrick Hamilton (1938), puis conceptualisé en psychologie, notamment par la Dre Robin Stern (« The Gaslight Effect », 2007).",
      "• Triangle dramatique (victime · persécuteur · sauveur) — Stephen Karpman, dans le cadre de l'Analyse Transactionnelle d'Eric Berne (1968).",
      "• Communication Non Violente (CNV) — Marshall B. Rosenberg, qui a mis au centre les émotions et les besoins.",
      "• Les principes de l'influence — Robert Cialdini (« Influence et manipulation »).",
      "• Les biais cognitifs et les deux systèmes de pensée — Daniel Kahneman (« Système 1 / Système 2 »).",
      "• Les travaux d'Anne-Clotilde Ziegler sur l'emprise et les mécanismes relationnels.",
      "• La littérature clinique sur l'emprise, le lien traumatique et la séduction narcissique (notamment P.-C. Racamier).",
      "Ouvrages de référence :",
      "• Robert B. Cialdini, « Influence : The Psychology of Persuasion ».",
      "• Daniel Kahneman, « Thinking, Fast and Slow » (Système 1 / Système 2).",
      "• Robin Stern, « The Gaslight Effect » (2007).",
      "• Patricia Evans, « The Verbally Abusive Relationship » (2010).",
      "• Lenore E. Walker, « The Battered Woman » (1979) — le cycle de la violence.",
      "• Amir Levine & Rachel Heller, « Attached » (2010) — théorie de l'attachement.",
      "Clarisé vulgarise ces travaux avec des mots simples, sans les trahir. Toute erreur d'interprétation relèverait de l'application, non de ces autrices et auteurs. Cette liste sera complétée et précisée au fil des versions.",
    ],
  },
};

function InfoPage({ page, onBack }) {
  const p = INFO_PAGES[page];
  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> Retour</button>
      <Header title={p.titre} />
      <div style={{ background: T.white, borderRadius: T.radius, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        {p.corps.map((para, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "14px 0 0", fontSize: 15, lineHeight: 1.55, color: T.text }}>{para}</p>
        ))}
      </div>
    </div>
  );
}

function PinSettings({ hasPin, onSetPin, onRemovePin }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [cur, setCur] = useState(""); const [err, setErr] = useState("");
  const inputStyle = { width: "100%", background: T.bg, border: "none", borderRadius: 10, padding: "12px 14px",
    fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box", marginBottom: 8, letterSpacing: 4 };
  function reset() { setA(""); setB(""); setCur(""); setErr(""); }
  return (
    <div style={{ background: "#fff", borderRadius: T.radius, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div onClick={() => { setOpen(!open); reset(); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span style={{ fontSize: 15.5, color: T.text }}>
          {hasPin ? "Code du journal : activé 🔒" : "Verrouiller le journal par un code"}
        </span>
        <ChevronRight size={18} color={T.textSoft} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </div>
      {open && !hasPin && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 10px", lineHeight: 1.45 }}>
            Choisis un code à 4 chiffres. Il sera demandé pour ouvrir le journal.
          </p>
          <input value={a} onChange={e => { setA(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }}
            type="password" inputMode="numeric" placeholder="Nouveau code (4 chiffres)" style={inputStyle} />
          <input value={b} onChange={e => { setB(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }}
            type="password" inputMode="numeric" placeholder="Confirme le code" style={inputStyle} />
          {err && <p style={{ fontSize: 13, color: "#B42318", margin: "0 0 8px", fontWeight: 600 }}>{err}</p>}
          <button onClick={() => {
              if (a.length !== 4) { setErr("Le code doit faire 4 chiffres."); return; }
              if (a !== b) { setErr("Les deux codes ne correspondent pas."); return; }
              onSetPin(a); reset(); setOpen(false);
            }}
            style={{ width: "100%", background: T.pink, color: "#fff", border: "none", borderRadius: 12,
              padding: "12px", fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Activer le code
          </button>
        </div>
      )}
      {open && hasPin && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 10px", lineHeight: 1.45 }}>
            Pour supprimer le code, entre d'abord ton code actuel. (Pour le changer : supprime-le, puis crée-en un nouveau.)
          </p>
          <input value={cur} onChange={e => { setCur(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }}
            type="password" inputMode="numeric" placeholder="Code actuel" style={inputStyle} />
          {err && <p style={{ fontSize: 13, color: "#B42318", margin: "0 0 8px", fontWeight: 600 }}>{err}</p>}
          <button onClick={() => {
              if (!onRemovePin(cur)) { setErr("Code incorrect."); return; }
              reset(); setOpen(false);
            }}
            style={{ width: "100%", background: "#fff", color: "#B42318", border: "1px solid #EBC4CD",
              borderRadius: 12, padding: "12px", fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Supprimer le code
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsScreen({ showHelp, setShowHelp, onBack, onReplayTutorial, journal, onExport, onClear, hasPin, onSetPin, onRemovePin }) {
  const [info, setInfo] = useState(null);   // "apropos" | "mentions" | "confidentialite" | null
  const [confirmClear, setConfirmClear] = useState(false);

  if (info) return <InfoPage page={info} onBack={() => setInfo(null)} />;

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}><ArrowLeft size={18} /> Retour</button>
      <Header title="Paramètres" sub="Adaptez Clarisé à vos besoins, pour une utilisation confortable et sereine." />

      <SectionLabel>Affichage</SectionLabel>
      <ToggleRow label="Afficher les textes d'aide"
        desc="Les courtes explications sous le titre de chaque page. Désactivez-les une fois l'app prise en main."
        value={showHelp} onChange={setShowHelp} />
      <StaticRow label="Revoir le tutoriel d'accueil" onClick={onReplayTutorial} />

      <SectionLabel>Sécurité</SectionLabel>
      <PinSettings hasPin={hasPin} onSetPin={onSetPin} onRemovePin={onRemovePin} />
      <StaticRow label="Déverrouillage par biométrie" />
      <p style={{ fontSize: 12.5, color: T.textSoft, margin: "2px 2px 0", lineHeight: 1.4 }}>
        Le bouton « Sortie » en haut de l'écran quitte immédiatement Clarisé vers une page neutre.
        La biométrie sera disponible dans la version installée sur le téléphone.
      </p>

      <SectionLabel>Mes données</SectionLabel>
      <StaticRow label={`Exporter mon journal (${journal.length} note${journal.length > 1 ? "s" : ""})`} onClick={onExport} />
      {!confirmClear ? (
        <StaticRow label="Effacer l'historique" onClick={() => setConfirmClear(true)} />
      ) : (
        <div style={{ background: "#FBE3E8", border: "1px solid #EBC4CD", borderRadius: T.radius, padding: "16px 18px", marginBottom: 12 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14.5, color: "#7A4540", lineHeight: 1.45 }}>
            Effacer définitivement les {journal.length} note{journal.length > 1 ? "s" : ""} du journal ? Cette action est irréversible.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setConfirmClear(false)}
              style={{ flex: 1, background: "#fff", border: `1px solid ${T.pinkBorder}`, color: T.text,
                borderRadius: 12, padding: "11px", fontSize: 14.5, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={() => { onClear(); setConfirmClear(false); }}
              style={{ flex: 1, background: "#B42318", border: "none", color: "#fff",
                borderRadius: 12, padding: "11px", fontSize: 14.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              Effacer
            </button>
          </div>
        </div>
      )}

      <SectionLabel>Informations</SectionLabel>
      <StaticRow label="Confidentialité" onClick={() => setInfo("confidentialite")} />
      <StaticRow label="Mentions légales" onClick={() => setInfo("mentions")} />
      <StaticRow label="À propos de Clarisé" onClick={() => setInfo("apropos")} />
      <StaticRow label="Sources & inspirations" onClick={() => setInfo("sources")} />

      <p style={{ fontSize: 12.5, color: T.textSoft, textAlign: "center", margin: "18px 0 4px", lineHeight: 1.4 }}>
        Clarisé — prototype. Certaines fonctions deviendront actives dans la version publiée.
      </p>
    </div>
  );
}

// ============================================================
//  Bottom nav
// ============================================================
function BottomNav({ active, onChange }) {
  const items = [
    { key: "analyser", label: "Analyser", Icon: Search },
    { key: "journal", label: "Journal", Icon: NotebookPen },
    { key: "coach", label: "Coach IA", Icon: MessageCircle },
    { key: "reperer", label: "Repérer", Icon: Navigation },
  ];
  const n = items.length;
  const activeIndex = items.findIndex(i => i.key === active); // -1 si aucun (Paramètres)

  return (
    <div style={{ flexShrink: 0, padding: "10px 14px calc(14px + env(safe-area-inset-bottom, 0px))",
      background: "rgba(242,215,221,0.72)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(235,196,205,0.6)" }}>
      <div style={{ position: "relative", display: "flex" }}>
        {/* pastille de sélection qui glisse */}
        {activeIndex >= 0 && (
          <div style={{ position: "absolute", top: 0, bottom: 0,
            left: `calc(${activeIndex} * (100% / ${n}) + 4px)`,
            width: `calc(100% / ${n} - 8px)`,
            background: "rgba(255,255,255,0.92)", borderRadius: 16,
            boxShadow: "0 2px 10px rgba(160,90,80,0.18)",
            transition: "left .32s cubic-bezier(.4,1.3,.5,1)" }} />
        )}
        {items.map(({ key, label, Icon }) => {
          const on = active === key;
          return (
            <button key={key} onClick={() => onChange(key)}
              style={{ position: "relative", zIndex: 1, flex: 1, background: "transparent", border: "none",
                borderRadius: 16, padding: "9px 4px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4, cursor: "pointer",
                color: on ? T.pink : "#8A726E", fontFamily: font,
                transition: "color .3s ease" }}>
              <Icon size={22} strokeWidth={on ? 2.5 : 2} style={{ transition: "transform .3s ease", transform: on ? "translateY(-1px)" : "none" }} />
              <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
//  Onboarding — tutoriel d'accueil (1re ouverture + re-consultable)
// ============================================================
// Petit drapeau (rappel du logo) pour les écrans d'accueil.
// Le vrai logo (relief + ombre) sera embarqué via son image lors de l'hébergement.
function FlagMark({ size = 50, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
      <rect x="12" y="9" width="4.2" height="33" rx="2.1" fill={color}/>
      <circle cx="14.1" cy="9" r="2.6" fill={color}/>
      <path d="M16.2 12 C 24 8, 31 15, 39 11 L 35 21 L 39 31 C 31 35, 24 28, 16.2 32 Z" fill={color}/>
    </svg>
  );
}

function Onboarding({ onClose }) {
  const slides = [
    { Icon: null, titre: "Bienvenue sur Clarisé",
      texte: "Clarisé t'aide à y voir clair dans les messages qui sèment le doute. Sans jugement, à ton rythme." },
    { Icon: Search, titre: "Analyser un message",
      texte: "Colle un message reçu. Clarisé met en évidence les signes possibles de manipulation et te les explique simplement." },
    { Icon: MessageCircle, titre: "Clarisse, à ton écoute",
      texte: "Clarisse est là pour t'écouter et t'aider à comprendre ce que tu vis. Elle ne te dira jamais quoi faire : elle t'accompagne, à ton rythme." },
    { Icon: NotebookPen, titre: "Le Journal",
      texte: "Garde une trace de tes ressentis et de tes analyses. Chaque note est datée et reste sur ton téléphone, pour suivre l'évolution dans le temps." },
    { Icon: Navigation, titre: "Se repérer",
      texte: "Des mini-tests pour faire le point, un glossaire des mécanismes, et des ressources d'aide en cas de besoin." },
    { Icon: LogOut, titre: "Sortie rapide",
      texte: "En haut de l'écran, le bouton « Sortie » quitte immédiatement Clarisé et ouvre une page neutre. Pour les moments où tu as besoin de discrétion." },
    { Icon: null, titre: "Tu peux commencer",
      texte: "Tu retrouveras ce tutoriel à tout moment dans les Paramètres. Prends soin de toi." },
  ];
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const s = slides[i];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: T.bg,
      display: "flex", flexDirection: "column", padding: "64px 28px 28px", fontFamily: font }}>
      <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 24 }}>
        {!last && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textSoft,
            fontSize: 14.5, cursor: "pointer", fontFamily: font }}>Passer</button>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "22vh" }}>
        <span style={{ width: 96, height: 96, borderRadius: 28, background: T.pink, display: "flex",
          alignItems: "center", justifyContent: "center", marginBottom: 28, flexShrink: 0,
          boxShadow: "0 8px 24px rgba(200,116,131,0.35)" }}>
          {s.Icon
            ? <s.Icon size={44} color="#fff" strokeWidth={2} />
            : <FlagMark size={50} />}
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#5A2A24", margin: "0 0 14px" }}>{s.titre}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: T.text, margin: 0, maxWidth: 300 }}>{s.texte}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 22 }}>
        {slides.map((_, k) => (
          <span key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 999,
            background: k === i ? T.pink : T.pinkSoft, transition: "width .25s, background .25s" }} />
        ))}
      </div>

      <button
        onClick={() => last ? onClose() : setI(i + 1)}
        onTouchStart={e => e.currentTarget.style.background = T.pinkDark}
        onTouchEnd={e => e.currentTarget.style.background = T.pink}
        style={{ width: "100%", background: T.pink, color: "#fff", border: "none", borderRadius: T.radius,
          padding: 17, fontSize: 17, fontWeight: 700, fontFamily: font, cursor: "pointer", transition: "background .15s" }}>
        {last ? "Commencer" : "Suivant"}
      </button>
    </div>
  );
}

// ============================================================
//  App shell
// ============================================================
export default function ClariseApp() {
  const [tab, setTab] = useState("analyser");
  const [analysing, setAnalysing] = useState(null); // result object or null
  const [saved, setSaved] = useState(false);
  // Journal : conservé sur le téléphone (localStorage). Rien n'est envoyé sur
  // un serveur. Au tout premier lancement, le journal démarre vide.
  const [journal, setJournal] = useState(() => {
    try {
      const raw = localStorage.getItem("clarise_journal");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("clarise_journal", JSON.stringify(journal)); } catch {}
  }, [journal]);
  const [openQcm, setOpenQcm] = useState(null); // index of module or null
  const [qcmListOpen, setQcmListOpen] = useState(false); // full vertical list page
  const [qcmFromList, setQcmFromList] = useState(false); // came from the list (for back routing)
  const [openMeca, setOpenMeca] = useState(null); // index of mechanism or null
  const [mecaListOpen, setMecaListOpen] = useState(false); // full vertical list page
  const [mecaFromList, setMecaFromList] = useState(false);
  const [openAide, setOpenAide] = useState(null); // index of resource or null
  const [violentoOpen, setViolentoOpen] = useState(false); // page violentomètre

  // Code PIN du journal (empreinte stockée sur l'appareil, jamais le code en clair).
  const [pinStored, setPinStored] = useState(() => {
    try { return localStorage.getItem("clarise_pin") || null; } catch { return null; }
  });
  const [journalUnlocked, setJournalUnlocked] = useState(false);
  function tryUnlockJournal(code) {
    if (pinHash(code) === pinStored) { setJournalUnlocked(true); return true; }
    return false;
  }
  function setJournalPin(codeOrNull) {
    try {
      if (codeOrNull) { localStorage.setItem("clarise_pin", pinHash(codeOrNull)); setPinStored(pinHash(codeOrNull)); setJournalUnlocked(true); }
      else { localStorage.removeItem("clarise_pin"); setPinStored(null); }
    } catch {}
  }
  function forgotPin() {
    const ok = window.confirm(
      "Par sécurité, réinitialiser le code effacera tout le contenu du journal.\n\nEffacer le journal et supprimer le code ?");
    if (ok) {
      setJournal([]);
      setJournalPin(null);
      setJournalUnlocked(true);
    }
  }
  const [showHelp, setShowHelp] = useState(true);  // afficher les textes d'aide
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Tutoriel d'accueil (onboarding). Dans la vraie app : afficher seulement à la 1re ouverture
  // (mémorisé sur l'appareil). Ici, dans le prototype, on l'affiche au démarrage et il est
  // re-consultable depuis les Paramètres.
  // Tutoriel d'accueil : affiché uniquement à la toute première ouverture.
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("clarise_onboarded"); } catch { return true; }
  });
  function closeOnboarding() {
    try { localStorage.setItem("clarise_onboarded", "1"); } catch {}
    setShowOnboarding(false);
  }

  // Hauteur réellement visible : quand le clavier s'ouvre sur mobile, la zone
  // visible rétrécit. On suit cette hauteur pour que la barre du bas reste
  // toujours visible au lieu d'être poussée hors de l'écran.
  const [viewH, setViewH] = useState(null);
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      setViewH(vv.height);
      // Clavier ouvert si la zone visible est nettement plus courte que la fenêtre.
      const full = window.innerHeight || vv.height;
      setKbOpen(full - vv.height > 150);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  // Remettre la page tout en haut chaque fois qu'on change d'écran
  // (onglet, ouverture/fermeture d'une sous-page, paramètres, analyse…).
  const contentRef = useRef(null);
  const viewKey = [tab, settingsOpen, analysing ? "a" : "", openQcm, qcmListOpen,
    openMeca, mecaListOpen, openAide, violentoOpen].join("|");
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTo(0, 0);
  }, [viewKey]);

  function handleResult(r) { setAnalysing(r); setSaved(false); }
  function saveAnalysis() {
    if (saved || !analysing) return;
    const entry = {
      id: Date.now(), author: analysing.author || "Inconnu",
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
      message: analysing.message,
      tags: (analysing.cards || []).map(c => c.category).slice(0, 4),
      level: analysing.level,
    };
    setJournal([entry, ...journal]); setSaved(true);
  }
  function newAnalysis() { setAnalysing(null); }
  function addNote(text) {
    setJournal([{ id: Date.now(), author: "Note", date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), message: text, tags: [] }, ...journal]);
  }
  function addCoachNote(text) {
    // On garde la mise en forme (gras **…**, puces "- ") : elle sera rendue
    // proprement par RichText dans le journal. On retire juste la balise technique.
    const clean = String(text).replace(/\[URGENCE\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
    setJournal([{ id: Date.now(), author: "Conseil du coach", date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), message: clean, tags: [] }, ...journal]);
  }

  const isCoach = tab === "coach" && !settingsOpen;
  let body;
  if (settingsOpen) body = (
    <SettingsScreen showHelp={showHelp} setShowHelp={setShowHelp} onBack={() => setSettingsOpen(false)}
      onReplayTutorial={() => { setSettingsOpen(false); setShowOnboarding(true); }}
      journal={journal}
      onExport={() => exportJournal(journal)}
      onClear={() => setJournal([])}
      hasPin={!!pinStored}
      onSetPin={(code) => setJournalPin(code)}
      onRemovePin={(code) => { if (pinHash(code) === pinStored) { setJournalPin(null); return true; } return false; }} />
  );
  else if (tab === "analyser") body = analysing
    ? <AnalyseScreen result={analysing} onSave={saveAnalysis} onNew={newAnalysis} saved={saved} />
    : <AnalyserScreen onResult={handleResult} />;
  else if (tab === "journal") body = (pinStored && !journalUnlocked)
    ? <PinLockScreen onUnlock={tryUnlockJournal} onForgot={forgotPin} />
    : <JournalScreen entries={journal} onAddNote={addNote} />;
  else if (isCoach) body = <CoachScreen onAddToJournal={addCoachNote} journal={journal} />;
  else if (openQcm !== null) body = (
    <QcmRunner module={QCM_MODULES[openQcm]}
      onBack={() => { setOpenQcm(null); if (!qcmFromList) setQcmListOpen(false); }} />
  );
  else if (qcmListOpen) body = (
    <QcmListScreen
      onOpenQcm={(i) => { setQcmFromList(true); setOpenQcm(i); }}
      onBack={() => setQcmListOpen(false)} />
  );
  else if (openMeca !== null) body = (
    <DefinitionScreen item={MECANISMES[openMeca]}
      backLabel={mecaFromList ? "Tous les mécanismes" : "Repérer"}
      onBack={() => { setOpenMeca(null); if (!mecaFromList) setMecaListOpen(false); }} />
  );
  else if (mecaListOpen) body = (
    <MecaListScreen
      onOpenMeca={(i) => { setMecaFromList(true); setOpenMeca(i); }}
      onBack={() => setMecaListOpen(false)} />
  );
  else if (openAide !== null) body = (
    <RessourceScreen item={RESSOURCES[openAide]} backLabel="Repérer"
      onBack={() => setOpenAide(null)} />
  );
  else if (violentoOpen) body = (
    <ViolentometreScreen onBack={() => setViolentoOpen(false)} />
  );
  else body = (
    <ReperScreen
      onOpenQcm={(i) => { setQcmFromList(false); setOpenQcm(i); }}
      onSeeAllQcm={() => setQcmListOpen(true)}
      onOpenMeca={(i) => { setMecaFromList(false); setOpenMeca(i); }}
      onSeeAllMeca={() => setMecaListOpen(true)}
      onOpenAide={setOpenAide}
      onOpenViolento={() => setViolentoOpen(true)} />
  );

  return (
    <HelpContext.Provider value={showHelp}>
    <div style={{ height: viewH ? viewH + "px" : "100dvh", width: "100%", background: T.bg,
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: font, position: "relative" }}>
        {showOnboarding && <Onboarding onClose={closeOnboarding} />}
        {/* Sortie rapide : quitte immédiatement Clarisé vers une page neutre.
            location.replace évite que le bouton retour ramène sur l'app. */}
        <button
          onClick={() => { try { window.location.replace("https://www.google.com"); } catch { window.location.href = "https://www.google.com"; } }}
          aria-label="Sortie rapide"
          style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", right: 66, zIndex: 40,
            width: 38, height: 38, borderRadius: 999, border: "none",
            background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(4px)", color: T.pinkDark }}>
          <LogOut size={18} strokeWidth={2.4} />
        </button>
        {/* Bouton Paramètres (engrenage) */}
        {!settingsOpen && (
          <button onClick={() => setSettingsOpen(true)} aria-label="Paramètres"
            style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", right: 20, zIndex: 5, width: 38, height: 38, borderRadius: 999,
              border: "none", background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}>
            <Settings size={20} color={T.pink} />
          </button>
        )}
        <div ref={contentRef} style={{ flex: 1, minHeight: 0, overflowY: isCoach ? "hidden" : "auto", padding: "calc(env(safe-area-inset-top, 0px) + 18px) 22px 16px", display: "flex", flexDirection: "column" }}>
          {body}
        </div>
        {!kbOpen && <BottomNav active={settingsOpen ? null : tab} onChange={(k) => { setSettingsOpen(false); if (k !== "reperer") { setOpenQcm(null); setQcmListOpen(false); setOpenMeca(null); setMecaListOpen(false); setOpenAide(null); setViolentoOpen(false); } if (k === "analyser") setAnalysing(null); setTab(k); }} />}
        {kbOpen && (
          <button
            onMouseDown={e => { e.preventDefault(); if (document.activeElement) document.activeElement.blur(); }}
            onClick={() => { if (document.activeElement) document.activeElement.blur(); }}
            aria-label="Fermer le clavier"
            style={{ flexShrink: 0, width: "100%", background: T.white, border: "none",
              borderTop: "1px solid " + T.pinkBorder, padding: "12px 0",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              color: T.pink, fontSize: 14.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            <ArrowDown size={17} strokeWidth={2.4} /> Fermer le clavier
          </button>
        )}
    </div>
    </HelpContext.Provider>
  );
}
