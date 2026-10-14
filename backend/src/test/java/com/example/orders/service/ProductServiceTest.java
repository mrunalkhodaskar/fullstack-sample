package com.example.orders.service;

import com.example.orders.dto.ProductRequest;
import com.example.orders.dto.ProductResponse;
import com.example.orders.entity.Product;
import com.example.orders.entity.UserAccount;
import com.example.orders.repository.ProductRepository;
import com.example.orders.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {
    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    void createsProductForAuthenticatedOwnerAndNormalizesSku() {
        UserAccount owner = new UserAccount("owner@example.com", "hash");
        when(productRepository.existsByOwner_EmailAndSku(owner.getEmail(), "HEADPHONES-01")).thenReturn(false);
        when(userAccountRepository.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse created = productService.createProduct(
                productRequest("Headphones", " headphones-01 ", 4, 5),
                owner.getEmail()
        );

        assertEquals("HEADPHONES-01", created.sku());
        assertTrue(created.lowStock());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void rejectsDuplicateSkuWithinAnAccount() {
        when(productRepository.existsByOwner_EmailAndSku("owner@example.com", "DUPLICATE"))
                .thenReturn(true);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> productService.createProduct(
                        productRequest("Keyboard", "duplicate", 8, 2),
                        "owner@example.com"
                )
        );

        assertEquals(409, exception.getStatusCode().value());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void doesNotAllowChangingAnotherUsersProductStock() {
        when(productRepository.findByIdAndOwner_Email(12L, "owner@example.com"))
                .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> productService.updateStock(12L, 20, "owner@example.com")
        );

        assertEquals(404, exception.getStatusCode().value());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void listsOnlyOneRequestedPageWithStableDatabaseSort() {
        Product product = new Product();
        product.setName("Keyboard");
        product.setSku("KEYBOARD-01");
        product.setUnitPrice(new BigDecimal("25.00"));
        product.setStockQuantity(8);
        product.setLowStockThreshold(2);
        when(productRepository.findAll(
                ArgumentMatchers.<Specification<Product>>any(),
                any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(product)));

        var result = productService.getProducts("owner@example.com", 2, 25, "name-asc", "", false);

        assertEquals(1, result.getContent().size());
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findAll(ArgumentMatchers.<Specification<Product>>any(), pageable.capture());
        assertEquals(2, pageable.getValue().getPageNumber());
        assertEquals(25, pageable.getValue().getPageSize());
        assertEquals(Sort.Direction.ASC, pageable.getValue().getSort().getOrderFor("name").getDirection());
        assertEquals(Sort.Direction.ASC, pageable.getValue().getSort().getOrderFor("id").getDirection());
    }

    @Test
    void rejectsInvalidProductPageSize() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> productService.getProducts("owner@example.com", 0, 101, "name-asc", "", false)
        );

        assertEquals(400, exception.getStatusCode().value());
        verify(productRepository, never()).findAll(
                ArgumentMatchers.<Specification<Product>>any(),
                any(Pageable.class)
        );
    }

    private ProductRequest productRequest(String name, String sku, int stock, int threshold) {
        return new ProductRequest(name, sku, null, new BigDecimal("12.50"), stock, threshold);
    }
}
