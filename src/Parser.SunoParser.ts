import { Lyric, type LyricCreateArgs, type WordTimeline } from "@ioris/core";

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

function parseLineTimelines(line: sunoLine) {
  const wordTimelines = [];

  for (const word of Array.from(line)) {
    if (!word.length) {
      continue;
    }
    const { wordTimeline } = parseWordTimelines(word);
    wordTimelines.push(wordTimeline);
  }

  return {
    wordTimelines,
  };
}

function parseWordTimelines(word: sunoWord) {
  const joinedText = word.reduce<string>(
    (acc, char) => `${acc}${char.hasWhitespace ? `${char.word} ` : char.word}`,
    "",
  );
  const text = joinedText
    // 複数行にまたがる括弧で囲まれた部分を削除
    .replace(/【[\s\S]*?】/g, "")
    .replace(/\[[\s\S]*?\]/g, "")
    .replace(/\([\s\S]*?\)/g, "")
    .replace(/（[\s\S]*?）/g, "")
    // 複数の空白を1つにまとめる
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
  const wordTimeline: WordTimeline = {
    wordID: crypto.randomUUID(),
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
    text,
  };
  return { wordTimeline };
}

function parseParagraphTimelines(paragraph: sunoParagraph) {
  const lineTimelines = [];

  for (const line of Array.from(paragraph)) {
    const { wordTimelines } = parseLineTimelines(line);
    lineTimelines.push(wordTimelines);
  }

  return {
    lineTimelines,
  };
}

export function SunoCharsToLyricCreateArgs(chars: SunoChar[]) {
  const timelines = [];
  const paragraphs = chars.reduce<sunoParagraph[]>(
    (acc, char, index) => {
      const newChar = { ...char, hasWhitespace: false, hasNewline: false };
      const nextChar = chars[index + 1];

      const lastParagraphIndex = acc.length ? acc.length - 1 : 0;
      const lastLineIndex = acc[lastParagraphIndex].length
        ? acc[lastParagraphIndex].length - 1
        : 0;
      const lastWordIndex = acc[lastParagraphIndex][lastLineIndex].length
        ? acc[lastParagraphIndex][lastLineIndex].length - 1
        : 0;

      newChar.word = newChar.word.trimStart();
      if (newChar.word.startsWith("\n")) {
        newChar.word = newChar.word.replaceAll("\n", "");
      }
      if (newChar.word.endsWith("\n\n")) {
        nextChar ? acc.push([[[]]]) : null;
        newChar.word = newChar.word.slice(0, -2);
      }
      if (newChar.word.endsWith("\n")) {
        nextChar ? acc[acc.length - 1].push([[]]) : null;
        newChar.word = newChar.word.slice(0, -1);
        newChar.hasNewline = true;
      }
      if (newChar.word.endsWith("　")) {
        newChar.word = newChar.word.slice(0, -1);
        newChar.hasNewline = true;
      }
      if (newChar.word.endsWith(" ")) {
        newChar.word = newChar.word.slice(0, -1);
        newChar.hasWhitespace = true;
      }

      acc[lastParagraphIndex][lastLineIndex][lastWordIndex].push(newChar);

      return acc;
    },
    [[[[]]]],
  );

  for (const paragraph of Array.from(paragraphs)) {
    const { lineTimelines } = parseParagraphTimelines(paragraph);
    timelines.push(lineTimelines);
  }

  return timelines;
}

export class SunoParser {
  lineTokenizer?: LyricCreateArgs["lineTokenizer"];
  paragraphTokenizer?: LyricCreateArgs["paragraphTokenizer"];
  offsetSec?: number;

  constructor(props?: {
    lineTokenizer?: LyricCreateArgs["lineTokenizer"];
    paragraphTokenizer?: LyricCreateArgs["paragraphTokenizer"];
    offsetSec?: number;
  }) {
    this.lineTokenizer = props ? props.lineTokenizer : undefined;
    this.paragraphTokenizer = props ? props.paragraphTokenizer : undefined;
    this.offsetSec = props ? props.offsetSec : undefined;
  }

  public async parse(chars: SunoChar[], resourceID: string) {
    const timelines = SunoCharsToLyricCreateArgs(chars);
    const lyric = await new Lyric({
      resourceID,
      duration: 0,
      timelines,
      lineTokenizer: this.lineTokenizer,
      paragraphTokenizer: this.paragraphTokenizer,
      offsetSec: this.offsetSec,
    }).init();

    return lyric;
  }
}

export default SunoParser;
