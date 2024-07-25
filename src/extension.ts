"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

interface CommandArguments {
  /**
   * The extensions to switch to, need to have a leading period
   */
  extensions: string[];
  /**
   * Open the file in a different editor column. Default false
   */
  useOtherColumn: boolean;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("fileextswitch", (args: any) =>
      switchToFile(args)
    )
  );
}

function switchToFile(args: any) {
  const current = vscode.window.activeTextEditor?.document.fileName;

  if (!current) {
    return;
  }

  const validArgs = parseArgs(args);

  const dir = path.dirname(current);
  fs.readdir(dir, (err, files) => {
    if (err) {
      vscode.window.showErrorMessage("fileextswitch encountered error: " + err);
      return;
    }
    tryOpenCompanionFile(current, validArgs, files);
  });
}

function showKeybindingWarning() {
  const warn = `Your keybinding for fileextswitch is incorrectly configured. See https://goo.gl/gsCYrW for how to set up correct configuration.`;
  vscode.window.showWarningMessage(warn);
}

function parseArgs(args: any): CommandArguments {
  if (
    !args.extensions ||
    !args.extensions.length ||
    // @ts-expect-error - support any type
    args.extensions.find((x) => x.indexOf(".") !== 0) // all extensions need to start with leading .
  ) {
    showKeybindingWarning();
    args.extensions = [];
  }

  return {
    useOtherColumn: args.useOtherColumn || false,
    extensions: args.extensions,
  };
}

function tryOpenCompanionFile(
  currentPath: string,
  args: CommandArguments,
  files: string[]
) {
  const currentFile = path.basename(currentPath); // this gives us the file with all extensions
  const components = currentFile.split(".");

  const filesMap: { [key: string]: string } = {};
  files.forEach((x) => (filesMap[x] = x));

  // now lets try changing the last component, then the last 2 etc.
  const minimumComponentMatches = 1;
  const currentExtension = 1;
  const candidates = [];

  // try all extensions
  for (let e of args.extensions) {
    for (
      let i = components.length - currentExtension;
      i >= minimumComponentMatches;
      i--
    ) {
      const nextComponents = components.slice(0, i);
      const nextBase = nextComponents.join(".");

      const nextFile = nextBase + e;
      const exists = filesMap[nextFile];

      if (exists && nextFile !== currentFile) {
        const dir = path.dirname(currentPath);
        const filePath = path.join(dir, nextFile);

        if (candidates.indexOf(filePath) === -1) {
          candidates.push(filePath);
        }
      }
    }
  }

  if (candidates.length === 0) {
    // If no file is found, try finding a file with the folder name
    const dirName = path.basename(path.dirname(currentPath));
    for (let e of args.extensions) {
      const folderFile = path.join(path.dirname(currentPath), `${dirName}${e}`);
      if (filesMap[`${dirName}${e}`]) {
        candidates.push(folderFile);
      }
    }
  }

  const selfIndex = candidates.indexOf(currentPath);
  const nextIndex = (selfIndex + 1) % candidates.length;

  const candidate = candidates[nextIndex];
  if (candidate) {
    openFile(candidate, determineColumn(args.useOtherColumn));
  } else {
    vscode.window.showInformationMessage("No matching file found");
  }
}

function determineColumn(useOtherColumn: boolean): number {
  const active = vscode.window.activeTextEditor?.viewColumn;

  if (active === undefined) {
    return 1;
  }

  if (!useOtherColumn) {
    return active;
  }

  return active === 1 ? 2 : 1;
}

function openFile(path: string, column: number): boolean {
  vscode.workspace
    .openTextDocument(path)
    .then((x) => vscode.window.showTextDocument(x, column));

  return true;
}

// this method is called when your extension is deactivated
export function deactivate() {}
