import type { Habit } from "@/lib/types";
import { formatCompactRupiah } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { PageIntro, SectionHeading } from "@/components/ui/primitives";

export function InsightsView({ habits, income, expense }: { habits: Habit[]; income: number; expense: number }) {
  const { completed, progress: consistency } = summarizeHabits(habits);
  const values = [45, 62, 51, 78, 66, 85, consistency];
  return (
    <>
      <PageIntro eyebrow="REFLEKSI PERKEMBANGAN" title="Lihat yang sudah tumbuh." subtitle="Gunakan pola sederhana untuk memahami perjalananmu." />
      <div className="insight-grid">
        <section className="card card-pad">
          <SectionHeading title="Konsistensi kebiasaan" caption="Aktivitas mingguan · ilustrasi data demo" />
          <div className="chart-bars">
            {values.map((height, index) => <div className="chart-column" key={index}><div className={`chart-bar ${index === 6 ? "active" : ""}`} style={{ height: `${height}%` }} /><span className="chart-label">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"][index]}</span></div>)}
          </div>
        </section>
        <div className="right-stack">
          <section className="insight-highlight">
            <div className="small-label">PROGRESS HARI INI</div>
            <div className="insight-number">{consistency}%</div>
            <p className="section-caption">{completed} dari {habits.length} habit berhasil diselesaikan.</p>
          </section>
          <section className="card card-pad">
            <SectionHeading title="Arus kas tercatat" caption="Ringkasan dari transaksi demo" />
            <div style={{ display: "grid", gap: 14 }}>
              <div><div className="small-label">PEMASUKAN</div><div className="metric-value metric-positive" style={{ marginTop: 5 }}>{formatCompactRupiah(income)}</div></div>
              <div><div className="small-label">PENGELUARAN</div><div className="metric-value metric-negative" style={{ marginTop: 5 }}>{formatCompactRupiah(expense)}</div></div>
              <div><div className="small-label">BERSIH</div><div className="metric-value" style={{ marginTop: 5 }}>{formatCompactRupiah(income - expense)}</div></div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
