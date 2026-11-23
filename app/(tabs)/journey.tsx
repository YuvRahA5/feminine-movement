import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../src/auth';
import { Btn, Card, T } from '../../src/ui';
import { C, rtl } from '../../src/theme';
import { attendedCount, dm, onDataChanged } from '../../src/data';

const MILESTONES = [
  { n: 1, name: 'הצעד הראשון' }, { n: 4, name: 'מתחילה להרגיש' }, { n: 8, name: 'בטוחה על עקב' },
  { n: 16, name: 'נמרה' }, { n: 30, name: 'מלכה' },
];

type Video = { id: string; storage_path: string; liked: boolean; liked_at: string | null; created_at: string; url?: string };

function Player({ url, height }: { url: string; height: number }) {
  const player = useVideoPlayer(url, p => { p.loop = false; });
  return <VideoView player={player} style={{ width: '100%', height, borderRadius: 18, backgroundColor: '#000' }} nativeControls contentFit="cover" />;
}

export default function Journey() {
  const { session } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [attended, setAttended] = useState(0);
  const [open, setOpen] = useState<Video | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    setAttended(await attendedCount(uid));
    const { data } = await supabase.from('videos').select('*').eq('user_id', uid).order('created_at');
    const rows = (data || []) as Video[];
    if (rows.length) {
      const { data: signed } = await supabase.storage.from('journey').createSignedUrls(rows.map(r => r.storage_path), 3600);
      (signed || []).forEach((s: any, i: number) => { rows[i].url = s?.signedUrl; });
    }
    setVideos(rows);
  }, [session]);

  useEffect(() => { load(); return onDataChanged(load); }, [load]);

  async function toggleLike(v: Video) {
    const liked = !v.liked;
    setVideos(vs => vs.map(x => x.id === v.id ? { ...x, liked } : x));
    await supabase.from('videos').update({ liked, liked_at: liked ? new Date().toISOString() : null }).eq('id', v.id);
  }

  const liked = videos.filter(v => v.liked);
  const before = liked[0];
  const after = liked.length > 1 ? liked[liked.length - 1] : undefined;
  const next = MILESTONES.find(m => attended < m.n);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}
        refreshControl={<RefreshControl tintColor={C.gold} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ gap: 4 }}>
          <T size={30} weight="bold">המסע שלי 🐆</T>
          <T color={C.muted}>כל שיעור הוא עוד צעד אל עצמך</T>
        </View>

        <Card>
          <View style={[rtl.row, { alignItems: 'baseline', gap: 10 }]}>
            <T size={46} weight="bold" color={C.gold}>{attended}</T>
            <T size={17}>שיעורים שרקדת</T>
          </View>
          <View style={[rtl.row, { justifyContent: 'space-between' }]}>
            {MILESTONES.map(m => {
              const ok = attended >= m.n;
              return (
                <View key={m.n} style={{ alignItems: 'center', gap: 6, width: '19%' }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: ok ? C.gold : 'transparent', borderWidth: ok ? 0 : 1, borderColor: '#4A3036' }}>
                    <T weight="bold" color={ok ? C.onGold : C.muted} center>{m.n}</T>
                  </View>
                  <T size={11} color={C.muted} center>{m.name}</T>
                </View>
              );
            })}
          </View>
          <T size={14} color={C.goldLight}>
            {next ? (next.n - attended === 1 ? `עוד שיעור אחד ל"${next.name}"` : `עוד ${next.n - attended} שיעורים ל"${next.name}"`) : 'הגעת לכל אבני הדרך. מלכה 👑'}
          </T>
        </Card>

        <View style={{ gap: 10 }}>
          <T size={22} weight="bold">לפני ← עכשיו</T>
          <T size={14} color={C.muted}>הסרטון הראשון שסימנת בלב מופיע כ"לפני", והאחרון שסימנת מופיע כ"עכשיו".</T>
          <View style={[rtl.row, { gap: 10 }]}>
            {[{ v: before, label: 'לפני', empty: 'סמני בלב את הסרטון הראשון שלך' }, { v: after, label: 'עכשיו', empty: 'כשתסמני סרטון נוסף, הוא יופיע כאן' }].map(x => (
              <View key={x.label} style={{ flex: 1, gap: 6 }}>
                {x.v?.url ? <Player url={x.v.url} height={260} /> : (
                  <View style={{ height: 260, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                    <T size={13} color={C.muted} center>{x.empty}</T>
                  </View>
                )}
                <T size={13} color={x.label === 'עכשיו' ? C.goldLight : C.muted}>{x.label} · {x.v ? dm(new Date(x.v.created_at)) : '—'}</T>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <T size={20} weight="bold">כל הסרטונים מהשיעורים</T>
          {!videos.length && <T size={14} color={C.muted}>אחרי השיעורים יובל תעלה לכאן סרטונים שלך. הם פרטיים: רק את ויובל רואות אותם.</T>}
          <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>
            {videos.map(v => (
              <Pressable key={v.id} onPress={() => setOpen(v)} style={{ width: '31%', aspectRatio: 9 / 14, borderRadius: 14, backgroundColor: C.card,
                borderWidth: 1, borderColor: v.liked ? C.gold : C.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="play" size={26} color={C.goldLight} />
                <T size={12} color={C.muted} center>{dm(new Date(v.created_at))}</T>
                <Pressable accessibilityRole="button" accessibilityLabel={v.liked ? 'הסרת לייק' : 'לייק'} onPress={() => toggleLike(v)}
                  style={{ position: 'absolute', bottom: 6, left: 6, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,11,12,0.75)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={v.liked ? 'heart' : 'heart-outline'} size={20} color={v.liked ? '#E0566F' : C.text} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!open} animationType="fade" onRequestClose={() => setOpen(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000', padding: 16, gap: 12 }}>
          {open?.url ? <Player url={open.url} height={560} /> : null}
          {open ? <Btn kind={open.liked ? 'gold' : 'outline'} label={open.liked ? '❤ במסע שלי' : '🤍 להוסיף למסע'} onPress={() => { toggleLike(open); setOpen({ ...open, liked: !open.liked }); }} /> : null}
          <Btn kind="ghost" label="סגירה" onPress={() => setOpen(null)} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
