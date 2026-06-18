import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import {
  Search, NotebookPen, MessageCircle, Navigation, ArrowLeft, Send, Bookmark, AlertTriangle, Phone, Settings, ChevronRight, Hand, Heart, EyeOff, ArrowDown, ArrowLeftRight, Eye, MessageSquare, Repeat, Shrink, Droplet, Link2, RefreshCw, Moon, UserMinus, Lock, BellOff, Brain, User, Anchor, Sparkles, Target, Scale, Battery, Check
} from "lucide-react";

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
      {sub && showHelp && <p style={{ fontSize: 14.5, color: T.textSoft, margin: "6px 0 0", lineHeight: 1.4 }}>{sub}</p>}
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

function Tag({ children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ side: "bottom", left: 0 }); // placement calculé
  const touchedRef = useRef(false);
  const wrapRef = useRef(null);
  const def = defForLabel(typeof children === "string" ? children : "");
  const POP_W = 240;

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
        style={{ background: "#E08338", color: "#FFFFFF", padding: "7px 13px", borderRadius: 10,
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
  const sys = `Tu es le moteur d'analyse de Clarisé, une application qui aide à repérer la manipulation dans des messages.
Analyse le message fourni et réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans backticks.

Schéma exact :
{
  "level": "ok" | "preoccupant" | "toxique" | "dangereux",
  "summary": "une phrase factuelle qui résume ce que fait le message",
  "cards": [
    { "category": "<un mécanisme>", "quote": "<extrait court du message>", "explanation": "<1 phrase, ce que ça produit chez la personne>" }
  ],
  "replies": ["<réponse saine 1>", "<réponse saine 2>", "<réponse saine 3>"]
}

Catégories autorisées : Culpabilisation, Menace, Chantage affectif, Gaslighting, Dévalorisation, Injonction paradoxale, Contrôle / Intrusion, Passif-agressif, Renversement de responsabilité, Minimisation.

Règles de ton (impératives) :
- factuel, rassurant, non jugeant, pédagogique.
- Ne dis JAMAIS "vous êtes victime", "cette personne est manipulatrice", "vous êtes sous emprise".
- Parle du MESSAGE et de son EFFET PROBABLE, pas de la personne.
- Si le message est sain, renvoie level "ok", cards vide [], et des replies bienveillantes.
- Niveaux : ok = respectueux ; preoccupant = ambigu/début de pression ; toxique = manipulation claire ; dangereux = menace/intimidation/contrôle.`;

  const user = `Message reçu${author ? ` (de : ${author})` : ""} :\n"""${message}"""`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: sys,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  let txt = data.content.map(b => (b.type === "text" ? b.text : "")).join("").trim();
  txt = txt.replace(/```json|```/g, "").trim();
  return JSON.parse(txt);
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
  const [mode, setMode] = useState("demo"); // "demo" | "ia"

  const tooLong = msg.length > MAX_MSG;

  async function run() {
    if (!msg.trim() || tooLong) return;
    setError(null);

    if (mode === "demo") {
      onResult({ message: msg.trim(), author: author.trim(), ...demoAnalyze(msg.trim()) });
      return;
    }

    // Vérifier la connexion avant d'essayer
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError({
        titre: "Pas de connexion",
        texte: "L'analyse a besoin d'Internet pour fonctionner. Vérifiez votre connexion, puis réessayez. En attendant, vous pouvez utiliser le mode Démo.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeMessage(msg.trim(), author.trim());
      onResult({ message: msg.trim(), author: author.trim(), ...result });
    } catch (e) {
      // Message d'erreur adapté à la cause probable
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (offline) {
        setError({
          titre: "Connexion perdue",
          texte: "La connexion s'est interrompue pendant l'analyse. Réessayez quand vous serez de nouveau en ligne.",
        });
      } else {
        setError({
          titre: "L'analyse n'a pas abouti",
          texte: "Quelque chose n'a pas fonctionné de notre côté. Vous pouvez réessayer dans un instant, ou utiliser le mode Démo en attendant.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Analyser un message" sub="Collez un message pour détecter s'il contient des signes de manipulation" />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, background: T.pink100, borderRadius: 12, padding: 4 }}>
        {[["demo", "Démo"], ["ia", "Analyse IA"]].map(([k, lab]) => (
          <button key={k} onClick={() => setMode(k)}
            style={{ flex: 1, border: "none", borderRadius: 9, padding: "9px 0", fontSize: 14, fontWeight: 700,
              fontFamily: font, cursor: "pointer", background: mode === k ? "#fff" : "transparent",
              color: mode === k ? T.pink : "#8A726E", boxShadow: mode === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {lab}
          </button>
        ))}
      </div>

      <textarea
        value={msg} onChange={e => { setMsg(e.target.value); if (error) setError(null); }}
        placeholder={'Ex : "Si tu ne comprends pas que c\'est de ta faute, tu vas avoir des problèmes…"'}
        style={{ width: "100%", minHeight: 180, background: T.white,
          border: tooLong ? "1.5px solid #D06A70" : "none", borderRadius: 12,
          padding: 20, fontSize: 16.5, lineHeight: 1.45, color: T.text, resize: "none", boxSizing: "border-box",
          fontFamily: font, outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      />
      {/* compteur de caractères */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <span style={{ fontSize: 12.5, color: tooLong ? "#B42318" : T.textSoft, fontWeight: tooLong ? 700 : 400 }}>
          {msg.length} / {MAX_MSG}
        </span>
      </div>
      {tooLong && (
        <p style={{ fontSize: 13, color: "#B42318", margin: "4px 0 0", lineHeight: 1.4 }}>
          Ce message est un peu trop long pour être analysé d'un coup. Essayez de le raccourcir, ou de coller seulement le passage qui vous interroge.
        </p>
      )}

      <p style={{ textAlign: "center", fontSize: 16, color: T.text, margin: "20px 0 10px", fontWeight: 500 }}>
        Qui vous a écrit ce message ?
      </p>
      <input
        value={author} onChange={e => setAuthor(e.target.value)}
        placeholder="ex : votre mère, Marc, votre patron…"
        style={{ width: "100%", background: T.white, border: "none", borderRadius: 12, padding: "16px 18px",
          fontSize: 15.5, color: T.text, boxSizing: "border-box", fontFamily: font, outline: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      />
      <button onClick={run} disabled={loading || !msg.trim() || tooLong}
        onMouseDown={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pinkDark; }}
        onMouseUp={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pink; }}
        onMouseLeave={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pink; }}
        onTouchStart={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pinkDark; }}
        onTouchEnd={e => { if (!loading && msg.trim() && !tooLong) e.currentTarget.style.background = T.pink; }}
        style={{ width: "100%", marginTop: 22, background: (loading || tooLong || !msg.trim()) ? T.pinkSoft : T.pink, color: "#fff",
          border: "none", borderRadius: T.radius, padding: "18px", fontSize: 19, fontWeight: 700,
          fontFamily: font, cursor: (loading || tooLong || !msg.trim()) ? "default" : "pointer", transition: "background .15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {loading ? <><ThinkingDots /> Analyse en cours…</> : "Analyser"}
      </button>

      <p style={{ fontSize: 12.5, color: T.textSoft, textAlign: "center", marginTop: 12, lineHeight: 1.4 }}>
        {mode === "demo"
          ? "Mode démo : résultats d'exemple, sans connexion à l'IA."
          : "Mode IA : analyse réelle (nécessite le backend connecté — voir fiche de branchement)."}
      </p>

      {/* Message d'erreur doux et clair */}
      {error && (
        <div style={{ marginTop: 14, background: "#FBE3E8", border: "1px solid #EBC4CD", borderRadius: T.radius,
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
    <div style={{ borderRadius: T.radius, overflow: "hidden", marginBottom: 14, border: `1px solid ${ct.head}` }}>
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
  return (
    <div>
      <Header title="Analyse" sub="Résultat de votre analyse" />
      <div style={{ background: T.white, borderRadius: T.radius, padding: "26px 20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}><LevelBadge level={result.level} /></div>
        <p style={{ fontSize: 17, lineHeight: 1.5, color: T.text, margin: "0 0 22px", textAlign: "center" }}>
          {result.message}
        </p>

        {result.cards && result.cards.length > 0 ? result.cards.map((c, i) => (
          <AnalysisCard key={i} card={c} level={result.level} />
        )) : (
          <div style={{ background: CARD_TINT.ok.body, borderRadius: T.radius, padding: 18, marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.45 }}>{result.summary}</p>
          </div>
        )}

        {result.replies && result.replies.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#5A2A24", margin: "0 0 10px" }}>Des réponses possibles</p>
            {result.replies.map((r, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${T.pinkSoft}`, borderRadius: 12,
                padding: "11px 14px", marginBottom: 8, fontSize: 14.5, lineHeight: 1.4, color: T.text }}>
                {r}
              </div>
            ))}
          </div>
        )}

        <button onClick={onSave} disabled={saved}
          onMouseDown={e => { if (!saved) e.currentTarget.style.background = T.pinkDark; }}
          onMouseUp={e => { if (!saved) e.currentTarget.style.background = T.pink; }}
          onMouseLeave={e => { if (!saved) e.currentTarget.style.background = T.pink; }}
          onTouchStart={e => { if (!saved) e.currentTarget.style.background = T.pinkDark; }}
          onTouchEnd={e => { if (!saved) e.currentTarget.style.background = T.pink; }}
          style={{ width: "100%", marginTop: 18, background: saved ? "#B7CBB8" : T.pink, color: "#fff", border: "none",
            borderRadius: T.radius, padding: 16, fontSize: 16.5, fontWeight: 700, fontFamily: font, cursor: saved ? "default" : "pointer",
            transition: "background .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Bookmark size={18} /> {saved ? "Enregistré dans le journal" : "Sauvegarder cette analyse"}
        </button>
        <button onClick={onNew}
          style={{ width: "100%", marginTop: 10, background: "transparent", color: T.pink, border: `1.5px solid ${T.pink}`,
            borderRadius: T.radius, padding: 15, fontSize: 16, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
          Nouvelle analyse
        </button>
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 16, lineHeight: 1.4 }}>
        Cette analyse n'est pas un diagnostic. Elle vous aide à reprendre du recul.
      </p>
    </div>
  );
}

// ============================================================
//  Screen: Journal
// ============================================================
function JournalCard({ entry }) {
  return (
    <div style={{ position: "relative", background: T.white, borderRadius: 18, padding: "22px 20px 20px",
      marginBottom: 26, boxShadow: "0 1px 5px rgba(0,0,0,0.05)" }}>
      <div style={{ position: "absolute", top: -12, right: -4, background: T.pink, color: "#fff",
        padding: "8px 16px", borderRadius: 12, fontSize: 15, fontWeight: 600 }}>{entry.author}</div>
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#9C5B4E", fontWeight: 500 }}>{entry.date}</p>
      <p style={{ margin: "0 0 16px", fontSize: 17, lineHeight: 1.45, color: T.text }}>{entry.message}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {entry.tags.map((t, i) => <Tag key={i}>{t}</Tag>)}
      </div>
    </div>
  );
}

function JournalScreen({ entries, onAddNote }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <Header title="Journal" sub="Gardez une trace de vos ressentis et analyses" />
      {entries.map(e => <JournalCard key={e.id} entry={e} />)}
      <div style={{ background: T.white, borderRadius: T.radius, padding: 4, marginTop: 6 }}>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Écrire une note…"
          onBlur={() => { if (note.trim()) { onAddNote(note.trim()); setNote(""); } }}
          style={{ width: "100%", minHeight: 64, background: "transparent", border: "none", borderRadius: 12,
            padding: 16, fontSize: 15.5, color: T.text, resize: "none", boxSizing: "border-box",
            fontFamily: font, outline: "none" }} />
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 16 }}>
        Chaque note est datée et sécurisée, pour suivre votre évolution.
      </p>
    </div>
  );
}

// ============================================================
//  Screen: Coach IA
// ============================================================
function CoachScreen() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Clarisé est à votre écoute. Posez vos questions et découvrez des pistes concrètes pour mieux comprendre la situation." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const sys = `Tu es le Coach de Clarisé. Ton : doux, protecteur, jamais culpabilisant, pédagogique.
Tu aides la personne à comprendre des messages reçus et à poser des limites saines.
Ne poses pas de diagnostic, ne qualifie pas les gens ("manipulateur", "pervers"). Parle des messages et de leurs effets.
Reste bref (3-5 phrases), concret, et propose une piste d'action ou une reformulation quand c'est utile.`;
      const apiMsgs = next.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: sys, messages: apiMsgs }),
      });
      const data = await res.json();
      const reply = data.content.map(b => (b.type === "text" ? b.text : "")).join("").trim();
      setMessages([...next, { role: "assistant", text: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", text: "Je n'ai pas pu répondre à l'instant. Réessayez dans un moment." }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Header title="Coach Clarisé" sub="Posez vos questions et obtenez du soutien" />
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end", marginBottom: 14 }}>
            <div style={{ maxWidth: "85%", background: m.role === "user" ? T.white : "#E7BFC8", color: T.text,
              padding: "14px 16px", borderRadius: 18, fontSize: 16, lineHeight: 1.5, whiteSpace: "pre-wrap",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, color: T.textSoft, fontSize: 14, paddingRight: 8, marginBottom: 14 }}><ThinkingDots color={T.pink} /> Clarisé écrit…</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end" }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écrire un message à Clarisé"
          rows={1}
          style={{ flex: 1, background: T.white, border: "none", borderRadius: 16, padding: "14px 16px",
            fontSize: 15.5, color: T.text, resize: "none", boxSizing: "border-box", fontFamily: font,
            outline: "none", maxHeight: 120 }} />
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
        <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginBottom: 18 }}>
          Ce test ne remplace pas un avis professionnel.
        </p>
        <button onClick={restart} style={secondaryBtnStyle}>Refaire ce test</button>
        <button onClick={onBack} style={{ ...secondaryBtnStyle, marginTop: 10, background: T.pink, color: "#fff", border: "none" }}>
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
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
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
      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 18 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, background: T.pink, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {React.createElement(item.icon, { size: 20, color: "#fff", strokeWidth: 2 })}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#9C5B4E", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.cat}</span>
      </div>
      <Header title={item.mot} sub={item.court} />
      <div style={{ background: T.white, borderRadius: T.radius, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: T.text }}>{item.def}</p>

        <p style={{ margin: "18px 0 6px", fontSize: 14, fontWeight: 700, color: "#5A2A24" }}>Son effet probable</p>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: T.text }}>{item.effet}</p>

        <p style={{ margin: "18px 0 6px", fontSize: 14, fontWeight: 700, color: "#5A2A24" }}>Exemple</p>
        <div style={{ background: T.pink100, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ margin: 0, fontSize: 15.5, fontStyle: "italic", lineHeight: 1.45, color: T.text }}>{item.exemple}</p>
        </div>
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, textAlign: "center", marginTop: 16, lineHeight: 1.4 }}>
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
        padding: "12px 16px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <Search size={18} color={T.textSoft} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un mot…"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15.5,
            color: T.text, fontFamily: font }} />
        {query && <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent",
          color: T.textSoft, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>}
      </div>

      {/* Filtres par famille */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 14 }}>
        {["Tout", ...MECA_CATS].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ flexShrink: 0, border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 13,
              fontWeight: 700, fontFamily: font, cursor: "pointer",
              background: cat === c ? T.pink : T.pink100, color: cat === c ? "#fff" : "#8A726E" }}>
            {c === "Tout" ? "Tout" : c.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
        background: T.pink, color: "#fff", borderRadius: T.radius, padding: "15px 18px", marginBottom: 10,
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
      <div style={{ background: T.white, borderRadius: T.radius, padding: 20, marginBottom: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: T.text }}>{item.desc}</p>
      </div>
      {item.tel && callBtn(item.appelLabel || `Appeler ${item.titre}`, item.tel, "main")}
      {item.autres.map((a, i) => callBtn(a.label, a.tel, i))}
      {!item.tel && item.autres.length === 0 && (
        <p style={{ fontSize: 14, color: T.textSoft, textAlign: "center" }}>
          Aucun numéro direct — passez par le 3919 pour être orienté·e.
        </p>
      )}
      <p style={{ fontSize: 12.5, color: T.textSoft, textAlign: "center", marginTop: 14, lineHeight: 1.4 }}>
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

function ReperScreen({ onOpenQcm, onSeeAllQcm, onOpenMeca, onSeeAllMeca, onOpenAide }) {
  return (
    <div>
      <Header title="Repérer" sub="Comprendre. Évaluer. Trouver de l'aide." />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: "#5A2A24", margin: "4px 0 2px" }}>Évaluer ma situation</h2>
        <button onClick={onSeeAllQcm} style={{ background: "transparent", border: "none", color: T.pink,
          fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer", padding: 0 }}>
          Tout explorer ›
        </button>
      </div>
      <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 14px" }}>Des QCM pour vous auto-évaluer</p>
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

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 2px" }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: "#5A2A24", margin: 0 }}>Comprendre les mécanismes</h2>
        <button onClick={onSeeAllMeca} style={{ background: "transparent", border: "none", color: T.pink,
          fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer", padding: 0, flexShrink: 0 }}>
          Tout explorer ›
        </button>
      </div>
      <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 14px" }}>Définitions pour décrypter les comportements toxiques</p>
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

      <div style={{ background: T.pink, borderRadius: 20, padding: "20px 18px", margin: "20px -4px 0" }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Obtenir de l'aide</h2>
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

function SettingsScreen({ showHelp, setShowHelp, onBack, onReplayTutorial, journal, onExport, onClear }) {
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
      <StaticRow label="Code secret à l'ouverture" />
      <StaticRow label="Déverrouillage par biométrie" />
      <StaticRow label="Mode discret (masquer l'app)" />
      <p style={{ fontSize: 12.5, color: T.textSoft, margin: "2px 2px 0", lineHeight: 1.4 }}>
        Ces protections seront actives dans la version complète installée sur le téléphone.
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
      texte: "Clarisé vous aide à y voir clair dans les messages qui sèment le doute. Sans jugement, à votre rythme." },
    { Icon: Search, titre: "Analyser un message",
      texte: "Collez un message reçu. Clarisé met en évidence les signes possibles de manipulation et vous les explique simplement." },
    { Icon: MessageCircle, titre: "Le Coach",
      texte: "Posez vos questions au coach. Il vous aide à comprendre la situation, à poser vos limites ou à préparer une réponse." },
    { Icon: NotebookPen, titre: "Le Journal",
      texte: "Gardez une trace de vos ressentis et de vos analyses. Chaque note est datée, pour suivre l'évolution dans le temps." },
    { Icon: Navigation, titre: "Se repérer",
      texte: "Des mini-tests pour faire le point, un glossaire des mécanismes, et des ressources d'aide en cas de besoin." },
    { Icon: null, titre: "Vous pouvez commencer",
      texte: "Vous retrouverez ce tutoriel à tout moment dans les Paramètres. Prenez soin de vous." },
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span style={{ width: 96, height: 96, borderRadius: 28, background: T.pink, display: "flex",
          alignItems: "center", justifyContent: "center", marginBottom: 28,
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
  const [journal, setJournal] = useState(SEED_JOURNAL);
  const [openQcm, setOpenQcm] = useState(null); // index of module or null
  const [qcmListOpen, setQcmListOpen] = useState(false); // full vertical list page
  const [qcmFromList, setQcmFromList] = useState(false); // came from the list (for back routing)
  const [openMeca, setOpenMeca] = useState(null); // index of mechanism or null
  const [mecaListOpen, setMecaListOpen] = useState(false); // full vertical list page
  const [mecaFromList, setMecaFromList] = useState(false);
  const [openAide, setOpenAide] = useState(null); // index of resource or null
  const [showHelp, setShowHelp] = useState(true);  // afficher les textes d'aide
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Tutoriel d'accueil (onboarding). Dans la vraie app : afficher seulement à la 1re ouverture
  // (mémorisé sur l'appareil). Ici, dans le prototype, on l'affiche au démarrage et il est
  // re-consultable depuis les Paramètres.
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Détecte si on est sur un vrai écran de téléphone (plein écran) ou sur grand
  // écran (on garde alors la maquette iPhone encadrée et centrée).
  const [isPhone, setIsPhone] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 500 : false
  );
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth <= 500);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const isCoach = tab === "coach" && !settingsOpen;
  let body;
  if (settingsOpen) body = (
    <SettingsScreen showHelp={showHelp} setShowHelp={setShowHelp} onBack={() => setSettingsOpen(false)}
      onReplayTutorial={() => { setSettingsOpen(false); setShowOnboarding(true); }}
      journal={journal}
      onExport={() => exportJournal(journal)}
      onClear={() => setJournal([])} />
  );
  else if (tab === "analyser") body = analysing
    ? <AnalyseScreen result={analysing} onSave={saveAnalysis} onNew={newAnalysis} saved={saved} />
    : <AnalyserScreen onResult={handleResult} />;
  else if (tab === "journal") body = <JournalScreen entries={journal} onAddNote={addNote} />;
  else if (isCoach) body = <CoachScreen />;
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
  else body = (
    <ReperScreen
      onOpenQcm={(i) => { setQcmFromList(false); setOpenQcm(i); }}
      onSeeAllQcm={() => setQcmListOpen(true)}
      onOpenMeca={(i) => { setMecaFromList(false); setOpenMeca(i); }}
      onSeeAllMeca={() => setMecaListOpen(true)}
      onOpenAide={setOpenAide} />
  );

  return (
    <HelpContext.Provider value={showHelp}>
    <div style={{ minHeight: "100dvh", background: isPhone ? T.bg : "#D8C9C5",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: font, padding: isPhone ? 0 : 16 }}>
      {/* iPhone : plein écran sur téléphone, maquette encadrée sur grand écran */}
      <div style={{ width: isPhone ? "100%" : 390, height: isPhone ? "100dvh" : 844,
        background: T.bg, borderRadius: isPhone ? 0 : 44, overflow: "hidden",
        boxShadow: isPhone ? "none" : "0 24px 60px rgba(0,0,0,0.28)",
        display: "flex", flexDirection: "column", position: "relative" }}>
        {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
        {/* Bouton Paramètres (engrenage) */}
        {!settingsOpen && (
          <button onClick={() => setSettingsOpen(true)} aria-label="Paramètres"
            style={{ position: "absolute", top: 54, right: 20, zIndex: 5, width: 38, height: 38, borderRadius: 999,
              border: "none", background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}>
            <Settings size={20} color={T.pink} />
          </button>
        )}
        <div style={{ flex: 1, overflowY: isCoach ? "hidden" : "auto", padding: "60px 22px 16px", display: "flex", flexDirection: "column" }}>
          {body}
        </div>
        <BottomNav active={settingsOpen ? null : tab} onChange={(k) => { setSettingsOpen(false); if (k !== "reperer") { setOpenQcm(null); setQcmListOpen(false); setOpenMeca(null); setMecaListOpen(false); setOpenAide(null); } setTab(k); }} />
      </div>
    </div>
    </HelpContext.Provider>
  );
}
