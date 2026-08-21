import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Check, Copy, History, ImageIcon, LoaderCircle, RotateCcw, Sparkles, Type, Upload, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Mode = "text" | "photo";
type PromptMethod = "feminine" | "masculine";
type PromptHistoryEntry = { id: string; createdAt: number; mode: Mode; method: PromptMethod; label: string; prompt: string };

const SESSION_HISTORY_KEY = "tezza-prompts-session-history";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const METHOD_COPY: Record<PromptMethod, { label: string; subtitle: string; input: string }> = {
  feminine: { label: "Método Feminino", subtitle: "Avatar CGI feminino", input: "Uma avatar adulta em um rooftop de São Paulo à noite, cabelo cacheado solto, vestido preto minimalista e flash de smartphone..." },
  masculine: { label: "Método Masculino", subtitle: "Avatar CGI masculino", input: "Um avatar adulto em uma varanda urbana noturna, cabelo curto preto, visual editorial e luz de flash cinematográfica..." },
};

function makeEntry(prompt: string, mode: Mode, method: PromptMethod, label: string): PromptHistoryEntry {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), mode, method, label: label.trim().slice(0, 72) || (mode === "photo" ? "Direção visual pela foto" : "Nova direção em texto"), prompt };
}

export default function Home() {
  const [method, setMethod] = useState<PromptMethod>("feminine");
  const [mode, setMode] = useState<Mode>("text");
  const [direction, setDirection] = useState("");
  const [personalTraits, setPersonalTraits] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SESSION_HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored) as PromptHistoryEntry[]);
    } catch { window.sessionStorage.removeItem(SESSION_HISTORY_KEY); }
  }, []);

  const generateMutation = trpc.prompt.generate.useMutation({
    onSuccess: data => {
      setGeneratedPrompt(data.prompt);
      const entry = makeEntry(data.prompt, mode, method, mode === "text" ? direction : imageName);
      setHistory(current => {
        const next = [entry, ...current].slice(0, 12);
        window.sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      toast.success(`${METHOD_COPY[method].label} estruturado com sucesso.`);
    },
    onError: error => toast.error(error.message || "Não foi possível gerar o prompt agora."),
  });

  const modeDescription = useMemo(() => mode === "text" ? "Descreva o conceito, o cenário e a direção visual. O motor organiza tudo no esqueleto fixo escolhido." : "Envie a imagem. A IA preserva os elementos visuais observáveis e aplica as regras do método selecionado.", [mode]);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setImageError("Escolha uma imagem em JPG, PNG ou WEBP.");
    if (file.size > MAX_FILE_SIZE) return setImageError("A imagem deve ter até 4 MB.");
    const reader = new FileReader();
    reader.onload = () => { setImageDataUrl(String(reader.result)); setImageName(file.name.replace(/\.[^.]+$/, "")); };
    reader.readAsDataURL(file);
  }

  function clearImage() { setImageDataUrl(null); setImageName(""); setImageError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }
  function generatePrompt() {
    if (mode === "text") return generateMutation.mutate({ method, mode, userText: direction, personalTraits });
    if (!imageDataUrl) return setImageError("Envie uma imagem para gerar pelo modo Foto.");
    generateMutation.mutate({ method, mode, imageDataUrl, personalTraits });
  }
  async function copyPrompt(prompt = generatedPrompt) {
    if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt); setCopied(true); toast.success("Prompt copiado para a área de transferência."); window.setTimeout(() => setCopied(false), 1800); }
    catch { toast.error("Não foi possível copiar automaticamente. Selecione o texto e tente novamente."); }
  }
  function openHistoryEntry(entry: PromptHistoryEntry) { setGeneratedPrompt(entry.prompt); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function resetSession() { setHistory([]); window.sessionStorage.removeItem(SESSION_HISTORY_KEY); toast.success("Histórico desta sessão removido."); }

  return (
    <div className="black-grid min-h-screen overflow-x-hidden text-white">
      <main className="relative mx-auto max-w-[1380px] px-4 pb-14 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/15 pb-5">
          <div className="flex items-center gap-3"><span className="bow-mark" aria-hidden="true" /><div><p className="font-display text-3xl leading-none tracking-[-0.05em]">Tezza</p><p className="mt-1 font-soft text-[9px] font-bold tracking-[0.22em] text-white/55">PROMPTS OFICIAL</p></div></div>
          <div className="hidden items-center gap-3 sm:flex"><span className="method-tag">MÉTODO 01</span><span className="font-soft text-[10px] tracking-[0.17em] text-white/55">TEXTO / FOTO</span></div>
        </header>

        <section className="pb-10 pt-12 text-center sm:pt-16">
          <div className="mx-auto max-w-3xl"><p className="font-soft text-[10px] font-bold tracking-[0.26em] text-white/50">TEZZA PROMPTS OFICIAL · FLOW</p><h1 className="mt-4 font-display text-5xl leading-[0.92] tracking-[-0.055em] sm:text-6xl">Seu traço.<br /><em className="font-normal text-white/60">Seu prompt.</em></h1><p className="mx-auto mt-5 max-w-xl font-soft text-sm leading-6 text-white/58">Escolha o método, informe uma ideia ou foto e defina aquilo que deve permanecer fiel à pessoa.</p></div>
        </section>

        <section className="tezza-card mx-auto max-w-6xl rounded-[2rem] p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col items-center border-b border-white/12 pb-7 text-center"><div className="flex items-center gap-3"><span className="bow-mark small" aria-hidden="true" /><h2 className="font-display text-4xl tracking-[-0.05em]">Métodos Tezza</h2><span className="bow-mark small mirror" aria-hidden="true" /></div><p className="mt-2 font-soft text-xs text-white/50">Cada método mantém uma abertura, esqueleto e encerramento próprios.</p>
            <div className="mt-6 grid w-full max-w-2xl grid-cols-2 gap-2 rounded-2xl border border-white/14 bg-white/[0.03] p-2">
              {(Object.keys(METHOD_COPY) as PromptMethod[]).map(key => <button key={key} onClick={() => setMethod(key)} className={cn("method-choice", method === key && "active")}><span>{METHOD_COPY[key].label}</span><small>{METHOD_COPY[key].subtitle}</small></button>)}
            </div>
          </div>

          <div className="grid gap-7 py-8 xl:grid-cols-[0.94fr_1.06fr]">
            <div className="panel rounded-[1.65rem] p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start"><div><p className="font-soft text-[10px] font-bold tracking-[0.2em] text-white/46">DIREÇÃO DE ENTRADA</p><h3 className="mt-1 font-display text-3xl tracking-[-0.04em]">{METHOD_COPY[method].label}</h3></div><div className="mode-switch"><button onClick={() => setMode("text")} className={cn(mode === "text" && "active")}><Type className="h-3.5 w-3.5" /> Texto</button><button onClick={() => setMode("photo")} className={cn(mode === "photo" && "active")}><ImageIcon className="h-3.5 w-3.5" /> Foto</button></div></div>
              <p className="mt-5 font-soft text-sm leading-6 text-white/57">{modeDescription}</p>
              {mode === "text" ? <div className="mt-6"><label htmlFor="creative-direction" className="field-label">DIREÇÃO CRIATIVA</label><textarea id="creative-direction" value={direction} onChange={event => setDirection(event.target.value)} placeholder={METHOD_COPY[method].input} className="mono-input min-h-[164px]" /><p className="mt-2 text-right font-soft text-[10px] text-white/35">{direction.length} / 2400</p></div> : <div className="mt-6"><input ref={fileInputRef} onChange={handlePhotoChange} accept="image/jpeg,image/png,image/webp" className="hidden" id="photo-upload" type="file" />{imageDataUrl ? <div className="relative overflow-hidden rounded-3xl border border-white/15"><img src={imageDataUrl} alt="Prévia da imagem selecionada" className="h-[210px] w-full object-cover opacity-85" /><div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-12"><p className="min-w-0 truncate font-soft text-xs">{imageName}</p><button onClick={clearImage} className="grid h-8 w-8 place-items-center rounded-full border border-white/35 bg-black/80 text-white"><X className="h-4 w-4" /></button></div></div> : <label htmlFor="photo-upload" className="upload-box"><Upload className="h-5 w-5" /><p>Enviar imagem de referência</p><small>JPG, PNG ou WEBP · até 4 MB</small></label>}{imageError && <p className="mt-3 font-soft text-xs text-white/72">{imageError}</p>}</div>}
              <div className="mt-6"><label htmlFor="personal-traits" className="field-label">TRAÇOS E RESTRIÇÕES OBRIGATÓRIAS <span>EDITÁVEL</span></label><textarea id="personal-traits" value={personalTraits} onChange={event => setPersonalTraits(event.target.value)} placeholder="Ex.: manter cabelo loiro; liso, com caimento fluido; rosto oval; olhos castanhos; preservar proporções e identidade visual; não incluir tatuagens..." className="mono-input min-h-[138px]" /><p className="mt-2 font-soft text-[11px] leading-5 text-white/42">Esses traços têm prioridade e entram no prompt final de forma natural, sem mostrar “INSIRA AQUI”.</p></div>
              <Button onClick={generatePrompt} disabled={generateMutation.isPending || (mode === "text" ? direction.trim().length < 8 : !imageDataUrl)} className="tezza-button mt-7 h-12 w-full rounded-full font-soft text-sm font-bold text-black"><>{generateMutation.isPending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Estruturando...</> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar {METHOD_COPY[method].label} <ArrowUpRight className="ml-1 h-4 w-4" /></>}</></Button>
              <p className="mt-3 text-center font-soft text-[9px] font-bold tracking-[0.13em] text-white/39">INGLÊS · ESTRUTURA FIXA · TEXTO COPIÁVEL</p>
            </div>

            <div className="panel flex min-h-[625px] flex-col rounded-[1.65rem] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start"><div><p className="font-soft text-[10px] font-bold tracking-[0.2em] text-white/46">PROMPT PRONTO</p><h3 className="mt-1 font-display text-3xl tracking-[-0.04em]">Para copiar</h3><span className="mt-2 inline-block font-soft text-[10px] text-white/45">{METHOD_COPY[method].label}</span></div><button onClick={() => copyPrompt()} disabled={!generatedPrompt} className={cn("copy-button", copied && "copied")}><>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiado" : "Copiar prompt"}</></button></div>{generatedPrompt ? <div className="editor-scroll prompt-box mt-6 flex-1 overflow-y-auto"><pre>{generatedPrompt}</pre></div> : <div className="empty-output mt-6 grid flex-1 place-items-center"><div className="max-w-sm px-8 text-center"><Sparkles className="mx-auto h-5 w-5 text-white/52" /><h4 className="mt-5 font-display text-2xl">A estrutura aguarda você.</h4><p className="mt-3 font-soft text-sm leading-6 text-white/47">O resultado respeitará o método escolhido, os 14 mini títulos e os seus traços obrigatórios.</p></div></div>}<div className="mt-5 flex justify-between font-soft text-[10px] text-white/38"><span>OUTPUT EM INGLÊS</span><span>{generatedPrompt ? `${generatedPrompt.length.toLocaleString("pt-BR")} caracteres` : "14 seções"}</span></div></div>
          </div>

          <section className="border-t border-white/12 pt-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/15"><History className="h-4 w-4" /></span><div><h3 className="font-display text-2xl tracking-[-0.04em]">Sessão atual</h3><p className="font-soft text-[11px] text-white/48">Os prompts ficam disponíveis só até fechar esta aba.</p></div></div>{history.length > 0 && <button onClick={resetSession} className="flex items-center gap-2 font-soft text-[11px] font-bold text-white/65 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Limpar histórico</button>}</div>{history.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{history.map((entry, index) => <article key={entry.id} className="history-card"><div className="flex items-center justify-between"><span>{entry.method === "feminine" ? "FEMININO" : "MASCULINO"}</span><span>{index + 1}</span></div><p className="mt-4 truncate font-soft text-sm font-bold">{entry.label}</p><small>{new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {entry.mode === "text" ? "Texto" : "Foto"}</small><div className="mt-4 flex gap-2"><button onClick={() => openHistoryEntry(entry)}>Revisar</button><button onClick={() => copyPrompt(entry.prompt)} aria-label="Copiar prompt do histórico"><Copy className="h-3.5 w-3.5" /></button></div></article>)}</div> : <p className="py-8 text-center font-soft text-sm text-white/42">Quando você gerar um prompt, ele aparecerá aqui para revisão e cópia rápida.</p>}</section>
        </section>
        <footer className="flex flex-col justify-between gap-2 pt-7 font-soft text-[10px] tracking-[0.12em] text-white/38 sm:flex-row"><p>TEZZA PROMPTS OFICIAL</p><p>MÉTODO FEMININO · MÉTODO MASCULINO</p></footer>
      </main>
    </div>
  );
}
