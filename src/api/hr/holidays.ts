import { api } from "@/lib/axios";

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  created_at: string;
}

export async function listHolidays(year: number) {
  const response = await api.get<{ holidays: Holiday[] }>('/hr/holidays', {
    params: { year }
  });
  return response.data;
}

export async function createCustomHoliday(data: { date: string; name: string; type?: string }) {
  const response = await api.post<{ holiday: Holiday }>('/hr/holidays', data);
  return response.data;
}

export async function removeHoliday(id: string) {
  await api.delete(`/hr/holidays/${id}`);
}
