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
            new CommandItem('보드/포트 자동 감지', 'arduino.autoDetect', 'zap', 'USB에 연결된 단일 보드를 찾아 자동으로 설정합니다.'),
            new CommandItem('수동 보드 선택', 'arduino.selectBoard', 'circuit-board', '수동으로 보드를 검색하여 선택합니다.'),
            new CommandItem('수동 포트 선택', 'arduino.selectPort', 'plug', '수동으로 연결될 포트를 선택합니다.'),
            new CommandItem('보드/포트 다시 선택', 'arduino.selectBoardAndPort', 'gear', 'QuickPick을 이용하여 보드와 포트를 다시 설정합니다.'),
            new CommandItem('스케치 컴파일 (확인)', 'arduino.compile', 'check', '현재 스케치를 컴파일하여 오류를 검사합니다.'),
            new CommandItem('스케치 업로드', 'arduino.upload', 'arrow-right', '연결된 보드에 스케치를 컴파일 및 업로드합니다.'),
            new CommandItem('시리얼 모니터 열기', 'arduino.serialMonitor', 'terminal', '시리얼 모니터를 열어 보드와 통신합니다.'),
            new CommandItem('새 스케치 생성', 'arduino.newSketch', 'new-file', '새로운 아두이노 스케치 템플릿을 생성합니다.'),
            new CommandItem('라이브러리 설치', 'arduino.installLibrary', 'library', 'Arduino 호환 라이브러리를 검색하고 설치합니다.'),
            new CommandItem('코어/플랫폼 설치', 'arduino.installCore', 'package', '새로운 보드 지원을 위한 코어(플랫폼)를 설치합니다.'),
            new CommandItem('예제 스케치 열기', 'arduino.openExample', 'file-code', '설치된 라이브러리/코어의 예제 목록을 탐색하고 엽니다.')
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
