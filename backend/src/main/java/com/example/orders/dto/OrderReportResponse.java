package com.example.orders.dto;

import java.time.LocalDate;
import java.util.List;

public record OrderReportResponse(
        LocalDate startDate,
        LocalDate endDate,
        long totalOrders,
        long totalUnits,
        double totalValue,
        List<OrderStatusSummary> byStatus
) {
}
