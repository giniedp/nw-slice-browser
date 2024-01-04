import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "nw-slice-browser.internal.open",
      async (uri: vscode.Uri) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      }
    )
  );

  vscode.languages.registerHoverProvider(
    `json`,
    new (class implements vscode.HoverProvider {
      provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Hover> {
        const settings = vscode.workspace.getConfiguration("nw-slice-browser");
        const rootDirs = settings.get<string>("lookupDir")?.split(";") || [];
        const word = document.getText(
          document.getWordRangeAtPosition(position, /[\w\.\/\\]+/)
        );

        const files = rootDirs
          .map((rootDir) => findFile(rootDir, word) || findFile(path.join(rootDir, 'slices'), word))
          .filter((uri) => !!uri);
        if (!files.length) {
          return null;
        }

        const mdString = [];
        for (const file of files) {
          const commandUri = vscode.Uri.parse(
            `command:nw-slice-browser.internal.open?${encodeURIComponent(
              JSON.stringify([file])
            )}`
          );
          mdString.push(`- [${file}](${commandUri})`);
        }

        const contents = new vscode.MarkdownString(mdString.join("\n"));

        contents.isTrusted = true;

        return new vscode.Hover(contents);
      }
    })()
  );
}

function findFile(rootDir: string, fileName: string) {
  let file = path.join(rootDir, fileName);
  if (fs.existsSync(file)) {
    return file;
  }
  file = path.join(rootDir, fileName + ".json");
  if (fs.existsSync(file)) {
    return file;
  }
  if (fileName.endsWith(".slice")) {
    file = file.replace(/\.slice$/, ".dynamicslice.json");
    if (fs.existsSync(file)) {
      return file;
    }
  }

  return null;
}

export function deactivate() {}
