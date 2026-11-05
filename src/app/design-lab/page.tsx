"use client";

import { useState } from "react";
import "./design-lab.css";
import { FeedbackOverlay } from "./FeedbackOverlay";
import { VariantA } from "../../../.claude-design/lab/variants/VariantA";
import { VariantB } from "../../../.claude-design/lab/variants/VariantB";
import { VariantC } from "../../../.claude-design/lab/variants/VariantC";
import { VariantD } from "../../../.claude-design/lab/variants/VariantD";
import { VariantE } from "../../../.claude-design/lab/variants/VariantE";

type View = "dashboard" | "finance";
type FinanceSection = "wallets" | "transfers" | "recurring" | "savings" | "rules" | "split" | "weekly";
const variants = [
  {id:"A",title:"Information Hierarchy",note:"One Thing Today dan habit utama menjadi pusat; statistik memberi konteks.",Component:VariantA},
  {id:"B",title:"Editorial Layout",note:"Komposisi dua kolom dengan area kerja dan panel insight yang jelas.",Component:VariantB},
  {id:"C",title:"Compact Daily Cockpit",note:"Kepadatan lebih tinggi untuk mengurangi scroll dan mempercepat pemindaian.",Component:VariantC},
  {id:"D",title:"Action-first Interaction",note:"Aksi utama dan alat yang sering dipakai tampil lebih dekat.",Component:VariantD},
  {id:"E",title:"Expressive Playful Premium",note:"Ilustrasi, material hangat, dan storytelling diperkuat tanpa mengubah token inti.",Component:VariantE}
] as const;

export default function DesignLabPage() {
  const [view,setView]=useState<View>("illustrations");
  const [financeSection,setFinanceSection]=useState<FinanceSection>("wallets");
  return <main className="design-lab-root">
    <header className="design-lab-header">
      <div><div className="design-lab-kicker">RUTINA · DESIGN EXPLORATION</div><h1>Temukan ritme visual yang tepat.</h1><p>Lima arah desain untuk App Shell, Dashboard, Keuangan, dan tujuh fitur Keuangan lanjutan. Seluruh variasi memakai fixture yang sama agar dapat dibandingkan secara adil.</p></div>
      <div className="design-lab-status"><span/> BRANCH · DESIGN LAB</div>
    </header>
    <section className="design-lab-brief">
      <div><small>IDENTITAS</small><strong>Playful Botanical → Playful Premium</strong></div>
      <div><small>PRIORITAS</small><strong>Mobile-first · Comfortable · Light mode</strong></div>
      <div><small>BATASAN</small><strong>Tanpa perubahan data, API, atau schema</strong></div>
    </section>
    <div className="design-lab-controls">
      <div className="design-lab-switch" role="group" aria-label="Pilih halaman yang dibandingkan">
        <button type="button" className={view==="dashboard"?"active":""} onClick={()=>setView("dashboard")}>01 · Dashboard</button>
        <button type="button" className={view==="finance"?"active":""} onClick={()=>setView("finance")}>02 · Keuangan & lanjutan</button>
      </div>
      {view==="finance" && <label className="design-lab-finance-select">Subfitur keuangan
        <select value={financeSection} onChange={event=>setFinanceSection(event.target.value as FinanceSection)}>
          <option value="wallets">Dompet</option><option value="transfers">Transfer</option><option value="recurring">Berulang</option><option value="savings">Tabungan</option><option value="rules">Aturan kategori</option><option value="split">Split transaksi</option><option value="weekly">Budget mingguan</option>
        </select>
      </label>}
      <div className="design-lab-howto"><strong>Cara menilai:</strong> bandingkan hierarki, jumlah scroll, keterbacaan, kejelasan navigasi, dan jarak ke tindakan utama.</div>
    </div>
    <div className="design-lab-grid">
      {variants.map(({id,title,note,Component})=><section className="design-lab-variant" data-variant={id} key={id}>
        <header className="design-lab-variant-header"><div><span className="design-lab-variant-letter">{id}</span><span><strong>{title}</strong><small>Kenapa opsi ini ada</small></span></div><span className="design-lab-variant-index">VARIANT {id}</span><p>{note}</p></header>
        <div className="design-lab-preview"><Component view={view} financeSection={financeSection}/></div>
      </section>)}
    </div>
    <div className="design-lab-footer-note">Angka dan transaksi pada preview adalah data fixture untuk membandingkan UI, bukan isi workspace atau saldo nyata. Tombol pada preview tidak menulis ke database.</div>
    <FeedbackOverlay targetName="Rutina — App Shell, Dashboard & Keuangan Lanjutan"/>
  </main>;
}
