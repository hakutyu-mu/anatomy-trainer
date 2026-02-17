/**
 * soundManager.js
 * Handles audio playback for correct/incorrect answers.
 */

class SoundManager {
    constructor() {
        this.enabled = true;
        this.context = null;
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
        this.sounds = {
            correct: 'assets/correct.mp3',
            wrong: 'assets/wrong.mp3',
            finish: 'assets/finish.mp3'
        };
    }

    toggle(state) {
        this.enabled = state !== undefined ? state : !this.enabled;
        return this.enabled;
    }

    play(type) {
        if (!this.enabled || !this.context) return;
        this._playSynth(type);
    }

    _playSynth(type) {
        if (!this.context) return;
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        if (type === 'correct') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, this.context.currentTime); // A5
            oscillator.frequency.exponentialRampToValueAtTime(1760, this.context.currentTime + 0.1); // A6
            gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.3);
        } else if (type === 'wrong') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, this.context.currentTime);
            oscillator.frequency.linearRampToValueAtTime(100, this.context.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.3);
        } else if (type === 'finish') {
            // Simple arpeggio
            const now = this.context.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                osc.connect(gain);
                gain.connect(this.context.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.4);
            });
        }
    }
}

window.SoundManager = SoundManager;
