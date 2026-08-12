/**
 * WEEEK → Linear Migration Tool — Web UI i18n
 * Поддержка языков: ru (по умолчанию), en
 */

(function () {
  const TRANSLATIONS = {
    ru: {
      // Шапка
      'header.about': 'О сервисе',
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
      'step3.completedTitle': 'Переносить завершенные задачи',
      'step3.completedDesc': 'Включает задачи со статусом Completed',
      'step3.syncLabel': 'Поведение при повторном запуске:',
      'step3.syncSkip': 'Пропускать',
      'step3.syncSkipDesc': '(не трогать уже созданные задачи)',
      'step3.syncUpdateAll': 'Обновлять полностью',
      'step3.syncUpdateAllDesc': '(название, описание, статус, исполнитель)',
      'step3.syncStatusOnly': 'Обновлять только статус и дедлайн',
      'step3.syncStatusOnlyDesc': '(сохраняя описание)',
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
      'footer.text': 'WEEEK → Linear Migration Tool • Open Source under MIT License',
      'footer.github': 'GitHub Репозиторий',

      // Alerts
      'alert.close': 'Закрыть уведомление',
    },

    en: {
      // Header
      'header.about': 'About',
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
      'step3.completedTitle': 'Migrate completed tasks',
      'step3.completedDesc': 'Includes tasks with Completed status',
      'step3.syncLabel': 'Re-run behavior:',
      'step3.syncSkip': 'Skip',
      'step3.syncSkipDesc': '(do not touch already created issues)',
      'step3.syncUpdateAll': 'Full update',
      'step3.syncUpdateAllDesc': '(title, description, status, assignee)',
      'step3.syncStatusOnly': 'Update status and deadline only',
      'step3.syncStatusOnlyDesc': '(preserve description)',
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
      'footer.text': 'WEEEK → Linear Migration Tool • Open Source under MIT License',
      'footer.github': 'GitHub Repository',

      // Alerts
      'alert.close': 'Close notification',
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

    // Переключатель языка: показать противоположный язык
    const langToggle = document.getElementById('btn-lang-toggle');
    if (langToggle) {
      langToggle.textContent = t('lang.switch');
    }

    // Сохранить выбор
    try {
      localStorage.setItem('weeek_lang', lang);
    } catch (_) { /* Safari private mode */ }
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

    // Обработчик кнопки переключения
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
