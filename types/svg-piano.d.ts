/**
 * Type definitions for svg-piano
 * svg-pianoの型定義
 */

declare module 'svg-piano' {
  export interface PianoSettings {
    range?: [string, string];
    highlightedNotes?: string[];
    colorize?: Array<{
      keys: string[];
      color: string;
    }>;
    accidentals?: 'flats' | 'sharps';
    scaleX?: number;
    scaleY?: number;
  }

  export interface PianoElement {
    svg: SVGElement;
    destroy: () => void;
  }

  export function renderPiano(
    container: HTMLElement,
    settings?: PianoSettings
  ): PianoElement;
}
