import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * The audio modality's judgement, from the corpus (019, `instructions/audio.md`).
 *
 * `spatial_phrases` is the list that decides whether a block gets read or gets
 * announced, and it is **pedagogical judgement**: which Spanish phrasings mean «the
 * layout is the exercise» is exactly the kind of thing a PT should be able to
 * correct without touching TypeScript (Principle I).
 *
 * ## Why the fallback is not empty
 *
 * An empty list means every block reads as linear, which is the guessed reading
 * order this whole design rejected — so a corpus file that fails to load must not
 * fail *open*. The default is the smallest set of phrases that are unambiguous in
 * Spanish, and it is logged when it is used.
 */
export interface AudioCorpus {
  spatialPhrases: string[];
  answerSpace: string;
}

export const DEFAULT_AUDIO: AudioCorpus = {
  spatialPhrases: [
    'une con flechas', 'une cada', 'relaciona', 'en la recta numérica',
    'completa el esquema', 'completa la tabla', 'rodea en el dibujo',
    'señala en el dibujo', 'según el dibujo', 'observa la imagen',
  ],
  answerSpace: 'Aquí hay un espacio para contestar.',
};

export function parseAudioCorpus(raw: string, file = 'instructions/audio.md'): AudioCorpus {
  const { data } = parseFrontMatter(raw, file);

  const phrases = Array.isArray(data['spatial_phrases'])
    ? data['spatial_phrases'].filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    : [];

  if (phrases.length === 0) {
    /*
     * Fail closed, and say so. An empty list would silently turn every matching
     * exercise into a linear read — the exact failure this feature was designed
     * around, arriving through a corpus edit rather than through code.
     */
    logger.warn('audio.no-spatial-phrases', { file });
    return DEFAULT_AUDIO;
  }

  const answerSpace = typeof data['answer_space'] === 'string' && data['answer_space'].trim()
    ? data['answer_space'].trim()
    : DEFAULT_AUDIO.answerSpace;

  return { spatialPhrases: phrases.map((p) => p.trim()), answerSpace };
}
