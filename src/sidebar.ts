import * as vscode from 'vscode';

export class ArduinoSidebarProvider implements vscode.TreeDataProvider<CommandItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CommandItem | undefined | void> = new vscode.EventEmitter<CommandItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CommandItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CommandItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CommandItem): Thenable<CommandItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        // 최상위 루트 항목들
        const commands = [
            new CommandItem(vscode.l10n.t('Auto-detect Board/Port'), 'arduino.autoDetect', 'zap', vscode.l10n.t('Finds a single board connected via USB and sets it automatically.')),
            new CommandItem(vscode.l10n.t('Manual Board Selection'), 'arduino.selectBoard', 'circuit-board', vscode.l10n.t('Manually search and select a board.')),
            new CommandItem(vscode.l10n.t('Manual Port Selection'), 'arduino.selectPort', 'plug', vscode.l10n.t('Manually select a connection port.')),
            new CommandItem(vscode.l10n.t('Change Board/Port'), 'arduino.selectBoardAndPort', 'gear', vscode.l10n.t('Use QuickPick to reconfigure board and port.')),
            new CommandItem(vscode.l10n.t('Compile Sketch (Verify)'), 'arduino.compile', 'check', vscode.l10n.t('Compiles the current sketch to check for errors.')),
            new CommandItem(vscode.l10n.t('Upload Sketch'), 'arduino.upload', 'arrow-right', vscode.l10n.t('Compiles and uploads the sketch to the connected board.')),
            new CommandItem(vscode.l10n.t('Open Serial Monitor'), 'arduino.serialMonitor', 'terminal', vscode.l10n.t('Opens the serial monitor to communicate with the board.')),
            new CommandItem(vscode.l10n.t('Create New Sketch'), 'arduino.newSketch', 'new-file', vscode.l10n.t('Creates a new Arduino sketch template.')),
            new CommandItem(vscode.l10n.t('Install Library'), 'arduino.installLibrary', 'library', vscode.l10n.t('Search and install Arduino-compatible libraries.')),
            new CommandItem(vscode.l10n.t('Install Core/Platform'), 'arduino.installCore', 'package', vscode.l10n.t('Install a core (platform) for new board support.')),
            new CommandItem(vscode.l10n.t('Open Example Sketch'), 'arduino.openExample', 'file-code', vscode.l10n.t('Browse and open examples from installed libraries/cores.'))
        ];

        return Promise.resolve(commands);
    }
}

class CommandItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly iconName: string,
        public readonly tooltipText: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.tooltip = tooltipText;
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.command = {
            command: commandId,
            title: label
        };
    }
}
