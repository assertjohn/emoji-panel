import * as vscode from 'vscode';
import { getNonce } from './getNonce';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "emojipanel-sidebar";
  private _view?: vscode.WebviewView;
  // Fallback recent emojis if no context is provided
  private _localRecentEmojis: string[] = [];

  /**
   * NOTE: To have persistent recent emojis via VS Code’s globalState,
   * you can pass the extension context when constructing this provider.
   * If omitted, a local variable will be used (resetting on reload).
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context?: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'emojiSelected': {
          const emoji = message.emoji;
          if (emoji) {
            await vscode.env.clipboard.writeText(emoji);
            vscode.window.setStatusBarMessage(`Copied ${emoji} to clipboard!`, 3000);
            this.updateRecentEmojis(emoji);
          }
          break;
        }
        case 'requestRecentEmojis': {
          const recentEmojis = this._getRecentEmojis();
          this._view?.webview.postMessage({ type: 'recentEmojis', recentEmojis });
          break;
        }
      }
    });
  }

  private updateRecentEmojis(emoji: string) {
    if (this._context) {
      const key = 'recentEmojis';
      let recentEmojis = this._context.globalState.get<string[]>(key) || [];
      // Prepend and remove duplicates; limit to 20 items
      recentEmojis = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
      this._context.globalState.update(key, recentEmojis);
      this._view?.webview.postMessage({ type: 'recentEmojis', recentEmojis });
    } else {
      this._localRecentEmojis = [emoji, ...this._localRecentEmojis.filter(e => e !== emoji)].slice(0, 20);
      this._view?.webview.postMessage({ type: 'recentEmojis', recentEmojis: this._localRecentEmojis });
    }
  }

  private _getRecentEmojis(): string[] {
    if (this._context) {
      return this._context.globalState.get<string[]>('recentEmojis') || [];
    } else {
      return this._localRecentEmojis;
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    // The compiled Svelte app for the emoji panel.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'compiled', 'Sidebar.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'compiled', 'Sidebar.css')
    );

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https:;
          script-src 'nonce-${nonce}';
          style-src ${webview.cspSource} 'unsafe-inline';
        " />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="${styleUri}" rel="stylesheet" />
        <title>Emoji Sidebar</title>
      </head>
      <body>
        <div id="app"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }
}
