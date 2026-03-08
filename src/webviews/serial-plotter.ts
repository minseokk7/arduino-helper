/**
 * serial-plotter.ts — 시리얼 플로터 (Serial Plotter) Webview
 *
 * 아두이노에서 전송되는 쉼표로 구분된 숫자 데이터(CSV 형태)를
 * Chart.js를 사용해 실시간 그래프로 그려주는 패널입니다.
 */
import * as vscode from 'vscode';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

export function openSerialPlotter(context: vscode.ExtensionContext): void {
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
        return;
    }

    currentPanel = vscode.window.createWebviewPanel(
        'arduinoSerialPlotter',
        vscode.l10n.t('Arduino Serial Plotter 📈'),
        vscode.ViewColumn.Beside,
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

    currentPanel.webview.onDidReceiveMessage(
        async (message) => {
            switch (message.command) {
                case 'exportCsv':
                    const uri = await vscode.window.showSaveDialog({
                        saveLabel: vscode.l10n.t('Export CSV'),
                        filters: {
                            'CSV Files': ['csv'],
                            'All Files': ['*']
                        },
                        defaultUri: vscode.Uri.file('arduino_plotter_data.csv')
                    });

                    if (uri) {
                        try {
                            await vscode.workspace.fs.writeFile(uri, Buffer.from(message.data, 'utf8'));
                            vscode.window.showInformationMessage(vscode.l10n.t('Plotter data exported successfully!'));
                        } catch (e) {
                            vscode.window.showErrorMessage(vscode.l10n.t('Failed to export plotter data.'));
                        }
                    }
                    return;
            }
        },
        undefined,
        context.subscriptions
    );

    currentPanel.webview.html = getWebviewContent();
}

/**
 * 시리얼 모니터에서 수신한 데이터를 플로터로 보냅니다.
 * data는 개행문자가 포함된 문자열 청크입니다.
 */
export function sendDataToPlotter(data: string): void {
    if (currentPanel) {
        currentPanel.webview.postMessage({ type: 'serialData', text: data });
    }
}

/**
 * Chart.js를 사용한 플로터 HTML 반환 (CDN 사용)
 */
function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Serial Plotter</title>
    <!-- Chart.js 라이브러리 (v3) -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    <style>
        body { margin: 0; padding: 10px; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: sans-serif; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
        .controls { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        .chart-container { flex-grow: 1; position: relative; width: 100%; min-height: 0; }
        canvas { display: block; width: 100% !important; height: 100% !important; }
    </style>
</head>
<body>
    <div class="controls">
        <button id="pauseBtn">Pause</button>
        <button id="clearBtn">Clear</button>
        <button id="exportBtn">Export CSV</button>
        <label><input type="checkbox" id="autoScale" checked> Auto Scale Y</label>
        <span style="margin-left:auto; font-size:12px; opacity:0.7;">Send comma-separated numbers (e.g., 10,20,-5) per line</span>
    </div>
    <div class="chart-container">
        <canvas id="plotCanvas"></canvas>
    </div>

    <script>
        const ctx = document.getElementById('plotCanvas').getContext('2d');
        const vscode = acquireVsCodeApi();
        
        // 차트 최대 표시 데이터 개수 제한
        const MAX_DATA_POINTS = 500;
        let isPaused = false;
        let dataBuffer = '';

        // 초기 차트 설정
        const plotChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // 실시간 처리를 위해 애니메이션 끄기
                elements: {
                    line: { tension: 0.1, borderWidth: 2 },
                    point: { radius: 0 } // 점 안그리기 (가벼움을 위해)
                },
                scales: {
                    x: { display: false }, // X축 안 보이기 (시간흐름)
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(128, 128, 128, 0.2)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'rgb(180, 180, 180)', boxWidth: 12 }
                    }
                }
            }
        });

        // 아름다운 색상 팔레트
        const colors = [
            '#00BFFF', '#FF6347', '#32CD32', '#FFD700', '#FF69B4', '#8A2BE2'
        ];

        document.getElementById('pauseBtn').addEventListener('click', (e) => {
            isPaused = !isPaused;
            e.target.innerText = isPaused ? 'Resume' : 'Pause';
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            plotChart.data.labels = [];
            plotChart.data.datasets = [];
            plotChart.update();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            if (plotChart.data.datasets.length === 0 || plotChart.data.datasets[0].data.length === 0) {
                return;
            }
            
            let csvContent = "Time";
            for (let i = 0; i < plotChart.data.datasets.length; i++) {
                csvContent += "," + plotChart.data.datasets[i].label;
            }
            csvContent += "\\n";

            const dataLength = plotChart.data.datasets[0].data.length;
            for (let i = 0; i < dataLength; i++) {
                csvContent += i;
                for (let j = 0; j < plotChart.data.datasets.length; j++) {
                    csvContent += "," + plotChart.data.datasets[j].data[i];
                }
                csvContent += "\\n";
            }

            vscode.postMessage({ command: 'exportCsv', data: csvContent });
        });

        const yAxis = plotChart.options.scales.y;
        document.getElementById('autoScale').addEventListener('change', (e) => {
            if (!e.target.checked) {
                yAxis.min = plotChart.scales.y.min;
                yAxis.max = plotChart.scales.y.max;
            } else {
                delete yAxis.min;
                delete yAxis.max;
            }
            plotChart.update();
        });

        // 줄 단위 파싱 및 차트 적용
        function processLine(line) {
            line = line.trim();
            if(!line) return;

            // 쉼표 또는 탭 기준 분리
            const parts = line.split(/[,\\t]/);
            const values = [];
            
            for(let p of parts) {
                const num = parseFloat(p.trim());
                if (!isNaN(num)) {
                    values.push(num);
                }
            }

            if (values.length === 0) return; // 숫자가 없으면 무시

            // 라벨(X축 데이터, 단순 인덱스) 추가
            plotChart.data.labels.push('');
            if (plotChart.data.labels.length > MAX_DATA_POINTS) {
                plotChart.data.labels.shift();
            }

            // 데이터셋 갯수 맞추기 (채널이 동적일 수 있음)
            while (plotChart.data.datasets.length < values.length) {
                const idx = plotChart.data.datasets.length;
                plotChart.data.datasets.push({
                    label: 'Variable ' + (idx + 1),
                    data: [],
                    borderColor: colors[idx % colors.length],
                    backgroundColor: colors[idx % colors.length],
                    fill: false,
                });
            }

            // 각 데이터셋에 값 삽입
            for (let i = 0; i < values.length; i++) {
                plotChart.data.datasets[i].data.push(values[i]);
                if (plotChart.data.datasets[i].data.length > MAX_DATA_POINTS) {
                    plotChart.data.datasets[i].data.shift();
                }
            }

            plotChart.update();
        }

        // VS Code에서 오는 메시지 리스너
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.type === 'serialData' && !isPaused) {
                dataBuffer += message.text;
                
                // 개행 문자를 기준으로 줄 단위 데이터 파싱
                let newlinesPos;
                while ((newlinesPos = dataBuffer.indexOf('\\n')) >= 0) {
                    const line = dataBuffer.substring(0, newlinesPos);
                    dataBuffer = dataBuffer.substring(newlinesPos + 1);
                    processLine(line);
                }
            }
        });
    </script>
</body>
</html>`;
}
