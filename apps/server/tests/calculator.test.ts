import { describe, it, expect } from 'vitest';
import { safeEvaluateMath } from '../src/tools/built-in/calculator.tool.js';

describe('Calculator Tool - Safe Evaluator', () => {
  it('evaluates basic arithmetic expressions correctly', () => {
    expect(safeEvaluateMath('25 * 17')).toBe(425);
    expect(safeEvaluateMath('482 * 37')).toBe(17834);
    expect(safeEvaluateMath('(15 + 5) / 2')).toBe(10);
    expect(safeEvaluateMath('100 - 45.5')).toBe(54.5);
  });

  it('handles math functions like sqrt, abs, round, pow', () => {
    expect(safeEvaluateMath('sqrt(144)')).toBe(12);
    expect(safeEvaluateMath('abs(-50)')).toBe(50);
    expect(safeEvaluateMath('2 ^ 4')).toBe(16);
    expect(safeEvaluateMath('round(4.6)')).toBe(5);
  });

  it('throws structured error for division by zero', () => {
    expect(() => safeEvaluateMath('10 / 0')).toThrow('Division by zero');
  });

  it('throws structured error for invalid characters and syntax', () => {
    expect(() => safeEvaluateMath('alert(1)')).toThrow();
    expect(() => safeEvaluateMath('eval("2+2")')).toThrow();
    expect(() => safeEvaluateMath('2 + * 3')).toThrow();
  });
});
