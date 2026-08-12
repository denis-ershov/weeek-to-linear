# Архитектура безопасности (SECURITY_ARCHITECTURE.md)

## 1. Модель угроз (Threat Model)

Проект **WEEEK → Linear Migration Tool** публикуется как открытый исходный код, что требует строгого соблюдения принципов *Security by Design* и *Zero Trust*.

### Анализ векторов атак и меры защиты (STRIDE)

| Угроза | Вектор / Риск | Защитные меры в архитектуре |
| :--- | :--- | :--- |
| **Information Disclosure (Утечка секретов)** | Случайный коммит `.env` или логов с токенами в публичный Git-репозиторий. | 1. Исключение `.env*`, `.weeek-linear/`, логов в `.gitignore`.<br>2. Автоматическое маскирование заголовков и токенов в `pino` (`redact`).<br>3. Сканирование Gitleaks в GitHub Actions CI. |
| **Credential Storage (Хранение токенов)** | Утечка токенов через файл сохранения состояния. | Токены API **никогда** не сохраняются в `state.json` или отчетах. |
| **Data Tampering (Подмена данных)** | Некорректная модификация задач в целевом Linear. | Валидация входных данных через `zod` и обязательный предстартовый `PreflightValidator`. |
| **Denial of Service (DoS / Rate Limits)** | Блокировка аккаунта из-за превышения квот API WEEEK/Linear. | Ограничение параллелизма (`API_CONCURRENCY`), экспоненциальный retry и обработка `Retry-After`. |
| **Input Injection (HTML/Markdown Injection)** | Внедрение вредоносных тегов через описание задач WEEEK. | Санитизация Markdown и очистка потенциально опасного HTML перед отправкой в Linear. |

---

## 2. Безопасность логов

Логирование построено на базе библиотеки `pino` с конфигурацией автоматического скрытия:
```typescript
const redactPaths = [
  'WEEEK_API_TOKEN',
  'LINEAR_API_TOKEN',
  'req.headers.authorization',
  'headers.authorization',
  '*.token',
  '*.apiKey',
  '*.password'
];
```

Даже в режиме `--log-level debug` заголовки авторизации и токены заменяются на `[REDACTED]`.

---

## 3. Обработка персональных данных (GDPR / Privacy)

1. Утилита выполняется исключительно на рабочей станции пользователя.
2. Промежуточные данные (маппинги ID и email) сохраняются в локальной директории `.weeek-linear/` и не отправляются на сторонние серверы.
3. Отчеты миграции (`migration-report.md`, `migration-report.json`) генерируются локально и по умолчанию исключены из Git.
