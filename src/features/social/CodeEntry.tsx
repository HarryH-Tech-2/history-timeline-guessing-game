import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
import { t } from '@/i18n';

import { normaliseCode } from './shareInvite';

/** A 6-character code box with an action button that enables once the code is valid. */
export function CodeEntry({
  label,
  onCode,
  testID,
}: {
  label: string;
  onCode: (code: string) => void;
  testID: string;
}) {
  const [raw, setRaw] = useState('');
  const code = normaliseCode(raw);
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={raw}
          onChangeText={setRaw}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          placeholder="ABC234"
          testID={`${testID}-input`}
          className="h-12 flex-1 border border-hair bg-bg-raised px-3 text-lg font-bold tracking-widest text-ink-primary"
        />
        <View className="w-28">
          <Button label={label} disabled={!code} onPress={() => code && onCode(code)} testID={testID} />
        </View>
      </View>
      {raw.length >= 6 && !code && <Text className="text-xs text-danger">{t('social.checkCode')}</Text>}
    </View>
  );
}
