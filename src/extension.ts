// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import { HelloWorldPanel } from './MainPanel';
import { SidebarProvider } from './SidebarProvider';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "one-file-export" is now active!');


	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"emojipanel-sidebar",
			sidebarProvider
		)
	);

	// Add the command registration
	let showCommand = vscode.commands.registerCommand('emoji-panel.show', () => {
		vscode.commands.executeCommand('workbench.view.extension.emojipanel-sidebar-view');
	});

	context.subscriptions.push(showCommand);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('one-file-export.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from One File Export!');
	// 	HelloWorldPanel.createOrShow(context.extensionUri);
	// });

	// context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
