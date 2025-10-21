import inquirer from 'inquirer';
import kleur from 'kleur';
import type { AutonomyLevel } from '../types.js';

/**
 * Context for a confirmation prompt, including autonomy level and operation details.
 */
export interface ConfirmationContext {
  autonomy: AutonomyLevel;
  operation: string;
  details?: string;
  dryRun: boolean;
}

/**
 * Determine if an operation requires confirmation based on autonomy level.
 * - L1: Confirm everything (maximum control)
 * - L2: Confirm only at checkpoints (write droids, update docs, widen tools, retire droid, merge droids)
 * - L3: Confirm only critical operations (widen tools, shell access, merge droids)
 */
function needsConfirmation(operation: string, autonomy: AutonomyLevel): boolean {
  const opLower = operation.toLowerCase();

  if (autonomy === 'L1') {
    return true; // L1 confirms everything
  }

  if (autonomy === 'L2') {
    // L2 confirms at checkpoints only
    return (
      opLower.includes('write droids') ||
      opLower.includes('update docs') ||
      opLower.includes('widen tools') ||
      opLower.includes('retire droid') ||
      opLower.includes('merge droids') ||
      opLower.includes('refresh proof') ||
      opLower.includes('narrow tools')
    );
  }

  if (autonomy === 'L3') {
    // L3 confirms only critical operations
    return (
      opLower.includes('widen tools') ||
      opLower.includes('shell access') ||
      opLower.includes('merge droids') ||
      opLower.includes('refresh proof') ||
      opLower.includes('narrow tools')
    );
  }

  return false;
}

/**
 * Determine if an operation involves risky actions (write/shell access, retire, merge).
 */
function isRiskyOperation(operation: string): boolean {
  const opLower = operation.toLowerCase();
  return (
    opLower.includes('write') ||
    opLower.includes('shell') ||
    opLower.includes('widen') ||
    opLower.includes('retire') ||
    opLower.includes('merge') ||
    opLower.includes('refresh proof') ||
    opLower.includes('narrow tools')
  );
}

/**
 * Confirm an operation based on autonomy level and dry-run mode.
 * Returns true if the operation is approved or doesn't need confirmation.
 */
export async function confirmOperation(ctx: ConfirmationContext): Promise<boolean> {
  // In dry-run mode, skip all prompts (always return true)
  if (ctx.dryRun) {
    return true;
  }
  
  // Check if this operation needs confirmation based on autonomy level
  if (!needsConfirmation(ctx.operation, ctx.autonomy)) {
    return true; // No confirmation needed at this autonomy level
  }
  
  // Construct prompt message with colors
  let message = kleur.cyan(ctx.operation);
  
  if (ctx.details) {
    message += kleur.gray(` — ${ctx.details}`);
  }
  
  // Wrap risky operations in yellow
  if (isRiskyOperation(ctx.operation)) {
    message = kleur.yellow(` ${message}`);
  }
  
  message += '?';
  
  // Determine default answer based on autonomy level
  const defaultAnswer = ctx.autonomy === 'L1' ? false : true;
  
  // Prompt user
  const result = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message,
      default: defaultAnswer
    }
  ]);
  
  return result.ok as boolean;
}

/**
 * Confirm tool widening from minimal tools to expanded tools.
 * Checks if widening involves Write or Shell access and prompts accordingly.
 */
export async function confirmToolWidening(
  fromTools: string[],
  toTools: string[],
  droidName: string,
  autonomy: AutonomyLevel,
  dryRun: boolean
): Promise<boolean> {
  // Determine which tools are being added
  const addedTools = toTools.filter(t => !fromTools.includes(t));
  
  // Check if widening involves critical tools (Write or Shell)
  const involvesCritical = addedTools.some(t => t === 'Write' || t === 'Shell');
  
  // If no widening or only non-critical additions, auto-approve
  if (addedTools.length === 0 || !involvesCritical) {
    return true;
  }
  
  // Construct details for confirmation prompt
  const details = `${droidName}: [${fromTools.join(', ')}]  [${toTools.join(', ')}]`;
  
  // Use confirmOperation with 'widen tools' operation
  return confirmOperation({
    autonomy,
    operation: 'widen tools',
    details,
    dryRun
  });
}
