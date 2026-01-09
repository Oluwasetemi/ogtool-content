/**
 * Environment Variable Validation
 * Checks required environment variables and provides helpful error messages
 */

export interface EnvCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function checkEnvironment(): EnvCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check OpenAI API Key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    errors.push('OPENAI_API_KEY is not set. Please add it to Vercel environment variables.');
  } else {
    // Validate format
    if (!openaiKey.startsWith('sk-')) {
      errors.push('OPENAI_API_KEY appears invalid (should start with "sk-")');
    }
    if (openaiKey.length < 40) {
      warnings.push('OPENAI_API_KEY appears too short (should be ~50+ characters)');
    }
  }

  // Check Node environment
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push('NODE_ENV is not set');
  }

  // Check Vercel environment
  const isVercel = process.env.VERCEL === '1';
  if (isVercel) {
    console.log('Running on Vercel');

    // Check Vercel region
    const region = process.env.VERCEL_REGION;
    if (region) {
      console.log('Vercel region:', region);
    }
  } else {
    console.log('Running locally');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function logEnvironmentCheck(): void {
  const result = checkEnvironment();

  if (result.errors.length > 0) {
    console.error('❌ Environment check failed:');
    result.errors.forEach((error) => console.error('  -', error));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    result.warnings.forEach((warning) => console.warn('  -', warning));
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✓ Environment check passed');
  }
}
