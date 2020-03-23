'use strict'

import * as vscode from 'vscode'
import * as voca from 'voca'
import * as path from 'path'
import { importSvelteFile } from './SvelteFileImporter'
import { grepAsync } from './lib/grep'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.sveltejsAutoImport', async () => {
      const text: string = getText(
        vscode.window.activeTextEditor!.document,
        vscode.window.activeTextEditor!.selection.active
      )

      if (
        !vscode.window.activeTextEditor ||
        vscode.window.activeTextEditor.document.languageId !== 'svelte'
      ) {
        vscode.window.showWarningMessage('Svelte.js AutoImport is only svelte file.')
        return false
      }

      const rootPath = vscode.workspace.rootPath
        ? path.resolve(
            vscode.workspace.rootPath,
            vscode.workspace
              .getConfiguration()
              .get<string>('sveltejsAutoImport.rootDirectory')!
          )
        : ''

      const pathList: string[] = await grepAsync([
        path.join(rootPath, `**/${voca.camelCase(text)}.svelte`),
        path.join(rootPath, `**/${voca.kebabCase(text)}.svelte`),
        path.join(rootPath, `**/${voca.capitalize(text)}.svelte`)
      ])

      const importCore = (fullPath: string) => {
        const activeEditorPath = path.parse(
          vscode.window.activeTextEditor!.document.fileName
        )
        const parsedTargetFilePath = path.parse(fullPath)
        const relationalDir = path.relative(
          activeEditorPath.dir,
          parsedTargetFilePath.dir
        )
        let relationalPath = path
          .join(relationalDir, parsedTargetFilePath.base)
          .replace(/\\/g, '/')

        // if just under
        if (!relationalPath.startsWith('../')) {
          relationalPath = './' + relationalPath
        }

        importSvelteFile(parsedTargetFilePath.name, relationalPath)
      }

      if (pathList.length === 1) {
        importCore(pathList[0])
      } else if (pathList.length > 1) {
        vscode.window.showQuickPick(pathList).then(selectedPath => {
          importCore(selectedPath!)
        })
      }
    })
  )
}

function getText(
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  const targetRange = document.getWordRangeAtPosition(
    position,
    /<.+?-?.+?(>| |\n|\r\n|$)/
  )
  const targetText = document.getText(targetRange)
  const formatedText = targetText
    .replace('<', '')
    .replace('>', '')
    .replace('/', '')
    .trim()
  return formatedText
}
