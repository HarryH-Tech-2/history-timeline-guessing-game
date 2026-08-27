import * as StoreReview from 'expo-store-review';

import { requestReviewAfterFirstPurchase, reviewPromptStore } from './reviewPrompt';

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
