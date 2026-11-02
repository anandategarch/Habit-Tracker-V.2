import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Habit } from "@/lib/types";
import { IconAction, PageIntro } from "@/components/ui/primitives";

export function CalendarView({ habits }: { habits: Habit[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const today = new Date();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array((firstDay + 6) % 7).fill(0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);
  return (
    <>
      <PageIntro eyebrow="RIWAYAT DAN RENCANA" title="Lihat perjalananmu." subtitle="Setiap tanda kecil adalah bukti kamu sudah berusaha." />
      <div className="calendar-layout">
        <section className="card card-pad">
          <div className="calendar-head">
            <div className="calendar-month">{monthLabel}</div>
            <div style={{ display: "flex", gap: 7 }}>
              <IconAction label="Bulan sebelumnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></IconAction>
              <IconAction label="Bulan berikutnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></IconAction>
            </div>
          </div>
          <div className="calendar-grid">
            {["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {cells.map((day, index) => day === 0
              ? <div key={`blank-${index}`} />
              : <button key={day} className={`calendar-day ${day === selectedDay ? "selected" : ""} ${day === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear() ? "today" : ""} ${day % 2 === 0 ? "has-activity" : ""}`} onClick={() => setSelectedDay(day)}>{day}</button>)}
          </div>
        </section>
        <aside className="calendar-summary">
          <div className="small-label">RINGKASAN TANGGAL</div>
          <div className="calendar-summary-date">{selectedDay} {monthLabel.split(" ")[0]}</div>
          <div className="activity-line"><span className="activity-dot" />{habits.filter((habit) => habit.completed).length} habit selesai hari ini</div>
          <div className="activity-line"><span className="activity-dot" />{habits.length} habit terjadwal</div>
          <p className="section-caption" style={{ marginTop: 19 }}>Kalender ini masih memakai data demo. Riwayat check-in per tanggal akan dikembangkan pada tahap berikutnya.</p>
        </aside>
      </div>
    </>
  );
}
