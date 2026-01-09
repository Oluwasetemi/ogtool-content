import { AlgorithmConfig, TopicFormat } from './types';

// ============================================================================
// Algorithm Configuration
// ============================================================================

export const ALGORITHM_CONFIG: AlgorithmConfig = {
  weights: {
    naturalness: 0.30,
    distribution: 0.25,
    consistency: 0.20,
    diversity: 0.15,
    timing: 0.10,
  },
  thresholds: {
    minQualityScore: 7.0,
    maxRetries: 5,
    topicSimilarityThreshold: 0.75, // cosine similarity
    maxPersonaRatio: 3.0, // max usage / min usage
  },
  timing: {
    minCommentGap: 8, // minutes
    maxCommentGap: 30, // minutes
    workingHoursStart: 8, // 8am
    workingHoursEnd: 21, // 9pm
  },
};

// ============================================================================
// Scoring Weights
// ============================================================================

export const SUBREDDIT_SELECTION_WEIGHTS = {
  cultureMatch: 0.4,
  diversityBonus: 0.3,
  recencyPenalty: 0.2,
  frequencyPenalty: 0.1,
};

export const PERSONA_ASSIGNMENT_WEIGHTS = {
  authenticity: 0.6,
  restBonus: 0.25,
  varietyBonus: 0.15,
};

export const KEYWORD_INTEGRATION_WEIGHTS = {
  relevance: 0.7,
  freshness: 0.3,
};

export const COMMENTER_SELECTION_WEIGHTS = {
  authenticity: 0.6,
  restBonus: 0.25,
  pairingPenalty: 0.15,
};

// ============================================================================
// Penalty/Bonus Calculations
// ============================================================================

export const RECENCY_PENALTY_THRESHOLDS = {
  critical: 7, // days - heavy penalty
  high: 14, // days - moderate penalty
  medium: 21, // days - light penalty
};

export const RECENCY_PENALTIES = {
  critical: 0.9,
  high: 0.5,
  medium: 0.2,
  none: 0,
};

export const FREQUENCY_PENALTY_THRESHOLDS = {
  excessive: 3, // posts in 30 days
  high: 2,
};

export const FREQUENCY_PENALTIES = {
  excessive: 0.9,
  high: 0.4,
  none: 0,
};

// ============================================================================
// Topic Format Templates
// ============================================================================

export const TOPIC_FORMATS: TopicFormat[] = [
  {
    type: 'direct_question',
    template: '[keyword phrase]?',
    example: 'Best AI Presentation Maker?',
    weight: 0.4,
  },
  {
    type: 'comparison_question',
    template: '[tool A] vs [tool B] for [use case]?',
    example: 'Slideforge VS Claude for slides?',
    weight: 0.3,
  },
  {
    type: 'context_question',
    template: '[context setup]. [specific question]?',
    example: 'I love Canva but trying to automate more... heard about X?',
    weight: 0.3,
  },
];

// ============================================================================
// Subreddit Culture Mapping
// ============================================================================

export const SUBREDDIT_CULTURE_MAP: Record<
  string,
  {
    segments: string[];
    tone: string;
    activityLevel: number;
  }
> = {
  'r/PowerPoint': {
    segments: ['consultants', 'educators', 'sales'],
    tone: 'practical',
    activityLevel: 0.7,
  },
  'r/GoogleSlides': {
    segments: ['educators', 'students', 'prosumers'],
    tone: 'practical',
    activityLevel: 0.6,
  },
  'r/consulting': {
    segments: ['consultants'],
    tone: 'professional',
    activityLevel: 0.8,
  },
  'r/marketing': {
    segments: ['consultants', 'sales', 'prosumers'],
    tone: 'tactical',
    activityLevel: 0.85,
  },
  'r/entrepreneur': {
    segments: ['operators', 'founders'],
    tone: 'hustle',
    activityLevel: 0.9,
  },
  'r/startups': {
    segments: ['operators', 'founders', 'developers'],
    tone: 'hustle',
    activityLevel: 0.9,
  },
  'r/smallbusiness': {
    segments: ['operators', 'sales'],
    tone: 'practical',
    activityLevel: 0.75,
  },
  'r/business': {
    segments: ['operators', 'consultants', 'sales'],
    tone: 'professional',
    activityLevel: 0.8,
  },
  'r/productivity': {
    segments: ['operators', 'prosumers', 'students'],
    tone: 'optimization',
    activityLevel: 0.85,
  },
  'r/AskAcademia': {
    segments: ['educators', 'students'],
    tone: 'scholarly',
    activityLevel: 0.7,
  },
  'r/teachers': {
    segments: ['educators'],
    tone: 'supportive',
    activityLevel: 0.75,
  },
  'r/education': {
    segments: ['educators', 'students'],
    tone: 'supportive',
    activityLevel: 0.7,
  },
  'r/Canva': {
    segments: ['prosumers', 'educators', 'sales'],
    tone: 'creative',
    activityLevel: 0.8,
  },
  'r/ChatGPT': {
    segments: ['prosumers', 'developers', 'operators'],
    tone: 'exploratory',
    activityLevel: 0.95,
  },
  'r/ChatGPTPro': {
    segments: ['prosumers', 'developers'],
    tone: 'exploratory',
    activityLevel: 0.85,
  },
  'r/ClaudeAI': {
    segments: ['prosumers', 'developers'],
    tone: 'exploratory',
    activityLevel: 0.75,
  },
  'r/artificial': {
    segments: ['developers', 'prosumers'],
    tone: 'technical',
    activityLevel: 0.8,
  },
  'r/design': {
    segments: ['prosumers', 'consultants'],
    tone: 'creative',
    activityLevel: 0.75,
  },
  'r/contentcreation': {
    segments: ['prosumers'],
    tone: 'creative',
    activityLevel: 0.7,
  },
  'r/presentations': {
    segments: ['consultants', 'educators', 'sales'],
    tone: 'practical',
    activityLevel: 0.65,
  },
};

// ============================================================================
// Day & Time Distribution
// ============================================================================

export const DAY_DISTRIBUTION = [
  { day: 'Monday', weight: 0.15 },
  { day: 'Tuesday', weight: 0.25 },
  { day: 'Wednesday', weight: 0.25 },
  { day: 'Thursday', weight: 0.2 },
  { day: 'Friday', weight: 0.1 },
  { day: 'Saturday', weight: 0.03 },
  { day: 'Sunday', weight: 0.02 },
];

export const TIME_DISTRIBUTION = [
  { label: 'morning', hourRange: [8, 11], weight: 0.3 },
  { label: 'afternoon', hourRange: [13, 16], weight: 0.4 },
  { label: 'evening', hourRange: [17, 21], weight: 0.3 },
];

// ============================================================================
// Natural Language Patterns
// ============================================================================

export const CASUAL_MARKERS = [
  'lol',
  'tbh',
  'yea',
  'yeah',
  'sorta',
  'kinda',
  'gonna',
  'wanna',
  'idk',
];

export const PROFESSIONAL_MARKERS = [
  'optimize',
  'leverage',
  'utilize',
  'synergy',
  'paradigm',
  'holistic',
];

export const STUDENT_MARKERS = [
  'dude',
  'literally',
  'like',
  'so',
  'actually',
  'basically',
];

export const FILLER_WORDS = [
  'just',
  'basically',
  'honestly',
  'actually',
  'really',
  'pretty',
];

export const TYPO_REPLACEMENTS = [
  { from: /the\b/gi, to: 'teh' },
  { from: /\byou\b/gi, to: 'u' },
  { from: /\byour\b/gi, to: 'ur' },
  { from: /\band\b/gi, to: '&' },
  { from: /\bwith\b/gi, to: 'w/' },
];

// ============================================================================
// Agreement Comment Templates
// ============================================================================

export const AGREEMENT_PATTERNS = [
  '+1 {product}',
  'Same here. {brief_experience}',
  'Yea {agreement_point}',
  'Yeah {agreement_point}',
  'This. {additional_detail}',
  'Agreed. {personal_note}',
  '+1',
  'This is it',
  'Exactly this',
];

export const OP_RESPONSE_PATTERNS = [
  'Sweet I\'ll check it out!!',
  'Thanks! Will give it a try',
  'Appreciate the rec!',
  'Perfect, exactly what I needed',
  'This is helpful, thank you',
  'Thanks for the suggestion!',
  'Will definitely look into this',
  'Awesome, thanks!',
];

// ============================================================================
// Quality Scoring Thresholds
// ============================================================================

export const QUALITY_THRESHOLDS = {
  excellent: 8.5, // 9/10 quality
  good: 7.5,
  acceptable: 7.0,
  poor: 6.0,
};

export const FLAG_SEVERITY_THRESHOLDS = {
  distribution: {
    critical: 5.0,
    warning: 7.0,
  },
  naturalness: {
    critical: 5.0,
    warning: 7.0,
  },
  consistency: {
    critical: 6.0,
    warning: 8.0,
  },
};

// ============================================================================
// State Management
// ============================================================================

export const STATE_RETENTION = {
  maxWeeksInHistory: 12,
  pruneThreshold: 15, // prune when exceeds this
};

export const PERSONA_BURNOUT_THRESHOLDS = {
  postsAsOP: 10, // in 30 days
  postsAsCommenter: 20, // in 30 days
  consecutiveWeeks: 5,
};

// ============================================================================
// Engagement Probabilities
// ============================================================================

export const ENGAGEMENT_PROBABILITIES = {
  opResponds: 0.7,
  additionalThread: 0.5,
  baseEngagement: 0.7,
};

export const ENGAGEMENT_LEVELS = [
  { minComments: 2, maxComments: 3, weight: 0.5 }, // light
  { minComments: 3, maxComments: 4, weight: 0.3 }, // medium
  { minComments: 4, maxComments: 6, weight: 0.2 }, // high
];

// ============================================================================
// ID Generation
// ============================================================================

export const ID_PREFIXES = {
  post: 'P',
  comment: 'C',
  week: 'week',
};

// ============================================================================
// Export all constants
// ============================================================================

export default {
  ALGORITHM_CONFIG,
  SUBREDDIT_SELECTION_WEIGHTS,
  PERSONA_ASSIGNMENT_WEIGHTS,
  KEYWORD_INTEGRATION_WEIGHTS,
  COMMENTER_SELECTION_WEIGHTS,
  RECENCY_PENALTY_THRESHOLDS,
  RECENCY_PENALTIES,
  FREQUENCY_PENALTY_THRESHOLDS,
  FREQUENCY_PENALTIES,
  TOPIC_FORMATS,
  SUBREDDIT_CULTURE_MAP,
  DAY_DISTRIBUTION,
  TIME_DISTRIBUTION,
  CASUAL_MARKERS,
  PROFESSIONAL_MARKERS,
  STUDENT_MARKERS,
  FILLER_WORDS,
  TYPO_REPLACEMENTS,
  AGREEMENT_PATTERNS,
  OP_RESPONSE_PATTERNS,
  QUALITY_THRESHOLDS,
  FLAG_SEVERITY_THRESHOLDS,
  STATE_RETENTION,
  PERSONA_BURNOUT_THRESHOLDS,
  ENGAGEMENT_PROBABILITIES,
  ENGAGEMENT_LEVELS,
  ID_PREFIXES,
};
