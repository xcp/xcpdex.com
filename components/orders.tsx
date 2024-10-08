'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import { formatAddress } from '@/utils/formatAddress';
import { Order, getTradingDirection, getBaseAssetString, getTradingPairString, getTradingPairSlug, calculatePrice, calculateAmount } from '@/utils/tradingPairUtils';
import { ArrowPathIcon } from '@heroicons/react/16/solid';
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from '@/components/pagination';
import { useRouter, useSearchParams } from 'next/navigation';

interface OrdersProps {
  endpoint: string;
  status?: string;
  context?: string;
}

export function Orders({ endpoint, status = 'all', context }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState<number>(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const limit = 100; // Number of orders per page
  const offset = (currentPage * 100) - 100;
  const totalPages = Math.ceil(totalResults / limit);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const res = await fetch(`${endpoint}?verbose=true${status !== 'all' ? `&status=${status}` : ''}&limit=${limit}&offset=${offset}`);
      const data = await res.json();
      setOrders(data.result);
      setTotalResults(data.result_count || 0);
      setLoading(false);
    }

    fetchOrders();
  }, [endpoint, status, offset]);

  const buildNextHref = () => {
    if (offset + limit < totalResults) {
      return `?status=${status}&page=${currentPage + 1}`;
    }
    return null;
  };

  const buildPreviousHref = () => {
    if (offset > 0) {
      return `?status=${status}&page=${Math.max(currentPage - 1, 1)}`;
    }
    return null;
  };

  const buildPageHref = (page: number) => {
    return `?status=${status}&page=${(page)}`;
  };

  const renderPageNumbers = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationPage href={buildPageHref(i)} current={i === currentPage} key={i}>
          {i}
        </PaginationPage>
      );
    }

    if (startPage > 1) {
      pages.unshift(<PaginationGap key="start-gap" />);
      pages.unshift(
        <PaginationPage href={buildPageHref(1)} key={1}>
          1
        </PaginationPage>
      );
    }

    if (endPage < totalPages) {
      pages.push(<PaginationGap key="end-gap" />);
      pages.push(
        <PaginationPage href={buildPageHref(totalPages)} key={totalPages}>
          {totalPages}
        </PaginationPage>
      );
    }

    return pages;
  };

  return loading ? (
    <div className="flex flex-col justify-center items-center h-48 my-24">
      <ArrowPathIcon className="h-10 w-10 text-gray-500 animate-spin" />
    </div>
  ) : (
    <>
      <Table className="[--gutter:theme(spacing.6)] lg:[--gutter:theme(spacing.10)]">
        <TableHead>
          <TableRow>
            <TableHeader className="w-14">Side</TableHeader>
            <TableHeader>Market</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Price</TableHeader>
            <TableHeader className="hidden 2xl:table-cell">Source</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Time</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500 py-24">
                No orders found.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => {
              const direction = getTradingDirection(order);
              const statusColor =
                order.status === 'open'
                  ? 'lime'
                  : order.status === 'filled'
                  ? 'sky'
                  : order.status === 'expired'
                  ? 'orange'
                  : order.status === 'cancelled'
                  ? 'red'
                  : 'zinc';

              const href =
                context === 'trade'
                  ? `/trade/${getTradingPairSlug(order)}`
                  : `/orders/${order.tx_hash}`;

              return (
                <TableRow key={order.tx_index} href={href} title={`Order #${order.tx_index}`}>
                  <TableCell>
                    <Badge color={direction === 'buy' ? 'green' : 'red'} className="capitalize">
                      {direction}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar src={`https://app.xcp.io/img/icon/${getBaseAssetString(order)}`} className="size-6" />
                      <span className="font-medium">{getTradingPairString(order)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ml-auto font-medium text-right">
                        {calculateAmount(order)}
                      </span>
                      <Avatar src={`https://app.xcp.io/img/icon/${getTradingPairString(order).split('/')[0]}`} className="size-6" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ml-auto font-medium text-right">
                        {calculatePrice(order)}
                      </span>
                      <Avatar src={`https://app.xcp.io/img/icon/${getTradingPairString(order).split('/')[1]}`} className="size-6" />
                    </div>
                  </TableCell>
                  <TableCell className="no-ligatures hidden 2xl:table-cell">
                    {formatAddress(order.source)}
                  </TableCell>
                  <TableCell>
                    <Badge color={statusColor} className="capitalize">
                      {order.status.split(':')[0]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {formatTimeAgo(order.block_time)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {orders.length > 0 && (
        <Pagination className="mt-6">
          <PaginationPrevious href={buildPreviousHref()} />
          <PaginationList className="hidden lg:flex">
            {renderPageNumbers()}
          </PaginationList>
          <PaginationNext href={buildNextHref()} />
        </Pagination>
      )}
    </>
  );
}
