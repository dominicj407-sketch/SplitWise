package com.groupfinancetracker;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import com.groupfinancetracker.repository.UserRepository;

@SpringBootApplication
@EnableAsync
public class GroupFinanceTrackerApplication {
    public static void main(String[] args) {
        SpringApplication.run(GroupFinanceTrackerApplication.class, args);
    }

    @Bean
    public CommandLineRunner printUsers(UserRepository repo, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate, org.springframework.security.crypto.password.PasswordEncoder encoder) {
        return args -> {
            System.out.println("=== LIST OF REGISTERED USERS ===");
            repo.findAll().forEach(u -> {
                System.out.println("ID: " + u.getId() + " | Name: " + u.getName() + " | Email: " + u.getEmail());
            });
            String encoded = encoder.encode("password123");
            int updated = jdbcTemplate.update("UPDATE users SET password_hash = ? WHERE email IN ('leo1@gmail.com', 'leo2@gmail.com', 'leo3@gmail.com')", encoded);
            System.out.println("--> Reset password of " + updated + " leo users to 'password123'");
            System.out.println("=================================");
        };
    }
}
