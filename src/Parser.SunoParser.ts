import {
  type LineCreateArgs,
  Lyric,
  type LyricCreateArgs,
  type ParagraphCreateArgs,
  type WordCreateArgs,
} from "@ioris/core";

export type SunoChar = {
  word: string;
  start_s: number;
  end_s: number;
  success: boolean;
  p_align: number;
};

type sunoChar = SunoChar & {
  hasWhitespace: boolean;
  hasNewline: boolean;
};

type sunoWord = sunoChar[];
type sunoLine = sunoWord[];
type sunoParagraph = sunoLine[];

export class SunoParser {
  tokenizer?: LyricCreateArgs["tokenizer"];
  offsetSec?: number;

  constructor(props?: {
    tokenizer?: LyricCreateArgs["tokenizer"];
    offsetSec?: number;
  }) {
    this.tokenizer = props ? props.tokenizer : undefined;
    this.offsetSec = props ? props.offsetSec : undefined;
  }

  public async parse(chars: SunoChar[], resourceID: string) {
    const timelines: LyricCreateArgs["timelines"] = [];

    const paragraphs = chars.reduce<sunoParagraph[]>(
      (acc, char) => {
        const newChar = { ...char, hasWhitespace: false, hasNewline: false };

        const lastParagraphIndex = acc.length ? acc.length - 1 : 0;
        const lastLineIndex = acc[lastParagraphIndex].length
          ? acc[lastParagraphIndex].length - 1
          : 0;
        const lastWordIndex = acc[lastParagraphIndex][lastLineIndex].length
          ? acc[lastParagraphIndex][lastLineIndex].length - 1
          : 0;

        // remove song section title. like [Verse]
        if (newChar.word.includes("[")) {
          newChar.word = newChar.word.replaceAll(/\[.*?\]\n?/g, "");
        }
        if (newChar.word.startsWith("\n")) {
          newChar.word = newChar.word.replaceAll("\n", "");
        }
        if (newChar.word.endsWith("\n\n")) {
          acc.push([[[]]]);
          newChar.word = newChar.word.slice(0, -2);
        }
        if (newChar.word.endsWith("\n")) {
          acc[acc.length - 1].push([[]]);
          newChar.word = newChar.word.slice(0, -1);
          newChar.hasNewline = true;
        }
        if (newChar.word.endsWith("　")) {
          acc[acc.length - 1].push([[]]);
          newChar.word = newChar.word.slice(0, -1);
          newChar.hasNewline = true;
        }
        if (newChar.word.endsWith(" ")) {
          acc[acc.length - 1][acc[acc.length - 1].length - 1].push([]);
          newChar.word = newChar.word.slice(0, -1);
          newChar.hasWhitespace = true;
        }

        acc[lastParagraphIndex][lastLineIndex][lastWordIndex].push(newChar);

        return acc;
      },
      [[[[]]]],
    );

    for (const paragraph of Array.from(paragraphs)) {
      const { lineTimelines } = this.parseParagraphTimelines(paragraph);
      timelines.push(lineTimelines);
    }

    const lyric = await new Lyric({
      resourceID,
      duration: 0,
      timelines,
      tokenizer: this.tokenizer,
      offsetSec: this.offsetSec,
    }).init();

    return lyric;
  }

  private parseParagraphTimelines(paragraph: sunoParagraph): {
    lineTimelines: ParagraphCreateArgs["timelines"];
  } {
    const lineTimelines: ParagraphCreateArgs["timelines"] = [];

    for (const line of Array.from(paragraph)) {
      const { wordTimelines } = this.parseLineTimelines(line);
      lineTimelines.push(wordTimelines);
    }

    return {
      lineTimelines,
    };
  }

  private parseLineTimelines(line: sunoLine): {
    wordTimelines: LineCreateArgs["timelines"];
  } {
    const wordTimelines: LineCreateArgs["timelines"] = [];

    for (const word of Array.from(line)) {
      if (!word.length) {
        continue;
      }
      const { wordTimeline } = this.parseWordTimelines(word);
      wordTimelines.push(wordTimeline);
    }

    return {
      wordTimelines,
    };
  }

  private parseWordTimelines(word: sunoWord): {
    wordTimeline: WordCreateArgs["timeline"];
  } {
    const wordTimeline: WordCreateArgs["timeline"] = {
      begin: word[0].start_s,
      end: word[word.length - 1].end_s,
      hasNewLine: word.reduce<boolean>(
        (acc, char) => acc || char.hasNewline,
        false,
      ),
      hasWhitespace: word.reduce<boolean>(
        (acc, char) => acc || char.hasWhitespace,
        false,
      ),
      text: word.reduce<string>(
        (acc, char) => `${acc + char.word}${char.hasWhitespace ? " " : ""}`,
        "",
      ),
    };
    return {
      wordTimeline,
    };
  }
}

export default SunoParser;
