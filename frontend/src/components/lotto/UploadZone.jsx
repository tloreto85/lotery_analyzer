import { useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

export const UploadZone = ({ onFile, loading }) => {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);

  const handle = (file) => file && onFile(file);

  return (
    <div
      data-testid="file-dropzone"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      className={`panel cursor-pointer border-dashed p-6 flex items-center gap-5 transition-colors duration-200 ${
        drag ? "border-emerald-400 bg-emerald-500/10" : "hover:border-emerald-500/60"
      }`}
    >
      <div className="shrink-0 w-12 h-12 rounded-lg bg-emerald-500/15 text-emerald-400 grid place-items-center">
        {loading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
      </div>
      <div className="min-w-0">
        <p className="font-display text-base text-white">Carregar concursos (.txt)</p>
        <p className="text-sm text-slate-400">
          Arraste o arquivo ou clique. Uma linha por concurso: 15 números separados por vírgula, espaço ou ponto e vírgula
          (nº do concurso opcional no início).
        </p>
      </div>
      <input
        ref={ref}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        data-testid="file-upload-input"
        onChange={(e) => { handle(e.target.files[0]); e.target.value = ""; }}
      />
    </div>
  );
};
