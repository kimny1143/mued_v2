/**
 * The /muedvox listening examples (2026-10-14): one player per song, Before / After × Mix / Vocals only.
 *
 * What the page promises, measured here against a fake Web Audio (jsdom has none): nothing loads or sounds until
 * Play; the four takes start on the same instant and offset; a switch changes gains and starts nothing; starting
 * another song stops the first. That it actually SOUNDS is measured in a browser on the preview (PR body).
 */
import { existsSync, statSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enVox from "@/messages/muedvox.en.json";
import jaVox from "@/messages/muedvox.ja.json";
import { MUEDVOX_AUDIO_EXAMPLES, type MuedvoxAudioExample } from "@/lib/muedvox/config";
import { ComparePlayer, TAKES, takeOf, type ComparePlayerLabels } from "@/components/features/muedvox-landing/compare-player";

type FakeGain = { url: string; gain: { value: number; target: number; setTargetAtTime: (v: number) => void }; connect: () => void; disconnect: () => void };
type FakeSource = { buffer: { url: string } | null; started: [number, number] | null; stopped: boolean; onended: (() => void) | null; into: FakeGain | null };
const audio = { sources: [] as FakeSource[], gains: [] as FakeGain[], now: 10, resumed: 0 };

class FakeAudioContext {
  destination = {};
  get currentTime() { return audio.now; }
  resume() { audio.resumed += 1; return Promise.resolve(); }
  decodeAudioData(data: ArrayBuffer) { return Promise.resolve({ url: new TextDecoder().decode(data), duration: 20 }); }
  createGain() {
    const node: FakeGain = { url: "", gain: { value: 1, target: 1, setTargetAtTime(v: number) { this.target = v; } }, connect() {}, disconnect() {} };
    audio.gains.push(node);
    return node;
  }
  createBufferSource() {
    const source: FakeSource & { connect: (g: FakeGain) => void; start: (w: number, o: number) => void; stop: () => void; disconnect: () => void } = {
      buffer: null, started: null, stopped: false, onended: null, into: null,
      connect(gain) { this.into = gain; gain.url = this.buffer!.url; },
      start(when, offset) { this.started = [when, offset]; },
      stop() { this.stopped = true; },
      disconnect() {},
    };
    audio.sources.push(source);
    return source;
  }
}

const labels = enVox.beforeAfter.player as ComparePlayerLabels;
const song = (id: string): MuedvoxAudioExample => MUEDVOX_AUDIO_EXAMPLES.find((e) => e.id === id)!;
const fetched: string[] = [];
const sounding = () => audio.sources.filter((s) => s.started && !s.stopped);
/** The take whose gain is (heading to) 1 among one player's four gains. */
const audibleUrls = (gains: FakeGain[]) => gains.filter((g) => g.gain.target === 1).map((g) => g.url);
const settle = () => act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });

beforeEach(() => {
  audio.sources = []; audio.gains = []; audio.now = 10; audio.resumed = 0; fetched.length = 0;
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    fetched.push(url);
    return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(url).buffer };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("★the songs are data: every listed take is a file, and a song's four takes are the same length", () => {
  it("lists at least one song, each with the four takes under /muedvox/audio/", () => {
    expect(MUEDVOX_AUDIO_EXAMPLES.length).toBeGreaterThan(0);
    for (const example of MUEDVOX_AUDIO_EXAMPLES) {
      expect(Object.keys(example.files).sort()).toEqual([...TAKES].sort());
      for (const take of TAKES) {
        expect(example.files[take]).toBe(`/muedvox/audio/${example.id}_${take}.mp3`);
        expect(existsSync(`public${example.files[take]}`), example.files[take]).toBe(true);
      }
    }
  });

  // CBR, no tags (scripts/muedvox/encode-lp-audio.sh): equal length ⇔ equal bytes. A take cut to another length —
  // the players would run out of step at the end — changes its size.
  it.each(MUEDVOX_AUDIO_EXAMPLES.map((e) => [e.id, e] as const))("%s: four takes, one byte count", (_id, example) => {
    const sizes = TAKES.map((take) => statSync(`public${example.files[take]}`).size);
    expect(sizes[0]).toBeGreaterThan(100_000);
    expect(new Set(sizes).size).toBe(1);
  });

  it("en and ja carry the same player words, and the Suno note is on both", () => {
    expect(Object.keys(jaVox.beforeAfter.player).sort()).toEqual(Object.keys(enVox.beforeAfter.player).sort());
    expect(enVox.beforeAfter.sunoNote).toContain("Suno");
    expect(jaVox.beforeAfter.sunoNote).toContain("Suno");
  });
});

describe("★one song's player", () => {
  it("before Play: no <audio>, nothing fetched, no audio context; Before + Mix are selected", () => {
    const { container } = render(<ComparePlayer example={song("001")} labels={labels} />);
    expect(container.querySelector("audio")).toBeNull();
    expect(fetched).toEqual([]);
    expect(audio.gains).toHaveLength(0);
    const pressed = screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent);
    expect(pressed).toEqual(["Before", "Mix"]);
    expect(screen.getByRole("button", { name: "Play — Stay A Little Longer" })).toBeEnabled();
  });

  it("Play: fetches the song's four takes and starts them on one instant from one offset; only Mix/Before is up", async () => {
    render(<ComparePlayer example={song("001")} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: /^Play/ }));
    await settle();
    expect(audio.resumed).toBe(1);
    expect([...fetched].sort()).toEqual(TAKES.map((t) => `/muedvox/audio/001_${t}.mp3`).sort());
    expect(sounding()).toHaveLength(4);
    expect(new Set(sounding().map((s) => s.started!.join("@"))).size).toBe(1); // ★same when, same offset
    expect(sounding()[0].started![1]).toBe(0);
    expect(audio.gains.filter((g) => g.gain.value === 1).map((g) => g.url)).toEqual(["/muedvox/audio/001_mix_before.mp3"]);
    expect(screen.getByRole("button", { name: /^Pause/ })).toBeInTheDocument();
  });

  it.each([
    ["After", "Mix", "mix_after"], ["After", "Vocals only", "vocal_after"], ["Before", "Vocals only", "vocal_before"], ["Before", "Mix", "mix_before"],
  ] as const)("★while playing, %s + %s raises %s alone — and starts nothing new", async (side, layer, take) => {
    render(<ComparePlayer example={song("003")} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: /^Play/ }));
    await settle();
    const started = audio.sources.length;
    fireEvent.click(screen.getByRole("button", { name: "After" })); // move off the default first, so every row is a real switch
    fireEvent.click(screen.getByRole("button", { name: "Vocals only" }));
    fireEvent.click(screen.getByRole("button", { name: side }));
    fireEvent.click(screen.getByRole("button", { name: layer }));
    expect(audibleUrls(audio.gains)).toEqual([`/muedvox/audio/003_${take}.mp3`]);
    expect(take).toBe(takeOf(layer === "Mix" ? "mix" : "vocal", side === "Before" ? "before" : "after"));
    expect(audio.sources).toHaveLength(started); // ★no restart: the position carries on
    expect(sounding()).toHaveLength(4);
    expect(fetched).toHaveLength(4);
  });

  it("a switch made before Play is the take that sounds first", async () => {
    render(<ComparePlayer example={song("001")} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "After" }));
    fireEvent.click(screen.getByRole("button", { name: "Vocals only" }));
    expect(fetched).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /^Play/ }));
    await settle();
    expect(audio.gains.filter((g) => g.gain.value === 1).map((g) => g.url)).toEqual(["/muedvox/audio/001_vocal_after.mp3"]);
  });

  it("Pause keeps the position: Play again starts all four from where it stopped", async () => {
    render(<ComparePlayer example={song("001")} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: /^Play/ }));
    await settle();
    audio.now += 7.5;
    fireEvent.click(screen.getByRole("button", { name: /^Pause/ }));
    expect(sounding()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /^Play/ }));
    await settle();
    expect(sounding()).toHaveLength(4);
    for (const source of sounding()) expect(source.started![1]).toBeCloseTo(7.47, 2); // 7.5 s minus the 30 ms lead-in
    expect(fetched).toHaveLength(4); // decoded once
  });

  it("a file that does not load says so and leaves Play usable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })));
    render(<ComparePlayer example={song("001")} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: /^Play/ }));
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent(labels.failed);
    expect(sounding()).toHaveLength(0);
    expect(screen.getByRole("button", { name: /^Play/ })).toBeEnabled();
  });
});

describe("★two songs on the page: starting one stops the other", () => {
  it("001 playing → Play on 003 → 001's four sources are stopped and its button is Play again", async () => {
    render(<><ComparePlayer example={song("001")} labels={labels} /><ComparePlayer example={song("003")} labels={labels} /></>);
    const first = within(screen.getByTestId("compare-player-001"));
    const second = within(screen.getByTestId("compare-player-003"));
    fireEvent.click(first.getByRole("button", { name: /^Play/ }));
    await settle();
    expect(sounding().map((s) => s.buffer!.url).every((u) => u.includes("/001_"))).toBe(true);
    fireEvent.click(second.getByRole("button", { name: /^Play/ }));
    await settle();
    expect(sounding()).toHaveLength(4);
    expect(sounding().map((s) => s.buffer!.url).every((u) => u.includes("/003_"))).toBe(true);
    expect(first.getByRole("button", { name: /^Play/ })).toBeInTheDocument();
    expect(second.getByRole("button", { name: /^Pause/ })).toBeInTheDocument();
  });
});
