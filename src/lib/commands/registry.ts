export type CommandDefinition = {
  id: string;
  title: string;
  keywords: string[];
  group: string;
  shortcut?: string;
  run: () => void | Promise<void>;
};

type BuiltinSkill = {
  id: string;
  name: string;
  description?: string;
};

type CreateCommandRegistryInput = {
  t: (key: string) => string;
  openStats: () => void;
  openMemory: () => void;
  openSettings: () => void;
  toggleFocusMode: () => void;
  startPomodoro: () => void;
  pausePomodoro: () => void;
  stopPomodoro: () => void;
  runSkill: (skill: { id: string; name: string }) => Promise<void>;
  skills: readonly BuiltinSkill[];
};

function uniqKeywords(value: string[]): string[] {
  return Array.from(new Set(value.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)));
}

/**
 * Creates command palette registry with explicit dependencies injected.
 * Why: avoid implicit global access and keep commands testable + composable.
 */
export function createCommandRegistry(input: CreateCommandRegistryInput): CommandDefinition[] {
  const groupNav = input.t('commands.group.navigation');
  const groupAi = input.t('commands.group.ai');
  const groupView = input.t('commands.group.view');
  const groupPomodoro = input.t('commands.group.pomodoro');

  const commands: CommandDefinition[] = [
    {
      id: 'nav:stats',
      title: input.t('commands.openStats'),
      keywords: uniqKeywords([input.t('commands.openStats'), 'stats', '统计']),
      group: groupNav,
      run: input.openStats,
    },
    {
      id: 'nav:memory',
      title: input.t('commands.openMemory'),
      keywords: uniqKeywords([input.t('commands.openMemory'), 'memory', '记忆', '偏好']),
      group: groupNav,
      run: input.openMemory,
    },
    {
      id: 'nav:settings',
      title: input.t('commands.openSettings'),
      keywords: uniqKeywords([input.t('commands.openSettings'), 'settings', '设置']),
      group: groupNav,
      run: input.openSettings,
    },
    {
      id: 'view:toggle-focus',
      title: input.t('commands.toggleFocusMode'),
      keywords: uniqKeywords([input.t('commands.toggleFocusMode'), 'focus', '专注']),
      group: groupView,
      shortcut: 'Ctrl+\\',
      run: input.toggleFocusMode,
    },
    {
      id: 'pomodoro:start',
      title: input.t('commands.pomodoroStart'),
      keywords: uniqKeywords([input.t('commands.pomodoroStart'), 'pomodoro', 'timer', '番茄钟', '专注', 'focus']),
      group: groupPomodoro,
      run: input.startPomodoro,
    },
    {
      id: 'pomodoro:pause',
      title: input.t('commands.pomodoroPause'),
      keywords: uniqKeywords([input.t('commands.pomodoroPause'), 'pomodoro', 'timer', '番茄钟', '暂停', 'pause']),
      group: groupPomodoro,
      run: input.pausePomodoro,
    },
    {
      id: 'pomodoro:stop',
      title: input.t('commands.pomodoroStop'),
      keywords: uniqKeywords([input.t('commands.pomodoroStop'), 'pomodoro', 'timer', '番茄钟', '停止', '结束', 'stop']),
      group: groupPomodoro,
      run: input.stopPomodoro,
    },
  ];

  for (const skill of input.skills) {
    commands.push({
      id: `skill:${skill.id}`,
      title: skill.name,
      keywords: uniqKeywords([skill.name, skill.id, skill.description ?? '', 'skill', 'AI']),
      group: groupAi,
      run: () => input.runSkill({ id: skill.id, name: skill.name }),
    });
  }

  return commands;
}
