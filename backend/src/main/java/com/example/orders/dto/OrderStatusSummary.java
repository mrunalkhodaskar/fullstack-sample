package com.example.orders.dto;

import com.example.orders.entity.OrderStatus;

public record OrderStatusSummary(
        OrderStatus status,
        Long orderCount,
        Long totalUnits,
        Double totalValue
) {
}
