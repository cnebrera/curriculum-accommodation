/**
 * `libheif-js` ships no types (008 T012).
 *
 * Declared narrowly rather than as `any`: only the two calls the HEIC decode
 * path makes. A blanket `declare module` would let a future typo through
 * silently, in the one code path a teacher reaches by default because her phone
 * chose the format for her.
 */
declare module 'libheif-js/wasm-bundle' {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(
      out: { data: Uint8ClampedArray; width: number; height: number },
      cb: (d: unknown) => void,
    ): void;
  }
  interface HeifDecoder {
    decode(buffer: ArrayBufferLike): HeifImage[];
  }
  const libheif: { HeifDecoder: new () => HeifDecoder };
  export default libheif;
}
