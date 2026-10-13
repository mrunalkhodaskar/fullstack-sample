package com.example.orders.service;

import com.example.orders.dto.ProductRequest;
import com.example.orders.dto.ProductResponse;
import com.example.orders.entity.Product;
import com.example.orders.entity.UserAccount;
import com.example.orders.repository.ProductRepository;
import com.example.orders.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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

    public List<ProductResponse> getProducts(String email, String search) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return productRepository.findAllByOwner_EmailOrderByNameAsc(email).stream()
                .filter(product -> normalizedSearch.isEmpty()
                        || product.getName().toLowerCase(Locale.ROOT).contains(normalizedSearch)
                        || product.getSku().toLowerCase(Locale.ROOT).contains(normalizedSearch)
                        || (product.getDescription() != null
                        && product.getDescription().toLowerCase(Locale.ROOT).contains(normalizedSearch)))
                .map(ProductResponse::from)
                .toList();
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
