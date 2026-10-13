package com.example.orders.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "Product name is required")
        @Size(max = 120, message = "Product name must be 120 characters or fewer")
        String name,
        @NotBlank(message = "SKU is required")
        @Size(max = 64, message = "SKU must be 64 characters or fewer")
        String sku,
        @Size(max = 500, message = "Description must be 500 characters or fewer")
        String description,
        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.00", message = "Unit price must not be negative")
        @Digits(integer = 10, fraction = 2, message = "Unit price must have at most 10 whole digits and 2 decimal places")
        BigDecimal unitPrice,
        @NotNull(message = "Stock quantity is required")
        @Min(value = 0, message = "Stock quantity must not be negative")
        Integer stockQuantity,
        @NotNull(message = "Low-stock threshold is required")
        @Min(value = 0, message = "Low-stock threshold must not be negative")
        Integer lowStockThreshold
) {
}
