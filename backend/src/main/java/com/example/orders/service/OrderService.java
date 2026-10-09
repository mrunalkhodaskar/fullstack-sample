package com.example.orders.service;

import com.example.orders.dto.BulkOrderActionResponse;
import com.example.orders.dto.CreateOrderRequest;
import com.example.orders.dto.OrderReportResponse;
import com.example.orders.dto.OrderResponse;
import com.example.orders.dto.OrderStatusSummary;
import com.example.orders.entity.Order;
import com.example.orders.entity.OrderStatus;
import com.example.orders.entity.UserAccount;
import com.example.orders.repository.OrderRepository;
import com.example.orders.repository.UserAccountRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final UserAccountRepository userAccountRepository;

    public OrderService(OrderRepository orderRepository, UserAccountRepository userAccountRepository) {
        this.orderRepository = orderRepository;
        this.userAccountRepository = userAccountRepository;
    }

    public Page<OrderResponse> getOrdersForUser(
            String email,
            int page,
            int size,
            String sortBy,
            OrderStatus status,
            String search
    ) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page must be nonnegative and size must be between 1 and 100"
            );
        }
        Pageable pageable = PageRequest.of(page, size, resolveSort(sortBy));
        return orderRepository.findAll(buildOrderSpecification(email, status, search), pageable)
                .map(OrderResponse::from);
    }

    public OrderResponse createOrder(CreateOrderRequest request, String email) {
        Order order = new Order();
        order.setProductName(request.getProductName());
        order.setQuantity(request.getQuantity());
        order.setPrice(request.getPrice());
        order.setNotes(request.getNotes());
        order.setStatus(OrderStatus.CREATED);
        order.setOwner(findUser(email));
        return OrderResponse.from(orderRepository.save(order));
    }

    public OrderResponse updateOrder(Long id, CreateOrderRequest request, String email) {
        Order order = findOwnedOrder(id, email);
        order.setProductName(request.getProductName());
        order.setQuantity(request.getQuantity());
        order.setPrice(request.getPrice());
        order.setNotes(request.getNotes());
        return OrderResponse.from(orderRepository.save(order));
    }

    public OrderResponse updateStatus(Long id, OrderStatus status, String email) {
        Order order = findOwnedOrder(id, email);
        order.setStatus(status);
        return OrderResponse.from(orderRepository.save(order));
    }

    public void deleteOrder(Long id, String email) {
        orderRepository.delete(findOwnedOrder(id, email));
    }

    @Transactional
    public BulkOrderActionResponse updateStatuses(List<Long> ids, OrderStatus status, String email) {
        List<Order> orders = findAllOwnedOrders(ids, email);
        orders.forEach(order -> order.setStatus(status));
        orderRepository.saveAll(orders);
        return new BulkOrderActionResponse(orders.size());
    }

    @Transactional
    public BulkOrderActionResponse deleteOrders(List<Long> ids, String email) {
        List<Order> orders = findAllOwnedOrders(ids, email);
        orderRepository.deleteAll(orders);
        return new BulkOrderActionResponse(orders.size());
    }

    public OrderReportResponse getReport(String email, LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date must be on or before end date");
        }
        Instant start = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant end = endDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<OrderStatusSummary> summaries = orderRepository.summarizeByOwnerAndCreatedAt(email, start, end);
        return new OrderReportResponse(
                startDate,
                endDate,
                summaries.stream().mapToLong(OrderStatusSummary::orderCount).sum(),
                summaries.stream().mapToLong(OrderStatusSummary::totalUnits).sum(),
                summaries.stream().mapToDouble(OrderStatusSummary::totalValue).sum(),
                summaries
        );
    }

    private Order findOwnedOrder(Long id, String email) {
        return orderRepository.findByIdAndOwner_Email(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    private UserAccount findUser(String email) {
        return userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                ));
    }

    private List<Order> findAllOwnedOrders(List<Long> ids, String email) {
        Set<Long> uniqueIds = new LinkedHashSet<>(ids);
        List<Order> orders = orderRepository.findAllByOwner_EmailAndIdIn(email, List.copyOf(uniqueIds));
        if (orders.size() != uniqueIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "One or more orders were not found");
        }
        return orders;
    }

    private Sort resolveSort(String sortBy) {
        return switch (sortBy) {
            case "oldest" -> Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
            case "name-asc" -> Sort.by(Sort.Order.asc("productName"), Sort.Order.asc("id"));
            case "name-desc" -> Sort.by(Sort.Order.desc("productName"), Sort.Order.desc("id"));
            case "value-desc" -> Sort.by(Sort.Order.desc("totalValue"), Sort.Order.desc("id"));
            case "value-asc" -> Sort.by(Sort.Order.asc("totalValue"), Sort.Order.asc("id"));
            case "newest" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported order sort");
        };
    }

    private Specification<Order> buildOrderSpecification(String email, OrderStatus status, String search) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("owner").get("email"), email));
            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }

            String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
            if (!normalizedSearch.isEmpty()) {
                List<Predicate> searchPredicates = new ArrayList<>();
                searchPredicates.add(builder.like(
                        builder.lower(root.get("productName")),
                        "%" + normalizedSearch + "%"
                ));
                for (OrderStatus orderStatus : OrderStatus.values()) {
                    if (orderStatus.name().toLowerCase(Locale.ROOT).contains(normalizedSearch)) {
                        searchPredicates.add(builder.equal(root.get("status"), orderStatus));
                    }
                }
                try {
                    searchPredicates.add(builder.equal(root.get("id"), Long.parseLong(normalizedSearch)));
                } catch (NumberFormatException ignored) {
                    // Non-numeric searches match product names and statuses only.
                }
                predicates.add(builder.or(searchPredicates.toArray(Predicate[]::new)));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
