import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { listHolidays, createCustomHoliday, removeHoliday } from "@/api/hr/holidays";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const customHolidaySchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    date: z.string().min(1, "Data é obrigatória"),
});

export function HrRulesSettings() {
    const [year, setYear] = useState(new Date().getFullYear());
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['holidays', year],
        queryFn: () => listHolidays(year),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof customHolidaySchema>>({
        resolver: zodResolver(customHolidaySchema)
    });

    const createMutation = useMutation({
        mutationFn: createCustomHoliday,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            toast.success("Feriado adicionado com sucesso!");
            reset();
        },
        onError: () => toast.error("Erro ao adicionar feriado.")
    });

    const deleteMutation = useMutation({
        mutationFn: removeHoliday,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            toast.success("Feriado removido com sucesso!");
        },
        onError: () => toast.error("Erro ao remover feriado.")
    });

    const handleAdd = (data: z.infer<typeof customHolidaySchema>) => {
        createMutation.mutate({
            name: data.name,
            date: data.date,
            type: 'MUNICIPAL'
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Feriados e Datas Especiais</CardTitle>
                    <CardDescription>
                        Gerencie os feriados locais e municipais. Dias cadastrados aqui (e feriados nacionais) acionam o adicional de 100% nas horas trabalhadas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit(handleAdd)} className="flex items-end gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="name">Nome do Feriado</Label>
                            <Input id="name" placeholder="Ex: Padroeiro da Cidade" {...register("name")} />
                            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                        </div>
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="date">Data</Label>
                            <Input id="date" type="date" {...register("date")} />
                            {errors.date && <span className="text-xs text-red-500">{errors.date.message}</span>}
                        </div>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Adicionar Feriado
                        </Button>
                    </form>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>Ano Anterior</Button>
                            <div className="flex items-center px-4 font-bold bg-secondary/50 rounded-md">
                                {year}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>Próximo Ano</Button>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Data</TableHead>
                                    <TableHead>Feriado</TableHead>
                                    <TableHead className="w-[150px]">Tipo</TableHead>
                                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : data?.holidays?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            Nenhum feriado cadastrado para este ano.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.holidays.map((holiday) => (
                                        <TableRow key={holiday.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                    {format(new Date(holiday.date), "dd/MM/yyyy")}
                                                </div>
                                            </TableCell>
                                            <TableCell>{holiday.name}</TableCell>
                                            <TableCell>
                                                {holiday.type === 'NATIONAL' ? (
                                                    <Badge variant="secondary">Nacional</Badge>
                                                ) : (
                                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">Municipal/Local</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {holiday.type !== 'NATIONAL' && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => deleteMutation.mutate(holiday.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
