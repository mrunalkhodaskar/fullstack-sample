package com.example.orders.service;

import com.example.orders.entity.Product;
import com.example.orders.entity.UserAccount;
import com.example.orders.repository.ProductRepository;
import com.example.orders.repository.UserAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
@ConditionalOnProperty(prefix = "app.seed.products", name = "enabled", havingValue = "true")
public class ProductTestDataSeeder implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(ProductTestDataSeeder.class);
    private static final int PRODUCT_COUNT = 1_000;
    private static final String SKU_PREFIX = "TEST-DATA-";

    private final ProductRepository productRepository;
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final String accountEmail;
    private final String accountPassword;

    public ProductTestDataSeeder(
            ProductRepository productRepository,
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            org.springframework.core.env.Environment environment
    ) {
        this.productRepository = productRepository;
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.accountEmail = environment.getProperty("app.seed.products.email", "").trim().toLowerCase(Locale.ROOT);
        this.accountPassword = environment.getProperty("app.seed.products.password", "");
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (accountEmail.isBlank() || accountPassword.isBlank()) {
            throw new IllegalStateException(
                    "Set SEED_PRODUCTS_EMAIL and SEED_PRODUCTS_PASSWORD before enabling product test-data seeding."
            );
        }

        UserAccount account = userAccountRepository.findByEmail(accountEmail)
                .orElseGet(() -> userAccountRepository.save(
                        new UserAccount(accountEmail, passwordEncoder.encode(accountPassword))
                ));

        Set<String> existingSkus = new HashSet<>();
        productRepository.findAllByOwner_EmailAndSkuStartingWith(accountEmail, SKU_PREFIX)
                .forEach(product -> existingSkus.add(product.getSku()));

        List<Product> productsToSave = new ArrayList<>(PRODUCT_COUNT);
        for (int number = 1; number <= PRODUCT_COUNT; number++) {
            String sku = SKU_PREFIX + "%04d".formatted(number);
            if (existingSkus.contains(sku)) continue;

            Product product = new Product();
            product.setName("Sample Product %04d".formatted(number));
            product.setSku(sku);
            product.setDescription("Generated inventory test item %04d.".formatted(number));
            product.setUnitPrice(BigDecimal.valueOf((number * 137L) % 50_000 + 499, 2));
            product.setStockQuantity(number * 17 % 251);
            product.setLowStockThreshold(5 + number % 16);
            product.setOwner(account);
            productsToSave.add(product);
        }

        if (!productsToSave.isEmpty()) {
            productRepository.saveAll(productsToSave);
        }

        logger.info(
                "Product test-data seed complete for {}: {} products added; {} of {} are present.",
                accountEmail,
                productsToSave.size(),
                PRODUCT_COUNT,
                PRODUCT_COUNT
        );
    }
}
