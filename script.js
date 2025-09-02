class LifeCalendar {
    constructor() {
        this.birthDate = null;
        this.lifeExpectancy = 85;
        this.currentView = 'days';
        this.selectedPeriods = new Set();
        this.customColors = new Map();
        this.notes = new Map(); // Store notes for periods
        this.isMobile = this.detectMobile();
        this.touchStartTime = 0;
        this.isSelecting = false;
        this.currentEditingPeriod = null;
        this.hidePastPeriods = false;
        this.actionHistory = []; // История действий для отмены
        
        this.initializeElements();
        this.loadSettings();
        this.bindEvents();
        this.updateCalendar();
        this.optimizeForMobile();
    }

    initializeElements() {
        this.birthDateInput = document.getElementById('birthDate');
        this.lifeExpectancyInput = document.getElementById('lifeExpectancy');
        this.viewButtons = document.querySelectorAll('.view-btn');
        this.colorPicker = document.getElementById('colorPicker');
        this.applyColorBtn = document.getElementById('applyColor');
        this.clearSelectionBtn = document.getElementById('clearSelection');
        this.undoBtn = document.getElementById('undoLastAction');
        this.calendar = document.getElementById('calendar');
        this.livedCountElement = document.getElementById('livedCount');
        this.remainingCountElement = document.getElementById('remainingCount');
        this.progressPercentElement = document.getElementById('progressPercent');
        this.livedUnitElement = document.getElementById('livedUnit');
        this.remainingUnitElement = document.getElementById('remainingUnit');
        
        // Hide past periods control
        this.hidePastPeriodsCheckbox = document.getElementById('hidePastPeriods');
        
        // Notes modal elements
        this.notesModal = document.getElementById('notesModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalPeriodInfo = document.getElementById('modalPeriodInfo');
        this.noteInput = document.getElementById('noteInput');
        this.noteColorPicker = document.getElementById('noteColorPicker');
        this.saveNoteBtn = document.getElementById('saveNote');
        this.deleteNoteBtn = document.getElementById('deleteNote');
        this.cancelNoteBtn = document.getElementById('cancelNote');
        this.closeModalBtn = document.getElementById('closeModal');
    }

    bindEvents() {
        this.birthDateInput.addEventListener('change', () => {
            this.birthDate = new Date(this.birthDateInput.value);
            this.updateCalendar();
            this.saveSettings();
        });

        this.lifeExpectancyInput.addEventListener('input', () => {
            this.lifeExpectancy = parseInt(this.lifeExpectancyInput.value);
            this.updateCalendar();
            this.saveSettings();
        });

        this.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.view);
            });
        });

        this.clearSelectionBtn.addEventListener('click', () => {
            this.clearSelection();
        });

        // Применение цвета к выделенным периодам
        this.colorPicker.addEventListener('change', () => {
            this.applyColorToSelected();
        });

        // Кнопка применения цвета
        this.applyColorBtn.addEventListener('click', () => {
            this.applyColorToSelected();
        });

        // Кнопка отмены
        this.undoBtn.addEventListener('click', () => {
            this.undoLastAction();
        });

        // Hide past periods toggle
        this.hidePastPeriodsCheckbox.addEventListener('change', () => {
            this.hidePastPeriods = this.hidePastPeriodsCheckbox.checked;
            this.updateCalendar();
            this.saveSettings();
        });

        // Notes modal events
        this.saveNoteBtn.addEventListener('click', () => {
            this.saveNote();
        });

        this.deleteNoteBtn.addEventListener('click', () => {
            this.deleteNote();
        });

        this.cancelNoteBtn.addEventListener('click', () => {
            this.closeNotesModal();
        });

        this.closeModalBtn.addEventListener('click', () => {
            this.closeNotesModal();
        });

        // Close modal when clicking outside
        this.notesModal.addEventListener('click', (e) => {
            if (e.target === this.notesModal) {
                this.closeNotesModal();
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.notesModal.classList.contains('show')) {
                this.closeNotesModal();
            }
        });

        // Enhanced event handling for mobile and desktop
        if (this.isMobile) {
            this.bindMobileEvents();
        } else {
            this.bindDesktopEvents();
        }
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    bindMobileEvents() {
        // Простое касание для выбора периода
        this.calendar.addEventListener('touchstart', (e) => {
            this.touchStartTime = Date.now();
            this.isSelecting = false;
            
            if (e.target.classList.contains('period')) {
                e.preventDefault(); // Предотвращаем default поведение
                this.handleTouchStart(e.target, e);
            }
        }, { passive: false });

        this.calendar.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - this.touchStartTime;
            
            // Только выбор периода одиночным касанием
            if (e.target.classList.contains('period') && touchDuration < 500 && !this.isSelecting) {
                e.preventDefault();
                this.togglePeriodSelection(e.target);
            }
            
            this.hideTooltip();
            this.isSelecting = false;
        }, { passive: false });

        // Обработка двойного касания только для заметок
        let lastTapTime = 0;
        let tapCount = 0;
        let tapTimeout;
        
        this.calendar.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('period')) {
                const currentTime = Date.now();
                const tapDelay = currentTime - lastTapTime;
                
                clearTimeout(tapTimeout);
                
                if (tapDelay < 400 && tapDelay > 0) {
                    tapCount++;
                    if (tapCount === 2) {
                        // Двойное касание - открываем заметки
                        e.preventDefault();
                        e.stopPropagation();
                        this.openNotesModal(e.target);
                        tapCount = 0;
                        return;
                    }
                } else {
                    tapCount = 1;
                }
                
                lastTapTime = currentTime;
                
                // Сброс счетчика касаний
                tapTimeout = setTimeout(() => {
                    tapCount = 0;
                }, 400);
            }
        });

        // Длинное нажатие для подсказки
        let longPressTimer;
        this.calendar.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('period')) {
                longPressTimer = setTimeout(() => {
                    this.isSelecting = true;
                    this.showTooltip(e.target, {
                        pageX: e.touches[0].pageX,
                        pageY: e.touches[0].pageY
                    });
                    
                    // Вибрация если доступна
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }, 500); // Увеличили время до 500мс
            }
        });

        this.calendar.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });

        this.calendar.addEventListener('touchmove', (e) => {
            clearTimeout(longPressTimer);
            if (this.isSelecting) {
                e.preventDefault();
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                
                if (element && element.classList.contains('period')) {
                    this.showTooltip(element, {
                        pageX: touch.pageX,
                        pageY: touch.pageY
                    });
                }
            }
        }, { passive: false });
    }

    bindDesktopEvents() {
        // Клик для выбора периода
        this.calendar.addEventListener('click', (e) => {
            if (e.target.classList.contains('period')) {
                this.togglePeriodSelection(e.target);
            }
        });

        // Двойной клик ТОЛЬКО для заметок на всех устройствах
        this.calendar.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('period')) {
                e.preventDefault();
                e.stopPropagation();
                this.openNotesModal(e.target);
            }
        });

        this.calendar.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('period')) {
                this.showTooltip(e.target, e);
            }
        });

        this.calendar.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('period')) {
                this.hideTooltip();
            }
        });
    }

    handleTouchStart(element, event) {
        // Provide immediate visual feedback
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    optimizeForMobile() {
        if (this.isMobile) {
            // Adjust default view for mobile based on screen size
            if (window.innerWidth < 480) {
                this.setView('months'); // Start with months view on small screens for better visibility
            } else if (window.innerWidth < 768) {
                this.setView('weeks'); // Start with weeks view on medium screens
            }
            
            // Add mobile-specific classes
            document.body.classList.add('mobile-device');
            
            // Prevent zoom on input focus (iOS)
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    if (input.type !== 'date' && input.type !== 'number') {
                        input.style.fontSize = '16px';
                    }
                });
            });
            
            // Add viewport meta adjustments for better mobile experience
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0';
            }
        }
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateCalendar();
                // Re-detect mobile status after orientation change
                this.isMobile = this.detectMobile();
            }, 100);
        });
        
        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateCalendar();
                // Re-detect mobile status on resize
                this.isMobile = this.detectMobile();
                if (this.isMobile) {
                    document.body.classList.add('mobile-device');
                } else {
                    document.body.classList.remove('mobile-device');
                }
            }, 250);
        });
    }

    setView(view) {
        this.currentView = view;
        
        // Обновляем активную кнопку
        this.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Обновляем класс календаря с учетом мобильной оптимизации
        this.calendar.className = `calendar ${view}`;
        if (this.isMobile) {
            this.calendar.classList.add('mobile-optimized');
        }
        
        // Обновляем единицы измерения в статистике
        const units = {
            days: 'дней',
            weeks: 'недель', 
            months: 'месяцев',
            years: 'лет'
        };
        
        this.livedUnitElement.textContent = units[view];
        this.remainingUnitElement.textContent = units[view];
        
        this.updateCalendar();
        this.saveSettings();
    }

    calculateLifeStats() {
        if (!this.birthDate) return null;

        const now = new Date();
        const birthTime = this.birthDate.getTime();
        const currentTime = now.getTime();
        const deathDate = new Date(this.birthDate);
        deathDate.setFullYear(deathDate.getFullYear() + this.lifeExpectancy);
        const deathTime = deathDate.getTime();

        const totalLifeMs = deathTime - birthTime;
        const livedMs = currentTime - birthTime;
        const remainingMs = deathTime - currentTime;

        const msPerDay = 1000 * 60 * 60 * 24;
        const msPerWeek = msPerDay * 7;
        const msPerMonth = msPerDay * 30.44; // Среднее количество дней в месяце
        const msPerYear = msPerDay * 365.25; // Учитываем високосные годы

        const conversions = {
            days: msPerDay,
            weeks: msPerWeek,
            months: msPerMonth,
            years: msPerYear
        };

        const currentConversion = conversions[this.currentView];

        return {
            lived: Math.floor(livedMs / currentConversion),
            remaining: Math.max(0, Math.floor(remainingMs / currentConversion)),
            total: Math.floor(totalLifeMs / currentConversion),
            progress: Math.min(100, (livedMs / totalLifeMs) * 100),
            isAlive: currentTime < deathTime
        };
    }

    updateCalendar() {
        const stats = this.calculateLifeStats();
        
        if (!stats) {
            this.calendar.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Введите дату рождения для начала</p>';
            this.updateStats(null);
            return;
        }

        this.updateStats(stats);
        this.renderCalendar(stats);
    }

    updateStats(stats) {
        if (!stats) {
            this.livedCountElement.textContent = '0';
            this.remainingCountElement.textContent = '0';
            this.progressPercentElement.textContent = '0%';
            return;
        }

        this.livedCountElement.textContent = stats.lived.toLocaleString();
        this.remainingCountElement.textContent = stats.remaining.toLocaleString();
        this.progressPercentElement.textContent = `${stats.progress.toFixed(1)}%`;
    }

    renderCalendar(stats) {
        this.calendar.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < stats.total; i++) {
            const period = document.createElement('div');
            period.className = 'period';
            period.dataset.index = i;
            
            // Add data attributes for months and years display
            if (this.currentView === 'months') {
                const date = new Date(this.birthDate);
                date.setMonth(date.getMonth() + i);
                const monthName = date.toLocaleDateString('ru-RU', { month: 'short' });
                const year = date.getFullYear();
                period.dataset.month = `${monthName} ${year}`;
            } else if (this.currentView === 'years') {
                const year = this.birthDate.getFullYear() + i;
                period.dataset.year = year.toString();
            }
            
            // Determine period type and apply styles
            let isPastPeriod = false;
            if (i < stats.lived) {
                period.classList.add('lived');
                isPastPeriod = true;
            } else if (i === stats.lived && stats.isAlive) {
                period.classList.add('current');
            } else {
                period.classList.add('remaining');
            }
            
            // Hide past periods if option is enabled
            if (this.hidePastPeriods && isPastPeriod) {
                period.classList.add('hidden');
            }
            
            // Применяем пользовательские цвета
            if (this.customColors.has(i)) {
                period.style.backgroundColor = this.customColors.get(i);
            }
            
            if (this.selectedPeriods.has(i)) {
                period.classList.add('selected');
            }
            
            // Добавляем индикатор заметки
            if (this.notes.has(i)) {
                period.classList.add('has-note');
            }
            
            fragment.appendChild(period);
        }
        
        this.calendar.appendChild(fragment);
    }

    togglePeriodSelection(periodElement) {
        const index = parseInt(periodElement.dataset.index);
        
        if (this.selectedPeriods.has(index)) {
            // Убираем выделение
            this.selectedPeriods.delete(index);
            periodElement.classList.remove('selected');
            this.customColors.delete(index);
            periodElement.style.backgroundColor = '';
        } else {
            // Просто добавляем в выделенные, но не окрашиваем
            this.selectedPeriods.add(index);
            periodElement.classList.add('selected');
            // НЕ применяем цвет автоматически
        }
        
        this.saveSettings();
    }

    saveActionToHistory(action, data) {
        this.actionHistory.push({
            action: action,
            data: data,
            timestamp: Date.now()
        });
        
        // Ограничиваем историю 50 действиями
        if (this.actionHistory.length > 50) {
            this.actionHistory.shift();
        }
    }

    undoLastAction() {
        if (this.actionHistory.length === 0) {
            return;
        }
        
        const lastAction = this.actionHistory.pop();
        
        switch (lastAction.action) {
            case 'applyColor':
                // Отменяем применение цвета
                lastAction.data.periods.forEach(index => {
                    if (lastAction.data.previousColors.has(index)) {
                        this.customColors.set(index, lastAction.data.previousColors.get(index));
                    } else {
                        this.customColors.delete(index);
                    }
                });
                break;
                
            case 'clearSelection':
                // Восстанавливаем выделение
                this.selectedPeriods = new Set(lastAction.data.selectedPeriods);
                this.customColors = new Map(lastAction.data.customColors);
                break;
                
            case 'addNote':
                // Удаляем заметку
                this.notes.delete(lastAction.data.index);
                if (lastAction.data.hadColor) {
                    this.customColors.set(lastAction.data.index, lastAction.data.previousColor);
                } else {
                    this.customColors.delete(lastAction.data.index);
                    this.selectedPeriods.delete(lastAction.data.index);
                }
                break;
        }
        
        this.updateCalendar();
        this.saveSettings();
    }

    applyColorToSelected() {
        if (this.selectedPeriods.size === 0) {
            return; // Ничего не выделено
        }
        
        const color = this.colorPicker.value;
        const previousColors = new Map();
        
        // Сохраняем предыдущие цвета для отмены
        this.selectedPeriods.forEach(index => {
            if (this.customColors.has(index)) {
                previousColors.set(index, this.customColors.get(index));
            }
        });
        
        // Сохраняем действие в истории
        this.saveActionToHistory('applyColor', {
            periods: Array.from(this.selectedPeriods),
            newColor: color,
            previousColors: previousColors
        });
        
        // Применяем цвет
        this.selectedPeriods.forEach(index => {
            this.customColors.set(index, color);
            const periodElement = document.querySelector(`[data-index="${index}"]`);
            if (periodElement) {
                periodElement.style.backgroundColor = color;
            }
        });
        
        this.saveSettings();
    }

    clearSelection() {
        if (this.selectedPeriods.size === 0 && this.customColors.size === 0) {
            return; // Ничего нет для очистки
        }
        
        // Сохраняем состояние для отмены
        this.saveActionToHistory('clearSelection', {
            selectedPeriods: Array.from(this.selectedPeriods),
            customColors: Array.from(this.customColors.entries())
        });
        
        this.selectedPeriods.clear();
        this.customColors.clear();
        
        document.querySelectorAll('.period.selected').forEach(period => {
            period.classList.remove('selected');
            period.style.backgroundColor = '';
        });
        
        this.updateCalendar();
        this.saveSettings();
    }

    showTooltip(element, event) {
        const index = parseInt(element.dataset.index);
        const stats = this.calculateLifeStats();
        
        if (!stats) return;
        
        let tooltipText = '';
        const periodNum = index + 1;
        
        if (element.classList.contains('lived')) {
            tooltipText = `Прожито: ${periodNum} ${this.getUnitName(this.currentView)}`;
        } else if (element.classList.contains('current')) {
            tooltipText = `Текущий ${this.getUnitName(this.currentView, true)}: ${periodNum}`;
        } else {
            tooltipText = `Будущее: ${periodNum} ${this.getUnitName(this.currentView)}`;
        }
        
        // Добавляем информацию о дате для некоторых видов
        if (this.currentView === 'days') {
            const date = new Date(this.birthDate);
            date.setDate(date.getDate() + index);
            const formattedDate = date.toLocaleDateString('ru-RU');
            tooltipText += ` (${formattedDate})`;
        } else if (this.currentView === 'years') {
            const year = this.birthDate.getFullYear() + index;
            tooltipText += ` (${year} год)`;
        }
        
        // Добавляем заметку, если есть
        const note = this.notes.get(index);
        if (note) {
            tooltipText += `\n\n📝 ${note.text}`;
        }
        
        // Подсказка о двойном клике для всех устройств
        if (this.isMobile) {
            tooltipText += note ? '\n\nДвойное касание - редактировать' : '\n\nДвойное касание - добавить заметку';
        } else {
            tooltipText += note ? '\n\nДвойной клик - редактировать' : '\n\nДвойной клик - добавить заметку';
        }
        
        this.createTooltip(tooltipText, event.pageX, event.pageY);
    }

    getUnitName(view, singular = false) {
        const units = {
            days: singular ? 'день' : 'дней',
            weeks: singular ? 'неделя' : 'недель',
            months: singular ? 'месяц' : 'месяцев', 
            years: singular ? 'год' : 'лет'
        };
        return units[view];
    }

    createTooltip(text, x, y) {
        this.removeTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y - 30}px`;
        
        document.body.appendChild(tooltip);
    }

    hideTooltip() {
        this.removeTooltip();
    }

    removeTooltip() {
        const existingTooltip = document.querySelector('.tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }

    openNotesModal(periodElement) {
        const index = parseInt(periodElement.dataset.index);
        const stats = this.calculateLifeStats();
        
        if (!stats) return;
        
        this.currentEditingPeriod = index;
        
        // Определяем информацию о периоде
        let periodInfo = '';
        const periodNum = index + 1;
        
        if (this.currentView === 'days') {
            const date = new Date(this.birthDate);
            date.setDate(date.getDate() + index);
            periodInfo = `День ${periodNum} (${date.toLocaleDateString('ru-RU')})`;
        } else if (this.currentView === 'weeks') {
            const weekNum = Math.floor(index / 7) + 1;
            periodInfo = `Неделя ${periodNum}`;
        } else if (this.currentView === 'months') {
            const date = new Date(this.birthDate);
            date.setMonth(date.getMonth() + index);
            periodInfo = `Месяц ${periodNum} (${date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })})`;
        } else if (this.currentView === 'years') {
            const year = this.birthDate.getFullYear() + index;
            periodInfo = `Год ${periodNum} (${year})`;
        }
        
        this.modalPeriodInfo.textContent = periodInfo;
        
        // Загружаем существующую заметку
        const existingNote = this.notes.get(index);
        if (existingNote) {
            this.noteInput.value = existingNote.text;
            this.noteColorPicker.value = existingNote.color;
            this.deleteNoteBtn.style.display = 'inline-block';
        } else {
            this.noteInput.value = '';
            this.noteColorPicker.value = this.customColors.get(index) || '#ff6b6b';
            this.deleteNoteBtn.style.display = 'none';
        }
        
        // Показываем модальное окно
        this.notesModal.classList.add('show');
        
        // Фокус на поле ввода через небольшую задержку
        setTimeout(() => {
            this.noteInput.focus();
        }, 100);
    }

    closeNotesModal() {
        this.notesModal.classList.remove('show');
        this.currentEditingPeriod = null;
    }

    saveNote() {
        if (this.currentEditingPeriod === null) return;
        
        const noteText = this.noteInput.value.trim();
        const noteColor = this.noteColorPicker.value;
        const index = this.currentEditingPeriod;
        
        // Сохраняем предыдущее состояние
        const hadNote = this.notes.has(index);
        const hadColor = this.customColors.has(index);
        const previousColor = hadColor ? this.customColors.get(index) : null;
        
        if (noteText) {
            // Сохраняем действие в истории только если это новая заметка
            if (!hadNote) {
                this.saveActionToHistory('addNote', {
                    index: index,
                    hadColor: hadColor,
                    previousColor: previousColor
                });
            }
            
            // Сохраняем заметку
            this.notes.set(index, {
                text: noteText,
                color: noteColor,
                timestamp: Date.now()
            });
            
            // Устанавливаем цвет
            this.customColors.set(index, noteColor);
            this.selectedPeriods.add(index);
        } else {
            // Если текст пустой, удаляем заметку
            this.notes.delete(index);
            
            // Оставляем цвет, если он был установлен
            this.customColors.set(index, noteColor);
            this.selectedPeriods.add(index);
        }
        
        this.updateCalendar();
        this.saveSettings();
        this.closeNotesModal();
    }

    deleteNote() {
        if (this.currentEditingPeriod === null) return;
        
        // Удаляем заметку и выделение
        this.notes.delete(this.currentEditingPeriod);
        this.customColors.delete(this.currentEditingPeriod);
        this.selectedPeriods.delete(this.currentEditingPeriod);
        
        this.updateCalendar();
        this.saveSettings();
        this.closeNotesModal();
    }

    saveSettings() {
        const settings = {
            birthDate: this.birthDate ? this.birthDate.toISOString() : null,
            lifeExpectancy: this.lifeExpectancy,
            currentView: this.currentView,
            selectedPeriods: Array.from(this.selectedPeriods),
            customColors: Array.from(this.customColors.entries()),
            notes: Array.from(this.notes.entries()),
            hidePastPeriods: this.hidePastPeriods
        };
        
        localStorage.setItem('lifeCalendarSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('lifeCalendarSettings');
        
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                
                if (settings.birthDate) {
                    this.birthDate = new Date(settings.birthDate);
                    this.birthDateInput.value = this.birthDate.toISOString().split('T')[0];
                }
                
                if (settings.lifeExpectancy) {
                    this.lifeExpectancy = settings.lifeExpectancy;
                    this.lifeExpectancyInput.value = this.lifeExpectancy;
                }
                
                if (settings.currentView) {
                    this.setView(settings.currentView);
                }
                
                if (settings.selectedPeriods) {
                    this.selectedPeriods = new Set(settings.selectedPeriods);
                }
                
                if (settings.customColors) {
                    this.customColors = new Map(settings.customColors);
                }
                
                if (settings.notes) {
                    this.notes = new Map(settings.notes);
                }
                
                if (settings.hidePastPeriods !== undefined) {
                    this.hidePastPeriods = settings.hidePastPeriods;
                    this.hidePastPeriodsCheckbox.checked = this.hidePastPeriods;
                }
            } catch (error) {
                console.error('Ошибка загрузки настроек:', error);
            }
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new LifeCalendar();
});