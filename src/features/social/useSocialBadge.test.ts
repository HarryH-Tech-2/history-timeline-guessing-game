import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

const mockApi = { fetchSocialState: jest.fn(), fetchEntries: jest.fn() };
jest.mock('./api', () => ({
  fetchSocialState: (...a: unknown[]) => mockApi.fetchSocialState(...a),
  fetchEntries: (...a: unknown[]) => mockApi.fetchEntries(...a),
}));
const mockAuth = { uid: 'me' as string | null };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => mockAuth }));

// eslint-disable-next-line import/first
import { unseenCount, useSocialBadge } from './useSocialBadge';

const entries = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: `u${i}` }));

it('counts challenges with more entries than last seen', () => {
  expect(
    unseenCount({ groupIds: [], challengeCodes: ['A', 'B', 'C'], seen: { A: 2, B: 1 } }, { A: 2, B: 3, C: 1 }),
  ).toBe(2);
});

describe('useSocialBadge', () => {
  let listener: ((s: AppStateStatus) => void) | undefined;
  let now = 1_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.uid = 'me';
    listener = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, cb) => {
      listener = cb as (s: AppStateStatus) => void;
      return { remove: jest.fn() } as never;
    });
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows the dot when a challenge has unseen results', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ groupIds: [], challengeCodes: ['A'], seen: { A: 1 } });
    mockApi.fetchEntries.mockResolvedValue(entries(2));
    const { result } = renderHook(() => useSocialBadge());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays off when everything has been seen', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ groupIds: [], challengeCodes: ['A'], seen: { A: 2 } });
    mockApi.fetchEntries.mockResolvedValue(entries(2));
    const { result } = renderHook(() => useSocialBadge());
    await waitFor(() => expect(mockApi.fetchEntries).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('fails silently: no badge, no throw', async () => {
    mockApi.fetchSocialState.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useSocialBadge());
    await waitFor(() => expect(mockApi.fetchSocialState).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('does nothing without a uid', () => {
    mockAuth.uid = null;
    const { result } = renderHook(() => useSocialBadge());
    expect(mockApi.fetchSocialState).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('re-checks on foreground at most once a minute', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ groupIds: [], challengeCodes: [], seen: {} });
    renderHook(() => useSocialBadge());
    await waitFor(() => expect(mockApi.fetchSocialState).toHaveBeenCalledTimes(1));

    now += 30_000;
    await act(async () => listener?.('active'));
    expect(mockApi.fetchSocialState).toHaveBeenCalledTimes(1);

    now += 31_000;
    await act(async () => listener?.('active'));
    expect(mockApi.fetchSocialState).toHaveBeenCalledTimes(2);

    now += 120_000;
    await act(async () => listener?.('background'));
    expect(mockApi.fetchSocialState).toHaveBeenCalledTimes(2);
  });
});
