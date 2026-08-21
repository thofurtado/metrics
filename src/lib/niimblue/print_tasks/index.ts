import { AbstractPrintTask } from './AbstractPrintTask';
import { D110PrintTask } from './D110PrintTask';
import { D110MV4PrintTask } from './D110MV4PrintTask';

export * from './AbstractPrintTask';
export * from './D110PrintTask';
export * from './D110MV4PrintTask';

export type PrintTaskName = 'D110' | 'D110_M_V4' | string;

export const printTasks: Record<string, any> = {
  D110: D110PrintTask,
  D110_M_V4: D110MV4PrintTask,
};

export function findPrintTask(name: string) {
  return printTasks[name] || D110PrintTask;
}
