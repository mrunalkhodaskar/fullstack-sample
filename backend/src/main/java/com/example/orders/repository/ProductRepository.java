package com.example.orders.repository;

import com.example.orders.entity.Product;
import com.example.orders.dto.ProductSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Page<Product> findAll(Specification<Product> specification, Pageable pageable);

    Page<Product> findAllByOwner_EmailAndSkuStartingWith(String email, String skuPrefix, Pageable pageable);

    Optional<Product> findByIdAndOwner_Email(Long id, String email);

    boolean existsByOwner_EmailAndSku(String email, String sku);

    boolean existsByOwner_EmailAndSkuAndIdNot(String email, String sku, Long id);

    @Query("""
            select new com.example.orders.dto.ProductSummaryResponse(
                count(p),
                coalesce(sum(p.stockQuantity), 0L),
                coalesce(sum(case when p.stockQuantity <= p.lowStockThreshold then 1L else 0L end), 0L),
                coalesce(sum(p.unitPrice * p.stockQuantity), 0))
            from Product p
            where p.owner.email = :email
            """)
    ProductSummaryResponse summarizeForOwner(@Param("email") String email);
}
