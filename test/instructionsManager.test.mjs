import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { updateGitignoreFile } from "../out/instructionsManager.js";

const BLOCK_START = "# agent-folders:start";
const BLOCK_END = "# agent-folders:end";

async function withTempDir(run) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "agent-folders-test-"),
  );
  try {
    await run(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("adds managed block when target folder exists", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);

    await fs.mkdir(targetDirPath, { recursive: true });

    await updateGitignoreFile(gitignorePath, targetFolder, targetDirPath);

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      `${BLOCK_START}\n/.examples/\n${BLOCK_END}\n`,
      "Expected .gitignore to contain only the managed block",
    );
  });
});

test("appends managed block while preserving existing rules", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);

    await fs.writeFile(gitignorePath, "node_modules/\nout/\n", "utf8");
    await fs.mkdir(targetDirPath, { recursive: true });

    await updateGitignoreFile(gitignorePath, targetFolder, targetDirPath);

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      "node_modules/\nout/\n\n# agent-folders:start\n/.examples/\n# agent-folders:end\n",
      "Expected existing .gitignore rules to remain and managed block to append",
    );
  });
});

test("removes only managed block when target folder is absent", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);

    await fs.writeFile(
      gitignorePath,
      "node_modules/\n\n# agent-folders:start\n/.examples/\n# agent-folders:end\n\nout/\n",
      "utf8",
    );

    await updateGitignoreFile(gitignorePath, targetFolder, targetDirPath);

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      "node_modules/\n\nout/\n",
      "Expected only managed block to be removed",
    );
  });
});

test("deletes .gitignore when it only contains managed block and folder disappears", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);

    await fs.mkdir(targetDirPath, { recursive: true });
    await updateGitignoreFile(gitignorePath, targetFolder, targetDirPath);

    await fs.rm(targetDirPath, { recursive: true, force: true });
    await updateGitignoreFile(gitignorePath, targetFolder, targetDirPath);

    await assert.rejects(
      async () => fs.readFile(gitignorePath, "utf8"),
      (error) => error && error.code === "ENOENT",
      "Expected .gitignore to be removed when only managed content remained",
    );
  });
});
