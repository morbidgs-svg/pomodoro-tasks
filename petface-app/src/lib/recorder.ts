import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
  type AudioStreamBuffer,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Recording {
  samples: Float32Array;
  sampleRate: number;
}

export type StartResult = "ok" | "permission" | "error";

export const METER_BARS = 40;

/**
 * Captures raw microphone PCM with expo-audio's stream API (no file on disk),
 * keeps a rolling level history for the meter, and stops itself at `maxSec`,
 * handing the recording to `onAutoStop`.
 */
export function usePetRecorder(maxSec: number, onAutoStop: (r: Recording) => void) {
  const chunks = useRef<Float32Array[]>([]);
  const rate = useRef(16000);
  const startedAt = useRef(0);
  const [recording, setRecording] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(METER_BARS).fill(0));
  const [elapsed, setElapsed] = useState(0);
  const active = useRef(false);
  const autoStopRef = useRef(onAutoStop);
  const stopRef = useRef<() => Recording>(() => ({ samples: new Float32Array(0), sampleRate: 16000 }));

  const onBuffer = useCallback((buf: AudioStreamBuffer) => {
    // Buffers can still arrive just after stopping; ignore them.
    if (!active.current) return;
    const all = new Float32Array(buf.data);
    // Keep the first channel only.
    const mono =
      buf.channels > 1 ? all.filter((_, i) => i % buf.channels === 0) : all;
    rate.current = buf.sampleRate;
    chunks.current.push(mono);
    let sum = 0;
    for (let i = 0; i < mono.length; i++) sum += mono[i] * mono[i];
    const db = 10 * Math.log10(sum / Math.max(1, mono.length) + 1e-12);
    const level = Math.min(1, Math.max(0, (db + 60) / 50));
    setLevels((l) => [...l.slice(1), level]);
    const sec = (Date.now() - startedAt.current) / 1000;
    setElapsed(sec);
    if (sec >= maxSec) autoStopRef.current(stopRef.current());
  }, [maxSec]);

  const { stream } = useAudioStream({ sampleRate: 16000, channels: 1, encoding: "float32", onBuffer });

  const start = useCallback(async (): Promise<StartResult> => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return "permission";
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      chunks.current = [];
      startedAt.current = Date.now();
      setElapsed(0);
      setLevels(Array(METER_BARS).fill(0));
      active.current = true;
      await stream.start();
      setRecording(true);
      return "ok";
    } catch {
      active.current = false;
      return "error";
    }
  }, [stream]);

  const stop = useCallback((): Recording => {
    active.current = false;
    try {
      stream.stop();
    } catch {
      // Already stopped.
    }
    setRecording(false);
    setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    const total = chunks.current.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(total);
    let o = 0;
    for (const c of chunks.current) {
      samples.set(c, o);
      o += c.length;
    }
    chunks.current = [];
    return { samples, sampleRate: rate.current };
  }, [stream]);

  useEffect(() => {
    stopRef.current = stop;
    autoStopRef.current = onAutoStop;
  }, [stop, onAutoStop]);

  return { recording, levels, elapsed, start, stop };
}
