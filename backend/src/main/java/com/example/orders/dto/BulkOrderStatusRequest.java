package com.example.orders.dto;

import com.example.orders.entity.OrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BulkOrderStatusRequest(
        @NotEmpty @Size(max = 100) List<@NotNull @Positive Long> ids,
        @NotNull OrderStatus status
) {
}
