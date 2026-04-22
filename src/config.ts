import * as vscode from "vscode";

export function getTargetFolder(): string {
  return vscode.workspace
    .getConfiguration("symlinkFolders")
    .get<string>("targetFolder", ".examples");
}

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
