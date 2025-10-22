import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import kleur from 'kleur';
import type { ProjectBrief } from '../types.js';

const BRIEF_DIR = '.droidforge';
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
  techStack?: string;
  userTechStack?: string;
  techStackEvaluated?: boolean;
  techStackCoverage?: {
    assets?: boolean;
    sound?: boolean;
    analytics?: boolean;
    testing?: boolean;
    deployment?: boolean;
    database?: boolean;
    auth?: boolean;
    monetization?: boolean;
  };
}

interface ConversationState {
  messages: { role: 'user' | 'assistant', content: string }[];
  currentAnalysis: Partial<ProjectAnalysis> & {
    techStack?: string;
    needsClarification?: string[];
    techStackQuestionAsked?: boolean;
  };
  confidence: number;
}

function createConversationState(): ConversationState {
  return {
    messages: [],
    currentAnalysis: { needsClarification: [] },
    confidence: 0
  };
}

function generateFollowUpQuestion(state: ConversationState): string | null {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage) {
    // First question - ask what they want to build
    return 'What do you want to build?';
  }

  const userInput = lastMessage.content.toLowerCase();

  // If user mentions a domain, dig deeper into their specific needs
  if (userInput.includes('restaurant') || userInput.includes('food')) {
    if (!state.currentAnalysis.domain) {
      state.currentAnalysis.domain = 'restaurant';
      return 'That\'s exciting! Tell me about your restaurant - are you replacing an existing system or starting something fresh?';
    }
    if (!state.currentAnalysis.needsClarification?.includes('restaurant_type')) {
      state.currentAnalysis.needsClarification = [...(state.currentAnalysis.needsClarification || []), 'restaurant_type'];
      return 'What type of restaurant service do you need most help with? Taking orders, managing tables, kitchen display, or something else?';
    }
  }

  if (userInput.includes('dental') || userInput.includes('dentist') || userInput.includes('medical')) {
    if (!state.currentAnalysis.domain) {
      state.currentAnalysis.domain = 'medical/dental';
      return 'Interesting! What\'s the biggest challenge you\'re trying to solve in your dental practice right now?';
    }
    if (!state.currentAnalysis.needsClarification?.includes('medical_pain_point')) {
      state.currentAnalysis.needsClarification = [...(state.currentAnalysis.needsClarification || []), 'medical_pain_point'];
      return 'When patients call your office, what\'s the most frustrating part of managing their appointments and information?';
    }
  }

  if (userInput.includes('fitness') || userInput.includes('gym') || userInput.includes('workout')) {
    if (!state.currentAnalysis.domain) {
      state.currentAnalysis.domain = 'fitness';
      return 'Great! Are you building this for personal use, a gym, or for fitness trainers to work with clients?';
    }
    if (!state.currentAnalysis.needsClarification?.includes('fitness_focus')) {
      state.currentAnalysis.needsClarification = [...(state.currentAnalysis.needsClarification || []), 'fitness_focus'];
      return 'What\'s most important - tracking workouts, planning routines, progress charts, or client management?';
    }
  }

  if (userInput.includes('shop') || userInput.includes('store') || userInput.includes('ecommerce')) {
    if (!state.currentAnalysis.domain) {
      state.currentAnalysis.domain = 'e-commerce';
      return 'Excellent! What kind of products will you be selling, and what\'s been your biggest challenge with managing sales so far?';
    }
    if (!state.currentAnalysis.needsClarification?.includes('ecommerce_type')) {
      state.currentAnalysis.needsClarification = [...(state.currentAnalysis.needsClarification || []), 'ecommerce_type'];
      return 'When customers shop with you, what\'s the experience you want to create - simple browsing, detailed product pages, subscription services, or something else?';
    }
  }

  if (userInput.includes('school') || userInput.includes('course') || userInput.includes('education') || userInput.includes('learning')) {
    if (!state.currentAnalysis.domain) {
      state.currentAnalysis.domain = 'education';
      return 'That\'s fantastic! Education is such an important field. Are you building for students, teachers, or administrators?';
    }
    if (!state.currentAnalysis.needsClarification?.includes('education_focus')) {
      state.currentAnalysis.needsClarification = [...(state.currentAnalysis.needsClarification || []), 'education_focus'];
      return 'What\'s the biggest educational challenge you\'re trying to solve - course delivery, student progress tracking, communication, or something else?';
    }
  }

  if (userInput.includes('banking') || userInput.includes('finance') || userInput.includes('investment') || userInput.includes('money')) {
    if (!state.currentAnalysis.domain) {
      state.currentAnalysis.domain = 'finance';
      return 'Finance is such a critical area! Are you building personal finance tools, business banking solutions, or something else?';
    }
    if (!state.currentAnalysis.needsClarification?.includes('finance_type')) {
      state.currentAnalysis.needsClarification = [...(state.currentAnalysis.needsClarification || []), 'finance_type'];
      return 'What financial problems are you solving - budget tracking, investment management, payment processing, or financial planning?';
    }
  }

  // Tech stack evaluation and completion
  if (!state.currentAnalysis.techStackEvaluated) {
    if (!state.currentAnalysis.userTechStack) {
      // First tech stack question
      if (userInput.includes('swift') || userInput.includes('spritekit') || userInput.includes('xcode')) {
        state.currentAnalysis.userTechStack = 'swift-spritekit';
        return 'Good choice for native iOS! For a complete iOS project, you\'ll also need: asset creation tools, sound effects, analytics, and testing frameworks. Which of these do you already have covered?';
      }
      if (userInput.includes('unity') || userInput.includes('unreal') || userInput.includes('godot')) {
        state.currentAnalysis.userTechStack = 'unity';
        return 'Great for game development! For a complete mobile game, you\'ll also need: mobile optimization, analytics, monetization, and testing. What do you have covered?';
      }
      if (userInput.includes('react') || userInput.includes('vue') || userInput.includes('angular')) {
        state.currentAnalysis.userTechStack = 'web-framework';
        return 'Solid choice for web! For a complete web app, you\'ll also need: database, authentication, hosting, and testing. Which of these do you already have?';
      }
      if (userInput.includes('node') || userInput.includes('python') || userInput.includes('rails') || userInput.includes('django')) {
        state.currentAnalysis.userTechStack = 'backend-framework';
        return 'Great for backend! For a complete application, you\'ll also need: frontend framework, database, authentication, and deployment. What\'s covered on your end?';
      }

      // User hasn't mentioned specific tech
      if (!state.currentAnalysis.techStackQuestionAsked) {
        state.currentAnalysis.techStackQuestionAsked = true;
        return 'Perfect! Do you have a tech stack in mind you\'d like to use, or would you like help selecting one?';
      }
    } else {
      // User mentioned tech stack, now evaluate completeness
      return evaluateAndCompleteTechStack(userInput, state);
    }
  }

  // Look for pain points and requirements
  if (userInput.includes('booking') || userInput.includes('appointment') || userInput.includes('schedule')) {
    if (!state.currentAnalysis.requirements?.includes('booking_system')) {
      state.currentAnalysis.requirements = [...(state.currentAnalysis.requirements || []), 'booking_system'];
      return 'Ah, booking management! What\'s been most frustrating about how you handle appointments or bookings now?';
    }
  }

  if (userInput.includes('payment') || userInput.includes('billing') || userInput.includes('money')) {
    if (!state.currentAnalysis.requirements?.includes('payment_processing')) {
      state.currentAnalysis.requirements = [...(state.currentAnalysis.requirements || []), 'payment_processing'];
      return 'Payment processing can be tricky! Are you looking to take payments online, manage billing, or handle both?';
    }
  }

  // If no domain detected yet, set it based on conversation context
  if (!state.currentAnalysis.domain && state.currentAnalysis.userGoal) {
    // Set a default domain based on the user's goal
    const goal = state.currentAnalysis.userGoal.toLowerCase();
    if (goal.includes('app') || goal.includes('website') || goal.includes('platform')) {
      state.currentAnalysis.domain = 'general';
    }
  }

  // If we have good understanding, check if we need more
  const confidence = calculateConfidence(state);
  if (confidence > 0.75) {
    return null; // Have enough information
  }

  // Default follow-ups based on what we're missing
  if (!state.currentAnalysis.userGoal) {
    return 'Help me understand the big picture - what problem are you trying to solve for your users?';
  }

  if (!state.currentAnalysis.domain) {
    return 'What field or industry does this project relate to? For example, retail, healthcare, education, or is this a personal project?';
  }

  if (!state.currentAnalysis.requirements || state.currentAnalysis.requirements.length === 0) {
    return 'What are the must-have features that would make this project successful for your users?';
  }

  return 'Tell me more about who will be using this and what they need to accomplish.';
}

function evaluateAndCompleteTechStack(userInput: string, state: ConversationState): string | null {
  const input = userInput.toLowerCase();

  // Parse what the user has covered
  const hasAssets = input.includes('asset') || input.includes('art') || input.includes('graphics') || input.includes('drawing');
  const hasSound = input.includes('sound') || input.includes('audio') || input.includes('music');
  const hasAnalytics = input.includes('analytics') || input.includes('firebase') || input.includes('tracking');
  const hasTesting = input.includes('test') || input.includes('xctest') || input.includes('testing');
  const hasDeployment = input.includes('deploy') || input.includes('xcode') || input.includes('app store');
  const hasDatabase = input.includes('database') || input.includes('firebase') || input.includes('data');
  const hasAuth = input.includes('auth') || input.includes('login') || input.includes('user');
  const hasMonetization = input.includes('monetiz') || input.includes('ads') || input.includes('payment') || input.includes('iap');

  // Store what they have
  state.currentAnalysis.techStackCoverage = {
    assets: hasAssets,
    sound: hasSound,
    analytics: hasAnalytics,
    testing: hasTesting,
    deployment: hasDeployment,
    database: hasDatabase,
    auth: hasAuth,
    monetization: hasMonetization
  };

  // Evaluate and complete based on their base stack
  if (state.currentAnalysis.userTechStack === 'swift-spritekit') {
    if (!hasAnalytics && !hasTesting) {
      return 'For analytics and testing, would you like Firebase Analytics + XCTest, or prefer different tools?';
    }
    if (!hasAssets) {
      return 'For game assets, are you planning to create them yourself or use asset packs from the Unity/Unreal store?';
    }
    state.currentAnalysis.techStackEvaluated = true;
    return null;
  }

  if (state.currentAnalysis.userTechStack === 'unity') {
    if (!hasAnalytics && !hasTesting) {
      return 'For analytics and testing, do you prefer Unity\'s built-in tools or Firebase + custom testing?';
    }
    if (!hasMonetization) {
      return 'For monetization, are you thinking ads, in-app purchases, or premium one-time purchase?';
    }
    state.currentAnalysis.techStackEvaluated = true;
    return null;
  }

  if (state.currentAnalysis.userTechStack === 'web-framework') {
    if (!hasDatabase && !hasAuth) {
      return 'For database and authentication, would you like Firebase (easy setup) or prefer to build your own with PostgreSQL + Passport?';
    }
    if (!hasDeployment) {
      return 'For hosting, are you thinking Vercel/Netlify (easy) or AWS/DigitalOcean (more control)?';
    }
    state.currentAnalysis.techStackEvaluated = true;
    return null;
  }

  if (state.currentAnalysis.userTechStack === 'backend-framework') {
    if (!hasDatabase && !hasDeployment) {
      return 'For database and deployment, would you like managed solutions (MongoDB Atlas + Heroku) or self-hosted?';
    }
    if (!hasAuth) {
      return 'For authentication, would you prefer JWT + Passport, or use Auth0/Firebase Auth?';
    }
    state.currentAnalysis.techStackEvaluated = true;
    return null;
  }

  state.currentAnalysis.techStackEvaluated = true;
  return null;
}

function calculateConfidence(state: ConversationState): number {
  let confidence = 0;
  const factors = [
    { field: 'userGoal', weight: 0.15 },
    { field: 'domain', weight: 0.15 },
    { field: 'technicalLevel', weight: 0.1 },
    { field: 'requirements', weight: 0.2, isArray: true },
    { field: 'complexity', weight: 0.05 },
    { field: 'needsClarification', weight: 0.05, isArray: true },
    { field: 'techStackEvaluated', weight: 0.2 },
    { field: 'userTechStack', weight: 0.1 }
  ];

  for (const factor of factors) {
    if (factor.isArray) {
      const value = state.currentAnalysis[factor.field as keyof ConversationState['currentAnalysis']] as string[];
      if (value && value.length > 0) {
        confidence += factor.weight;
      }
    } else {
      if (state.currentAnalysis[factor.field as keyof ConversationState['currentAnalysis']]) {
        confidence += factor.weight;
      }
    }
  }

  return Math.min(confidence, 1);
}

function analyzeConversation(state: ConversationState): ProjectAnalysis {
  const allText = state.messages.map(m => m.content).join(' ').toLowerCase();

  // Determine complexity based on conversation depth
  let complexity: 'simple' | 'medium' | 'complex' = 'medium';
  const messageCount = state.messages.filter(m => m.role === 'user').length;

  if (messageCount <= 2) {
    complexity = 'simple';
  } else if (messageCount >= 5 || (state.currentAnalysis.requirements && state.currentAnalysis.requirements.length > 3)) {
    complexity = 'complex';
  }

  // Extract any remaining requirements from full conversation
  const requirements = state.currentAnalysis.requirements || [];

  // Add requirements based on conversation analysis
  if (allText.includes('booking') || allText.includes('appointment') || allText.includes('schedule')) {
    if (!requirements.includes('booking_system')) requirements.push('booking_system');
  }
  if (allText.includes('payment') || allText.includes('billing') || allText.includes('money')) {
    if (!requirements.includes('payment_processing')) requirements.push('payment_processing');
  }
  if (allText.includes('user') || allText.includes('account') || allText.includes('customer')) {
    if (!requirements.includes('user_management')) requirements.push('user_management');
  }
  if (allText.includes('mobile') || allText.includes('phone')) {
    if (!requirements.includes('mobile_responsive')) requirements.push('mobile_responsive');
  }

  return {
    domain: state.currentAnalysis.domain || 'general',
    complexity,
    technicalLevel: state.currentAnalysis.technicalLevel || 'beginner',
    userGoal: state.currentAnalysis.userGoal || 'Build a custom application',
    requirements,
    domainSpecific: [],
    techStack: state.currentAnalysis.techStack
  };
}


async function conductConversation(): Promise<ProjectAnalysis> {
  const state = createConversationState();

  console.log(kleur.cyan('\nHello! I\'m here to help you create the perfect AI team for your project.\n'));
  console.log(kleur.gray('I\'ll ask you some questions to understand what you want to build, and we\'ll keep talking until I have enough detail to create the ideal specialized droids for you.\n'));

  let conversationComplete = false;
  let turnCount = 0;
  const maxTurns = 10; // Safety limit

  while (!conversationComplete && turnCount < maxTurns) {
    turnCount++;

    // Generate the next question
    const question = generateFollowUpQuestion(state);

    if (!question) {
      // We have enough information
      conversationComplete = true;
      break;
    }

    // Ask the question
    console.log(kleur.yellow(question));

    const { response } = await inquirer.prompt([
      {
        type: 'input',
        name: 'response',
        message: kleur.gray('>'),
        validate: (input: string) => {
          if (input.trim().length < 3) {
            return 'Please share a bit more so I can better understand your needs.';
          }
          return true;
        }
      }
    ]) as { response: string };

    // Add to conversation
    state.messages.push({ role: 'user', content: response });
    state.messages.push({ role: 'assistant', content: question });

    // Store the first response as the main goal
    if (!state.currentAnalysis.userGoal) {
      state.currentAnalysis.userGoal = response;
    }

    // Check if we have sufficient understanding
    const confidence = calculateConfidence(state);
    if (confidence > 0.75) {
      conversationComplete = true;
    }

    // Add some helpful guidance if user seems stuck
    if (response.toLowerCase().includes('not sure') || response.toLowerCase().includes('i don\'t know')) {
      console.log(kleur.blue('\nNo problem! Let me help you think through it.\n'));
      console.log(kleur.gray('Many people start with just a general idea. Tell me about the problem you\'re trying to solve or the people you want to help, and we can figure out the technical details together.\n'));
    }
  }

  if (turnCount >= maxTurns) {
    console.log(kleur.blue('\nI have enough information to get started! We can always refine later as your project evolves.\n'));
  }

  console.log(kleur.green('\nPerfect! I now understand your project well enough to create your specialized AI team.\n'));

  return analyzeConversation(state);
}

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

  // Conduct the conversational analysis
  const analysis = await conductConversation();

  // Generate the project brief
  const brief: ProjectBrief = {
    version: 1,
    mode: 'new-project' as any,
    persona: 'pragmatic' as any,
    autonomy: 'L3' as any,
    intent: {
      goal: analysis.userGoal,
      context: `Building a ${analysis.complexity} ${analysis.domain} application`,
      constraints: analysis.requirements
    },
    domain: {
      type: analysis.domain,
      stack: [] // Will be determined during droid generation
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
    analysis // Add our conversation analysis for droid generation
  } as any;

  await mkdirp(path.join(cwd, BRIEF_DIR));
  const serialized = yaml.dump(brief, { noRefs: true, lineWidth: 120 });
  await fs.writeFile(briefAbs, serialized, 'utf8');

  console.log(kleur.blue(`Project Domain: ${analysis.domain}`));
  console.log(kleur.blue(`Complexity: ${analysis.complexity}`));
  console.log(kleur.blue(`Features Identified: ${analysis.requirements.join(', ') || 'general purpose'}`));
  console.log(kleur.green('\nYour specialized AI droids are now being created!\n'));

  return brief;
}