export type DiffLineType = "add" | "del" | "context" | "noop";

export interface DiffLine {
  position: number;
  oldLine: number | null;
  newLine: number | null;
  type: DiffLineType;
  content: string;
}

export interface PatchParseResult {
  lines: DiffLine[];
  addedLines: DiffLine[];
}

const parseHunkHeader = (line: string) => {
  const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (!match) {
    return null;
  }
  return {
    oldStart: Number(match[1]),
    newStart: Number(match[2]),
  };
};

export const parsePatch = (patch: string): PatchParseResult => {
  const lines = patch.split("\n");
  const parsed: DiffLine[] = [];
  const addedLines: DiffLine[] = [];

  let oldLine = 0;
  let newLine = 0;
  let position = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const hunk = parseHunkHeader(line);
      if (hunk) {
        oldLine = hunk.oldStart;
        newLine = hunk.newStart;
      }
      continue;
    }

    if (line.startsWith("+")) {
      if (!line.startsWith("+++")) {
        position += 1;
        const entry: DiffLine = {
          position,
          oldLine: null,
          newLine,
          type: "add",
          content: line.slice(1),
        };
        parsed.push(entry);
        addedLines.push(entry);
        newLine += 1;
        continue;
      }
    }

    if (line.startsWith("-")) {
      if (!line.startsWith("---")) {
        position += 1;
        parsed.push({
          position,
          oldLine,
          newLine: null,
          type: "del",
          content: line.slice(1),
        });
        oldLine += 1;
        continue;
      }
    }

    if (line.startsWith(" ")) {
      position += 1;
      parsed.push({
        position,
        oldLine,
        newLine,
        type: "context",
        content: line.slice(1),
      });
      oldLine += 1;
      newLine += 1;
      continue;
    }

    if (line.startsWith("\\")) {
      position += 1;
      parsed.push({
        position,
        oldLine: null,
        newLine: null,
        type: "noop",
        content: line,
      });
      continue;
    }
  }

  return { lines: parsed, addedLines };
};

export const getFirstAddedLine = (patch: string) => {
  const parsed = parsePatch(patch);
  return parsed.addedLines[0] || null;
};
