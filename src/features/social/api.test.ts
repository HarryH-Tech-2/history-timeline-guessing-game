import { isAlreadyPlayed, socialErrorCode, socialErrorMessage } from './api';

describe('social api errors', () => {
  it('exposes the HttpsError code without the functions/ prefix', () => {
    expect(socialErrorCode({ code: 'functions/already-exists' })).toBe('already-exists');
    expect(socialErrorCode(new Error('x'))).toBe('');
    expect(socialErrorCode(null)).toBe('');
  });

  it('distinguishes already-played from other failures', () => {
    expect(isAlreadyPlayed({ code: 'functions/already-exists' })).toBe(true);
    expect(isAlreadyPlayed({ code: 'functions/not-found' })).toBe(false);
    expect(isAlreadyPlayed(new Error('offline'))).toBe(false);
  });

  it('maps codes to friendly copy', () => {
    expect(socialErrorMessage({ code: 'functions/resource-exhausted' })).toBe('That group is full.');
    expect(socialErrorMessage(new Error('offline'))).toContain('connection');
  });
});
