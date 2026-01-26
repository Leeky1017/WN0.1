/**
 * Mock data for tests
 * Why: Centralize test fixtures to avoid duplication
 */

import type {
  WritingStatsRow,
  WritingStatsSummary,
  VersionListItem,
  SkillListItem,
} from '@/types/ipc-generated';

export const mockTodayStats: WritingStatsRow = {
  date: new Date().toISOString().split('T')[0],
  wordCount: 1500,
  writingMinutes: 45,
  articlesCreated: 1,
  skillsUsed: 3,
};

export const mockWeeklyStats: WritingStatsRow[] = [
  { date: '2026-01-20', wordCount: 1200, writingMinutes: 30, articlesCreated: 0, skillsUsed: 2 },
  { date: '2026-01-21', wordCount: 800, writingMinutes: 20, articlesCreated: 0, skillsUsed: 1 },
  { date: '2026-01-22', wordCount: 2100, writingMinutes: 55, articlesCreated: 1, skillsUsed: 4 },
  { date: '2026-01-23', wordCount: 1500, writingMinutes: 40, articlesCreated: 0, skillsUsed: 2 },
  { date: '2026-01-24', wordCount: 2800, writingMinutes: 75, articlesCreated: 1, skillsUsed: 5 },
  { date: '2026-01-25', wordCount: 900, writingMinutes: 25, articlesCreated: 0, skillsUsed: 1 },
  { date: '2026-01-26', wordCount: 1500, writingMinutes: 45, articlesCreated: 1, skillsUsed: 3 },
];

export const mockStatsSummary: WritingStatsSummary = {
  wordCount: 10800,
  writingMinutes: 290,
  articlesCreated: 3,
  skillsUsed: 18,
};

export const mockVersions: VersionListItem[] = [
  {
    id: 'v-001',
    articleId: '/documents/test.md',
    name: '当前版本',
    reason: '自动保存',
    actor: 'auto',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'v-002',
    articleId: '/documents/test.md',
    name: '手动保存',
    reason: '用户保存',
    actor: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'v-003',
    articleId: '/documents/test.md',
    name: 'AI 修改',
    reason: 'AI 润色',
    actor: 'ai',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

export const mockSkills: SkillListItem[] = [
  {
    id: 'builtin:polish',
    name: '润色',
    description: '优化文本表达',
    version: '1.0.0',
    scope: 'builtin',
    enabled: true,
    valid: true,
  },
  {
    id: 'builtin:expand',
    name: '扩写',
    description: '扩展内容',
    version: '1.0.0',
    scope: 'builtin',
    enabled: true,
    valid: true,
  },
];
