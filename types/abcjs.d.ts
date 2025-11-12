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

  export interface VisualObject {
    lines: any[];
    metaText?: Record<string, any>;
  }

  export class SynthController {
    load(
      element: HTMLElement,
      cursorControl: null | any,
      options: SynthOptions
    ): void;
    setTune(visualObj: VisualObject, userAction: boolean): Promise<void>;
    play(): void;
    pause(): void;
    restart(): void;
    download(filename: string): void;
  }

  export class TimingCallbacks {
    constructor(visualObj: VisualObject, options: any);
  }

  export namespace synth {
    export class SynthController {
      load(
        element: HTMLElement,
        cursorControl: null | any,
        options: SynthOptions
      ): void;
      setTune(visualObj: VisualObject, userAction: boolean): Promise<void>;
      play(): void;
      pause(): void;
      restart(): void;
      download(filename: string): void;
    }

    export function getMidiFile(
      visualObj: VisualObject,
      options: MidiFileOptions
    ): string | number[];
  }

  export function renderAbc(
    element: HTMLElement | null,
    abcString: string,
    options?: RenderOptions
  ): VisualObject[];

  export default {
    renderAbc,
    synth,
    TimingCallbacks,
    SynthController,
  };
}
