"use client";

import { useEffect,useState } from "react";
type Comment = {variant:string;selector:string;element:string;comment:string};
function describe(element:HTMLElement) {
  const label=element.getAttribute("aria-label")||element.getAttribute("data-testid")||element.textContent?.trim().replace(/\s+/g," ").slice(0,90)||element.tagName.toLowerCase();
  const selector=element.id?"#"+element.id:element.getAttribute("data-testid")?"[data-testid='"+element.getAttribute("data-testid")+"']":element.className&&typeof element.className==="string"?"."+element.className.trim().split(/\s+/).slice(0,2).join("."):element.tagName.toLowerCase();
  return {label,selector};
}
export function FeedbackOverlay({targetName}:{targetName:string}) {
  const [enabled,setEnabled]=useState(false);
  const [target,setTarget]=useState<{variant:string;selector:string;element:string}|null>(null);
  const [draft,setDraft]=useState("");
  const [overall,setOverall]=useState("");
  const [comments,setComments]=useState<Comment[]>([]);
  const [exported,setExported]=useState("");
  useEffect(()=>{
    if(!enabled)return;
    const pick=(event:globalThis.MouseEvent)=>{
      const node=event.target;
      if(!(node instanceof HTMLElement)||node.closest(".feedback-overlay"))return;
      const variant=node.closest("[data-variant]");
      if(!variant)return;
      event.preventDefault();event.stopPropagation();
      const details=describe(node);
      setTarget({variant:variant.getAttribute("data-variant")||"?",selector:details.selector,element:details.label});
      setDraft("");
    };
    document.addEventListener("click",pick,true);
    return ()=>document.removeEventListener("click",pick,true);
  },[enabled]);
  function saveComment(){
    if(!target||!draft.trim())return;
    setComments(current=>[...current,{...target,comment:draft.trim()}]);
    setTarget(null);setDraft("");setEnabled(false);
  }
  function submit(){
    if(!overall.trim())return;
    const body=["## Design Lab Feedback","","**Target:** "+targetName,"**Comments:** "+comments.length,
      ...["A","B","C","D","E"].flatMap(variant=>{
        const items=comments.filter(item=>item.variant===variant);
        return items.length?["","### Variant "+variant,...items.map((item,index)=>(index+1)+". **"+item.element+"** ("+item.selector+")\n   \""+item.comment+"\"")]:[];
      }),"","### Overall Direction",overall.trim()].join("\n");
    setExported(body);
    void navigator.clipboard?.writeText(body).catch(()=>undefined);
  }
  return <div className="feedback-overlay">
    <div className="feedback-launcher"><button type="button" className={enabled?"is-active":""} onClick={()=>{setEnabled(v=>!v);setTarget(null);}}>{enabled?"Pilih elemen…":"＋ Tambah feedback"}</button><span>{comments.length} komentar</span></div>
    {enabled&&<div className="feedback-hint">Mode komentar aktif — klik elemen pada salah satu variasi.</div>}
    {target&&<section className="feedback-editor"><button type="button" className="feedback-close" aria-label="Tutup editor" onClick={()=>setTarget(null)}>×</button><small>VARIANT {target.variant} · {target.selector}</small><strong>{target.element}</strong><textarea value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Apa yang perlu diubah pada elemen ini?" rows={3}/><button type="button" disabled={!draft.trim()} onClick={saveComment}>Simpan komentar</button></section>}
    <section className="feedback-summary"><label>Overall Direction <span>*</span><textarea value={overall} onChange={event=>setOverall(event.target.value)} placeholder="Contoh: Gunakan struktur B, pertahankan fokus One Thing Today dari A, dan gaya visual E." rows={3}/></label><div className="feedback-summary-actions"><button type="button" disabled={!overall.trim()} onClick={submit}>Submit & salin feedback</button><span>{comments.length} komentar tersimpan</span></div>{exported&&<textarea className="feedback-export" readOnly value={exported} rows={7} aria-label="Feedback siap disalin"/>}<small>Tempel hasil feedback di percakapan ini agar desain final dapat disintesis.</small></section>
  </div>;
}
