package com.example.orders.dto;

import java.math.BigDecimal;

public record ProductSummaryResponse(
        Long totalProducts,
        Long totalStockUnits,
        Long lowStockProducts,
        BigDecimal totalStockValue
) {
}
