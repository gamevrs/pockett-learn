import { router, Stack, useLocalSearchParams } from 'expo-router';

import { CHOICES, setChoice, type Choice, type ChoiceKey } from '~/components/choices';
import { useSettings } from '~/state/settings';
import { ListRow, ListSection, Screen } from '~/ui';

/** One setting's values, the current one checked. Choosing one goes back. */
export default function Choose() {
  const { key } = useLocalSearchParams<{ key: ChoiceKey }>();
  const spec = CHOICES[key] ?? CHOICES.appearance;
  const current = useSettings((s) => s[key in CHOICES ? key : 'appearance']);
  const options = spec.options as Choice<unknown>[];
  return (
    <Screen>
      <Stack.Screen options={{ title: spec.title }} />
      <ListSection footer={spec.footer}>
        {options.map((o, i) => (
          <ListRow
            key={String(o.value)}
            label={o.label}
            detail={o.detail}
            trailing={o.value === current ? 'check' : 'none'}
            onPress={() => {
              setChoice(key, o.value);
              router.back();
            }}
            last={i === options.length - 1}
          />
        ))}
      </ListSection>
    </Screen>
  );
}
