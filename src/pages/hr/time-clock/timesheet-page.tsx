import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";

import { listTimeClocks, bulkUpsertTimeClock } from "@/api/hr/time-clock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getEmployees } from "@/api/hr/employees";

// Page Component
export function TimeSheetPage() {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State
    const [month, setMonth] = useState<Date>(new Date());
    const [isSaving, setIsSaving] = useState(false);

    // Queries
    const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });
    const employee = employees?.find(e => e.id === employeeId);

    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);

    const { data: timeClocks, isLoading } = useQuery({
        queryKey: ['time-clocks-mirror', employeeId, month.toISOString()],
        queryFn: () => listTimeClocks({
            employee_id: employeeId!,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            per_page: 32
        }),
        enabled: !!employeeId,
        staleTime: 5 * 60 * 1000
    });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

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
                const dayClock = list.find(tc => tc.date && isSameDay(parseISO(tc.date), day));
                const formatTime = (iso?: string | null) => iso ? format(parseISO(iso), 'HH:mm') : '';

                return {
                    date: day.toISOString(),
                    day,
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
    }, [isLoading, timeClocks, month, replace, days]);

    const onSubmit = async (data: any) => {
        if (!employeeId) return;
        setIsSaving(true);
        try {
            const entries = data.rows
                .filter((r: any) => r.worked || r.isExtraDay || r.clockIn || r.clockOut)
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
                    <div className="flex items-center gap-6 px-4 py-2 bg-muted/30 rounded-lg border border-border/50 shadow-sm">
                        {/* Saldo de Horas */}
                        <div className="flex flex-col items-center">
                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Horas Trabalhadas</span>
                            <span className={cn("font-mono font-bold text-xl", "text-primary")}>
                                {timeClocks?.summary?.totalHours || (() => {
                                    const rows = watch('rows') || [];
                                    let totalMinutes = 0;
                                    rows.forEach((row: any) => {
                                        if (!row?.worked) return;

                                        const setTime = (t: string) => {
                                            if (!t) return null;
                                            const [h, m] = t.split(':').map(Number);
                                            return h * 60 + m;
                                        };

                                        const cin = setTime(row.clockIn);
                                        const bin = setTime(row.breakStart);
                                        const bout = setTime(row.breakEnd);
                                        const cout = setTime(row.clockOut);

                                        if (cin !== null && bin !== null && bout !== null && cout !== null) {
                                            totalMinutes += (bin - cin) + (cout - bout);
                                        } else if (cin !== null && cout !== null) {
                                            if (bin === null && bout === null) {
                                                totalMinutes += (cout - cin);
                                            }
                                        }
                                    });

                                    const h = Math.floor(Math.abs(totalMinutes) / 60);
                                    const m = Math.abs(totalMinutes) % 60;
                                    return `${h}h ${m.toString().padStart(2, '0')}m`;
                                })()}
                            </span>
                        </div>

                        <div className="w-px h-8 bg-border" />

                        {/* Dias Extras */}
                        <div className="flex flex-col items-center text-green-600">
                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Dias Extras</span>
                            <span className="font-mono font-bold text-xl">
                                {timeClocks?.summary?.extraDays ?? (watch('rows')?.filter((r: any) => r.isExtraDay).length || 0)}
                            </span>
                        </div>
                    </div>

                    {employee?.registrationType === 'DAILY' && (
                        <div className="flex flex-col items-end px-4 py-2 bg-green-50/50 rounded-lg border border-green-100">
                            <span className="text-green-700 text-[10px] uppercase tracking-wider font-semibold">Valor Estimado</span>
                            <span className="font-mono font-bold text-xl text-green-700">
                                {/* Simple estimation: worked days * dailyRate */}
                                {(() => {
                                    const workedCount = watch('rows')?.filter((r: any) => r.worked).length || 0;
                                    const rate = employee.dailyRate || 0;
                                    return (workedCount * rate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                })()}
                            </span>
                        </div>
                    )}
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
                                <TableHead className="w-[120px] bg-muted font-bold pl-6">Data</TableHead>
                                <TableHead className="w-[130px] bg-muted font-bold text-center">Iniciar Expediente</TableHead>
                                <TableHead className="w-[130px] bg-muted font-bold text-center">Pausa para Almoço</TableHead>
                                <TableHead className="w-[130px] bg-muted font-bold text-center">Retorno do Almoço</TableHead>
                                <TableHead className="w-[130px] bg-muted font-bold text-center">Fim de Expediente</TableHead>
                                <TableHead className="w-[80px] bg-muted font-bold text-center">Trab.?</TableHead>
                                <TableHead className="w-[80px] bg-muted font-bold text-center">Extra?</TableHead>
                                <TableHead className="w-[120px] bg-muted font-bold">Valor (R$)</TableHead>
                                <TableHead className="w-[100px] bg-muted font-bold text-right pr-6">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
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
                                        day={new Date(field.date)}
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

function MonthPicker({ date, setDate }: { date: Date, setDate: (d: Date) => void }) {
    const nextMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    const prevMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    // Check if current month
    // const isCurrentMonth = isSameMonth(date, new Date()); // Optional restriction

    return (
        <>
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8" type="button">
                {"<"}
            </Button>
            <div className="font-medium w-32 text-center capitalize text-sm">
                {format(date, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8" type="button">
                {">"}
            </Button>
        </>
    )
}

function MirrorRowField({ index, register, watch, setValue, day, dailyRate }: { index: number, register: any, watch: any, setValue: any, day: Date, dailyRate: number }) {
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    const worked = watch(`rows.${index}.worked`);
    const isExtraDay = watch(`rows.${index}.isExtraDay`);
    const clockIn = watch(`rows.${index}.clockIn`);
    const breakStart = watch(`rows.${index}.breakStart`);
    const breakEnd = watch(`rows.${index}.breakEnd`);
    const clockOut = watch(`rows.${index}.clockOut`);

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

        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    }

    const netHours = calculateHours(clockIn, breakStart, breakEnd, clockOut);

    return (
        <TableRow className={cn("hover:bg-muted/10 transition-colors", { "bg-blue-50/50": isWeekend })}>
            <TableCell className="font-medium pl-6 py-2 border-r">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">{format(day, 'dd/MM')}</span>
                    <span className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: ptBR })}</span>
                </div>
                <input type="hidden" {...register(`rows.${index}.date`)} />
            </TableCell>

            <TableCell className="p-1 border-r">
                <Input
                    type="time"
                    {...register(`rows.${index}.clockIn`)}
                    className="h-9 border-0 shadow-none text-center focus-visible:ring-1 bg-transparent"
                    disabled={!worked}
                    onKeyDown={(e) => handleKeyDown(e)}
                    id={`clockIn-${index}`}
                />
            </TableCell>
            <TableCell className="p-1 border-r">
                <Input
                    type="time"
                    {...register(`rows.${index}.breakStart`)}
                    className="h-9 border-0 shadow-none text-center focus-visible:ring-1 bg-transparent"
                    disabled={!worked}
                    onKeyDown={(e) => handleKeyDown(e)}
                />
            </TableCell>
            <TableCell className="p-1 border-r">
                <Input
                    type="time"
                    {...register(`rows.${index}.breakEnd`)}
                    className="h-9 border-0 shadow-none text-center focus-visible:ring-1 bg-transparent"
                    disabled={!worked}
                    onKeyDown={(e) => handleKeyDown(e)}
                />
            </TableCell>
            <TableCell className="p-1 border-r">
                <Input
                    type="time"
                    {...register(`rows.${index}.clockOut`)}
                    className="h-9 border-0 shadow-none text-center focus-visible:ring-1 bg-transparent"
                    disabled={!worked}
                    onKeyDown={(e) => handleKeyDown(e)}
                />
            </TableCell>

            <TableCell className="text-center border-r p-0">
                <div className="flex items-center justify-center h-full">
                    <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                        {...register(`rows.${index}.worked`, {
                            onChange: (e: any) => {
                                if (e.target.checked) {
                                    setTimeout(() => {
                                        const el = document.getElementById(`clockIn-${index}`);
                                        el?.focus();
                                    }, 50);
                                }
                            }
                        })}
                        onKeyDown={(e) => handleKeyDown(e as any)}
                    />
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
                                if (isChecked && dailyRate > 0) {
                                    const currentVal = watch(`rows.${index}.negotiatedValue`);
                                    // Auto-fill if empty or zero
                                    if (!currentVal || Number(currentVal) === 0) {
                                        setValue(`rows.${index}.negotiatedValue`, dailyRate);
                                        toast.info("Valor da diária preenchido!", { duration: 1500 });
                                    }
                                }
                            }
                        })}
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
                {worked ? netHours : '--'}
            </TableCell>
        </TableRow>
    )
}
