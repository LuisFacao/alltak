import { Memoria } from "../main.js";
import { Formata } from "../util.js";
import { Database } from "../banco.js";
import { Admin } from "./admin.js";

export const Calendario = {
  criarEventos(list) {
    const map = {};
    (list || []).forEach(ev => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push({ id: ev.id, title: ev.title, color: ev.color });
    });
    return map;
  },

  build() {
    const grid = document.getElementById('cal-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if(!grid) return;
    grid.innerHTML = '';
    monthYearLabel.innerText = `${Memoria.monthNames[Memoria.currentMonth]} ${Memoria.currentYear}`;

    const dows = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    dows.forEach(d => grid.innerHTML += `<div class="cal-dow">${d}</div>`);

    const firstDay = new Date(Memoria.currentYear, Memoria.currentMonth, 1).getDay();
    const totalDays = new Date(Memoria.currentYear, Memoria.currentMonth + 1, 0).getDate();

    for(let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="cal-cell muted"></div>`;

    for(let day = 1; day <= totalDays; day++) {
      const dateStr = `${Memoria.currentYear}-${String(Memoria.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let evtsHtml = Memoria.eventsData[dateStr] ? '<div class="cal-evt-wrap">' + Memoria.eventsData[dateStr].map(e => `<div class="cal-evt" style="background:${e.color}"></div>`).join('') + '</div>' : '';

      grid.innerHTML += `<div class="cal-cell" onclick="showDayEvents('${dateStr}', ${day})">${day}${evtsHtml}</div>`;
    }
  },

  changeMonth(dir) {
    Memoria.currentMonth += dir;
    if(Memoria.currentMonth > 11) { Memoria.currentMonth = 0; Memoria.currentYear++; }
    if(Memoria.currentMonth < 0) { Memoria.currentMonth = 11; Memoria.currentYear--; }
    Calendario.build();
  },

  showDayEvent(dateStr, day) {
    const container = document.getElementById('cal-day-events');
    if(!container) return;
    container.innerHTML = `<h4 style="margin-bottom:8px;">Dia ${day}</h4>`;
    if(Memoria.eventsData[dateStr]) {
      Memoria.eventsData[dateStr].forEach(e => {
        container.innerHTML += `<div class="evt-row"><span class="evt-dot" style="background:${e.color}"></span><span>${Formata.escapeHtml(e.title)}</span></div>`;
      });
    } else {
      container.innerHTML += '<p style="font-size:12px; color:#788e9e;">Nenhum evento.</p>';
    }
  },

  async submitForm(e) {
    e.preventDefault();
    const date = document.getElementById('event-date').value;
    const title = document.getElementById('event-title').value.trim();
    const color = document.getElementById('event-color').value;

    try {
      await Database.createEvent(date, title, color);
      Memoria.eventsData = Calendario.criarEventos(await Database.getEvents());
      document.getElementById('event-form').reset();
      Calendario.build(); Admin.eventsRender();
    } catch (err) {
      alert(err.message);
    }
  },

  async eventDelete(eventId) {
    if(confirm("Excluir este evento da agenda?")) {
      try {
        await Database.deleteEvent(eventId);
        Memoria.eventsData = Calendario.criarEventos(await Database.getEvents());
        Admin.eventsRender();
      } catch (err) {
        alert(err.message);
      }
    }
  }
};