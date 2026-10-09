package com.example.orders.controller;

import com.example.orders.dto.BulkOrderActionResponse;
import com.example.orders.dto.BulkOrderIdsRequest;
import com.example.orders.dto.BulkOrderStatusRequest;
import com.example.orders.dto.CreateOrderRequest;
import com.example.orders.dto.OrderReportResponse;
import com.example.orders.dto.OrderResponse;
import com.example.orders.dto.UpdateOrderStatusRequest;
import com.example.orders.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.example.orders.entity.OrderStatus;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public Page<OrderResponse> getAllOrders(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "") String search
    ) {
        return orderService.getOrdersForUser(user.getUsername(), page, size, sort, status, search);
    }

    @GetMapping("/report")
    public OrderReportResponse getReport(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate
    ) {
        return orderService.getReport(user.getUsername(), startDate, endDate);
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        OrderResponse savedOrder = orderService.createOrder(request, user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrder);
    }

    @PutMapping("/{id}")
    public OrderResponse updateOrder(
            @PathVariable Long id,
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        return orderService.updateOrder(id, request, user.getUsername());
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        return orderService.updateStatus(id, request.status(), user.getUsername());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        orderService.deleteOrder(id, user.getUsername());
    }

    @PatchMapping("/bulk/status")
    public BulkOrderActionResponse updateStatuses(
            @Valid @RequestBody BulkOrderStatusRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        return orderService.updateStatuses(request.ids(), request.status(), user.getUsername());
    }

    @DeleteMapping("/bulk")
    public BulkOrderActionResponse deleteOrders(
            @Valid @RequestBody BulkOrderIdsRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        return orderService.deleteOrders(request.ids(), user.getUsername());
    }
}
