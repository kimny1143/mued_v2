/**
 * Type definitions for abcjs library
 * https://github.com/paulrosen/abcjs
 */

declare module 'abcjs' {
  export interface AbcjsLine {
    staff?: number[];
    voice?: number[];
    [key: string]: unknown;
  }

  export interface AbcjsFormatting {
    scale?: number;
    staffwidth?: number;
    [key: string]: unknown;
  }

  export interface TuneObject {
    lines: AbcjsLine[];
    metaText?: {
      title?: string;
      rhythm?: string;
      composer?: string;
    };
    formatting?: AbcjsFormatting;
    media?: string;
    metaTextInfo?: Record<string, unknown>;
    version?: string;
    [key: string]: unknown;
  }

  export interface AbcElement {
    [key: string]: unknown;
  }

  export interface Analysis {
    [key: string]: unknown;
  }

  export interface DragInfo {
    [key: string]: unknown;
  }

  export interface RenderOptions {
    responsive?: 'resize';
    staffwidth?: number;
    add_classes?: boolean;
    clickListener?: (
      abcElem: AbcElement,
      tuneNumber: number,
      classes: string,
      analysis: Analysis,
      drag: DragInfo
    ) => void;
  }

  export interface MidiFileOptions {
    midiOutputType?: 'encoded' | 'binary';
  }

  export interface SynthOptions {
    displayLoop?: boolean;
    displayRestart?: boolean;
    displayPlay?: boolean;
    displayProgress?: boolean;
    displayWarp?: boolean;
  }

  // VisualObject is an alias for TuneObject
  export type VisualObject = TuneObject;

  export class SynthController {
    load(
      element: HTMLElement,
      cursorControl: null | any,
      options: SynthOptions
    ): void;
    setTune(visualObj: TuneObject, userAction: boolean): Promise<void>;
    play(): void;
    pause(): void;
    restart(): void;
    download(filename: string): void;
  }

  export interface TimingOptions {
    eventCallback?: (event: unknown) => void;
    [key: string]: unknown;
  }

  export class TimingCallbacks {
    constructor(visualObj: TuneObject, options: TimingOptions);
  }

  export namespace synth {
    export class SynthController {
      load(
        element: HTMLElement,
        cursorControl: null | any,
        options: SynthOptions
      ): void;
      setTune(visualObj: TuneObject, userAction: boolean): Promise<void>;
      play(): void;
      pause(): void;
      restart(): void;
      download(filename: string): void;
    }

    export function getMidiFile(
      visualObj: TuneObject,
      options: MidiFileOptions
    ): string | number[];
  }

  export function renderAbc(
    element: HTMLElement | null,
    abcString: string,
    options?: RenderOptions
  ): TuneObject[];

  export function parseOnly(abcString: string): TuneObject[];

  export default {
    renderAbc,
    parseOnly,
    synth,
    TimingCallbacks,
    SynthController,
  };
}
