/**
 * manager-gui.ts — 통합 라이브러리 및 보드 매니저 Webview
 *
 * arduino-cli search/install 명령어를 웹 뷰 기반의 
 * 시각적인 대시보드(GUI)로 래핑하여 제공합니다.
 */
import * as vscode from 'vscode';
import { runCli, runCliJson } from '../arduino-cli';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

/**
 * 매니저 GUI 웹뷰를 엽니다.
 */
export function openManagerGUI(context: vscode.ExtensionContext): void {
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.One);
        return;
    }

    currentPanel = vscode.window.createWebviewPanel(
        'arduinoManagerGUI',
        vscode.l10n.t('Arduino Library/Board Manager'),
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    currentPanel.onDidDispose(
        () => {
            currentPanel = undefined;
        },
        null,
        context.subscriptions
    );

    currentPanel.webview.html = getWebviewContent();

    // 웹뷰에서 전달되는 메시지(검색, 설치 요청) 처리
    currentPanel.webview.onDidReceiveMessage(
        async (message) => {
            switch (message.command) {
                case 'webviewReady':
                    // 초기에 전체 데이터를 백그라운드에서 로딩
                    handleSearch('lib', '').catch(console.error);
                    handleSearch('core', '').catch(console.error);
                    break;
                case 'install':
                    await handleInstall(message.type, message.id);
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}

/**
 * 검색 요청을 arduino-cli로 실행하고 결과를 웹뷰로 회신합니다.
 */
async function handleSearch(type: 'lib' | 'core', query: string) {
    if (!currentPanel) return;

    try {
        // arduino-cli lib search [query] --format json
        const args = [type, 'search'];
        if (query) {
            args.push(query);
        }
        // 전체 레지스트리 로딩은 시간이 오래 걸릴 수 있으므로 타임아웃 180초
        const result = await runCliJson<any>(args, { timeout: 180000 });

        let items: any[] = [];
        if (type === 'lib' && result.data && result.data.libraries) {
            items = result.data.libraries;
        } else if (type === 'core' && result.data && result.data.platforms) {
            items = result.data.platforms;
        }

        // 알파벳순(이름순) 정렬
        items.sort((a, b) => {
            let nameA = (a.name || '').toLowerCase();
            let nameB = (b.name || '').toLowerCase();
            // 코어는 name이 releases 안에 있음
            if (type === 'core') {
                const relA = a.releases?.[a.latest_version];
                const relB = b.releases?.[b.latest_version];
                nameA = (relA?.name || a.id || '').toLowerCase();
                nameB = (relB?.name || b.id || '').toLowerCase();
            }
            return nameA.localeCompare(nameB);
        });

        currentPanel.webview.postMessage({
            command: 'searchResults',
            type: type,
            results: items
        });
    } catch (e) {
        vscode.window.showErrorMessage(`Search failed: ${e}`);
        currentPanel.webview.postMessage({
            command: 'searchError',
            error: String(e)
        });
    }
}

/**
 * 설치 요청을 arduino-cli로 실행합니다.
 */
async function handleInstall(type: 'lib' | 'core', id: string) {
    if (!currentPanel) return;

    vscode.window.showInformationMessage(vscode.l10n.t('Installing {0}...', id));
    currentPanel.webview.postMessage({ command: 'installStart', id });

    try {
        const result = await runCli([type, 'install', id]);

        if (result.exitCode === 0) {
            vscode.window.showInformationMessage(vscode.l10n.t('Successfully installed: {0}', id));
            currentPanel.webview.postMessage({ command: 'installSuccess', id });
        } else {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to install {0}', id));
            currentPanel.webview.postMessage({ command: 'installError', id, error: result.stderr });
        }
    } catch (e) {
        vscode.window.showErrorMessage(vscode.l10n.t('Error installing {0}: {1}', id, String(e)));
        currentPanel.webview.postMessage({ command: 'installError', id, error: String(e) });
    }
}

/**
 * 매니저 GUI HTML 문서 템플릿
 */
function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arduino Manager</title>
    <style>
        :root {
            --arduino-teal: #00979C;
            --arduino-teal-hover: #008184;
            --bg-glass: rgba(255, 255, 255, 0.03);
            --bg-glass-hover: rgba(255, 255, 255, 0.08);
            --border-glass: rgba(255, 255, 255, 0.1);
        }
        body { 
            margin: 0; padding: 24px; font-family: var(--vscode-font-family); 
            background-color: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground); 
        }
        .header { 
            display: flex; gap: 15px; margin-bottom: 24px; 
            border-bottom: 1px solid var(--border-glass); 
            padding-bottom: 20px; align-items: center; 
        }
        .header h2 { margin: 0; padding: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; display: flex; align-items: center; gap: 10px; }
        .search-box { display: flex; gap: 12px; width: 100%; max-width: 600px; }
        input[type="text"] { 
            flex: 1; padding: 10px 14px; font-size: 14px;
            background: var(--vscode-input-background); 
            color: var(--vscode-input-foreground); 
            border: 1px solid var(--vscode-input-border); 
            outline: none; border-radius: 8px; 
            transition: all 0.3s ease;
        }
        input[type="text"]:focus { 
            border-color: var(--arduino-teal); 
            box-shadow: 0 0 0 2px rgba(0, 151, 156, 0.2);
        }
        button { 
            background: linear-gradient(135deg, var(--arduino-teal), #007a7e); 
            color: white; border: none; padding: 10px 20px; 
            cursor: pointer; border-radius: 8px; font-weight: 600;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 0 2px 8px rgba(0, 151, 156, 0.3);
        }
        button:hover { 
            background: linear-gradient(135deg, var(--arduino-teal-hover), #00686b); 
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 151, 156, 0.4);
        }
        button:active { transform: translateY(0); }
        button:disabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            box-shadow: none; cursor: not-allowed; transform: none;
        }
        select { 
            background: var(--vscode-dropdown-background); 
            color: var(--vscode-dropdown-foreground); 
            border: 1px solid var(--vscode-dropdown-border); 
            padding: 10px; outline: none; border-radius: 8px; font-size: 14px;
        }
        
        .list-container { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); }
        .item-card { 
            background: var(--bg-glass); 
            border: 1px solid var(--border-glass); 
            border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .item-card:hover {
            transform: translateY(-4px);
            background: var(--bg-glass-hover);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            border-color: rgba(255, 255, 255, 0.2);
        }
        .item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .item-title { font-size: 16px; font-weight: 600; color: var(--arduino-teal); margin: 0; line-height: 1.2; word-break: break-all; }
        .item-author { font-size: 12px; opacity: 0.7; margin-top: 4px; display: block; }
        .item-desc { font-size: 13px; margin: 0; line-height: 1.5; opacity: 0.85; flex-grow: 1; }
        .item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; font-size: 12px; padding-top: 12px; border-top: 1px solid var(--border-glass); }
        .version-badge { background: rgba(0, 151, 156, 0.15); color: var(--arduino-teal); padding: 4px 8px; border-radius: 12px; font-weight: 600; font-family: monospace; }
        
        .loader { 
            display: none; margin: 40px auto; border: 3px solid var(--border-glass); 
            border-top: 3px solid var(--arduino-teal); border-radius: 50%; 
            width: 32px; height: 32px; animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .status-msg { text-align: center; margin-top: 40px; opacity: 0.6; font-style: italic; font-size: 14px; }
        
        /* 스크롤바 커스텀 */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
    </style>
</head>
<body>

    <div class="header">
        <h2>📦 Arduino Manager</h2>
        <select id="searchType">
            <option value="lib">Libraries</option>
            <option value="core">Boards / Cores</option>
        </select>
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search for libraries or boards (e.g., Ethernet, ESP32)..." autocomplete="off" />
            <button id="searchBtn">Search</button>
        </div>
    </div>

    <div class="loader" id="loader"></div>
    <div class="status-msg" id="statusMsg">Type a query to search the Arduino registry.</div>
    <div class="list-container" id="resultsList"></div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const searchInput = document.getElementById('searchInput');
        const searchType = document.getElementById('searchType');
        const resultsList = document.getElementById('resultsList');
        const loader = document.getElementById('loader');
        const statusMsg = document.getElementById('statusMsg');

        let allData = { lib: [], core: [] };
        let isLoaded = { lib: false, core: false };

        // 로컬 자바스크립트 필터링
        function applyLocalFilter() {
            const query = searchInput.value.trim().toLowerCase();
            const type = searchType.value;
            const data = allData[type];
            
            if (!isLoaded[type]) {
                resultsList.innerHTML = '';
                loader.style.display = 'block';
                statusMsg.textContent = 'Downloading registry metadata... (This might take a minute initially)';
                statusMsg.style.display = 'block';
                return;
            }
            
            const filtered = query ? data.filter(item => {
                let name = '';
                let desc = '';
                if (type === 'lib') {
                    name = (item.name || '').toLowerCase();
                    const release = item.latest || {};
                    desc = ((release.sentence || '') + ' ' + (release.paragraph || '')).toLowerCase();
                } else {
                    // 코어: name은 releases[latest_version] 안에 있음
                    const rel = item.releases && item.latest_version ? item.releases[item.latest_version] : null;
                    name = ((rel && rel.name) || item.id || '').toLowerCase();
                    desc = ((item.id || '') + ' ' + (item.maintainer || '')).toLowerCase();
                }
                return name.includes(query) || (desc && desc.includes(query));
            }) : data;

            renderResults(filtered, type);
        }

        searchInput.addEventListener('input', applyLocalFilter);
        searchType.addEventListener('change', applyLocalFilter);

        // VS Code Webview에서는 인라인 스크립트 실행 시점에 DOM이 이미 준비됨
        vscode.postMessage({ command: 'webviewReady' });
        applyLocalFilter(); // 로딩 UI 표시

        // 결과 렌더링
        function renderResults(results, type) {
            loader.style.display = 'none';
            resultsList.innerHTML = '';
            
            if (!results || results.length === 0) {
                statusMsg.textContent = 'No results found.';
                statusMsg.style.display = 'block';
                return;
            }
            statusMsg.style.display = 'none';

            // DOM 과부하 방지를 위한 최대 렌더링 수치 100개
            const MAX_RENDER = 100;
            const renderCount = Math.min(results.length, MAX_RENDER);
            
            for (let i = 0; i < renderCount; i++) {
                const item = results[i];
                let id = '';
                let name = '';
                let author = '';
                let desc = '';
                let version = '';

                if (type === 'lib') {
                    const release = item.latest || {};
                    id = item.name;
                    name = item.name;
                    author = release.author || '';
                    desc = release.sentence || release.paragraph || '';
                    version = release.version || '';
                } else if (type === 'core') {
                    // 코어: name은 releases[latest_version] 안에 있음
                    const rel = item.releases && item.latest_version ? item.releases[item.latest_version] : null;
                    id = item.id;
                    name = (rel && rel.name) || item.id;
                    author = item.maintainer || '';
                    desc = item.id;
                    version = item.latest_version || '';
                }

                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = \`
                    <div class="item-header">
                        <div>
                            <h3 class="item-title">\${name}</h3>
                            <span class="item-author">\${author}</span>
                        </div>
                        <button class="install-btn" data-id="\${id}">Install</button>
                    </div>
                    <div class="item-desc">\${desc}</div>
                    <div class="item-footer">
                        <span>Latest: <span class="version-badge">\${version}</span></span>
                        <span>ID: <code>\${id}</code></span>
                    </div>
                \`;
                resultsList.appendChild(card);
            }

            if (results.length > MAX_RENDER) {
                const more = document.createElement('div');
                more.className = 'status-msg';
                more.style.display = 'block';
                more.textContent = \`Showing \${MAX_RENDER} of \${results.length} results. Keep typing to filter more.\`;
                resultsList.appendChild(more);
            }

            // 설치 버튼 이벤트 바인딩
            document.querySelectorAll('.install-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.target.getAttribute('data-id');
                    e.target.disabled = true;
                    e.target.innerText = 'Installing...';
                    
                    vscode.postMessage({
                        command: 'install',
                        type: searchType.value,
                        id: targetId
                    });
                });
            });
        }

        // 확장으로부터 메시지 수신
        window.addEventListener('message', event => {
            const msg = event.data;
            switch(msg.command) {
                case 'searchResults':
                    allData[msg.type] = msg.results || [];
                    isLoaded[msg.type] = true;
                    if (searchType.value === msg.type) {
                        applyLocalFilter(); // 즉각 DOM 업데이트
                    }
                    break;
                case 'searchError':
                    loader.style.display = 'none';
                    statusMsg.textContent = 'Error: ' + msg.error;
                    statusMsg.style.display = 'block';
                    break;
                case 'installSuccess':
                    const btnOk = document.querySelector(\`.install-btn[data-id="\${msg.id}"]\`);
                    if(btnOk) { btnOk.innerText = 'Installed'; btnOk.style.background = 'var(--vscode-testing-iconPassed)'; }
                    break;
                case 'installError':
                    const btnErr = document.querySelector(\`.install-btn[data-id="\${msg.id}"]\`);
                    if(btnErr) { btnErr.innerText = 'Failed'; btnErr.disabled = false; btnErr.style.background = 'var(--vscode-testing-iconFailed)'; }
                    break;
            }
        });
    </script>
</body>
</html>`;
}
