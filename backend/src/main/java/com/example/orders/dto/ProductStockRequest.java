package com.example.orders.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductStockRequest(
        @NotNull(message = "Stock quantity is required")
        @Min(value = 0, message = "Stock quantity must not be negative")
        Integer stockQuantity
) {
}
