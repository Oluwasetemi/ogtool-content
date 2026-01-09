import {
  Post,
  Comment,
  Persona,
  StateStore,
  EngagementLevel,
} from '../core/types';
import {
  SUBREDDIT_CULTURE_MAP,
  ENGAGEMENT_PROBABILITIES,
  ENGAGEMENT_LEVELS,
  COMMENTER_SELECTION_WEIGHTS,
  AGREEMENT_PATTERNS,
  OP_RESPONSE_PATTERNS,
} from '../core/constants';
import {
  weightedRandomSelect,
  randomInt,
  randomMinutes,
  generateId,
  randomBoolean,
  randomChoice,
} from '../utils/random';

/**
 * Comment Engine - Generate comments with engagement logic,
 * thread orchestration, and realistic timing
 */

// ============================================================================
// Main Comment Generation
// ============================================================================

export function generateComments(
  posts: Post[],
  personas: Persona[],
  state: StateStore
): Comment[] {
  const allComments: Comment[] = [];
  let commentCounter = 1;

  for (const post of posts) {
    // Decide if this post should have engagement
    if (!shouldHaveEngagement(post, state)) {
      continue;
    }

    // Determine engagement level
    const engagementLevel = determineEngagementLevel(post);

    // Select commenting personas
    const commenters = selectCommenters(post, personas, engagementLevel, state);

    // Generate comment thread
    const thread = generateCommentThread(post, commenters, engagementLevel, commentCounter);

    commentCounter += thread.length;
    allComments.push(...thread);
  }

  return allComments;
}

// ============================================================================
// Engagement Decision Logic
// ============================================================================

function shouldHaveEngagement(post: Post, state: StateStore): boolean {
  // Get subreddit activity level
  const culture = SUBREDDIT_CULTURE_MAP[post.subreddit];
  const baseEngagementProb = culture?.activityLevel || 0.7;

  // Quality boost: multiple keywords
  const qualityBoost = post.keyword_ids.length > 1 ? 0.15 : 0;

  // Balance boost: if recent engagement is low
  const recentComments = state.history.weeks
    .slice(-2)
    .flatMap((w) => w.comments).length;
  const balanceBoost = recentComments < 10 ? 0.2 : 0;

  const finalProb = Math.min(
    baseEngagementProb + qualityBoost + balanceBoost,
    0.98
  );

  return randomBoolean(finalProb);
}

function determineEngagementLevel(post: Post): EngagementLevel {
  // Weighted random selection of engagement level
  const options = ENGAGEMENT_LEVELS.map((level) => ({
    value: level,
    weight: level.weight,
  }));

  const selected = weightedRandomSelect(options);

  return {
    targetComments: randomInt(selected.minComments, selected.maxComments),
    targetDepth: randomInt(1, 3),
    opShouldRespond: randomBoolean(ENGAGEMENT_PROBABILITIES.opResponds),
  };
}

// ============================================================================
// Commenter Selection
// ============================================================================

export function selectCommenters(
  post: Post,
  personas: Persona[],
  engagementLevel: EngagementLevel,
  state: StateStore
): Persona[] {
  // Exclude the OP
  const availablePersonas = personas.filter(
    (p) => p.username !== post.author_username
  );

  // Score each persona
  const scored = availablePersonas.map((persona) => {
    const usage = state.quotas.personaUsage[persona.username] || {
      postsAsOP: [],
      postsAsCommenter: [],
      lastUsed: 0,
      consecutiveWeeks: 0,
    };

    // Calculate score components
    const authenticity = calculateCommenterAuthenticity(persona, post);
    const restBonus = calculateCommenterRestBonus(usage);
    const pairingPenalty = calculatePairingPenalty(
      post.author_username,
      persona.username,
      state
    );

    const score =
      authenticity * COMMENTER_SELECTION_WEIGHTS.authenticity +
      restBonus * COMMENTER_SELECTION_WEIGHTS.restBonus -
      pairingPenalty * COMMENTER_SELECTION_WEIGHTS.pairingPenalty;

    return { persona, score };
  });

  // Select top N commenters
  const numCommenters = Math.min(
    engagementLevel.targetComments,
    availablePersonas.length
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, numCommenters)
    .map((s) => s.persona);
}

function calculateCommenterAuthenticity(persona: Persona, post: Post): number {
  // Check if persona would naturally engage with this topic
  const postText = (post.title + ' ' + post.body).toLowerCase();

  // Use pain points to determine relevance
  const hasRelevantPainPoint = persona.painPoints.some((pp) => {
    const ppWords = pp.toLowerCase().split(/\s+/);
    return ppWords.some((word) => word.length > 4 && postText.includes(word));
  });

  // Use subreddit authenticity
  const subredditAuth = persona.voiceProfile.authenticity[post.subreddit] || 0.5;

  if (hasRelevantPainPoint) {
    return Math.min(subredditAuth + 0.2, 1.0);
  }

  return subredditAuth * 0.8; // Slight penalty if no direct relevance
}

function calculateCommenterRestBonus(usage: {
  postsAsCommenter: number[];
}): number {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentComments = usage.postsAsCommenter.filter((ts) => ts > sevenDaysAgo).length;

  if (recentComments === 0) return 0.3;
  if (recentComments === 1) return 0.15;
  return 0;
}

function calculatePairingPenalty(
  opUsername: string,
  commenterUsername: string,
  state: StateStore
): number {
  const pairingKey = [opUsername, commenterUsername].sort().join('+');
  const pairingCount = state.patterns.personaPairings[pairingKey] || 0;

  if (pairingCount > 2) return 0.3;
  if (pairingCount > 1) return 0.15;
  return 0;
}

// ============================================================================
// Thread Orchestration
// ============================================================================

function generateCommentThread(
  post: Post,
  commenters: Persona[],
  engagementLevel: EngagementLevel,
  startCounter: number
): Comment[] {
  const thread: Comment[] = [];
  let counter = startCounter;

  if (commenters.length === 0) {
    return thread;
  }

  // Get OP persona
  const opUsername = post.author_username;

  // PATTERN 1: Initial response (first commenter)
  const firstCommenter = commenters[0];
  const firstComment = createInitialComment(
    post,
    firstCommenter,
    counter++
  );
  thread.push(firstComment);

  // PATTERN 2: Agreement/addition (second commenter replies to first)
  if (commenters.length > 1) {
    const secondCommenter = commenters[1];
    const secondComment = createAgreementComment(
      post,
      firstComment,
      secondCommenter,
      counter++
    );
    thread.push(secondComment);

    // PATTERN 3: OP engagement (responds to thread)
    if (engagementLevel.opShouldRespond) {
      const opComment = createOPEngagement(
        post,
        secondComment,
        opUsername,
        counter++
      );
      thread.push(opComment);
    }
  } else {
    // If only one commenter, OP might still respond
    if (engagementLevel.opShouldRespond) {
      const opComment = createOPEngagement(
        post,
        firstComment,
        opUsername,
        counter++
      );
      thread.push(opComment);
    }
  }

  // PATTERN 4: Additional perspective (parallel thread)
  if (
    commenters.length > 2 &&
    randomBoolean(ENGAGEMENT_PROBABILITIES.additionalThread)
  ) {
    const additionalCommenter = commenters[2];
    const additionalComment = createAdditionalComment(
      post,
      additionalCommenter,
      counter++
    );
    thread.push(additionalComment);
  }

  return thread;
}

// ============================================================================
// Comment Creation Functions
// ============================================================================

function createInitialComment(
  post: Post,
  commenter: Persona,
  counter: number
): Comment {
  return {
    comment_id: generateId('C', counter),
    post_id: post.post_id,
    parent_comment_id: null,
    comment_text: '', // Filled by AI text generator
    username: commenter.username,
    timestamp: new Date(post.timestamp.getTime() + randomMinutes(8, 25) * 60000),
    metadata: {
      role: 'initial_response',
      depth: 0,
    },
  };
}

function createAgreementComment(
  post: Post,
  parentComment: Comment,
  commenter: Persona,
  counter: number
): Comment {
  return {
    comment_id: generateId('C', counter),
    post_id: post.post_id,
    parent_comment_id: parentComment.comment_id,
    comment_text: '', // Filled by AI text generator (or template)
    username: commenter.username,
    timestamp: new Date(
      parentComment.timestamp.getTime() + randomMinutes(10, 20) * 60000
    ),
    metadata: {
      role: 'agreement',
      depth: 1,
    },
  };
}

function createOPEngagement(
  post: Post,
  parentComment: Comment,
  opUsername: string,
  counter: number
): Comment {
  return {
    comment_id: generateId('C', counter),
    post_id: post.post_id,
    parent_comment_id: parentComment.comment_id,
    comment_text: '', // Filled with OP response template
    username: opUsername,
    timestamp: new Date(
      parentComment.timestamp.getTime() + randomMinutes(8, 18) * 60000
    ),
    metadata: {
      role: 'op_engagement',
      depth: parentComment.metadata.depth + 1,
    },
  };
}

function createAdditionalComment(
  post: Post,
  commenter: Persona,
  counter: number
): Comment {
  // Calculate timestamp based on last comment in thread
  const baseTime = post.timestamp.getTime() + randomMinutes(20, 40) * 60000;

  return {
    comment_id: generateId('C', counter),
    post_id: post.post_id,
    parent_comment_id: null, // Parallel thread
    comment_text: '', // Filled by AI text generator
    username: commenter.username,
    timestamp: new Date(baseTime),
    metadata: {
      role: 'addition',
      depth: 0,
    },
  };
}

// ============================================================================
// Comment Text Templates (Simple)
// ============================================================================

/**
 * Generate simple agreement comment (for non-AI fallback)
 */
export function generateAgreementText(productName: string = 'Slideforge'): string {
  const patterns = AGREEMENT_PATTERNS;
  const pattern = randomChoice(patterns);

  // Simple replacements
  return pattern.replace('{product}', productName);
}

/**
 * Generate OP response (for non-AI fallback)
 */
export function generateOPResponseText(): string {
  return randomChoice(OP_RESPONSE_PATTERNS);
}

// ============================================================================
// Timing Distribution
// ============================================================================

/**
 * Calculate realistic time gaps between comments
 */
export function calculateCommentTimestamps(
  comments: Comment[],
  post: Post
): Comment[] {
  return comments.map((comment, index) => {
    if (comment.parent_comment_id === null) {
      // Top-level comment
      if (index === 0) {
        // First comment: 8-25 minutes after post
        comment.timestamp = new Date(
          post.timestamp.getTime() + randomMinutes(8, 25) * 60000
        );
      } else {
        // Additional parallel thread: 15-40 minutes after post
        comment.timestamp = new Date(
          post.timestamp.getTime() + randomMinutes(15, 40) * 60000
        );
      }
    } else {
      // Reply to another comment
      const parentComment = comments.find(
        (c) => c.comment_id === comment.parent_comment_id
      );

      if (parentComment) {
        // 8-20 minutes after parent
        comment.timestamp = new Date(
          parentComment.timestamp.getTime() + randomMinutes(8, 20) * 60000
        );
      }
    }

    return comment;
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get comment depth in thread
 */
export function getCommentDepth(
  comment: Comment,
  allComments: Comment[]
): number {
  let depth = 0;
  let currentComment = comment;

  while (currentComment.parent_comment_id) {
    depth++;
    const parent = allComments.find(
      (c) => c.comment_id === currentComment.parent_comment_id
    );
    if (!parent) break;
    currentComment = parent;
  }

  return depth;
}

/**
 * Group comments by post
 */
export function groupCommentsByPost(
  comments: Comment[]
): Map<string, Comment[]> {
  const grouped = new Map<string, Comment[]>();

  comments.forEach((comment) => {
    const postComments = grouped.get(comment.post_id) || [];
    postComments.push(comment);
    grouped.set(comment.post_id, postComments);
  });

  return grouped;
}

/**
 * Sort comments chronologically
 */
export function sortCommentsChronologically(comments: Comment[]): Comment[] {
  return [...comments].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
}

/**
 * Validate comment thread structure
 */
export function validateCommentThread(
  comments: Comment[],
  post: Post
): boolean {
  // Check all comments belong to post
  const allBelongToPost = comments.every((c) => c.post_id === post.post_id);
  if (!allBelongToPost) return false;

  // Check no comment is from OP as initial response
  const initialComments = comments.filter((c) => c.parent_comment_id === null);
  const hasOPInitial = initialComments.some(
    (c) => c.username === post.author_username
  );
  if (hasOPInitial) return false;

  // Check parent references are valid
  const commentIds = new Set(comments.map((c) => c.comment_id));
  const invalidParents = comments.some(
    (c) => c.parent_comment_id && !commentIds.has(c.parent_comment_id)
  );
  if (invalidParents) return false;

  return true;
}
