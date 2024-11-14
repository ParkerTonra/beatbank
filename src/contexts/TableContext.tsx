import { createContext, useContext } from 'react';
import { Table } from '@tanstack/react-table';
import { Beat } from '../bindings';

interface TableContextType {
  tableInstance: Table<Beat> | null;
}

export const TableContext = createContext<TableContextType>({ tableInstance: null });

export const useTableContext = () => useContext(TableContext);