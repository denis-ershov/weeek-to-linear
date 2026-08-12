import type { WeeekClient } from '../clients/weeek/client.js';
import type { LinearClient } from '../clients/linear/client.js';
import type { PreflightValidationResult } from './types.js';
import { isValidDateString } from '../utils/dates.js';

export interface PreflightValidationParams {
  weeekClient: WeeekClient;
  linearClient: LinearClient;
  weeekProjectId?: string;
  linearTeamId: string;
  includeCompleted?: boolean;
}

export class PreflightValidator {
  /**
   * Выполнение предмиграционной проверки (Preflight Validation)
   */
  public static async validate(params: PreflightValidationParams): Promise<PreflightValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 1. Проверка WEEEK авторизации
    try {
      await params.weeekClient.getMe();
    } catch (err) {
      errors.push(`Ошибка подключения к WEEEK API: ${(err as Error).message}`);
    }

    // 2. Проверка Linear авторизации
    try {
      await params.linearClient.getViewer();
    } catch (err) {
      errors.push(`Ошибка подключения к Linear API: ${(err as Error).message}`);
    }

    // 3. Проверка выбранной команды Linear
    try {
      const team = await params.linearClient.getTeam(params.linearTeamId);
      if (!team) {
        errors.push(`Целевая команда Linear с ID/ключом "${params.linearTeamId}" не найдена`);
      }
    } catch (err) {
      errors.push(`Ошибка получения команды Linear: ${(err as Error).message}`);
    }

    // Если есть фатальные ошибки авторизации, завершаем проверку
    if (errors.length > 0) {
      return {
        isValid: false,
        projectsCount: 0,
        tasksCount: 0,
        usersCount: 0,
        labelsCount: 0,
        warnings,
        errors,
      };
    }

    let projectsCount = 0;
    let tasksCount = 0;
    let usersCount = 0;
    let labelsCount = 0;

    try {
      const [weeekProjects, weeekUsers, weeekTags, linearUsers] = await Promise.all([
        params.weeekProjectId ? [await params.weeekClient.getProject(params.weeekProjectId)] : params.weeekClient.getProjects(),
        params.weeekClient.getUsers(),
        params.weeekClient.getTags(),
        params.linearClient.getUsers(),
      ]);

      projectsCount = weeekProjects.length;
      usersCount = weeekUsers.length;
      labelsCount = weeekTags.length;

      // Проверка сопоставления пользователей по email
      const linearUserEmails = new Set(linearUsers.map(u => u.email.toLowerCase()));
      for (const wUser of weeekUsers) {
        if (wUser.email && !linearUserEmails.has(wUser.email.toLowerCase())) {
          warnings.push(`Пользователь WEEEK "${wUser.name}" (${wUser.email}) не найден в Linear`);
        }
      }

      // Проверка задач и дат
      for (const project of weeekProjects) {
        const tasks = await params.weeekClient.getTasks({
          projectId: project.id,
          includeCompleted: params.includeCompleted ?? true,
        });

        tasksCount += tasks.length;

        for (const task of tasks) {
          if (task.date && !isValidDateString(task.date)) {
            warnings.push(`Задача "${task.title}" (ID: ${task.id}) содержит нестандартную дату: ${task.date}`);
          }
          if (task.dateEnd && !isValidDateString(task.dateEnd)) {
            warnings.push(`Задача "${task.title}" (ID: ${task.id}) содержит нестандартный дедлайн: ${task.dateEnd}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Ошибка загрузки данных для валидации: ${(err as Error).message}`);
    }

    return {
      isValid: errors.length === 0,
      projectsCount,
      tasksCount,
      usersCount,
      labelsCount,
      warnings,
      errors,
    };
  }
}
