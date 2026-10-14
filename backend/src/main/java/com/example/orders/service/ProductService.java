package com.example.orders.service;

import com.example.orders.dto.ProductRequest;
import com.example.orders.dto.ProductResponse;
import com.example.orders.dto.ProductSummaryResponse;
import com.example.orders.entity.Product;
import com.example.orders.entity.UserAccount;
import com.example.orders.repository.ProductRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class ProductService {
    private final ProductRepository productRepository;
    private final UserAccountRepository userAccountRepository;

    public ProductService(ProductRepository productRepository, UserAccountRepository userAccountRepository) {
        this.productRepository = productRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> getProducts(
            String email,
            int page,
            int size,
            String sortBy,
            String search,
            boolean lowStockOnly
    ) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page must be nonnegative and size must be between 1 and 100"
            );
        }
        Sort sort = switch (sortBy) {
            case "name-desc" -> Sort.by(Sort.Order.desc("name"), Sort.Order.asc("id"));
            case "price-asc" -> Sort.by(Sort.Order.asc("unitPrice"), Sort.Order.asc("id"));
            case "price-desc" -> Sort.by(Sort.Order.desc("unitPrice"), Sort.Order.asc("id"));
            case "stock-asc" -> Sort.by(Sort.Order.asc("stockQuantity"), Sort.Order.asc("id"));
            case "stock-desc" -> Sort.by(Sort.Order.desc("stockQuantity"), Sort.Order.asc("id"));
            case "name-asc" -> Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported product sort");
        };
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Product> products = productRepository.findAll(
                buildProductSpecification(email, search, lowStockOnly),
                pageable
        );
        return products.map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductSummaryResponse getSummary(String email) {
        return productRepository.summarizeForOwner(email);
    }

    private Specification<Product> buildProductSpecification(String email, String search, boolean lowStockOnly) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("owner").get("email"), email));
            if (!normalizedSearch.isEmpty()) {
                String pattern = "%" + normalizedSearch + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("name")), pattern),
                        builder.like(builder.lower(root.get("sku")), pattern),
                        builder.like(builder.lower(root.get("description")), pattern)
                ));
            }
            if (lowStockOnly) {
                predicates.add(builder.lessThanOrEqualTo(root.get("stockQuantity"), root.get("lowStockThreshold")));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    public ProductResponse createProduct(ProductRequest request, String email) {
        String sku = normalizeSku(request.sku());
        ensureSkuAvailable(email, sku, null);

        Product product = new Product();
        applyRequest(product, request, sku);
        product.setOwner(findUser(email));
        return ProductResponse.from(productRepository.save(product));
    }

    public ProductResponse updateProduct(Long id, ProductRequest request, String email) {
        Product product = findOwnedProduct(id, email);
        String sku = normalizeSku(request.sku());
        ensureSkuAvailable(email, sku, id);
        applyRequest(product, request, sku);
        return ProductResponse.from(productRepository.save(product));
    }

    public ProductResponse updateStock(Long id, int stockQuantity, String email) {
        Product product = findOwnedProduct(id, email);
        product.setStockQuantity(stockQuantity);
        return ProductResponse.from(productRepository.save(product));
    }

    public void deleteProduct(Long id, String email) {
        productRepository.delete(findOwnedProduct(id, email));
    }

    private void applyRequest(Product product, ProductRequest request, String sku) {
        product.setName(request.name().trim());
        product.setSku(sku);
        product.setDescription(request.description() == null ? null : request.description().trim());
        product.setUnitPrice(request.unitPrice());
        product.setStockQuantity(request.stockQuantity());
        product.setLowStockThreshold(request.lowStockThreshold());
    }

    private String normalizeSku(String sku) {
        return sku.trim().toUpperCase(Locale.ROOT);
    }

    private void ensureSkuAvailable(String email, String sku, Long excludedId) {
        boolean exists = excludedId == null
                ? productRepository.existsByOwner_EmailAndSku(email, sku)
                : productRepository.existsByOwner_EmailAndSkuAndIdNot(email, sku, excludedId);
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A product with this SKU already exists");
        }
    }

    private Product findOwnedProduct(Long id, String email) {
        return productRepository.findByIdAndOwner_Email(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private UserAccount findUser(String email) {
        return userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                ));
    }
}
