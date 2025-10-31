#!/usr/bin/env node

/**
 * Simple CLI to view and analyze DroidForge session logs
 * Usage: node scripts/view-session.js <session-id>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SESSIONS_DIR = process.env.DF_UAT_LOG_DIR || path.join(process.env.HOME!, '.factory', 'sessions');

function readSession(sessionId) {
  const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
  if (!fs.existsSync(sessionFile)) {
    console.error(`Session file not found: ${sessionFile}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(sessionFile, 'utf8')
    .split('\n')
    .filter(line => line.trim());
  
  return lines;
}

function analyzeSession(lines) {
  console.log(`\n📊 Session Analysis for ${process.argv[2] || 'latest'}:\n`);
  
  const userMessages = [];
  const aiResponses = [];
  const toolCalls = [];
  
  let currentSpeaker = null;
  let currentTool = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse user messages
    if (line.startsWith('[user ->')) {
      const message = line.substring(9).trim();
      userMessages.push(message);
      currentSpeaker = 'user';
    }
    // Parse AI responses
    else if (line.startsWith('[assistant]')) {
      aiResponses.push(line);
      currentSpeaker = 'assistant';
    }
    // Parse tool calls
    else if (line.includes('[MCP]')) {
      toolCalls.push(line);
      currentTool = 'tool';
    }
  }
  
  console.log(`\n👥 Participants:`);
  console.log(`  User: ${userMessages.length} messages`);
  console.log(`  Assistant: ${aiResponses.length} responses`);
  console.log(`  Tools: ${toolCalls.length} calls`);
  
  // Analyze vision comprehension
  const visionQuestions = aiResponses.filter(resp => 
    resp.includes('What makes this project meaningful') || 
    resp.includes('What matters most to you personally') ||
    resp.includes('help me understand')
  );
  
  console.log(`\n🎯 Vision Comprehension:`);
  console.log(`  Deep-dive questions asked: ${visionQuestions.length}`);
  
  if (visionQuestions.length > 0) {
    console.log(`  ✅ AI demonstrated understanding of user's personal motivations`);
  } else {
    console.log(`  ❌ AI did NOT ask vision deep-dive questions`);
  }
  
  // Check for assumptions
  const assumptions = aiResponses.filter(resp => 
    resp.includes('letter A') ||
    resp.includes('giant') ||
    resp.includes('just build')
  );
  
  console.log(`\n⚠️  Assumptions detected: ${assumptions.length}`);
  if (assumptions.length > 0) {
    console.log(`  ❌ AI made inappropriate assumptions instead of asking clarifying questions`);
  } else {
    console.log(`  ✅ AI avoided assumptions, asked clarifying questions`);
  }
  
  // Check conversation flow
  const hasVisionConfirmation = aiResponses.some(resp => 
    resp.includes('Does this capture what you\'re trying to achieve') ||
    resp.includes('Perfect, let\'s move on')
  );
  
  console.log(`\n🔄 Conversation Flow:`);
  if (hasVisionConfirmation) {
    console.log(`  ✅ AI confirmed understanding before proceeding`);
  } else {
    console.log(`  ⚠️ AI may have rushed without confirmation`);
  }
  
  console.log(`\n📝 Full transcript available in: ${SESSIONS_DIR}`);
  console.log(`\n💡 Run with: node scripts/view-session.js <session-id>`);
}

function main() {
  const sessionId = process.argv[2];
  
  if (!sessionId) {
    console.error('Usage: node scripts/view-session.js <session-id>');
    process.exit(1);
  }
  
  const lines = readSession(sessionId);
  analyzeSession(lines);
}

if (require.main === module) {
  main();
}