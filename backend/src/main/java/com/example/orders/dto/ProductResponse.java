package com.example.orders.dto;

import com.example.orders.entity.Product;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id,
        String name,
        String sku,
        String description,
        BigDecimal unitPrice,
        Integer stockQuantity,
        Integer lowStockThreshold,
        boolean lowStock,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getSku(),
                product.getDescription(),
                product.getUnitPrice(),
                product.getStockQuantity(),
                product.getLowStockThreshold(),
                product.getStockQuantity() <= product.getLowStockThreshold(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
