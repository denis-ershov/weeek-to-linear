/**
 * WEEEK → Linear Migration Tool — Web UI i18n
 * Поддержка языков: ru (по умолчанию), en
 */

(function () {
  const TRANSLATIONS = {
    ru: {
      // Шапка
      'header.about': 'О сервисе',
      'header.aboutTitle': 'О сервисе',
      'lang.switch': 'EN',

      // Навигация
      'nav.step1': 'Подключение',
      'nav.step2': 'Проекты',
      'nav.step3': 'Маппинг',
      'nav.step4': 'Миграция',
      'nav.step5': 'Отчет',
      'nav.stepsLabel': 'Этапы миграции',

      // Шаг 1
      'step1.title': 'Подключение к API',
      'step1.subtitle': 'Укажите API токены WEEEK и Linear для безопасного прямого взаимодействия.',
      'step1.weeekToken': 'API Токен WEEEK',
      'step1.weeekTokenHelp': 'WEEEK → Настройки профиля → API',
      'step1.weeekStatus': 'Ожидание проверки',
      'step1.linearToken': 'Personal API Key Linear',
      'step1.linearTokenHelp': 'Linear → Settings → Security',
      'step1.linearStatus': 'Ожидание проверки',
      'step1.btnTest': 'Проверить подключения',
      'step1.btnNext': 'Продолжить к выбору проектов',

      // Шаг 2
      'step2.title': 'Выбор проектов и целевой команды',
      'step2.subtitle': 'Выберите, какие проекты из WEEEK перенести, и укажите целевую команду Linear.',
      'step2.teamTitle': 'Целевая команда Linear',
      'step2.teamLabel': 'Команда назначения',
      'step2.teamPlaceholder': 'Загрузка команд...',
      'step2.projectsTitle': 'Проекты WEEEK',
      'step2.search': 'Поиск проектов...',
      'step2.selectAll': 'Выбрать все',
      'step2.deselectAll': 'Снять выбор',
      'step2.btnBack': 'Назад',
      'step2.btnNext': 'Перейти к настройкам маппинга',

      // Шаг 3
      'step3.title': 'Настройка сопоставления данных',
      'step3.subtitle': 'Проверьте соответствие канбан-колонок, пользователей, наблюдателей и параметры синхронизации.',
      'step3.colMappingTitle': 'Канбан-колонки WEEEK → Linear Workflow States',
      'step3.createMissingTitle': 'Создавать отсутствующие статусы в Linear',
      'step3.createMissingDesc': 'Автоматически создать Workflow State в команде Linear, если нет точного совпадения',
      'step3.renameMatchedTitle': 'Переименовать сопоставленные статусы Linear',
      'step3.renameMatchedDesc': 'Переименовать и перекрасить сопоставленные статусы Linear в точные названия и цвета из WEEEK',
      'step3.recreateTitle': 'Полная замена колонок (1-в-1 как в WEEEK)',
      'step3.recreateDesc': 'Архивировать лишние дефолтные статусы Linear и создать точную структуру колонок из WEEEK',
      'step3.colMappingHint': 'Сопоставьте каждую колонку доски WEEEK со статусом Linear или выберите создание нового:',
      'step3.userMappingTitle': 'Исполнители (User Mapping & Fallback)',
      'step3.userMappingHint': 'Укажите, кому назначать задачи, если пользователь не найден:',
      'step3.watcherTitle': 'Наблюдатели (Subscribers / Watchers)',
      'step3.watcherLabel': 'Стратегия назначения наблюдателей:',
      'step3.watcherNone': 'Не добавлять дополнительных наблюдателей',
      'step3.watcherSecondary': 'Вторичные исполнители WEEEK → Наблюдатели в Linear',
      'step3.watcherGlobal': 'Назначить конкретного сотрудника наблюдателем ко всем задачам',
      'step3.watcherBoth': 'Вторичные исполнители + Глобальный наблюдатель',
      'step3.globalWatcherLabel': 'Глобальный наблюдатель (Team Lead / PM):',
      'step3.globalWatcherPlaceholder': 'Выберите сотрудника Linear...',
      'step3.syncTitle': 'Параметры запуска и повторного переноса',
      'step3.dryRunTitle': 'Режим симуляции (Dry Run)',
      'step3.dryRunDesc': 'Выполнить расчет и валидацию без изменений в Linear',
      'step3.docsTitle': 'Переносить документы базы знаний',
      'step3.docsDesc': 'Создавать статьи в Linear Project Documents',
      'step3.docsDisabledDesc': '⚠️ Временно недоступно (в публичном API WEEEK отсутствует эндпоинт документов)',
      'step3.completedTitle': 'Переносить завершенные задачи',
      'step3.completedDesc': 'Включает задачи со статусом Completed',
      'step3.syncLabel': 'Поведение при повторном запуске:',
      'step3.syncSkip': 'Пропускать',
      'step3.syncSkipDesc': '(не менять задачи и комментарии)',
      'step3.syncUpdateAll': 'Обновлять полностью',
      'step3.syncUpdateAllDesc': '(поля задач и комментарии)',
      'step3.syncStatusOnly': 'Обновлять только статус и дедлайн',
      'step3.syncStatusOnlyDesc': '(без обновления описания)',
      'step3.commentsLabel': 'Перенос комментариев к задачам:',
      'step3.commentsDisabledDesc': '⚠️ Временно недоступно (в публичном API WEEEK отсутствует эндпоинт комментариев)',
      'step3.commentNone': 'Не переносить',
      'step3.commentNoneDesc': '(пропустить комментарии)',
      'step3.commentTextOnly': 'Текст с именем автора',
      'step3.commentTextOnlyDesc': '(без привязки профиля)',
      'step3.commentMappedAuthors': 'Сопоставлять авторов',
      'step3.commentMappedAuthorsDesc': '(привязка авторов через User Mapping)',
      'step3.customFieldsLabel': 'Кастомные поля задач (WEEEK):',
      'step3.customFieldsAppend': 'Добавлять в описание Markdown',
      'step3.customFieldsAppendDesc': '(структурированный блок в конце задачи)',
      'step3.customFieldsNone': 'Не переносить',
      'step3.customFieldsNoneDesc': '(пропускать кастомные поля)',
      'step3.ignoredCustomFieldsPlaceholder': 'Игнорируемые поля через запятую (например: Бюджет, Секретно)',
      'step3.btnBack': 'Назад',
      'step3.btnStart': 'Запустить Dry Run',

      // Шаг 4
      'step4.title': 'Выполнение миграции',
      'step4.subtitle': 'Следите за прогрессом переноса данных в реальном времени.',
      'step4.preparing': 'Подготовка к запуску...',
      'step4.processing': 'Обработка:',
      'step4.cntProjects': 'Проекты',
      'step4.cntTasks': 'Задачи',
      'step4.cntLabels': 'Метки',
      'step4.cntDocs': 'Документы',
      'step4.cntWarnings': 'Предупреждения',
      'step4.cntErrors': 'Ошибки',
      'step4.console': 'Живой журнал событий',
      'step4.autoScroll': 'Автоскролл',
      'step4.clearLogs': 'Очистить',
      'step4.initLog': 'Инициализация потока событий...',
      'step4.btnStop': 'Остановить миграцию',
      'step4.btnNext': 'Перейти к итоговому отчету',

      // Шаг 5
      'step5.title': 'Отчет о миграции',
      'step5.subtitle': 'Сводные результаты и карта соответствия сущностей.',
      'step5.mappingTitle': 'Карта соответствия перенесенных задач',
      'step5.searchPlaceholder': 'Поиск по ID или названию...',
      'step5.btnDownloadMd': 'Скачать Markdown отчет',
      'step5.btnDownloadJson': 'Скачать JSON отчет',
      'step5.btnRestart': 'Новая миграция',

      // Footer
      'footer.text': 'WEEEK → Linear Migration Tool • Открытый исходный код по лицензии GPL v3',
      'footer.github': 'GitHub Репозиторий',

      // About Modal
      'about.modalTitle': 'О сервисе WEEEK → Linear',
      'about.modalDesc': 'Профессиональный инструмент переноса проектов, задач, многоуровневых подзадач, документов и структуры из WEEEK в Linear.',
      'about.version': 'Версия:',
      'about.license': 'Лицензия:',

      // Alerts
      'alert.close': 'Закрыть уведомление',

      // Dynamic UI strings (app.js)
      'status.checking': 'Проверка...',
      'status.connected': '✓ Подключено',
      'status.error': '✗ Ошибка',
      'auth.success': 'Подключение к WEEEK и Linear успешно установлено!',
      'auth.tokenRequired': 'Укажите оба API токена для проверки',
      'auth.serverError': 'Не удалось связаться с локальным сервером',
      'auth.failed': 'Ошибка проверки авторизации',
      'step2.projectsError': 'Ошибка загрузки проектов',
      'step2.teamsError': 'Ошибка загрузки команд Linear',
      'step2.notFound': 'Проекты не найдены',
      'step2.noDesc': 'Без описания',
      'step2.selected': '✓ Выбран',
      'step2.clickToSelect': 'Нажмите для выбора',
      'step3.noColumns': 'Колонки канбан-доски в WEEEK не найдены или доска пуста. Задачи будут распределены по стандартным статусам Linear.',
      'step3.createStatePrefix': '➕ Создать в Linear: ',
      'step3.noUsers': 'Пользователи WEEEK не найдены',
      'step3.unassigned': 'Без исполнителя (Unassigned)',
      'step3.skipUserTasks': 'Пропускать задачи этого автора',
      'step3.selectWatcherPlaceholder': 'Выберите сотрудника Linear...',
      'step3.noEmail': 'Без email',
      'step3.defaultUserName': 'Пользователь',
      'step3.btnDryRun': 'Запустить Dry Run (Симуляция)',
      'step3.btnReal': 'Начать реальную миграцию',
      'step4.stagePrefix': 'Стадия ',
      'step4.init': 'Инициализация миграции...',
      'step4.startLog': 'Запуск миграционного конвейера...',
      'step4.startError': 'Ошибка старта: ',
      'step4.processingItem': 'Обработка...',
      'step4.finishedTitle': 'Миграция успешно завершена!',
      'step4.finishedLog': '✓ Миграция завершена. Итоговые отчеты сформированы.',
      'step4.abortedTitle': 'Процесс остановлен пользователем',
      'step4.abortedLog': 'Миграция прервана.',
      'step4.confirmStop': 'Вы уверены, что хотите остановить миграцию?',
      'step5.startDate': 'Дата запуска:',
      'step5.duration': 'Длительность:',
      'step5.sec': 'сек.',
      'step5.createdProjects': 'Создано проектов',
      'step5.createdTasks': 'Создано задач',
      'step5.updatedTasks': 'Обновлено задач',
      'step5.createdLabels': 'Создано меток',
      'step5.createdDocs': 'Создано документов',
      'step5.skippedTasks': 'Пропущено задач',
      'step5.errorsCount': 'Ошибок',
      'step5.noEntries': 'Записи не найдены',
      'step5.thWeeekId': 'WEEEK ID',
      'step5.thLinearKey': 'Linear Key / ID',
      'step5.thTaskTitle': 'Название задачи',
    },

    en: {
      // Header
      'header.about': 'About',
      'header.aboutTitle': 'About',
      'lang.switch': 'RU',

      // Navigation
      'nav.step1': 'Connect',
      'nav.step2': 'Projects',
      'nav.step3': 'Mapping',
      'nav.step4': 'Migration',
      'nav.step5': 'Report',
      'nav.stepsLabel': 'Migration steps',

      // Step 1
      'step1.title': 'API Connection',
      'step1.subtitle': 'Enter your WEEEK and Linear API tokens for secure direct interaction.',
      'step1.weeekToken': 'WEEEK API Token',
      'step1.weeekTokenHelp': 'WEEEK → Profile Settings → API',
      'step1.weeekStatus': 'Awaiting verification',
      'step1.linearToken': 'Linear Personal API Key',
      'step1.linearTokenHelp': 'Linear → Settings → Security',
      'step1.linearStatus': 'Awaiting verification',
      'step1.btnTest': 'Test connections',
      'step1.btnNext': 'Continue to project selection',

      // Step 2
      'step2.title': 'Select Projects & Target Team',
      'step2.subtitle': 'Choose which WEEEK projects to migrate and specify the target Linear team.',
      'step2.teamTitle': 'Target Linear Team',
      'step2.teamLabel': 'Target team',
      'step2.teamPlaceholder': 'Loading teams...',
      'step2.projectsTitle': 'WEEEK Projects',
      'step2.search': 'Search projects...',
      'step2.selectAll': 'Select all',
      'step2.deselectAll': 'Deselect all',
      'step2.btnBack': 'Back',
      'step2.btnNext': 'Go to mapping settings',

      // Step 3
      'step3.title': 'Data Mapping Settings',
      'step3.subtitle': 'Review kanban column mapping, user assignments, subscribers, and sync options.',
      'step3.colMappingTitle': 'WEEEK Kanban Columns → Linear Workflow States',
      'step3.createMissingTitle': 'Create missing workflow states in Linear',
      'step3.createMissingDesc': 'Automatically create a Workflow State in the Linear team if no exact match is found',
      'step3.renameMatchedTitle': 'Rename matched Linear states',
      'step3.renameMatchedDesc': 'Rename and recolor matched Linear states to exact WEEEK column names and colors',
      'step3.recreateTitle': 'Full replacement (1-to-1 from WEEEK)',
      'step3.recreateDesc': 'Archive extra default Linear states and recreate exact WEEEK column structure',
      'step3.colMappingHint': 'Map each WEEEK board column to a Linear state or choose to create a new one:',
      'step3.userMappingTitle': 'Assignees (User Mapping & Fallback)',
      'step3.userMappingHint': 'Specify who to assign issues to if a user is not found:',
      'step3.watcherTitle': 'Subscribers / Watchers',
      'step3.watcherLabel': 'Subscriber assignment strategy:',
      'step3.watcherNone': 'No additional subscribers',
      'step3.watcherSecondary': 'WEEEK secondary assignees → Linear subscribers',
      'step3.watcherGlobal': 'Assign a specific team member as watcher for all issues',
      'step3.watcherBoth': 'Secondary assignees + Global watcher',
      'step3.globalWatcherLabel': 'Global watcher (Team Lead / PM):',
      'step3.globalWatcherPlaceholder': 'Select a Linear team member...',
      'step3.syncTitle': 'Launch & Re-run Options',
      'step3.dryRunTitle': 'Dry Run mode',
      'step3.dryRunDesc': 'Validate and calculate without making changes in Linear',
      'step3.docsTitle': 'Migrate knowledge base documents',
      'step3.docsDesc': 'Create articles in Linear Project Documents',
      'step3.docsDisabledDesc': '⚠️ Temporarily unavailable (WEEEK public API lacks document endpoints)',
      'step3.completedTitle': 'Migrate completed tasks',
      'step3.completedDesc': 'Includes tasks with Completed status',
      'step3.syncLabel': 'Re-run behavior:',
      'step3.syncSkip': 'Skip',
      'step3.syncSkipDesc': '(do not update issues or comments)',
      'step3.syncUpdateAll': 'Full update',
      'step3.syncUpdateAllDesc': '(update issue fields and comments)',
      'step3.syncStatusOnly': 'Update status and deadline only',
      'step3.syncStatusOnlyDesc': '(preserve description)',
      'step3.commentsLabel': 'Task comments migration:',
      'step3.commentsDisabledDesc': '⚠️ Temporarily unavailable (WEEEK public API lacks task comment endpoints)',
      'step3.commentNone': 'Do not migrate',
      'step3.commentNoneDesc': '(skip task comments)',
      'step3.commentTextOnly': 'Text with author name',
      'step3.commentTextOnlyDesc': '(without user account mapping)',
      'step3.commentMappedAuthors': 'Map authors',
      'step3.commentMappedAuthorsDesc': '(map comment authors via User Mapping)',
      'step3.customFieldsLabel': 'Task Custom Fields (WEEEK):',
      'step3.customFieldsAppend': 'Append to Markdown description',
      'step3.customFieldsAppendDesc': '(structured block at the end of issue)',
      'step3.customFieldsNone': 'Do not migrate',
      'step3.customFieldsNoneDesc': '(skip custom fields)',
      'step3.ignoredCustomFieldsPlaceholder': 'Comma-separated ignored fields (e.g. Budget, Secret)',
      'step3.btnBack': 'Back',
      'step3.btnStart': 'Start Dry Run',

      // Step 4
      'step4.title': 'Migration in Progress',
      'step4.subtitle': 'Monitor data transfer progress in real time.',
      'step4.preparing': 'Preparing to launch...',
      'step4.processing': 'Processing:',
      'step4.cntProjects': 'Projects',
      'step4.cntTasks': 'Issues',
      'step4.cntLabels': 'Labels',
      'step4.cntDocs': 'Documents',
      'step4.cntWarnings': 'Warnings',
      'step4.cntErrors': 'Errors',
      'step4.console': 'Live event log',
      'step4.autoScroll': 'Auto-scroll',
      'step4.clearLogs': 'Clear',
      'step4.initLog': 'Initializing event stream...',
      'step4.btnStop': 'Stop migration',
      'step4.btnNext': 'Go to summary report',

      // Step 5
      'step5.title': 'Migration Report',
      'step5.subtitle': 'Summary results and entity mapping.',
      'step5.mappingTitle': 'Migrated Issues Map',
      'step5.searchPlaceholder': 'Search by ID or title...',
      'step5.btnDownloadMd': 'Download Markdown report',
      'step5.btnDownloadJson': 'Download JSON report',
      'step5.btnRestart': 'New migration',

      // Footer
      'footer.text': 'WEEEK → Linear Migration Tool • Open Source under GPL v3 License',
      'footer.github': 'GitHub Repository',

      // About Modal
      'about.modalTitle': 'About WEEEK → Linear',
      'about.modalDesc': 'Professional tool for migrating projects, tasks, multi-level subtasks, documents, and structure from WEEEK to Linear.',
      'about.version': 'Version:',
      'about.license': 'License:',

      // Alerts
      'alert.close': 'Close notification',

      // Dynamic UI strings (app.js)
      'status.checking': 'Checking...',
      'status.connected': '✓ Connected',
      'status.error': '✗ Error',
      'auth.success': 'Connection to WEEEK and Linear established successfully!',
      'auth.tokenRequired': 'Enter both API tokens to test',
      'auth.serverError': 'Failed to reach local server',
      'auth.failed': 'Authorization check failed',
      'step2.projectsError': 'Error loading projects',
      'step2.teamsError': 'Error loading Linear teams',
      'step2.notFound': 'Projects not found',
      'step2.noDesc': 'No description',
      'step2.selected': '✓ Selected',
      'step2.clickToSelect': 'Click to select',
      'step3.noColumns': 'No kanban columns found in WEEEK or board is empty. Issues will be mapped to standard Linear states.',
      'step3.createStatePrefix': '➕ Create in Linear: ',
      'step3.noUsers': 'WEEEK users not found',
      'step3.unassigned': 'Unassigned',
      'step3.skipUserTasks': 'Skip issues by this author',
      'step3.selectWatcherPlaceholder': 'Select a Linear team member...',
      'step3.noEmail': 'No email',
      'step3.defaultUserName': 'User',
      'step3.btnDryRun': 'Start Dry Run (Simulation)',
      'step3.btnReal': 'Start Real Migration',
      'step4.stagePrefix': 'Stage ',
      'step4.init': 'Initializing migration...',
      'step4.startLog': 'Starting migration pipeline...',
      'step4.startError': 'Start error: ',
      'step4.processingItem': 'Processing...',
      'step4.finishedTitle': 'Migration completed successfully!',
      'step4.finishedLog': '✓ Migration finished. Summary reports generated.',
      'step4.abortedTitle': 'Process stopped by user',
      'step4.abortedLog': 'Migration aborted.',
      'step4.confirmStop': 'Are you sure you want to stop the migration?',
      'step5.startDate': 'Start Date:',
      'step5.duration': 'Duration:',
      'step5.sec': 'sec.',
      'step5.createdProjects': 'Projects Created',
      'step5.createdTasks': 'Issues Created',
      'step5.updatedTasks': 'Issues Updated',
      'step5.createdLabels': 'Labels Created',
      'step5.createdDocs': 'Documents Created',
      'step5.skippedTasks': 'Issues Skipped',
      'step5.errorsCount': 'Errors',
      'step5.noEntries': 'No entries found',
      'step5.thWeeekId': 'WEEEK ID',
      'step5.thLinearKey': 'Linear Key / ID',
      'step5.thTaskTitle': 'Issue Title',
    },
  };

  /** Текущая локаль */
  let _locale = 'ru';

  /**
   * Получить перевод по ключу. Fallback — ключ.
   */
  function t(key) {
    const dict = TRANSLATIONS[_locale] || TRANSLATIONS['ru'];
    return dict[key] !== undefined ? dict[key] : key;
  }

  /**
   * Применить локаль: обойти все [data-i18n] и заменить text/placeholder/aria-label.
   */
  function applyLocale(lang) {
    _locale = lang;
    document.documentElement.lang = lang;

    // Текстовое содержимое
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    // Placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });

    // title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });

    // Переключатель языка: подсветить активную кнопку в пилюле
    const btnRu = document.getElementById('lang-btn-ru');
    const btnEn = document.getElementById('lang-btn-en');
    if (btnRu && btnEn) {
      btnRu.classList.toggle('active', lang === 'ru');
      btnEn.classList.toggle('active', lang === 'en');
    }

    const langToggle = document.getElementById('btn-lang-toggle');
    if (langToggle) {
      langToggle.textContent = lang.toUpperCase();
    }

    // Сохранить выбор
    try {
      localStorage.setItem('weeek_lang', lang);
    } catch (_) { /* Safari private mode */ }

    // Уведомить подписчиков (app.js) о смене языка
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale: lang } }));
  }

  /**
   * Инициализация: читаем localStorage → navigator.language → по умолчанию ru.
   */
  function initLocale() {
    let lang = 'ru';
    try {
      const saved = localStorage.getItem('weeek_lang');
      if (saved === 'ru' || saved === 'en') {
        lang = saved;
      } else {
        const nav = (navigator.language || '').toLowerCase();
        lang = nav.startsWith('ru') ? 'ru' : 'en';
      }
    } catch (_) { /* игнорируем ошибки localStorage */ }

    applyLocale(lang);

    // Обработчик сегментированного переключателя
    const btnRu = document.getElementById('lang-btn-ru');
    const btnEn = document.getElementById('lang-btn-en');
    if (btnRu) btnRu.addEventListener('click', () => applyLocale('ru'));
    if (btnEn) btnEn.addEventListener('click', () => applyLocale('en'));

    // Фолбэк кнопка
    const langToggle = document.getElementById('btn-lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        const next = _locale === 'ru' ? 'en' : 'ru';
        applyLocale(next);
      });
    }
  }

  // Экспорт в глобальную область для использования в app.js
  window.i18n = { t, applyLocale, initLocale, getLocale: () => _locale };
})();
