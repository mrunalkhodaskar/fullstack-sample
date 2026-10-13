package com.example.orders.controller;

import com.example.orders.dto.ProductRequest;
import com.example.orders.dto.ProductResponse;
import com.example.orders.dto.ProductStockRequest;
import com.example.orders.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<ProductResponse> getProducts(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(defaultValue = "") String search
    ) {
        return productService.getProducts(user.getUsername(), search);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createProduct(
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        return productService.createProduct(request, user.getUsername());
    }

    @PutMapping("/{id}")
    public ProductResponse updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        return productService.updateProduct(id, request, user.getUsername());
    }

    @PatchMapping("/{id}/stock")
    public ProductResponse updateStock(
            @PathVariable Long id,
            @Valid @RequestBody ProductStockRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {
        return productService.updateStock(id, request.stockQuantity(), user.getUsername());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        productService.deleteProduct(id, user.getUsername());
    }
}
