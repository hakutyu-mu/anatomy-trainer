/**
 * app.js
 * Main controller
 */

const app = {
    init: async () => {
        try {
            console.log("App initializing...");
            // Initialize Managers
            app.storage = new StorageManager();
            app.sound = new SoundManager();
            app.questions = new QuestionManager();
            app.calendar = new CalendarManager(app.storage);

            // Load Data
            const loaded = await app.questions.loadQuestions();
            if (!loaded) {
                console.error("Critical: Failed to load question data.");
                alert("データの読み込みに失敗しました。詳細についてはブラウザのコンソール（F12）を確認してください。");
                return;
            }
            console.log("Data loaded successfully.");

            // Cache DOM
            app.dom = {
                screens: document.querySelectorAll('.screen'),
                home: document.getElementById('screen-home'),
                quiz: document.getElementById('screen-quiz'),
                result: document.getElementById('screen-result'),
                // Home Elements
                streakCount: document.getElementById('streak-count'),
                totalAnswered: document.getElementById('total-answered'),
                correctRate: document.getElementById('correct-rate'),
                calendarContainer: document.getElementById('calendar-container'),
                reviewBtn: document.getElementById('btn-review'),
                // Quiz Elements
                progressBar: document.getElementById('progress-bar'),
                questionText: document.getElementById('question-text'),
                choicesContainer: document.getElementById('choices-container'),
                explanationArea: document.getElementById('explanation-area'),
                explanationText: document.getElementById('explanation-text'),
                nextBtn: document.getElementById('next-btn'),
                questionIdDisplay: document.getElementById('question-id'),
                // Result Elements
                resultScore: document.getElementById('result-score'),
                resultCircle: document.getElementById('result-circle'),
                resultMessage: document.getElementById('result-message'),
                wrongList: document.getElementById('wrong-list-container')
            };

            // Bind Events
            document.getElementById('btn-start-random').addEventListener('click', () => app.startQuiz('random'));
            document.getElementById('btn-start-all').addEventListener('click', () => app.startQuiz('sequential'));

            const resumeBtn = document.getElementById('btn-resume');
            if (resumeBtn) {
                resumeBtn.addEventListener('click', () => app.startQuiz('resume'));
            }

            app.dom.reviewBtn.addEventListener('click', () => app.startQuiz('review'));
            app.dom.nextBtn.addEventListener('click', () => app.nextQuestion());
            document.getElementById('btn-suspend').addEventListener('click', () => app.suspendQuiz());
            document.getElementById('btn-home').addEventListener('click', () => {
                app.renderHome();
                app.switchScreen('home');
            });
            document.getElementById('btn-retry').addEventListener('click', () => app.startQuiz('random'));

            // Initial Render
            app.renderHome();
            app.switchScreen('home');

            console.log("App initialization complete.");
        } catch (error) {
            console.error("App Initialization Failed:", error);
            alert("アプリの初期化中にエラーが発生しました: " + error.message);
        }
    },

    renderHome: () => {
        const data = app.storage.getData();
        const stats = data.stats;

        // Calculate Today's Correct Rate
        const today = new Date().toISOString().split('T')[0];
        const log = data.dailyLog[today];
        const rate = log ? log.correctRate : 0; // Usage of "Today's Rate" as requested

        // Last Session Rate
        const lastSession = app.storage.getLastSessionStats();
        const lastRateText = lastSession ? `前回: ${lastSession.rate}%` : '前回: -';

        app.dom.streakCount.textContent = `${data.streak.current}日連続`;
        app.dom.totalAnswered.textContent = stats.totalQuestions;
        app.dom.correctRate.textContent = `${rate}% (今日)`;

        // Update Last Session Display
        const lastSessionEl = document.getElementById('last-session-rate');
        if (lastSessionEl) lastSessionEl.textContent = lastRateText;

        // Update Calendar
        app.dom.calendarContainer.innerHTML = app.calendar.generateCalendarHTML();

        // Update Review Button State
        const wrongCount = app.storage.getWrongQuestions().length;
        app.dom.reviewBtn.innerHTML = `<span>⚡</span> 間違えた問題のみ (${wrongCount}) - 復習`;
        if (wrongCount === 0) {
            app.dom.reviewBtn.disabled = true;
            app.dom.reviewBtn.style.opacity = '0.5';
        } else {
            app.dom.reviewBtn.disabled = false;
            app.dom.reviewBtn.style.opacity = '1';
        }

        // Handle Resume Button visibility
        const resumeData = app.storage.loadResumeData();
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeData) {
            resumeBtn.style.display = 'flex';
            resumeBtn.innerHTML = `<span>⏯️</span> 続きから再開 (Q.${resumeData.progress.current})`;
        } else {
            resumeBtn.style.display = 'none';
        }

        app.switchScreen('home');
    },

    startQuiz: (mode) => {
        if (mode === 'resume') {
            const data = app.storage.loadResumeData();
            if (data) {
                app.session = data.session;
                // Restore queue and index
                app.questions.currentQueue = data.queue;
                app.questions.currentIndex = data.currentIndex;
                app.storage.clearResumeData(); // connect resume, consume data
                app.renderQuestion();
                app.switchScreen('quiz');
                return;
            }
        }

        const wrongIds = app.storage.getWrongQuestions();
        app.questions.initMode(mode, wrongIds);

        app.session = {
            correct: 0,
            total: 0,
            mode: mode,
            wrongQuestions: []
        };

        app.renderQuestion();
        app.switchScreen('quiz');
    },

    suspendQuiz: () => {
        const progress = app.questions.getProgress();
        const resumeData = {
            session: app.session,
            queue: app.questions.currentQueue,
            currentIndex: app.questions.currentIndex,
            progress: progress
        };
        app.storage.saveResumeData(resumeData);
        app.renderHome();
        app.switchScreen('home');
    },

    renderQuestion: () => {
        const q = app.questions.getCurrentQuestion();
        if (!q) {
            app.finishQuiz();
            return;
        }

        const progress = app.questions.getProgress();
        app.dom.progressBar.style.width = `${((progress.current - 1) / progress.total) * 100}%`;
        app.dom.questionIdDisplay.textContent = `Q.${progress.current} / ${progress.total}`;
        app.dom.questionText.textContent = q.question;

        // Reset UI
        app.dom.choicesContainer.innerHTML = '';
        app.dom.explanationArea.classList.remove('visible');
        app.dom.nextBtn.style.display = 'none';

        // Shuffle choices
        const choicesWithIndex = q.choices.map((choice, idx) => ({
            text: choice,
            originalIndex: idx
        }));

        // Fisher-Yates shuffle
        for (let i = choicesWithIndex.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choicesWithIndex[i], choicesWithIndex[j]] = [choicesWithIndex[j], choicesWithIndex[i]];
        }

        // Find new position of correct answer
        app.currentCorrectIndex = choicesWithIndex.findIndex(item => item.originalIndex === q.answer);

        // Render shuffled choices
        choicesWithIndex.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = item.text;
            btn.onclick = () => app.handleAnswer(index, btn);
            app.dom.choicesContainer.appendChild(btn);
        });
    },

    handleAnswer: (selectedIndex, btnElement) => {
        if (app.dom.nextBtn.style.display === 'block') return; // Prevent double click

        const q = app.questions.getCurrentQuestion();
        const isCorrect = selectedIndex === app.currentCorrectIndex;

        // Visual Feedback
        const buttons = app.dom.choicesContainer.querySelectorAll('.choice-btn');
        buttons[app.currentCorrectIndex].classList.add('correct');
        if (!isCorrect) {
            btnElement.classList.add('wrong');
            app.session.wrongQuestions.push(q);
        }

        // Logic Updates
        app.session.total++;
        if (isCorrect) app.session.correct++;
        app.storage.updateStats(isCorrect, q.id);

        // Sound
        app.sound.play(isCorrect ? 'correct' : 'wrong');

        // Show Explanation
        app.dom.explanationText.textContent = q.explanation;
        app.dom.explanationArea.classList.add('visible');
        app.dom.nextBtn.style.display = 'block';

        // Auto Scroll if needed (mobile)
        setTimeout(() => {
            app.dom.nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
    },

    nextQuestion: () => {
        if (app.questions.next()) {
            app.renderQuestion();
        } else {
            app.finishQuiz();
        }
    },

    finishQuiz: () => {
        app.sound.play('finish');
        app.switchScreen('result');

        const rate = Math.round((app.session.correct / app.session.total) * 100) || 0;

        // Save Last Session Stats
        app.storage.saveLastSessionStats(app.session.correct, app.session.total);

        app.dom.resultScore.textContent = `${rate}%`;
        app.dom.resultCircle.style.background = `conic-gradient(var(--primary) ${rate}%, var(--border) ${rate}%)`;

        app.dom.resultMessage.textContent = `${app.session.total}問中 ${app.session.correct}問正解！`;

        // Render Wrong List
        if (app.session.wrongQuestions.length > 0) {
            app.dom.wrongList.innerHTML = '<h3>復習リスト</h3>' + app.session.wrongQuestions.map(q =>
                `<div class="card" style="margin-top:0.5rem; padding:1rem;">
                    <div style="font-weight:bold; font-size:0.9rem; margin-bottom:0.25rem;">${q.question}</div>
                    <div style="font-size:0.85rem; color:var(--text-light);">${q.explanation}</div>
                </div>`
            ).join('');
        } else {
            app.dom.wrongList.innerHTML = '<div style="text-align:center; padding:2rem;">🎉 全問正解！素晴らしい！</div>';
        }
    },

    switchScreen: (screenName) => {
        app.dom.screens.forEach(s => s.classList.remove('active'));
        app.dom[screenName].classList.add('active');
    }
};

window.onload = app.init;
