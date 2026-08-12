import { describe, it, expect } from 'vitest';
import { LinearClient } from '../../src/clients/linear/client.js';

describe('clients/linear/client', () => {
  it('должен выбрасывать ошибку, если токен не передан', () => {
    expect(() => new LinearClient({ apiToken: '' })).toThrow(
      'Linear API токен обязателен',
    );
  });

  it('должен успешно инициализироваться с валидным токеном', () => {
    const client = new LinearClient({ apiToken: 'lin_api_test123' });
    expect(client).toBeDefined();
  });
});
