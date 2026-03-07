import * as vscode from 'vscode';
import { selectBoard, autoDetectBoardAndPort } from './board-manager';
import { compile } from './compiler';
import { upload } from './uploader';
import { openSerialMonitor, sendDataToSerialMonitor, exportSerialLog } from './serial-monitor';
import { installLibrary, installCore } from './library-manager';
import { updateStatusBar } from './status-bar';
import { ArduinoSidebarProvider } from './sidebar';
import { openExample } from './examples-manager';
import { openSerialPlotter } from './webviews/serial-plotter';
import { openManagerGUI } from './webviews/manager-gui';
import { generateDebugConfig } from './debugger';
import { setSketchLocation, newSketch } from './sketch-manager';

/**
 * 모든 확장 명령어를 등록합니다.
 */
export function registerCommands(
    context: vscode.ExtensionContext, 
    sidebarProvider: ArduinoSidebarProvider
): void {
    const commands: Array<{
        id: string;
        handler: (...args: unknown[]) => unknown;
    }> = [
        {
            id: 'arduino.selectBoard',
            handler: async () => {
                await selectBoard();
                updateStatusBar();
                sidebarProvider.updateState();
            },
        },
        {
            id: 'arduino.autoDetect',
            handler: async () => {
                await autoDetectBoardAndPort();
                updateStatusBar();
                sidebarProvider.updateState();
            }
        },
        {
            id: 'arduino.compile',
            handler: compile,
        },
        {
            id: 'arduino.upload',
            handler: upload,
        },
        {
            id: 'arduino.serialMonitor',
            handler: openSerialMonitor,
        },
        {
            id: 'arduino.serialPlotter',
            handler: () => openSerialPlotter(context),
        },
        {
            id: 'arduino.managerGUI',
            handler: () => openManagerGUI(context),
        },
        {
            id: 'arduino.sendToSerial',
            handler: sendDataToSerialMonitor,
        },
        {
            id: 'arduino.generateDebugConfig',
            handler: generateDebugConfig,
        },
        {
            id: 'arduino.exportSerialLog',
            handler: exportSerialLog,
        },
        {
            id: 'arduino.installLibrary',
            handler: installLibrary,
        },
        {
            id: 'arduino.newSketch',
            handler: newSketch,
        },
        {
            id: 'arduino.installCore',
            handler: installCore,
        },
        {
            id: 'arduino.openExample',
            handler: openExample,
        },
        {
            id: 'arduino.setSketchLocation',
            handler: setSketchLocation,
        }
    ];

    for (const cmd of commands) {
        const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
        context.subscriptions.push(disposable);
    }
}
