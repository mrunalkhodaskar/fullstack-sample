package com.example.orders.repository;

import com.example.orders.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findAllByOwner_EmailOrderByNameAsc(String email);

    List<Product> findAllByOwner_EmailAndSkuStartingWith(String email, String skuPrefix);

    Optional<Product> findByIdAndOwner_Email(Long id, String email);

    boolean existsByOwner_EmailAndSku(String email, String sku);

    boolean existsByOwner_EmailAndSkuAndIdNot(String email, String sku, Long id);
}
