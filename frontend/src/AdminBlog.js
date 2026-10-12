import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Search, Edit2, Trash2, X, Save, Loader2, RefreshCw,
  FileText, Clock, ChevronLeft, Image, Type, AlignLeft, Quote,
  List, Minus, Bold, Italic, Underline as UnderlineIcon, Link2,
  AlignCenter, AlignRight, AlignJustify, ChevronUp, ChevronDown,
  GripVertical, Eye, EyeOff, BookOpen, Hash, Palette, Video,
  AlertTriangle,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useToast } from "./Toast";

const API = "http://localhost:8000/api";
const CATEGORIES = ["Mẹo vặt", "Đánh giá", "Tin tức", "Hướng dẫn"];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

let _idCounter = Date.now();
const uid = () => String(++_idCounter);

function slugify(str) {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-") || "sec-" + uid();
}
function stripHtml(html) { return (html || "").replace(/<[^>]*>/g, ""); }
function extractHeadings(blocks) {
  return (blocks || []).filter(b => (b.type === "heading" || b.type === "subheading") && b.text)
    .map(b => ({ id: b.id, text: stripHtml(b.text), level: b.type === "heading" ? 2 : 3, slug: b.slug || slugify(stripHtml(b.text)) }));
}
function normalizeVideoUrl(url = "") {
  const s = url.trim(); if (!s) return { embed: "", type: "unknown" };
  let m = s.match(/(?:youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!m) m = s.match(/youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return { embed: `https://www.youtube.com/embed/${m[1]}?rel=0`, type: "youtube" };
  let gm = s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (!gm) gm = s.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([A-Za-z0-9_-]+)/);
  if (gm) return { embed: `https://drive.google.com/file/d/${gm[1]}/preview`, type: "gdrive" };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(s)) return { embed: s, type: "direct" };
  return { embed: s, type: "unknown" };
}
function newBlock(type) {
  const id = uid(); const base = { id, _idx: id, type };
  const map = {
    heading: { ...base, text: "", align: "left", slug: "" },
    subheading: { ...base, text: "", align: "left", slug: "" },
    paragraph: { ...base, text: "", align: "left" },
    quote: { ...base, text: "" },
    list: { ...base, items: [""] },
    image: { ...base, url: "", caption: "", _file: null },
    video: { ...base, url: "" },
    divider: base,
    toc: { ...base, title: "Mục lục" },
  };
  return map[type] || base;
}

const TEXT_COLORS = [
  "#1e293b","#2D5A27","#ec5b13","#ef4444","#3b82f6","#8b5cf6","#f59e0b","#94a3b8",
];

// ─── FORMAT BAR ──────────────────────────────────────────────
function FormatBar({ onFormat, showAlign = true }) {
  const [showColors, setShowColors] = useState(false);
  const colorRef = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (colorRef.current && !colorRef.current.contains(e.target)) setShowColors(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  const exec = (cmd, val = null) => document.execCommand(cmd, false, val);
  return (
    <div className="flex items-center gap-0.5 mb-2 flex-wrap p-1.5 bg-slate-50 rounded-xl border border-slate-100">
      {[{cmd:"bold",icon:Bold,tip:"Đậm"},{cmd:"italic",icon:Italic,tip:"Nghiêng"},{cmd:"underline",icon:UnderlineIcon,tip:"Gạch dưới"}].map(b => (
        <button key={b.cmd} type="button" title={b.tip} onMouseDown={e=>{e.preventDefault();exec(b.cmd);}}
          className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition"><b.icon size={12}/></button>
      ))}
      <button type="button" title="Liên kết" onMouseDown={e=>{e.preventDefault();const u=window.prompt("URL:");if(u)exec("createLink",u);}}
        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition"><Link2 size={12}/></button>
      <div className="relative" ref={colorRef}>
        <button type="button" onMouseDown={e=>{e.preventDefault();setShowColors(s=>!s);}} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition"><Palette size={12}/></button>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-100 rounded-xl p-2.5 shadow-xl" style={{minWidth:180}}>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1.5">Màu chữ</p>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {TEXT_COLORS.map(c=>(
                <button key={c} type="button" onMouseDown={e=>{e.preventDefault();exec("foreColor",c);setShowColors(false);}}
                  className="w-5 h-5 rounded-full border border-slate-200 hover:scale-125 transition" style={{backgroundColor:c}}/>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1.5">Nền chữ</p>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.slice(1).map(c=>(
                <button key={c} type="button" onMouseDown={e=>{e.preventDefault();exec("hiliteColor",c);setShowColors(false);}}
                  className="w-5 h-5 rounded border border-slate-200 hover:scale-125 transition" style={{backgroundColor:c}}/>
              ))}
              <button type="button" onMouseDown={e=>{e.preventDefault();exec("hiliteColor","transparent");setShowColors(false);}}
                className="w-5 h-5 rounded border border-dashed border-slate-300 text-[8px] text-slate-400 flex items-center justify-center hover:border-[#2D5A27]">∅</button>
            </div>
          </div>
        )}
      </div>
      {showAlign && (
        <>
          <div className="w-px h-4 bg-slate-200 mx-0.5"/>
          {[{val:"left",icon:AlignLeft},{val:"center",icon:AlignCenter},{val:"right",icon:AlignRight},{val:"justify",icon:AlignJustify}].map(a=>(
            <button key={a.val} type="button" onMouseDown={e=>{e.preventDefault();onFormat&&onFormat("align",a.val);}}
              className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition"><a.icon size={12}/></button>
          ))}
        </>
      )}
    </div>
  );
}

// ─── BLOCK ITEM ──────────────────────────────────────────────
function BlockItem({ block, index, total, onChange, onMove, onDelete, onFileSelect }) {
  const [focused, setFocused] = useState(false);
  const [videoMode, setVideoMode] = useState("url");
  const [videoDraft, setVideoDraft] = useState("");
  const [videoErr, setVideoErr] = useState("");
  const fileRef = useRef(); const videoRef = useRef();
  const upd = p => onChange({ ...block, ...p });

  const confirmVideoUrl = () => {
    const { embed, type } = normalizeVideoUrl(videoDraft);
    if (!videoDraft.trim()) { setVideoErr("Nhập URL"); return; }
    if (type === "unknown") { setVideoErr("Chỉ hỗ trợ YouTube, Google Drive, .mp4"); return; }
    setVideoErr(""); upd({ url: embed });
  };

  return (
    <div className={`group relative flex gap-2 items-start rounded-xl p-2 transition ${focused?"bg-slate-50":"hover:bg-slate-50/60"}`}>
      <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
        <GripVertical size={14} className="text-slate-300 cursor-grab"/>
        <button onClick={()=>onMove(index,-1)} disabled={index===0} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 p-0.5"><ChevronUp size={12}/></button>
        <button onClick={()=>onMove(index,1)} disabled={index===total-1} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 p-0.5"><ChevronDown size={12}/></button>
      </div>

      <div className="flex-1 min-w-0">
        {/* HEADING */}
        {block.type==="heading" && (
          <div>{focused&&<FormatBar onFormat={(_,a)=>upd({align:a})}/>}
          <div contentEditable suppressContentEditableWarning onFocus={()=>setFocused(true)}
            onBlur={e=>{setFocused(false);const h=e.target.innerHTML;upd({text:h,slug:slugify(stripHtml(h))});}}
            dangerouslySetInnerHTML={{__html:block.text}} style={{textAlign:block.align||"left"}}
            data-placeholder="Tiêu đề lớn..."
            className="w-full outline-none bg-transparent text-xl font-bold text-slate-800 min-h-[32px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"/>
          {block.slug&&<p className="text-[9px] text-slate-300 mt-0.5">#{block.slug}</p>}
          </div>
        )}
        {/* SUBHEADING */}
        {block.type==="subheading" && (
          <div>{focused&&<FormatBar onFormat={(_,a)=>upd({align:a})}/>}
          <div contentEditable suppressContentEditableWarning onFocus={()=>setFocused(true)}
            onBlur={e=>{setFocused(false);const h=e.target.innerHTML;upd({text:h,slug:slugify(stripHtml(h))});}}
            dangerouslySetInnerHTML={{__html:block.text}} style={{textAlign:block.align||"left"}}
            data-placeholder="Tiêu đề nhỏ..."
            className="w-full outline-none bg-transparent text-base font-semibold text-slate-700 min-h-[28px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"/>
          {block.slug&&<p className="text-[9px] text-slate-300 mt-0.5">#{block.slug}</p>}
          </div>
        )}
        {/* PARAGRAPH */}
        {block.type==="paragraph" && (
          <div>{focused&&<FormatBar onFormat={(_,a)=>upd({align:a})}/>}
          <div contentEditable suppressContentEditableWarning onFocus={()=>setFocused(true)}
            onBlur={e=>{setFocused(false);upd({text:e.target.innerHTML});}}
            dangerouslySetInnerHTML={{__html:block.text}} style={{textAlign:block.align||"left"}}
            data-placeholder="Nhập nội dung..."
            className="w-full outline-none bg-transparent text-sm text-slate-700 leading-relaxed min-h-[28px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 [&_a]:text-[#2D5A27] [&_a]:underline"/>
          </div>
        )}
        {/* QUOTE */}
        {block.type==="quote" && (
          <div>{focused&&<FormatBar showAlign={false}/>}
          <div contentEditable suppressContentEditableWarning onFocus={()=>setFocused(true)}
            onBlur={e=>{setFocused(false);upd({text:e.target.innerHTML});}}
            dangerouslySetInnerHTML={{__html:block.text}} data-placeholder="Trích dẫn..."
            className="w-full outline-none bg-transparent text-sm italic text-slate-500 border-l-4 border-[#2D5A27] pl-4 min-h-[28px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"/>
          </div>
        )}
        {/* LIST */}
        {block.type==="list" && (
          <div className="flex flex-col gap-1">
            {(block.items||[""]).map((item,i)=>(
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27] shrink-0"/>
                <input value={item} onChange={e=>{const items=[...block.items];items[i]=e.target.value;upd({items});}}
                  onKeyDown={e=>{
                    if(e.key==="Enter"){e.preventDefault();const items=[...block.items];items.splice(i+1,0,"");upd({items});}
                    if(e.key==="Backspace"&&!item&&block.items.length>1){e.preventDefault();upd({items:block.items.filter((_,j)=>j!==i)});}
                  }}
                  placeholder="Mục danh sách..."
                  className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-300"/>
              </div>
            ))}
            <button onClick={()=>upd({items:[...block.items,""]})} className="text-xs text-[#2D5A27]/60 hover:text-[#2D5A27] mt-1 w-fit transition">+ Thêm mục</button>
          </div>
        )}
        {/* IMAGE */}
        {block.type==="image" && (
          <div>
            {block.url ? (
              <div className="relative group/img">
                <img src={block.url} alt={block.caption} className="w-full rounded-xl object-cover max-h-72"/>
                <button onClick={()=>upd({url:"",_file:null})} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover/img:opacity-100 transition"><Trash2 size={13}/></button>
              </div>
            ):(
              <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#2D5A27]/40 transition">
                <Image size={24} className="mx-auto mb-2 text-slate-300"/>
                <p className="text-xs text-slate-400">Click để chọn ảnh</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e=>{const f=e.target.files[0];if(!f)return;upd({url:URL.createObjectURL(f),_file:f});onFileSelect&&onFileSelect(block._idx,f);}}/>
              </div>
            )}
            <input value={block.caption||""} onChange={e=>upd({caption:e.target.value})} placeholder="Chú thích ảnh (tùy chọn)"
              className="mt-2 w-full bg-transparent text-xs text-slate-400 outline-none placeholder-slate-300 border-b border-slate-100 py-1 focus:border-[#2D5A27] transition"/>
          </div>
        )}
        {/* VIDEO */}
        {block.type==="video" && (
          <div>
            {block.url ? (
              <div className="relative group/vid">
                {(()=>{const {type,embed}=normalizeVideoUrl(block.url);
                  if(type==="youtube"||type==="gdrive")return<div className="rounded-xl overflow-hidden aspect-video bg-black"><iframe src={embed} className="w-full h-full" allowFullScreen title="v"/></div>;
                  return<video src={embed} controls className="w-full rounded-xl max-h-64"/>;
                })()}
                <button onClick={()=>upd({url:""})} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover/vid:opacity-100 transition"><Trash2 size={13}/></button>
              </div>
            ):(
              <div>
                <div className="flex gap-1 mb-3 bg-slate-50 rounded-xl p-1">
                  {[{v:"url",l:"🔗 YouTube / Drive"},{v:"file",l:"📁 Upload file"}].map(t=>(
                    <button key={t.v} onClick={()=>{setVideoMode(t.v);setVideoErr("");}}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${videoMode===t.v?"bg-white shadow text-slate-800 border border-slate-200":"text-slate-500"}`}>{t.l}</button>
                  ))}
                </div>
                {videoMode==="url"&&(
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-2 text-[11px] text-blue-600">Hỗ trợ YouTube, Google Drive, link .mp4</div>
                    <div className="flex gap-2">
                      <input value={videoDraft} onChange={e=>{setVideoDraft(e.target.value);setVideoErr("");}} onKeyDown={e=>e.key==="Enter"&&confirmVideoUrl()}
                        placeholder="https://youtu.be/... hoặc drive.google.com/..."
                        className={`flex-1 bg-slate-50 border rounded-xl px-3 py-2 text-xs outline-none transition ${videoErr?"border-red-400":"border-slate-100 focus:border-[#2D5A27]"}`}/>
                      <button onClick={confirmVideoUrl} className="px-4 py-2 rounded-xl bg-[#2D5A27]/10 border border-[#2D5A27]/20 text-[#2D5A27] text-xs font-bold hover:bg-[#2D5A27]/20 transition">Chèn</button>
                    </div>
                    {videoErr&&<p className="text-red-500 text-[11px] mt-1">{videoErr}</p>}
                    {videoDraft&&(()=>{const {type,embed}=normalizeVideoUrl(videoDraft);
                      if(type==="youtube")return<div className="mt-3 rounded-xl overflow-hidden aspect-video bg-black"><iframe src={embed} className="w-full h-full" allowFullScreen title="p"/></div>;
                      if(type==="gdrive")return<div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-xl text-[11px] text-green-600">✅ Google Drive hợp lệ</div>;
                      return null;
                    })()}
                  </div>
                )}
                {videoMode==="file"&&(
                  <div onClick={()=>videoRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#2D5A27]/40 transition">
                    <Video size={24} className="mx-auto mb-2 text-slate-300"/>
                    <p className="text-xs text-slate-400">Click để tải video lên (≤50MB)</p>
                    <input ref={videoRef} type="file" accept="video/*" className="hidden"
                      onChange={e=>{const f=e.target.files[0];if(!f)return;upd({url:URL.createObjectURL(f),_file:f});onFileSelect&&onFileSelect(block._idx,f,"video");}}/>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* DIVIDER */}
        {block.type==="divider"&&(
          <div className="flex items-center gap-3 py-2"><div className="flex-1 h-px bg-slate-200"/><div className="w-1.5 h-1.5 rounded-full bg-slate-300"/><div className="flex-1 h-px bg-slate-200"/></div>
        )}
        {/* TOC */}
        {block.type==="toc"&&(
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-[#2D5A27] shrink-0"/>
              <input value={block.title||"Mục lục"} onChange={e=>upd({title:e.target.value})} placeholder="Tiêu đề mục lục"
                className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#2D5A27] transition"/>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">Mục lục tự động tạo từ các block Tiêu đề. Thêm block "Tiêu đề lớn" hoặc "Tiêu đề nhỏ" để hiển thị.</p>
          </div>
        )}
      </div>

      <button onClick={()=>onDelete(index)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition shrink-0 mt-0.5"><Trash2 size={13}/></button>
    </div>
  );
}

const BLOCK_TYPES = [
  {type:"heading",icon:Type,label:"Tiêu đề lớn"},
  {type:"subheading",icon:Hash,label:"Tiêu đề nhỏ"},
  {type:"paragraph",icon:AlignLeft,label:"Đoạn văn"},
  {type:"quote",icon:Quote,label:"Trích dẫn"},
  {type:"list",icon:List,label:"Danh sách"},
  {type:"image",icon:Image,label:"Hình ảnh"},
  {type:"video",icon:Video,label:"Video"},
  {type:"divider",icon:Minus,label:"Đường kẻ"},
  {type:"toc",icon:BookOpen,label:"Mục lục"},
];

// ─── BLOCK RENDERER ──────────────────────────────────────────
function BlockRenderer({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading": return <h2 key={i} style={{textAlign:b.align||"left"}} className="text-2xl font-bold text-slate-800" dangerouslySetInnerHTML={{__html:b.text}}/>;
          case "subheading": return <h3 key={i} style={{textAlign:b.align||"left"}} className="text-lg font-semibold text-slate-700" dangerouslySetInnerHTML={{__html:b.text}}/>;
          case "paragraph": return <div key={i} style={{textAlign:b.align||"left"}} className="text-sm leading-relaxed text-slate-600 [&_a]:text-[#2D5A27] [&_a]:underline" dangerouslySetInnerHTML={{__html:b.text}}/>;
          case "quote": return <blockquote key={i} className="border-l-4 border-[#2D5A27] pl-4 italic text-slate-500 text-sm" dangerouslySetInnerHTML={{__html:b.text}}/>;
          case "list": return <ul key={i} className="flex flex-col gap-1.5 pl-2">{(b.items||[]).map((item,j)=><li key={j} className="flex items-start gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27] shrink-0 mt-1.5"/><span>{item}</span></li>)}</ul>;
          case "image": return b.url?<figure key={i}><img src={b.url} alt={b.caption||""} className="w-full rounded-2xl"/>{b.caption&&<figcaption className="text-xs text-slate-400 text-center mt-1.5">{b.caption}</figcaption>}</figure>:null;
          case "video": return b.url?(()=>{const {type,embed}=normalizeVideoUrl(b.url);if(type==="youtube"||type==="gdrive")return<div key={i} className="rounded-xl overflow-hidden aspect-video bg-black"><iframe src={embed} className="w-full h-full" allowFullScreen title="v"/></div>;return<video key={i} src={embed} controls className="w-full rounded-xl"/>;})():null;
          case "divider": return <div key={i} className="flex items-center gap-3 py-1"><div className="flex-1 h-px bg-slate-200"/><div className="w-1.5 h-1.5 rounded-full bg-slate-300"/><div className="flex-1 h-px bg-slate-200"/></div>;
          case "toc": {
            const hs = extractHeadings(blocks); if (!hs.length) return null;
            return <nav key={i} className="bg-[#2D5A27]/5 border border-[#2D5A27]/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3"><BookOpen size={14} className="text-[#2D5A27]"/><span className="text-sm font-bold text-slate-700">{b.title||"Mục lục"}</span></div>
              <ol className="flex flex-col gap-1.5">{hs.map((h,idx)=><li key={h.id} style={{paddingLeft:`${(h.level-2)*16}px`}} className="flex items-baseline gap-2"><span className="text-[#2D5A27]/60 text-xs shrink-0">{idx+1}.</span><span className="text-sm text-slate-600">{h.text}</span></li>)}</ol>
            </nav>;
          }
          default: return null;
        }
      })}
    </div>
  );
}

// ─── POST FORM ───────────────────────────────────────────────
function PostForm({ post, onClose, onSaved }) {
  const toast = useToast();
  const [title,        setTitle]        = useState(post?.title || "");
  const [category,     setCategory]     = useState(post?.category || "Mẹo vặt");
  const [author,       setAuthor]       = useState(post?.author || "Admin");
  const [blocks,       setBlocks]       = useState(() =>
    (post?.blocks || []).map(b => ({ ...b, id: b.id || uid(), _idx: b._idx || b.id || uid() }))
  );
  const [saving,       setSaving]       = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [preview,      setPreview]      = useState(false);
  const [pendingFiles, setPendingFiles] = useState({});

  const addBlock    = type => { setBlocks(p => [...p, newBlock(type)]); setShowTypeMenu(false); };
  const updateBlock = (i, u)  => setBlocks(p => { const a=[...p]; a[i]=u; return a; });
  const moveBlock   = (i, dir) => setBlocks(p => { const a=[...p]; const j=i+dir; if(j<0||j>=a.length)return a; [a[i],a[j]]=[a[j],a[i]]; return a; });
  const deleteBlock = i => setBlocks(p => p.filter((_,idx) => idx !== i));

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", category);
      fd.append("author", author.trim() || "Admin");
      if (post?.id) fd.append("post_id", post.id);
      const blocksClean = blocks.map(b => { const { _file, ...rest } = b; return rest; });
      fd.append("blocks", JSON.stringify(blocksClean));
      Object.entries(pendingFiles).forEach(([idx, file]) => fd.append(`block_img_${idx}`, file));
      const res  = await fetch(post?.id ? `${API}/post/update/` : `${API}/post/create/`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Lỗi lưu bài"); return; }
      toast.success(post?.id ? "Đã cập nhật!" : "Đăng bài thành công!");
      onSaved();
    } catch { toast.error("Không thể kết nối server"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f8f7f5] flex flex-col font-['Manrope']">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition"><ChevronLeft size={20}/></button>
          <div>
            <h2 className="font-black text-slate-800">{post?.id ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</h2>
            <p className="text-xs text-slate-400">{blocks.length} blocks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition">
            {preview ? <EyeOff size={15}/> : <Eye size={15}/>} {preview ? "Thoát preview" : "Preview"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] text-white rounded-xl font-black text-sm hover:bg-[#1f3f1b] transition shadow-lg shadow-[#2D5A27]/20 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            {post?.id ? "Lưu thay đổi" : "Đăng bài"}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2D5A27]/10 text-[#2D5A27] mb-4 inline-block">{category}</span>
            <h1 className="text-3xl font-black text-slate-800 mb-8 leading-tight">{title || "Tiêu đề bài viết"}</h1>
            <BlockRenderer blocks={blocks}/>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-5">
            {/* Meta */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tiêu đề *</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nhập tiêu đề bài viết..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#2D5A27] transition"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Danh mục</label>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map(c=>(
                      <button key={c} onClick={()=>setCategory(c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition ${category===c?"bg-[#2D5A27] text-white border-[#2D5A27]":"bg-white text-slate-500 border-slate-200 hover:border-[#2D5A27]/40"}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Tác giả</label>
                  <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Tên tác giả..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-[#2D5A27] transition"/>
                </div>
              </div>
            </div>

            {/* Block Editor */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Nội dung</span>
                <span className="text-xs text-slate-300">{blocks.length} blocks</span>
              </div>
              <div className="p-4 min-h-[200px]">
                {blocks.length===0&&<div className="text-center py-16 text-slate-300 text-sm">Chưa có nội dung — bấm "Thêm block"</div>}
                <div className="flex flex-col gap-1">
                  {blocks.map((block,i)=>(
                    <BlockItem key={block.id||i} block={block} index={i} total={blocks.length}
                      onChange={u=>updateBlock(i,u)} onMove={moveBlock} onDelete={deleteBlock}
                      onFileSelect={(idx,file)=>setPendingFiles(p=>({...p,[idx]:file}))}/>
                  ))}
                </div>
              </div>
              <div className="px-4 pb-4 relative">
                <button onClick={()=>setShowTypeMenu(!showTypeMenu)}
                  className="flex items-center gap-2 px-4 py-2.5 w-full justify-center rounded-xl border-2 border-dashed border-slate-200 hover:border-[#2D5A27]/40 text-slate-400 hover:text-[#2D5A27] text-sm transition font-bold">
                  <Plus size={14}/> Thêm block
                </button>
                {showTypeMenu&&(
                  <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 overflow-hidden">
                    <div className="grid grid-cols-3 gap-0 p-2">
                      {BLOCK_TYPES.map(bt=>(
                        <button key={bt.type} onClick={()=>addBlock(bt.type)}
                          className="flex flex-col items-center gap-1.5 p-3 hover:bg-slate-50 rounded-xl transition">
                          <bt.icon size={18} className="text-[#2D5A27]/70"/><span className="text-[10px] text-slate-500">{bt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN AdminBlog ──────────────────────────────────────────
export default function AdminBlog() {
  const toast = useToast();
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("Tất cả");
  const [editPost,   setEditPost]   = useState(null);
  const [deletePost, setDeletePost] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/post/list/?category=all`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { toast.error("Không thể tải bài viết"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const openEdit = async (post) => {
    try {
      const res = await fetch(`${API}/post/${post.id}/`);
      const data = await res.json();
      setEditPost(data.post);
    } catch { toast.error("Không thể tải bài viết"); }
  };

  const filtered = posts.filter(p => {
    const matchCat = catFilter === "Tất cả" || p.category === catFilter;
    const matchQ   = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  if (editPost !== null) {
    return <PostForm post={editPost?.id ? editPost : null} onClose={() => setEditPost(null)} onSaved={() => { setEditPost(null); fetchPosts(); }}/>;
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] font-['Manrope']">
      <AdminSidebar/>
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-black text-slate-800">Quản lý Blog</h1><p className="text-slate-400 text-sm mt-1">{posts.length} bài viết</p></div>
          <div className="flex gap-3">
            <button onClick={fetchPosts} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition">
              <RefreshCw size={16} className={loading?"animate-spin":""}/>
            </button>
            <button onClick={() => setEditPost({})} className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] text-white rounded-xl font-black text-sm hover:bg-[#1f3f1b] transition shadow-lg shadow-[#2D5A27]/20">
              <Plus size={16}/> Tạo bài viết
            </button>
          </div>
        </div>

        {/* Stats tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {["Tất cả", ...CATEGORIES].map((cat, i) => {
            const count = cat==="Tất cả" ? posts.length : posts.filter(p=>p.category===cat).length;
            const colors = ["bg-slate-700","bg-[#2D5A27]","bg-[#ec5b13]","bg-blue-500","bg-amber-500"];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`bg-white rounded-2xl p-4 border-2 transition flex items-center gap-3 text-left ${catFilter===cat?"border-[#2D5A27] shadow-md":"border-slate-100 shadow-sm hover:border-slate-200"}`}>
                <div className={`w-9 h-9 rounded-xl ${colors[i]} flex items-center justify-center shrink-0`}><FileText size={16} className="text-white"/></div>
                <div><p className="text-lg font-black text-slate-800">{count}</p><p className="text-[10px] text-slate-400 leading-tight">{cat}</p></div>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 focus-within:border-[#2D5A27] transition">
            <Search size={16} className="text-slate-400 shrink-0"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm kiếm tiêu đề..."
              className="outline-none bg-transparent text-sm text-slate-700 placeholder-slate-400 flex-1"/>
            {search&&<button onClick={()=>setSearch("")} className="text-slate-300 hover:text-slate-500"><X size={14}/></button>}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="mx-auto text-slate-200 mb-4" size={56}/>
              <p className="text-slate-400 font-bold mb-4">{search?`Không tìm thấy bài viết cho "${search}"`:"Chưa có bài viết nào"}</p>
              <button onClick={()=>setEditPost({})} className="px-5 py-2.5 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1f3f1b] transition">Tạo bài viết đầu tiên</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/50">
                    {["Bài viết","Danh mục","Tác giả","Ngày tạo",""].map(h=>(
                      <th key={h} className="text-left px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(post=>(
                    <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                            {post.thumbnail?<img src={post.thumbnail} alt="" className="w-full h-full object-cover"/>:<FileText size={16} className="text-slate-300"/>}
                          </div>
                          <p className="font-bold text-slate-800 text-sm line-clamp-1 max-w-xs">{post.title}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="px-2.5 py-1 bg-[#2D5A27]/8 text-[#2D5A27] text-[10px] font-black rounded-full">{post.category}</span></td>
                      <td className="px-5 py-4 text-sm text-slate-500">{post.author}</td>
                      <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-xs text-slate-400"><Clock size={12}/>{timeAgo(post.created_at)}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition">
                          <button onClick={()=>openEdit(post)} className="p-2 rounded-xl hover:bg-[#2D5A27]/10 text-slate-400 hover:text-[#2D5A27] transition"><Edit2 size={15}/></button>
                          <button onClick={()=>setDeletePost(post)} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition"><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {deletePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center"><AlertTriangle size={18} className="text-red-500"/></div>
              <h3 className="font-black text-slate-800">Xóa bài viết</h3>
            </div>
            <p className="text-sm text-slate-500 mb-1">Bạn chắc chắn muốn xóa:</p>
            <p className="text-sm font-bold text-slate-700 mb-5 line-clamp-2">"{deletePost.title}"</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeletePost(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold transition">Hủy</button>
              <button onClick={async()=>{
                try{const res=await fetch(`${API}/post/delete/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({post_id:deletePost.id})});
                if(res.ok){toast.success("Đã xóa!");setDeletePost(null);fetchPosts();}else toast.error("Không thể xóa");}
                catch{toast.error("Lỗi kết nối");}
              }} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition flex items-center justify-center gap-2">
                <Trash2 size={14}/> Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
