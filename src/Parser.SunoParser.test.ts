/**
 * @vitest-environment jsdom
 */

import path from "node:path";
import { LineArgsTokenizer } from "@ioris/tokenizer-kuromoji";
import { type IpadicFeatures, type Tokenizer, builder } from "kuromoji";
import { beforeEach, describe, expect, it } from "vitest";
import sample from "../sample.json";
import { SunoParser } from "./";

const kuromojiBuilder = builder({
  dicPath: path.resolve(__dirname, "../node_modules/kuromoji/dict"),
});

const getTokenizer = (): Promise<Tokenizer<IpadicFeatures>> =>
  new Promise((resolve, reject) => {
    kuromojiBuilder.build((err, tokenizer) => {
      if (err) {
        reject(err);
      }
      resolve(tokenizer);
    });
  });

describe("SunoParser", () => {
  let parser: SunoParser;

  beforeEach(async () => {
    const tokenizer = await getTokenizer();

    parser = new SunoParser({
      tokenizer: (lineArgs) =>
        LineArgsTokenizer({
          lineArgs,
          tokenizer,
        }),
    });
  });

  it("should parse syllable Suno lyric", async () => {
    const result = await parser.parse(
      sample,
      "7fcebd38-00b7-4c9a-9eba-1df4af210e48",
    );
    expect(result.resourceID).toBe("7fcebd38-00b7-4c9a-9eba-1df4af210e48");
    expect(result.duration).toBe(0);
    expect(result.voids().length).toBe(12);
    expect(result.timelines().flat(2).length).toBe(104);
    expect(
      result
        .timelines()
        .flat(2)
        .filter((t) =>
          [
            "verse",
            "chorus",
            "pre-chorus",
            "bridge",
            "outro",
            "intro",
            "rap",
          ].some((word) => t.text.toLowerCase().includes(word)),
        ).length,
    ).toBe(0);
  }, 10000);
});
