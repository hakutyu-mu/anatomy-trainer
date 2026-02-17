/**
 * questionManager.js
 * Handles question data retrieval, filtering, and randomization.
 */

class QuestionManager {
    constructor() {
        this.questions = [];
        this.currentQueue = [];
        this.currentIndex = 0;
    }

    async loadQuestions() {
        try {
            // Check if global data exists (loaded via script tag)
            if (window.QUESTION_DATA) {
                this.questions = window.QUESTION_DATA.questions;
                return true;
            }

            // Fallback to fetch (legacy or server environment)
            const response = await fetch('data/questions.json');
            const data = await response.json();
            this.questions = data.questions;
            return true;
        } catch (error) {
            console.error('Failed to load questions:', error);
            return false;
        }
    }

    initMode(mode, wrongIds = []) {
        // Modes: 'random', 'sequential', 'review' (wrong only)
        this.currentIndex = 0;

        if (mode === 'review') {
            this.currentQueue = this.questions.filter(q => wrongIds.includes(q.id));
        } else {
            this.currentQueue = [...this.questions];
        }

        if (mode === 'random') {
            this._shuffle(this.currentQueue);
        }
        // 'sequential' uses default order (or sorted by ID if needed, assuming JSON is sorted)
    }

    _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getCurrentQuestion() {
        if (this.currentIndex >= this.currentQueue.length) return null;
        return this.currentQueue[this.currentIndex];
    }

    next() {
        this.currentIndex++;
        return this.currentIndex < this.currentQueue.length;
    }

    getProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.currentQueue.length
        };
    }
}

window.QuestionManager = QuestionManager;
