declare module 'midi-writer-js' {
  export interface NoteOptions {
    pitch?: string | string[] | number | number[];
    duration?: string | number;
    startTick?: number;
    velocity?: number;
    channel?: number;
    wait?: string | number;
  }

  export interface ControllerChangeOptions {
    controllerNumber: number;
    controllerValue: number;
  }

  export class Track {
    constructor();
    addEvent(event: unknown): this;
    addTrackName(name: string): this;
    addInstrumentName(name: string): this;
    setProgramChange(program: number): this;
    setTempo(tempo: number): this;
    setTimeSignature(numerator: number, denominator?: number, clocks?: number, notes?: number): this;
    addNoteOn(channel: number, pitch: string | string[], velocity?: number, startTick?: number): this;
    addNoteOff(channel: number, pitch: string | string[], velocity?: number, startTick?: number): this;
    addNote(note: NoteOptions): this;
    addProgramChange(program: number): this;
  }

  export class Writer {
    constructor(tracks: Track | Track[]);
    buildFile(): Uint8Array;
    base64(): string;
    dataUri(): string;
    stdout(): void;
  }

  export class NoteEvent {
    constructor(options: NoteOptions);
  }

  export class ProgramChangeEvent {
    constructor(options: { instrument: number });
  }

  export class ControllerChangeEvent {
    constructor(options: ControllerChangeOptions);
  }

  namespace MidiWriter {
    export { Track, Writer, NoteEvent, ProgramChangeEvent, ControllerChangeEvent };
  }

  export default MidiWriter;
}
