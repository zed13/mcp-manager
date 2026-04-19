# MCP Manager — Project Requirements & Plan

## Overview

TUI-приложение на TypeScript для управления MCP-инструментами в Claude Code.
Позволяет видеть все настроенные MCP-серверы (глобальные и проектные), подключаться
к ним и включать/выключать отдельные инструменты.

---

## Конфигурационный файл Claude Code

Вся конфигурация хранится в **одном файле** — `~/.claude.json`:

```jsonc
{
  // Глобальные MCP-серверы (доступны во всех проектах)
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "..." }
    },
    "local-server": {
      "command": "npx",
      "args": ["some-mcp-server"],
      "env": { "KEY": "value" }
    }
  },

  // Настройки по проектам
  "projects": {
    "/path/to/project": {
      "mcpServers": {          // серверы, специфичные для проекта
        "project-server": { "command": "...", "args": [] }
      },
      "allowedTools": [        // разрешённые инструменты (формат mcp__server__tool)
        "mcp__context7__query-docs"
      ],
      "disabledMcpjsonServers": [],  // отключённые серверы целиком
      "enabledMcpjsonServers": []
    }
  }
}
```

---

## Требования

### Функциональные

1. При запуске определить текущий проект (аргумент `--project <path>` или CWD)
2. Прочитать из `~/.claude.json`:
   - Глобальные серверы (`mcpServers`)
   - Серверы проекта (`projects[path].mcpServers`)
   - Текущие разрешения (`projects[path].allowedTools`)
3. Подключиться к каждому серверу через MCP SDK и получить список инструментов
4. Показать TUI с двумя режимами: **Global** и **Project**:
   - **Global**: управляет `allowedTools` на верхнем уровне (если применимо)
   - **Project**: управляет `projects[path].allowedTools` в `~/.claude.json`
5. Для каждого сервера показать список инструментов с флагом вкл/выкл
6. Сохранять изменения обратно в `~/.claude.json`
7. Не затрагивать другие поля файла при сохранении

### Нефункциональные

- Язык: **TypeScript**
- TUI-фреймворк: **ink** (React for CLI)
- MCP-клиент: **@modelcontextprotocol/sdk**
- Если сервер недоступен — показать предупреждение, не падать

---

## TypeScript Типы (`src/lib/types.ts`)

```typescript
// Конфигурация сервера из ~/.claude.json

interface McpServerHttp {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

interface McpServerStdio {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

type McpServerConfig = McpServerHttp | McpServerStdio;

// Сервер в приложении — конфиг + загруженные инструменты
interface McpServer {
  name: string;                   // ключ из mcpServers, например "context7"
  config: McpServerConfig;
  origin: 'global' | 'project';  // откуда взят сервер
  tools: McpTool[];               // заполняется после подключения
  status: 'idle' | 'loading' | 'connected' | 'error';
  error?: string;
}

// Инструмент от tools/list
interface McpTool {
  name: string;          // например "resolve-library-id"
  description?: string;
}

// Часть ~/.claude.json относящаяся к проекту
interface ProjectConfig {
  mcpServers: Record<string, McpServerConfig>;
  allowedTools: string[];              // ["mcp__server__tool"]
  disabledMcpjsonServers: string[];
  enabledMcpjsonServers: string[];
}

// Глобальная часть ~/.claude.json
interface ClaudeJson {
  mcpServers: Record<string, McpServerConfig>;
  projects: Record<string, ProjectConfig>;
  [key: string]: unknown;  // остальные поля не трогаем
}

// Состояние приложения
interface AppState {
  mode: 'global' | 'project';
  projectPath: string;
  servers: McpServer[];
  allowedTools: string[];        // текущий список разрешений (проектный или глобальный)
  selectedServerIndex: number;
  focusedPanel: 'servers' | 'tools';
  isDirty: boolean;
}
```

---

## Архитектура проекта

```
src/
  index.tsx            — точка входа, CLI-аргументы (meow)
  App.tsx              — главный компонент, состояние
  components/
    ServerList.tsx     — левая панель: список серверов
    ToolList.tsx       — правая панель: инструменты с чекбоксами
    StatusBar.tsx      — нижняя строка: режим, горячие клавиши
  lib/
    config.ts          — чтение/запись ~/.claude.json
    mcp-client.ts      — подключение к серверам, tools/list
    types.ts           — TypeScript-интерфейсы
```

### TUI Layout

```
╔══════════════════════════════════════════════════════════════╗
║  MCP Manager    [Global] / Project    /path/to/project       ║
╠═══════════════╦══════════════════════════════════════════════╣
║ Servers       ║ Tools: context7                              ║
║               ║                                              ║
║ ▶ context7    ║  [✓] resolve-library-id                      ║
║   (global)    ║  [✓] query-docs                              ║
║               ║                                              ║
╠═══════════════╩══════════════════════════════════════════════╣
║ Tab: switch  Space: toggle  S: save  G/P: mode  Q: quit      ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Шаги реализации

### Шаг 1: Инициализация
- `npm init -y`
- Зависимости: `ink`, `react`, `@modelcontextprotocol/sdk`, `meow`
- Dev: `typescript`, `tsx`, `@types/react`, `@types/node`
- `tsconfig.json` с `jsx: react`, `module: commonjs`, `strict: true`

### Шаг 2: `src/lib/types.ts`
- Все интерфейсы из раздела выше

### Шаг 3: `src/lib/config.ts`
- `readClaudeJson(): ClaudeJson` — читает `~/.claude.json`
- `getGlobalServers(config): Record<string, McpServerConfig>`
- `getProjectServers(config, projectPath): Record<string, McpServerConfig>`
- `getAllowedTools(config, projectPath): string[]` — читает `projects[path].allowedTools`
- `saveAllowedTools(projectPath, tools: string[]): void` — патчит `~/.claude.json`

### Шаг 4: `src/lib/mcp-client.ts`
- `connectServer(name, config): Promise<McpTool[]>` — запускает сервер и вызывает `tools/list`
- Поддержка stdio (`StdioClientTransport`) и http (`StreamableHTTPClientTransport`)
- Таймаут и graceful fallback при ошибке

### Шаг 5: UI компоненты
- `ServerList.tsx` — навигация стрелками, маркер origin
- `ToolList.tsx` — Space = toggle, подсветка изменений
- `StatusBar.tsx` — режим, `*` при наличии несохранённых изменений

### Шаг 6: `App.tsx` + `index.tsx`
- useEffect для загрузки конфига и подключения к серверам
- Обработчики клавиш: Tab, Space, S, G, P, Q
- Сохранение через `saveAllowedTools`

---

## Логика разрешений

Инструмент считается **включённым** по умолчанию.
Отключение = добавление в `allowedTools` с префиксом `!` **или** удаление из `allowedTools`
(нужно уточнить реальный формат Claude Code после изучения поведения).

Имена инструментов: `mcp__<servername>__<toolname>`

---

## Верификация

```bash
npm run dev -- --project /home/thor/workspace/github.com/zed13/mcp-manager
```

1. TUI открывается, показывает сервер `context7`
2. Подключается и отображает его инструменты
3. Space на инструменте — флаг меняется, появляется `*` в статусбаре
4. S — сохранение, проверить `~/.claude.json` → `projects[path].allowedTools`
5. G/P — переключение режима
