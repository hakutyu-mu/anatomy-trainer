/**
 * storageManager.js
 * Handles all interactions with localStorage.
 */

const STORAGE_KEY = 'anatomy_trainer_v1';

const defaultData = {
    stats: {
        totalAttempts: 0,
        totalCorrect: 0,
        totalQuestions: 0
    },
    dailyLog: {
        // "YYYY-MM-DD": { attempts: 0, correctRate: 0, correctCount: 0, totalCount: 0 }
    },
    streak: {
        current: 0,
        max: 0,
        lastLoginDate: null
    },
    perfectClear: {},
    wrongHistory: {},
    resumeData: null,
    lastSession: null
};

class StorageManager {
    constructor() {
        this.data = this._loadData();
    }

    _loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...defaultData, ...JSON.parse(stored) };
        }
        return JSON.parse(JSON.stringify(defaultData));
    }

    _saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    saveResumeData(sessionData) {
        this.data.resumeData = sessionData;
        this._saveData();
    }

    loadResumeData() {
        return this.data.resumeData;
    }

    clearResumeData() {
        this.data.resumeData = null;
        this._saveData();
    }

    saveLastSessionStats(correct, total) {
        this.data.lastSession = {
            correct: correct,
            total: total,
            rate: Math.round((correct / total) * 100),
            date: Date.now()
        };
        this._saveData();
    }

    getLastSessionStats() {
        return this.data.lastSession;
    }

    updateStats(isCorrect, questionId) {
        this.data.stats.totalAttempts++;
        this.data.stats.totalQuestions++; // Note: this might be redundant with attempts, but keeping spec
        if (isCorrect) {
            this.data.stats.totalCorrect++;
            if (this.data.wrongHistory[questionId]) {
                delete this.data.wrongHistory[questionId];
            }
            this.data.perfectClear[questionId] = true;
        } else {
            this.data.wrongHistory[questionId] = Date.now();
        }

        this._updateDailyLog(isCorrect);
        this._saveData();
    }

    _updateDailyLog(isCorrect) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.data.dailyLog[today]) {
            this.data.dailyLog[today] = { attempts: 0, correctCount: 0, totalCount: 0, correctRate: 0 };
            this._updateStreak(today);
        }

        const log = this.data.dailyLog[today];
        log.attempts++; // Increment session/attempt count logic could be here, but treating as per-question for now or we update at end of session. 
        // Spec says "Total Attempts" in stats, but Daily Log has "attempts". 
        // Usually daily attempts means "sessions" or "questions answered". Assuming "questions answered" for granularity, 
        // but if it means "Quiz Sessions", we need to call this differently.
        // Let's assume this updates per question for real-time stats, 
        // OR we provides a method to updateSessionEnd.
        // Let's stick to simple per-question tracking for accuracy first.

        log.totalCount++;
        if (isCorrect) log.correctCount++;
        log.correctRate = Math.round((log.correctCount / log.totalCount) * 100);
    }

    _updateStreak(today) {
        const lastLogin = this.data.streak.lastLoginDate;

        if (lastLogin === today) return; // Already logged today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastLogin === yesterdayStr) {
            this.data.streak.current++;
        } else {
            this.data.streak.current = 1;
        }

        if (this.data.streak.current > this.data.streak.max) {
            this.data.streak.max = this.data.streak.current;
        }

        this.data.streak.lastLoginDate = today;
    }

    getWrongQuestions() {
        return Object.keys(this.data.wrongHistory);
    }

    getData() {
        return this.data;
    }

    resetData() {
        this.data = JSON.parse(JSON.stringify(defaultData));
        this._saveData();
    }
}

// Export singleton
// functionality will be exposed via global or module if using ES6 modules. 
// Since vanilla JS, we'll attach to window or just return class. 
// For this structure, we'll instantiate in app.js.
window.StorageManager = StorageManager;
