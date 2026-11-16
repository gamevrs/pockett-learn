import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

import { formatMinutes } from '~/lib/reminders';
import { useScheme } from '~/theme';
import { ListRow } from '~/ui';

/**
 * The reminder time: iOS's compact time picker inside the row; on Android the row opens Material's time dialog.
 * The value is minutes after midnight.
 */
export function TimeRow({ value, onChange, disabled, last, label = 'Reminder time' }: { value: number; onChange: (minutes: number) => void; disabled?: boolean; last?: boolean; label?: string }) {
  const scheme = useScheme();
  const date = new Date(2000, 0, 1, Math.floor(value / 60), value % 60);
  const toMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

  if (Platform.OS === 'ios') {
    return (
      <ListRow
        icon="clock"
        label={label}
        trailing="none"
        disabled={disabled}
        last={last}
        accessory={
          <DateTimePicker
            value={date}
            mode="time"
            display="compact"
            disabled={disabled}
            themeVariant={scheme}
            accessibilityLabel={label}
            onValueChange={(_e, d) => d && onChange(toMinutes(d))}
          />
        }
      />
    );
  }
  return (
    <ListRow
      icon="clock"
      label={label}
      value={formatMinutes(value)}
      disabled={disabled}
      last={last}
      accessibilityHint="Opens a clock to choose the time"
      onPress={() =>
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onValueChange: (_e, d) => d && onChange(toMinutes(d)),
        })
      }
    />
  );
}
