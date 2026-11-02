import type { FormEvent } from "react";
import { Check, X } from "lucide-react";
import type { TransactionCategory } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { IconAction, PrimaryButton } from "@/components/ui/primitives";

const categories: TransactionCategory[] = [
  "Gaji", "Freelance", "Makanan", "Transportasi", "Tagihan", "Lifestyle", "Kesehatan", "Lainnya",
];

export function EntryModal({ mode, onClose, onSubmit }: {
  mode: "habit" | "transaction"; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isHabit = mode === "habit";
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title">
        <div className="modal-head">
          <div><div className="eyebrow">{isHabit ? "BANGUN KEBIASAAN" : "CATAT ARUS UANG"}</div><h2 className="modal-title" id="entry-modal-title">{isHabit ? "Tambah habit baru" : "Transaksi baru"}</h2></div>
          <IconAction label="Tutup modal" onClick={onClose}><X size={17} /></IconAction>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          {isHabit ? (
            <>
              <label className="form-field"><span className="form-label">Nama habit</span><input className="form-control" name="title" placeholder="Contoh: Membaca 10 halaman" required maxLength={60} /></label>
              <label className="form-field"><span className="form-label">Kategori</span><select className="form-control" name="category"><option>Health</option><option>Learning</option><option>Mindfulness</option><option>Personal</option></select></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="form-field"><span className="form-label">Waktu</span><input className="form-control" type="time" name="time" defaultValue="07:00" required /></label>
                <label className="form-field"><span className="form-label">Durasi (menit)</span><input className="form-control" type="number" name="duration" min="1" max="600" defaultValue="15" required /></label>
              </div>
            </>
          ) : (
            <>
              <label className="form-field"><span className="form-label">Jenis transaksi</span><select className="form-control" name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label>
              <label className="form-field"><span className="form-label">Nama transaksi</span><input className="form-control" name="title" placeholder="Contoh: Belanja bulanan" maxLength={60} required /></label>
              <label className="form-field"><span className="form-label">Nominal (Rp)</span><input className="form-control" type="number" name="amount" min="1" step="1" placeholder="150000" required /></label>
              <label className="form-field"><span className="form-label">Kategori</span><select className="form-control" name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="form-field"><span className="form-label">Tanggal</span><input className="form-control" type="date" name="date" defaultValue={todayISO()} required /></label>
            </>
          )}
          <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Batal</button><PrimaryButton type="submit"><Check size={15} /> Simpan</PrimaryButton></div>
        </form>
      </section>
    </div>
  );
}
