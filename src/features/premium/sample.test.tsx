import { act, renderHook } from '@testing-library/react-native';

import {
  afterSample,
  categorySample,
  consumeSample,
  resetSamplesForTests,
  sampleStore,
  useSampleRun,
  useSamples,
} from './sample';

describe('premium tasters', () => {
  beforeEach(async () => {
    await sampleStore.clear();
    resetSamplesForTests();
  });

  it('spends a taster once', () => {
    const once = afterSample({ used: [] }, 'endless');
    expect(once.used).toEqual(['endless']);
    expect(afterSample(once, 'endless')).toBe(once);
  });

  it('offers every taster until it is played, each on its own', async () => {
    const { result } = renderHook(() => useSamples());
    expect(result.current.ready).toBe(false);
    expect(result.current.canSample('endless')).toBe(false);
    await act(async () => {});
    expect(result.current.ready).toBe(true);
    expect(result.current.canSample('endless')).toBe(true);
    act(() => consumeSample('endless'));
    expect(result.current.canSample('endless')).toBe(false);
    expect(result.current.canSample(categorySample('space'))).toBe(true);
    expect((await sampleStore.read()).used).toEqual(['endless']);
  });

  it('remembers a spent taster across launches', async () => {
    await sampleStore.write({ used: [categorySample('space')] });
    const { result } = renderHook(() => useSamples());
    await act(async () => {});
    expect(result.current.canSample(categorySample('space'))).toBe(false);
  });

  it('keeps a run going after its taster is spent mid-run', async () => {
    const { result } = renderHook(() => useSampleRun('endless'));
    expect(result.current).toBeNull();
    await act(async () => {});
    expect(result.current).toBe(true);
    act(() => consumeSample('endless'));
    expect(result.current).toBe(true);
  });
});
