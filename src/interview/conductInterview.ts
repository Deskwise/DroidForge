import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import kleur from 'kleur';
import type { ProjectBrief } from '../types.js';

const BRIEF_DIR = '.factory';
const BRIEF_PATH = path.join(BRIEF_DIR, 'project-brief.yaml');

async function fileExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export interface ProjectAnalysis {
  domain: string;
  complexity: 'simple' | 'medium' | 'complex';
  technicalLevel: 'beginner' | 'intermediate' | 'expert';
  userGoal: string;
  requirements: string[];
  domainSpecific: string[];
}

function analyzeUserInput(userInput: string): ProjectAnalysis {
  const input = userInput.toLowerCase();

  // Domain detection
  const domains = {
    'medical/dental': ['dentist', 'dental', 'medical', 'doctor', 'hospital', 'clinic', 'healthcare'],
    'restaurant': ['restaurant', 'food', 'cafe', 'bar', 'dining', 'menu', 'booking'],
    'fitness': ['fitness', 'gym', 'workout', 'health', 'trainer', 'exercise'],
    'e-commerce': ['shop', 'store', 'ecommerce', 'shopping', 'cart', 'products', 'sales'],
    'education': ['school', 'course', 'learning', 'student', 'teacher', 'education'],
    'finance': ['banking', 'finance', 'payment', 'money', 'investment', 'wallet'],
    'social': ['social', 'community', 'chat', 'messaging', 'friends', 'network'],
    'productivity': ['productivity', 'task', 'project', 'management', 'organize'],
    'entertainment': ['game', 'entertainment', 'media', 'video', 'music', 'streaming']
  };

  let detectedDomain = 'general';
  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(keyword => input.includes(keyword))) {
      detectedDomain = domain;
      break;
    }
  }

  // Technical level detection
  const technicalIndicators = {
    expert: ['api', 'database', 'framework', 'architecture', 'microservices', 'scalable', 'deploy'],
    intermediate: ['app', 'website', 'frontend', 'backend', 'user interface', 'responsive'],
    beginner: ['build', 'create', 'make', 'need', 'want', 'simple', 'easy']
  };

  let technicalLevel: 'beginner' | 'intermediate' | 'expert' = 'beginner';
  for (const [level, indicators] of Object.entries(technicalIndicators)) {
    if (indicators.some(indicator => input.includes(indicator))) {
      technicalLevel = level as any;
      break;
    }
  }

  // Complexity analysis
  const complexityIndicators = {
    complex: ['enterprise', 'scalable', 'microservices', 'multiple', 'integration', 'advanced'],
    medium: ['professional', 'business', 'commercial', 'multiple features'],
    simple: ['simple', 'basic', 'personal', 'small', 'single']
  };

  let complexity: 'simple' | 'medium' | 'complex' = 'medium';
  for (const [level, indicators] of Object.entries(complexityIndicators)) {
    if (indicators.some(indicator => input.includes(indicator))) {
      complexity = level as any;
      break;
    }
  }

  // Extract requirements
  const requirements = [];
  if (input.includes('booking') || input.includes('appointment')) {
    requirements.push('booking_system');
  }
  if (input.includes('payment') || input.includes('billing')) {
    requirements.push('payment_processing');
  }
  if (input.includes('user') || input.includes('account')) {
    requirements.push('user_management');
  }
  if (input.includes('mobile') || input.includes('phone')) {
    requirements.push('mobile_responsive');
  }

  return {
    domain: detectedDomain,
    complexity,
    technicalLevel,
    userGoal: userInput,
    requirements,
    domainSpecific: domains[detectedDomain as keyof typeof domains] || []
  };
}

export { analyzeUserInput };

export async function conductInterview(): Promise<ProjectBrief> {
  const cwd = process.cwd();
  const briefAbs = path.join(cwd, BRIEF_PATH);
  const hasBrief = await fileExists(briefAbs);

  if (hasBrief) {
    const { update } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'update',
        message: 'I see you already have a droid team. Would you like to create a new one?',
        default: false,
      },
    ]) as { update: boolean };

    if (!update) {
      const raw = await fs.readFile(briefAbs, 'utf8');
      const parsed = yaml.load(raw) as ProjectBrief | undefined;
      if (parsed && parsed.domain) {
        console.log(kleur.green('✔ Using your existing droid team'));
        return parsed;
      }
    }
  }

  console.log(kleur.cyan('\nHello! I help you create a specialized AI team for your project.\n'));
  console.log(kleur.gray('Just tell me what you want to build in plain English, and I\'ll create the perfect AI droids for you.\n'));

  const { projectGoal } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectGoal',
      message: kleur.yellow('What do you want to build?'),
      validate: (input: string) => {
        if (input.length < 10) {
          return 'Please tell me a bit more about your project so I can create the right AI team for you.';
        }
        return true;
      }
    },
  ]) as { projectGoal: string };

  console.log(kleur.gray('\nAnalyzing your project to create the perfect AI team...\n'));

  const analysis = analyzeUserInput(projectGoal);

  // Follow-up question if needed
  let additionalContext = '';
  if (analysis.technicalLevel === 'beginner' && analysis.complexity === 'complex') {
    const { context } = await inquirer.prompt([
      {
        type: 'input',
        name: 'context',
        message: kleur.yellow('This sounds like an exciting project! What specific features do you have in mind?'),
        default: ''
      }
    ]) as { context: string };
    additionalContext = context;
  }

  // Generate the project brief
  const brief: ProjectBrief = {
    version: 1,
    mode: 'new-project' as any,
    persona: 'pragmatic' as any,
    autonomy: 'L3' as any,
    intent: {
      goal: analysis.userGoal,
      context: additionalContext || `Building a ${analysis.complexity} ${analysis.domain} application`,
      constraints: analysis.requirements
    },
    domain: {
      type: analysis.domain,
      stack: analysis.technicalLevel === 'expert' ? ['user_specified_tech_stack'] : []
    },
    preferences: {
      testingStyle: 'balanced',
      docStyle: 'concise',
      toolWidening: 'adaptive'
    },
    signals: {
      frameworks: [],
      scripts: [],
      prdPaths: []
    },
    analysis // Add our analysis for droid generation
  } as any;

  await mkdirp(path.join(cwd, BRIEF_DIR));
  const serialized = yaml.dump(brief, { noRefs: true, lineWidth: 120 });
  await fs.writeFile(briefAbs, serialized, 'utf8');

  console.log(kleur.green('\nPerfect! I\'ve analyzed your project and I\'m ready to create your specialized AI team.'));
  console.log(kleur.blue(`Domain: ${analysis.domain}`));
  console.log(kleur.blue(`Complexity: ${analysis.complexity}`));
  console.log(kleur.blue(`Features detected: ${analysis.requirements.join(', ') || 'general purpose'}\n`));

  return brief;
}