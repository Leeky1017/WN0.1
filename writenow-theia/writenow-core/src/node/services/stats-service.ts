import { inject, injectable } from '@theia/core/shared/inversify';

import type {
    StatsGetRangeRequest,
    StatsGetRangeResponse,
    StatsGetTodayRequest,
    StatsGetTodayResponse,
    StatsIncrementRequest,
    StatsIncrementResponse,
    WritingStatsRow,
    WritingStatsSummary,
} from '../../common/ipc-generated';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

/**
 * Why: StatsService implements the stats IPC contract for writing statistics.
 * It tracks daily word counts, writing time, articles created, and skills used.
 */
@injectable()
export class StatsService {
    constructor(@inject(WritenowSqliteDb) private readonly db: WritenowSqliteDb) {}

    /**
     * Why: Get today's writing statistics.
     */
    getToday(_request: StatsGetTodayRequest): StatsGetTodayResponse {
        const today = this.formatDate(new Date());
        const row = this.getOrCreateRow(today);
        return { stats: row };
    }

    /**
     * Why: Get writing statistics for a date range with aggregated summary.
     */
    getRange(request: StatsGetRangeRequest): StatsGetRangeResponse {
        const { startDate, endDate } = request;
        const db = this.db.db;

        const rows = db.prepare(`
            SELECT date, word_count, writing_minutes, articles_created, skills_used
            FROM writing_stats
            WHERE date >= ? AND date <= ?
            ORDER BY date ASC
        `).all(startDate, endDate) as Array<{
            date: string;
            word_count: number;
            writing_minutes: number;
            articles_created: number;
            skills_used: number;
        }>;

        const items: WritingStatsRow[] = rows.map(row => ({
            date: row.date,
            wordCount: row.word_count,
            writingMinutes: row.writing_minutes,
            articlesCreated: row.articles_created,
            skillsUsed: row.skills_used,
        }));

        const summary: WritingStatsSummary = items.reduce(
            (acc, row) => ({
                wordCount: acc.wordCount + row.wordCount,
                writingMinutes: acc.writingMinutes + row.writingMinutes,
                articlesCreated: acc.articlesCreated + row.articlesCreated,
                skillsUsed: acc.skillsUsed + row.skillsUsed,
            }),
            { wordCount: 0, writingMinutes: 0, articlesCreated: 0, skillsUsed: 0 }
        );

        return { items, summary };
    }

    /**
     * Why: Increment writing statistics for a specific date (defaults to today).
     */
    increment(request: StatsIncrementRequest): StatsIncrementResponse {
        const date = request.date ?? this.formatDate(new Date());
        const { increments } = request;
        const db = this.db.db;

        // Ensure row exists
        this.getOrCreateRow(date);

        // Build dynamic update SQL
        const updates: string[] = [];
        const params: (number | string)[] = [];

        if (increments.wordCount !== undefined) {
            updates.push('word_count = word_count + ?');
            params.push(increments.wordCount);
        }
        if (increments.writingMinutes !== undefined) {
            updates.push('writing_minutes = writing_minutes + ?');
            params.push(increments.writingMinutes);
        }
        if (increments.articlesCreated !== undefined) {
            updates.push('articles_created = articles_created + ?');
            params.push(increments.articlesCreated);
        }
        if (increments.skillsUsed !== undefined) {
            updates.push('skills_used = skills_used + ?');
            params.push(increments.skillsUsed);
        }

        if (updates.length > 0) {
            params.push(date);
            db.prepare(`
                UPDATE writing_stats SET ${updates.join(', ')} WHERE date = ?
            `).run(...params);
        }

        // Fetch updated row
        const updated = this.getOrCreateRow(date);
        return { stats: updated };
    }

    /**
     * Why: Get or create a stats row for a specific date.
     */
    private getOrCreateRow(date: string): WritingStatsRow {
        const db = this.db.db;

        let row = db.prepare(`
            SELECT date, word_count, writing_minutes, articles_created, skills_used
            FROM writing_stats WHERE date = ?
        `).get(date) as {
            date: string;
            word_count: number;
            writing_minutes: number;
            articles_created: number;
            skills_used: number;
        } | undefined;

        if (!row) {
            db.prepare(`
                INSERT INTO writing_stats (date, word_count, writing_minutes, articles_created, skills_used)
                VALUES (?, 0, 0, 0, 0)
            `).run(date);

            row = {
                date,
                word_count: 0,
                writing_minutes: 0,
                articles_created: 0,
                skills_used: 0,
            };
        }

        return {
            date: row.date,
            wordCount: row.word_count,
            writingMinutes: row.writing_minutes,
            articlesCreated: row.articles_created,
            skillsUsed: row.skills_used,
        };
    }

    /**
     * Why: Format date to YYYY-MM-DD string.
     */
    private formatDate(date: Date): string {
        return date.toISOString().slice(0, 10);
    }
}
