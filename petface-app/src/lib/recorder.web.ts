// Web preview only: records with the browser's Web Audio API so the sound
// flow can be tried in a desktop browser.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Recording, StartResult } from "./recorder";

export type { Recording, StartResult } from "./recorder";
export const METER_BARS = 40;

export function usePetRecorder(maxSec: number, onAutoStop: (r: Recording) => void) {
  const chunks = useRef<Float32Array[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const media = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const [recording, setRecording] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(METER_BARS).fill(0));
  const [elapsed, setElapsed] = useState(0);
  const autoStopRef = useRef(onAutoStop);
  useEffect(() => {
    autoStopRef.current = onAutoStop;
  }, [onAutoStop]);
  const recordingRef = useRef(false);

  const stop = useCallback((): Recording => {
    recordingRef.current = false;
    setRecording(false);
    media.current?.getTracks().forEach((t) => t.stop());
    const rate = ctx.current?.sampleRate ?? 48000;
    ctx.current?.close().catch(() => undefined);
    ctx.current = null;
    const total = chunks.current.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(total);
    let o = 0;
    for (const c of chunks.current) {
      samples.set(c, o);
      o += c.length;
    }
    chunks.current = [];
    return { samples, sampleRate: rate };
  }, []);

  const start = useCallback(async (): Promise<StartResult> => {
    try {
      media.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return "permission";
    }
    const ac = new AudioContext();
    ctx.current = ac;
    const src = ac.createMediaStreamSource(media.current);
    const proc = ac.createScriptProcessor(4096, 1, 1);
    chunks.current = [];
    startedAt.current = Date.now();
    setLevels(Array(METER_BARS).fill(0));
    proc.onaudioprocess = (e) => {
      if (!recordingRef.current) return;
      const data = new Float32Array(e.inputBuffer.getChannelData(0));
      chunks.current.push(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const db = 10 * Math.log10(sum / data.length + 1e-12);
      const level = Math.min(1, Math.max(0, (db + 60) / 50));
      setLevels((l) => [...l.slice(1), level]);
      const sec = (Date.now() - startedAt.current) / 1000;
      setElapsed(sec);
      if (sec >= maxSec) autoStopRef.current(stop());
    };
    src.connect(proc);
    proc.connect(ac.destination);
    recordingRef.current = true;
    setRecording(true);
    return "ok";
  }, [maxSec, stop]);

  return { recording, levels, elapsed, start, stop };
}
