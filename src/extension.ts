import * as vscode from "vscode";
import * as path from "path";
import { SymlinkTreeProvider, SymlinkItem } from "./symlinkTreeProvider";
import { addSymlink, removeSymlink } from "./symlinkManager";
import { getTargetFolder, getWorkspaceRoot } from "./config";

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new SymlinkTreeProvider();

  const treeView = vscode.window.createTreeView("symlinkFolders", {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  // Watch the target folder for external changes
  const watcher = vscode.workspace.createFileSystemWatcher("**/.examples/**");
  watcher.onDidCreate(() => treeProvider.refresh());
  watcher.onDidDelete(() => treeProvider.refresh());

  const addCommand = vscode.commands.registerCommand(
    "symlinkFolders.addSymlink",
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }

      const uris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select Folder to Symlink",
      });

      if (!uris || uris.length === 0) {
        return;
      }

      const sourcePath = uris[0].fsPath;
      const targetFolder = getTargetFolder();

      try {
        const symlinkPath = await addSymlink(
          sourcePath,
          workspaceRoot,
          targetFolder,
        );
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `Symlink created: ${path.basename(symlinkPath)} → ${sourcePath}`,
        );
      } catch (err: unknown) {
        vscode.window.showErrorMessage(
          `Failed to create symlink: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );

  const removeCommand = vscode.commands.registerCommand(
    "symlinkFolders.removeSymlink",
    async (item?: SymlinkItem) => {
      if (!item) {
        vscode.window.showErrorMessage(
          "Select a symlink from the tree to remove.",
        );
        return;
      }

      const confirmed = await vscode.window.showWarningMessage(
        `Remove symlink "${item.entry.name}"? The original folder will not be affected.`,
        { modal: true },
        "Remove",
      );

      if (confirmed !== "Remove") {
        return;
      }

      try {
        await removeSymlink(item.entry.symlinkPath);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `Symlink "${item.entry.name}" removed.`,
        );
      } catch (err: unknown) {
        vscode.window.showErrorMessage(
          `Failed to remove symlink: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );

  const refreshCommand = vscode.commands.registerCommand(
    "symlinkFolders.refresh",
    () => treeProvider.refresh(),
  );

  const openTargetCommand = vscode.commands.registerCommand(
    "symlinkFolders.openTargetFolder",
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      const targetFolder = getTargetFolder();
      const targetUri = vscode.Uri.file(path.join(workspaceRoot, targetFolder));
      await vscode.commands.executeCommand("revealInExplorer", targetUri);
    },
  );

  const revealCommand = vscode.commands.registerCommand(
    "symlinkFolders.revealInFinder",
    async (item?: SymlinkItem) => {
      if (!item) {
        return;
      }
      await vscode.commands.executeCommand(
        "revealFileInOS",
        vscode.Uri.file(item.entry.realPath),
      );
    },
  );

  context.subscriptions.push(
    treeView,
    watcher,
    addCommand,
    removeCommand,
    refreshCommand,
    openTargetCommand,
    revealCommand,
  );
}

export function deactivate(): void {}
