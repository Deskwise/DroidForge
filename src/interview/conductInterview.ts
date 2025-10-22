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

async function generateFollowUpQuestion(state: ConversationState): Promise<string | null> {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage) {
    // First question - ask what they want to build
    return 'What do you want to build?';
  }

  // Build conversation context for AI analysis
  const conversationHistory = state.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

  // Create AI prompt for intelligent question generation
  const analysisPrompt = `
You are a BMAD (Business Method Analysis and Discovery) analyst conducting an interview to understand a software project.

Current conversation:
${conversationHistory}

Your role: Analyze the user's response and ask an intelligent follow-up question that:
1. Shows you understand what they said (don't repeat keywords)
2. Asks about the most important missing information
3. Sounds like a real technical analyst, not a bot
4. Focuses on understanding: domain, requirements, user needs, and tech preferences
5. Avoids generic questions - be specific to what they just said

What's the single best follow-up question? Keep it conversational and brief (under 20 words).

If you have enough information to understand their project (domain, key requirements, basic tech direction), respond with: "SUFFICIENT_INFO"
`;

  try {
    // Use AI to analyze and generate intelligent response
    const response = await generateAIResponse(analysisPrompt);

    if (response.trim() === 'SUFFICIENT_INFO') {
      return null; // Have enough information
    }

    return response.trim();

  } catch (error) {
    console.error('AI analysis failed, falling back to basic questions:', error);
    // Fallback to simple question if AI fails
    return 'Tell me more about what you\'re trying to build and who it\'s for.';
  }
}

async function generateAIResponse(prompt: string): Promise<string> {
  // This should integrate with an AI model (Claude, OpenAI, etc.)
  // For now, implement a basic contextual response system

  // In a real implementation, this would call an AI API with the prompt
  // The AI would analyze the conversation and generate intelligent responses

  // TODO: Replace with actual AI model integration
  // For now, use simple pattern matching as a fallback

  // Generate responses based on prompt context
  if (prompt.includes('What do you want to build')) {
    return "Tell me about the problem you're trying to solve.";
  }

  if (prompt.includes('donut maker')) {
    return "Interesting! Tell me about your donut business - are you a bakery owner, or thinking of starting one?";
  }

  if (prompt.includes('software')) {
    return "What kind of software - web app, mobile app, desktop application, or something else?";
  }

  if (prompt.includes('web app')) {
    return "Web apps are great choices! What's the main functionality you need to support?";
  }

  if (prompt.includes('mobile app')) {
    return "Mobile apps are very popular! Are you thinking iOS, Android, or both?";
  }

  // Default intelligent question
  return "What's the main problem this solves for the people who will use it?";
}

function analyzeConversationWithAI(state: ConversationState): ProjectAnalysis {
  // Use AI to analyze the conversation and extract project insights
  const conversationText = state.messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const analysisPrompt = `
You are a technical analyst analyzing a conversation about a software project.

Conversation:
${conversationText}

Extract the following information (be specific and concise):
1. Domain/Industry: What field is this for?
2. Main Goal: What does this project do?
3. Requirements: What are the key features needed?
4. Technical Level: beginner, intermediate, or advanced?
5. Complexity: simple, medium, or complex?

Respond in JSON format:
{
  "domain": "domain name",
  "userGoal": "main project goal",
  "requirements": ["req1", "req2", "req3"],
  "technicalLevel": "beginner|intermediate|advanced",
  "complexity": "simple|medium|complex"
}
`;

  try {
    // TODO: Replace with actual AI call
    const aiResponse = generateAIResponse(analysisPrompt);

    // For now, return a basic analysis structure
    // TODO: Parse AI response properly
    return {
      domain: 'general',
      complexity: 'medium',
      technicalLevel: 'intermediate',
      userGoal: state.messages.find(m => m.role === 'user')?.content || 'Build a software application',
      requirements: [],
      domainSpecific: [],
      techStack: undefined
    };

  } catch (error) {
    console.error('AI analysis failed:', error);
    // Fallback to basic analysis
    return {
      domain: 'general',
      complexity: 'medium',
      technicalLevel: 'intermediate',
      userGoal: state.messages.find(m => m.role === 'user')?.content || 'Build a software application',
      requirements: [],
      domainSpecific: [],
      techStack: undefined
    };
  }
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

    // Generate the next question using AI
    const question = await generateFollowUpQuestion(state);

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

    // AI determines when conversation is complete by returning null
    // No additional confidence calculation needed

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

  return analyzeConversationWithAI(state);
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