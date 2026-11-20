import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioStatus,
} from 'expo-audio';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { createRecitationRepository } from '../data/recitation-repository';
import type { RecitationTrack } from '../data/recitation-repository';

type RepeatMode = 'off' | 'track' | 'segment';

interface RecitationContextValue {
  activeTrack: RecitationTrack | null;
  status: AudioStatus;
  repeatMode: RepeatMode;
  segmentStart: string;
  segmentEnd: string;
  speed: number;
  error: string | null;
  playTrack(track: RecitationTrack): Promise<void>;
  togglePlayback(): void;
  pause(): void;
  clearActiveTrack(): void;
  seekBy(seconds: number): void;
  setRepeatMode(mode: RepeatMode): void;
  setSegmentStart(value: string): void;
  setSegmentEnd(value: string): void;
  setSpeed(speed: number): void;
  clearError(): void;
}

const RecitationContext = createContext<RecitationContextValue | null>(null);

export function RecitationProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createRecitationRepository(db), [db]);
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [activeTrack, setActiveTrack] = useState<RecitationTrack | null>(null);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');
  const [segmentStart, setSegmentStart] = useState('0');
  const [segmentEnd, setSegmentEnd] = useState('');
  const [speed, setSpeedState] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const repeatSeekPending = useRef(false);
  const finishHandled = useRef(false);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Audio setup failed.');
    });
  }, []);

  useEffect(() => {
    if (repeatMode !== 'segment' || !status.playing || repeatSeekPending.current) {
      return;
    }

    const start = Number(segmentStart);
    const end = Number(segmentEnd);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      end > status.duration
    ) {
      return;
    }

    if (status.currentTime >= end) {
      repeatSeekPending.current = true;
      void player
        .seekTo(start)
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'Audio seek failed.');
        })
        .finally(() => {
          repeatSeekPending.current = false;
        });
    }
  }, [
    player,
    repeatMode,
    segmentEnd,
    segmentStart,
    status.currentTime,
    status.duration,
    status.playing,
  ]);

  const playTrack = useCallback(async (track: RecitationTrack) => {
    setError(null);
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      player.replace({ uri: track.file_uri });
      player.setPlaybackRate(speed);
      player.setActiveForLockScreen(true, {
        title: track.surah_name_ar,
        artist: track.reciter_name,
      });
      setActiveTrack(track);
      player.play();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to play this file.');
    }
  }, [player, speed]);

  useEffect(() => {
    if (!status.didJustFinish) {
      finishHandled.current = false;
      return;
    }
    if (finishHandled.current) return;

    finishHandled.current = true;
    if (repeatMode === 'track') {
      void player
        .seekTo(0)
        .then(() => player.play())
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'Audio replay failed.');
        });
      return;
    }

    if (repeatMode !== 'off' || !activeTrack) return;
    void repository
      .listTracks()
      .then((tracks) => {
        const nextTrack = tracks.find(
          (track) =>
            track.reciter_name === activeTrack.reciter_name &&
            track.surah_id > activeTrack.surah_id,
        );
        if (nextTrack) void playTrack(nextTrack);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load audio.');
      });
  }, [
    activeTrack,
    player,
    playTrack,
    repeatMode,
    repository,
    status.didJustFinish,
  ]);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else if (activeTrack) {
      setError(null);
      player.play();
    }
  };

  const seekBy = (seconds: number) => {
    const target = Math.max(0, Math.min(status.duration, status.currentTime + seconds));
    void player.seekTo(target).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Audio seek failed.');
    });
  };

  const setRepeatMode = (mode: RepeatMode) => {
    setRepeatModeState(mode);
    repeatSeekPending.current = false;
  };

  const setSpeed = (nextSpeed: number) => {
    setSpeedState(nextSpeed);
    player.setPlaybackRate(nextSpeed);
  };

  const clearActiveTrack = () => {
    player.pause();
    player.clearLockScreenControls();
    setActiveTrack(null);
  };

  return (
    <RecitationContext.Provider
      value={{
        activeTrack,
        status,
        repeatMode,
        segmentStart,
        segmentEnd,
        speed,
        error,
        playTrack,
        togglePlayback,
        pause: () => player.pause(),
        clearActiveTrack,
        seekBy,
        setRepeatMode,
        setSegmentStart,
        setSegmentEnd,
        setSpeed,
        clearError: () => setError(null),
      }}
    >
      {children}
    </RecitationContext.Provider>
  );
}

export function useRecitation(): RecitationContextValue {
  const value = useContext(RecitationContext);
  if (!value) {
    throw new Error('useRecitation must be used inside RecitationProvider.');
  }
  return value;
}
