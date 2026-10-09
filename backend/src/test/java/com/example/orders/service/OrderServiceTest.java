package com.example.orders.service;

import com.example.orders.dto.CreateOrderRequest;
import com.example.orders.dto.OrderResponse;
import com.example.orders.dto.OrderStatusSummary;
import com.example.orders.entity.Order;
import com.example.orders.entity.OrderStatus;
import com.example.orders.entity.UserAccount;
import com.example.orders.repository.OrderRepository;
import com.example.orders.repository.UserAccountRepository;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createsOrderForAuthenticatedOwner() {
        UserAccount owner = new UserAccount("owner@example.com", "hash");
        CreateOrderRequest request = new CreateOrderRequest();
        request.setProductName("Keyboard");
        request.setQuantity(2);
        request.setPrice(49.99);
        when(userAccountRepository.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse created = orderService.createOrder(request, owner.getEmail());

        assertEquals("Keyboard", created.productName());
        assertEquals(OrderStatus.CREATED, created.status());
        ArgumentCaptor<Order> savedOrder = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(savedOrder.capture());
        assertEquals(owner, savedOrder.getValue().getOwner());
    }

    @Test
    void listsOnlyOrdersOwnedByAuthenticatedUser() {
        when(orderRepository.findAll(ArgumentMatchers.<Specification<Order>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        orderService.getOrdersForUser("owner@example.com", 0, 10, "newest", null, "");

        verify(orderRepository).findAll(ArgumentMatchers.<Specification<Order>>any(), any(Pageable.class));
        verify(orderRepository, never()).findAll();
    }

    @Test
    void doesNotAllowUpdatingAnotherUsersOrder() {
        when(orderRepository.findByIdAndOwner_Email(12L, "owner@example.com")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> orderService.updateStatus(12L, OrderStatus.SHIPPED, "owner@example.com")
        );

        assertEquals(404, exception.getStatusCode().value());
    }

    @Test
    void doesNotAllowDeletingAnotherUsersOrder() {
        when(orderRepository.findByIdAndOwner_Email(12L, "owner@example.com")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> orderService.deleteOrder(12L, "owner@example.com")
        );

        assertEquals(404, exception.getStatusCode().value());
    }

    @Test
    void bulkUpdateIsAllOrNothingWhenAnOrderIsNotOwned() {
        when(orderRepository.findAllByOwner_EmailAndIdIn("owner@example.com", List.of(12L, 13L)))
                .thenReturn(List.of(new Order()));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> orderService.updateStatuses(List.of(12L, 13L), OrderStatus.SHIPPED, "owner@example.com")
        );

        assertEquals(404, exception.getStatusCode().value());
        verify(orderRepository, never()).saveAll(any());
    }

    @Test
    void summarizesOnlyTheRequestedUsersDateRange() {
        when(orderRepository.summarizeByOwnerAndCreatedAt(
                any(),
                any(),
                any()
        )).thenReturn(List.of(new OrderStatusSummary(OrderStatus.CREATED, 2L, 3L, 40.0)));

        var report = orderService.getReport(
                "owner@example.com",
                java.time.LocalDate.parse("2026-01-01"),
                java.time.LocalDate.parse("2026-01-31")
        );

        assertEquals(2L, report.totalOrders());
        assertEquals(3L, report.totalUnits());
        assertEquals(40.0, report.totalValue());
        verify(orderRepository).summarizeByOwnerAndCreatedAt(
                org.mockito.ArgumentMatchers.eq("owner@example.com"),
                any(),
                any()
        );
    }
}
