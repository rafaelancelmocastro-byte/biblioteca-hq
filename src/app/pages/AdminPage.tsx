import React, { useEffect, useState } from "react";
import {
  Shield,
  Server,
  Cloud,
  FileUp,
  Database,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Trash2,
  Download,
  UploadCloud,
  Sparkles,
  Lock,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app";
import { useLibrary } from "../../hooks/useLibrary";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { formatFileSize } from "../../lib/formatters";
import { storageProvider } from "../../services/storageProvider";
import { createComicRecord } from "../../services/comicAdminService";

export const AdminPage: React.FC = () => {
  const { allComics, seriesList, reloadData } = useLibrary();

  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newSeries, setNewSeries] = useState(seriesList[0]?.id || "");
  const [newIssue, setNewIssue] = useState("1");
  const [newYear, setNewYear] = useState("2026");
  const [newTotalPages, setNewTotalPages] = useState("1");

  useEffect(() => {
    if (!newSeries && seriesList[0]) setNewSeries(seriesList[0].id);
  }, [newSeries, seriesList]);

  // Estatísticas calculadas
  const totalMb = allComics.reduce((acc, curr) => acc + curr.fileSizeMb, 0);
  const totalPages = allComics.reduce((acc, curr) => acc + curr.totalPages, 0);
  const completedCount = allComics.filter((c) => c.progress?.status === "completed").length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        alert("Apenas arquivos PDF são permitidos na biblioteca de quadrinhos.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const series = seriesList.find((item) => item.id === newSeries) ?? seriesList[0];
    if (!selectedFile || !newTitle.trim() || !series) {
      setUploadStatus("Selecione o PDF, informe o título e escolha uma série.");
      return;
    }

    if (selectedFile.size > 250 * 1024 * 1024) {
      setUploadStatus("O arquivo excede o limite de 250 MB.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Enviando o PDF com conexão privada ao Cloudflare R2...");

    try {
      const uploaded = await storageProvider.uploadFile(selectedFile, "comics");
      setUploadStatus("PDF armazenado. Registrando metadados no Supabase...");
      await createComicRecord({
        title: newTitle,
        issueNumber: Number(newIssue),
        year: Number(newYear),
        totalPages: Number(newTotalPages),
        fileName: selectedFile.name,
        fileSizeMb: uploaded.fileSizeMb,
        pdfKey: uploaded.fileKey,
        series,
      });
      setUploadStatus("HQ enviada ao R2 e cadastrada no Supabase com sucesso.");
      setSelectedFile(null);
      setNewTitle("");
      setNewIssue("1");
      setNewTotalPages("1");
      await reloadData();
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Não foi possível concluir o upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearCache = () => {
    if (confirm("Deseja realmente limpar o histórico local de leitura e favoritos?")) {
      window.localStorage.removeItem("biblioteca_hq_progress_v1");
      window.localStorage.removeItem("biblioteca_hq_favorites_v1");
      window.location.reload();
    }
  };

  const handleExportBackup = () => {
    const data = {
      app: APP_CONFIG.name,
      version: APP_CONFIG.version,
      exportedAt: new Date().toISOString(),
      owner: APP_CONFIG.ownerEmail,
      comics: allComics,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_biblioteca_hq_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Header Admin */}
      <div className="border-b border-[#1e2535] pb-5">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Shield className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Painel do Proprietário</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Administração do Acervo
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Monitoramento de armazenamento, preparação de infraestrutura e gestão da coleção privada
        </p>
      </div>

      {/* Cards de Métricas do Acervo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121622] p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Total de HQs</span>
          <span className="text-2xl font-black text-white tabular-nums mt-1 block">
            {allComics.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Em {seriesList.length} séries e coleções</span>
        </div>

        <div className="bg-[#121622] p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Armazenamento</span>
          <span className="text-2xl font-black text-amber-400 tabular-nums mt-1 block">
            {formatFileSize(totalMb)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">PDFs de alta definição</span>
        </div>

        <div className="bg-[#121622] p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Páginas Catalogadas</span>
          <span className="text-2xl font-black text-white tabular-nums mt-1 block">
            {totalPages.toLocaleString("pt-BR")}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Total digitalizado</span>
        </div>

        <div className="bg-[#121622] p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Leituras Concluídas</span>
          <span className="text-2xl font-black text-emerald-400 tabular-nums mt-1 block">
            {completedCount}
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">
            {allComics.length ? Math.round((completedCount / allComics.length) * 100) : 0}% da biblioteca
          </span>
        </div>
      </div>

      {/* Seção 2: Status da Arquitetura Futura */}
      <div className="bg-[#121622] border border-[#1e2535] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">
            Status da Arquitetura & Provedores
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Supabase */}
          <div className="p-4 rounded-xl bg-[#161b2a] border border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Supabase Database
                </span>
                <Badge variant="emerald">Conectado</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Catálogo, séries, favoritos e progresso de leitura persistidos no banco com acesso autenticado.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
              Variáveis públicas: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
            </div>
          </div>

          {/* Cloudflare R2 */}
          <div className="p-4 rounded-xl bg-[#161b2a] border border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  Cloudflare R2 Bucket
                </span>
                <Badge variant="emerald">Conectado</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                PDFs e capas privados com upload e leitura por URLs assinadas temporárias.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
              Bucket: {APP_CONFIG.infra.storageBucketName}
            </div>
          </div>

          {/* PDF.js */}
          <div className="p-4 rounded-xl bg-[#161b2a] border border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  PDF.js Engine
                </span>
                <Badge variant="amber">Aguardando Fase 2</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Leitor vetorial de alta fidelidade com modos simples, duplo, vertical e zoom ativo nesta primeira etapa.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
              Canvas + Workers prontos
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3: Upload de Nova HQ */}
      <div className="bg-[#121622] border border-[#1e2535] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Cadastrar Nova HQ (PDF)</h2>
          </div>
          <Badge variant="outline">Apenas Proprietário</Badge>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="comic-title-input" className="text-xs font-semibold text-slate-300 block mb-1">
                Título da Edição
              </label>
              <input
                id="comic-title-input"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: O Retorno do Espectro Solar"
                className="w-full h-9 px-3 bg-[#0d1017] text-xs sm:text-sm text-slate-200 border border-slate-700 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="comic-series-select" className="text-xs font-semibold text-slate-300 block mb-1">
                Série / Coleção
              </label>
              <select
                id="comic-series-select"
                value={newSeries}
                onChange={(e) => setNewSeries(e.target.value)}
                className="w-full h-9 px-3 bg-[#0d1017] text-xs sm:text-sm text-slate-200 border border-slate-700 rounded-lg focus:border-amber-500 focus:outline-none"
              >
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="comic-issue-input" className="text-xs font-semibold text-slate-300 block mb-1">
                Número da Edição
              </label>
              <input
                id="comic-issue-input"
                type="number"
                min="1"
                value={newIssue}
                onChange={(e) => setNewIssue(e.target.value)}
                className="w-full h-9 px-3 bg-[#0d1017] text-xs sm:text-sm text-slate-200 border border-slate-700 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="comic-year-input" className="text-xs font-semibold text-slate-300 block mb-1">
                Ano de publicação
              </label>
              <input id="comic-year-input" type="number" min="1800" max="2200" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="w-full h-9 px-3 bg-[#0d1017] text-xs sm:text-sm text-slate-200 border border-slate-700 rounded-lg focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="comic-pages-input" className="text-xs font-semibold text-slate-300 block mb-1">
                Total de páginas
              </label>
              <input id="comic-pages-input" type="number" min="1" value={newTotalPages} onChange={(e) => setNewTotalPages(e.target.value)} className="w-full h-9 px-3 bg-[#0d1017] text-xs sm:text-sm text-slate-200 border border-slate-700 rounded-lg focus:border-amber-500 focus:outline-none" />
            </div>
          </div>

          {/* Área de Seleção de Arquivo */}
          <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-6 text-center bg-[#0d1017]/60 transition-colors">
            <input
              type="file"
              id="pdf-file-upload"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="pdf-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <FileUp className="w-8 h-8 text-amber-400 mb-2" />
              <span className="text-xs sm:text-sm font-bold text-white">
                {selectedFile ? selectedFile.name : "Clique para selecionar o arquivo PDF da HQ"}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB selecionados`
                  : "Suporta PDFs até 250 MB com validação de tipo MIME"}
              </span>
            </label>
          </div>

          {uploadStatus && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isUploading}
              className="font-bold"
            >
              Cadastrar e enviar ao R2
            </Button>
          </div>
        </form>
      </div>

      {/* Seção 4: Manutenção de Dados Locais & Backup */}
      <div className="bg-[#121622] border border-[#1e2535] rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-amber-400" />
          <span>Manutenção do Acervo Local</span>
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Gerencie o armazenamento de histórico temporário em localStorage desta etapa
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExportBackup}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Metadados em JSON
          </Button>

          <Button variant="danger" onClick={handleClearCache}>
            <Trash2 className="w-4 h-4 mr-2" />
            Restaurar Dados e Limpar Cache
          </Button>
        </div>
      </div>
    </div>
  );
};
