/**
 * WEEEK → Linear Migration Tool Web UI Client Script
 * Реактивное управление шагами, REST API и Server-Sent Events (SSE).
 */

(() => {
  // Инициализация локализации (i18n.js должен быть подключён раньше app.js)
  if (window.i18n) window.i18n.initLocale();

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
    selectedTeamId: '',
    workflowStates: [],
    linearUsers: [],
    weeekUsers: [],
    boardColumns: [],
    boardColumnMapping: {}, // weeekColId -> linearStateId
    userMapping: {}, // weeekUserId -> linearUserId | 'unassigned' | 'skip'
    isMigrationRunning: false,
    sseSource: null,
    counters: {
      projects: 0,
      tasks: 0,
      labels: 0,
      docs: 0,
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
  const boardColumnsMappingContainer = document.getElementById('board-columns-mapping-container');
  const usersMappingContainer = document.getElementById('users-mapping-container');
  const selectWatcherStrategy = document.getElementById('select-watcher-strategy');
  const groupGlobalWatcher = document.getElementById('group-global-watcher');
  const selectGlobalWatcher = document.getElementById('select-global-watcher');
  const optDryRun = document.getElementById('opt-dry-run');
  const optCreateMissingStates = document.getElementById('opt-create-missing-states');
  const optRenameMatchedStates = document.getElementById('opt-rename-matched-states');
  const optRecreateColumns = document.getElementById('opt-recreate-columns');
  const optDocuments = document.getElementById('opt-documents');
  const optCompleted = document.getElementById('opt-completed');
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
  const cntDocs = document.getElementById('cnt-docs');
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
        opt.dataset.teamId = team.id;
        opt.textContent = `${team.name} [${team.key}]`;
        if (idx === 0) {
          opt.selected = true;
          state.selectedTeamKey = team.key;
          state.selectedTeamId = team.id;
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
    const selectedOpt = selectLinearTeam.selectedOptions[0];
    state.selectedTeamId = selectedOpt?.dataset?.teamId || '';
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

  btnStep2Next.addEventListener('click', async () => {
    goToStep(3);
    updateDryRunButtonText();
    await loadMappingData();
  });

  // Step 3: Load & Render Mapping Data
  async function loadMappingData() {
    boardColumnsMappingContainer.innerHTML = `
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    `;
    usersMappingContainer.innerHTML = `
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    `;

    try {
      const selectedProjectIds = Array.from(state.selectedProjectIds).join(',');
      const [colsRes, statesRes, wUsersRes, lUsersRes] = await Promise.all([
        fetch(`/api/weeek/board-columns?token=${encodeURIComponent(state.weeekToken)}${selectedProjectIds ? `&projectIds=${encodeURIComponent(selectedProjectIds)}` : ''}`),
        fetch(`/api/linear/states?token=${encodeURIComponent(state.linearToken)}&teamId=${state.selectedTeamId || state.selectedTeamKey}`),
        fetch(`/api/weeek/users?token=${encodeURIComponent(state.weeekToken)}`),
        fetch(`/api/linear/users?token=${encodeURIComponent(state.linearToken)}`),
      ]);

      const [colsData, statesData, wUsersData, lUsersData] = await Promise.all([
        colsRes.json(),
        statesRes.json(),
        wUsersRes.json(),
        lUsersRes.json(),
      ]);

      state.boardColumns = colsData.columns || [];
      state.workflowStates = statesData.states || [];
      state.weeekUsers = wUsersData.users || [];
      state.linearUsers = lUsersData.users || [];

      renderBoardColumnsMapping();
      renderUsersMapping();
      renderGlobalWatcherSelector();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  // Heuristic auto-match for columns
  function guessLinearStateId(colName, states) {
    if (!states || states.length === 0) return '';
    const lower = colName.toLowerCase().trim();

    if (lower.includes('закрыт') || lower.includes('done') || lower.includes('завершен') || lower.includes('готов')) {
      const s = states.find(st => st.type.toLowerCase() === 'completed');
      if (s) return s.id;
    }
    if (lower.includes('архив') || lower.includes('отмен') || lower.includes('cancel')) {
      const s = states.find(st => st.type.toLowerCase() === 'canceled') || states.find(st => st.type.toLowerCase() === 'completed');
      if (s) return s.id;
    }
    if (lower.includes('тест') || lower.includes('qa') || lower.includes('ревью') || lower.includes('review')) {
      const s = states.find(st => st.name.toLowerCase().includes('review') || st.name.toLowerCase().includes('qa')) || states.find(st => st.type.toLowerCase() === 'started');
      if (s) return s.id;
    }
    if (lower.includes('в работ') || lower.includes('в процесс') || lower.includes('доработ') || lower.includes('in progress') || lower.includes('doing')) {
      const s = states.find(st => st.type.toLowerCase() === 'started');
      if (s) return s.id;
    }
    if (lower.includes('план') || lower.includes('запланирован') || lower.includes('todo') || lower.includes('не начато')) {
      const s = states.find(st => st.type.toLowerCase() === 'unstarted') || states.find(st => st.type.toLowerCase() === 'backlog');
      if (s) return s.id;
    }
    if (lower.includes('важн') || lower.includes('бэклог') || lower.includes('backlog')) {
      const s = states.find(st => st.type.toLowerCase() === 'backlog') || states.find(st => st.type.toLowerCase() === 'unstarted');
      if (s) return s.id;
    }

    return states[0]?.id || '';
  }

  function renderBoardColumnsMapping() {
    boardColumnsMappingContainer.innerHTML = '';

    if (!state.boardColumns || state.boardColumns.length === 0) {
      boardColumnsMappingContainer.innerHTML = `
        <div class="empty-state-box">
          <p class="text-secondary">Колонки канбан-доски в WEEEK не найдены или доска пуста. Задачи будут распределены по стандартным статусам Linear.</p>
        </div>
      `;
      return;
    }
    const autoCreate = optCreateMissingStates ? optCreateMissingStates.checked : true;

    state.boardColumns.forEach(col => {
      const item = document.createElement('div');
      item.className = 'mapping-item-card';

      const exactMatch = state.workflowStates.find(
        st => st.name.toLowerCase() === col.name.trim().toLowerCase(),
      );
      const guessedStateId = guessLinearStateId(col.name, state.workflowStates);

      // Если нет точного совпадения и включено автосоздание — предлагаем создать
      let initialVal = state.boardColumnMapping[col.id];
      if (!initialVal) {
        if (exactMatch) {
          initialVal = exactMatch.id;
        } else if (autoCreate) {
          initialVal = '__create_new__';
        } else {
          initialVal = guessedStateId;
        }
      }

      state.boardColumnMapping[col.id] = initialVal;

      let selectOptions = `<option value="__create_new__" ${initialVal === '__create_new__' ? 'selected' : ''}>➕ Создать в Linear: "${escapeHtml(col.name)}"</option>`;
      state.workflowStates.forEach(st => {
        const selected = st.id === initialVal ? 'selected' : '';
        selectOptions += `<option value="${st.id}" ${selected}>${escapeHtml(st.name)} (${st.type})</option>`;
      });

      item.innerHTML = `
        <div class="mapping-from">
          <span>${escapeHtml(col.name)}</span>
        </div>
        <span class="mapping-arrow">→</span>
        <div class="mapping-select-wrapper">
          <select class="custom-select col-select" data-col-id="${col.id}">
            ${selectOptions}
          </select>
        </div>
      `;

      item.querySelector('.col-select').addEventListener('change', (e) => {
        state.boardColumnMapping[col.id] = e.target.value;
      });

      boardColumnsMappingContainer.appendChild(item);
    });
  }

  optCreateMissingStates?.addEventListener('change', () => {
    // Сбрасываем маппинг колонок и перерендериваем
    state.boardColumnMapping = {};
    renderBoardColumnsMapping();
  });

  function renderUsersMapping() {
    if (state.weeekUsers.length === 0 && state.weeekUser) {
      state.weeekUsers = [state.weeekUser];
    }

    if (state.weeekUsers.length === 0) {
      usersMappingContainer.innerHTML = `<p class="text-secondary" style="padding: 8px 0;">Пользователи WEEEK не найдены</p>`;
      return;
    }

    usersMappingContainer.innerHTML = '';
    state.weeekUsers.forEach(wUser => {
      const item = document.createElement('div');
      item.className = 'user-mapping-item';

      // Auto-match by email
      const matchedLinearUser = state.linearUsers.find(
        lu => lu.email && wUser.email && lu.email.toLowerCase() === wUser.email.toLowerCase(),
      );

      const initialVal = matchedLinearUser ? matchedLinearUser.id : 'unassigned';
      state.userMapping[wUser.id] = initialVal;

      let userOptions = `
        <option value="unassigned" ${initialVal === 'unassigned' ? 'selected' : ''}>Без исполнителя (Unassigned)</option>
        <option value="skip">Пропускать задачи этого автора</option>
      `;

      state.linearUsers.forEach(lu => {
        const isSel = lu.id === initialVal ? 'selected' : '';
        userOptions += `<option value="${lu.id}" ${isSel}>${escapeHtml(lu.name)} (${escapeHtml(lu.email)})</option>`;
      });

      item.innerHTML = `
        <div class="user-info-left">
          <div class="user-avatar-mini">${(wUser.name || 'W').charAt(0).toUpperCase()}</div>
          <div>
            <strong>${escapeHtml(wUser.name || 'Пользователь')}</strong>
            <div class="text-secondary" style="font-size: 11px;">${escapeHtml(wUser.email || 'Без email')}</div>
          </div>
        </div>
        <span class="mapping-arrow">→</span>
        <div class="mapping-select-wrapper">
          <select class="custom-select user-select" data-user-id="${wUser.id}">
            ${userOptions}
          </select>
        </div>
      `;

      item.querySelector('.user-select').addEventListener('change', (e) => {
        state.userMapping[wUser.id] = e.target.value;
      });

      usersMappingContainer.appendChild(item);
    });
  }

  function renderGlobalWatcherSelector() {
    selectGlobalWatcher.innerHTML = '<option value="">Выберите сотрудника Linear...</option>';
    state.linearUsers.forEach(lu => {
      const opt = document.createElement('option');
      opt.value = lu.id;
      opt.textContent = `${lu.name} (${lu.email})`;
      selectGlobalWatcher.appendChild(opt);
    });
  }

  selectWatcherStrategy.addEventListener('change', () => {
    const strat = selectWatcherStrategy.value;
    if (strat === 'global_watcher' || strat === 'both') {
      groupGlobalWatcher.classList.remove('hidden');
    } else {
      groupGlobalWatcher.classList.add('hidden');
    }
  });

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
    state.counters = { projects: 0, tasks: 0, labels: 0, docs: 0, warnings: 0, errors: 0 };
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

    const selectedSyncStrategy = document.querySelector('input[name="syncStrategy"]:checked')?.value || 'skip';

    const payload = {
      weeekToken: state.weeekToken,
      linearToken: state.linearToken,
      linearTeamKey: state.selectedTeamKey,
      dryRun: optDryRun.checked,
      includeCompleted: optCompleted.checked,
      includeDocuments: optDocuments.checked,
      createMissingStates: optCreateMissingStates ? optCreateMissingStates.checked : true,
      renameMatchedStates: optRenameMatchedStates ? optRenameMatchedStates.checked : false,
      recreateAllColumns: optRecreateColumns ? optRecreateColumns.checked : false,
      boardColumnMapping: state.boardColumnMapping,
      userMapping: state.userMapping,
      watcherStrategy: selectWatcherStrategy.value,
      globalWatcherUserId: selectGlobalWatcher.value || undefined,
      syncStrategy: selectedSyncStrategy,
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
      if (data.progressType === 'documents') state.counters.docs = current;
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
    cntDocs.textContent = state.counters.docs;
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
            <span class="counter-num counter-primary">${summary.tasks.updated || 0}</span>
            <span class="counter-label">Обновлено задач</span>
          </div>
          <div class="counter-card">
            <span class="counter-num counter-purple">${summary.labels.created}</span>
            <span class="counter-label">Создано меток</span>
          </div>
          <div class="counter-card">
            <span class="counter-num counter-primary">${summary.documents?.created || 0}</span>
            <span class="counter-label">Создано документов</span>
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
