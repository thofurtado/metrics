import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInMinutes, parseISO } from "date-fns";
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
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
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
                const dayClock = list.find(tc => tc.date && isSameDay(parseISO(tc.date), day));
                const formatTime = (iso?: string | null) => iso ? format(parseISO(iso), 'HH:mm') : '';

                return {
                    date: day.toISOString(),
                    day, // Keep date obj for rendering
                    worked: !!dayClock,
                    clockIn: formatTime(dayClock?.clockIn),
                    breakStart: formatTime(dayClock?.breakStart),
                    breakEnd: formatTime(dayClock?.breakEnd),
                    clockOut: formatTime(dayClock?.clockOut),
                    isExtraDay: dayClock?.isExtraDay ?? false,
                    negotiatedValue: dayClock?.negotiatedValue ?? undefined,
                };
            });
            replace(newRows);
        }
    }, [isLoading, timeClocks, month, replace, days]); // Update when month changes too


    const onSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            const entries = data.rows
                .filter((r: any) => r.worked || r.isExtraDay || r.clockIn || r.clockOut) // Only send relevant rows? Or all? User said "batch complete". Sending all is safer for "upsert". Wait, if I send empty rows, backend might create empty records?
                // Actually, if "worked" is false and everything is empty, we probably shouldn't send unless we want to clear existing?
                // Current backend upsert logic: if existing, update. If fields are null, it updates to null.
                // So sending all is correct to clear data if needed.
                .map((r: any) => {
                    const buildDateTime = (timeStr?: string) => {
                        if (!timeStr) return null;
                        const [h, m] = timeStr.split(':').map(Number);
                        const d = new Date(r.date);
                        d.setHours(h, m, 0, 0);
                        return d.toISOString();
                    };

                    return {
                        employee_id: employeeId,
                        date: r.date,
                        clockIn: buildDateTime(r.clockIn),
                        breakStart: buildDateTime(r.breakStart),
                        breakEnd: buildDateTime(r.breakEnd),
                        clockOut: buildDateTime(r.clockOut),
                        isExtraDay: r.isExtraDay,
                        negotiatedValue: r.negotiatedValue ? Number(r.negotiatedValue) : null,
                        isVerified: true,
                        notes: "Edição em lote via Espelho"
                    };
                });

            await bulkUpsertTimeClock(entries);
            toast.success("Mês salvo com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['time-clocks-mirror'] });
            // onClose(); // Keep open? User said "Excel Grid", arguably keep open to continue editing.
        } catch (err) {
            console.error(err)
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
                                    <TableHead className="w-[110px]">Iniciar Expediente</TableHead>
                                    <TableHead className="w-[110px]">Pausa para Almoço</TableHead>
                                    <TableHead className="w-[110px]">Retorno do Almoço</TableHead>
                                    <TableHead className="w-[110px]">Fim de Expediente</TableHead>
                                    <TableHead className="w-[60px] text-center">Trab.?</TableHead>
                                    <TableHead className="w-[60px] text-center">Extra?</TableHead>
                                    <TableHead className="w-[100px]">Valor (R$)</TableHead>
                                    <TableHead className="w-[100px] text-right">Saldo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field: any, index) => (
                                    <MirrorRowField
                                        key={field.id}
                                        index={index}
                                        register={register}
                                        watch={watch}
                                        day={new Date(field.date)}
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

function MonthPicker({ date, setDate }: { date: Date, setDate: (d: Date) => void }) {
    const nextMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    const prevMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));

    return (
        <div className="flex items-center gap-2 border rounded-md p-1 bg-card">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8" type="button">
                {"<"}
            </Button>
            <div className="fn-medium w-32 text-center font-semibold capitalize">
                {format(date, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8" type="button">
                {">"}
            </Button>
        </div>
    )
}

function MirrorRowField({ index, register, watch, day }: { index: number, register: any, watch: any, day: Date }) {
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    // Watch fields for this row
    const worked = watch(`rows.${index}.worked`);
    const isExtraDay = watch(`rows.${index}.isExtraDay`);
    const clockIn = watch(`rows.${index}.clockIn`);
    const breakStart = watch(`rows.${index}.breakStart`);
    const breakEnd = watch(`rows.${index}.breakEnd`);
    const clockOut = watch(`rows.${index}.clockOut`);

    // Calculate hours helper
    const calculateHours = (cin?: string, bout?: string, bin?: string, cout?: string) => {
        let total = 0;
        const setTime = (t: string) => {
            if (!t) return new Date();
            const [h, m] = t.split(':').map(Number);
            const d = new Date(day);
            d.setHours(h, m, 0, 0);
            return d;
        };

        if (cin && bout) {
            total += differenceInMinutes(setTime(bout), setTime(cin));
        } else if (cin && cout && !bout && !bin) {
            total += differenceInMinutes(setTime(cout), setTime(cin));
        }

        if (bin && cout) {
            total += differenceInMinutes(setTime(cout), setTime(bin));
        }

        if (total <= 0) return "--";

        return Math.floor(total / 60) + "h " + (total % 60).toString().padStart(2, '0') + "m";
    }

    const netHours = calculateHours(clockIn, breakStart, breakEnd, clockOut);

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

            <TableCell>
                <Input type="time" {...register(`rows.${index}.clockIn`)} className="h-8" disabled={!worked} />
            </TableCell>
            <TableCell>
                <Input type="time" {...register(`rows.${index}.breakStart`)} className="h-8" disabled={!worked} />
            </TableCell>
            <TableCell>
                <Input type="time" {...register(`rows.${index}.breakEnd`)} className="h-8" disabled={!worked} />
            </TableCell>
            <TableCell>
                <Input type="time" {...register(`rows.${index}.clockOut`)} className="h-8" disabled={!worked} />
            </TableCell>

            <TableCell className="text-center">
                <input type="checkbox" className="h-4 w-4" {...register(`rows.${index}.worked`)} />
            </TableCell>

            <TableCell className="text-center">
                <input type="checkbox" className="h-4 w-4" {...register(`rows.${index}.isExtraDay`)} disabled={!worked} />
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
