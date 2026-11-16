import * as Haptics from 'expo-haptics';
import * as MailComposer from 'expo-mail-composer';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Platform, Share, StyleSheet, View } from 'react-native';

import { Celebration } from '~/components/Celebration';
import { EmbedView, type EmbedHandle } from '~/components/EmbedView';
import { HeaderIconButton } from '~/components/HeaderIconButton';
import { useToday } from '~/components/learning';
import { HeaderMenu } from '~/components/LessonMenu';
import { lessonForPath } from '~/lib/catalog';
import type { EmbedMessage } from '~/lib/bridge';
import { currentStreak } from '~/lib/progress';
import { followingLesson } from '~/lib/recommend';
import { APP_VERSION, PLATFORM, SITE_URL, SUPPORT_EMAIL } from '~/lib/site';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { useSettings } from '~/state/settings';
import { space, useTheme } from '~/theme';
import { EmptyState, ProgressBar, Text } from '~/ui';

/**
 * A lesson: the site's lesson player (/embed/...) under a native header with close, the lesson's title, a step
 * progress bar driven by the page's `step` messages, and a ••• menu. Every message from the page is handled
 * natively: haptics on answers, the celebration when it's finished, the next lesson opened in place, other sites in
 * the in-app browser. Android's back closes it, asking first once the lesson is under way.
 */
export default function LessonScreen() {
  const { id, path: pathParam } = useLocalSearchParams<{ id: string; path?: string }>();
  const { colors } = useTheme();
  const index = useCatalog();
  const ref = index.byId.get(id) ?? (pathParam ? lessonForPath(index, pathParam) : null);
  const path = ref?.lesson.path ?? pathParam ?? `/learn/${id}`;
  const haptics = useSettings((s) => s.haptics);
  const embed = useRef<EmbedHandle>(null);
  const [title, setTitle] = useState(ref?.lesson.title ?? '');
  const [step, setStep] = useState<{ index: number; total: number } | null>(null);
  const [complete, setComplete] = useState<{ xp: number } | null>(null);
  const progress = useProgress((s) => s.progress);
  const now = new Date();
  const today = useToday(now);
  const next = followingLesson(index, id);

  const underway = !!step && step.index > 0 && !complete;
  const close = useCallback(() => {
    const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
    if (!underway) return leave();
    Alert.alert('Leave this lesson?', 'You can come back to it any time from Learn or Home.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: leave },
    ]);
  }, [underway]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const openLessonInPlace = (lessonId: string) => router.replace({ pathname: '/lesson/[id]', params: { id: lessonId } });

  const onMessage = (msg: EmbedMessage) => {
    switch (msg.type) {
      case 'ready':
        if (msg.title) setTitle(msg.title);
        break;
      case 'step':
        setStep({ index: msg.index, total: msg.total });
        break;
      case 'answer':
        if (haptics) Haptics.notificationAsync(msg.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
        break;
      case 'lessonComplete':
        if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setComplete({ xp: msg.firstTime === false ? 0 : msg.xp || ref?.lesson.xp || 0 });
        break;
      case 'navigate': {
        const target = lessonForPath(index, msg.path);
        if (target) openLessonInPlace(target.lesson.id);
        else if (msg.path.startsWith('/playground')) router.replace('/playground');
        else WebBrowser.openBrowserAsync(`${SITE_URL}${msg.path}`);
        break;
      }
      case 'external':
        WebBrowser.openBrowserAsync(msg.url);
        break;
      case 'close':
        if (router.canGoBack()) router.back();
        else router.replace('/');
        break;
      default:
        break;
    }
  };

  const onNavigateAway = (url: string) => {
    const target = lessonForPath(index, url);
    if (target && target.lesson.id !== id) openLessonInPlace(target.lesson.id);
    else if (!target) WebBrowser.openBrowserAsync(url);
    return false;
  };

  const share = () => {
    const url = `https://www.pockett.ai${path}`;
    Share.share(Platform.OS === 'ios' ? { url, message: title } : { message: `${title} on Pockett: ${url}`, title });
  };
  const report = async () => {
    const subject = `Problem in lesson: ${title || id}`;
    const body = `\n\n---\nLesson: ${id} (${path})\nStep: ${step ? `${step.index + 1} of ${step.total}` : 'n/a'}\nApp: ${APP_VERSION} on ${PLATFORM}`;
    if (await MailComposer.isAvailableAsync()) MailComposer.composeAsync({ recipients: [SUPPORT_EMAIL], subject, body });
    else Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };
  const restart = () =>
    Alert.alert('Restart this lesson?', 'It opens again from the first step. Lessons you finished stay finished.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        onPress: () => {
          setStep(null);
          setComplete(null);
          embed.current?.reload();
        },
      },
    ]);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]} testID="lesson">
      <Stack.Screen
        options={{
          title: complete ? '' : title,
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          headerLeft: complete ? () => null : () => <HeaderIconButton icon="close" label="Close lesson" onPress={close} testID="lesson-close" />,
          headerBackVisible: false,
        }}
      />
      {complete ? null : (
        <HeaderMenu
          actions={[
            { label: 'Share lesson', icon: 'share', sf: 'square.and.arrow.up', onPress: share },
            { label: 'Restart lesson', icon: 'restart', sf: 'arrow.counterclockwise', onPress: restart },
            { label: 'Report a problem', icon: 'report', sf: 'exclamationmark.bubble', onPress: report },
          ]}
        />
      )}
      {step ? (
        <View style={styles.steps}>
          <View style={styles.fill}>
            <ProgressBar value={(step.index + 1) / step.total} accessibilityLabel={`Step ${step.index + 1} of ${step.total}`} />
          </View>
          <Text variant="micro" tone="tertiary" style={styles.stepText} importantForAccessibility="no">
            {`${step.index + 1} / ${step.total}`}
          </Text>
        </View>
      ) : null}
      {ref || pathParam ? (
        <EmbedView ref={embed} path={path} onMessage={onMessage} onNavigateAway={onNavigateAway} loadingLabel="Opening lesson" testID="lesson-web" />
      ) : (
        <EmptyState icon="learn" title="Lesson not found" body="This lesson isn't in Pockett any more." />
      )}
      {complete ? (
        <Celebration
          title={title}
          xp={complete.xp}
          streak={currentStreak(progress, now)}
          goal={today.goal}
          minutesToday={today.minutes}
          next={next}
          onNext={() => next && openLessonInPlace(next.lesson.id)}
          onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.gutter, paddingBottom: space.sm },
  stepText: { fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'right' },
});
