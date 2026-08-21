import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  Check,
  Copy,
  History,
  ImageIcon,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Mode = "text" | "photo";

type PromptHistoryEntry = {
  id: string;
  createdAt: number;
  mode: Mode;
  label: string;
  prompt: string;
};

const SESSION_HISTORY_KEY = "tezza-prompts-session-history";
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function makeEntry(prompt: string, mode: Mode, label: string): PromptHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    mode,
    label: label.trim().slice(0, 72) || (mode === "photo" ? "Visual direction from photo" : "New text direction"),
    prompt,
  };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("text");
  const [direction, setDirection] = useState("");
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
    } catch {
      window.sessionStorage.removeItem(SESSION_HISTORY_KEY);
    }
  }, []);

  const generateMutation = trpc.prompt.generate.useMutation({
    onSuccess: data => {
      setGeneratedPrompt(data.prompt);
      const entry = makeEntry(data.prompt, mode, mode === "text" ? direction : imageName);
      setHistory(current => {
        const next = [entry, ...current].slice(0, 12);
        window.sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      toast.success("Prompt estruturado pelo Método 01.");
    },
    onError: error => toast.error(error.message || "Não foi possível gerar o prompt agora."),
  });

  const modeDescription = useMemo(
    () =>
      mode === "text"
        ? "Descreva o conceito, look, cenário ou objetivo. A IA organiza tudo no seu esqueleto fixo."
        : "Envie uma imagem. A IA preserva os elementos visuais observáveis e os converte no seu método.",
    [mode]
  );

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Escolha uma imagem em JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError("A imagem deve ter até 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result));
      setImageName(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageDataUrl(null);
    setImageName("");
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function generatePrompt() {
    if (mode === "text") {
      generateMutation.mutate({ mode: "text", userText: direction });
      return;
    }
    if (!imageDataUrl) {
      setImageError("Envie uma imagem para gerar pelo modo Foto.");
      return;
    }
    generateMutation.mutate({ mode: "photo", imageDataUrl });
  }

  async function copyPrompt(prompt = generatedPrompt) {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt copiado para a área de transferência.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o texto e tente novamente.");
    }
  }

  function openHistoryEntry(entry: PromptHistoryEntry) {
    setGeneratedPrompt(entry.prompt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetSession() {
    setHistory([]);
    window.sessionStorage.removeItem(SESSION_HISTORY_KEY);
    toast.success("Histórico desta sessão removido.");
  }

  return (
    <div className="ambient-bg min-h-screen overflow-x-hidden text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(oklch(0.9_0.03_340_/_0.04)_1px,transparent_1px),linear-gradient(90deg,oklch(0.9_0.03_340_/_0.04)_1px,transparent_1px)] [background-size:48px_48px]" />
      <main className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#d8a8ba]/55 bg-[#c05e81]/15 text-[15px] font-bold text-[#f4cfdb] shadow-[0_0_28px_rgba(206,95,140,0.22)]">T</div>
            <div>
              <p className="font-display text-[22px] leading-none tracking-[-0.04em] text-[#fff7f2]">Tezza <em className="font-normal text-[#e6aabe]">Prompts</em></p>
              <p className="mt-1 font-mono-editorial text-[9px] uppercase tracking-[0.24em] text-[#cbb1bd]">Cinematic prompt atelier</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="rounded-full border border-[#d6a9bb]/35 bg-[#c05e81]/10 px-3 py-1.5 font-mono-editorial text-[10px] tracking-[0.14em] text-[#f0c7d4]">METHOD 01</span>
            <span className="font-mono-editorial text-[10px] uppercase tracking-[0.11em] text-[#b79da8]">Text / Visual</span>
          </div>
        </header>

        <section className="grid gap-10 pb-10 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(410px,0.95fr)] lg:items-end lg:pt-16">
          <div className="rise-in max-w-3xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-[#e0a4ba]" />
              <p className="font-mono-editorial text-[10px] uppercase tracking-[0.22em] text-[#e9b8c9]">The signature workflow</p>
            </div>
            <h1 className="font-display text-5xl leading-[0.95] tracking-[-0.055em] text-[#fff9f4] sm:text-6xl lg:text-7xl">Direção precisa.<br /><em className="font-normal text-[#e9a8c0]">Prompt impecável.</em></h1>
            <p className="mt-7 max-w-2xl text-[15px] leading-7 text-[#d1bdc4] sm:text-base">Um espaço refinado para converter ideias ou linguagem visual em prompts de avatar CGI com a estrutura exata do seu Método 01.</p>
          </div>
          <div className="rise-in grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 [animation-delay:80ms]">
            {[
              ["01", "Estrutura", "Sempre fixa"],
              ["02", "Idioma", "Sempre inglês"],
              ["03", "Histórico", "Só nesta sessão"],
            ].map(([number, title, copy]) => (
              <div key={number} className="bg-[#2d1d31]/75 px-4 py-5 sm:px-5">
                <p className="font-mono-editorial text-[10px] text-[#d58eaa]">{number}</p>
                <p className="mt-3 text-xs font-bold text-[#f7eeee]">{title}</p>
                <p className="mt-1 text-[11px] text-[#ae97a0]">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="hairline h-px" />

        <section className="grid gap-5 py-8 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="glass-panel rounded-[1.35rem] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono-editorial text-[10px] uppercase tracking-[0.22em] text-[#d99cb3]">Input studio</p>
                <h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[#fff9f4]">Sua direção criativa</h2>
              </div>
              <div className="flex rounded-xl border border-white/10 bg-[#17101b]/45 p-1">
                <button onClick={() => setMode("text")} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97]", mode === "text" ? "bg-[#d983a3] text-[#2a1625] shadow-sm" : "text-[#c6adb8] hover:text-white")}><Type className="h-3.5 w-3.5" /> Texto</button>
                <button onClick={() => setMode("photo")} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97]", mode === "photo" ? "bg-[#d983a3] text-[#2a1625] shadow-sm" : "text-[#c6adb8] hover:text-white")}><ImageIcon className="h-3.5 w-3.5" /> Foto</button>
              </div>
            </div>

            <p className="mt-5 max-w-lg text-sm leading-6 text-[#c8b4bc]">{modeDescription}</p>

            {mode === "text" ? (
              <div className="mt-7 rise-in">
                <label htmlFor="creative-direction" className="mb-2 block font-mono-editorial text-[10px] uppercase tracking-[0.18em] text-[#d7b3c0]">Creative direction</label>
                <textarea id="creative-direction" value={direction} onChange={event => setDirection(event.target.value)} placeholder="Ex.: Uma avatar adulta em um rooftop de São Paulo à noite, cabelo cacheado solto, vestido preto minimalista e flash de smartphone..." className="min-h-[230px] w-full resize-y rounded-2xl border border-white/10 bg-[#170f19]/55 px-4 py-4 text-sm leading-6 text-[#f8edf1] outline-none transition focus:border-[#e7a5bd]/70 focus:ring-2 focus:ring-[#e7a5bd]/10 placeholder:text-[#846f79]" />
                <p className="mt-2 text-right font-mono-editorial text-[10px] text-[#927b85]">{direction.length} / 2400</p>
              </div>
            ) : (
              <div className="mt-7 rise-in">
                <input ref={fileInputRef} onChange={handlePhotoChange} accept="image/jpeg,image/png,image/webp" className="hidden" id="photo-upload" type="file" />
                {imageDataUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border border-[#d69db4]/35 bg-[#170f19]/55">
                    <img src={imageDataUrl} alt="Prévia da imagem selecionada" className="h-[280px] w-full object-cover opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-[#170f19] via-[#170f19]/85 to-transparent px-4 pb-4 pt-12">
                      <p className="min-w-0 truncate text-xs text-[#f8edf1]">{imageName}</p>
                      <button onClick={clearImage} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 bg-[#2b1a2a]/80 text-[#edb0c4] transition hover:bg-[#d983a3] hover:text-[#2a1625] active:scale-[0.97]" aria-label="Remover imagem"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="photo-upload" className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#d49ab3]/40 bg-[#170f19]/35 px-7 text-center transition duration-200 hover:border-[#e8b4c8]/80 hover:bg-[#c05e81]/10">
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-[#da9fb7]/35 bg-[#c05e81]/15 text-[#efb4ca] transition duration-200 group-hover:scale-105"><Upload className="h-5 w-5" /></span>
                    <p className="mt-5 text-sm font-bold text-[#f8edf1]">Enviar imagem de referência</p>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-[#aa939d]">JPG, PNG ou WEBP. Até 4 MB. A imagem é usada somente para esta geração.</p>
                  </label>
                )}
                {imageError && <p className="mt-3 text-xs font-medium text-[#f1a2bb]">{imageError}</p>}
              </div>
            )}

            <Button onClick={generatePrompt} disabled={generateMutation.isPending || (mode === "text" ? direction.trim().length < 8 : !imageDataUrl)} className="mt-7 h-12 w-full rounded-xl bg-[#e498b3] text-sm font-bold text-[#2a1625] shadow-[0_14px_30px_rgba(219,115,153,0.18)] transition hover:bg-[#f0acc4] active:scale-[0.98] disabled:opacity-45">
              {generateMutation.isPending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Estruturando seu prompt...</> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar com Método 01 <ArrowUpRight className="ml-1 h-4 w-4" /></>}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-2 text-center font-mono-editorial text-[9px] uppercase tracking-[0.12em] text-[#917883]"><span className="h-1.5 w-1.5 rounded-full bg-[#e498b3]" /> Texto final sempre em inglês · Estrutura bloqueada</p>
          </div>

          <div className="glass-panel flex min-h-[620px] flex-col rounded-[1.35rem] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono-editorial text-[10px] uppercase tracking-[0.22em] text-[#d99cb3]">Prompt output</p>
                <h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[#fff9f4]">Pronto para copiar</h2>
              </div>
              <button onClick={() => copyPrompt()} disabled={!generatedPrompt} className={cn("flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45", copied ? "border-[#94d8bb]/50 bg-[#7bc8a5]/15 text-[#b7efd3]" : "border-[#d99cb3]/35 bg-[#c05e81]/10 text-[#f3c1d2] hover:bg-[#c05e81]/20")}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiado" : "Copiar prompt"}
              </button>
            </div>
            {generatedPrompt ? (
              <div className="editor-scroll mt-6 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#130d16]/62 p-5 sm:p-6">
                <pre className="font-mono-editorial whitespace-pre-wrap break-words text-[11px] leading-6 text-[#e9dfe3] sm:text-[12px]">{generatedPrompt}</pre>
              </div>
            ) : (
              <div className="mt-6 grid flex-1 place-items-center rounded-2xl border border-dashed border-white/10 bg-[#130d16]/30 px-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#d99cb3]/30 bg-[#c05e81]/10 text-[#e8acc1]"><Sparkles className="h-5 w-5" /></div>
                  <h3 className="mt-5 font-display text-2xl text-[#f9f0f2]">A estrutura aguarda sua direção.</h3>
                  <p className="mt-3 text-sm leading-6 text-[#a78f99]">O resultado incluirá a abertura fixa, todos os mini títulos obrigatórios e o encerramento fixo do Método 01.</p>
                </div>
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-3 text-[10px] text-[#a58b96]">
              <span className="font-mono-editorial uppercase tracking-[0.12em]">English output only</span>
              <span>{generatedPrompt ? `${generatedPrompt.length.toLocaleString("pt-BR")} characters` : "14 required sections"}</span>
            </div>
          </div>
        </section>

        <section className="glass-panel mt-2 rounded-[1.35rem] p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#c05e81]/14 text-[#e8acc1]"><History className="h-4 w-4" /></span>
              <div><p className="font-display text-2xl tracking-[-0.04em] text-[#fff9f4]">Sessão atual</p><p className="text-[11px] text-[#a58b96]">Seus prompts ficam disponíveis até você fechar esta aba.</p></div>
            </div>
            {history.length > 0 && <button onClick={resetSession} className="flex items-center gap-2 self-start text-[11px] font-semibold text-[#dba4b8] transition hover:text-[#fff2f5] sm:self-auto"><RotateCcw className="h-3.5 w-3.5" /> Limpar histórico</button>}
          </div>
          {history.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {history.map((entry, index) => (
                <article key={entry.id} className="group rounded-xl border border-white/8 bg-[#160f19]/45 p-4 transition duration-200 hover:border-[#d99cb3]/32 hover:bg-[#c05e81]/8">
                  <div className="flex items-center justify-between gap-3"><span className="rounded-full border border-white/10 px-2 py-1 font-mono-editorial text-[9px] uppercase tracking-[0.1em] text-[#c9aab7]">{entry.mode === "text" ? "Texto" : "Foto"}</span><span className="text-[10px] text-[#8f7781]">{index + 1}</span></div>
                  <p className="mt-4 truncate text-sm font-bold text-[#f5e8ee]">{entry.label}</p>
                  <p className="mt-1 text-[11px] text-[#9e8690]">{new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  <div className="mt-4 flex gap-2"><button onClick={() => openHistoryEntry(entry)} className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-[#d9c0ca] transition hover:border-[#d99cb3]/40 hover:text-white">Revisar</button><button onClick={() => copyPrompt(entry.prompt)} className="grid w-9 place-items-center rounded-lg border border-white/10 text-[#d9a1b7] transition hover:border-[#d99cb3]/40 hover:bg-[#c05e81]/14" aria-label="Copiar prompt do histórico"><Copy className="h-3.5 w-3.5" /></button></div>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-7 text-center text-sm text-[#9e8790]">Quando você gerar um prompt, ele aparecerá aqui para revisão e cópia rápida.</p>
          )}
        </section>

        <footer className="flex flex-col justify-between gap-3 pt-8 text-[10px] text-[#927984] sm:flex-row"><p className="font-mono-editorial uppercase tracking-[0.14em]">TEZZA PROMPTS · METHOD 01</p><p>Prompt engine com estrutura visual rigorosamente fixada.</p></footer>
      </main>
    </div>
  );
}
