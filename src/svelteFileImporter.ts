'use strict'

import * as vscode from 'vscode'

export async function importSvelteFile(
  fileName: string,
  path: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor!
  const document = vscode.window.activeTextEditor!.document
  const text = document.getText()

  const scriptTagMatch = /<script/.exec(text)
  if (scriptTagMatch && scriptTagMatch.index > -1) {
    await insertImport(editor, fileName, path)
  }
}

async function insertImport(
  editor: vscode.TextEditor,
  fileName: string,
  path: string
): Promise<void> {
  const document = editor.document
  const text = document.getText()

  const config = vscode.workspace.getConfiguration()
  const importWithSemicolon = config.get<boolean>(
    'sveltejsAutoImport.importWithSemicolon'
  )
  const hasFileExtension = !config.get<boolean>(
    'sveltejsAutoImport.hideFileExtension'
  )
  const forcePascalCase = config.get<boolean>(
    'sveltejsAutoImport.forcePascalCase'
  )
  const importWithIntend = config.get<boolean>(
    'sveltejsAutoImport.importWithIntend'
  )

  // rookie-proofing for people who don't follow the convention and name their components
  // using snake_case or kebab-case
  if (forcePascalCase) {
    fileName = toPascalCase(fileName)
  }
  // remove .svelte extension if user doesn't want it
  if (!hasFileExtension) {
    // normally, a simple path.split('.svelte')[0] should do it, but we're user-proofing it
    // for people who don't follow conventions. path.split('.svelte') would return incorrect
    // results if someone had a component inside a folder with a name like this:
    //
    //         /src/components/example.svelte/ActualComponent.svelte
    //
    // path.split('.svelte') would return: '/src/components/example'
    //
    // and that wouldn't be cool. Instead, we split the array with '.svelte', remove the
    // last element of the array (which will be an empty string, because the code that
    // gives us path is guaranteed to end with '.svelte')
    //
    // But if we're doing path.split() and if our path is guaratneed to end with .svelte,
    // doing path.split('.') instead of path.split('.svelte') is going to give us exactly
    // the same result, but bthe code will look a bit nicer.
    if (path) {
      const tempArray = path.split('.')
      tempArray.pop();
      path = tempArray.join('.');
    }
  }

  const match = /<script/.exec(text)
  if (match && match.index > -1) {
    const scriptTagPosition = document.positionAt(match.index)
    const insertPosition = new vscode.Position(scriptTagPosition.line + 1, 0)
    const importText = `${importWithIntend ? '\t' : ''}import ${fileName} from '${path}'${
      importWithSemicolon ? ';' : ''
    }${getEolString(document.eol)}`;
    const existImport = new RegExp(importText).test(text);
    if (!existImport) {
      await editor.edit(edit => {
        edit.insert(
          insertPosition,
          importText
        )
      })
    }
  }
}

function toPascalCase(string: string): string {
  string = string.charAt(0).toUpperCase() + string.slice(1)
  return string.replace(/[-_]([a-z])/g, (g: string) => g[1].toUpperCase())
}

function getEolString(eol: vscode.EndOfLine): string {
  return eol === vscode.EndOfLine.LF ? `\n` : `\r\n`
}
