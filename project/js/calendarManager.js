/**
 * calendarManager.js
 */

class CalendarManager {
    constructor(storageManager) {
        this.storage = storageManager;
    }

    generateCalendarHTML(year, month) {
        const data = this.storage.getData();
        const logs = data.dailyLog;
        const now = new Date();

        // Use provided year/month or current
        const y = year || now.getFullYear();
        const m = month !== undefined ? month : now.getMonth();

        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);

        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay(); // 0 = Sunday

        let html = '<div class="calendar-grid">';

        // Headers
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        days.forEach(d => html += `<div class="cal-header">${d}</div>`);

        // Empty cells
        for (let i = 0; i < startDay; i++) {
            html += '<div class="cal-day empty"></div>';
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const log = logs[dateStr];
            let classes = 'cal-day';

            if (log) {
                classes += ' active';
                // Heatmap effect based on count or specific color for visited
                // Heatmap logic could be added here
            }

            // Highlight streak logic can be complex, simplifying to "active if played"

            html += `<div class="${classes}" data-date="${dateStr}">
                <span class="day-num">${d}</span>
                ${log ? `<div style="font-size:0.6rem; margin-top:2px;">${log.correctRate}%</div>` : ''}
            </div>`;
        }

        html += '</div>';
        return html;
    }
}

window.CalendarManager = CalendarManager;
