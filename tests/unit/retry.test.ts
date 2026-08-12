import { describe, it, expect, vi } from 'vitest';
import { withRetry, ApiError, getRetryAfterMs } from '../../src/utils/retry.js';

describe('utils/retry', () => {
  it('должен возвращать результат успешной функции с 1 попытки', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('должен повторять вызов при временных ошибках и успешно завершаться', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Временный сетевой сбой');
      }
      return 'recovered';
    });

    const result = await withRetry(fn, { minTimeout: 10, maxTimeout: 50 });
    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('не должен повторять вызовы при фатальных ошибках (401 Unauthorized)', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      throw new ApiError('Invalid API Token', { status: 401, isFatal: true });
    });

    await expect(withRetry(fn, { retries: 3, minTimeout: 10 })).rejects.toThrow('Invalid API Token');
    expect(attempts).toBe(1);
  });

  it('должен парсить заголовок Retry-After в секундах', () => {
    expect(getRetryAfterMs({ 'retry-after': '5' })).toBe(5000);
    expect(getRetryAfterMs({ 'Retry-After': '10' })).toBe(10000);
    expect(getRetryAfterMs({})).toBeNull();
  });
});
