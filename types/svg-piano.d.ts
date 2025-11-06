declare module 'svg-piano' {
  export interface PianoOptions {
    range?: [string, string];
    octaves?: number;
    showNoteNames?: boolean | 'sharps' | 'flats' | 'all';
    highlightColor?: string;
    stroke?: string;
    keyMargin?: number;
    colorize?: Array<{ keys: string[]; color: string }>;
  }

  export interface Piano {
    on(event: string, callback: (note: unknown) => void): void;
    off(event: string, callback: (note: unknown) => void): void;
    highlightNote(note: string, color?: string): void;
    clearHighlights(): void;
    toSVG(): SVGSVGElement;
  }

  export function renderPiano(container: HTMLElement, options?: PianoOptions): Piano;

  export default function createPiano(options?: PianoOptions): Piano;
}
