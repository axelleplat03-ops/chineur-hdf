import { useState, useRef, useEffect } from "react";

// ─── LBC URL BUILDER ────────────────────────────────────────────────────────
function buildLBCUrl(keyword, maxPrice = 300, regionCode = null) {
  const base = "https://www.leboncoin.fr/recherche";
  const params = new URLSearchParams();
  params.set("category", "39"); // Meubles
  params.set("text", keyword);
  params.set("price", `0-${maxPrice}`);
  if (regionCode) params.set("regions", regionCode);
  return `${base}?${params.toString()}`;
}

// LBC region codes (leboncoin internal)
const LBC_REGIONS = [
  { label: "Toute la France", code: null },
  { label: "Hauts-de-France", code: "16" },
  { label: "Normandie", code: "22" },
  { label: "Île-de-France", code: "12" },
  { label: "Centre-Val de Loire", code: "7" },
  { label: "Bretagne", code: "6" },
  { label: "Pays de la Loire", code: "18" },
  { label: "Grand Est", code: "11" },
  { label: "Bourgogne-Franche-Comté", code: "5" },
  { label: "Auvergne-Rhône-Alpes", code: "2" },
  { label: "Nouvelle-Aquitaine", code: "15" },
  { label: "Occitanie", code: "17" },
  { label: "PACA", code: "21" },
];

const RECHERCHES_PRESET = [
  {
    categorie: "Commodes & Buffets",
    icon: "🪟",
    items: [
      { label: "Commode Louis XV", kw: "commode louis XV" },
      { label: "Commode Louis XVI", kw: "commode louis XVI" },
      { label: "Commode bombée ancienne", kw: "commode bombée ancienne" },
      { label: "Buffet deux corps", kw: "buffet deux corps ancien" },
      { label: "Enfilade ancienne", kw: "enfilade ancienne" },
      { label: "Buffet bas style", kw: "buffet bas style ancien" },
    ],
  },
  {
    categorie: "Armoires & Rangements",
    icon: "🚪",
    items: [
      { label: "Armoire chapeau gendarme", kw: "armoire chapeau gendarme" },
      { label: "Armoire normande", kw: "armoire normande ancienne" },
      { label: "Bonnetière ancienne", kw: "bonnetière ancienne" },
      { label: "Vaisselier ancien", kw: "vaisselier ancien" },
      { label: "Armoire louis XV", kw: "armoire louis XV" },
    ],
  },
  {
    categorie: "Tables & Consoles",
    icon: "🪑",
    items: [
      { label: "Console ancienne dorée", kw: "console ancienne dorée" },
      { label: "Console Louis XVI", kw: "console louis XVI" },
      { label: "Guéridon ancien", kw: "guéridon ancien" },
      { label: "Table de nuit ancienne", kw: "table de nuit ancienne" },
      { label: "Secrétaire ancien", kw: "secrétaire ancien" },
    ],
  },
  {
    categorie: "Sièges & Fauteuils",
    icon: "💺",
    items: [
      { label: "Fauteuil Louis XV", kw: "fauteuil louis XV" },
      { label: "Bergère ancienne", kw: "bergère ancienne" },
      { label: "Canapé style Louis", kw: "canapé style louis ancien" },
      { label: "Chaises style", kw: "chaises style louis ancien" },
    ],
  },
  {
    categorie: "Variantes & Fautes courantes",
    icon: "🔤",
    items: [
      { label: "Louis 15 (faute)", kw: "louis 15 meuble" },
      { label: "Louis 16 (faute)", kw: "louis 16 meuble" },
      { label: "Vide maison meuble", kw: "vide maison meuble ancien" },
      { label: "Succession meuble", kw: "succession meuble style" },
      { label: "Meuble estampillé", kw: "meuble estampillé ancien" },
      { label: "Meuble de style époque", kw: "meuble de style époque" },
    ],
  },
];

const SYSTEM_PROMPT = `Tu es un expert en meubles anciens français et en chinage sur Le Bon Coin, assistant un chineur basé dans les Hauts-de-France.

Styles recherchés : Louis XV, Louis XVI, armoires chapeau de gendarme, enfilades, buffets deux corps, commodes, consoles, chevets, secrétaires, bonnetières.
Budget maximum : 300€ par meuble. Zone : toute la France, rapatriement vers les Hauts-de-France.

Quand on te soumet une annonce, retourne UNIQUEMENT un JSON valide avec ce format exact (pas de markdown, pas de texte avant ou après) :
{
  "titre": "nom court du meuble",
  "style": "style identifié",
  "ville": "ville",
  "region": "région",
  "distance_hdf": "~XXX km",
  "prix_demande": "XXX€",
  "valeur_estimee": "XXX–XXX€",
  "score": 85,
  "score_label": "Très intéressant",
  "verdict": "OK",
  "points_forts": ["point 1", "point 2"],
  "red_flags": [],
  "conseil_nego": "Message court à envoyer au vendeur",
  "note_logistique": "Conseil pour le circuit",
  "mots_cles_lbc": ["synonyme1", "variante2"]
}

Pour les questions générales, réponds en texte clair et concis.`;

const MOTS_CLES = [
  "Louis XV","Louis XVI","Louis 15","Louis 16",
  "armoire chapeau gendarme","chapeau de gendarme","armoire normande",
  "enfilade","enfilade bahut","buffet bas",
  "commode ancienne","commode bombée","commode Louis XV",
  "buffet deux corps","vaisselier ancien",
  "console ancienne","guéridon","secrétaire ancien",
  "bonnetière","chevet ancien","fauteuil Louis XV",
  "bergère ancienne","meuble estampillé","meuble de style",
  "antiquité campagne","succession meuble",
];

// ─── STYLES ─────────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f7f6f3; --surface: #ffffff; --surface2: #f2f1ee;
    --border: #e8e6e1; --border-strong: #d0cdc6;
    --text: #1a1916; --text-2: #6b6860; --text-3: #9e9b94;
    --accent: #2563eb; --accent-light: #dbeafe;
    --green: #16a34a; --green-light: #dcfce7;
    --amber: #d97706; --amber-light: #fef3c7;
    --red: #dc2626; --red-light: #fee2e2;
    --radius: 12px; --radius-sm: 8px;
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
  }
  html, body { height: 100%; }
  body { background: var(--bg); font-family: 'DM Sans', sans-serif; color: var(--text); font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .layout { display: flex; flex-direction: column; min-height: 100vh; }

  /* TOPBAR */
  .topbar { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
  .topbar-inner { max-width: 900px; margin: 0 auto; padding: 0 20px; height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-icon { width: 32px; height: 32px; background: var(--text); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .brand-name { font-family: 'DM Serif Display', serif; font-size: 18px; letter-spacing: -0.01em; }
  .brand-tag { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); display: none; }
  @media (min-width: 480px) { .brand-tag { display: block; } }
  .nav-pills { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
  .nav-pills::-webkit-scrollbar { display: none; }
  .nav-pill { padding: 6px 13px; border-radius: 20px; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--text-2); cursor: pointer; white-space: nowrap; transition: all 0.15s; }
  .nav-pill:hover { background: var(--surface2); color: var(--text); }
  .nav-pill.active { background: var(--text); color: #fff; }

  /* MAIN */
  .main { flex: 1; max-width: 900px; margin: 0 auto; width: 100%; padding: 28px 20px 80px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }

  /* INPUT */
  .input-card { margin-bottom: 20px; }
  .input-card textarea { width: 100%; border: none; outline: none; resize: none; font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.6; color: var(--text); background: transparent; min-height: 100px; padding: 20px 20px 0; }
  .input-card textarea::placeholder { color: var(--text-3); }
  .input-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); gap: 10px; flex-wrap: wrap; }
  .input-hint { font-size: 12px; color: var(--text-3); }
  .input-actions { display: flex; gap: 8px; }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap; text-decoration: none; }
  .btn-primary { background: var(--text); color: #fff; }
  .btn-primary:hover { background: #2c2b28; transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--border-strong); }
  .btn-ghost { background: none; color: var(--text-2); padding: 8px 10px; font-size: 13px; }
  .btn-ghost:hover { color: var(--text); background: var(--surface2); }
  .btn-danger { background: none; color: var(--red); padding: 6px 8px; font-size: 13px; }
  .btn-danger:hover { background: var(--red-light); }
  .btn-lbc { background: #ff6e14; color: #fff; font-size: 13px; padding: 7px 13px; border-radius: 8px; }
  .btn-lbc:hover { background: #e55e0a; transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .btn-copy { background: var(--surface2); color: var(--text-2); border: 1px solid var(--border); font-size: 12px; padding: 5px 10px; border-radius: 6px; }
  .btn-copy:hover { border-color: var(--border-strong); color: var(--text); }
  .btn-copy.copied { background: var(--green-light); color: var(--green); border-color: #bbf7d0; }

  /* CHAT */
  .chat-wrap { display: flex; flex-direction: column; gap: 12px; }
  .empty-state { text-align: center; padding: 60px 20px; color: var(--text-3); }
  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
  .empty-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--text-2); margin-bottom: 6px; }
  .empty-sub { font-size: 14px; }
  .msg { display: flex; gap: 10px; animation: slideUp 0.25s ease both; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .msg-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
  .msg-user .msg-avatar { background: var(--surface2); border: 1px solid var(--border); }
  .msg-ai .msg-avatar { background: var(--text); color: #fff; font-size: 11px; font-weight: 600; }
  .msg-body { flex: 1; min-width: 0; }
  .msg-bubble { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; font-size: 14px; line-height: 1.65; box-shadow: var(--shadow); }
  .msg-user .msg-bubble { background: var(--surface2); border-color: var(--border); color: var(--text-2); font-style: italic; box-shadow: none; }
  .msg-bubble strong { color: var(--accent); font-weight: 600; }

  /* FICHE */
  .fiche { display: flex; flex-direction: column; gap: 14px; }
  .fiche-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
  .fiche-nom { font-family: 'DM Serif Display', serif; font-size: 20px; letter-spacing: -0.01em; }
  .score-chip { display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .score-high { background: var(--green-light); color: var(--green); }
  .score-mid { background: var(--amber-light); color: var(--amber); }
  .score-low { background: var(--red-light); color: var(--red); }
  .fiche-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  .fiche-cell { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
  .fiche-cell-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); margin-bottom: 3px; }
  .fiche-cell-value { font-size: 14px; font-weight: 500; color: var(--text); }
  .fiche-cell-value.green { color: var(--green); }
  .fiche-cell-value.amber { color: var(--amber); }
  .fiche-cell-value.red { color: var(--red); }
  .fiche-section { border-top: 1px solid var(--border); padding-top: 12px; }
  .fiche-section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); margin-bottom: 8px; }
  .list-items { display: flex; flex-direction: column; gap: 5px; }
  .list-item { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; color: var(--text-2); }
  .list-item .dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; }
  .dot-green { background: var(--green); }
  .dot-red { background: var(--red); }
  .nego-box { background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 14px; color: #1e3a8a; font-style: italic; line-height: 1.6; }
  .tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); background: var(--surface2); color: var(--text-2); }
  .save-row { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; flex-wrap: wrap; align-items: center; }

  /* BOARD */
  .board-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
  .board-title { font-family: 'DM Serif Display', serif; font-size: 22px; letter-spacing: -0.01em; }
  .stats-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .stat-chip { padding: 5px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; font-size: 13px; color: var(--text-2); }
  .stat-chip b { color: var(--text); }
  .annonces-list { display: flex; flex-direction: column; gap: 8px; }
  .annonce-row { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; display: flex; align-items: center; gap: 12px; transition: all 0.15s; box-shadow: var(--shadow); flex-wrap: wrap; }
  .annonce-row:hover { border-color: var(--border-strong); }
  .annonce-row.selected { border-color: var(--accent); background: #f0f6ff; }
  .annonce-main { flex: 1; min-width: 180px; }
  .annonce-name { font-weight: 600; font-size: 15px; margin-bottom: 3px; }
  .annonce-sub { font-size: 13px; color: var(--text-3); display: flex; gap: 12px; flex-wrap: wrap; }
  .annonce-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .verdict-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .verdict-ok { background: var(--green-light); color: var(--green); }
  .verdict-warn { background: var(--amber-light); color: var(--amber); }
  .verdict-bad { background: var(--red-light); color: var(--red); }
  .score-dot { font-size: 13px; font-weight: 600; color: var(--text-2); background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; }

  /* CIRCUIT */
  .circuit-info { font-size: 14px; color: var(--text-2); margin-bottom: 16px; line-height: 1.6; }
  .circuit-result { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; font-size: 14px; line-height: 1.8; color: var(--text-2); white-space: pre-wrap; box-shadow: var(--shadow); }
  .circuit-result strong { color: var(--text); font-weight: 600; }

  /* RECHERCHES */
  .recherches-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
  .region-select { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); outline: none; cursor: pointer; }
  .region-select:focus { border-color: var(--accent); }
  .budget-input { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); width: 100px; outline: none; }
  .budget-input:focus { border-color: var(--accent); }
  .recherches-grid { display: flex; flex-direction: column; gap: 16px; }
  .recherche-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
  .recherche-section-header { padding: 12px 16px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .recherche-section-icon { font-size: 16px; }
  .recherche-section-title { font-weight: 600; font-size: 14px; }
  .recherche-items { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .recherche-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); flex-wrap: wrap; }
  .recherche-item-label { font-size: 14px; font-weight: 500; color: var(--text); flex: 1; min-width: 120px; }
  .recherche-item-url { font-size: 11px; color: var(--text-3); margin-top: 2px; word-break: break-all; }
  .recherche-item-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

  /* GÉNÉRATEUR CUSTOM */
  .generator-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); margin-bottom: 20px; }
  .generator-title { font-family: 'DM Serif Display', serif; font-size: 18px; margin-bottom: 14px; }
  .generator-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
  .generator-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 180px; }
  .generator-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); }
  .generator-input { padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); background: var(--bg); outline: none; }
  .generator-input:focus { border-color: var(--accent); background: #fff; }
  .generated-url-box { margin-top: 14px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; font-size: 13px; color: var(--text-2); word-break: break-all; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .generated-url-text { flex: 1; line-height: 1.5; }

  /* MOTS-CLES */
  .kw-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
  .kw-chip { padding: 7px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text); cursor: pointer; transition: all 0.15s; box-shadow: var(--shadow); }
  .kw-chip:hover { background: var(--text); color: #fff; border-color: var(--text); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .tips-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); }
  .tips-title { font-family: 'DM Serif Display', serif; font-size: 18px; margin-bottom: 16px; }
  .tips-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .tip-item { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; }
  .tip-item-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
  .tip-item p { font-size: 13px; color: var(--text-2); line-height: 1.6; }

  .section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3); margin-bottom: 12px; }
  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .loading-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: var(--text-3); }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--text); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 520px) {
    .topbar-inner { padding: 0 14px; }
    .main { padding: 20px 14px 80px; }
    .fiche-grid { grid-template-columns: 1fr 1fr; }
    .recherche-item { flex-direction: column; align-items: flex-start; }
  }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function renderText(text) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function CopyBtn({ text, label = "Copier" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className={`btn btn-copy ${copied ? "copied" : ""}`} onClick={copy}>
      {copied ? "✓ Copié" : label}
    </button>
  );
}

// ─── FICHE ───────────────────────────────────────────────────────────────────
function FicheCard({ fiche, onSave, saved }) {
  const sc = fiche.score || 0;
  const scoreClass = sc >= 70 ? "score-high" : sc >= 45 ? "score-mid" : "score-low";
  const verdictCls = fiche.verdict === "OK" ? "green" : fiche.verdict === "ATTENTION" ? "amber" : "red";
  const lbcUrl = buildLBCUrl(fiche.titre || fiche.style || "meuble ancien");

  return (
    <div className="fiche">
      <div className="fiche-top">
        <div className="fiche-nom">{fiche.titre}</div>
        <div className={`score-chip ${scoreClass}`}>★ {sc} — {fiche.score_label}</div>
      </div>

      <div className="fiche-grid">
        {[
          ["Style", fiche.style, ""],
          ["Ville", `${fiche.ville}, ${fiche.region}`, ""],
          ["Distance HDF", fiche.distance_hdf, ""],
          ["Prix demandé", fiche.prix_demande, ""],
          ["Valeur estimée", fiche.valeur_estimee, "amber"],
          ["Verdict", fiche.verdict, verdictCls],
        ].map(([label, val, cls]) => (
          <div className="fiche-cell" key={label}>
            <div className="fiche-cell-label">{label}</div>
            <div className={`fiche-cell-value ${cls}`}>{val || "—"}</div>
          </div>
        ))}
      </div>

      {fiche.points_forts?.length > 0 && (
        <div className="fiche-section">
          <div className="fiche-section-title">Points forts</div>
          <div className="list-items">
            {fiche.points_forts.map((p, i) => (
              <div className="list-item" key={i}><div className="dot dot-green" />{p}</div>
            ))}
          </div>
        </div>
      )}

      {fiche.red_flags?.length > 0 && (
        <div className="fiche-section">
          <div className="fiche-section-title">Red flags</div>
          <div className="list-items">
            {fiche.red_flags.map((f, i) => (
              <div className="list-item" key={i} style={{ color: "var(--red)" }}><div className="dot dot-red" />{f}</div>
            ))}
          </div>
        </div>
      )}

      {fiche.conseil_nego && (
        <div className="fiche-section">
          <div className="fiche-section-title">Message de négociation</div>
          <div className="nego-box">"{fiche.conseil_nego}"</div>
        </div>
      )}

      {fiche.note_logistique && (
        <div className="fiche-section">
          <div className="fiche-section-title">Note logistique</div>
          <p style={{ fontSize: "14px", color: "var(--text-2)" }}>{fiche.note_logistique}</p>
        </div>
      )}

      {fiche.mots_cles_lbc?.length > 0 && (
        <div className="fiche-section">
          <div className="fiche-section-title">Mots-clés associés</div>
          <div className="tags-row">
            {fiche.mots_cles_lbc.map((kw, i) => <span className="tag" key={i}>{kw}</span>)}
          </div>
        </div>
      )}

      <div className="save-row">
        <CopyBtn text={lbcUrl} label="🔗 Copier URL LBC" />
        <a className="btn btn-lbc" href={lbcUrl} target="_blank" rel="noreferrer">
          Chercher sur LBC →
        </a>
        {saved
          ? <span style={{ fontSize: "13px", color: "var(--green)" }}>✓ Sauvegardée</span>
          : <button className="btn btn-primary" style={{ fontSize: "13px", padding: "7px 14px" }} onClick={onSave}>+ Sauvegarder</button>
        }
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("analyse");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState([]);
  const [circuitSel, setCircuitSel] = useState([]);
  const [circuitResult, setCircuitResult] = useState(null);
  const [circuitLoading, setCircuitLoading] = useState(false);

  // Recherches settings
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [budget, setBudget] = useState(300);
  const [customKw, setCustomKw] = useState("");
  const [customRegion, setCustomRegion] = useState(null);
  const [customBudget, setCustomBudget] = useState(300);
  const [generatedUrl, setGeneratedUrl] = useState("");

  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const callClaude = async (userMsg, sysOverride) => {
    const history = messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.text }));
    history.push({ role: "user", content: userMsg });
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: sysOverride || SYSTEM_PROMPT,
        messages: history,
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  };

  const analyse = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim(); setInput("");
    setMessages(p => [...p, { role: "user", text: txt }]);
    setLoading(true);
    try {
      const raw = await callClaude(`Analyse cette annonce et retourne uniquement le JSON :\n\n${txt}`);
      let fiche = null;
      try { fiche = JSON.parse(raw.replace(/```json?|```/g, "").trim()); } catch (_) {}
      setMessages(p => [...p, { role: "assistant", text: raw, fiche }]);
    } catch (_) {
      setMessages(p => [...p, { role: "assistant", text: "Erreur de connexion. Réessaie.", fiche: null }]);
    }
    setLoading(false);
  };

  const question = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim(); setInput("");
    setMessages(p => [...p, { role: "user", text: txt }]);
    setLoading(true);
    try {
      const raw = await callClaude(txt, SYSTEM_PROMPT + "\nRéponds en texte clair, pas de JSON.");
      setMessages(p => [...p, { role: "assistant", text: raw, fiche: null }]);
    } catch (_) {
      setMessages(p => [...p, { role: "assistant", text: "Erreur.", fiche: null }]);
    }
    setLoading(false);
  };

  const toggleCircuit = (id) => setCircuitSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const genCircuit = async () => {
    const sel = saved.filter(a => circuitSel.includes(a.id));
    if (sel.length < 2) return;
    setCircuitLoading(true); setCircuitResult(null);
    try {
      const raw = await callClaude(
        `Optimise un circuit depuis les Hauts-de-France pour récupérer ces ${sel.length} meubles en un voyage. Donne l'ordre, les villes, le km total estimé, et des conseils pratiques.\n\n${sel.map((a, i) => `${i + 1}. ${a.titre} — ${a.ville}, ${a.region} (${a.distance_hdf})`).join("\n")}`,
        SYSTEM_PROMPT + "\nRéponds en texte structuré, pas de JSON."
      );
      setCircuitResult(raw);
    } catch (_) { setCircuitResult("Erreur lors du calcul."); }
    setCircuitLoading(false);
  };

  const totalBudget = saved.reduce((s, a) => {
    const n = parseInt((a.prix_demande || "").replace(/[^\d]/g, ""));
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  const TABS = [
    { key: "analyse", label: "Analyser" },
    { key: "recherches", label: "Recherches LBC" },
    { key: "board", label: `Annonces${saved.length ? ` (${saved.length})` : ""}` },
    { key: "circuit", label: "Circuit" },
    { key: "motscles", label: "Mots-clés" },
  ];

  return (
    <>
      <style>{STYLE}</style>
      <div className="layout">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <div className="brand-icon">🪑</div>
              <div className="brand-name">Chineur HDF</div>
              <div className="brand-tag">Le Bon Coin</div>
            </div>
            <nav className="nav-pills">
              {TABS.map(t => (
                <button key={t.key} className={`nav-pill ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="main">

          {/* ── ANALYSER ── */}
          {tab === "analyse" && (
            <>
              <div className="card input-card">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={"Colle le texte d'une annonce Le Bon Coin…\n\nAstuce : sur LBC, fais Ctrl+A puis Ctrl+C sur la page de l'annonce et colle ici.\n\nOu pose une question libre sur les meubles, la négociation, les mots-clés…"}
                  onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) analyse(); }}
                />
                <div className="input-footer">
                  <span className="input-hint">Ctrl+Entrée pour analyser</span>
                  <div className="input-actions">
                    {input && <button className="btn btn-ghost" onClick={() => setInput("")}>Effacer</button>}
                    <button className="btn btn-secondary" onClick={question} disabled={loading || !input.trim()}>Question libre</button>
                    <button className="btn btn-primary" onClick={analyse} disabled={loading || !input.trim()}>
                      {loading ? "Analyse…" : "Analyser →"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="chat-wrap">
                {messages.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <div className="empty-title">Prêt à chiner</div>
                    <div className="empty-sub">Colle le texte d'une annonce pour obtenir une analyse complète</div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`msg msg-${m.role === "user" ? "user" : "ai"}`}>
                    <div className="msg-avatar">{m.role === "user" ? "👤" : "AI"}</div>
                    <div className="msg-body">
                      <div className="msg-bubble">
                        {m.fiche
                          ? <FicheCard
                              fiche={m.fiche}
                              onSave={() => setSaved(p => [{ id: Date.now(), ...m.fiche }, ...p])}
                              saved={saved.some(a => a.titre === m.fiche.titre && a.ville === m.fiche.ville)}
                            />
                          : <div style={{ whiteSpace: "pre-wrap" }}>{renderText(m.text)}</div>
                        }
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="msg msg-ai">
                    <div className="msg-avatar">AI</div>
                    <div className="msg-body">
                      <div className="msg-bubble">
                        <div className="loading-row"><div className="spinner" /> Analyse en cours…</div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </>
          )}

          {/* ── RECHERCHES LBC ── */}
          {tab === "recherches" && (
            <>
              {/* Générateur custom */}
              <div className="generator-card">
                <div className="generator-title">Générateur de recherche</div>
                <div className="generator-row">
                  <div className="generator-field">
                    <label className="generator-label">Mot-clé</label>
                    <input
                      className="generator-input"
                      placeholder="Ex : commode Louis XV"
                      value={customKw}
                      onChange={e => setCustomKw(e.target.value)}
                    />
                  </div>
                  <div className="generator-field" style={{ maxWidth: "200px" }}>
                    <label className="generator-label">Région</label>
                    <select
                      className="generator-input"
                      value={customRegion || ""}
                      onChange={e => setCustomRegion(e.target.value || null)}
                    >
                      {LBC_REGIONS.map(r => (
                        <option key={r.label} value={r.code || ""}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="generator-field" style={{ maxWidth: "120px" }}>
                    <label className="generator-label">Budget max (€)</label>
                    <input
                      className="generator-input"
                      type="number"
                      value={customBudget}
                      min={0} max={5000}
                      onChange={e => setCustomBudget(Number(e.target.value))}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setGeneratedUrl(buildLBCUrl(customKw || "meuble ancien", customBudget, customRegion))}
                    disabled={!customKw.trim()}
                  >
                    Générer →
                  </button>
                </div>
                {generatedUrl && (
                  <div className="generated-url-box">
                    <div className="generated-url-text">{generatedUrl}</div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
                      <CopyBtn text={generatedUrl} label="Copier" />
                      <a className="btn btn-lbc" href={generatedUrl} target="_blank" rel="noreferrer">Ouvrir →</a>
                    </div>
                  </div>
                )}
              </div>

              {/* Filtres globaux */}
              <div className="recherches-header">
                <div className="board-title">Recherches prêtes</div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="region-select"
                    value={selectedRegion || ""}
                    onChange={e => setSelectedRegion(e.target.value || null)}
                  >
                    {LBC_REGIONS.map(r => (
                      <option key={r.label} value={r.code || ""}>{r.label}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-2)" }}>Max</span>
                    <input
                      className="budget-input"
                      type="number"
                      value={budget}
                      min={0} max={5000}
                      onChange={e => setBudget(Number(e.target.value))}
                    />
                    <span style={{ fontSize: "13px", color: "var(--text-2)" }}>€</span>
                  </div>
                </div>
              </div>

              <div className="recherches-grid">
                {RECHERCHES_PRESET.map(section => (
                  <div className="recherche-section" key={section.categorie}>
                    <div className="recherche-section-header">
                      <span className="recherche-section-icon">{section.icon}</span>
                      <span className="recherche-section-title">{section.categorie}</span>
                    </div>
                    <div className="recherche-items">
                      {section.items.map(item => {
                        const url = buildLBCUrl(item.kw, budget, selectedRegion);
                        return (
                          <div className="recherche-item" key={item.label}>
                            <div>
                              <div className="recherche-item-label">{item.label}</div>
                              <div className="recherche-item-url">{item.kw}</div>
                            </div>
                            <div className="recherche-item-actions">
                              <CopyBtn text={url} label="🔗 URL" />
                              <a className="btn btn-lbc" href={url} target="_blank" rel="noreferrer">
                                Ouvrir →
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── BOARD ── */}
          {tab === "board" && (
            <>
              <div className="board-header">
                <div className="board-title">Mes annonces</div>
                <div className="stats-row">
                  <div className="stat-chip"><b>{saved.length}</b> annonces</div>
                  <div className="stat-chip">Budget total : <b>{totalBudget}€</b></div>
                </div>
              </div>
              {saved.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">Aucune annonce</div>
                  <div className="empty-sub">Analyse une annonce et clique sur "Sauvegarder"</div>
                </div>
              ) : (
                <div className="annonces-list">
                  {saved.map(a => {
                    const lbcUrl = buildLBCUrl(a.titre || a.style || "meuble ancien");
                    return (
                      <div key={a.id} className={`annonce-row ${circuitSel.includes(a.id) ? "selected" : ""}`}>
                        <div className="annonce-main">
                          <div className="annonce-name">{a.titre}</div>
                          <div className="annonce-sub">
                            <span>📍 {a.ville}, {a.region}</span>
                            <span>💶 {a.prix_demande}</span>
                            <span>{a.distance_hdf}</span>
                          </div>
                        </div>
                        <div className="annonce-right">
                          <span className={`verdict-badge verdict-${a.verdict === "OK" ? "ok" : a.verdict === "ATTENTION" ? "warn" : "bad"}`}>{a.verdict}</span>
                          <span className="score-dot">★ {a.score}</span>
                          <CopyBtn text={lbcUrl} label="🔗" />
                          <a className="btn btn-lbc" href={lbcUrl} target="_blank" rel="noreferrer" style={{fontSize:"12px",padding:"5px 10px"}}>LBC</a>
                          <button className="btn btn-ghost" style={{ fontSize: "12px", padding: "5px 10px" }} onClick={() => toggleCircuit(a.id)}>
                            {circuitSel.includes(a.id) ? "✓ Circuit" : "+ Circuit"}
                          </button>
                          <button className="btn btn-danger" onClick={() => setSaved(p => p.filter(x => x.id !== a.id))}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── CIRCUIT ── */}
          {tab === "circuit" && (
            <>
              <div className="board-header">
                <div className="board-title">Circuit de ramassage</div>
              </div>
              {saved.length < 2 ? (
                <div className="empty-state">
                  <div className="empty-icon">🗺️</div>
                  <div className="empty-title">Pas encore assez d'annonces</div>
                  <div className="empty-sub">Sauvegarde au moins 2 annonces pour optimiser un circuit</div>
                </div>
              ) : (
                <>
                  <p className="circuit-info">Sélectionne les annonces à inclure. L'IA optimise l'itinéraire depuis les Hauts-de-France.</p>
                  <div className="annonces-list" style={{ marginBottom: "16px" }}>
                    {saved.map(a => (
                      <div key={a.id} className={`annonce-row ${circuitSel.includes(a.id) ? "selected" : ""}`} style={{ cursor: "pointer" }} onClick={() => toggleCircuit(a.id)}>
                        <div style={{ fontSize: "18px", color: circuitSel.includes(a.id) ? "var(--accent)" : "var(--border-strong)" }}>
                          {circuitSel.includes(a.id) ? "●" : "○"}
                        </div>
                        <div className="annonce-main">
                          <div className="annonce-name">{a.titre}</div>
                          <div className="annonce-sub">
                            <span>📍 {a.ville}, {a.region}</span>
                            <span>{a.distance_hdf}</span>
                            <span>💶 {a.prix_demande}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" onClick={genCircuit} disabled={circuitSel.length < 2 || circuitLoading}>
                    {circuitLoading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Calcul…</> : `Optimiser le circuit (${circuitSel.length} étapes) →`}
                  </button>
                  {circuitResult && (
                    <>
                      <div className="divider" />
                      <div className="section-label">Itinéraire optimisé</div>
                      <div className="circuit-result">{renderText(circuitResult)}</div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ── MOTS-CLES ── */}
          {tab === "motscles" && (
            <>
              <div className="board-header">
                <div className="board-title">Mots-clés Le Bon Coin</div>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "16px", lineHeight: "1.6" }}>
                Clique pour obtenir des variantes optimisées dans l'onglet Analyser.
              </p>
              <div className="kw-grid">
                {MOTS_CLES.map((kw, i) => (
                  <button key={i} className="kw-chip" onClick={() => {
                    setInput(`Quels sont les meilleurs mots-clés LBC pour : "${kw}" ? Inclus les fautes courantes des vendeurs et les synonymes.`);
                    setTab("analyse");
                  }}>
                    {kw}
                  </button>
                ))}
              </div>
              <div className="tips-card">
                <div className="tips-title">Conseils de recherche</div>
                <div className="tips-grid">
                  {[
                    ["Orthographe vendeurs", "Teste : \"Louis 15\", \"L15\", \"de style\", \"époque\", \"ancien\" — les vendeurs écrivent souvent approximativement."],
                    ["Filtres efficaces", "Catégorie Maison › Meubles, prix max 300€, active les alertes email pour chaque recherche."],
                    ["Régions à prioriser", "Normandie, Centre-Val de Loire, Île-de-France, Bretagne — riches en meubles de style."],
                    ["Successions", "Cherche \"vide maison\", \"succession\", \"déménagement\" combinés aux styles pour de bonnes affaires."],
                  ].map(([t, p]) => (
                    <div className="tip-item" key={t}>
                      <div className="tip-item-title">{t}</div>
                      <p>{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </>
  );
}
