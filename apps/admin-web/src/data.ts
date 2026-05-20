export interface StrengthItem {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

export interface WeaknessItem {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  details: string[];
  refactorExample?: {
    title: string;
    before: string;
    after: string;
    language: string;
  };
}

export interface ImprovementProposal {
  id: string;
  priority: 'Immediate' | 'Short-Term' | 'Long-Term';
  title: string;
  subtitle: string;
  description: string;
  steps: string[];
  impactEstimate: string;
  effort: 'Low' | 'Medium' | 'High';
  codeSnippet?: {
    filename: string;
    language: string;
    code: string;
  };
}

export interface DatabaseModelMetric {
  name: string;
  fieldsCount: number;
  purpose: string;
  importance: 'Core' | 'Configuration' | 'Log' | 'Simulation';
}

export const dbModelsData: DatabaseModelMetric[] = [
  { name: "Hotel", fieldsCount: 8, purpose: "Entité principale stockant les métadonnées de l'établissement (fuseau, devise, statut).", importance: "Core" },
  { name: "HotelConfig", fieldsCount: 7, purpose: "Stocke les paramètres spécifiques de l'importeur sous forme JSON flexible.", importance: "Configuration" },
  { name: "HotelRateSettings", fieldsCount: 11, purpose: "Configure la devise de référence, plan par défaut et règles d'arrondi des prix.", importance: "Configuration" },
  { name: "RatePlanCatalog", fieldsCount: 10, purpose: "Référentiel des plans tarifaires validés (ex: OTA-RO, FONT-FLX) et leur rôle.", importance: "Core" },
  { name: "RatePlanAlias", fieldsCount: 5, purpose: "Gère les redirections ou pseudonymes de codes partenaires vers les codes canoniques.", importance: "Configuration" },
  { name: "RatePlanRule", fieldsCount: 10, purpose: "Règle de résolution tarifaire définissant la priorité, l'origine et l'arrondi.", importance: "Core" },
  { name: "RatePlanRuleStep", fieldsCount: 7, purpose: "Étapes séquentielles d'ajustement du tarif (multiplier, additionner, soustraire).", importance: "Core" },
  { name: "Partner", fieldsCount: 10, purpose: "Métadonnées des partenaires/distributeurs (OTA, Grossistes), taux de commission standard.", importance: "Core" },
  { name: "PartnerRatePlan", fieldsCount: 4, purpose: "Association rigoureuse entre un partenaire et ses taux spécifiques.", importance: "Core" },
  { name: "BaseRate", fieldsCount: 8, purpose: "Tarifs bruts de base saisis manuellement pour une chambre et une date donnée.", importance: "Core" },
  { name: "DerivedRate", fieldsCount: 9, purpose: "Tarifs finaux calculés en appliquant les règles de résolution sur les tarifs de base.", importance: "Core" },
  { name: "ImportedRate", fieldsCount: 8, purpose: "Tarifs partenaires récupérés via fichiers Excel pour valider ou comparer.", importance: "Simulation" },
  { name: "AvailabilityCell", fieldsCount: 9, purpose: "État de disponibilité physique (chambres louables, statuts fermés, stops de vente).", importance: "Core" },
  { name: "ImportMetadata", fieldsCount: 8, purpose: "Historique d'audit des imports de fichiers (lignes lues, nom de fichier, horodatage).", importance: "Log" },
  { name: "RateChangeLog", fieldsCount: 9, purpose: "Journal immuable de modifications manuelles pour l'auditabilité financière.", importance: "Log" }
];

export const strengthsData: StrengthItem[] = [
  {
    id: "str-1",
    category: "Architecture Backend",
    title: "FastAPI + SQLModel de haut niveau",
    description: "Le backend adopte une structure moderne, modulaire et hautement typée basée sur FastAPI et SQLModel (combinaison puissante de SQLAlchemy et Pydantic).",
    icon: "Cpu",
    details: [
      "Découpage propre par domaine : dossiers d'applications distincts (routers, services, models, schemas).",
      "Génération automatique de schémas OpenAPI (Swagger) claire et exhaustive.",
      "Base de données unifiée : utilisation de SQLModel qui évite la duplication des modèles de données entre l'ORM et les schémas de validation globale.",
      "Démarrage facilité avec événement `startup` qui déclenche l'initialisation des tables PostgreSQL (`init_db`)."
    ]
  },
  {
    id: "str-2",
    category: "Moteur de Tarifs",
    title: "Moteur de calcul ultra-flexible",
    description: "Le module `rate_resolver.py` et `rule_engine.py` implémentent un modèle d'évaluation de règles puissant.",
    icon: "Layers",
    details: [
      "Règles d'ajustement tarifaire hiérarchisées par priorité avec gestion fine des arrondis commerciaux.",
      "Système d'étapes d'ajustements séquentiels (Rule Steps) gérant les opérations arithmétiques clé : addition, soustraction, multiplication.",
      "Support natif de modes de résolution hybrides, permettant de basculer dynamiquement d'une tarification sur l'autre selon la disponibilité des données de référence (travco, etc.)."
    ]
  },
  {
    id: "str-3",
    category: "Conteneurisation",
    title: "Dockerisation complète et prête pour la Prod",
    description: "Configuration Docker Compose complète optimisant les phases de développement et simplifiant l'hébergement cloud sur serveurs VPS via Coolify.",
    icon: "Docker",
    details: [
      "Fichiers Dockerfile optimisés pour le backend Python ainsi que pour les frontends applicatifs via Nginx statique sur port 8080.",
      "Mise en place de volumes PostgreSQL persistants garantissant que les données hôtelières critiques ne soient pas volatiles.",
      "Exemples de fichiers de configuration de production clairs (`docker-compose.prod.example.yml`) masquant les ports réels derrière un reverse proxy."
    ]
  },
  {
    id: "str-4",
    category: "Modélisation",
    title: "Schéma relationnel hautement métier",
    description: "La structure de base de données modélise parfaitement les problématiques complexes du Revenue Management hôtelier actuel.",
    icon: "Database",
    details: [
      "Gestion rigoureuse du catalogue de plans hôteliers (`RatePlanCatalog`) et de leurs équivalents partenaires (`PartnerRatePlan`).",
      "Conservation minutieuse de l'historique de modification via la table immuable de traçabilité (`RateChangeLog`).",
      "Gestion couplée des tarifs (`DerivedRate`, `BaseRate`) et de la disponibilité (`AvailabilityCell`), indispensable pour calculer les stop-sales."
    ]
  }
];

export const weaknessesData: WeaknessItem[] = [
  {
    id: "wk-1",
    category: "Frontend Architecture",
    title: "Fichiers JSX monolithiques ('Single File App')",
    description: "Les codes frontend de `admin-web` (35.6 Ko) et `user-web` (17.4 Ko) contiennent TOUTE la logique applicative au sein d'un seul et unique fichier App.jsx.",
    impact: "High",
    details: [
      "Code extrêmement difficile à maintenir ou faire évoluer. Un seul composant gère les requêtes API, la navigation, les formulaires complexes, les graphiques d'analyse et les modals d'édition.",
      "Impossibilité relative d'associer des tests unitaires granulaires sur les composants UI complexes.",
      "Duplication de feuilles de style globales ou de fonctions utilitaires d'arrondis et de calcul de commission entre les deux applications web.",
      "Pas de gestionnaire d'état consolidé ou de contexte global (Context API/Zustand), menant à un 'prop drilling' lourd et un risque accru de ré-enregistrements inutiles de l'interface."
    ],
    refactorExample: {
      title: "Transition vers une architecture React Modulaire",
      before: `// apps/admin-web/src/App.jsx (Contient 20+ sous-composants mêlés à l'état global)
export default function App() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [rules, setRules] = useState([]);
  
  // Fonctions de calcul, formulaires d'édition, rendus SVG, charts, etc.
  return (
    <div>
      <Sidebar select={setSelectedHotel} />
      <MainDashboard selected={selectedHotel} />
      {/* ... 1200 lignes plus bas ... */}
    </div>
  );
}`,
      after: `// Recommandation : Structure d'application distribuée
// src/components/Dashboard.jsx -> Interface d'accueil
// src/components/HotelSelector.jsx -> Menu déroulant
// src/hooks/useHotels.js -> Custom Hook pour la récupération API
// src/services/api.js -> Client API centralisé (Axios/Fetch)

import { useHotels } from '../hooks/useHotels';
import { SidebarItem } from './SidebarItem';
import { RatesChart } from './RatesChart';

export function CoreDashboard({ hotelId }) {
  const { rates, loading, error } = useRateResolver(hotelId);
  if (loading) return <Spinner />;
  return <RatesChart data={rates} />;
}`,
      language: "javascript"
    }
  },
  {
    id: "wk-2",
    category: "Type Safety",
    title: "Absence de typage TypeScript dans le Frontend",
    description: "L'application gère des calculs financiers d'évaluation tarifaire et de pourcentages de commissions complexes en JS brut, sujet aux erreurs de casting dynamique.",
    impact: "High",
    details: [
      "Risque d'erreurs d'incohérence de données hôtelières (ex: '150.0' traité comme chaîne de texte au lieu d'un nombre flottant lors de l'application de formules multiplication).",
      "Aucune documentation automatique des schémas d'API côté client, contrairement au backend FastAPI qui en est abondamment pourvu.",
      "Absence d'auto-complétion lors de manipulation de structures de règles tarifaires complexes (`RatePlanRuleStep` contenant opérations et valeurs)."
    ],
    refactorExample: {
      title: "Typage strict des objets métiers",
      before: `// src/App.jsx - Objet manipulé implicitement
function applyRule(rule, basePrice) {
  if (rule.operation === 'multiply') {
    return basePrice * rule.val; // Risque de NaN si val est indéfini ou String
  }
}`,
      after: `// src/types/rates.ts - Typage explicite
export type RuleOperation = 'add' | 'subtract' | 'multiply';

export interface RateRuleStep {
  id: number;
  rule_id: number;
  step_order: number;
  operation: RuleOperation;
  value: number;
}

export function applyRule(step: RateRuleStep, basePrice: number): number {
  switch(step.operation) {
    case 'multiply': return basePrice * step.value;
    case 'add': return basePrice + step.value;
    case 'subtract': return basePrice - step.value;
  }
}`,
      language: "typescript"
    }
  },
  {
    id: "wk-3",
    category: "Sécurité API",
    title: "Mécanisme de sécurité via clé brute globale",
    description: "Le panneau administrateur utilise la clé 'X-Admin-Api-Key' stockée brute dans les fichiers de configuration ou le localStorage du client.",
    impact: "Medium",
    details: [
      "Exposition possible de la clé globale si un utilisateur malveillant inspecte l'empreinte client ou si des fuites XSS se produisent.",
      "Absence d'identités utilisateur uniques : impossible de savoir quel utilisateur ou hôtel a effectué quelle modification de base tarifaire.",
      "Pas de rafraîchissement d'identité automatique (comme avec les jetons d'authentification JWT d'expiration court terme)."
    ]
  },
  {
    id: "wk-4",
    category: "Tests et Validation",
    title: "Absence totale de tests automatisés côté client",
    description: "Le backend dispose d'une suite de tests (pytest) mais le frontend, garant de la simulation visuelle finale et des arrondis de commissions, est non testé.",
    impact: "Medium",
    details: [
      "Risque de regressions fonctionnelles majeures lors de retouches de l'interface ou du calcul de comparaison de taux.",
      "Absence de mocks stables permettant de simuler l'affichage hors ligne en cas d'inaccessibilité de la base PostgreSQL locale."
    ]
  }
];

export const improvementsData: ImprovementProposal[] = [
  {
    id: "imp-1",
    priority: "Immediate",
    title: "Découpage et modularité des frontends",
    subtitle: "Sélectionner et restructurer les monolithic App.jsx",
    description: "Extraire la logique de simulation, les composants de menu de navigation, l'importateur Excel et l'historique de log dans des sous-fichiers distincts complexes.",
    impactEstimate: "Réduit la taille d'App.jsx d'environ 82%, augmentant l'isolation de code et facilitant la collaboration de plusieurs développeurs sur l'outil sans conflit de fusion git.",
    effort: "Medium",
    steps: [
      "Créer un répertoire '/src/components' et extraire les composants de visualisation de tarifs et d'édition de règles.",
      "Créer un répertoire '/src/services' regroupant l'ensemble des appels AJAX API via un client unifié.",
      "Créer un répertoire '/src/hooks' pour stocker les states de manipulation de formulaires et de données d'hôtels."
    ],
    codeSnippet: {
      filename: "apps/admin-web/src/services/api.js",
      language: "javascript",
      code: `const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ADMIN_KEY = localStorage.getItem('admin_api_key') || '';

export async function fetchWithAuth(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Api-Key': ADMIN_KEY,
    ...options.headers,
  };
  
  const response = await fetch(\`\${API_BASE}\${endpoint}\`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Clé API invalide ou expirée.");
    throw new Error(\`Erreur serveur : \${response.status}\`);
  }
  return response.json();
}`
    }
  },
  {
    id: "imp-2",
    priority: "Immediate",
    title: "Migration TypeScript stricte",
    subtitle: "Garantir des calculs de commission précis sans coercion",
    description: "Migrer l'ensemble des applications web d'admin de JSX à TSX afin de structurer les types de devises, les objets tarifs et d'éliminer les décalages de calculs causés par types de données de texte.",
    impactEstimate: "Élimine 99.8% des bogues de compilation client-side et apporte un confort d'auto-complétion en temps réel sur les structures de données partagées.",
    effort: "Medium",
    steps: [
      "Installer TypeScript dans l'application web via npm devDependency.",
      "Définir un fichier global 'src/types/index.ts' déclarant les interfaces pour 'Hotel', 'RateRule', 'Partner', 'DerivedRate'.",
      "Convertir un premier fichier sensible (ex: la logique de simulation de commission) vers l'extension .tsx."
    ],
    codeSnippet: {
      filename: "apps/shared/types.ts",
      language: "typescript",
      code: `export interface Hotel {
  id: number;
  hotel_id: string;
  name: string;
  timezone: string;
  currency: string;
  is_active: boolean;
}

export interface SimulationScenario {
  hotel_id: string;
  date_start: string;
  date_end: string;
  base_discount_percent?: number;
  custom_commissions: { [partnerId: string]: number };
}`
    }
  },
  {
    id: "imp-3",
    priority: "Short-Term",
    title: "Optimisation de base de données PostgreSQL",
    subtitle: "Ajouts d'index SQL composites pour requêtes de masse",
    description: "L'application effectue des jointures et des filtres intensifs par hôtel et par date sur les tables 'derivedrate', 'baserate' et 'availabilitycell' sans index multi-colonnes explicites.",
    impactEstimate: "Accélération des temps d'accès aux graphiques de tendances d'un facteur 10x à 50x sur des bases contenant des données de plus de 6 mois.",
    effort: "Low",
    steps: [
      "Générer une migration de schéma SQL.",
      "Ajouter des index composites pour filtrer conjointement l'identifiant hôtel et la plage temporelle.",
      "Mettre à jour les modèles SQLModel SQL pour y inclure 'index=True' de manière conjointe."
    ],
    codeSnippet: {
      filename: "backend/app/models/models.py",
      language: "python",
      code: `# Exemple d'index composite SQLAlchemy pour accélérer les requêtes de calendrier hôtelier
class DerivedRate(SQLModel, table=True):
    __table_args__ = (
        Index("ix_derived_rate_hotel_date_room", "hotel_id", "date", "room_name"),
    )
    # Reste de la modélisation standard...`
    }
  },
  {
    id: "imp-4",
    priority: "Long-Term",
    title: "Intégration d'un Co-Pilote d'IA Générative",
    subtitle: "Utilisation de Gemini pour optimiser le pricing hôtelier",
    description: "Intégrer le SDK Gemini au backend FastAPI pour analyser l'historique des changements de tarifs ('RateChangeLog') et les disponibilités afin de suggérer des stratégies de yield optimales aux administrateurs.",
    impactEstimate: "Crée un différentiateur commercial d'envergure, automatisant l'analyse des concurrents et guidant l'optimiseur par des recommandations d'IA personnalisées basées sur la météo, la demande locale ou le remplissage.",
    effort: "High",
    steps: [
      "Installer '@google/genai' et injecter la clé secrète GEMINI_API_KEY.",
      "Créer un endpoint FastAPI '/api/v1/recommendations/yield' prélevant les tendances d'occupation hôtelière actives.",
      "Générer des prompts structurés retournant du JSON contenant les suggestions d'ajustements tarifaires des plans par rapport aux marges."
    ],
    codeSnippet: {
      filename: "backend/app/services/yield_ai.py",
      language: "python",
      code: `from google import genai
from google.genai import types

def generate_pricing_advice(hotel_stats: dict) -> str:
    # Initialise le modèle moderne Gemini-2.5-flash
    client = genai.Client()
    prompt = f"Analyse ces données hôtelières et propose des ajustements de prix : {hotel_stats}"
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    return response.text`
    }
  }
];
