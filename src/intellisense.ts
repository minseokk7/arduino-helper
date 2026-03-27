/**
 * intellisense.ts — C/C++ 확장을 위한 IntelliSense 자동 구성
 *
 * arduino-cli compile 의 빌드 프로퍼티와 include 경로를 분석하여
 * 자동완성(c_cpp_properties.json) 환경을 구성합니다.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { runCli } from './arduino-cli';
import { getState } from './config';

interface CppProperties {
    configurations: Array<{
        name: string;
        includePath: string[];
        defines: string[];
        compilerPath?: string;
        cStandard?: string;
        cppStandard?: string;
        intelliSenseMode?: string;
    }>;
    version: number;
}

/**
 * 인텔리센스 설정을 업데이트합니다 (c_cpp_properties.json 생성/수정).
 * 현재 워크스페이스 구조를 기반으로 작동합니다.
 */
export async function updateIntelliSense(): Promise<void> {
    const state = getState();
    if (!state.selectedFqbn) {
        return; // 보드가 선택되지 않았으면 무시
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return; // 현재 워크스페이스가 열려있지 않음
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const vscodeDir = path.join(rootPath, '.vscode');
    const propertiesFile = path.join(vscodeDir, 'c_cpp_properties.json');

    try {
        // arduino-cli compile --show-properties --fqbn <fqbn>
        // 보드, 코어 라이브러리 정보를 덤프합니다.
        const result = await runCli(['compile', '--show-properties', '--fqbn', state.selectedFqbn]);

        if (result.exitCode !== 0) {
            console.error('Failed to get properties from arduino-cli');
            return;
        }

        const properties: Record<string, string> = {};
        for (const line of result.stdout.split('\n')) {
            const index = line.indexOf('=');
            if (index > 0) {
                const key = line.substring(0, index).trim();
                const value = line.substring(index + 1).trim();
                properties[key] = value;
            }
        }

        // 경로 추출
        const runtimePath = properties['runtime.platform.path'];
        const buildCore = properties['build.core'];
        const buildVariant = properties['build.variant'];
        const compilerPath = properties['compiler.cpp.cmd'] || properties['compiler.c.cmd'];

        const includePaths = new Set<string>();

        // 워크스페이스 자체 (재귀적)
        includePaths.add('${workspaceFolder}/**');

        // 코어(Core) 라이브러리 경로
        if (runtimePath && buildCore) {
            const corePath = path.join(runtimePath, 'cores', buildCore);
            if (fs.existsSync(corePath)) {
                includePaths.add(corePath);
            }
        }

        // 베리언트(Variant) 핀 맵 경로
        if (runtimePath && buildVariant) {
            const variantPath = path.join(runtimePath, 'variants', buildVariant);
            if (fs.existsSync(variantPath)) {
                includePaths.add(variantPath);
            }
        }

        // 내장(Built-in) 라이브러리 경로
        if (runtimePath) {
            const librariesPath = path.join(runtimePath, 'libraries');
            if (fs.existsSync(librariesPath)) {
                includePaths.add(path.join(librariesPath, '**'));
            }
        }

        // 사용자 설치 라이브러리 (기본 경로 추정)
        // arduino-cli config dump 명령으로 알아낼 수도 있음. 보통 문서/Arduino/libraries
        try {
            const configResult = await runCli(['config', 'dump']);
            const configLines = configResult.stdout.split('\n');
            let userDir = '';
            for (let i = 0; i < configLines.length; i++) {
                if (configLines[i].includes('user:')) {
                    userDir = configLines[i].split('user:')[1].trim();
                    break;
                }
            }
            if (userDir) {
                const userLibs = path.join(userDir, 'libraries');
                if (fs.existsSync(userLibs)) {
                    includePaths.add(path.join(userLibs, '**'));
                }
            }
        } catch (e) {
            // 사용자 라이브러리 경로 탐색 실패 무시
        }

        const buildDefines = [
            'ARDUINO=10800', // 일반적으로 호환성 용도
            properties['build.board'] ? `ARDUINO_${properties['build.board']}` : '',
            properties['build.arch'] ? `ARDUINO_ARCH_${properties['build.arch'].toUpperCase()}` : ''
        ].filter(d => Boolean(d));

        let configObj: CppProperties;

        if (fs.existsSync(propertiesFile)) {
            try {
                configObj = JSON.parse(fs.readFileSync(propertiesFile, 'utf8'));
            } catch {
                configObj = { configurations: [], version: 4 };
            }
        } else {
            configObj = { configurations: [], version: 4 };
        }

        let defaultIndex = configObj.configurations.findIndex(c => c.name === 'Arduino');
        if (defaultIndex === -1) {
            configObj.configurations.push({
                name: 'Arduino',
                includePath: [],
                defines: [],
                cStandard: 'c11',
                cppStandard: 'c++11',
                intelliSenseMode: 'gcc-x64'
            });
            defaultIndex = configObj.configurations.length - 1;
        }

        configObj.configurations[defaultIndex].includePath = Array.from(includePaths);
        configObj.configurations[defaultIndex].defines = buildDefines;
        configObj.configurations[defaultIndex].cStandard = 'c11';
        configObj.configurations[defaultIndex].cppStandard = 'c++11';

        // 컴파일러 실행 파일 경로가 감지된 경우 설정 (빨간줄 방지에 매우 좋음)
        if (compilerPath && properties['runtime.tools.compiler.path']) {
            const fullCompiler = path.join(properties['runtime.tools.compiler.path'], 'bin', compilerPath);
            if (fs.existsSync(fullCompiler)) {
                configObj.configurations[defaultIndex].compilerPath = fullCompiler;
            }
        } else if (compilerPath) {
            // 다른 툴체인 경로 규칙일 수도 있음
        }

        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        fs.writeFileSync(propertiesFile, JSON.stringify(configObj, null, 4), 'utf8');
        console.log('c_cpp_properties.json generated successfully.');

    } catch (error) {
        console.error('Failed to update IntelliSense:', error);
    }
}
