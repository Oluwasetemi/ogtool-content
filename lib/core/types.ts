// Core type definitions for Reddit content marketing automation

// ============================================================================
// Company & Configuration Types
// ============================================================================

export interface CompanyInfo {
  name: string;
  website: string;
  description: string;
  icp: ICPSegment[];
  subreddits: string[];
  postsPerWeek: number;
}

export interface ICPSegment {
  segment: string;
  profile: string;
  appeal: string;
}

// ============================================================================
// Persona Types
// ============================================================================

export interface Persona {
  username: string;
  name: string;
  role: string;
  backstory: string;
  painPoints: string[];
  voiceProfile: VoiceProfile;
}

export interface VoiceProfile {
  sentenceLength: 'short' | 'medium' | 'medium-long' | 'long' | 'varied';
  punctuation: 'minimal' | 'proper' | 'careful';
  casualness: number; // 0-1 scale
  typoRate: number; // 0-1 scale
  abbreviations: string[];
  emotionalTone: string;
  authenticity: Record<string, number>; // subreddit -> authenticity score
}

// ============================================================================
// Keyword Types
// ============================================================================

export interface Keyword {
  id: string;
  keyword: string;
  semantics: {
    terms: string[];
    intent: 'recommendation' | 'comparison' | 'creation' | 'efficiency' | 'assistance' | 'automation';
  };
}

// ============================================================================
// Post & Comment Types
// ============================================================================

export interface Post {
  post_id: string;
  subreddit: string;
  title: string;
  body: string;
  author_username: string;
  timestamp: Date;
  keyword_ids: string[];
  metadata: PostMetadata;
}

export interface PostMetadata {
  topic: string;
  intent: 'question' | 'discussion' | 'recommendation_request' | 'direct_question' | 'comparison_question' | 'context_question';
  targetEngagement: number;
}

export interface Comment {
  comment_id: string;
  post_id: string;
  parent_comment_id: string | null;
  comment_text: string;
  username: string;
  timestamp: Date;
  metadata: CommentMetadata;
}

export interface CommentMetadata {
  role: 'initial_response' | 'agreement' | 'addition' | 'op_engagement';
  depth: number;
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface WeeklyCalendar {
  weekId: string;
  startDate: Date;
  posts: Post[];
  comments: Comment[];
  qualityScore: QualityScore;
  status: 'draft' | 'approved' | 'posted' | 'sample';
  metadata: CalendarMetadata;
}

export interface CalendarMetadata {
  generatedAt: number; // timestamp
  parameters: GenerationParams;
}

// ============================================================================
// Quality Scoring Types
// ============================================================================

export interface QualityScore {
  overall: number; // 0-10
  naturalness: number; // 0-10
  distribution: number; // 0-10
  consistency: number; // 0-10
  diversity: number; // 0-10
  timing: number; // 0-10
  flags: QualityFlag[];
}

export interface QualityFlag {
  severity: 'critical' | 'warning' | 'info';
  category: 'naturalness' | 'distribution' | 'consistency' | 'diversity' | 'timing';
  message: string;
  recommendation: string;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface StateStore {
  history: {
    weeks: WeeklyCalendar[];
    totalPosts: number;
    totalComments: number;
  };
  quotas: {
    personaUsage: Record<string, PersonaQuota>;
    subredditUsage: Record<string, SubredditQuota>;
    keywordUsage: Record<string, KeywordQuota>;
  };
  patterns: {
    personaPairings: Record<string, number>; // "persona1+persona2" -> count
    subredditRotation: string[];
    timingPatterns: number[];
  };
  qualityMetrics: {
    averageNaturalnessScore: number;
    averagePersonaConsistency: number;
    averageDistributionBalance: number;
    weeklyScores: number[];
  };
}

export interface PersonaQuota {
  postsAsOP: number[]; // timestamps
  postsAsCommenter: number[]; // timestamps
  lastUsed: number; // timestamp
  consecutiveWeeks: number;
}

export interface SubredditQuota {
  postCount: number[]; // timestamps
  lastPosted: number; // timestamp
  topicsUsed: string[];
}

export interface KeywordQuota {
  usageCount: number;
  lastUsed: number; // timestamp
  contexts: string[];
}

// ============================================================================
// Generation Planning Types
// ============================================================================

export interface GenerationParams {
  companyInfo?: CompanyInfo;
  personas?: Persona[];
  subreddits?: string[];
  keywords?: Keyword[];
  postsPerWeek?: number;
  minQualityScore: number;
  attempt?: number;
}

export interface TopicPlan {
  persona: Persona;
  subreddit: string;
  painPoint: PainPoint;
  format: TopicFormat;
  intent: PostMetadata['intent'];
}

export interface PainPoint {
  text: string;
  keywords: string[];
  intensity: number; // 0-1 scale
}

export interface TopicFormat {
  type: 'direct_question' | 'comparison_question' | 'context_question';
  template: string;
  example: string;
  weight: number;
}

export interface PostDraft extends TopicPlan {
  keywords: Keyword[];
  primaryKeyword: Keyword;
}

export interface SelectedSubreddit {
  subreddit: string;
  score: number;
  usage: SubredditQuota;
}

export interface PersonaAssignment {
  subreddit: string;
  persona: Persona;
  authenticityScore: number;
}

export interface EngagementLevel {
  targetComments: number;
  targetDepth: number;
  opShouldRespond: boolean;
}

// ============================================================================
// Scoring Component Types
// ============================================================================

export interface NaturalnessAnalysis {
  hasImperfections: boolean;
  sentenceVariety: number;
  casualLanguagePresent: boolean;
  shortAgreements: boolean;
  forcedKeywords: string[];
}

export interface DistributionAnalysis {
  personaCounts: Record<string, number>;
  subredditCounts: Record<string, number>;
  keywordCounts: Record<string, number>;
  maxPersonaRatio: number;
  duplicateSubreddits: boolean;
}

export interface ConsistencyAnalysis {
  personaVoiceScores: Record<string, number>;
  outOfCharacterInstances: Array<{
    persona: string;
    text: string;
    issue: string;
  }>;
}

export interface DiversityAnalysis {
  topicSimilarities: Array<{
    current: string;
    past: string;
    similarity: number;
  }>;
  repeatedSubreddits: string[];
  repeatedPairings: string[];
}

export interface TimingAnalysis {
  commentGaps: number[];
  postDistribution: Record<string, number>; // day of week -> count
  suspiciousPatterns: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export interface WeightedOption<T> {
  value: T;
  weight: number;
}

export interface ScoredItem<T> {
  item: T;
  score: number;
}

// ============================================================================
// AI Generation Types
// ============================================================================

export interface AIPromptContext {
  persona: Persona;
  voiceProfile: VoiceProfile;
  topic: TopicPlan;
  keyword?: Keyword;
  conversationContext?: Comment[];
}

export interface AIGenerationResult {
  text: string;
  metadata: {
    model: string;
    temperature: number;
    tokens: number;
  };
}

// ============================================================================
// Storage Adapter Types
// ============================================================================

export interface StorageAdapter {
  loadState(): Promise<StateStore>;
  saveState(state: StateStore): Promise<void>;
  saveCalendar(calendar: WeeklyCalendar): Promise<void>;
  loadCalendar(weekId: string): Promise<WeeklyCalendar>;
  listCalendars(): Promise<string[]>;
  loadCompanyInfo(): Promise<CompanyInfo>;
  loadPersonas(): Promise<Persona[]>;
  loadKeywords(): Promise<Keyword[]>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AlgorithmConfig {
  weights: {
    naturalness: number;
    distribution: number;
    consistency: number;
    diversity: number;
    timing: number;
  };
  thresholds: {
    minQualityScore: number;
    maxRetries: number;
    topicSimilarityThreshold: number;
    maxPersonaRatio: number;
  };
  timing: {
    minCommentGap: number; // minutes
    maxCommentGap: number; // minutes
    workingHoursStart: number; // hour (24h format)
    workingHoursEnd: number; // hour (24h format)
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class CalendarGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CalendarGenerationError';
  }
}

export class QualityThresholdError extends Error {
  constructor(
    message: string,
    public score: number,
    public threshold: number,
    public calendar: WeeklyCalendar
  ) {
    super(message);
    this.name = 'QualityThresholdError';
  }
}
