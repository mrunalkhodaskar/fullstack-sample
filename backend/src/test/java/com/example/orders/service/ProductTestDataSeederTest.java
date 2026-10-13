package com.example.orders.service;

import com.example.orders.entity.Product;
import com.example.orders.entity.UserAccount;
import com.example.orders.repository.ProductRepository;
import com.example.orders.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class ProductTestDataSeederTest {
    @Test
    void addsOneThousandProductsAndSkipsThemOnRepeatRuns() throws Exception {
        ProductRepository productRepository = mock(ProductRepository.class);
        UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        UserAccount testAccount = new UserAccount("products-test@example.com", "encoded-password");
        List<Product> savedProducts = new ArrayList<>();

        when(userAccountRepository.findByEmail(testAccount.getEmail())).thenReturn(Optional.of(testAccount));
        when(productRepository.findAllByOwner_EmailAndSkuStartingWith(testAccount.getEmail(), "TEST-DATA-"))
                .thenAnswer(invocation -> List.copyOf(savedProducts));
        when(productRepository.saveAll(org.mockito.ArgumentMatchers.<Iterable<Product>>notNull()))
                .thenAnswer(invocation -> {
                    Iterable<Product> products = invocation.getArgument(0);
                    products.forEach(savedProducts::add);
                    return savedProducts;
                });

        ProductTestDataSeeder seeder = new ProductTestDataSeeder(
                productRepository,
                userAccountRepository,
                passwordEncoder,
                new MockEnvironment()
                        .withProperty("app.seed.products.email", "Products-Test@Example.com")
                        .withProperty("app.seed.products.password", "test-password")
        );

        seeder.run(null);
        seeder.run(null);

        assertEquals(1_000, savedProducts.size());
        assertEquals("TEST-DATA-0001", savedProducts.get(0).getSku());
        assertEquals("TEST-DATA-1000", savedProducts.get(999).getSku());
        assertEquals(testAccount, savedProducts.get(0).getOwner());
        verify(productRepository).saveAll(org.mockito.ArgumentMatchers.<Iterable<Product>>notNull());
        verify(userAccountRepository, never()).save(org.mockito.ArgumentMatchers.any(UserAccount.class));
        verify(passwordEncoder, never()).encode(org.mockito.ArgumentMatchers.anyString());
    }
}
