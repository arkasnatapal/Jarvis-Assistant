import { z } from 'zod';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { CapabilityPermission, RiskLevel, ToolDefinition } from '@jarvis/shared';
import { logger } from '../../logging/logger.js';

export const calculateSchema = z.object({
  expression: z.string().min(1, 'Mathematical expression cannot be empty')
});

export const calculateTool: ToolDefinition<typeof calculateSchema> = {
  name: 'calculate',
  description: 'Evaluates mathematical expressions, symbolic calculus (integration, differentiation, solve), matrix linear algebra, vector math, and engineering control system plots via Python (NumPy, SymPy, SciPy, Matplotlib).',
  inputSchema: calculateSchema,
  riskLevel: RiskLevel.SAFE,
  requiredCapability: CapabilityPermission.MATH_EVAL,
  requiresConfirmation: false,
  timeoutMs: 10000
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mathScriptPath = path.resolve(__dirname, '../../../scripts/math_engine.py');

/**
 * Safe Mathematical Parser - Tokenizer and Recursive Descent Parser
 * Absolutely NO JavaScript `eval()` or Function() constructor!
 */
export function safeEvaluateMath(expr: string): number {
  const cleanExpr = expr.trim();
  if (!cleanExpr) {
    throw new Error('Expression is empty');
  }

  const tokens: string[] = [];
  let i = 0;
  while (i < cleanExpr.length) {
    const ch = cleanExpr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < cleanExpr.length && /[0-9.]/.test(cleanExpr[i])) {
        numStr += cleanExpr[i];
        i++;
      }
      tokens.push(numStr);
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let fnStr = '';
      while (i < cleanExpr.length && /[a-zA-Z]/.test(cleanExpr[i])) {
        fnStr += cleanExpr[i];
        i++;
      }
      tokens.push(fnStr.toLowerCase());
      continue;
    }

    if (['+', '-', '*', '/', '%', '^', '(', ')'].includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }

    throw new Error(`Invalid character in expression: '${ch}'`);
  }

  let pos = 0;

  function parseExpression(): number {
    let result = parseTerm();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const right = parseTerm();
      if (op === '+') result += right;
      if (op === '-') result -= right;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')) {
      const op = tokens[pos++];
      const right = parseFactor();
      if (op === '*') result *= right;
      if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        result /= right;
      }
      if (op === '%') result %= right;
    }
    return result;
  }

  function parseFactor(): number {
    let result = parseExponent();
    while (pos < tokens.length && tokens[pos] === '^') {
      pos++;
      const right = parseFactor();
      result = Math.pow(result, right);
    }
    return result;
  }

  function parseExponent(): number {
    if (pos >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }

    const token = tokens[pos];

    if (token === '-') {
      pos++;
      return -parseExponent();
    }

    if (token === '+') {
      pos++;
      return parseExponent();
    }

    if (token === '(') {
      pos++;
      const result = parseExpression();
      if (pos >= tokens.length || tokens[pos] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      pos++;
      return result;
    }

    if (['sqrt', 'abs', 'round', 'floor', 'ceil', 'sin', 'cos', 'tan'].includes(token)) {
      const fn = token;
      pos++;
      if (pos >= tokens.length || tokens[pos] !== '(') {
        throw new Error(`Expected '(' after math function ${fn}`);
      }
      pos++;
      const arg = parseExpression();
      if (pos >= tokens.length || tokens[pos] !== ')') {
        throw new Error(`Missing closing parenthesis after function ${fn}`);
      }
      pos++;

      switch (fn) {
        case 'sqrt':
          if (arg < 0) throw new Error('Square root of negative number');
          return Math.sqrt(arg);
        case 'abs': return Math.abs(arg);
        case 'round': return Math.round(arg);
        case 'floor': return Math.floor(arg);
        case 'ceil': return Math.ceil(arg);
        case 'sin': return Math.sin(arg);
        case 'cos': return Math.cos(arg);
        case 'tan': return Math.tan(arg);
      }
    }

    const val = Number(token);
    if (isNaN(val)) {
      throw new Error(`Invalid token: '${token}'`);
    }
    pos++;
    return val;
  }

  const finalResult = parseExpression();
  if (pos < tokens.length) {
    throw new Error(`Unexpected extra token at end: '${tokens[pos]}'`);
  }
  return finalResult;
}

export async function executeCalculate(input: z.infer<typeof calculateSchema>): Promise<{ expression: string; result: any; message?: string }> {
  return new Promise((resolve) => {
    const safeExpr = input.expression.replace(/"/g, '\\"');
    const cmd = `python "${mathScriptPath}" "${safeExpr}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.success) {
            return resolve({
              expression: input.expression,
              result: parsed.result,
              message: parsed.message
            });
          }
        } catch {
          // Fall through to JS parser
        }
      }

      try {
        const numRes = safeEvaluateMath(input.expression);
        return resolve({
          expression: input.expression,
          result: numRes,
          message: `Result of ${input.expression} = ${numRes}`
        });
      } catch (err: any) {
        return resolve({
          expression: input.expression,
          result: 0,
          message: `Math calculation error: ${err.message}`
        });
      }
    });
  });
}
