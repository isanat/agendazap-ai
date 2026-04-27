import { describe, it, expect, vi } from 'vitest';

// Mock the db module BEFORE importing the functions
vi.mock('@/lib/db', () => ({
  db: {},
}));

import { detectNameInMessage, detectPaymentPreference } from '../ai-context-service';

describe('detectNameInMessage', () => {
  it('should detect "Meu nome é João"', () => {
    const result = detectNameInMessage('Meu nome é João');
    expect(result).toBe('João');
  });

  it('should detect "Me chamo Maria Silva"', () => {
    const result = detectNameInMessage('Me chamo Maria Silva');
    expect(result).toBe('Maria Silva');
  });

  it('should detect "Pode me chamar de Pedro"', () => {
    const result = detectNameInMessage('Pode me chamar de Pedro');
    expect(result).toBe('Pedro');
  });

  it('should detect "Eu sou a Ana"', () => {
    const result = detectNameInMessage('Eu sou a Ana');
    expect(result).toBe('Ana');
  });

  it('should detect "Sou o Carlos"', () => {
    const result = detectNameInMessage('Sou o Carlos');
    expect(result).toBe('Carlos');
  });

  it('should return null for messages without name', () => {
    const result = detectNameInMessage('Quero agendar um corte');
    expect(result).toBeNull();
  });

  it('should return null for greetings', () => {
    const result = detectNameInMessage('Olá, bom dia!');
    expect(result).toBeNull();
  });

  it('should return null for empty message', () => {
    const result = detectNameInMessage('');
    expect(result).toBeNull();
  });

  it('should handle name with accent', () => {
    const result = detectNameInMessage('Meu nome é André');
    expect(result).toBe('André');
  });

  it('should handle compound name', () => {
    const result = detectNameInMessage('Me chamo Ana Maria');
    expect(result).toBe('Ana Maria');
  });

  it('should not detect numbers as names', () => {
    const result = detectNameInMessage('Meu nome é 123');
    expect(result).toBeNull();
  });
});

describe('detectPaymentPreference', () => {
  it('should detect PIX preference', () => {
    expect(detectPaymentPreference('Quero pagar com PIX')).toBe('pix');
  });

  it('should detect credit card preference', () => {
    expect(detectPaymentPreference('Vou pagar com cartão')).toBe('credit_card');
  });

  it('should detect cash preference', () => {
    expect(detectPaymentPreference('Vou pagar em dinheiro')).toBe('cash');
  });

  it('should detect in-person preference', () => {
    expect(detectPaymentPreference('Pago presencialmente')).toBe('in_person');
  });

  it('should detect online preference', () => {
    expect(detectPaymentPreference('Prefiro pagar online')).toBe('online');
  });

  it('should detect debit card preference', () => {
    expect(detectPaymentPreference('Quero pagar com débito')).toBe('debit_card');
  });

  it('should return null for messages without payment mention', () => {
    expect(detectPaymentPreference('Quero agendar um corte')).toBeNull();
  });

  it('should return null for empty message', () => {
    expect(detectPaymentPreference('')).toBeNull();
  });

  it('should be case insensitive', () => {
    expect(detectPaymentPreference('PIX')).toBe('pix');
    expect(detectPaymentPreference('pix')).toBe('pix');
    expect(detectPaymentPreference('Pix')).toBe('pix');
  });
});
