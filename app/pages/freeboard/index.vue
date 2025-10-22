<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table';
import type { TableColumn } from '@nuxt/ui';

type Payment = {
  id: string;
  date: string;
  email: string;
  amount: number;
};
const table = useTemplateRef('table');
const data = ref<Payment[]>([
  {
    id: '4600',
    date: '2024-03-11T15:30:00',
    email: 'james.anderson@example.com',
    amount: 594,
  },
  {
    id: '4599',
    date: '2024-03-11T10:10:00',
    email: 'mia.white@example.com',
    amount: 276,
  },
  {
    id: '4598',
    date: '2024-03-11T08:50:00',
    email: 'william.brown@example.com',
    amount: 315,
  },
]);

const columns: TableColumn<Payment>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => `#${row.getValue('id')}`,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => {
      return new Date(row.getValue('date')).toLocaleString('ko-KR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'amount',
    header: () => h('div', { class: 'text-right' }, 'Amount'),
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
      return h('div', { class: 'text-right font-medium' }, formatted);
    },
  },
];

const pagination = ref({
  pageIndex: 0,
  pageSize: 5,
});
</script>

<template>
  <div class="container mx-auto max-w-4xl">
    <h1 class="text-2xl font-bold mb-6">자유게시판</h1>
    <div class="space-y-4 pb-4">
      <UTable
        ref="table"
        v-model:pagination="pagination"
        :data="data"
        :columns="columns"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="w-full"
      />

      <div class="flex justify-center border-t border-default pt-4">
        <UPagination
          :default-page="
            (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
          "
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </div>
  </div>
</template>
