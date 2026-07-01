package com.groupfinancetracker.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SchemaInitializer {
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        // Schema initialization is now handled by Hibernate (ddl-auto)
    }
}
