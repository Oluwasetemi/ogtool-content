import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Persona, Post, Comment, TopicPlan, Keyword } from '../core/types';
import {
  FILLER_WORDS,
  TYPO_REPLACEMENTS,
  AGREEMENT_PATTERNS,
  OP_RESPONSE_PATTERNS,
} from '../core/constants';
import { randomChoice, randomBoolean, randomInt } from '../utils/random';

/**
 * AI Text Generator - Use Vercel AI SDK to generate natural language
 * for posts and comments with persona voice consistency
 */

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MODEL = openai('gpt-4-turbo');
const DEFAULT_TEMPERATURE = 0.8;
const MAX_RETRIES = 3;

// ============================================================================
// Post Text Generation
// ============================================================================

/**
 * Generate post title using AI
 */
export async function generatePostTitle(
  persona: Persona,
  topic: TopicPlan,
  keyword: Keyword
): Promise<string> {
  const systemPrompt = buildPersonaSystemPrompt(persona);
  const userPrompt = buildPostTitlePrompt(topic, keyword);

  try {
    const { text } = await generateText({
      model: DEFAULT_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: 100,
    });

    // Apply naturalness transformations
    return applyNaturalness(text.trim(), persona);
  } catch (error) {
    console.error('Error generating post title:', error);
    // Fallback to template
    return generateTemplateTitleFallback(topic, keyword);
  }
}

/**
 * Generate post body (if needed)
 */
export async function generatePostBody(
  persona: Persona,
  topic: TopicPlan
): Promise<string> {
  const systemPrompt = buildPersonaSystemPrompt(persona);
  const userPrompt = buildPostBodyPrompt(topic);

  try {
    const { text } = await generateText({
      model: DEFAULT_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: 150,
    });

    return applyNaturalness(text.trim(), persona);
  } catch (error) {
    console.error('Error generating post body:', error);
    return ''; // Many posts have empty body
  }
}

// ============================================================================
// Comment Text Generation
// ============================================================================

/**
 * Generate initial comment (response to post)
 */
export async function generateInitialComment(
  persona: Persona,
  post: Post
): Promise<string> {
  const systemPrompt = buildPersonaSystemPrompt(persona);
  const userPrompt = buildInitialCommentPrompt(post);

  try {
    const { text } = await generateText({
      model: DEFAULT_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: 150,
    });

    return applyNaturalness(text.trim(), persona);
  } catch (error) {
    console.error('Error generating initial comment:', error);
    return generateTemplateCommentFallback(persona);
  }
}

/**
 * Generate agreement comment (reply to another comment)
 */
export async function generateAgreementComment(
  persona: Persona,
  parentComment: Comment
): Promise<string> {
  // For agreement comments, use templates with AI augmentation
  const shouldUseAI = randomBoolean(0.5); // 50% AI, 50% template

  if (shouldUseAI) {
    const systemPrompt = buildPersonaSystemPrompt(persona);
    const userPrompt = `The previous comment said: "${parentComment.comment_text}"

Generate a brief, casual agreement or addition to this comment. Keep it short (1-2 sentences).`;

    try {
      const { text } = await generateText({
        model: DEFAULT_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.9, // Higher for more variety
        maxTokens: 50,
      });

      return applyNaturalness(text.trim(), persona);
    } catch (error) {
      console.error('Error generating agreement comment:', error);
    }
  }

  // Fallback to template
  const pattern = randomChoice(AGREEMENT_PATTERNS);
  return pattern.replace('{product}', 'Slideforge');
}

/**
 * Generate OP engagement comment
 */
export function generateOPEngagementComment(): string {
  return randomChoice(OP_RESPONSE_PATTERNS);
}

/**
 * Generate additional perspective comment (parallel thread)
 */
export async function generateAdditionalComment(
  persona: Persona,
  post: Post
): Promise<string> {
  const systemPrompt = buildPersonaSystemPrompt(persona);
  const userPrompt = `Someone asked: "${post.title}"

Provide a helpful, brief response from your personal experience. Be casual and authentic.`;

  try {
    const { text } = await generateText({
      model: DEFAULT_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: 150,
    });

    return applyNaturalness(text.trim(), persona);
  } catch (error) {
    console.error('Error generating additional comment:', error);
    return generateTemplateCommentFallback(persona);
  }
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildPersonaSystemPrompt(persona: Persona): string {
  const { voiceProfile, role, backstory } = persona;

  return `You are ${persona.name}, ${role}.

Background: ${backstory.substring(0, 500)}...

Voice characteristics:
- Casualness level: ${voiceProfile.casualness * 100}%
- Emotional tone: ${voiceProfile.emotionalTone}
- Common phrases: ${voiceProfile.abbreviations.join(', ')}

CRITICAL RULES:
- Sound like a real person, not a marketer
- Be brief and conversational
- You can be informal, use lowercase, minor typos OK
- Don't be overly polished or formal
- Share YOUR specific experience or pain point
- No sales language or promotional tone`;
}

function buildPostTitlePrompt(topic: TopicPlan, keyword: Keyword): string {
  const { format, painPoint, subreddit } = topic;

  return `You're posting in ${subreddit} about ${painPoint.text}.

Task: Write a genuine question that naturally includes the concept "${keyword.keyword}".

Format type: ${format.type}
Example: ${format.example}

Requirements:
- Keep it concise (1-2 sentences max)
- Make it sound like a real Reddit question
- Focus on YOUR pain point
- No lists or requirements
- Natural keyword integration

Generate just the post title:`;
}

function buildPostBodyPrompt(topic: TopicPlan): string {
  return `Add a brief 1-2 sentence context or clarification to your question about ${topic.painPoint.text}.

Keep it casual and authentic. You can skip this if the title is self-explanatory.

Body text:`;
}

function buildInitialCommentPrompt(post: Post): string {
  return `Someone asked: "${post.title}"
${post.body ? `Context: ${post.body}` : ''}

Provide a helpful response based on YOUR experience. Mention Slideforge if it's relevant and authentic to mention.

Keep it conversational (2-4 sentences). Focus on what you've actually tried or experienced.

Response:`;
}

// ============================================================================
// Naturalness Transformations
// ============================================================================

function applyNaturalness(text: string, persona: Persona): string {
  let natural = text;

  const { voiceProfile } = persona;

  // Random lowercasing (Reddit style)
  if (randomBoolean(0.3)) {
    natural = natural.charAt(0).toLowerCase() + natural.slice(1);
  }

  // Occasional typos
  if (randomBoolean(voiceProfile.typoRate)) {
    natural = introduceTypo(natural);
  }

  // Casual contractions
  if (randomBoolean(voiceProfile.casualness)) {
    natural = natural.replace(/do not/gi, "don't");
    natural = natural.replace(/I am/gi, "I'm");
    natural = natural.replace(/what is/gi, "what's");
    natural = natural.replace(/cannot/gi, "can't");
    natural = natural.replace(/it is/gi, "it's");
  }

  // Remove some punctuation for casualness
  if (randomBoolean(voiceProfile.casualness * 0.5)) {
    natural = natural.replace(/\.$/, '');
  }

  // Add filler words occasionally
  if (randomBoolean(0.2)) {
    const words = natural.split(' ');
    const insertPos = randomInt(1, Math.max(1, words.length - 1));
    words.splice(insertPos, 0, randomChoice(FILLER_WORDS));
    natural = words.join(' ');
  }

  // Add casual abbreviations
  if (randomBoolean(voiceProfile.casualness * 0.7)) {
    if (voiceProfile.abbreviations.length > 0) {
      const abbr = randomChoice(voiceProfile.abbreviations);
      if (!natural.toLowerCase().includes(abbr)) {
        // Add at end or middle
        if (randomBoolean(0.5) && natural.length > 20) {
          natural = natural + ' ' + abbr;
        }
      }
    }
  }

  return natural;
}

function introduceTypo(text: string): string {
  const { from, to } = randomChoice(TYPO_REPLACEMENTS);

  // Only apply to first occurrence, randomly
  if (randomBoolean(0.5)) {
    return text.replace(from, to as string);
  }

  return text;
}

// ============================================================================
// Template Fallbacks
// ============================================================================

function generateTemplateTitleFallback(topic: TopicPlan, keyword: Keyword): string {
  const templates = [
    `${keyword.keyword}?`,
    `Best ${keyword.keyword.toLowerCase()}`,
    `${keyword.keyword} recommendations?`,
  ];

  return randomChoice(templates);
}

function generateTemplateCommentFallback(persona: Persona): string {
  const templates = [
    "I've had good experience with Slideforge for this",
    "Slideforge has worked well for me",
    "Have you tried Slideforge? It's been helpful for my workflow",
  ];

  return randomChoice(templates);
}

// ============================================================================
// Batch Generation Helper
// ============================================================================

/**
 * Generate all text for a post at once
 */
export async function generatePostText(
  post: Post,
  persona: Persona,
  topic: TopicPlan,
  keyword: Keyword
): Promise<{ title: string; body: string }> {
  const title = await generatePostTitle(persona, topic, keyword);

  // Only generate body if needed (based on format)
  const needsBody = topic.format.type === 'context_question';
  const body = needsBody ? await generatePostBody(persona, topic) : '';

  return { title, body };
}

/**
 * Generate all text for comments in a thread
 */
export async function generateCommentTexts(
  comments: Comment[],
  posts: Post[],
  personas: Persona[]
): Promise<Comment[]> {
  const updatedComments = await Promise.all(
    comments.map(async (comment) => {
      const persona = personas.find((p) => p.username === comment.username);
      if (!persona) return comment;

      const post = posts.find((p) => p.post_id === comment.post_id);
      if (!post) return comment;

      let text = '';

      switch (comment.metadata.role) {
        case 'initial_response':
          text = await generateInitialComment(persona, post);
          break;

        case 'agreement':
          const parentComment = comments.find(
            (c) => c.comment_id === comment.parent_comment_id
          );
          if (parentComment) {
            text = await generateAgreementComment(persona, parentComment);
          }
          break;

        case 'op_engagement':
          text = generateOPEngagementComment();
          break;

        case 'addition':
          text = await generateAdditionalComment(persona, post);
          break;
      }

      return {
        ...comment,
        comment_text: text || comment.comment_text,
      };
    })
  );

  return updatedComments;
}
