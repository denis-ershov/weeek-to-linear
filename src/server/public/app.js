/**
 * WEEEK → Linear Migration Tool Web UI Client Script
 * Реактивное управление шагами, REST API и Server-Sent Events (SSE).
 */

(() => {
  // Global State
  const state = {
    currentStep: 1,
    weeekToken: '',
    linearToken: '',
    weeekUser: null,
    linearViewer: null,
    projects: [],
    selectedProjectIds: new Set(),
    linearTeams: [],
    selectedTeamKey: '',
    workflowStates: [],
    isMigrationRunning: false,
    sseSource: null,
    counters: {
      projects: 0,
      tasks: 0,
      labels: 0,
      warnings: 0,
      errors: 0,
    },
    latestReport: null,
  };

  // DOM Elements
  const navSteps = document.querySelectorAll('.step-item');
  const panels = document.querySelectorAll('.step-panel');
  const alertBanner = document.getElementById('alert-banner');
  const alertText = document.getElementById('alert-text');
  const btnAlertClose = document.getElementById('btn-alert-close');

  // Step 1 Elements
  const inputWeeekToken = document.getElementById('input-weeek-token');
  const inputLinearToken = document.getElementById('input-linear-token');
  const btnTestAuth = document.getElementById('btn-test-auth');
  const btnStep1Next = document.getElementById('btn-step1-next');
  const statusWeeek = document.getElementById('status-weeek');
  const statusLinear = document.getElementById('status-linear');
  const weeekUserInfo = document.getElementById('weeek-user-info');
  const linearUserInfo = document.getElementById('linear-user-info');

  // Step 2 Elements
  const selectLinearTeam = document.getElementById('select-linear-team');
  const projectsListContainer = document.getElementById('projects-list-container');
  const inputProjectSearch = document.getElementById('input-project-search');
  const btnSelectAllProjects = document.getElementById('btn-select-all-projects');
  const btnDeselectAllProjects = document.getElementById('btn-deselect-all-projects');
  const btnStep2Next = document.getElementById('btn-step2-next');

  // Step 3 Elements
  const optDryRun = document.getElementById('opt-dry-run');
  const optCompleted = document.getElementById('opt-completed');
  const optResume = document.getElementById('opt-resume');
  const selectUnmatchedUser = document.getElementById('select-unmatched-user');
  const btnStartMigration = document.getElementById('btn-start-migration');
  const btnStartText = document.getElementById('btn-start-text');

  // Step 4 Elements
  const liveStageBadge = document.getElementById('live-stage-badge');
  const liveStageName = document.getElementById('live-stage-name');
  const liveProgressPct = document.getElementById('live-progress-pct');
  const liveProgressBar = document.getElementById('live-progress-bar');
  const liveCurrentItem = document.getElementById('live-current-item');
  const liveConsoleLogs = document.getElementById('live-console-logs');
  const chkAutoScroll = document.getElementById('chk-auto-scroll');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const btnStopMigration = document.getElementById('btn-stop-migration');
  const btnStep4Next = document.getElementById('btn-step4-next');

  const cntProjects = document.getElementById('cnt-projects');
  const cntTasks = document.getElementById('cnt-tasks');
  const cntLabels = document.getElementById('cnt-labels');
  const cntWarnings = document.getElementById('cnt-warnings');
  const cntErrors = document.getElementById('cnt-errors');

  // Step 5 Elements
  const reportMetaInfo = document.getElementById('report-meta-info');
  const reportCounters = document.getElementById('report-counters');
  const reportMappingContainer = document.getElementById('report-mapping-container');
  const inputMappingSearch = document.getElementById('input-mapping-search');
  const btnDownloadMd = document.getElementById('btn-download-md');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnRestartMigration = document.getElementById('btn-restart-migration');

  // Utility: Show Alert
  function showAlert(message, type = 'error') {
    alertBanner.className = `alert alert-${type}`;
    alertText.textContent = message;
    alertBanner.classList.remove('hidden');
  }

  function hideAlert() {
    alertBanner.classList.add('hidden');
  }

  btnAlertClose.addEventListener('click', hideAlert);

  // Stepper Navigation
  function goToStep(step) {
    if (step < 1 || step > 5) return;
    state.currentStep = step;

    navSteps.forEach(item => {
      const s = parseInt(item.getAttribute('data-step'), 10);
      item.classList.remove('active', 'completed');
      if (s === step) {
        item.classList.add('active');
      } else if (s < step) {
        item.classList.add('completed');
      }
    });

    panels.forEach(p => p.classList.remove('active'));
    const activePanel = document.getElementById(`panel-step-${step}`);
    if (activePanel) activePanel.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.btn-prev-step').forEach(btn => {
    btn.addEventListener('click', () => goToStep(state.currentStep - 1));
  });

  // Step 1: Initial Load & Test Auth
  async function initApp() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.hasEnvTokens.weeek || data.hasEnvTokens.linear) {
        // Пробуем авто-тест, если токены есть в .env
        testAuthentication();
      }
    } catch {
      showAlert('Не удалось связаться с локальным сервером', 'error');
    }
  }

  async function testAuthentication() {
    hideAlert();
    const weeekToken = inputWeeekToken.value.trim();
    const linearToken = inputLinearToken.value.trim();

    btnTestAuth.disabled = true;
    btnTestAuth.querySelector('.btn-spinner')?.classList.remove('hidden');
    statusWeeek.textContent = 'Проверка...';
    statusLinear.textContent = 'Проверка...';

    try {
      const res = await fetch('/api/auth/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeekToken, linearToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка проверки авторизации');
      }

      state.weeekUser = data.weeekUser;
      state.linearViewer = data.linearViewer;
      state.weeekToken = weeekToken;
      state.linearToken = linearToken;

      // Update UI
      statusWeeek.className = 'status-indicator ok';
      statusWeeek.textContent = '✓ Подключено';
      document.getElementById('weeek-user-name').textContent = data.weeekUser.name;
      document.getElementById('weeek-user-email').textContent = data.weeekUser.email;
      weeekUserInfo.classList.remove('hidden');

      statusLinear.className = 'status-indicator ok';
      statusLinear.textContent = '✓ Подключено';
      document.getElementById('linear-user-name').textContent = data.linearViewer.name;
      document.getElementById('linear-user-org').textContent = data.linearViewer.organizationName || data.linearViewer.email;
      linearUserInfo.classList.remove('hidden');

      btnStep1Next.disabled = false;
      showAlert('Подключение к WEEEK и Linear успешно установлено!', 'success');
    } catch (err) {
      statusWeeek.className = 'status-indicator fail';
      statusWeeek.textContent = '✗ Ошибка';
      statusLinear.className = 'status-indicator fail';
      statusLinear.textContent = '✗ Ошибка';
      showAlert(err.message, 'error');
    } finally {
      btnTestAuth.disabled = false;
      btnTestAuth.querySelector('.btn-spinner')?.classList.add('hidden');
    }
  }

  btnTestAuth.addEventListener('click', testAuthentication);

  btnStep1Next.addEventListener('click', async () => {
    goToStep(2);
    await loadDiscoveryData();
  });

  // Step 2: Discovery & Selection
  async function loadDiscoveryData() {
    projectsListContainer.innerHTML = `
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    `;

    try {
      const [projectsRes, teamsRes] = await Promise.all([
        fetch(`/api/weeek/projects?token=${encodeURIComponent(state.weeekToken)}`),
        fetch(`/api/linear/teams?token=${encodeURIComponent(state.linearToken)}`),
      ]);

      const projectsData = await projectsRes.json();
      const teamsData = await teamsRes.json();

      if (!projectsRes.ok) throw new Error(projectsData.error || 'Ошибка загрузки проектов');
      if (!teamsRes.ok) throw new Error(teamsData.error || 'Ошибка загрузки команд Linear');

      state.projects = projectsData.projects || [];
      state.linearTeams = teamsData.teams || [];

      // Render Teams Selector
      selectLinearTeam.innerHTML = '';
      state.linearTeams.forEach((team, idx) => {
        const opt = document.createElement('option');
        opt.value = team.key;
        opt.textContent = `${team.name} [${team.key}]`;
        if (idx === 0) {
          opt.selected = true;
          state.selectedTeamKey = team.key;
        }
        selectLinearTeam.appendChild(opt);
      });

      // Default select all projects
      state.selectedProjectIds = new Set(state.projects.map(p => p.id));
      renderProjectsList();
      updateStep2NextButton();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  function renderProjectsList() {
    const query = inputProjectSearch.value.trim().toLowerCase();
    const filtered = state.projects.filter(
      p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query)),
    );

    if (filtered.length === 0) {
      projectsListContainer.innerHTML = `<div class="empty-state"><p>Проекты не найдены</p></div>`;
      return;
    }

    projectsListContainer.innerHTML = '';
    filtered.forEach(project => {
      const isSelected = state.selectedProjectIds.has(project.id);
      const card = document.createElement('div');
      card.className = `project-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="project-card-top">
          <span class="project-title">${escapeHtml(project.name)}</span>
          <span class="badge badge-version">ID: ${project.id}</span>
        </div>
        <p class="project-desc">${escapeHtml(project.description || 'Без описания')}</p>
        <div class="project-meta">
          <span>${isSelected ? '✓ Выбран' : 'Нажмите для выбора'}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (state.selectedProjectIds.has(project.id)) {
          state.selectedProjectIds.delete(project.id);
        } else {
          state.selectedProjectIds.add(project.id);
        }
        renderProjectsList();
        updateStep2NextButton();
      });

      projectsListContainer.appendChild(card);
    });
  }

  function updateStep2NextButton() {
    btnStep2Next.disabled = state.selectedProjectIds.size === 0 || !selectLinearTeam.value;
  }

  inputProjectSearch.addEventListener('input', renderProjectsList);
  selectLinearTeam.addEventListener('change', () => {
    state.selectedTeamKey = selectLinearTeam.value;
    updateStep2NextButton();
  });

  btnSelectAllProjects.addEventListener('click', () => {
    state.selectedProjectIds = new Set(state.projects.map(p => p.id));
    renderProjectsList();
    updateStep2NextButton();
  });

  btnDeselectAllProjects.addEventListener('click', () => {
    state.selectedProjectIds.clear();
    renderProjectsList();
    updateStep2NextButton();
  });

  btnStep2Next.addEventListener('click', () => {
    goToStep(3);
    updateDryRunButtonText();
  });

  // Step 3: Mapping & Options
  function updateDryRunButtonText() {
    if (optDryRun.checked) {
      btnStartText.textContent = 'Запустить Dry Run (Симуляция)';
      btnStartMigration.className = 'btn btn-secondary';
    } else {
      btnStartText.textContent = 'Начать реальную миграцию';
      btnStartMigration.className = 'btn btn-success';
    }
  }

  optDryRun.addEventListener('change', updateDryRunButtonText);

  btnStartMigration.addEventListener('click', async () => {
    goToStep(4);
    startMigration();
  });

  // Step 4: Migration Execution & SSE Stream
  function appendLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString('ru-RU');
    const logLine = document.createElement('div');
    logLine.className = `log-line log-${type}`;
    logLine.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-text">${escapeHtml(message)}</span>
    `;
    liveConsoleLogs.appendChild(logLine);

    if (chkAutoScroll.checked) {
      liveConsoleLogs.scrollTop = liveConsoleLogs.scrollHeight;
    }
  }

  btnClearLogs.addEventListener('click', () => {
    liveConsoleLogs.innerHTML = '';
  });

  async function startMigration() {
    state.isMigrationRunning = true;
    state.counters = { projects: 0, tasks: 0, labels: 0, warnings: 0, errors: 0 };
    updateCounters();

    btnStopMigration.disabled = false;
    btnStep4Next.classList.add('hidden');
    liveProgressBar.style.width = '0%';
    liveProgressPct.textContent = '0%';
    liveStageBadge.textContent = 'Стадия 1';
    liveStageName.textContent = 'Инициализация миграции...';
    appendLog('Запуск миграционного конвейера...', 'stage');

    // Connect SSE
    if (state.sseSource) {
      state.sseSource.close();
    }

    state.sseSource = new EventSource('/api/migrate/stream');
    state.sseSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        handleSseEvent(data);
      } catch (err) {
        console.error('SSE parse error', err);
      }
    };

    const payload = {
      weeekToken: state.weeekToken,
      linearToken: state.linearToken,
      linearTeamKey: state.selectedTeamKey,
      dryRun: optDryRun.checked,
      resume: optResume.checked,
      includeCompleted: optCompleted.checked,
      unmatchedUserStrategy: selectUnmatchedUser.value,
      weeekProjectId: state.selectedProjectIds.size === 1 ? Array.from(state.selectedProjectIds)[0] : undefined,
    };

    try {
      const res = await fetch('/api/migrate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка запуска миграции');
      }
    } catch (err) {
      appendLog(`Ошибка старта: ${err.message}`, 'error');
      state.isMigrationRunning = false;
      btnStopMigration.disabled = true;
    }
  }

  function handleSseEvent(data) {
    if (data.type === 'stage') {
      liveStageBadge.textContent = `Стадия ${data.stageNumber || 1}`;
      liveStageName.textContent = data.stageName;
      appendLog(`[СТАДИЯ ${data.stageNumber || 1}] ${data.stageName}`, 'stage');
    } else if (data.type === 'progress') {
      const current = data.current || 0;
      const total = data.total || 1;
      const pct = Math.round((current / total) * 100);
      liveProgressBar.style.width = `${pct}%`;
      liveProgressPct.textContent = `${pct}%`;
      liveCurrentItem.textContent = data.itemName || 'Обработка...';

      if (data.progressType === 'projects') state.counters.projects = current;
      if (data.progressType === 'tasks') state.counters.tasks = current;
      if (data.progressType === 'labels') state.counters.labels = current;
      updateCounters();
    } else if (data.type === 'warning') {
      state.counters.warnings++;
      updateCounters();
      appendLog(`⚠ ${data.message}`, 'warn');
    } else if (data.type === 'error') {
      state.counters.errors++;
      updateCounters();
      const msg = data.error ? `[${data.error.entityType}] ${data.error.message}` : data.message;
      appendLog(`✗ ${msg}`, 'error');
    } else if (data.type === 'done') {
      state.isMigrationRunning = false;
      btnStopMigration.disabled = true;
      btnStep4Next.classList.remove('hidden');
      liveProgressBar.style.width = '100%';
      liveProgressPct.textContent = '100%';
      liveStageName.textContent = 'Миграция успешно завершена!';
      appendLog('✓ Миграция завершена. Итоговые отчеты сформированы.', 'stage');
      state.latestReport = data.summary;
      if (state.sseSource) state.sseSource.close();
    } else if (data.type === 'aborted') {
      state.isMigrationRunning = false;
      btnStopMigration.disabled = true;
      liveStageName.textContent = 'Процесс остановлен пользователем';
      appendLog('Миграция прервана.', 'warn');
      if (state.sseSource) state.sseSource.close();
    }
  }

  function updateCounters() {
    cntProjects.textContent = state.counters.projects;
    cntTasks.textContent = state.counters.tasks;
    cntLabels.textContent = state.counters.labels;
    cntWarnings.textContent = state.counters.warnings;
    cntErrors.textContent = state.counters.errors;
  }

  btnStopMigration.addEventListener('click', async () => {
    if (!confirm('Вы уверены, что хотите остановить миграцию?')) return;
    try {
      await fetch('/api/migrate/stop', { method: 'POST' });
    } catch {
      // Игнорируем
    }
  });

  btnStep4Next.addEventListener('click', async () => {
    goToStep(5);
    await loadReport();
  });

  // Step 5: Report View
  async function loadReport() {
    try {
      const res = await fetch('/api/reports/latest');
      const data = await res.json();
      if (!data.hasReport) return;

      const summary = data.json?.summary || state.latestReport;
      const mapping = data.json?.mapping;

      if (summary) {
        reportMetaInfo.innerHTML = `
          <div class="meta-row">
            <span><strong>Дата запуска:</strong> ${new Date(summary.startedAt).toLocaleString('ru-RU')}</span>
            <span><strong>Длительность:</strong> ${summary.durationSeconds.toFixed(1)} сек.</span>
          </div>
        `;

        reportCounters.innerHTML = `
          <div class="counter-card">
            <span class="counter-num counter-primary">${summary.projects.created}</span>
            <span class="counter-label">Создано проектов</span>
          </div>
          <div class="counter-card">
            <span class="counter-num counter-success">${summary.tasks.created}</span>
            <span class="counter-label">Создано задач</span>
          </div>
          <div class="counter-card">
            <span class="counter-num counter-purple">${summary.labels.created}</span>
            <span class="counter-label">Создано меток</span>
          </div>
          <div class="counter-card">
            <span class="counter-num counter-warning">${summary.tasks.skipped}</span>
            <span class="counter-label">Пропущено задач</span>
          </div>
          <div class="counter-card">
            <span class="counter-num counter-error">${summary.errors.length}</span>
            <span class="counter-label">Ошибок</span>
          </div>
        `;
      }

      if (mapping && mapping.tasks) {
        renderMappingTable(mapping.tasks);
      }
    } catch (err) {
      console.error('Ошибка загрузки отчета', err);
    }
  }

  function renderMappingTable(tasksMap) {
    const query = inputMappingSearch.value.trim().toLowerCase();
    const entries = Object.entries(tasksMap).filter(
      ([wId, t]) => wId.includes(query) || (t.title && t.title.toLowerCase().includes(query)) || (t.linearIssueKey && t.linearIssueKey.toLowerCase().includes(query)),
    );

    if (entries.length === 0) {
      reportMappingContainer.innerHTML = '<p class="text-secondary" style="padding: 16px;">Записи не найдены</p>';
      return;
    }

    let html = `
      <table class="mapping-table">
        <thead>
          <tr>
            <th>WEEEK ID</th>
            <th>Linear Key / ID</th>
            <th>Название задачи</th>
          </tr>
        </thead>
        <tbody>
    `;

    entries.slice(0, 100).forEach(([wId, t]) => {
      html += `
        <tr>
          <td><code>${escapeHtml(wId)}</code></td>
          <td><span class="badge badge-linear">${escapeHtml(t.linearIssueKey || t.linearIssueId)}</span></td>
          <td>${escapeHtml(t.title)}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    reportMappingContainer.innerHTML = html;
  }

  inputMappingSearch.addEventListener('input', () => {
    loadReport();
  });

  btnDownloadMd.addEventListener('click', async () => {
    const res = await fetch('/api/reports/latest');
    const data = await res.json();
    if (data.markdown) {
      downloadFile(data.markdown, 'migration-report.md', 'text/markdown');
    }
  });

  btnDownloadJson.addEventListener('click', async () => {
    const res = await fetch('/api/reports/latest');
    const data = await res.json();
    if (data.json) {
      downloadFile(JSON.stringify(data.json, null, 2), 'migration-report.json', 'application/json');
    }
  });

  btnRestartMigration.addEventListener('click', () => {
    goToStep(1);
  });

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize App on DOM Load
  initApp();
})();
