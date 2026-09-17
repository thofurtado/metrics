import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  FileText,
  LineChart,
  ClipboardList,
  History,
  Store,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Cloud,
} from 'lucide-react';
import { TabStockPosition } from './tabs/tab-stock-position';
import { TabStockIntake } from './tabs/tab-stock-intake';
import { TabRecipeConsumption } from './tabs/tab-recipe-consumption';
import { TabStockInventory } from './tabs/tab-stock-inventory';
import { TabStockMovements } from './tabs/tab-stock-movements';

export type StockTabId = 'position' | 'intake' | 'recipe' | 'inventory' | 'history' | 'movements';

export function StockDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as StockTabId) || 'position';

  const setTab = (tab: StockTabId) => {
    setSearchParams({ tab });
  };

  const tabs = [
    {
      id: 'position',
      label: 'Posição de Estoque',
      icon: Package,
    },
    {
      id: 'intake',
      label: 'Entrada de Mercadorias',
      icon: FileText,
    },
    {
      id: 'recipe',
      label: 'Consumo por Ficha Técnica',
      icon: LineChart,
      badge: 'Rastreabilidade',
    },
    {
      id: 'inventory',
      label: 'Inventário',
      icon: ClipboardList,
    },
    {
      id: 'history',
      label: 'Histórico / Extrato',
      icon: History,
    },
  ] as const;

  // Render contextual status indicator
  const renderStatusBadge = () => {
    switch (currentTab) {
      case 'recipe':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Baixas PDV Sincronizadas • Hoje às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        );
      case 'inventory':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            Sessão de Balanço em Andamento
          </div>
        );
      case 'history':
      case 'movements':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
            <Cloud className="w-3.5 h-3.5 text-emerald-500" />
            Nuvem Sincronizada
          </div>
        );
      case 'position':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            ÚLTIMO BALANÇO: HOJE, 14:32
          </div>
        );
    }
  };

  return (
    <div className="flex-1 space-y-5 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Sub-header Context Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Left: Breadcrumbs / Title */}
        <div className="flex items-center gap-2.5 flex-wrap text-sm">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-200/60 dark:border-emerald-800/60">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Controle de Estoque
          </div>

          <span className="text-slate-300 dark:text-slate-700 font-light">/</span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-sm">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span>Unidade Operacional</span>
          </div>
        </div>

        {/* Right: Status badge & Current Date */}
        <div className="flex items-center gap-3 flex-wrap">
          {renderStatusBadge()}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 text-xs font-medium shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar (Screenshot Style) */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              currentTab === tab.id ||
              (tab.id === 'history' && currentTab === 'movements');

            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id as StockTabId)}
                className={`group relative inline-flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels Content */}
      <div className="pt-2">
        {currentTab === 'position' && (
          <TabStockPosition
            onNavigateToIntake={() => setTab('intake')}
            onNavigateToRecipe={() => setTab('recipe')}
          />
        )}
        {currentTab === 'intake' && <TabStockIntake />}
        {currentTab === 'recipe' && <TabRecipeConsumption />}
        {currentTab === 'inventory' && (
          <TabStockInventory onFinished={() => setTab('history')} />
        )}
        {(currentTab === 'history' || currentTab === 'movements') && (
          <TabStockMovements />
        )}
      </div>
    </div>
  );
}
export default StockDashboard;
