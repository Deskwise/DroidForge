import { diffLines } from 'diff';
import kleur from 'kleur';
import { promises as fs } from 'node:fs';

/**
 * Show a colored diff between existing file content and new content.
 * Displays added lines in green, removed lines in red, and unchanged lines in gray.
 */
export async function showDiff(filePath: string, newContent: string, context: number = 3): Promise<void> {
  let oldContent = '';
  
  // Try to read existing file; if not found, treat as empty (all new content)
  try {
    oldContent = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    // File doesn't exist - all lines will be shown as additions
  }
  
  // Print header with file path
  console.log(kleur.cyan(`diff: ${filePath}`));
  
  // Compute line-by-line diff
  const diff = diffLines(oldContent, newContent);

  // Collapse unchanged context by trimming long equal sections
  let inEqualSection = false;
  let equalStartIndex = -1;
  let totalEqualLines = 0;

  // First pass: identify long equal sections
  const partsToProcess: Array<{ part: any[]; startLine: number; lineCount: number; collapsed: boolean }> = [];
  let currentLine = 0;

  for (let i = 0; i < diff.length; i++) {
    const part = diff[i];
    const lines = part.value.split('\n').filter(line => line !== ''); // Remove empty lines

    if (!part.added && !part.removed) {
      // Unchanged lines
      if (!inEqualSection) {
        inEqualSection = true;
        equalStartIndex = i;
        totalEqualLines = lines.length;
      } else {
        totalEqualLines += lines.length;
      }
    } else {
      // Changed lines
      if (inEqualSection) {
        // End of equal section, determine if it should be collapsed
        const shouldCollapse = totalEqualLines > context * 2;
        partsToProcess.push({
          part: diff.slice(equalStartIndex, i),
          startLine: currentLine,
          lineCount: totalEqualLines,
          collapsed: shouldCollapse
        });
        inEqualSection = false;
        equalStartIndex = -1;
        totalEqualLines = 0;
      }
      partsToProcess.push({
        part: [part],
        startLine: currentLine,
        lineCount: lines.length,
        collapsed: false
      });
    }
    currentLine += lines.length;
  }

  // Handle trailing equal section
  if (inEqualSection) {
    const shouldCollapse = totalEqualLines > context * 2;
    partsToProcess.push({
      part: diff.slice(equalStartIndex),
      startLine: currentLine,
      lineCount: totalEqualLines,
      collapsed: shouldCollapse
    });
  }

  // Second pass: process parts with collapsing
  for (const { part, collapsed } of partsToProcess) {
    if (collapsed) {
      // Show first context lines, ellipsis, and last context lines
      const allLines = part.flatMap((p: any) => p.value.split('\n').filter((line: string) => line !== ''));
      const headLines = allLines.slice(0, context);
      const tailLines = allLines.slice(-context);

      // Print head context
      for (const line of headLines) {
        process.stdout.write(kleur.gray(`  ${line}\n`));
      }

      // Print ellipsis if there are lines in between
      if (allLines.length > context * 2) {
        process.stdout.write(kleur.dim(`  ... (${allLines.length - context * 2} lines omitted) ...\n`));
      }

      // Print tail context
      for (const line of tailLines) {
        process.stdout.write(kleur.gray(`  ${line}\n`));
      }
    } else {
      // Print all lines in this part normally
      for (const p of part) {
        const lines = p.value.split('\n');

        // Remove trailing empty line if present (common from split)
        if (lines[lines.length - 1] === '') {
          lines.pop();
        }

        for (const line of lines) {
          if (p.added) {
            process.stdout.write(kleur.green(`+ ${line}\n`));
          } else if (p.removed) {
            process.stdout.write(kleur.red(`- ${line}\n`));
          } else {
            process.stdout.write(kleur.gray(`  ${line}\n`));
          }
        }
      }
    }
  }
}

/**
 * Preview a file write by showing the diff and a separator.
 * This is the main entry point for file write previews.
 */
export async function previewFileWrite(filePath: string, content: string, context?: number): Promise<void> {
  await showDiff(filePath, content, context);
  console.log(kleur.gray('—'.repeat(60)));
}
