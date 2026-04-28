import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInMinutes, parseISO, addDays, getISOWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Save, ArrowLeft, GripVertical, Clock } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";

import { listTimeClocks, bulkUpsertTimeClock } from "@/api/hr/time-clock";
import { listHolidays } from "@/api/hr/holidays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getEmployees } from "@/api/hr/employees";
import { MonthPicker } from "@/components/MonthPicker";

/** Parse a date-only string (or ISO with T00:00:00Z) into a local Date without timezone shift */
function parseDateOnly(dateStr: string): Date {
    const str = dateStr.substring(0, 10);
    const [yyyy, mm, dd] = str.split('-').map(Number);
    return new Date(yyyy, mm - 1, dd);
}

// Page Component
export function TimeSheetPage() {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State
    const [month, setMonth] = useState<Date>(new Date());
    const [isSaving, setIsSaving] = useState(false);

    // Queries
    const { data: employeesData } = useQuery({ queryKey: ['employees'], queryFn: () => getEmployees({ limit: 1000 }) });
    const employee = employeesData?.data?.find(e => e.id === employeeId);

    const { startDate, endDate, days } = useMemo(() => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const daysInterval = eachDayOfInterval({ start, end });
        return { startDate: start, endDate: end, days: daysInterval };
    }, [month]);

    const { data: timeClocks, isLoading } = useQuery({
        queryKey: ['time-clocks-mirror', employeeId, month.toISOString()],
        queryFn: () => listTimeClocks({
            employee_id: employeeId!,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            per_page: 32
        }),
        enabled: !!employeeId,
        staleTime: 5 * 60 * 1000
    });

    const { data: holidaysData } = useQuery({
        queryKey: ['holidays', month.getFullYear()],
        queryFn: () => listHolidays(month.getFullYear()),
        staleTime: 10 * 60 * 1000
    });

    const { register, control, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            rows: [] as any[]
        }
    });

    const { fields, replace } = useFieldArray({
        control,
        name: "rows"
    });

    // Sync form with data
    useEffect(() => {
        if (!isLoading && timeClocks) {
            const list = timeClocks.timeClocks || timeClocks.data || [];
            const newRows = days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayClock = list.find(tc => {
                    if (!tc.date) return false;
                    const tcDateStr = tc.date.split('T')[0];
                    return tcDateStr === dayStr;
                });
                const formatTime = (iso?: string | null) => iso ? format(parseISO(iso), 'HH:mm') : '';
                
                const isNextDay = (iso?: string | null) => {
                    if (!iso) return false;
                    const normalizedIsoDate = format(parseISO(iso), 'yyyy-MM-dd');
                    return normalizedIsoDate !== dayStr;
                };

                let status = "PRESENCA";
                if (!dayClock) {
                    status = "FOLGA";
                } else if (dayClock.absenceReason) {
                    status = dayClock.absenceReason;
                } else if (!dayClock.clockIn) {
                    status = "FOLGA";
                }

                return {
                    date: dayStr,
                    day,
                    status,
                    clockIn: formatTime(dayClock?.clockIn),
                    breakStart: formatTime(dayClock?.breakStart),
                    breakEnd: formatTime(dayClock?.breakEnd),
                    clockOut: formatTime(dayClock?.clockOut),
                    clockOutNextDay: isNextDay(dayClock?.clockOut),
                    extraClockIn: formatTime(dayClock?.extraClockIn),
                    extraClockOut: formatTime(dayClock?.extraClockOut),
                    extraClockOutNextDay: isNextDay(dayClock?.extraClockOut),
                    isExtraDay: dayClock?.isExtraDay ?? false,
                    negotiatedValue: dayClock?.negotiatedValue ?? undefined,
                };
            });
            replace(newRows);
        }
    }, [isLoading, timeClocks, month, replace, days]);

    const onSubmit = async (data: any) => {
        if (!employeeId) return;
        setIsSaving(true);
        try {
            const entries = data.rows
                .filter((r: any) => r.status === "PRESENCA" || r.status === "ATESTADO" || r.status === "FALTA_JUSTIFICADA" || r.status === "FALTA_INJUSTIFICADA")
                .map((r: any) => {
                    const buildDateTime = (timeStr?: string, isNextDay?: boolean) => {
                        if (!timeStr) return null;
                        const [h, m] = timeStr.split(':').map(Number);
                        const [yyyy, mm, dd] = r.date.split('-').map(Number);
                        let d = new Date(yyyy, mm - 1, dd, h, m, 0, 0);
                        if (isNextDay) d = addDays(d, 1);
                        return d.toISOString();
                    };

                    const st = r.status;
                    const isWorked = st === "PRESENCA";
                    const isJustified = st === "ATESTADO" || st === "FALTA_JUSTIFICADA";
                    const finalAbsenceReason = st === "PRESENCA" ? null : st;

                    return {
                        employee_id: employeeId,
                        date: r.date,
                        clockIn: isWorked ? buildDateTime(r.clockIn) : null,
                        breakStart: isWorked ? buildDateTime(r.breakStart) : null,
                        breakEnd: isWorked ? buildDateTime(r.breakEnd) : null,
                        clockOut: isWorked ? buildDateTime(r.clockOut, r.clockOutNextDay) : null,
                        extraClockIn: isWorked ? buildDateTime(r.extraClockIn) : null,
                        extraClockOut: isWorked ? buildDateTime(r.extraClockOut, r.extraClockOutNextDay) : null,
                        isExtraDay: isWorked ? r.isExtraDay : false,
                        absenceReason: finalAbsenceReason,
                        isJustifiedAbsence: isJustified,
                        negotiatedValue: r.negotiatedValue ? Number(r.negotiatedValue) : null,
                        isVerified: true,
                        notes: "Edição em lote via Espelho"
                    };
                });

            await bulkUpsertTimeClock(entries);
            toast.success("Mês salvo com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['time-clocks-mirror'] });
        } catch (err) {
            console.error(err)
            toast.error("Erro ao salvar mês.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!employeeId) return <div>Funcionário não encontrado</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
            {/* Header */}
            <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6 bg-card sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Voltar">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Espelho de Ponto</h1>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="font-medium text-foreground">{employee?.name}</span>
                            <span>•</span>
                            <span>{employee?.role}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Logic */}
                <div className="hidden md:flex items-center gap-4">
                    {(() => {
                        const rows = watch('rows') || [];
                        let totalMinutes60 = 0;
                        let totalMinutes100 = 0;
                        let dsrcMinutes = 0; // Descanso Semanal Remunerado
                        const weeks = new Set<string>();
                        const weeksWithInjustFalta = new Set<string>();
                        
                        rows.forEach((row: any) => {
                            const DAILY_MINUTES = 440; // 7h20
                            const d = new Date(row.date + "T12:00:00");
                            const weekKey = `${d.getFullYear()}-W${getISOWeek(d)}`;
                            weeks.add(weekKey);

                            if (row.status === "ATESTADO" || row.status === "FALTA_JUSTIFICADA") {
                                totalMinutes += DAILY_MINUTES;
                                return;
                            }

                            if (row.status === "FALTA_INJUSTIFICADA") {
                                weeksWithInjustFalta.add(weekKey);
                                return;
                            }

                            if (row?.status !== "PRESENCA") return;

                            const setTime = (t: string, nextDay?: boolean) => {
                                if (!t) return null;
                                const [h, m] = t.split(':').map(Number);
                                return (h + (nextDay ? 24 : 0)) * 60 + m;
                            };

                            const cin = setTime(row.clockIn, false);
                            const bin = setTime(row.breakStart, false);
                            const bout = setTime(row.breakEnd, false);
                            const cout = setTime(row.clockOut, row.clockOutNextDay);
                            const xcin = setTime(row.extraClockIn, false);
                            const xcout = setTime(row.extraClockOut, row.extraClockOutNextDay);

                            if (cin !== null && bin !== null && bout !== null && cout !== null) {
                                workedDayMins = (bin - cin) + (cout - bout);
                            } else if (cin !== null && cout !== null) {
                                if (bin === null && bout === null) {
                                    workedDayMins = (cout - cin);
                                }
                            }

                            if (xcin !== null && xcout !== null) {
                                workedDayMins += (xcout - xcin);
                            }

                            const isSunday = d.getDay() === 0;
                            const isHoliday = holidaysData?.holidays?.some(h => h.date.startsWith(row.date));
                            if (isSunday || isHoliday) {
                                totalMinutes100 += workedDayMins;
                            } else {
                                totalMinutes60 += workedDayMins;
                            }
                        });

                        // Adiciona o DSR (7h20) para cada semana na qual NÃO houve Falta Injustificada
                        weeks.forEach(w => {
                            if (!weeksWithInjustFalta.has(w)) {
                                dsrcMinutes += 440;
                            }
                        });

                        const totalMinutes = totalMinutes60 + totalMinutes100 + dsrcMinutes;

                        const isNegative = totalMinutes < 0;
                        const absMins = Math.abs(totalMinutes);
                        const h = Math.floor(absMins / 60);
                        const m = absMins % 60;
                        const formattedHours = `${isNegative ? '-' : ''}${h}h ${m.toString().padStart(2, '0')}m`;

                        return (
                            <>
                                <div className="flex items-center gap-6 px-4 py-2 bg-muted/30 rounded-lg border border-border/50 shadow-sm">
                                    {/* Saldo de Horas */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Horas Trabalhadas</span>
                                        <span className={cn("font-mono font-bold text-xl", "text-primary")}>
                                            {timeClocks?.summary?.totalHours || formattedHours}
                                        </span>
                                    </div>

                                    <div className="w-px h-8 bg-border" />

                                    {/* Dias Extras */}
                                    <div className="flex flex-col items-center text-green-600">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Dias Extras</span>
                                        <span className="font-mono font-bold text-xl">
                                            {timeClocks?.summary?.extraDays ?? rows.filter((r: any) => r.isExtraDay).length}
                                        </span>
                                    </div>
                                </div>

                                {employee?.registrationType === 'DAILY' && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-end px-3 py-2 bg-green-50/50 rounded-lg border border-green-100">
                                            <span className="text-green-700 text-[10px] uppercase tracking-wider font-semibold">Q1 (1 a 15)</span>
                                            <span className="font-mono font-bold text-lg text-green-700">
                                                {(() => {
                                                    const workedQ1 = rows.filter((r: any) => r.status === "PRESENCA" && new Date(r.date + "T12:00:00").getDate() <= 15).length;
                                                    const rate = employee.dailyRate || 0;
                                                    return (workedQ1 * rate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end px-3 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                            <span className="text-emerald-700 text-[10px] uppercase tracking-wider font-semibold">Q2 (16+)</span>
                                            <span className="font-mono font-bold text-lg text-emerald-700">
                                                {(() => {
                                                    const workedQ2 = rows.filter((r: any) => r.status === "PRESENCA" && new Date(r.date + "T12:00:00").getDate() > 15).length;
                                                    const rate = employee.dailyRate || 0;
                                                    return (workedQ2 * rate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {employee?.registrationType === 'HOURLY' && (
                                    <div className="flex flex-col items-end px-4 py-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <span className="text-blue-700 text-[10px] uppercase tracking-wider font-semibold">Total a Pagar (Horas)</span>
                                        <span className="font-mono font-bold text-xl text-blue-700">
                                            {(() => {
                                                const rate = Number(employee.salary) || 0;
                                                const totalValue = (totalMinutes / 60) * rate;
                                                return totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                            })()}
                                        </span>
                                    </div>
                                )}

                                {employee?.registrationType === 'REGISTERED' && (
                                    <div className="flex flex-col items-end px-4 py-2 bg-purple-50/50 rounded-lg border border-purple-100 shadow-sm">
                                        <span className="text-purple-700 text-[10px] uppercase tracking-wider font-semibold">Horas Extras (Estimativa)</span>
                                        <span className="font-mono font-bold text-lg text-purple-700">
                                            {(() => {
                                                const rate = Number(employee.salary) || 0;
                                                const hourlyRate = rate / 220;
                                                
                                                const overtimeHourlyRate60 = hourlyRate * 1.6; // 60%
                                                const overtimeHourlyRate100 = hourlyRate * 2.0; // 100%

                                                // Logica de saldo de banco de horas aproximada
                                                // 1. DSR já é computado para a "conta mensal"
                                                // 2. Horas de 100% são separadas e pagas à parte do saldo de horas em muitos lugares
                                                // Mas como estamos "estimando", vamos pegar o saldo excedente
                                                
                                                let summaryResult = timeClocks?.summary;
                                                
                                                // Se não temos um sumário do backend, fazemos uma estimativa simples
                                                const standardMinutes = 220 * 60;
                                                let estimatedOvt60 = 0;
                                                let estimatedOvt100 = totalMinutes100;

                                                if (totalMinutes60 + dsrcMinutes > standardMinutes) {
                                                    estimatedOvt60 = (totalMinutes60 + dsrcMinutes) - standardMinutes;
                                                }
                                                
                                                // Preferência pelo backend caso exista (pois é preciso linha a linha)
                                                const finalOvt60 = summaryResult?.totalOvertimeMinutes60 ?? estimatedOvt60;
                                                const finalOvt100 = summaryResult?.totalOvertimeMinutes100 ?? estimatedOvt100;

                                                const value60 = summaryResult?.totalOvertimeValue60 ?? ((finalOvt60 / 60) * overtimeHourlyRate60);
                                                const value100 = summaryResult?.totalOvertimeValue100 ?? ((finalOvt100 / 60) * overtimeHourlyRate100);
                                                const totalValue = value60 + value100;
                                                
                                                if (finalOvt60 <= 0 && finalOvt100 <= 0) return "0h00 - R$ 0,00";

                                                const totalOvtMins = finalOvt60 + finalOvt100;
                                                const h = Math.floor(totalOvtMins / 60);
                                                const m = totalOvtMins % 60;
                                                const formattedHE = `${h}h${m.toString().padStart(2, '0')}`;
                                                
                                                const formatMins = (mins: number) => `${Math.floor(mins/60)}h${(mins%60).toString().padStart(2, '0')}`;

                                                return (
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger className="cursor-help flex items-center gap-1 border-b border-dashed border-purple-300">
                                                                {formattedHE} = {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </TooltipTrigger>
                                                            <TooltipContent side="bottom" className="text-xs bg-purple-900 text-purple-50 p-3 max-w-[280px] leading-relaxed shadow-xl border-purple-800">
                                                                <p className="font-semibold mb-1 border-b border-purple-700 pb-1">Cálculo de Hora Extra</p>
                                                                <ul className="space-y-2 mt-2">
                                                                    <li><span className="opacity-70">Salário-base:</span> R$ {rate.toFixed(2)} (R$ {hourlyRate.toFixed(2)}/h)</li>
                                                                    {finalOvt60 > 0 && (
                                                                        <li className="bg-purple-800/50 p-1.5 rounded">
                                                                            <span className="opacity-70 font-semibold block">Dias Normais (+60%):</span> 
                                                                            {formatMins(finalOvt60)} = {value60.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </li>
                                                                    )}
                                                                    {finalOvt100 > 0 && (
                                                                        <li className="bg-purple-800/50 p-1.5 rounded">
                                                                            <span className="opacity-70 font-semibold block">Dom/Feriado (+100%):</span> 
                                                                            {formatMins(finalOvt100)} = {value100.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </li>
                                                                    )}
                                                                    <li className="pt-1 mt-1 border-t border-purple-700 font-bold text-purple-200">
                                                                        Total: {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                    </li>
                                                                </ul>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border rounded-md p-1 bg-background/50">
                        <MonthPicker date={month} setDate={setMonth} />
                    </div>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isSaving || isLoading} className="w-[180px] shadow-md">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </header>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-0">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Table className="border-collapse">
                        <TableHeader className="bg-muted sticky top-0 z-20 shadow-sm">
                            <TableRow className="border-b-2 border-muted-foreground/20">
                                <TableHead className="w-[100px] bg-muted font-bold pl-6">Data</TableHead>
                                <TableHead className="w-[85px] bg-muted font-bold text-center text-xs">Entrada 1</TableHead>
                                <TableHead className="w-[85px] bg-muted font-bold text-center text-xs">Saída 1</TableHead>
                                <TableHead className="w-[85px] bg-muted font-bold text-center text-xs">Entrada 2</TableHead>
                                <TableHead className="w-[85px] bg-muted font-bold text-center text-xs">Saída 2</TableHead>
                                <TableHead className="w-[85px] bg-muted font-bold text-center text-xs">Entrada 3</TableHead>
                                <TableHead className="w-[85px] bg-muted font-bold text-center text-xs">Saída 3</TableHead>
                                <TableHead className="w-[110px] bg-muted font-bold text-center text-xs">Status</TableHead>
                                <TableHead className="w-[60px] bg-muted font-bold text-center text-xs">Extra?</TableHead>
                                <TableHead className="w-[90px] bg-muted font-bold text-xs pr-2">Valor</TableHead>
                                <TableHead className="w-[80px] bg-muted font-bold text-right pr-4 text-xs">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fields.map((field: any, index) => (
                                    <MirrorRowField
                                        key={field.id}
                                        index={index}
                                        register={register}
                                        watch={watch}
                                        setValue={setValue}
                                        day={parseDateOnly(field.date)}
                                        dailyRate={employee?.dailyRate || 0}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </form>
            </div>
        </div>
    );
}

// Subcomponents



function MirrorRowField({ index, register, watch, setValue, day, dailyRate }: { index: number, register: any, watch: any, setValue: any, day: Date, dailyRate: number }) {
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    const status = watch(`rows.${index}.status`);
    const isWorked = status === "PRESENCA";
    const isExtraDay = watch(`rows.${index}.isExtraDay`);
    const clockIn = watch(`rows.${index}.clockIn`);
    const breakStart = watch(`rows.${index}.breakStart`);
    const breakEnd = watch(`rows.${index}.breakEnd`);
    const clockOut = watch(`rows.${index}.clockOut`);
    const extraClockIn = watch(`rows.${index}.extraClockIn`);
    const extraClockOut = watch(`rows.${index}.extraClockOut`);
    const clockOutNextDay = watch(`rows.${index}.clockOutNextDay`);
    const extraClockOutNextDay = watch(`rows.${index}.extraClockOutNextDay`);

    const [isDraggingOver, setIsDraggingOver] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, fieldName: string) => {
        e.dataTransfer.setData("fieldName", fieldName);
    };

    const handleDrop = (e: React.DragEvent, targetField: string) => {
        e.preventDefault();
        setIsDraggingOver(null);
        const sourceField = e.dataTransfer.getData("fieldName");
        if (sourceField && sourceField !== targetField) {
            const sourceVal = watch(`rows.${index}.${sourceField}`);
            const targetVal = watch(`rows.${index}.${targetField}`);

            setValue(`rows.${index}.${sourceField}`, targetVal);
            setValue(`rows.${index}.${targetField}`, sourceVal);
            toast.info("Horários trocados com sucesso!");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = e.currentTarget.form;
            if (!form) return;

            const inputs = Array.from(form.elements).filter(el =>
                el instanceof HTMLInputElement && !el.hidden && !el.disabled
            ) as HTMLInputElement[];

            const currentIndex = inputs.indexOf(e.currentTarget);
            const nextInput = inputs[currentIndex + 1];

            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const openPicker = (id: string) => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el && el.showPicker) {
            el.showPicker();
        }
    };

    const calculateHours = (cin?: string, bout?: string, bin?: string, cout?: string, xcin?: string, xcout?: string) => {
        let total = 0;
        const setTime = (t: string, isNext?: boolean) => {
            if (!t) return new Date();
            const [h, m] = t.split(':').map(Number);
            let d = new Date(day);
            d.setHours(h, m, 0, 0);
            if (isNext) d = addDays(d, 1);
            return d;
        };

        if (cin && bout) {
            total += differenceInMinutes(setTime(bout), setTime(cin));
        } else if (cin && cout && !bout && !bin) {
            total += differenceInMinutes(setTime(cout, clockOutNextDay), setTime(cin));
        }

        if (bin && cout) {
            total += differenceInMinutes(setTime(cout, clockOutNextDay), setTime(bin));
        }

        if (xcin && xcout) {
            total += differenceInMinutes(setTime(xcout, extraClockOutNextDay), setTime(xcin));
        }

        if (total <= 0) return "--";

        const h = Math.floor(Math.abs(total) / 60);
        const m = Math.abs(total) % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    }

    const netHours = calculateHours(clockIn, breakStart, breakEnd, clockOut, extraClockIn, extraClockOut);

    const getDisplayHours = () => {
        if (status === "ATESTADO" || status === "FALTA_JUSTIFICADA") return "7h 20m (virtual)";
        if (status !== "PRESENCA") return "--";
        return netHours;
    };

    return (
        <TableRow className={cn("hover:bg-muted/10 transition-colors", { "bg-blue-50/50": isWeekend })}>
            <TableCell className="font-medium pl-6 py-2 border-r">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">{format(day, 'dd/MM')}</span>
                    <span className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: ptBR })}</span>
                </div>
                <input type="hidden" {...register(`rows.${index}.date`)} />
            </TableCell>

            <TableCell 
                className={cn("p-0 border-r relative group", isDraggingOver === 'clockIn' && "bg-primary/10")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDraggingOver('clockIn'); }}
                onDragLeave={() => setIsDraggingOver(null)}
                onDrop={(e) => handleDrop(e, 'clockIn')}
            >
                <div className="flex items-center px-1">
                    <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, 'clockIn')} 
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                    <Input
                        type="time"
                        {...register(`rows.${index}.clockIn`)}
                        className="h-9 border-0 shadow-none text-center bg-transparent px-1 flex-1 min-w-0 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        disabled={!isWorked}
                        onKeyDown={(e) => handleKeyDown(e)}
                        id={`clockIn-${index}`}
                    />
                    <button 
                        type="button"
                        onClick={() => openPicker(`clockIn-${index}`)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        disabled={!isWorked}
                    >
                        <Clock className="h-3.5 w-3.5" />
                    </button>
                </div>
            </TableCell>
            <TableCell 
                className={cn("p-0 border-r relative group", isDraggingOver === 'breakStart' && "bg-primary/10")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDraggingOver('breakStart'); }}
                onDragLeave={() => setIsDraggingOver(null)}
                onDrop={(e) => handleDrop(e, 'breakStart')}
            >
                <div className="flex items-center px-1">
                    <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, 'breakStart')} 
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                    <Input
                        type="time"
                        {...register(`rows.${index}.breakStart`)}
                        className="h-9 border-0 shadow-none text-center bg-transparent px-1 flex-1 min-w-0 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        disabled={!isWorked}
                        onKeyDown={(e) => handleKeyDown(e)}
                        id={`breakStart-${index}`}
                    />
                    <button 
                        type="button"
                        onClick={() => openPicker(`breakStart-${index}`)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        disabled={!isWorked}
                    >
                        <Clock className="h-3.5 w-3.5" />
                    </button>
                </div>
            </TableCell>
            <TableCell 
                className={cn("p-0 border-r relative group", isDraggingOver === 'breakEnd' && "bg-primary/10")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDraggingOver('breakEnd'); }}
                onDragLeave={() => setIsDraggingOver(null)}
                onDrop={(e) => handleDrop(e, 'breakEnd')}
            >
                <div className="flex items-center px-1">
                    <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, 'breakEnd')} 
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                    <Input
                        type="time"
                        {...register(`rows.${index}.breakEnd`)}
                        className="h-9 border-0 shadow-none text-center bg-transparent px-1 flex-1 min-w-0 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        disabled={!isWorked}
                        onKeyDown={(e) => handleKeyDown(e)}
                        id={`breakEnd-${index}`}
                    />
                    <button 
                        type="button"
                        onClick={() => openPicker(`breakEnd-${index}`)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        disabled={!isWorked}
                    >
                        <Clock className="h-3.5 w-3.5" />
                    </button>
                </div>
            </TableCell>
            <TableCell 
                className={cn("p-0 border-r relative group", isDraggingOver === 'clockOut' && "bg-primary/10")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDraggingOver('clockOut'); }}
                onDragLeave={() => setIsDraggingOver(null)}
                onDrop={(e) => handleDrop(e, 'clockOut')}
            >
                <div className="flex items-center px-1">
                    <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, 'clockOut')} 
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                    <Input
                        type="time"
                        {...register(`rows.${index}.clockOut`)}
                        className="h-9 border-0 shadow-none text-center bg-transparent px-1 flex-1 min-w-0 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        disabled={!isWorked}
                        onKeyDown={(e) => handleKeyDown(e)}
                        id={`clockOut-${index}`}
                    />
                    <button 
                        type="button"
                        onClick={() => openPicker(`clockOut-${index}`)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        disabled={!isWorked}
                    >
                        <Clock className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setValue(`rows.${index}.clockOutNextDay`, !clockOutNextDay)}
                        className={cn(
                            "text-[10px] font-bold px-1 py-0.5 rounded transition-colors whitespace-nowrap",
                            clockOutNextDay ? "text-primary hover:bg-primary/5" : "text-slate-300 hover:text-slate-400"
                        )}
                        disabled={!isWorked}
                    >
                        1d+
                    </button>
                </div>
            </TableCell>
            <TableCell 
                className={cn("p-0 border-r relative group", isDraggingOver === 'extraClockIn' && "bg-primary/10")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDraggingOver('extraClockIn'); }}
                onDragLeave={() => setIsDraggingOver(null)}
                onDrop={(e) => handleDrop(e, 'extraClockIn')}
            >
                <div className="flex items-center px-1">
                    <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, 'extraClockIn')} 
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                    <Input
                        type="time"
                        {...register(`rows.${index}.extraClockIn`)}
                        className="h-9 border-0 shadow-none text-center bg-transparent px-1 flex-1 min-w-0 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        disabled={!isWorked}
                        onKeyDown={(e) => handleKeyDown(e)}
                        id={`extraClockIn-${index}`}
                    />
                    <button 
                        type="button"
                        onClick={() => openPicker(`extraClockIn-${index}`)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        disabled={!isWorked}
                    >
                        <Clock className="h-3.5 w-3.5" />
                    </button>
                </div>
            </TableCell>
            <TableCell 
                className={cn("p-0 border-r relative group", isDraggingOver === 'extraClockOut' && "bg-primary/10")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDraggingOver('extraClockOut'); }}
                onDragLeave={() => setIsDraggingOver(null)}
                onDrop={(e) => handleDrop(e, 'extraClockOut')}
            >
                <div className="flex items-center px-1">
                    <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, 'extraClockOut')} 
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                    <Input
                        type="time"
                        {...register(`rows.${index}.extraClockOut`)}
                        className="h-9 border-0 shadow-none text-center bg-transparent px-1 flex-1 min-w-0 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        disabled={!isWorked}
                        onKeyDown={(e) => handleKeyDown(e)}
                        id={`extraClockOut-${index}`}
                    />
                    <button 
                        type="button"
                        onClick={() => openPicker(`extraClockOut-${index}`)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        disabled={!isWorked}
                    >
                        <Clock className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setValue(`rows.${index}.extraClockOutNextDay`, !extraClockOutNextDay)}
                        className={cn(
                            "text-[10px] font-bold px-1 py-0.5 rounded transition-colors whitespace-nowrap",
                            extraClockOutNextDay ? "text-primary hover:bg-primary/5" : "text-slate-300 hover:text-slate-400"
                        )}
                        disabled={!isWorked}
                    >
                        1d+
                    </button>
                </div>
            </TableCell>

            <TableCell className="text-center border-r p-1">
                <div className="flex items-center justify-center h-full">
                    <select
                        {...register(`rows.${index}.status`)}
                        className={cn(
                            "h-8 text-[11px] rounded border bg-background px-1 w-full",
                            status === "ATESTADO" && "text-blue-600 font-semibold",
                            status === "FALTA_INJUSTIFICADA" && "text-red-600 font-semibold",
                            status === "FALTA_JUSTIFICADA" && "text-amber-600 font-semibold",
                            status === "FOLGA" && "text-muted-foreground italic",
                            status === "PRESENCA" && "text-foreground"
                        )}
                        onKeyDown={(e: any) => handleKeyDown(e)}
                    >
                        <option value="PRESENCA">Presença</option>
                        <option value="FOLGA">Folga</option>
                        <option value="ATESTADO">Atestado</option>
                        <option value="FALTA_JUSTIFICADA">F. Justificada</option>
                        <option value="FALTA_INJUSTIFICADA">F. Injustificada</option>
                    </select>
                </div>
            </TableCell>

            <TableCell className="text-center border-r p-0">
                <div className="flex items-center justify-center h-full">
                    <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                        {...register(`rows.${index}.isExtraDay`, {
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                const isChecked = e.target.checked;
                                if (isChecked && dailyRate && Number(dailyRate) > 0) {
                                    const currentVal = watch(`rows.${index}.negotiatedValue`);
                                    if (!currentVal || Number(currentVal) === 0) {
                                        setValue(`rows.${index}.negotiatedValue`, Number(dailyRate));
                                        toast.info(`Valor da diária preenchido: R$ ${Number(dailyRate).toFixed(2)}`, { duration: 1500 });
                                    }
                                }
                            }
                        })}
                        disabled={!isWorked}
                        onKeyDown={(e) => handleKeyDown(e as any)}
                    />
                </div>
            </TableCell>

            <TableCell className="p-1 border-r">
                <Input
                    type="number"
                    placeholder="0,00"
                    className={cn("h-8 border-0 shadow-none text-right focus-visible:ring-1",
                        isExtraDay ? "bg-green-50/50" : "bg-transparent text-muted-foreground"
                    )}
                    step="0.01"
                    disabled={!isExtraDay}
                    {...register(`rows.${index}.negotiatedValue`)}
                    onKeyDown={(e) => handleKeyDown(e)}
                />
            </TableCell>

            <TableCell className="text-right font-mono text-sm pr-6 bg-muted/5">
                {getDisplayHours()}
            </TableCell>
        </TableRow>
    )
}
