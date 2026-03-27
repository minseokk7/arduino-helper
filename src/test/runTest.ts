import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // 확장이 위치한 루트 디렉토리
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        
        // 테스트 스위트(index.js)가 위치한 디렉토리
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // VS Code를 다운로드하고 압축을 푼 뒤, 확장과 함께 테스트 실행
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();