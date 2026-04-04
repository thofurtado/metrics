import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInMinutes, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";

import { listTimeClocks, bulkUpsertTimeClock } from "@/api/hr/time-clock";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { MonthPicker } from "@/components/MonthPicker";

/** Parse a date-only string (or ISO with T00:00:00Z) into a local Date without timezone shift */
function parseDateOnly(dateStr: string): Date {
    const str = dateStr.substring(0, 10);
    const [yyyy, mm, dd] = str.split('-').map(Number);
    return new Date(yyyy, mm - 1, dd);
}

interface TimeClockMirrorProps {
    employeeId: string;
    employeeName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function TimeClockMirrorDialog({ employeeId, employeeName, isOpen, onClose }: TimeClockMirrorProps) {
    const [month, setMonth] = useState<Date>(new Date());
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);

    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);

    const { data: timeClocks, isLoading } = useQuery({
        queryKey: ['time-clocks-mirror', employeeId, month.toISOString()],
        queryFn: () => listTimeClocks({
            employee_id: employeeId,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            per_page: 32
        }),
        enabled: isOpen,
        staleTime: 5 * 60 * 1000 // 5 minutes to avoid overwriting form on window focus
    });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const { register, control, handleSubmit, watch } = useForm({
        defaultValues: {
            rows: [] as any[]
        }
    });

    const { fields, replace } = useFieldArray({
        control,
        name: "rows"
    });

    // Populate form when data is loaded
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
                    // Força a interpretação da string ISO em horário local para comparar corretamente com a data da linha (dayStr)
                    const normalizedIsoDate = format(parseISO(iso), 'yyyy-MM-dd');
                    return normalizedIsoDate !== dayStr;
                };

                return {
                    date: dayStr,
                    day, // Keep date obj for rendering
                    worked: !!dayClock,
                    clockIn: formatTime(dayClock?.clockIn),
                    breakStart: formatTime(dayClock?.breakStart),
                    breakEnd: formatTime(dayClock?.breakEnd),
                    clockOut: formatTime(dayClock?.clockOut),
                    clockOutNextDay: isNextDay(dayClock?.clockOut),
                    extraClockIn: formatTime(dayClock?.extraClockIn),
                    extraClockOut: formatTime(dayClock?.extraClockOut),
                    extraClockOutNextDay: isNextDay(dayClock?.extraClockOut),
                    isExtraDay: dayClock?.isExtraDay ?? false,
                    isVerified: dayClock?.isVerified ?? true,
                    negotiatedValue: dayClock?.negotiatedValue ?? undefined,
                };
            });
            replace(newRows);
        }
    }, [isLoading, timeClocks, month, replace, days]); // Update when month changes too


    const onSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            const entries = data.rows.map((r: any) => {
                const buildDateTime = (timeStr?: string, isNextDay?: boolean) => {
                    if (!timeStr) return null;
                    const [h, m] = timeStr.split(':').map(Number);
                    const [yyyy, mm, dd] = r.date.split('-').map(Number);
                    let d = new Date(yyyy, mm - 1, dd, h, m, 0, 0);
                    if (isNextDay) d = addDays(d, 1);
                    return d.toISOString();
                };

                // When worked is false, clear all time fields and set isExtraDay to false
                if (!r.worked) {
                    return {
                        employee_id: employeeId,
                        date: r.date,
                        clockIn: null,
                        breakStart: null,
                        breakEnd: null,
                        clockOut: null,
                        extraClockIn: null,
                        extraClockOut: null,
                        isExtraDay: false,
                        negotiatedValue: null,
                        isVerified: r.isVerified ?? false,
                        notes: "Edição em lote via Espelho"
                    };
                }

                return {
                    employee_id: employeeId,
                    date: r.date,
                    clockIn: buildDateTime(r.clockIn),
                    breakStart: buildDateTime(r.breakStart),
                    breakEnd: buildDateTime(r.breakEnd),
                    clockOut: buildDateTime(r.clockOut, r.clockOutNextDay),
                    extraClockIn: buildDateTime(r.extraClockIn),
                    extraClockOut: buildDateTime(r.extraClockOut, r.extraClockOutNextDay),
                    isExtraDay: r.isExtraDay,
                    negotiatedValue: r.negotiatedValue ? Number(r.negotiatedValue) : null,
                    isVerified: r.isVerified ?? true,
                    notes: "Edição em lote via Espelho"
                };
            });

            // Log para debug
            console.log("Payload enviado para /hr/time-clocks/bulk:", entries);
            console.log("Número de entradas:", entries.length);

            // Garantir que enviamos a requisição mesmo se todas as entradas estiverem com worked = false
            if (entries.length === 0) {
                console.log("Nenhuma entrada para enviar - isso não deveria acontecer pois enviamos todas as linhas");
                toast.success("Nenhuma alteração detectada.");
            } else {
                await bulkUpsertTimeClock(entries);
                toast.success("Mês salvo com sucesso!");
                queryClient.invalidateQueries({ queryKey: ['time-clocks-mirror'] });
            }
            // onClose(); // Keep open? User said "Excel Grid", arguably keep open to continue editing.
        } catch (err) {
            console.error("Erro ao salvar mês:", err)
            toast.error("Erro ao salvar mês.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
                <form onSubmit={handleSubmit(onSubmit)} className="contents">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-2xl flex items-center gap-4">
                            Espelho de Ponto: <span className="text-primary">{employeeName}</span>
                        </DialogTitle>
                        <div className="flex items-center gap-4 pt-4 justify-between">
                            <div className="flex items-center gap-2">
                                <MonthPicker date={month} setDate={setMonth} />
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            <Button type="submit" disabled={isSaving || isLoading}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Mês Completo
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-6 pt-2">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[100px]">Data</TableHead>
                                    <TableHead className="w-[85px] text-xs px-1 text-center">Entrada 1</TableHead>
                                    <TableHead className="w-[85px] text-xs px-1 text-center">Saída 1</TableHead>
                                    <TableHead className="w-[85px] text-xs px-1 text-center">Entrada 2</TableHead>
                                    <TableHead className="w-[85px] text-xs px-1 text-center">Saída 2</TableHead>
                                    <TableHead className="w-[85px] text-xs px-1 text-center">Entrada 3</TableHead>
                                    <TableHead className="w-[85px] text-xs px-1 text-center">Saída 3</TableHead>
                                    <TableHead className="w-[60px] text-center text-xs">Trab.?</TableHead>
                                    <TableHead className="w-[60px] text-center text-xs">Extra?</TableHead>
                                    <TableHead className="w-[60px] text-center text-xs">Verif.?</TableHead>
                                    <TableHead className="w-[90px] text-xs">Valor (R$)</TableHead>
                                    <TableHead className="w-[90px] text-right text-xs pr-2">Saldo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field: any, index) => (
                                    <MirrorRowField
                                        key={field.id}
                                        index={index}
                                        register={register}
                                        watch={watch}
                                        day={parseDateOnly(field.date)}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}



function MirrorRowField({ index, register, watch, day }: { index: number, register: any, watch: any, day: Date }) {
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    // Watch fields for this row
    const worked = watch(`rows.${index}.worked`);
    const isExtraDay = watch(`rows.${index}.isExtraDay`);
    const isVerified = watch(`rows.${index}.isVerified`);
    const clockIn = watch(`rows.${index}.clockIn`);
    const breakStart = watch(`rows.${index}.breakStart`);
    const breakEnd = watch(`rows.${index}.breakEnd`);
    const clockOut = watch(`rows.${index}.clockOut`);
    const extraClockIn = watch(`rows.${index}.extraClockIn`);
    const extraClockOut = watch(`rows.${index}.extraClockOut`);
    const clockOutNextDay = watch(`rows.${index}.clockOutNextDay`);
    const extraClockOutNextDay = watch(`rows.${index}.extraClockOutNextDay`);

    // Calculate hours helper
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

    return (
        <TableRow className={cn({ "bg-muted/20": isWeekend })}>
            <TableCell className="font-medium">
                <div className="flex flex-col">
                    <span>{format(day, 'dd/MM')}</span>
                    <span className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: ptBR })}</span>
                </div>
                {/* Hidden Date Field */}
                <input type="hidden" {...register(`rows.${index}.date`)} />
            </TableCell>

            <TableCell className="px-1">
                <Input type="time" {...register(`rows.${index}.clockIn`)} className="h-8 px-1 text-center" disabled={!worked} />
            </TableCell>
            <TableCell className="px-1">
                <Input type="time" {...register(`rows.${index}.breakStart`)} className="h-8 px-1 text-center" disabled={!worked} />
            </TableCell>
            <TableCell className="px-1">
                <Input type="time" {...register(`rows.${index}.breakEnd`)} className="h-8 px-1 text-center" disabled={!worked} />
            </TableCell>
            <TableCell className="px-1">
                <div className="flex flex-col items-center gap-0.5">
                    <Input 
                        type="time" 
                        {...register(`rows.${index}.clockOut`)} 
                        className="h-8 px-1 text-center [&::-webkit-calendar-picker-indicator]:hidden" 
                        disabled={!worked} 
                    />
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" {...register(`rows.${index}.clockOutNextDay`)} className="h-3 w-3" disabled={!worked} />
                        <span className="text-[9px] font-bold text-orange-600 leading-none">1d+</span>
                    </label>
                </div>
            </TableCell>
            <TableCell className="px-1">
                <Input 
                    type="time" 
                    {...register(`rows.${index}.extraClockIn`)} 
                    className="h-8 px-1 text-center [&::-webkit-calendar-picker-indicator]:hidden" 
                    disabled={!worked} 
                />
            </TableCell>
            <TableCell className="px-1">
                <div className="flex flex-col items-center gap-0.5">
                    <Input 
                        type="time" 
                        {...register(`rows.${index}.extraClockOut`)} 
                        className="h-8 px-1 text-center [&::-webkit-calendar-picker-indicator]:hidden" 
                        disabled={!worked} 
                    />
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" {...register(`rows.${index}.extraClockOutNextDay`)} className="h-3 w-3" disabled={!worked} />
                        <span className="text-[9px] font-bold text-orange-600 leading-none">1d+</span>
                    </label>
                </div>
            </TableCell>

            <TableCell className="text-center">
                <input type="checkbox" className="h-4 w-4" {...register(`rows.${index}.worked`)} />
            </TableCell>

            <TableCell className="text-center">
                <input type="checkbox" className="h-4 w-4" {...register(`rows.${index}.isExtraDay`)} disabled={!worked} />
            </TableCell>

            <TableCell className="text-center">
                <input type="checkbox" className="h-4 w-4" {...register(`rows.${index}.isVerified`)} />
            </TableCell>

            <TableCell>
                {isExtraDay && (
                    <Input
                        type="number"
                        placeholder="R$"
                        className="h-8 w-24"
                        step="0.01"
                        {...register(`rows.${index}.negotiatedValue`)}
                    />
                )}
            </TableCell>

            <TableCell className="text-right font-mono text-xs">
                {worked ? netHours : '--'}
            </TableCell>
        </TableRow>
    )
}
