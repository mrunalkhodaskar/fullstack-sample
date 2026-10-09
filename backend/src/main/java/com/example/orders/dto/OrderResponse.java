package com.example.orders.dto;

import com.example.orders.entity.Order;
import com.example.orders.entity.OrderStatus;
import java.time.Instant;

public record OrderResponse(
        Long id,
        String productName,
        Integer quantity,
        Double price,
        OrderStatus status,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getProductName(),
                order.getQuantity(),
                order.getPrice(),
                order.getStatus(),
                order.getNotes(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }
}
