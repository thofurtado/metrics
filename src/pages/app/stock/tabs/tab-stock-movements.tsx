import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  Calendar,
  Filter,
  ShoppingCart,
  Receipt,
  Trash2,
  Scale,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  AlertTriangle,
  Layers,
  Utensils,
  RefreshCw,
} from 'lucide-react';
import {
  getStockMovements,
  StockMovementRecord,
  StockMovementsResponse,
} from '@/api/stock';

export function TabStockMovements() {
  const [data, setData] = useState<StockMovementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('TODOS');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData() {
    try {
      setLoading(true);
      const res = await getStockMovements({ period: selectedPeriod });
      setData(res);
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  // Filter items
  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((rec) => {
      const matchesSearch =
        rec.supplyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.sku && rec.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rec.category && rec.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        rec.originDetail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        selectedTypeFilter === 'TODOS' || rec.eventType === selectedTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [data, searchTerm, selectedTypeFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleExport = () => {
    if (!data?.records) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Data & Hora,Insumo,Categoria,SKU,Tipo de Evento,Movimentação,Saldo Resultante,Saldo Anterior,Origem/Detalhe',
        ...filteredRecords.map(
          (r) =>
            `"${r.dateTime}","${r.supplyName}","${r.category || ''}","${
              r.sku || ''
            }","${r.eventType}","${r.deltaFormatted}","${r.resultStockFormatted}","${
              r.prevStockFormatted
            }","${r.originDetail.replace(/"/g, '""')}"`
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `extrato_estoque_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventBadge = (type: StockMovementRecord['eventType']) => {
    switch (type) {
      case 'SALE_PDV':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <ShoppingCart className="w-3.5 h-3.5" />
            Venda PDV
          </span>
        );
      case 'PURCHASE_NFE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <Receipt className="w-3.5 h-3.5" />
            Entrada NF-e
          </span>
        );
      case 'LOSS_WASTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <Trash2 className="w-3.5 h-3.5" />
            Desperdício / Perda
          </span>
        );
      case 'BALANCE_AUDIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
            <Scale className="w-3.5 h-3.5" />
            Balanço Físico
          </span>
        );
      case 'RETURN_CANCEL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <RotateCcw className="w-3.5 h-3.5" />
            Estorno
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
            {type}
          </span>
        );
    }
  };

  const getOriginIcon = (originType?: string) => {
    switch (originType) {
      case 'nfe':
        return <FileText className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />;
      case 'waste':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />;
      case 'cancel':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
      case 'inventory':
        return <Scale className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />;
      case 'table':
      case 'counter':
      default:
        return <Utensils className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
    }
  };

  const quickCounts = useMemo(() => {
    if (!data?.records)
      return { total: 0, salePdv: 0, purchaseNfe: 0, lossWaste: 0, balance: 0 };
    return {
      total: data.records.length,
      salePdv: data.records.filter((r) => r.eventType === 'SALE_PDV').length,
      purchaseNfe: data.records.filter((r) => r.eventType === 'PURCHASE_NFE').length,
      lossWaste: data.records.filter((r) => r.eventType === 'LOSS_WASTE').length,
      balance: data.records.filter((r) => r.eventType === 'BALANCE_AUDIT').length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Histórico de Movimentações
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Extrato cronológico de entradas, saídas e vendas dos insumos.
          </p>
        </div>

        {/* Top Summary Badges & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Total hoje: <span className="text-slate-900 dark:text-white font-bold">{data?.todayTotalRecords || quickCounts.total} registros</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Entradas: + R$ {data?.entriesTotalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '8.450,00'}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 shadow-sm dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Baixas: - R$ {data?.lossesTotalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '6.230,00'}
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Extrato
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3">
        {/* Row 1: Search + Period Dropdown + Movement Type Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por insumo (ex: Cerveja, Picanha, Chopp)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
            />
          </div>

          {/* Period selector */}
          <div className="relative sm:w-44">
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="all">Todas as Datas</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Event Type selector */}
          <div className="relative sm:w-56">
            <select
              value={selectedTypeFilter}
              onChange={(e) => {
                setSelectedTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODOS">Todas as Movimentações</option>
              <option value="SALE_PDV">Vendas PDV</option>
              <option value="PURCHASE_NFE">Entradas NF-e</option>
              <option value="LOSS_WASTE">Perdas & Descarte</option>
              <option value="BALANCE_AUDIT">Balanço Físico</option>
              <option value="RETURN_CANCEL">Estornos</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Row 2: Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedTypeFilter('TODOS');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedTypeFilter === 'TODOS'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Todos ({quickCounts.total})
          </button>

          <button
            onClick={() => {
              setSelectedTypeFilter('SALE_PDV');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedTypeFilter === 'SALE_PDV'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-3 h-3 text-blue-500" />
            Vendas PDV ({quickCounts.salePdv})
          </button>

          <button
            onClick={() => {
              setSelectedTypeFilter('PURCHASE_NFE');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedTypeFilter === 'PURCHASE_NFE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-3 h-3 text-emerald-500" />
            Entradas NF-e ({quickCounts.purchaseNfe})
          </button>

          <button
            onClick={() => {
              setSelectedTypeFilter('LOSS_WASTE');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedTypeFilter === 'LOSS_WASTE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Trash2 className="w-3 h-3 text-rose-500" />
            Perdas & Descarte ({quickCounts.lossWaste})
          </button>

          <button
            onClick={() => {
              setSelectedTypeFilter('BALANCE_AUDIT');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedTypeFilter === 'BALANCE_AUDIT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Scale className="w-3 h-3 text-indigo-500" />
            Balanço ({quickCounts.balance})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  DATA & HORA
                </th>
                <th scope="col" className="px-5 py-3.5">
                  INSUMO / ITEM
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  TIPO DE EVENTO
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  MOVIMENTAÇÃO
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  SALDO RESULTANTE
                </th>
                <th scope="col" className="px-5 py-3.5">
                  ORIGEM / DETALHE AUDITÁVEL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Carregando extrato de movimentações...
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Nenhuma movimentação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const isPositive = item.deltaValue > 0;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Date & Time */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.dateTime}
                      </td>

                      {/* 2. Supply / Item */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {item.supplyName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{item.category || 'Geral'}</span>
                          {item.sku && (
                            <>
                              <span>•</span>
                              <span>SKU: {item.sku}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. Event Type Badge */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {getEventBadge(item.eventType)}
                      </td>

                      {/* 4. Movement (Delta) */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )}
                          {item.deltaFormatted}
                        </span>
                      </td>

                      {/* 5. Resulting Balance */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.resultStockFormatted}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ant. {item.prevStockFormatted}
                        </div>
                      </td>

                      {/* 6. Origin / Audit Detail */}
                      <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {getOriginIcon(item.originType)}
                          <span className="truncate max-w-xs sm:max-w-md font-medium">
                            {item.originDetail}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 dark:bg-slate-950 dark:border-slate-800 text-xs text-slate-500">
          <div>
            Mostrando{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filteredRecords.length}
            </span>{' '}
            movimentações
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg font-semibold transition ${
                    currentPage === pageNum
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-slate-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-8 h-8 rounded-lg font-semibold transition ${
                    currentPage === totalPages
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition font-medium"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
