/**
 * Контракт словаря i18n — единый тип для всех локалей.
 * Вложенные секции по зонам ответственности.
 */
export interface I18nDictionary {
  // Общие
  common: {
    tokenRequired: string;
    cancel: string;
    error: string;
    yes: string;
    no: string;
    back: string;
    continue: string;
  };

  // CLI — заголовки и баннер
  cli: {
    banner: {
      tagline: string;
    };
    description: string;
    versionFlag: string;

    // Команды
    commands: {
      authTest: string;
      weeekProjects: string;
      linearTeams: string;
      migrate: string;
      ui: string;
    };

    // Флаги migrate
    flags: {
      dryRun: string;
      resume: string;
      force: string;
      weeekProject: string;
      linearTeam: string;
      noCompleted: string;
      noDocs: string;
      createMissingStates: string;
      renameMatchedStates: string;
      recreateColumns: string;
      includeDeleted: string;
      syncStrategy: string;
      commentStrategy: string;
      watcherStrategy: string;
      globalWatcher: string;
      unmatchedUser: string;
      columnMapping: string;
      userMapping: string;
      lang: string;
      port: string;
      noOpen: string;
    };

    // Команда auth
    auth: {
      intro: string;
      enterWeeekToken: string;
      enterLinearToken: string;
      checkingWeeek: string;
      checkingLinear: string;
      weeekSuccess: string;
      linearSuccess: string;
      weeekError: string;
      linearError: string;
      accountsNote: string;
      weeekUser: string;
      linearAccount: string;
      linearOrg: string;
      outro: string;
      defaultUser: string;
      personalSpace: string;
    };

    // Команда weeek:projects
    weeek: {
      missingToken: string;
      loading: string;
      found: string;
      empty: string;
      colId: string;
      colName: string;
      colDesc: string;
      error: string;
    };

    // Команда linear:teams
    linear: {
      missingToken: string;
      loading: string;
      found: string;
      empty: string;
      colId: string;
      colKey: string;
      colName: string;
      error: string;
    };

    // Команда ui
    ui: {
      intro: string;
      serverNote: string;
      serverBadge: string;
      stopHint: string;
      stopping: string;
      startError: string;
    };

    // Мастер миграции
    migrate: {
      intro: string;
      loadingProjects: string;
      loadedSuccess: string;
      loadError: string;
      noProjects: string;
      noTeams: string;
      selectProject: string;
      allProjects: string;
      selectTeam: string;
      columnModeQuestion: string;
      columnModeCreateMissing: string;
      columnModeRename: string;
      columnModeRecreate: string;
      columnModeExisting: string;
      watcherQuestion: string;
      watcherSecondary: string;
      watcherNone: string;
      watcherGlobal: string;
      watcherBoth: string;
      selectGlobalWatcher: string;
      syncQuestion: string;
      syncSkip: string;
      syncUpdateAll: string;
      syncUpdateStatus: string;
      syncUpdateComments: string;
      resumeConfirm: string;
      forceConfirm: string;
      dryRunComplete: string;
      successComplete: string;
      errorComplete: string;
      projCreated: string;
      projSkipped: string;
      tasksCreated: string;
      tasksSkipped: string;
      labelsCreated: string;
      labelsReused: string;
      parentsResolved: string;
      errors: string;
      reportSaved: string;
      reportMd: string;
      reportJson: string;
      outro: string;
      criticalError: string;
      warnings: string;
      dryRunBadge: string;
      successBadge: string;
      errorBadge: string;
      jsonError: string;
    };
  };

  // Web UI — строки для браузера
  ui: {
    // Шапка
    header: {
      about: string;
    };

    // Навигация
    nav: {
      step1: string;
      step2: string;
      step3: string;
      step4: string;
      step5: string;
      stepsLabel: string;
    };

    // Шаг 1: Авторизация
    step1: {
      title: string;
      subtitle: string;
      weeekToken: string;
      weeekTokenHelp: string;
      weeekStatus: string;
      linearToken: string;
      linearTokenHelp: string;
      linearStatus: string;
      btnTest: string;
      btnNext: string;
    };

    // Шаг 2: Проекты
    step2: {
      title: string;
      subtitle: string;
      teamLabel: string;
      teamPlaceholder: string;
      projectsTitle: string;
      search: string;
      selectAll: string;
      deselectAll: string;
      btnBack: string;
      btnNext: string;
    };

    // Шаг 3: Маппинг
    step3: {
      title: string;
      subtitle: string;
      columnMappingTitle: string;
      optCreateMissing: string;
      optRenameMatched: string;
      optRecreate: string;
      userMappingTitle: string;
      watcherTitle: string;
      optWatcherNone: string;
      optWatcherSecondary: string;
      optWatcherGlobal: string;
      optWatcherBoth: string;
      globalWatcherLabel: string;
      syncTitle: string;
      optSyncSkip: string;
      optSyncUpdateAll: string;
      optSyncStatus: string;
      optSyncComments: string;
      optDocuments: string;
      optCompleted: string;
      optDeleted: string;
      btnBack: string;
      btnStart: string;
    };

    // Шаг 4: Прогресс
    step4: {
      title: string;
      subtitle: string;
      console: string;
      initLog: string;
      btnStop: string;
      btnNext: string;
    };

    // Шаг 5: Отчёт
    step5: {
      title: string;
      subtitle: string;
      mappingTitle: string;
      searchPlaceholder: string;
      btnDownloadMd: string;
      btnDownloadJson: string;
      btnRestart: string;
    };

    // Footer
    footer: {
      text: string;
      github: string;
    };

    // Alerts / динамика
    alerts: {
      authSuccess: string;
      weeekOk: string;
      linearOk: string;
      authFailed: string;
      tokensSaved: string;
      migrationStarted: string;
      migrationStopped: string;
      migrationError: string;
    };
  };

  // Логи — pino logger строки, видимые при работе CLI/сервера
  logs: {
    retry: {
      fatalError: string;
      retrying: string;
      debugRetry: string;
    };
    server: {
      requestError: string;
      portBusy: string;
    };
    state: {
      readError: string;
      saveError: string;
    };
    engine: {
      weeekUser: string;
      linearOrg: string;
      labelCreateError: string;
      stateCreated: string;
      stateCreateError: string;
      stateArchived: string;
      stateCreatedNew: string;
      stateCreateNewError: string;
      stateRenamed: string;
      stateRenameError: string;
      taskUpdateError: string;
      knowledgeDocError: string;
      unknownProjectWarning: string;
    };
    weeekClient: {
      request: string;
      usersNotFound: string;
      tagsNotFound: string;
      columnsLoaded: string;
      docsLoaded: string;
    };
    linearClient: {
      creatingState: string;
      creatingProject: string;
      creatingLabel: string;
      creatingIssue: string;
      creatingDocument: string;
      creatingComment: string;
      subscribingWatcher: string;
      updatingIssue: string;
    };
    ui: {
      browserOpenError: string;
    };
  };

  // Стадии и ошибки MigrationEngine
  engine: {
    stages: {
      auth: string;
      loadingData: string;
      preflight: string;
      mappingUsers: string;
      mappingStates: string;
      mappingLabels: string;
      creatingStates: string;
      resolvingHierarchy: string;
      migratingTasks: string;
      migratingDocs: string;
      migratingComments: string;
      generatingReport: string;
    };
    errors: {
      teamNotFoundKey: string;
      teamNotFound: string;
      userNotMapped: string;
      taskCreateError: string;
      docCreateError: string;
    };
  };

  // Сообщения PreflightValidator
  validator: {
    weeekAuthError: string;
    linearAuthError: string;
    teamNotFound: string;
    teamFetchError: string;
    userNotFound: string;
    invalidDate: string;
    invalidDateEnd: string;
    dataFetchError: string;
  };

  // Сообщения Data Mapper
  mapper: {
    userNotFoundByEmail: string;
    userNotMapped: string;
  };

  // Ошибки и ответы REST API сервера
  server: {
    bodyTooLarge: string;
    invalidJson: string;
    tokensRequired: string;
    weeekTokenRequired: string;
    linearTokenRequired: string;
    teamIdRequired: string;
    defaultUserName: string;
    internalError: string;
  };

  // Итоговый Markdown отчёт (ReportGenerator)
  reporter: {
    title: string;
    date: string;
    duration: string;
    seconds: string;
    summaryTitle: string;
    entityHeader: string;
    totalHeader: string;
    createdHeader: string;
    updatedHeader: string;
    skippedHeader: string;
    errorsHeader: string;
    projects: string;
    tasks: string;
    labels: string;
    documents: string;
    comments: string;
    parentsResolved: string;
    warningsTitle: string;
    errorsTitle: string;
    mappingTitle: string;
    projectsTitle: string;
    noProjects: string;
    docsTitle: string;
    tasksTitle: string;
    moreTasksNote: string;
  };
}

