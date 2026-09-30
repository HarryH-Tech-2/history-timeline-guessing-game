// Named HeadToHeadView, not HeadToHead: headToHead.ts sits alongside and the
// two names collide on case-insensitive file systems (Windows, macOS).
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { getQuestionById } from '@/data';
import { displayYear, formatNumber, t } from '@/i18n';

import { statusLine, type Comparison } from './headToHead';

export function HeadToHead({
  comparison,
  creatorName,
  onDone,
  onShare,
}: {
  comparison: Comparison;
  creatorName: string;
  onDone: () => void;
  onShare?: () => void;
}) {
  return (
    <ScrollView contentContainerClassName="gap-4 px-5 py-6" testID="head-to-head">
      <Text className="text-center text-3xl font-extrabold text-ink-primary">
        {statusLine(comparison, creatorName)}
      </Text>
      {comparison.kind !== 'versus' && comparison.me && (
        <Text className="text-center text-lg font-bold text-ink-secondary">
          {t('social.headToHead.yourScore', { score: comparison.me.total })}
        </Text>
      )}
      {comparison.kind === 'versus' &&
        comparison.rounds.map((r) => (
          <View key={r.questionId} className="border border-hair bg-bg-raised p-3">
            <Text className="text-sm font-bold text-ink-primary" numberOfLines={1}>
              {getQuestionById(r.questionId)?.title ?? r.questionId}
            </Text>
            <View className="mt-1 flex-row justify-between">
              <Text className="text-sm text-ink-secondary">
                {t('social.headToHead.youGuessed', { year: displayYear(r.mine), score: r.myScore })}{' '}
                {r.closer === 'me' ? '✓' : ''}
              </Text>
              <Text className="text-sm text-ink-secondary">
                {comparison.them.name} {displayYear(r.theirs)} · {r.theirScore}{' '}
                {r.closer === 'them' ? '✓' : ''}
              </Text>
            </View>
          </View>
        ))}
      {comparison.kind === 'creator' &&
        comparison.challengers.map((c, i) => (
          <View key={c.uid} className="flex-row justify-between border border-hair bg-bg-raised p-3">
            <Text className="text-base font-bold text-ink-primary">
              {i + 1}. {c.name}
            </Text>
            <Text className="text-base font-bold text-ink-primary">{formatNumber(c.total)}</Text>
          </View>
        ))}
      {onShare && <Button label={t('social.headToHead.challengeMore')} onPress={onShare} />}
      <Button label={t('social.headToHead.done')} variant="ghost" onPress={onDone} testID="head-to-head-done" />
    </ScrollView>
  );
}
