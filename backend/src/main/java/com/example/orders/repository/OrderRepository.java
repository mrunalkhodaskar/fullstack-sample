package com.example.orders.repository;

import com.example.orders.entity.Order;
import com.example.orders.dto.OrderStatusSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Page<Order> findAll(Specification<Order> specification, Pageable pageable);

    Optional<Order> findByIdAndOwner_Email(Long id, String email);

    List<Order> findAllByOwner_EmailAndIdIn(String email, List<Long> ids);

    long deleteByOwner_EmailAndIdIn(String email, List<Long> ids);

    @Query("""
            select new com.example.orders.dto.OrderStatusSummary(
                o.status, count(o), sum(o.quantity), sum(o.price * o.quantity))
            from Order o
            where o.owner.email = :email
              and o.createdAt >= :start
              and o.createdAt < :end
            group by o.status
            """)
    List<OrderStatusSummary> summarizeByOwnerAndCreatedAt(
            @Param("email") String email,
            @Param("start") Instant start,
            @Param("end") Instant end
    );
}
