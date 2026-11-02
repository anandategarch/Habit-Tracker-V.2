import { Activity, ArrowDownLeft, ArrowUpRight, Flame, PiggyBank, Sprout, Target } from "lucide-react";
import type { Habit } from "@/lib/types";
import { formatCompactRupiah } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { PageIntro, SectionHeading, StatCard } from "@/components/ui/primitives";

const habitCategories: Habit["category"][] = ["Health", "Learning", "Mindfulness", "Personal"];

export function InsightsView({ habits, income, expense }: { habits: Habit[]; income: number; expense: number }) {
  const { completed, total, progress, longestStreak } = summarizeHabits(habits);
  const categorySummary = habitCategories.map((category) => ({
    category,
    total: habits.filter((habit) => habit.category === category).length,
    completed: habits.filter((habit) => habit.category === category && habit.completed).length,
  })).filter((item) => item.total > 0);
  const totalNet = income - expense;

  return (
    <>
      <PageIntro eyebrow="REFLEKSI PERKEMBANGAN" title="Lihat yang sudah tumbuh." subtitle="Ringkasan dari aktivitas dan transaksi yang benar-benar tercatat." />

      <div className="insights-stat-grid">
        <StatCard label="Progress hari ini" value={`${progress}%`} foot={`${completed} dari ${total} habit selesai`} icon={Target} tone="green" />
        <StatCard label="Streak terpanjang" value={`${longestStreak} hari`} foot="Pada satu kebiasaan" icon={Flame} />
        <StatCard label="Arus kas bersih" value={formatCompactRupiah(totalNet)} foot="Bulan berjalan" icon={PiggyBank} />
      </div>

      <div className="insight-grid">
        <section className="card card-pad">
          <SectionHeading title="Pola kebiasaan" caption="Distribusi status kebiasaan yang tersimpan saat ini" />
          {categorySummary.length > 0 ? (
            <div className="insight-category-list">
              {categorySummary.map(({ category, total: categoryTotal, completed: categoryCompleted }) => (
                <div className="insight-category-row" key={category}>
                  <div className="insight-category-top">
                    <span>{category}</span>
                    <strong>{categoryCompleted}/{categoryTotal} selesai</strong>
                  </div>
                  <div className="budget-track" role="progressbar" aria-label={`Progress kategori ${category}`} aria-valuenow={categoryTotal ? Math.round(categoryCompleted / categoryTotal * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className="budget-fill" style={{ width: `${categoryTotal ? categoryCompleted / categoryTotal * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="insight-empty"><Sprout size={22} /><strong>Belum ada pola untuk dibaca</strong><p>Tambahkan kebiasaan untuk mulai membangun ringkasan perkembangan.</p></div>
          )}
          <div className="insight-historical-note"><Activity size={15} /><span>Grafik tren mingguan belum ditampilkan karena riwayat check-in lintas tanggal belum tersedia di ringkasan ini.</span></div>
        </section>

        <div className="right-stack">
          <section className="card card-pad">
            <SectionHeading title="Arus kas bulan ini" caption="Akumulasi pemasukan dan pengeluaran tercatat" />
            <div className="insight-cashflow-list">
              <div className="insight-cashflow-row"><span className="insight-cashflow-icon income"><ArrowDownLeft size={15} /></span><span><small>Pemasukan</small><strong>{formatCompactRupiah(income)}</strong></span></div>
              <div className="insight-cashflow-row"><span className="insight-cashflow-icon expense"><ArrowUpRight size={15} /></span><span><small>Pengeluaran</small><strong>{formatCompactRupiah(expense)}</strong></span></div>
            </div>
            <div className="insight-net-row"><span>Bersih</span><strong>{formatCompactRupiah(totalNet)}</strong></div>
          </section>
          <section className="insight-highlight">
            <div className="small-label">CATATAN HARI INI</div>
            <div className="insight-number">{completed}<span>/{total}</span></div>
            <p className="section-caption">{total === 0 ? "Belum ada kebiasaan tersimpan." : total === completed ? "Semua kebiasaan hari ini sudah selesai." : `${total - completed} kebiasaan masih bisa kamu selesaikan hari ini.`}</p>
          </section>
        </div>
      </div>
    </>
  );
}
