import './style.css';
import { Game, GameState } from './game/Game';
import { audioManager } from './audio/AudioManager';
import { i18n, Language } from './i18n';
import { storage } from './storage/LocalStorage';

class App {
    private game: Game | null = null;
    private elements: {
        app: HTMLElement;
        loadingScreen: HTMLElement;
        menuScreen: HTMLElement;
        gameHud: HTMLElement;
        gameOverScreen: HTMLElement;
        settingsPanel: HTMLElement;
        settingsOverlay: HTMLElement;
        scoreDisplay: HTMLElement;
        comboDisplay: HTMLElement;
        livesDisplay: HTMLElement;
        finalScore: HTMLElement;
        newRecordText: HTMLElement;
        highScoreValue: HTMLElement;
    } | null = null;

    async init(): Promise<void> {
        await this.createUI();
        await audioManager.init();
        this.setupGame();
        this.hideLoadingScreen();
        this.updateTranslations();

        // Listen for language changes
        i18n.onChange(() => this.updateTranslations());
    }

    private async createUI(): Promise<void> {
        const app = document.getElementById('app')!;

        app.innerHTML = `
      <div id="loading-screen">
        <div class="loader"></div>
        <p>Loading...</p>
      </div>
      
      <canvas id="game-canvas"></canvas>
      
      <div id="ui-layer">
        <!-- Menu Screen -->
        <div id="menu-screen">
          <div class="floating-dishes">
            ${this.createFloatingDishes()}
          </div>
          <h1 class="game-title" data-i18n="title">Ninja Slicer</h1>
          <p class="menu-subtitle" data-i18n="subtitle">Slice the dishes!</p>
          <div class="high-score">
            <span data-i18n="highScore">Best:</span>
            <span id="high-score-value" class="high-score-value">0</span>
          </div>
          <button id="play-btn" class="btn" data-i18n="play">Play</button>
          <div class="language-selector">
            ${this.createLanguageButtons()}
          </div>
          <button id="settings-btn" class="btn btn-secondary btn-icon" style="margin-top: 1rem;">⚙️</button>
        </div>

        <!-- Game HUD -->
        <div id="game-hud">
          <div class="hud-left">
            <div id="score-display" class="score-display">0</div>
            <div id="combo-display" class="combo-display">
              <span data-i18n="combo">Combo</span> x<span id="combo-value">0</span>
            </div>
          </div>
          <div class="hud-right">
            <div id="lives-display" class="lives-display">
              <span class="life-icon">🍕</span>
              <span class="life-icon">🍕</span>
              <span class="life-icon">🍕</span>
            </div>
            <button id="pause-btn" class="btn btn-secondary btn-icon pause-btn">⏸️</button>
          </div>
        </div>

        <!-- Game Over Screen -->
        <div id="game-over-screen">
          <h2 class="game-over-title" data-i18n="gameOver">Game Over</h2>
          <div id="final-score" class="final-score">0</div>
          <div id="new-record-text" class="new-record" style="display: none;" data-i18n="newRecord">New Record!</div>
          <div class="game-over-buttons">
            <button id="retry-btn" class="btn" data-i18n="tryAgain">Try Again</button>
            <button id="menu-btn" class="btn btn-secondary" data-i18n="menu">Menu</button>
          </div>
        </div>

        <!-- Settings Panel -->
        <div class="settings-overlay" id="settings-overlay"></div>
        <div id="settings-panel" class="glass-panel">
          <h3 class="settings-title" data-i18n="settings">Settings</h3>
          <div class="settings-group">
            <div class="settings-label">
              <span data-i18n="music">Music</span>
              <span id="music-value">${Math.round(storage.musicVolume * 100)}%</span>
            </div>
            <input type="range" id="music-slider" class="slider" min="0" max="100" value="${storage.musicVolume * 100}">
          </div>
          <div class="settings-group">
            <div class="settings-label">
              <span data-i18n="sounds">Sound Effects</span>
              <span id="sfx-value">${Math.round(storage.sfxVolume * 100)}%</span>
            </div>
            <input type="range" id="sfx-slider" class="slider" min="0" max="100" value="${storage.sfxVolume * 100}">
          </div>
          <button id="settings-close-btn" class="btn settings-close" data-i18n="close">Close</button>
        </div>
      </div>
    `;

        this.elements = {
            app,
            loadingScreen: document.getElementById('loading-screen')!,
            menuScreen: document.getElementById('menu-screen')!,
            gameHud: document.getElementById('game-hud')!,
            gameOverScreen: document.getElementById('game-over-screen')!,
            settingsPanel: document.getElementById('settings-panel')!,
            settingsOverlay: document.getElementById('settings-overlay')!,
            scoreDisplay: document.getElementById('score-display')!,
            comboDisplay: document.getElementById('combo-display')!,
            livesDisplay: document.getElementById('lives-display')!,
            finalScore: document.getElementById('final-score')!,
            newRecordText: document.getElementById('new-record-text')!,
            highScoreValue: document.getElementById('high-score-value')!,
        };

        this.setupUIListeners();
        this.updateHighScore();
    }

    private createFloatingDishes(): string {
        const dishes = ['🍕', '🍔', '🍣', '🍩', '🌮', '🌭'];
        let html = '';

        for (let i = 0; i < 8; i++) {
            const dish = dishes[i % dishes.length];
            const left = 10 + (i * 12);
            const top = 20 + (i % 3) * 25;
            const delay = i * 2.5;

            html += `<div class="floating-dish" style="left: ${left}%; top: ${top}%; animation-delay: ${delay}s;">${dish}</div>`;
        }

        return html;
    }

    private createLanguageButtons(): string {
        return i18n.getAllLanguages().map(lang => {
            const isActive = lang === i18n.language;
            return `<button class="lang-btn ${isActive ? 'active' : ''}" data-lang="${lang}">${i18n.getFlag(lang)}</button>`;
        }).join('');
    }

    private setupUIListeners(): void {
        // Play button
        document.getElementById('play-btn')!.addEventListener('click', () => {
            audioManager.play('button');
            this.startGame();
        });

        // Pause button
        document.getElementById('pause-btn')!.addEventListener('click', () => {
            audioManager.play('button');
            if (this.game?.currentState === GameState.PLAYING) {
                this.game.pause();
                this.showPauseOverlay();
            }
        });

        // Retry button
        document.getElementById('retry-btn')!.addEventListener('click', () => {
            audioManager.play('button');
            this.startGame();
        });

        // Menu button
        document.getElementById('menu-btn')!.addEventListener('click', () => {
            audioManager.play('button');
            this.showMenu();
        });

        // Settings button
        document.getElementById('settings-btn')!.addEventListener('click', () => {
            audioManager.play('button');
            this.showSettings();
        });

        // Settings close
        document.getElementById('settings-close-btn')!.addEventListener('click', () => {
            audioManager.play('button');
            this.hideSettings();
        });

        this.elements!.settingsOverlay.addEventListener('click', () => {
            this.hideSettings();
        });

        // Volume sliders
        document.getElementById('music-slider')!.addEventListener('input', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) / 100;
            audioManager.setMusicVolume(value);
            document.getElementById('music-value')!.textContent = `${Math.round(value * 100)}%`;
        });

        document.getElementById('sfx-slider')!.addEventListener('input', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) / 100;
            audioManager.setSfxVolume(value);
            document.getElementById('sfx-value')!.textContent = `${Math.round(value * 100)}%`;
        });

        // Language buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                audioManager.play('button');
                const lang = btn.getAttribute('data-lang') as Language;
                i18n.setLanguage(lang);

                // Update active states
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    private setupGame(): void {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.game = new Game(canvas);

        this.game.setCallbacks({
            onScoreChange: (score) => this.updateScore(score),
            onComboChange: (combo) => this.updateCombo(combo),
            onLivesChange: (lives) => this.updateLives(lives),
            onStateChange: (state) => this.handleStateChange(state),
            onGameOver: (score, isNewRecord) => this.handleGameOver(score, isNewRecord),
        });
    }

    private startGame(): void {
        this.elements!.menuScreen.classList.add('hidden');
        this.elements!.gameOverScreen.classList.remove('visible');
        this.elements!.gameHud.classList.add('visible');

        this.game?.start();
    }

    private showMenu(): void {
        this.elements!.menuScreen.classList.remove('hidden');
        this.elements!.gameOverScreen.classList.remove('visible');
        this.elements!.gameHud.classList.remove('visible');
        this.updateHighScore();
    }

    private showPauseOverlay(): void {
        // Simple pause - click anywhere to resume
        const overlay = document.createElement('div');
        overlay.id = 'pause-overlay';
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 50;
      cursor: pointer;
    `;
        overlay.innerHTML = `
      <h2 style="font-size: 3rem; color: white; margin-bottom: 1rem;" data-i18n="paused">${i18n.t('paused')}</h2>
      <p style="color: #b8b8d1;" data-i18n="resume">${i18n.t('resume')}</p>
    `;

        overlay.addEventListener('click', () => {
            overlay.remove();
            this.game?.resume();
        });

        document.body.appendChild(overlay);
    }

    private showSettings(): void {
        this.elements!.settingsPanel.classList.add('visible');
        this.elements!.settingsOverlay.classList.add('visible');
    }

    private hideSettings(): void {
        this.elements!.settingsPanel.classList.remove('visible');
        this.elements!.settingsOverlay.classList.remove('visible');
    }

    private hideLoadingScreen(): void {
        this.elements!.loadingScreen.classList.add('hidden');
    }

    private updateScore(score: number): void {
        this.elements!.scoreDisplay.textContent = score.toString();
        this.elements!.scoreDisplay.classList.remove('pop');
        void this.elements!.scoreDisplay.offsetWidth; // Trigger reflow
        this.elements!.scoreDisplay.classList.add('pop');
    }

    private updateCombo(combo: number): void {
        const comboDisplay = this.elements!.comboDisplay;
        const comboValue = document.getElementById('combo-value')!;

        if (combo > 0) {
            comboValue.textContent = combo.toString();
            comboDisplay.classList.add('visible');

            if (combo >= 5) {
                comboDisplay.classList.add('mega');
            } else {
                comboDisplay.classList.remove('mega');
            }
        } else {
            comboDisplay.classList.remove('visible', 'mega');
        }
    }

    private updateLives(lives: number): void {
        const lifeIcons = this.elements!.livesDisplay.querySelectorAll('.life-icon');
        lifeIcons.forEach((icon, index) => {
            if (index < lives) {
                icon.classList.remove('lost');
            } else {
                icon.classList.add('lost');
            }
        });
    }

    private updateHighScore(): void {
        this.elements!.highScoreValue.textContent = this.game?.highScore.toString() || '0';
    }

    private handleStateChange(_state: GameState): void {
        // State-specific UI updates handled elsewhere
    }

    private handleGameOver(score: number, isNewRecord: boolean): void {
        this.elements!.finalScore.textContent = score.toString();
        this.elements!.newRecordText.style.display = isNewRecord ? 'block' : 'none';
        this.elements!.gameHud.classList.remove('visible');

        // Delay showing game over screen for dramatic effect
        setTimeout(() => {
            this.elements!.gameOverScreen.classList.add('visible');
        }, 500);

        this.updateHighScore();
    }

    private updateTranslations(): void {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n') as keyof typeof import('./i18n/en.json');
            if (key) {
                el.textContent = i18n.t(key);
            }
        });
    }
}

// Initialize app
const app = new App();
app.init().catch(console.error);
