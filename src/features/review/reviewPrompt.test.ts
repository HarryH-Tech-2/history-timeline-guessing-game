import * as StoreReview from 'expo-store-review';

import type { RoundResult } from '@/domain';

import {
  isStrongRun,
  requestReviewAfterFirstPurchase,
  requestReviewAfterStrongRun,
  reviewPromptStore,
  runScoreFraction,
} from './reviewPrompt';

function roundOf(total: number): RoundResult {
  return {
    question: { year: 2000 } as RoundResult['question'],
    guessYear: 2000,
    errorYears: 0,
    score: { base: total, comboMultiplier: 1, streakBonus: 0, total },
    isPerfect: false,
  };
}

jest.mock('expo-store-review', () => ({
  hasAction: jest.fn(async () => true),
  requestReview: jest.fn(async () => undefined),
}));
const mockHasAction = StoreReview.hasAction as jest.Mock;
const mockRequestReview = StoreReview.requestReview as jest.Mock;

describe('requestReviewAfterFirstPurchase', () => {
  beforeEach(async () => {
    mockHasAction.mockReset().mockResolvedValue(true);
    mockRequestReview.mockReset().mockResolvedValue(undefined);
    await reviewPromptStore.clear();
  });

  it('opens the native review sheet and marks the ask as done', async () => {
    await requestReviewAfterFirstPurchase({ delayMs: 0 });

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    await expect(reviewPromptStore.read()).resolves.toEqual({ done: true });
  });

  it('never asks a second time', async () => {
    await requestReviewAfterFirstPurchase({ delayMs: 0 });
    await requestReviewAfterFirstPurchase({ delayMs: 0 });

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('does nothing, and stays un-done, when no review flow is available', async () => {
    mockHasAction.mockResolvedValue(false);

    await requestReviewAfterFirstPurchase({ delayMs: 0 });

    expect(mockRequestReview).not.toHaveBeenCalled();
    await expect(reviewPromptStore.read()).resolves.toEqual({ done: false });
  });

  it('treats a review flow that throws as not done', async () => {
    mockRequestReview.mockRejectedValue(new Error('Play Services missing'));

    await expect(requestReviewAfterFirstPurchase({ delayMs: 0 })).resolves.toBeUndefined();
    await expect(reviewPromptStore.read()).resolves.toEqual({ done: false });
  });

  it('still parses the legacy round-counter record', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('chronos.reviewPrompt', JSON.stringify({ roundsPlayed: 3, done: true }));

    await requestReviewAfterFirstPurchase({ delayMs: 0 });

    expect(mockRequestReview).not.toHaveBeenCalled();
  });
});

describe('requestReviewAfterStrongRun', () => {
  beforeEach(async () => {
    mockHasAction.mockReset().mockResolvedValue(true);
    mockRequestReview.mockReset().mockResolvedValue(undefined);
    await reviewPromptStore.clear();
  });

  it('measures a run against its maximum possible score', () => {
    expect(runScoreFraction([])).toBe(0);
    expect(runScoreFraction([roundOf(1000), roundOf(500)])).toBe(0.75);
    expect(isStrongRun([roundOf(1000), roundOf(500)])).toBe(false); // exactly 75% is not "over"
    expect(isStrongRun([roundOf(1000), roundOf(510)])).toBe(true);
    // Combo multipliers can push a run past 100%; still strong.
    expect(isStrongRun([roundOf(1300), roundOf(1200)])).toBe(true);
  });

  it('asks after a strong run in any mode, once', async () => {
    await requestReviewAfterStrongRun([roundOf(900), roundOf(800)], { delayMs: 0 });
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    await expect(reviewPromptStore.read()).resolves.toEqual({ done: true });

    await requestReviewAfterStrongRun([roundOf(1000)], { delayMs: 0 });
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('stays quiet after a weak run', async () => {
    await requestReviewAfterStrongRun([roundOf(600), roundOf(400)], { delayMs: 0 });
    expect(mockHasAction).not.toHaveBeenCalled();
    expect(mockRequestReview).not.toHaveBeenCalled();
    await expect(reviewPromptStore.read()).resolves.toEqual({ done: false });
  });

  it('shares the once-per-install flag with the purchase ask', async () => {
    await requestReviewAfterFirstPurchase({ delayMs: 0 });
    await requestReviewAfterStrongRun([roundOf(1000)], { delayMs: 0 });
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });
});
