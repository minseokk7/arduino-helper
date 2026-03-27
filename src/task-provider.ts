/**
 * task-provider.ts — VS Code 빌드 시스템(TaskProvider) 연동
 *
 * 사용자가 Ctrl+Shift+B (기본 빌드 작업 실행)를 눌렀을 때
 * Arduino 컴파일 작업이 실행되도록 합니다.
 */
import * as vscode from 'vscode';

export class ArduinoTaskProvider implements vscode.TaskProvider {
    static ArduinoType = 'arduino';

    public async provideTasks(): Promise<vscode.Task[]> {
        return [this.getBuildTask()];
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        // 기존 작업이 전달된 경우, 안전하게 기본 빌드 작업으로 치환(해석)해서 반환합니다
        return this.getBuildTask();
    }

    private getBuildTask(): vscode.Task {
        // 1. Task 이름 설정 (화면에 보일 이름)
        const taskName = 'Arduino: Compile Sketch';

        // 2. 실행 종류 (TaskDefinition) 정의
        const kind: vscode.TaskDefinition = {
            type: ArduinoTaskProvider.ArduinoType,
            task: taskName
        };

        // 3. 실제 동작: 확장에 등록된 커맨드('arduino.compile')를 실행하도록 연결
        // CustomExecution을 사용하면 셀 명령어 대신 TypeScript 함수나 VS Code Command를 직접 태스크인 것처럼 부를 수 있습니다.
        const execution = new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
            // Pseudoterminal 구현체를 반환하여, 작업 실행 시 우리 커맨드만 비동기로 호출하고 즉시 터미널 탭을 닫게 만듦 
            return new ArduinoTaskTerminal();
        });

        // 4. Task 객체 생성
        const task = new vscode.Task(
            kind,
            vscode.TaskScope.Workspace,
            taskName,
            ArduinoTaskProvider.ArduinoType,
            execution
        );

        // 5. Build Group 으로 지정 (Ctrl+Shift+B 눌렀을 때 나타나도록)
        task.group = vscode.TaskGroup.Build;

        return task;
    }
}

/**
 * CustomExecution을 위한 가상 터미널 (Pseudoterminal)
 * 실제 터미널 UI를 그리는 것이 아니라, 즉시 커맨드만 실행하고 종료합니다.
 */
class ArduinoTaskTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose?: vscode.Event<number> = this.closeEmitter.event;

    open(): void {
        // 터미널이 열리자마자 내부 커맨드를 실행
        this.executeCompile();
    }

    close(): void {
        // 사용자가 X를 누른 경우
    }

    private async executeCompile() {
        try {
            // extension.ts에 등록된 컴파일 명령 호출
            await vscode.commands.executeCommand('arduino.compile');
            // 정상 종료 신호 (exit code: 0)
            this.closeEmitter.fire(0);
        } catch (error) {
            // 에러 종료 신호 (exit code: 1)
            this.closeEmitter.fire(1);
        }
    }
}
