import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthPickerProps {
    date: Date;
    setDate: (date: Date) => void;
}

export function MonthPicker({ date, setDate }: MonthPickerProps) {
    const nextMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    const prevMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));

    return (
        <div className="flex items-center gap-2 border rounded-md p-1 bg-background/50">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8" type="button">
                {"<"}
            </Button>
            <div className="font-medium w-32 text-center capitalize text-sm">
                {format(date, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8" type="button">
                {">"}
            </Button>
        </div>
    );
}
