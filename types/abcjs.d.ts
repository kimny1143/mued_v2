/**
 * Type definitions for abcjs library
 * https://github.com/paulrosen/abcjs
 */

declare module 'abcjs' {
  export interface TuneObject {
    lines: any[];
    metaText?: {
      title?: string;
      rhythm?: string;
      composer?: string;
    };
    formatting?: any;
    media?: string;
    metaTextInfo?: any;
    version?: any;
    [key: string]: any;
  }

  export interface RenderOptions {
    responsive?: 'resize';
    staffwidth?: number;
    add_classes?: boolean;
    clickListener?: (abcElem: any, tuneNumber: number, classes: string, analysis: any, drag: any) => void;
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

  export class TimingCallbacks {
    constructor(visualObj: TuneObject, options: any);
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

  export default {
    renderAbc,
    synth,
    TimingCallbacks,
    SynthController,
  };
}
